import type { APIRoute } from 'astro';
import en from '../data/en.json';
import { publicationCitations } from '../data/publicationCitations';
import { bibFile } from '../lib/citation';

// Every paper on the home page in one BibTeX file, in the order the page lists them.
export const GET: APIRoute = () => {
  const ids = en.sections.find(s => s.id === 'publications')!.entries.map(e => e.id);
  return new Response(bibFile(ids.map(id => publicationCitations[id])), {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
};
