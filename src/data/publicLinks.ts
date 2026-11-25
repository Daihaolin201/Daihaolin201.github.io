export const publicEmail = 'hello@donglinli.com';

type TitleLink = { href: string; en?: string; zh?: string };

const swarm = {
  href: 'https://hackabot-2026.com/live/project-4/',
  en: 'Official 2026 swarm challenge brief',
  zh: '2026 年多机器人协同推车官方赛题',
};
const ccc = {
  href: 'https://cms.amss.ac.cn/conferences/ccc26/program/TuSessions.html#TuA11-4',
  en: 'Paper in the conference programme', zh: '会议日程中的论文',
};
const survey = { href: 'https://doi.org/10.1016/j.neucom.2026.134973' };
const doctoralFund = {
  href: 'https://www.se.manchester.ac.uk/doctoral-academy/support/finance-and-funding/doctoral-training-and-development-support-fund/',
  en: 'University funding scheme',
  zh: '曼彻斯特大学基金说明',
};

export const entryLinks: Record<string, TitleLink | undefined> = {
  'hackabot-2026': swarm,
  'ccc-2026': ccc,
  'latest-ccc-2026': ccc,
  'ifac-2026': {
    href: 'https://ifac-sms.org/conferences/conferences/IFAC26/program/IFAC26_ContentListWeb_4.html#thc04_03',
    en: 'Paper in the official congress programme', zh: '会议官方日程中的论文',
  },
  'neurocomputing-2026': survey,
  'latest-neurocomputing-2026': survey,
  phd: { href: 'https://www.manchester.ac.uk/study/postgraduate-research/programmes/list/04620/phd-electrical-and-electronic-engineering/' },
  dtdsf: doctoralFund,
};
