#!/usr/bin/env node
// Build standalone, self-contained bilingual pages (default.htm & default-zh.htm)
// for The University of Manchester personalpages (public_html) service directly
// from the main site's single-source-of-truth data.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { entryLinks, publicEmail } from '../src/data/publicLinks.ts';
import { publicationCitations } from '../src/data/publicationCitations.ts';
import { PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';
import { doiOf } from '../src/lib/citation.ts';

const ROOT_URL = new URL('../', import.meta.url);
const SITE_ORIGIN = 'https://donglinli.com';
const UOM_URL = 'https://www.manchester.ac.uk/';
const ALLOWED_PROJECT_LINK = /^https:\/\/(github\.com\/Daihaolin201\/|hackabot-2026\.com\/|uom-robosoc\.github\.io\/)/;

const UOM_CSS = `
:root {
  --bg-1: #d9ecff;
  --bg-2: #eaf8ff;
  --bg-3: #f6fbff;
  --ink: #0f172a;
  --muted: #334155;
  --glass-edge: rgba(255, 255, 255, 0.76);
  --radius-xl: 28px;
}
* { box-sizing: border-box; }
*, *::before, *::after { animation: none !important; }
html, body {
  margin: 0;
  padding: 0;
  font-family: "SF Pro Display", "Avenir Next", "Helvetica Neue", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: var(--ink);
  background:
    radial-gradient(1200px 700px at 2% -10%, rgba(56, 189, 248, 0.32), transparent 55%),
    radial-gradient(1000px 600px at 95% 8%, rgba(125, 211, 252, 0.28), transparent 56%),
    linear-gradient(155deg, var(--bg-1), var(--bg-2) 48%, var(--bg-3));
  scroll-behavior: auto;
}
body { min-height: 100vh; overflow-x: hidden; position: relative; }
body::before, body::after {
  content: "";
  position: fixed;
  z-index: -2;
  border-radius: 999px;
  filter: blur(10px);
  pointer-events: none;
  opacity: 0.88;
  mix-blend-mode: screen;
}
body::before {
  width: 580px; height: 580px; left: -150px; top: -170px;
  background: radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.5), rgba(147, 197, 253, 0.08));
}
body::after {
  width: 660px; height: 660px; right: -220px; top: 24%;
  background: radial-gradient(circle at 40% 35%, rgba(34, 211, 238, 0.38), rgba(191, 219, 254, 0.06));
}
.grain {
  position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.24;
  background-image: radial-gradient(rgba(255,255,255,0.85) 0.45px, transparent 0.45px);
  background-size: 3px 3px;
}
.ambient {
  position: fixed; inset: auto auto 8% 8%; width: 280px; height: 280px;
  border-radius: 999px; z-index: -2; pointer-events: none;
  background: radial-gradient(circle at center, rgba(56, 189, 248, 0.3), rgba(56, 189, 248, 0));
  filter: blur(16px);
}
.ambient--right {
  inset: 22% 6% auto auto; width: 340px; height: 340px;
  background: radial-gradient(circle at center, rgba(103, 232, 249, 0.26), rgba(103, 232, 249, 0));
}
.container {
  width: min(1180px, calc(100% - 2.2rem));
  margin: 0 auto;
  padding: 1.2rem 0 2.4rem;
  display: grid;
  gap: 1rem;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-areas:
    "nav nav"
    "main aside";
}
.glass {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(132deg, rgba(255,255,255,0.78), rgba(255,255,255,0.38) 40%, rgba(219, 244, 255, 0.32) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.16));
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 52px rgba(16, 58, 94, 0.16),
    0 8px 26px rgba(14, 165, 233, 0.12),
    inset 0 1px 0 rgba(255,255,255,0.8),
    inset 0 -1px 0 rgba(255,255,255,0.36);
  -webkit-backdrop-filter: blur(30px) saturate(160%);
  backdrop-filter: blur(30px) saturate(160%);
}
.top-nav {
  grid-area: nav;
  padding: 0.75rem;
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  box-shadow: 0 12px 34px rgba(8, 47, 73, 0.15), inset 0 1px 0 var(--glass-edge);
}
.brand {
  font-weight: 650;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  padding: 0.5rem 0.8rem;
  border-radius: 14px;
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.68);
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}
.menu a {
  color: var(--ink);
  text-decoration: none;
  font-size: 0.84rem;
  padding: 0.4rem 0.58rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.38);
  border: 1px solid transparent;
  white-space: nowrap;
}
.menu a:hover, .lang-btn:hover {
  border-color: rgba(14,165,233,0.45);
  background: rgba(255,255,255,0.78);
}
.menu a.lang-btn {
  font-weight: 600;
  border-color: rgba(3, 105, 161, 0.26);
  background: rgba(255,255,255,0.6);
}
main { grid-area: main; display: grid; gap: 0.95rem; }
aside { grid-area: aside; }
.section { padding: 1.35rem 1.5rem; }
.eyebrow {
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: #075985;
  margin: 0 0 0.45rem;
}
h1 {
  margin: 0;
  font-size: clamp(1.7rem, 3.1vw, 2.45rem);
  line-height: 1.12;
  letter-spacing: -0.025em;
  background: linear-gradient(110deg, #082f49 8%, #0369a1 52%, #0891b2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
h2 {
  margin: 0 0 0.65rem;
  font-size: 1.28rem;
  letter-spacing: -0.01em;
  display: inline-block;
  padding-bottom: 0.1rem;
  border-bottom: 2px solid rgba(3, 105, 161, 0.2);
}
h3.pub-title { font-size: 1rem; line-height: 1.45; margin: 0; font-weight: 650; color: var(--ink); }
p, li, dd { color: var(--muted); line-height: 1.6; }
a { color: #075985; overflow-wrap: anywhere; text-underline-offset: 0.2em; }
a:hover { color: #0c4a6e; }
.pub-title a { color: inherit; }
.tag-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; }
.tag {
  font-size: 0.78rem;
  padding: 0.4rem 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.72);
  background: linear-gradient(120deg, rgba(255,255,255,0.6), rgba(255,255,255,0.36));
  color: #0f4568;
}
.cta-row { margin-top: 1rem; display: flex; gap: 0.62rem; flex-wrap: wrap; }
.btn {
  text-decoration: none;
  color: #0f172a;
  font-weight: 560;
  font-size: 0.9rem;
  padding: 0.54rem 0.92rem;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.74);
  background: linear-gradient(150deg, rgba(255,255,255,0.9), rgba(255,255,255,0.56));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78), 0 8px 22px rgba(2, 132, 199, 0.13);
}
.btn:hover { background: rgba(255,255,255,0.92); color: #0f172a; }
.pub {
  margin-top: 0.72rem;
  padding: 0.85rem 1rem;
  background: rgba(255,255,255,0.36);
  border: 1px solid rgba(255,255,255,0.78);
  border-radius: 15px;
}
.pub p { margin: 0.3rem 0 0; font-size: 0.88rem; }
.pub .authors, .pub .citation, .pub .stack { font-size: 0.82rem; }
.pub .status { color: #075985; font-size: 0.81rem; font-weight: 600; }
.pub ul { margin: 0.38rem 0 0; padding-left: 1.15rem; font-size: 0.88rem; }
.pub li + li { margin-top: 0.2rem; }
.award-list { list-style: none; padding: 0; margin: 0; }
.award-list li {
  display: grid;
  grid-template-columns: 5.2rem minmax(0, 1fr);
  gap: 0.65rem;
  padding: 0.62rem 0;
  border-bottom: 1px solid rgba(100,116,139,0.16);
  font-size: 0.9rem;
}
.award-list li:last-child { border-bottom: 0; padding-bottom: 0; }
.award-list p { margin: 0.2rem 0 0; font-size: 0.86rem; }
.award-org { color: #475569; font-size: 0.83rem; }
.year { color: #075985; font-size: 0.82rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.skill-list {
  margin: 0.3rem 0 0;
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: 0.55rem 1rem;
  font-size: 0.88rem;
}
.skill-list dt { font-weight: 650; color: var(--ink); }
.skill-list dd { margin: 0; }
.contact p { margin: 0.45rem 0 0; }
.profile {
  position: sticky;
  top: 1.2rem;
  padding: 1.2rem;
  display: grid;
  gap: 0.72rem;
}
.profile h2 { font-size: 1.25rem; margin-bottom: 0.3rem; border-bottom: 0; display: block; }
.profile p { margin: 0.32rem 0; }
.profile .small { font-size: 0.86rem; line-height: 1.5; color: var(--muted); }
.profile .updated { margin-top: 0.45rem; font-size: 0.8rem; text-align: center; }
.avatar-wrap {
  width: 116px; height: 116px; border-radius: 50%; margin: 0 auto; padding: 3px;
  background: linear-gradient(145deg, rgba(14,165,233,0.45), rgba(255,255,255,0.9));
  box-shadow: 0 10px 24px rgba(2,132,199,0.2);
}
.avatar {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; background: #dbeafe;
}
.center { text-align: center; }
.quick { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.quick a {
  text-align: center; text-decoration: none; color: var(--ink); font-size: 0.84rem;
  border-radius: 11px; padding: 0.46rem 0.35rem;
  border: 1px solid rgba(255,255,255,0.68); background: rgba(255,255,255,0.5);
}
.quick a:hover { background: rgba(255,255,255,0.82); }
footer { text-align: center; font-size: 0.78rem; color: #475569; margin-top: 0.25rem; padding-bottom: 0.6rem; }
footer p { margin: 0.25rem 0; }
.skip-link {
  position: absolute; top: -5rem; left: 1rem; z-index: 100;
  padding: 0.7rem 1rem; background: #fff; color: #0f172a;
  border: 2px solid #075985; border-radius: 10px; text-decoration: none;
}
.skip-link:focus { top: 0.6rem; }
:focus-visible { outline: 3px solid #075985; outline-offset: 3px; border-radius: 4px; }
@media (max-width: 940px) {
  .container {
    grid-template-columns: 1fr;
    grid-template-areas: "nav" "aside" "main";
  }
  .profile { position: static; }
}
@media (max-width: 640px) {
  .container { width: min(1180px, calc(100% - 1.1rem)); }
  .section { padding: 1.1rem; }
  .pub { padding: 0.8rem; }
  .award-list li { grid-template-columns: 4.4rem minmax(0, 1fr); }
  .skill-list { grid-template-columns: 1fr; gap: 0.15rem; }
  .skill-list dd { margin-bottom: 0.5rem; }
}
`.trim();

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHttps(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return undefined;
  return url;
}

function titleHtml(label, url) {
  const href = safeHttps(url);
  return href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);
}

function isSelfAuthor(name) {
  return name === 'D. Li' || name === 'Donglin Li';
}

function renderAuthors(authorsStr) {
  return String(authorsStr ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(name => (isSelfAuthor(name) ? `<strong>${esc(name)}</strong>` : esc(name)))
    .join(', ');
}

function projectHref(project) {
  const direct = safeHttps(entryLinks[project.id]?.href);
  if (direct) return direct;
  const candidate = project.links?.find(link => ALLOWED_PROJECT_LINK.test(link.href));
  return safeHttps(candidate?.href);
}

function renderEntryCard(entry) {
  const meta = [entry.organisation, entry.date].filter(Boolean).map(esc).join(' · ');
  const bullets = entry.bullets?.length
    ? `<ul>${entry.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`
    : '';
  return `<article class="pub" id="${esc(entry.id)}">` +
    `<h3 class="pub-title">${titleHtml(entry.title, entryLinks[entry.id]?.href)}</h3>` +
    (meta ? `<p class="citation">${meta}</p>` : '') +
    bullets +
    `</article>`;
}

function renderPublication(entry) {
  const doi = doiOf(publicationCitations[entry.id]);
  const href = doi ? `https://doi.org/${doi}` : entryLinks[entry.id]?.href;
  const statusParts = [entry.organisation, entry.status].filter(Boolean).map(esc);
  if (doi) {
    statusParts.push(`<a href="https://doi.org/${esc(doi)}">DOI: ${esc(doi)}</a>`);
  }
  return `<article class="pub" id="${esc(entry.id)}">\n` +
    `<h3 class="pub-title">${titleHtml(entry.title, href)}</h3>` +
    `<p class="authors">${renderAuthors(entry.authors)}</p>\n` +
    `<p class="citation">${esc(entry.citation)}</p>` +
    `<p class="status">${statusParts.join(' · ')}</p>` +
    `</article>`;
}

function renderProject(project, zh) {
  const meta = [project.context, project.date, project.award, project.role]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  const stackLabel = zh ? '技术栈：' : 'Stack: ';
  return `<article class="pub" id="${esc(project.id)}">` +
    `<h3 class="pub-title">${titleHtml(project.title, projectHref(project))}</h3>` +
    (meta ? `<p class="citation">${meta}</p>` : '') +
    `<p>${esc(project.blurb)}</p>` +
    `<p class="stack"><strong>${stackLabel}</strong>${esc(project.stack.join(' · '))}</p>` +
    `</article>`;
}

export function renderUomPage(lang) {
  const zh = lang === 'zh';
  const page = JSON.parse(readFileSync(new URL(`src/data/${zh ? 'zh' : 'en'}.json`, ROOT_URL), 'utf8'));
  const avatarBase64 = readFileSync(new URL('public/images/avatar-256.jpg', ROOT_URL)).toString('base64');
  const sec = id => {
    const found = page.sections.find(s => s.id === id);
    if (!found) throw new Error(`Missing section "${id}" in ${lang}.json`);
    return found;
  };

  const contentById = new Map(projectContent(lang).map(item => [item.id, item]));
  const orderedProjects = PROJECTS.map(meta => {
    const item = contentById.get(meta.id);
    if (!item) throw new Error(`Missing project content for "${meta.id}" (${lang})`);
    return item;
  });

  const switchHref = zh ? 'default.htm' : 'default-zh.htm';
  const switchLang = zh ? 'en' : 'zh-CN';
  const switchLabel = zh ? 'English' : '中文';
  const homeUrl = zh ? `${SITE_ORIGIN}/zh/` : `${SITE_ORIGIN}/`;

  const navLinks = [
    `<a href="#about">${zh ? '关于' : 'About'}</a>`,
    ...page.menu.map(item => `<a href="${esc(item.href)}">${esc(item.label)}</a>`),
    `<a class="lang-btn" href="${switchHref}" hreflang="${switchLang}" lang="${switchLang}">${switchLabel}</a>`,
  ].join('');

  const affiliationLabel = zh
    ? '电气与电子工程博士研究生'
    : 'PhD researcher in Electrical and Electronic Engineering';

  const quickLinks = [
    `<a href="mailto:${esc(publicEmail)}">${esc(page.emailLabel)}</a>`,
    `<a href="${esc(homeUrl)}">${zh ? '个人网站' : 'Website'}</a>`,
    ...page.quickLinks.map(link => `<a href="${esc(safeHttps(link.href))}">${esc(link.label)}</a>`),
  ].join('');

  const tags = zh
    ? ['贝叶斯估计', '对偶控制', '多机器人协同', '主动寻源']
    : ['Bayesian estimation', 'Dual control', 'Multi-robot systems', 'Active source seeking'];

  const newsHtml = sec('updates').entries.map(entry => {
    const bullets = entry.bullets?.map(b => `<p>${esc(b)}</p>`).join('') ?? '';
    return `<li id="${esc(entry.id)}"><span class="year">${esc(entry.date ?? '')}</span>` +
      `<div><strong>${titleHtml(entry.title, entryLinks[entry.id]?.href)}</strong>${bullets}</div></li>`;
  }).join('\n');

  const researchHtml = sec('research').entries.map(renderEntryCard).join('\n');
  const pubsHtml = sec('publications').entries.map(renderPublication).join('\n');
  const projectsHtml = orderedProjects.map(p => renderProject(p, zh)).join('\n');
  const employmentHtml = sec('employment').entries.map(renderEntryCard).join('\n');
  const educationHtml = sec('education').entries.map(renderEntryCard).join('\n');

  const awardsHtml = sec('awards').entries.map(entry => {
    const org = entry.organisation ? ` <span class="award-org">· ${esc(entry.organisation)}</span>` : '';
    return `<li id="${esc(entry.id)}"><span class="year">${esc(entry.date ?? '')}</span>` +
      `<span>${titleHtml(entry.title, entryLinks[entry.id]?.href)}${org}</span></li>`;
  }).join('\n');

  const serviceHtml = sec('service').entries.map(renderEntryCard).join('\n');
  const skillsHtml = sec('skills').entries.map(entry =>
    `<dt id="${esc(entry.id)}">${esc(entry.title)}</dt><dd>${esc((entry.bullets ?? []).join(' '))}</dd>`
  ).join('\n');

  const profileLinks = page.contact.profiles
    .map(link => `<a href="${esc(safeHttps(link.href))}">${esc(link.label)}</a>`)
    .join(' · ');

  const siteLine = zh
    ? `<a href="${SITE_ORIGIN}/">donglinli.com</a>（<a href="${SITE_ORIGIN}/zh/">中文主页</a>）`
    : `<a href="${SITE_ORIGIN}/">Personal website (donglinli.com)</a>`;

  const disclaimer = zh
    ? '个人学术主页。页面内容不代表曼彻斯特大学的官方立场。'
    : 'Personal academic page. The views expressed here are my own and do not represent The University of Manchester.';

  return `<!doctype html>
<html lang="${zh ? 'zh-CN' : 'en-GB'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(page.intro)}"><meta name="color-scheme" content="light">
<title>${esc(page.name)} | The University of Manchester</title><style>${UOM_CSS}</style></head>
<body><a class="skip-link" href="#content">${esc(page.skip)}</a>
<div class="grain" aria-hidden="true"></div><div class="ambient" aria-hidden="true"></div>
<div class="ambient ambient--right" aria-hidden="true"></div>
<div class="container"><nav class="top-nav glass" aria-label="${esc(page.navLabel)}"><a class="brand" href="#about">${esc(page.name)}</a><div class="menu">${navLinks}</div></nav>
<aside aria-label="${zh ? '个人信息' : 'Profile'}"><section class="profile glass section">
<div class="avatar-wrap"><img class="avatar" src="data:image/jpeg;base64,${avatarBase64}" alt="${esc(page.name)}" width="128" height="128"></div>
<div class="center"><h2>${esc(page.name)}</h2><p class="small">${titleHtml(affiliationLabel, entryLinks.phd?.href)}</p><p class="small"><a href="${UOM_URL}">The University of Manchester</a></p></div>
<div class="quick">${quickLinks}</div>
<p class="small updated">${esc(page.updated)}</p></section></aside>
<main id="content" tabindex="-1">
<section class="section glass" id="about"><p class="eyebrow">${esc(page.subtitle)}</p>
<h1>${esc(page.headline)}</h1>
<p>${esc(page.intro)}</p><div class="tag-row">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
<div class="cta-row"><a class="btn" href="#publications">${esc(sec('publications').heading)}</a><a class="btn" href="#projects">${esc(sec('projects').heading)}</a><a class="btn" href="${esc(homeUrl)}">${zh ? '互动演示与完整主页' : 'Interactive demos & full site'}</a><a class="btn" href="mailto:${esc(publicEmail)}">${zh ? '联系我' : 'Contact me'}</a></div></section>
<section class="section glass" id="updates"><h2>${esc(sec('updates').heading)}</h2><ul class="award-list">${newsHtml}</ul></section>
<section class="section glass" id="research"><h2>${esc(sec('research').heading)}</h2>${researchHtml}</section>
<section class="section glass" id="publications"><h2>${esc(sec('publications').heading)}</h2>${pubsHtml}</section>
<section class="section glass" id="projects"><h2>${esc(sec('projects').heading)}</h2>${projectsHtml}</section>
<section class="section glass" id="employment"><h2>${esc(sec('employment').heading)}</h2>${employmentHtml}</section>
<section class="section glass" id="education"><h2>${esc(sec('education').heading)}</h2>${educationHtml}</section>
<section class="section glass" id="awards"><h2>${esc(sec('awards').heading)}</h2><ul class="award-list">${awardsHtml}</ul></section>
<section class="section glass" id="service"><h2>${esc(sec('service').heading)}</h2>${serviceHtml}</section>
<section class="section glass" id="skills"><h2>${esc(sec('skills').heading)}</h2><dl class="skill-list">${skillsHtml}</dl></section>
<section class="section glass contact" id="contact"><h2>${esc(page.contact.heading)}</h2><p><a href="mailto:${esc(publicEmail)}">${esc(publicEmail)}</a></p>
<p>${siteLine} · ${profileLinks}</p></section>
<footer><p>${esc(page.name)} · ${esc(page.updated)}</p><p>${disclaimer}</p></footer></main></div></body></html>
`;
}

export function buildUomPages(outDir = fileURLToPath(new URL('dist-uom', ROOT_URL))) {
  const targetDir = resolve(outDir);
  mkdirSync(targetDir, { recursive: true });
  const pages = {
    'default.htm': renderUomPage('en'),
    'default-zh.htm': renderUomPage('zh'),
  };
  for (const [filename, html] of Object.entries(pages)) {
    writeFileSync(resolve(targetDir, filename), html, 'utf8');
  }
  return { outDir: targetDir, files: Object.keys(pages), pages };
}

function parseArgs(argv) {
  let outDir;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-dir') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing directory path after --out-dir');
      }
      outDir = resolve(process.cwd(), next);
      i += 1;
    } else if (arg.startsWith('--out-dir=')) {
      const val = arg.slice('--out-dir='.length);
      if (!val) throw new Error('Missing directory path in --out-dir=');
      outDir = resolve(process.cwd(), val);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { outDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { outDir } = parseArgs(process.argv.slice(2));
  const result = buildUomPages(outDir);
  console.log(`Built ${result.files.join(' and ')} in ${result.outDir}`);
}
