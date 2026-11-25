import { best, C, el, loop, makeCanvas, tr, type Game, type Lang } from './kit';
import * as g from './cones.logic';

/* ========== Smart traffic cones: close the lane before the car arrives ========== */
export default function mount(root: HTMLElement, lang: Lang): Game {
  const { W, H, ROAD, CAR } = g;
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const { cv, ctx, toLocal } = makeCanvas(W, H, tr(lang, 'Two-lane road with a lane to close, robotic traffic cones at the roadside and a car approaching. Use keys 1 to 5 to pick a cone and A to E to pick a slot.', '双车道道路，路边有机器人锥桶，一条车道需要封闭，一辆车正在驶近。用数字键 1 到 5 选锥桶，字母键 A 到 E 选位置。'));
  const style = el('style', { text: `
    .gm-cones-hint { margin: 0; font-size: .78rem; color: #9fb8c8; line-height: 1.45; }
    .gm-cones-stats { display: flex; flex-wrap: wrap; gap: .2rem .9rem; }
  ` });
  const startBtn = el('button', { class: 'gm-btn primary big', type: 'button', 'data-gm-start': '' });
  const stats = el('div', { class: 'gm-stats gm-cones-stats' });
  const hint = el('p', { class: 'gm-cones-hint' });
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite' });
  root.append(style, cv, el('div', { class: 'gm-controls' }, startBtn, stats), status, hint);

  type Phase = 'ready' | 'play' | 'won' | 'lost' | 'done';
  let ri = 0, r = g.newRound(0), phase: Phase = 'ready', sel = -1, via: g.Pt[] = [], drag: { from: g.Pt; at: g.Pt; moved: boolean } | null = null;
  const stars: number[] = []; let leftTotal = 0; const flash: number[] = []; let clock = 0;
  const letters = 'ABCDE';
  const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const roundGoal = () => ri === 0 ? tr(lang, 'Round 1 of 3: close the lane with 3 cones. Tap a cone, then a dashed slot (or drag the cone onto it). A cone stops when its ultrasonic sensor detects anything straight ahead; dispatch the front cone first.', '第 1 轮，共 3 轮：用 3 个锥桶封住车道。点一个锥桶，再点一个虚线位置（也可以把锥桶拖过去）。锥桶的超声传感器检测到正前方有障碍即停车，应先派出最前方的锥桶。')
    : ri === 1 ? tr(lang, 'Round 2 of 3: 4 cones and less time. Order the dispatch so no cone is blocked by another ahead of it.', '第 2 轮，共 3 轮：4 个锥桶，时间更短。注意派出顺序，避免锥桶正前方被另一锥桶阻挡。')
    : tr(lang, 'Round 3 of 3: 5 cones and a parked van. Tap a cone, then the diamond (or any point above the van), then a slot.', '第 3 轮，共 3 轮：5 个锥桶，还有一辆停着的货车。点一个锥桶，再点菱形标记（或货车上方任意一点），最后点一个位置。');
  const filledCount = () => r.slots.filter((_, k) => g.slotFilled(r, k)).length;

  const begin = () => {
    if (phase === 'done' || (phase === 'won' && ri === 2)) { ri = 0; stars.length = 0; leftTotal = 0; }
    else if (phase === 'won') ri++;
    r = g.newRound(ri); phase = 'play'; sel = -1; via = []; drag = null; flash.length = 0;
    startBtn.textContent = tr(lang, 'Restart round', '重来本轮'); status.textContent = roundGoal();
  };
  startBtn.addEventListener('click', begin);

  const commit = (ci: number, slot: number) => { g.assign(r, ci, slot, via); sel = -1; via = []; };
  const slotAt = (p: g.Pt) => { let b = -1, bd = 26; r.slots.forEach((s, k) => { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; b = k; } }); return b; };
  const coneAt = (p: g.Pt) => { let b = -1, bd = 22; r.cones.forEach((c, k) => { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; b = k; } }); return b; };
  const addVia = (p: g.Pt) => { if (via.length < 2) via = [...via, { x: Math.max(8, Math.min(W - 8, p.x)), y: Math.max(8, Math.min(H - 8, p.y)) }]; };

  const onDown = (e: PointerEvent) => {
    if (phase !== 'play' || r.result) return;
    const p = toLocal(e), ci = coneAt(p);
    if (ci >= 0) { via = ci === sel ? via : []; sel = ci; drag = { from: p, at: p, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch { /* not supported: tapping still works */ } return; }
    if (sel < 0) return;
    const k = slotAt(p);
    if (k >= 0) commit(sel, k);
    else if (r.obstacle && Math.hypot(g.VIA.x - p.x, g.VIA.y - p.y) < 20) addVia(g.VIA);
    else if (r.obstacle && p.y > 20 && p.y < g.ROAD.bottom + 4 && !(p.x > r.obstacle.x && p.x < r.obstacle.x + r.obstacle.w && p.y > r.obstacle.y)) addVia(p);
    else sel = -1;
  };
  const onMove = (e: PointerEvent) => { if (drag) { drag.at = toLocal(e); if (Math.hypot(drag.at.x - drag.from.x, drag.at.y - drag.from.y) > 12) drag.moved = true; } };
  const onUp = (e: PointerEvent) => {
    if (!drag) return; const d = drag; drag = null;
    if (phase !== 'play' || !d.moved) return;
    const k = slotAt(toLocal(e)); if (k >= 0 && sel >= 0) commit(sel, k);
  };
  const onKey = (e: KeyboardEvent) => {
    if (phase !== 'play' || r.result || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(), n = Number(k);
    if (n >= 1 && n <= r.cones.length) { sel = n - 1; via = []; }
    else if (k.length === 1 && letters.indexOf(k.toUpperCase()) >= 0 && letters.indexOf(k.toUpperCase()) < r.slots.length && sel >= 0) commit(sel, letters.indexOf(k.toUpperCase()));
    else if (k === 'v' && sel >= 0 && r.obstacle) addVia(g.VIA);
    else if (k === 'escape' && sel >= 0) { sel = -1; via = []; }
    else return;
    e.preventDefault();
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('keydown', onKey);

  const conclude = () => {
    const left = g.timeLeft(r);
    if (r.result === 'safe') {
      const s = g.starsFor(r); stars[ri] = s; leftTotal += left;
      if (ri === 2) {
        phase = 'done'; const total = Number(leftTotal.toFixed(1)), bt = best('cones', total, false);
        status.textContent = tr(lang, `All three lanes closed with ${left.toFixed(1)} s to spare in the last one: ${starText(s)}. Total time left ${total} s, ${stars.reduce((a, b) => a + b, 0)} of 9 stars. Best total: ${bt} s.`, `三轮全部封闭，最后一轮剩余 ${left.toFixed(1)} 秒：${starText(s)}。总剩余时间 ${total} 秒，共 ${stars.reduce((a, b) => a + b, 0)} 颗星（满分 9）。最佳总剩余：${bt} 秒。`);
        startBtn.textContent = tr(lang, 'Play again', '再玩一次');
      } else {
        phase = 'won'; startBtn.textContent = tr(lang, `Start round ${ri + 2}`, `开始第 ${ri + 2} 轮`);
        status.textContent = tr(lang, `Lane closed with ${left.toFixed(1)} s to spare: ${starText(s)}. The car signals and merges.`, `车道封闭，剩余 ${left.toFixed(1)} 秒：${starText(s)}。车辆将打灯并线。`);
      }
    } else {
      phase = 'lost'; startBtn.textContent = tr(lang, `Retry round ${ri + 1}`, `重试第 ${ri + 1} 轮`);
      status.textContent = tr(lang, `The car had to brake hard in front of the work zone: ${filledCount()} of ${r.slots.length} slots were filled.`, `车辆在施工区前紧急制动：已封闭 ${filledCount()} / ${r.slots.length} 个位置。`);
    }
  };

  const rr = (x: number, y: number, w: number, h: number, rad: number) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, rad) : ctx.rect(x, y, w, h); };
  const drawCar = () => {
    const c = r.car; if (c.state === 'wait') return;
    ctx.save(); ctx.translate(c.x - CAR.len / 2, c.y);
    if (c.state === 'brake') { ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; const L = Math.min(c.x - CAR.decideX + 14, 60); [-6, 6].forEach(o => { ctx.beginPath(); ctx.moveTo(-CAR.len / 2, o); ctx.lineTo(-CAR.len / 2 - L, o); ctx.stroke(); }); }
    ctx.fillStyle = C.blue; rr(-CAR.len / 2, -9, CAR.len, 18, 5); ctx.fill();
    ctx.fillStyle = '#cfe0ff'; rr(2, -7, 9, 14, 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(CAR.len / 2 - 3, -7, 3, 4); ctx.fillRect(CAR.len / 2 - 3, 3, 3, 4);
    ctx.fillStyle = c.state === 'brake' || c.v === 0 && c.state === 'gone' ? C.red : '#5a2a2a'; ctx.fillRect(-CAR.len / 2, -7, 3, 5); ctx.fillRect(-CAR.len / 2, 2, 3, 5);
    if (c.state === 'merge' && (calm || Math.floor(clock * 5) % 2 === 0)) { ctx.fillStyle = C.amber; ctx.fillRect(-CAR.len / 2 + 1, -10, 6, 3); ctx.fillRect(CAR.len / 2 - 7, -10, 6, 3); }
    ctx.restore();
  };
  const draw = () => {
    ctx.fillStyle = '#16232c'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2b3a44'; ctx.fillRect(0, ROAD.top, W, ROAD.bottom - ROAD.top);
    ctx.fillStyle = 'rgba(124,224,210,.07)'; ctx.fillRect(0, ROAD.mid, W, ROAD.bottom - ROAD.mid);
    ctx.strokeStyle = '#e8eef3'; ctx.lineWidth = 2; ctx.setLineDash([18, 14]); ctx.beginPath(); ctx.moveTo(0, ROAD.mid); ctx.lineTo(W, ROAD.mid); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, ROAD.top); ctx.lineTo(W, ROAD.top); ctx.moveTo(0, ROAD.bottom); ctx.lineTo(W, ROAD.bottom); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(tr(lang, 'lane to close', '待封闭车道'), W - 8, ROAD.mid + 14);
    ctx.strokeStyle = 'rgba(255,204,142,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(CAR.decideX, ROAD.mid + 2); ctx.lineTo(CAR.decideX, ROAD.bottom - 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,204,142,.85)'; ctx.textAlign = 'center'; ctx.fillText(tr(lang, 'merge point', '并线点'), CAR.decideX, ROAD.mid - 6);
    if (r.obstacle) {
      const o = r.obstacle; ctx.fillStyle = '#5d6b76'; rr(o.x, o.y, o.w, o.h, 6); ctx.fill(); ctx.fillStyle = '#9fb2c0'; rr(o.x + 6, o.y + 6, o.w - 12, 14, 3); ctx.fill();
      ctx.fillStyle = '#e9f3fb'; ctx.textAlign = 'center'; ctx.font = '600 10px system-ui, sans-serif'; ctx.fillText(tr(lang, 'parked van', '停着的货车'), o.x + o.w / 2, o.y + 46);
      const v = g.VIA; ctx.strokeStyle = sel >= 0 ? C.teal : 'rgba(124,224,210,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(v.x, v.y - 9); ctx.lineTo(v.x + 9, v.y); ctx.lineTo(v.x, v.y + 9); ctx.lineTo(v.x - 9, v.y); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = sel >= 0 ? C.teal : C.dim; ctx.fillText('V', v.x, v.y + 4);
    }
    // slots
    ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    r.slots.forEach((s, k) => {
      const f = g.slotFilled(r, k), pulse = flash[k] ?? 0;
      ctx.lineWidth = f ? 3 : 2; ctx.strokeStyle = f ? C.teal : sel >= 0 ? C.teal : 'rgba(124,224,210,.55)'; ctx.setLineDash(f ? [] : [4, 4]);
      ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (pulse > 0) { ctx.strokeStyle = `rgba(124,224,210,${pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 14 + (1 - pulse) * 22, 0, 7); ctx.stroke(); }
      ctx.fillStyle = f ? C.teal : C.dim; ctx.fillText(letters[k], s.x + 19, s.y + 17);
    });
    // planned routes
    r.cones.forEach((c, i) => {
      if (!c.path.length) return;
      ctx.strokeStyle = i === sel ? '#fff' : 'rgba(124,224,210,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(c.x, c.y);
      c.path.forEach(q => ctx.lineTo(q.x, q.y)); ctx.stroke(); ctx.setLineDash([]);
    });
    if (sel >= 0 && !r.result) {
      const c = r.cones[sel]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(c.x, c.y);
      via.forEach(q => ctx.lineTo(q.x, q.y)); if (drag?.moved) ctx.lineTo(drag.at.x, drag.at.y); ctx.stroke(); ctx.setLineDash([]);
      via.forEach(q => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, 3.5, 0, 7); ctx.fill(); });
    }
    // cones with their sensing arc
    r.cones.forEach((c, i) => {
      if (c.path.length) {
        const a = Math.atan2(c.path[0].y - c.y, c.path[0].x - c.x);
        ctx.strokeStyle = c.stopped ? C.red : 'rgba(255,204,142,.4)'; ctx.lineWidth = c.stopped ? 3 : 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, g.CONES.sense, a - 0.35, a + 0.35); ctx.stroke();
        if (c.stopped) { ctx.fillStyle = C.red; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tr(lang, 'stop', '停'), c.x + Math.cos(a) * (g.CONES.sense + 11), c.y + Math.sin(a) * (g.CONES.sense + 11) + 3); }
      }
      if (i === sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c.x, c.y, 19, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#ff9a4d'; ctx.strokeStyle = i === sel ? '#fff' : '#ffd2a8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(c.x, c.y - 13); ctx.lineTo(c.x + 10, c.y + 9); ctx.lineTo(c.x - 10, c.y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(c.x - 6, c.y - 2, 12, 3);
      ctx.fillStyle = C.ink; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), c.x, c.y + 21);
    });
    drawCar();
    // countdown
    const decide = r.decideAt, left = Math.max(0, decide - r.t), frac = Math.min(1, r.t / decide);
    ctx.textAlign = 'left'; ctx.font = '700 12px system-ui, sans-serif';
    let line = tr(lang, `Round ${ri + 1} of 3 · press Start`, `第 ${ri + 1} 轮，共 3 轮 · 点“开始”`), col = C.dim;
    if (phase === 'play' || phase === 'won' || phase === 'lost' || phase === 'done') {
      if (!r.result) { col = left < decide * 0.3 ? C.red : C.ink; line = r.car.state === 'wait' ? tr(lang, `Car enters in ${Math.max(0, r.def.cd - r.t).toFixed(1)} s · reaches the merge point in ${left.toFixed(1)} s`, `车将在 ${Math.max(0, r.def.cd - r.t).toFixed(1)} 秒后驶入 · ${left.toFixed(1)} 秒后到并线点`) : tr(lang, `Car reaches the merge point in ${left.toFixed(1)} s`, `车将在 ${left.toFixed(1)} 秒后到并线点`); }
      else if (r.result === 'safe') { col = C.teal; line = tr(lang, 'Lane closed: the car will signal and merge', '车道已封闭：车辆打灯并线'); }
      else { col = C.red; line = tr(lang, 'Not closed in time: emergency braking', '未及时封闭：车辆紧急制动'); }
    }
    ctx.fillStyle = col; ctx.fillText(line, 10, 20);
    ctx.fillStyle = '#1b3442'; ctx.fillRect(10, 28, W - 20, 5); ctx.fillStyle = r.result === 'safe' ? C.teal : r.result === 'fail' || frac > 0.7 ? C.red : C.amber; ctx.fillRect(10, 28, (W - 20) * (r.result === 'safe' && r.closedAt !== null ? Math.min(1, r.closedAt / decide) : frac), 5);
    if (!calm && r.car.state === 'wait' && phase === 'play') { ctx.fillStyle = C.amber; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(clock * 6); ctx.beginPath(); ctx.moveTo(8, ROAD.laneA - 9); ctx.lineTo(24, ROAD.laneA); ctx.lineTo(8, ROAD.laneA + 9); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  };

  let lastStats = '';
  const L = loop(dt => {
    clock += dt;
    if (phase === 'play' || (r.result && r.car.state !== 'gone')) {
      const had = r.result; g.tickRound(r, dt);
      for (const ev of r.ev.splice(0)) flash[ev.slot] = calm ? 0 : 1;
      if (!had && r.result && phase === 'play') conclude();
    }
    for (let k = 0; k < flash.length; k++) if (flash[k] > 0) flash[k] = Math.max(0, flash[k] - dt * 2);
    const s = tr(lang, `Round ${ri + 1} of 3 · slots filled ${filledCount()} of ${r.slots.length}`, `第 ${ri + 1} 轮，共 3 轮 · 已封好 ${filledCount()} / ${r.slots.length}`) + (stars.length ? tr(lang, ` · stars ${stars.map(starText).join(' ')}`, ` · 星级 ${stars.map(starText).join(' ')}`) : '');
    if (s !== lastStats) { lastStats = s; stats.textContent = s; }
    draw();
  });
  startBtn.textContent = tr(lang, 'Start round 1', '开始第 1 轮'); status.textContent = tr(lang, 'A car is approaching in the lower lane. Close the lane before it reaches the merge point and it will signal and change lanes. Three rounds, more slots each round.', '车辆沿下方车道驶来。须在其到达并线点前用锥桶封闭该车道，车辆随即打灯并线。共三轮，位置逐轮增加。');
  hint.textContent = tr(lang, 'Mouse or touch: tap a cone, then a dashed slot, or drag the cone onto the slot. Keyboard (canvas focused): 1 to 5 pick a cone, A to E pick a slot, V adds the waypoint in round 3, Esc cancels.', '鼠标或触屏：点击锥桶再点击虚线位置，或直接拖动锥桶。键盘（画布获得焦点时）：1 到 5 选锥桶，A 到 E 选位置，第 3 轮按 V 添加途经点，Esc 取消。');
  return { destroy: () => { L.stop(); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('keydown', onKey); startBtn.removeEventListener('click', begin); phase = 'ready'; } };
}
