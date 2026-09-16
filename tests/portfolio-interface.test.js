const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const planner=require('../lib/energy-planner-v6');
const review=require('../lib/energy-review');
const source=fs.readFileSync(require.resolve('../portfolio-interface.js'),'utf8');
function render(input,result){
  const ids=['dairy-energy-page','dairy-energy-card','dairy-data-checks','dairy-schedule'];
  const nodes=Object.fromEntries(ids.map(id=>[id,{innerHTML:'',textContent:''}]));
  const document={getElementById:id=>nodes[id],querySelectorAll:()=>[],addEventListener:(ev,fn)=>{if(ev==='DOMContentLoaded')fn();}};
  vm.runInNewContext(source,{input,result,document,window:{scrollTo(){},addEventListener(){}},location:{hash:'#energy'},setTimeout:fn=>fn(),BatchWattEnergyReview:review});
  return nodes;
}
test('energy view renders real results, tariff assumptions and delivery side by side',()=>{
  const input=structuredClone(require('../samples/energy-demo.json'));
  const result=planner.createEnergyPlan(input),nodes=render(input,result);
  const html=nodes['dairy-energy-page'].innerHTML;
  for(const value of ['On-time orders','Consumption','Conditional demand exposure','Tariff and calculation assumptions','Data quality and confidence'])assert.ok(html.includes(value),value);
  assert.ok(!/NaN|undefined/.test(html));
  assert.match(nodes['dairy-energy-card'].innerHTML,/href="#energy"/);
});
test('empty state remains useful and warnings are escaped',()=>{
  const input=structuredClone(require('../samples/energy-demo.json'));
  assert.match(render(input,null)['dairy-energy-page'].innerHTML,/Generate a plan/);
  const result=planner.createEnergyPlan(input);result.warnings=['<img src=x onerror=alert(1)>'];
  const html=render(input,result)['dairy-data-checks'].innerHTML;
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});
