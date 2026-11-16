/* =====================================================================
   BelkaStal – rysunki SVG: schemat statyczny z obciążeniami i stężeniami,
   wykresy sił wewnętrznych i ugięć, przekrój, postać zwichrzenia,
   krzywe nagrzewania w pożarze.  Kolory z tokenów CSS (motyw jasny/ciemny).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U;
const D = BS.D = {};
const esc = U.esc;
const f1 = (v) => U.fmt(v, 1), f2 = (v) => U.fmt(v, 2);

const C = {
  ink: 'var(--ink)', ink2: 'var(--ink2)', ink3: 'var(--ink3)', line: 'var(--line)', acc: 'var(--acc)',
  M: 'var(--cM, #c0262d)', V: 'var(--cV, #1d5bb8)', w: 'var(--cW, #1d7f3c)', z: 'var(--cZ, #8a5300)', fill: 'var(--panel2)'
};
D.C = C;

/* ---------------------------------------------------------- schemat */
// o: { width, etap, showLoads, sel (id przypadku) }
D.scheme = function (st, md, o) {
  o = o || {};
  const W = o.width || 760, padL = 40, padR = 40, L = md.L || 1;
  const s = o.etap === undefined ? md.nE - 1 : o.etap;
  const X = (x) => padL + (W - padL - padR) * x / L;
  const loads = (md.cases || []).filter(c => o.showLoads !== false && (S_RODZ(c).stale ? c.etap <= s : c.etap === s));
  const zLoads = []; loads.forEach(c => c.parts.forEach(p => { if (p.kier === 'z') zLoads.push({ c, p }); }));
  const distL = zLoads.filter(q => q.p.typ === 'q');
  const rowH = 20, top = 14;
  const nRows = Math.min(distL.length, 8);
  const yBeam = top + nRows * rowH + 46;
  let g = '';
  // obciążenia rozłożone – pasma
  distL.slice(0, 8).forEach((q, i) => {
    const p = q.p, y0 = top + i * rowH, x0 = X(p.x0), x1 = X(p.x1);
    const qm = Math.max(Math.abs(p.q0), Math.abs(p.q1)) || 1;
    const h0 = 6 + 10 * Math.abs(p.q0) / qm, h1 = 6 + 10 * Math.abs(p.q1) / qm;
    const yb = y0 + rowH - 2;
    const col = loadColor(q.c);
    g += `<polygon points="${x0},${yb} ${x0},${yb - h0} ${x1},${yb - h1} ${x1},${yb}" fill="${col}" fill-opacity=".13" stroke="${col}" stroke-width="1"/>`;
    const n = Math.max(2, Math.round((x1 - x0) / 26));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; const hh = h0 + (h1 - h0) * k / n; if (p.q0 * p.q1 >= 0 && (p.q0 >= 0)) g += arrow(x, yb - hh, x, yb, col, 3); else g += arrow(x, yb, x, yb - hh, col, 3); }
    const lab = `${esc(q.c.id)}: ${U.fmt(p.q0, 2)}${p.q1 !== p.q0 ? '…' + U.fmt(p.q1, 2) : ''} kN/m${p.wys === 'pas_g' ? '' : p.wys === 'srodek' ? ' (ŚŚ)' : ' (pas d.)'}`;
    g += `<text x="${x0 + 3}" y="${y0 + 9}" font-size="9.5" fill="${col}">${lab}</text>`;
  });
  if (distL.length > 8) g += `<text x="${W - padR}" y="${top + nRows * rowH + 8}" font-size="9" text-anchor="end" fill="${C.ink3}">+ ${distL.length - 8} obc. rozłożonych</text>`;
  // belka
  g += `<line x1="${X(0)}" y1="${yBeam}" x2="${X(L)}" y2="${yBeam}" stroke="${C.ink}" stroke-width="3.2"/>`;
  // stężenie ciągłe
  const c = md.ciagle || {};
  if (c.pasG && U.num(c.odEtapu, 0) <= s) g += `<line x1="${X(0)}" y1="${yBeam - 4}" x2="${X(L)}" y2="${yBeam - 4}" stroke="${C.acc}" stroke-width="2" stroke-dasharray="2 3"/><text x="${X(L) - 2}" y="${yBeam - 8}" font-size="9" text-anchor="end" fill="${C.acc}">pas górny stężony ciągle</text>`;
  if (c.pasD && U.num(c.odEtapuD, 0) <= s) g += `<line x1="${X(0)}" y1="${yBeam + 4}" x2="${X(L)}" y2="${yBeam + 4}" stroke="${C.acc}" stroke-width="2" stroke-dasharray="2 3"/>`;
  // siły skupione i momenty
  zLoads.filter(q => q.p.typ !== 'q').forEach(q => {
    const p = q.p, x = X(p.x), col = loadColor(q.c);
    if (p.typ === 'P') { const up = p.P < 0; g += up ? arrow(x, yBeam - 2, x, yBeam - 34, col, 5, 1.6) : arrow(x, yBeam - 36, x, yBeam - 3, col, 5, 1.6); g += `<text x="${x + 4}" y="${yBeam - 26}" font-size="10" fill="${col}" font-weight="600">${esc(q.c.id)}: ${U.fmt(Math.abs(p.P) / 1000, 1)} kN</text>`; }
    if (p.typ === 'M') { g += `<path d="M ${x - 10} ${yBeam - 6} A 11 11 0 1 1 ${x + 10} ${yBeam - 6}" fill="none" stroke="${col}" stroke-width="1.5"/>${arrowHead(x + 10, yBeam - 6, p.M > 0 ? 100 : 260, col)}<text x="${x + 13}" y="${yBeam - 16}" font-size="10" fill="${col}">${U.fmt(p.M / 1e6, 1)} kNm</text>`; }
  });
  // podpory
  (md.systems[s] || []).forEach(p => { g += support(X(p.x), yBeam, p); });
  md.tmp.filter(t => s > t.do).forEach(t => { g += `<g opacity=".35">${support(X(t.x), yBeam, t)}</g><text x="${X(t.x)}" y="${yBeam + 40}" font-size="9" text-anchor="middle" fill="${C.ink3}">usunięta</text>`; });
  // stężenia dyskretne
  md.stez.forEach(z => {
    const act = z.od <= s, x = X(z.x), yy = z.wys === 'pas_d' ? yBeam + 6 : z.wys === 'srodek' ? yBeam : yBeam - 6;
    const col = act ? C.acc : C.ink3;
    g += `<g opacity="${act ? 1 : 0.35}"><circle cx="${x}" cy="${yy}" r="4.2" fill="var(--panel)" stroke="${col}" stroke-width="1.6"/>${z.typ !== 'boczne' ? `<line x1="${x - 3}" y1="${yy - 3}" x2="${x + 3}" y2="${yy + 3}" stroke="${col}" stroke-width="1.4"/><line x1="${x - 3}" y1="${yy + 3}" x2="${x + 3}" y2="${yy - 3}" stroke="${col}" stroke-width="1.4"/>` : `<circle cx="${x}" cy="${yy}" r="1.4" fill="${col}"/>`}</g>`;
  });
  // wymiary
  const yd = yBeam + 52;
  const pts = [0].concat(md.sup.map(p => p.x)).concat([L]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (b - a < 1) continue; g += dim(X(a), X(b), yd, U.fmt((b - a) / 1000, 2)); }
  g += dim(X(0), X(L), yd + 24, `L = ${U.fmt(L / 1000, 2)} m`);
  // etykiety podpór
  md.sup.forEach(p => { g += `<text x="${X(p.x)}" y="${yBeam + 38}" font-size="11" font-weight="700" text-anchor="middle" fill="${C.ink}">${p.id}</text>`; });
  md.tmp.filter(t => s <= t.do).forEach(t => { g += `<text x="${X(t.x)}" y="${yBeam + 38}" font-size="10" text-anchor="middle" fill="${C.ink2}">${t.id}</text>`; });
  const H = yd + 40;
  return `<svg class="schemesvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Schemat statyczny belki">${g}</svg>`;
};
const S_RODZ = (c) => (BS.S.RODZAJE[c.rodzaj] || {});
const LCOL = { G: '#5b6576', Q: '#1d5bb8', S: '#3a7ca5', W: '#7a4fb5', T: '#a35d00', Qc: '#b5413f', M: '#8a5300', A: '#c0262d' };
function loadColor(c) { return LCOL[c.rodzaj] || '#5b6576'; }
D.loadColor = loadColor;
function arrow(x1, y1, x2, y2, col, hs, sw) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = hs || 4;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${sw || 1}"/><path d="M ${x2} ${y2} L ${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} L ${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)} Z" fill="${col}"/>`;
}
function arrowHead(x, y, ang, col) { const a = ang * Math.PI / 180, h = 5; return `<path d="M ${x} ${y} L ${x - h * Math.cos(a - 0.5)} ${y - h * Math.sin(a - 0.5)} L ${x - h * Math.cos(a + 0.5)} ${y - h * Math.sin(a + 0.5)} Z" fill="${col}"/>`; }
function dim(x0, x1, y, lab) {
  return `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.ink3}" stroke-width=".8"/><line x1="${x0 - 3}" y1="${y + 3}" x2="${x0 + 3}" y2="${y - 3}" stroke="${C.ink3}"/><line x1="${x1 - 3}" y1="${y + 3}" x2="${x1 + 3}" y2="${y - 3}" stroke="${C.ink3}"/><line x1="${x0}" y1="${y - 6}" x2="${x0}" y2="${y + 4}" stroke="${C.ink3}" stroke-width=".6"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 4}" stroke="${C.ink3}" stroke-width=".6"/><text x="${(x0 + x1) / 2}" y="${y - 4}" font-size="11" text-anchor="middle" fill="${C.ink2}">${lab}</text>`;
}
function support(x, y, p) {
  const col = C.ink, dash = p.tymcz ? ' stroke-dasharray="3 2"' : '';
  if (p.typ === 'utwierdzenie') return `<rect x="${x - 3}" y="${y - 14}" width="6" height="28" fill="${col}"/>` + [0, 1, 2, 3, 4].map(k => `<line x1="${x + (p.x === 0 ? -3 : 3)}" y1="${y - 12 + k * 6}" x2="${x + (p.x === 0 ? -9 : 9)}" y2="${y - 6 + k * 6}" stroke="${col}" stroke-width=".8"/>`).join('');
  let s = `<path d="M ${x} ${y + 2} L ${x - 8} ${y + 15} L ${x + 8} ${y + 15} Z" fill="var(--panel)" stroke="${col}" stroke-width="1.3"${dash}/>`;
  if (p.typ === 'sprezyna') s += `<path d="M ${x} ${y + 15} l 0 3 l -5 3 l 10 3 l -10 3 l 5 3 l 0 3" fill="none" stroke="${col}" stroke-width="1"/>`;
  else s += `<line x1="${x - 11}" y1="${y + 17}" x2="${x + 11}" y2="${y + 17}" stroke="${col}" stroke-width="1"${dash}/>` + [0, 1, 2, 3].map(k => `<line x1="${x - 9 + k * 6}" y1="${y + 17}" x2="${x - 13 + k * 6}" y2="${y + 22}" stroke="${col}" stroke-width=".7"/>`).join('');
  return s;
}

/* ---------------------------------------------------------- wykres funkcji x */
// o: { xs, L, series:[{y, col, lab, fill, dash}], scale, unit, title, down (wartości dodatnie w dół), sup:[x], width, height, marks }
D.plot = function (o) {
  const W = o.width || 760, H = o.height || 200, padL = 40, padR = 40, padT = 26, padB = 22;
  const L = o.L || 1, X = (x) => padL + (W - padL - padR) * x / L;
  let ymin = 0, ymax = 0;
  o.series.forEach(s => { for (let i = 0; i < s.y.length; i++) { const v = s.y[i] * (o.scale || 1); if (isFinite(v)) { if (v < ymin) ymin = v; if (v > ymax) ymax = v; } } });
  if (ymax - ymin < 1e-9) { ymax = 1; ymin = -1; }
  const span = ymax - ymin, H0 = H - padT - padB;
  const down = o.down !== false;
  const Y = (v) => down ? padT + H0 * (v - ymin) / span : padT + H0 * (ymax - v) / span;
  let g = '';
  const y0 = Y(0);
  g += `<line x1="${X(0)}" y1="${y0}" x2="${X(L)}" y2="${y0}" stroke="${C.ink2}" stroke-width="1.2"/>`;
  (o.sup || []).forEach(x => { g += `<line x1="${X(x)}" y1="${padT - 6}" x2="${X(x)}" y2="${H - padB + 4}" stroke="${C.line}" stroke-dasharray="3 3"/>`; });
  o.series.forEach(s => {
    let d = '';
    for (let i = 0; i < s.y.length; i++) { const v = s.y[i] * (o.scale || 1); if (!isFinite(v)) continue; d += (d ? ' L ' : 'M ') + X(o.xs[i]).toFixed(1) + ' ' + Y(v).toFixed(1); }
    if (s.fill && d) g += `<path d="${d} L ${X(o.xs[o.xs.length - 1]).toFixed(1)} ${y0} L ${X(o.xs[0]).toFixed(1)} ${y0} Z" fill="${s.col}" fill-opacity=".11" stroke="none"/>`;
    g += `<path d="${d}" fill="none" stroke="${s.col}" stroke-width="${s.w || 1.6}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
    // ekstrema
    if (s.lab !== false) {
      let iM = -1, im = -1;
      for (let i = 0; i < s.y.length; i++) { if (!isFinite(s.y[i])) continue; if (iM < 0 || s.y[i] > s.y[iM]) iM = i; if (im < 0 || s.y[i] < s.y[im]) im = i; }
      [iM, im].forEach((i, k) => {
        if (i < 0) return; const v = s.y[i] * (o.scale || 1); if (Math.abs(v) < 1e-6 * Math.max(Math.abs(ymax), Math.abs(ymin))) return;
        if (k === 1 && i === iM) return;
        const yy = Y(v), above = (down ? v < 0 : v > 0);
        g += `<circle cx="${X(o.xs[i])}" cy="${yy}" r="2.4" fill="${s.col}"/><text x="${X(o.xs[i])}" y="${above ? yy - 5 : yy + 12}" font-size="10.5" text-anchor="middle" fill="${s.col}" font-weight="600">${U.fmt(v, o.dec === undefined ? 1 : o.dec)}</text>`;
      });
    }
  });
  if (o.title) g += `<text x="${padL}" y="14" font-size="12" font-weight="650" fill="${C.ink}">${esc(o.title)}</text>`;
  const leg = o.series.filter(s => s.name);
  let lx = W - padR;
  leg.slice().reverse().forEach(s => { const tw = s.name.length * 5.6 + 26; lx -= tw; g += `<line x1="${lx}" y1="11" x2="${lx + 16}" y2="11" stroke="${s.col}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/><text x="${lx + 20}" y="14" font-size="10" fill="${C.ink2}">${esc(s.name)}</text>`; });
  if (o.unit) g += `<text x="6" y="${padT + 6}" font-size="10" fill="${C.ink3}">${esc(o.unit)}</text>`;
  // oś x
  g += `<text x="${X(0)}" y="${H - 6}" font-size="9.5" fill="${C.ink3}" text-anchor="middle">0</text><text x="${X(L)}" y="${H - 6}" font-size="9.5" fill="${C.ink3}" text-anchor="middle">${U.fmt(L / 1000, 2)} m</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.title || 'wykres')}">${g}</svg>`;
};

/* ---------------------------------------------------------- przekrój */
D.section = function (sec, o) {
  o = o || {};
  const S = o.size || 260, pad = 34;
  const sc = (S - 2 * pad) / Math.max(sec.h, Math.max(sec.bg, sec.bd));
  const W = Math.max(sec.bg, sec.bd) * sc + 2 * pad + 40, H = sec.h * sc + 2 * pad;
  const cx = W / 2 - 10, X = (y) => cx + y * sc, Y = (z) => H - pad - z * sc;
  let g = '';
  const d = sec.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') + ' Z';
  g += `<path d="${d}" fill="var(--secfill, #c9d3e3)" stroke="${C.ink}" stroke-width="1.2"/>`;
  // strefy nieefektywne
  (o.eff && o.eff.info || []).forEach(inf => {
    if (inf.el === 'środnik' && inf.hole) { g += `<rect x="${X(-sec.tw / 2)}" y="${Y(inf.hole[1])}" width="${sec.tw * sc}" height="${(inf.hole[1] - inf.hole[0]) * sc}" fill="var(--failbg)" stroke="var(--fail)" stroke-width="1" stroke-dasharray="3 2"/>`; }
    if (inf.el.startsWith('pas') && inf.rho < 1) {
      const top = inf.el === 'pas górny', b = top ? sec.bg : sec.bd, t = top ? sec.tg : sec.td, cut = (1 - inf.rho) * inf.c;
      const z0 = top ? sec.h - t : 0;
      [[-b / 2, -b / 2 + cut], [b / 2 - cut, b / 2]].forEach(([a, c]) => { g += `<rect x="${X(a)}" y="${Y(z0 + t)}" width="${(c - a) * sc}" height="${t * sc}" fill="var(--failbg)" stroke="var(--fail)" stroke-dasharray="3 2"/>`; });
    }
  });
  // osie i środki
  g += `<line x1="${X(-Math.max(sec.bg, sec.bd) / 2) - 12}" y1="${Y(sec.zc)}" x2="${X(Math.max(sec.bg, sec.bd) / 2) + 12}" y2="${Y(sec.zc)}" stroke="${C.acc}" stroke-dasharray="6 3 1 3" stroke-width=".8"/><text x="${X(Math.max(sec.bg, sec.bd) / 2) + 14}" y="${Y(sec.zc) + 3}" font-size="10" fill="${C.acc}">y</text>`;
  g += `<line x1="${X(0)}" y1="${Y(sec.h) - 12}" x2="${X(0)}" y2="${Y(0) + 12}" stroke="${C.acc}" stroke-dasharray="6 3 1 3" stroke-width=".8"/><text x="${X(0) + 3}" y="${Y(0) + 22}" font-size="10" fill="${C.acc}">z</text>`;
  if (!sec.sym) g += `<circle cx="${X(0)}" cy="${Y(sec.zs)}" r="3" fill="none" stroke="${C.M}"/><text x="${X(0) + 6}" y="${Y(sec.zs) - 4}" font-size="9" fill="${C.M}">ŚŚ</text>`;
  // wymiary
  const xr = X(Math.max(sec.bg, sec.bd) / 2) + 26;
  g += `<line x1="${xr}" y1="${Y(0)}" x2="${xr}" y2="${Y(sec.h)}" stroke="${C.ink3}" stroke-width=".8"/><text x="${xr + 4}" y="${(Y(0) + Y(sec.h)) / 2}" font-size="11" fill="${C.ink2}" transform="rotate(90 ${xr + 4} ${(Y(0) + Y(sec.h)) / 2})" text-anchor="middle">h = ${f1(sec.h)}</text>`;
  g += `<text x="${X(0)}" y="${Y(sec.h) - 8}" font-size="11" text-anchor="middle" fill="${C.ink2}">b = ${f1(sec.bg)}${sec.sym ? '' : ''}</text>`;
  if (!sec.sym) g += `<text x="${X(0)}" y="${Y(0) + 26}" font-size="11" text-anchor="middle" fill="${C.ink2}">b = ${f1(sec.bd)}</text>`;
  g += `<text x="${X(sec.tw / 2) + 4}" y="${Y(sec.h / 2)}" font-size="10" fill="${C.ink2}">tw = ${f1(sec.tw)}</text>`;
  g += `<text x="${X(-Math.max(sec.bg, sec.bd) / 2) - 4}" y="${Y(sec.h - sec.tg / 2) + 3}" font-size="10" fill="${C.ink2}" text-anchor="end">tf = ${f1(sec.tg)}</text>`;
  if (!sec.sym) g += `<text x="${X(-sec.bd / 2) - 4}" y="${Y(sec.td / 2) + 3}" font-size="10" fill="${C.ink2}" text-anchor="end">tf = ${f1(sec.td)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H + 10}" width="${W}" height="${H + 10}" role="img" aria-label="Przekrój">${g}</svg>`;
};

/* ---------------------------------------------------------- postać zwichrzenia */
D.mode = function (mode, L, sup, o) {
  o = o || {};
  if (!mode) return '<p class="hint">Brak postaci własnej (αcr = ∞).</p>';
  let um = 1e-30, pm = 1e-30;
  mode.u.forEach(v => { um = Math.max(um, Math.abs(v)); }); mode.phi.forEach(v => { pm = Math.max(pm, Math.abs(v)); });
  const sgn = Math.abs(Math.min(...mode.u)) > Math.max(...mode.u) ? -1 : 1;
  return D.plot({ xs: mode.xs, L, width: o.width, height: o.height || 150, title: o.title || 'Postać zwichrzenia (znormalizowana)', down: false, dec: 2, sup,
    series: [{ y: mode.u.map(v => sgn * v / um), col: C.V, name: 'u – przemieszczenie boczne ŚŚ', lab: false }, { y: mode.phi.map(v => sgn * v / pm), col: C.M, name: 'φ – kąt skręcenia', dash: '5 3', lab: false }] });
};

/* ---------------------------------------------------------- pożar: θ(t) */
D.fire = function (fr, o) {
  o = o || {};
  const W = o.width || 520, H = o.height || 230, pL = 44, pR = 14, pT = 22, pB = 30;
  const tmax = fr.hist[fr.hist.length - 1][0], Tm = 1200;
  const X = (t) => pL + (W - pL - pR) * t / tmax, Y = (T) => H - pB - (H - pT - pB) * T / Tm;
  let g = '';
  [0, 200, 400, 600, 800, 1000, 1200].forEach(T => { g += `<line x1="${pL}" y1="${Y(T)}" x2="${W - pR}" y2="${Y(T)}" stroke="${C.line}" stroke-width=".6"/><text x="${pL - 4}" y="${Y(T) + 3}" font-size="9" text-anchor="end" fill="${C.ink3}">${T}</text>`; });
  for (let t = 0; t <= tmax; t += 30) g += `<text x="${X(t)}" y="${H - pB + 13}" font-size="9" text-anchor="middle" fill="${C.ink3}">${t}</text>`;
  const pg = fr.hist.map((r, i) => (i ? 'L' : 'M') + X(r[0]).toFixed(1) + ' ' + Y(r[2]).toFixed(1)).join(' ');
  const pa = fr.hist.map((r, i) => (i ? 'L' : 'M') + X(r[0]).toFixed(1) + ' ' + Y(r[1]).toFixed(1)).join(' ');
  g += `<path d="${pg}" fill="none" stroke="${C.M}" stroke-width="1.4" stroke-dasharray="5 3"/><path d="${pa}" fill="none" stroke="${C.V}" stroke-width="1.8"/>`;
  g += `<line x1="${pL}" y1="${Y(fr.thcr)}" x2="${W - pR}" y2="${Y(fr.thcr)}" stroke="${C.z}" stroke-dasharray="3 3"/><text x="${W - pR}" y="${Y(fr.thcr) - 4}" font-size="10" text-anchor="end" fill="${C.z}">θa,cr = ${U.fmt(fr.thcr, 0)} °C</text>`;
  g += `<line x1="${X(fr.Rreq)}" y1="${pT}" x2="${X(fr.Rreq)}" y2="${H - pB}" stroke="${C.ink2}" stroke-dasharray="2 3"/><text x="${X(fr.Rreq) + 3}" y="${pT + 10}" font-size="10" fill="${C.ink2}">R${fr.Rreq}</text>`;
  g += `<text x="${pL}" y="14" font-size="11.5" font-weight="650" fill="${C.ink}">Temperatura gazów (ISO 834) i stali θa(t)</text><text x="${W - pR}" y="${H - 4}" font-size="9.5" text-anchor="end" fill="${C.ink3}">t [min]</text><text x="6" y="${pT}" font-size="9.5" fill="${C.ink3}">θ [°C]</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Krzywe nagrzewania">${g}</svg>`;
};

/* ---------------------------------------------------------- połączenie (widok) */
D.joint = function (sec, w) {
  const W = 280, H = 230, sc = 160 / Math.max(sec.h, 1), cx = 140, cy = 115;
  let g = '';
  const hh = sec.h * sc, yt = cy - hh / 2;
  g += `<rect x="${cx - 6}" y="${yt}" width="${W - cx}" height="${sec.tg * sc}" fill="var(--secfill,#c9d3e3)" stroke="${C.ink}"/><rect x="${cx - 6}" y="${yt + hh - sec.td * sc}" width="${W - cx}" height="${sec.td * sc}" fill="var(--secfill,#c9d3e3)" stroke="${C.ink}"/><rect x="${cx - 6}" y="${yt + sec.tg * sc}" width="${W - cx}" height="${hh - (sec.tg + sec.td) * sc}" fill="var(--panel2)" stroke="${C.ink3}" stroke-width=".6"/>`;
  if (w.typ === 'blacha_czolowa' || w.typ === 'blacha_zebrowa') {
    const hp = U.num(w.hp) * sc, tp = Math.max(3, U.num(w.tp) * sc);
    const yp = cy - hp / 2;
    if (w.typ === 'blacha_czolowa') {
      g += `<rect x="${cx - 6 - tp}" y="${yp}" width="${tp}" height="${hp}" fill="var(--acc2)" stroke="${C.acc}"/>`;
      const nr = Math.max(1, Math.round(U.num(w.nr))); const e1 = U.num(w.e1) * sc, p1 = U.num(w.p1) * sc;
      for (let i = 0; i < nr; i++) g += `<rect x="${cx - 6 - tp - 10}" y="${yp + e1 + i * p1 - 3}" width="${tp + 20}" height="6" fill="${C.ink}" opacity=".75"/>`;
      g += `<rect x="${cx - 40}" y="10" width="${34 - tp}" height="${H - 20}" fill="var(--panel2)" stroke="${C.ink3}"/><text x="${cx - 23 - tp / 2}" y="${H - 14}" font-size="9" text-anchor="middle" fill="${C.ink3}" transform="rotate(-90 ${cx - 23 - tp / 2} ${H - 14})" dx="40">podpora</text>`;
    } else {
      const z = U.num(w.z) * sc;
      g += `<rect x="${cx - 40}" y="10" width="34" height="${H - 20}" fill="var(--panel2)" stroke="${C.ink3}"/><rect x="${cx - 6}" y="${yp}" width="${z + U.num(w.e2) * sc}" height="${hp}" fill="var(--acc2)" fill-opacity=".8" stroke="${C.acc}"/>`;
      const n = Math.max(1, Math.round(U.num(w.n))); const e1 = U.num(w.e1) * sc, p1 = U.num(w.p1) * sc;
      for (let i = 0; i < n; i++) g += `<circle cx="${cx - 6 + z}" cy="${yp + e1 + i * p1}" r="${Math.max(2.5, 8 * sc)}" fill="${C.ink}" opacity=".8"/>`;
    }
  } else if (w.typ === 'oparcie') {
    g += `<rect x="${cx - 30}" y="${yt + hh}" width="${Math.max(30, U.num(w.lp) * sc)}" height="${Math.max(3, U.num(w.tp) * sc)}" fill="var(--acc2)" stroke="${C.acc}"/><rect x="${cx - 60}" y="${yt + hh + Math.max(3, U.num(w.tp) * sc)}" width="${120}" height="${H - (yt + hh) - 10}" fill="var(--panel2)" stroke="${C.ink3}"/>`;
    if (w.zebro) g += `<rect x="${cx + 10}" y="${yt + sec.tg * sc}" width="${Math.max(3, U.num(w.ts) * sc)}" height="${hh - (sec.tg + sec.td) * sc}" fill="var(--acc2)" stroke="${C.acc}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Szkic węzła">${g}</svg>`;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
