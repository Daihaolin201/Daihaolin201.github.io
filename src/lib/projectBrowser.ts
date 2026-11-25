// Project browser: pick a project from the list, filter by category, and step through how it works.
// Without JavaScript every project is shown one after another and the list works as plain links.
const root = document.querySelector<HTMLElement>('[data-pb]');
if (root) setup(root);

function setup(root: HTMLElement) {
  root.setAttribute('data-ready', '');
  const items = [...root.querySelectorAll<HTMLAnchorElement>('[data-pb-item]')];
  const panels = new Map([...root.querySelectorAll<HTMLElement>('.pb-panel')].map(p => [p.id, p]));
  const filters = [...root.querySelectorAll<HTMLButtonElement>('.pb-filter')];
  const narrow = matchMedia('(max-width: 900px)');

  function setStage(panel: HTMLElement, n: number) {
    panel.dataset.stage = String(n);
    panel.querySelectorAll<HTMLButtonElement>('.pb-step').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.step) === n)));
  }
  function show(id: string, scroll = false) {
    const panel = panels.get(id);
    if (!panel) return;
    panels.forEach((p, key) => {
      const on = key === id;
      p.toggleAttribute('data-active', on);
      if (!on) p.querySelectorAll<HTMLDetailsElement>('details.play[open]').forEach(d => { d.open = false; }); // stops hidden games
    });
    items.forEach(a => a.setAttribute('aria-current', String(a.dataset.pbItem === id)));
    if (!panel.dataset.stage) setStage(panel, 1);
    if (scroll && narrow.matches) panel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  items.forEach(a => a.addEventListener('click', event => {
    event.preventDefault();
    const id = a.dataset.pbItem!;
    show(id, true);
    history.replaceState(null, '', '#' + id);
  }));
  panels.forEach(panel => panel.querySelectorAll<HTMLButtonElement>('.pb-step').forEach(b => b.addEventListener('click', () => setStage(panel, Number(b.dataset.step)))));
  const tagFilters = [...root.querySelectorAll<HTMLButtonElement>('.pb-filter[data-tag-filter]')];
  let cat = 'all', tag = 'all';
  function applyFilters() {
    let first = '';
    items.forEach(a => {
      const li = a.parentElement!;
      const visible = (cat === 'all' || li.dataset.cat === cat) && (tag === 'all' || (li.dataset.tags ?? '').split(' ').includes(tag));
      li.hidden = !visible;
      if (visible && !first) first = a.dataset.pbItem!;
    });
    root.querySelector<HTMLElement>('.pb-empty')!.hidden = !!first;
    const current = items.find(a => a.getAttribute('aria-current') === 'true');
    if (first && (!current || current.parentElement!.hidden)) show(first);
  }
  filters.filter(f => f.dataset.filter).forEach(f => f.addEventListener('click', () => {
    cat = f.dataset.filter!;
    filters.filter(x => x.dataset.filter).forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    applyFilters();
  }));
  tagFilters.forEach(f => f.addEventListener('click', () => {
    tag = f.dataset.tagFilter!;
    tagFilters.forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    applyFilters();
  }));

  // "#<project>-game" opens that project with its game running, so a game can be linked to directly.
  function openGameFromHash(hash: string) {
    const id = hash.endsWith('-game') ? hash.slice(0, -'-game'.length) : '';
    const panel = panels.get(id);
    const game = panel?.querySelector<HTMLDetailsElement>('details.play');
    if (!panel || !game) return false;
    if (items.find(a => a.dataset.pbItem === id)?.parentElement?.hidden) resetFilters();
    show(id);
    game.open = true;
    requestAnimationFrame(() => game.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    return true;
  }
  function resetFilters() {
    cat = 'all'; tag = 'all';
    filters.forEach(f => f.setAttribute('aria-pressed', String(f.dataset.filter === 'all' || f.dataset.tagFilter === 'all')));
    applyFilters();
  }
  root.querySelectorAll<HTMLAnchorElement>('[data-open-game]').forEach(a => a.addEventListener('click', event => {
    event.preventDefault();
    history.replaceState(null, '', a.hash);
    openGameFromHash(a.hash.slice(1));
  }));

  const fromHash = location.hash.slice(1);
  if (!openGameFromHash(fromHash)) show(panels.has(fromHash) ? fromHash : items[0].dataset.pbItem!);
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (!openGameFromHash(h) && panels.has(h)) show(h); });
}
