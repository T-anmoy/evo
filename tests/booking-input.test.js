const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validDate, validateMealInput } = require('../lib/booking-input');
const context = { students:[{id:1,school:'A'}], menuItems:[{id:1}], calendar:{A:['2026-09-23']}, today:'2026-09-23', horizon:'2026-12-31' };
const valid = {studentId:'1',menuItemId:'1',planType:'single',startDate:'2026-09-23',days:'1'};
test('strict dates reject calendar rollover, malformed and non-string input', () => {
  for (const date of ['2026-02-29','2026-04-31','bad','2026-1-01',null,[]]) assert.equal(validDate(date),false);
  assert.equal(validDate('2028-02-29'),true);
});
test('booking boundaries accept 1 and 30 whole days and ignore monthly day count', () => {
  for (const days of ['1','30']) assert.equal(validateMealInput({...valid,days},context),null);
  assert.equal(validateMealInput({...valid,planType:'monthly',days:undefined},context),null);
});
const invalid = [
 ['plan',{planType:'invalid'},'errInvalidPlan'],['menu',{menuItemId:'999'},'errInvalidMenu'],
 ['ownership',{studentId:'999'},'errInvalidStudent'],['malformed date',{startDate:'invalid'},'errInvalidDate'],
 ['past date',{startDate:'2026-09-22'},'errInvalidDate'],['outside calendar',{startDate:'2027-01-01'},'errInvalidDate'],
 ['non-school day',{startDate:'2026-09-25'},'errSchoolDay'],
 ...['0','31','1.5','Infinity','NaN','-1','2abc',''].map(days=>['days '+days,{days},'errInvalidDays'])
];
for (const [name,change,error] of invalid) test('rejects '+name,()=>assert.equal(validateMealInput({...valid,...change},context),error));

const file=path.join(os.tmpdir(),`evo-boundary-${process.pid}.db`);
process.env.DATABASE_FILE=file;process.env.SESSION_SECRET='test-only-secret';process.env.LOG_LEVEL='silent';
let server,base,cookie='',csrf,db,good;
async function request(route,fields) {
 const res=await fetch(base+route,{method:fields?'POST':'GET',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:fields?new URLSearchParams({...fields,_csrf:csrf}):undefined,redirect:'manual'});
 if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
 const body=await res.text(); const token=body.match(/name="_csrf" value="([^"]+)"/);if(token)csrf=token[1];
 return {status:res.status,body,location:res.headers.get('location')};
}
before(async()=>{
 server=http.createServer(require('../server'));await new Promise(r=>server.listen(0,r));base=`http://127.0.0.1:${server.address().port}`;db=require('../db');
 await request('/login');assert.equal((await request('/login',{civilId:'111111111111',password:'demo1234'})).status,302);
 // Signing in regenerates the session, which deliberately invalidates the
 // pre-login CSRF token. A browser picks up a fresh one from the next
 // page it renders; this harness has to do the same.
 await request('/dashboard');
 const {today,horizon}=require('../lib/booking-input').bookingWindow();
 good={...valid,startDate:db.getSchoolDaysInRange(db.getStudentsByParent(1)[0].school,today,horizon)[0]};
});
after(async()=>{await new Promise(r=>server.close(r));for(const suffix of ['','-wal','-shm'])fs.rmSync(file+suffix,{force:true});});
test('HTTP booking errors are usable and never write bookings',async()=>{
 const count=db.getBookingsForParent(1).length;
 for (const change of [{planType:'fake'},{menuItemId:'999'},{studentId:'999'},{days:'31'},{days:'1.5'},{startDate:'not-a-date',planType:'monthly'},{startDate:'2026-02-30'}]) {
  const r=await request('/booking',{...good,...change});assert.equal(r.status,422);assert.match(r.body,/role="alert"/);
 }
 assert.equal(db.getBookingsForParent(1).length,count);
});
test('HTTP valid booking calculates, records once, and redirects to its confirmation',async()=>{
 const count=db.getBookingsForParent(1).length;
 const posted=await request('/booking',good);
 // POST -> redirect -> GET: the success page is a GET of the stored
 // booking, not the POST response a refresh would replay.
 assert.equal(posted.status,302);
 assert.equal(db.getBookingsForParent(1).length,count+1);
 const newestId=Math.max(...db.getBookingsForParent(1).map(b=>b.id));
 assert.equal(posted.location,`/booking?booked=${newestId}`);
 const confirmation=await request(posted.location);
 assert.equal(confirmation.status,200);
 assert.match(confirmation.body,/role="status"/);
 // Re-requesting the confirmation URL is what a refresh now does. It must
 // not charge a second booking.
 const replay=await request(posted.location);
 assert.equal(replay.status,200);
 assert.equal(db.getBookingsForParent(1).length,count+1);
});
test('a booking id this parent does not own shows no confirmation',async()=>{
 const foreign=Math.max(...db.getBookingsForParent(1).map(b=>b.id))+9999;
 const r=await request(`/booking?booked=${foreign}`);
 assert.equal(r.status,200);
 assert.doesNotMatch(r.body,/role="status"/);
});
test('cancellation states its outcome, and an ineligible cancel changes nothing',async()=>{
 const target=db.getBookingsForParent(1).find(b=>b.status==='upcoming');
 assert.ok(target,'expected an upcoming booking to cancel');
 const cancelled=await request(`/history/${target.id}/cancel`,{});
 assert.equal(cancelled.status,302);
 assert.equal(cancelled.location,'/history?cancelled=1');
 assert.equal(db.findBookingById(target.id).status,'cancelled');
 const page=await request('/history?cancelled=1');
 assert.match(page.body,/role="status"/);
 // Same booking again: already cancelled, so it is refused and said so.
 const repeat=await request(`/history/${target.id}/cancel`,{});
 assert.equal(repeat.location,'/history?cancelfailed=1');
 assert.equal(db.findBookingById(target.id).status,'cancelled');
});
test('a cancel for a booking this parent does not own is refused',async()=>{
 const before=db.getBookingsForParent(1).map(b=>b.status).join(',');
 const r=await request('/history/999999/cancel',{});
 assert.equal(r.location,'/history?cancelfailed=1');
 assert.equal(db.getBookingsForParent(1).map(b=>b.status).join(','),before);
});
test('Staff validates menu/date without writing invalid records',async()=>{
 const count=db.getStaffBookingsByParent(1).length;
 for(const change of [{menuItemId:'999'},{startDate:'invalid'},{startDate:'2026-02-30'}])assert.equal((await request('/staff',{...good,...change})).status,422);
 assert.equal(db.getStaffBookingsByParent(1).length,count);
});
test('Arabic invalid input response stays Arabic',async()=>{
 await request('/locale/ar?returnTo=/booking');const r=await request('/booking',{...good,planType:'bad'});assert.equal(r.status,422);assert.match(r.body,/اختر خطة/);
});

test('Terms starts checked, remains required, and a deselected POST is rejected and retained',async()=>{
 const initial=await request('/register');assert.match(initial.body,/<input[^>]+id="agreeTerms"[^>]+checked[^>]+required/);
 const fields={name:'Audit Parent',civilId:'999999999999',email:'audit@example.test',phone:'99999999',password:'Audit-test123!',confirmPassword:'Audit-test123!'};
 const rejected=await request('/register',fields);
 assert.match(rejected.body,/aria-invalid="true"/);
 const tag=rejected.body.match(/<input[^>]+id="agreeTerms"[^>]*>/)[0];assert.ok(!/\bchecked\b/.test(tag));
 assert.equal(db.findParentByCivilId(fields.civilId),undefined);
 const retained=await request('/register',{...fields,email:'bad',agreeTerms:'on'});
 assert.match(retained.body,/<input[^>]+id="agreeTerms"[^>]+checked/);
});
test('Reset known and unknown accounts show the same honest outcome',async()=>{
 await request('/forgot-password');
 const known=await request('/forgot-password',{identifier:'111111111111'});
 const unknown=await request('/forgot-password',{identifier:'999999999999'});
 for(const r of [known,unknown]){assert.equal(r.status,200);assert.match(r.body,/No email was sent/);assert.match(r.body,/simulated|demo/i);}
 const outcome=html=>html.match(/<span>Demo request checked\.[\s\S]*?<\/span>/)[0];assert.equal(outcome(known.body),outcome(unknown.body));
});
test('Arabic Contact form posts to Arabic and tells the truth on success',async()=>{
 const form=await request('/ar/contact');assert.match(form.body,/action="\/ar\/contact"/);
 const r=await request('/ar/contact',{name:'Audit Parent',email:'audit@example.test',role:'parent',message:'Test-only form validation message'});assert.equal(r.status,302);
 const success=await request('/ar/contact?success=1');assert.match(success.body,/لم تُرسل رسالتك أو تُحفظ/);
});
