/* Ends United 7v7 — motion and small interactions (Damora Digital build; v2 2026-11-14: the whole page is one scroll film,
   run by film-engine.js, the shared engine. This file keeps the page's own small interactions.) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* theme toggle (follows the phone until the visitor picks) */
  const themeBtn = $('.theme');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = cur === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('eu-theme', next); } catch (e) {}
  });

  /* split headlines into words (one short move per section) */
  $$('[data-split]').forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
    let k = 0; $$('.w > span', el).forEach((s) => { s.style.transitionDelay = Math.min(k++ * 0.024, 0.12) + 's'; });
  });

  /* counters */
  $$('[data-count]').forEach((el) => {
    el.dataset.countFinal = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
  });
  const runCount = (el) => {
    const end = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce || end <= 1) { el.textContent = el.dataset.countFinal; return; }
    const t0 = performance.now(), dur = 550;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + v + suf;
      if (p < 1) requestAnimationFrame(step); else el.textContent = el.dataset.countFinal;
    };
    el.textContent = pre + '0' + suf; requestAnimationFrame(step);
  };

  /* reveals: fire as the block enters */
  const staggerFor = (el) => {
    const sibs = [...el.parentNode.children].filter((c) => c.classList.contains('reveal'));
    return sibs.length > 1 ? Math.min(sibs.indexOf(el) * 0.04, 0.14) : 0;
  };
  const targets = $$('.reveal, [data-split], .chap, [data-count]');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => { el.classList.add('in', 'done'); if (el.dataset.count) el.textContent = el.dataset.countFinal; });
  } else {
    targets.forEach((el) => { if (el.classList.contains('reveal')) el.style.transitionDelay = staggerFor(el) + 's'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target; el.classList.add('in');
        if (el.matches('[data-split], .chap')) setTimeout(() => el.classList.add('done'), 500);
        if (el.dataset.count) runCount(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  }

  /* header: clear over the hero, solid once the hero lets go; the phone bar steps aside where buttons already are */
  const top = $('.top');
  const homebar = $('[data-homebar]');
  let heroEnd = innerHeight;
  let nearEnd = false;
  const quiet = new Map();
  const onScrollUI = () => {
    if (top && !document.body.classList.contains('fr')) top.classList.toggle('solid', scrollY > heroEnd - 40);
    if (homebar) homebar.classList.toggle('show', scrollY > heroEnd && !nearEnd);
  };
  if (homebar && 'IntersectionObserver' in window) {
    const zo = new IntersectionObserver((es) => {
      es.forEach((e) => quiet.set(e.target, e.isIntersecting));
      nearEnd = [...quiet.values()].some(Boolean); onScrollUI();
    }, { threshold: 0 });
    $$('.fund .card, .end, .foot').forEach((z) => zo.observe(z));
  }

  /* THE FILM lives in film-engine.js (the shared Damora scroll film engine, scripts/scrollfilm/ in the vault).
     It tells us where the hero lets go, so the header turns solid and the phone bar shows after it. */
  addEventListener('scrollfilm', (e) => { heroEnd = e.detail.heroEnd; onScrollUI(); });
  if (window.ScrollFilm) heroEnd = window.ScrollFilm.heroEnd;
  addEventListener('scroll', onScrollUI, { passive: true });
  onScrollUI();

  /* players strip: whole graphics, one card per step, a counter */
  const strip = $('.strip');
  if (strip) {
    const figs = $$('figure', strip), atEl = $('[data-strip-at]'), nEl = $('[data-strip-n]');
    const prev = $('[data-strip="-1"]'), next = $('[data-strip="1"]');
    if (nEl) nEl.textContent = figs.length;
    const at = () => {
      const left = strip.getBoundingClientRect().left + parseFloat(getComputedStyle(strip).paddingLeft || 0);
      let best = 0, bd = 1e9;
      figs.forEach((f, i) => { const d = Math.abs(f.getBoundingClientRect().left - left); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const update = () => {
      if (atEl) atEl.textContent = at() + 1;
      if (prev) prev.setAttribute('aria-disabled', strip.scrollLeft < 4 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', strip.scrollLeft > strip.scrollWidth - strip.clientWidth - 4 ? 'true' : 'false');
    };
    let su = 0;
    strip.addEventListener('scroll', () => { if (!su) su = requestAnimationFrame(() => { su = 0; update(); }); }, { passive: true });
    [prev, next].forEach((b) => b && b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      const i = Math.max(0, Math.min(figs.length - 1, at() + (+b.dataset.strip)));
      const f = figs[i];
      const delta = f.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft || 0);
      strip.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' });
    }));
    addEventListener('resize', update);
    update();
  }

  /* fundraiser countdown, and one closed state for every page once orders close */
  const DELIVERED = new Date('2026-12-07T00:00:00-05:00').getTime();
  const closeFundraiser = () => {
    const root = document.documentElement;
    if (root.classList.contains('fund-closed')) return;
    root.classList.add('fund-closed');
    const after = Date.now() >= DELIVERED;
    $$('[data-closed-text]').forEach((el) => { el.textContent = el.dataset.closedText; });
    $$('[data-closed-href]').forEach((el) => { el.setAttribute('href', el.dataset.closedHref); });
    $$('[data-arrive]').forEach((el) => { el.textContent = after ? 'Plants went out in early December. Thank you for backing the team.' : el.dataset.arrive; });
    if (after) root.classList.add('fund-delivered');
  };
  $$('.clock[data-deadline]').forEach((clock) => {
    const end = new Date(clock.dataset.deadline).getTime();
    const out = { d: $('[data-k="d"]', clock), h: $('[data-k="h"]', clock), m: $('[data-k="m"]', clock) };
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (s === 0) {
        const after = Date.now() >= DELIVERED;
        clock.innerHTML = '<div style="min-width:auto;padding:14px 16px"><b style="font-size:22px">Orders closed</b><small>' + (after ? 'Thank you, Ends United family' : 'Plants arrive Dec 4') + '</small></div>';
        closeFundraiser(); return;
      }
      const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60);
      out.d.textContent = d; out.h.textContent = String(h).padStart(2, '0'); out.m.textContent = String(m).padStart(2, '0');
      setTimeout(tick, Math.min(30000, Math.max(1000, end - Date.now() + 200)));
    };
    tick();
  });

  /* tryout list: opens the visitor's email with the details filled in (nothing is stored on this site) */
  const form = $('#tryout-form');
  if (form) form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form), name = (f.get('name') || '').toString().trim();
    const nameIn = form.querySelector('#t-name'), err = form.querySelector('#t-name-err');
    if (!name) { nameIn.setAttribute('aria-invalid', 'true'); if (err) err.hidden = false; nameIn.focus(); return; }
    nameIn.removeAttribute('aria-invalid'); if (err) err.hidden = true;
    const pos = f.getAll('pos').join(', ');
    const lines = [
      'Hi Ends United,', '', 'Please add me to the tryout list.', '',
      'Player: ' + name,
      'Grad year: ' + (f.get('grad') || '-'),
      'Position: ' + (pos || '-'),
      'School: ' + (f.get('school') || '-'),
      'City: ' + (f.get('city') || '-'),
      'Parent or guardian: ' + (f.get('parent') || '-'),
      'Parent phone: ' + (f.get('pphone') || '-'),
      'Highlights: ' + (f.get('film') || '-'), '', 'Thanks!'
    ];
    location.href = 'mailto:endsunitedfb@gmail.com?subject=' + encodeURIComponent('Tryout list: ' + name) + '&body=' + encodeURIComponent(lines.join('\n'));
  });
})();
