#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
const {createEnergyPlan}=require('../lib/energy-planner');
const reports=require('../lib/energy-reports');
try{
  if(!process.argv[2])throw new Error('Usage: node scripts/export-energy-plan.js input.json [output-directory]');
  const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),result=createEnergyPlan(input),out=process.argv[3]||'output/energy';
  fs.mkdirSync(out,{recursive:true});
  const files={'report.json':JSON.stringify({schemaVersion:'2.0',input,result},null,2),'dispatch-plan.csv':reports.csv(result),'load-comparison.svg':reports.loadChart(result),'floor-message.txt':reports.message(result)};
  for(const [name,content]of Object.entries(files))fs.writeFileSync(path.join(out,name),content);
  console.log(`Exported ${result.allocations.length} orders. Baseline ${result.baseline.peakKw} kW; proposed ${result.proposed.peakKw} kW. ${result.warnings.length} review warnings.`);
}catch(error){console.error(error.message);process.exitCode=1;}
