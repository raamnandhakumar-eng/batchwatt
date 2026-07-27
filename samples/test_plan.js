const fs = require('fs');
const path = require('path');
const { createPlan } = require('../lib/planner');
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_plan_payload.json'), 'utf8'));
const result = createPlan(payload);
console.log(JSON.stringify(result, null, 2));
