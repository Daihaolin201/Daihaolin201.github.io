const header = document.querySelector<HTMLElement>('.top-nav')!;
const main = document.querySelector<HTMLElement>('main')!;
const languageLink = document.querySelector<HTMLAnchorElement>('#home-language')!;
const menu = header.querySelector<HTMLElement>('#menu')!;
const toggle = header.querySelector<HTMLButtonElement>('.menu-toggle')!;
const alternatePath = languageLink.pathname;
const mobile = matchMedia('(max-width: 1100px)');
const anchors = [...main.querySelectorAll<HTMLElement>('section[id], article[id]')];

function setMenu(open: boolean) {
  header.toggleAttribute('data-expanded', open);
  toggle.setAttribute('aria-expanded', String(open));
}

function resizeNavigation() {
  const clearance = Math.ceil(header.getBoundingClientRect().bottom) + 12;
  document.documentElement.style.setProperty('--home-nav-clearance', clearance + 'px');
}

header.setAttribute('data-disclosure', '');
toggle.hidden = false;
toggle.addEventListener('click', () => setMenu(!header.hasAttribute('data-expanded')));
menu.addEventListener('click', () => setMenu(false));
document.addEventListener('click', event => {
  if (event.target instanceof Node && !header.contains(event.target)) setMenu(false);
});
header.addEventListener('focusout', event => {
  if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && header.hasAttribute('data-expanded')) {
    setMenu(false);
    toggle.focus();
  }
});
mobile.addEventListener('change', () => setMenu(false));
new ResizeObserver(resizeNavigation).observe(header);
resizeNavigation();

// Choose the content just beneath the fixed menu, including a publication or
// project within a longer section. A fragment from an earlier jump can be stale.
function updateReadingLink() {
  const top = header.getBoundingClientRect().bottom + 14;
  if (window.scrollY < 8 || main.getBoundingClientRect().top > innerHeight) {
    languageLink.href = alternatePath;
    return;
  }
  const line = top + Math.min(105, innerHeight * .13);
  const current = location.hash ? document.getElementById(location.hash.slice(1)) : null;
  // Hold an explicit link at its landing position even if a child starts just below.
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const landing = current ? Math.min(maxScroll, Math.max(0, window.scrollY + current.getBoundingClientRect().top - top)) : -1;
  if (current && anchors.includes(current) && Math.abs(window.scrollY - landing) < 20) {
    languageLink.href = alternatePath + '#' + current.id;
    return;
  }
  if (maxScroll - window.scrollY < 3 && document.getElementById('contact')) {
    languageLink.href = alternatePath + '#contact';
    return;
  }
  let chosen: HTMLElement | undefined;
  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect();
    if (rect.top > line) {
      if (!chosen && rect.top < innerHeight) chosen = anchor;
      break;
    }
    if (rect.bottom >= top) chosen = anchor;
  }
  languageLink.href = chosen ? alternatePath + '#' + chosen.id : alternatePath;
}

const withFragment = document.getElementById(location.hash.slice(1));
if (withFragment && anchors.includes(withFragment)) languageLink.href = alternatePath + location.hash;
for (const event of ['focus', 'pointerenter', 'pointerdown', 'click', 'contextmenu']) {
  languageLink.addEventListener(event, updateReadingLink);
}
window.addEventListener('hashchange', updateReadingLink);
