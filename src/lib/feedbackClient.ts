import { solveParallel } from '../worker/pow';
import { clearOnInput, markField } from './formErrors';

// Only the real site (or a local test server) has the API; mirrors such as GitHub Pages send visitors to the canonical page.
// The box lives on its own subdomain; mirrors (GitHub Pages) send visitors there, where the API is.
if (!['pgr.donglinli.com', 'donglinli.com', 'localhost', '127.0.0.1'].includes(location.hostname))
  location.replace('https://pgr.donglinli.com/' + (document.documentElement.lang.startsWith('zh') ? '?lang=zh' : ''));

interface Copy { sending: string; sent: string; errors: Record<string, string> }

const root = document.querySelector<HTMLElement>('[data-feedback-box]');
if (root) setup(root);

function setup(root: HTMLElement) {
  const copy: Copy = JSON.parse(root.dataset.copy!);
  const form = root.querySelector<HTMLFormElement>('.fb-form')!;
  const status = form.querySelector<HTMLElement>('.status')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const counter = form.querySelector<HTMLElement>('[data-count]')!;
  const area = form.elements.namedItem('message') as HTMLTextAreaElement;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const topic = () => form.querySelector<HTMLInputElement>('input[name=category]:checked')?.value ?? '';
  const show = (text: string, kind?: 'ok' | 'error') => { status.textContent = text; if (kind) status.dataset.kind = kind; else delete status.dataset.kind; };
  const fieldError = (name: string, text: string) => markField(form, name, text);

  // The server refuses a proof sent sooner than 1.5 s after its challenge was issued, so remember when it arrived.
  let pending: Promise<{ challenge: string; bits: number; at: number }> | null = null;
  const challenge = () => pending ??= fetch('/api/feedback/challenge')
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(c => ({ ...c, at: Date.now() }));
  form.addEventListener('focusin', () => { challenge().catch(() => { pending = null; }); }, { once: true });
  area.addEventListener('input', () => { counter.textContent = String([...area.value].length); });
  clearOnInput(form);
  // an address that cannot work is pointed out when the visitor leaves the field, not only on sending
  const email = field('email');
  email.addEventListener('blur', () => { if (email.value.trim() && !email.checkValidity()) { email.setAttribute('aria-invalid', 'true'); form.querySelector('#fb-email-error')!.textContent = copy.errors['bad-email']; } });

  async function send(): Promise<Response> {
    const c = await challenge();
    const nonce = await solveParallel(c.challenge, c.bits);
    const early = 1700 - (Date.now() - c.at);
    if (early > 0) await new Promise(r => setTimeout(r, early));
    return fetch('/api/feedback', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        category: topic(), message: area.value, name: field('name').value, email: field('email').value.trim(),
        quote: field('quote').checked, website: field('website').value, pow: { challenge: c.challenge, nonce },
      }),
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    show('');
    if (!topic()) { fieldError('category', copy.errors.category); return; }
    if ([...area.value.trim()].length < 2) { fieldError('message', copy.errors.empty); return; }
    if (email.value.trim() && !email.checkValidity()) { fieldError('email', copy.errors['bad-email']); return; }
    submit.disabled = true; show(copy.sending);
    try {
      let response = await send();
      let body: { error?: string } = await response.json().catch(() => ({}));
      if (response.status === 400 && body.error === 'challenge') {
        pending = null; // the challenge was stale or used: get a new one (send waits until it is old enough) and try once more
        response = await send();
        body = await response.json().catch(() => ({}));
      }
      pending = null;
      if (response.ok) {
        form.reset(); counter.textContent = '0';
        show(copy.sent, 'ok');
        challenge().catch(() => { pending = null; });
      } else {
        const text = copy.errors[body.error ?? ''] ?? copy.errors.generic;
        const owner = ({ category: 'category', empty: 'message', 'too-long': 'message', 'bad-email': 'email' } as Record<string, string>)[body.error ?? ''];
        if (owner) { show(''); fieldError(owner, text); } else show(text, 'error');
      }
    } catch (error) {
      pending = null;
      show((error as Error).message === '429' ? copy.errors.rate : copy.errors.network, 'error'); // the challenge request is limited too
    } finally {
      submit.disabled = false;
    }
  });
}
