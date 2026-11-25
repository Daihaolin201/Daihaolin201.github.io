import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildVcard } from '../src/lib/vcard.ts';
import { personSchema, jsonLd } from '../src/data/profile.ts';
import { sitemapXml } from '../src/pages/sitemap.xml.ts';
import { siteTools } from '../src/data/siteTools.ts';

const site = new URL('https://donglinli.com');
const profiles = JSON.parse(readFileSync(new URL('../src/data/en.json', import.meta.url), 'utf8')).contact.profiles;

test('vCard: public address only, CRLF lines, every profile link labelled', () => {
  const card = buildVcard(site, profiles);
  assert.ok(card.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n') && card.endsWith('END:VCARD\r\n'));
  assert.equal(card.split('\r\n').filter(l => l.startsWith('EMAIL')).length, 1);
  assert.match(card, /EMAIL;TYPE=INTERNET,WORK:hello@donglinli\.com\r\n/);
  for (const p of profiles) assert.ok(card.includes('.URL:' + p.href), p.label);
  assert.ok(card.includes('.URL:https://donglinli.com/cv/'));
  assert.ok(!/\n(?!$)[^\r]*\n/.test(card.replace(/\r\n/g, '')), 'no bare LF');
});

test('structured data: a Person with the public facts and no script break-out', () => {
  for (const lang of ['en', 'zh']) {
    const person = personSchema(site, lang, profiles);
    assert.equal(person['@type'], 'Person');
    assert.equal(person.email, 'mailto:hello@donglinli.com');
    assert.deepEqual(person.sameAs, profiles.map(p => p.href));
    assert.equal(person.affiliation.name, 'The University of Manchester');
    assert.ok(Array.isArray(person.knowsAbout) && person.knowsAbout.length >= 4 && person.knowsAbout.length <= 6);
    for (const topic of person.knowsAbout) assert.ok(typeof topic === 'string' && topic.trim().length >= 3);
    assert.ok(!person.knowsAbout.includes('Control') && !person.knowsAbout.includes('控制'));
  }
  const text = jsonLd({ '@type': 'Thing', name: '</script><b>' });
  assert.ok(!text.includes('</'), 'closing tags are escaped');
  assert.equal(JSON.parse(text).name, '</script><b>');
});

test('sitemap: every public page with both languages; private pages left out', () => {
  const xml = sitemapXml(site);
  for (const path of ['/', '/zh/', '/cv/', '/zh/cv/', '/lab/', '/zh/lab/', '/pid/', '/zh/pid/', '/hi/', '/zh/hi/', '/message/', '/zh/message/', '/verify/', '/zh/verify/'])
    assert.ok(xml.includes(`<loc>https://donglinli.com${path}</loc>`), path);
  assert.ok(!/desk|api|pgr/.test(xml));
  assert.equal((xml.match(/<url>/g) ?? []).length, 14);
  assert.match(readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'), /^Sitemap: https:\/\/donglinli\.com\/sitemap\.xml$/m);
});

test('site tools: every name has both languages', () => {
  for (const [key, v] of Object.entries(siteTools)) assert.ok(v.en?.trim() && v.zh?.trim(), key);
});

test('publications.bib headers are defined in both _headers and publications.bib.ts', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.ok(headers.includes('/publications.bib'));
  assert.ok(headers.includes('Content-Type: application/x-bibtex; charset=utf-8'));
  const route = readFileSync(new URL('../src/pages/publications.bib.ts', import.meta.url), 'utf8');
  assert.match(route, /Content-Type.*application\/x-bibtex;\s*charset=utf-8/);
});

