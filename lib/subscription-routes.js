const { randomBytes } = require('node:crypto');
const { firstBookableMonth, subscriptionMonths, todayInKuwait, defaultMeals, canChangeMeal, MAX_MONTHS, nextServiceStart, subscriptionStart, SubscriptionError } = require('./subscription');
module.exports = function subscriptionRoutes(app, db, requireAuth) {
  const menuFor = student => db.getSchoolMenuItems(db.getSchoolByName(student.school)?.id || -1);
  const notFound = (req, res) => res.status(404).render('404', { parentId: req.session.parentId });
  const countValue = value => typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_MONTHS ? Number(value) : null;
  function ownedStudent(req, id) {
    if (!/^[1-9]\d*$/.test(String(id))) return null;
    const student = db.findStudentById(Number(id));
    return student?.parentId === req.session.parentId ? student : null;
  }
  function render(req, res, step, args = {}, status = 200) {
    res.status(status).render('booking', { parentId: req.session.parentId, step, maxMonths: MAX_MONTHS, error: null, draft: req.session.subscriptionDraft, ...args });
  }
  function draftFor(req, res, minimum = 'review') {
    const draft = req.session.subscriptionDraft;
    if (!draft || !ownedStudent(req, draft.studentId)) { res.redirect('/booking'); return null; }
    if (req.method === 'POST' && req.body.token !== draft.token) { res.status(409).send(res.locals.t('subscription.errors.staleDraft')); return null; }
    const stages = ['review', 'meals', 'terms', 'payment', 'knet'];
    if (stages.indexOf(draft.stage) < stages.indexOf(minimum)) { res.redirect('/booking/' + draft.stage); return null; }
    return draft;
  }
  function newPage(req, res, student, error = null, status = 200) {
    render(req, res, 'new', { student, error, today: todayInKuwait(), count: countValue(req.query.months) || countValue(req.body?.months) || 1,
      preview: subscriptionMonths(MAX_MONTHS) }, status);
  }
  app.get('/booking', requireAuth, (req, res) => render(req, res, 'list', { students: db.getStudentsByParent(req.session.parentId) }));
  app.get('/booking/new', requireAuth, (req, res) => {
    const student = ownedStudent(req, req.query.student);
    if (!student) return notFound(req, res);
    newPage(req, res, student);
  });
  app.post('/booking/review', requireAuth, (req, res, next) => {
    const student = ownedStudent(req, req.body.student);
    if (!student) return notFound(req, res);
    try {
      const count = countValue(req.body.months);
      const firstMonth = firstBookableMonth();
      const quote = db.quoteSubscription(student.id, req.session.parentId, count, firstMonth);
      req.session.subscriptionDraft = { token: randomBytes(24).toString('hex'), studentId: student.id, monthsCount: count, firstMonth,
        ...quote, meals: defaultMeals(quote.months, menuFor(student)), termsAccepted: false, stage: 'review', createdAt: new Date().toISOString() };
      res.redirect('/booking/review');
    } catch (err) {
      if (!(err instanceof SubscriptionError)) return next(err);
      newPage(req, res, student, res.locals.t('subscription.errors.' + err.code), 422);
    }
  });
  app.get('/booking/review', requireAuth, (req, res) => {
    const draft = draftFor(req, res); if (!draft) return;
    const error = draft.error ? res.locals.t('subscription.errors.' + draft.error) : null;
    draft.stage = 'meals';
    render(req, res, 'review', { student: ownedStudent(req, draft.studentId), error });
  });
  function draftMealPage(req, res, draft, error = null, status = 200) {
    const month = typeof req.query.month === 'string' ? req.query.month : (req.body.month || draft.months[0].month);
    const selected = draft.months.find(m => m.month === month);
    if (!selected) return notFound(req, res);
    res.status(status).render('subscription-meals', { parentId: req.session.parentId, draft, subscription: null,
      student: ownedStudent(req, draft.studentId), months: draft.months.map(m => m.month), month, error, saved: req.query.saved === '1',
      meals: selected.mealDates.map(date => ({ date, menu_item_id: draft.meals[date], editable: true })), menuItems: menuFor(ownedStudent(req, draft.studentId)) });
  }
  app.get('/booking/meals', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'meals'); if (!draft) return;
    draft.stage = 'terms';
    draftMealPage(req, res, draft);
  });
  app.post('/booking/meals', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'terms'); if (!draft) return;
    const month = draft.months.find(m => m.month === req.body.month);
    const choices = req.body.meals || (month?.mealDates.length === 0 ? {} : null);
    const menu = menuFor(ownedStudent(req, draft.studentId));
    if (!month || !choices || typeof choices !== 'object' || Array.isArray(choices) ||
        Object.keys(choices).length !== month.mealDates.length || Object.entries(choices).some(([date, id]) =>
          !month.mealDates.includes(date) || typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !menu.some(m => m.id === Number(id)))) {
      return draftMealPage(req, res, draft, res.locals.t('subscription.errors.invalidMeals'), 422);
    }
    Object.entries(choices).forEach(([date, id]) => { draft.meals[date] = Number(id); });
    draft.termsAccepted = false; draft.acceptedAt = null; draft.stage = 'terms';
    if (req.body.proceed === 'terms') return res.redirect('/booking/terms');
    res.redirect('/booking/meals?month=' + month.month + '&saved=1' + (req.body.proceed === 'modal' ? '&terms=1' : ''));
  });
  app.get('/booking/terms', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'terms'); if (!draft) return;
    render(req, res, 'terms');
  });
  app.post('/booking/accept-terms', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'terms'); if (!draft) return;
    draft.termsAccepted = true; draft.acceptedAt = new Date().toISOString(); draft.stage = 'payment';
    res.redirect('/booking/payment');
  });
  app.get('/booking/payment', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'payment'); if (!draft) return;
    if (!draft.termsAccepted) return res.redirect('/booking/terms');
    // Record that the payment summary was seen before allowing the KNET step.
    draft.paymentReviewed = true;
    render(req, res, 'payment', { student: ownedStudent(req, draft.studentId) });
  });
  app.get('/booking/knet', requireAuth, (req, res) => {
    const draft = draftFor(req, res, 'payment'); if (!draft) return;
    if (!draft.termsAccepted || !draft.paymentReviewed) return res.redirect('/booking/payment');
    draft.stage = 'knet'; render(req, res, 'knet');
  });
  app.post('/booking/pay', requireAuth, (req, res, next) => {
    if (typeof req.body.token === 'string') {
      const consumed = db.findConsumedDraft(req.body.token, req.session.parentId);
      if (consumed) return res.redirect('/booking/confirmation/' + consumed.id);
    }
    const draft = draftFor(req, res, 'knet'); if (!draft) return;
    try {
      const result = db.paySubscription(req.session.parentId, draft);
      delete req.session.subscriptionDraft;
      res.redirect('/booking/confirmation/' + result.id);
    } catch (err) {
      if (!(err instanceof SubscriptionError)) return next(err);
      draft.termsAccepted = false; draft.acceptedAt = null; draft.paymentReviewed = false; draft.stage = 'review'; draft.error = err.code;
      if (err.quote) {
        Object.assign(draft, err.quote);
        const defaults = defaultMeals(draft.months, menuFor(ownedStudent(req, draft.studentId)));
        draft.meals = Object.fromEntries(Object.keys(defaults).map(date => [date, draft.meals[date] || defaults[date]]));
      }
      if (err.code === 'expired') {
        try {
          const quote = db.quoteSubscription(draft.studentId, req.session.parentId, draft.monthsCount);
          Object.assign(draft, quote, {firstMonth: quote.months[0].month, meals: defaultMeals(quote.months, menuFor(ownedStudent(req, draft.studentId)))});
          draft.error = 'expired';
          return res.redirect('/booking/review');
        } catch (quoteError) { if (!(quoteError instanceof SubscriptionError)) return next(quoteError); }
      }
      if (['expired', 'overlap', 'incompleteCalendar', 'zeroTotal', 'invalidPrice'].includes(err.code)) {
        // No payable quote remains; force a fresh booking after showing the reason.
        delete req.session.subscriptionDraft;
        return newPage(req, res, ownedStudent(req, draft.studentId), res.locals.t('subscription.errors.' + err.code), 409);
      }
      res.redirect('/booking/review');
    }
  });
  app.get('/booking/confirmation/:id', requireAuth, (req, res) => {
    const subscription = db.getSubscription(Number(req.params.id), req.session.parentId);
    if (!subscription) return notFound(req, res);
    render(req, res, 'confirmation', { subscription });
  });
  function paidMealPage(req, res, subscription, error = null, status = 200) {
    const month = req.query.month || req.body.month || subscription.months[0].month;
    if (!subscription.months.some(m => m.month === month)) return notFound(req, res);
    res.status(status).render('subscription-meals', { parentId: req.session.parentId, draft: null, subscription,
      student: db.findStudentById(subscription.student_id), months: subscription.months.map(m => m.month), month, error,
      saved: req.query.saved === '1', meals: db.getSubscriptionMeals(subscription.id).filter(m => m.date.startsWith(month)).map(m => ({ ...m, editable: canChangeMeal(m.date) })), menuItems: menuFor(db.findStudentById(subscription.student_id)) });
  }
  app.get('/subscriptions/:id/meals', requireAuth, (req, res) => {
    const sub = db.getSubscription(Number(req.params.id), req.session.parentId);
    if (!sub) return notFound(req, res);
    paidMealPage(req, res, sub);
  });
  app.post('/subscriptions/:id/meals', requireAuth, (req, res, next) => {
    const sub = db.getSubscription(Number(req.params.id), req.session.parentId);
    if (!sub) return notFound(req, res);
    try {
      db.changeSubscriptionMeals(req.session.parentId, sub.id, req.body.month, req.body.meals);
      res.redirect(`/subscriptions/${sub.id}/meals?month=${req.body.month}&saved=1`);
    } catch (err) {
      if (!(err instanceof SubscriptionError)) return next(err);
      paidMealPage(req, res, sub, res.locals.t('subscription.errors.' + err.code), 422);
    }
  });
};
