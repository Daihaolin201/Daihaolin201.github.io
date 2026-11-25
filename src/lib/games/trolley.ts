import { best, C, el, grid, loop, makeCanvas, store, tr, type Game, type Lang } from './kit';
import * as g from './trolley.logic';

/* ========== Hack-a-Bot 2026: two robots, one trolley ========== */
type Mode = 'idle' | 'run' | 'won' | 'lost';
interface Spark { x: number; y: number; vx: number; vy: number; life: number; col: string }

const STYLE = `
.gm-trolley-levels { display: flex; gap: .4rem; flex-wrap: wrap; }
.gm-trolley-lv { display: grid; gap: 0; min-height: 44px; padding: .15rem .8rem; line-height: 1.25; text-align: center; }
.gm-trolley-lv small { font: 500 .68rem ui-monospace, Menlo, monospace; color: #9fb8c8; }
.gm-trolley-lv[aria-pressed="true"] { border-color: #7ce0d2; box-shadow: 0 0 0 1px #7ce0d2 inset; }
.gm-trolley-pads { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
.gm-trolley-pad { display: grid; gap: .3rem; justify-items: center; min-height: 72px; padding: .5rem .6rem; border-radius: 12px; border: 2px solid var(--c); background: #0f2130; color: #e6f3fb; font: inherit; font-size: .82rem; font-weight: 650; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.gm-trolley-pad.on { background: var(--c); color: #062b30; }
.gm-trolley-pad kbd { font: 700 .8rem ui-monospace, Menlo, monospace; border: 1px solid currentColor; border-radius: 5px; padding: 0 .4em; }
.gm-trolley-pad .gm-meter { width: 100%; }
.gm-trolley-pad .gm-meter span { transition: none; background: var(--c); }
.gm-trolley-pad.on .gm-meter span { background: #062b30; }
.gm-trolley-pad:focus-visible { outline: 2px solid #7de9ef; outline-offset: 2px; }
`;

export default function mount(root: HTMLElement, lang: Lang): Game {
  const W = g.ARENA.w, H = g.ARENA.h, T = (en: string, zh: string) => tr(lang, en, zh);
  const calm = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const { cv, ctx } = makeCanvas(W, H, T('Two robots pushing a trolley into the goal zone. Hold A for the top robot and L for the bottom robot.', '两台机器人把推车推进终点区。按住 A 控制上方机器人，按住 L 控制下方机器人。'));

  let li = 0, lv = g.LEVELS[0], s = g.newTrolley(lv), mode: Mode = 'idle', auto = false;
  let push = { a: 0, b: 0 }, trail: g.Pt[] = [], sparks: Spark[] = [], flash = 0, flashCol = C.teal, banner = '', stars = 0;
  const held = { ka: false, kl: false, pa: false, pl: false };

  const goalText = [
    T('Hold A and L together to drive straight. Push one harder to turn. Reach the goal zone on the right.', '同时按住 A 和 L，推车直行；一边推得更重，推车就转向。开进右边的终点区。'),
    T('Two pillars block the straight line. Steer around them: touching one ends the run.', '两根立柱挡在直线上，须绕行，碰到立柱即结束本轮。'),
    T('Line up with the gate and reach the goal before the time runs out.', '对准闸门，限时内到达终点。'),
  ];
  const intro = () => T(`Level ${lv.id}. ${goalText[li]} Press Start.`, `第 ${lv.id} 关。${goalText[li]}按“开始”。`);
  const status = el('p', { class: 'gm-status', 'aria-live': 'polite', text: intro() });

  /* ---- controls ---- */
  const startBtn = el('button', { class: 'gm-btn primary big', type: 'button', 'data-gm-start': '', text: T('Start', '开始') }) as HTMLButtonElement;
  const autoBox = el('input', { type: 'checkbox', onchange: () => { auto = autoBox.checked; } }) as HTMLInputElement;
  const lvBtns = g.LEVELS.map((l, i) => el('button', { class: 'gm-btn ghost gm-trolley-lv', type: 'button', onclick: () => pick(i) }) as HTMLButtonElement);
  const refreshLevels = () => lvBtns.forEach((b, i) => {
    const id = g.LEVELS[i].id, st = Number(store.get(`trolley-L${id}-stars`)) || 0, bt = Number(store.get(`trolley-L${id}`)) || 0;
    b.replaceChildren(el('span', { text: `${T('Level', '第')} ${id}${lang === 'zh' ? ' 关' : ''}  ${'★'.repeat(st)}${'☆'.repeat(3 - st)}` }), el('small', { text: bt ? `${bt.toFixed(1)} s` : '—' }));
    b.setAttribute('aria-pressed', String(i === li));
    b.setAttribute('aria-label', T(`Level ${id}, ${st} of 3 stars${bt ? `, best ${bt.toFixed(1)} seconds` : ''}`, `第 ${id} 关，${st} 星（共 3 星）${bt ? `，最佳 ${bt.toFixed(1)} 秒` : ''}`));
  });
  const pad = (key: 'a' | 'l', keyLabel: string, name: string, col: string) => {
    const meter = el('span', {}) as HTMLSpanElement;
    const b = el('button', { class: 'gm-trolley-pad', type: 'button', style: `--c:${col}`, 'aria-label': T(`${name} push: hold to push (key ${keyLabel})`, `${name}推力：按住推动（键盘 ${keyLabel}）`) }, el('span', {}, el('kbd', { text: keyLabel }), ` ${name}`), el('span', { class: 'gm-meter' }, meter)) as HTMLButtonElement;
    const ptr = key === 'a' ? 'pa' : 'pl';
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* not capturable: window listeners below still release */ } held[ptr] = true; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => { held[ptr] = false; });
    b.addEventListener('contextmenu', e => e.preventDefault());
    return { b, meter };
  };
  const padA = pad('a', 'A', T('Top robot', '上方机器人'), C.teal), padL = pad('l', 'L', T('Bottom robot', '下方机器人'), C.amber);

  const style = el('style', { text: STYLE });
  root.append(style, cv, status,
    el('div', { class: 'gm-trolley-pads' }, padA.b, padL.b),
    el('div', { class: 'gm-trolley-levels', role: 'group', 'aria-label': T('Level select', '选择关卡') }, ...lvBtns),
    el('div', { class: 'gm-controls' }, startBtn, el('label', { class: 'gm-check' }, autoBox, T('Autopilot: computes both pushes from heading and target', '自动驾驶：根据朝向和目标算出两边推力'))));

  /* ---- rules glue ---- */
  const reset = () => { s = g.newTrolley(lv); trail = []; sparks = []; flash = 0; banner = ''; mode = 'idle'; push = { a: 0, b: 0 }; };
  const setLabel = () => { startBtn.textContent = mode === 'won' ? (li < g.LEVELS.length - 1 ? T('Next level', '下一关') : T('Play again', '再玩一次')) : mode === 'lost' ? T('Retry', '重试') : T('Start', '开始'); };
  function pick(i: number) { li = i; lv = g.LEVELS[i]; reset(); setLabel(); refreshLevels(); status.textContent = intro(); }
  const begin = () => {
    if (mode === 'won' && li < g.LEVELS.length - 1) { li++; lv = g.LEVELS[li]; }
    reset(); mode = 'run'; refreshLevels(); setLabel();
    status.textContent = T(`Level ${lv.id}: go. Hold A and L, release one to turn.`, `第 ${lv.id} 关开始。按住 A 和 L 直行，松开一侧即转向。`);
    try { cv.focus({ preventScroll: true }); } catch { cv.focus(); }
  };
  startBtn.addEventListener('click', begin);

  const failText: Record<NonNullable<g.Trolley['why']>, string> = {
    wall: T('The trolley hit the wall. Keep the two pushes close, and let go of the harder one briefly to straighten up.', '推车撞墙。保持两侧推力接近，回正时短暂松开推力较大的一侧。'),
    pillar: T('The trolley hit a pillar. Start turning earlier: it keeps rotating for a moment after you release.', '推车撞上立柱。应提前转向：松开按键后推车仍会短暂转动。'),
    gate: T('The trolley clipped the gate. Line up with the opening before you reach it.', '推车擦碰闸门。应先对准门口再推进。'),
    crooked: T('The trolley reached the goal at an angle. Straighten it before the line.', '推车以偏角进入终点区。过线前应摆正。'),
    time: T('Time is up. Turn less and push with both sides longer.', '时间到。减少转向，保持两侧同时推动。'),
  };
  const finish = () => {
    const t = s.t, ts = t.toFixed(1);
    if (s.state === 'won') {
      mode = 'won'; flash = 1; flashCol = C.teal; stars = g.starsFor(lv, t);
      if (auto) {
        const mine = Number(store.get(`trolley-L${lv.id}`)) || 0;
        banner = T('Autopilot arrived', '自动驾驶到达');
        status.textContent = T(`Autopilot reached the goal in ${ts} s.${mine ? ` Your best is ${mine.toFixed(1)} s.` : ' Switch it off and beat that.'}`, `自动驾驶用 ${ts} 秒到达终点。${mine ? `你的最佳是 ${mine.toFixed(1)} 秒。` : '关掉它，试试自己超过这个成绩。'}`);
      } else {
        const bt = best(`trolley-L${lv.id}`, Number(ts)); best(`trolley-L${lv.id}-stars`, stars, false);
        banner = T('Level clear', '过关');
        status.textContent = T(`Level ${lv.id} clear in ${ts} s, ${stars} of 3 stars. Best: ${bt} s.${li < g.LEVELS.length - 1 ? ' Next level unlocked.' : ''}`, `第 ${lv.id} 关通过，用时 ${ts} 秒，${stars} 星（共 3 星）。最佳：${bt} 秒。${li < g.LEVELS.length - 1 ? '下一关已解锁。' : ''}`);
      }
    } else {
      mode = 'lost'; flash = 1; flashCol = C.red; banner = s.why === 'time' ? T('Out of time', '时间到') : T('Crashed', '撞上了');
      status.textContent = failText[s.why ?? 'wall'];
      if (!calm) for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 90; sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, col: i % 2 ? C.red : C.amber }); }
    }
    setLabel(); refreshLevels();
  };

  /* ---- input ---- */
  const releaseAll = () => { held.ka = held.kl = held.pa = held.pl = false; };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'a') held.ka = down; else if (k === 'l') held.kl = down; else return;
    e.preventDefault();
  };
  const kd = onKey(true), ku = onKey(false);
  const onFocusOut = (e: FocusEvent) => { if (!root.contains(e.relatedTarget as Node | null)) releaseAll(); };
  root.addEventListener('keydown', kd); root.addEventListener('keyup', ku); root.addEventListener('focusout', onFocusOut);
  window.addEventListener('blur', releaseAll);

  /* ---- drawing ---- */
  const hex = (h: g.Hex) => { const v = g.hexVerts(h); ctx.beginPath(); v.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  const draw = () => {
    grid(ctx, W, H, 30);
    ctx.fillStyle = '#18323a'; ctx.fillRect(0, 0, W, g.ARENA.wall); ctx.fillRect(0, H - g.ARENA.wall, W, g.ARENA.wall);
    ctx.strokeStyle = '#3d6572'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, g.ARENA.wall); ctx.lineTo(W, g.ARENA.wall); ctx.moveTo(0, H - g.ARENA.wall); ctx.lineTo(W, H - g.ARENA.wall); ctx.stroke();
    const gl = lv.goal;
    ctx.fillStyle = 'rgba(124,224,210,.13)'; ctx.fillRect(gl.x, gl.cy - gl.half, W - gl.x, gl.half * 2);
    ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.strokeRect(gl.x, gl.cy - gl.half, W - gl.x - 3, gl.half * 2); ctx.setLineDash([]);
    ctx.fillStyle = C.teal; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(T('GOAL', '终点'), (gl.x + W) / 2, gl.cy + 5);
    ctx.fillStyle = '#34202a'; ctx.strokeStyle = C.red; ctx.lineWidth = 2;
    for (const h of lv.hexes) { hex(h); ctx.fill(); ctx.stroke(); hex({ ...h, r: h.r * 0.55 }); ctx.stroke(); }
    if (lv.gate) for (const b of g.gateBlocks(lv.gate)) { ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
    ctx.strokeStyle = 'rgba(124,224,210,.28)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    const { hl, hw } = g.BODY;
    ctx.fillStyle = '#2a4a57'; ctx.strokeStyle = mode === 'lost' ? C.red : C.ink; ctx.lineWidth = 2; ctx.fillRect(-hl, -hw, hl * 2, hw * 2); ctx.strokeRect(-hl, -hw, hl * 2, hw * 2);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(hl - 4, 0); ctx.lineTo(hl - 14, -7); ctx.lineTo(hl - 14, 7); ctx.closePath(); ctx.fill();
    for (const [dy, col, p, ch] of [[-12, C.teal, push.a, 'A'], [12, C.amber, push.b, 'L']] as const) {
      ctx.fillStyle = col; ctx.globalAlpha = 0.75; ctx.fillRect(-hl - 20 - p * 0.55, dy - 3, p * 0.55, 6); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(-hl - 10, dy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#06101b'; ctx.font = '700 12px ui-monospace, Menlo, monospace'; ctx.fillText(ch, -hl - 10, dy + 4);
    }
    ctx.restore();
    for (const p of sparks) { ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); } ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.font = '600 14px ui-monospace, Menlo, monospace';
    const late = lv.limit !== undefined && lv.limit - s.t < 3 && mode === 'run';
    ctx.fillStyle = late ? C.red : C.ink;
    ctx.fillText(`${T('Level', 'L')}${lv.id}  ${s.t.toFixed(1)}${lv.limit ? ` / ${lv.limit}` : ''} s`, 8, 16);
    if (flash > 0 && !calm) { ctx.globalAlpha = flash * 0.3; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (mode === 'won' || mode === 'lost') {
      const by = 70;
      ctx.fillStyle = 'rgba(6,16,27,.68)'; ctx.fillRect(W / 2 - 100, by - 30, 200, 66); ctx.strokeStyle = mode === 'won' ? C.teal : C.red; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 100, by - 30, 200, 66);
      ctx.textAlign = 'center'; ctx.fillStyle = mode === 'won' ? C.teal : C.red; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillText(banner, W / 2, by - 4);
      ctx.fillStyle = C.amber; ctx.font = '700 20px system-ui, sans-serif';
      if (mode === 'won' && !auto) ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), W / 2, by + 26);
      else { ctx.fillStyle = C.dim; ctx.font = '600 14px system-ui, sans-serif'; ctx.fillText(mode === 'won' ? `${s.t.toFixed(1)} s` : T('Press Retry', '按“重试”'), W / 2, by + 24); }
    } else if (mode === 'idle') {
      ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = '600 15px system-ui, sans-serif'; ctx.fillText(T('Press Start, then hold A and L', '按“开始”，然后按住 A 和 L'), W / 2, H - 34);
    }
    ctx.textAlign = 'left';
  };

  const L = loop(dt => {
    let ta = held.ka || held.pa ? 100 : 0, tb = held.kl || held.pl ? 100 : 0;
    if (auto && mode === 'run') { const t = g.autoPush(s, lv); ta = t.a; tb = t.b; }
    push = { a: g.slew(push.a, ta, dt), b: g.slew(push.b, tb, dt) };
    if (mode === 'run') {
      s = g.stepTrolley(s, push.a, push.b, dt, lv); trail.push({ x: s.x, y: s.y }); if (trail.length > 320) trail.shift();
      if (s.state !== 'run') finish();
    }
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    sparks = sparks.filter(p => p.life > 0);
    padA.meter.style.width = `${push.a}%`; padL.meter.style.width = `${push.b}%`;
    padA.b.classList.toggle('on', held.ka || held.pa); padL.b.classList.toggle('on', held.kl || held.pl);
    draw();
  });
  refreshLevels();
  return {
    destroy: () => {
      L.stop(); root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); root.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    },
  };
}
