// Mobiltest af skrivebordet: rigtige berøringer (også flere fingre) i en
// iPhone-skærm via Chrome DevTools-protokollen.
//
//   npm run e2e
//
// Starter selv en Vite-udviklingsserver.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const URL = 'http://localhost:5199/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const fejl = [];
page.on('pageerror', (e) => fejl.push(String(e)));
page.on('console', (m) => m.type() === 'error' && fejl.push(m.text()));
const cdp = await ctx.newCDPSession(page);
// THROTTLE=4 efterligner en langsommere telefon
if (process.env.THROTTLE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE) });

// ---------- berørings-hjælpere
const vent = (ms) => page.waitForTimeout(ms);
async function touch(type, punkter) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: punkter.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i, radiusX: 4, radiusY: 4, force: 1 })),
  });
}
async function traek(fra, til, trin = 12, pauseMs = 8) {
  await touch('touchStart', [fra]);
  for (let i = 1; i <= trin; i++) {
    const t = i / trin;
    await touch('touchMove', [{ x: fra.x + (til.x - fra.x) * t, y: fra.y + (til.y - fra.y) * t }]);
    if (pauseMs) await vent(pauseMs);
  }
  await touch('touchEnd', []);
}
async function tryk(p) {
  await touch('touchStart', [p]);
  await vent(40);
  await touch('touchEnd', []);
}
async function dobbeltTryk(p) {
  await tryk(p);
  await vent(90);
  await tryk(p);
}
async function hold(p, ms = 750) {
  await touch('touchStart', [p]);
  await vent(ms);
  await touch('touchEnd', []);
}
/** To fingre: fra afstand d0 til d1 omkring c, evt. med drejning (grader). */
async function toFingre(c, d0, d1, v0 = 0, v1 = 0, trin = 14) {
  const pkt = (d, v) => {
    const r = (v * Math.PI) / 180;
    return [
      { x: c.x - (Math.cos(r) * d) / 2, y: c.y - (Math.sin(r) * d) / 2, id: 0 },
      { x: c.x + (Math.cos(r) * d) / 2, y: c.y + (Math.sin(r) * d) / 2, id: 1 },
    ];
  };
  const [a0, b0] = pkt(d0, v0);
  await touch('touchStart', [a0]);
  await touch('touchStart', [a0, b0]);
  for (let i = 1; i <= trin; i++) {
    const t = i / trin;
    await touch('touchMove', pkt(d0 + (d1 - d0) * t, v0 + (v1 - v0) * t));
    await vent(8);
  }
  await touch('touchEnd', []);
}

// ---------- læse-hjælpere
const midt = (sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
const tingTilstand = (id) =>
  page.$eval(`.ting[data-id="${id}"]`, (el) => {
    const m = el.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) rotate\(([-\d.]+)deg\)/);
    return { x: +m[1], y: +m[2], rot: +m[3], z: +el.style.zIndex };
  });
const findes = (sel) => page.$(sel).then((e) => !!e);
const tekst = (sel) => page.$eval(sel, (el) => el.textContent);
const verdenSkala = () => page.$eval('.verden', (el) => +el.style.transform.match(/scale\(([-\d.]+)\)/)[1]);
const ingenBrowserZoomEllerScroll = () =>
  page.evaluate(() => ({ scroll: window.scrollY + window.scrollX, skala: window.visualViewport?.scale ?? 1 }));

/** Et sted på bordpladen, hvor der ikke ligger noget (og med plads til to fingre). */
const tomtSted = (spaend = 45) =>
  page.evaluate((spaend) => {
    const fri = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && !el.closest('.ting') && !el.closest('.ui') && el.closest('.skrivebord');
    };
    for (let y = 120; y < innerHeight - 120; y += 10)
      for (let x = 60; x < innerWidth - 60; x += 10)
        if (fri(x, y) && fri(x - spaend, y) && fri(x + spaend, y)) return { x, y };
    return null;
  }, spaend);

let ok = 0;
async function test(navn, fn) {
  try {
    await fn();
    ok++;
    console.log(`  ✓ ${navn}`);
  } catch (e) {
    console.log(`  ✗ ${navn}\n    ${e.message}`);
    if (process.env.SKAERMBILLEDER) await page.screenshot({ path: `${process.env.SKAERMBILLEDER}/fejl-${ok}.png` });
    process.exitCode = 1;
  }
}

if (process.env.DBG) {
  page.on('console', (m) => m.text().startsWith('gestus') && console.log('    ' + m.text()));
  await page.addInitScript(() => (window.__dbg = true));
}
await page.goto(URL + '?nyt');
await page.waitForSelector('.ting[data-id="foto-bryllup"]');
await vent(400);
console.log('Skrivebordet på iPhone 13 (390×664):');

await test('en ting kan trækkes med én finger og kommer øverst', async () => {
  const før = await tingTilstand('foto-bryllup');
  const c = await midt('.ting[data-id="foto-bryllup"]');
  await traek(c, { x: c.x - 80, y: c.y + 40 });
  await vent(50);
  const efter = await tingTilstand('foto-bryllup');
  const z = (await verdenSkala());
  assert.ok(Math.abs(efter.x - før.x - -80 / z) < 4, `x flyttede ${efter.x - før.x}`);
  assert.ok(Math.abs(efter.y - før.y - 40 / z) < 4, `y flyttede ${efter.y - før.y}`);
  const topId = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.ting')?.dataset.id, { x: c.x - 80, y: c.y + 40 });
  assert.equal(topId, 'foto-bryllup');
});

await test('en ting kan ikke trækkes ud over bordkanten', async () => {
  const c = await midt('.ting[data-id="kaffekop"]');
  await traek(c, { x: c.x + 600, y: c.y + 900 }, 10, 0);
  const t = await tingTilstand('kaffekop');
  assert.ok(t.x + 150 * 0.7 <= 1000.5 && t.y + 150 * 0.7 <= 1500.5, JSON.stringify(t));
});

await test('to fingre på en ting drejer den', async () => {
  const før = await tingTilstand('notesblok');
  const c = await midt('.ting[data-id="notesblok"]');
  await toFingre(c, 60, 60, 0, 25);
  const efter = await tingTilstand('notesblok');
  assert.ok(Math.abs(efter.rot - før.rot - 25) < 3, `drejning ${efter.rot - før.rot}`);
});

await test('fortryd sætter drejningen tilbage', async () => {
  const før = await tingTilstand('notesblok');
  await page.click('button[aria-label="Fortryd"]');
  await vent(50);
  const efter = await tingTilstand('notesblok');
  assert.ok(Math.abs(efter.rot - (før.rot - 25)) < 3, `rot ${efter.rot}`);
});

await test('knib på tomt bord zoomer kameraet, og helt ud ses kontoret', async () => {
  const z0 = await verdenSkala();
  const tomt = await tomtSted();
  await toFingre(tomt, 80, 200);
  const z1 = await verdenSkala();
  assert.ok(z1 > z0 * 1.8, `zoom ind ${z0} → ${z1}`);
  for (let i = 0; i < 4; i++) {
    const sted = await tomtSted(52);
    if (!sted) break;
    await toFingre(sted, 100, 30);
  }
  const z2 = await verdenSkala();
  assert.ok(z2 < z0 * 0.8, `zoom ud ${z2}`);
  assert.ok(await findes('.skrivebord.viser-kontor'));
  await dobbeltTryk({ x: 20, y: 40 });
  await vent(400);
  const z3 = await verdenSkala();
  assert.ok(Math.abs(z3 - z0) < 0.01, `dobbelttryk nulstiller ${z3}`);
});

await test('browseren selv hverken scroller eller zoomer', async () => {
  const s = await ingenBrowserZoomEllerScroll();
  assert.equal(s.scroll, 0);
  assert.equal(s.skala, 1);
});

await test('tryk på en bog åbner den, og man kan bladre med swipe', async () => {
  await tryk(await midt('.ting[data-id="bog-ft1880"]'));
  await page.waitForSelector('.aaben-panel');
  await vent(350);
  assert.match(await tekst('.side-tal'), /Side 1 af 4/);
  const f = await midt('.aaben-flade');
  await traek({ x: f.x + 120, y: f.y }, { x: f.x - 140, y: f.y }, 10);
  await vent(400);
  assert.match(await tekst('.side-tal'), /Side 2 af 4/);
  await traek({ x: f.x - 140, y: f.y }, { x: f.x + 140, y: f.y }, 10);
  await vent(400);
  assert.match(await tekst('.side-tal'), /Side 1 af 4/);
});

await test('faneblade springer til en side', async () => {
  await tryk(await midt('.faneblad:nth-child(4)'));
  await vent(400);
  assert.match(await tekst('.side-tal'), /Side 4 af 4/);
});

await test('knib zoomer ind i dokumentet, og man kan panorere', async () => {
  const f = await midt('.aaben-flade');
  await toFingre(f, 60, 180);
  const s = await page.$eval('.side-ramme', (el) => +el.style.transform.match(/scale\(([-\d.]+)\)/)[1]);
  assert.ok(s > 2, `skala ${s}`);
  const før = await page.$eval('.side-ramme', (el) => el.style.transform);
  await traek({ x: f.x, y: f.y }, { x: f.x + 60, y: f.y + 60 }, 6);
  const efter = await page.$eval('.side-ramme', (el) => el.style.transform);
  assert.notEqual(før, efter);
  // knib tilbage
  await toFingre(f, 200, 70);
  await vent(300);
});

await test('tryk og hold på en række fastgør den i notesblokken', async () => {
  const r = await midt('.dok-tabel tbody tr');
  await hold(r);
  await vent(100);
  assert.match(await tekst('.besked'), /Fastgjort/);
});

await test('swipe nedad lukker den åbne ting', async () => {
  const f = await midt('.aaben-flade');
  await traek({ x: f.x, y: f.y - 100 }, { x: f.x, y: f.y + 140 }, 8);
  await vent(450);
  assert.equal(await findes('.aaben-panel'), false);
});

await test('notesblokken viser det fastgjorte fund', async () => {
  await tryk(await midt('.ting[data-id="notesblok"]'));
  await page.waitForSelector('.aaben-panel');
  await vent(300);
  await tryk(await midt('.faneblad:nth-child(2)'));
  await vent(400);
  const t = await tekst('.sedler');
  assert.match(t, /Gredstedbro|Niels Christensen|Navn/);
  await tryk(await midt('button[aria-label="Luk"]'));
  await vent(400);
});

await test('dobbelttryk på et foto vender det', async () => {
  await tryk(await midt('.ting[data-id="foto-bryllup"]'));
  await page.waitForSelector('.vend-kort');
  await vent(350);
  await dobbeltTryk(await midt('.aaben-flade'));
  await vent(100);
  assert.ok(await findes('.vend-kort.vendt'));
  assert.match(await tekst('.vend-bag'), /Karen Marie/);
});

await test('knib sammen lukker fotoet', async () => {
  const f = await midt('.aaben-flade');
  await toFingre(f, 240, 60);
  await vent(450);
  assert.equal(await findes('.aaben-panel'), false);
});

await test('to ting åbne side om side (øverst og nederst)', async () => {
  await tryk(await midt('.ting[data-id="mappe-sag1"]'));
  await page.waitForSelector('.aaben-panel');
  await vent(300);
  await tryk(await midt('button[aria-label="Flyt til øverst"]'));
  await vent(200);
  assert.ok(await findes('.aaben-panel.plads-top'));
  // nederste halvdel af bordet kan stadig bruges: åbn en ting, der ligger dér
  const o = await page.evaluate(() => {
    for (let y = innerHeight * 0.6; y < innerHeight - 90; y += 12)
      for (let x = 40; x < innerWidth - 40; x += 12) {
        const t = document.elementFromPoint(x, y)?.closest('.ting:not(.fast)');
        if (t && !['lup', 'stempel', 'roedblyant', 'kaffekop'].includes(t.dataset.id)) return { x, y };
      }
    return null;
  });
  assert.ok(o, 'ingen ting i nederste halvdel');
  await tryk(o);
  await vent(400);
  assert.ok(await findes('.aaben-panel.plads-bund'), 'mangler nederste panel');
  assert.equal((await page.$$('.aaben-panel')).length, 2);
});

await test('luppen forstørrer det åbne dokument og bliver liggende', async () => {
  await tryk(await midt('.plads-top button[aria-label="Lup"]'));
  await vent(200);
  assert.ok(await findes('.lup-ring .lup-omslag .side-ramme'), 'luppen viser ikke dokumentet');
  const l = await midt('.lup-ring');
  await traek(l, { x: l.x + 40, y: l.y + 20 }, 6);
  const l2 = await midt('.lup-ring');
  assert.ok(Math.abs(l2.x - l.x - 40) < 3);
  // luk begge
  for (const k of await page.$$('button[aria-label="Luk"]')) await k.click();
  await vent(450);
});

await test('en ting smidt i papirkurven forsvinder og kan fortrydes', async () => {
  // læg et ark ud af mappen først
  await tryk(await midt('.ting[data-id="mappe-sag1"]'));
  await page.waitForSelector('.aaben-panel');
  await vent(300);
  await tryk(await midt('button[aria-label="Tag arket ud og læg det på bordet"]'));
  await vent(300);
  const ark = await page.$eval('.ting.slags-ark', (el) => el.dataset.id);
  const kurv = await midt('.ting[data-id="papirkurv"]');
  await traek(await midt(`.ting[data-id="${ark}"]`), kurv, 14);
  await vent(100);
  assert.equal(await findes(`.ting[data-id="${ark}"]`), false);
  await page.click('button[aria-label="Fortryd"]');
  await vent(100);
  assert.equal(await findes(`.ting[data-id="${ark}"]`), true);
});

await test('værktøj kan ikke smides ud', async () => {
  const kurv = await midt('.ting[data-id="papirkurv"]');
  await traek(await midt('.ting[data-id="lup"]'), kurv, 10);
  await vent(100);
  assert.equal(await findes('.ting[data-id="lup"]'), true);
});

await test('skuffen indeholder arvestykket, som kan lægges på bordet', async () => {
  await tryk(await midt('.ting[data-id="skuffe"]'));
  await page.waitForSelector('.ark-panel');
  await page.click('.ark-panel .tekst-knap');
  await vent(100);
  assert.equal(await findes('.ting[data-id="arvestykke"]'), true);
});

await test('Ryd op lægger tingene i bunker, og det kan fortrydes', async () => {
  const før = await tingTilstand('foto-bryllup');
  await page.click('text=Ryd op');
  await vent(50);
  const efter = await tingTilstand('foto-bryllup');
  assert.notDeepEqual(før, efter);
  await page.click('button[aria-label="Fortryd"]');
  await vent(50);
  const igen = await tingTilstand('foto-bryllup');
  assert.equal(igen.x, før.x);
});

await test('fortryd kan mindst 20 trin tilbage', async () => {
  const start = await tingTilstand('foto-bryllup');
  for (let i = 0; i < 21; i++) {
    const c = await midt('.ting[data-id="foto-bryllup"]');
    const før = await tingTilstand('foto-bryllup');
    await traek(c, { x: c.x + (i % 2 ? 12 : -12), y: c.y + (i % 2 ? 6 : -6) }, 4, 0);
    assert.notDeepEqual(await tingTilstand('foto-bryllup'), før, `træk ${i} flyttede ikke fotoet`);
  }
  for (let i = 0; i < 21; i++) await page.click('button[aria-label="Fortryd"]');
  await vent(50);
  const slut = await tingTilstand('foto-bryllup');
  assert.ok(Math.abs(slut.x - start.x) < 0.5 && Math.abs(slut.y - start.y) < 0.5, JSON.stringify({ start, slut }));
});

await test('opstillingen gemmes og er der efter genindlæsning', async () => {
  const c = await midt('.ting[data-id="kaffekop"]');
  await traek(c, { x: c.x - 50, y: c.y - 30 });
  const før = await tingTilstand('kaffekop');
  await vent(800);
  await page.goto(URL);
  await page.waitForSelector('.ting[data-id="kaffekop"]');
  const efter = await tingTilstand('kaffekop');
  assert.ok(Math.abs(før.x - efter.x) < 0.5 && Math.abs(før.y - efter.y) < 0.5);
});

await test('træk kører flydende (billeder pr. sekund under træk)', async () => {
  await page.evaluate(() => {
    window.__fps = { n: 0, start: performance.now(), koer: true };
    const tael = () => {
      if (!window.__fps.koer) return;
      window.__fps.n++;
      requestAnimationFrame(tael);
    };
    requestAnimationFrame(tael);
  });
  const c = await midt('.ting[data-id="foto-bryllup"]');
  await touch('touchStart', [c]);
  for (let i = 0; i < 60; i++) {
    await touch('touchMove', [{ x: c.x + Math.sin(i / 6) * 60, y: c.y + Math.cos(i / 6) * 40 }]);
    await vent(16);
  }
  await touch('touchEnd', []);
  const fps = await page.evaluate(() => {
    window.__fps.koer = false;
    return (window.__fps.n * 1000) / (performance.now() - window.__fps.start);
  });
  console.log(`    (${fps.toFixed(0)} billeder/sek. i headless Chromium)`);
  assert.ok(fps > 40, `kun ${fps} fps`);
});

await test('ingen fejl i konsollen', async () => {
  assert.deepEqual(fejl, []);
});

console.log(`\n${ok} bestået`);
await browser.close();
await server.close();
