/* =====================================================================
   BelkaStal – zakładki wyników (jak w BelkaŻB): Przekrój i nośność
   (klikane strefy przekroju, wykres naprężeń w wybranym miejscu),
   Wykresy (kursor, znaczniki wartości po kliknięciu, „jak obliczono”),
   Stateczność, Belka i połączenia (klikane węzły i oparcia, zestawienie
   materiałów), Podsumowanie (odhaczanie, objaśnienia, „pokaż →”),
   Raport obliczeń (pełny / statyka / własny; HTML, .odt, druk).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, D = BS.D, Q = BS.Q, A = BS.A, RP = BS.Raport;
const { $, $$, esc, fmt, sym, parseNum, showNum, exDetails } = Q;
const V = BS.V = {};
const S = () => A.S(), R = () => A.R();
const errBox = () => { const r = R(); return `<div class="msgs">${((r && r.errors) || ['Brak wyników.']).map(e => `<div class="msg err">${esc(e)}</div>`).join('')}</div>`; };
const ok = () => { const r = R(); return r && r.md && r.sec && r.base && !(r.errors && r.errors.length && !r.env); };
const W0 = (el) => Math.max(360, Math.min(1100, (el.clientWidth || 900) - 28));
const head = (el) => `<div class="dsumx">${A.dsumHTML()}</div>`;
const bindHead = (el) => { $$('.dsumx', el).forEach(x => A.bindDsum(x)); };
const stageSw = (cur, on) => { const md = R().md; return md.nE > 1 ? `<span class="segsw sm">${md.etapy.map((e, i) => `<button type="button" data-vst="${i}" class="${i === cur ? 'on' : ''}" title="${esc(e.nazwa)}">Etap ${i + 1}</button>`).join('')}</span>` : ''; };
const bindStage = (el, fn) => $$('[data-vst]', el).forEach(b => b.addEventListener('click', () => fn(+b.dataset.vst)));
const rowCk = (c, i) => `<tr data-cid="${esc(c.id)}" class="xclick" title="Kliknij – jak obliczono"><td>${esc(c.n)}</td><td class="ref"><button class="nref" data-nref="${esc(c.id)}" type="button">${esc(c.ref || '')}</button></td><td class="val">${A.ckCond(c)}</td><td class="bar" style="white-space:nowrap">${A.utilBar(c)}</td><td class="stc"><span class="st ${c.info ? 'info' : c.status}">${A.STL[c.info ? 'info' : c.status]}</span></td></tr>`;
const ckTable = (cs) => cs.length ? `<div class="tscroll"><table class="ctab"><thead><tr><th>Sprawdzenie</th><th>PN-EN</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th></tr></thead><tbody>${cs.map(rowCk).join('')}</tbody></table></div>` : '<p class="hint">Brak sprawdzeń.</p>';
const bindCk = (el) => { A.bindNref(el); $$('tr[data-cid]', el).forEach(tr => tr.addEventListener('click', ev => { if (ev.target.closest('button')) return; const c = R().checks.find(q => q.id === tr.dataset.cid); if (c) A.explainPopup(c); })); };

/* ================================================================ PRZEKRÓJ I NOŚNOŚĆ */
let secX = null, secStage = null;
V.sec = function (el) {
  if (!ok()) { el.innerHTML = head(el) + errBox(); bindHead(el); return; }
  const r = R(), sec = r.sec, b = r.base, md = r.md, s = secStage === null ? md.nE - 1 : Math.min(secStage, md.nE - 1), ev = r.env[s], xs = r.an.xs;
  let iM = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(ev.Mmax[i]) + Math.abs(ev.Mmin[i]) > Math.abs(ev.Mmax[iM]) + Math.abs(ev.Mmin[iM])) iM = i;
  let k = iM; if (secX !== null) { k = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - secX) < Math.abs(xs[k] - secX)) k = i; }
  const Mx = Math.abs(ev.Mmax[k]) >= Math.abs(ev.Mmin[k]) ? ev.Mmax[k] : ev.Mmin[k], Nx = isFinite(ev.Nmax) ? (Math.abs(ev.Nmin) > Math.abs(ev.Nmax) ? ev.Nmin : ev.Nmax) : 0;
  const props = [['A', fmt(sec.A / 100, 2), 'cm²', 'Pole przekroju'], ['I_{y}', fmt(sec.Iy / 1e4, 0), 'cm⁴', 'Moment bezwładności względem osi y'], ['I_{z}', fmt(sec.Iz / 1e4, 1), 'cm⁴', ''], ['W_{el,y} (góra / dół)', `${fmt(sec.Wel_t / 1e3, 1)} / ${fmt(sec.Wel_b / 1e3, 1)}`, 'cm³', ''], ['W_{pl,y}', fmt(sec.Wpl_y / 1e3, 1), 'cm³', ''], ['W_{el,z} / W_{pl,z}', `${fmt(sec.Wel_z / 1e3, 1)} / ${fmt(sec.Wpl_z / 1e3, 1)}`, 'cm³', ''], ['I_{t}', fmt(sec.It / 1e4, 2), 'cm⁴', 'Moment bezwładności przy skręcaniu swobodnym'], ['I_{w}', fmt(sec.Iw / 1e9, 2), '·10³ cm⁶', 'Wycinkowy moment bezwładności'], ['A_{v}', fmt(b.Av / 100, 2), 'cm²', 'Pole czynne przy ścinaniu'], ['masa', fmt(sec.masa, 1), 'kg/m', '']];
  if (Math.abs(sec.z0 || 0) > 0.5) props.push(['z_{s} − z_{c} / β_{z}', `${fmt(sec.z0, 1)} / ${fmt(sec.betaZ, 1)}`, 'mm', 'Monosymetria']);
  const res = [['N_{pl,Rd}', b.Npl, 'F'], ['N_{c,Rd}', b.Nc, 'F'], ['M_{c,Rd} (M > 0)', b.Mc_pos, 'M'], ['M_{c,Rd} (M < 0)', b.Mc_neg, 'M'], ['M_{c,z,Rd}', b.Mcz, 'M'], ['V_{pl,Rd}', b.Vpl, 'F']];
  if (r.sb && r.sb.need) res.push(['V_{b,Rd} (wyboczenie środnika)', r.sb.Vb, 'F']);
  (r.ltb[s] ? r.ltb[s].segs : []).forEach(g => { if (!g.brak) res.push([`M_{b,Rd} ${fmt(g.sg.x0 / 1000, 2)}–${fmt(g.sg.x1 / 1000, 2)} m`, g.Mb, 'M']); });
  const clsRows = (k2, t) => k2.all.map(p => `<tr><td>${t}</td><td>${esc(p.n)}</td><td class="n">${fmt(p.c, 1)} / ${fmt(p.t, 1)}</td><td class="n">${fmt(p.ct, 2)}</td><td class="n">${p.tension ? 'rozciągana' : p.lim.map(l => isFinite(l) ? fmt(l, 1) : '—').join(' / ')}</td><td class="n"><b>${p.cls}</b></td></tr>`).join('');
  let h = head(el) + `<div class="h2">Przekrój i nośność<small>kliknij pas lub środnik przekroju, aby zmienić wymiary; wiersz sprawdzenia – tok obliczeń</small></div>`;
  h += `<div class="box rebbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px"><button class="btn pri sm" id="vsAuto" type="button">⚙ Dobierz przekrój</button><button class="btn sm" id="vsEdit" type="button">Przekrój i materiał…</button><button class="btn sm" id="vsTab" type="button">Tablica kształtowników…</button><span class="sp" style="flex:1"></span>${stageSw(s)}<span style="font-size:12.5px">przekrój x =</span><input class="txt sm" id="vsX" value="${showNum(+(xs[k] / 1000).toFixed(3))}" style="width:70px"><span style="font-size:12.5px">m</span><button class="lnk" id="vsMax" type="button">max |M|</button></div>`;
  h += `<div class="h2">Przekrój obliczeniowy<small>x = ${fmt(xs[k] / 1000, 2)} m · M<sub>Ed</sub> = ${fmt(Mx / 1e6, 2)} kNm${Math.abs(Nx) > 1 ? ` · N<sub>Ed</sub> = ${fmt(Nx / 1e3, 1)} kN` : ''} (obwiednia SGN${md.nE > 1 ? `, etap ${s + 1}` : ''})</small></div><div class="flex">`;
  h += `<div class="box secbox"><h4>${esc(sec.nazwa)} · ${esc(S().material.gatunek + S().material.podgatunek)}<small> · f<sub>y</sub> = ${r.mat.fy} MPa · klasa ${b.kPos.cls}${b.kNeg.cls !== b.kPos.cls ? '/' + b.kNeg.cls : ''}</small></h4><div class="fig secedit" id="vsFig" style="margin:0">${D.section(sec, { size: 300, zones: true, eff: Mx >= 0 ? b.effPos : b.effNeg, sigma: { M: Mx, N: Nx }, fy: r.mat.fy })}</div>
    <p class="hint" style="max-width:520px">Naprężenia sprężyste σ = −N/A + M·z/I<sub>y</sub>; linie przerywane – ±f<sub>y</sub>. Zakreskowane części – nieefektywne (klasa 4).</p>
    <table class="kv" id="vsProps">${props.map(([a2, v, u, t]) => `<tr title="${esc(t || 'Kliknij – zmiana przekroju')}" style="cursor:pointer"><td>${sym(a2)}</td><td class="n"><b>${v}</b></td><td>${u}</td></tr>`).join('')}</table>${(sec.uwagi || []).map(t => `<p class="hint">${esc(t)}</p>`).join('')}</div>`;
  h += `<div class="box"><h4>Nośności obliczeniowe<small> · γ<sub>M0</sub> = ${fmt(r.ndp.gM0, 2)}, γ<sub>M1</sub> = ${fmt(r.ndp.gM1, 2)}</small></h4><table class="kv">${res.map(([a2, v, u]) => `<tr><td>${sym(a2)}</td><td class="n"><b>${A.unitFmt(v, u)}</b></td></tr>`).join('')}</table>
    <h4 style="margin-top:12px">Klasa przekroju<small> · tabl. 5.2, ε = ${fmt(b.eps, 3)}</small></h4><div class="tscroll"><table class="sched"><tr><th>Stan</th><th>Ścianka</th><th>c / t [mm]</th><th>c/t</th><th>granice 1/2/3</th><th>kl.</th></tr>${clsRows(b.kPos, 'M > 0')}${clsRows(b.kNeg, 'M < 0')}${clsRows(b.kN, 'N')}</table></div></div></div>`;
  h += `<div class="h2" style="margin-top:18px">Sprawdzenia przekroju i środnika<small>najbardziej wytężone miejsca z obwiedni SGN</small></div><div class="box">${ckTable(r.checks.filter(c => /^SGN – nośność|^PN-EN 1993-1-5/.test(c.grp)))}</div>`;
  el.innerHTML = h;
  bindHead(el); bindCk(el);
  $$('.zhit', el).forEach(z => z.addEventListener('click', () => A.secPopup(z.dataset.z)));
  $('#vsEdit', el).onclick = () => A.secPopup();
  $('#vsTab', el).onclick = () => A.secTablePopup();
  $('#vsAuto', el).onclick = () => A.runDesign('sec');
  $$('#vsProps tr', el).forEach(tr => tr.addEventListener('click', () => A.secPopup()));
  const xi = $('#vsX', el); xi.addEventListener('change', () => { const v = parseNum(xi.value); if (v === null) return; secX = U.clamp(v * 1000, 0, md.L); V.sec(el); });
  $('#vsMax', el).onclick = () => { secX = null; V.sec(el); };
  bindStage(el, i => { secStage = i; V.sec(el); });
};

/* ================================================================ WYKRESY */
let chStage = null;
const chartPins = [];
V.chart = function (el) {
  if (!ok() || !R().env) { el.innerHTML = head(el) + errBox(); bindHead(el); return; }
  const r = R(), md = r.md, s = chStage === null ? md.nE - 1 : Math.min(chStage, md.nE - 1), W = W0(el);
  const ch = RP.charts(S(), r, s, W);
  let h = head(el) + `<div class="box"><div class="rtools" style="margin:0 0 6px">${stageSw(s)}${md.nE > 1 ? `<span class="hint" style="margin:0 8px">${esc(md.etapy[s].nazwa)}</span>` : ''}<span class="sp"></span><button class="btn sm" id="pinClr" type="button" style="display:none">Usuń znaczniki</button></div>
    <p class="hint">Najedź kursorem – wartości w danym miejscu na wszystkich wykresach; kliknij wykres – znacznik wartości (ponowne kliknięcie – usunięcie, prawy przycisk – usuń wszystkie); kliknij wartość znacznika – jak obliczono w tym miejscu. Ctrl + kółko – powiększenie.</p>`;
  ['M', 'Mz', 'V', 'N', 'w'].forEach(k => { if (ch[k]) h += `<div class="fig chartbox" data-chart="${k}">${D.lineChart(ch[k])}</div>`; });
  h += `</div><div class="box"><h4>Reakcje podporowe${md.nE > 1 ? ` – etap ${s + 1}` : ''}</h4><div class="fig" id="vcR">${D.reactions(S(), r, s, W)}</div>${reactTable(r, s)}</div>`;
  h += `<div class="box"><h4>Kombinacje decydujące</h4>${ckTable(r.checks.filter(c => c.etap === s && /^SGN – nośność/.test(c.grp)))}</div>`;
  el.innerHTML = h;
  bindHead(el); bindCk(el); Q.themeSvgIn(el);
  bindChartCursor(el);
  bindStage(el, i => { chStage = i; V.chart(el); });
  $$('#vcR', el).forEach(x => x.addEventListener('click', ev => { const svg = $('svg', x), rr = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (ev.clientX - rr.left) * vb.width / rr.width; const sx = md.systems[s].map(p => 62 + (vb.width - 62 - 130) * p.x / md.L); let bi = 0; sx.forEach((v, i) => { if (Math.abs(v - px) < Math.abs(sx[bi] - px)) bi = i; }); const p = md.systems[s][bi]; const i = md.sup.findIndex(q => q.id === p.id); if (i >= 0) A.supportPopup(i); else A.stagesPopup(); }));
  $$('tr[data-rsup]', el).forEach(tr => tr.addEventListener('click', () => A.supportPopup(+tr.dataset.rsup)));
};
function reactTable(r, s) {
  const md = r.md, ev = r.env[s], an = r.an, ks = Object.keys(an.res[s]);
  return `<div class="tscroll"><table class="sched"><tr><th>Podpora</th><th>R<sub>Ed,max</sub> [kN]</th><th>R<sub>Ed,min</sub> [kN]</th><th>|M<sub>Ed</sub>| [kNm]</th>${ks.map(k => `<th>R<sub>k</sub> ${esc(an.res[s][k].c.id)}</th>`).join('')}</tr>${md.systems[s].map(p => { const q = ev.R[p.id] || {}, i = md.sup.findIndex(z => z.id === p.id); return `<tr ${i >= 0 ? `data-rsup="${i}" class="xclick" title="Kliknij – podpora, oparcie, połączenie"` : ''}><td><b>${p.id}</b></td><td class="n">${fmt((q.max || 0) / 1e3, 1)}</td><td class="n">${fmt((q.min || 0) / 1e3, 1)}</td><td class="n">${fmt((q.Mmax || 0) / 1e6, 1)}</td>${ks.map(k => { const z = an.res[s][k].tot.R[p.id]; return `<td class="n">${z ? fmt(z.R / 1e3, 1) : '—'}</td>`; }).join('')}</tr>`; }).join('')}</table></div>`;
}
// kursor na wszystkich wykresach zakładki + znaczniki wartości (wspólne położenia x)
function bindChartCursor(root) {
  const svgs = $$('svg.lchart', root), CH = D.CHARTS;
  const Yv = (c, y) => c.inv ? c.mt + (y - c.ymin) / (c.ymax - c.ymin) * (c.H - c.mt - c.mb) : c.H - c.mb - (y - c.ymin) / (c.ymax - c.ymin) * (c.H - c.mt - c.mb);
  const show = xm => svgs.forEach(svg => {
    const c = CH[svg.dataset.cid]; if (!c) return;
    const g = $('.cur', svg); if (xm === null || xm < c.xmin - 1e-9 || xm > c.xmax + 1e-9) { g.style.display = 'none'; return; }
    const px = c.ml + (xm - c.xmin) / (c.xmax - c.xmin) * (c.W - c.ml - c.mr);
    const grp = new Map(); let dots = '', lastL = '';
    c.series.forEach(se => {
      const v = D.serAt(se, xm); if (v === null || !isFinite(v)) return;
      const lab = (se.l || lastL || c.name || '').replace(/_([A-Za-z,]+)/g, '$1'); if (se.l) lastL = se.l;
      if (!grp.has(lab)) grp.set(lab, []); const q = grp.get(lab); if (!q.some(w => Math.abs(w - v) < 1e-6)) q.push(v);
      dots += `<circle cx="${px.toFixed(1)}" cy="${Yv(c, v).toFixed(1)}" r="2.6" fill="${se.c}"/>`;
    });
    const txt = `x = ${fmt(xm, 2)} m:  ` + [...grp].map(([l, vs]) => `${l} = ${vs.map(v => fmt(v, c.dp)).join(' / ')}`).join(';  ') + (c.unit ? ` ${c.unit}` : '');
    g.style.display = '';
    $('.curl', g).setAttribute('x1', px); $('.curl', g).setAttribute('x2', px); $('.curd', g).innerHTML = dots;
    const t = $('.curtx', g); t.textContent = txt; const tw = txt.length * 5.6 + 10, tx0 = Math.max(c.ml, Math.min(c.W - c.mr - tw, px + 8));
    t.setAttribute('x', tx0 + 5); const bg = $('.curbg', g); bg.setAttribute('x', tx0); bg.setAttribute('width', tw);
  });
  const xOf = (svg, ev) => { const c = CH[svg.dataset.cid]; const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; const px = vb.x + (ev.clientX - r.left) * vb.width / r.width; const xm = c.xmin + (px - c.ml) / (c.W - c.ml - c.mr) * (c.xmax - c.xmin); return xm < c.xmin || xm > c.xmax ? null : xm; };
  const drawPins = (svg) => {
    const c = CH[svg.dataset.cid]; if (!c) return;
    let g = svg.querySelector('g.pins'); if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pins'); svg.insertBefore(g, svg.querySelector('g.cur')); }
    let s = ''; const boxes = [];
    chartPins.forEach(xm => {
      if (xm < c.xmin - 1e-9 || xm > c.xmax + 1e-9) return;
      const px = c.ml + (xm - c.xmin) / (c.xmax - c.xmin) * (c.W - c.ml - c.mr);
      s += `<line x1="${px.toFixed(1)}" y1="${c.mt}" x2="${px.toFixed(1)}" y2="${c.H - c.mb}" stroke="#a35d00" stroke-width="0.8" stroke-dasharray="2 3" pointer-events="none"/>`;
      const xt = `x = ${fmt(xm, 2)}`, xw = xt.length * 5.4 + 6;
      s += `<rect x="${(px - xw / 2).toFixed(1)}" y="${c.H - c.mb - 12}" width="${xw.toFixed(1)}" height="12" rx="2" fill="#a35d00" fill-opacity="0.9" pointer-events="none"/>` + Q.tx(px, c.H - c.mb - 3, xt, { fs: 9, c: '#ffffff', w: 600 });
      const seen = [];
      c.series.forEach(se => {
        const v = D.serAt(se, xm); if (v === null || !isFinite(v) || seen.some(q => Math.abs(q - v) < 1e-6)) return; seen.push(v);
        if (Math.abs(v) < 0.5 * Math.pow(10, -c.dp) && c.series.length > 1) return;
        const py = Yv(c, v), below = c.inv ? v >= 0 : v < 0, lab = fmt(v, c.dp), tw = lab.length * 5.7 + 4;
        const cand = [[px, py + (below ? 14 : -7)], [px, py + (below ? 25 : -18)], [px + tw / 2 + 6, py + 3.5], [px - tw / 2 - 6, py + 3.5]];
        const box = ([x, y]) => { const bx = Math.max(2, Math.min(c.W - tw - 2, x - tw / 2)); return [bx, y - 9, bx + tw, y + 2]; };
        const okc = cand.find(q => { const bb = box(q); return !boxes.some(z => bb[0] < z[2] && bb[2] > z[0] && bb[1] < z[3] && bb[3] > z[1]); }) || cand[0];
        const bb = box(okc); boxes.push(bb);
        s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${se.c}" stroke="#ffffff" stroke-width="0.8" pointer-events="none"/><g class="pinlab" data-px="${xm}" style="cursor:pointer"><title>${esc(`x = ${fmt(xm, 2)} m: ${lab} ${c.unit} – kliknij: jak obliczono w tym miejscu`)}</title><rect x="${bb[0].toFixed(1)}" y="${bb[1].toFixed(1)}" width="${tw.toFixed(1)}" height="11" rx="2" fill="#ffffff" fill-opacity="0.85"/>${Q.tx(bb[0] + tw / 2, okc[1], lab, { fs: 10, c: se.c, w: 650 })}</g>`;
      });
    });
    g.innerHTML = s; Q.themeSvgIn(svg.parentNode);
  };
  const upd = () => { const b = $('#pinClr', root); if (b) b.style.display = chartPins.length ? '' : 'none'; };
  svgs.forEach(svg => {
    svg.style.cursor = 'crosshair';
    svg.addEventListener('mousemove', ev => show(xOf(svg, ev)));
    svg.addEventListener('touchmove', ev => { if (ev.touches[0]) show(xOf(svg, ev.touches[0])); }, { passive: true });
    svg.addEventListener('mouseleave', () => show(null));
    svg.addEventListener('click', ev => {
      const lab = ev.target.closest && ev.target.closest('.pinlab'); if (lab) { chartExplain(svg, +lab.dataset.px); return; }
      const c = CH[svg.dataset.cid]; if (!c) return; const xm = xOf(svg, ev); if (xm === null) return;
      const tol = 7 * (c.xmax - c.xmin) / (c.W - c.ml - c.mr), j = chartPins.findIndex(v => Math.abs(v - xm) <= tol);
      if (j >= 0) chartPins.splice(j, 1); else { chartPins.push(+xm.toFixed(3)); if (chartPins.length > 8) chartPins.shift(); }
      svgs.forEach(drawPins); upd();
    });
    svg.addEventListener('contextmenu', ev => { if (!chartPins.length) return; ev.preventDefault(); chartPins.length = 0; svgs.forEach(drawPins); upd(); Q.toast('Usunięto znaczniki z wykresów.', 1500); });
  });
  svgs.forEach(drawPins); upd();
  const pc = $('#pinClr', root); if (pc) pc.onclick = () => { chartPins.length = 0; svgs.forEach(drawPins); upd(); };
}
V.bindChartCursor = bindChartCursor;
// „jak obliczono” w miejscu x: wartości obwiedni, wytężenie przekroju, najbliższe sprawdzenie
function chartExplain(svg, xm) {
  const c = D.CHARTS[svg.dataset.cid], r = R(); if (!c || !r || !r.md) return;
  const x = xm * 1000, md = r.md, s = chStage === null ? md.nE - 1 : Math.min(chStage, md.nE - 1), ev = r.env[s], xs = r.an.xs;
  let k = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[k] - x)) k = i;
  const kind = c.kind;
  const cands = r.checks.filter(q => q.etap === s && q.x !== undefined && isFinite(q.x));
  const pick = (re) => cands.filter(q => re.test(q.id)).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  const ck = kind === 'V' ? pick(/-V$|-Vb$/) : kind === 'w' ? r.checks.find(q => /^w-/.test(q.id) && (() => { const sg = md.seg.find(z => 'w-' + z.id === q.id); return sg && x >= sg.x0 - 1 && x <= sg.x1 + 1; })()) : pick(/-M$|-LT\d/);
  const seg = md.seg.find(z => x >= z.x0 - 1 && x <= z.x1 + 1);
  const m = Q.modal(`<h3>x = ${fmt(xm, 2)} m${seg ? ` – ${esc(seg.n)}` : ''}${md.nE > 1 ? ` · etap ${s + 1}` : ''}</h3>
    <table class="kv"><tr><td>M<sub>Ed</sub> max / min</td><td class="n"><b>${fmt(ev.Mmax[k] / 1e6, 2)} / ${fmt(ev.Mmin[k] / 1e6, 2)}</b> kNm</td></tr><tr><td>V<sub>Ed</sub> max / min</td><td class="n"><b>${fmt(ev.Vmax[k] / 1e3, 2)} / ${fmt(ev.Vmin[k] / 1e3, 2)}</b> kN</td></tr>${Math.abs(ev.Mzmax[k]) + Math.abs(ev.Mzmin[k]) > 1 ? `<tr><td>M<sub>z,Ed</sub></td><td class="n">${fmt(ev.Mzmax[k] / 1e6, 2)} / ${fmt(ev.Mzmin[k] / 1e6, 2)} kNm</td></tr>` : ''}<tr><td>ugięcie charakterystyczne</td><td class="n">${fmt(ev.wmax[k], 2)} mm</td></tr><tr><td>wytężenie przekroju (SGN, bez stateczności)</td><td class="n"><b>${fmt(ev.uSec[k] * 100, 0)}%</b></td></tr></table>
    ${ck ? `<h4>Najbliższe sprawdzenie</h4>${A.checksHTML([ck])}` : ''}
    <div class="dbtn">${ck ? '<button class="btn" id="ceEx" type="button">Jak obliczono…</button>' : ''}<button class="btn" id="ceNode" type="button">Dodaj w tym miejscu…</button><span class="sp"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop sm');
  $('#nClose', m).onclick = Q.closeModal; A.bindNref(m);
  const ce = $('#ceEx', m); if (ce) ce.onclick = () => A.explainPopup(ck);
  $('#ceNode', m).onclick = () => A.nodePopup(Math.round(x / 50) * 50);
}

/* ================================================================ STATECZNOŚĆ */
let ltStage = null;
V.ltb = function (el) {
  if (!ok()) { el.innerHTML = head(el) + errBox(); bindHead(el); return; }
  const r = R(), md = r.md, s = ltStage === null ? md.nE - 1 : Math.min(ltStage, md.nE - 1), L = r.ltb[s], W = W0(el);
  let h = head(el) + `<div class="box"><div class="rtools" style="margin:0 0 6px">${stageSw(s)}<span class="sp"></span><button class="btn sm" id="vlBr" type="button">Stężenia…</button><button class="btn sm" id="vlSt" type="button">Etapy…</button></div>`;
  if (r.sec.kind === 'L') h += '<p class="hint">Kątownik – element przyjęty jako stężony bocznie (zwichrzenie nie jest sprawdzane). Zapewnij stężenie ciągłe lub gęste.</p>';
  else if (!L) h += '<p class="hint">Brak momentów zginających – zwichrzenie nie występuje.</p>';
  else {
    h += `<p class="hint">M<sub>cr</sub> – MES (u, u′, φ, φ′) dla rzeczywistego M<sub>y</sub>(x) każdej decydującej kombinacji, z wysokością przyłożenia obciążeń, stężeniami (${md.stez.filter(z => z.od <= s).length} dyskretnych${md.ciagle.pasG && U.num(md.ciagle.odEtapu) <= s ? ', pas górny ciągle' : ''}) i warunkami podparcia. Kliknij wiersz – tok obliczeń; kliknij postać – dodaj stężenie w tym miejscu.</p>`;
    h += `<div class="tscroll"><table class="ctab"><thead><tr><th>Segment</th><th>pas ściskany</th><th>|M<sub>Ed</sub>| [kNm]</th><th>M<sub>cr</sub> [kNm]</th><th>λ̄<sub>LT</sub></th><th>krzywa</th><th>χ<sub>LT</sub></th><th>M<sub>b,Rd</sub> [kNm]</th><th>Wykorzystanie</th></tr></thead><tbody>`;
    L.segs.forEach((g, k) => { if (g.brak) return; const c = r.checks.find(q => q.id === `${s}-LT${k}`); h += `<tr data-cid="${s}-LT${k}" class="xclick"><td>${fmt(g.sg.x0 / 1000, 2)}–${fmt(g.sg.x1 / 1000, 2)} m${g.sg.free ? ' (wspornik)' : ''}</td><td>${g.Mpos ? 'górny' : 'dolny'}</td><td class="n">${fmt(g.sh.mabs / 1e6, 2)}</td><td class="n">${g.Mcr === Infinity ? '∞' : fmt(g.Mcr / 1e6, 1)}</td><td class="n">${fmt(g.lam, 3)}</td><td>${g.ltb.skip ? '—' : esc(g.ltb.curve)}</td><td class="n">${fmt(g.ltb.skip ? 1 : (g.ltb.chimod || g.ltb.chi), 3)}</td><td class="n"><b>${fmt(g.Mb / 1e6, 1)}</b></td><td class="bar">${c ? A.utilBar(c) : ''}</td></tr>`; });
    h += '</tbody></table></div>';
    const gov = L.runs.filter(q => q.mode).sort((a, b) => a.lam - b.lam)[0];
    if (gov && gov.lam <= 100) h += `<div class="fig chartbox" id="vlMode">${D.mode(gov.mode, md.L, md.systems[s].map(p => p.x), { width: W, title: `Postać zwichrzenia: α_cr = ${fmt(gov.lam, 3)} (${gov.combo.opis.slice(0, 60)})` })}</div>`;
    h += `<p class="hint">Mnożniki krytyczne α<sub>cr</sub>: ${L.runs.map(q => `${esc(q.combo.opis.slice(0, 50))}: ${q.err ? esc(q.err) : q.lam === Infinity ? '∞' : fmt(q.lam, 3)}`).join(' · ')}</p>`;
  }
  h += '</div>';
  const cs = r.checks.filter(c => c.etap === s && /^SGN – stateczność/.test(c.grp));
  h += `<div class="box"><h4>Sprawdzenia stateczności${md.nE > 1 ? ` – etap ${s + 1}` : ''}</h4>${ckTable(cs)}</div>`;
  el.innerHTML = h;
  bindHead(el); bindCk(el); Q.themeSvgIn(el);
  bindStage(el, i => { ltStage = i; V.ltb(el); });
  $('#vlBr', el).onclick = () => A.bracePopup(); $('#vlSt', el).onclick = () => A.stagesPopup();
  bindChartCursor(el);
  const mo = $('#vlMode svg', el);
  if (mo) mo.addEventListener('dblclick', ev => { const c = D.CHARTS[mo.dataset.cid], rr = mo.getBoundingClientRect(), vb = mo.viewBox.baseVal, px = (ev.clientX - rr.left) * vb.width / rr.width; const xm = c.xmin + (px - c.ml) / (c.W - c.ml - c.mr) * (c.xmax - c.xmin); if (xm >= 0 && xm <= md.L / 1000) A.nodePopup(Math.round(xm * 20) * 50); });
};

/* ================================================================ BELKA I POŁĄCZENIA */
V.elev = function (el) {
  if (!ok()) { el.innerHTML = head(el) + errBox(); bindHead(el); return; }
  const r = R(), md = r.md, sec = r.sec, W = W0(el), out = {};
  let h = head(el) + `<div class="box elevbox"><h4>Belka – widok podłużny <span class="hint" style="margin-left:8px;font-weight:400">kliknij węzeł / oparcie, stężenie lub podporę montażową · Ctrl + kółko – powiększenie</span></h4><div class="elevwrap"><div class="zoomtgt">${D.elevation(S(), r, { W, out })}</div></div><div id="veInfo" class="hint" style="min-height:18px"></div></div>`;
  h += '<div class="cards jcards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px">';
  (r.podpory || []).filter(p => !p.tymcz).forEach(p => {
    const i = md.sup.findIndex(q => q.id === p.id), w = (S().podpory[i] || {}).wezel || { typ: 'brak' };
    const st = p.checks.some(c => c.status === 'fail') ? 'fail' : p.checks.some(c => c.status === 'warn') ? 'warn' : 'ok';
    const um = Math.max(0, ...p.checks.filter(c => c.util !== null && isFinite(c.util)).map(c => c.util));
    h += `<div class="box card ${st}" data-jsup="${i}" style="cursor:pointer"><div class="t"><b>Podpora ${esc(p.id)}</b> – ${esc(A.supRowTxt(i))}</div><div class="jsk" data-jsk="${i}">${sec.kind !== 'L' ? D.joint(sec, w, { W: 320, H: 220 }) : ''}</div><div class="s">R<sub>Ed,max</sub> = <b>${fmt(p.Rmax / 1e3, 1)} kN</b> · sprawdzeń ${p.checks.length} · max ${fmt(um * 100, 0)}%</div>${A.checksHTML(p.checks)}</div>`;
  });
  h += '</div>';
  const to = RP.takeoff(S(), r);
  h += `<div class="box"><h4>Zestawienie materiałów</h4><div class="tscroll"><table class="sched"><tr><th>Poz.</th><th>Element</th><th>Materiał</th><th>Szt.</th><th>Wymiary [mm]</th><th>Masa [kg]</th></tr>${to.rows.map(q => `<tr><td>${q.poz}</td><td>${esc(q.n)}</td><td>${esc(q.mat)}</td><td class="n">${q.szt}</td><td>${esc(q.wym)}</td><td class="n">${fmt(q.m, 1)}</td></tr>`).join('')}<tr><td></td><td><b>Razem</b></td><td></td><td></td><td></td><td class="n"><b>${fmt(to.total, 1)}</b></td></tr></table></div>${Object.keys(to.bolts).length ? `<p class="hint">Śruby: ${Object.keys(to.bolts).map(k => `${to.bolts[k]} × ${esc(k)}`).join(', ')} (z nakrętkami i podkładkami); spoiny pachwinowe ok. ${fmt(to.weld / 1000, 2)} m.</p>` : ''}<p class="hint">Klasa wykonania: <b>${r.exc ? r.exc.exc : '—'}</b>${r.exc ? ' – ' + esc(r.exc.why.join('; ')) : ''}.</p></div>`;
  el.innerHTML = h;
  bindHead(el); Q.themeSvgIn(el); Q.zoomApply(el); A.bindNref(el);
  $$('.jnt', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.supportPopup(+g.dataset.sup); }));
  $$('.rst', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.bracePopup(g.dataset.rst === 'g' ? null : +g.dataset.rst); }));
  $$('.tsupp', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.stagesPopup(); }));
  $$('[data-jsup]', el).forEach(c => c.addEventListener('click', ev => { if (ev.target.closest('button')) return; const sk = ev.target.closest('.jsk'); let zone = null; if (sk) { const rr = sk.getBoundingClientRect(), x = ev.clientX - rr.left, y = ev.clientY - rr.top; zone = x < rr.width * 0.42 ? (y > rr.height * 0.75 ? 'sup' : 'plate') : 'bolts'; } A.supportPopup(+c.dataset.jsup, zone); }));
  // kursor na widoku: x i siły w tym miejscu
  const svg = $('svg.elev', el), info = $('#veInfo', el), s = md.nE - 1, ev2 = r.env[s], xs = r.an.xs;
  if (svg && out.X) svg.addEventListener('mousemove', e => {
    const rr = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - rr.left) * vb.width / rr.width;
    const x = (px - out.ml) / (out.W - out.ml - out.mr) * md.L; const cur = $('.ecur', svg);
    if (x < 0 || x > md.L) { cur.style.display = 'none'; info.textContent = ''; return; }
    cur.style.display = ''; $('.ecl', cur).setAttribute('x1', px); $('.ecl', cur).setAttribute('x2', px);
    let k = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[k] - x)) k = i;
    info.innerHTML = `x = ${fmt(x / 1000, 2)} m: M<sub>Ed</sub> = ${fmt(ev2.Mmax[k] / 1e6, 1)} / ${fmt(ev2.Mmin[k] / 1e6, 1)} kNm, V<sub>Ed</sub> = ${fmt(ev2.Vmax[k] / 1e3, 1)} / ${fmt(ev2.Vmin[k] / 1e3, 1)} kN, w = ${fmt(ev2.wmax[k], 1)} mm, wytężenie przekroju ${fmt(ev2.uSec[k] * 100, 0)}%`;
  });
};

/* ================================================================ PODSUMOWANIE */
V.sum = function (el) {
  const r = R();
  if (!r || !r.checks || (r.errors.length && !r.checks.length)) { el.innerHTML = head(el) + errBox(); bindHead(el); return; }
  const c = r.checks, st = S();
  const worst = (pred) => { const a = c.filter(pred).filter(x => !x.info && x.util !== null); return a.length ? a.reduce((p, q) => ((q.util || 0) > (p.util || 0) ? q : p)) : null; };
  const card = (t, v, s2, ck) => `<div class="card ${ck ? ck.status : ''}" ${ck ? `data-gck="${esc(ck.id)}" style="cursor:pointer"` : ''}><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s2}</div></div>`;
  const wm = worst(x => /-M$/.test(x.id)), wv = worst(x => /-V$|-Vb$/.test(x.id)), wl = worst(x => /-LT\d/.test(x.id)), ww = worst(x => /^w-/.test(x.id)), wp = worst(x => /^Podpory/.test(x.grp));
  let cards = '';
  if (wm) cards += card('Zginanie', `${fmt(wm.Ed / 1e6, 1)} / ${fmt(wm.Rd / 1e6, 1)}`, `|M<sub>Ed</sub>| / M<sub>Rd</sub> [kNm] · ${fmt(wm.util * 100, 0)}%`, wm);
  if (wv) cards += card('Ścinanie', `${fmt(wv.Ed / 1e3, 1)} / ${fmt(wv.Rd / 1e3, 1)}`, `V<sub>Ed</sub> / V<sub>Rd</sub> [kN] · ${fmt(wv.util * 100, 0)}%`, wv);
  if (wl) cards += card('Zwichrzenie', `${fmt(wl.Ed / 1e6, 1)} / ${fmt(wl.Rd / 1e6, 1)}`, `M<sub>Ed</sub> / M<sub>b,Rd</sub> [kNm] · ${fmt(wl.util * 100, 0)}%`, wl);
  if (ww) cards += card('Ugięcie', `${fmt(ww.Ed, 1)} mm`, `w<sub>max</sub> ≤ ${fmt(ww.Rd, 1)} mm (L/${st.sgu.wmax})`, ww);
  if (wp) cards += card('Podpory i połączenia', `${fmt(wp.util * 100, 0)}%`, esc(wp.n), wp);
  if (r.sec) cards += card('Przekrój', esc(r.sec.nazwa), `${esc(st.material.gatunek + st.material.podgatunek)} · ${fmt(r.sec.masa, 1)} kg/m · EXC: ${r.exc ? r.exc.exc : '—'}`, null);
  let h = head(el) + `<div class="cards">${cards}</div>`;
  const msgs = [...r.errors.map(e => `<div class="msg err">${esc(e)}</div>`), ...r.warnings.map(e => `<div class="msg wrn">${esc(e)}</div>`), ...r.info.map(e => `<div class="msg">${esc(e)}</div>`)];
  if (msgs.length) h += `<div class="msgs">${msgs.join('')}</div>`;
  const nF = c.filter(x => x.status === 'fail');
  if (nF.length) h += `<div class="failnav">Niespełnione warunki: ${c.map((x, i) => x.status === 'fail' ? `<button class="goto" data-goto2="${i}" type="button">${esc(x.n)}</button>` : '').join('')}</div>`;
  const ticks = st.meta.ticks || {}, nT = c.filter(x => ticks[x.id]).length;
  h += `<div class="tickbar"><span id="tickCnt">Odhaczono: <b>${nT}</b> z ${c.length}</span><button class="btn sm" id="tickOk" type="button">Odhacz spełnione</button><button class="btn sm" id="tickClr" type="button">Wyczyść znaczniki</button><span class="hint">Kliknij numer punktu normy – objaśnienie; kliknij warunek – jak obliczono; „pokaż →” – miejsce, którego dotyczy.</span></div>`;
  h += `<div class="tscroll"><table class="ctab"><thead><tr><th class="tk" title="Sprawdzone – w raporcie">✓</th><th>Sprawdzenie</th><th>Punkt normy</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th><th class="nt">Uwagi</th></tr></thead><tbody>`;
  let grp = '';
  c.forEach((x, i) => {
    if (x.grp !== grp) { grp = x.grp; h += `<tr class="g"><td colspan="7">${esc(grp)}</td></tr>`; }
    const on = !!ticks[x.id], stc = x.info ? 'info' : x.status;
    h += `<tr class="${on ? 'done' : ''}" data-ci="${i}"><td class="tk"><input type="checkbox" data-tick="${i}" ${on ? 'checked' : ''} aria-label="sprawdzone"></td><td>${esc(x.n)}${x.combo ? `<br><small class="hint" style="margin:0">${esc(x.combo).slice(0, 110)}</small>` : ''}</td><td class="ref"><button class="nref" data-ref="${i}" type="button" title="Objaśnienie punktu normy">${esc(x.ref || '—')}</button></td><td class="val">${A.ckCond(x)}</td><td class="bar" style="white-space:nowrap">${A.utilBar(x)}</td><td class="stc"><span class="st ${stc}">${A.STL[stc]}</span><button class="goto" data-goto="${i}" type="button" title="Przejdź do miejsca, którego dotyczy warunek">pokaż →</button></td><td class="nt">${x.note ? exDetails(esc(x.note)) : ''}</td></tr>`;
  });
  h += '</tbody></table></div>';
  el.innerHTML = h;
  bindHead(el);
  const upd = () => { const n = c.filter(x => (S().meta.ticks || {})[x.id]).length; $('#tickCnt', el).innerHTML = `Odhaczono: <b>${n}</b> z ${c.length}`; };
  const setTick = (x, v) => { const m = S().meta; m.ticks = m.ticks || {}; if (v) m.ticks[x.id] = true; else delete m.ticks[x.id]; };
  $$('[data-tick]', el).forEach(cb => cb.addEventListener('change', () => { setTick(c[+cb.dataset.tick], cb.checked); cb.closest('tr').classList.toggle('done', cb.checked); upd(); A.markDirty(); A.invalidate('report'); }));
  $('#tickOk', el).onclick = () => { c.forEach(x => { if (x.status === 'ok' || x.info) setTick(x, true); }); A.markDirty(); A.invalidate('report'); V.sum(el); };
  $('#tickClr', el).onclick = () => { S().meta.ticks = {}; A.markDirty(); A.invalidate('report'); V.sum(el); };
  $$('[data-ref]', el).forEach(b => b.addEventListener('click', () => A.normPopup(c[+b.dataset.ref])));
  $$('tr[data-ci] td.val, tr[data-ci] td.bar', el).forEach(td => { td.classList.add('xclick'); td.title = 'Kliknij – jak obliczono (wzór, podstawienie, punkt normy)'; td.addEventListener('click', () => A.explainPopup(c[+td.closest('tr').dataset.ci])); });
  $$('[data-goto], [data-goto2]', el).forEach(b => b.addEventListener('click', () => A.gotoCheck(c[+(b.dataset.goto || b.dataset.goto2)])));
  $$('[data-gck]', el).forEach(d => d.addEventListener('click', () => { const x = c.find(q => q.id === d.dataset.gck); if (x) A.explainPopup(x); }));
};

/* ================================================================ RAPORT */
const wrapPrint = (html) => `<table class="pwrap"><thead><tr><td><div class="psp"></div></td></tr></thead><tfoot><tr><td><div class="psp"></div></td></tr></tfoot><tbody><tr><td class="pbody">${html}</td></tr></tbody></table>`;
const repMode = () => (S().meta.repMode === 'static' ? 'static' : 'full');
const repView = () => (S().meta.repMode === 'own' ? 'own' : repMode());
const refsOn = () => S().meta.repRefs !== false;
const repBuild = (mode) => { const m = mode || repMode(); const h = m === 'static' ? RP.buildStatic(S(), R()) : RP.build(S(), R()); return refsOn() ? h : BS.ODT.noRefs(h); };
function cleanHTML(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  t.content.querySelectorAll('script, iframe, object, embed, link, meta, base, form, input, button, select, textarea').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) || a.name === 'contenteditable') n.removeAttribute(a.name); }));
  return t.innerHTML;
}
const repOk = () => { const r = R(); return r && r.md && r.sec && r.base && r.env && !r.errors.length; };
V.report = function (el) {
  const mode = repMode(), view = repView();
  const seg = `<div class="segsw" role="tablist" aria-label="Rodzaj raportu"><button data-rm="full" class="${view === 'full' ? 'on' : ''}" type="button" title="Pełny tok obliczeń: dane, podstawa normowa, przekrój, obciążenia i siły wewnętrzne, wszystkie sprawdzenia SGN i SGU ze wzorami, podstawieniami i wynikami, podpory i połączenia, zestawienie">Raport pełny</button><button data-rm="static" class="${view === 'static' ? 'on' : ''}" type="button" title="Tylko statyka: dane materiałowe, przekrój, schemat statyczny, obciążenia, wykresy sił wewnętrznych i reakcje">Statyka</button><button data-rm="own" class="${view === 'own' ? 'on' : ''}" type="button" title="Raport do własnej edycji: pisz, usuwaj fragmenty, wstawiaj raport obliczeń">Raport własny</button></div>`;
  const tools = `<label class="chk sm" title="Odwołania do punktów, tablic i wzorów norm w raporcie"><input type="checkbox" id="rRefs" ${refsOn() ? 'checked' : ''}><span>z odwołaniami do norm</span></label><button class="btn" id="bExp" type="button">Zapisz raport HTML…</button><button class="btn" id="bOdt" type="button" title="Raport do edycji: OpenDocument Text (.odt) – LibreOffice Writer, MS Word">Zapisz .odt (edytowalny)…</button><button class="btn pri" id="bPrint" type="button">Drukuj / zapisz PDF</button>`;
  const bindSeg = () => { $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S().meta.repMode = b.dataset.rm; A.markDirty(); V.report(el); })); const rf = $('#rRefs', el); if (rf) rf.onchange = () => { S().meta.repRefs = rf.checked; A.markDirty(); V.report(el); }; };
  if (view === 'own') { renderOwn(el, seg); bindSeg(); return; }
  if (!repOk()) { el.innerHTML = `<div class="rtools">${seg}</div>` + errBox(); bindSeg(); return; }
  el.innerHTML = `<div class="rtools">${seg}<span class="sp"></span>${tools}</div><div id="report">${wrapPrint(repBuild())}</div>`;
  bindSeg();
  $('#bPrint', el).onclick = () => setTimeout(() => window.print(), 50);
  $('#bExp', el).onclick = () => V.exportHTML();
  $('#bOdt', el).onclick = () => V.exportODT();
  void mode;
};
let ownT = 0;
function renderOwn(el, seg) {
  const own = S().meta.ownOn === true;
  if (!own && !repOk()) { el.innerHTML = `<div class="rtools">${seg}</div>` + errBox(); return; }
  const B = (cmd, lab, tit, val) => `<button data-oc="${cmd}"${val ? ` data-ov="${val}"` : ''} title="${tit}" type="button">${lab}</button>`;
  el.innerHTML = `<div class="rtools">${seg}<span class="sp"></span><button class="btn" id="oExp" type="button">Zapisz HTML…</button><button class="btn" id="oOdt" type="button" title="OpenDocument Text – LibreOffice Writer, MS Word">Zapisz .odt…</button><button class="btn pri" id="oPrint" type="button">Drukuj / PDF</button></div><div class="rtools owntools">
      <span class="grp">${B('bold', '<b>B</b>', 'Pogrubienie (Ctrl+B)')}${B('italic', '<i>I</i>', 'Kursywa (Ctrl+I)')}${B('underline', '<u>U</u>', 'Podkreślenie (Ctrl+U)')}${B('removeFormat', 'T̸', 'Usuń formatowanie zaznaczenia')}</span>
      <span class="grp">${B('formatBlock', 'H1', 'Tytuł', 'h1')}${B('formatBlock', 'H2', 'Nagłówek rozdziału', 'h2')}${B('formatBlock', 'H3', 'Podtytuł', 'h3')}${B('formatBlock', '¶', 'Zwykły akapit', 'p')}${B('insertUnorderedList', '•', 'Lista punktowana')}${B('insertOrderedList', '1.', 'Lista numerowana')}</span>
      <span class="grp">${B('undo', '↶', 'Cofnij (Ctrl+Z)')}${B('redo', '↷', 'Ponów (Ctrl+Y)')}</span>
      <button class="btn sm" id="oIns" type="button" title="Wstawia pełny raport obliczeń (aktualne dane) za akapitem z kursorem">Wstaw raport pełny</button>
      <button class="btn sm" id="oInsS" type="button" title="Wstawia raport statyki (aktualne dane) za akapitem z kursorem">Wstaw statykę</button>
      <button class="btn sm" id="oDate" type="button" title="Wstawia datę i nazwę elementu w miejscu kursora">Wstaw datę</button>
      <button class="btn sm" id="oReset" type="button" ${own ? '' : 'disabled'} title="Usuwa własne zmiany – raport własny znowu pokazuje bieżący raport obliczeń">Przywróć raport obliczeń</button>
      <button class="btn sm" id="oClr" type="button" title="Usuwa całą treść raportu własnego">Wyczyść</button></div>
    <p class="ownstate" id="oState">${own ? 'Raport własny – zapisywany w projekcie przy każdej zmianie; nie zmienia się po zmianie danych (aktualne obliczenia: „Wstaw raport pełny” / „Wstaw statykę”).' : 'Podgląd bieżącego raportu obliczeń – kliknij w tekst i pisz albo usuwaj (zaznacz i Delete); po pierwszej zmianie raport staje się Twoją kopią zapisywaną w projekcie.'}</p>
    <div class="ownwrap">${wrapPrint(`<div id="ownrep" contenteditable="true" spellcheck="true" lang="pl">${own ? cleanHTML(S().meta.own || '') : repBuild('full')}</div>`)}</div>`;
  const ed = $('#ownrep', el), st = $('#oState', el);
  const save = () => { clearTimeout(ownT); ownT = setTimeout(() => { S().meta.own = ed.innerHTML; S().meta.ownOn = true; A.markDirty(); st.textContent = 'Raport własny – zapisywany w projekcie przy każdej zmianie; nie zmienia się po zmianie danych (aktualne obliczenia: „Wstaw raport pełny” / „Wstaw statykę”).'; const rb = $('#oReset', el); if (rb) rb.disabled = false; }, 350); };
  ed.addEventListener('input', save);
  ed.addEventListener('focus', () => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ } });
  $$('[data-oc]', el).forEach(b => { b.addEventListener('mousedown', ev => ev.preventDefault()); b.addEventListener('click', () => { ed.focus(); try { document.execCommand(b.dataset.oc, false, b.dataset.ov ? `<${b.dataset.ov}>` : null); } catch (e) { /* */ } save(); }); });
  const insertAtCaret = (html) => {
    const sel = window.getSelection(), inEd = sel && sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
    const t = document.createElement('template'); t.innerHTML = html; const frag = t.content;
    const isBlock = [...frag.childNodes].some(n => n.nodeType === 1 && /^(h[1-6]|div|table|p|ul|ol)$/i.test(n.tagName) && !(frag.childNodes.length === 1 && /^p$/i.test(n.tagName)));
    if (inEd && isBlock) { let top = sel.getRangeAt(0).startContainer; while (top && top.parentNode !== ed) top = top.parentNode; if (top && top !== ed) { const empty = top.nodeType === 1 ? !top.textContent.trim() && !top.querySelector('svg, img, table') : !top.nodeValue.trim(); ed.insertBefore(frag, top.nextSibling); if (empty) top.remove(); } else ed.appendChild(frag); }
    else if (inEd) { const rg = sel.getRangeAt(0); rg.deleteContents(); rg.insertNode(frag); rg.collapse(false); } else ed.appendChild(frag);
    save();
  };
  const insRep = (kind) => { if (!repOk()) { Q.toast('Usuń błędy danych – raport obliczeń jest niedostępny.'); return; } insertAtCaret(repBuild(kind)); Q.toast(kind === 'static' ? 'Wstawiono raport statyki.' : 'Wstawiono raport obliczeń.', 1800); };
  $('#oIns', el).onclick = () => insRep('full'); $('#oInsS', el).onclick = () => insRep('static');
  $('#oDate', el).onclick = () => insertAtCaret(`<p>${esc(S().meta.nazwa || '')} – ${new Date().toLocaleDateString('pl-PL')}</p>`);
  $('#oReset', el).onclick = async () => { if (!(await Q.ask('Usunąć własne zmiany? Raport własny znowu pokaże bieżący raport obliczeń.', 'Przywróć', true))) return; S().meta.own = ''; S().meta.ownOn = false; A.markDirty(); renderOwn(el, seg); bindSegAgain(el); };
  $('#oClr', el).onclick = async () => { if (!(await Q.ask('Usunąć całą treść raportu własnego?', 'Wyczyść', true))) return; S().meta.own = ''; S().meta.ownOn = true; A.markDirty(); renderOwn(el, seg); bindSegAgain(el); };
  $('#oPrint', el).onclick = () => setTimeout(() => window.print(), 50);
  $('#oExp', el).onclick = () => exportOwn('html');
  $('#oOdt', el).onclick = () => exportOwn('odt');
}
function bindSegAgain(el) { $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S().meta.repMode = b.dataset.rm; A.markDirty(); V.report(el); })); }
function ownHTML() { const ed = $('#ownrep'); return ed ? ed.innerHTML : (S().meta.ownOn ? cleanHTML(S().meta.own || '') : (repOk() ? repBuild('full') : '')); }
async function saveText(name, content, filter, okMsg) {
  if (A.inHost()) { const r = await A.hostCall('save', { path: '', name, content, filter }); if (r && r.ok) Q.toast((okMsg || 'Zapisano: ') + A.baseName(r.path)); else if (r && r.err) Q.toast('Błąd zapisu: ' + r.err); }
  else A.download(name, content, 'text/html');
}
async function saveODT(name, html, title) {
  Q.toast('Tworzenie pliku .odt…', 1500);
  let u; try { u = await BS.ODT.odt(html, title); } catch (e) { console.error(e); Q.toast('Błąd tworzenia .odt: ' + e.message); return; }
  if (A.inHost()) { let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); const r = await A.hostCall('save', { path: '', name, content: btoa(b), b64: true, filter: 'odt' }); if (r && r.ok) Q.toast('Zapisano raport: ' + A.baseName(r.path)); else if (r && r.err) Q.toast('Błąd: ' + r.err); return; }
  A.download(name, new Blob([u], { type: 'application/vnd.oasis.opendocument.text' }));
}
async function exportOwn(kind) {
  const html = ownHTML(), title = (S().meta.nazwa || 'Belka') + ' – raport';
  if (kind === 'html') return saveText(A.safeName(' – raport własny.html'), RP.document(S(), R(), html, title), 'html', 'Zapisano raport: ');
  return saveODT(A.safeName(' – raport własny.odt'), html, title);
}
V.exportHTML = function () {
  if (S().meta.repMode === 'own') return exportOwn('html');
  if (!repOk()) { Q.toast('Usuń błędy danych – raport jest niedostępny.'); return; }
  const st = repMode() === 'static';
  return saveText(A.safeName(st ? ' – statyka.html' : ' – raport.html'), RP.document(S(), R(), repBuild(), (S().meta.nazwa || 'Belka') + (st ? ' – statyka' : ' – raport obliczeń')), 'html', 'Zapisano raport: ');
};
V.exportODT = function () {
  if (S().meta.repMode === 'own') return exportOwn('odt');
  if (!repOk()) { Q.toast('Usuń błędy danych – raport jest niedostępny.'); return; }
  const st = repMode() === 'static';
  return saveODT(A.safeName(st ? ' – statyka.odt' : ' – raport.odt'), repBuild(), (S().meta.nazwa || 'Belka') + (st ? ' – statyka' : ' – raport obliczeń'));
};
V.unitFmt = (v, u) => A.unitFmt(v, u);
})();
/* start aplikacji – po załadowaniu wszystkich modułów */
(function () { const go = () => window.BS.A.init(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); })();
