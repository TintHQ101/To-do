// End-to-end check in a real browser (iPhone size): add, complete, edit, delete + undo, theme, reload.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); console.log('ok -', msg); }

server.listen(0, async () => {
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    assert(await page.isVisible('#empty'), 'empty state shows on first open');
    assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'starts in dark mode');

    for (const t of ['Pay electric bill', 'Laundry', 'Call dentist']) {
      await page.fill('#addInput', t);
      await page.press('#addInput', 'Enter');
    }
    assert(await page.locator('#list .item').count() === 3, 'three tasks added');
    assert((await page.textContent('#list .item .title')) === 'Call dentist', 'newest task on top');
    assert((await page.textContent('#totN')) === '3', 'bar total is 3');

    await page.click('#list .item:first-child .check');
    await page.waitForTimeout(900);
    assert((await page.textContent('#doneN')) === '1', 'completing moves the bar to 1');
    assert(await page.locator('#list .item').count() === 2, 'completed task leaves the open list');

    await page.click('#list .item:first-child .title');
    await page.fill('#editTitle', 'Laundry (whites)');
    await page.fill('#editNote', 'Use the cold cycle');
    await page.click('#editSave');
    assert((await page.textContent('#list .item:first-child .note')) === 'Use the cold cycle', 'edit saves a note');

    await page.click('#list .item:first-child .title');
    await page.click('#editDelete');
    assert(await page.locator('#list .item').count() === 1, 'delete removes task');
    await page.click('#undoBtn');
    assert(await page.locator('#list .item').count() === 2, 'undo restores task');

    await page.click('#themeBtn');
    assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'theme toggles to light');

    await page.reload();
    assert(await page.locator('#list .item').count() === 2, 'tasks survive reload');
    assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'theme survives reload');

    for (let i = 0; i < 2; i++) { await page.click('#list .item:first-child .check'); await page.waitForTimeout(900); }
    assert(await page.isVisible('#clear'), '"You\'re clear" shows when everything is done');
    assert((await page.textContent('#doneN')) === '3' && (await page.textContent('#totN')) === '3', 'bar is full');

    await page.click('#syncBtn');
    assert((await page.textContent('#syncText')).includes('not set up'), 'sync sheet explains sync is off');

    assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  } catch (e) {
    console.error(e.message); process.exitCode = 1;
  } finally {
    await browser.close(); server.close();
  }
});
