(function () {
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- shared motion environment ----------
  // CSS owns every visual (timing, easing, keyframes — see the motion
  // tokens in style.css); this only flips semantic state classes. One
  // IntersectionObserver serves the whole page: [data-reveal] elements
  // are revealed once and then unobserved, and continuous loops (the
  // collection demo) are paused while fully offscreen.
  var observer = null;
  var loops = [];

  function reduced() { return motionPreference.matches; }

  // `entering` is true only for a scroll-in reveal from the observer —
  // that alone gets the CSS entrance (.is-entering); everything else
  // (in view on arrival, reduced motion, fallback) is simply shown.
  function reveal(el, entering) {
    if (entering) el.classList.add('is-entering');
    el.classList.add('is-revealed');
    if (observer) observer.unobserve(el);
  }

  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      if (loops.indexOf(el) !== -1) el.classList.toggle('is-offscreen', !entry.isIntersecting);
      else if (entry.isIntersecting) reveal(el, !reduced());
    });
  }

  // Anything already on screen (or above it, e.g. a restored scroll
  // position) is marked revealed *before* html.motion-ready exists, so it
  // never enters the hidden pre-state — only content below the fold waits
  // to be scrolled to. All rects are read in one pass, before any write.
  function registerReveals(root) {
    var targets = Array.prototype.slice.call(root.querySelectorAll('[data-reveal]:not(.is-revealed)'));
    if (root.matches && root.matches('[data-reveal]:not(.is-revealed)')) targets.unshift(root);
    if (!targets.length) return;
    if (!observer || reduced()) { targets.forEach(function (el) { reveal(el); }); return; }
    var fold = window.innerHeight;
    var inView = targets.map(function (el) { return el.getBoundingClientRect().top < fold; });
    targets.forEach(function (el, i) {
      var delay = parseInt(el.getAttribute('data-reveal-delay'), 10);
      if (delay > 0) el.style.setProperty('--reveal-delay', Math.min(delay, 400) + 'ms');
      if (inView[i]) reveal(el); else observer.observe(el);
    });
  }

  function initMotionEnvironment() {
    var root = document.documentElement;
    try {
      if (!('IntersectionObserver' in window)) throw new Error('no IntersectionObserver');
      observer = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -8% 0px' });
      // Stagger index within a group; the CSS caps the resulting delay
      // at --stagger-max, so a long group can never trail on and on.
      document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
        group.querySelectorAll('[data-reveal]').forEach(function (el, i) {
          el.style.setProperty('--reveal-index', i);
        });
      });
      registerReveals(document);
      loops.forEach(function (el) { observer.observe(el); });
      // Two frames later, not now: the first frame renders the page
      // exactly as authored, so every element already has a settled style
      // before any .motion-ready entrance rule (reveal pre-states, the
      // @starting-style fades on FAQ answers / validation messages) can
      // match it — nothing that is open or visible on arrival animates in.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (observer) root.classList.add('motion-ready'); });
      });
    } catch (e) {
      // Any failure leaves the page exactly as authored: fully visible.
      observer = null;
      root.classList.remove('motion-ready');
      document.querySelectorAll('[data-reveal]').forEach(function (el) { reveal(el); });
    }
  }

  // Live OS preference changes, no reload: reducing motion stops the loop
  // and releases anything still waiting to reveal; restoring it restarts
  // the loop (already-revealed content simply stays revealed).
  function onMotionPreferenceChange() {
    loops.forEach(function (el) { el.classList.toggle('is-looping', !reduced()); });
    if (reduced()) document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el) { reveal(el); });
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionPreferenceChange);
  else if (motionPreference.addListener) motionPreference.addListener(onMotionPreferenceChange);

  // Small public surface for later page-level work: register content
  // added after load, restart the shared status settle, or check the
  // current preference — without each page re-implementing any of it.
  window.EvoMotion = {
    reduced: reduced,
    observe: function (root) { registerReveals(root || document); },
    settle: function (el) {
      if (!el || reduced()) return;
      el.classList.remove('motion-settle');
      void el.offsetWidth; // restart the animation if it is mid-flight
      el.classList.add('motion-settle');
    }
  };

  // Client-side mirror of lib/validate.js's NAME_RE — server-side stays
  // authoritative, this is only for immediate typing feedback. Built with
  // `new RegExp` inside a try/catch, not a literal, because a literal using
  // \p{L} would throw a SyntaxError while this whole file is parsed in a
  // browser old enough not to support Unicode property escapes, breaking
  // every other script on the page along with it. The fallback below still
  // catches the one thing the old name regex actively got wrong (rejecting
  // non-Latin names) by not restricting the character set at all — it just
  // requires a letter to be present and rejects digit-only input.
  var NAME_PATTERN;
  try {
    NAME_PATTERN = new RegExp("^(?=.*\\p{L})[\\p{L}\\p{M}\\s'’-]{2,60}$", 'u');
  } catch (e) {
    NAME_PATTERN = /^(?=.*[^\d\s])[^\d]{2,60}$/;
  }

  // Native controls keep disclosure content available with or without JS.
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(function(item, index) {
      var button = item.querySelector('.faq-summary');
      var content = item.querySelector('.faq-content');
      if (!button || !content) return;
      content.id = 'faq-panel-' + index;
      button.id = 'faq-button-' + index;
      button.setAttribute('aria-controls', content.id);
      content.setAttribute('aria-labelledby', button.id);
      function setOpen(open) {
        item.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        content.hidden = !open;
      }
      setOpen(item.classList.contains('is-open'));
      button.addEventListener('click', function() { setOpen(content.hidden); });
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
  function setFieldMessage(field, text) {
    var span = field.querySelector('.field-error span');
    if (!span) return;
    if (!span.dataset.defaultText) span.dataset.defaultText = span.textContent;
    span.textContent = text || span.dataset.defaultText;
  }

  // Localized validation copy, injected per-page by partials/head.ejs from
  // the active locale — falls back to English if EVO_I18N wasn't loaded
  // (e.g. a page that doesn't include head.ejs) so validation never breaks.
  var I18N = window.EVO_I18N || {};
  function vi18n(key, fallback) { return I18N[key] || fallback; }

  function validateGenericField(input) {
    var field = input.closest('.field');
    if (!field) return true;
    var rule = input.getAttribute('data-validate');
    var rawValue = input.value;
    var value = rawValue.trim();
    var valid = true;
    var message = null;
    var isEmptyRequired = input.required && value.length === 0;

    if (rule === 'required') {
      valid = value.length > 0;
      if (!valid) message = vi18n('valRequired', 'This field is required.');
    } else if (rule === 'email') {
      if (isEmptyRequired) { valid = false; message = vi18n('valEmailRequired', 'Email is required.'); }
      else { valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); if (!valid) message = vi18n('valEmailInvalid', 'Enter a valid email address.'); }
    } else if (rule === 'civilid-or-email') {
      if (isEmptyRequired) { valid = false; message = vi18n('valCivilIdOrEmailRequired', 'Enter your Civil ID or email.'); }
      else valid = /^\d{12}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    } else if (rule === 'name') {
      if (isEmptyRequired) { valid = false; message = vi18n('valNameRequired', 'Full name is required.'); }
      else { valid = NAME_PATTERN.test(value); if (!valid) message = vi18n('valNameInvalid', 'Enter a valid name.'); }
    } else if (rule === 'phone') {
      if (isEmptyRequired) { valid = false; message = vi18n('valPhoneRequired', 'Mobile number is required.'); }
      else { var digits = value.replace(/\D/g, ''); valid = digits.length >= 8 && digits.length <= 15 && !/[^\d\s+()-]/.test(value); if (!valid) message = vi18n('valPhoneInvalid', 'Enter a valid phone number.'); }
    } else if (rule === 'password') {
      if (isEmptyRequired) { valid = false; message = vi18n('valPasswordRequired', 'Password is required.'); }
      else valid = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(rawValue) && rawValue.trim().length > 0;
      // Re-check the confirm field too, since its match depends on this value.
      var confirmInput = document.getElementById('confirmPassword');
      if (confirmInput && confirmInput.value.length > 0) validateGenericField(confirmInput);
    } else if (rule === 'confirm-password') {
      var matchInput = document.getElementById(input.getAttribute('data-match'));
      if (isEmptyRequired) { valid = false; message = vi18n('valConfirmPasswordRequired', 'Please confirm your password.'); }
      else valid = matchInput && rawValue === matchInput.value;
    } else if (rule && rule.indexOf('minlength:') === 0) {
      var min = parseInt(rule.split(':')[1], 10) || 0;
      valid = value.length >= min;
    } else if (rule === 'allergies') {
      // Optional field — mirrors lib/validate.js's isValidAllergies: a
      // reasonable length cap, and no raw angle brackets (basic markup
      // injection guard on top of the EJS auto-escaping already in place).
      valid = value.length <= 200 && !/[<>]/.test(value);
    }

    if (value.length === 0 && rule !== 'required' && !input.required) {
      field.classList.remove('invalid', 'valid');
      return true;
    }
    setFieldMessage(field, message);
    input.setAttribute('aria-invalid', String(!valid));
    field.classList.toggle('invalid', !valid);
    field.classList.toggle('valid', valid);
    return valid;
  }

  function initGenericValidation() {
    document.querySelectorAll('form[novalidate]').forEach(function (form) {
      var fields = form.querySelectorAll('[data-validate]:not([data-validate="civilid"]):not([type="checkbox"])');
      fields.forEach(function (input) {
        input.addEventListener('blur', function () { if(input.value || input.dataset.edited) validateGenericField(input); });
        input.addEventListener('input', function () {
          input.dataset.edited = 'true';
          var field = input.closest('.field');
          if (field && field.classList.contains('invalid')) validateGenericField(input);
        });
      });
      // civilid fields and required checkboxes (e.g. "I agree to the Terms")
      // opted out of HTML5's native required enforcement the moment this
      // form got `novalidate` — without this, both could be submitted
      // empty/unchecked with no error shown at all.
      var civilIdFields = form.querySelectorAll('[data-validate="civilid"]');
      var requiredCheckboxes = form.querySelectorAll('input[type="checkbox"][required]');
      form.addEventListener('submit', function (e) {
        var allValid = true;
        var firstInvalid = null;
        fields.forEach(function (input) {
          var ok = validateGenericField(input);
          if (!ok && !firstInvalid) firstInvalid = input;
          allValid = allValid && ok;
        });
        civilIdFields.forEach(function (input) {
          var field = input.closest('.field');
          var digits = input.value.replace(/\D/g, '');
          var ok = digits.length === 12 && digits === input.value.trim();
          input.setAttribute('aria-invalid', String(!ok));
          if (field) field.classList.toggle('invalid', !ok);
          if (!ok && !firstInvalid) firstInvalid = input;
          allValid = allValid && ok;
        });
        requiredCheckboxes.forEach(function (input) {
          var ok = input.checked;
          input.setAttribute('aria-invalid', String(!ok));
          input.closest('.field').classList.toggle('invalid', !ok);
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
          submitBtn.textContent = (window.EVO_I18N && window.EVO_I18N.sending) || 'Sending…';
          submitBtn.classList.add('btn-loading');
        }
      });
    });
  }

  // Every real page navigation involves a moment of nothing happening
  // between tap and the next screen — a disabled, spinning button fills
  // that gap so the press always reads as registered immediately. Applies
  // site-wide (login, booking, cancel, renew, mark-read, everything);
  // initGenericValidation above already handles its own novalidate forms
  // with custom "Sending…" copy, so this only steps in where nothing else did.
  function initSubmitFeedback() {
    document.querySelectorAll('form').forEach(function (form) {
      // The tiny 10px notification "mark as read" dot has no room for a
      // spinner — leave it alone, its own state (disappearing) is the feedback.
      if (form.classList.contains('notif-read-form')) return;
      // Logging out is a header control sized to the word "Log out".
      // Swapping in a longer "Please wait…" would widen it and shove the
      // navigation sideways for the moment before the page changes — and
      // the page changing is the feedback here anyway.
      if (form.classList.contains('logout-form')) return;
      form.addEventListener('submit', function (e) {
        if (e.defaultPrevented) return;
        var submitBtn = form.querySelector('button[type="submit"], button:not([type])');
        if (!submitBtn || submitBtn.disabled || submitBtn.classList.contains('btn-loading')) return;
        // Swap in a short, guaranteed-to-fit label alongside the spinner —
        // the button's own text (e.g. "Confirm & Pay via KNET (demo)") was
        // sized to fit alone, not with a spinner added in front of it too.
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = (window.EVO_I18N && window.EVO_I18N.pleaseWait) || 'Please wait…';
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
      });
    });
  }

  // A form marked data-confirm-message asks for confirmation before it's
  // allowed to submit at all (e.g. cancelling a booking in history.ejs).
  // The message is read from a data attribute rather than built inline
  // into an onsubmit="confirm('...')" string — a data attribute is decoded
  // once by the browser as plain text, whereas a value spliced into an
  // inline JS string literal (even after HTML-escaping) can still break out
  // of that literal if the interpolated value — e.g. a parent's own child's
  // name — contains a quote character. Registered before initGenericValidation
  // / initSubmitFeedback so a "no" here can stop those later handlers via
  // stopImmediatePropagation, on the same submit event.
  function initConfirmForms() {
    document.querySelectorAll('form[data-confirm-message]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        if (!window.confirm(form.dataset.confirmMessage)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      });
    });
  }

  // ---------- footer active-page link ----------
  // The nav bars already mark the current page (server-side, via the
  // `active` param); the footer link lists never got the same treatment.
  // Done client-side so every page that includes either footer picks it
  // up automatically, with no per-page plumbing needed.
  function initFooterActiveLink() {
    var here = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.site-foot-links a, .app-foot-links a').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) !== '/' || href.indexOf('#') !== -1) return;
      var linkPath = href.replace(/\/$/, '') || '/';
      if (linkPath === here) link.classList.add('active');
    });
  }

  // ---------- password show/hide toggle ----------
  function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(function (btn) {
      var input = document.getElementById(btn.getAttribute('data-toggle-for'));
      if (!input) return;
      btn.addEventListener('click', function () {
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-label', showing ? (btn.dataset.showLabel || 'Show password') : (btn.dataset.hideLabel || 'Hide password'));
        btn.classList.toggle('is-showing', !showing);
      });
    });
  }

  function initCollection() {
    loops = Array.prototype.slice.call(document.querySelectorAll('.collection-example .tap-demo'));
    loops.forEach(function (demo) { demo.classList.toggle('is-looping', !reduced()); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCollection();
    initConfirmForms();
    initFaq();
    initFieldValidation();
    initGenericValidation();
    initSubmitFeedback();
    initPasswordToggles();
    initFooterActiveLink();
    // After every other class write above, so its single rect-read pass
    // flushes layout once, on final markup.
    initMotionEnvironment();
    var invalid = document.querySelector('[aria-invalid="true"]');
    if (invalid) invalid.focus();
  });
})();
