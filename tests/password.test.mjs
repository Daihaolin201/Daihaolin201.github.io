import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, PASSWORD_ITERATIONS } from '../src/worker/crypto.ts';

test('a stored password verifies and a wrong one does not', async () => {
  const stored = await hashPassword('correct horse battery staple');
  assert.match(stored, /^pbkdf2-sha256\$100000\$[\w-]{22}\$[\w-]{43}$/);
  assert.equal(await verifyPassword('correct horse battery staple', stored), true);
  assert.equal(await verifyPassword('correct horse battery stapl', stored), false);
  assert.equal(await verifyPassword('', stored), false);
});

test('each hash gets its own salt', async () => {
  const [a, b] = await Promise.all([hashPassword('same password here'), hashPassword('same password here')]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('same password here', a), true);
  assert.equal(await verifyPassword('same password here', b), true);
});

test('unicode is normalised, so the same characters typed differently still match', async () => {
  const stored = await hashPassword('café 密码 2026!');
  assert.equal(await verifyPassword('café 密码 2026!', stored), true);
});

test('malformed or tampered records never verify', async () => {
  const stored = await hashPassword('another long password');
  for (const bad of ['', 'plain', stored.replace('pbkdf2-sha256', 'sha1'), stored.replace(/\$100000\$/, `$${PASSWORD_ITERATIONS + 1}$`), stored.replace(/\$100000\$/, '$0$'), stored.split('$').slice(0, 3).join('$')]) {
    assert.equal(await verifyPassword('another long password', bad), false, bad);
  }
});
