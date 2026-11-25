// Dark/light switch. The choice is remembered on this device; without a choice the system setting is used.
const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const prefersLight = matchMedia('(prefers-color-scheme: light)');
const current = () => (document.documentElement.dataset.theme ?? (prefersLight.matches ? 'light' : 'dark'));
function label() {
  if (!button) return;
  const next = current() === 'dark' ? button.dataset.labelLight : button.dataset.labelDark;
  button.title = next ?? '';
  button.setAttribute('aria-pressed', String(current() === 'light'));
}
button?.addEventListener('click', () => {
  const next = current() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('dl-theme', next); } catch { /* private mode: the choice lasts for this page only */ }
  label();
});
prefersLight.addEventListener('change', label);
label();
