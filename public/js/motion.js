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

  // ---------- hero parallax ----------
  // The hero image drifts slightly slower than the page as it scrolls out —
  // applied to the inner .hero-media (not the [data-parallax] wrapper
  // itself), which keeps this independent of the wrapper's own CSS
  // entrance animation instead of both fighting over `transform`. Capped
  // and rAF-throttled; a no-op once the hero has scrolled well past view.
  function initHeroParallax() {
    if (reduceMotion) return;
    var wrap = document.querySelector('[data-parallax]');
    var target = wrap ? wrap.querySelector('.hero-media') : null;
    if (!wrap || !target) return;
    var ticking = false;
    var MAX_SHIFT = 28;
    function update() {
      ticking = false;
      var rect = wrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      var progress = (rect.top) / vh; // 1 at top of viewport, 0 as it centers, negative past center
      var shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, progress * MAX_SHIFT));
      target.style.transform = 'translateY(' + shift.toFixed(1) + 'px)';
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  // ---------- magnetic buttons ----------
  // Primary CTAs marked [data-magnetic] pull slightly toward the cursor on
  // desktop hover — a small, premium touch, never on touch devices (no
  // hover to react to, and it would just feel like a delayed tap there).
  function initMagneticButtons() {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var RADIUS = 70;
    var STRENGTH = 0.28;
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > RADIUS) return;
        btn.style.setProperty('--mx', (dx * STRENGTH).toFixed(1) + 'px');
        btn.style.setProperty('--my', (dy * STRENGTH).toFixed(1) + 'px');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
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

  // ---------- generic required / email / minlength validation ----------
  // Used by the Schools and Caterers lead-capture forms: real inline
  // feedback as the parent types or leaves a field, plus a submit-time
  // pass that stops the post and focuses the first problem instead of
  // relying on the browser's default (inconsistent, unstyled) bubble.
  function validateGenericField(input) {
    var field = input.closest('.field');
    if (!field) return true;
    var rule = input.getAttribute('data-validate');
    var value = input.value.trim();
    var valid = true;
    if (rule === 'required') valid = value.length > 0;
    else if (rule === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    else if (rule && rule.indexOf('minlength:') === 0) {
      var min = parseInt(rule.split(':')[1], 10) || 0;
      valid = value.length >= min;
    }
    if (value.length === 0 && rule !== 'required') {
      field.classList.remove('invalid', 'valid');
      return true;
    }
    field.classList.toggle('invalid', !valid);
    field.classList.toggle('valid', valid);
    return valid;
  }

  function initGenericValidation() {
    document.querySelectorAll('form[novalidate]').forEach(function (form) {
      var fields = form.querySelectorAll('[data-validate]:not([data-validate="civilid"])');
      fields.forEach(function (input) {
        input.addEventListener('blur', function () { validateGenericField(input); });
        input.addEventListener('input', function () {
          var field = input.closest('.field');
          if (field && field.classList.contains('invalid')) validateGenericField(input);
        });
      });
      form.addEventListener('submit', function (e) {
        var allValid = true;
        var firstInvalid = null;
        fields.forEach(function (input) {
          var ok = validateGenericField(input);
          if (!ok && !firstInvalid) firstInvalid = input;
          allValid = allValid && ok;
        });
        if (!allValid) {
          e.preventDefault();
          if (firstInvalid) firstInvalid.focus();
          return;
        }
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending…';
          submitBtn.classList.add('btn-loading');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initCountUp();
    initFaq();
    initFieldValidation();
    initGenericValidation();
    initHeroParallax();
    initMagneticButtons();
  });
})();
