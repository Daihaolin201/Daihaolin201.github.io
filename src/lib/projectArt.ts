// Animates the project diagrams. Elements opt in with data attributes, and only the step being explained moves:
//   data-anim="follow" data-path="<id of a <path>>" data-dur="4"   move along a path (data-turn="1" rotates with it)
//   data-anim="flow"   data-dur="1"                               dashed line that flows
//   data-anim="pulse"  data-dur="1.6" data-delay="0.3"            fade and grow, like a radio wave or a ping
//   data-anim="blink"  data-dur="1"   data-delay="0.2"            switch on and off, like a sensor or an LED
//   data-anim="draw"   data-dur="2"                               draw a line from start to end, then hold
//   data-on="2 3"      steps in which the element moves (default: all)
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
type Item = { el: SVGGraphicsElement; kind: string; dur: number; delay: number; on: string[]; path?: SVGPathElement; len?: number; turn: boolean; base?: string };

function collect(panel: HTMLElement): Item[] {
  return [...panel.querySelectorAll<SVGGraphicsElement>('svg [data-anim]')].map(el => {
    const kind = el.dataset.anim!, path = el.dataset.path ? panel.querySelector<SVGPathElement>('#' + el.dataset.path) ?? undefined : undefined;
    const item: Item = { el, kind, dur: Number(el.dataset.dur || 2), delay: Number(el.dataset.delay || 0), on: (el.dataset.on || '').split(/\s+/).filter(Boolean), path, turn: el.dataset.turn === '1', base: el.getAttribute('transform') ?? '' };
    if (kind === 'draw' && el instanceof SVGGeometryElement) { item.len = el.getTotalLength(); el.style.strokeDasharray = String(item.len); }
    return item;
  });
}

function frame(items: Item[], stage: string, t: number) {
  for (const it of items) {
    const active = !it.on.length || it.on.includes(stage);
    const p = ((t - it.delay) / it.dur) % 1, phase = p < 0 ? p + 1 : p;
    const el = it.el as SVGGraphicsElement & { style: CSSStyleDeclaration };
    if (it.kind === 'follow' && it.path) {
      const total = it.path.getTotalLength(), at = active ? phase * total : 0;
      const pt = it.path.getPointAtLength(at), ahead = it.path.getPointAtLength(Math.min(total, at + 1));
      const angle = it.turn ? Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI : 0;
      el.setAttribute('transform', `translate(${pt.x} ${pt.y})${it.turn ? ` rotate(${angle})` : ''}`);
    } else if (it.kind === 'flow') {
      el.style.strokeDashoffset = active ? String(-phase * 24) : '0';
    } else if (it.kind === 'pulse') {
      el.style.opacity = active ? String(Math.max(0, 1 - phase) * 0.95) : '0';
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
      el.style.transform = active ? `scale(${0.6 + phase * 0.6})` : '';
    } else if (it.kind === 'blink') {
      el.style.opacity = active ? (phase < 0.5 ? '1' : '0.25') : '';
    } else if (it.kind === 'draw' && it.len) {
      el.style.strokeDashoffset = active ? String(it.len * Math.max(0, 1 - Math.min(1, (t - it.delay) / it.dur))) : '0';
    }
  }
}

const running = new Map<HTMLElement, { stop(): void }>();
function start(panel: HTMLElement) {
  running.get(panel)?.stop();
  const items = collect(panel);
  if (!items.length) return;
  let raf = 0, t0 = 0, stage = panel.dataset.stage || '1';
  const tick = (now: number) => {
    if (!t0 || panel.dataset.stage !== stage) { t0 = now; stage = panel.dataset.stage || '1'; }
    frame(items, stage, (now - t0) / 1000);
    raf = requestAnimationFrame(tick);
  };
  if (still) { frame(items, stage, 0.9); return; }
  raf = requestAnimationFrame(tick);
  running.set(panel, { stop() { cancelAnimationFrame(raf); running.delete(panel); } });
}

// run only the visible project, and only while it is on screen
const panels = [...document.querySelectorAll<HTMLElement>('.pb-panel')];
const seen = new IntersectionObserver(entries => {
  for (const e of entries) {
    const panel = e.target as HTMLElement;
    if (e.isIntersecting && (panel.hasAttribute('data-active') || !panel.closest('[data-ready]'))) start(panel);
    else running.get(panel)?.stop();
  }
});
panels.forEach(p => seen.observe(p));
new MutationObserver(records => {
  for (const r of records) {
    const panel = r.target as HTMLElement;
    if (r.attributeName === 'data-active') { if (panel.hasAttribute('data-active')) start(panel); else running.get(panel)?.stop(); }
    if (r.attributeName === 'data-stage' && panel.hasAttribute('data-active')) start(panel);
  }
}).observe(document.querySelector('[data-pb]') ?? document.body, { subtree: true, attributes: true, attributeFilter: ['data-active', 'data-stage'] });
document.addEventListener('visibilitychange', () => { if (document.hidden) running.forEach(r => r.stop()); else panels.filter(p => p.hasAttribute('data-active')).forEach(start); });
