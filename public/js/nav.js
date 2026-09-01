(function () {
  var toggle = document.getElementById('navToggle');
  var panel = document.getElementById('appLinksMobile');
  var closeBtn = document.getElementById('appLinksMobileClose');
  if (!toggle || !panel) return;

  var toggleIcon = toggle.querySelector('svg');
  var toggleLabel = toggle.querySelector('span');
  var hamburgerPath = 'M4 7h16M4 12h16M4 17h16';
  var closePath = 'M6 6l12 12M18 6 6 18';
  var lockedScrollY = 0;

  // Locking scroll with overflow:hidden alone doesn't reliably stop
  // touch-scroll on mobile Safari, and can interact badly with the page's
  // sticky header. Pinning the body at its current scroll offset via
  // position:fixed locks it completely and lets us restore the exact
  // scroll position — no jump — when the menu closes.
  function lockBodyScroll() {
    lockedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -lockedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollY);
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (toggleIcon) toggleIcon.querySelector('path').setAttribute('d', open ? closePath : hamburgerPath);
    if (toggleLabel) toggleLabel.textContent = open ? 'Close' : 'Menu';
    if (open) {
      lockBodyScroll();
      panel.scrollTop = 0;
    } else {
      unlockBodyScroll();
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(!panel.classList.contains('open'));
  });

  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });

  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });
})();
