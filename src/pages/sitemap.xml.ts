import type { APIRoute } from 'astro';

// Public pages on donglinli.com, each with its other-language twin. The PGR box lives on its own subdomain,
// and /desk/ and /api/ are private, so none of them is listed.
const pairs: [en: string, zh: string][] = [
  ['/', '/zh/'], ['/cv/', '/zh/cv/'], ['/lab/', '/zh/lab/'], ['/pid/', '/zh/pid/'], ['/hi/', '/zh/hi/'], ['/message/', '/zh/message/'], ['/verify/', '/zh/verify/'],
];

export function sitemapXml(site: URL): string {
  const abs = (path: string) => new URL(path, site).href;
  const urls = pairs.flatMap(([en, zh]) => [en, zh].map(loc => [
    '  <url>',
    `    <loc>${abs(loc)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${abs(en)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${abs(zh)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(en)}"/>`,
    '  </url>',
  ].join('\n')));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export const GET: APIRoute = ({ site }) => new Response(sitemapXml(site!), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
