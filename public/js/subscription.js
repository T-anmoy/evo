'use strict';
const count = document.getElementById('months-count');
count?.addEventListener('change', () => {
  document.querySelectorAll('[data-month-index]').forEach(item => { item.hidden = Number(item.dataset.monthIndex) >= Number(count.value); });
});
