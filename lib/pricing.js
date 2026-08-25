// lib/pricing.js — pure booking-total calculation, kept separate from the
// database and from server.js so it can be unit tested directly. Prices
// themselves live in the `plans` table (see migrations/001_init.sql) and are
// passed in here, never hardcoded.

function calculateBookingTotal({ planType, days, plans }) {
  const numDays = Math.max(1, parseInt(days, 10) || 1);

  if (planType === 'monthly') {
    const plan = plans.monthly;
    if (!plan) throw new Error('Monthly plan pricing is not configured.');
    return { total: round3(plan.rateKWD), days: plan.monthlyDays };
  }

  const plan = plans.single;
  if (!plan) throw new Error('Single-day plan pricing is not configured.');
  return { total: round3(plan.rateKWD * numDays), days: numDays };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function canAfford(totalKWD, balanceKWD) {
  return totalKWD <= balanceKWD;
}

module.exports = { calculateBookingTotal, canAfford };
