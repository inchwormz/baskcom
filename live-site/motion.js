(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none)');
  const out = 'cubic-bezier(.23,1,.32,1)';
  const travel = 'cubic-bezier(.77,0,.175,1)';
  const all = (selector, owner = document) => [...owner.querySelectorAll(selector)];
  all('.bask-header__nav').forEach(link => {
    if (link.getAttribute('href') === location.pathname) link.setAttribute('aria-current', 'page');
  });
  function animate(element, frames, options) {
    if (!element || reduced.matches) return null;
    return element.animate(frames, { easing: out, ...options });
  }
  function toggle(trigger, panel, open) {
    trigger.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
  }
  const menu = document.querySelector('.bask-menu-toggle');
  const menuPanel = document.querySelector('#bask-mobile-menu');
  const collections = document.querySelector('.bask-collections-toggle');
  const collectionsPanel = document.querySelector('#bask-collections');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    toggle(menu, menuPanel, open);menu.firstElementChild.textContent = open ? 'Close' : 'Menu';
  });
  collections?.addEventListener('click', () => toggle(collections, collectionsPanel, collections.getAttribute('aria-expanded') !== 'true'));
  const products = document.querySelector('.bask-products');
  products?.addEventListener('pointerenter', () => { if (!coarse.matches) toggle(collections, collectionsPanel, true); });
  document.querySelector('.bask-header')?.addEventListener('pointerleave', () => { if (!coarse.matches) toggle(collections, collectionsPanel, false); });
  document.addEventListener('click', event => { if (!event.target.closest('.bask-header')) { toggle(menu, menuPanel, false);menu.firstElementChild.textContent = 'Menu';toggle(collections, collectionsPanel, false); } });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const active = menu.getAttribute('aria-expanded') === 'true' ? menu : collections;
    toggle(menu, menuPanel, false);menu.firstElementChild.textContent = 'Menu';toggle(collections, collectionsPanel, false);active.focus();
  });
  function split(element) {
    const text = element.textContent.trim();
    element.setAttribute('aria-label', text);element.textContent = '';
    for (const [index, word] of text.split(/\s+/).entries()) {
      if (index) element.append(document.createTextNode(' '));
      const wrapper = document.createElement('span');wrapper.className = 'bask-word';wrapper.setAttribute('aria-hidden', 'true');
      for (const char of word) { const span = document.createElement('span');span.className = 'bask-char';span.textContent = char;wrapper.append(span); }
      element.append(wrapper);
    }
    return all('.bask-char', element);
  }
  function titleIn(element, delay = 0) {
    all('.bask-char', element).forEach((char, i) => {
      char.getAnimations().forEach(animation => animation.cancel());
      animate(char, [{opacity:0,transform:'translate3d(0,65%,0) rotateX(-65deg)'},{opacity:1,transform:'translate3d(0,0,0) rotateX(0)'}], {duration:1100,delay:delay+i*12,fill:'backwards'});
    });
  }
  animate(document.querySelector('.bask-about-photo img'), [{transform:'scale(1.08)'},{transform:'scale(1)'}], {duration:1600});
  const slides = all('.hero-slider-image');const thumbs = all('.hero-slider-thumbnail');const mobileSlides = all('.hero-slider-mobile');
  let active = 0, timer, revision = 0;const moving = new Set();let heroVisible = true;
  all('.hero-slider-title,.hero-slider-title-mobile').forEach(split);
  function settled(index) {
    slides.forEach((slide, i) => {
      slide.dataset.active = String(i === index);slide.style.visibility = i === index ? 'visible' : 'hidden';slide.style.zIndex = i === index ? '3' : '1';slide.style.transform = 'translate3d(0,0,0)';slide.querySelector('.hero-slider-image-inner').style.transform = 'translate3d(0,0,0)';
    });
    mobileSlides.forEach((slide, i) => { slide.dataset.active = String(i === index);slide.inert = i !== index; });
    thumbs.forEach((thumb, i) => { thumb.classList.toggle('a', i === index);thumb.setAttribute('aria-selected', String(i === index));thumb.tabIndex = i === index ? 0 : -1; });
  }
  function nextTimer() {
    clearTimeout(timer);all('.hero-slider-thumbnail-progress').forEach(progress => { progress.getAnimations().forEach(a => a.cancel());progress.style.transform = 'scaleX(0)'; });
    if (reduced.matches || document.hidden || !heroVisible || slides.length < 2) return;
    const next = (active + 1) % slides.length;
    animate(thumbs[next]?.querySelector('.hero-slider-thumbnail-progress'), [{transform:'scaleX(1)'},{transform:'scaleX(0)'}], {duration:5000,easing:'linear',fill:'both'});
    timer = setTimeout(() => go(next), 5000);
  }
  async function go(index) {
    if (index === active) return;clearTimeout(timer);const token = ++revision;
    moving.forEach(animation => animation.cancel());moving.clear();settled(active);
    const old = slides[active], incoming = slides[index], inner = incoming.querySelector('.hero-slider-image-inner');
    incoming.style.visibility = 'visible';incoming.style.zIndex = '4';incoming.dataset.active = 'true';
    thumbs.forEach((thumb, i) => { thumb.classList.toggle('a', i === index);thumb.setAttribute('aria-selected', String(i === index));thumb.tabIndex = i === index ? 0 : -1; });
    mobileSlides.forEach((slide, i) => { slide.dataset.active = String(i === index);slide.inert = i !== index; });
    const slideAnimation = animate(incoming, [{transform:'translate3d(100%,0,0)'},{transform:'translate3d(0,0,0)'}], {duration:1500,easing:travel,fill:'both'});
    const counter = animate(inner, [{transform:'translate3d(-100%,0,0)'},{transform:'translate3d(0,0,0)'}], {duration:1500,easing:travel,fill:'both'});
    const zoom = animate(incoming.querySelector('.image'), [{transform:'scale(1.08)'},{transform:'scale(1)'}], {duration:2000,fill:'both'});
    const overlay = animate(old?.querySelector('.hero-slider-image-overlay'), [{opacity:0},{opacity:.5}], {duration:1000,fill:'both'});
    [slideAnimation,counter,zoom,overlay].filter(Boolean).forEach(a => moving.add(a));
    titleIn(incoming.querySelector('.hero-slider-title'), matchMedia('(max-width:1023px)').matches ? 200 : 800);titleIn(mobileSlides[index]?.querySelector('.hero-slider-title-mobile'), 200);
    active = index;
    if (slideAnimation) { try { await slideAnimation.finished; } catch { return; } }
    if (token !== revision) return;
    moving.forEach(animation => animation.cancel());moving.clear();settled(index);nextTimer();
  }
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => go(i));
    thumb.addEventListener('keydown', event => { let next;if(event.key==='ArrowRight')next=(i+1)%thumbs.length;if(event.key==='ArrowLeft')next=(i+thumbs.length-1)%thumbs.length;if(event.key==='Home')next=0;if(event.key==='End')next=thumbs.length-1;if(event.key==='Enter'||event.key===' ')next=i;if(next===undefined)return;event.preventDefault();go(next);thumbs[next].focus(); });
  });
  if(slides.length){settled(0);animate(slides[0].querySelector('.image'),[{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:1600});titleIn(slides[0].querySelector('.hero-slider-title'));titleIn(mobileSlides[0]?.querySelector('.hero-slider-title-mobile'));nextTimer();
    const heroObserver = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting;nextTimer(); }, {threshold:0});heroObserver.observe(document.querySelector('.hero-slider-wrapper'));
  }
  document.addEventListener('visibilitychange', nextTimer);reduced.addEventListener('change', () => { if(reduced.matches)document.getAnimations().forEach(animation=>animation.cancel());moving.forEach(a=>a.cancel());moving.clear();settled(active);nextTimer(); });
  all('.dropdown').forEach((dropdown, i) => {
    const trigger = dropdown.querySelector('.dropdown-head'), panel = dropdown.querySelector('.dropdown-content');
    if(!trigger || !panel)return;panel.id ||= `bask-answer-${i}`;trigger.setAttribute('aria-controls',panel.id);
    const update = open => {dropdown.classList.toggle('active',open);trigger.setAttribute('aria-expanded',String(open));panel.inert=!open;panel.style.height=open?panel.scrollHeight+'px':'0px';};
    update(dropdown.classList.contains('active'));trigger.addEventListener('click',()=>update(!dropdown.classList.contains('active')));trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();trigger.click();}});
    new ResizeObserver(()=>{if(dropdown.classList.contains('active'))panel.style.height=panel.firstElementChild.scrollHeight+'px';}).observe(panel.firstElementChild);
  });
  all('.bask-highlight-words button').forEach((button,index)=>button.addEventListener('click',()=>{
    all('.bask-highlight-words button').forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));all('.bask-highlight-copy').forEach((p,i)=>p.hidden=i!==index);all('.bask-highlight-media img').forEach((img,i)=>img.style.opacity=i===index?'1':'0');
  }));
  const filterButtons = all('[data-filter-category]');
  const productCards = all('[data-product-category]');
  const search = document.querySelector('#bask-product-search');
  let category = '';
  const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/ø/g,'o').replace(/æ/g,'ae');
  function filterProducts() {
    const query = normalize(search?.value || '');let count = 0;
    productCards.forEach(card => { const show = (!category || card.dataset.productCategory === category) && normalize(card.dataset.productName).includes(query);card.hidden = !show;if(show)count++; });
    document.querySelector('#bask-product-count').textContent = `${count} ${count === 1 ? 'object' : 'objects'}`;
    document.querySelector('.bask-no-results').hidden = count > 0;
  }
  filterButtons.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filterCategory;filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterProducts();}));
  search?.addEventListener('input',filterProducts);
  const filterDetails = document.querySelector('.bask-filters details');if(filterDetails && coarse.matches)filterDetails.open=false;
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if(!entry.isIntersecting)return;const element=entry.target;
    if(element.matches('.title-animation'))titleIn(element);else animate(element,[{opacity:0,transform:'translate3d(0,24px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:850});reveal.unobserve(element);
  }),{threshold:.01,rootMargin:'0px 0px -6% 0px'});
  all('.title-animation').forEach(element => {
    const heading = element.querySelector('.head-title-elt');
    if (heading) all('[data-motion-line]', heading).forEach(split);
    else split(element);
  });
  all('.title-animation,[data-reveal],.card-product').forEach(e=>reveal.observe(e));
  const parallax = all('.parallax-image img');let scheduled=false;
  function scroll(){scheduled=false;if(reduced.matches||coarse.matches)return;const height=innerHeight;parallax.forEach(img=>{const rect=img.parentElement.getBoundingClientRect();if(rect.bottom<0||rect.top>height)return;const offset=Math.max(-24,Math.min(24,((rect.top+rect.height/2-height/2)/height)*-36));img.style.transform=`translate3d(0,${offset}px,0) scale(1.06)`;});}
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scroll);}},{passive:true});
  all('.marquee-w').forEach(track=>{if(reduced.matches)return;const copies=all('.bask-marquee-copy',track);if(!copies.length)return;track.innerHTML=copies[0].outerHTML+copies[0].outerHTML;const distance=track.firstElementChild.getBoundingClientRect().width;animate(track,[{transform:'translate3d(0,0,0)'},{transform:`translate3d(-${distance}px,0,0)`}],{duration:distance/100*1000,easing:'linear',iterations:Infinity});});
  addEventListener('pagehide',()=>{clearTimeout(timer);moving.forEach(a=>a.cancel());});
})();
