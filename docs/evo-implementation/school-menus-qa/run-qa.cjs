// Run from the repository root. Requires Playwright with Chromium installed.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
// All bookings, rate overrides and fixture records use a disposable SQLite database.
const fs=require('fs'),assert=require('assert/strict');
const root=process.cwd(),file='/tmp/evo-browser-school-'+process.pid+'.db';
process.env.DATABASE_FILE=file;process.env.SESSION_SECRET='qa-only';process.env.LOG_LEVEL='silent';
const app=require(root+'/server'),db=require(root+'/db'),SQL=require(root+'/node_modules/better-sqlite3');
const sql=new SQL(file);const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=root+'/docs/evo-implementation/school-menus-qa', results=[],errors=[];
(async()=>{const server=app.listen(0),base='http://localhost:'+server.address().port,browser=await chromium.launch({headless:true});
try{
async function context(options={}){const c=await browser.newContext({reducedMotion:'reduce',...options});c.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});return c;}
async function check(p,label){await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(350);let o=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(o.scroll<=o.width,`${label} overflow ${JSON.stringify(o)}`);results.push({label,...o});}
const widths=[320,344,375,390,430,768,1024,1440],schools=db.getSchools();
for(const locale of ['en','ar'])for(const width of widths){
 const c=await context({viewport:{width,height:900}}),p=await c.newPage(),prefix=locale==='ar'?'/ar':'';
 for(const s of [null,...schools]){await p.goto(base+prefix+'/parents'+(s?'?school='+s.slug+'#school-menu':''));await check(p,`${locale} parents ${s?.slug||'no selection'} ${width}`);assert.equal(await p.locator('[role=tab]').count(),s?(s.id===2?1:2):0);
 if(s&&[375,1440].includes(width)&&s.id===1){await p.locator('#school-menu').scrollIntoViewIfNeeded();await p.screenshot({path:out+`/parents-${locale}-${width}.png`});}
 }
 await p.goto(base+prefix+'/how-it-works');await check(p,`${locale} how-it-works ${width}`);
 if(width===375||width===1440)await p.screenshot({path:out+`/how-it-works-${locale}-${width}.png`});
 await c.close();
}
// Keyboard-only selector and tabs, focus restoration, background scroll lock.
for(const locale of ['en','ar']){const c=await context({viewport:{width:375,height:850},reducedMotion:'no-preference'}),p=await c.newPage(),prefix=locale==='ar'?'/ar':'';
 await p.goto(base+prefix+'/parents');const trigger=p.locator('.parent-intro [data-school-selector]');await trigger.focus();await p.keyboard.press('Enter');await p.locator('#school-selector').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>document.activeElement.type),'radio');assert.equal(await p.evaluate(()=>document.documentElement.style.overflow),'hidden');await p.keyboard.press('Escape');await p.locator('#school-selector').waitFor({state:'hidden'});await p.waitForFunction(()=>document.documentElement.style.overflow!=='hidden');assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);assert.notEqual(await p.evaluate(()=>document.documentElement.style.overflow),'hidden');
 await trigger.press('Enter');await p.keyboard.press('Space');await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.waitForURL('**/parents?school=kuwait-english-school#school-menu');
 const tabs=p.locator('[role=tab]');await tabs.first().focus();await p.keyboard.press(locale==='ar'?'ArrowLeft':'ArrowRight');assert.equal(await tabs.last().getAttribute('aria-selected'),'true');await p.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');await p.keyboard.press('End');assert.equal(await tabs.last().getAttribute('aria-selected'),'true');
 // Mobile-menu trigger must release navigation focus trap.
 await p.goto(base+prefix+'/');await p.locator('#siteNavToggle').click();await p.locator('.site-links-mobile [data-school-selector]').click();await p.locator('#school-selector').waitFor({state:'visible'});await check(p,`${locale} mobile menu selector`);await p.screenshot({path:out+`/selector-${locale}-375.png`});await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement===document.getElementById('siteNavToggle'));assert.equal(await p.locator('#siteNavToggle').evaluate(e=>e===document.activeElement),true);
 results.push({label:locale+' keyboard selector, Escape/focus, scroll lock, RTL/LTR arrows, Home/End, mobile nav selector',pass:true});await c.close();}
for(const locale of ['en','ar']){const c=await context({javaScriptEnabled:false,viewport:{width:320,height:850}}),p=await c.newPage();await p.goto(base+(locale==='ar'?'/ar':'')+'/parents');await p.locator('#school').selectOption(schools[0].slug);await p.locator('.school-inline-form button').click();await p.waitForURL('**/parents?school=*#school-menu');assert.equal(await p.locator('.school-category-panel:visible').count(),2);await check(p,locale+' no-JavaScript inline school selection and all categories');await c.close();}
// Fresh students avoid intentionally overlapping seeded subscriptions. Rate override is disposable QA data only.
sql.prepare('UPDATE schools SET daily_rate_kwd=2.5 WHERE id=2').run();
const students=[1,2].map(id=>db.createStudent({...db.findStudentById(id),civilId:'98765000000'+id,name:'QA Child '+id}));
for(let i=0;i<2;i++){const locale=i?'ar':'en',c=await context({viewport:{width:i?375:1440,height:900},javaScriptEnabled:true}),p=await c.newPage();await p.goto(base+'/login');await p.locator('[name=civilId]').fill('111111111111');await p.locator('[name=password]').fill('demo1234');await p.locator('form[action="/login"] button[type=submit]').click();await p.waitForURL('**/dashboard');await p.goto(base+'/locale/'+locale+'?returnTo=/booking/new?student='+students[i].id);
 if(!p.url().includes('/booking/new'))await p.goto(base+'/booking/new?student='+students[i].id);
 await p.locator('#months-count').selectOption('1');await p.locator('form[action="/booking/review"] button.btn-primary').click();await p.waitForURL('**/booking/review');assert.ok((await p.locator('.record-details').innerText()).includes(i?'2.500':'2.000'));await check(p,locale+' review per-school rate and partial dates');await p.screenshot({path:out+`/review-${locale}.png`});await p.locator('a[href="/booking/meals"]').click();await p.waitForURL('**/booking/meals');
 const selects=p.locator('#daily-meals-form select');assert.ok(await selects.count()>0);const ids=await selects.first().locator('option').evaluateAll(es=>es.map(e=>Number(e.value)));assert.deepEqual(ids,i?[2,3,4]:[1,2,4,5]);const defaults=await selects.evaluateAll(es=>es.map(e=>Number(e.value)));assert.ok(defaults.every(id=>i?[2,3,4].includes(id):[1,2,4].includes(id)));await selects.first().selectOption('4');
 // Save through browser then use the fully rendered Terms page (same server path as the dialog).
 await p.locator('#daily-meals-form button[type=submit]').click();await p.waitForURL('**/booking/meals?**');await p.goto(base+'/booking/terms');await p.locator('form[action="/booking/accept-terms"] button').click();await p.waitForURL('**/booking/payment');await check(p,locale+' payment');await p.screenshot({path:out+`/payment-${locale}.png`,fullPage:true});await p.locator('a[href="/booking/knet"]').click();await p.waitForURL('**/booking/knet');await p.locator('form[action="/booking/pay"] button').click();await p.waitForURL('**/booking/confirmation/*');await check(p,locale+' confirmation');const sub=db.getSubscriptions(1).find(s=>s.student_id===students[i].id);assert.equal(sub.daily_rate_kwd,i?2.5:2);assert.equal(sub.total_kwd,sub.meal_days*(i?2.5:2));assert.equal(db.getSubscriptionMeals(sub.id)[0].menu_item_id,4);
 for(const width of widths){await p.setViewportSize({width,height:900});for(const route of ['/menu','/booking','/history','/subscriptions/'+sub.id+'/meals']){await p.goto(base+route);await check(p,locale+' '+route+' '+width);}if(width===375)await p.screenshot({path:out+`/paid-meals-${locale}-375.png`});}
 results.push({label:locale+' full booking '+'with JS',school:sub.school,rate:sub.daily_rate_kwd,days:sub.meal_days,total:sub.total_kwd,options:ids});await c.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({checkedAt:new Date().toISOString(),results,errors},null,2));console.log('PASS',results.length,'browser checks; zero console/page/CSP errors');
}finally{await browser.close();server.close();sql.close();for(const suffix of ['','-wal','-shm'])fs.rmSync(file+suffix,{force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
