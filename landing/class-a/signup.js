(() => {
  const form = document.querySelector('[data-signup-form]');
  if (!form) return;
  const success = document.querySelector('[data-success]');
  const errorBox = document.querySelector('[data-error]');
  const submit = form.querySelector('button[type="submit"]');

  const encode = (formData) => new URLSearchParams(formData).toString();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const originalLabel = submit ? submit.textContent : '';
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'SAVING…';
    }
    if (success) success.classList.remove('show');
    if (errorBox) errorBox.classList.remove('show');

    try {
      const data = new FormData(form);
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(data),
      });
      if (!response.ok) throw new Error('Registration request failed');
      form.reset();
      if (success) {
        success.classList.add('show');
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
    } catch (_) {
      if (errorBox) {
        errorBox.classList.add('show');
        errorBox.setAttribute('tabindex', '-1');
        errorBox.focus();
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    }
  });
})();