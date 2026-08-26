(function () {
  var btn = document.getElementById('notifBellBtn');
  var dropdown = document.getElementById('notifDropdown');
  if (!btn || !dropdown) return;

  function setOpen(open) {
    dropdown.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!dropdown.classList.contains('open'));
  });

  document.addEventListener('click', function (e) {
    if (dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== btn) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dropdown.classList.contains('open')) setOpen(false);
  });
})();
