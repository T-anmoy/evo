'use strict';
document.querySelectorAll('[data-terms-dialog]').forEach(link => {
  const dialog = document.getElementById(link.dataset.termsDialog);
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const mealsForm = link.dataset.saveMeals ? document.getElementById(link.dataset.saveMeals) : null;
  let dirty = false;
  mealsForm?.addEventListener('change', () => { dirty = true; });
  let previousOverflow;
  link.addEventListener('click', event => {
    event.preventDefault();
    if (mealsForm && dirty) {
      const proceed = document.createElement('input');
      proceed.type = 'hidden'; proceed.name = 'proceed'; proceed.value = 'modal';
      mealsForm.appendChild(proceed);
      mealsForm.requestSubmit();
      return;
    }
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('[autofocus]').focus();
  });
  dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  if (mealsForm && new URLSearchParams(location.search).get('terms') === '1') link.click();
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow || '';
    link.focus();
  });
});
