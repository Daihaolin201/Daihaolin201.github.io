// Plain-text citations built from the same fields the publication list shows, plus the DOI from the BibTeX record.
// English follows the IEEE pattern; Chinese keeps the page's own venue text.
export type PaperFields = { title: string; authors?: string; citation?: string };

export function doiOf(bibtex: string | undefined): string | undefined {
  return bibtex?.match(/^\s*doi\s*=\s*\{([^}]+)\}/m)?.[1].trim();
}

function joinAuthors(names: string[]): string {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return names.join(' and ');
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

export function plainCitation(paper: PaperFields, lang: 'en' | 'zh', doi?: string): string {
  const names = (paper.authors ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const venue = (paper.citation ?? '').trim();
  if (lang === 'zh') {
    const head = [names.join(', '), paper.title].filter(Boolean).join('. ') + '. ';
    return (head + venue + (doi ? ' DOI: ' + doi + '.' : '')).trim();
  }
  const where = venue.replace(/\.$/, '');
  const text = `${joinAuthors(names)}, “${paper.title},” ${where}.`;
  return doi ? `${text} doi: ${doi}.` : text;
}

/** All BibTeX records in one file, in the order given. */
export function bibFile(records: (string | undefined)[]): string {
  return records.filter((r): r is string => !!r).map(r => r.trim()).join('\n\n') + '\n';
}
