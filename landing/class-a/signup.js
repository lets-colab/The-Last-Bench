(() => {
  const form = document.querySelector('[data-signup-form]');
  if (!form) return;
  const success = document.querySelector('[data-success]');
  const submit = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.program = form.dataset.program || 'class-a';
    data.savedAt = new Date().toISOString();
    try {
      const existing = JSON.parse(localStorage.getItem('classa-signups') || '[]');
      existing.push(data);
      localStorage.setItem('classa-signups', JSON.stringify(existing));
    } catch (_) {}
    form.reset();
    if (submit) submit.disabled = true;
    if (success) {
      success.classList.add('show');
      success.setAttribute('tabindex', '-1');
      success.focus();
    }
  });
})();