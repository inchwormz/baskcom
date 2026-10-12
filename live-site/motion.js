(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none)');
  const out = 'cubic-bezier(.23,1,.32,1)';
  const all = (selector, owner = document) => [...owner.querySelectorAll(selector)];
  function syncPrimaryNav() {
    all('.bask-header__nav,#bask-mobile-menu a').forEach(link => {
      const url=new URL(link.getAttribute('href'),location.href);
      const active=url.pathname===location.pathname && (url.hash ? url.hash===location.hash : (url.pathname!=='/shop/' || !location.hash));
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
  }
  syncPrimaryNav();addEventListener('hashchange',syncPrimaryNav);
  function animate(element, frames, options) {
    if (!element || reduced.matches) return null;
    return element.animate(frames, { easing: out, ...options });
  }
  const header = document.querySelector('.bask-header');
  const menu = document.querySelector('.bask-menu-toggle');
  const menuPanel = document.querySelector('#bask-mobile-menu');
  const collections = document.querySelector('.bask-collections-toggle');
  const collectionsPanel = document.querySelector('#bask-collections');
  const mobileNavigation = matchMedia('(max-width:1100px)');
  let pinnedCollections = false, closeTimer, savedOverflow;
  const backgroundState = new Map();
  function toggle(trigger, panel, open) {
    trigger.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
  }
  function setMenu(open, focus = false) {
    if (open && !mobileNavigation.matches) return;
    const wasOpen = menu.getAttribute('aria-expanded') === 'true';
    toggle(menu, menuPanel, open);
    menu.querySelector('.bask-menu-label').textContent = open ? 'Close' : 'Menu';
    header.classList.toggle('has-mobile-menu', open);
    if (open && !wasOpen) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      all('main,.bask-footer').forEach(element => { backgroundState.set(element,element.inert);element.inert=true; });
      if (focus) menuPanel.querySelector('a').focus();
    } else if (!open && wasOpen) {
      document.body.style.overflow = savedOverflow || '';
      backgroundState.forEach((inert,element) => {element.inert=inert;});backgroundState.clear();
    }
  }
  function setCollections(open, pinned = false) {
    clearTimeout(closeTimer);pinnedCollections = open && pinned;
    toggle(collections,collectionsPanel,open && !mobileNavigation.matches);
  }
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true',true));
  collections.addEventListener('click', () => {
    const open = collections.getAttribute('aria-expanded') === 'true';
    setCollections(!open || !pinnedCollections,true);
  });
  all('#bask-collections a,#bask-mobile-menu a').forEach(link => link.addEventListener('click',() => {setMenu(false);setCollections(false);}));
  document.querySelector('.bask-products').addEventListener('pointerenter',event => {if(event.pointerType==='mouse' && !mobileNavigation.matches){clearTimeout(closeTimer);if(!pinnedCollections)setCollections(true);}});
  header.addEventListener('pointerenter',()=>clearTimeout(closeTimer));
  header.addEventListener('pointerleave',event => {if(event.pointerType==='mouse' && !pinnedCollections)closeTimer=setTimeout(()=>setCollections(false),180);});
  document.querySelector('.bask-menu-backdrop').addEventListener('click',()=>{setMenu(false);menu.focus();});
  document.addEventListener('click',event => {if(!event.target.closest('.bask-header')){setMenu(false);setCollections(false);}});
  document.addEventListener('keydown',event => {
    const menuOpen = menu.getAttribute('aria-expanded') === 'true';
    const collectionsOpen = collections.getAttribute('aria-expanded') === 'true';
    if(event.key==='Escape' && (menuOpen || collectionsOpen)) {
      event.preventDefault();setMenu(false);setCollections(false);(menuOpen?menu:collections).focus();
    } else if(event.key==='Tab' && menuOpen) {
      const focusable=all('a[href],button',header).filter(e=>e.tabIndex>=0 && !e.closest('[inert]') && e.getClientRects().length && getComputedStyle(e).visibility==='visible');
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  header.addEventListener('focusout',()=>setTimeout(()=>{if(!header.contains(document.activeElement)){setCollections(false);}},0));
  mobileNavigation.addEventListener('change',()=>{setMenu(false);setCollections(false);});

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
    const chars=all('.bask-char', element);
    chars.forEach((char, i) => {
      char.getAnimations().forEach(animation => animation.cancel());
      animate(char, [{opacity:0,transform:'translate3d(0,65%,0) rotateX(-65deg)'},{opacity:1,transform:'translate3d(0,0,0) rotateX(0)'}], {duration:1300,delay:delay+i*120/Math.max(chars.length-1,1),fill:'backwards'});
    });
  }
  animate(document.querySelector('.bask-about-photo img'), [{transform:'scale(1.08)'},{transform:'scale(1)'}], {duration:1600});
  const slides=all('.hero-slider-image'),thumbs=all('.hero-slider-thumbnail'),mobileSlides=all('.hero-slider-mobile'),hero=document.querySelector('.hero-slider-wrapper');
  let active=0,timer,revision=0,heroVisible=true;const moving=new Set();
  all('.hero-slider-title,.hero-slider-title-mobile').forEach(split);
  function settled(index){
    slides.forEach((slide,i)=>{slide.dataset.active=String(i===index);slide.inert=i!==index;slide.style.visibility=i===index?'visible':'hidden';slide.style.zIndex=i===index?'3':'1';slide.style.transform='translate3d(0,0,0)';slide.querySelector('.hero-slider-image-inner').style.transform='translate3d(0,0,0)';});
    mobileSlides.forEach((slide,i)=>{slide.dataset.active=String(i===index);slide.inert=i!==index;});
    thumbs.forEach((thumb,i)=>{thumb.classList.toggle('a',i===index);thumb.setAttribute('aria-selected',String(i===index));thumb.tabIndex=i===index?0:-1;});
  }
  function nextTimer(){
    clearTimeout(timer);all('.hero-slider-thumbnail-progress').forEach(progress=>{progress.getAnimations().forEach(a=>a.cancel());progress.style.transform='scaleX(0)';});
    if(document.hidden||!heroVisible||slides.length<2)return;
    const next=(active+1)%slides.length;animate(thumbs[next]?.querySelector('.hero-slider-thumbnail-progress'),[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:6000,easing:'linear',fill:'both'});timer=setTimeout(()=>go(next),6000);
  }
  function heroTitle(element){if(!element)return;element.getAnimations({subtree:true}).forEach(a=>a.cancel());animate(element,[{opacity:0,transform:'translate3d(0,12px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:260,delay:80,fill:'backwards'});}
  async function go(index){
    if(!slides.length||index===active)return;clearTimeout(timer);const token=++revision;moving.forEach(a=>a.cancel());moving.clear();settled(active);const old=slides[active],incoming=slides[index];
    const img=incoming.querySelector('img');img.loading='eager';try{await img.decode();}catch{}if(token!==revision)return;
    const direction=index===((active+slides.length-1)%slides.length)?-1:1;incoming.style.visibility='visible';incoming.style.zIndex='4';incoming.dataset.active='true';incoming.inert=false;old.inert=true;old.dataset.active='false';
    thumbs.forEach((thumb,i)=>{thumb.classList.toggle('a',i===index);thumb.setAttribute('aria-selected',String(i===index));thumb.tabIndex=i===index?0:-1;});mobileSlides.forEach((slide,i)=>{slide.dataset.active=String(i===index);slide.inert=i!==index;});
    const slideAnimation=animate(incoming,[{transform:`translate3d(${direction*100}%,0,0)`},{transform:'translate3d(0,0,0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    const counter=animate(incoming.querySelector('.hero-slider-image-inner'),[{transform:`translate3d(${-direction*25}%,0,0)`},{transform:'translate3d(0,0,0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    const departing=animate(old,[{transform:'translate3d(0,0,0)'},{transform:`translate3d(${-direction*15}%,0,0)`}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    [slideAnimation,counter,departing].filter(Boolean).forEach(a=>moving.add(a));heroTitle(incoming.querySelector('.hero-slider-title'));heroTitle(mobileSlides[index]?.querySelector('.hero-slider-title-mobile'));active=index;
    if(slideAnimation){try{await slideAnimation.finished;}catch{return;}}if(token!==revision)return;moving.forEach(a=>a.cancel());moving.clear();settled(index);nextTimer();
  }
  thumbs.forEach((thumb,i)=>{thumb.addEventListener('click',()=>go(i));thumb.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%thumbs.length;if(event.key==='ArrowLeft')next=(i+thumbs.length-1)%thumbs.length;if(event.key==='Home')next=0;if(event.key==='End')next=thumbs.length-1;if(event.key==='Enter'||event.key===' ')next=i;if(next===undefined)return;event.preventDefault();go(next);thumbs[next].focus();});});
  if(hero&&slides.length){settled(0);heroTitle(slides[0].querySelector('.hero-slider-title'));heroTitle(mobileSlides[0]?.querySelector('.hero-slider-title-mobile'));nextTimer();let start;hero.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!event.target.closest('button,.hero-slider-thumbnail'))start={x:event.clientX,y:event.clientY};});hero.addEventListener('pointerup',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){hero.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();},{capture:true,once:true});go((active+(dx<0?1:slides.length-1))%slides.length);}});hero.addEventListener('pointercancel',()=>start=null);new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;nextTimer();},{threshold:0}).observe(hero);}
  document.addEventListener('visibilitychange',nextTimer);reduced.addEventListener('change',()=>{moving.forEach(a=>a.cancel());moving.clear();if(slides.length)settled(active);nextTimer();});

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
  let selectedCategories = [], requestedCollection = null;
  const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/ø/g,'o').replace(/æ/g,'ae');
  function filterProducts() {
    const query = normalize(search?.value || '');let count = 0;
    productCards.forEach(card => { const show = (!selectedCategories.length || selectedCategories.includes(card.dataset.productCategory)) && normalize(card.dataset.productName).includes(query);card.hidden = !show;if(show)count++; });
    document.querySelector('#bask-product-count').textContent = `${count} ${count === 1 ? 'object' : 'objects'}`;
    const empty = document.querySelector('.bask-no-results');empty.hidden = count > 0;empty.textContent = 'No matching objects. Try a different name or category.';
    if (!count && requestedCollection) {
      empty.textContent = `Ask Bask about the ${requestedCollection} collection. `;
      const link = document.createElement('a');link.textContent = 'Email Bask ↗';link.href = `mailto:hello@baskobjects.co.nz?subject=${encodeURIComponent('Collection enquiry: '+requestedCollection)}`;empty.append(link);
    }
  }
  function clearFilterHash() {
    if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);syncPrimaryNav();
  }
  filterButtons.forEach(button=>button.addEventListener('click',()=>{selectedCategories=button.dataset.filterCategory?[button.dataset.filterCategory]:[];requestedCollection=null;clearFilterHash();filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterProducts();}));
  search?.addEventListener('input',()=>{requestedCollection=null;clearFilterHash();filterProducts();});
  const filterDetails = document.querySelector('.bask-filters details');
  if (filterDetails) {
    const compactFilters = matchMedia('(max-width:1100px)');filterDetails.open=!compactFilters.matches;
    compactFilters.addEventListener('change',event=>{filterDetails.open=!event.matches;});
    const rooms = {coffee:['Coffee Table'],dining:['Dining Table','Dining Chair','Bench'],bedside:['Bedside Table'],bedroom:['Bedside Table','Dressing Table','Wardrobe'],living:['Coffee Table','Side Table','Sideboard','Display Cabinet Rack'],office:['Office Furniture','Office Chair'],shoe:['Shoe Cabinet'],storage:['Sideboard','Wardrobe','Display Cabinet Rack','Shoe Cabinet'],dressers:['Dressing Table'],desks:['Office Furniture']};
    const collectionNames = {orel:'Ørel',halda:'Halda',vaela:'Væla',niso:'Niso',eira:'Eira',ansel:'Ånsel',vek:'Vek',mira:'Mira',iselin:'Iselin',nela:'Nelä',solve:'Sølve',bram:'Bråm',tova:'Tova'};
    const aliases = {arezzo:'orel',corsi:'halda',platsa:'vaela',turin:'niso',stoven:'eira',polia:'ansel',modena:'vek',apulia:'mira',pavia:'iselin',viviere:'nela',ovada:'solve',busca:'bram'};
    function hashFilter() {
      let key;try {key=decodeURIComponent(location.hash.slice(1));}catch{return;}key=aliases[key]||key;
      if (!key) { selectedCategories=[];requestedCollection=null;search.value='';filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(!button.dataset.filterCategory)));filterProducts();return; }
      if (!rooms[key] && !collectionNames[key]) return;
      selectedCategories=rooms[key]||[];requestedCollection=collectionNames[key]||null;search.value=requestedCollection||'';
      filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(selectedCategories.length?selectedCategories.includes(button.dataset.filterCategory):!button.dataset.filterCategory)));
      filterProducts();
    }
    hashFilter();addEventListener('hashchange',hashFilter);
  }
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
