const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.resolve(__dirname, '..');
const BASKOBJECTS_ROOT = path.resolve(process.env.BASKOBJECTS_ROOT || path.join(SITE_ROOT, '..', '..', '..', 'baskobjects'));
const INVENTORY_PATH = path.join(BASKOBJECTS_ROOT, 'inventory', 'inventory.json');
const CATEGORY_DIR = path.join(BASKOBJECTS_ROOT, 'inventory', 'by-category');
const SOURCE_IMAGE_DIR = path.join(BASKOBJECTS_ROOT, 'images', 'bask-catalogue');
const SITE_IMAGE_DIR = path.join(SITE_ROOT, 'product-images');

const pageFiles = ['index.html', 'products.html', 'lookbook.html', 'about-us.html', 'contact.html'];

function read(file) {
  return fs.readFileSync(path.join(SITE_ROOT, file), 'utf8');
}

function write(file, content) {
  const full = path.join(SITE_ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugifyCategory(value) {
  return String(value || 'collection')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatCategory(value) {
  const text = slugifyCategory(value);
  return text ? text.replace(/\b\w/g, (m) => m.toUpperCase()) : 'Collection';
}

function formatPrice(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0
    ? new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(number)
    : 'POA';
}

function loadCategoryIndex() {
  const bySlug = new Map();
  for (const file of fs.readdirSync(CATEGORY_DIR).filter((name) => name.endsWith('.json'))) {
    const category = file.replace(/\.json$/, '');
    const parsed = JSON.parse(fs.readFileSync(path.join(CATEGORY_DIR, file), 'utf8'));
    const entries = parsed.slugs || parsed.products || [];
    for (const item of entries) {
      const slug = typeof item === 'string' ? item : item.slug || item.bask_slug;
      if (slug && (!bySlug.has(slug) || bySlug.get(slug) === '__uncategorised')) bySlug.set(slug, category);
    }
  }
  return bySlug;
}

function loadProducts() {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const categoryIndex = loadCategoryIndex();
  const available = new Set(
    fs.readdirSync(SOURCE_IMAGE_DIR)
      .filter((name) => /\.jpe?g$/i.test(name))
      .map((name) => path.basename(name, path.extname(name)))
  );
  return (inventory.products || [])
    .filter((product) => available.has(product.bask_slug))
    .map((product) => {
      const variant = (product.variants || [])[0] || {};
      const category = categoryIndex.get(product.bask_slug) || product.proferlo?.product_type || 'collection';
      const description = [
        `${product.bask_name} is part of the Bask Objects catalogue: quiet, useful furniture selected for slow homes.`,
        'Photographed as a Bask editorial product image and checked before publication.'
      ].join(' ');
      return {
        slug: product.bask_slug,
        name: product.bask_name,
        category,
        categoryLabel: formatCategory(category),
        price: formatPrice(variant.price_nzd),
        compareAt: variant.compare_at_price ? formatPrice(variant.compare_at_price) : null,
        image: `/product-images/${product.bask_slug}.jpg`,
        detailUrl: `/products/${product.bask_slug}/`,
        sourceTitle: product.proferlo?.clean_title || product.proferlo?.title || '',
        description,
        specText: stripHtml(product.proferlo?.body_html || '').slice(0, 420)
      };
    })
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name));
}

function copyImages(products) {
  fs.mkdirSync(SITE_IMAGE_DIR, { recursive: true });
  for (const product of products) {
    fs.copyFileSync(path.join(SOURCE_IMAGE_DIR, `${product.slug}.jpg`), path.join(SITE_IMAGE_DIR, `${product.slug}.jpg`));
  }
}

function splitShell(file) {
  const html = read(file);
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (!bodyOpen) throw new Error(`Cannot split shell for ${file}`);
  let top = html.slice(0, bodyOpen.index + bodyOpen[0].length) + siteHeader();
  let bottom = siteFooter();
  top = top
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]+href=["']\/?assets\/bask-catalogue\.css["'][^>]*>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Bask Objects | Furniture for slow homes</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, '<meta name="description" content="Bask Objects curates furniture and home pieces for slow New Zealand homes.">')
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, '<link rel="canonical" href="https://bask-live.sitesorted.co.nz/">')
    .replace(/Proferlo/g, 'Bask')
    .replace(/Shop Bask/g, 'Bask Objects')
    .replace(/<\/head>/i, '<link rel="stylesheet" href="/assets/bask-catalogue.css">\n</head>');
  bottom = brandClean(bottom);
  return { top, bottom };
}

function siteHeader() {
  return `<header class="bask-header">
  <div class="bask-shell bask-header__inner">
    <a class="bask-brand" href="/">Bask / Objects</a>
    <div class="bask-header__center">NZ furniture catalogue</div>
    <nav class="bask-nav" aria-label="Site navigation">
      <a href="/products/">Catalogue</a>
      <a href="/lookbook/">Lookbook</a>
      <a href="/about-us/">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>`;
}

function brandClean(html) {
  return html
    .replace(/proferlo\.co\.nz/gi, 'bask-live.sitesorted.co.nz')
    .replace(/oakame\.com/gi, 'bask-live.sitesorted.co.nz')
    .replace(/PROFERLO/g, 'BASK')
    .replace(/Proferlo/g, 'Bask')
    .replace(/proferlo/g, 'bask')
    .replace(/Oakame/g, 'Bask')
    .replace(/OAKAME/g, 'BASK')
    .replace(/oakame/g, 'bask')
    .replace(/€<\/span>/g, 'NZD</span>');
}

function siteFooter() {
  return `<footer class="bask-page" style="border-top:1px solid #090807">
  <div class="bask-shell" style="padding:4rem 0 2rem">
    <div class="bask-meta-row" style="justify-content:space-between;align-items:center">
      <a class="bask-pill" href="/products/">Catalogue</a>
      <a class="bask-pill" href="/lookbook/">Lookbook</a>
      <a class="bask-pill" href="/about-us/">About</a>
      <a class="bask-pill" href="/contact/">Contact</a>
    </div>
    <div style="font-size:clamp(6rem,24vw,28rem);line-height:.75;letter-spacing:-.09em;text-transform:uppercase;font-weight:900;margin-top:5rem">Bask</div>
  </div>
</footer>
</body></html>`;
}

function card(product) {
  return `<a class="bask-card" href="${product.detailUrl}">
    <div class="bask-card__media"><img src="${product.image}" alt="${escapeHtml(product.name)}" width="1024" height="1280" loading="lazy" decoding="async"></div>
    <div class="bask-card__body">
      <div>
        <div class="bask-card__category">${escapeHtml(product.categoryLabel)}</div>
        <div class="bask-card__title">${escapeHtml(product.name)}</div>
        <div class="bask-card__cta">View object</div>
      </div>
      <div class="bask-card__price">${escapeHtml(product.price)}</div>
    </div>
  </a>`;
}

function heroCard(product, label = 'Featured Object') {
  return `<div class="bask-hero-card">
    <img src="${product.image}" alt="${escapeHtml(product.name)}" width="1024" height="1280" decoding="async" fetchpriority="high">
    <div class="bask-hero-card__label"><span>${escapeHtml(label)}</span><span>${escapeHtml(product.name)}</span></div>
  </div>`;
}

function productGrid(products) {
  return `<div class="bask-grid">${products.map(card).join('\n')}</div>`;
}

function catalogueMain(products) {
  const categories = [...new Set(products.map((product) => product.categoryLabel))].sort();
  return `<main class="bask-page">
  <section class="bask-shell bask-hero">
    <div>
      <div class="bask-eyebrow">Bask Objects / Catalogue</div>
      <h1 class="bask-title">Objects for slow homes.</h1>
      <p class="bask-lede">A working catalogue of ${products.length} approved Bask product images, loaded from the local inventory and photographed into one restrained editorial direction.</p>
      <div class="bask-meta-row" style="margin-top:1.5rem">
        <span class="bask-pill">${products.length} photographed products</span>
        <span class="bask-pill">${categories.length} categories</span>
        <span class="bask-pill">NZ pricing</span>
      </div>
    </div>
    ${heroCard(products[0], 'Current edit')}
  </section>
  <section class="bask-shell bask-section">
    <div class="bask-section-head">
      <h2>Catalogue</h2>
      <div class="bask-filter-row">${categories.map((category) => `<span class="bask-pill">${escapeHtml(category)}</span>`).join('')}</div>
    </div>
    ${productGrid(products)}
  </section>
</main>`;
}

function homeMain(products) {
  const feature = products.slice(0, 12);
  return `<main class="bask-page">
  <section class="bask-shell bask-hero">
    <div>
      <div class="bask-eyebrow">Bask / Objects</div>
      <h1 class="bask-title">Furniture with room to breathe.</h1>
      <p class="bask-lede">Bask curates useful furniture for slow New Zealand homes. The catalogue is now driven by approved Bask product imagery rather than supplier photography.</p>
      <div class="bask-meta-row" style="margin-top:1.5rem">
        <a class="bask-button" href="/products/">Shop catalogue</a>
        <span class="bask-pill">Approved Flux images only</span>
      </div>
    </div>
    ${heroCard(products[1] || products[0], 'New catalogue')}
  </section>
  <section class="bask-shell bask-section">
    <div class="bask-section-head">
      <h2>New objects</h2>
      <p class="bask-note">Every image below comes from the approved images/bask-catalogue output set. Unreviewed renders stay out of the live storefront.</p>
    </div>
    ${productGrid(feature)}
  </section>
</main>`;
}

function lookbookMain(products) {
  const picks = [products[2], products[7], products[13], products[19], products[25], products[31]].filter(Boolean);
  return `<main class="bask-page">
  <section class="bask-shell bask-hero">
    <div>
      <div class="bask-eyebrow">Lookbook</div>
      <h1 class="bask-title">Quiet rooms, useful pieces.</h1>
      <p class="bask-lede">Editorial product scenes selected for clean geometry, stable backgrounds, and no visible AI collision artefacts.</p>
    </div>
    ${heroCard(picks[0] || products[0], 'Lookbook lead')}
  </section>
  <section class="bask-shell bask-section">
    <div class="bask-feature-grid">
      ${picks.map((product) => `<a class="bask-feature" href="${product.detailUrl}"><img src="${product.image}" alt="${escapeHtml(product.name)}"><span>${escapeHtml(product.name)}</span></a>`).join('\n')}
    </div>
  </section>
</main>`;
}

function detailMain(product, related) {
  return `<main class="bask-page">
  <section class="bask-shell bask-product-layout">
    <div class="bask-product-detail-card">
      <div class="bask-product-detail-media"><img src="${product.image}" alt="${escapeHtml(product.name)}"></div>
    </div>
    <div class="bask-product-detail-copy">
      <div class="bask-product-meta">${escapeHtml(product.categoryLabel)}</div>
      <h1 class="bask-product-title">${escapeHtml(product.name)}</h1>
      <div class="bask-card__price">${escapeHtml(product.price)}</div>
      <p>${escapeHtml(product.description)}</p>
      <div class="bask-specs">
        <div class="bask-spec"><strong>Availability</strong>Confirm before checkout</div>
        <div class="bask-spec"><strong>Price</strong>${escapeHtml(product.price)}</div>
        <div class="bask-spec"><strong>Category</strong>${escapeHtml(product.categoryLabel)}</div>
        <div class="bask-spec"><strong>Image status</strong>Approved Bask catalogue render</div>
      </div>
      <a class="bask-button" href="/contact/">Enquire about this object</a>
      <p class="bask-note">Stock and fulfilment are confirmed before payment. Supplier names and supplier imagery are intentionally not exposed on the storefront.</p>
    </div>
  </section>
  <section class="bask-shell bask-section">
    <div class="bask-section-head">
      <h2>Related</h2>
      <p class="bask-note">More objects from the same catalogue set.</p>
    </div>
    ${productGrid(related)}
  </section>
</main>`;
}

function buildPage(shellFile, main) {
  const { top, bottom } = splitShell(shellFile);
  return brandClean(`${top}\n${main}\n${bottom}`);
}

function buildSimpleContentPages(products) {
  const about = buildPage('about-us.html', `<main class="bask-page"><section class="bask-shell bask-hero"><div><div class="bask-eyebrow">About Bask</div><h1 class="bask-title">Objects for slower rooms.</h1><p class="bask-lede">Bask is a curated furniture storefront for New Zealand homes: restrained, practical, and edited around calm interiors rather than supplier noise.</p></div>${heroCard(products[4] || products[0], 'About')}</section></main>`);
  const contact = buildPage('contact.html', `<main class="bask-page"><section class="bask-shell bask-hero bask-hero--contact"><div><div class="bask-eyebrow">Contact</div><h1 class="bask-title bask-title--action">Ask about an object.</h1><p class="bask-lede">For stock checks, delivery questions, and product details, send the product name and delivery region.</p><div class="bask-contact-actions"><a class="bask-button" href="mailto:hello@baskobjects.co.nz">hello@baskobjects.co.nz</a><span class="bask-note">Include the product name and delivery region so we can confirm stock quickly.</span></div></div>${heroCard(products[5] || products[0], 'Enquiry ready')}</section></main>`);
  write('about-us.html', about);
  write(path.join('about-us', 'index.html'), about);
  write('contact.html', contact);
  write(path.join('contact', 'index.html'), contact);
}

function writeDetails(products) {
  const shell = 'products.html';
  for (const product of products) {
    const related = products.filter((item) => item.slug !== product.slug && item.categoryLabel === product.categoryLabel).slice(0, 4);
    const fallback = products.filter((item) => item.slug !== product.slug).slice(0, 4);
    write(path.join('products', product.slug, 'index.html'), buildPage(shell, detailMain(product, related.length ? related : fallback)));
  }
}

function writeData(products) {
  write('catalogue-data.json', `${JSON.stringify({
    generated_at: new Date().toISOString(),
    source: SOURCE_IMAGE_DIR,
    count: products.length,
    products: products.map(({ slug, name, categoryLabel, price, image, detailUrl }) => ({ slug, name, category: categoryLabel, price, image, detailUrl }))
  }, null, 2)}\n`);
}

function replaceRemainingBrandMentions() {
  for (const file of pageFiles) {
    if (!fs.existsSync(path.join(SITE_ROOT, file))) continue;
    write(file, brandClean(read(file)));
  }
  for (const dir of ['about-us', 'contact', 'lookbook', 'products']) {
    const file = path.join(dir, 'index.html');
    if (fs.existsSync(path.join(SITE_ROOT, file))) write(file, brandClean(fs.readFileSync(path.join(SITE_ROOT, file), 'utf8')));
  }
}

function main() {
  const products = loadProducts();
  if (!products.length) throw new Error(`No approved catalogue images found at ${SOURCE_IMAGE_DIR}`);
  copyImages(products);
  const home = buildPage('index.html', homeMain(products));
  const catalogue = buildPage('products.html', catalogueMain(products));
  const lookbook = buildPage('lookbook.html', lookbookMain(products));
  write('index.html', home);
  write('products.html', catalogue);
  write(path.join('products', 'index.html'), catalogue);
  write('lookbook.html', lookbook);
  write(path.join('lookbook', 'index.html'), lookbook);
  buildSimpleContentPages(products);
  writeDetails(products);
  writeData(products);
  replaceRemainingBrandMentions();
  console.log(`Built Bask static catalogue with ${products.length} approved product images.`);
}

main();
