const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), 'C:/Users/johnr/sitesorted'] }));
const fs = require('fs');
const path = require('path');
const base = process.env.BASK_PREVIEW_URL || 'http://127.0.0.1:4197';
const output = process.env.BASK_QA_OUTPUT || 'C:/Users/johnr/tmp/bask-fidelity/final';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [], errors = [];
  try {
    for (const width of [1440, 1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      for (const route of ['/', '/shop/', '/about/', '/contact/', '/services/']) {
        await page.goto(base + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1600);
        assert((await page.title()).includes('Bask'), `${route}: wrong page title`);
        const text = await page.locator('body').innerText();
        assert(!/proferlo|oakâme|oakame|Westgate|Northside|factory|in-house|workshop|handcrafted|reclaimed|NFC/i.test(text), `${route}: supplier/reference content remains`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert(overflow < 3, `${route} at ${width}: horizontal overflow ${overflow}`);
        if (width === 390) {
          const menu = page.locator('.bask-menu-toggle');
          await menu.click();assert(await menu.getAttribute('aria-expanded') === 'true', `${route}: menu does not open`);
          assert(await page.locator('#bask-mobile-menu').evaluate(e => !e.inert), `${route}: opened menu is inert`);
          await page.keyboard.press('Escape');assert(await menu.getAttribute('aria-expanded') === 'false', `${route}: Escape does not close menu`);
          await menu.click();await menu.click();assert(await menu.getAttribute('aria-expanded') === 'false', `${route}: rapid menu reversal failed`);
        } else {
          await page.locator('.bask-collections-toggle').hover();await page.waitForTimeout(260);
          assert(await page.locator('.bask-collections-toggle').getAttribute('aria-expanded') === 'true', `${route}: collections hover does not open`);
          await page.keyboard.press('Escape');assert(await page.locator('#bask-collections').evaluate(e => e.inert), `${route}: closed collections retain keyboard access`);
        }
        if (route === '/') {
          const hero = await page.locator('.hero-slider-wrapper').boundingBox();
          const expected = width === 390 ? { x: 0, y: 0, w: 390, h: 390 } : { x: width / 48, y: width / 48, w: width * 23 / 24, h: 1000 - width / 24 };
          for (const [key, actual] of Object.entries({ x: hero.x, y: hero.y, w: hero.width, h: hero.height })) assert(Math.abs(actual - expected[key]) < 2, `hero ${width} ${key}: ${actual}, reference ${expected[key]}`);
          await page.locator('.hero-slider-thumbnail').nth(1).click();await page.waitForTimeout(120);
          const middle = await page.locator('.hero-slider-image').nth(1).evaluate(e => getComputedStyle(e).transform);
          assert(middle !== 'none' && middle !== 'matrix(1, 0, 0, 1, 0, 0)', 'hero did not move through an intermediate state');
          await page.locator('.hero-slider-thumbnail').nth(3).click();await page.waitForTimeout(1750);
          assert(await page.locator('.hero-slider-thumbnail').nth(3).getAttribute('aria-selected') === 'true', 'rapid slide selection chose wrong slide');
          assert(await page.locator('.hero-slider-image[data-active=true]').count() === 1, 'multiple hero slides remain active');
          await page.locator('.hero-slider-thumbnail').nth(3).focus();await page.keyboard.press('Home');await page.waitForTimeout(1750);
          assert(await page.locator('.hero-slider-thumbnail').first().getAttribute('aria-selected') === 'true', 'carousel keyboard navigation failed');
          await page.locator('.dropdown-head').nth(1).scrollIntoViewIfNeeded();await page.locator('.dropdown-head').nth(1).click();await page.waitForTimeout(350);
          assert(await page.locator('.dropdown-head').nth(1).getAttribute('aria-expanded') === 'true', 'FAQ did not open');
          assert((await page.locator('.dropdown-content').nth(1).boundingBox()).height > 30, 'opened FAQ has no visible answer');
          await page.locator('.bask-highlight-words button').nth(1).scrollIntoViewIfNeeded();await page.locator('.bask-highlight-words button').nth(1).click();
          assert(await page.locator('.bask-highlight-copy').nth(1).isVisible(), 'feature tab did not switch copy');
          await page.locator('.bask-highlight-words button').first().click();
        }
        if (route === '/shop/') {
          if (width === 390 && !await page.locator('.bask-filters details').evaluate(e => e.open)) await page.locator('.bask-filters summary').click();
          assert(await page.locator('[data-product-category]:visible').count() === 52, 'catalogue initial count is not 52');
          await page.locator('#bask-product-search').fill('arma');
          assert(await page.locator('[data-product-category]:visible').count() === 4, 'accent-insensitive Arma search should show four dining tables');
          await page.locator('#bask-product-search').fill('');await page.locator('[data-filter-category="Bedside Table"]').click();
          assert(await page.locator('[data-product-category]:visible').count() === 7, 'bedside filter should show seven objects');
          await page.locator('#bask-product-search').fill('no-such-object');assert(await page.locator('.bask-no-results').isVisible(), 'empty search state missing');
          await page.locator('#bask-product-search').fill('');await page.locator('[data-filter-category=""]').click();
          assert((await page.locator('.card-product').first().getAttribute('href')).startsWith('mailto:hello@baskobjects.co.nz?subject='), 'product enquiry lacks Bask email or product context');
          if (width === 390) await page.locator('.bask-filters summary').click();
        }
        await page.evaluate(async () => { for(let y=0;y<document.documentElement.scrollHeight;y+=750){scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,35));}scrollTo(0,0); });
        await page.waitForTimeout(1500);
        const broken = await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
        assert(!broken.length, `${route}: broken images ${broken.join(', ')}`);
        await page.screenshot({ path: path.join(output, `${route === '/' ? 'home' : route.split('/')[1]}-${width}.png`), fullPage: true });
        results.push({ route, width, status: 'pass' });
      }
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto(base, { waitUntil: 'networkidle' });await reduced.waitForTimeout(100);
    await reduced.locator('.hero-slider-thumbnail').nth(2).click();
    assert(await reduced.locator('.hero-slider-thumbnail').nth(2).getAttribute('aria-selected') === 'true', 'reduced-motion slide switch failed');
    assert(await reduced.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length) === 0, 'reduced-motion page still animates');
    const first = await reduced.locator('.hero-slider-thumbnail.a').getAttribute('aria-label');await reduced.waitForTimeout(5300);
    assert(await reduced.locator('.hero-slider-thumbnail.a').getAttribute('aria-label') === first, 'reduced-motion carousel still auto-plays');
    await reduced.close();results.push({ route: '/', width: 390, reducedMotion: true, status: 'pass' });
    assert(!errors.length, `browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ status:'PASS', pagesAndStates:results.length, browserErrors:errors.length, output },null,2));
  } catch (error) {
    errors.push(error.message);console.error(error.message);process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({results,errors},null,2));await browser.close();
  }
})();
