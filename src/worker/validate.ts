import { FEEDBACK_CATEGORY_IDS } from './feedback.ts';

export const LIMITS = { name: 60, contact: 120, body: 2000, reply: 1000, task: 300, note: 20000, feedback: 3000, feedbackNote: 2000 } as const;

const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g;

export function clean(text: unknown, max: number, multiline = false): string {
  if (typeof text !== 'string') return '';
  let value = text.normalize('NFC').replace(/\r\n?/g, '\n').replace(control, '');
  if (!multiline) value = value.replace(/\s+/g, ' ');
  else value = value.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n');
  return [...value.trim()].slice(0, max).join('');
}

export interface MessageInput {
  name: string; contact: string; body: string; wantPublic: boolean; lang: 'en' | 'zh'; honeypot: boolean;
  spamSignals: string[];
}

/** Strict on purpose: the address is put into a mailto: link, so ? & = % and similar must never be accepted (%2C would add recipients). */
const emailPattern = /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const isEmail = (text: string) => emailPattern.test(text);

export function parseMessage(raw: unknown): { ok: true; value: MessageInput } | { ok: false; error: 'empty' | 'too-long' | 'bad-contact' | 'format' } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'format' };
  const input = raw as Record<string, unknown>;
  const rawBody = typeof input.message === 'string' ? input.message : '';
  if ([...rawBody].length > LIMITS.body * 2) return { ok: false, error: 'too-long' };
  const body = clean(rawBody, LIMITS.body, true);
  if ([...body.replace(/\s/g, '')].length < 2) return { ok: false, error: 'empty' };
  if ([...rawBody.trim()].length > LIMITS.body) return { ok: false, error: 'too-long' };
  const contact = clean(input.contact, LIMITS.contact);
  if (contact && /[<>]/.test(contact)) return { ok: false, error: 'bad-contact' };
  return {
    ok: true,
    value: {
      name: clean(input.name, LIMITS.name), contact, body,
      wantPublic: input.public === true,
      lang: input.lang === 'zh' ? 'zh' : 'en',
      honeypot: typeof input.website === 'string' && input.website.trim() !== '',
      spamSignals: spamSignals(body),
    },
  };
}

function spamSignals(body: string): string[] {
  const signals: string[] = [];
  const links = body.match(/(?:https?:\/\/|www\.)\S+/gi) ?? [];
  if (links.length > 2) signals.push('links');
  if (/(.)\1{14,}/u.test(body)) signals.push('repeat');
  if (/\b(?:viagra|casino|crypto\s+invest|loan\s+offer|seo\s+service|backlink)/i.test(body)) signals.push('keywords');
  return signals;
}

export interface FeedbackInput {
  category: string; body: string; name: string; email: string; mayQuote: boolean; honeypot: boolean; spamSignals: string[];
}

/** PGR feedback: a known topic and a message are required; name and email are optional, and the email must be a plain address. */
export function parseFeedback(raw: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: 'category' | 'empty' | 'too-long' | 'bad-email' | 'format' } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'format' };
  const input = raw as Record<string, unknown>;
  const category = typeof input.category === 'string' && FEEDBACK_CATEGORY_IDS.includes(input.category) ? input.category : '';
  if (!category) return { ok: false, error: 'category' };
  const rawBody = typeof input.message === 'string' ? input.message : '';
  if ([...rawBody].length > LIMITS.feedback * 2) return { ok: false, error: 'too-long' };
  const body = clean(rawBody, LIMITS.feedback, true);
  if ([...body.replace(/\s/g, '')].length < 2) return { ok: false, error: 'empty' };
  if ([...rawBody.trim()].length > LIMITS.feedback) return { ok: false, error: 'too-long' };
  const email = clean(input.email, LIMITS.contact);
  if (email && !isEmail(email)) return { ok: false, error: 'bad-email' };
  return {
    ok: true,
    value: {
      category, body, name: clean(input.name, LIMITS.name), email,
      mayQuote: input.quote === true,
      honeypot: typeof input.website === 'string' && input.website.trim() !== '',
      spamSignals: spamSignals(body),
    },
  };
}

export const MESSAGE_STATUSES = ['new', 'read', 'archived', 'spam'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
