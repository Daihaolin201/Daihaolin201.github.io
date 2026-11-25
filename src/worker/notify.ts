// Builds the plain-text emails that tell the owner something new has arrived. Pure, so they are unit-tested.
import { categoryLabel } from './feedback.ts';

const b64 = (text: string) => { let bin = ''; for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte); return btoa(bin); };
const encodeWord = (text: string) => `=?UTF-8?B?${b64(text)}?=`;
const wrap = (text: string) => text.replace(/.{1,76}/g, line => line + '\r\n');

function mime(subject: string, text: string, from: string, to: string, now: Date, id: string): string {
  return [
    `From: donglinli.com <${from}>`, `To: <${to}>`, `Subject: ${encodeWord(subject)}`, `Date: ${now.toUTCString()}`,
    `Message-ID: <${id}@${from.split('@')[1]}>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64',
    '', wrap(b64(text)),
  ].join('\r\n');
}

export interface Notice { name: string; contact: string; body: string; wantPublic: boolean; lang: 'en' | 'zh' }

export function buildNotice(n: Notice, from: string, to: string, now: Date, id: string): string {
  const who = n.name || (n.lang === 'zh' ? '匿名访客' : 'Anonymous visitor');
  const subject = `New message on donglinli.com from ${who}`;
  const text = [
    `${who} left a message${n.contact ? ` (contact: ${n.contact})` : ''}${n.wantPublic ? ', and agreed to show it on the wall' : ''}:`,
    '',
    n.body.length > 1200 ? n.body.slice(0, 1200) + '…' : n.body,
    '',
    'Read and reply in the workbench: https://desk.donglinli.com/',
  ].join('\n');
  return mime(subject, text, from, to, now, id);
}

export interface FeedbackNotice { category: string; hasEmail: boolean; mayQuote: boolean }

/** The alert names the topic only: the feedback itself, the name and the email stay in the workbench. */
export function buildFeedbackNotice(n: FeedbackNotice, from: string, to: string, now: Date, id: string): string {
  const topic = categoryLabel(n.category);
  const text = [
    `New PGR feedback. Topic: ${topic}.`,
    `Reply email given: ${n.hasEmail ? 'yes' : 'no'}. May be quoted anonymously: ${n.mayQuote ? 'yes' : 'no'}.`,
    '',
    'Read it in the workbench: https://desk.donglinli.com/#feedback',
  ].join('\n');
  return mime(`[PGR feedback] ${topic}`, text, from, to, now, id);
}
