import { best, C, el, grid, loop, makeCanvas, store, tr, type Game, type Lang } from './kit';
import * as g from './maze.logic';

/* ========== Hack-a-Bot 2025: MONA delivery run, raced against an autopilot ========== */
type Mode = 'idle' | 'count' | 'run' | 'over';
interface Spark { x: number; y: number; vx: number; vy: number; life: number }

const STYLE = `
.gm-maze-tracks { display: flex; gap: .4rem; flex-wrap: wrap; }
.gm-maze-tk { display: grid; gap: 0; min-height: 44px; padding: .15rem .8rem; line-height: 1.25; text-align: center; }
.gm-maze-tk small { font: 500 .68rem ui-monospace, Menlo, monospace; color: #9fb8c8; }
.gm-maze-tk[aria-pressed="true"] { border-color: #7ce0d2; box-shadow: 0 0 0 1px #7ce0d2 inset; }
.gm-maze-pads { display: grid; grid-template-columns: 1fr auto 1fr; gap: .5rem; }
.gm-maze-pad { min-height: 64px; padding: 0 1rem; border-radius: 12px; border: 2px solid #3c5b6a; background: #0f2130; color: #e6f3fb; font: inherit; font-size: 1.6rem; font-weight: 700; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.gm-maze-pad small { display: block; font-size: .72rem; font-weight: 600; color: #9fb8c8; }
.gm-maze-pad.mid { font-size: .88rem; min-width: 84px; border-color: #ffcc8e; }
.gm-maze-pad.on { background: #7ce0d2; border-color: #7ce0d2; color: #062b30; }
.gm-maze-pad.on small { color: #062b30; }
.gm-maze-pad.mid.on { background: #ffcc8e; border-color: #ffcc8e; }
.gm-maze-pad:focus-visible { outline: 2px solid #7de9ef; outline-offset: 2px; }
`;

export default function mount(root: HTMLElement, lang: Lang): Game {
  const W = g.MAZE.w, H = g.MAZE.h, T = (en: string, zh: string) => tr(lang, en, zh);
  const calm = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const { cv, ctx } = makeCanvas(W, H, T('A taped maze from Start to Pickup to Dropoff. The amber robot races a ghost autopilot.', '从起点经取货点到卸货点的胶带迷宫。橙色机器人与半透明的自动驾驶影子竞速。'));

  let ti = 0, track = g.TRACKS[0], me = g.newRunner(track), ghost = g.newRunner(track), gT = g.ghostTime(track);
  let mode: Mode = 'idle', cd = 0, goT = 0, flash = 0, flashCol: string = C.teal, banner = '', stars = 0, note = 0;
  let trail: g.Pt[] = [], sparks: Spark[] = [];
  const held = { kl: false, kr: false, ks: false, pl: false, pr: false, ps: false };

  const goal = T('Drive Start, Pickup, Dropoff along the tape before the ghost does. Leaving the tape sends you back to the last checkpoint with +3 s; three strikes end the run.', '沿着胶带依次开到起点、取货点、卸货点，先于影子完成。离开胶带会退回上一个检查点并加 3 秒，三次失误即结束本轮。');
  const intro = () => T(`Track ${track.id}. ${goal} Press Start.`, `第 ${track.id} 条赛道。${goal}按“开始”。`);
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: intro() });

  /* ---- controls ---- */
  const startBtn = el('button', { class: 'gm-btn primary big', type: 'button', 'data-gm-start': '', text: T('Start', '开始') }) as HTMLButtonElement;
  const tkBtns = g.TRACKS.map((t, i) => el('button', { class: 'gm-btn ghost gm-maze-tk', type: 'button', onclick: () => pick(i) }) as HTMLButtonElement);
  const refreshTracks = () => tkBtns.forEach((b, i) => {
    const id = g.TRACKS[i].id, st = Number(store.get(`maze-T${id}-stars`)) || 0, bt = Number(store.get(`maze-T${id}`)) || 0;
    b.replaceChildren(el('span', { text: `${T('Track', '赛道')} ${id}  ${'★'.repeat(st)}${'☆'.repeat(3 - st)}` }), el('small', { text: bt ? `${bt.toFixed(1)} s` : '—' }));
    b.setAttribute('aria-pressed', String(i === ti));
    b.setAttribute('aria-label', T(`Track ${id}, ${st} of 3 stars${bt ? `, best ${bt.toFixed(1)} seconds` : ''}`, `第 ${id} 条赛道，${st} 星（共 3 星）${bt ? `，最佳 ${bt.toFixed(1)} 秒` : ''}`));
  });
  const pad = (cls: string, label: string, sub: string, aria: string, prop: 'pl' | 'pr' | 'ps') => {
    const b = el('button', { class: `gm-maze-pad ${cls}`, type: 'button', 'aria-label': aria }, label, sub ? el('small', { text: sub }) : null) as HTMLButtonElement;
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* keep going without capture */ } held[prop] = true; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => { held[prop] = false; });
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  };
  const left = pad('', '◀', T('left', '左'), T('Steer left (arrow key)', '左转（方向键）'), 'pl');
  const right = pad('', '▶', T('right', '右'), T('Steer right (arrow key)', '右转（方向键）'), 'pr');
  const slowB = pad('mid', T('Slow', '慢速'), 'Shift / ↓', T('Hold to drive slowly for tight corners (Shift or down arrow)', '按住慢速通过急弯（Shift 或下方向键）'), 'ps');

  root.append(el('style', { text: STYLE }), cv, status,
    el('div', { class: 'gm-maze-pads' }, left, slowB, right),
    el('div', { class: 'gm-maze-tracks', role: 'group', 'aria-label': T('Track select', '选择赛道') }, ...tkBtns),
    el('div', { class: 'gm-controls' }, startBtn));

  /* ---- rules glue ---- */
  const reset = () => { me = g.newRunner(track); ghost = g.newRunner(track); gT = g.ghostTime(track); trail = []; sparks = []; flash = 0; banner = ''; stars = 0; note = 0; mode = 'idle'; };
  const setLabel = () => { startBtn.textContent = mode === 'over' ? T('Race again', '再来一局') : T('Start', '开始'); };
  function pick(i: number) { ti = i; track = g.TRACKS[i]; reset(); setLabel(); refreshTracks(); status.textContent = intro(); }
  const begin = () => {
    reset(); mode = 'count'; cd = 1.5; setLabel();
    status.textContent = T('Ready. Hold the arrows or arrow keys; hold Slow or Shift in tight corners.', '准备。按住方向键或屏幕上的箭头；急弯处按住慢速或 Shift。');
    try { cv.focus({ preventScroll: true }); } catch { cv.focus(); }
  };
  startBtn.addEventListener('click', begin);

  const burst = (x: number, y: number, n: number) => { if (calm) return; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 25 + Math.random() * 70; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.4 }); } };
  const fmt = (n: number) => n.toFixed(1);
  const finish = () => {
    mode = 'over'; setLabel();
    const tot = g.total(me), pen = me.penalty ? T(` (includes ${me.penalty} s of penalties)`, `（含 ${me.penalty} 秒罚时）`) : '';
    if (me.phase === 'out') {
      flash = 1; flashCol = C.red; banner = T('Three strikes', '三次失误');
      status.textContent = T('Three strikes: the run is over. Hold Slow (Shift) before the tight corners and ease off the arrows on straights.', '三次失误，本轮结束。提示：急弯前按住慢速（Shift），直道松开方向键。');
      return;
    }
    stars = g.starsFor(me, gT);
    const bt = best(`maze-T${track.id}`, Number(fmt(tot))); best(`maze-T${track.id}-stars`, stars, false);
    flash = 1; flashCol = stars > 1 ? C.teal : C.amber; banner = stars > 1 ? T('You win', '你赢了') : T('Ghost wins', '影子赢了');
    status.textContent = stars > 1
      ? T(`Delivered in ${fmt(tot)} s${pen}, ahead of the ghost's ${fmt(gT)} s. ${stars} of 3 stars. Best: ${bt} s.`, `用时 ${fmt(tot)} 秒${pen}，比影子的 ${fmt(gT)} 秒更快。${stars} 星（共 3 星）。最佳：${bt} 秒。`)
      : T(`Delivered in ${fmt(tot)} s${pen}; the ghost took ${fmt(gT)} s. 1 of 3 stars. Fewer strikes and slower corners improve the time. Best: ${bt} s.`, `用时 ${fmt(tot)} 秒${pen}，影子用了 ${fmt(gT)} 秒。1 星（共 3 星）。减少失误、急弯减速可提升成绩。最佳：${bt} 秒。`);
  };

  /* ---- input ---- */
  const releaseAll = () => { held.kl = held.kr = held.ks = held.pl = held.pr = held.ps = false; };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const playing = mode === 'count' || mode === 'run';
    if (e.key === 'ArrowLeft') held.kl = down; else if (e.key === 'ArrowRight') held.kr = down;
    else if (e.key === 'ArrowDown') held.ks = down; else if (e.key === 'Shift') { held.ks = down; return; } else return;
    if (playing) e.preventDefault();
  };
  const kd = onKey(true), ku = onKey(false);
  const onFocusOut = (e: FocusEvent) => { if (!root.contains(e.relatedTarget as Node | null)) releaseAll(); };
  root.addEventListener('keydown', kd); root.addEventListener('keyup', ku); root.addEventListener('focusout', onFocusOut);
  window.addEventListener('blur', releaseAll);

  /* ---- drawing ---- */
  const tri = (r: g.Runner, fill: string, stroke: string, alpha: number) => {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.h); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  const label = (text: string, x: number, y: number, align: CanvasTextAlign, col: string) => { ctx.textAlign = align; ctx.fillStyle = col; ctx.fillText(text, x, y); };
  const draw = () => {
    grid(ctx, W, H, 20);
    const path = track.path, line = () => { ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(207,221,230,.1)'; ctx.lineWidth = g.MAZE.off * 2; line();
    ctx.strokeStyle = '#cfdde6'; ctx.lineWidth = g.MAZE.tape; line();
    track.cps.forEach((s, i) => { const p = g.pointAhead(path, 0, 0, s); ctx.fillStyle = i <= me.cp ? C.teal : '#0d202b'; ctx.strokeStyle = i <= me.cp ? C.teal : C.dim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    const sq = (p: g.Pt, col: string) => { ctx.fillStyle = '#0d202b'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillRect(p.x - 10, p.y - 10, 20, 20); ctx.strokeRect(p.x - 10, p.y - 10, 20, 20); };
    sq(path[0], C.blue); sq(track.pickup, me.picked ? C.dim : C.amber); sq(track.drop, C.teal);
    ctx.font = '600 10px system-ui, sans-serif';
    label(T('START', '起点'), path[0].x, path[0].y + 24, 'center', C.blue);
    label(T('PICKUP', '取货'), track.pickup.x + 16, track.pickup.y + 4, 'left', me.picked ? C.dim : C.amber);
    label(T('DROPOFF', '卸货'), track.drop.x, track.drop.y - 15, 'center', C.teal);
    ctx.strokeStyle = 'rgba(255,170,70,.55)'; ctx.lineWidth = 2; ctx.beginPath(); trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    tri(ghost, C.teal, C.teal, 0.45);
    tri(me, me.phase === 'recover' ? C.red : '#ff9a3d', '#5a2a00', me.phase === 'recover' && Math.floor(me.wait * 10) % 2 ? 0.35 : 1);
    if (me.phase === 'loading') label(T('loading…', '装货中…'), me.x + 14, me.y - 10, 'left', C.amber);
    if (ghost.phase === 'loading') label(T('loading…', '装货中…'), ghost.x + 14, ghost.y + 16, 'left', C.teal);
    for (const p of sparks) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = C.red; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); } ctx.globalAlpha = 1;
    ctx.font = '700 13px ui-monospace, Menlo, monospace';
    label(`${T('You', '你')} ${fmt(g.total(me))} s`, 8, 16, 'left', '#ffb066');
    label(`${T('Ghost', '影子')} ${fmt(g.total(ghost))} s`, W - 8, 16, 'right', C.teal);
    for (let i = 0; i < g.MAZE.maxStrikes; i++) { ctx.fillStyle = i < me.strikes ? C.red : '#2a4452'; ctx.beginPath(); ctx.arc(W / 2 - 14 + i * 14, 11, 4.5, 0, Math.PI * 2); ctx.fill(); }
    if (note > 0 && !calm) label(`+${g.MAZE.penalty} s`, me.x, me.y - 14 - (1 - note) * 14, 'center', C.red);
    if (flash > 0 && !calm) { ctx.globalAlpha = flash * 0.28; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    const box = (text: string, sub: string, col: string) => {
      ctx.fillStyle = 'rgba(6,16,27,.68)'; ctx.fillRect(W / 2 - 80, H / 2 - 26, 160, 54); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 80, H / 2 - 26, 160, 54);
      ctx.font = '700 19px system-ui, sans-serif'; label(text, W / 2, H / 2 - 3, 'center', col);
      ctx.font = '600 13px system-ui, sans-serif'; label(sub, W / 2, H / 2 + 19, 'center', C.amber);
    };
    if (mode === 'count') { ctx.font = '700 46px system-ui, sans-serif'; label(String(Math.max(1, Math.ceil(cd / 0.5))), W / 2, H / 2 + 16, 'center', C.amber); }
    else if (goT > 0) { ctx.globalAlpha = Math.min(1, goT * 3); ctx.font = '700 34px system-ui, sans-serif'; label(T('Go', '出发'), W / 2, H / 2 + 12, 'center', C.teal); ctx.globalAlpha = 1; }
    else if (mode === 'over') box(banner, me.phase === 'done' ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : T('Press Race again', '按“再来一局”'), me.phase === 'done' && stars > 1 ? C.teal : C.red);
    else if (mode === 'idle') { ctx.font = '600 14px system-ui, sans-serif'; label(T('Press Start to race the ghost', '按“开始”与影子竞速'), W / 2, H - 10, 'center', C.dim); }
    ctx.textAlign = 'left';
  };

  const L = loop(dt => {
    if (mode === 'count') { cd -= dt; if (cd <= 0) { mode = 'run'; goT = 0.5; status.textContent = T('Go. Loading at Pickup is automatic.', '出发。到达取货点后自动停车装货。'); } }
    else if (mode === 'run') {
      const steer = (held.kr || held.pr ? 1 : 0) - (held.kl || held.pl ? 1 : 0), slow = held.ks || held.ps;
      const before = me.strikes;
      me = g.stepRunner(me, steer, dt, track, { slow }); ghost = g.stepRunner(ghost, 0, dt, track, { auto: true, pace: g.MAZE.ghostPace });
      if (me.strikes === before) { trail.push({ x: me.x, y: me.y }); if (trail.length > 260) trail.shift(); }
      if (me.strikes > before) {
        burst(me.x, me.y, 14); flash = 0.7; flashCol = C.red; note = 1; trail = [];
        if (me.phase !== 'out') status.textContent = T(`Off the tape: back to the last checkpoint, +${g.MAZE.penalty} s. Strike ${me.strikes} of ${g.MAZE.maxStrikes}.`, `偏离胶带：退回上一个检查点，加 ${g.MAZE.penalty} 秒。第 ${me.strikes} 次失误，共 ${g.MAZE.maxStrikes} 次。`);
      }
      if (me.phase === 'done' || me.phase === 'out') finish();
    } else if (mode === 'over' && ghost.phase !== 'done' && ghost.phase !== 'out') ghost = g.stepRunner(ghost, 0, dt, track, { auto: true, pace: g.MAZE.ghostPace });
    if (goT > 0) goT = Math.max(0, goT - dt); if (flash > 0) flash = Math.max(0, flash - dt * 2.2); if (note > 0) note = Math.max(0, note - dt * 1.2);
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    sparks = sparks.filter(p => p.life > 0);
    left.classList.toggle('on', held.kl || held.pl); right.classList.toggle('on', held.kr || held.pr); slowB.classList.toggle('on', held.ks || held.ps);
    draw();
  });
  refreshTracks();
  return {
    destroy: () => {
      L.stop(); root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); root.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('blur', releaseAll); releaseAll();
    },
  };
}
