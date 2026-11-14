/* Ends United holiday plant fundraiser: order builder. Nothing is stored on a server; the order goes to the player by text or email. */
(() => {
  const D = window.EU_FUNDRAISER; if (!D) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => '$' + n.toLocaleString('en-CA');
  const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const closed = () => Date.now() >= new Date(D.deadline).getTime();
  const delivered = () => Date.now() >= new Date('2026-12-07T00:00:00-05:00').getTime();
  // players are minors: a shared link only ever carries a first name and last initial
  const short = (s) => {
    const p = String(s || '').replace(/[<>"&]/g, '').trim().split(/\s+/).filter(Boolean);
    return (p.length > 1 ? p[0] + ' ' + p[p.length - 1][0].toUpperCase() + '.' : (p[0] || '')).slice(0, 40);
  };

  // the player this link belongs to (?player=Name)
  const params = new URLSearchParams(location.search);
  const playerFromLink = short(params.get('player'));
  const KEY = 'eu-plant-order:' + (playerFromLink || '_');
  // a hand-typed link with a full name is shortened in the address bar too, so a re-share carries only the short form
  if (params.has('player') && params.get('player') !== playerFromLink && history.replaceState) {
    history.replaceState(null, '', location.pathname + (playerFromLink ? '?player=' + encodeURIComponent(playerFromLink) : '') + location.hash);
  }

  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cart = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };

  /* products */
  const wrap = $('[data-products]');
  D.plants.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'plant reveal'; card.style.transitionDelay = Math.min(i * 0.03, 0.14) + 's';
    card.innerHTML = `
      <div class="pimg"><img src="${p.img}" alt="${attr(p.name)}" loading="lazy" style="--s:${p.scale}"></div>
      <div class="pbody">
        <div class="phead"><h3>${p.name}</h3><b>${money(p.price)}</b></div>
        <p class="psize">${p.size} · ${p.note}</p>
        <div class="qtys">${p.colours.map((c) => `
          <div class="qty" data-key="${attr(p.id + '|' + c)}">
            <span class="cname"><i class="sw sw-${c.toLowerCase().replace(/[^a-z]/g, '')}"></i>${c}</span>
            <span class="step"><button type="button" data-d="-1" aria-label="One less ${attr(c)} ${attr(p.name)}">−</button><output aria-live="polite">0</output><button type="button" data-d="1" aria-label="One more ${attr(c)} ${attr(p.name)}">+</button></span>
          </div>`).join('')}
        </div>
      </div>`;
    wrap.appendChild(card);
  });
  // reveal the cards as they enter (main.js ran before they existed)
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    $$('.plant', wrap).forEach((c) => io.observe(c));
  } else $$('.plant', wrap).forEach((c) => c.classList.add('in'));

  wrap.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-d]'); if (!b || closed()) return;
    const row = b.closest('.qty'), k = row.dataset.key;
    cart[k] = Math.max(0, Math.min(99, (cart[k] || 0) + (+b.dataset.d)));
    if (!cart[k]) delete cart[k];
    save(); render();
  });

  /* summary */
  const linesEl = $('[data-lines]'), totalEl = $('[data-total]'), statusEl = $('[data-status]');
  const playerIn = $('#o-player'), nameIn = $('#o-name'), phoneIn = $('#o-phone');
  const bar = $('[data-bar]'), barSum = $('[data-bar-sum]');
  if (playerFromLink) {
    playerIn.value = playerFromLink;
    const f = $('[data-player]'); if (f) { $('b', f).textContent = playerFromLink + (playerFromLink.endsWith('.') ? '' : '.'); f.hidden = false; }
  }
  // phone field formats itself from digits
  phoneIn.addEventListener('input', () => {
    const d = phoneIn.value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
    phoneIn.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });

  const items = () => Object.entries(cart).map(([k, q]) => {
    const [id, colour] = k.split('|'); const p = D.plants.find((x) => x.id === id);
    return p ? { p, colour, q, sub: p.price * q } : null;
  }).filter(Boolean);

  const message = () => {
    const it = items(), total = it.reduce((a, b) => a + b.sub, 0);
    const who = playerIn.value.trim();
    const lines = [`Hi${who ? ' ' + who : ''}, I'd like to order from the Ends United holiday plant fundraiser:`, ''];
    it.forEach(({ p, colour, q, sub }) => lines.push(`- ${q} x ${p.name}${p.colours.length > 1 ? ', ' + colour : ''} (${money(sub)})`));
    lines.push('', `Total: ${money(total)}`);
    if (nameIn.value.trim()) lines.push(`Name: ${nameIn.value.trim()}`);
    if (phoneIn.value.trim()) lines.push(`Phone: ${phoneIn.value.trim()}`);
    lines.push('', 'Thanks!');
    return lines.join('\n');
  };

  const sendBtns = $$('[data-send]');
  const render = () => {
    const it = items(), total = it.reduce((a, b) => a + b.sub, 0), count = it.reduce((a, b) => a + b.q, 0);
    $$('.qty').forEach((row) => { const q = cart[row.dataset.key] || 0; $('output', row).textContent = q; row.classList.toggle('has', q > 0); });
    linesEl.innerHTML = it.length ? it.map(({ p, colour, q, sub }) => `<li><span>${q} × ${p.name}${p.colours.length > 1 ? ' <em>' + colour + '</em>' : ''}</span><b>${money(sub)}</b></li>`).join('') : '<li class="empty">Nothing yet.</li>';
    totalEl.textContent = money(total);
    const ok = it.length > 0 && !closed();
    sendBtns.forEach((b) => { if (b.tagName === 'BUTTON') b.disabled = !ok; else b.setAttribute('aria-disabled', String(!ok)); });
    if (bar) { bar.hidden = count === 0 || closed(); barSum.textContent = `${count} item${count === 1 ? '' : 's'} · ${money(total)}`; }
    if (closed()) statusEl.textContent = delivered() ? 'Orders are closed. Thank you for backing the team.' : 'Orders are closed for this year. Plants arrive December 4.';
    if (newBtn) newBtn.hidden = !sentOnce || it.length === 0;
  };

  // after an order goes out, offer a clean slate for the next one
  let sentOnce = false;
  const newBtn = document.createElement('button');
  newBtn.type = 'button'; newBtn.className = 'btn btn-line newo'; newBtn.textContent = 'Start a new order'; newBtn.hidden = true;
  $('.summary .send').after(newBtn);
  newBtn.addEventListener('click', () => {
    cart = {}; save(); sentOnce = false; nameIn.value = ''; phoneIn.value = '';
    statusEl.textContent = 'Orders close Tuesday, November 24 at 10 pm.'; render();
    const first = $('.step button[data-d="1"]', wrap); if (first) first.focus();
  });

  sendBtns.forEach((b) => b.addEventListener('click', async (ev) => {
    if (closed()) { ev.preventDefault(); render(); return; }
    if (b.getAttribute('aria-disabled') === 'true' || b.disabled) { ev.preventDefault(); return; }
    const msg = message();
    if (b.dataset.send === 'sms') { ev.preventDefault(); location.href = 'sms:?&body=' + encodeURIComponent(msg); }
    else if (b.dataset.send === 'mail') { ev.preventDefault(); location.href = 'mailto:?subject=' + encodeURIComponent('My Ends United plant order') + '&body=' + encodeURIComponent(msg); }
    else if (b.dataset.send === 'copy') {
      try { await navigator.clipboard.writeText(msg); statusEl.textContent = 'Copied. Paste it into a message to your player.'; }
      catch (e) { statusEl.textContent = 'Copy did not work here. Use Text or Email instead.'; }
    }
    sentOnce = true; render();
  }));
  [playerIn, nameIn, phoneIn].forEach((el) => el.addEventListener('input', render));
  render();
  // if the page is open when orders close, close it on the spot
  const left = new Date(D.deadline).getTime() - Date.now();
  if (left > 0 && left < 2147483000) setTimeout(render, left + 500);

  // the clock counts as live once it has ticked (main.js fills it)
  const clock = $('.fr-hero .clock'); if (clock) clock.classList.add('live');

  /* player link maker */
  const lf = $('[data-linkform]');
  if (lf) {
    const out = $('[data-linkout]', lf), code = $('code', out), share = $('[data-share]', lf);
    let link = '';
    lf.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const n = short($('#p-name', lf).value);
      if (!n) { $('#p-name', lf).focus(); return; }
      $('#p-name', lf).value = n;
      link = location.origin + location.pathname + '?player=' + encodeURIComponent(n);
      code.textContent = link; out.hidden = false; share.hidden = false;
      try { await navigator.clipboard.writeText(link); share.textContent = 'Copied. Share'; } catch (e) {}
    });
    share.addEventListener('click', async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Ends United holiday plants', text: 'Order holiday plants and support Ends United 7v7:', url: link }); } catch (e) {} }
      else { try { await navigator.clipboard.writeText(link); share.textContent = 'Copied'; } catch (e) {} }
    });
  }
})();
