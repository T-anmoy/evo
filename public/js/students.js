'use strict';
function openStudentForm() {
  if (location.hash !== '#add-student') return;
  const form = document.getElementById('add-student');
  if (!form) return;
  if (form.tagName === 'DETAILS') form.open = true;
  form.scrollIntoView();
  form.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true });
}
window.addEventListener('hashchange', openStudentForm);
document.querySelector('[data-add-student]')?.addEventListener('click', () => {
  if (location.pathname === '/students' && location.hash === '#add-student') openStudentForm();
});
openStudentForm();
