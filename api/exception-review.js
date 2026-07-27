// Store human corrections. These corrections improve aliases, SKU mapping, and factory-specific parser rules.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    return res.status(200).json({
      status: 'accepted',
      savedCorrection: body,
      nextStep: 'In production this is upserted to parser_corrections and added to the factory alias map.'
    });
  } catch (err) {
    return res.status(400).json({ error: 'Could not save correction', detail: err.message });
  }
};
