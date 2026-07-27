const { parseBillAndReceipts } = require('../lib/planner');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = parseBillAndReceipts(body.text || '', body.currencyCode || 'LOCAL');
    // Production: attach source file id / email id / receipt image id and store parsed values with confidence.
    return res.status(200).json({ parsed: result, calibration: 'modeled now; measured after bill/refill/meter logs' });
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse bill or LPG receipt', detail: err.message });
  }
};
