export const siteTools = {
  lab: { en: 'Robot search', zh: '机器人寻源' },
  pid: { en: 'PID challenge', zh: 'PID 调参挑战' },
  hi: { en: 'Contact card', zh: '电子名片' },
  message: { en: 'Leave a message', zh: '留言' },
  pgr: { en: 'PGR feedback', zh: '博士生意见箱' },
  cv: { en: 'CV', zh: '简历' },
  verify: { en: 'Identity verification', zh: '身份核验' },
};

/** Shorter English names for the tool-page header on phones, where the full names would wrap. */
export const navShort: Partial<Record<keyof typeof siteTools, string>> = { pid: 'PID tuning', message: 'Message' };

export type Tool = keyof typeof siteTools;
/** Pages in the tool-page header; the PGR feedback box is reached from the PGR representative entry and the CV from the home page. */
export const navTools: readonly Tool[] = ['lab', 'pid', 'hi', 'message'];
export type Language = 'en' | 'zh';

/** Tools with their own subdomain; the language is chosen in place, never by a path suffix. */
const toolHosts: Partial<Record<Tool, string>> = { pgr: 'https://pgr.donglinli.com' };

export function toolUrl(tool: Tool, lang: Language) {
  const host = toolHosts[tool];
  if (host) return host + '/' + (lang === 'zh' ? '?lang=zh' : '?lang=en');
  return (lang === 'zh' ? '/zh/' : '/') + tool + '/';
}
