#!/usr/bin/env node
// Build deterministic, self-contained bilingual LaTeX CVs (cv-en.tex & cv-zh.tex)
// directly from the site's canonical data sources (src/data/*).
// Supports:
//   --out-dir <dir>   Target directory (default: cv-latex/)
//   --check           Verify existing .tex files match generated output (exit 1 on drift)
//   --compile         Run xelatex in a temporary directory to verify compilation

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { role } from '../src/data/profile.ts';
import { entryLinks, publicEmail } from '../src/data/publicLinks.ts';
import { publicationCitations } from '../src/data/publicationCitations.ts';
import { PROJECTS } from '../src/data/projects.ts';
import { projectContent } from '../src/data/projectContent.ts';
import { doiOf } from '../src/lib/citation.ts';

const ROOT_URL = new URL('../', import.meta.url);
const SITE_ORIGIN = 'https://donglinli.com';
const ALLOWED_PROJECT_LINK = /^https:\/\/(github\.com\/Daihaolin201\/|hackabot-2026\.com\/|uom-robosoc\.github\.io\/)/;

const LATEX_REPLACEMENTS = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  '_': '\\_',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '→': '\\ensuremath{\\rightarrow}',
  '×': '\\ensuremath{\\times}',
  '°': '\\ensuremath{^\\circ}',
  '≤': '\\ensuremath{\\le}',
  '≥': '\\ensuremath{\\ge}',
};

export function escapeLatex(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\\{}&%$#_~^→×°≤≥]/g, ch => LATEX_REPLACEMENTS[ch]);
}

export function safeHttps(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return undefined;
  return url;
}

function escapeHrefUrl(url) {
  return String(url).replace(/([%#])/g, '\\$1');
}

function texLink(label, url) {
  const href = safeHttps(url);
  return href ? `\\href{${escapeHrefUrl(href)}}{${escapeLatex(label)}}` : escapeLatex(label);
}

function shortUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function isSelfAuthor(name) {
  return name === 'D. Li' || name === 'Donglin Li';
}

function renderAuthors(authorsStr) {
  return String(authorsStr ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(name => (isSelfAuthor(name) ? `\\textbf{${escapeLatex(name)}}` : escapeLatex(name)))
    .join(', ');
}

function projectHref(project) {
  const direct = safeHttps(entryLinks[project.id]?.href);
  if (direct) return direct;
  const candidate = project.links?.find(link => ALLOWED_PROJECT_LINK.test(link.href));
  return safeHttps(candidate?.href);
}

function renderStandardEntry(entry) {
  const lines = [];
  const titleTex = texLink(entry.title, entryLinks[entry.id]?.href);
  const dateTex = entry.date ? escapeLatex(entry.date) : '';
  const orgTex = entry.organisation ? escapeLatex(entry.organisation) : '';
  lines.push(`\\CVEntry{${titleTex}}{${dateTex}}{${orgTex}}`);
  if (entry.bullets?.length) {
    lines.push('\\begin{itemize}');
    for (const bullet of entry.bullets) {
      lines.push(`  \\item ${escapeLatex(bullet)}`);
    }
    lines.push('\\end{itemize}');
  }
  lines.push('\\CVEntryEnd');
  return lines.join('\n');
}

function renderPublication(entry, zh) {
  const doi = doiOf(publicationCitations[entry.id]);
  const href = doi ? `https://doi.org/${doi}` : entryLinks[entry.id]?.href;
  const titleTex = texLink(entry.title, href);
  const authorsTex = renderAuthors(entry.authors);
  const citationTex = zh ? escapeLatex(entry.citation) : `\\emph{${escapeLatex(entry.citation)}}`;
  const statusParts = [entry.organisation, entry.status].filter(Boolean).map(escapeLatex);
  if (doi) {
    statusParts.push(`\\href{${escapeHrefUrl(`https://doi.org/${doi}`)}}{DOI: ${escapeLatex(doi)}}`);
  }
  return [
    `  \\item ${authorsTex}${zh ? '。' : ', '}${titleTex}${zh ? '。' : ', '}${citationTex}\\\\`,
    `  {\\color{cvmuted}\\fontsize{9.4}{11.5}\\selectfont ${statusParts.join(' \\textbar{} ')}}`,
  ].join('\n');
}

function renderProject(project, zh) {
  const href = projectHref(project);
  const titleTex = texLink(project.title, href);
  const dateTex = project.date ? escapeLatex(project.date) : '';
  const metaParts = [project.context, project.award, project.role].filter(Boolean).map(escapeLatex);
  const metaTex = metaParts.join(' \\textbar{} ');
  const partLabel = zh ? '负责：' : 'My part: ';
  const stackLabel = zh ? '技术栈：' : 'Stack: ';
  const lines = [
    `\\CVEntry{${titleTex}}{${dateTex}}{${metaTex}}`,
    `\\CVText{${escapeLatex(project.blurb)}}`,
  ];
  if (project.part) {
    lines.push(`\\CVText{\\textbf{${escapeLatex(partLabel)}}${escapeLatex(project.part)}}`);
  }
  lines.push(`\\CVMeta{\\textbf{${escapeLatex(stackLabel)}}${escapeLatex(project.stack.join(' · '))}}`);
  lines.push('\\CVEntryEnd');
  return lines.join('\n');
}

function renderAward(entry) {
  const titleTex = texLink(entry.title, entryLinks[entry.id]?.href);
  const orgTex = entry.organisation ? ` {\\color{cvmuted}--- ${escapeLatex(entry.organisation)}}` : '';
  const dateTex = entry.date ? `\\textbf{${escapeLatex(entry.date)}} ` : '';
  return `  \\item ${dateTex}${titleTex}${orgTex}`;
}

export function renderLatexCv(lang) {
  if (lang !== 'en' && lang !== 'zh') {
    throw new Error(`Unsupported language "${lang}". Expected "en" or "zh".`);
  }
  const zh = lang === 'zh';
  const page = JSON.parse(readFileSync(new URL(`src/data/${lang}.json`, ROOT_URL), 'utf8'));
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

  const homeUrl = zh ? `${SITE_ORIGIN}/zh/` : `${SITE_ORIGIN}/`;
  const cvUrl = zh ? `${SITE_ORIGIN}/zh/cv/` : `${SITE_ORIGIN}/cv/`;
  const contactItems = [
    `\\href{mailto:${escapeHrefUrl(publicEmail)}}{${escapeLatex(publicEmail)}}`,
    `\\href{${escapeHrefUrl(homeUrl)}}{${escapeLatex(shortUrl(homeUrl))}}`,
    ...page.contact.profiles.map(p => {
      const href = safeHttps(p.href);
      if (!href) throw new Error(`Unsafe profile link in ${lang}.json: ${p.href}`);
      return `\\href{${escapeHrefUrl(href)}}{${escapeLatex(p.label)}}`;
    }),
  ].join(' \\textbar{} ');

  const profileHeading = zh ? '个人简介' : 'Profile';
  const docTitle = zh ? `简历 — ${page.name}` : `Curriculum Vitae — ${page.name}`;
  const docSubtitle = role[lang];
  const footerCenter = `${zh ? '简历' : 'CV'} \\textbar{} ${escapeLatex(page.updated)}`;

  const fontSetup = zh
    ? [
        '\\usepackage{iftex}',
        '\\ifTUTeX',
        '  \\usepackage{fontspec}',
        '  \\usepackage{xeCJK}',
        '  \\IfFileExists{/System/Library/Fonts/STHeiti Light.ttc}{%',
        '    \\setCJKmainfont{STHeiti Light.ttc}[Path=/System/Library/Fonts/,FontIndex=0,BoldFont=STHeiti Medium.ttc]',
        '    \\setCJKsansfont{STHeiti Light.ttc}[Path=/System/Library/Fonts/,FontIndex=0,BoldFont=STHeiti Medium.ttc]',
        '  }{%',
        '    \\setCJKmainfont{FandolHei-Regular.otf}[BoldFont=FandolHei-Bold.otf]',
        '    \\setCJKsansfont{FandolHei-Regular.otf}[BoldFont=FandolHei-Bold.otf]',
        '  }',
        '  \\XeTeXlinebreaklocale "zh"',
        '  \\XeTeXlinebreakskip=0pt plus 0.5pt',
        '\\else',
        '  \\usepackage[UTF8]{ctex}',
        '\\fi',
      ].join('\n')
    : [
        '\\usepackage{iftex}',
        '\\ifTUTeX',
        '  \\usepackage{fontspec}',
        '\\else',
        '  \\usepackage[T1]{fontenc}',
        '  \\usepackage[utf8]{inputenc}',
        '  \\usepackage{lmodern}',
        '\\fi',
      ].join('\n');

  const educationTex = sec('education').entries.map(renderStandardEntry).join('\n');
  const researchTex = sec('research').entries.map(renderStandardEntry).join('\n');
  const publicationsTex = [
    '\\begin{enumerate}[leftmargin=5.5mm,itemsep=4pt,topsep=2pt,parsep=0pt]',
    ...sec('publications').entries.map(e => renderPublication(e, zh)),
    '\\end{enumerate}',
  ].join('\n');
  const employmentTex = sec('employment').entries.map(renderStandardEntry).join('\n');
  const projectsTex = orderedProjects.map(p => renderProject(p, zh)).join('\n');
  const awardsTex = [
    '\\begin{itemize}[leftmargin=4.5mm,label=\\textbullet,itemsep=2.5pt,topsep=2pt,parsep=0pt]',
    ...sec('awards').entries.map(renderAward),
    '\\end{itemize}',
  ].join('\n');
  const serviceTex = sec('service').entries.map(renderStandardEntry).join('\n');
  const skillsTex = [
    '\\begin{itemize}[leftmargin=4.5mm,label=\\textbullet,itemsep=2.5pt,topsep=2pt,parsep=0pt]',
    ...sec('skills').entries.map(e => `  \\item \\textbf{${escapeLatex(e.title)}${zh ? '：' : ':'}} ${escapeLatex((e.bullets ?? []).join(' '))}`),
    '\\end{itemize}',
  ].join('\n');

  return `% !TEX TS-program = xelatex
% !TEX encoding = UTF-8 Unicode
% AUTO-GENERATED by scripts/build-latex-cv.mjs from canonical site data (src/data/*).
% Do not edit manually; run \`npm run build:latex\` after updating src/data/.
\\documentclass[10pt,a4paper]{article}
\\usepackage[a4paper,left=19mm,right=19mm,top=16mm,bottom=18mm,footskip=9mm]{geometry}
${fontSetup}
\\usepackage{xcolor}
\\definecolor{cvaccent}{HTML}{0E7490}
\\definecolor{cvmuted}{HTML}{475569}
\\usepackage{enumitem}
\\usepackage{needspace}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage[unicode,colorlinks=true,urlcolor=cvaccent,linkcolor=cvaccent,pdfborder={0 0 0}]{hyperref}
\\hypersetup{
  pdftitle={${escapeLatex(docTitle)}},
  pdfauthor={${escapeLatex(page.name)}},
  pdfcreator={scripts/build-latex-cv.mjs}
}
\\urlstyle{same}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlength{\\emergencystretch}{2em}
\\setlength{\\headheight}{13pt}
\\setlength{\\headsep}{3mm}
\\renewcommand{\\baselinestretch}{1.15}
\\raggedbottom
\\widowpenalty=10000
\\clubpenalty=10000
\\displaywidowpenalty=10000
\\setlist[itemize]{leftmargin=4.5mm,label=\\textbullet,itemsep=2pt,topsep=2pt,parsep=0pt,partopsep=0pt}
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\fancyfoot[L]{\\color{cvmuted}\\fontsize{8.3}{10}\\selectfont\\href{${escapeHrefUrl(cvUrl)}}{${escapeLatex(shortUrl(cvUrl))}}}
\\fancyfoot[C]{\\color{cvmuted}\\fontsize{8.3}{10}\\selectfont ${footerCenter}}
\\fancyfoot[R]{\\color{cvmuted}\\fontsize{8.3}{10}\\selectfont\\thepage\\,/\\,\\pageref*{LastPage}}
\\newcommand{\\CVHeader}[3]{%
  {\\fontsize{20}{24}\\selectfont\\bfseries #1\\par}%
  \\vspace{2pt}{\\fontsize{10.5}{13}\\selectfont\\color{cvmuted}#2\\par}%
  \\vspace{4pt}{\\fontsize{9.2}{11.5}\\selectfont #3\\par}%
  \\vspace{6pt}{\\color{cvaccent}\\hrule height 0.8pt}\\vspace{6pt}}
\\newcommand{\\CVSection}[2]{%
  \\Needspace{6\\baselineskip}%
  \\vspace{8pt}\\phantomsection\\pdfbookmark[1]{#2}{sec-#1}%
  {\\fontsize{12}{15}\\selectfont\\bfseries\\color{cvaccent} #2\\par}%
  \\vspace{2pt}{\\color{cvaccent}\\hrule height 0.35pt}\\vspace{5pt}}
\\newcommand{\\CVEntry}[3]{%
  \\Needspace{4\\baselineskip}%
  \\vspace{2pt}\\noindent\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}l r@{}}%
    \\parbox[t]{0.76\\textwidth}{\\raggedright\\textbf{#1}} & {\\color{cvmuted}\\fontsize{9.4}{11.5}\\selectfont #2}%
  \\end{tabular*}\\par
  \\if\\relax\\detokenize{#3}\\relax\\else
    \\vspace{1pt}{\\color{cvmuted}\\fontsize{9.6}{12}\\selectfont #3\\par}%
  \\fi}
\\newcommand{\\CVText}[1]{\\vspace{2pt}{\\fontsize{9.6}{12.5}\\selectfont #1\\par}}
\\newcommand{\\CVMeta}[1]{\\vspace{1.5pt}{\\color{cvmuted}\\fontsize{9.2}{11.5}\\selectfont #1\\par}}
\\newcommand{\\CVEntryEnd}{\\vspace{4pt}}

\\begin{document}
\\CVHeader{${escapeLatex(page.name)}}{${escapeLatex(docSubtitle)}}{${contactItems}}

\\CVSection{profile}{${escapeLatex(profileHeading)}}
\\CVText{\\textbf{${escapeLatex(page.headline)}}}
\\CVText{${escapeLatex(page.intro)}}

\\CVSection{education}{${escapeLatex(sec('education').heading)}}
${educationTex}

\\CVSection{research}{${escapeLatex(sec('research').heading)}}
${researchTex}

\\CVSection{publications}{${escapeLatex(sec('publications').heading)}}
${publicationsTex}

\\CVSection{employment}{${escapeLatex(sec('employment').heading)}}
${employmentTex}

\\CVSection{projects}{${escapeLatex(sec('projects').heading)}}
${projectsTex}

\\CVSection{awards}{${escapeLatex(sec('awards').heading)}}
${awardsTex}

\\CVSection{service}{${escapeLatex(sec('service').heading)}}
${serviceTex}

\\CVSection{skills}{${escapeLatex(sec('skills').heading)}}
${skillsTex}

\\end{document}
`;
}

export function renderAllLatexCvs() {
  return {
    'cv-en.tex': renderLatexCv('en'),
    'cv-zh.tex': renderLatexCv('zh'),
  };
}

export function buildLatexCvs(outDir = fileURLToPath(new URL('cv-latex', ROOT_URL))) {
  const targetDir = resolve(outDir);
  mkdirSync(targetDir, { recursive: true });
  const docs = renderAllLatexCvs();
  for (const [filename, tex] of Object.entries(docs)) {
    writeFileSync(resolve(targetDir, filename), tex, 'utf8');
  }
  return { outDir: targetDir, files: Object.keys(docs), docs };
}

export function checkLatexCvs(outDir = fileURLToPath(new URL('cv-latex', ROOT_URL))) {
  const targetDir = resolve(outDir);
  const docs = renderAllLatexCvs();
  const missing = [];
  const drifted = [];
  for (const [filename, expected] of Object.entries(docs)) {
    const filePath = resolve(targetDir, filename);
    if (!existsSync(filePath)) {
      missing.push(filename);
      continue;
    }
    const actual = readFileSync(filePath, 'utf8');
    if (actual !== expected) {
      drifted.push(filename);
    }
  }
  return {
    ok: missing.length === 0 && drifted.length === 0,
    outDir: targetDir,
    missing,
    drifted,
    docs,
  };
}

export function resolveLatexEngine(preferred = 'xelatex') {
  const candidates = [preferred, `/Library/TeX/texbin/${preferred}`];
  for (const cmd of candidates) {
    if (cmd.includes('/')) {
      if (existsSync(cmd)) return cmd;
      continue;
    }
    try {
      const resolved = execFileSync('which', [cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (resolved) return resolved;
    } catch {
      // Try next candidate
    }
  }
  return null;
}

export function compileLatexDocs(docs = renderAllLatexCvs(), engine = 'xelatex') {
  const bin = resolveLatexEngine(engine);
  if (!bin) {
    throw new Error(`LaTeX engine "${engine}" not found`);
  }
  const workDir = mkdtempSync(join(tmpdir(), 'latex-cv-compile-'));
  const results = {};
  try {
    for (const [filename, content] of Object.entries(docs)) {
      const texPath = join(workDir, filename);
      writeFileSync(texPath, content, 'utf8');
      for (let pass = 1; pass <= 2; pass += 1) {
        execFileSync(bin, ['-interaction=nonstopmode', '-halt-on-error', filename], {
          cwd: workDir,
          stdio: 'pipe',
          encoding: 'utf8',
        });
      }
      const pdfName = filename.replace(/\.tex$/, '.pdf');
      const pdfPath = join(workDir, pdfName);
      const pdfSize = statSync(pdfPath).size;
      const logText = readFileSync(join(workDir, filename.replace(/\.tex$/, '.log')), 'utf8');
      results[filename] = { pdfName, pdfSize, logText };
    }
    return results;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  let outDir;
  let check = false;
  let compile = false;
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
    } else if (arg === '--check') {
      check = true;
    } else if (arg === '--compile') {
      compile = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { outDir, check, compile };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { outDir, check, compile } = parseArgs(process.argv.slice(2));
  if (check) {
    const status = checkLatexCvs(outDir);
    if (!status.ok) {
      const parts = [];
      if (status.missing.length) parts.push(`missing: ${status.missing.join(', ')}`);
      if (status.drifted.length) parts.push(`out of sync: ${status.drifted.join(', ')}`);
      console.error(`LaTeX CV drift detected in ${status.outDir} (${parts.join('; ')}). Run: npm run build:latex`);
      process.exit(1);
    }
    console.log(`LaTeX CVs in ${status.outDir} are up to date (${Object.keys(status.docs).join(', ')})`);
  } else {
    const result = buildLatexCvs(outDir);
    console.log(`Built ${result.files.join(' and ')} in ${result.outDir}`);
  }
  if (compile) {
    const compiled = compileLatexDocs(renderAllLatexCvs(), 'xelatex');
    for (const [name, info] of Object.entries(compiled)) {
      console.log(`Compiled ${name} -> ${info.pdfName} (${info.pdfSize} bytes)`);
    }
  }
}
