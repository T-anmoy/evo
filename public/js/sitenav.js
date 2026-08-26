(function () {
  var toggle = document.getElementById('siteNavToggle');
  var panel = document.getElementById('siteLinksMobile');
  if (!toggle || !panel) return;

  var toggleIcon = toggle.querySelector('svg');
  var toggleLabel = toggle.querySelector('span');
  var hamburgerPath = 'M4 7h16M4 12h16M4 17h16';
  var closePath = 'M6 6l12 12M18 6 6 18';

  function setOpen(open) {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (toggleIcon) toggleIcon.querySelector('path').setAttribute('d', open ? closePath : hamburgerPath);
    if (toggleLabel) toggleLabel.textContent = open ? 'Close' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', function () {
    setOpen(!panel.classList.contains('open'));
  });

  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });
})();
