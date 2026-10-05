'use strict';
(() => {
  const dialog = document.getElementById('school-selector');
  if (dialog && typeof dialog.showModal === 'function') {
    let trigger, previousOverflow;
    document.querySelectorAll('[data-school-selector]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault(); trigger = link;
      const menu = link.closest('.site-links-mobile.open');
      if (menu) { document.getElementById('siteLinksMobileClose').click(); trigger = document.getElementById('siteNavToggle'); }
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
      (dialog.querySelector('input:checked') || dialog.querySelector('input') || dialog.querySelector('button')).focus();
    }));
    dialog.querySelector('[data-school-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { document.documentElement.style.overflow = previousOverflow || ''; trigger?.focus(); });
  }
  document.querySelectorAll('[data-school-tabs]').forEach(component => {
    const list = component.querySelector('.school-category-tabs');
    if (!list) return;
    const tabs = [...list.querySelectorAll('button')];
    const select = (index, focus = false) => tabs.forEach((tab, i) => {
      const active = i === index, panel = document.getElementById(tab.getAttribute('aria-controls'));
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.hidden = !active;
      if (active && focus) tab.focus();
    });
    list.hidden = false; list.setAttribute('role', 'tablist'); select(0);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        const rtl = getComputedStyle(list).direction === 'rtl'; let next;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (event.key === 'ArrowRight') next = (index + (rtl ? -1 : 1) + tabs.length) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + (rtl ? 1 : -1) + tabs.length) % tabs.length;
        if (next !== undefined) { event.preventDefault(); select(next, true); }
      });
    });
  });
})();
