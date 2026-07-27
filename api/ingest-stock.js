const { parseStockCsv } = require('../lib/planner');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = parseStockCsv(body.csv || body.text || '');
    // Production: upsert rows into Supabase stock_snapshots table.
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse stock sheet', detail: err.message });
  }
};
