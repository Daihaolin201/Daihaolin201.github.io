// vCard 3.0 for "Save contact". Profile links use Apple's item grouping so each URL keeps its label;
// other address books still read the plain URL lines.
import { publicEmail } from '../data/publicLinks.ts';
import type { Profile } from '../data/profile.ts';

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1');

export function buildVcard(site: URL, profiles: Profile[]): string {
  const links = [
    { label: 'CV', href: new URL('/cv/', site).href },
    ...profiles,
  ];
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Li;Donglin;;;',
    'FN:Donglin (Dennis) Li',
    'NICKNAME:Dennis',
    'ORG:The University of Manchester',
    'TITLE:PhD Researcher',
    `EMAIL;TYPE=INTERNET,WORK:${publicEmail}`,
    `URL:${new URL('/', site).href}`,
    ...links.flatMap((l, i) => [`item${i + 1}.URL:${l.href}`, `item${i + 1}.X-ABLabel:${escape(l.label)}`]),
    'NOTE:李栋林 · Bayesian control and cooperative robotics',
    'END:VCARD',
  ];
  return lines.join('\r\n') + '\r\n';
}
