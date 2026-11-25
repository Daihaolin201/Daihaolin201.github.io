// Loads a mini-game only when its panel opens and tears it down when it closes.
type Game = { destroy(): void };
const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const loaders: Record<string, () => Promise<{ default: (root: HTMLElement, lang: 'en' | 'zh') => Game }>> = {
  'hackabot-2026': () => import('./games/trolley'),
  'hackabot-2025': () => import('./games/maze'),
  'openclaw-2026': () => import('./games/pipeline'),
  'traffic-cones': () => import('./games/cones'),
  'esp-buggy': () => import('./games/buggy'),
  'puzzlethon-2024': () => import('./games/signs'),
  'software-tools-2026': () => import('./games/cluster'),
  'local-workbenches': () => import('./games/week'),
};
const live = new WeakMap<HTMLElement, Game>();
export async function openGame(panel: HTMLElement) {
  const body = panel.querySelector<HTMLElement>('.play-body')!, load = loaders[panel.dataset.game!];
  if (!load || live.has(panel)) return;
  const { default: mount } = await load();
  live.set(panel, mount(body, lang));
}
export function closeGame(panel: HTMLElement) {
  live.get(panel)?.destroy(); live.delete(panel); panel.querySelector<HTMLElement>('.play-body')?.replaceChildren();
}
for (const panel of document.querySelectorAll<HTMLDetailsElement>('details.play[data-game]')) {
  panel.addEventListener('toggle', () => (panel.open ? openGame(panel) : closeGame(panel)));
}
