const { createEnergyPlan } = require('../lib/energy-planner');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = createEnergyPlan(body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Could not generate plan', detail: err.message });
  }
};
