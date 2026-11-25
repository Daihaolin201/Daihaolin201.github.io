// PGR feedback box: the topic list shared by the page, the workbench and the Worker, and the pure export formatters.
export const FEEDBACK_CATEGORIES = [
  { id: 'supervision', en: 'Supervision', zh: '导师指导' },
  { id: 'teaching', en: 'Training and teaching', zh: '培训与教学' },
  { id: 'facilities', en: 'Facilities and resources', zh: '设施与资源' },
  { id: 'wellbeing', en: 'Wellbeing', zh: '身心健康' },
  { id: 'events', en: 'Events and community', zh: '活动与交流' },
  { id: 'other', en: 'Other', zh: '其他' },
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['id'];
export const FEEDBACK_CATEGORY_IDS: readonly string[] = FEEDBACK_CATEGORIES.map(c => c.id);
export const FEEDBACK_STATUSES = ['new', 'handled', 'spam'] as const;

export const categoryLabel = (id: string, lang: 'en' | 'zh' = 'en') => FEEDBACK_CATEGORIES.find(c => c.id === id)?.[lang] ?? id;

export interface FeedbackItem {
  id: number; createdAt: number; category: string; body: string; name: string; email: string;
  mayQuote: boolean; status: string; note: string; handledAt: number | null;
}

const iso = (t: number) => new Date(t).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const month = (t: number) => new Date(t).toISOString().slice(0, 7); // quotes passed on carry no id or exact time
/** Submitted text is shown literally: no links, images, HTML or headings when a Markdown viewer renders the file. */
const literal = (text: string) => text.replace(/[\\`*_[\]<>#|~]/g, '\\$&');

/** CSV for a spreadsheet. Cells that a spreadsheet would run as a formula get a leading apostrophe. `anonymous` keeps only month, topic and text. */
export function feedbackCsv(items: FeedbackItem[], anonymous = false): string {
  const esc = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const head = anonymous ? ['month', 'topic', 'feedback'] : ['id', 'time', 'topic', 'status', 'may_quote', 'name', 'email', 'feedback', 'note'];
  const lines = items.map(r => (anonymous
    ? [month(r.createdAt), categoryLabel(r.category), r.body]
    : [r.id, iso(r.createdAt), categoryLabel(r.category), r.status, r.mayQuote, r.name, r.email, r.body, r.note]).map(esc).join(','));
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}

/** Markdown grouped by topic, each item as a block quote. `anonymous` keeps only month, topic and text, for passing quotes on. */
export function feedbackMarkdown(items: FeedbackItem[], now: Date, anonymous = false): string {
  const quote = (text: string) => text.split('\n').map(line => '> ' + literal(line)).join('\n');
  const out = [`# PGR feedback${anonymous ? ' (quotable, anonymous)' : ''}`, '', `Exported ${iso(now.getTime())} · ${items.length} item${items.length === 1 ? '' : 's'}`];
  for (const c of FEEDBACK_CATEGORIES) {
    const group = items.filter(r => r.category === c.id);
    if (!group.length) continue;
    out.push('', `## ${c.en}`);
    for (const r of group) {
      out.push('', anonymous ? `### ${month(r.createdAt)}` : `### #${r.id} · ${iso(r.createdAt)} · ${r.status}`, '');
      if (!anonymous) {
        out.push(`- From: ${r.name ? literal(r.name) : 'anonymous'}${r.email ? ` (${literal(r.email)})` : ''}`, `- May quote anonymously: ${r.mayQuote ? 'yes' : 'no'}`);
        if (r.note) out.push(`- Note: ${literal(r.note.replace(/\s*\n\s*/g, ' '))}`);
        out.push('');
      }
      out.push(quote(r.body));
    }
  }
  return out.join('\n') + '\n';
}
