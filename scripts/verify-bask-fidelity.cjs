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
    if (!process.argv.includes('--regressions-only')) for (const width of [1440, 1280, 390]) {
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
        await page.waitForFunction(() => [...document.images].every(image => image.complete), {}, { timeout: 30000 });
        const broken = await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
        assert(!broken.length, `${route}: broken images ${broken.join(', ')}`);
        await page.screenshot({ path: path.join(output, `${route === '/' ? 'home' : route.split('/')[1]}-${width}.png`), fullPage: true });
        results.push({ route, width, status: 'pass' });
      }
      await page.close();
    }
    if (!process.argv.includes('--regressions-only')) {
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto(base, { waitUntil: 'networkidle' });await reduced.waitForTimeout(100);
    await reduced.locator('.hero-slider-thumbnail').nth(2).click();
    assert(await reduced.locator('.hero-slider-thumbnail').nth(2).getAttribute('aria-selected') === 'true', 'reduced-motion slide switch failed');
    assert(await reduced.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length) === 0, 'reduced-motion page still animates');
    const first = await reduced.locator('.hero-slider-thumbnail.a').getAttribute('aria-label');await reduced.waitForTimeout(5300);
    assert(await reduced.locator('.hero-slider-thumbnail.a').getAttribute('aria-label') === first, 'reduced-motion carousel still auto-plays');
    await reduced.close();results.push({ route: '/', width: 390, reducedMotion: true, status: 'pass' });
    }
    const regression = await browser.newPage({viewport:{width:1440,height:1000}});
    regression.on('pageerror',error=>errors.push(error.message));
    await regression.goto(base+'/shop/#coffee',{waitUntil:'networkidle'});
    assert(await regression.locator('[data-product-category]:visible').count()===5,'Coffee category link should show five coffee tables');
    assert(await regression.locator('[data-product-category]:visible').evaluateAll(cards=>cards.every(card=>card.dataset.productCategory==='Coffee Table')),'Coffee link shows unrelated products');
    await regression.locator('[data-filter-category="Bedside Table"]').click();assert(await regression.locator('[data-product-category]:visible').count()===7,'Manual category filter did not replace hash category');
    await regression.locator('.bask-collections-toggle').hover();await regression.locator('#bask-collections a[href="/shop/#coffee"]').click();
    await regression.waitForFunction(()=>document.querySelector('#bask-product-count').textContent==='5 objects',{},{timeout:2000});
    assert(await regression.locator('[data-product-category]:visible').count()===5,'Revisiting Coffee link after manual filtering failed');
    assert(await regression.locator('.bask-collections-toggle').getAttribute('aria-expanded')==='false','Collection menu stayed open after navigation');
    await regression.goto(base+'/shop/#orel',{waitUntil:'networkidle'});
    assert(await regression.locator('[data-product-category]:visible').count()===9,'Ørel hero link should show nine Ørel pieces');
    assert(await regression.locator('#bask-product-search').inputValue()==='Ørel','Collection context missing from search');
    await regression.goto(base+'/shop/#halda',{waitUntil:'networkidle'});
    assert(await regression.locator('.bask-no-results a').getAttribute('href')==='mailto:hello@baskobjects.co.nz?subject=Collection%20enquiry%3A%20Halda','Unpictured collection must offer a contextual Bask enquiry');
    await regression.goto(base+'/shop/',{waitUntil:'networkidle'});
    await regression.locator('#bask-product-search').focus();await regression.keyboard.press('Escape');
    assert(await regression.locator('#bask-product-search').evaluate(e=>e===document.activeElement),'Escape in search stole focus');
    const first=await regression.locator('.card-product').nth(0).boundingBox(),second=await regression.locator('.card-product').nth(1).boundingBox(),third=await regression.locator('.card-product').nth(2).boundingBox();
    assert(second.x-first.x>first.width*1.8 && third.width>first.width*1.8,'Desktop catalogue lost the reference staggered/wide tiles');
    await regression.setViewportSize({width:390,height:844});
    assert(!await regression.locator('.bask-filters details').evaluate(e=>e.open),'Compact filters should initially collapse');
    assert((await regression.locator('.card-product').first().boundingBox()).width>360,'Mobile product card should span the available width');
    await regression.setViewportSize({width:1280,height:1000});
    assert(await regression.locator('.bask-filters details').evaluate(e=>e.open),'Filters remained inaccessible after widening viewport');
    await regression.goto(base+'/about/',{waitUntil:'networkidle'});await regression.setViewportSize({width:390,height:844});
    const aboutPhoto=await regression.locator('.bask-about-photo').boundingBox();assert(Math.abs(aboutPhoto.y-376)<10,'Mobile About photograph is not aligned to reference');
    await regression.goto(base,{waitUntil:'networkidle'});
    assert(await regression.locator('.bask-highlight-body').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===1,'Mobile highlight text should stack');
    await regression.setViewportSize({width:1440,height:1000});await regression.waitForTimeout(1600);
    await regression.locator('.hero-slider-thumbnail').nth(1).click();
    const wipe=await regression.locator('.hero-slider-image').nth(1).evaluate(e=>{const animation=e.getAnimations()[0];animation.pause();animation.currentTime=500;return{duration:animation.effect.getTiming().duration,x:new DOMMatrix(getComputedStyle(e).transform).m41};});
    assert(wipe.duration===1500&&wipe.x>80&&wipe.x<400,'Hero wipe does not follow the captured reference timing/easing');
    await regression.locator('.hero-slider-thumbnail').nth(3).click();await regression.waitForTimeout(1750);
    assert(await regression.locator('.hero-slider-thumbnail').nth(3).getAttribute('aria-selected')==='true','Interrupted custom wipe failed to settle on latest selection');
    await regression.close();results.push({route:'reference journeys',status:'pass'});
    const touch=await browser.newPage({viewport:{width:1280,height:1000},hasTouch:true});await touch.goto(base+'/shop/',{waitUntil:'networkidle'});
    assert(await touch.locator('.bask-filters details').evaluate(e=>e.open),'Wide touch devices must retain accessible filters');await touch.close();results.push({route:'wide touch filters',status:'pass'});
    assert(!errors.length, `browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ status:'PASS', pagesAndStates:results.length, browserErrors:errors.length, output },null,2));
  } catch (error) {
    errors.push(error.message);console.error(error.message);process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({results,errors},null,2));await browser.close();
  }
})();
