const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const en=require('../locales/en.json'),ar=require('../locales/ar.json');
const flatten=(obj,prefix='')=>Object.entries(obj).flatMap(([k,v])=>typeof v==='string'?[prefix+k]:flatten(v,prefix+k+'.'));
const keys=new Set(flatten(en));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('English and Arabic have identical leaf-key sets',()=>assert.deepEqual([...keys].sort(),flatten(ar).sort()));
test('literal translation keys and concatenated prefixes all resolve',()=>{
 for(const file of [...files(path.join(__dirname,'../views')),...['server.js','lib/subscription-routes.js'].map(p=>path.join(__dirname,'..',p))]){
 const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/\bt\('([^']+)'\s*([),+])/g)){
 const [,key,following]=match;if(following==='+')assert.ok([...keys].some(k=>k.startsWith(key)),`${file}: unknown prefix ${key}`);else assert.ok(keys.has(key),`${file}: missing ${key}`);
 }
 }
});
test('computed key families include every supported value',()=>{
 const required=[];const add=(prefix,values)=>values.forEach(v=>required.push(prefix+v));
 add('students.classes.',require('../lib/validate').CLASSES);add('students.sections.',require('../lib/validate').SECTIONS);
 for(const n of [1,2,3,4])for(const suffix of ['Label','Title','Body'])required.push('parents.journey.step'+n+suffix);
 for(const n of [1,2,3])for(const prefix of ['howItWorks.steps.title','howItWorks.steps.body','corporate.point'])required.push(prefix+n);
 add('corporate.form.range',[0,1,2,3]);
 for(const n of [1,2,3,4,5])for(const suffix of ['title','body'])required.push('schools.operations.'+suffix+n);
 for(const role of ['parents','schools','caterers','students','admins'])for(const suffix of ['Title','Chip1','Chip2'])required.push('featuresSection.'+role+suffix);
 add('history.',['colStudent','colSchool','colMonths','colMealDays','colTotal','colPaid','colInvoice']);
 add('schoolAdminDashboard.',['colStudent','colMonths','colMealDays','colPaid','colTotal']);
 add('subscription.',['totalDays','holidayDays','mealDays','rate','amount']);
 add('subscription.titles.',['list','new','review','meals','terms','payment','knet','confirmation']);
 add('food.',['nut','shellfish','sesame','soy']);add('menu.',['kcal','protein','carbs','fat']);
 add('nav.',['forParents','forSchools','corporate']);add('caterers.orderQueue.status',['Collected','Upcoming']);
 add('dashboard.',['schoolDayUnitOne','schoolDayUnitOther','summaryChildUnitOne','summaryChildUnitOther','summaryBookingUnitOne','summaryBookingUnitOther','dayUnitOne','dayUnitOther']);
 for(const file of ['lib/subscription.js','db/subscriptions.js'])for(const m of fs.readFileSync(path.join(__dirname,'..',file),'utf8').matchAll(/(?:SubscriptionError\(|fail\()'([^']+)'/g))required.push('subscription.errors.'+m[1]);
 for(const key of required)assert.ok(keys.has(key),'Missing computed key '+key);
});
test('removed translation keys are no longer referenced',()=>{
 const sources=[...files(path.join(__dirname,'../views')),path.join(__dirname,'../server.js')].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 assert.doesNotMatch(sources,/about\.hero\.lede|booking\.planSingle|parents\.pricing\.payAsYouGo|history\.(cancelBooking|confirmCancel|cancelledAlert|cancelRejectedAlert)/);
});
