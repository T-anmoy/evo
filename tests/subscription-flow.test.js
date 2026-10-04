const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const file=path.join(os.tmpdir(),`evo-subscriptions-${process.pid}.db`);
process.env.DATABASE_FILE=file;process.env.SESSION_SECRET='test-only';process.env.LOG_LEVEL='silent';
const app=require('../server'), db=require('../db'), SQL=require('better-sqlite3');
const sql=new SQL(file);let server,base,cookie='',csrf='',token='';
async function request(route,fields){const res=await fetch(base+route,{method:fields?'POST':'GET',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:fields?new URLSearchParams({...fields,_csrf:csrf}):undefined,redirect:'manual'});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const body=await res.text();const c=body.match(/name="_csrf" value="([^"]+)"/);if(c)csrf=c[1];const d=body.match(/name="token" value="([^"]+)"/);if(d)token=d[1];return {status:res.status,body,headers:res.headers,location:res.headers.get('location')};}
before(async()=>{server=app.listen(0);base=`http://localhost:${server.address().port}`;await request('/login');await request('/login',{civilId:'111111111111',password:'demo1234'});await request('/dashboard');});
after(()=>{server.close();sql.close();for(const suffix of ['','-wal','-shm'])fs.rmSync(file+suffix,{force:true});});
async function begin(student='1',months='1'){
 const r=await request('/booking/review',{student,months});assert.equal(r.status,302,r.body);assert.equal(r.location,'/booking/review');
 assert.equal((await request('/booking/review')).status,200);
 const meals=await request('/booking/meals');assert.equal(meals.status,200,meals.body);
 return meals;
}
async function ready(){assert.equal((await request('/booking/accept-terms',{token})).location,'/booking/payment');assert.equal((await request('/booking/payment')).status,200);assert.equal((await request('/booking/knet')).status,200);}
test('payment is gated by a draft and step order',async()=>{
 assert.equal((await request('/booking/knet')).location,'/booking');
 const r=await request('/booking/review',{student:'1',months:'1'});assert.equal(r.status,302);
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
 const fields={token,month,...Object.fromEntries(dates.map(d=>[`meals[${d}]`,'4']))};
 assert.equal((await request('/booking/meals',fields)).status,302);
 await request('/booking/meals?month='+month);await ready();
 const paid=await request('/booking/pay',{token,totalKWD:'0.001'});assert.equal(paid.status,302,paid.body);assert.match(paid.location,/\/booking\/confirmation\/\d+/);
 const id=Number(paid.location.split('/').pop());const sub=db.getSubscription(id,1);
 assert.equal(sub.total_kwd,dates.length*db.getDailyRate());assert.ok(db.getSubscriptionMeals(id).every(m=>m.menu_item_id===4));
 assert.equal((await request(paid.location)).status,200);
 assert.equal((await request('/booking/pay',{token})).location,paid.location);
 assert.equal(db.getSubscriptions(1).length,before+1);
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM payments WHERE subscription_id=?').get(id).c,1);
 assert.equal(sql.prepare('SELECT COUNT(*) c FROM terms_acceptances WHERE subscription_id=?').get(id).c,1);
 assert.equal((await request('/booking/review',{student:'1',months:'1'})).status,422);
 assert.throws(()=>sql.prepare('INSERT INTO subscription_months(subscription_id,student_id,month,total_days,holiday_days,meal_days,rate_kwd,amount_kwd) VALUES(?,?,?,?,?,?,?,?)').run(id,1,month,31,12,19,2,38),/UNIQUE/);
});
test('changed database price returns to review with no payment',async()=>{
 await begin('2');await ready();const before=db.getSubscriptions(1).length;
 sql.prepare("UPDATE plans SET rate_kwd=3 WHERE code='single'").run();
 const response=await request('/booking/pay',{token});assert.equal(response.location,'/booking/review');assert.equal(db.getSubscriptions(1).length,before);
 const review=await request('/booking/review');assert.match(review.body,/price changed/);
 assert.equal((await request('/booking/payment')).location,'/booking/meals');
 sql.prepare("UPDATE plans SET rate_kwd=2 WHERE code='single'").run();
});
test('foreign subscription, confirmation and student cannot be accessed',async()=>{
 for(const route of ['/subscriptions/99999/meals','/booking/confirmation/99999','/booking/new?student=99999'])assert.equal((await request(route)).status,404);
 assert.equal((await request('/subscriptions/99999/meals',{month:'2026-01'})).status,404);
});
test('saved meal changes enforce the cutoff atomically',async()=>{
 const sub=db.getSubscriptions(1).find(s=>s.first_month===require('../lib/subscription').todayInKuwait().slice(0,7));
 const date=db.getSubscriptionMeals(sub.id)[0].date;const {addDays}=require('../lib/subscription');
 db.changeSubscriptionMeals(1,sub.id,sub.first_month,{[date]:'2'},new Date(addDays(date,-3)+'T00:00:00+03:00'));
 assert.equal(db.getSubscriptionMeals(sub.id)[0].menu_item_id,2);
 assert.throws(()=>db.changeSubscriptionMeals(1,sub.id,sub.first_month,{[date]:'3'},new Date(addDays(date,-2)+'T00:00:00+03:00')),{code:'cutoff'});
 assert.equal(db.getSubscriptionMeals(sub.id)[0].menu_item_id,2);
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
 const dates=[...page.body.matchAll(/name="meals\[([^\]]+)\]"/g)].map(m=>m[1]);const choices=Object.fromEntries(dates.map(d=>[`meals[${d}]`,'1']));
 for(const extra of [{[`meals[${dates[0]}]`]:'99999'},{'meals[1999-01-01]':'1'},{month:'1999-01'},{[`meals[${dates[0]}]`]:'2abc'}]){
 const r=await request('/booking/meals',{token,month,...choices,...extra});assert.ok([404,422].includes(r.status));}
});
test('paid meals change through HTTP before cutoff; locked dates are rejected',async()=>{
 const student=newStudent();await begin(String(student.id));await ready();const paid=await request('/booking/pay',{token});const id=Number(paid.location.split('/').pop());const sub=db.getSubscription(id,1);const meal=db.getSubscriptionMeals(id)[0];
 const changed=await request(`/subscriptions/${id}/meals`,{month:sub.first_month,[`meals[${meal.date}]`]:'3'});assert.equal(changed.status,302);assert.equal(db.getSubscriptionMeals(id)[0].menu_item_id,3);
 const today=require('../lib/subscription').todayInKuwait();const current=db.getSubscriptions(1).find(s=>s.first_month===today.slice(0,7));const locked=db.getSubscriptionMeals(current.id).find(m=>!require('../lib/subscription').canChangeMeal(m.date));
 if(locked){const r=await request(`/subscriptions/${current.id}/meals`,{month:current.first_month,[`meals[${locked.date}]`]:'4'});assert.equal(r.status,422);assert.match(r.body,/cutoff/);}
});
test('real foreign parent records remain private across all routes',async()=>{
 const parent=db.createParent({civilId:'222222222222',name:'Other Parent',email:'other@example.test',phone:'99999999',passwordHash:'unused'});const student=newStudent(parent.id);
 const {firstBookableMonth,defaultMeals}=require('../lib/subscription');const quote=db.quoteSubscription(student.id,parent.id,1);const draft={...quote,studentId:student.id,monthsCount:1,firstMonth:firstBookableMonth(),token:'test-foreign',meals:defaultMeals(quote.months,db.getMenuItems()),termsAccepted:true,acceptedAt:new Date().toISOString(),stage:'knet'};const sub=db.paySubscription(parent.id,draft);
 for(const route of [`/subscriptions/${sub.id}/meals`,`/history/${sub.id}/invoice.pdf`,`/booking/confirmation/${sub.id}`,`/booking/new?student=${student.id}`])assert.equal((await request(route)).status,404);
 assert.equal((await request(`/subscriptions/${sub.id}/meals`,{month:draft.firstMonth})).status,404);
 assert.equal((await request('/booking/review',{student:String(student.id),months:'1'})).status,404);
});
test('month validation refuses malformed counts and incomplete calendars',async()=>{
 const student=newStudent();for(const months of ['0','7','1.5','Infinity','1x',''])assert.equal((await request('/booking/review',{student:String(student.id),months})).status,422);
 const month=require('../lib/subscription').firstBookableMonth();const row=sql.prepare('SELECT * FROM school_calendar_days WHERE school=? AND date=?').get(student.school,month+'-01');
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
 const success=await request('/ar/corporate-meals/inquiry',valid);assert.equal(success.location,'/ar/corporate-meals?success=1');const row=sql.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 1').get();assert.equal(row.type,'corporate');assert.equal(row.scale_info,'26–100');
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
 assert.equal(sub.months.length,6);assert.equal(db.getSubscriptionMeals(id).length,sub.meal_days);assert.equal(sub.total_kwd,sub.meal_days*db.getDailyRate());
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
 const admin=await request('/school-admin/dashboard');assert.equal(admin.status,200);assert.match(admin.body,/Meals in the next 7 days/);assert.match(admin.body,/Ahmed/);assert.doesNotMatch(admin.body,/Sara|Collected/);cookie=originalCookie;await request('/dashboard');
});
