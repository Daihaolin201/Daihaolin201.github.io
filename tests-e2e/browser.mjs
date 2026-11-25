// Browser walk-through of the message form and the workbench, including a virtual passkey authenticator.
// Needs Playwright: PW=/path/to/playwright/index.mjs node tests-e2e/browser.mjs  (server from tests-e2e/dev.sh)
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PW || 'playwright');
const base = process.env.BASE || 'http://localhost:8787';
const key = process.env.DESK_KEY || 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE';
const shots = process.env.SHOTS || '/tmp/dl-site-shots';
await fs.mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
const watch = page => {
  page.on('pageerror', e => problems.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/status of 401/.test(m.text())) problems.push('console ' + m.text()); }); // the wrong-key attempt is expected to 401
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/desk/login/') && !r.url().includes('/api/desk/state')) problems.push(r.status() + ' ' + r.url()); });
};
const noOverflow = async (page, label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label + ' overflows');

try {
  // ---------- public form, both languages and widths
  for (const [name, w, h] of [['desktop', 1240, 860], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name === 'phone' });
    const page = await ctx.newPage(); watch(page);
    for (const [prefix, lang] of [['/', 'en'], ['/zh/', 'zh']]) {
      await page.goto(`${base}${prefix}message/`);
      await noOverflow(page, `${lang} ${name} message`);
      assert.equal(await page.locator('h1').count(), 1);
      await page.locator('[data-wall] li').first().waitFor();
      await page.getByRole('textbox', { name: /Message|留言内容/ }).fill(`Browser test ${lang} ${name}\nsecond line`);
      await page.locator('input[name=name]').fill('Browser ' + name);
      await page.locator('input[name=contact]').fill('browser@example.org');
      if (lang === 'zh') await page.locator('input[name=public]').check();
      await page.waitForTimeout(1700);
      await page.locator('button[type=submit]').click();
      await page.locator('.status[data-kind=ok]').waitFor({ timeout: 15000 });
      assert.match(await page.locator('.status').innerText(), lang === 'zh' ? /已发送/ : /Message sent/);
      assert.equal(await page.locator('textarea[name=message]').inputValue(), '', 'form resets after sending');
      await page.screenshot({ path: `${shots}/message-${lang}-${name}.png`, fullPage: true });
    }
    // empty message is refused client-side
    await page.goto(`${base}/message/`);
    await page.locator('button[type=submit]').click();
    assert.match(await page.locator('#msg-text-error').innerText(), /Enter a message/, 'the error sits under the field');
    assert.equal(await page.locator('#msg-text').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'msg-text', 'the field with the error gets focus');
    await page.locator('#msg-text').fill('ok');
    assert.equal(await page.locator('#msg-text').getAttribute('aria-invalid'), null, 'typing clears the error');
    assert.equal(await page.locator('#msg-text-error').isVisible(), false);
    // home page links to the message page
    await page.goto(base + '/');
    assert.equal(await page.locator('#contact a[href="/message/"]').count(), 1);

    // PGR feedback box: one submission in English on desktop and one in Chinese on the phone
    for (const [prefix, lang] of [['/', 'en'], ['/zh/', 'zh']]) {
      const en = lang === 'en';
      await page.goto(`${base}${prefix}pgr/`);
      await noOverflow(page, `${lang} ${name} pgr`);
      assert.equal(await page.locator('h1').innerText(), en ? 'PGR feedback' : '博士生意见箱');
      assert.equal(await page.locator('.role h2').innerText(), en ? 'EEE PGR Representative' : 'EEE 博士生代表', 'role wording comes from the profile data');
      assert.equal(await page.locator('input[name=quote]').isChecked(), false, 'quoting is off by default');
      assert.match(await page.locator('.privacy').innerText(), en ? /No IP addresses are kept/ : /不记录 IP 地址/);
      await page.locator('button[type=submit]').click();
      assert.match(await page.locator('#fb-topic-error').innerText(), en ? /Choose a topic/ : /请选择类别/);
      assert.equal(await page.locator('fieldset.topics').getAttribute('aria-invalid'), 'true');
      const sends = (name === 'desktop') === en;
      await page.getByRole('radio', { name: en ? 'Facilities and resources' : '身心健康' }).check();
      await page.getByRole('textbox', { name: en ? 'Feedback' : '意见内容' }).fill(`Browser feedback ${lang} ${name}\nsecond line`);
      if (en) { await page.locator('input[name=name]').fill('Browser ' + name); await page.locator('input[name=quote]').check(); }
      await page.locator('input[name=email]').fill(sends ? 'pgr@example.org' : 'not-an-email');
      await page.waitForTimeout(1700);
      await page.locator('button[type=submit]').click();
      if (sends) {
        await page.locator('.status[data-kind=ok]').waitFor({ timeout: 15000 });
        assert.match(await page.locator('.status').innerText(), en ? /Feedback sent/ : /意见已提交/);
        assert.equal(await page.locator('textarea[name=message]').inputValue(), '', 'form resets after sending');
        assert.equal(await page.locator('input[name=category]:checked').count(), 0);
      } else {
        assert.match(await page.locator('#fb-email-error').innerText(), en ? /valid email/ : /邮箱格式不正确/);
        assert.equal(await page.locator('input[name=email]').getAttribute('aria-invalid'), 'true');
        assert.equal(await page.locator('#fb-topic-error').isVisible(), false, 'picking a topic cleared its error');
      }
      await page.screenshot({ path: `${shots}/pgr-${lang}-${name}.png`, fullPage: true });
      // the PGR representative entry on the home page links to the box
      await page.goto(`${base}${prefix}`);
      assert.equal(await page.locator(`#phd-representative a[href="https://pgr.donglinli.com/?lang=${lang}"]`).count(), 1);
    }
    await ctx.close();
  }

  // ---------- workbench
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 860 } });
  const page = await ctx.newPage(); watch(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

  await page.goto(base + '/desk/');
  await page.getByPlaceholder('访问密钥').waitFor();
  assert.equal(await page.getByRole('button', { name: '用通行密钥登录' }).count(), 0, 'no passkey button before one exists');
  await page.getByPlaceholder('访问密钥').fill('WRONG');
  await page.getByRole('button', { name: '用访问密钥登录' }).click();
  await page.getByText('访问密钥不正确').waitFor();
  await page.screenshot({ path: `${shots}/desk-login.png` });
  await page.getByPlaceholder('访问密钥').fill(key);
  await page.getByRole('button', { name: '用访问密钥登录' }).click();
  await page.locator('.topbar').waitFor();

  // inbox
  await page.locator('.mitem').first().waitFor();
  const total = await page.locator('.mitem').count();
  assert.ok(total >= 4, 'inbox lists the messages sent above, got ' + total);
  assert.match(await page.getByRole('tab', { name: '留言' }).locator('.badge').innerText(), /^\d+$/);
  await page.locator('.mitem', { hasText: 'Browser desktop' }).first().click();
  await page.locator('.detail .body').waitFor();
  assert.match(await page.locator('.detail .body').innerText(), /Browser test/);
  await page.screenshot({ path: `${shots}/desk-inbox.png` });
  // publish the Chinese one, which asked to be public, with a reply
  await page.getByRole('button', { name: '待审核上墙' }).click();
  await page.locator('.mitem').first().click();
  await page.getByRole('button', { name: '放上留言墙' }).click();
  await page.locator('.detail textarea').fill('谢谢你的留言！');
  await page.getByRole('button', { name: '保存回复' }).click();
  await page.getByText('已上墙，回复会公开显示').waitFor();
  // a private message has no publish button
  await page.getByRole('button', { name: '收件箱' }).click();
  await page.locator('.mitem', { hasText: 'Browser test en desktop' }).click();
  await page.getByText('访客选择不公开').waitFor();
  assert.equal(await page.getByRole('button', { name: /放上留言墙/ }).count(), 0);
  // keyboard
  await page.keyboard.press('s');
  await page.locator('.tag', { hasText: '★' }).first().waitFor();

  // PGR feedback panel: filter, mark handled, private note, export
  const fbTab = page.getByRole('tab', { name: /意见箱/ });
  await fbTab.click();
  await page.locator('.mitem').first().waitFor();
  assert.equal(await page.locator('.mitem').count(), 2, 'the two submissions from the feedback page');
  assert.equal(await fbTab.locator('.badge').innerText(), '2');
  await page.getByLabel('类别').selectOption('wellbeing');
  await page.waitForFunction(() => document.querySelectorAll('.mitem').length === 1);
  assert.match(await page.locator('.mitem').innerText(), /匿名/);
  await page.getByLabel('类别').selectOption('');
  await page.locator('.mitem', { hasText: 'Browser desktop' }).click();
  await page.locator('.detail .body').waitFor();
  assert.match(await page.locator('.detail .body').innerText(), /Browser feedback en desktop/);
  await page.locator('.detail .meta').getByText('允许匿名引用', { exact: true }).waitFor();
  assert.match(await page.getByRole('link', { name: '用邮件回复' }).getAttribute('href'), /^mailto:pgr@example\.org\?subject=Re%3A%20PGR%20feedback/);
  await page.getByRole('button', { name: '标为已处理' }).click();
  await page.getByRole('button', { name: '改回待处理' }).waitFor();
  assert.equal(await page.locator('.mitem').count(), 1, 'handled items leave the default list');
  assert.equal(await fbTab.locator('.badge').innerText(), '1');
  await page.getByLabel('私人备注').fill('Raised at the staff-student meeting');
  await page.getByRole('button', { name: '保存备注' }).click();
  await page.getByText('备注已保存').waitFor();
  await page.getByRole('button', { name: /^已处理/ }).click();
  await page.locator('.mitem .tag', { hasText: '有备注' }).waitFor();
  const saved = async label => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label }).click()]);
    return { name: download.suggestedFilename(), text: await fs.readFile(await download.path(), 'utf8') };
  };
  await page.getByRole('button', { name: '全部', exact: false }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('.mitem').length === 2);
  const csv = await saved('导出 CSV');
  assert.equal(csv.name, 'pgr-feedback.csv'); assert.match(csv.text, /staff-student meeting/); assert.match(csv.text, /Browser feedback zh phone/);
  const quotable = await saved('导出可引用内容');
  assert.equal(quotable.name, 'pgr-feedback-quotable.md');
  assert.match(quotable.text, /Browser feedback en desktop/);
  assert.ok(!quotable.text.includes('zh phone') && !quotable.text.includes('pgr@example.org') && !quotable.text.includes('staff-student'), 'only quotable text, no contact or note');
  await page.screenshot({ path: `${shots}/desk-feedback.png` });
  await page.getByRole('tab', { name: '留言' }).click();
  await page.locator('.mitem').first().waitFor();

  // tasks and note
  await page.getByRole('tab', { name: '待办' }).click();
  await page.getByLabel('新待办').fill('回复审稿意见');
  await page.getByLabel('新待办').press('Enter');
  await page.getByText('回复审稿意见').waitFor();
  await page.getByLabel('完成').first().check();
  await page.getByRole('button', { name: '清除已完成' }).click();
  await page.getByText('没有待办').waitFor();
  await page.getByRole('tab', { name: '便签' }).click();
  await page.getByLabel('便签').fill('line one\nline two');
  await page.getByText(/已保存/).waitFor();

  // passkey registration and login
  await page.getByRole('tab', { name: '设置' }).click();
  await page.getByText('暂无通行密钥').waitFor();
  await page.getByRole('button', { name: '添加通行密钥' }).click();
  await page.getByText('已添加').waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${shots}/desk-settings.png`, fullPage: true });
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await page.getByRole('button', { name: '用通行密钥登录' }).waitFor();
  await page.getByRole('button', { name: '用通行密钥登录' }).click();
  await page.locator('.topbar').waitFor({ timeout: 10000 });
  await page.reload();
  await page.locator('.topbar').waitFor();
  assert.equal(new URL(page.url()).hash, '#settings');

  // the wall now shows the approved message with its reply, but not the contact
  const pub = await ctx.newPage(); watch(pub);
  await pub.goto(base + '/zh/message/');
  await pub.locator('.wall-list .reply').waitFor();
  const wall = await pub.locator('.wall-list').innerText();
  assert.match(wall, /谢谢你的留言/);
  assert.ok(!wall.includes('browser@example.org'));
  assert.equal(await pub.locator('.wall-list .reply').evaluate(el => getComputedStyle(el).borderLeftWidth), '3px', 'wall items are styled although they are created by script');
  await pub.screenshot({ path: `${shots}/message-wall.png`, fullPage: true });

  // phone layout of the workbench
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const pp = await phone.newPage(); watch(pp);
  await pp.goto(base + '/desk/');
  await pp.getByText('改用访问密钥').click(); // a passkey exists now, so the key form is tucked away
  await pp.getByPlaceholder('访问密钥').fill(key);
  await pp.getByRole('button', { name: '用访问密钥登录' }).click();
  await pp.locator('.mitem').first().waitFor();
  await noOverflow(pp, 'desk phone inbox');
  await pp.screenshot({ path: `${shots}/desk-phone-list.png` });
  await pp.locator('.mitem').first().click();
  await pp.locator('.detail .body').waitFor();
  await noOverflow(pp, 'desk phone detail');
  await pp.screenshot({ path: `${shots}/desk-phone-detail.png` });
  await pp.getByRole('tab', { name: /意见箱/ }).click();
  await pp.getByRole('button', { name: /^全部/ }).click();
  await pp.locator('.mitem').first().waitFor();
  await noOverflow(pp, 'desk phone feedback list');
  await pp.screenshot({ path: `${shots}/desk-phone-feedback-list.png` });
  await pp.locator('.mitem').first().click();
  await pp.locator('.detail .body').waitFor();
  await noOverflow(pp, 'desk phone feedback detail');
  await pp.screenshot({ path: `${shots}/desk-phone-feedback-detail.png` });
  for (const tab of ['待办', '便签', '设置']) { await pp.getByRole('tab', { name: tab }).click(); await pp.waitForTimeout(300); await noOverflow(pp, 'desk phone ' + tab); }
  await pp.screenshot({ path: `${shots}/desk-phone-settings.png`, fullPage: true });
  await phone.close();

  assert.deepEqual(problems, []);
  console.log('browser ok, screenshots in', shots);
} finally {
  await browser.close();
}
