'use strict';
(() => {
  const dialog = document.getElementById('school-selector');
  if (dialog && typeof dialog.showModal === 'function') {
    let trigger, previousOverflow;
    document.querySelectorAll('[data-school-selector]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault(); trigger = link;
      const menu = link.closest('.site-links-mobile');
      if (menu) {
        if (menu.classList.contains('open')) document.getElementById('siteLinksMobileClose').click();
        trigger = document.getElementById('siteNavToggle');
      }
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
    const filters = component.querySelector('.school-menu-filters');
    const search = filters.querySelector('[data-menu-search]');
    const audience = filters.querySelector('[data-menu-audience]');
    filters.hidden = false;
    filters.addEventListener('submit', event => event.preventDefault());
    const filter = () => {
      const query = search.value.trim().toLocaleLowerCase();
      tabs.forEach(tab => {
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        const cards = [...panel.querySelectorAll('[data-menu-name]')];
        let count = 0;
        cards.forEach(card => {
          card.hidden = !card.dataset.menuName.toLocaleLowerCase().includes(query) ||
            (audience.value !== '' && !JSON.parse(card.dataset.menuAudiences).includes(audience.value));
          if (!card.hidden) count++;
        });
        tab.querySelector('.menu-count').textContent = count;
        panel.querySelector('.school-filter-empty').hidden = !cards.length || count > 0;
      });
    };
    search.addEventListener('input', filter);
    audience.addEventListener('change', filter);
    const select = (index, focus = false) => tabs.forEach((tab, i) => {
      const active = i === index, panel = document.getElementById(tab.getAttribute('aria-controls'));
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.hidden = !active;
      if (active && focus) tab.focus();
      if (active && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        panel.getAnimations().forEach(animation => animation.cancel());
        panel.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
      }
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
