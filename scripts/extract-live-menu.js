'use strict';
// Read-only requests used by the public evo360.tech school menu.
const fs = require('node:fs');
async function read(fn, parameters, values) {
 const response = await fetch('https://evo360.tech/Default/GetData', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({function:fn,parameters,values}) });
 if(!response.ok) throw new Error(`Source HTTP ${response.status}`);
 const payload = await response.json();
 if(payload.errorCode || payload.data.errorCode) throw new Error('Source rejected menu request');
 return JSON.parse(payload.data.data || '[]');
}
(async()=>{
 const schools=await read('GetSchool',['@p_brn_id','@p_school_id','@p_name'],['0','0','%%']);
 const snapshot={source:'https://evo360.tech/#goto_menu',fetchedAt:new Date().toISOString(),schools:[]};
 for(const school of schools){
  const entry={id:school.id,branchId:school.m_brn_id,name:school.name,categories:{}};
  for(const [i,category] of ['main','side','drink','snack'].entries()) entry.categories[category]=await read('GetStudentMealMenu',['@p_brn_id','@p_std_category','@p_meal_category','@p_item_type'],[String(school.m_brn_id),'0','0',String(i+1)]);
  snapshot.schools.push(entry);
 }
 fs.writeFileSync('data/live-menu.json',JSON.stringify(snapshot,null,2)+'\n');
 console.log(snapshot.schools.map(s=>({name:s.name,categories:Object.fromEntries(Object.entries(s.categories).map(([k,v])=>[k,v.length]))})));
})().catch(e=>{console.error(e);process.exitCode=1;});
