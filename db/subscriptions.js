const { calculateSubscription, subscriptionMonths, monthDates, firstBookableMonth, todayInKuwait, defaultMeals,
  canChangeMeal, nextServiceStart, subscriptionStart, addDays, SubscriptionError } = require('../lib/subscription');
module.exports = function subscriptionStore(sql) {
  const schools = require('./schools')(sql);
  const menuFor = name => schools.getSchoolMenuItems(schools.getSchoolByName(name)?.id || -1);
  const fail = code => { throw new SubscriptionError(code); };
  function getDailyRate() { return sql.prepare("SELECT rate_kwd FROM plans WHERE code = 'single'").get()?.rate_kwd; }
  function getSubscription(id, parentId) {
    const row = sql.prepare(`SELECT s.*, st.name AS student_name, st.school, st.class, p.invoice_number, p.paid_at,
      p.method, p.status AS payment_status FROM subscriptions s JOIN students st ON st.id=s.student_id
      JOIN payments p ON p.subscription_id=s.id WHERE s.id=? AND s.parent_id=?`).get(id, parentId);
    if (!row) return null;
    row.months = sql.prepare('SELECT * FROM subscription_months WHERE subscription_id=? ORDER BY month').all(id).map(m => ({...m, startDate: addDays(monthDates(m.month).at(-1), 1-m.total_days), endDate: monthDates(m.month).at(-1)}));
    row.meal_days = row.months.reduce((n, m) => n + m.meal_days, 0);
    return row;
  }
  function getSubscriptions(parentId) {
    return sql.prepare('SELECT id FROM subscriptions WHERE parent_id=? ORDER BY created_at DESC,id DESC').all(parentId).map(r => getSubscription(r.id, parentId));
  }
  function findConsumedDraft(token, parentId) {
    return sql.prepare('SELECT id FROM subscriptions WHERE draft_token=? AND parent_id=?').get(token, parentId);
  }
  function quoteSubscription(studentId, parentId, count, firstMonth = firstBookableMonth(), serviceStart = subscriptionStart(), eligibilityStart = nextServiceStart()) {
    const student = sql.prepare('SELECT * FROM students WHERE id=? AND parent_id=?').get(studentId, parentId);
    if (!student) fail('invalidStudent');
    const names = subscriptionMonths(count, firstMonth);
    const lastMonth = subscriptionMonths(2, names.at(-1))[1];
    const calendar = sql.prepare('SELECT date,is_school_day FROM school_calendar_days WHERE school=? AND date>=? AND date<=? ORDER BY date')
      .all(student.school, names[0] + '-01', monthDates(lastMonth).at(-1));
    const bookedMonths = sql.prepare('SELECT month FROM subscription_months WHERE student_id=?').all(studentId).map(r => r.month);
    return { ...calculateSubscription({ count, firstMonth, dailyRate: schools.getSchoolDailyRate(student.school), calendar, bookedMonths, serviceStart }), school: student.school, eligibilityStart };
  }
  function getSubscriptionMeals(id) {
    return sql.prepare(`SELECT sm.*, mi.name, mi.calories FROM subscription_meals sm JOIN menu_items mi ON mi.id=sm.menu_item_id
      WHERE sm.subscription_id=? ORDER BY date`).all(id);
  }
  function writeSubscription({ studentId, parentId, token, quote, meals, acceptedAt, paidAt = new Date().toISOString() }) {
    const id = Number(sql.prepare(`INSERT INTO subscriptions(parent_id,student_id,first_month,months_count,daily_rate_kwd,total_kwd,draft_token,created_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(parentId, studentId, quote.months[0].month, quote.months.length, quote.months[0].rateKWD, quote.totalKWD, token, paidAt).lastInsertRowid);
    const monthInsert = sql.prepare(`INSERT INTO subscription_months(subscription_id,student_id,month,total_days,holiday_days,meal_days,rate_kwd,amount_kwd) VALUES(?,?,?,?,?,?,?,?)`);
    quote.months.forEach(m => monthInsert.run(id, studentId, m.month, m.totalDays, m.holidayDays, m.mealDays, m.rateKWD, m.amountKWD));
    const mealInsert = sql.prepare('INSERT INTO subscription_meals(subscription_id,date,menu_item_id,updated_at) VALUES(?,?,?,?)');
    quote.months.forEach(m => m.mealDates.forEach(date => mealInsert.run(id, date, meals[date], paidAt)));
    const invoice = `EVO-${todayInKuwait(paidAt).slice(0, 7).replace('-', '')}-${String(id).padStart(6, '0')}`;
    sql.prepare('INSERT INTO payments(subscription_id,invoice_number,amount_kwd,paid_at) VALUES(?,?,?,?)').run(id, invoice, quote.totalKWD, paidAt);
    sql.prepare('INSERT INTO terms_acceptances(parent_id,subscription_id,accepted_at) VALUES(?,?,?)').run(parentId, id, acceptedAt);
    const student = sql.prepare('SELECT name FROM students WHERE id=?').get(studentId);
    const params = { student: student.name, months: quote.months.length, total: quote.totalKWD };
    sql.prepare('INSERT INTO notifications(parent_id,type,message,params,related_id,created_at) VALUES(?,?,?,?,?,?)')
      .run(parentId, 'subscription_confirmed', `${student.name} — Subscription confirmed: ${params.months} month(s), KWD ${params.total.toFixed(3)} (simulated).`, JSON.stringify(params), id, paidAt);
    return { id };
  }
  function paySubscription(parentId, draft, now = new Date()) {
    return sql.transaction(() => {
      const consumed = findConsumedDraft(draft.token, parentId);
      if (consumed) return consumed;
      if (!draft.termsAccepted || !draft.acceptedAt || draft.stage !== 'knet') fail('stepOrder');
      if (draft.eligibilityStart !== nextServiceStart(now)) fail('expired');
      const quote = quoteSubscription(draft.studentId, parentId, draft.monthsCount, firstBookableMonth(now), subscriptionStart(now), nextServiceStart(now));
      // Compare all dated rows as well as money: calendar changes need fresh review even if totals match.
      if (quote.school !== draft.school || quote.totalKWD !== draft.totalKWD || JSON.stringify(quote.months) !== JSON.stringify(draft.months)) {
        const error = new SubscriptionError('priceChanged'); error.quote = quote; throw error;
      }
      const menu = menuFor(quote.school);
      const meals = defaultMeals(quote.months, menu);
      for (const date of Object.keys(meals)) {
        if (draft.meals[date] !== undefined) {
          if (!menu.some(m => m.id === draft.meals[date])) fail('invalidMeals');
          meals[date] = draft.meals[date];
        }
      }
      return writeSubscription({ parentId, studentId: draft.studentId, token: draft.token, quote, meals, acceptedAt: draft.acceptedAt, paidAt: new Date(now).toISOString() });
    }).immediate();
  }
  function changeSubscriptionMeals(parentId, id, month, choices, now = new Date()) {
    return sql.transaction(() => {
      const sub = getSubscription(id, parentId);
      if (!sub || !sub.months.some(m => m.month === month)) fail('invalidStudent');
      if (!choices || typeof choices !== 'object' || Array.isArray(choices)) fail('invalidMeals');
      const rows = getSubscriptionMeals(id).filter(r => r.date.startsWith(month));
      const menu = menuFor(sub.school).map(r => r.id);
      for (const [date, value] of Object.entries(choices)) {
        if (!rows.some(r => r.date === date) || typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !menu.includes(Number(value))) fail('invalidMeals');
        if (!canChangeMeal(date, now)) fail('cutoff');
      }
      const update = sql.prepare('UPDATE subscription_meals SET menu_item_id=?,updated_at=? WHERE subscription_id=? AND date=?');
      for (const [date, value] of Object.entries(choices)) update.run(Number(value), new Date(now).toISOString(), id, date);
    }).immediate();
  }
  function seedDemoSubscriptions(seed) {
    const parent = sql.prepare("SELECT id FROM parents WHERE civil_id='111111111111'").get();
    if (!parent) return;
    // Illustrative payment on the Thursday before this month's first Sunday.
    const first = todayInKuwait().slice(0, 7) + '-01';
    const firstSunday = addDays(first, (7-new Date(first+'T00:00:00Z').getUTCDay()) % 7);
    const paidAt = addDays(firstSunday, -3) + 'T12:00:00+03:00';
    for (const sample of seed.subscriptions || []) {
      const student = sql.prepare('SELECT id FROM students WHERE parent_id=? AND civil_id=?').get(parent.id, sample.studentCivilId);
      if (!student || sql.prepare('SELECT id FROM subscriptions WHERE student_id=?').get(student.id)) continue;
      const quote = quoteSubscription(student.id, parent.id, 1, firstBookableMonth(paidAt), subscriptionStart(paidAt), nextServiceStart(paidAt));
      const meals = defaultMeals(quote.months, menuFor(quote.school));
      sql.transaction(() => writeSubscription({ parentId: parent.id, studentId: student.id, token: `seed-${student.id}`, quote, meals, acceptedAt: paidAt, paidAt }))();
    }
  }
  return { getDailyRate, getSubscription, getSubscriptions, findConsumedDraft, quoteSubscription, getSubscriptionMeals,
    paySubscription, changeSubscriptionMeals, seedDemoSubscriptions };
};
