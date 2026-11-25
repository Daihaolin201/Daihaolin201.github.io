import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotice } from '../src/worker/notify.ts';

const decode = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\r\n/g, '')), c => c.charCodeAt(0)));

test('the alert email is valid MIME and carries the message in UTF-8', () => {
  const raw = buildNotice({ name: '小明', contact: 'xm@example.org', body: '你好！想聊聊合作。'.repeat(3), wantPublic: true, lang: 'zh' }, 'site@notify.donglinli.com', 'owner@example.org', new Date(Date.UTC(2026, 10, 22, 12)), 'abc');
  const [head, body] = raw.split('\r\n\r\n');
  assert.match(head, /^From: donglinli\.com <site@notify\.donglinli\.com>\r\nTo: <owner@example\.org>\r\nSubject: =\?UTF-8\?B\?/);
  assert.match(head, /Message-ID: <abc@notify\.donglinli\.com>/);
  assert.match(head, /Content-Transfer-Encoding: base64/);
  const subject = decode(head.match(/Subject: =\?UTF-8\?B\?(.+)\?=/)[1]);
  assert.equal(subject, 'New message on donglinli.com from 小明');
  const text = decode(body);
  assert.ok(text.includes('你好！想聊聊合作。') && text.includes('xm@example.org') && text.includes('agreed to show it on the wall') && text.includes('https://desk.donglinli.com/'));
  assert.ok(body.split('\r\n').every(line => line.length <= 76), 'base64 lines are wrapped');
});

test('long messages are cut and anonymous senders get a label', () => {
  const text = decode(buildNotice({ name: '', contact: '', body: 'x'.repeat(5000), wantPublic: false, lang: 'en' }, 'a@b.c', 'd@e.f', new Date(0), 'id').split('\r\n\r\n')[1]);
  assert.ok(text.startsWith('Anonymous visitor left a message:'));
  assert.ok(text.length < 1400 && text.includes('…'));
});
