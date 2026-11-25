import { solveParallel } from '../worker/pow';
import { clearOnInput, markField } from './formErrors';

// Only the real site (or a local test server) has the API; mirrors such as GitHub Pages send visitors to the canonical page.
if (!['donglinli.com', 'localhost', '127.0.0.1'].includes(location.hostname)) location.replace('https://donglinli.com' + location.pathname + location.search);

interface Copy {
  sending: string; sent: string; sentPublic: string; errors: Record<string, string>;
  anonymous: string; reply: string; wallEmpty: string; wallError: string;
}
interface Wall { id: number; createdAt: number; name: string; body: string; reply: string | null; repliedAt: number | null }

const root = document.querySelector<HTMLElement>('[data-message-board]');
if (root) setup(root);

function setup(root: HTMLElement) {
  const lang = root.dataset.lang === 'zh' ? 'zh' : 'en';
  const copy: Copy = JSON.parse(root.dataset.copy!);
  const form = root.querySelector<HTMLFormElement>('.msg-form')!;
  const status = form.querySelector<HTMLElement>('.status')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const counter = form.querySelector<HTMLElement>('[data-count]')!;
  const area = form.elements.namedItem('message') as HTMLTextAreaElement;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const show = (text: string, kind?: 'ok' | 'error') => { status.textContent = text; if (kind) status.dataset.kind = kind; else delete status.dataset.kind; };
  const fieldError = (name: string, text: string) => markField(form, name, text);

  // The server refuses a proof sent sooner than 1.5 s after its challenge was issued, so remember when it arrived.
  let pending: Promise<{ challenge: string; bits: number; at: number }> | null = null;
  const challenge = () => pending ??= fetch('/api/message/challenge')
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(c => ({ ...c, at: Date.now() }));
  form.addEventListener('focusin', () => { challenge().catch(() => { pending = null; }); }, { once: true });
  area.addEventListener('input', () => { counter.textContent = String([...area.value].length); });
  clearOnInput(form);

  async function send(): Promise<Response> {
    const c = await challenge();
    const nonce = await solveParallel(c.challenge, c.bits);
    const early = 1700 - (Date.now() - c.at);
    if (early > 0) await new Promise(r => setTimeout(r, early));
    return fetch('/api/message', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: field('name').value, contact: field('contact').value, message: area.value,
        public: field('public').checked, website: field('website').value, lang, pow: { challenge: c.challenge, nonce },
      }),
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    show('');
    if ([...area.value.trim()].length < 2) { fieldError('message', copy.errors.empty); return; }
    submit.disabled = true; show(copy.sending);
    try {
      let response = await send();
      let body: { error?: string; reason?: string } = await response.json().catch(() => ({}));
      if (response.status === 400 && body.error === 'challenge') {
        pending = null; // the challenge was stale or used: get a new one (send waits until it is old enough) and try once more
        response = await send();
        body = await response.json().catch(() => ({}));
      }
      pending = null;
      if (response.ok) {
        const wasPublic = field('public').checked;
        form.reset(); counter.textContent = '0';
        show(wasPublic ? copy.sentPublic : copy.sent, 'ok');
        challenge().catch(() => { pending = null; });
      } else {
        const text = copy.errors[body.error ?? ''] ?? copy.errors.generic;
        const owner = ({ empty: 'message', 'too-long': 'message', 'bad-contact': 'contact' } as Record<string, string>)[body.error ?? ''];
        if (owner) { show(''); fieldError(owner, text); } else show(text, 'error');
      }
    } catch {
      pending = null;
      show(copy.errors.network, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  const list = root.querySelector<HTMLElement>('[data-wall]')!;
  const date = (t: number) => new Date(t).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  function note(text: string) {
    const li = document.createElement('li'); li.className = 'wall-note'; li.textContent = text; list.replaceChildren(li);
  }
  fetch('/api/wall').then(r => r.json()).then((data: { messages: Wall[] }) => {
    if (!data.messages.length) return note(copy.wallEmpty);
    list.replaceChildren(...data.messages.map(m => {
      const li = document.createElement('li');
      const who = document.createElement('div'); who.className = 'who';
      const name = document.createElement('strong'); name.textContent = m.name || copy.anonymous;
      const when = document.createElement('time'); when.textContent = date(m.createdAt); when.dateTime = new Date(m.createdAt).toISOString();
      who.append(name, when);
      const text = document.createElement('p'); text.className = 'text'; text.textContent = m.body;
      li.append(who, text);
      if (m.reply) {
        const reply = document.createElement('p'); reply.className = 'reply';
        const label = document.createElement('b'); label.textContent = copy.reply;
        reply.append(label, document.createTextNode(m.reply));
        li.append(reply);
      }
      return li;
    }));
  }).catch(() => note(copy.wallError));
}
