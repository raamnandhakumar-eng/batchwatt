const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const reports=require('../lib/energy-reports'),engine=require('../lib/energy-planner');
const demo=require('../samples/energy-demo.json');
function workspace(input=demo,isDemo=true){
 const els=new Map(),storage=new Map();
 const element=id=>{if(!els.has(id))els.set(id,{textContent:'',innerHTML:'',hidden:false,open:false,checked:false,disabled:false});return els.get(id);};
 const views=['start','pilots','orders','procurement','overview','setup','history','currency'].map(view=>({dataset:{view},hidden:false}));
 const context={document:{getElementById:element,addEventListener(){},querySelector:s=>element(s),querySelectorAll:s=>s==='[data-view]'?views:[]},window:{BATCHWATT_DEMO:demo,scrollTo(){}},location:{hash:''},localStorage:{setItem:(k,v)=>storage.set(k,v)},BatchWattReports:reports,BatchWattEnergy:engine,input:structuredClone(input),demoFlag:isDemo};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../planner-app.js'),'utf8'),context);vm.runInContext('factoryData=input;isDemo=demoFlag;',context);
 return {run:code=>vm.runInContext(code,context),context,els,storage,views};
}
test('original saved rupee demo updates prices to USD without replacing orders or stock',()=>{
 const old=structuredClone(demo);old.energy={...old.energy,currency:'INR',rate:8,peakRate:14,demandRate:350};old.materials.forEach((m,i)=>m.unitCost=[400,120,80][i]);old.orders[0].customer='Edited customer';old.materials[0].stock=17;
 const w=workspace(old);assert.equal(w.run('migrateOriginalDemoToUSD()'),true);assert.equal(w.run('factoryData.energy.currency'),'USD');assert.equal(w.run('factoryData.orders[0].customer'),'Edited customer');assert.equal(w.run('factoryData.materials[0].stock'),17);assert.equal(JSON.parse(w.storage.get('batchwatt_before_usd')).input.energy.currency,'INR');assert.equal(w.run('migrateOriginalDemoToUSD()'),false);
});
test('custom prices are never silently relabeled or treated as demo prices',()=>{
 const old=structuredClone(demo);old.energy.currency='INR';old.energy.rate=9;const w=workspace(old);assert.equal(w.run('migrateOriginalDemoToUSD()'),false);w.run('showWorkspaceView()');assert.equal(w.views.find(v=>!v.hidden).dataset.view,'currency');
 w.context.location.hash='#pilot-pr';w.run('showWorkspaceView()');assert.equal(w.views.find(v=>!v.hidden).dataset.view,'pilots');
});
test('explicit currency conversion covers tariffs, stock prices and purchase records once',()=>{
 const old=structuredClone(demo);old.energy.currency='INR';old.energy.rate=8;old.materials[0].unitCost=400;old.purchaseOrders=[{unitCost:200,qty:9,receivedQty:2}];const w=workspace(old,false);
 const result=w.run('convertWorkspacePricesToUSD(factoryData,0.01)');assert.equal(result.energy.rate,0.08);assert.equal(result.materials[0].unitCost,4);assert.equal(result.purchaseOrders[0].unitCost,2);assert.equal(result.purchaseOrders[0].qty,9);assert.equal(result.energy.baseKw,old.energy.baseKw);assert.equal(w.run('factoryData.energy.currency'),'INR');
 assert.throws(()=>w.run('convertWorkspacePricesToUSD(factoryData,0)'));assert.throws(()=>w.run('convertWorkspacePricesToUSD(window.BATCHWATT_DEMO,0.01)'));
});
test('shift brief identifies material blockers and routes them to buying',()=>{
 const input=structuredClone(demo);input.materials[0].stock=0;const w=workspace(input);w.run('energyResult=BatchWattEnergy.createEnergyPlan(factoryData);renderBusinessBrief()');const html=w.els.get('business-brief').innerHTML;assert.match(html,/Need your attention/);assert.match(html,/data-go="procurement"/);assert.match(html,/data-buy=/);assert.match(html,/Monthly saving depends on the final billing peak/);
});
test('incoming stock remains a receipt action and does not trigger duplicate buying',()=>{
 const input=structuredClone(demo);input.materials[0].stock=0;input.purchaseOrders=[{id:'PO-test',materialId:input.materials[0].id,supplierId:input.suppliers[0].id,qty:100000,unitCost:1,status:'Ordered',receivedQty:0,expectedDate:input.shift.date}];
 const w=workspace(input);w.run('energyResult=BatchWattEnergy.createEnergyPlan(factoryData);renderBusinessBrief()');const html=w.els.get('business-brief').innerHTML;assert.match(html,/Delivery expected/);assert.match(html,/Receive stock before scheduling/);assert(!html.includes(`data-buy="${input.materials[0].id}"`));
});
test('default screen shows the shift plan and empty factory has a setup checklist',()=>{
 const w=workspace();w.run('showWorkspaceView()');assert.equal(w.views.find(v=>!v.hidden).dataset.view,'overview');w.run('factoryData.lines=[];factoryData.products=[];energyResult=null;renderBusinessBrief()');assert.equal(w.els.get('setup-guide').hidden,false);assert.match(w.els.get('setup-checklist').innerHTML,/Machines and shift/);
});
test('WhatsApp link contains the complete encoded floor message and does not send it',()=>{
 const w=workspace();const url=w.run('whatsappPlanUrl(BatchWattEnergy.createEnergyPlan(factoryData))');assert.equal(new URL(url).origin,'https://wa.me');assert.equal(new URL(url).searchParams.get('text'),reports.message(engine.createEnergyPlan(demo)));assert.equal(w.run('whatsappPlanUrl(null)'),null);
});
