const { parseWhatsappOrders } = require('../lib/planner');

// Meta verifies the webhook through a GET request containing hub.challenge.
// Set VERIFY_TOKEN in Vercel environment variables.
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET or POST only' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = [];

    const entries = body.entry || [];
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        for (const msg of (value.messages || [])) {
          if (msg.type === 'text' && msg.text && msg.text.body) {
            messages.push({ from: msg.from, id: msg.id, text: msg.text.body, timestamp: msg.timestamp });
          } else {
            messages.push({ from: msg.from, id: msg.id, unsupportedType: msg.type, timestamp: msg.timestamp });
          }
        }
      }
    }

    const parsed = messages
      .filter(m => m.text)
      .map(m => ({ ...m, parsed: parseWhatsappOrders(m.text) }));

    // Production step:
    // 1. Idempotently store raw message and parsed orders in Supabase.
    // 2. Mark exceptions for review.
    // 3. Trigger generate-plan after daily cutoff or when owner asks "plan".
    // This endpoint returns parsed output for the MVP demo.
    return res.status(200).json({ received: messages.length, parsed });
  } catch (err) {
    return res.status(400).json({ error: 'Could not process webhook', detail: err.message });
  }
};
