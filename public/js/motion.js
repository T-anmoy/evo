(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- entrance choreography ----------
  // Elements marked [data-reveal] fade/rise in once, staggered by their
  // position among siblings sharing the same [data-reveal-group] (or
  // document order if ungrouped). Capped stagger, see project motion rules.
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var groups = {};
    els.forEach(function (el) {
      var g = el.getAttribute('data-reveal-group') || 'default';
      groups[g] = groups[g] || [];
      groups[g].push(el);
    });
    Object.keys(groups).forEach(function (g) {
      groups[g].forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });

    // Safety net: some browser/embedding contexts fail to fire
    // IntersectionObserver callbacks reliably. Content must never stay
    // invisible forever because of that — force-reveal anything still
    // hidden shortly after load.
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('is-visible'); });
    }, 1200);
  }

  // ---------- number count-up ----------
  // Elements with [data-countup] animate from 0 to their own text content
  // on first reveal. Honest about the MPA architecture: this is a
  // count-from-zero-on-load effect, not an old-to-new delta (there's no
  // client-side state to diff against across a full page navigation).
  function animateCount(el) {
    var raw = el.getAttribute('data-countup');
    var match = raw.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/);
    if (!match) return;
    var prefix = match[1], numStr = match[2].replace(/,/g, ''), suffix = match[3];
    var target = parseFloat(numStr);
    if (isNaN(target)) return;
    var decimals = (numStr.split('.')[1] || '').length;
    if (reduceMotion) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }

    var duration = 900;
    var start = null;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function step(ts) {
      if (finished) return;
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = easeOutExpo(progress);
      var value = target * eased;
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
    // Wall-clock watchdog: some environments (throttled/background tabs,
    // some embedded webviews) deliver requestAnimationFrame very sparsely.
    // The number must never sit at a wrong value indefinitely.
    setTimeout(finish, duration + 400);
  }

  function initCountUp() {
    var els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(animateCount); return; }
    var done = new Set();
    function runOnce(el) { if (done.has(el)) return; done.add(el); animateCount(el); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runOnce(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
    // Same safety net as initReveal — never leave a stat frozen at 0.
    setTimeout(function () { els.forEach(runOnce); }, 1200);
  }

  // ---------- FAQ smooth expand/collapse ----------
  // Native <details> snaps open/closed; this enhances it with a smooth
  // height transition while keeping <details>/<summary> as the source of
  // truth (works with no JS, just without the animation).
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var summary = item.querySelector('summary');
      var answer = item.querySelector('.faq-answer');
      if (!summary || !answer) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = item.hasAttribute('open');
        if (reduceMotion) {
          if (isOpen) item.removeAttribute('open'); else item.setAttribute('open', '');
          return;
        }
        if (isOpen) {
          answer.style.height = answer.scrollHeight + 'px';
          requestAnimationFrame(function () {
            answer.style.height = '0px';
            answer.style.opacity = '0';
          });
          answer.addEventListener('transitionend', function onEnd() {
            item.removeAttribute('open');
            answer.style.height = '';
            answer.style.opacity = '';
            answer.removeEventListener('transitionend', onEnd);
          });
        } else {
          item.setAttribute('open', '');
          var target = answer.scrollHeight;
          answer.style.height = '0px';
          answer.style.opacity = '0';
          requestAnimationFrame(function () {
            answer.style.height = target + 'px';
            answer.style.opacity = '1';
          });
          answer.addEventListener('transitionend', function onEnd() {
            answer.style.height = '';
            answer.removeEventListener('transitionend', onEnd);
          });
        }
      });
    });
  }

  // ---------- immediate, specific field validation ----------
  // Applies to any input marked data-validate="civilid" — real-time
  // feedback ("Civil ID should be 12 digits") instead of waiting for
  // full-form submission to say anything.
  function initFieldValidation() {
    document.querySelectorAll('[data-validate="civilid"]').forEach(function (input) {
      var field = input.closest('.field');
      if (!field) return;
      input.addEventListener('input', function () {
        var digits = input.value.replace(/\D/g, '');
        if (input.value.length === 0) { field.classList.remove('invalid', 'valid'); return; }
        if (digits.length === 12 && digits === input.value) {
          field.classList.remove('invalid');
          field.classList.add('valid');
        } else {
          field.classList.remove('valid');
          field.classList.add('invalid');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initCountUp();
    initFaq();
    initFieldValidation();
  });
})();
