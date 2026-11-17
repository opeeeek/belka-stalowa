/* =====================================================================
   BelkaStal – wspólne narzędzia interfejsu (jak w BelkaŻB/SłupŻB):
   formatowanie, symbole z indeksami, okna dialogowe, lista wartości
   typowych (▾), menu kontekstowe, kolory rysunków w motywie ciemnym,
   powiększanie i przesuwanie rysunków (Ctrl + kółko, przeciąganie).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS;
const Q = BS.Q = {};
const $ = Q.$ = (s, el) => (el || document).querySelector(s);
const $$ = Q.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = Q.esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
Q.fmt = (v, dp) => {
  if (dp === undefined) dp = 2;
  if (v === null || v === undefined || typeof v !== 'number' || !isFinite(v)) return v === Infinity ? '∞' : '—';
  let s = (Math.abs(v) < 0.5 * Math.pow(10, -dp) ? 0 : v).toFixed(dp);
  const neg = s[0] === '-'; if (neg) s = s.slice(1);
  let [i, f] = s.split('.'); i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + i + (f !== undefined ? ',' + f : '');
};
// „M_{Ed}” → M<sub>Ed</sub>, „x^{2}” → x<sup>2</sup>, „γ_M0” → γ<sub>M0</sub>
Q.sym = s => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
  .replace(/_([0-9A-Za-ząćęłńóśźżθ]+(?:,[0-9A-Za-ząćęłńóśźż]+)*)/g, '<sub>$1</sub>');
Q.getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
Q.setP = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] === undefined || a[ks[i]] === null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
Q.parseNum = s => { if (typeof s === 'number') return s; const x = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : null; };
Q.showNum = v => (v === '' || v === null || v === undefined) ? '' : (typeof v === 'number' ? String(+v.toPrecision(10)) : String(v)).replace('.', ',');
Q.exDetails = (ex, t) => ex ? `<details class="exh"><summary>${t || 'Objaśnienie'}</summary><div>${ex}</div></details>` : '';

/* ------------------------------------------------------------ SVG */
Q.svgOpen = (w, h, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${extra || ''}>`;
Q.tx = (x, y, s, o) => { o = o || {}; return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${o.fs || 11}" fill="${o.c || '#1b2230'}" text-anchor="${o.a || 'middle'}" ${o.w ? `font-weight="${o.w}"` : ''} ${o.rot ? `transform="rotate(${o.rot} ${(+x).toFixed(1)} ${(+y).toFixed(1)})"` : ''}>${s}</text>`; };
Q.dimH = (x1, x2, y, label, o) => { o = o || {};
  return `<g stroke="#5d6778" stroke-width="0.8"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/>` +
    `<line x1="${x1 - 3}" y1="${y + 3}" x2="${x1 + 3}" y2="${y - 3}"/><line x1="${x2 - 3}" y1="${y + 3}" x2="${x2 + 3}" y2="${y - 3}"/></g>` + Q.tx((x1 + x2) / 2, y + (o.below ? 13 : -4), label, { fs: o.fs || 10.5, c: '#3d4656' }); };
Q.dimV = (x, y1, y2, label, o) => { o = o || {};
  return `<g stroke="#5d6778" stroke-width="0.8"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}"/><line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}"/>` +
    `<line x1="${x - 3}" y1="${y1 + 3}" x2="${x + 3}" y2="${y1 - 3}"/><line x1="${x - 3}" y1="${y2 + 3}" x2="${x + 3}" y2="${y2 - 3}"/></g>` + Q.tx(x + (o.right ? 6 : -5), (y1 + y2) / 2, label, { fs: o.fs || 10.5, c: '#3d4656', a: o.right ? 'start' : 'middle', rot: o.right ? 0 : -90 }); };

/* kolory rysunków w motywie ciemnym: stałe kolory #rrggbb → zmienne --sv-rrggbb (zdefiniowane w CSS) */
const SVCOL = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
Q.themeSvgIn = function (root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('svg [fill], svg [stroke]').forEach(el => {
    ['fill', 'stroke'].forEach(a => {
      const v = el.getAttribute(a); if (!v || !SVCOL.test(v)) return;
      let h = v.slice(1).toLowerCase(); if (h.length === 3) h = h.replace(/./g, c => c + c);
      el.style.setProperty(a, `var(--sv-${h}, #${h})`);
    });
  });
};
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
  if (n.nodeType !== 1) return;
  if (n.tagName.toLowerCase() === 'svg') Q.themeSvgIn(n.parentNode || n);
  else if (n.querySelector && n.querySelector('svg')) Q.themeSvgIn(n);
}))).observe(document.documentElement, { childList: true, subtree: true });

/* ------------------------------------------------------------ komunikaty i okna */
Q.toast = function (msg, ms) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.style.display = 'block'; clearTimeout(Q.toast.t); Q.toast.t = setTimeout(() => { t.style.display = 'none'; }, ms || 2600); };
Q.modal = function (html, cls) {
  const m = $('#modal'); m.innerHTML = `<div class="dlg ${cls || ''}" role="document">${html}</div>`; m.style.display = 'flex';
  const f = m.querySelector('input:not([type=checkbox]):not([type=radio]), select, button.pri'); if (f && !cls?.includes('nofocus')) setTimeout(() => { try { f.focus(); } catch (e) { /* */ } }, 0);
  return m;
};
Q.closeModal = function () { const m = $('#modal'); m.style.display = 'none'; m.innerHTML = ''; Q.closeList(); };
Q.isModal = () => $('#modal') && $('#modal').style.display === 'flex';
Q.ask = function (msg, okLabel, danger) {
  return new Promise(res => {
    const m = $('#nmodal') || (() => { const d = document.createElement('div'); d.id = 'nmodal'; document.body.appendChild(d); return d; })();
    m.innerHTML = `<div class="dlg sm"><p>${msg}</p><div class="dbtn"><button class="btn" data-a="0">Anuluj</button><button class="btn ${danger ? 'dng' : 'pri'}" data-a="1">${esc(okLabel || 'OK')}</button></div></div>`;
    m.style.display = 'flex';
    m.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; m.style.display = 'none'; res(b.dataset.a === '1'); };
    setTimeout(() => { const b = m.querySelector('[data-a="1"]'); if (b) b.focus(); }, 0);
  });
};
Q.flash = function (el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200); };
let hlgT = 0;
Q.hlg = function (t) {
  const els = (Array.isArray(t) ? t : [t]).flatMap(x => typeof x === 'string' ? $$(x) : x ? [x] : []);
  els.forEach((el, i) => {
    const box = el.closest ? (el.closest('.row, tr, label.chk, .litem') || el) : el;
    if (i === 0 && box.scrollIntoView) box.scrollIntoView({ block: 'center' });
    box.classList.remove('hlg'); void box.offsetWidth; box.classList.add('hlg');
  });
  if (els.length) hlgT = Date.now();
  return els.length;
};
document.addEventListener('pointerdown', e => { if (Date.now() - hlgT < 400) return; if (e.target.closest && e.target.closest('#modal .dlg')) return; $$('.hlg').forEach(x => x.classList.remove('hlg')); }, true);

/* ------------------------------------------------------------ lista wartości typowych (▾ przy polu liczbowym) */
let popFor = null;
Q.openList = function (btn, onPick) {
  const pop = $('#pop'); const inp = btn.previousElementSibling;
  if (popFor === inp && pop.style.display === 'block') { Q.closeList(); return; }
  const list = JSON.parse(btn.dataset.list || '[]');
  if (!list.length) return;
  pop.innerHTML = list.map(v => `<div data-v="${esc(String(v))}" class="${String(v) === String(Q.parseNum(inp.value) ?? inp.value) ? 'cur' : ''}">${v === '' ? (inp.placeholder || '—') : esc(Q.showNum(v))}</div>`).join('');
  const r = inp.parentElement.getBoundingClientRect();
  pop.style.display = 'block'; pop.style.minWidth = r.width + 'px';
  const ph = Math.min(260, pop.scrollHeight);
  const below = window.innerHeight - r.bottom > ph + 6;
  pop.style.left = r.left + 'px'; pop.style.top = (below ? r.bottom + 2 : r.top - ph - 2) + 'px';
  popFor = inp;
  const cur = $('.cur', pop); if (cur) cur.scrollIntoView({ block: 'center' });
  $$('div', pop).forEach(d => d.addEventListener('mousedown', e => { e.preventDefault(); inp.value = Q.showNum(d.dataset.v); Q.closeList(); onPick(inp); inp.focus(); }));
};
Q.closeList = function () { const p = $('#pop'); if (p) p.style.display = 'none'; popFor = null; };
document.addEventListener('mousedown', e => { if (!e.target.closest('#pop') && !e.target.closest('.combo button')) Q.closeList(); });
window.addEventListener('resize', () => Q.closeList());

/* ------------------------------------------------------------ menu kontekstowe */
Q.closeCtx = function () { const d = $('.ctxmenu'); if (d) d.remove(); document.removeEventListener('pointerdown', ctxOutside, true); };
function ctxOutside(e) { if (!(e.target.closest && e.target.closest('.ctxmenu'))) Q.closeCtx(); }
Q.ctxMenu = function (x, y, items, onPick) {
  Q.closeCtx();
  const d = document.createElement('div'); d.className = 'ctxmenu'; d.setAttribute('role', 'menu');
  d.innerHTML = items.map(([k, l, dis]) => k === '-' ? '<hr>' : `<button type="button" role="menuitem" data-ca="${esc(k)}"${dis ? ' disabled' : ''}>${l}</button>`).join('');
  document.body.appendChild(d);
  const r = d.getBoundingClientRect(); d.style.left = Math.max(4, Math.min(window.innerWidth - r.width - 4, x)) + 'px'; d.style.top = Math.max(4, Math.min(window.innerHeight - r.height - 4, y)) + 'px';
  d.addEventListener('click', e => { const b = e.target.closest('[data-ca]'); if (!b || b.disabled) return; Q.closeCtx(); onPick(b.dataset.ca); });
  setTimeout(() => document.addEventListener('pointerdown', ctxOutside, true), 0);
  const f = d.querySelector('button'); if (f) f.focus();
};

/* ------------------------------------------------------------ powiększanie rysunków */
// schemat (Dane) i widok belki: Ctrl + kółko – zoom względem kursora, przeciąganie – przesuw; przycisk „100% ✕” – reset
const ZOOM = Q.ZOOM = { scheme: { k: 1, x: 0, y: 0 }, elev: { k: 1, x: 0, y: 0 } };
const zKey = el => el.classList.contains('elevwrap') ? 'elev' : 'scheme';
Q.zoomApply = function (root) {
  $$('.schemewrap, .elevwrap', root || document).forEach(w => {
    const z = ZOOM[zKey(w)], svg = w.querySelector('.zoomtgt') || w.querySelector('svg'); if (!svg) return;
    w.classList.toggle('zoomed', z.k > 1.001);
    svg.style.transformOrigin = '0 0'; svg.style.transform = z.k > 1.001 ? `translate(${z.x}px, ${z.y}px) scale(${z.k})` : '';
    let b = w.querySelector('.zoomrst'); if (z.k > 1.001) { if (!b) { b = document.createElement('button'); b.className = 'zoomrst'; b.type = 'button'; b.title = 'Przywróć widok (100%)'; w.appendChild(b); } b.textContent = Math.round(z.k * 100) + '% ✕'; } else if (b) b.remove();
  });
};
// pozostałe rysunki (przekroje, wykresy, raport): zoom przez viewBox
const ZSVG = new WeakMap();
function zsvgOf(t) {
  let svg = t && t.closest ? t.closest('svg') : null; if (!svg) return null;
  for (let p = svg.parentElement && svg.parentElement.closest('svg'); p; p = p.parentElement && p.parentElement.closest('svg')) svg = p;
  if (svg.closest('.schemewrap, .elevwrap, button, .nozoom')) return null;
  const r = svg.getBoundingClientRect(); return r.width >= 120 && r.height >= 80 ? svg : null;
}
function zsvgGet(svg) {
  let z = ZSVG.get(svg);
  if (!z) { const vb = svg.viewBox && svg.viewBox.baseVal, r = svg.getBoundingClientRect(); const b = vb && vb.width > 0 ? { x: vb.x, y: vb.y, w: vb.width, h: vb.height } : { x: 0, y: 0, w: +svg.getAttribute('width') || r.width, h: +svg.getAttribute('height') || r.height };
    z = { b, v: Object.assign({}, b), had: svg.hasAttribute('viewBox') }; ZSVG.set(svg, z); }
  return z;
}
function zsvgApply(svg, z) {
  const b = z.b, v = z.v, k = b.w / v.w;
  let ov = svg.querySelector(':scope > g.zsvgov');
  if (k <= 1.001) { z.v = Object.assign({}, b); if (z.had) svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`); else svg.removeAttribute('viewBox'); if (ov) ov.remove(); return; }
  v.x = Math.min(b.x + b.w - v.w, Math.max(b.x, v.x)); v.y = Math.min(b.y + b.h - v.h, Math.max(b.y, v.y));
  svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  if (!ov) { ov = document.createElementNS('http://www.w3.org/2000/svg', 'g'); ov.setAttribute('class', 'zsvgov'); svg.appendChild(ov); }
  const r = svg.getBoundingClientRect(), u = v.w / Math.max(1, r.width), txt = `${Math.round(k * 100)}% ✕`, tw = (txt.length * 6.4 + 10) * u, th = 18 * u;
  ov.innerHTML = `<title>Przywróć widok 100% (albo dwuklik na rysunku)</title><rect x="${v.x + v.w - tw - 4 * u}" y="${v.y + 4 * u}" width="${tw}" height="${th}" rx="${4 * u}" fill="#1d5bb8" fill-opacity="0.88"/><text x="${v.x + v.w - tw / 2 - 4 * u}" y="${v.y + 4 * u + th * 0.68}" font-size="${11 * u}" fill="#ffffff" text-anchor="middle">${txt}</text>`;
}
const zsvgReset = svg => { const z = ZSVG.get(svg); if (!z) return; z.v = Object.assign({}, z.b); zsvgApply(svg, z); };
function zsvgWheel(e) {
  const svg = zsvgOf(e.target); if (!svg) return false;
  e.preventDefault(); const z = zsvgGet(svg), v = z.v, k0 = z.b.w / v.w, k = Math.max(1, Math.min(10, k0 * Math.exp(-e.deltaY * 0.0022)));
  let pt = null; try { const m = svg.getScreenCTM().inverse(), p0 = svg.createSVGPoint(); p0.x = e.clientX; p0.y = e.clientY; pt = p0.matrixTransform(m); } catch (er) { pt = { x: v.x + v.w / 2, y: v.y + v.h / 2 }; }
  const w2 = z.b.w / k, h2 = z.b.h / k; z.v = { x: pt.x - (pt.x - v.x) * w2 / v.w, y: pt.y - (pt.y - v.y) * h2 / v.h, w: w2, h: h2 };
  zsvgApply(svg, z); return true;
}
let zsDrag = null;
document.addEventListener('pointerdown', e => { if (e.button !== 0) return; const svg = zsvgOf(e.target); if (!svg) return; const z = ZSVG.get(svg); if (!z || z.b.w / z.v.w <= 1.001) return;
  if (e.target.closest('g.zsvgov')) { zsvgReset(svg); e.preventDefault(); return; }
  zsDrag = { svg, z, x0: e.clientX, y0: e.clientY, v0: Object.assign({}, z.v), moved: false }; });
document.addEventListener('pointermove', e => { if (!zsDrag) return; const dx = e.clientX - zsDrag.x0, dy = e.clientY - zsDrag.y0; if (!zsDrag.moved && Math.hypot(dx, dy) < 5) return; zsDrag.moved = true;
  const r = zsDrag.svg.getBoundingClientRect(), u = zsDrag.v0.w / Math.max(1, r.width); zsDrag.z.v = Object.assign({}, zsDrag.v0, { x: zsDrag.v0.x - dx * u, y: zsDrag.v0.y - dy * u }); zsvgApply(zsDrag.svg, zsDrag.z); });
document.addEventListener('pointerup', () => { if (zsDrag && zsDrag.moved) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', stop, true); }; window.addEventListener('click', stop, true); setTimeout(() => window.removeEventListener('click', stop, true), 50); } zsDrag = null; });
document.addEventListener('dblclick', e => { const svg = zsvgOf(e.target); if (!svg) return; const z = ZSVG.get(svg); if (z && z.b.w / z.v.w > 1.001) { e.preventDefault(); e.stopPropagation(); zsvgReset(svg); } }, true);
document.addEventListener('wheel', e => {
  if (!e.ctrlKey) return; const w = e.target.closest && e.target.closest('.schemewrap, .elevwrap'); if (!w) { zsvgWheel(e); return; }
  e.preventDefault(); const z = ZOOM[zKey(w)], r = w.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  const k2 = Math.max(1, Math.min(8, z.k * Math.exp(-e.deltaY * 0.0022)));
  z.x = px - (px - z.x) * k2 / z.k; z.y = py - (py - z.y) * k2 / z.k; z.k = k2;
  if (k2 <= 1.001) { z.k = 1; z.x = 0; z.y = 0; }
  const svg = w.querySelector('svg'); if (svg) { const W2 = r.width, H2 = svg.getBoundingClientRect().height / (z.k || 1); z.x = Math.min(0, Math.max(W2 - W2 * z.k, z.x)); z.y = Math.min(0, Math.max(H2 - H2 * z.k, z.y)); }
  Q.zoomApply(w.parentElement);
}, { passive: false });
let zDrag = null, zMoved = false;
document.addEventListener('pointerdown', e => { const w = e.target.closest && e.target.closest('.schemewrap.zoomed, .elevwrap.zoomed'); if (!w || e.button !== 0) return; if (e.target.closest('.zoomrst')) return; zDrag = { w, x0: e.clientX, y0: e.clientY, z: Object.assign({}, ZOOM[zKey(w)]) }; zMoved = false; });
document.addEventListener('pointermove', e => { if (!zDrag) return; const dx = e.clientX - zDrag.x0, dy = e.clientY - zDrag.y0; if (!zMoved && Math.hypot(dx, dy) < 5) return; zMoved = true;
  const z = ZOOM[zKey(zDrag.w)], r = zDrag.w.getBoundingClientRect(), svg = zDrag.w.querySelector('svg'), H2 = svg ? svg.getBoundingClientRect().height / z.k : r.height;
  z.x = Math.min(0, Math.max(r.width - r.width * z.k, zDrag.z.x + dx)); z.y = Math.min(0, Math.max(H2 - H2 * z.k, zDrag.z.y + dy)); Q.zoomApply(zDrag.w.parentElement); });
document.addEventListener('pointerup', () => { if (zDrag && zMoved) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', stop, true); }; window.addEventListener('click', stop, true); setTimeout(() => window.removeEventListener('click', stop, true), 50); } zDrag = null; });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.zoomrst'); if (!b) return; const w = b.closest('.schemewrap, .elevwrap'); const z = ZOOM[zKey(w)]; z.k = 1; z.x = 0; z.y = 0; Q.zoomApply(w.parentElement); });
})();
