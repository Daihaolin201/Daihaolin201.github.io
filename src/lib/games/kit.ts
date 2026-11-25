// Interactive mini-games for the project showcase. Each mount() builds its own DOM inside a <details> panel,
// runs only while the panel is open, and returns a destroy() that stops loops and listeners.

export type Lang = 'en' | 'zh';
export type Game = { destroy(): void };
export const tr = (lang: Lang, en: string, zh: string) => (lang === 'zh' ? zh : en);
export const store = {
  get(key: string) { try { return localStorage.getItem('dl-game:' + key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem('dl-game:' + key, value); } catch { /* private mode: no memory, still playable */ } },
};

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string | false | null | undefined)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = String(v);
    else if (k === 'text') e.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k in e) (e as any)[k] = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid) e.append(kid);
  return e;
}

export function makeCanvas(w: number, h: number, label: string) {
  const cv = el('canvas', { class: 'gm-canvas', role: 'img', 'aria-label': label, tabIndex: 0 }) as HTMLCanvasElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr; cv.style.aspectRatio = `${w} / ${h}`;
  const ctx = cv.getContext('2d')!; ctx.scale(dpr, dpr);
  const toLocal = (ev: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * w / r.width, y: (ev.clientY - r.top) * h / r.height }; };
  return { cv, ctx, toLocal };
}

/** requestAnimationFrame loop with a clamped dt that pauses while the tab is hidden. */
export function loop(step: (dt: number) => void) {
  let id = 0, last = 0, on = true;
  const frame = (now: number) => { if (!on) return; const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; if (!document.hidden) step(dt); id = requestAnimationFrame(frame); };
  id = requestAnimationFrame(frame);
  return { stop() { on = false; cancelAnimationFrame(id); } };
}

export function slider(label: string, min: number, max: number, stepv: number, value: number, onInput: (v: number) => void) {
  const out = el('output', { text: String(value) });
  const input = el('input', { type: 'range', min, max, step: stepv, value, oninput: () => { out.textContent = input.value; onInput(Number(input.value)); } }) as HTMLInputElement;
  return { wrap: el('label', { class: 'gm-slider' }, el('span', { text: label }), input, out), input, out };
}

export const C = { bg: '#0d202b', grid: '#1b3442', teal: '#7ce0d2', amber: '#ffcc8e', blue: '#7aa8ff', red: '#ff7a6e', ink: '#e9f3fb', dim: '#8aa0b2' };
export function grid(ctx: CanvasRenderingContext2D, w: number, h: number, step = 20) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}
export const best = (key: string, value: number, lowerIsBetter = true) => {
  const prev = Number(store.get(key)); const better = !prev || (lowerIsBetter ? value < prev : value > prev);
  if (better) store.set(key, String(value)); return better ? value : prev;
};
