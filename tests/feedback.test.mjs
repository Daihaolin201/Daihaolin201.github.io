import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeedback } from '../src/worker/validate.ts';
import { buildFeedbackNotice } from '../src/worker/notify.ts';
import { FEEDBACK_CATEGORIES, feedbackCsv, feedbackMarkdown } from '../src/worker/feedback.ts';

const decode = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\r\n/g, '')), c => c.charCodeAt(0)));

test('feedback needs a known topic and a message; name, email and quoting are optional', () => {
  const ok = parseFeedback({ category: 'facilities', message: '  Desk space\r\n\r\nruns out by 10am.  ', name: '  A   Student ', email: 'a@example.org', quote: true, website: '' });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, { category: 'facilities', body: 'Desk space\n\nruns out by 10am.', name: 'A Student', email: 'a@example.org', mayQuote: true, honeypot: false, spamSignals: [] });
  const anon = parseFeedback({ category: 'other', message: '匿名意见' });
  assert.equal(anon.value.name, ''); assert.equal(anon.value.email, ''); assert.equal(anon.value.mayQuote, false, 'not quotable unless ticked');
  assert.equal(parseFeedback({ message: 'no topic' }).error, 'category');
  assert.equal(parseFeedback({ category: 'constructor', message: 'prototype name' }).error, 'category');
  assert.equal(parseFeedback({ category: 'events', message: ' ' }).error, 'empty');
  assert.equal(parseFeedback({ category: 'events', message: 'x'.repeat(3001) }).error, 'too-long');
  assert.equal(parseFeedback({ category: 'events', message: 'x'.repeat(3000) }).ok, true);
  assert.equal(parseFeedback({ category: 'events', message: 'hello', email: 'not an email' }).error, 'bad-email');
  assert.equal(parseFeedback({ category: 'events', message: 'hello', email: 'a@b.co?cc=x@y.z' }).error, 'bad-email', 'mailto parameters are refused');
  assert.equal(parseFeedback({ category: 'events', message: 'hello', email: 'x%2Cdean%40uni.ac.uk%2Cy@evil.com' }).error, 'bad-email', 'percent escapes could add mailto recipients');
  assert.equal(parseFeedback({ category: 'events', message: 'hello', quote: 'yes' }).value.mayQuote, false, 'only a real true counts');
  assert.equal(parseFeedback({ category: 'events', message: 'hello', website: 'x' }).value.honeypot, true);
  assert.deepEqual(parseFeedback({ category: 'other', message: 'http://a.test http://b.test http://c.test' }).value.spamSignals, ['links']);
  assert.equal(parseFeedback('nope').error, 'format');
});

test('every topic has an English and a Chinese label', () => {
  assert.equal(FEEDBACK_CATEGORIES.length, 6);
  for (const c of FEEDBACK_CATEGORIES) assert.ok(/^[a-z]+$/.test(c.id) && c.en && c.zh, c.id);
});

test('the alert is marked as PGR feedback and carries no feedback text, name or email', () => {
  const raw = buildFeedbackNotice({ category: 'wellbeing', hasEmail: true, mayQuote: false }, 'site@donglinli.com', 'owner@example.org', new Date(Date.UTC(2026, 10, 22)), 'id1');
  const [head, body] = raw.split('\r\n\r\n');
  assert.match(head, /^From: donglinli\.com <site@donglinli\.com>\r\nTo: <owner@example\.org>\r\n/);
  assert.equal(decode(head.match(/Subject: =\?UTF-8\?B\?(.+)\?=/)[1]), '[PGR feedback] Wellbeing');
  const text = decode(body);
  assert.match(text, /Topic: Wellbeing/); assert.match(text, /Reply email given: yes/); assert.match(text, /quoted anonymously: no/); assert.match(text, /https:\/\/desk\.donglinli\.com\/#feedback/);
});

const items = [
  { id: 1, createdAt: Date.UTC(2026, 10, 20, 9, 5), category: 'facilities', body: 'Desk space runs out.\nSecond line.', name: 'Ada', email: 'ada@example.org', mayQuote: true, status: 'new', note: 'Raise at SSLC', handledAt: null },
  { id: 2, createdAt: Date.UTC(2026, 10, 21, 14, 0), category: 'supervision', body: '=HYPERLINK("x")', name: '', email: '', mayQuote: false, status: 'handled', note: '', handledAt: Date.UTC(2026, 10, 22) },
];

test('CSV export neutralises formulas; the anonymous form keeps only month, topic and text', () => {
  const csv = feedbackCsv(items);
  assert.ok(csv.startsWith('﻿id,time,topic,status,may_quote,name,email,feedback,note\r\n'));
  assert.match(csv, /"2","2026-11-21 14:00 UTC","Supervision","handled","false","","","'=HYPERLINK\(""x""\)",""/);
  const anon = feedbackCsv(items.slice(0, 1), true);
  assert.ok(!anon.includes('Ada') && !anon.includes('ada@example.org') && !anon.includes('SSLC') && !anon.includes('09:05'));
  assert.equal(anon, '﻿month,topic,feedback\r\n"2026-11","Facilities and resources","Desk space runs out.\nSecond line."');
});

test('Markdown export groups by topic, quotes each item and shows submitted text literally', () => {
  const md = feedbackMarkdown(items, new Date(Date.UTC(2026, 10, 22, 12)));
  assert.match(md, /^# PGR feedback\n\nExported 2026-11-22 12:00 UTC · 2 items\n/);
  assert.ok(md.indexOf('## Supervision') < md.indexOf('## Facilities and resources'), 'topics follow the fixed order');
  assert.match(md, /### #1 · 2026-11-20 09:05 UTC · new\n\n- From: Ada \(ada@example.org\)\n- May quote anonymously: yes\n- Note: Raise at SSLC\n\n> Desk space runs out.\n> Second line./);
  const anon = feedbackMarkdown(items.slice(0, 1), new Date(0), true);
  assert.match(anon, /^# PGR feedback \(quotable, anonymous\)/);
  assert.ok(!anon.includes('Ada') && !anon.includes('SSLC') && !anon.includes('From:') && !anon.includes('#1') && !anon.includes('09:05'));
  assert.match(anon, /### 2026-11\n\n> Desk space runs out./);
  const hostile = feedbackMarkdown([{ ...items[0], body: '![x](https://evil.test/p.png) <img src=x> # heading [link](https://evil.test)' }], new Date(0), true);
  assert.ok(hostile.includes('> !\\[x\\](https://evil.test/p.png) \\<img src=x\\> \\# heading \\[link\\](https://evil.test)'), hostile);
});
