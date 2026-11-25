import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUomPages, renderUomPage } from '../scripts/build-uom.mjs';
import { entryLinks, publicEmail } from '../src/data/publicLinks.ts';
import { publicationCitations } from '../src/data/publicationCitations.ts';
import { PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';
import { doiOf } from '../src/lib/citation.ts';

const enData = JSON.parse(readFileSync(new URL('../src/data/en.json', import.meta.url), 'utf8'));
const zhData = JSON.parse(readFileSync(new URL('../src/data/zh.json', import.meta.url), 'utf8'));

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'donglinli.com',
  'www.manchester.ac.uk',
  'www.se.manchester.ac.uk',
  'orcid.org',
  'scholar.google.com',
  'github.com',
  'www.linkedin.com',
  'doi.org',
  'cms.amss.ac.cn',
  'ifac-sms.org',
  'hackabot-2026.com',
  'uom-robosoc.github.io',
]);

test('uom: CLI --out-dir writes self-contained default.htm and default-zh.htm', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uom-test-'));
  try {
    const scriptPath = fileURLToPath(new URL('../scripts/build-uom.mjs', import.meta.url));
    execFileSync(process.execPath, [scriptPath, '--out-dir', dir], { stdio: 'pipe' });
    const enFile = readFileSync(join(dir, 'default.htm'), 'utf8');
    const zhFile = readFileSync(join(dir, 'default-zh.htm'), 'utf8');
    assert.equal(enFile, renderUomPage('en'));
    assert.equal(zhFile, renderUomPage('zh'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('uom: document structure, inline CSS, Base64 avatar and section anchors are complete', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uom-build-'));
  const { pages } = buildUomPages(dir);
  rmSync(dir, { recursive: true, force: true });
  for (const [filename, lang, data] of [
    ['default.htm', 'en-GB', enData],
    ['default-zh.htm', 'zh-CN', zhData],
  ]) {
    const html = pages[filename];
    assert.ok(html.startsWith(`<!doctype html>\n<html lang="${lang}">`), `${filename}: html lang`);
    assert.ok(html.trimEnd().endsWith('</html>'), `${filename}: closing html`);
    assert.match(html, /<style>:root\s*\{[\s\S]+\}<\/style>/, `${filename}: inline stylesheet`);
    assert.ok(!/<link[^>]+rel="stylesheet"/i.test(html), `${filename}: no external stylesheet`);
    assert.ok(!/<script\b/i.test(html), `${filename}: no script dependency`);
    assert.match(html, /src="data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]{1000,}"/, `${filename}: inline JPEG avatar`);

    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const section of data.sections) {
      assert.ok(ids.has(section.id), `${filename}: section #${section.id} exists`);
    }
    assert.ok(ids.has('content') && ids.has('about') && ids.has('contact'), `${filename}: core landmarks`);

    const pubs = data.sections.find(s => s.id === 'publications').entries;
    for (const pub of pubs) {
      assert.ok(ids.has(pub.id), `${filename}: publication #${pub.id}`);
      assert.ok(html.includes(pub.title), `${filename}: publication title ${pub.id}`);
      const doi = doiOf(publicationCitations[pub.id]);
      if (doi) {
        assert.ok(html.includes(`href="https://doi.org/${doi}"`), `${filename}: DOI link for ${pub.id}`);
      } else if (entryLinks[pub.id]?.href) {
        assert.ok(html.includes(`href="${entryLinks[pub.id].href}"`), `${filename}: programme link for ${pub.id}`);
      }
    }

    const projects = projectContent(lang === 'zh-CN' ? 'zh' : 'en');
    for (const meta of PROJECTS) {
      assert.ok(ids.has(meta.id), `${filename}: project #${meta.id}`);
      const item = projects.find(p => p.id === meta.id);
      assert.ok(html.includes(item.title), `${filename}: project title ${meta.id}`);
    }
  }
});

test('uom: language switcher, public contacts, legal links and strict privacy boundaries', () => {
  const en = renderUomPage('en');
  const zh = renderUomPage('zh');

  assert.match(en, /<a class="lang-btn" href="default-zh\.htm"[^>]*>中文<\/a>/);
  assert.match(zh, /<a class="lang-btn" href="default\.htm"[^>]*>English<\/a>/);

  for (const [label, html] of [['en', en], ['zh', zh]]) {
    assert.ok(html.includes(`mailto:${publicEmail}`), `${label}: mailto public email`);
    assert.ok(html.includes(`>${publicEmail}<`), `${label}: visible public email`);
    assert.ok(html.includes('href="https://donglinli.com/"'), `${label}: canonical homepage`);
    assert.ok(html.includes('href="https://scholar.google.com/citations?user=mBr54wEAAAAJ"'), `${label}: Google Scholar`);
    assert.ok(html.includes('href="https://orcid.org/0009-0007-2130-4862"'), `${label}: ORCID`);
    assert.ok(html.includes('href="https://github.com/Daihaolin201"'), `${label}: GitHub`);

    // Every href and src must be self-contained or an approved external https:// link
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const [, attr, target] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
      if (attr === 'src') {
        assert.match(target, /^data:image\/jpeg;base64,/, `${label}: src must be inline data URI`);
        continue;
      }
      if (target.startsWith('#')) {
        assert.ok(ids.has(target.slice(1)), `${label}: broken anchor ${target}`);
      } else if (target === 'default.htm' || target === 'default-zh.htm') {
        assert.equal(target, label === 'en' ? 'default-zh.htm' : 'default.htm');
      } else if (target.startsWith('mailto:')) {
        assert.equal(target, `mailto:${publicEmail}`, `${label}: only public email allowed`);
      } else {
        assert.ok(target.startsWith('https://'), `${label}: disallowed relative or non-HTTPS link ${target}`);
        const url = new URL(target);
        assert.ok(ALLOWED_EXTERNAL_HOSTS.has(url.hostname), `${label}: unexpected host ${url.hostname} in ${target}`);
        assert.ok(!url.pathname.startsWith('/posts/'), `${label}: no social UGC posts in title links (${target})`);
      }
    }

    // No unresolved placeholders, legacy mirror links, private contacts or unpublished work
    assert.doesNotMatch(html, /\bundefined\b|\bnull\b|\[object Object\]|\{\{|\}\}|\bTODO\b|\bTBD\b/);
    assert.doesNotMatch(html, /daihaolin201\.github\.io/i);
    assert.doesNotMatch(html, /@manchester\.ac\.uk|@student\.manchester\.ac\.uk|@outlook\.com|@gmail\.com|@qq\.com|@163\.com/i);
    assert.doesNotMatch(html, /\+44\s*7|07410|\/Users\/|\/Volumes\//i);
    assert.doesNotMatch(html, /启德|\bEIC\b|文蓝|奇思|Elsevier|Invited Chapter|世界模型|World Model/i);
  }
});
