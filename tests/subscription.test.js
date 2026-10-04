const {test} = require('node:test');
const assert = require('node:assert/strict');
const s = require('../lib/subscription');
const calendar = month => s.monthDates(month).map((date,i)=>({date,is_school_day:i<19?1:0}));
test('first month uses inclusive seven-day boundary, including leap years and year rollover',()=>{
 for(const [date,expected] of [['2025-11-22','2025-12'],['2026-10-25','2026-11'],['2026-10-26','2026-12'],['2026-12-25','2027-01'],['2028-02-23','2028-03'],['2028-02-24','2028-04']])assert.equal(s.firstBookableMonth(date),expected);
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
test('rotation sorts menu ids, excludes Dessert and repeats by meal-day index',()=>{
 const q=s.calculateSubscription({count:1,firstMonth:'2026-01',dailyRate:2,calendar:calendar('2026-01')});
 const meals=s.defaultMeals(q.months,[{id:3,tag:'Dessert'},{id:2,tag:'Regular Meal'},{id:1,tag:'Regular Meal'}]);
 assert.deepEqual(Object.values(meals).slice(0,5),[1,2,1,2,1]);
});
test('48-hour cutoff is exclusive and measured from Kuwait midnight',()=>{
 assert.equal(s.canChangeMeal('2026-10-10','2026-10-07T20:59:59Z'),true);
 assert.equal(s.canChangeMeal('2026-10-10','2026-10-07T21:00:00Z'),false);
 assert.equal(s.canChangeMeal('2026-10-10','2026-10-08T00:00:00Z'),false);
});
