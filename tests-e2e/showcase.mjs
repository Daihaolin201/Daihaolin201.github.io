import assert from 'node:assert/strict';
// Project showcase check: node tests-e2e/showcase.mjs <screenshot-dir>  (server from tests-e2e/dev.sh; PW=<playwright index.mjs>)
const { chromium } = await import(process.env.PW || 'playwright');
const base=process.env.BASE||'http://localhost:8787', out=process.argv[2]||'/tmp/dl-site-shots';
await (await import('node:fs/promises')).mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}); const issues=[];
for (const [name,w,h] of [['desktop',1280,900],['phone',390,844]]) {
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:name==='phone',reducedMotion:'reduce'});
  const p=await ctx.newPage(); p.on('pageerror',e=>issues.push(e.message)); p.on('console',m=>{if(m.type()==='error')issues.push(m.text())});
  for (const [prefix,lang] of [['/','en'],['/zh/','zh']]) {
    await p.goto(base+prefix); await p.waitForTimeout(400);
    assert.ok(await p.locator('#about a[href="#projects"]').count() >= 1, 'hero leads to projects');
    assert.equal(await p.locator('#projects .pb-panel').count(),8);
    for (const id of ['hackabot-2026','hackabot-2025','openclaw-2026','traffic-cones','esp-buggy','puzzlethon-2024','software-tools-2026','local-workbenches'])
      assert.equal(await p.locator('#'+id).count(),1,'one element per project: '+id);
    assert.equal(await p.locator('.pb-list .lbl.featured').count(), 3, 'featured projects are marked in the list');
    assert.equal(await p.locator('.pb-list li').evaluateAll(l => l.every(li => li.querySelectorAll('.pb-tag').length >= 1)), true, 'every project shows its topics');
    assert.equal(await p.locator('.pb-list .lbl.award').count(), 4, 'awards are labelled in the list');
    // every menu item points at a section whose heading reads exactly the same
    const menu = await p.locator('#menu a').evaluateAll(as => as.map(a => [a.textContent.trim(), a.getAttribute('href')]));
    for (const [label, href] of menu) assert.equal((await p.locator(href + ' h2').first().innerText()).trim(), label, href);
    assert.equal(await p.locator('#contact a[href$="/message/"]').count(),1); assert.equal(await p.locator('#contact a[href$="/hi/"]').count(),1);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+lang+' overflow');
    const el=p.locator('#projects'); await el.scrollIntoViewIfNeeded();
    await el.screenshot({path:`${out}/showcase-${lang}-${name}.png`});
  }
  await ctx.close();
}
await b.close(); assert.deepEqual(issues,[]); console.log('showcase ok');
