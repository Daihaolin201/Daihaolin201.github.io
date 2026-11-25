import { best, C, el, loop, makeCanvas, tr, type Game, type Lang } from './kit';
import * as g from './signs.logic';

/* ========== PuzzleThon: read each sign, answer before the sign reaches the car ========== */
export default function mount(root: HTMLElement, lang: Lang): Game {
  const W = 400, H = 240, HORIZON = 52;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { cv, ctx } = makeCanvas(W, H, tr(lang, 'Road with traffic lights and signs approaching the car', '迎面驶向小车的信号灯和交通标志'));
  let round = new g.Round(Math.random), running = false, finished = false, shownBest = 0;
  let t = 0, endAt = -9, carV = 1, carTarget = 1, hold = 0, swerve = 0, flash = 0, shake = 0, tag = '', tagT = 0, tagCol: string = C.teal, banner = '', bannerT = 0;

  const goalText = tr(lang, 'Classify each sign. Red light or stop sign: STOP. Amber light or speed sign: SLOW. Green light: GO. Answer the nearest sign before it reaches the car. Three lives. Keys 1, 2, 3.', '判断每个标志。红灯或停车标志：停车。黄灯或限速标志：减速。绿灯：通行。在最近的标志到达车前作答，共三条命。快捷键 1、2、3。');
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: goalText });
  const labels: Record<g.Action, string> = { stop: tr(lang, 'STOP', '停车'), slow: tr(lang, 'SLOW', '减速'), go: tr(lang, 'GO', '通行') };
  const btn = (a: g.Action, n: number) => el('button', { class: 'gm-btn big', type: 'button', disabled: true, 'aria-keyshortcuts': String(n), text: `${n} · ${labels[a]}`, onclick: () => act(a) }) as HTMLButtonElement;
  const pad = [btn('stop', 1), btn('slow', 2), btn('go', 3)];
  const startBtn = el('button', { class: 'gm-btn primary', type: 'button', 'data-gm-start': '', text: tr(lang, 'Start', '开始'), onclick: () => start() }) as HTMLButtonElement;
  const style = el('style', { text: `
.gm-signs-wrap{display:grid;gap:.6rem}
.gm-signs-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem}
.gm-signs-pad .gm-btn{min-height:48px;min-width:0;padding:0 .3rem}
` });
  root.append(style, el('div', { class: 'gm-signs-wrap' }, cv, el('div', { class: 'gm-signs-pad' }, ...pad), el('div', { class: 'gm-controls' }, startBtn), status));

  const setPad = (on: boolean) => pad.forEach(b => { b.disabled = !on; });
  const say = (s: string, col: string = C.teal) => { tag = s; tagT = 0.7; tagCol = col; };
  const start = () => {
    round = new g.Round(Math.random); running = true; finished = false; t = 0; carV = 1; carTarget = 1; hold = 0; swerve = 0; flash = 0; shake = 0; tag = ''; banner = ''; bannerT = 0;
    setPad(true); startBtn.textContent = tr(lang, 'Restart', '重新开始');
    status.textContent = tr(lang, 'Round running. Answer the nearest sign first.', '进行中：先判断最近的标志。');
  };
  const end = () => {
    running = false; finished = true; endAt = t; setPad(false); startBtn.textContent = tr(lang, 'Play again', '再来一局');
    shownBest = best('signs', round.score, false);
    status.textContent = tr(lang, `Round over. Score ${round.score}, accuracy ${Math.round(round.accuracy * 100)}%, average reaction ${round.avgReaction.toFixed(2)} s, best streak ${round.bestCombo}, level ${round.level}. Best score: ${shownBest}.`, `本局结束。得分 ${round.score}，正确率 ${Math.round(round.accuracy * 100)}%，平均反应 ${round.avgReaction.toFixed(2)} 秒，最长连对 ${round.bestCombo}，到达第 ${round.level} 级。最高分：${shownBest}。`);
  };
  const bump = () => { carTarget = 0.6; hold = 0.5; if (!calm) { shake = 0.4; flash = 0.5; } };
  const levelNote = (lv: number) => lv === 2 ? tr(lang, 'Level 2: amber light means SLOW', '第 2 级：黄灯表示减速') : lv === 3 ? tr(lang, 'Level 3: signs hide behind trees or sit in the dark', '第 3 级：标志可能被树挡住或处在暗处') : lv === 4 ? tr(lang, 'Level 4: two at once, answer the nearer first', '第 4 级：双标志同时出现，先判断近处') : tr(lang, `Level ${lv}: faster`, `第 ${lv} 级：更快`);
  const lost = (o: g.Outcome) => {
    if (o.type === 'miss') { bump(); say(tr(lang, 'missed', '漏了'), C.red); }
    if (round.over) end();
  };
  const act = (a: g.Action) => {
    if (!running) return;
    const o = round.answer(a);
    if (!o) return;
    if (o.type === 'right') {
      carTarget = a === 'stop' ? 0 : a === 'slow' ? 0.45 : 1.8; hold = 0.9; say(`+${o.points}`, '#3ddc84');
      if (o.levelUp) { banner = levelNote(round.level); bannerT = 2.2; status.textContent = banner; }
    } else { bump(); if (!calm) swerve = 1; say(tr(lang, 'wrong', '答错了'), C.red); lost(o); }
  };
  const key = (e: KeyboardEvent) => {
    if (!running || e.ctrlKey || e.metaKey || e.altKey) return;
    const m: Record<string, g.Action> = { '1': 'stop', '2': 'slow', '3': 'go' };
    if (m[e.key]) { act(m[e.key]); e.preventDefault(); }
  };
  window.addEventListener('keydown', key);
  cv.addEventListener('pointerdown', () => { if (!running && t - endAt > 0.7) start(); });

  const roadX = (p: number, side: number) => W / 2 + side * (20 + p * 118);
  const roadY = (p: number) => HORIZON + 8 + p * 128;
  /** A tree beside the sign whose foliage covers its outer edge, so the sign is partly hidden but still readable. */
  const tree = (x: number, y: number, r: number, d: number) => {
    ctx.fillStyle = '#4a3322'; ctx.fillRect(x + d * r * 1.15 - r * 0.12, y - r * 0.6, r * 0.24, r * 2.6);
    ctx.fillStyle = '#1f6b43';
    for (const [dx, dy, k] of [[1.1, -0.9, 0.8], [1.5, -0.1, 0.75], [0.95, 0.0, 0.55]]) { ctx.beginPath(); ctx.arc(x + d * dx * r, y + dy * r, r * k, 0, Math.PI * 2); ctx.fill(); }
  };
  const drawItem = (it: g.Item) => {
    const s = 0.3 + it.p * 1.1, x = roadX(it.p, it.side), y = roadY(it.p), r = 11 * s;
    ctx.save(); ctx.globalAlpha = it.done ? 0.25 : 1;
    if (it.kind === 'red' || it.kind === 'green' || it.kind === 'amber') {
      ctx.fillStyle = '#0b1823'; ctx.fillRect(x - r * 0.8, y - r * 2.5, r * 1.6, r * 3.9);
      const lamp = (k: g.SignKind, dy: number, on: string, off: string) => { ctx.fillStyle = it.kind === k ? on : off; ctx.beginPath(); ctx.arc(x, y + dy * r, r * 0.45, 0, 7); ctx.fill(); };
      lamp('red', -1.8, '#ff4d40', '#3a2522'); lamp('amber', -0.6, '#ffb23d', '#3a3020'); lamp('green', 0.6, '#3ddc84', '#1e3326');
    } else if (it.kind === 'stop') {
      ctx.fillStyle = '#c9362c'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.6, y - r * 0.15, r * 1.2, r * 0.3);
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#d6453d'; ctx.lineWidth = r * 0.22; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = `bold ${Math.round(r * 0.9)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('20', x, y + 1); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
    if (it.cond === 'dark') { ctx.globalAlpha = (it.done ? 0.25 : 1) * 0.55; ctx.fillStyle = '#071018'; ctx.fillRect(x - r * 1.3, y - r * 2.7, r * 2.6, r * 4.2); }
    if (it.cond === 'tree') { ctx.globalAlpha = it.done ? 0.25 : 1; tree(x, y, r, it.side); }
    ctx.restore();
  };
  const heart = (x: number, y: number, on: boolean) => { ctx.font = '16px system-ui'; ctx.fillStyle = on ? C.red : '#3a4a55'; ctx.fillText(on ? '♥' : '♡', x, y); };

  const L = loop(dt => {
    t += dt;
    if (running) {
      for (const o of round.tick(dt)) lost(o);
      if (hold > 0) { hold -= dt; if (hold <= 0) carTarget = 1; }
    }
    carV += (carTarget - carV) * Math.min(1, dt * 6);
    swerve = Math.max(0, swerve - dt * 2.2); flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt); tagT = Math.max(0, tagT - dt); bannerT = Math.max(0, bannerT - dt);
    // road
    ctx.fillStyle = '#10222c'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0d1b24'; ctx.fillRect(0, 0, W, HORIZON);
    ctx.fillStyle = '#2b3a44'; ctx.beginPath(); ctx.moveTo(W / 2 - 18, HORIZON); ctx.lineTo(W / 2 + 18, HORIZON); ctx.lineTo(W - 10, H); ctx.lineTo(10, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 60 * carV; ctx.beginPath(); ctx.moveTo(W / 2, HORIZON); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    if (!calm && carV > 1.3) { ctx.strokeStyle = 'rgba(124,224,210,.25)'; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { const yy = ((t * 260 + k * 40) % 200) + 40; ctx.beginPath(); ctx.moveTo(40 + k * 12, yy); ctx.lineTo(40 + k * 12, yy + 14); ctx.moveTo(W - 40 - k * 12, yy); ctx.lineTo(W - 40 - k * 12, yy + 14); ctx.stroke(); } }
    [...round.items].sort((a, b) => a.p - b.p).forEach(drawItem);
    // the nearest open item gets a frame; with several open, a caption says to answer it first
    const tg = round.target;
    if (running && tg) {
      const x = roadX(tg.p, tg.side), y = roadY(tg.p), r = 11 * (0.3 + tg.p * 1.1);
      ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.strokeRect(x - r * 1.25, y - r * 2.75, r * 2.5, r * 4.2);
      if (round.items.filter(i => !i.done).length > 1) { ctx.fillStyle = C.teal; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(tr(lang, 'answer this first', '先答这个'), Math.min(W - 52, Math.max(52, x)), y - r * 2.95); ctx.textAlign = 'start'; }
    }
    // car: brake lights follow the answer
    const cx = W / 2 + Math.sin(swerve * 9) * swerve * 26 + (shake > 0 ? Math.sin(t * 90) * 3 : 0), cy = H - 34;
    ctx.fillStyle = C.teal; ctx.fillRect(cx - 20, cy - 8, 40, 26); ctx.fillStyle = '#0b1823'; ctx.fillRect(cx - 14, cy - 14, 28, 9);
    ctx.fillStyle = carTarget < 0.2 ? '#ff4d40' : carTarget < 0.8 ? '#ffb23d' : '#5a2b28'; ctx.fillRect(cx - 18, cy + 12, 9, 5); ctx.fillRect(cx + 9, cy + 12, 9, 5);
    if (carTarget < 0.8 && running) { ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(cx - 14, cy + 14, 10, 0, 7); ctx.arc(cx + 14, cy + 14, 10, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    if (flash > 0) { ctx.strokeStyle = C.red; ctx.globalAlpha = Math.min(1, flash * 2); ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); ctx.globalAlpha = 1; }
    // HUD
    for (let k = 0; k < g.LIVES; k++) heart(10 + k * 20, 22, k < round.lives);
    ctx.fillStyle = C.ink; ctx.font = 'bold 15px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.fillText(String(round.score), W / 2, 22);
    ctx.textAlign = 'right'; ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.fillStyle = C.dim; ctx.fillText(tr(lang, `Level ${round.level}`, `第 ${round.level} 级`), W - 10, 22); ctx.textAlign = 'start';
    const m = round.mult;
    ctx.fillStyle = m > 1 ? C.amber : C.dim; ctx.font = 'bold 22px system-ui'; ctx.fillText(`×${m}`, 10, 52);
    ctx.font = '11px system-ui'; ctx.fillStyle = C.dim; ctx.fillText(tr(lang, `streak ${round.combo}`, `连对 ${round.combo}`), 10, 66);
    ctx.fillStyle = '#1b3442'; ctx.fillRect(10, 71, 46, 4); ctx.fillStyle = C.amber; ctx.fillRect(10, 71, 46 * (m >= 5 ? 1 : (round.combo % 4) / 4), 4);
    ctx.fillStyle = '#1b3442'; ctx.fillRect(W - 66, 29, 56, 4); ctx.fillStyle = C.blue; ctx.fillRect(W - 66, 29, 56 * ((round.correct % g.PER_LEVEL) / g.PER_LEVEL), 4);
    if (tagT > 0) { ctx.globalAlpha = Math.min(1, tagT * 2); ctx.fillStyle = tagCol; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText(tag, W / 2, 48); ctx.textAlign = 'start'; ctx.globalAlpha = 1; }
    if (bannerT > 0 && running) { ctx.globalAlpha = Math.min(1, bannerT); ctx.fillStyle = 'rgba(11,24,35,.85)'; ctx.fillRect(20, 82, W - 40, 26); ctx.fillStyle = C.amber; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(banner, W / 2, 99); ctx.textAlign = 'start'; ctx.globalAlpha = 1; }
    if (!running) {
      ctx.fillStyle = 'rgba(11,24,35,.88)'; ctx.fillRect(30, 60, W - 60, 122);
      ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
      if (!finished) {
        ctx.font = 'bold 15px system-ui'; ctx.fillText(tr(lang, 'Sign recognition', '标志识别'), W / 2, 84);
        ctx.font = '13px system-ui'; ctx.fillStyle = '#c9ddea';
        ctx.fillText(tr(lang, 'Red light, stop sign → STOP (1)', '红灯、停车标志 → 停车（1）'), W / 2, 108);
        ctx.fillText(tr(lang, 'Amber light, speed sign → SLOW (2)', '黄灯、限速标志 → 减速（2）'), W / 2, 128);
        ctx.fillText(tr(lang, 'Green light → GO (3)', '绿灯 → 通行（3）'), W / 2, 148);
        ctx.fillStyle = C.teal; ctx.fillText(tr(lang, 'Tap here or press Start', '点击此处或按“开始”'), W / 2, 172);
      } else {
        ctx.font = 'bold 15px system-ui'; ctx.fillText(tr(lang, `Score ${round.score}   Best ${shownBest}`, `得分 ${round.score}   最高 ${shownBest}`), W / 2, 84);
        ctx.font = '13px system-ui'; ctx.fillStyle = '#c9ddea';
        ctx.fillText(tr(lang, `Accuracy ${Math.round(round.accuracy * 100)}%   Reaction ${round.avgReaction.toFixed(2)} s`, `正确率 ${Math.round(round.accuracy * 100)}%   反应 ${round.avgReaction.toFixed(2)} 秒`), W / 2, 110);
        ctx.fillText(tr(lang, `Level ${round.level}   Best streak ${round.bestCombo}`, `第 ${round.level} 级   最长连对 ${round.bestCombo}`), W / 2, 132);
        ctx.fillStyle = C.teal; ctx.fillText(tr(lang, 'Tap here to restart', '点击此处重新开始'), W / 2, 164);
      }
      ctx.textAlign = 'start';
    }
  });
  return { destroy: () => { L.stop(); running = false; window.removeEventListener('keydown', key); } };
}
