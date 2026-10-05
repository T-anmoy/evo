const {test} = require('node:test');
const assert = require('node:assert/strict');
const s = require('../lib/subscription');
const calendar = month => s.monthDates(month).map((date,i)=>({date,is_school_day:i<19?1:0}));
test('weekly service start follows Kuwait Thursday cutoff, Sunday week and rollovers',()=>{
 for(const [now,date] of [['2026-10-04T12:00:00+03:00','2026-10-11'],['2026-10-08T23:59:59+03:00','2026-10-11'],['2026-10-09T00:00:00+03:00','2026-10-18'],['2026-10-10T12:00:00+03:00','2026-10-18'],['2026-12-31T23:59:59+03:00','2027-01-03'],['2027-01-01T00:00:00+03:00','2027-01-10']]) assert.equal(s.nextServiceStart(now),date);
});
test('Kuwait date changes at 21:00 UTC',()=>{
 assert.equal(s.todayInKuwait('2026-10-04T20:59:59Z'),'2026-10-04');
 for(const time of ['21:00:00','22:00:00','23:59:59']) assert.equal(s.todayInKuwait(`2026-10-04T${time}Z`),'2026-10-05');
});
test('month bounds accept one and six, reject invalid numbers without coercion',()=>{
 assert.deepEqual(s.subscriptionMonths(1,'2026-12'),['2026-12']);
 assert.deepEqual(s.subscriptionMonths(6,'2026-12'),['2026-12','2027-01','2027-02','2027-03','2027-04','2027-05']);
 for(const n of [0,7,-1,1.5,NaN,Infinity,'1',null])assert.throws(()=>s.subscriptionMonths(n));
});
test('complete month derives days, holidays and rounded price from the calendar',()=>{
 const q=s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:calendar('2026-01')});
 assert.deepEqual([q.months[0].totalDays,q.months[0].holidayDays,q.months[0].mealDays,q.totalKWD],[31,12,19,38]);
 assert.equal(s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2.1234,calendar:calendar('2026-01')}).totalKWD,40.345);
});
test('partial and duplicate calendar days cannot price a month',()=>{
 const rows=calendar('2026-01');for(const incomplete of [rows.slice(1),[...rows.slice(1),rows[1]]])assert.throws(()=>s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:incomplete}),{code:'incompleteCalendar'});
});
test('zero totals, invalid prices, and overlapping months are refused',()=>{
 assert.throws(()=>s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:calendar('2026-01').map(r=>({...r,is_school_day:0}))}),{code:'zeroTotal'});
 for(const rate of [0,-1,NaN,Infinity,undefined])assert.throws(()=>s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:rate,calendar:calendar('2026-01')}),{code:'invalidPrice'});
 assert.throws(()=>s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:calendar('2026-01'),bookedMonths:['2026-01']}),{code:'overlap'});
});
test('rotation sorts menu ids, uses only Main items and repeats by meal-day index',()=>{
 const q=s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:calendar('2026-01')});
 const meals=s.defaultMeals(q.months,[{id:3,category:'snack'},{id:2,category:'main'},{id:1,category:'main'}]);
 assert.deepEqual(Object.values(meals).slice(0,5),[1,2,1,2,1]);
});
test('meal changes use the same next-service boundary',()=>{
 assert.equal(s.canChangeMeal('2026-10-11','2026-10-08T23:59:59+03:00'),true);
 assert.equal(s.canChangeMeal('2026-10-11','2026-10-09T00:00:00+03:00'),false);
 assert.equal(s.canChangeMeal('2026-10-18','2026-10-09T00:00:00+03:00'),true);
});
test('partial first month counts only its window and following months are full',()=>{
 const q=s.calculateSubscription({count:2,firstMonth:'2026-10',serviceStart:'2026-10-11',dailyRate:2,calendar:[...calendar('2026-10'),...calendar('2026-11')]});
 assert.deepEqual([q.months[0].totalDays,q.months[0].mealDays,q.months[0].holidayDays,q.months[0].amountKWD],[21,9,12,18]);assert.equal(q.months[1].totalDays,30);
});
test('empty first window rolls to next full month; incomplete windows cannot roll',()=>{
 const rows=[...calendar('2026-10').map(r=>({...r,is_school_day:0})),...calendar('2026-11')];
 const input={count:1,firstMonth:'2026-10',serviceStart:'2026-10-11',dailyRate:2,calendar:rows};
 const q=s.calculateSubscription(input);assert.equal(q.months[0].month,'2026-11');assert.equal(q.months[0].totalDays,30);assert.equal(q.totalKWD,38);
 assert.throws(()=>s.calculateSubscription({...input,calendar:rows.filter(r=>r.date!=='2026-10-12')}),{code:'incompleteCalendar'});
});
