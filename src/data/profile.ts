// Shared identity lines for the home page, the CV page and search-engine metadata.
// Facts here repeat what en.json / zh.json already state; change them there first.
import { publicEmail } from './publicLinks.ts';
import type { Language } from './siteTools.ts';

export type Profile = { label: string; href: string };

export const role: Record<Language, string> = {
  en: 'PhD researcher, Electrical and Electronic Engineering, The University of Manchester',
  zh: '曼彻斯特大学电气与电子工程博士研究生',
};

export const siteName: Record<Language, string> = { en: 'Donglin (Dennis) Li', zh: '李栋林（Dennis）' };

/** schema.org Person for search engines. Only facts the pages already show; `profiles` is the home page's contact list. */
export function personSchema(site: URL | undefined, lang: Language, profiles: Profile[]) {
  const url = new URL(lang === 'zh' ? '/zh/' : '/', site).href;
  const manchester = { '@type': 'CollegeOrUniversity', name: 'The University of Manchester', url: 'https://www.manchester.ac.uk/' };
  return {
    '@type': 'Person',
    '@id': new URL('/#person', site).href,
    name: lang === 'zh' ? '李栋林' : 'Donglin Li',
    alternateName: lang === 'zh' ? ['Donglin Li', 'Dennis Li'] : ['Dennis Li', '李栋林'],
    url,
    image: new URL('/images/avatar.jpg', site).href,
    email: 'mailto:' + publicEmail,
    jobTitle: lang === 'zh' ? '博士研究生' : 'PhD Researcher',
    affiliation: manchester,
    alumniOf: manchester,
    knowsAbout: lang === 'zh'
      ? ['贝叶斯对偶控制', '多机器人协同寻源', '控制系统', '自主机器人', '嵌入式系统']
      : ['Bayesian dual control', 'Multi-robot source seeking', 'Control systems', 'Autonomous robotics', 'Embedded systems'],
    sameAs: profiles.map(p => p.href),
  };
}

/** JSON for a <script type="application/ld+json"> block; `<` is escaped so the text cannot close the element. */
export function jsonLd(value: unknown): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...(value as object) }).replace(/</g, '\\u003c');
}
