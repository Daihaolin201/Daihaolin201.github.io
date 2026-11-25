import { clamp, createChallenge, FIELD, PROBE_LIMIT, type ChallengeResult, type Point, type Probe } from './sourceSearch';

type Phase = 'sampling' | 'guessing' | 'revealed';
const svgNS = 'http://www.w3.org/2000/svg';
function svg(tag: string, attrs: Record<string, string | number>, text?: string) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  if (text) element.textContent = text;
  return element;
}
const moveTo = (p: Point) => `translate(${p.x * 8},${p.y * 8})`;
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

function setup(root: HTMLElement) {
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const zh = root.dataset.lang === 'zh';
  const txt = (en: string, cn: string) => zh ? cn : en;
  const map = get<SVGSVGElement>('[data-probe-map]');
  const cursorMark = get<SVGGElement>('[data-probe-cursor]');
  const sample = get<HTMLButtonElement>('[data-sample]');
  const mark = get<HTMLButtonElement>('[data-mark]');
  const submit = get<HTMLButtonElement>('[data-submit]');
  const resume = get<HTMLButtonElement>('[data-resume]');
  const announce = get('[data-announce]');
  let seed = newSeed();
  let round = createChallenge(seed);
  let phase: Phase = 'sampling';
  let count = 0;
  let cursor = { x: 50, y: 31 };
  let guess: Point | null = null;

  function drawCursor() {
    cursorMark.setAttribute('transform', moveTo(cursor));
    get('[data-cursor-readout]').textContent = `${txt('Cursor', '光标')} (${cursor.x}, ${cursor.y})`;
  }
  function controls() {
    const sampling = phase === 'sampling', guessing = phase === 'guessing';
    sample.hidden = mark.hidden = !sampling;
    mark.disabled = !count;
    submit.hidden = !guessing;
    submit.disabled = !guess;
    resume.hidden = !guessing || count === PROBE_LIMIT;
    get('[data-empty]').hidden = count > 0;
    get('[data-phase]').textContent = sampling ? txt('Sampling', '采样中') : guessing ? txt('Your guess', '猜位置') : txt('Revealed', '已揭晓');
    get('[data-instruction]').textContent = sampling
      ? txt('Tap the field to probe. Higher readings usually mean a closer source. Both players share up to eight readings.', '点击地图采样，读数越高通常离信号源越近。玩家与机器人共用最多八次测量。')
      : guessing ? txt('Mark your guess on the map, then reveal the source to compare distances.', '在地图上标记你猜的位置，提交后比较双方与真实信号源的距离。')
        : txt('The lines connect each estimate to the true source. The shorter line is the closer guess.', '两条线分别连接猜测点与真实位置，线段越短，定位越准。');
    get('[data-probe-count]').textContent = `${count} / ${PROBE_LIMIT}`;
    cursorMark.style.display = phase === 'revealed' ? 'none' : '';
    get('[data-cursor-readout]').hidden = get('#probe-key-help').hidden = phase === 'revealed';
  }
  function setGuess() {
    guess = { ...cursor };
    get('[data-reveal-marks]').replaceChildren(marker(guess, 'human'));
    announce.textContent = txt(`Guess marked at ${guess.x}, ${guess.y}.`, `已标记猜测位置 ${guess.x}，${guess.y}。`);
    controls();
  }
  function marker(point: Point, kind: 'human' | 'robot' | 'source') {
    const stroke = { human: '#ffbb83', robot: '#b0b9ff', source: '#a3f1bc' }[kind];
    const g = svg('g', { transform: moveTo(point), stroke, 'stroke-width': '3', fill: 'none', 'data-mark-kind': kind });
    if (kind === 'human') g.append(svg('path', {d: 'M0 -12 12 0 0 12 -12 0Z'}));
    else if (kind === 'robot') g.append(svg('rect',{x:-8,y:-8,width:16,height:16,rx:1}));
    else g.append(svg('circle',{r:17}), svg('circle',{r:3,fill:stroke}));
    return g;
  }
  function showProbe(reading: Probe) {
    const g = svg('g', { transform: moveTo(reading) });
    const alpha = (.22 + .68 * reading.level / 100).toFixed(2);
    g.append(svg('circle', { r: 13, fill: `rgb(231 181 96 / ${alpha})`, stroke: '#ffdda7', 'stroke-width': 1.5 }));
    g.append(svg('text', { y: 5, 'text-anchor': 'middle', 'font-family': 'ui-monospace,monospace', 'font-size': '14', 'font-weight':700, fill:'#fff' }, String(count)));
    get('[data-probe-pins]').append(g);
    get('[data-level]').textContent = String(reading.level);
    get('[data-meter]').style.width = `${reading.level}%`;
    const li = document.createElement('li');
    const level = document.createElement('b');
    level.textContent = String(reading.level);
    li.append(`#${count} (${reading.x},${reading.y}) · `,level);
    get('[data-probe-log]').append(li);
    announce.textContent = txt(`Probe ${count} at ${reading.x}, ${reading.y}: strength ${reading.level}.`, `第 ${count} 次采样，坐标 ${reading.x}，${reading.y}，强度 ${reading.level}。`);
  }
  function act() {
    if (phase === 'guessing') { setGuess(); return; }
    if (phase !== 'sampling') return;
    const reading = round.probe(cursor);
    if (!reading) return;
    count++;
    showProbe(reading);
    if (count === PROBE_LIMIT) {
      phase = 'guessing';
      announce.textContent += txt(' All eight readings used. Mark your guess.', ' 已用完八次采样，请标记猜测位置。');
    }
    controls();
  }
  function displayResult(result: ChallengeResult) {
    phase = 'revealed';
    const { guess: human, robot, source } = result;
    get('[data-reveal-marks]').replaceChildren(marker(human, 'human'), marker(robot, 'robot'), marker(source, 'source'));
    const lines = get('[data-probe-lines]');
    for (const [from, stroke] of [[human, '#ffbb83'], [robot, '#b0b9ff']] as const) {
      lines.append(svg('line', { x1:from.x*8,y1:from.y*8,x2:source.x*8,y2:source.y*8,stroke,'stroke-width':2,'stroke-dasharray':'6 5' }));
    }
    // Compare the same one-decimal precision shown to the player.
    const humanScore = result.humanError.toFixed(1), robotScore = result.robotError.toFixed(1);
    const winner = Number(humanScore) < Number(robotScore) ? txt('You were closer.', '你猜得更准。') : Number(humanScore) > Number(robotScore) ? txt('The robot was closer.', '机器人猜得更准。') : txt('A tie to the nearest tenth.', '双方误差相同（精确到 0.1）。');
    const units = txt(' units',' 个单位');
    get('[data-winner]').textContent = winner;
    get('[data-human-point]').textContent = `(${human.x}, ${human.y})`;
    get('[data-robot-point]').textContent = `(${robot.x.toFixed(1)}, ${robot.y.toFixed(1)})`;
    get('[data-human-error]').textContent = humanScore + units;
    get('[data-robot-error]').textContent = robotScore + units;
    get('[data-truth]').textContent = `${txt('True source','真实位置')} (${source.x}, ${source.y})`;
    get('[data-reveal-key]').hidden = get('[data-outcome]').hidden = false;
    announce.textContent = `${winner} ${txt('Your error','你的误差')} ${humanScore}${units}, ${txt('robot error','机器人误差')} ${robotScore}${units}.`;
    controls();
    get<HTMLElement>('[data-winner]').focus({ preventScroll: true });
    get('[data-outcome]').scrollIntoView({block:'nearest'});
  }
  function restart(nextSeed: number) {
    seed = nextSeed;
    round = createChallenge(seed);
    count = 0; guess = null; phase = 'sampling'; cursor = {x:50,y:31};
    get('[data-meter]').style.width = '0';
    get('[data-level]').textContent = '—';
    for (const key of ['probe-lines','probe-pins','reveal-marks','probe-log','truth','winner','human-error','robot-error','human-point','robot-point']) get(`[data-${key}]`).replaceChildren();
    get('[data-outcome]').hidden = get('[data-reveal-key]').hidden = true;
    announce.textContent = '';
    drawCursor(); controls();
    map.focus({preventScroll:true});map.scrollIntoView({block:'nearest'});
  }

  map.addEventListener('click', event => {
    if (phase === 'revealed') return;
    const matrix = map.getScreenCTM(); if (!matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    cursor = {x:clamp(Math.round(p.x / 8),0,FIELD.width),y:clamp(Math.round(p.y / 8),0,FIELD.height)};
    drawCursor();act();
  });
  const arrows: Record<string, Point> = { ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowDown:{x:0,y:1},ArrowUp:{x:0,y:-1} };
  map.addEventListener('keydown', event => {
    if (phase === 'revealed') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();if (!event.repeat) act();return;
    }
    const d=arrows[event.key];if (!d) return;
    event.preventDefault();const stride = event.shiftKey ? 5 : 1;
    cursor = {x:clamp(cursor.x + d.x * stride,0,FIELD.width),y:clamp(cursor.y+d.y * stride,0,FIELD.height)};
    drawCursor();
  });
  sample.addEventListener('click',act);
  mark.addEventListener('click',() => { phase='guessing';controls();map.focus(); });
  resume.addEventListener('click',() => {phase='sampling';guess=null;get('[data-reveal-marks]').replaceChildren();controls();map.focus()});
  submit.addEventListener('click',() => { if (phase !== 'guessing' || !guess) return;const result=round.reveal(guess);if(result)displayResult(result); });
  get('[data-replay]').addEventListener('click',()=>restart(seed));
  get('[data-new]').addEventListener('click',()=>restart(newSeed()));
  drawCursor();controls();
}

document.querySelectorAll<HTMLElement>('[data-probe-challenge]').forEach(setup);
