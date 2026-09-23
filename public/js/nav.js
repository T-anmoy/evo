(function () {
  [
    { toggle: 'navToggle', panel: 'appLinksMobile', close: 'appLinksMobileClose' },
    { toggle: 'siteNavToggle', panel: 'siteLinksMobile', close: 'siteLinksMobileClose' }
  ].forEach(function (ids) {
    var toggle = document.getElementById(ids.toggle);
    var panel = document.getElementById(ids.panel);
    var close = document.getElementById(ids.close);
    if (!toggle || !panel) return;
    var open = false, scrollY = 0, background = [];
    panel.hidden = true;
    panel.inert = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', toggle.dataset.closedLabel);
    function setOpen(next, restoreFocus) {
      if (open === next) return;
      open = next;
      panel.hidden = !open;
      panel.inert = !open;
      panel.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = -scrollY + 'px';
        document.body.style.width = '100%';
        var header = panel.closest('header');
        background = Array.from(document.body.children).filter(function (el) { return el !== header && !['SCRIPT','STYLE'].includes(el.tagName) && !el.inert; });
        var bar = header.querySelector('.site-nav, .app-nav');
        if (bar && !bar.inert) background.push(bar);
        background.forEach(function (el) { el.inert = true; });
        panel.scrollTop = 0;
        (close || panel.querySelector('a')).focus();
      } else {
        background.forEach(function (el) { el.inert = false; });
        background = [];
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
        if (restoreFocus !== false) toggle.focus();
      }
    }
    toggle.addEventListener('click', function () { setOpen(!open); });
    if (close) close.addEventListener('click', function () { setOpen(false); });
    panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false, false); }); });
    document.addEventListener('keydown', function (event) {
      if (!open) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key === 'Tab') {
        var items = Array.from(panel.querySelectorAll('a[href],button:not([disabled])')).filter(function(el) {return el.getClientRects().length;});
        var first = items[0], last = items[items.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', function () {
      if (open && getComputedStyle(toggle).display === 'none') {
        setOpen(false, false);
        panel.closest('header').querySelector('a').focus();
      }
    });
    window.addEventListener('pageshow', function () { if(open) setOpen(false, false); });
  });
})();
