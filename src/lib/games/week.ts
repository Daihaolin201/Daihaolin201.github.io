import { best, el, store, tr, type Game, type Lang } from './kit';
import * as g from './week.logic';

/* ========== Local-first teaching tools: plan the week, then export it as .ics ========== */
const NAMES: Record<string, [string, string, string, string]> = {   // long en, long zh, short en, short zh
  m: ['Maths lesson', '数学课', 'Maths', '数学课'], p: ['Physics lesson', '物理课', 'Physics', '物理课'], c: ['Control tutorial', '控制课辅导', 'Control', '控制辅导'],
  pm: ['Maths prep', '数学备课', 'Maths prep', '数学备课'], pp: ['Physics prep', '物理备课', 'Physics prep', '物理备课'], pc: ['Control prep', '控制备课', 'Control prep', '控制备课'],
  fm: ['Maths feedback notes', '数学课后反馈', 'Maths notes', '数学反馈'], fc: ['Control feedback notes', '控制课辅导反馈', 'Control notes', '控制反馈'],
  ck: ['Student check-in', '学生沟通', 'Check-in', '学生沟通'], mtg: ['Fixed meeting', '固定会议', 'Meeting', '会议'],
};
const COLORS: Record<g.Kind, string> = { teach: '#7ce0d2', prep: '#7aa8ff', note: '#ffcc8e', fixed: '#3a5160' };
const ROW_H = 36;

const CSS = `
.gm-week-levels{display:flex;gap:.35rem;flex-wrap:wrap}
.gm-week-tab[aria-pressed=true]{background:#7ce0d2;border-color:#7ce0d2;color:#062b30}
.gm-week-scroll{overflow-x:auto;border-radius:8px}
.gm-week-inner{min-width:320px;display:grid;grid-template-columns:2.4rem 1fr;gap:3px 4px}
.gm-week-days{display:grid;grid-template-columns:repeat(5,1fr);text-align:center;font-size:.72rem;font-weight:650;color:#9fb8c8}
.gm-week-hours{display:grid;grid-auto-rows:${ROW_H}px;font:500 .66rem ui-monospace,Menlo,monospace;color:#7f95a6}
.gm-week-hours span{display:flex;align-items:center}
.gm-week-area{position:relative;display:grid;grid-template-columns:repeat(5,1fr);grid-auto-rows:${ROW_H}px;border-radius:7px;overflow:hidden;background:#0d202b}
.gm-week-cell{min-width:0;padding:0;border:0;border-radius:0;background:#15293a;box-shadow:inset 0 0 0 1px #0b1823;cursor:pointer;touch-action:manipulation}
.gm-week-cell.off{background:#0f1d29}
.gm-week-cell:hover{background:#1c3547}
.gm-week-cell:focus-visible{outline:2px solid #7de9ef;outline-offset:-2px;position:relative;z-index:3}
.gm-week-layer{position:absolute;inset:0;pointer-events:none}
.gm-week-lunch{position:absolute;left:0;right:0;height:${ROW_H}px;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:.66rem;color:#8aa0b2;background:repeating-linear-gradient(135deg,#ffffff0d 0 6px,transparent 6px 12px)}
.gm-week-block{position:absolute;box-sizing:border-box;width:20%;border:1px solid #0b1823;border-radius:5px;padding:1px 3px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;font:700 .62rem/1.15 system-ui,sans-serif;color:#062b30;background:var(--c);pointer-events:none;z-index:1}
.gm-week-block.mv{pointer-events:auto;cursor:pointer}
.gm-week-block.bad{background:#ff7a6e;box-shadow:inset 0 0 0 2px #ffffff55}
.gm-week-block.fixed{color:#c9d8e3;background:repeating-linear-gradient(45deg,#2c4252 0 6px,#233644 6px 12px)}
.gm-week-block.sel{box-shadow:0 0 0 2px #fff}
.gm-week-rules{list-style:none;margin:0;padding:0;display:grid;gap:.3rem;font-size:.8rem;line-height:1.35}
.gm-week-rules li{display:flex;gap:.5rem;align-items:flex-start;color:#b6cad8}
.gm-week-rules i{font-style:normal;flex:none;width:1.15rem;height:1.15rem;border-radius:50%;display:inline-grid;place-items:center;border:1px solid #3c5b6a;font-size:.7rem;margin-top:.05rem}
.gm-week-rules li.ok{color:#e6f3fb}
.gm-week-rules li.ok i{background:#7ce0d2;border-color:#7ce0d2;color:#062b30}
.gm-week-rules li.bad i{background:#ff7a6e;border-color:#ff7a6e;color:#2b0a07}
.gm-week-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.gm-week-banner{display:none;border:1px solid #7ce0d2;border-radius:10px;background:#0f2a30;padding:.55rem .7rem;font-size:.86rem;color:#e6f3fb}
.gm-week-banner.show{display:block}
.gm-week-banner b{color:#7ce0d2}
.gm-week-wrap{position:relative;min-width:0}
.gm-week-party{position:absolute;left:50%;top:35%;pointer-events:none;z-index:5}
.gm-week-party span{position:absolute;width:7px;height:10px;border-radius:2px;background:var(--c);opacity:0}
@media (prefers-reduced-motion:no-preference){.gm-week-party span{animation:gm-week-pop 1.3s ease-out forwards}}
@keyframes gm-week-pop{from{opacity:1;transform:translate(0,0) rotate(0)}to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--rot))}}
`;

export default function mount(root: HTMLElement, lang: Lang): Game {
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dayNames = lang === 'zh' ? ['周一', '周二', '周三', '周四', '周五'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const long = (id: string) => tr(lang, NAMES[id][0], NAMES[id][1]), short = (id: string) => tr(lang, NAMES[id][2], NAMES[id][3]);
  const hours = Array.from({ length: g.WEEK.last - g.WEEK.first }, (_, i) => g.WEEK.first + i);
  const planKey = (lv: g.Level) => 'week-plan-' + lv.id, bestKey = (lv: g.Level) => 'week-best-' + lv.id, doneKey = (lv: g.Level) => 'week-done-' + lv.id;
  const bestOf = (lv: g.Level) => Number(store.get(bestKey(lv))) || 0;

  let li = 0, items: g.Item[] = [], moves = 0, sel: string | null = null, lift: { id: string; day: number; hour: number } | null = null, wasSolved = false, kd = 0, kh = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const level = () => g.LEVELS[li];

  const goal = tr(lang, 'Place every card so that every rule in the list is ticked. Pick a card, then tap the day and start hour. Tap a placed card to pick it up again.',
    '排入全部卡片，使清单中的规则全部满足。先选择卡片，再点击开始日期和时间；点击已排卡片可重新调整。');
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: goal });

  /* ---- persistence: per level, on this device ---- */
  function load() {
    const lv = level(); items = g.freshItems(lv); moves = 0; sel = null; lift = null;
    try {
      const saved = JSON.parse(store.get(planKey(lv)) || 'null');
      if (saved && typeof saved === 'object') {
        for (const i of items) {
          const p = saved.p?.[i.id];
          if (i.kind !== 'fixed' && Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] < g.WEEK.days && p[1] >= g.WEEK.first && p[1] + i.len <= g.WEEK.last) { i.day = p[0]; i.hour = p[1]; }
        }
        if (Number.isInteger(saved.moves) && saved.moves >= 0) moves = saved.moves;
      }
    } catch { /* a damaged save just starts the level fresh */ }
    wasSolved = g.evaluate(lv, items).solved;
  }
  function save() {
    const p: Record<string, [number, number]> = {};
    for (const i of items) if (i.kind !== 'fixed' && g.isPlaced(i)) p[i.id] = [i.day!, i.hour!];
    store.set(planKey(level()), JSON.stringify({ p, moves }));
  }

  /* ---- static DOM ---- */
  const resetBtn = el('button', { class: 'gm-btn', type: 'button', text: tr(lang, 'Start over', '重新开始'), onclick: () => { items = g.freshItems(level()); moves = 0; sel = null; lift = null; wasSolved = false; save(); status.textContent = goal; paint(); } }) as HTMLButtonElement;
  resetBtn.setAttribute('data-gm-start', '');
  const exportBtn = el('button', { class: 'gm-btn primary', type: 'button', disabled: true, text: tr(lang, 'Export .ics for next week', '导出下周的 .ics 日历'), onclick: () => exportIcs() }) as HTMLButtonElement;
  const tabs = g.LEVELS.map((lv, i) => el('button', { class: 'gm-btn gm-week-tab', type: 'button', onclick: () => { li = i; load(); status.textContent = goal; paint(); } }) as HTMLButtonElement);
  const stats = el('div', { class: 'gm-stats' });
  const tray = el('div', { class: 'gm-queue', role: 'group', 'aria-label': tr(lang, 'Cards to place', '待排的卡片') });
  const cells: HTMLButtonElement[] = [];
  const area = el('div', { class: 'gm-week-area', role: 'grid', 'aria-label': tr(lang, 'Week, Monday to Friday', '一周，周一到周五') });
  const lunch = el('div', { class: 'gm-week-lunch', style: `top:${(g.LUNCH - g.WEEK.first) * ROW_H}px`, text: tr(lang, 'Lunch', '午休'), 'aria-hidden': 'true' });
  const layer = el('div', { class: 'gm-week-layer', 'aria-hidden': 'true' });
  hours.forEach((h, hi) => { for (let d = 0; d < g.WEEK.days; d++) {
    const b = el('button', { type: 'button', class: 'gm-week-cell', role: 'gridcell', tabIndex: hi === 0 && d === 0 ? 0 : -1, onclick: () => { kd = d; kh = hi; roving(); cellClick(d, h); } }) as HTMLButtonElement;
    cells.push(b); area.append(b);
  } });
  area.append(lunch, layer);
  const roving = () => cells.forEach((b, i) => { b.tabIndex = i === kh * g.WEEK.days + kd ? 0 : -1; });
  area.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && sel) { sel = null; paint(); return; }
    const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!m) return;
    e.preventDefault(); kd = Math.max(0, Math.min(g.WEEK.days - 1, kd + m[0])); kh = Math.max(0, Math.min(hours.length - 1, kh + m[1])); roving(); cells[kh * g.WEEK.days + kd].focus();
  });
  const party = el('div', { class: 'gm-week-party', 'aria-hidden': 'true' });
  const rulesEl = el('ul', { class: 'gm-week-rules' });
  const banner = el('div', { class: 'gm-week-banner' });
  root.append(el('style', { text: CSS }),
    el('div', { class: 'gm-week-levels' }, ...tabs),
    tray,
    el('div', { class: 'gm-week-wrap' }, el('div', { class: 'gm-week-scroll' }, el('div', { class: 'gm-week-inner' },
      el('span'), el('div', { class: 'gm-week-days', 'aria-hidden': 'true' }, ...dayNames.map(n => el('span', { text: n }))),
      el('div', { class: 'gm-week-hours', 'aria-hidden': 'true' }, ...hours.map(h => el('span', { text: `${h}:00` }))), area)), party),
    rulesEl, stats, banner, status,
    el('div', { class: 'gm-controls' }, exportBtn, resetBtn));

  /* ---- rule text ---- */
  const dayList = (days: number[]) => lang === 'zh' ? days.map(d => dayNames[d]).join('、') : days.map(d => dayNames[d]).join(' and ');
  function ruleText(r: g.Rule): string {
    switch (r.type) {
      case 'window': return tr(lang, `${long(r.item)}: the student is free only ${dayList(r.days)}, ${r.from}:00–${r.to}:00`, `${long(r.item)}：学生仅${dayList(r.days)} ${r.from}:00–${r.to}:00 有空`);
      case 'cap': return tr(lang, `At most ${r.max} teaching hours a day`, `每天授课不超过 ${r.max} 小时`);
      case 'before': return tr(lang, 'Each prep comes before the lesson it prepares', '每份备课都排在对应的课之前');
      case 'after': return tr(lang, 'Feedback notes go on the same day, after the lesson', '课后反馈排在上课当天、课后');
      case 'lunch': return tr(lang, `Lunch, ${g.LUNCH}:00–${g.LUNCH + 1}:00, stays free`, `${g.LUNCH}:00–${g.LUNCH + 1}:00 午休不排课`);
      case 'clear': return tr(lang, 'Nothing overlaps', '各项时间互不重叠');
    }
  }

  /* ---- actions ---- */
  const selItem = () => items.find(i => i.id === sel);
  function pickUp(i: g.Item) {
    if (i.kind === 'fixed' || !g.isPlaced(i)) return;
    lift = { id: i.id, day: i.day!, hour: i.hour! }; i.day = undefined; i.hour = undefined; sel = i.id; save(); paint();
  }
  function cellClick(d: number, h: number) {
    const cur = selItem();
    if (!cur) {
      const here = items.filter(i => i.kind !== 'fixed' && g.isPlaced(i) && i.day === d && h >= i.hour! && h < i.hour! + i.len).pop();
      if (here) pickUp(here); else status.textContent = tr(lang, 'Select a card first.', '请先选择卡片。');
      return;
    }
    const hour = Math.min(h, g.WEEK.last - cur.len);
    if (!(lift && lift.id === cur.id && lift.day === d && lift.hour === hour)) moves++;
    cur.day = d; cur.hour = hour; sel = null; lift = null; save();
    const ev = g.evaluate(level(), items), open = ev.results.filter(r => r.status !== 'ok').length;
    paint();
    if (ev.solved && !wasSolved) { wasSolved = true; solved(true); }
    else { wasSolved = ev.solved; status.textContent = ev.solved ? status.textContent : tr(lang, `${items.filter(i => i.kind !== 'fixed' && g.isPlaced(i)).length} of ${items.filter(i => i.kind !== 'fixed').length} cards placed, ${open} of ${ev.results.length} rules still open.`, `已排 ${items.filter(i => i.kind !== 'fixed' && g.isPlaced(i)).length}/${items.filter(i => i.kind !== 'fixed').length} 张，未满足规则 ${open}/${ev.results.length} 条。`); }
  }
  function solved(celebrate: boolean) {
    const lv = level(), prev = bestOf(lv), isNew = !prev || moves < prev;
    best(bestKey(lv), moves, true); store.set(doneKey(lv), '1');
    status.textContent = tr(lang, `All rules met in ${moves} moves.`, `全部规则已满足，共 ${moves} 步。`);
    if (celebrate && !reduced()) confetti();
    paint();
    if (celebrate && isNew) status.textContent += tr(lang, ' New best for this level.', '本关新纪录。');
  }
  function confetti() {
    party.replaceChildren(...Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.4, r = 60 + Math.random() * 90, s = el('span');
      s.style.setProperty('--c', ['#7ce0d2', '#ffcc8e', '#7aa8ff', '#f59ac4', '#b5e07c'][i % 5]);
      s.style.setProperty('--dx', `${Math.cos(a) * r}px`); s.style.setProperty('--dy', `${Math.sin(a) * r - 20}px`); s.style.setProperty('--rot', `${Math.round(Math.random() * 540)}deg`);
      return s;
    }));
    const t = setTimeout(() => { timers.delete(t); party.replaceChildren(); }, 1500); timers.add(t);
  }
  function exportIcs() {
    if (!g.evaluate(level(), items).solved) return;
    const lessons: g.Lesson[] = items.filter(i => i.kind !== 'fixed').map(i => ({ id: i.id, title: long(i.id), len: i.len, day: i.day, hour: i.hour }));
    const ics = g.buildIcs(lessons, g.nextMonday(new Date()), new Date());
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = el('a', { href: url, download: 'week-plan.ics' }); document.body.append(a); a.click(); a.remove();
    const t = setTimeout(() => { timers.delete(t); URL.revokeObjectURL(url); }, 1000); timers.add(t);
  }

  /* ---- painting ---- */
  function paint() {
    const lv = level(), ev = g.evaluate(lv, items), selected = selItem();
    tabs.forEach((b, i) => { b.textContent = tr(lang, `Level ${i + 1}`, `第 ${i + 1} 关`) + (store.get(doneKey(g.LEVELS[i])) ? ' ✓' : ''); b.setAttribute('aria-pressed', String(i === li)); });
    const movable = items.filter(i => i.kind !== 'fixed');
    tray.replaceChildren(...movable.filter(i => !g.isPlaced(i)).map(i => {
      const b = el('button', { type: 'button', class: 'gm-job' + (sel === i.id ? ' on' : ''), text: tr(lang, `${long(i.id)} · ${i.len}h`, `${long(i.id)} · ${i.len} 小时`), 'aria-pressed': String(sel === i.id),
        onclick: () => { sel = sel === i.id ? null : i.id; paint(); } });
      b.style.setProperty('--c', COLORS[i.kind]); return b;
    }));
    if (!tray.children.length) tray.append(el('span', { class: 'gm-stats', text: tr(lang, 'All cards are on the grid.', '卡片已全部排入。') }));
    const win = selected && lv.rules.find((r): r is Extract<g.Rule, { type: 'window' }> => r.type === 'window' && r.item === selected.id);
    cells.forEach((b, k) => {
      const hi = Math.floor(k / g.WEEK.days), d = k % g.WEEK.days, h = hours[hi];
      const at = selected ? Math.min(h, g.WEEK.last - selected.len) : h;
      b.classList.toggle('off', !!win && !(win.days.includes(d) && at >= win.from && at + selected!.len <= win.to));
      const here = items.filter(i => g.isPlaced(i) && i.day === d && h >= i.hour! && h < i.hour! + i.len).map(i => short(i.id));
      b.setAttribute('aria-label', `${dayNames[d]} ${h}:00${here.length ? ', ' + here.join(', ') : ''}`);
    });
    layer.replaceChildren(...items.filter(g.isPlaced).map(i => {
      const b = el('div', { class: `gm-week-block ${i.kind === 'fixed' ? 'fixed' : 'mv'}` + (ev.bad.has(i.id) ? ' bad' : ''), text: short(i.id), title: long(i.id),
        onclick: () => pickUp(i) });
      b.style.setProperty('--c', COLORS[i.kind]);
      Object.assign(b.style, { left: `${i.day! * 20}%`, top: `${(i.hour! - g.WEEK.first) * ROW_H}px`, height: `${i.len * ROW_H}px` });
      return b;
    }));
    rulesEl.replaceChildren(...ev.results.map(r => {
      const mark = r.status === 'ok' ? '✓' : r.status === 'bad' ? '✗' : '';
      const word = r.status === 'ok' ? tr(lang, 'Met: ', '已满足：') : r.status === 'bad' ? tr(lang, 'Broken: ', '被破坏：') : tr(lang, 'Open: ', '待完成：');
      return el('li', { class: r.status }, el('i', { 'aria-hidden': 'true', text: mark }), el('span', {}, el('span', { class: 'gm-week-sr', text: word }), ruleText(r.rule)));
    }));
    const b = bestOf(lv);
    stats.textContent = tr(lang, `Moves ${moves} · minimum ${movable.length} · best ${b || '–'}`, `步数 ${moves} · 最少 ${movable.length} · 最佳 ${b || '–'}`);
    exportBtn.disabled = !ev.solved;
    banner.classList.toggle('show', ev.solved);
    banner.replaceChildren(...(ev.solved ? [el('b', { text: tr(lang, 'Week planned. ', '排课完成。') }), tr(lang, 'The calendar export is ready.', '可导出日历。')] : []));
  }

  load(); paint();
  if (wasSolved) { best(bestKey(level()), moves, true); store.set(doneKey(level()), '1'); status.textContent = tr(lang, `All rules met in ${moves} moves.`, `全部规则已满足，共 ${moves} 步。`); paint(); }
  return { destroy() { for (const t of timers) clearTimeout(t); timers.clear(); } };
}
