import { clamp, FIELD, INITIAL_SOURCE, search, STARTS, type Point, type SearchMode } from './sourceSearch';

type Run = ReturnType<typeof search>;
const svgNamespace = 'http://www.w3.org/2000/svg';
const colors = ['#73e0ef', '#a4b1ff', '#ffb486'];
const modes: SearchMode[] = ['independent', 'shared'];

function makeSvg(tag: string, attributes: Record<string, string>) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function initialise(root: HTMLElement) {
  const zh = root.dataset.lang === 'zh';
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const map = get<SVGSVGElement>('[data-map]');
  const marker = get<SVGGElement>('[data-source]');
  const contours = get<SVGGElement>('[data-contours]');
  const previous = get('[data-previous]');
  const coords = get('[data-coords]');
  const state = get('[data-state]');
  const noise = get<HTMLSelectElement>('[data-noise]');
  const finish = get<HTMLButtonElement>('[data-finish]');
  const shuffle = get<HTMLButtonElement>('[data-shuffle]');
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)');
  const summary = get('[data-summary]');
  const robots = STARTS.map((_, robot) => {
    const group = makeSvg('g', {});
    group.append(makeSvg('circle', { r: '9', fill: '#0a1925', stroke: colors[robot], 'stroke-width': '2' }), makeSvg('circle', { r: '3.5', fill: colors[robot] }));
    get('[data-robots]').append(group);
    return group;
  });
  const makeTraces = (selector: string) => colors.map(color => {
    const trace = makeSvg('polyline', { stroke: color });
    get(selector).append(trace);
    return trace;
  });
  const trails = makeTraces('[data-paths]');
  const ghostTrails = makeTraces('[data-old-paths]');
  let source = { ...INITIAL_SOURCE };
  let seed = 42;
  let history: Partial<Record<SearchMode, Run>> = {};
  let active: { mode: SearchMode; run: Run; startTime: number } | null = null;
  let frame = 0;
  const pos = (point: Point) => `${(point.x * 8).toFixed(1)},${(point.y * 8).toFixed(1)}`;
  const place = (element: Element, point: Point) => element.setAttribute('transform', `translate(${pos(point)})`);
  const points = (path: Point[]) => path.map(pos).join(' ');

  function reset() {
    history = {};
    active = null;
    cancelAnimationFrame(frame);
    previous.hidden = true;
    marker.style.display = '';
    contours.style.display = '';
    summary.textContent = '';
    state.dataset.active = 'false';
    state.textContent = zh ? '待出发' : 'Ready';
    coords.textContent = `${Math.round(source.x)}, ${Math.round(source.y)}`;
    place(marker, source);
    place(contours, source);
    STARTS.forEach((start, i) => {
      place(robots[i], start);
      trails[i].removeAttribute('points');
      ghostTrails[i].removeAttribute('points');
    });
    modes.forEach(mode => { get(`[data-${mode}]`).textContent = '—'; });
  }

  function lock(locked: boolean) {
    noise.disabled = locked;
    shuffle.disabled = locked;
    finish.hidden = !locked;
    modes.forEach(mode => { get<HTMLButtonElement>(`[data-run=${mode}]`).disabled = locked; });
  }

  function paint(run: Run, step: number) {
    run.paths.forEach((path, robot) => {
      place(robots[robot], path[step]);
      trails[robot].setAttribute('points', points(path.slice(0, step + 1)));
    });
  }

  function complete() {
    if (!active) return;
    const { mode, run } = active;
    active = null;
    cancelAnimationFrame(frame);
    paint(run, run.steps);
    history[mode] = run;
    state.textContent = run.foundBy < 0 ? (zh ? '步数用尽' : 'Step limit') : (zh ? '已找到信号源' : 'Source found');
    state.dataset.active = 'false';
    const value = zh ? `${run.steps} 步` : `${run.steps} ${run.steps === 1 ? 'step' : 'steps'}`;
    get(`[data-${mode}]`).textContent = run.foundBy < 0 ? `${value} · ${zh ? '未找到' : 'not found'}` : value;
    summary.textContent = history.independent && history.shared
      ? (zh ? '实线是本轮轨迹，虚线是另一种策略。' : 'Solid lines show this run. Dashes show the other strategy.')
      : (zh ? '切换策略可对比两次轨迹。' : 'Switch strategy to compare the paths.');
    marker.style.display = '';
    contours.style.display = '';
    coords.textContent = `${Math.round(source.x)}, ${Math.round(source.y)}`;
    lock(false);
  }

  function animate(now: number) {
    if (!active) return;
    // The first animation callback can carry a timestamp just before the click.
    const step = Math.max(0, Math.floor((now - active.startTime) / 65));
    if (step >= active.run.steps) return complete();
    paint(active.run, step);
    frame = requestAnimationFrame(animate);
  }

  function start(mode: SearchMode) {
    if (active) return;
    const other = history[mode === 'shared' ? 'independent' : 'shared'];
    previous.hidden = !other;
    ghostTrails.forEach((trail, i) => trail.setAttribute('points', other ? points(other.paths[i]) : ''));
    const run = search(source, Number(noise.value), seed, mode);
    active = { mode, run, startTime: performance.now() };
    lock(true);
    state.textContent = zh ? '搜索中' : 'Searching';
    state.dataset.active = 'true';
    marker.style.display = 'none';
    contours.style.display = 'none';
    coords.textContent = zh ? '已隐藏' : 'Hidden';
    summary.textContent = '';
    paint(run, 0);
    if (behavior.matches || !run.steps) complete();
    else frame = requestAnimationFrame(animate);
  }

  function choose(x: number, y: number) {
    if (active) return;
    source = { x: Math.round(clamp(x, 2, FIELD.width - 2)), y: Math.round(clamp(y, 2, FIELD.height - 2)) };
    reset();
  }
  function placeAtPointer(event: PointerEvent) {
    const rect = map.getBoundingClientRect();
    choose((event.clientX - rect.left) / rect.width * FIELD.width, (event.clientY - rect.top) / rect.height * FIELD.height);
  }
  map.addEventListener('pointerdown', event => {
    if (active || event.button !== 0 || !event.isPrimary) return;
    map.setPointerCapture(event.pointerId);
    placeAtPointer(event);
  });
  map.addEventListener('pointermove', event => {
    if (map.hasPointerCapture(event.pointerId)) placeAtPointer(event);
  });
  const arrows: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, ArrowRight: { x: 1, y: 0 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 } };
  map.addEventListener('keydown', event => {
    const direction = arrows[event.key];
    if (!direction || active) return;
    event.preventDefault();
    const increment = event.shiftKey ? 5 : 1;
    choose(source.x + direction.x * increment, source.y + direction.y * increment);
  });
  noise.addEventListener('change', reset);
  shuffle.addEventListener('click', () => {
    const draw = crypto.getRandomValues(new Uint32Array(3));
    seed = draw[0];
    choose(2 + draw[1] % 97, 2 + draw[2] % 59);
  });
  finish.addEventListener('click', complete);
  modes.forEach(mode => get(`[data-run=${mode}]`).addEventListener('click', () => start(mode)));
  reset();
}

document.querySelectorAll<HTMLElement>('[data-source-lab]').forEach(initialise);
