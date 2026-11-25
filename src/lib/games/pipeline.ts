import { best, C, el, loop, makeCanvas, tr, type Game, type Lang } from './kit';
import * as g from './pipeline.logic';

/* ========== OperatorOne: four agents, one manager, first $100 of monthly revenue ========== */
export default function mount(root: HTMLElement, lang: Lang): Game {
  const W = 420, H = 300, CH = 96;
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const names = [tr(lang, 'Product', '产品'), tr(lang, 'Marketing', '市场'), tr(lang, 'Sales', '销售'), tr(lang, 'Operations', '运营')];
  const cols = [C.teal, C.blue, C.amber, '#b8a7ff'];
  const BW = 160, BH = 70;
  const ctr = [{ x: 90, y: 64 }, { x: 330, y: 64 }, { x: 330, y: 236 }, { x: 90, y: 236 }];
  const mgr = { x: 210, y: 150, r: 30 };
  // where a token enters and leaves the box on its way along the loop product -> marketing -> sales -> operations -> product
  const edge = [
    { a: { x: 170, y: 64 }, b: { x: 250, y: 64 } }, { a: { x: 330, y: 99 }, b: { x: 330, y: 201 } },
    { a: { x: 250, y: 236 }, b: { x: 170, y: 236 } }, { a: { x: 90, y: 201 }, b: { x: 90, y: 99 } },
  ];

  const style = el('style', { text: `
    .gm-pipeline-banner { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; min-height: 44px; padding: .35rem .65rem; border-radius: 9px; border: 1px solid #2f4a5a; background: #0f2130; color: #c9ddea; font-size: .84rem; line-height: 1.4; }
    .gm-pipeline-banner[data-kind=viral] { border-color: #7ce0d2; color: #bdf3ea; }
    .gm-pipeline-banner[data-kind=outage], .gm-pipeline-banner[data-kind=stuck] { border-color: #ff7a6e; color: #ffd3ce; }
    .gm-pipeline-banner[data-kind=complaint] { border-color: #ffcc8e; color: #ffe3c0; }
    .gm-pipeline-banner .gm-btn { min-height: 34px; }
    .gm-pipeline-ups { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .45rem; }
    .gm-pipeline-ups .gm-stage-head kbd { font: 600 .7rem ui-monospace, Menlo, monospace; color: #9fb8c8; border: 1px solid #3c5b6a; border-radius: 4px; padding: 0 .3rem; margin-left: .3rem; }
    .gm-pipeline-ups .gm-stage { align-content: start; }
    .gm-pipeline-ups .gm-row .gm-btn { flex: 1 1 auto; }
    .gm-pipeline-ms { display: flex; flex-wrap: wrap; gap: .4rem; }
    .gm-pipeline-ms span { font: 600 .76rem ui-monospace, Menlo, monospace; border: 1px solid #3c5b6a; border-radius: 99px; padding: .15rem .6rem; color: #9fb8c8; }
    .gm-pipeline-ms span.on { border-color: #7ce0d2; color: #bdf3ea; }
    .gm-pipeline-hint { margin: 0; font-size: .78rem; color: #9fb8c8; }
  ` });
  const startBtn = el('button', { class: 'gm-btn primary big', type: 'button', 'data-gm-start': '', text: tr(lang, 'Start', '开始') });
  const stats = el('div', { class: 'gm-stats' });
  const meter = el('div', { class: 'gm-meter', 'aria-hidden': 'true' }, el('span'));
  const banner = el('div', { class: 'gm-pipeline-banner' });
  const bannerText = el('span');
  const sendBtn = el('button', { class: 'gm-btn primary', type: 'button', text: tr(lang, 'Send to Product (S)', '发回产品（S）'), onclick: () => { if (running) g.sendBack(p); } });
  banner.append(bannerText, sendBtn);
  const msBox = el('div', { class: 'gm-pipeline-ms' }, ...g.PIPE.milestones.map(m => el('span', { text: `$${m}` })));
  const hint = el('p', { class: 'gm-pipeline-hint', text: tr(lang, 'Tap a stage or press 1 to 4 to run it. Tap the manager or press M to unblock a stuck stage.', '点击环节或按 1 到 4 处理想法；点击经理或按 M 解除卡住的环节。') });
  const goal = tr(lang, 'Ideas flow Product, Marketing, Sales, Operations, and each sale earns revenue. Run the stages, buy upgrades, and reach $100, $250 and $500 MRR as fast as possible.', '想法依次经过产品、市场、销售、运营，每笔成交带来收入。处理各环节、购买升级，尽快达到 $100、$250 和 $500 的月度经常性收入（MRR）。');
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: goal });
  const { cv, ctx, toLocal } = makeCanvas(W, H, tr(lang, 'Four agents in a loop with a manager in the middle; ideas move between them', '四个智能体围成一圈，经理在中间，想法在它们之间传递'));
  const chart = makeCanvas(W, CH, tr(lang, 'Chart of monthly recurring revenue over time', '月经常性收入随时间变化的曲线'));

  const stageUi = names.map((name, i) => {
    const run = el('button', { class: 'gm-btn primary', type: 'button', onclick: () => doRun(i) });
    const auto = el('button', { class: 'gm-btn ghost', type: 'button', onclick: () => { if (running) g.buyAuto(p, i); } });
    const wk = el('button', { class: 'gm-btn ghost', type: 'button', onclick: () => { if (running) g.buyWorker(p, i); } });
    const box = el('div', { class: 'gm-stage' }, el('div', { class: 'gm-stage-head' }, el('span', { text: name }), el('kbd', { text: String(i + 1) })), el('div', { class: 'gm-row' }, run, auto, wk));
    return { box, run, auto, wk };
  });
  const ups = el('div', { class: 'gm-pipeline-ups' }, ...stageUi.map(s => s.box));
  root.append(style, el('div', { class: 'gm-controls' }, startBtn, stats), meter, banner, cv, chart.cv, msBox, ups, hint, status);

  let p = g.newPipe(), running = false;
  type Tok = { ax: number; ay: number; bx: number; by: number; t: number; dur: number; col: string; to: number };
  type Pop = { x: number; y: number; txt: string; t: number; col: string };
  let toks: Tok[] = [], pops: Pop[] = [], pulse = 0;
  const setTxt = (n: HTMLElement, s: string) => { if (n.textContent !== s) n.textContent = s; };

  const doRun = (i: number) => { if (running) g.startStage(p, i); };
  const doUnblock = () => { if (running) g.unblock(p); };
  const stageName = (i: number) => names[i];
  const eventText = (kind: g.EventKind, stage?: number) => kind === 'viral' ? tr(lang, 'Viral post: idea inflow up.', '帖子爆火：新想法涌入。')
    : kind === 'outage' ? tr(lang, 'Operations is down for a few seconds.', '运营环节短暂宕机。')
    : kind === 'stuck' ? tr(lang, `${stageName(stage ?? 0)} is stuck. Unblock it with the manager.`, `${stageName(stage ?? 0)}卡住，点击经理解除。`)
    : tr(lang, 'Customer complaint: send it back to Product in time.', '客户投诉：须及时发回产品。');

  const drain = () => {
    for (const f of p.fx.splice(0)) {
      if (f.t === 'move') addTok(edge[f.from], cols[f.from], f.to);
      else if (f.t === 'back') addTok(edge[3], C.blue, 0);
      else if (f.t === 'spawn') toks.push({ ax: 90, ay: 0, bx: 90, by: 29, t: 0, dur: calm ? 0 : 0.45, col: C.teal, to: 0 });
      else if (f.t === 'sale' && !calm) pops.push({ x: 90, y: 290, txt: `+$${f.gain}`, t: 0, col: C.amber });
      else if (f.t === 'event') status.textContent = eventText(f.kind, f.stage);
      else if (f.t === 'milestone') { pulse = calm ? 0 : 1; status.textContent = tr(lang, `$${g.PIPE.milestones[f.k]} MRR reached in ${Math.round(p.time)} s: ${'★'.repeat(g.stars(f.k, p.time))}${'☆'.repeat(3 - g.stars(f.k, p.time))}.`, `${Math.round(p.time)} 秒达到 $${g.PIPE.milestones[f.k]} MRR：${'★'.repeat(g.stars(f.k, p.time))}${'☆'.repeat(3 - g.stars(f.k, p.time))}。`); }
      else if (f.t === 'resolved') status.textContent = tr(lang, 'Complaint sent to Product: version upgraded.', '投诉已发回产品，产品版本提升。');
      else if (f.t === 'lapsed') status.textContent = tr(lang, 'Complaint missed: revenue and product version down.', '投诉未及时处理：收入与产品版本下降。');
      else if (f.t === 'unblock') status.textContent = tr(lang, 'Stage unblocked by the manager.', '经理已解除卡顿。');
    }
  };
  const addTok = (e: { a: { x: number; y: number }; b: { x: number; y: number } }, col: string, to: number) => { if (!calm) toks.push({ ax: e.a.x, ay: e.a.y, bx: e.b.x, by: e.b.y, t: 0, dur: 0.6, col, to }); };

  const finish = () => {
    running = false; startBtn.textContent = tr(lang, 'Play again', '再玩一次');
    const star = p.ms.map((t, k) => (t === null ? '' : `$${g.PIPE.milestones[k]} ${'★'.repeat(g.stars(k, t))}`)).filter(Boolean).join(' · ');
    if (p.won) {
      const t = Math.round(p.time), bt = best('pipeline', t);
      status.textContent = tr(lang, `$500 MRR in ${t} s after ${p.iterations} feedback rounds. ${star}. Best: ${bt} s.`, `${t} 秒达到 $500 MRR，经过 ${p.iterations} 轮反馈。${star}。最佳：${bt} 秒。`);
    } else status.textContent = tr(lang, `Time is up at $${p.mrr} MRR. ${star || 'No milestone reached.'}`, `时间到，MRR 为 $${p.mrr}。${star || '未达到里程碑。'}`);
  };
  const start = () => {
    p = g.newPipe(); running = true; toks = []; pops = []; pulse = 0;
    startBtn.textContent = tr(lang, 'Restart', '重新开始');
    status.textContent = tr(lang, 'Running. First target: $100 MRR.', '运行中。首个目标：$100 MRR。');
  };
  startBtn.addEventListener('click', start);

  const onPointer = (e: PointerEvent) => {
    if (!running) return;
    const q = toLocal(e);
    if (Math.hypot(q.x - mgr.x, q.y - mgr.y) < mgr.r + 6) { doUnblock(); return; }
    ctr.forEach((c, i) => { if (Math.abs(q.x - c.x) < BW / 2 + 6 && Math.abs(q.y - c.y) < BH / 2 + 6) doRun(i); });
  };
  cv.addEventListener('pointerdown', onPointer);
  const onKey = (e: KeyboardEvent) => {
    if (!running || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '4') doRun(Number(k) - 1);
    else if (k === 'm') doUnblock();
    else if (k === 's') g.sendBack(p);
    else return;
    e.preventDefault();
  };
  root.addEventListener('keydown', onKey);

  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  const draw = () => {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // loop arrows
    ctx.lineWidth = 2; ctx.strokeStyle = '#2d4a5b'; ctx.fillStyle = '#2d4a5b';
    edge.forEach((e, i) => {
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      const a = Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x); ctx.beginPath(); ctx.moveTo(e.b.x, e.b.y); ctx.lineTo(e.b.x - 9 * Math.cos(a - 0.45), e.b.y - 9 * Math.sin(a - 0.45)); ctx.lineTo(e.b.x - 9 * Math.cos(a + 0.45), e.b.y - 9 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
      void i;
    });
    // manager spokes
    const anyStuck = p.stages.some(s => s.stuck > 0);
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctr.forEach((c, i) => {
      const bad = p.stages[i].stuck > 0;
      ctx.strokeStyle = bad ? C.red : '#2a4252'; ctx.lineWidth = bad ? 2.2 : 1.5;
      ctx.beginPath(); ctx.moveTo(mgr.x, mgr.y); ctx.lineTo(c.x + (mgr.x - c.x) * 0.38, c.y + (mgr.y - c.y) * 0.45); ctx.stroke();
    });
    ctx.setLineDash([]);
    // incoming tokens per stage so queue dots do not jump ahead of the token
    const incoming = [0, 0, 0, 0]; for (const t of toks) incoming[t.to]++;
    ctr.forEach((c, i) => {
      const s = p.stages[i], down = g.paused(p, i), x = c.x - BW / 2, y = c.y - BH / 2;
      ctx.fillStyle = '#0f2130'; rr(x, y, BW, BH, 10); ctx.fill();
      ctx.lineWidth = down ? 2.5 : s.jobs.length ? 2 : 1.2; ctx.strokeStyle = down ? C.red : s.jobs.length ? cols[i] : '#35505f'; rr(x, y, BW, BH, 10); ctx.stroke();
      ctx.fillStyle = cols[i]; ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${i + 1}  ${names[i]}`, x + 10, y + 21);
      ctx.font = '600 10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = C.dim;
      const tags = [s.auto ? tr(lang, 'auto', '自动') : '', s.workers > 1 ? '×2' : ''].filter(Boolean).join(' '); ctx.fillText(tags, x + BW - 8, y + 61);
      // progress bar per worker
      for (let k = 0; k < s.workers; k++) {
        const j = s.jobs[k], bw = (BW - 20) / s.workers - (s.workers > 1 ? 3 : 0), bx = x + 10 + k * (bw + 6);
        ctx.fillStyle = '#1b3442'; ctx.fillRect(bx, y + 30, bw, 6);
        if (j) { ctx.fillStyle = down ? C.red : cols[i]; ctx.fillRect(bx, y + 30, bw * Math.min(1, j.t / j.d), 6); }
      }
      // queue dots
      const n = Math.max(0, s.q - incoming[i]);
      for (let k = 0; k < Math.min(n, 6); k++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x + 14 + k * 13, y + 52, 4.5, 0, 7); ctx.fill(); }
      if (n > 6) { ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.font = '600 11px ui-monospace, Menlo, monospace'; ctx.fillText(`+${n - 6}`, x + 14 + 6 * 13 - 4, y + 56); }
      if (down) {
        ctx.fillStyle = C.red; ctx.textAlign = 'right'; ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText(i === 3 && p.outage > 0 && s.stuck <= 0 ? tr(lang, `down ${Math.ceil(p.outage)} s`, `宕机 ${Math.ceil(p.outage)} 秒`) : tr(lang, 'stuck', '卡住了'), x + BW - 8, y + 21);
      }
    });
    // manager
    const pu = anyStuck && !calm ? 0.5 + 0.5 * Math.sin(performance.now() / 160) : 0;
    ctx.fillStyle = '#12293a'; ctx.beginPath(); ctx.arc(mgr.x, mgr.y, mgr.r, 0, 7); ctx.fill();
    ctx.lineWidth = anyStuck ? 2.5 + pu * 2 : 1.5; ctx.strokeStyle = anyStuck ? C.red : '#5a7a8c'; ctx.beginPath(); ctx.arc(mgr.x, mgr.y, mgr.r, 0, 7); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = '700 13px system-ui, sans-serif'; ctx.fillText(tr(lang, 'Manager', '经理'), mgr.x, mgr.y + 4);
    // tokens
    for (const t of toks) { const u = t.dur ? t.t / t.dur : 1, k = u * u * (3 - 2 * u); ctx.fillStyle = t.col; ctx.beginPath(); ctx.arc(t.ax + (t.bx - t.ax) * k, t.ay + (t.by - t.ay) * k, 6, 0, 7); ctx.fill(); }
    for (const q of pops) { ctx.globalAlpha = Math.max(0, 1 - q.t / 1.1); ctx.fillStyle = q.col; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(q.txt, q.x, q.y - q.t * 12); ctx.globalAlpha = 1; }
    if (pulse > 0) { ctx.strokeStyle = C.amber; ctx.globalAlpha = pulse; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, W - 3, H - 3); ctx.globalAlpha = 1; }
    ctx.textAlign = 'left';
    drawChart();
  };
  const drawChart = () => {
    const c = chart.ctx, L = 34, R = 8, T = 8, B = 18, pw = W - L - R, ph = CH - T - B, mx = 500, tmax = Math.max(90, p.time * 1.15 + 5);
    c.fillStyle = C.bg; c.fillRect(0, 0, W, CH); c.font = '600 10px ui-monospace, Menlo, monospace'; c.textAlign = 'right';
    g.PIPE.milestones.forEach((m, k) => { const y = T + ph * (1 - m / mx); c.strokeStyle = p.ms[k] !== null ? C.teal : '#27414f'; c.lineWidth = 1; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke(); c.setLineDash([]); c.fillStyle = p.ms[k] !== null ? C.teal : C.dim; c.fillText(`$${m}`, L - 4, y + 3); });
    c.strokeStyle = C.amber; c.lineWidth = 2; c.beginPath();
    const pts = p.hist.concat(running || p.hist.length < 2 ? [p.mrr] : []);
    pts.forEach((v, i) => { const x = L + pw * Math.min(1, (i === pts.length - 1 && running ? p.time : i) / tmax), y = T + ph * (1 - Math.min(mx, v) / mx); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    c.fillStyle = C.dim; c.textAlign = 'left'; c.fillText(tr(lang, `MRR over ${Math.round(tmax)} s`, `MRR，横轴 ${Math.round(tmax)} 秒`), L, CH - 4);
  };

  let lastBanner = '';
  const L = loop(dt => {
    if (running) { g.tickPipe(p, dt, Math.random); drain(); if (p.finished) finish(); }
    for (const t of toks) t.t += dt; toks = toks.filter(t => t.t < t.dur);
    for (const q of pops) q.t += dt; pops = pops.filter(q => q.t < 1.1);
    pulse = Math.max(0, pulse - dt * 1.4);
    const next = g.PIPE.milestones.find((_, k) => p.ms[k] === null) ?? g.PIPE.milestones[2];
    setTxt(stats, tr(lang, `MRR $${p.mrr} / $${next} · cash $${p.cash} · version ${p.quality + 1} · ${Math.floor(p.time)} s`, `MRR $${p.mrr} / $${next} · 现金 $${p.cash} · 产品版本 ${p.quality + 1} · ${Math.floor(p.time)} 秒`));
    (meter.firstChild as HTMLElement).style.width = `${Math.min(100, (p.mrr / next) * 100)}%`;
    msBox.childNodes.forEach((n, k) => { const t = p.ms[k], sp = n as HTMLElement; sp.classList.toggle('on', t !== null); setTxt(sp, t === null ? `$${g.PIPE.milestones[k]}` : `$${g.PIPE.milestones[k]} ${'★'.repeat(g.stars(k, t))}${'☆'.repeat(3 - g.stars(k, t))} ${Math.round(t)} ${tr(lang, 's', '秒')}`); });
    // banner: the most urgent open event
    const stuck = p.stages.findIndex(s => s.stuck > 0);
    let kind = 'calm', txt = tr(lang, 'No incidents.', '暂无事件');
    if (!running && p.time === 0) { kind = 'calm'; txt = tr(lang, 'Random events: viral posts, outages, stuck stages, complaints.', '随机事件：帖子爆火、宕机、环节卡住、客户投诉。'); }
    else if (running && p.complaint > 0) { kind = 'complaint'; txt = tr(lang, `Customer complaint: send it back to Product within ${Math.ceil(p.complaint)} s, or revenue and product version drop.`, `客户投诉：须在 ${Math.ceil(p.complaint)} 秒内发回产品，否则收入与产品版本下降。`); }
    else if (running && stuck >= 0) { kind = 'stuck'; txt = tr(lang, `${names[stuck]} is stuck. Tap the manager (M).`, `${names[stuck]}卡住，点击经理（M）解除。`); }
    else if (running && p.outage > 0) { kind = 'outage'; txt = tr(lang, `Operations is down for ${Math.ceil(p.outage)} s. Work piles up meanwhile.`, `运营宕机，${Math.ceil(p.outage)} 秒后恢复，期间任务堆积。`); }
    else if (running && p.viral > 0) { kind = 'viral'; txt = tr(lang, `A post went viral: extra ideas for ${Math.ceil(p.viral)} s.`, `帖子爆火：${Math.ceil(p.viral)} 秒内想法增加。`); }
    const sig = kind + txt; if (sig !== lastBanner) { lastBanner = sig; banner.dataset.kind = kind; bannerText.textContent = txt; }
    sendBtn.hidden = !(running && p.complaint > 0);
    stageUi.forEach((u, i) => {
      const s = p.stages[i];
      u.run.disabled = !running || g.paused(p, i) || s.q <= 0 || s.jobs.length >= s.workers; setTxt(u.run, tr(lang, 'Run', '处理'));
      u.auto.disabled = !running || s.auto || p.cash < g.autoCost(p); setTxt(u.auto, s.auto ? tr(lang, 'Automated', '已自动') : tr(lang, `Automate $${g.autoCost(p)}`, `自动化 $${g.autoCost(p)}`));
      u.wk.disabled = !running || s.workers >= g.PIPE.maxWorkers || p.cash < g.workerCost(p); setTxt(u.wk, s.workers >= g.PIPE.maxWorkers ? tr(lang, '2 workers', '两人') : tr(lang, `+1 worker $${g.workerCost(p)}`, `加一人 $${g.workerCost(p)}`));
    });
    draw();
  });
  return { destroy: () => { L.stop(); cv.removeEventListener('pointerdown', onPointer); root.removeEventListener('keydown', onKey); startBtn.removeEventListener('click', start); running = false; } };
}
