// Shared monetary/date primitives; parent subscription pricing lives in subscription.js.
function calculateBookingTotal({ dailyRate, schoolDays }) {
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) throw new Error('Daily rate is not configured.');
  if (!Array.isArray(schoolDays)) throw new Error('School calendar days are required.');
  return { total: Math.round(dailyRate * schoolDays.length * 1000) / 1000, days: schoolDays.length };
}
function endOfMonthISO(dateISO) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
module.exports = { calculateBookingTotal, endOfMonthISO };
