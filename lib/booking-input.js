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
// Staff retains its menu/date validation; parent subscriptions validate months separately.
function validateMealInput(input, { menuItems, today, horizon, staff = false }) {
  if (!staff) return 'errInvalidStudent';
  if (!validId(input.menuItemId) || !menuItems.some(m => m.id === Number(input.menuItemId))) return 'errInvalidMenu';
  if (!validDate(input.startDate) || input.startDate < today || input.startDate > horizon) return 'errInvalidDate';
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
