import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doiOf, plainCitation, bibFile } from '../src/lib/citation.ts';
import { publicationCitations } from '../src/data/publicationCitations.ts';

const page = lang => JSON.parse(readFileSync(new URL(`../src/data/${lang}.json`, import.meta.url), 'utf8'));
const papers = lang => page(lang).sections.find(s => s.id === 'publications').entries;

test('citation: DOI comes from the BibTeX record only', () => {
  assert.equal(doiOf(publicationCitations['neurocomputing-2026']), '10.1016/j.neucom.2026.134973');
  assert.equal(doiOf(publicationCitations['ccc-2026']), undefined);
  assert.equal(doiOf(undefined), undefined);
});

test('citation: English plain text follows the IEEE pattern', () => {
  const ccc = papers('en').find(p => p.id === 'ccc-2026');
  assert.equal(plainCitation(ccc, 'en'),
    'D. Li, Z. Li, H. Ma, C. Cao, and Z. Ding, “Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection,” 45th Chinese Control Conference (CCC 2026), Changsha, China.');
  const nc = papers('en').find(p => p.id === 'neurocomputing-2026');
  assert.match(plainCitation(nc, 'en', doiOf(publicationCitations[nc.id])), /Neurocomputing, vol\. 706, art\. 134973, 2026\. doi: 10\.1016\/j\.neucom\.2026\.134973\.$/);
  assert.equal(plainCitation({ title: 'T', authors: 'A. B, C. D', citation: 'V.' }, 'en'), 'A. B and C. D, “T,” V.');
});

test('citation: every listed paper gives a citation in both languages with nothing invented', () => {
  for (const lang of ['en', 'zh']) for (const p of papers(lang)) {
    const text = plainCitation(p, lang, doiOf(publicationCitations[p.id]));
    assert.ok(text.includes(p.title), `${lang} ${p.id}: title`);
    assert.ok(text.includes(p.citation.replace(/\.$/, '')), `${lang} ${p.id}: venue`);
    for (const name of p.authors.split(', ')) assert.ok(text.includes(name), `${lang} ${p.id}: ${name}`);
    assert.ok(!/undefined|null/.test(text), `${lang} ${p.id}: no empty fields`);
  }
});

test('citation: the .bib file holds every record once', () => {
  const ids = Object.keys(publicationCitations);
  const file = bibFile(ids.map(id => publicationCitations[id]));
  assert.equal((file.match(/^@\w+\{/gm) ?? []).length, ids.length);
  assert.ok(file.endsWith('}\n'));
  for (const p of papers('en')) assert.ok(publicationCitations[p.id], `${p.id} has a BibTeX record`);
});
