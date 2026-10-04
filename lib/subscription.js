// Pure subscription rules. Dates are ISO calendar dates in Kuwait; arithmetic is UTC.
const { validDate } = require('./booking-input');
const SERVICE_LEAD_DAYS = 7;
const MAX_MONTHS = 6;
const MEAL_CHANGE_CUTOFF_HOURS = 48;
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
function firstBookableMonth(today = todayInKuwait()) {
  const earliest = addDays(today, SERVICE_LEAD_DAYS);
  if (earliest.endsWith('-01')) return earliest.slice(0, 7);
  const d = new Date(earliest + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  return d.toISOString().slice(0, 7);
}
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
function calculateSubscription({ count, firstMonth, dailyRate, calendar, bookedMonths = [] }) {
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) throw new SubscriptionError('invalidPrice');
  const months = subscriptionMonths(count, firstMonth).map(month => {
    if (bookedMonths.includes(month)) throw new SubscriptionError('overlap');
    const dates = monthDates(month);
    const rows = calendar.filter(row => dates.includes(row.date));
    if (rows.length !== dates.length || new Set(rows.map(r => r.date)).size !== dates.length || rows.some(r => ![0, 1].includes(r.is_school_day))) throw new SubscriptionError('incompleteCalendar');
    const mealDates = rows.filter(r => r.is_school_day === 1).map(r => r.date).sort();
    return { month, totalDays: dates.length, holidayDays: dates.length - mealDates.length, mealDays: mealDates.length,
      rateKWD: dailyRate, amountKWD: round3(mealDates.length * dailyRate), mealDates };
  });
  const totalKWD = round3(months.reduce((sum, m) => sum + m.amountKWD, 0));
  if (totalKWD <= 0) throw new SubscriptionError('zeroTotal');
  return { months, totalKWD };
}
function defaultMeals(months, menu) {
  const items = menu.filter(m => !/Dessert/i.test(m.tag || '')).sort((a, b) => a.id - b.id);
  if (!items.length) throw new SubscriptionError('noMenu');
  return Object.fromEntries(months.flatMap(m => m.mealDates.map((date, i) => [date, items[i % items.length].id])));
}
function canChangeMeal(date, now = new Date()) {
  return validDate(date) && new Date(now).getTime() < new Date(`${date}T00:00:00+03:00`).getTime() - MEAL_CHANGE_CUTOFF_HOURS * 3600000;
}
module.exports = { SERVICE_LEAD_DAYS, MAX_MONTHS, MEAL_CHANGE_CUTOFF_HOURS, SubscriptionError, todayInKuwait,
  addDays, monthDates, firstBookableMonth, subscriptionMonths, calculateSubscription, defaultMeals, canChangeMeal, round3 };
