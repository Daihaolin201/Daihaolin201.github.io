import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CATEGORIES, TAGS, PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';

const showcase = readFileSync(new URL('../src/components/ProjectShowcase.astro', import.meta.url), 'utf8');
const cvPage = readFileSync(new URL('../src/components/CvPage.astro', import.meta.url), 'utf8');
const writeups = readFileSync(new URL('../src/data/projectContent.ts', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/lib/gamesClient.ts', import.meta.url), 'utf8');
const exists = p => existsSync(new URL(p, import.meta.url));

test('projects: unique ids, one known category, one to three known tags', () => {
  assert.equal(new Set(PROJECTS.map(p => p.id)).size, PROJECTS.length);
  for (const p of PROJECTS) {
    assert.ok(p.cat in CATEGORIES, `${p.id}: unknown or missing category ${p.cat}`);
    assert.ok(Array.isArray(p.tags) && p.tags.length >= 1 && p.tags.length <= 3, `${p.id}: needs 1 to 3 tags`);
    assert.equal(new Set(p.tags).size, p.tags.length, `${p.id}: repeated tag`);
    for (const t of p.tags) assert.ok(t in TAGS, `${p.id}: unknown tag ${t}`);
  }
});

test('projects: every category, tag and the featured reason has both languages', () => {
  for (const v of [...Object.values(CATEGORIES), ...Object.values(TAGS), ...PROJECTS.flatMap(p => (p.featured ? [p.featured] : []))]) {
    assert.ok(v.en?.trim() && v.zh?.trim(), `missing en or zh text: ${JSON.stringify(v)}`);
  }
  for (const t of Object.keys(TAGS)) assert.ok(PROJECTS.some(p => p.tags.includes(t)), `tag ${t} is unused`);
});

test('projects: each project has a write-up and a game', () => {
  for (const { id } of PROJECTS) {
    assert.ok(writeups.includes(`id: '${id}'`), `${id}: no write-up entry in projectContent.ts`);
    assert.ok(showcase.includes(`p.id === '${id}'`), `${id}: no diagram in ProjectShowcase.astro`);
    assert.ok(writeups.includes('game: {'), 'game entries');
    const m = client.match(new RegExp(`'${id}': \\(\\) => import\\('\\./games/([a-z]+)'\\)`));
    assert.ok(m, `${id}: no game loader in gamesClient.ts`);
    assert.ok(exists(`../src/lib/games/${m[1]}.ts`) && exists(`../src/lib/games/${m[1]}.logic.ts`), `${id}: game files missing`);
    assert.ok(exists(`./game-${m[1]}.test.mjs`), `${id}: game rules have no unit test`);
  }
  const entries = [...writeups.matchAll(/^    id: '([a-z0-9-]+)'/gm)].map(m => m[1]);
  assert.deepEqual([...entries].sort(), PROJECTS.map(p => p.id).sort(), 'write-up entries and classification list the same projects');
  assert.equal([...writeups.matchAll(/^    game: \{/gm)].length, PROJECTS.length, 'one game per project');
});

test('projects: featured is a short explicit list', () => {
  const featured = PROJECTS.filter(p => p.featured);
  assert.ok(featured.length >= 1 && featured.length <= 3);
});

test('projects: CvPage sources all 8 projects in both EN and ZH', () => {
  assert.equal(PROJECTS.length, 8);
  assert.match(cvPage, /PROJECTS\.map\(m => content\.find\(c => c\.id === m\.id\)!\)/);
  for (const lang of ['en', 'zh']) {
    const items = projectContent(lang);
    assert.equal(items.length, PROJECTS.length, `${lang} project count`);
    for (const meta of PROJECTS) {
      const item = items.find(c => c.id === meta.id);
      assert.ok(item?.title && item?.context && item?.date && item?.stack?.length, `${lang} ${meta.id} complete for CV`);
    }
  }
});

test('projects: all 8 showcase SVGs share the dark blueprint theme and preserve animation hooks', () => {
  assert.ok(!showcase.includes('#d9e1e8'), 'no legacy flat gray backdrop');
  assert.ok(showcase.includes('data-art="trolley"'), 'trolley animation hook preserved');
  const svgIds = [...showcase.matchAll(/<svg[\s\S]*?<\/svg>/g)];
  assert.equal(svgIds.length, PROJECTS.length, 'one SVG per project');
  const allDomIds = [];
  for (const [idx, [svg]] of svgIds.entries()) {
    assert.ok(svg.includes('class="s1"') || svg.includes('s1"'), `svg ${idx} has stage 1`);
    assert.ok(svg.includes('class="s2"') || svg.includes('s2"'), `svg ${idx} has stage 2`);
    assert.ok(svg.includes('class="s3"') || svg.includes('s3"'), `svg ${idx} has stage 3`);
    assert.ok(svg.includes('data-anim='), `svg ${idx} has animation hooks`);
    for (const m of svg.matchAll(/\bid="([^"]+)"/g)) allDomIds.push(m[1]);
  }
  assert.equal(new Set(allDomIds).size, allDomIds.length, 'SVG element IDs are globally unique across all 8 diagrams');
});
