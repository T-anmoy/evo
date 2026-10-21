const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const file=path.join(os.tmpdir(),`evo-subscriptions-${process.pid}.db`);
process.env.DATABASE_FILE=file;process.env.SESSION_SECRET='test-only';process.env.LOG_LEVEL='silent';
const app=require('../server'), db=require('../db'), SQL=require('better-sqlite3');
const sql=new SQL(file);const liveMain=db.getSchoolMenuItems(3).filter(m=>m.category==='main');let server,base,cookie='',csrf='',token='',bookingStudent,priceStudent;
async function request(route,fields){const res=await fetch(base+route,{method:fields?'POST':'GET',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:fields?new URLSearchParams({...fields,_csrf:csrf}):undefined,redirect:'manual'});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const body=await res.text();const c=body.match(/name="_csrf" value="([^"]+)"/);if(c)csrf=c[1];const d=body.match(/name="token" value="([^"]+)"/);if(d)token=d[1];return {status:res.status,body,headers:res.headers,location:res.headers.get('location')};}
before(async()=>{bookingStudent=db.createStudent({...db.findStudentById(1),civilId:'123450000001'});priceStudent=db.createStudent({...db.findStudentById(2),civilId:'123450000002'});server=app.listen(0);base=`http://localhost:${server.address().port}`;await request('/login');await request('/login',{civilId:'111111111111',password:'demo1234'});await request('/dashboard');});
after(()=>{server.close();sql.close();for(const suffix of ['','-wal','-shm'])fs.rmSync(file+suffix,{force:true});});
async function begin(student=String(bookingStudent.id),months='1'){
 const r=await request('/booking/review',{student,months});assert.equal(r.status,302,r.body);assert.equal(r.location,'/booking/review');
 assert.equal((await request('/booking/review')).status,200);
 const meals=await request('/booking/meals');assert.equal(meals.status,200,meals.body);
 return meals;
}
async function ready(){assert.equal((await request('/booking/accept-terms',{token})).location,'/booking/payment');assert.equal((await request('/booking/payment')).status,200);assert.equal((await request('/booking/knet')).status,200);}
test('payment is gated by a draft and step order',async()=>{
 assert.equal((await request('/booking/knet')).location,'/booking');
 const r=await request('/booking/review',{student:String(bookingStudent.id),months:'1'});assert.equal(r.status,302);
 assert.equal((await request('/booking/pay',{})).status,409);
 const page=await request('/booking/review');assert.equal(page.status,200);
 await request('/booking/meals');assert.equal((await request('/booking/pay',{token})).location,'/booking/terms');
 assert.equal((await request('/booking/payment')).location,'/booking/terms');
});
test('happy path saves daily choices, confirms payment once, and refuses overlaps',async()=>{
 const before=db.getSubscriptions(1).length;
 const page=await begin();
 const month=page.body.match(/name="month" value="([^"]+)"/)[1];
 const dates=[...page.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);
 assert.ok(dates.length>0);
 const fields={token,month,...Object.fromEntries(dates.map(d=>[`meals[${d}]`,String(liveMain[3].id)]))};
 assert.equal((await request('/booking/meals',fields)).status,302);
 await request('/booking/meals?month='+month);await ready();
 const paid=await request('/booking/pay',{token,totalKWD:'0.001'});assert.equal(paid.status,302,paid.body);assert.match(paid.location,/\/booking\/confirmation\/\d+/);
 const id=Number(paid.location.split('/').pop());const sub=db.getSubscription(id,1);
 assert.equal(sub.total_kwd,dates.length*db.getSchoolDailyRate('Kuwait English School'));assert.ok(db.getSubscriptionMeals(id).every(m=>m.menu_item_id===liveMain[3].id));
 assert.equal((await request(paid.location)).status,200);
 assert.equal((await request('/booking/pay',{token})).location,paid.location);
 assert.equal(db.getSubscriptions(1).length,before+1);
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM payments WHERE subscription_id=?').get(id).c,1);
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM terms_acceptances WHERE subscription_id=?').get(id).c,1);
 assert.equal((await request('/booking/review',{student:String(bookingStudent.id),months:'1'})).status,422);
 assert.throws(()=>sql.prepare('INSERT INTO subscription_months(subscription_id,student_id,month,total_days,holiday_days,meal_days,rate_kwd,amount_kwd) VALUES(?,?,?,?,?,?,?,?)').run(id,bookingStudent.id,month,31,12,19,2,38),/UNIQUE/);
});
test('changed database price returns to review with no payment',async()=>{
 await begin(String(priceStudent.id));await ready();const before=db.getSubscriptions(1).length;
 sql.prepare("UPDATE schools SET daily_rate_kwd=3 WHERE id=2").run();
 const response=await request('/booking/pay',{token});assert.equal(response.location,'/booking/review');assert.equal(db.getSubscriptions(1).length,before);
 const review=await request('/booking/review');assert.match(review.body,/price changed/);
 assert.equal((await request('/booking/payment')).location,'/booking/meals');
 sql.prepare("UPDATE schools SET daily_rate_kwd=2 WHERE id=2").run();
});
test('foreign subscription, confirmation and student cannot be accessed',async()=>{
 for(const route of ['/subscriptions/99999/meals','/booking/confirmation/99999','/booking/new?student=99999'])assert.equal((await request(route)).status,404);
 assert.equal((await request('/subscriptions/99999/meals',{month:'2026-01'})).status,404);
});
test('saved meal changes enforce the cutoff atomically',async()=>{
 const sub=db.getSubscriptions(1).find(s=>s.first_month===require('../lib/subscription').todayInKuwait().slice(0,7));
 const date=db.getSubscriptionMeals(sub.id)[0].date;const {addDays}=require('../lib/subscription');
 db.changeSubscriptionMeals(1,sub.id,sub.first_month,{[date]:String(liveMain[1].id)},new Date(addDays(date,-3)+'T00:00:00+03:00'));
 assert.equal(db.getSubscriptionMeals(sub.id)[0].menu_item_id,liveMain[1].id);
 assert.throws(()=>db.changeSubscriptionMeals(1,sub.id,sub.first_month,{[date]:String(liveMain[1].id)},new Date(addDays(date,-2)+'T00:00:00+03:00')),{code:'cutoff'});
 assert.equal(db.getSubscriptionMeals(sub.id)[0].menu_item_id,liveMain[1].id);
});
test('history lists paid subscriptions and invoice PDF has attachment headers',async()=>{
 const sub=db.getSubscriptions(1)[0];const history=await request('/history');assert.equal(history.status,200);assert.match(history.body,/Booking history/);assert.doesNotMatch(history.body,/cancel-booking-form|badge-collected/);
 const res=await fetch(base+`/history/${sub.id}/invoice.pdf`,{headers:{cookie}});assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'application/pdf');assert.equal(res.headers.get('content-disposition'),`attachment; filename="${sub.invoice_number}.pdf"`);const bytes=Buffer.from(await res.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');
 assert.equal((await request('/history/99999/invoice.pdf')).status,404);
});
test('cancel and renew endpoints are gone and do not change subscriptions',async()=>{
 const before=JSON.stringify(db.getSubscriptions(1));
 for(const route of ['/history/1/cancel','/booking/1/renew'])assert.equal((await request(route,{})).status,404);
 assert.equal(JSON.stringify(db.getSubscriptions(1)),before);
});
function newStudent(parentId=1) {return db.createStudent({parentId,name:'Test Child',civilId:'123456789012',school:'The English School',class:'Grade 3',section:'A',gender:'Male',allergies:'',mealType:'Regular Meal'});}
test('tampered session quote cannot change the charge',async()=>{
 const student=newStudent();await begin(String(student.id));await ready();
 const Layer=require('express/lib/router/layer');
 const layer=new Layer('/',{end:false},(req,res,next)=>{if(req.path==='/booking/pay'&&req.session.subscriptionDraft)req.session.subscriptionDraft.totalKWD=0.001;next();});
 const position=app._router.stack.findIndex(l=>l.name==='session')+1;app._router.stack.splice(position,0,layer);
 try{const before=db.getSubscriptions(1).length;assert.equal((await request('/booking/pay',{token})).location,'/booking/review');assert.equal(db.getSubscriptions(1).length,before);assert.match((await request('/booking/review')).body,/price changed/);}finally{app._router.stack.splice(app._router.stack.indexOf(layer),1);}
});
test('daily selection rejects non-meal dates, other months and invalid menu ids',async()=>{
 const student=newStudent();const page=await begin(String(student.id));const month=page.body.match(/name="month" value="([^"]+)"/)[1];
 const dates=[...page.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);const choices=Object.fromEntries(dates.map(d=>[`meals[${d}]`,String(liveMain[0].id)]));
 for(const extra of [{[`meals[${dates[0]}]`]:'99999'},{'meals[1999-01-01]':'1'},{month:'1999-01'},{[`meals[${dates[0]}]`]:'2abc'}]){
 const r=await request('/booking/meals',{token,month,...choices,...extra});assert.ok([404,422].includes(r.status));}
});
test('paid meals change through HTTP before cutoff; locked dates are rejected',async()=>{
 const student=newStudent();await begin(String(student.id));await ready();const paid=await request('/booking/pay',{token});const id=Number(paid.location.split('/').pop());const sub=db.getSubscription(id,1);const meal=db.getSubscriptionMeals(id)[0];
 const selected=db.getSchoolMenuItems(3).find(m=>m.category==='main').id;
 const changed=await request(`/subscriptions/${id}/meals`,{month:sub.first_month,[`meals[${meal.date}]`]:String(selected)});assert.equal(changed.status,302);assert.equal(db.getSubscriptionMeals(id)[0].menu_item_id,selected);
 const today=require('../lib/subscription').todayInKuwait();const current=db.getSubscriptions(1).find(s=>s.first_month===today.slice(0,7));const locked=db.getSubscriptionMeals(current.id).find(m=>!require('../lib/subscription').canChangeMeal(m.date));
 if(locked){const r=await request(`/subscriptions/${current.id}/meals`,{month:current.first_month,[`meals[${locked.date}]`]:String(liveMain[3].id)});assert.equal(r.status,422);assert.match(r.body,/cutoff/);}
});
test('real foreign parent records remain private across all routes',async()=>{
 const parent=db.createParent({civilId:'222222222222',name:'Other Parent',email:'other@example.test',phone:'99999999',passwordHash:'unused'});const student=newStudent(parent.id);
 const {firstBookableMonth,defaultMeals}=require('../lib/subscription');const quote=db.quoteSubscription(student.id,parent.id,1);const draft={...quote,studentId:student.id,monthsCount:1,firstMonth:firstBookableMonth(),token:'test-foreign',meals:defaultMeals(quote.months,db.getSchoolMenuItems(db.getSchoolByName(student.school).id)),termsAccepted:true,acceptedAt:new Date().toISOString(),stage:'knet'};const sub=db.paySubscription(parent.id,draft);
 for(const route of [`/subscriptions/${sub.id}/meals`,`/history/${sub.id}/invoice.pdf`,`/booking/confirmation/${sub.id}`,`/booking/new?student=${student.id}`])assert.equal((await request(route)).status,404);
 assert.equal((await request(`/subscriptions/${sub.id}/meals`,{month:draft.firstMonth})).status,404);
 assert.equal((await request('/booking/review',{student:String(student.id),months:'1'})).status,404);
});
test('month validation refuses malformed counts and incomplete calendars',async()=>{
 const student=newStudent();for(const months of ['0','7','1.5','Infinity','1x',''])assert.equal((await request('/booking/review',{student:String(student.id),months})).status,422);
 const month=require('../lib/subscription').firstBookableMonth();const row=sql.prepare('SELECT * FROM school_calendar_days WHERE school=? AND date=?').get(student.school,require('../lib/subscription').subscriptionStart());
 sql.prepare('DELETE FROM school_calendar_days WHERE school=? AND date=?').run(student.school,row.date);
 try{const r=await request('/booking/review',{student:String(student.id),months:'1'});assert.equal(r.status,422);assert.match(r.body,/complete calendar/);}finally{sql.prepare('INSERT INTO school_calendar_days(school,date,is_school_day) VALUES(?,?,?)').run(student.school,row.date,row.is_school_day);}
});
test('calendar startup coverage is complete, idempotent and preserves existing rows',()=>{
 const today=require('../lib/subscription').todayInKuwait();const end=new Date(today+'T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+9,0);const last=end.toISOString().slice(0,10);
 const school='The English School';sql.prepare('UPDATE school_calendar_days SET is_school_day=0 WHERE school=? AND date=?').run(school,last);
 const count=sql.prepare('SELECT COUNT(*) c FROM school_calendar_days').get().c;db.ensureCalendarCoverage();db.ensureCalendarCoverage();
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM school_calendar_days').get().c,count);assert.equal(sql.prepare('SELECT is_school_day FROM school_calendar_days WHERE school=? AND date=?').get(school,last).is_school_day,0);
});
test('removed marketing routes redirect by locale and stay out of the sitemap',async()=>{
 for(const [old,target] of [['features','how-it-works#features'],['caterers','corporate-meals']])for(const prefix of ['','/ar']){const r=await request(`${prefix}/${old}`);assert.equal(r.status,301);assert.equal(r.location,`${prefix}/${target}`);}
 const sitemap=await request('/sitemap.xml');assert.doesNotMatch(sitemap.body,/\/features|\/caterers/);assert.match(sitemap.body,/\/ar\/corporate-meals/);
 assert.doesNotMatch((await request('/robots.txt')).body,/Allow: .*\/(features|caterers)/);
 assert.equal((await request('/caterers/inquiry',{})).status,404);
});
test('corporate inquiry validates fields, preserves values, and stores its range',async()=>{
 const valid={organizationName:'Test Company',contactName:'Test Contact',email:'work@example.test',phone:'',scaleInfo:'26–100',message:'Workplace meals inquiry for our team.'};
 const count=sql.prepare('SELECT COUNT(*) c FROM inquiries').get().c;
 for(const [key,value] of [['organizationName','123'],['contactName','123'],['email','bad'],['phone','bad'],['scaleInfo','500'],['message','short']]){const r=await request('/corporate-meals/inquiry',{...valid,[key]:value});assert.equal(r.status,422);assert.match(r.body,/aria-invalid="true"/);if(key!=='organizationName')assert.match(r.body,/value="Test Company"/);}
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM inquiries').get().c,count);
 const success=await request('/ar/corporate-meals/inquiry',valid);assert.equal(success.location,'/ar/corporate-meals/register?success=1');const row=sql.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 1').get();assert.equal(row.type,'corporate');assert.equal(row.scale_info,'26–100');
});
test('class and section lists reject unlisted values and preserve other fields',async()=>{
 const student=newStudent();const valid={id:String(student.id),name:student.name,school:student.school,class:'Grade 3',section:'A',gender:'Male',allergies:''};
 for(const extra of [{class:'Year 3'},{class:''},{section:'Z'},{section:''}]){const r=await request('/students',{...valid,...extra});assert.equal(r.status,200);assert.match(r.body,/aria-invalid="true"/);assert.equal(db.findStudentById(student.id).section,'A');}
 assert.equal((await request('/students',{...valid,class:'Grade 12',section:'F'})).status,302);assert.equal(db.findStudentById(student.id).class,'Grade 12');
 for(const route of ['/register','/ar/register']){const r=await request(route);assert.match(r.body,/<dialog id="terms-dialog"/);assert.match(r.body,/href="\/terms" target="_blank" rel="noopener"/);}
});
test('six-month payment creates all rows and a stale draft cannot pay',async()=>{
 const student=newStudent();await begin(String(student.id),'6');const oldToken=token;await begin(String(student.id),'6');assert.notEqual(token,oldToken);
 assert.equal((await request('/booking/accept-terms',{token:oldToken})).status,409);
 await ready();const result=await request('/booking/pay',{token});const id=Number(result.location.split('/').pop());const sub=db.getSubscription(id,1);
 assert.equal(sub.months.length,6);assert.equal(db.getSubscriptionMeals(id).length,sub.meal_days);assert.equal(sub.total_kwd,sub.meal_days*db.getSchoolDailyRate('Kuwait English School'));
});
test('a late transaction failure rolls back subscription, months, meals and payment',async()=>{
 const student=newStudent();await begin(String(student.id));await ready();
 const before={subscriptions:sql.prepare('SELECT COUNT(*) c FROM subscriptions').get().c,payments:sql.prepare('SELECT COUNT(*) c FROM payments').get().c};
 sql.exec("CREATE TRIGGER qa_fail_terms BEFORE INSERT ON terms_acceptances BEGIN SELECT RAISE(ABORT, 'QA transaction failure'); END");
 try{assert.equal((await request('/booking/pay',{token})).status,500);assert.equal(sql.prepare('SELECT COUNT(*) c FROM subscriptions').get().c,before.subscriptions);assert.equal(sql.prepare('SELECT COUNT(*) c FROM payments').get().c,before.payments);assert.equal(sql.prepare('SELECT COUNT(*) c FROM subscription_months WHERE student_id=?').get(student.id).c,0);}finally{sql.exec('DROP TRIGGER qa_fail_terms');}
});
test('new subscriptions are visible in parent and school dashboards',async()=>{
 await request('/locale/en?returnTo=/dashboard');const dashboard=await request('/dashboard');assert.equal(dashboard.status,200);assert.match(dashboard.body,/Book more months/);assert.doesNotMatch(dashboard.body,/Quick rebook|action="\/booking\/\d+\/renew/);
 const originalCookie=cookie;await request('/school-admin/login');await request('/school-admin/login',{email:'admin@kes.evomeals.demo',password:'admin1234'});
 const admin=await request('/school-admin/dashboard');assert.equal(admin.status,200);assert.match(admin.body,/Meals in the next 7 days/);assert.match(admin.body,/Ahmed/);assert.doesNotMatch(admin.body,/Sara|Collected/);cookie=originalCookie;await request('/login');await request('/login',{civilId:'111111111111',password:'demo1234'});await request('/dashboard');
});
test('every school uses the current catalogue without legacy demo dishes',()=>{
 const schools=db.getSchools();assert.equal(schools.length,3);
 const expected=db.getSchoolMenuItems(3).map(m=>m.id);
 for(const school of schools){
  assert.deepEqual(db.getSchoolMenuItems(school.id).map(m=>m.id),expected);
  assert.deepEqual(db.getMenuForSchool(school.id).map(g=>g.category),['main','side','drink']);
  assert.equal(db.getSchoolMenuItems(school.id).length,58);
  assert.ok(db.getSchoolMenuItems(school.id).every(m=>m.source_key));
 }
 assert.deepEqual(db.getMenuForSchool(-1),[]);
 assert.ok(db.getMenuItems().every(m=>m.source_key));
 assert.ok(db.findMenuItem(1),'Historical dishes remain resolvable');
});
test('public school selection validates slugs, persists, and defaults to the first child',async()=>{
 const saved=cookie;cookie='';
 try {
  let r=await request('/parents?school=not-a-school');assert.equal(r.status,200);assert.doesNotMatch(r.body,/class="school-dish-grid"/);
  r=await request('/parents?school=american-creativity-academy');assert.match(r.body,/id="school-2-panel-main"/);assert.match(r.body,/id="school-2-panel-snack"/);assert.match(r.body,/No Snack options are listed/);
  r=await request('/ar/parents');assert.match(r.body,/id="school-2-panel-main"/);
  r=await request('/parents?school=bad');assert.match(r.body,/id="school-2-panel-main"/);
  r=await request('/parents?school=the-english-school');assert.match(r.body,/id="school-3-panel-snack"/);
 } finally {cookie=saved;}
 const r=await request('/parents');assert.match(r.body,/id="school-1-panel-main"/);
 const menu=await request('/menu?school=kuwait-english-school');assert.match(menu.body,/id="school-1-panel-main"/);assert.doesNotMatch(menu.body,/id="school-2-panel-main"/);assert.equal((menu.body.match(/data-menu-name=/g)||[]).length,58);
});
test('marketing removes public pricing and redundant Parents dish sections',async()=>{
 for(const p of ['/','/parents','/schools','/corporate-meals','/about','/how-it-works'])for(const prefix of ['','/ar']){
  const r=await request(prefix+(p==='/'?'':p)||'/');assert.equal(r.status,200);assert.doesNotMatch(r.body,/KWD\s*2\.000|id="pricing"|parents\.pricing/);
  if(p==='/parents')assert.doesNotMatch(r.body,/food-card--featured|food-supporting|id="menu"/);
 }
});
test('off-school dishes are rejected in drafts, payment and paid meal changes',async()=>{
 const student=newStudent();const r=await begin(String(student.id));const month=r.body.match(/name="month" value="([^"]+)"/)[1];const dates=[...r.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);
 assert.doesNotMatch(r.body,/<option value="2"/);assert.equal((await request('/booking/meals',{token,month,...Object.fromEntries(dates.map(d=>[`meals[${d}]`,'2']))})).status,422);
 await ready();const paid=await request('/booking/pay',{token});const id=Number(paid.location.split('/').pop());
 assert.equal((await request(`/subscriptions/${id}/meals`,{month,[`meals[${dates[0]}]`]:'2'})).status,422);
 const other=newStudent(),quote=db.quoteSubscription(other.id,1,1),rules=require('../lib/subscription');const draft={...quote,studentId:other.id,monthsCount:1,firstMonth:quote.months[0].month,token:'off-menu-payment',meals:rules.defaultMeals(quote.months,db.getSchoolMenuItems(3)),termsAccepted:true,acceptedAt:new Date().toISOString(),stage:'knet'};draft.meals[quote.months[0].mealDates[0]]=2;
 assert.throws(()=>db.paySubscription(1,draft),{code:'invalidMeals'});
});
test('school rate is used at review and pay; later rate edits do not rewrite history',async()=>{
 const student=newStudent();const oldRate=db.getSchoolDailyRate(student.school);
 try{
  sql.prepare('UPDATE schools SET daily_rate_kwd=3.75 WHERE id=3').run();await begin(String(student.id));let review=await request('/booking/review');assert.match(review.body,/3\.750/);await request('/booking/meals');await ready();
  sql.prepare('UPDATE schools SET daily_rate_kwd=4.25 WHERE id=3').run();assert.equal((await request('/booking/pay',{token})).location,'/booking/review');assert.match((await request('/booking/review')).body,/4\.250/);await request('/booking/meals');await ready();
  const paid=await request('/booking/pay',{token});const id=Number(paid.location.split('/').pop());const record=db.getSubscription(id,1);assert.equal(record.total_kwd,record.meal_days*4.25);
  sql.prepare('UPDATE schools SET daily_rate_kwd=5 WHERE id=3').run();assert.equal(db.getSubscription(id,1).total_kwd,record.total_kwd);assert.equal(db.getSubscription(id,1).daily_rate_kwd,4.25);
 }finally{sql.prepare('UPDATE schools SET daily_rate_kwd=? WHERE id=3').run(oldRate);}
});
test('crossing the weekly cutoff expires a draft and locks the earlier week',()=>{
 const rules=require('../lib/subscription'),student=newStudent();const first=rules.subscriptionStart();const now=rules.addDays(first,-3)+'T23:59:59+03:00';const after=rules.addDays(first,-2)+'T00:00:00+03:00';
 const quote=db.quoteSubscription(student.id,1,1,first.slice(0,7),first,rules.nextServiceStart(now));const draft={...quote,studentId:student.id,monthsCount:1,firstMonth:quote.months[0].month,token:'cutoff-expiration',meals:rules.defaultMeals(quote.months,db.getSchoolMenuItems(3)),termsAccepted:true,acceptedAt:now,stage:'knet'};
 assert.throws(()=>db.paySubscription(1,draft,new Date(after)),{code:'expired'});
 const paid=db.paySubscription(1,draft,new Date(now));const date=quote.months[0].mealDates[0];const selected=String(db.getSchoolMenuItems(3).find(m=>m.category==='main').id);db.changeSubscriptionMeals(1,paid.id,date.slice(0,7),{[date]:selected},new Date(now));
 assert.throws(()=>db.changeSubscriptionMeals(1,paid.id,date.slice(0,7),{[date]:selected},new Date(after)),{code:'cutoff'});
});
test('month preview and review both roll an empty first window forward',async()=>{
 const rules=require('../lib/subscription'),student=newStudent(),start=rules.subscriptionStart(),end=rules.monthDates(start.slice(0,7)).at(-1);
 const rows=sql.prepare('SELECT * FROM school_calendar_days WHERE school=? AND date BETWEEN ? AND ?').all(student.school,start,end);
 try {
  sql.prepare('UPDATE school_calendar_days SET is_school_day=0 WHERE school=? AND date BETWEEN ? AND ?').run(student.school,start,end);
  const quote=db.quoteSubscription(student.id,1,1),next=rules.subscriptionMonths(2,start.slice(0,7))[1];assert.equal(quote.months[0].month,next);assert.equal(quote.months[0].startDate,next+'-01');
  const preview=await request('/booking/new?student='+student.id);
  assert.equal(preview.status,200);assert.ok(preview.body.includes('data-month-index="0"'));
  const firstLabel=preview.body.match(/data-month-index="0"[^>]*>([^<]+)</)[1];
  const meals=await begin(String(student.id));assert.match(meals.body,new RegExp('name="month" value="'+next+'"'));
  const review=await request('/booking/review');assert.ok(review.body.includes(firstLabel));
 } finally { const restore=sql.prepare('UPDATE school_calendar_days SET is_school_day=? WHERE school=? AND date=?');rows.forEach(r=>restore.run(r.is_school_day,r.school,r.date)); }
});
test('expired draft returns to a fresh review and requires payment terms again',async()=>{
 const student=newStudent();await begin(String(student.id));await ready();const before=db.getSubscriptions(1).length;
 const Layer=require('express/lib/router/layer'),rules=require('../lib/subscription');
 const layer=new Layer('/',{end:false},(req,res,next)=>{if(req.path==='/booking/pay'&&req.session.subscriptionDraft)req.session.subscriptionDraft.eligibilityStart=rules.addDays(rules.nextServiceStart(),-7);next();});
 const position=app._router.stack.findIndex(l=>l.name==='session')+1;app._router.stack.splice(position,0,layer);
 try {assert.equal((await request('/booking/pay',{token})).location,'/booking/review');assert.equal(db.getSubscriptions(1).length,before);
  const review=await request('/booking/review');assert.equal(review.status,200);assert.match(review.body,/href="\/booking\/meals"/);assert.equal((await request('/booking/payment')).location,'/booking/meals');
 } finally { app._router.stack.splice(app._router.stack.indexOf(layer),1); }
});

test('school menus expose all four categories with localized empty states', async()=>{
 for(const prefix of ['', '/ar']) {
  const r=await request(prefix+'/parents?school=the-english-school');
  assert.equal(r.status,200);
  for(const category of ['main','side','drink','snack']) {
   assert.match(r.body,new RegExp('id="school-3-tab-'+category+'"'));
   assert.match(r.body,new RegExp('id="school-3-panel-'+category+'"'));
  }
  assert.match(r.body, prefix ? /لا تتوفر خيارات/ : /No Snack options are listed/);
  assert.doesNotMatch(r.body,/schoolMenu\.categoryEmpty/);
 }
});

test('live catalogue exactly matches every source dish and audience, with local images',()=>{
 const snapshot=require('../data/live-menu.json');
 const source=snapshot.schools[0];const items=db.getSchoolMenuItems(3);
 assert.equal(items.length,58);
 assert.deepEqual(Object.values(source.categories).map(rows=>rows.length),[97,4,6,0]);
 for(const [category,rows] of Object.entries(source.categories))for(const row of rows){
  const item=items.find(m=>m.source_key===`${source.branchId}:${row.m_ItemId}:${row.m_MealCategoryId}`);
  assert.ok(item);assert.equal(item.name,row.m_ItemName);assert.equal(item.category,category);
  assert.equal(item.tag,row.m_MealCategory);assert.ok(JSON.parse(item.audiences).includes(row.m_StdCatg));
  assert.equal(item.nutrition_known,0);assert.equal(item.source_url,snapshot.source);
  const image=fs.readFileSync(path.join(__dirname,'../public',item.source_image));
  assert.equal(image.subarray(0,4).toString(),'RIFF');assert.equal(image.subarray(8,12).toString(),'WEBP');
 }
 assert.equal(items.reduce((n,item)=>n+JSON.parse(item.audiences).length,0),107);
});
test('source import is idempotent, preserves history and rolls back invalid changes',()=>{
 const importer=require('../db/import-menu');const source=require('../data/live-menu.json');
 const before=JSON.stringify(db.getSchoolMenuItems(3));const historical=JSON.stringify(sql.prepare('SELECT * FROM subscription_meals').all());
 importer(sql);assert.equal(JSON.stringify(db.getSchoolMenuItems(3)),before);
 const updated=structuredClone(source);updated.fetchedAt='2026-10-19T12:00:00.000Z';importer(sql,updated);
 assert.equal(JSON.stringify(db.getSchoolMenuItems(3)),before);assert.equal(JSON.stringify(sql.prepare('SELECT * FROM subscription_meals').all()),historical);
 const broken=structuredClone(updated);broken.schools[0].categories.main[0].m_ItemImage='../invalid.png';
 assert.throws(()=>importer(sql,broken),/Invalid source image/);assert.equal(JSON.stringify(db.getSchoolMenuItems(3)),before);
 importer(sql,source);
});
test('live daily booking offers mains without fabricated calories and rejects sides',async()=>{
 const student=newStudent();const page=await begin(String(student.id));
 const items=db.getSchoolMenuItems(3);const side=items.find(m=>m.category==='side');
 assert.match(page.body,/Arabiatta Chicken Pasta/);assert.doesNotMatch(page.body,/Assorted Fruit Cup|0 kcal/);
 const month=page.body.match(/name="month" value="([^"]+)"/)[1];
 const dates=[...page.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);
 const choices=Object.fromEntries(dates.map(date=>[`meals[${date}]`,String(side.id)]));
 assert.equal((await request('/booking/meals',{token,month,...choices})).status,422);
});
test('booking guide uses exact requested copy and removes the old subtitle',async()=>{
 const page=await request('/how-it-works');assert.match(page.body,/<h1>Book Monthly Meals in Three Steps<\/h1>/);
 assert.match(page.body,/<h2>Select the month<\/h2>/);assert.match(page.body,/<h2>Choose your meals<\/h2>/);
 assert.doesNotMatch(page.body,/The same steps apply|Book a month of meals|Choose your daily meals|Choose your months/);
});

test('every live menu dish renders on English and Arabic pages without the removed notice',async()=>{
 const escape=require('ejs').escapeXML;
 const expected=db.getSchoolMenuItems(3);
 for(const prefix of ['', '/ar']) {
  const page=await request(prefix+'/parents?school=the-english-school');
  assert.equal(page.status,200);
  assert.equal((page.body.match(/data-menu-name=/g)||[]).length,expected.length);
  for(const item of expected) {
   assert.ok(page.body.includes(`data-menu-name="${escape(item.name)}"`),item.name);
   assert.ok(page.body.includes(`src="${item.source_image}"`),item.source_image);
  }
  assert.doesNotMatch(page.body,/Listed on EVO360|Nutrition, ingredients and allergen details have not been supplied|مدرج على EVO360|schoolMenu\.sourceDetails/);
 }
});

test('every imported main can be selected, paid, confirmed and reloaded',async()=>{
 const student=newStudent();await begin(String(student.id),'6');
 const main=db.getSchoolMenuItems(3).filter(m=>m.category==='main');const expected=new Set();let index=0;
 const review=await request('/booking/meals');const months=[...review.body.matchAll(/<option value="(\d{4}-\d{2})"/g)].map(m=>m[1]);
 for(const month of months){
  const page=await request('/booking/meals?month='+month);const dates=[...page.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);
  const choices=Object.fromEntries(dates.map(date=>{const item=main[index++%main.length];expected.add(item.id);return [`meals[${date}]`,String(item.id)];}));
  assert.equal((await request('/booking/meals',{token,month,...choices})).status,302);
 }
 assert.equal(expected.size,53);
 await ready();const payment=await request('/booking/payment');for(const item of main)assert.ok(payment.body.includes(require('ejs').escapeXML(item.name)));
 await request('/booking/knet');const paid=await request('/booking/pay',{token});assert.equal(paid.status,302);
 const id=Number(paid.location.split('/').pop());assert.deepEqual(new Set(db.getSubscriptionMeals(id).map(m=>m.menu_item_id)),expected);
 const confirmation=await request(paid.location);for(const item of main)assert.ok(confirmation.body.includes(require('ejs').escapeXML(item.name)));
 assert.equal((await request(`/subscriptions/${id}/meals`)).status,200);
});
test('verified portion nutrition is atomic and shared with public and account menus',async()=>{
 const {importNutrition}=require('../db/nutrition');const item=db.getSchoolMenuItems(3)[0];
 // Explicit test fixture only: never imported into the working database.
 const record={source_key:item.source_key,audience:'Junior',serving_g:250,calories:345,protein:25,carbs:50,fat:5,source_reference:'test fixture',verified_by:'test',verified_at:'2026-10-19'};
 assert.throws(()=>importNutrition(sql,[{...record,protein:null}]),/invalid protein/);
 assert.throws(()=>importNutrition(sql,[record,{...record,audience:'Senior',serving_g:1}]),/exceed/);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM menu_portion_nutrition').get().n,0);
 try{
  assert.equal(importNutrition(sql,[record]),1);assert.equal(importNutrition(sql,[record]),1);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM menu_portion_nutrition').get().n,1);
  assert.equal(db.getSchoolMenuItems(3)[0].nutrition[0].protein,25);
  assert.equal(db.getMenuItems().find(m=>m.id===item.id).nutrition[0].calories,345);
  const page=await request('/parents?school=the-english-school');assert.match(page.body,/250 g/);assert.match(page.body,/345/);
 }finally{sql.prepare('DELETE FROM menu_portion_nutrition').run();}
});

test('login menu uses the full catalogue for existing children in every configured school',async()=>{
 const initial=await request('/menu');assert.equal(initial.status,200);assert.doesNotMatch(initial.body,/data-menu-name=/);
 const invalid=await request('/menu?school=invalid');assert.doesNotMatch(invalid.body,/data-menu-name=/);
 for(const school of db.getSchools()){
  const page=await request('/menu?school='+school.slug);
  assert.equal((page.body.match(/data-menu-name=/g)||[]).length,58);
  assert.match(page.body,new RegExp('id="school-'+school.id+'-panel-drink"'));
  assert.doesNotMatch(page.body,/Balsamic Chicken|Seasonal Fruit Cup|redesign|schoolMenu.intro/);
 }
 for(const school of db.getSchools()){
  const student=db.createStudent({...db.findStudentById(1),school:school.name,civilId:'123456780001'});
  const meals=await begin(String(student.id));
  assert.match(meals.body,/Baked Chicken Pasta/);assert.match(meals.body,/Sriracha Chicken Burger/);
  assert.doesNotMatch(meals.body,/Balsamic Chicken|Seasonal Fruit Cup/);
 }
});
test('new registration can browse the full catalogue before adding a child',async()=>{
 const saved=cookie;cookie='';
 try{
  await request('/register');
  const registered=await request('/register',{name:'Menu Test Parent',civilId:'777777777777',email:'menu@example.test',phone:'99999999',password:'TestPass123!',confirmPassword:'TestPass123!',agreeTerms:'on'});
  assert.equal(registered.status,302);
  const menu=await request('/menu');assert.equal(menu.status,200);assert.equal((menu.body.match(/data-menu-name=/g)||[]).length,0);
  const selected=await request('/menu?school=the-english-school');assert.equal((selected.body.match(/data-menu-name=/g)||[]).length,58);
  assert.doesNotMatch(menu.body,/Balsamic Chicken|Seasonal Fruit Cup/);
  assert.equal((await request('/dashboard')).status,200);assert.equal((await request('/booking')).status,200);
 }finally{cookie=saved;}
});

test('all published audience portions have labelled estimates and verified records take priority',async()=>{
 const items=db.getSchoolMenuItems(3);
 assert.equal(items.reduce((n,m)=>n+m.nutrition.length,0),107);
 for(const item of items){
  assert.deepEqual(item.nutrition.map(p=>p.audience).sort(),JSON.parse(item.audiences).sort());
  for(const p of item.nutrition){
   assert.equal(p.estimated,true);
   assert.ok(p.source_reference.startsWith('https://www.ars.usda.gov/'));
   for(const key of ['calories','protein','carbs','fat','serving_g'])assert.ok(Number.isFinite(p[key])&&p[key]>=0);
   assert.ok(p.protein+p.carbs+p.fat<=p.serving_g);
  }
 }
 const pasta=items.find(m=>m.name==='Arabiatta Chicken Pasta').nutrition.find(p=>p.audience==='Junior');
 // Independent check: 140g pasta + 65g roasted breast + 60g tomato sauce + 5g oil.
 assert.deepEqual([pasta.serving_g,pasta.calories,pasta.protein,pasta.carbs,pasta.fat],[270,365,28,44,8]);
 const noDrink=items.find(m=>m.name==='No Drink');assert.ok(noDrink.nutrition.every(p=>p.calories===0&&p.serving_g===0));
 const page=await request('/menu?school=the-english-school');assert.match(page.body,/Estimated nutrition/);assert.match(page.body,/Assumed portion/);
 const item=items[0];const {importNutrition}=require('../db/nutrition');
 try{
  importNutrition(sql,[{source_key:item.source_key,audience:'Junior',serving_g:250,calories:345,protein:25,carbs:40,fat:10,source_reference:'Test approved recipe',verified_by:'Test reviewer',verified_at:'2026-10-19'}]);
  const updated=db.getSchoolMenuItems(3).find(m=>m.id===item.id).nutrition;
  assert.equal(updated.length,2);assert.equal(updated.find(p=>p.audience==='Junior').estimated,undefined);
  assert.equal(updated.find(p=>p.audience==='Junior').calories,345);assert.equal(updated.find(p=>p.audience==='Senior').estimated,true);
 }finally{sql.prepare('DELETE FROM menu_portion_nutrition WHERE menu_item_id=?').run(item.id);}
});

test('school guide and corporate registration routes share the expected public flow',async()=>{
 for(const prefix of ['', '/ar']) {
  const parents=await request(prefix+'/parents');
  const guide=await request(prefix+'/how-it-works');
  assert.equal((parents.body.match(/class="booking-guide-card"/g)||[]).length,3);
  assert.equal((guide.body.match(/class="booking-guide-card"/g)||[]).length,3);
  const corporate=await request(prefix+'/corporate-meals');
  assert.equal(corporate.status,200);
  assert.match(corporate.body,/corporate-meals\/register/);
  assert.match(corporate.body,/data-school-tabs/);
  assert.match(corporate.body,/Assorted Fruit Cup/);
  assert.match(corporate.body,/Fresh Juice/);
  assert.doesNotMatch(corporate.body,/id="corporateInquiryForm"/);
  const register=await request(prefix+'/corporate-meals/register');
  assert.equal(register.status,200);
  assert.ok(register.body.includes('action="'+prefix+'/corporate-meals/inquiry"'));
  assert.doesNotMatch(parents.body,/>For Parents</);
 }
});
