'use strict';
document.querySelectorAll('[data-terms-dialog]').forEach(link => {
  const dialog = document.getElementById(link.dataset.termsDialog);
  if (!dialog || typeof dialog.showModal !== 'function') return;
  let previousOverflow;
  link.addEventListener('click', event => {
    event.preventDefault();
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('[autofocus]').focus();
  });
  dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow || '';
    link.focus();
  });
});
