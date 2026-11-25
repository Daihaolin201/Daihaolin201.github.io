import { best, el, loop, store, tr, type Game, type Lang } from './kit';
import * as g from './cluster.logic';

/* ========== Research software: keep the cluster busy (an arcade scheduling round) ========== */
const NAMES: Record<g.KindId, [string, string]> = {
  matlab: ['MATLAB sweep', 'MATLAB 参数扫描'], gpu: ['GPU training', 'GPU 训练'], mc: ['Monte Carlo', '蒙特卡洛模拟'],
  cfd: ['CFD run', '流体仿真'], post: ['Post-processing', '后处理'], ctrl: ['Controller tuning', '控制器调参'],
};
const COLORS: Record<g.KindId, string> = { matlab: '#7ce0d2', gpu: '#7aa8ff', mc: '#f59ac4', cfd: '#ffcc8e', post: '#b5e07c', ctrl: '#c9a6ff' };
const CELL_H = 34;

const CSS = `
.gm-cluster-hud{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem}
.gm-cluster-box{border:1px solid #2f4a5a;border-radius:9px;background:#0f2130;padding:.3rem .45rem;min-width:0}
.gm-cluster-box small{display:block;font-size:.66rem;color:#8aa0b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-cluster-box b{font:700 1.02rem ui-monospace,Menlo,monospace;color:#ffe3c0}
.gm-cluster-util{display:grid;gap:.25rem;font-size:.76rem;color:#b6cad8}
.gm-cluster-board{display:grid;grid-template-columns:1.7rem 1fr;gap:3px 4px;user-select:none;-webkit-user-select:none}
.gm-cluster-hours{display:grid;grid-template-columns:repeat(12,1fr);font:500 .6rem ui-monospace,Menlo,monospace;color:#7f95a6;text-align:center}
.gm-cluster-hours span:first-child{color:#7ce0d2;font-weight:700}
.gm-cluster-nodes{display:grid;grid-auto-rows:${CELL_H}px;font:600 .66rem ui-monospace,Menlo,monospace;color:#8aa0b2}
.gm-cluster-nodes span{display:flex;align-items:center}
.gm-cluster-area{position:relative;height:${CELL_H * g.ROWS}px;border-radius:7px;overflow:hidden;background:#0d202b}
.gm-cluster-grid{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:repeat(4,${CELL_H}px);height:100%}
.gm-cluster-cell{min-width:0;padding:0;border:0;border-radius:0;background:#16303f;box-shadow:inset 0 0 0 1px #0b1823;cursor:pointer;touch-action:manipulation}
.gm-cluster-cell.now{background:#1d3b4b}
.gm-cluster-cell.waste{background:#4a2a2f}
.gm-cluster-cell:focus-visible{outline:2px solid #7de9ef;outline-offset:-2px;position:relative;z-index:3}
.gm-cluster-layer{position:absolute;inset:0;pointer-events:none}
.gm-cluster-block{position:absolute;box-sizing:border-box;border:1px solid #0b1823;border-radius:4px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;padding:0 2px;font:700 .62rem/1.1 ui-monospace,Menlo,monospace;color:#062b30;background:var(--c)}
.gm-cluster-block.go{pointer-events:auto;cursor:pointer}
.gm-cluster-block.run{filter:saturate(.7) brightness(.82)}
.gm-cluster-block.hot{box-shadow:inset 0 0 0 2px #fff6}
.gm-cluster-ghost{position:absolute;box-sizing:border-box;border:2px dashed #7ce0d2;border-radius:4px;background:#7ce0d233;display:none;z-index:2;pointer-events:none}
.gm-cluster-ghost.bad{border-color:#ff7a6e;background:#ff7a6e33}
.gm-cluster-line{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ffcc8e;z-index:2;pointer-events:none}
.gm-cluster-queue{min-height:46px;align-content:flex-start;border:1px dashed #2f4a5a;border-radius:9px;padding:.3rem}
.gm-cluster-queue.full{border-color:#ff7a6e}
.gm-cluster-chip{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;font-size:.72rem;padding:.2rem .5rem;text-align:left}
.gm-cluster-chip.hot{border-color:#ffcc8e;box-shadow:0 0 0 1px #ffcc8e}
.gm-cluster-chip em{font-style:normal;color:#ffcc8e}
.gm-cluster-chip.on em{color:#062b30}
.gm-cluster-shape{flex:none;display:block;background-color:var(--c);background-image:linear-gradient(#0b1823 1px,transparent 1px),linear-gradient(90deg,#0b1823 1px,transparent 1px);background-size:5px 5px}
.gm-cluster-chip.on .gm-cluster-shape{box-shadow:0 0 0 1px #062b30}
.gm-cluster-empty{font-size:.76rem;color:#7f95a6;align-self:center;padding:0 .3rem}
.gm-cluster-summary{display:none;border:1px solid #3c5b6a;border-radius:10px;background:#0f2130;padding:.6rem .7rem;gap:.25rem;font-size:.84rem;color:#e6f3fb}
.gm-cluster-summary.show{display:grid}
.gm-cluster-summary b{font-family:ui-monospace,Menlo,monospace;color:#ffe3c0}
.gm-cluster-summary strong{color:#7ce0d2}
@media (prefers-reduced-motion:no-preference){
  .gm-cluster-chip.hot{animation:gm-cluster-pulse 1s ease-in-out infinite}
  .gm-cluster-queue.full{animation:gm-cluster-pulse 1s ease-in-out infinite}
}
@keyframes gm-cluster-pulse{50%{filter:brightness(1.35)}}
@media (max-width:420px){.gm-cluster-box b{font-size:.92rem}.gm-cluster-chip{font-size:.68rem}}
`;

export default function mount(root: HTMLElement, lang: Lang): Game {
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const kindName = (k: g.KindId) => tr(lang, NAMES[k][0], NAMES[k][1]);
  const jobLabel = (j: g.Shape) => `${kindName(j.kind)} ${j.rows}×${j.cols}`;
  const levelNames: Record<g.LevelId, string> = { easy: tr(lang, 'Easy', '简单'), normal: tr(lang, 'Normal', '普通'), hard: tr(lang, 'Hard', '困难') };
  const bestKey = (lv: g.LevelId) => 'cluster-best-' + lv;
  const bestOf = (lv: g.LevelId) => Number(store.get(bestKey(lv))) || 0;

  let level: g.LevelId = 'normal', st: g.State | null = null, sel: number | null = null, running = false, auto = false, botUsed = false;
  let acc = 0, lastSeed = 0, kr = 0, kc = 0, destroyed = false;
  const goalText = tr(lang, 'Goal: high node utilisation. Pick a waiting job, then tap its start node and hour. Idle node-hours count as waste, and a sixth waiting job ends the round.',
    '目标：提高节点利用率。选择排队作业，再点击起始节点和时段；空闲节点小时计为浪费，排队作业达到 6 个时本轮结束。');
  const runHint = tr(lang, 'Running. Tap a placed job to return it before it starts. Keys 1–5 select a waiting job.', '运行中。作业开始前点击可收回；数字键 1–5 选择排队作业。');

  /* ---- static DOM ---- */
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: goalText });
  const startBtn = el('button', { class: 'gm-btn primary big', type: 'button', text: tr(lang, 'Start', '开始'), onclick: () => start(false) }) as HTMLButtonElement;
  startBtn.setAttribute('data-gm-start', '');
  const sameBtn = el('button', { class: 'gm-btn ghost', type: 'button', text: tr(lang, 'Same jobs again', '同一批作业重来'), hidden: true, onclick: () => start(true) }) as HTMLButtonElement;
  const levelSel = el('select', { 'aria-label': tr(lang, 'Level', '难度'), onchange: () => { level = levelSel.value as g.LevelId; reset(); } }, ...(['easy', 'normal', 'hard'] as g.LevelId[]).map(l => el('option', { value: l, text: levelNames[l] }))) as HTMLSelectElement;
  levelSel.value = level;
  const autoBox = el('input', { type: 'checkbox', onchange: () => { auto = autoBox.checked; if (auto && running) { botUsed = true; sel = null; } paint(); } }) as HTMLInputElement;
  const mk = (label: string) => { const v = el('b', { text: '0' }); return { v, box: el('div', { class: 'gm-cluster-box' }, el('small', { text: label }), v) }; };
  const hScore = mk(tr(lang, 'Score', '得分')), hHour = mk(tr(lang, 'Hour', '小时')), hWait = mk(tr(lang, 'Waiting', '排队')), hBest = mk(tr(lang, 'Best', '最高'));
  const meterFill = el('span'), utilText = el('span');
  const hours = el('div', { class: 'gm-cluster-hours', 'aria-hidden': 'true' }, ...Array.from({ length: g.WINDOW }, () => el('span')));
  const nodes = el('div', { class: 'gm-cluster-nodes', 'aria-hidden': 'true' }, ...Array.from({ length: g.ROWS }, (_, i) => el('span', { text: `N${i + 1}` })));
  const cells: HTMLButtonElement[] = [];
  const gridEl = el('div', { class: 'gm-cluster-grid', role: 'grid', 'aria-label': tr(lang, `${g.ROWS} nodes by ${g.WINDOW} hours`, `${g.ROWS} 个节点 × ${g.WINDOW} 小时`) });
  const layer = el('div', { class: 'gm-cluster-layer' });
  const ghost = el('div', { class: 'gm-cluster-ghost' });
  const line = el('div', { class: 'gm-cluster-line' });
  const area = el('div', { class: 'gm-cluster-area' }, gridEl, layer, ghost, line);
  const roving = () => cells.forEach((b, i) => { b.tabIndex = i === kr * g.WINDOW + kc ? 0 : -1; });
  const hideGhost = () => { ghost.style.display = 'none'; };
  for (let r = 0; r < g.ROWS; r++) for (let c = 0; c < g.WINDOW; c++) {
    const b = el('button', { type: 'button', class: 'gm-cluster-cell', tabIndex: r === 0 && c === 0 ? 0 : -1, role: 'gridcell',
      onclick: () => { kr = r; kc = c; roving(); cellClick(r, c); },
      onfocus: () => showGhost(r, c),
      onpointermove: (e: Event) => { if ((e as PointerEvent).pointerType === 'mouse') showGhost(r, c); },
      onblur: () => hideGhost() }) as HTMLButtonElement;
    cells.push(b); gridEl.append(b);
  }
  gridEl.addEventListener('pointerleave', () => hideGhost());
  gridEl.addEventListener('keydown', (e: KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const m = d[e.key]; if (!m) return;
    e.preventDefault(); kr = Math.max(0, Math.min(g.ROWS - 1, kr + m[0])); kc = Math.max(0, Math.min(g.WINDOW - 1, kc + m[1])); roving(); cells[kr * g.WINDOW + kc].focus();
  });
  const queueEl = el('div', { class: 'gm-queue gm-cluster-queue', role: 'group', 'aria-label': tr(lang, 'Waiting jobs', '排队的作业') });
  const emptyNote = el('span', { class: 'gm-cluster-empty', text: tr(lang, 'No jobs waiting', '没有排队的作业') });
  const summary = el('div', { class: 'gm-cluster-summary' });
  root.append(el('style', { text: CSS }),
    el('div', { class: 'gm-controls' }, startBtn, sameBtn,
      el('label', { class: 'gm-slider' }, el('span', { text: tr(lang, 'Level', '难度') }), levelSel),
      el('label', { class: 'gm-check' }, autoBox, el('span', { text: tr(lang, 'Run the greedy scheduler', '交给贪心调度器') }))),
    el('div', { class: 'gm-cluster-hud' }, hScore.box, hHour.box, hWait.box, hBest.box),
    el('div', { class: 'gm-cluster-util' }, utilText, el('div', { class: 'gm-meter', role: 'presentation' }, meterFill)),
    el('div', { class: 'gm-cluster-board' }, el('span'), hours, nodes, area),
    queueEl, status, summary);

  /* ---- keyed sync so focus and hover survive updates ---- */
  const blocks = new Map<number, HTMLElement>(), chips = new Map<number, HTMLButtonElement>(), chipTimer = new Map<number, HTMLElement>();
  function sync(parent: HTMLElement, nodesInOrder: HTMLElement[]) {
    nodesInOrder.forEach((n, i) => { if (parent.children[i] !== n) parent.insertBefore(n, parent.children[i] ?? null); });
    while (parent.children.length > nodesInOrder.length) parent.lastElementChild!.remove();
  }
  function showGhost(r: number, dc: number) {
    if (!st || !running || auto || st.over) return hideGhost();
    const job = st.queue.find(j => j.id === sel); if (!job) return hideGhost();
    const a = g.anchor(st, job, r, st.t + dc), ok = g.canPlace(st, job, a.r, a.c);
    Object.assign(ghost.style, { display: 'block', left: `${(a.c - st.t) / g.WINDOW * 100}%`, width: `${job.cols / g.WINDOW * 100}%`, top: `${a.r * CELL_H}px`, height: `${job.rows * CELL_H}px` });
    ghost.classList.toggle('bad', !ok);
  }

  function cellClick(r: number, dc: number) {
    if (!st || !running) { status.textContent = st?.over ? tr(lang, 'The round is over. Press Play again.', '本轮已结束，点“再玩一次”。') : tr(lang, 'Press Start first.', '先点“开始”。'); return; }
    if (auto) { status.textContent = tr(lang, 'The scheduler is running. Untick to take over.', '调度器运行中，取消勾选可接管。'); return; }
    const c = st.t + dc, occ = g.occupant(st, r, c);
    if (occ) {
      if (g.canTakeBack(st, occ)) {
        if (g.takeBack(st, occ.id)) { sel = occ.id; status.textContent = tr(lang, `${jobLabel(occ)} is back in the queue.`, `${jobLabel(occ)} 已退回队列。`); }
        else status.textContent = tr(lang, 'The queue is full. Place a waiting job first.', '队列已满，先安排一个排队的作业。');
      } else status.textContent = tr(lang, 'That job is already running.', '该作业已在运行。');
      paint(); return;
    }
    const job = st.queue.find(j => j.id === sel);
    if (!job) { status.textContent = tr(lang, 'Pick a waiting job first.', '请先选择排队作业。'); return; }
    const a = g.anchor(st, job, r, c);
    if (g.place(st, job.id, a.r, a.c)) { sel = null; status.textContent = job.mult === 2 ? tr(lang, 'Urgent job scheduled in time: it counts double.', '紧急作业按时安排，得分翻倍。') : runHint; }
    else status.textContent = tr(lang, 'No room for this job there.', '此处空间不足。');
    paint();
  }

  /* ---- painting ---- */
  function chipFor(j: g.Job) {
    let b = chips.get(j.id);
    if (!b) {
      const t = el('em');
      b = el('button', { type: 'button', class: 'gm-job gm-cluster-chip', onclick: () => { if (!running || auto) return; sel = sel === j.id ? null : j.id; paint(); } },
        el('span', { class: 'gm-cluster-shape', style: `width:${j.cols * 5}px;height:${j.rows * 5}px` }), el('span', { text: jobLabel(j) }), t) as HTMLButtonElement;
      b.style.setProperty('--c', COLORS[j.kind]); chips.set(j.id, b); chipTimer.set(j.id, t);
    }
    b.classList.toggle('on', sel === j.id); b.classList.toggle('hot', j.urgent && j.mult === 1);
    b.setAttribute('aria-pressed', String(sel === j.id));
    chipTimer.get(j.id)!.textContent = j.urgent && j.mult === 1 ? `×2 · ${Math.max(1, Math.ceil(j.left))} s` : j.urgent ? '×2' : '';
    return b;
  }
  function blockFor(j: g.Job, t: number) {
    let b = blocks.get(j.id);
    if (!b) {
      b = el('div', { class: 'gm-cluster-block', title: jobLabel(j), onclick: () => { if (j.at && st) cellClick(j.at.r, j.at.c - st.t); } });
      b.style.setProperty('--c', COLORS[j.kind]);
      b.textContent = (j.cols >= 4 ? kindName(j.kind) : `${j.rows}×${j.cols}`) + (j.mult === 2 ? ' ×2' : '');
      blocks.set(j.id, b);
    }
    const at = j.at!, free = g.canTakeBack(st!, j);
    const gone = Math.max(0, t - at.c);   // hours of this job already scrolled away
    Object.assign(b.style, { left: `${(at.c + gone - t) / g.WINDOW * 100}%`, width: `${(j.cols - gone) / g.WINDOW * 100}%`, top: `${at.r * CELL_H}px`, height: `${j.rows * CELL_H}px` });
    b.classList.toggle('go', free); b.classList.toggle('run', !free); b.classList.toggle('hot', j.mult === 2);
    return b;
  }
  function paint() {
    const t = st ? st.t : 0;
    if (st && sel !== null && !st.queue.some(j => j.id === sel)) sel = null;
    if (st && running && !auto && sel === null && st.queue.length) sel = st.queue[0].id;
    const onBoard = new Set(st ? st.placed.map(j => j.id) : []);
    for (const [id, b] of blocks) if (!onBoard.has(id)) { b.remove(); blocks.delete(id); }
    sync(layer, st ? st.placed.map(j => blockFor(j, t)) : []);
    const waiting = new Set(st ? st.queue.map(j => j.id) : []);
    for (const id of [...chips.keys()]) if (!waiting.has(id)) { chips.delete(id); chipTimer.delete(id); }
    const chipNodes: HTMLElement[] = st ? st.queue.map(chipFor) : [];
    sync(queueEl, chipNodes.length ? chipNodes : [emptyNote]);
    queueEl.classList.toggle('full', !!st && st.queue.length >= g.MAX_QUEUE && !st.over);
    cells.forEach((b, i) => {
      const r = Math.floor(i / g.WINDOW), dc = i % g.WINDOW, empty = !st || !g.occupant(st, r, t + dc);
      b.classList.toggle('now', dc === 0);
      b.classList.toggle('waste', dc === 0 && empty && running && !auto);
      b.setAttribute('aria-label', tr(lang, `node ${r + 1}, hour ${t + dc}${empty ? '' : ', busy'}`, `节点 ${r + 1}，第 ${t + dc} 小时${empty ? '' : '，已占用'}`));
    });
    hours.querySelectorAll('span').forEach((s, i) => { s.textContent = String(t + i); });
    hScore.v.textContent = String(st ? st.score : 0);
    hHour.v.textContent = `${t}/${g.LEVELS[level].hours}`;
    hWait.v.textContent = `${st ? st.queue.length : 0}/${g.MAX_QUEUE}`;
    hBest.v.textContent = String(bestOf(level));
    const u = st ? Math.round(g.utilisation(st) * 100) : 0;
    meterFill.style.width = `${u}%`;
    utilText.textContent = st && (st.ran + st.waste) ? tr(lang, `Utilisation ${u}% · ${st.waste} node-hours wasted`, `利用率 ${u}% · 已浪费 ${st.waste} 个节点小时`) : tr(lang, 'Utilisation: no data yet', '利用率：暂无数据');
  }

  /* ---- round control ---- */
  function reset() {
    running = false; st = null; sel = null; acc = 0; hideGhost(); sameBtn.hidden = true; summary.classList.remove('show');
    startBtn.textContent = tr(lang, 'Start', '开始'); status.textContent = goalText; line.style.display = 'none';
    for (const b of blocks.values()) b.remove(); blocks.clear(); chips.clear(); chipTimer.clear(); paint();
  }
  function start(same: boolean) {
    level = levelSel.value as g.LevelId;
    const seed = same && lastSeed ? lastSeed : Math.floor(Math.random() * 2 ** 31);
    reset(); lastSeed = seed;
    st = g.createGame(level, seed); running = true; botUsed = auto; sel = null; acc = 0;
    line.style.display = ''; line.style.left = '0%'; startBtn.textContent = tr(lang, 'Restart', '重新开始');
    status.textContent = auto ? tr(lang, 'The greedy scheduler is running this round. Untick to take over.', '本局由贪心调度器运行，取消勾选可接管。') : runHint;
    paint();
  }
  function finish() {
    if (!st) return;
    running = false; hideGhost(); line.style.display = 'none'; startBtn.textContent = tr(lang, 'Play again', '再玩一次'); sameBtn.hidden = false;
    const prev = bestOf(level), u = Math.round(g.utilisation(st) * 100);
    const isBest = !botUsed && st.score > prev; if (!botUsed) best(bestKey(level), st.score, false);
    const bot = g.simulate(level, st.seed), botU = Math.round(g.utilisation(bot) * 100);
    status.textContent = st.over === 'overflow'
      ? tr(lang, `The queue overflowed at hour ${st.t}. ${st.score} node-hours run.`, `第 ${st.t} 小时队列溢出。共运行 ${st.score} 个节点小时。`)
      : tr(lang, `All ${st.t} hours done. ${st.score} node-hours run at ${u}% utilisation.`, `${st.t} 小时全部完成。共运行 ${st.score} 个节点小时，利用率 ${u}%。`);
    const diff = st.score - bot.score, top = Math.max(prev, botUsed ? 0 : st.score);
    const verdict = botUsed ? tr(lang, 'Scheduler rounds do not count towards the best score.', '调度器对局不计最高分。')
      : diff > 0 ? tr(lang, `Ahead of the scheduler by ${diff}.`, `领先调度器 ${diff} 分。`)
        : diff === 0 ? tr(lang, 'Level with the scheduler.', '与调度器持平。')
          : tr(lang, `Scheduler ahead by ${-diff}.`, `调度器领先 ${-diff} 分。`);
    summary.replaceChildren(
      el('div', {}, el('strong', { text: tr(lang, 'Round summary', '本局总结') }), isBest ? ` · ${tr(lang, 'new best for this level', '本难度新纪录')}` : ''),
      el('div', {}, tr(lang, 'Score ', '得分 '), el('b', { text: String(st.score) }), tr(lang, ` · best ${top}`, ` · 最高 ${top}`)),
      el('div', { text: tr(lang, `${st.ran} node-hours run, ${st.waste} wasted, ${st.finished} jobs finished`, `运行 ${st.ran} 个节点小时，浪费 ${st.waste} 个，完成 ${st.finished} 个作业`) }),
      el('div', { text: tr(lang, `Urgent: ${st.urgentHit} scheduled in time, ${st.missed} expired`, `紧急作业：${st.urgentHit} 个按时安排，${st.missed} 个过期`) }),
      el('div', { text: tr(lang, `Greedy scheduler, same jobs: ${bot.score} (${botU}% utilisation). ${verdict}`, `贪心调度器（同一批作业）：${bot.score} 分（利用率 ${botU}%）。${verdict}`) }));
    summary.classList.add('show'); paint();
  }

  const loopH = loop(dt => {
    if (destroyed || !st || !running) return;
    acc += dt;
    while (acc >= g.STEP && !st.over) {
      acc -= g.STEP;
      if (auto) botUsed = true;
      const ev = g.advance(st, auto);
      if (ev.includes('missed')) status.textContent = tr(lang, 'An urgent job expired unscheduled.', '一个紧急作业未及时安排，已过期。');
      if (ev.includes('hour') && !reduced()) layer.animate([{ transform: `translateX(${100 / g.WINDOW}%)` }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
      paint();
    }
    if (st.over) { finish(); return; }
    const p = (st.sub + acc / g.STEP) / g.LEVELS[level].hourSteps;
    line.style.left = `${p / g.WINDOW * 100}%`;
  });

  // Keys only act while focus is inside this game and a round is running.
  const onKey = (e: KeyboardEvent) => {
    if (!running || !st || auto || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName; if (tag === 'SELECT' || tag === 'INPUT') return;
    if (e.key >= '1' && e.key <= '5') { const j = st.queue[Number(e.key) - 1]; if (j) { sel = j.id; paint(); e.preventDefault(); } }
  };
  root.addEventListener('keydown', onKey);
  reset();
  return { destroy() { destroyed = true; running = false; loopH.stop(); root.removeEventListener('keydown', onKey); } };
}
