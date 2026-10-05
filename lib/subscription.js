// Pure subscription rules. Dates are ISO calendar dates in Kuwait; arithmetic is UTC.
const { validDate } = require('./booking-input');
const PARTIAL_FIRST_MONTH = true; // Change to false for N full months after the eligible service month.
const MAX_MONTHS = 6;

class SubscriptionError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function todayInKuwait(now = new Date()) {
  return new Date(new Date(now).getTime() + 3 * 3600000).toISOString().slice(0, 10);
}
function addDays(date, days) {
  if (!validDate(date)) throw new SubscriptionError('invalidDate');
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function monthDates(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new SubscriptionError('invalidDate');
  const last = new Date(`${month}-01T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return Array.from({ length: last.getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
function nextServiceStart(now = new Date()) {
  const today = todayInKuwait(now);
  const weekday = new Date(today + 'T00:00:00Z').getUTCDay();
  return addDays(today, (weekday <= 4 ? 7 : 14) - weekday);
}
function subscriptionStart(now = new Date()) {
  const start = nextServiceStart(now);
  if (PARTIAL_FIRST_MONTH) return start;
  return subscriptionMonths(2, start.slice(0, 7))[1] + '-01';
}
function firstBookableMonth(now = new Date()) { return subscriptionStart(now).slice(0, 7); }
function subscriptionMonths(count, firstMonth = firstBookableMonth()) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_MONTHS) throw new SubscriptionError('invalidMonths');
  monthDates(firstMonth);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(`${firstMonth}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d.toISOString().slice(0, 7);
  });
}
const round3 = n => Math.round(n * 1000) / 1000;
function calculateSubscription({ count, firstMonth, dailyRate, calendar, bookedMonths = [], serviceStart }) {
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) throw new SubscriptionError('invalidPrice');
  // Validate the complete first billing window before deciding whether to roll it forward.
  const firstDates = monthDates(firstMonth || firstBookableMonth()).filter(d => !serviceStart || d >= serviceStart);
  const firstRows = calendar.filter(r => firstDates.includes(r.date));
  if (!firstDates.length || firstRows.length !== firstDates.length || new Set(firstRows.map(r=>r.date)).size !== firstDates.length || firstRows.some(r=>![0,1].includes(r.is_school_day))) throw new SubscriptionError('incompleteCalendar');
  if (serviceStart && !firstRows.some(r => r.is_school_day === 1)) {
    firstMonth = subscriptionMonths(2, firstMonth)[1];
    serviceStart = firstMonth + '-01';
  }
  const months = subscriptionMonths(count, firstMonth).map(month => {
    if (bookedMonths.includes(month)) throw new SubscriptionError('overlap');
    const dates = monthDates(month).filter(d => !serviceStart || d >= serviceStart);
    const rows = calendar.filter(row => dates.includes(row.date));
    if (rows.length !== dates.length || new Set(rows.map(r => r.date)).size !== dates.length || rows.some(r => ![0, 1].includes(r.is_school_day))) throw new SubscriptionError('incompleteCalendar');
    const mealDates = rows.filter(r => r.is_school_day === 1).map(r => r.date).sort();
    return { month, startDate: dates[0], endDate: dates.at(-1), totalDays: dates.length, holidayDays: dates.length - mealDates.length, mealDays: mealDates.length,
      rateKWD: dailyRate, amountKWD: round3(mealDates.length * dailyRate), mealDates };
  });
  const totalKWD = round3(months.reduce((sum, m) => sum + m.amountKWD, 0));
  if (totalKWD <= 0) throw new SubscriptionError('zeroTotal');
  return { months, totalKWD };
}
function defaultMeals(months, menu) {
  const items = menu.filter(m => m.category === 'main').sort((a, b) => a.id - b.id);
  if (!items.length) throw new SubscriptionError('noMenu');
  return Object.fromEntries(months.flatMap(m => m.mealDates.map((date, i) => [date, items[i % items.length].id])));
}
function canChangeMeal(date, now = new Date()) {
  return validDate(date) && date >= nextServiceStart(now);
}
module.exports = { PARTIAL_FIRST_MONTH, nextServiceStart, subscriptionStart, MAX_MONTHS, SubscriptionError, todayInKuwait,
  addDays, monthDates, firstBookableMonth, subscriptionMonths, calculateSubscription, defaultMeals, canChangeMeal, round3 };
