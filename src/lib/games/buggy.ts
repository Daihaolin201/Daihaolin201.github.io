import { best, C, el, grid, loop, makeCanvas, slider, store, tr, type Game, type Lang } from './kit';
import * as g from './buggy.logic';

/* ========== ESP buggy: tune the line follower on three tracks ========== */
export default function mount(root: HTMLElement, lang: Lang): Game {
  const W = g.TRACK.w, H = g.TRACK.h;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { cv, ctx } = makeCanvas(W, H, tr(lang, 'Line-following buggy on a track; it animates while a run plays', '小车沿赛道循迹，运行时会播放动画'));
  const names: Record<g.TrackId, string> = { gentle: tr(lang, 'Gentle curves', '缓弯'), sbend: tr(lang, 'S-bends', 'S 弯'), hairpin: tr(lang, 'Hairpin', '发卡弯') };
  const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const savedStars = (id: g.TrackId) => Number(store.get('buggy-stars-' + id)) || 0;

  let track: g.TrackId = 'gentle', kp = 2, kd = 3, speed = 60, note = '';
  let cur: { res: g.LapResult; t: number; track: g.TrackId; speed: number; kp: number; kd: number } | null = null;
  const ghosts = new Map<string, g.LapResult>();
  const history: g.Attempt[] = [];
  let badge = store.get('buggy-badge') === '1', pulse = 0;

  const status = el('p', { class: 'gm-status', 'aria-live': 'polite' });
  const stats = el('p', { class: 'gm-stats' });
  const goal = () => tr(lang, `Goal: finish ${names[track]} in under ${g.timeTarget(track, speed)} s without leaving the line (3 stars). Set Kp and Kd, then run.`, `目标：在 ${g.timeTarget(track, speed)} 秒内跑完“${names[track]}”且不离线（三星）。设定 Kp、Kd 后出发。`);
  status.textContent = goal();

  const tabs = g.TRACK_IDS.map(id => el('button', { class: 'gm-buggy-tab', type: 'button', onclick: () => pick(id) }));
  const tabRow = el('div', { class: 'gm-buggy-tabs', role: 'group', 'aria-label': tr(lang, 'Track', '赛道') }, ...tabs);
  const refreshTabs = () => g.TRACK_IDS.forEach((id, i) => {
    tabs[i].textContent = `${names[id]} ${starText(savedStars(id))}`;
    tabs[i].setAttribute('aria-pressed', String(id === track)); tabs[i].classList.toggle('on', id === track);
  });
  const refreshStats = () => {
    const bt = Number(store.get(`buggy-${track}-${speed}`));
    stats.textContent = (bt ? tr(lang, `Best on ${names[track]} at ${speed} px/s: ${bt} s`, `${names[track]}，${speed} px/s 的最佳：${bt} 秒`) : tr(lang, `No finish yet on ${names[track]} at ${speed} px/s`, `${names[track]}在 ${speed} px/s 下暂无完成记录`))
      + (badge ? ' · ' + tr(lang, '★ One gain set drove all three tracks', '★ 同一组增益跑完了三条赛道') : '');
  };
  const pick = (id: g.TrackId) => { track = id; cur = null; note = ''; skip.disabled = true; status.textContent = goal(); refreshTabs(); refreshStats(); };

  const a = slider('Kp', 0, 12, 0.5, kp, v => { kp = v; }), b = slider('Kd', 0, 8, 0.5, kd, v => { kd = v; });
  const sp = el('select', { 'aria-label': tr(lang, 'Speed', '速度'), onchange: () => { speed = Number(sp.value); if (!cur || cur.t >= cur.res.time) { cur = null; status.textContent = goal(); } refreshStats(); } }, ...g.SPEEDS.map(v => el('option', { value: v, text: `${v} px/s`, selected: v === speed }))) as HTMLSelectElement;
  const setGains = (k: number, d: number) => { kp = k; kd = d; a.input.value = String(k); a.out.textContent = String(k); b.input.value = String(d); b.out.textContent = String(d); };

  const run = () => {
    const res = g.simulateLap(kp, kd, speed, track);
    cur = { res, t: 0, track, speed, kp, kd };
    status.textContent = tr(lang, `Running at Kp ${kp}, Kd ${kd}…`, `运行中：Kp ${kp}，Kd ${kd}……`);
    skip.disabled = false;
  };
  const hint = (label: string, k: number, d: number, why: string) => el('button', { class: 'gm-btn ghost', type: 'button', text: label, onclick: () => { setGains(k, d); run(); note = why + ' '; } });
  const skip = el('button', { class: 'gm-btn ghost', type: 'button', text: tr(lang, 'Skip to result', '跳到结果'), disabled: true, onclick: () => { if (cur && cur.t < cur.res.time) cur.t = cur.res.time - 1e-4; } }) as HTMLButtonElement;
  const startBtn = el('button', { class: 'gm-btn primary', type: 'button', 'data-gm-start': '', text: tr(lang, 'Run lap', '出发'), onclick: () => { note = ''; run(); } });
  const hints = el('div', { class: 'gm-controls', role: 'group', 'aria-label': tr(lang, 'Example gains', '示例参数') },
    el('span', { class: 'gm-buggy-lab', text: tr(lang, 'Example gains:', '示例参数：') }),
    hint(tr(lang, 'Too weak', '太弱'), g.HINTS.weak.kp, g.HINTS.weak.kd, tr(lang, 'Kp 0.5, no Kd: the correction is too small, so the buggy drifts wide on bends.', 'Kp 0.5、没有 Kd：修正量太小，过弯时越走越偏。')),
    hint(tr(lang, 'Too twitchy', '太抖'), g.HINTS.twitchy.kp, g.HINTS.twitchy.kd, tr(lang, 'Kp 8, no Kd: it overcorrects every step and swings across the line.', 'Kp 8、没有 Kd：每一步都修正过头，在线两侧来回摆。')),
    hint(tr(lang, 'Damped', '加阻尼'), g.HINTS.damped.kp, g.HINTS.damped.kd, tr(lang, 'Kp 2, Kd 3: Kd opposes fast changes in the error, so the steering settles.', 'Kp 2、Kd 3：Kd 抑制偏差的快速变化，转向趋于稳定。')));

  const style = el('style', { text: `
.gm-buggy-wrap{display:grid;gap:.6rem}
.gm-buggy-tabs{display:flex;flex-wrap:wrap;gap:.4rem}
.gm-buggy-tab{flex:1 1 110px;min-height:40px;padding:0 .5rem;border-radius:9px;border:1px solid #3c5b6a;background:#0f2130;color:#c9ddea;font:inherit;font-size:.8rem;font-weight:650;cursor:pointer;touch-action:manipulation}
.gm-buggy-tab.on{border-color:#7ce0d2;color:#e9f3fb;background:#12313b}
.gm-buggy-tab:focus-visible{outline:2px solid #7de9ef;outline-offset:2px}
.gm-buggy-lab{font-size:.82rem;color:#9fb8c8}
` });
  root.append(style, el('div', { class: 'gm-buggy-wrap' }, tabRow, cv, el('div', { class: 'gm-controls' }, a.wrap, b.wrap, el('label', { class: 'gm-slider' }, el('span', { text: tr(lang, 'Speed', '速度') }), sp), startBtn, skip), hints, status, stats));
  refreshTabs(); refreshStats();

  const finish = () => {
    if (!cur) return;
    const { res, track: tk, speed: spd } = cur;
    skip.disabled = true;
    history.push({ kp: cur.kp, kd: cur.kd, speed: spd, track: tk, finished: res.finished });
    let msg: string;
    if (res.finished) {
      const s = g.stars(res, tk, spd), tgt = g.timeTarget(tk, spd);
      if (s > savedStars(tk)) store.set('buggy-stars-' + tk, String(s));
      const prev = Number(store.get(`buggy-${tk}-${spd}`));
      const bt = best(`buggy-${tk}-${spd}`, Number(res.time.toFixed(1)));
      const key = `${tk}-${spd}`, old = ghosts.get(key);
      if (!old || res.time < old.time) ghosts.set(key, res);
      const why = res.time > tgt ? tr(lang, `Target ${tgt} s missed.`, `未达到 ${tgt} 秒目标。`) : res.offTime >= 0.05 ? tr(lang, `Under target, but it left the line for ${res.offTime.toFixed(1)} s.`, `时间达标，但离线 ${res.offTime.toFixed(1)} 秒。`) : tr(lang, 'Under target and never off the line.', '时间达标，全程未离线。');
      const nb = !prev || bt < prev ? tr(lang, ' New best.', ' 新纪录。') : '';
      msg = tr(lang, `Finished in ${res.time.toFixed(1)} s. ${starText(s)} ${why}${nb} Best: ${bt} s.`, `用时 ${res.time.toFixed(1)} 秒。${starText(s)} ${why}${nb}最佳：${bt} 秒。`);
      if (!badge && g.allTracksBadge(history)) { badge = true; store.set('buggy-badge', '1'); msg += tr(lang, ' Badge: one gain set has finished all three tracks.', ' 徽章：同一组增益完成全部三条赛道。'); }
    } else {
      const tip = g.diagnose(res) === 'wobble' ? tr(lang, 'Steering oscillates: raise Kd or lower Kp.', '转向左右振荡：增大 Kd 或降低 Kp。') : tr(lang, 'Understeer on bends: raise Kp or lower the speed.', '过弯转向不足：提高 Kp 或降低速度。');
      msg = tr(lang, `Left the line for ${res.offTime.toFixed(1)} s. ${tip}`, `离线 ${res.offTime.toFixed(1)} 秒。${tip}`);
    }
    status.textContent = note + msg; note = '';
    refreshTabs(); refreshStats(); pulse = calm ? 0 : 1;
  };

  const bar = (label: string, x: number, y: number, v: number) => {
    ctx.fillStyle = C.dim; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, x, y + 8);
    ctx.fillStyle = '#1b3442'; ctx.fillRect(x + 44, y, 90, 9);
    ctx.fillStyle = Math.abs(v) > 0.85 ? C.red : C.teal; ctx.fillRect(x + 89 + Math.min(0, v) * 45, y, Math.abs(v) * 45, 9);
    ctx.fillStyle = C.ink; ctx.fillRect(x + 88, y - 2, 2, 13);
  };

  const L = loop(dt => {
    grid(ctx, W, H);
    const shownTrack = cur ? cur.track : track;
    ctx.strokeStyle = '#e8f0f6'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = g.TRACK.x0; x <= g.TRACK.x1; x += 4) (x === g.TRACK.x0 ? ctx.moveTo(x, g.trackY(x, shownTrack)) : ctx.lineTo(x, g.trackY(x, shownTrack))); ctx.stroke();
    ctx.fillStyle = C.teal; ctx.fillRect(g.TRACK.x1 - 2, g.trackY(g.TRACK.x1, shownTrack) - 16, 4, 32);
    ctx.fillStyle = C.dim; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(tr(lang, 'start', '起点'), g.TRACK.x0 - 6, g.trackY(g.TRACK.x0, shownTrack) + 24);
    ctx.textAlign = 'right'; ctx.fillText(tr(lang, 'finish', '终点'), g.TRACK.x1 + 14, g.trackY(g.TRACK.x1, shownTrack) + 30); ctx.textAlign = 'left';
    if (!cur) { ctx.fillStyle = C.ink; ctx.font = '13px system-ui'; ctx.fillText(tr(lang, 'Press Run lap to start', '按“出发”开始'), 16, 24); return; }
    const { res } = cur;
    if (cur.t < res.time) { cur.t += dt; if (cur.t >= res.time) { cur.t = res.time; finish(); } }
    const i = Math.min(res.frames.length - 1, Math.max(0, Math.floor(cur.t * 60)));
    const gh = ghosts.get(`${cur.track}-${cur.speed}`);
    if (gh && gh !== res) {
      ctx.strokeStyle = 'rgba(122,168,255,.35)'; ctx.lineWidth = 2; ctx.beginPath();
      gh.points.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      const f = gh.frames[Math.min(gh.frames.length - 1, i)]; ctx.fillStyle = 'rgba(122,168,255,.6)'; ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 1; k <= i; k++) { const p = res.frames[k], q = res.frames[k - 1]; ctx.strokeStyle = p.off ? C.red : '#4fdc8f'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    const f = res.frames[i];
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.h);
    if (pulse > 0) { ctx.strokeStyle = res.finished ? C.teal : C.red; ctx.globalAlpha = pulse; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 10 + (1 - pulse) * 22, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; pulse = Math.max(0, pulse - dt * 1.4); }
    ctx.fillStyle = '#17323f'; ctx.strokeStyle = f.off ? C.red : C.teal; ctx.lineWidth = 2; ctx.fillRect(-9, -7, 18, 14); ctx.strokeRect(-9, -7, 18, 14);
    for (const s of [-12, -6, 0, 6, 12]) { const lit = Math.abs(-f.seen - s) <= 3; ctx.fillStyle = lit ? C.amber : '#3a4a55'; ctx.beginPath(); ctx.arc(14, -s * 0.9, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(11,24,35,.8)'; ctx.fillRect(W - 150, 8, 142, 52);
    bar(tr(lang, 'error', '偏差'), W - 146, 15, f.seen / 12); bar(tr(lang, 'steer', '转向'), W - 146, 38, f.cmd / 5);
    ctx.fillStyle = C.ink; ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left'; ctx.fillText(`${f.t.toFixed(1)} s`, 14, 22);
  });
  return { destroy: () => L.stop() };
}
