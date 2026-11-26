import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLatexCvs,
  checkLatexCvs,
  compileLatexDocs,
  escapeLatex,
  renderAllLatexCvs,
  renderLatexCv,
  resolveLatexEngine,
} from '../scripts/build-latex-cv.mjs';
import { role } from '../src/data/profile.ts';
import { entryLinks, publicEmail } from '../src/data/publicLinks.ts';
import { publicationCitations } from '../src/data/publicationCitations.ts';
import { PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';
import { doiOf } from '../src/lib/citation.ts';

const enData = JSON.parse(readFileSync(new URL('../src/data/en.json', import.meta.url), 'utf8'));
const zhData = JSON.parse(readFileSync(new URL('../src/data/zh.json', import.meta.url), 'utf8'));
const scriptPath = fileURLToPath(new URL('../scripts/build-latex-cv.mjs', import.meta.url));
const repoLatexDir = fileURLToPath(new URL('../cv-latex', import.meta.url));

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

function countOccurrences(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function unescapeHref(rawUrl) {
  return rawUrl.replace(/\\([%#])/g, '$1');
}

test('latex-cv: escapeLatex escapes all TeX specials cleanly without double-escaping', () => {
  const input = 'A & B 100% $5 #1 _x {y} \\ ~ ^ → × ° ≤ ≥';
  const escaped = escapeLatex(input);
  assert.equal(
    escaped,
    'A \\& B 100\\% \\$5 \\#1 \\_x \\{y\\} \\textbackslash{} \\textasciitilde{} \\textasciicircum{} \\ensuremath{\\rightarrow} \\ensuremath{\\times} \\ensuremath{^\\circ} \\ensuremath{\\le} \\ensuremath{\\ge}'
  );
  assert.equal(escapeLatex(undefined), '');
  assert.equal(escapeLatex(null), '');
  assert.equal(escapeLatex('a\r\nb'), 'a\nb');
});

test('latex-cv: generation is deterministic and tracked cv-latex/*.tex files have zero drift', () => {
  assert.equal(renderLatexCv('en'), renderLatexCv('en'));
  assert.equal(renderLatexCv('zh'), renderLatexCv('zh'));

  const status = checkLatexCvs(repoLatexDir);
  assert.deepEqual(status.missing, [], `missing files: ${status.missing.join(', ')}`);
  assert.deepEqual(status.drifted, [], `drifted files: ${status.drifted.join(', ')}`);
  assert.equal(status.ok, true);

  execFileSync(process.execPath, [scriptPath, '--check'], { stdio: 'pipe' });
});

test('latex-cv: CLI --out-dir writes matching files and --check detects missing or drifted files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'latex-cv-test-'));
  try {
    execFileSync(process.execPath, [scriptPath, '--out-dir', dir], { stdio: 'pipe' });
    assert.equal(readFileSync(join(dir, 'cv-en.tex'), 'utf8'), renderLatexCv('en'));
    assert.equal(readFileSync(join(dir, 'cv-zh.tex'), 'utf8'), renderLatexCv('zh'));
    execFileSync(process.execPath, [scriptPath, '--check', '--out-dir', dir], { stdio: 'pipe' });

    // Introduce drift
    writeFileSync(join(dir, 'cv-en.tex'), readFileSync(join(dir, 'cv-en.tex'), 'utf8') + '\n% drift\n', 'utf8');
    assert.equal(checkLatexCvs(dir).ok, false);
    assert.deepEqual(checkLatexCvs(dir).drifted, ['cv-en.tex']);
    assert.throws(
      () => execFileSync(process.execPath, [scriptPath, '--check', '--out-dir', dir], { stdio: 'pipe' }),
      /LaTeX CV drift detected/
    );

    // Delete a file -> missing check
    rmSync(join(dir, 'cv-zh.tex'));
    const status = checkLatexCvs(dir);
    assert.equal(status.ok, false);
    assert.deepEqual(status.missing, ['cv-zh.tex']);
    assert.deepEqual(status.drifted, ['cv-en.tex']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('latex-cv: document structure, canonical data coverage, links and privacy boundaries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'latex-cv-build-'));
  const { docs } = buildLatexCvs(dir);
  rmSync(dir, { recursive: true, force: true });

  for (const [filename, lang, data] of [
    ['cv-en.tex', 'en', enData],
    ['cv-zh.tex', 'zh', zhData],
  ]) {
    const tex = docs[filename];
    assert.ok(tex.includes('\\documentclass[10pt,a4paper]{article}'), `${filename}: documentclass`);
    assert.ok(tex.includes('\\begin{document}') && tex.trimEnd().endsWith('\\end{document}'), `${filename}: document bounds`);
    assert.equal(
      countOccurrences(tex, /\\begin\{itemize\}/g),
      countOccurrences(tex, /\\end\{itemize\}/g),
      `${filename}: balanced itemize`
    );
    assert.equal(
      countOccurrences(tex, /\\begin\{enumerate\}/g),
      countOccurrences(tex, /\\end\{enumerate\}/g),
      `${filename}: balanced enumerate`
    );

    // Header, profile & canonical metadata
    assert.ok(tex.includes(escapeLatex(data.name)), `${filename}: name`);
    assert.ok(tex.includes(escapeLatex(role[lang])), `${filename}: role`);
    assert.ok(tex.includes(escapeLatex(data.updated)), `${filename}: updated`);
    assert.ok(tex.includes(escapeLatex(data.headline)), `${filename}: headline`);
    assert.ok(tex.includes(escapeLatex(data.intro)), `${filename}: intro`);
    assert.ok(tex.includes(`\\href{mailto:${publicEmail}}{${publicEmail}}`), `${filename}: public email`);
    assert.ok(tex.includes(`https://donglinli.com/${lang === 'zh' ? 'zh/' : ''}`), `${filename}: canonical home URL`);
    assert.ok(tex.includes(`https://donglinli.com/${lang === 'zh' ? 'zh/' : ''}cv/`), `${filename}: canonical CV URL`);

    // Sections & entries from en.json / zh.json
    for (const secId of ['education', 'research', 'publications', 'employment', 'awards', 'service', 'skills']) {
      const sec = data.sections.find(s => s.id === secId);
      assert.ok(tex.includes(`\\CVSection{${secId}}{${escapeLatex(sec.heading)}}`), `${filename}: section ${secId}`);
      for (const entry of sec.entries) {
        assert.ok(tex.includes(escapeLatex(entry.title)), `${filename}: ${secId} entry ${entry.id} title`);
        if (entry.date) {
          assert.ok(tex.includes(escapeLatex(entry.date)), `${filename}: ${secId} entry ${entry.id} date`);
        }
        for (const bullet of entry.bullets ?? []) {
          assert.ok(tex.includes(escapeLatex(bullet)), `${filename}: ${secId} entry ${entry.id} bullet`);
        }
      }
    }

    // Publications: self-author highlighted + DOI or programme link
    const pubs = data.sections.find(s => s.id === 'publications').entries;
    for (const pub of pubs) {
      const selfToken = lang === 'en' ? '\\textbf{D. Li}' : '\\textbf{Donglin Li}';
      assert.ok(tex.includes(selfToken), `${filename}: self-author bold for ${pub.id}`);
      const doi = doiOf(publicationCitations[pub.id]);
      if (doi) {
        assert.ok(tex.includes(`https://doi.org/${doi}`), `${filename}: DOI link for ${pub.id}`);
      } else if (entryLinks[pub.id]?.href) {
        assert.ok(tex.includes(entryLinks[pub.id].href.replace(/([%#])/g, '\\$1')), `${filename}: escaped programme link for ${pub.id}`);
      }
    }

    // All 8 canonical projects in PROJECTS order
    const items = projectContent(lang);
    let lastPos = -1;
    for (const meta of PROJECTS) {
      const proj = items.find(p => p.id === meta.id);
      const escapedTitle = escapeLatex(proj.title);
      const pos = tex.indexOf(escapedTitle);
      assert.ok(pos > lastPos, `${filename}: project ${meta.id} present in canonical order`);
      lastPos = pos;
      assert.ok(tex.includes(escapeLatex(proj.blurb)), `${filename}: project ${meta.id} blurb`);
      if (proj.part) {
        assert.ok(tex.includes(escapeLatex(proj.part)), `${filename}: project ${meta.id} part`);
      }
      assert.ok(tex.includes(escapeLatex(proj.stack.join(' · '))), `${filename}: project ${meta.id} stack`);
    }

    // Every \href{...} must be mailto:publicEmail or allowlisted https:// with properly escaped %/#
    for (const [, rawUrl] of tex.matchAll(/\\href\{([^}]+)\}\{/g)) {
      assert.ok(!/(?<!\\)[%#]/.test(rawUrl), `${filename}: unescaped % or # in \\href URL ${rawUrl}`);
      const target = unescapeHref(rawUrl);
      if (target.startsWith('mailto:')) {
        assert.equal(target, `mailto:${publicEmail}`, `${filename}: only public email allowed`);
      } else {
        assert.ok(target.startsWith('https://'), `${filename}: non-HTTPS href ${target}`);
        const url = new URL(target);
        assert.ok(ALLOWED_EXTERNAL_HOSTS.has(url.hostname), `${filename}: unexpected host ${url.hostname}`);
      }
    }

    // Strict privacy and placeholder boundaries
    assert.doesNotMatch(tex, /\bundefined\b|\bnull\b|\[object Object\]|\bTODO\b|\bTBD\b/);
    assert.doesNotMatch(tex, /daihaolin201\.github\.io/i);
    assert.doesNotMatch(tex, /@manchester\.ac\.uk|@student\.manchester\.ac\.uk|@outlook\.com|@gmail\.com|@qq\.com|@163\.com/i);
    assert.doesNotMatch(tex, /\+44\s*7|07410|\/Users\/|\/Volumes\//i);
    assert.doesNotMatch(tex, /启德|\bEIC\b|文蓝|奇思|Elsevier|Invited Chapter|世界模型|World Model/i);
  }
});

test('latex-cv: generated cv-en.tex and cv-zh.tex compile cleanly when xelatex is installed', t => {
  const engine = resolveLatexEngine('xelatex');
  if (!engine) {
    t.skip('xelatex not installed in this environment');
    return;
  }
  const results = compileLatexDocs(renderAllLatexCvs(), 'xelatex');
  for (const [name, info] of Object.entries(results)) {
    assert.ok(info.pdfSize > 10000, `${name} produced valid PDF (${info.pdfSize} bytes)`);
    assert.doesNotMatch(info.logText, /Missing character|Overfull \\hbox|Undefined control sequence|LaTeX Error/, `${name} compiled without warnings or errors`);
  }
});
