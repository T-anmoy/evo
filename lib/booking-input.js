// Validate request values before date arithmetic or database writes.
// Daily fulfilment/allocation remains a separate Phase 3 business decision.
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}
function validateMealInput(input, { menuItems, students, calendar, today, horizon, staff = false }) {
  if (!staff && (!validId(input.studentId) || !students.some(s => s.id === Number(input.studentId)))) return 'errInvalidStudent';
  if (!validId(input.menuItemId) || !menuItems.some(m => m.id === Number(input.menuItemId))) return 'errInvalidMenu';
  if (!staff && !['single', 'monthly'].includes(input.planType)) return 'errInvalidPlan';
  if (!validDate(input.startDate) || input.startDate < today || input.startDate > horizon) return 'errInvalidDate';
  if (!staff && input.planType === 'single' && (typeof input.days !== 'string' || !/^\d+$/.test(input.days) || !Number.isSafeInteger(Number(input.days)) || Number(input.days) < 1 || Number(input.days) > 30)) return 'errInvalidDays';
  if (!staff) {
    const student = students.find(s => s.id === Number(input.studentId));
    const dates = calendar[student.school] || [];
    // Monthly starts may be non-service days; only remaining configured days
    // are charged. Single bookings must start on a configured service day.
    if (input.planType === 'single' && !dates.includes(input.startDate)) return 'errSchoolDay';
  }
  return null;
}
function bookingWindow() {
  const today = new Date().toISOString().slice(0,10);
  const end = new Date(today + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 120);
  // Complete the last selectable month so client and server prices agree.
  return { today, horizon: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth()+1, 0)).toISOString().slice(0,10) };
}
module.exports = { validDate, validateMealInput, bookingWindow };
