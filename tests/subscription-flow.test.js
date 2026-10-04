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
