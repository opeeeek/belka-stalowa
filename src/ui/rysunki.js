/* =====================================================================
   BelkaStal – rysunki SVG (jak w BelkaŻB): klikany schemat statyczny
   z pasmami obciążeń i legendą, wykres pod schematem (M, V, ugięcie, N,
   R), przekrój z klikanymi strefami, wykresy liniowe z kursorem,
   reakcje, widok podłużny belki z połączeniami, szkice węzłów,
   piktogramy schematów i podpór.  Kolory stałe (#rrggbb) – motyw
   ciemny przez zmienne --sv-* (BS.Q.themeSvgIn).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, Q = BS.Q;
const D = BS.D = {};
const { esc, fmt, tx, svgOpen, dimH, dimV } = Q;
const KC = D.KC = { G: '#4a5466', Q: '#1d5bb8', S: '#0e8fa8', W: '#1d7f3c', T: '#5d7a2e', Qc: '#a35d00', M: '#b5651d', A: '#c0262d', sw: '#4a5466' };
D.loadColor = (c) => KC[c.rodzaj] || '#6a3fb5';
const RODZ = () => BS.S.RODZAJE;

/* ------------------------------------------------------------ podpory (symbole) */
function supportSym(p, x, y, o) {
  o = o || {};
  const c = '#1b2230', dash = p.tymcz ? ' stroke-dasharray="3 2"' : '';
  let s = '';
  if (p.typ === 'utwierdzenie') {
    const left = !o.right;
    s += `<line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y + 16}" stroke="${c}" stroke-width="2.4"/>`;
    for (let k = -14; k <= 14; k += 6) s += `<line x1="${x}" y1="${y + k}" x2="${x + (left ? -7 : 7)}" y2="${y + k + 6}" stroke="${c}" stroke-width="0.9"/>`;
  } else {
    s += `<path d="M ${x} ${y + 2} L ${x - 9} ${y + 16} L ${x + 9} ${y + 16} Z" fill="#ffffff" stroke="${c}" stroke-width="1.3"${dash}/>`;
    if (p.typ === 'sprezyna') s += `<path d="M ${x} ${y + 16} l 0 3 l -5 3 l 10 3 l -10 3 l 5 3 l 0 3" fill="none" stroke="${c}" stroke-width="1"/>`;
    else if (p.przesuwna) s += `<circle cx="${x - 5}" cy="${y + 19}" r="2.4" fill="none" stroke="${c}"/><circle cx="${x + 5}" cy="${y + 19}" r="2.4" fill="none" stroke="${c}"/><line x1="${x - 12}" y1="${y + 22.5}" x2="${x + 12}" y2="${y + 22.5}" stroke="${c}"/>`;
    else { s += `<line x1="${x - 12}" y1="${y + 17}" x2="${x + 12}" y2="${y + 17}" stroke="${c}"${dash}/>`; for (let k = 0; k < 4; k++) s += `<line x1="${x - 10 + k * 6}" y1="${y + 17}" x2="${x - 14 + k * 6}" y2="${y + 22}" stroke="${c}" stroke-width="0.8"/>`; }
  }
  return s;
}
D.supportSym = supportSym;
function arrowD(x, y1, y2, col, hs, sw) { // strzałka pionowa od y1 do y2
  const d = y2 > y1 ? 1 : -1, h = hs || 4;
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - d * h}" stroke="${col}" stroke-width="${sw || 1}"/><path d="M ${x} ${y2} L ${x - h * 0.6} ${y2 - d * h} L ${x + h * 0.6} ${y2 - d * h} Z" fill="${col}"/>`;
}

/* ------------------------------------------------------------ klikany schemat statyczny */
// o: { W, etap, edit, sel:Set, diag, dims, legend:[], out:{} }
D.scheme = function (S, R, o) {
  o = o || {};
  const md = R && R.md; if (!md) return '';
  const W = o.W || 760, ml = 34, mr = 34, L = md.L || 1, s = o.etap === undefined ? md.nE - 1 : o.etap;
  const X = (x) => ml + (W - ml - mr) * x / L;
  const legend = o.legend || [], out = o.out || {};
  // pasma obciążeń
  const bands = [], pts = [];
  const swOn = (S.ciezarWlasny || {}).auto !== false;
  if (R.sec) bands.push({ li: 'sw', col: KC.sw, x0: 0, x1: L, q0: R.sec.gk * (1 + U.num(S.ciezarWlasny.dodatek) / 100), q1: null, lab: `G₀ ciężar własny: q = ${fmt(R.sec.gk * (1 + U.num(S.ciezarWlasny.dodatek) / 100), 2)} kN/m${swOn ? '' : ' (pominięty)'}`, off: !swOn, inStage: true });
  (S.obciazenia || []).forEach((c, li) => {
    const st = RODZ()[c.rodzaj] || {}, et = U.clamp(Math.round(U.num(c.etap, md.nE - 1)), 0, md.nE - 1);
    const inStage = st.stale ? et <= s : et === s;
    (c.sklad || []).forEach((k, ci) => {
      const col = KC[c.rodzaj] || '#6a3fb5', off = c.aktywne === false;
      if (k.typ === 'q') {
        const x0 = U.clamp(U.num(k.x0) * 1000, 0, L), x1 = (k.x1 === '' || k.x1 === null || k.x1 === undefined) ? L : U.clamp(U.num(k.x1) * 1000, 0, L);
        const q0 = U.num(k.q0), q1 = (k.q1 === '' || k.q1 === undefined || k.q1 === null) ? q0 : U.num(k.q1);
        bands.push({ li, ci, col, x0, x1, q0, q1, y: k.kier === 'y', lab: `${c.id} ${c.nazwa ? c.nazwa.slice(0, 26) : ''}: q = ${fmt(q0, 2)}${q1 !== q0 ? '…' + fmt(q1, 2) : ''} kN/m${k.kier === 'y' ? ' [Y]' : ''}`, off, inStage });
      } else pts.push({ li, ci, col, k, off, inStage, id: c.id });
    });
  });
  const bh0 = 14, gap = 3, top = 6;
  const qMax = Math.max(1e-9, ...bands.map(b => Math.max(Math.abs(b.q0), Math.abs(b.q1 === null || b.q1 === undefined ? b.q0 : b.q1))));
  let yAcc = top; bands.forEach(b => { const q = Math.max(Math.abs(b.q0), Math.abs(b.q1 === null || b.q1 === undefined ? b.q0 : b.q1)); b.h = Math.round(Math.max(bh0 * 0.75, Math.min(bh0 * 1.9, bh0 * 1.9 * q / qMax))); b.yy = yAcc; yAcc += b.h + gap; });
  const yLoads = yAcc;
  const hasP = pts.some(p => p.k.typ === 'P');
  const yBeam = yLoads + (hasP ? 44 : 22);
  let g = '';
  bands.forEach((b) => {
    const y0 = b.yy, bh = b.h, x0 = X(b.x0), x1 = X(b.x1), q1v = b.q1 === null || b.q1 === undefined ? b.q0 : b.q1, neg = b.q0 < 0 && q1v <= 0;
    const qm = Math.max(Math.abs(b.q0), Math.abs(q1v)) || 1, h0 = bh * Math.abs(b.q0) / qm, h1 = bh * Math.abs(q1v) / qm, yb = y0 + bh;
    const op = b.off ? 0.3 : b.inStage ? 1 : 0.4, dash = neg || b.y ? ' stroke-dasharray="3 2"' : '';
    let a = Math.abs(b.q0 - q1v) < 1e-9 ? `<rect x="${x0.toFixed(1)}" y="${y0}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${bh}" fill="${b.col}" fill-opacity="${neg || b.y ? 0.08 : 0.16}" stroke="${b.col}" stroke-width="0.8"${dash}/>`
      : `<polygon points="${x0.toFixed(1)},${yb} ${x0.toFixed(1)},${(yb - h0).toFixed(1)} ${x1.toFixed(1)},${(yb - h1).toFixed(1)} ${x1.toFixed(1)},${yb}" fill="${b.col}" fill-opacity="${neg || b.y ? 0.08 : 0.16}" stroke="${b.col}" stroke-width="0.8"${dash}/>`;
    const n = Math.max(2, Math.min(40, Math.round((x1 - x0) / 22)));
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, hh = h0 + (h1 - h0) * k / n; if (hh < 3) continue;
      if (b.y) { if (k % 2 === 0) a += `<circle cx="${x.toFixed(1)}" cy="${(yb - hh / 2).toFixed(1)}" r="2" fill="none" stroke="${b.col}" stroke-width="0.6"/>`; continue; }
      a += `<line x1="${x.toFixed(1)}" y1="${(yb - hh + 2).toFixed(1)}" x2="${x.toFixed(1)}" y2="${yb - 1}" stroke="${b.col}" stroke-width="0.6" stroke-opacity="0.7"/>`;
      a += neg ? `<path d="M${x.toFixed(1)},${(yb - hh + 1).toFixed(1)} l-2.2,3.6 h4.4 z" fill="${b.col}" fill-opacity="0.8"/>` : `<path d="M${x.toFixed(1)},${yb} l-2.2,-3.6 h4.4 z" fill="${b.col}" fill-opacity="0.8"/>`;
    }
    const cw = 9.5 * 0.53, lx = Math.max(2, Math.min(Math.max(x0 + 3, ml), W - mr - b.lab.length * cw)), maxC = Math.floor((W - 4 - lx) / cw), lab = b.lab.length > maxC ? b.lab.slice(0, Math.max(8, maxC - 1)) + '…' : b.lab;
    a += tx(lx, yb - 3, esc(lab), { a: 'start', fs: 9.5, c: b.col, w: 600 }).replace('<text ', '<text paint-order="stroke" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round" ');
    g += `<g class="${o.edit ? 'ld' : ''}" data-li="${b.li}" data-ci="${b.ci === undefined ? '' : b.ci}" opacity="${op}"><title>${esc(b.lab)}${o.edit ? ' – kliknij, aby zmienić' : ''}</title><rect x="${x0}" y="${y0}" width="${Math.max(4, x1 - x0)}" height="${bh}" fill="#ffffff" fill-opacity="0"/>${a}</g>`;
    legend.push({ y: y0 + bh / 2, li: b.li, lab: b.li === 'sw' ? 'ciężar własny' : `${(S.obciazenia[b.li] || {}).id || ''} ${((S.obciazenia[b.li] || {}).nazwa || '').slice(0, 18)}`, col: b.col, off: b.off, sw: b.li === 'sw' });
  });
  // belka i przęsła (elementy klikane)
  md.seg.forEach((sg, k) => {
    const a = X(sg.x0), b = X(sg.x1), on = o.sel && o.sel.has(k);
    g += `<g class="${o.edit ? 'elm' : ''}" data-seg="${k}"><rect class="elhl" x="${a}" y="${yBeam - 9}" width="${b - a}" height="18" rx="3" fill="${on ? '#1d5bb8' : '#ffffff'}" fill-opacity="${on ? 0.16 : 0}" stroke="${on ? '#1d5bb8' : 'none'}" stroke-dasharray="4 3"/><line x1="${a}" y1="${yBeam}" x2="${b}" y2="${yBeam}" stroke="#1b2230" stroke-width="${on ? 4.2 : 3.2}"/></g>`;
  });
  // stężenie ciągłe
  const c = md.ciagle || {};
  if (c.pasG && U.num(c.odEtapu, 0) <= s) g += `<g class="${o.edit ? 'cont' : ''}" data-cont="g"><line x1="${X(0)}" y1="${yBeam - 4}" x2="${X(L)}" y2="${yBeam - 4}" stroke="#1d5bb8" stroke-width="2" stroke-dasharray="2 3"/>${tx(X(L) - 2, yBeam - 8, 'pas górny stężony ciągle', { a: 'end', fs: 9, c: '#1d5bb8' })}</g>`;
  if (c.pasD && U.num(c.odEtapuD, 0) <= s) g += `<line x1="${X(0)}" y1="${yBeam + 4}" x2="${X(L)}" y2="${yBeam + 4}" stroke="#1d5bb8" stroke-width="2" stroke-dasharray="2 3"/>`;
  // siły skupione i momenty
  pts.forEach(p => {
    const x = X(U.clamp(U.num(p.k.x) * 1000, 0, L)), op = p.off ? 0.25 : p.inStage ? 1 : 0.4;
    if (p.k.typ === 'P') {
      const P = U.num(p.k.P), up = P < 0;
      g += `<g class="${o.edit ? 'ld' : ''}" data-li="${p.li}" data-ci="${p.ci}" opacity="${op}"><rect x="${x - 8}" y="${yBeam - 38}" width="16" height="34" fill="#ffffff" fill-opacity="0"/>${up ? arrowD(x, yBeam - 3, yBeam - 34, p.col, 6, 1.7) : arrowD(x, yBeam - 36, yBeam - 3, p.col, 6, 1.7)}${tx(x + 5, yBeam - 27, `${esc(p.id)}: ${fmt(Math.abs(P), 1)} kN${p.k.kier === 'y' ? ' [Y]' : ''}`, { a: 'start', fs: 9.5, c: p.col, w: 600 })}</g>`;
    } else {
      const M = U.num(p.k.M);
      g += `<g class="${o.edit ? 'ld' : ''}" data-li="${p.li}" data-ci="${p.ci}" opacity="${op}"><path d="M ${x - 10} ${yBeam - 6} A 11 11 0 1 1 ${x + 10} ${yBeam - 6}" fill="none" stroke="${p.col}" stroke-width="1.5"/>${tx(x + 12, yBeam - 16, `${esc(p.id)}: ${fmt(M, 1)} kNm`, { a: 'start', fs: 9.5, c: p.col })}</g>`;
    }
  });
  // podpory
  const sys = md.systems[s] || md.sup;
  md.sup.forEach((p, i) => {
    const x = X(p.x), sp = (S.podpory || [])[i] || {};
    g += `<g class="${o.edit ? 'supp' : ''}" data-sup="${i}"><rect class="suphl" x="${x - 14}" y="${yBeam - 4}" width="28" height="32" rx="3" fill="#ffffff" fill-opacity="0" stroke="none"/>${supportSym(Object.assign({}, p, { przesuwna: sp.przesuwna }), x, yBeam, { right: i > 0 && i === md.sup.length - 1 })}${tx(x, yBeam + 36, p.id, { fs: 11, w: 700 })}</g>`;
  });
  md.tmp.forEach((t, i) => {
    const x = X(t.x), act = s <= t.do;
    g += `<g class="${o.edit ? 'tsupp' : ''}" data-tmp="${i}" opacity="${act ? 1 : 0.3}"><rect x="${x - 12}" y="${yBeam - 4}" width="24" height="30" fill="#ffffff" fill-opacity="0"/>${supportSym(t, x, yBeam)}${tx(x, yBeam + 36, act ? t.id : t.id + ' (usunięta)', { fs: 9.5, c: '#5b6576' })}</g>`;
  });
  // stężenia dyskretne
  (md.stez || []).forEach((z, i) => {
    const act = z.od <= s, x = X(z.x), yy = z.wys === 'pas_d' ? yBeam + 6 : z.wys === 'srodek' ? yBeam : yBeam - 6, col = act ? '#1d5bb8' : '#9aa3b0';
    g += `<g class="${o.edit ? 'rst' : ''}" data-rst="${z.src}" opacity="${act ? 1 : 0.45}"><title>Stężenie ${z.typ} x = ${fmt(z.x / 1000, 2)} m (od etapu ${z.od + 1})</title><circle cx="${x}" cy="${yy}" r="6" fill="#ffffff" fill-opacity="0"/><circle cx="${x}" cy="${yy}" r="4.2" fill="#ffffff" stroke="${col}" stroke-width="1.6"/>${z.typ !== 'boczne' ? `<line x1="${x - 3}" y1="${yy - 3}" x2="${x + 3}" y2="${yy + 3}" stroke="${col}" stroke-width="1.4"/><line x1="${x - 3}" y1="${yy + 3}" x2="${x + 3}" y2="${yy - 3}" stroke="${col}" stroke-width="1.4"/>` : `<circle cx="${x}" cy="${yy}" r="1.4" fill="${col}"/>`}</g>`;
  });
  // żebra poprzeczne środnika
  (R.zebra || []).forEach(z => { const x = X(z.x); g += `<g class="${o.edit ? 'stf' : ''}" data-stf="${z.src}"${o.edit ? ' style="cursor:pointer"' : ''}><title>Żebro środnika x = ${fmt(z.x / 1000, 2)} m (${z.strona === 'jedna' ? 'jednostronne' : 'obustronne'} ${fmt(z.bs, 0)}×${fmt(z.ts, 0)} mm${z.c > 0 ? `, wcięcia 45° c = ${fmt(z.c, 0)} mm` : ''})</title><rect x="${x - 4}" y="${yBeam - 10}" width="8" height="20" fill="#ffffff" fill-opacity="0"/><line x1="${x}" y1="${yBeam - 7}" x2="${x}" y2="${yBeam + 7}" stroke="#b5651d" stroke-width="2"/></g>`; });
  // styki montażowe
  (S.styki || []).forEach((st2, j) => { const x = X(U.clamp(U.num(st2.x) * 1000, 0, L)); g += `<g class="${o.edit ? 'sty' : ''}" data-sty="${j}"${o.edit ? ' style="cursor:pointer"' : ''}><title>Styk montażowy S${j + 1} – x = ${fmt(U.num(st2.x), 2)} m</title><rect x="${x - 7}" y="${yBeam - 14}" width="14" height="28" fill="#ffffff" fill-opacity="0"/><line x1="${x - 2.5}" y1="${yBeam - 9}" x2="${x - 2.5}" y2="${yBeam + 9}" stroke="#b5651d" stroke-width="1.6"/><line x1="${x + 2.5}" y1="${yBeam - 9}" x2="${x + 2.5}" y2="${yBeam + 9}" stroke="#b5651d" stroke-width="1.6"/>${tx(x, yBeam - 12, 'S' + (j + 1), { fs: 9, w: 700, c: '#b5651d' })}</g>`; });
  // opis przekroju
  if (R.sec) { const sp0 = md.seg.find(z => !z.wsp) || md.seg[0]; g += tx(X((sp0.x0 + sp0.x1) / 2), yBeam + 14, esc(`${R.sec.nazwa} · ${S.material.gatunek}${S.material.podgatunek}`), { fs: 10, c: '#4a5466' }); }
  let y = yBeam + 46;
  // wykres pod belką
  if (o.diag && R.env) { out.dgY = y; const d = D.diagBand(o.diag, S, R, s, X, y, W); g += d.svg; y += d.H; }
  // wymiary
  if (o.dims !== false) {
    const xs = [0].concat(md.sup.map(p => p.x)).concat([L]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    y += 12;
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 1) g += dimH(X(xs[i - 1]), X(xs[i]), y, fmt((xs[i] - xs[i - 1]) / 1000, 2));
    y += 26; g += dimH(X(0), X(L), y, `L = ${fmt(L / 1000, 2)} m`);
    y += 10;
  }
  out.H = y + 4; out.yBeam = yBeam; out.X = X;
  return svgOpen(W, out.H, `class="schemesvg"`) + g + '</svg>';
};

/* wykres pod schematem: M, V, ugięcie, N, R */
D.diagBand = function (kind, S, R, s, X, y0, W) {
  const md = R.md, an = R.an, ev = R.env[s], xs = Array.from(an.xs), L = md.L;
  const HB = kind === 'R' ? 70 : 120;
  let g = `<g class="diag">`;
  if (kind === 'R') {
    md.systems[s].forEach(p => { const r = ev.R[p.id] || {}; const x = X(p.x); const v = r.max || 0; g += arrowD(x, y0 + 50, y0 + 14, '#c0262d', 6, 1.8) + tx(x, y0 + 64, `${p.id}: ${fmt(v / 1000, 1)} kN`, { fs: 10, c: '#c0262d', w: 600 }) + (r.min < -1 ? tx(x, y0 + 8, `min ${fmt(r.min / 1000, 1)}`, { fs: 9, c: '#a35d00' }) : ''); });
    return { svg: g + tx(14, y0 + 30, 'R [kN]', { a: 'start', fs: 10, c: '#7a8494' }) + '</g>', H: HB };
  }
  let ser = [], unit = '', sc = 1, lines = [];
  if (kind === 'M') { ser = [{ y: ev.Mmax, c: '#c0262d', f: true }, { y: ev.Mmin, c: '#c0262d', f: true }]; sc = 1e-6; unit = 'M [kNm]';
    if (R.base) { lines.push({ y: R.base.Mc_pos, c: '#1d7f3c', l: `M_c,Rd = ${fmt(R.base.Mc_pos / 1e6, 1)}` }); if (Math.min(...ev.Mmin) < -1) lines.push({ y: -R.base.Mc_neg, c: '#1d7f3c', l: `−M_c,Rd` }); }
    const L2 = R.ltb && R.ltb[s]; if (L2) L2.segs.forEach(sg => { if (!sg.brak && sg.ltb && !sg.ltb.skip) lines.push({ y: (sg.Mpos ? 1 : -1) * sg.Mb, c: '#a35d00', x0: sg.sg.x0, x1: sg.sg.x1, l: `M_b,Rd ${fmt(sg.Mb / 1e6, 1)}` }); });
  } else if (kind === 'V') { ser = [{ y: ev.Vmax, c: '#1d5bb8', f: true }, { y: ev.Vmin, c: '#1d5bb8', f: true }]; sc = 1e-3; unit = 'V [kN]'; if (R.base) { const Vr = R.sb && R.sb.need ? Math.min(R.base.Vpl, R.sb.Vb) : R.base.Vpl; lines.push({ y: Vr, c: '#1d7f3c', l: `V_Rd = ${fmt(Vr / 1e3, 1)}` }, { y: -Vr, c: '#1d7f3c' }); } }
  else if (kind === 'w') { ser = [{ y: ev.wmax, c: '#1d7f3c', f: true }, { y: ev.wmin, c: '#1d7f3c' }]; sc = 1; unit = 'w [mm]';
    if (s === md.nE - 1 && R.sgu) R.sgu.seg.forEach(q => lines.push({ y: q.limMax, c: '#a35d00', x0: q.sg.x0, x1: q.sg.x1, l: `${q.sg.wsp ? '2L' : 'L'}/${S.sgu.wmax}` })); }
  else if (kind === 'N') { const n = ev.Nmax > -Infinity ? [ev.Nmin, ev.Nmax] : [0, 0]; ser = [{ y: xs.map(() => n[1]), c: '#155e2c', f: true }, { y: xs.map(() => n[0]), c: '#155e2c' }]; sc = 1e-3; unit = 'N [kN] (+ rozc.)'; }
  let ymin = 0, ymax = 0;
  ser.forEach(q => q.y.forEach(v => { const w = v * sc; if (isFinite(w)) { ymin = Math.min(ymin, w); ymax = Math.max(ymax, w); } }));
  lines.forEach(l => { const w = l.y * sc; if (Math.abs(w) < 3 * Math.max(Math.abs(ymin), Math.abs(ymax), 1e-9)) { ymin = Math.min(ymin, w); ymax = Math.max(ymax, w); } });
  if (ymax - ymin < 1e-9) { ymax = 1; ymin = -1; }
  const down = kind === 'M' || kind === 'w';
  const Y = (v) => down ? y0 + 10 + (HB - 26) * (v * sc - ymin) / (ymax - ymin) : y0 + 10 + (HB - 26) * (ymax - v * sc) / (ymax - ymin);
  const yz = Y(0);
  g += `<line x1="${X(0)}" y1="${yz}" x2="${X(L)}" y2="${yz}" stroke="#39414f" stroke-width="0.9"/>`;
  ser.forEach(q => {
    const p = xs.map((x, i) => `${X(x).toFixed(1)},${Y(q.y[i]).toFixed(1)}`).join(' ');
    if (q.f) g += `<polygon points="${X(xs[0]).toFixed(1)},${yz} ${p} ${X(xs[xs.length - 1]).toFixed(1)},${yz}" fill="${q.c}" fill-opacity="0.12"/>`;
    g += `<polyline points="${p}" fill="none" stroke="${q.c}" stroke-width="1.5"/>`;
  });
  lines.forEach(l => { const yy = Y(l.y); if (yy < y0 + 2 || yy > y0 + HB) return; const a = X(l.x0 !== undefined ? l.x0 : 0), b = X(l.x1 !== undefined ? l.x1 : L); g += `<line x1="${a}" y1="${yy}" x2="${b}" y2="${yy}" stroke="${l.c}" stroke-width="1.1" stroke-dasharray="6 4"/>` + (l.l && b - a > 70 ? tx(a + 3, yy - 3, esc(l.l).replace(/_([a-zA-Z,]+)/, '<tspan font-size="8" dy="2">$1</tspan><tspan dy="-2"></tspan>'), { a: 'start', fs: 9, c: l.c }) : ''); });
  // ekstrema
  const marks = [];
  ser.forEach((q, si) => {
    let iM = 0, im = 0; q.y.forEach((v, i) => { if (v > q.y[iM]) iM = i; if (v < q.y[im]) im = i; });
    const pick = ser.length > 1 ? (si === 0 ? [iM] : [im]) : [iM, im];
    pick.forEach(i => { const v = q.y[i] * sc; if (!isFinite(v) || Math.abs(v) < 1e-3 * Math.max(Math.abs(ymax), Math.abs(ymin), 1e-9)) return; if (si === 1 && kind !== 'V' && v >= 0) return; if (si === 0 && kind !== 'V' && v <= 0) return; if (marks.some(m => Math.abs(m - v) < 1e-9)) return; marks.push(v); const yy = Y(q.y[i]); const below = down ? v > 0 : v < 0; g += `<circle cx="${X(xs[i])}" cy="${yy}" r="2.6" fill="${q.c}"/>` + tx(X(xs[i]), below ? yy + 12 : yy - 5, fmt(v, 1), { fs: 10, c: q.c, w: 650 }); });
  });
  g += tx(14, y0 + 12, unit, { a: 'start', fs: 10, c: '#7a8494' });
  return { svg: g + '</g>', H: HB };
};

/* ------------------------------------------------------------ przekrój (klikane strefy) */
// o: { size, eff, zones (klikane), sigma: {M, N} – wykres naprężeń sprężystych, fy }
D.section = function (sec, o) {
  o = o || {};
  const S0 = o.size || 260, pad = 36;
  const bmax = sec.ymax - sec.ymin;
  const sc = (S0 - 2 * pad) / Math.max(sec.h, bmax);
  const wSig = o.sigma ? 150 : 0;
  const W = bmax * sc + 2 * pad + 50 + wSig, H = sec.h * sc + 2 * pad + 14;
  const cx = pad + 26 - sec.ymin * sc, X = (y) => cx + y * sc, Y = (z) => H - pad - z * sc;
  let g = '';
  const path = sec.rings.map(r => r.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') + ' Z').join(' ');
  g += `<path d="${path}" fill="#c9d4e6" fill-rule="evenodd" stroke="#1b2230" stroke-width="1.2"/>`;
  // części nieefektywne
  (o.eff && o.eff.info || []).forEach(inf => {
    if (inf.hole) {
      const ws = P0rects(sec).filter(r => r.id === 'w');
      ws.forEach(w => { g += `<rect x="${X(w.y0)}" y="${Y(inf.hole[1])}" width="${(w.y1 - w.y0) * sc}" height="${(inf.hole[1] - inf.hole[0]) * sc}" fill="#e6b3b3" stroke="#c0262d" stroke-width="1" stroke-dasharray="3 2"/>`; });
    }
  });
  if (o.eff && o.eff.rects) {
    const full = P0rects(sec).filter(r => r.id === 'fg' || r.id === 'fd');
    full.forEach(f => { const kept = o.eff.rects.filter(r => r.id.startsWith(f.id)); const covered = kept.reduce((a, r) => a + (r.y1 - r.y0), 0); if (covered < (f.y1 - f.y0) - 1e-6) {
      // zaznacz brakujące odcinki
      let segs = [[f.y0, f.y1]]; kept.forEach(r => { segs = segs.flatMap(([a, b]) => (r.y1 <= a || r.y0 >= b) ? [[a, b]] : [[a, Math.max(a, r.y0)], [Math.min(b, r.y1), b]].filter(([p, q]) => q - p > 1e-6)); });
      segs.forEach(([a, b]) => { g += `<rect x="${X(a)}" y="${Y(f.z1)}" width="${(b - a) * sc}" height="${(f.z1 - f.z0) * sc}" fill="#e6b3b3" stroke="#c0262d" stroke-dasharray="3 2"/>`; });
    } });
  }
  // osie, środek ciężkości, środek ścinania
  const yL = X(sec.ymin) - 12, yR = X(sec.ymax) + 12;
  g += `<line x1="${yL}" y1="${Y(sec.zc)}" x2="${yR}" y2="${Y(sec.zc)}" stroke="#1d5bb8" stroke-dasharray="6 3 1 3" stroke-width="0.8"/>` + tx(yR + 3, Y(sec.zc) + 3, 'y', { a: 'start', fs: 10, c: '#1d5bb8' });
  g += `<line x1="${X(sec.yc)}" y1="${Y(sec.h) - 12}" x2="${X(sec.yc)}" y2="${Y(0) + 12}" stroke="#1d5bb8" stroke-dasharray="6 3 1 3" stroke-width="0.8"/>` + tx(X(sec.yc) + 3, Y(0) + 20, 'z', { a: 'start', fs: 10, c: '#1d5bb8' });
  if (!sec.sym || sec.kind === 'U' || sec.kind === 'L') { g += `<circle cx="${X(sec.ys)}" cy="${Y(sec.zs)}" r="3.2" fill="none" stroke="#c0262d"/>` + tx(X(sec.ys) - 5, Y(sec.zs) - 5, 'ŚŚ', { a: 'end', fs: 9, c: '#c0262d' }); }
  // wymiary
  g += dimV(X(sec.ymin) - 18, Y(0), Y(sec.h), `h = ${fmt(sec.h, 0)}`);
  const bTop = sec.kind === 'L' ? (sec.poz === 'gora' ? sec.b : sec.t) : sec.bg;
  if (sec.kind === 'I' || sec.kind === 'RHS' || sec.kind === 'U') g += dimH(X(sec.kind === 'U' ? 0 : -bTop / 2), X(sec.kind === 'U' ? bTop : bTop / 2), Y(sec.h) - 10, `b = ${fmt(bTop, 0)}`);
  if (sec.kind === 'I' && !sec.sym) g += dimH(X(-sec.bd / 2), X(sec.bd / 2), Y(0) + 14, `b = ${fmt(sec.bd, 0)}`, { below: true });
  if (sec.kind === 'L') g += dimH(X(0), X(sec.b), sec.poz === 'gora' ? Y(sec.h) - 10 : Y(0) + 14, `b = ${fmt(sec.b, 0)}`, { below: sec.poz !== 'gora' });
  const twTxt = sec.kind === 'RHS' ? `t = ${fmt(sec.t, 1)}` : sec.kind === 'L' ? `t = ${fmt(sec.t, 1)}` : `t_w = ${fmt(sec.tw, 1)}`;
  g += tx(X(sec.kind === 'I' ? sec.tw / 2 : sec.kind === 'U' ? sec.tw : sec.kind === 'L' ? sec.t : sec.b / 2) + 4, Y(sec.h * 0.42), twTxt.replace(/_(\w+)/, '<tspan font-size="8" dy="2">$1</tspan><tspan dy="-2"></tspan>'), { a: 'start', fs: 10, c: '#3d4656' });
  if (sec.kind === 'I' || sec.kind === 'U') g += tx(X(sec.kind === 'U' ? sec.b : sec.bg / 2) + 4, Y(sec.h - sec.tg / 2) + 3, `t<tspan font-size="8" dy="2">f</tspan><tspan dy="-2"> = ${fmt(sec.tg, 1)}</tspan>`, { a: 'start', fs: 10, c: '#3d4656' });
  // klikane strefy
  if (o.zones) {
    const zone = (z, a, b, c, d, t) => `<rect class="zhit" data-z="${z}" x="${Math.min(a, b)}" y="${Math.min(c, d)}" width="${Math.abs(b - a)}" height="${Math.abs(d - c)}" fill="#ffffff" fill-opacity="0" stroke="none"><title>${esc(t)}</title></rect>`;
    if (sec.kind === 'I' || sec.kind === 'U') {
      const y0 = sec.kind === 'U' ? 0 : -sec.bg / 2, y1 = sec.kind === 'U' ? sec.b : sec.bg / 2, y0d = sec.kind === 'U' ? 0 : -sec.bd / 2, y1d = sec.kind === 'U' ? sec.b : sec.bd / 2;
      g += zone('fg', X(y0) - 3, X(y1) + 3, Y(sec.h) - 3, Y(sec.h - sec.tg) + 2, 'Pas górny – kliknij, aby zmienić wymiary');
      g += zone('fd', X(y0d) - 3, X(y1d) + 3, Y(sec.td) - 2, Y(0) + 3, 'Pas dolny – kliknij, aby zmienić wymiary');
      g += zone('w', X(sec.kind === 'U' ? 0 : -sec.tw / 2) - 6, X(sec.kind === 'U' ? sec.tw : sec.tw / 2) + 6, Y(sec.h - sec.tg) + 2, Y(sec.td) - 2, 'Środnik – kliknij, aby zmienić wymiary');
    } else g += zone('all', X(sec.ymin) - 3, X(sec.ymax) + 3, Y(sec.h) - 3, Y(0) + 3, 'Przekrój – kliknij, aby zmienić');
  }
  // wykres naprężeń sprężystych
  if (o.sigma) {
    const { M, N } = o.sigma, fy = o.fy || 355, x0 = X(sec.ymax) + 50, wS = 110;
    const sig = (z) => -(N || 0) / sec.A + M * (z - sec.zc) / sec.Iy;        // ściskanie + (M > 0 ściska górę)
    const sT = sig(sec.h), sB = sig(0), sm = Math.max(Math.abs(sT), Math.abs(sB), fy * 0.05);
    const k = (wS / 2) / Math.max(sm, fy);
    const xm = x0 + wS / 2;
    g += `<line x1="${xm}" y1="${Y(sec.h) - 4}" x2="${xm}" y2="${Y(0) + 4}" stroke="#39414f" stroke-width="0.8"/>`;
    g += `<polygon points="${xm},${Y(sec.h)} ${xm + sT * k},${Y(sec.h)} ${xm + sB * k},${Y(0)} ${xm},${Y(0)}" fill="#c0262d" fill-opacity="0.15" stroke="#c0262d"/>`;
    [fy, -fy].forEach(f => { g += `<line x1="${xm + f * k}" y1="${Y(sec.h) - 4}" x2="${xm + f * k}" y2="${Y(0) + 4}" stroke="#a35d00" stroke-dasharray="3 3" stroke-width="0.8"/>`; });
    g += tx(xm + sT * k, Y(sec.h) - 6, fmt(sT, 0), { fs: 9.5, c: '#c0262d' }) + tx(xm + sB * k, Y(0) + 13, fmt(sB, 0), { fs: 9.5, c: '#c0262d' }) + tx(xm, Y(sec.h) - 18, 'σ [MPa] (+ ściskanie)', { fs: 9.5, c: '#4a5466' });
  }
  return svgOpen(W, H, `class="secsvg${o.zones ? ' secedit' : ''}"`) + g + '</svg>';
};
const P0rects = (sec) => BS.P.rects(sec);

/* ------------------------------------------------------------ wykres liniowy z kursorem (jak BelkaŻB) */
let chartSeq = 0;
D.CHARTS = {};
D.niceTicks = function (a, b, n) {
  const span = b - a; if (!(span > 0)) return [a];
  const st0 = span / n, p = Math.pow(10, Math.floor(Math.log10(st0))), r = st0 / p;
  const st = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
};
D.lineChart = function (o) {
  const W = o.W || 820, narrow = W < 640, H = (o.H || 230) + 14, ml = narrow ? 46 : 62, mr = narrow ? 86 : 130, mt = narrow ? 52 : 40, mb = 34;
  const xs = o.series.flatMap(s => s.x), ys = o.series.flatMap(s => s.y).concat((o.hl || []).map(h => h.y), (o.hseg || []).map(h => h.y)).concat([0]);
  const xmin = o.xmin !== undefined ? o.xmin : Math.min(...xs), xmax = o.xmax !== undefined ? o.xmax : Math.max(...xs);
  let ymin = Math.min(...ys.filter(isFinite)), ymax = Math.max(...ys.filter(isFinite));
  if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
  const pad = (ymax - ymin) * 0.1; ymin -= pad; ymax += pad;
  const inv = !!o.invert;
  const X = x => ml + (x - xmin) / (xmax - xmin) * (W - ml - mr);
  const Y = y => inv ? mt + (y - ymin) / (ymax - ymin) * (H - mt - mb) : H - mb - (y - ymin) / (ymax - ymin) * (H - mt - mb);
  const cid = 'c' + (++chartSeq);
  D.CHARTS[cid] = { ml, mr, W, H, mt, mb, xmin, xmax, ymin, ymax, inv, series: o.series, unit: o.unit || '', dp: o.dp !== undefined ? o.dp : 1, name: o.short || '', yl: o.yl || '', title: o.title || '', kind: o.kind || '' };
  let s = svgOpen(W, H, `class="lchart" data-cid="${cid}"`);
  s += tx(narrow ? 4 : ml, 14, esc(o.title || ''), { a: 'start', fs: narrow ? 11 : 12, w: 650 });
  const ticks = D.niceTicks(ymin, ymax, 6);
  ticks.forEach(t => { s += `<line x1="${ml}" y1="${Y(t)}" x2="${W - mr}" y2="${Y(t)}" stroke="#eef0f3"/>` + tx(ml - 6, Y(t) + 3.5, fmt(t, Math.abs((ticks[1] || 1) - (ticks[0] || 0)) < 1 ? 1 : 0), { a: 'end', fs: 10, c: '#7a8494' }); });
  const xt = D.niceTicks(xmin, xmax, narrow ? 5 : 10);
  xt.forEach(t => { if (t < xmin - 1e-9 || t > xmax + 1e-9) return; s += `<line x1="${X(t)}" y1="${mt}" x2="${X(t)}" y2="${H - mb}" stroke="#f3f4f6"/>` + tx(X(t), H - mb + 14, fmt(t, (xt[1] - xt[0]) < 1 ? 1 : 0), { fs: 10, c: '#7a8494' }); });
  s += tx((ml + W - mr) / 2, H - 4, o.xl || 'x [m]', { fs: 10.5, c: '#4a5466' });
  s += tx(14, (mt + H - mb) / 2, esc(o.yl || ''), { fs: 10.5, c: '#4a5466', rot: -90 });
  (o.vl || []).forEach(v => { s += `<line x1="${X(v.x)}" y1="${mt}" x2="${X(v.x)}" y2="${H - mb}" stroke="#9aa3b0" stroke-width="0.8" stroke-dasharray="4 3"/>` + (v.l ? tx(X(v.x), mt - 3, esc(v.l), { fs: 9.5, c: '#5b6576', w: 600 }) : ''); });
  s += `<line x1="${ml}" y1="${Y(0)}" x2="${W - mr}" y2="${Y(0)}" stroke="#39414f" stroke-width="1"/>`;
  (o.hseg || []).forEach(h => { const a = X(Math.max(xmin, h.x0)), b = X(Math.min(xmax, h.x1)); s += `<line x1="${a}" y1="${Y(h.y)}" x2="${b}" y2="${Y(h.y)}" stroke="${h.c}" stroke-width="1.2" stroke-dasharray="6 4"/>` + (h.l && b - a > h.l.length * 5.4 + 6 ? tx(a + 3, Y(h.y) + ((inv ? h.y < 0 : h.y > 0) ? -3 : 11), esc(h.l), { a: 'start', fs: 9.5, c: h.c }) : ''); });
  o.series.forEach(se => {
    const pts = se.x.map((x, i) => `${X(x).toFixed(1)},${Y(se.y[i]).toFixed(1)}`).join(' ');
    if (se.fill) s += `<polygon points="${X(se.x[0]).toFixed(1)},${Y(0).toFixed(1)} ${pts} ${X(se.x[se.x.length - 1]).toFixed(1)},${Y(0).toFixed(1)}" fill="${se.fill}"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.c}" stroke-width="${se.w || 1.6}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>`;
  });
  (o.hl || []).forEach(h => { s += `<line x1="${ml}" y1="${Y(h.y)}" x2="${W - mr}" y2="${Y(h.y)}" stroke="${h.c}" stroke-width="1.2" stroke-dasharray="6 4"/>` + (h.l ? tx(W - mr + 4, Y(h.y) + 3.5, esc(h.l), { a: 'start', fs: 10, c: h.c }) : ''); });
  // ekstrema (znaczniki)
  (o.marks || []).forEach(mk => { const px = X(mk.x), py = Y(mk.y), below = inv ? mk.y >= 0 : mk.y < 0; s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${mk.c}"/>` + (mk.l ? tx(Math.max(ml + 10, Math.min(W - mr - 10, px)), py + (below ? 14 : -7), mk.l, { fs: 10, c: mk.c, w: 650 }) : ''); });
  // legenda
  let lx = W - mr; o.series.filter(se => se.l).reverse().forEach(se => { const tw = se.l.length * 5.6 + 30; lx -= tw; s += `<line x1="${lx}" y1="26" x2="${lx + 18}" y2="26" stroke="${se.c}" stroke-width="2" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>` + tx(lx + 22, 29.5, esc(se.l), { a: 'start', fs: 10 }); });
  s += `<g class="cur" style="display:none;pointer-events:none"><line class="curl" x1="0" y1="${mt}" x2="0" y2="${H - mb}" stroke="#1d5bb8" stroke-width="1" stroke-dasharray="3 2"/><g class="curd"></g><rect class="curbg" x="0" y="${mt - 2}" width="10" height="16" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="#c9ced6"/><text class="curtx" x="0" y="${mt + 10}" font-size="10.5" fill="#1b2230"></text></g>`;
  return s + '</svg>';
};
D.serAt = function (se, x) {
  const xs = se.x, ys = se.y; let best = null;
  for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] - 1e-9 && x <= xs[i + 1] + 1e-9 && xs[i + 1] > xs[i]) { best = ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]); break; }
  if (best === null) { let bi = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[bi] - x)) bi = i; }); best = ys[bi]; }
  return best;
};

/* ------------------------------------------------------------ reakcje (strzałki) */
D.reactions = function (S, R, s, W) {
  const md = R.md, ev = R.env[s]; W = W || 820;
  const ml = 62, mr = 130, L = md.L, X = (x) => ml + (W - ml - mr) * x / L, yB = 50, H = 160;
  let g = `<line x1="${X(0)}" y1="${yB}" x2="${X(L)}" y2="${yB}" stroke="#1b2230" stroke-width="3"/>`;
  md.systems[s].forEach(p => {
    const x = X(p.x), r = ev.R[p.id] || {};
    g += supportSym(p, x, yB);
    g += arrowD(x, yB + 70, yB + 26, '#c0262d', 6, 1.8);
    const a = p.x < L * 0.1 ? 'start' : p.x > L * 0.9 ? 'end' : 'middle', xt = a === 'start' ? x - 6 : a === 'end' ? x + 6 : x;
    g += tx(xt, yB + 84, `${p.id}: R_Ed,max = ${fmt((r.max || 0) / 1e3, 1)} kN`.replace(/_Ed,max/, '<tspan font-size="8" dy="2">Ed,max</tspan><tspan dy="-2"></tspan>'), { a, fs: 10, c: '#c0262d', w: 650 });
    g += tx(xt, yB + 97, `R_Ed,min = ${fmt((r.min || 0) / 1e3, 1)} kN`.replace(/_Ed,min/, '<tspan font-size="8" dy="2">Ed,min</tspan><tspan dy="-2"></tspan>'), { a, fs: 9.5, c: '#4a5466' });
    const eq = (R.equ || []).find(z => z.id === p.id && z.etap === s);
    if (eq && eq.Rmin < 0) g += tx(xt, yB + 110, `EQU: ${fmt(eq.Rmin / 1e3, 1)} kN – odrywanie`, { a, fs: 9.5, c: '#a35d00', w: 600 });
    if (r.Mmax > 1e3) g += tx(xt, yB - 22, `|M| = ${fmt(r.Mmax / 1e6, 1)} kNm`, { a, fs: 9.5, c: '#4a5466' });
  });
  return svgOpen(W, H) + g + '</svg>';
};

/* ------------------------------------------------------------ postać zwichrzenia */
D.mode = function (mode, L, sup, o) {
  o = o || {};
  if (!mode) return '<p class="hint">Brak postaci własnej (α<sub>cr</sub> = ∞).</p>';
  let um = 1e-30, pm = 1e-30;
  mode.u.forEach(v => { um = Math.max(um, Math.abs(v)); }); mode.phi.forEach(v => { pm = Math.max(pm, Math.abs(v)); });
  const sg = Math.abs(Math.min(...mode.u)) > Math.max(...mode.u) ? -1 : 1;
  const xm = mode.xs.map(x => x / 1000);
  return D.lineChart({ W: o.width || 820, H: o.height || 170, title: o.title || 'Postać zwichrzenia (znormalizowana)', yl: 'u, φ [–]', dp: 2, kind: 'mode',
    vl: (sup || []).map(x => ({ x: x / 1000 })),
    series: [{ x: xm, y: mode.u.map(v => sg * v / um), c: '#1d5bb8', l: 'u – przemieszczenie boczne' }, { x: xm, y: mode.phi.map(v => sg * v / pm), c: '#c0262d', dash: '5 3', l: 'φ – skręcenie' }] });
};

/* ------------------------------------------------------------ pożar: θ(t) */
D.fire = function (fr, o) {
  o = o || {};
  const t = fr.hist.map(r => r[0]);
  return D.lineChart({ W: o.width || 640, H: o.height || 230, title: 'Temperatura gazów (ISO 834) i stali θa(t)', yl: 'θ [°C]', xl: 't [min]', dp: 0, kind: 'fire', xmin: 0,
    hl: [{ y: fr.thcr, c: '#a35d00', l: `θa,cr = ${fmt(fr.thcr, 0)} °C` }], vl: [{ x: fr.Rreq, l: 'R' + fr.Rreq }],
    series: [{ x: t, y: fr.hist.map(r => r[2]), c: '#c0262d', dash: '5 3', l: 'gazy ISO 834' }, { x: t, y: fr.hist.map(r => r[1]), c: '#1d5bb8', l: 'stal θa' }] });
};

/* ------------------------------------------------------------ szkic węzła (okna i raport) */
D.joint = function (sec, w, o) {
  o = o || {};
  const W = o.W || 320, H = o.H || 250, sc = Math.min(170 / Math.max(sec.h, 1), 1.2), cx = 130, cy = H / 2;
  const hh = sec.h * sc, yt = cy - hh / 2;
  let g = '';
  const beam = () => {
    let b = '';
    if (sec.kind === 'RHS') b += `<rect x="${cx}" y="${yt}" width="${W - cx}" height="${hh}" fill="#c9d4e6" stroke="#1b2230"/>`;
    else { b += `<rect x="${cx}" y="${yt}" width="${W - cx}" height="${sec.tg * sc}" fill="#c9d4e6" stroke="#1b2230"/><rect x="${cx}" y="${yt + hh - sec.td * sc}" width="${W - cx}" height="${sec.td * sc}" fill="#c9d4e6" stroke="#1b2230"/><rect x="${cx}" y="${yt + sec.tg * sc}" width="${W - cx}" height="${hh - (sec.tg + sec.td) * sc}" fill="#eef0f3" stroke="#9aa3b0" stroke-width="0.6"/>`; }
    return b;
  };
  if (w.typ === 'blacha_czolowa') {
    const hp = U.num(w.hp) * sc, tp = Math.max(3, U.num(w.tp) * sc), yp = cy - hp / 2, nr = Math.max(1, Math.round(U.num(w.nr))), e1 = U.num(w.e1) * sc, p1 = U.num(w.p1) * sc;
    g += `<rect x="${cx - tp - 34}" y="12" width="34" height="${H - 24}" fill="#eef0f3" stroke="#9aa3b0"/>` + tx(cx - tp - 17, H - 4, 'podpora', { fs: 9, c: '#7a8494' });
    g += beam() + `<rect x="${cx - tp}" y="${yp}" width="${tp}" height="${hp}" fill="#b5651d" fill-opacity="0.35" stroke="#b5651d"/>`;
    for (let i = 0; i < nr; i++) { const yy = yp + e1 + i * p1; g += `<rect x="${cx - tp - 14}" y="${yy - 3}" width="${tp + 28}" height="6" fill="#39414f"/>`; }
    g += dimV(cx - tp - 44, yp, yp + hp, `h_p = ${fmt(U.num(w.hp), 0)}`).replace('h_p', 'h<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"></tspan>');
    if (nr > 1) g += dimV(cx + 28, yp + e1, yp + e1 + p1, `p₁ = ${fmt(U.num(w.p1), 0)}`, { right: true });
    g += dimV(cx + 28, yp, yp + e1, `e₁ = ${fmt(U.num(w.e1), 0)}`, { right: true });
    g += tx(cx - tp / 2, yp - 6, `t_p = ${fmt(U.num(w.tp), 0)}`.replace('t_p', 't<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"></tspan>'), { fs: 10, c: '#b5651d' });
    g += tx(cx + 70, H - 8, `2×${nr} ${esc(w.d)} kl. ${esc(w.kl)} · a = ${fmt(U.num(w.a), 0)} mm`, { fs: 10, c: '#3d4656' });
  } else if (w.typ === 'blacha_zebrowa') {
    const hp = U.num(w.hp) * sc, tpw = (U.num(w.z) + U.num(w.e2)) * sc, yp = cy - hp / 2, n = Math.max(1, Math.round(U.num(w.n))), e1 = U.num(w.e1) * sc, p1 = U.num(w.p1) * sc, z = U.num(w.z) * sc;
    g += `<rect x="${cx - 40}" y="12" width="34" height="${H - 24}" fill="#eef0f3" stroke="#9aa3b0"/>` + tx(cx - 23, H - 4, 'podpora', { fs: 9, c: '#7a8494' });
    g += beam().replace(`x="${cx}"`, `x="${cx + 10}"`);
    g += `<rect x="${cx - 6}" y="${yp}" width="${tpw + 6}" height="${hp}" fill="#b5651d" fill-opacity="0.3" stroke="#b5651d"/>`;
    for (let i = 0; i < n; i++) g += `<circle cx="${cx - 6 + z}" cy="${yp + e1 + i * p1}" r="${Math.max(3, M0d(w.d) * sc / 2)}" fill="#39414f"/>`;
    g += dimH(cx - 6, cx - 6 + z, yp - 8, `z = ${fmt(U.num(w.z), 0)}`);
    g += dimV(cx - 18, yp, yp + hp, `h_p = ${fmt(U.num(w.hp), 0)}`).replace('h_p', 'h<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"></tspan>');
    g += tx(cx + 90, H - 8, `${n} × ${esc(w.d)} kl. ${esc(w.kl)} · t_p = ${fmt(U.num(w.tp), 0)} · a = ${fmt(U.num(w.a), 0)}`.replace('t_p', 'tp'), { fs: 10, c: '#3d4656' });
  } else {
    // oparcie / docisk do stali
    const tp = w.typ === 'oparcie' && w.podloze !== 'stal' ? Math.max(3, U.num(w.tp) * sc) : 0, lp = U.num(w.lp || 150) * sc;
    const yb = yt + hh;
    g += beam().replace(new RegExp(`x="${cx}"`, 'g'), `x="${cx - 60}"`).replace(new RegExp(`width="${W - cx}"`, 'g'), `width="${W - cx + 60}"`);
    if (tp) g += `<rect x="${cx - 60}" y="${yb}" width="${lp}" height="${tp}" fill="#b5651d" fill-opacity="0.35" stroke="#b5651d"/>` + tx(cx - 60 + lp / 2, yb + tp + 11, `płyta ${fmt(U.num(w.bp), 0)}×${fmt(U.num(w.lp), 0)}×${fmt(U.num(w.tp), 0)}`, { fs: 9.5, c: '#b5651d' });
    const ws = w.podloze === 'mur' ? 'mur' : w.podloze === 'beton' ? 'beton' : 'element stalowy';
    g += `<rect x="${cx - 80}" y="${yb + tp}" width="${lp + 40}" height="${H - (yb + tp) - 6}" fill="#eef0f3" stroke="#9aa3b0"/>` + tx(cx - 60 + lp / 2, H - 10, w.typ === 'oparcie' ? ws : 'oparcie na stali', { fs: 9.5, c: '#7a8494' });
    if (w.zebro) { const ts = Math.max(3, U.num(w.ts) * sc); g += `<rect x="${cx - 60 + lp / 2 - ts / 2}" y="${yt + sec.tg * sc}" width="${ts}" height="${hh - (sec.tg + sec.td) * sc}" fill="#b5651d" fill-opacity="0.4" stroke="#b5651d"/>` + tx(cx - 60 + lp / 2 + 8, cy, `żebra 2×${fmt(U.num(w.bs), 0)}×${fmt(U.num(w.ts), 0)}`, { a: 'start', fs: 9.5, c: '#b5651d' }); }
  }
  return svgOpen(W, H, 'class="jointsvg"') + g + '</svg>';
};
const M0d = (d) => (BS.M.SRUBY[d] || { d: 16 }).d;

/* ------------------------------------------------------------ szczegół żebra: przekrój z żebrami + szczegół A wcięcia narożnego 45° */
// o: { bs, ts, c, strona ('obie' | 'jedna'), a (spoina pas–środnik – blachownice), tytul, stack (szczegół pod przekrojem – wąskie okna) }
let stfSeq = 0;
D.stiffDetail = function (sec, o) {
  o = o || {};
  if (!(sec.kind === 'I' || sec.kind === 'U')) return '';
  const bs = +o.bs || 80, c = Math.max(0, +o.c || 0), h = sec.h, tw = sec.tw, tg = sec.tg, td = sec.td;
  const yw0 = sec.kind === 'U' ? 0 : -tw / 2, yw1 = yw0 + tw, z1 = h - tg, z0 = td;
  const sides = sec.kind === 'U' ? [1] : o.strona === 'jedna' ? [1] : [1, -1];
  const plate = (s, cc) => { const yi = s > 0 ? yw1 : yw0, yo = yi + s * bs; return cc > 0 ? [[yi, z0 + cc], [yi + s * cc, z0], [yo, z0], [yo, z1], [yi + s * cc, z1], [yi, z1 - cc]] : [[yi, z0], [yo, z0], [yo, z1], [yi, z1]]; };
  const SP = '#e6a35a', SPS = '#b5651d', WELD = '#c0262d';
  // --- widok ogólny (przekrój poprzeczny w miejscu żebra)
  const yLo = Math.min(sec.ymin, ...sides.map(s => (s > 0 ? yw1 + bs : yw0 - bs))), yHi = Math.max(sec.ymax, ...sides.map(s => (s > 0 ? yw1 + bs : yw0 - bs)));
  const HV = 200, sc = HV / Math.max(h, (yHi - yLo) * 1.1), padT = 26, padL = 34;
  const W1 = Math.max(130, (yHi - yLo) * sc + 2 * padL), F = 180, Wt = o.stack ? Math.max(W1, F + 118) : W1 + 26 + F + 110;
  const cxO = o.stack ? Wt / 2 : W1 / 2;
  const X = (y) => cxO + (y - (yLo + yHi) / 2) * sc, Y = (z) => padT + (h - z) * sc;
  const pth = (pts, f) => pts.map((p, i) => (i ? 'L' : 'M') + f[0](p[0]).toFixed(1) + ' ' + f[1](p[1]).toFixed(1)).join(' ') + ' Z';
  let g = tx(cxO, 14, 'Przekrój w miejscu żebra', { fs: 10.5, w: 600, c: '#3d4656' });
  g += `<path d="${sec.rings.map(r => pth(r, [X, Y])).join(' ')}" fill="#c9d4e6" fill-rule="evenodd" stroke="#1b2230" stroke-width="1"/>`;
  sides.forEach(s => { g += `<path d="${pth(plate(s, c), [X, Y])}" fill="${SP}" fill-opacity="0.75" stroke="${SPS}" stroke-width="1"/>`; });
  g += dimV(X(yLo) - 12, Y(z0), Y(z1), `h_w = ${fmt(z1 - z0, 0)}`.replace('h_w', 'h<tspan font-size="8" dy="2">w</tspan><tspan dy="-2"></tspan>'));
  const yb0 = yw1, yb1 = yw1 + bs;
  g += dimH(X(yb0), X(yb1), Y(0) + 14, `b<tspan font-size="8" dy="2">s</tspan><tspan dy="-2"> = ${fmt(bs, 0)}</tspan>`, { below: true });
  // znacznik szczegółu A
  const ax = X(yw1 + Math.max(c, 6) * 0.5), ay = Y(z1 - Math.max(c, 6) * 0.5), ar = Math.max(9, Math.min(18, 2.2 * Math.max(c, 10) * sc));
  g += `<circle cx="${ax}" cy="${ay}" r="${ar}" fill="none" stroke="#1d5bb8" stroke-width="1" stroke-dasharray="3 2"/>` + tx(ax + ar * 0.75 + 3, ay - ar * 0.75 - 2, 'A', { a: 'start', fs: 11, w: 700, c: '#1d5bb8' });
  // --- szczegół A (powiększenie naroża żebro–pas–środnik)
  const rr = sec.typ === 'spaw' ? 0 : (+sec.r || 0), zl = sec.typ === 'spaw' ? Math.SQRT2 * (+o.a || +sec.aw || 0) : 0;
  const span = Math.max(3.4 * Math.max(c, 8), 2.6 * rr + 10, 50), k = F / span;
  const x0 = o.stack ? 8 : W1 + 26, y0 = o.stack ? padT + h * sc + 62 : padT, yA = yw1 - 0.22 * span, zA = z1 + Math.min(tg, 0.2 * span) + 0.06 * span;
  const XA = (y) => x0 + (y - yA) * k, YA = (z) => y0 + (zA - z) * k;
  let d = '';
  d += `<rect x="${XA(yA - span)}" y="${YA(h)}" width="${3 * span * k}" height="${tg * k}" fill="#c9d4e6" stroke="#1b2230" stroke-width="1"/>`;
  d += `<rect x="${XA(yw0)}" y="${YA(z1)}" width="${tw * k}" height="${(z1 - z0) * k}" fill="#c9d4e6" stroke="#1b2230" stroke-width="1"/>`;
  if (rr > 0) { const pts = [[yw1, z1]]; for (let i = 0; i <= 12; i++) { const t = Math.PI / 2 + (Math.PI / 2) * i / 12; pts.push([yw1 + rr + rr * Math.cos(t), z1 - rr + rr * Math.sin(t)]); } d += `<path d="${pth(pts, [XA, YA])}" fill="#c9d4e6" stroke="#1b2230" stroke-width="1"/>`; }
  if (zl > 0) d += `<path d="${pth([[yw1, z1], [yw1 + zl, z1], [yw1, z1 - zl]], [XA, YA])}" fill="${WELD}" fill-opacity="0.55" stroke="${WELD}" stroke-width="0.8"/>`;
  d += `<path d="${pth(plate(1, c), [XA, YA])}" fill="${SP}" fill-opacity="0.75" stroke="${SPS}" stroke-width="1.2"/>`;
  // spoiny żebra (od strony widoku): ze środnikiem poniżej wcięcia, z pasem poza wcięciem
  d += `<line x1="${XA(yw1) + 2}" y1="${YA(z1 - c) + 2}" x2="${XA(yw1) + 2}" y2="${YA(z1 - span)}" stroke="${WELD}" stroke-width="3"/>`;
  d += `<line x1="${XA(yw1 + c) + 2}" y1="${YA(z1) + 2}" x2="${XA(yw1 + span)}" y2="${YA(z1) + 2}" stroke="${WELD}" stroke-width="3"/>`;
  if (c > 0) {
    // wymiary wcięcia c × c i kąt 45°
    d += dimH(XA(yw1), XA(yw1 + c), YA(z1 - c) + 16, `c = ${fmt(c, 0)}`, { below: true, fs: 10 });
    d += dimV(XA(yw1 + c) + 14 + 0.0, YA(z1 - c), YA(z1), `${fmt(c, 0)}`, { right: true, fs: 10 });
    d += tx(XA(yw1 + 0.5 * c) + 8, YA(z1 - 0.5 * c) + 4, '45°', { a: 'start', fs: 10, w: 600, c: SPS });
    // strzałka odpływu cynku przez wcięcie
    const mx = XA(yw1 + 0.32 * c), my = YA(z1 - 0.32 * c);
    d += `<path d="M ${mx + 26} ${my - 26} L ${mx + 3} ${my - 3}" stroke="#1d5bb8" stroke-width="1.3" fill="none"/><path d="M ${mx + 3} ${my - 3} l 7 -1.5 l -5.5 -5.5 z" fill="#1d5bb8"/>`;
  }
  const clip = `stfA${++stfSeq}`;
  g += `<defs><clipPath id="${clip}"><rect x="${x0}" y="${y0}" width="${F}" height="${F}"/></clipPath></defs><g clip-path="url(#${clip})">${d}</g><rect x="${x0}" y="${y0}" width="${F}" height="${F}" fill="none" stroke="#1d5bb8" stroke-width="1" stroke-dasharray="4 2"/>`;
  g += tx(x0 + F / 2, y0 - 10, 'Szczegół A – wcięcie narożne', { fs: 10.5, w: 600, c: '#1d5bb8' });
  const sb = (t) => `<tspan font-size="8" dy="2">${t}</tspan><tspan dy="-2"></tspan>`;
  const notes = (c > 0
    ? [[`wcięcie 45° c × c = ${fmt(c, 0)} × ${fmt(c, 0)} mm (oba naroża przy pasach)`], ['odpływ cynku i odpowietrzenie przy cynkowaniu', 1], ['zanurzeniowym (PN-EN ISO 14713-2)', 1], [rr > 0 ? `omija promień wyokrąglenia r = ${fmt(rr, 0)} mm` : zl > 0 ? `omija spoinę pas–środnik (√2·a = ${fmt(zl, 1)} mm)` : ''], [`spoina żebro–środnik l = h${sb('w')} − 2c = ${fmt(z1 - z0 - 2 * c, 0)} mm`], [`docisk do pasa na szerokości b${sb('s')} − c = ${fmt(bs - c, 0)} mm`]]
    : [['żebro bez wcięć narożnych – dopasowane do promienia / spoiny'], ['przy cynkowaniu zanurzeniowym wymagane wcięcia', 1], ['lub otwory odpływowe (PN-EN ISO 14713-2)', 1]]).filter(q => q[0]);
  const yN = y0 + F + 16;
  notes.forEach((q, i) => { g += tx(x0, yN + i * 13, q[0], { a: 'start', fs: 9.5, c: q[1] ? '#1d5bb8' : '#3d4656' }); });
  const W = Wt, H = Math.max(padT + h * sc + 34, yN + notes.length * 13 + 4);
  return svgOpen(W, H, `class="stfsvg"${o.tytul ? ` aria-label="${esc(o.tytul)}"` : ''}`) + g + '</svg>';
};

/* ------------------------------------------------------------ płyta podporowa z kotwami: rzut z góry i przekrój A–A */
// w – węzeł oparcia; ko – wynik BS.KT.design (geometria, długość kotwy); o: { W }
D.anchorViews = function (sec, w, ko, o) {
  o = o || {};
  if (!ko || !ko.geom) return { plan: '', sect: '' };
  const g = ko.geom, k = g.k, d = g.d, H = g.H, L = ko.len, tg = Math.max(0, U.num(k.tg, 0)), hef = ko.hef;
  const bf = sec.bd || sec.b || 100, td = sec.td || sec.t || 10, tw = sec.tw || sec.t || 6, lb = Math.min(U.num(w.lb, g.lp) || g.lp, g.lp);
  const C = { conc: '#e4e6ea', concS: '#8a93a3', pl: '#e6a35a', plS: '#b5651d', beam: '#c9d4e6', beamS: '#1b2230', weld: '#c0262d', bolt: '#39414f', grout: '#cfc8bb', resin: '#c9a227', dim: '#3d4656' };
  const Wd = o.W || 380;
  // ---------------------------------------------------- rzut z góry (x – wzdłuż belki, w prawo ku przęsłu; y – w poprzek)
  const bcK = g.bc > 0 ? g.bc : g.lp + 160, xC0 = g.bc > 0 ? -(g.bc / 2 + g.ec) : -(g.lp / 2 + 80), xC1 = xC0 + bcK;
  const yHalf = g.lc > 0 ? g.lc / 2 : g.bp / 2 + 70;
  const xEnd = g.lp / 2 - lb;                                    // czoło belki (oparcie na długości l_b od strony przęsła)
  const xR = Math.max(xC1, g.lp / 2) + 90;                       // belka wychodzi poza podporę ku przęsłu
  const xL = Math.min(xC0, -g.lp / 2) - 10;
  const spanX = xR - xL, spanY = 2 * yHalf + 20;
  const kP = Math.min((Wd - 90) / spanX, 230 / spanY);
  const topPad = g.bc > 0 ? 66 : 30, ox = 62 - xL * kP, oy = topPad + (yHalf + 10) * kP;
  const X = (x) => ox + x * kP, Y = (y) => oy - y * kP;
  let p = '';
  p += tx(Wd / 2, 14, 'Rzut z góry – płyta i kotwy', { fs: 10.5, w: 600, c: C.dim });
  // podpora betonowa
  p += `<rect x="${X(xC0)}" y="${Y(yHalf)}" width="${bcK * kP}" height="${2 * yHalf * kP}" fill="${C.conc}" stroke="${C.concS}" stroke-width="1" ${g.lc > 0 ? '' : 'stroke-dasharray="5 3"'}/>`;
  if (!(g.lc > 0)) p += tx(X(xC0) + 4, Y(-yHalf) - 4, 'ściana (ciągła)', { a: 'start', fs: 9, c: '#7a8494' });
  // płyta
  p += `<rect x="${X(-g.lp / 2)}" y="${Y(g.bp / 2)}" width="${g.lp * kP}" height="${g.bp * kP}" fill="${C.pl}" fill-opacity="0.55" stroke="${C.plS}" stroke-width="1.2"/>`;
  // pas dolny belki (nad płytą) i środnik
  p += `<rect x="${X(xEnd)}" y="${Y(bf / 2)}" width="${(xR - xEnd) * kP}" height="${bf * kP}" fill="${C.beam}" fill-opacity="0.75" stroke="${C.beamS}" stroke-width="1"/>`;
  p += `<line x1="${X(xEnd)}" y1="${Y(0)}" x2="${X(xR)}" y2="${Y(0)}" stroke="${C.beamS}" stroke-width="0.8" stroke-dasharray="8 3 2 3"/>`;
  // spoiny pasa z blachą
  if (U.num(w.aw, 0) > 0) [1, -1].forEach(s => { p += `<line x1="${X(xEnd)}" y1="${Y(s * bf / 2) + s * 1.8}" x2="${X(g.lp / 2)}" y2="${Y(s * bf / 2) + s * 1.8}" stroke="${C.weld}" stroke-width="2.6"/>`; });
  // kotwy (podkładka, pręt, otwór owalny)
  g.xs.forEach(x => g.ys.forEach(y => {
    if (g.slot) p += `<rect x="${X(x) - (g.df / 2 + 15) * kP}" y="${Y(y) - g.df / 2 * kP}" width="${(g.df + 30) * kP}" height="${g.df * kP}" rx="${g.df / 2 * kP}" fill="#ffffff" stroke="${C.plS}"/>`;
    p += `<circle cx="${X(x)}" cy="${Y(y)}" r="${H.dw / 2 * kP}" fill="#ffffff" fill-opacity="0.7" stroke="${C.bolt}" stroke-width="0.8"/><circle cx="${X(x)}" cy="${Y(y)}" r="${Math.max(2, d / 2 * kP)}" fill="${C.bolt}"/>`;
  }));
  // wymiary
  const yTop = Y(Math.max(yHalf, g.bp / 2)) - 10;
  p += Q.dimV(X(xL) - 26, Y(g.bp / 2), Y(-g.bp / 2), `b<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"> = ${fmt(g.bp, 0)}</tspan>`);
  p += Q.dimV(X(-g.lp / 2) - 10, Y(g.sB / 2), Y(-g.sB / 2), `${fmt(g.sB, 0)}`, { right: false });
  p += Q.dimH(X(-g.lp / 2), X(g.lp / 2), Y(-Math.max(yHalf, g.bp / 2)) + 14, `l<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"> = ${fmt(g.lp, 0)}</tspan>`, { below: true });
  if (g.nL > 1) p += Q.dimH(X(g.xs[0]), X(g.xs[1]), Y(-g.sB / 2) + 16, `s<tspan font-size="8" dy="2">L</tspan><tspan dy="-2"> = ${fmt(g.sL, 0)}</tspan>`, { below: true, fs: 9.5 });
  if (g.bc > 0) {
    p += Q.dimH(X(xC0), X(xC1), yTop - 14, `b<tspan font-size="8" dy="2">c</tspan><tspan dy="-2"> = ${fmt(g.bc, 0)}</tspan>`);
    p += Q.dimH(X(xC0), X(g.xs[0]), yTop, `${fmt(g.cxZ, 0)}`, { fs: 9.5 }) + Q.dimH(X(g.xs[g.xs.length - 1]), X(xC1), yTop, `${fmt(g.cxP, 0)}`, { fs: 9.5 });
  }
  p += tx(X(xR) - 2, Y(bf / 2) - 4, 'belka →', { a: 'end', fs: 9, c: '#4a5466' });
  // linia przekroju A–A (w poprzek belki, przez pierwszy rząd kotew)
  { const xa = X(g.xs[0]), ya = Y(Math.max(yHalf, g.bp / 2)) - 2, yb = Y(-Math.max(yHalf, g.bp / 2)) + 2; p += `<line x1="${xa}" y1="${ya}" x2="${xa}" y2="${yb}" stroke="#1d5bb8" stroke-width="0.9" stroke-dasharray="10 3 2 3"/>` + [[ya, -1], [yb, 1]].map(([yy, sg]) => `<path d="M ${xa} ${yy} l -9 0" stroke="#1d5bb8" stroke-width="1.6"/><path d="M ${xa - 9} ${yy} l 4 -3 l 0 6 z" fill="#1d5bb8"/>` + tx(xa - 14, yy + 4 * (sg > 0 ? 1 : 0) + (sg > 0 ? 6 : -2), 'A', { a: 'end', fs: 10, w: 700, c: '#1d5bb8' })).join(''); }
  const Hp = oy + (yHalf + 10) * kP + 26;
  const plan = svgOpen(Wd, Hp, 'class="anchsvg"') + p + '</svg>';

  // ---------------------------------------------------- przekrój A–A (w poprzek belki, przez kotwy)
  const top = tg + g.tp + H.tw + H.m + 2 * H.P, ztop = tg + g.tp + td + Math.max(60, 0.25 * (sec.h || 300));
  const zbot = -(Math.min(g.hc < 5e4 ? g.hc : hef + 150, Math.max(hef + (k.typ === 'wbetonowane' ? (L.tAP || 10) + H.m + 40 : 60), hef + 40)));
  const yW = (g.lc > 0 ? g.lc / 2 : g.bp / 2 + 80);
  const kS = Math.min((Wd - 130) / (2 * yW), 300 / (Math.max(ztop, top) - zbot));
  const ox2 = 30 + yW * kS, oz = 34 + Math.max(ztop, top) * kS;
  const XS = (y) => ox2 + y * kS, ZS = (z) => oz - z * kS;
  let s = tx(Wd / 2, 14, 'Przekrój A–A – kotwa w betonie', { fs: 10.5, w: 600, c: C.dim });
  // beton
  s += `<rect x="${XS(-yW)}" y="${ZS(0)}" width="${2 * yW * kS}" height="${-zbot * kS}" fill="${C.conc}" stroke="${C.concS}"/>`;
  for (let i = 0; i < 2 * yW * kS / 14; i++) { const x0 = XS(-yW) + i * 14; s += `<line x1="${x0}" y1="${ZS(0) + 3}" x2="${x0 + 6}" y2="${ZS(0) + 9}" stroke="#b7bdc8" stroke-width="0.6"/>`; }
  if (!(g.hc < 5e4) || g.hc > -zbot + 1) s += `<path d="M ${XS(-yW)} ${ZS(zbot)} l 20 -5 l 10 10 l 20 -5" fill="none" stroke="${C.concS}"/>`;
  // podlewka, płyta
  if (tg > 0) s += `<rect x="${XS(-g.bp / 2 - 8)}" y="${ZS(tg)}" width="${(g.bp + 16) * kS}" height="${tg * kS}" fill="${C.grout}" stroke="#9a907f" stroke-width="0.7"/>`;
  s += `<rect x="${XS(-g.bp / 2)}" y="${ZS(tg + g.tp)}" width="${g.bp * kS}" height="${g.tp * kS}" fill="${C.pl}" stroke="${C.plS}" stroke-width="1.1"/>`;
  // belka – pas dolny i środnik (urwany)
  const zb = tg + g.tp;
  s += `<rect x="${XS(-bf / 2)}" y="${ZS(zb + td)}" width="${bf * kS}" height="${td * kS}" fill="${C.beam}" stroke="${C.beamS}"/>`;
  s += `<rect x="${XS(-tw / 2)}" y="${ZS(ztop)}" width="${Math.max(1.5, tw * kS)}" height="${(ztop - zb - td) * kS}" fill="${C.beam}" stroke="${C.beamS}"/>`;
  s += `<path d="M ${XS(-tw / 2) - 8} ${ZS(ztop) + 3} l 6 -6 l 4 6 l 6 -6 l 6 6" fill="none" stroke="${C.beamS}" stroke-width="0.8"/>`;
  if (U.num(w.aw, 0) > 0) [1, -1].forEach(sg => { const a = U.num(w.aw) * kS; s += `<path d="M ${XS(sg * bf / 2)} ${ZS(zb)} l ${sg * a * 1.3} 0 l ${-sg * a * 1.3} ${-a * 1.3} z" fill="${C.weld}"/>`; });
  // kotwy
  g.ys.forEach((y, j) => {
    const xa = XS(y), dd = Math.max(2, d * kS);
    if (k.typ === 'wklejane') s += `<rect x="${xa - (L.dDrill || d + 4) / 2 * kS}" y="${ZS(0)}" width="${(L.dDrill || d + 4) * kS}" height="${hef * kS}" fill="${C.resin}" fill-opacity="0.75"/>`;
    const zBot = k.typ === 'wbetonowane' ? -(hef + (L.tAP || 10) + H.m) : k.typ === 'rozporowe' ? -(hef + 0.5 * d) : -hef;
    s += `<rect x="${xa - dd / 2}" y="${ZS(top)}" width="${dd}" height="${(top - zBot) * kS}" fill="${C.bolt}"/>`;
    for (let z = 0; z > zBot + 4; z -= Math.max(3, H.P * 2)) { /* gwint – kreski */ s += `<line x1="${xa - dd / 2}" y1="${ZS(z)}" x2="${xa + dd / 2}" y2="${ZS(z - 1)}" stroke="#6b7385" stroke-width="0.4"/>`; }
    if (k.typ === 'rozporowe') s += `<path d="M ${xa - dd / 2} ${ZS(-hef + 0.6 * d)} L ${xa - dd / 2 - 3} ${ZS(-hef)} L ${xa + dd / 2 + 3} ${ZS(-hef)} L ${xa + dd / 2} ${ZS(-hef + 0.6 * d)} Z" fill="#8a93a3"/>`;
    if (k.typ === 'wbetonowane') { const dh = (ko.T && ko.T.dh) || 3 * d; s += `<rect x="${xa - dh / 2 * kS}" y="${ZS(-hef)}" width="${dh * kS}" height="${(L.tAP || 10) * kS}" fill="${C.pl}" stroke="${C.plS}"/><rect x="${xa - 0.8 * d * kS}" y="${ZS(-hef - (L.tAP || 10))}" width="${1.6 * d * kS}" height="${H.m * kS}" fill="${C.bolt}"/>`; }
    // podkładka i nakrętka
    s += `<rect x="${xa - H.dw / 2 * kS}" y="${ZS(zb + H.tw)}" width="${H.dw * kS}" height="${Math.max(1.2, H.tw * kS)}" fill="#8a93a3" stroke="${C.bolt}" stroke-width="0.5"/>`;
    s += `<rect x="${xa - 0.8 * d * kS}" y="${ZS(zb + H.tw + H.m)}" width="${1.6 * d * kS}" height="${H.m * kS}" fill="${C.bolt}"/>`;
    if (j === 1) {
      // wymiary: h_ef i L
      s += Q.dimV(xa + Math.max(18, H.dw * kS / 2 + 10), ZS(0), ZS(-hef), `h<tspan font-size="8" dy="2">ef</tspan><tspan dy="-2"> = ${fmt(hef, 0)}</tspan>`, { right: true, fs: 9.5 });
      s += Q.dimV(xa + Math.max(18, H.dw * kS / 2 + 10) + 62, ZS(top), ZS(zBot), `L = ${fmt(L.Lr, 0)}`, { right: true, fs: 9.5 });
    }
  });
  s += Q.dimH(XS(g.ys[0]), XS(g.ys[1]), ZS(zbot) + 14, `s<tspan font-size="8" dy="2">B</tspan><tspan dy="-2"> = ${fmt(g.sB, 0)}</tspan>`, { below: true });
  s += tx(XS(-g.bp / 2) - 4, ZS(tg + g.tp / 2) + 3, `t<tspan font-size="8" dy="2">p</tspan><tspan dy="-2"> = ${fmt(g.tp, 0)}</tspan>`, { a: 'end', fs: 9, c: C.plS });
  if (tg > 0) s += tx(XS(-g.bp / 2) - 4, ZS(tg / 2) + 9, `t<tspan font-size="8" dy="2">g</tspan><tspan dy="-2"> = ${fmt(tg, 0)}</tspan>`, { a: 'end', fs: 9, c: '#7a6f5c' });
  const lab = `${g.n} × ${esc(k.d)} kl. ${esc(k.kl)} – ${esc(BS.KT.KROTKO[k.typ] || k.typ)}, L = ${fmt(L.Lr, 0)} mm${L.h0 ? `, otwór Ø${fmt(L.dDrill, 0)} × ${fmt(L.h0, 0)}` : ''}`;
  const Hs = ZS(zbot) + 52;
  s += tx(Wd / 2, Hs - 6, lab, { fs: 9.5, c: C.dim });
  const sect = svgOpen(Wd, Hs, 'class="anchsvg"') + s + '</svg>';
  return { plan, sect };
};

/* ------------------------------------------------------------ widok podłużny belki z połączeniami */
D.elevation = function (S, R, o) {
  o = o || {};
  const md = R.md, sec = R.sec; if (!md || !sec) return '';
  const W = o.W || 1000, ml = 50, mr = 50, L = md.L, X = (x) => ml + (W - ml - mr) * x / L;
  const hs = Math.max(26, Math.min(90, sec.h * 0.14)), yt = 60, yb = yt + hs;
  const tf = Math.max(2, hs * sec.tg / sec.h), tfd = Math.max(2, hs * sec.td / sec.h);
  let g = '';
  // belka
  if (sec.kind === 'RHS') g += `<rect x="${X(0)}" y="${yt}" width="${X(L) - X(0)}" height="${hs}" fill="#c9d4e6" stroke="#1b2230"/><line x1="${X(0)}" y1="${yt + tf}" x2="${X(L)}" y2="${yt + tf}" stroke="#7a8494" stroke-dasharray="6 3"/><line x1="${X(0)}" y1="${yb - tfd}" x2="${X(L)}" y2="${yb - tfd}" stroke="#7a8494" stroke-dasharray="6 3"/>`;
  else g += `<rect x="${X(0)}" y="${yt}" width="${X(L) - X(0)}" height="${tf}" fill="#c9d4e6" stroke="#1b2230"/><rect x="${X(0)}" y="${yb - tfd}" width="${X(L) - X(0)}" height="${tfd}" fill="#c9d4e6" stroke="#1b2230"/><rect x="${X(0)}" y="${yt + tf}" width="${X(L) - X(0)}" height="${hs - tf - tfd}" fill="#eef0f3" stroke="#9aa3b0" stroke-width="0.6"/>`;
  // podpory i węzły
  md.sup.forEach((p, i) => {
    const x = X(p.x), sp = S.podpory[i] || {}, w = sp.wezel || { typ: 'brak' };
    let d = '';
    if (w.typ === 'blacha_czolowa') {
      const tp = Math.max(3, U.num(w.tp) * hs / sec.h * 1.5), hp = U.num(w.hp) / sec.h * hs, ym = (yt + yb) / 2, side = p.x < L / 2 ? -1 : 1;
      d += `<rect x="${side < 0 ? x - tp : x}" y="${ym - hp / 2}" width="${tp}" height="${hp}" fill="#b5651d" fill-opacity="0.45" stroke="#b5651d"/>`;
      d += `<rect x="${side < 0 ? x - tp - 18 : x + tp}" y="${yt - 20}" width="18" height="${hs + 40}" fill="#eef0f3" stroke="#9aa3b0"/>`;
      const nr = Math.max(1, Math.round(U.num(w.nr))); for (let k = 0; k < nr; k++) { const yy = ym - hp / 2 + (k + 0.5) * hp / nr; d += `<line x1="${x - tp - 8}" y1="${yy}" x2="${x + tp + 8}" y2="${yy}" stroke="#39414f" stroke-width="2"/>`; }
    } else if (w.typ === 'katowniki') {
      const hp = U.num(w.hp) / sec.h * hs, ym = (yt + yb) / 2, side = p.x < L / 2 ? -1 : 1, wz = 18;
      d += `<rect x="${side < 0 ? x - 4 : x - wz + 4}" y="${ym - hp / 2}" width="${wz}" height="${hp}" fill="#b5651d" fill-opacity="0.45" stroke="#b5651d"/><rect x="${side < 0 ? x - 22 : x + 4}" y="${yt - 20}" width="18" height="${hs + 40}" fill="#eef0f3" stroke="#9aa3b0"/>`;
      const n = Math.max(1, Math.round(U.num(w.nr))); for (let k = 0; k < n; k++) d += `<circle cx="${x + side * -6}" cy="${ym - hp / 2 + (k + 0.5) * hp / n}" r="2.4" fill="#39414f"/>`;
    } else if (w.typ === 'spawane') {
      const side = p.x < L / 2 ? -1 : 1;
      d += `<rect x="${side < 0 ? x - 18 : x}" y="${yt - 20}" width="18" height="${hs + 40}" fill="#eef0f3" stroke="#9aa3b0"/><line x1="${x}" y1="${w.spoiny === 'srodnik' ? yt + tf : yt}" x2="${x}" y2="${w.spoiny === 'srodnik' ? yb - tfd : yb}" stroke="#c0262d" stroke-width="3"/>`;
    } else if (w.typ === 'blacha_zebrowa') {
      const hp = U.num(w.hp) / sec.h * hs, ym = (yt + yb) / 2, side = p.x < L / 2 ? -1 : 1, wz = 22;
      d += `<rect x="${side < 0 ? x - 6 : x - wz + 6}" y="${ym - hp / 2}" width="${wz}" height="${hp}" fill="#b5651d" fill-opacity="0.35" stroke="#b5651d"/><rect x="${side < 0 ? x - 24 : x + 6}" y="${yt - 20}" width="18" height="${hs + 40}" fill="#eef0f3" stroke="#9aa3b0"/>`;
      const n = Math.max(1, Math.round(U.num(w.n))); for (let k = 0; k < n; k++) d += `<circle cx="${x + side * -2}" cy="${ym - hp / 2 + (k + 0.5) * hp / n}" r="2.6" fill="#39414f"/>`;
    } else {
      if (w.typ === 'oparcie' && w.podloze !== 'stal') { const lp = Math.max(10, U.num(w.lp) / L * (W - ml - mr)); d += `<rect x="${x - lp / 2}" y="${yb}" width="${lp}" height="5" fill="#b5651d" fill-opacity="0.5" stroke="#b5651d"/><rect x="${x - lp / 2 - 10}" y="${yb + 5}" width="${lp + 20}" height="34" fill="#eef0f3" stroke="#9aa3b0"/>${tx(x, yb + 27, w.podloze === 'mur' ? 'mur' : 'beton', { fs: 9, c: '#7a8494' })}`; }
      else d += supportSym(p, x, yb);
      if (w.zebro) d += `<line x1="${x}" y1="${yt + tf}" x2="${x}" y2="${yb - tfd}" stroke="#b5651d" stroke-width="3"/>`;
    }
    g += `<g class="jnt" data-sup="${i}" style="cursor:pointer"><title>Podpora ${p.id} – kliknij, aby zmienić węzeł/oparcie</title><rect x="${x - 26}" y="${yt - 24}" width="52" height="${hs + 70}" fill="#ffffff" fill-opacity="0"/>${d}${tx(x, yb + 52, p.id, { fs: 11, w: 700 })}</g>`;
  });
  (S.styki || []).forEach((st2, j) => { const x = X(U.clamp(U.num(st2.x) * 1000, 0, L)), lw = Math.max(16, Math.min(60, 0.5 * (W - ml - mr) * 400 / L)); g += `<g class="sty" data-sty="${j}" style="cursor:pointer"><title>Styk S${j + 1} (x = ${fmt(U.num(st2.x), 2)} m) – kliknij, aby projektować</title><rect x="${x - lw / 2 - 4}" y="${yt - 26}" width="${lw + 8}" height="${hs + 52}" fill="#ffffff" fill-opacity="0"/>${st2.typ === 'spawany' ? `<line x1="${x}" y1="${yt}" x2="${x}" y2="${yb}" stroke="#c0262d" stroke-width="2.5"/>` : `<rect x="${x - lw / 2}" y="${yt - 4}" width="${lw}" height="4" fill="#e6a35a" stroke="#b5651d"/><rect x="${x - lw / 2}" y="${yb}" width="${lw}" height="4" fill="#e6a35a" stroke="#b5651d"/><rect x="${x - lw / 3}" y="${yt + tf + 3}" width="${lw * 2 / 3}" height="${Math.max(6, hs - tf - tfd - 6)}" fill="#e6a35a" fill-opacity="0.5" stroke="#b5651d"/>`}<line x1="${x}" y1="${yt - 8}" x2="${x}" y2="${yb + 8}" stroke="#1b2230" stroke-width="0.8" stroke-dasharray="3 2"/>${tx(x, yt - 12, 'S' + (j + 1), { fs: 10, w: 700, c: '#b5651d' })}</g>`; });
  md.tmp.forEach((t, i) => { const x = X(t.x); g += `<g class="tsupp" data-tmp="${i}" style="cursor:pointer" opacity="0.7"><rect x="${x - 10}" y="${yb}" width="20" height="40" fill="#ffffff" fill-opacity="0"/><line x1="${x}" y1="${yb}" x2="${x}" y2="${yb + 34}" stroke="#a35d00" stroke-width="2" stroke-dasharray="4 3"/>${tx(x, yb + 46, t.id + ' (montaż)', { fs: 9, c: '#a35d00' })}</g>`; });
  (md.stez || []).forEach(z => { const x = X(z.x); g += `<g class="rst" data-rst="${z.src}" style="cursor:pointer"><title>Stężenie ${z.typ} x = ${fmt(z.x / 1000, 2)} m</title><path d="M ${x - 6} ${yt - 14} L ${x + 6} ${yt - 14} L ${x} ${yt - 2} Z" fill="#1d5bb8"/><line x1="${x}" y1="${yt - 30}" x2="${x}" y2="${yt - 14}" stroke="#1d5bb8"/></g>`; });
  if ((md.ciagle || {}).pasG) g += `<line x1="${X(0)}" y1="${yt - 5}" x2="${X(L)}" y2="${yt - 5}" stroke="#1d5bb8" stroke-width="2" stroke-dasharray="3 3"/>`;
  // żebra pośrednie
  (R.zebra || []).forEach(z => { const x = X(z.x); g += `<g class="stf" data-stf="${z.src}" style="cursor:pointer"><title>Żebro środnika x = ${fmt(z.x / 1000, 2)} m – ${z.strona === 'jedna' ? 'jednostronne' : 'obustronne'} ${fmt(z.bs, 0)}×${fmt(z.ts, 0)} mm${z.c > 0 ? `, wcięcia 45° c = ${fmt(z.c, 0)} mm` : ''} (kliknij, aby zmienić)</title><rect x="${x - 5}" y="${yt}" width="10" height="${hs}" fill="#ffffff" fill-opacity="0"/><line x1="${x}" y1="${yt + tf}" x2="${x}" y2="${yb - tfd}" stroke="#b5651d" stroke-width="2.2"/></g>`; });
  // wymiary
  let y = yb + 72;
  const xs = [0].concat(md.sup.map(p => p.x)).concat([L]).filter((v, i, arr) => arr.indexOf(v) === i).sort((p, q) => p - q);
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 1) g += dimH(X(xs[i - 1]), X(xs[i]), y, fmt((xs[i] - xs[i - 1]) / 1000, 2));
  y += 26; g += dimH(X(0), X(L), y, `długość belki ${fmt(L / 1000, 2)} m · ${esc(sec.nazwa)}`);
  // kursor
  g += `<g class="ecur" style="display:none;pointer-events:none"><line class="ecl" x1="0" y1="${yt - 30}" x2="0" y2="${yb + 30}" stroke="#1d5bb8" stroke-dasharray="3 2"/></g>`;
  o.out && Object.assign(o.out, { X, ml, mr, W });
  return svgOpen(W, y + 14, 'class="elev"') + g + '</svg>';
};

/* ------------------------------------------------------------ piktogramy */
D.pict = function (id, w, h) {
  w = w || 120; h = h || 46;
  const sc = J0().SCHEMATY.find(q => q.id === id) || {};
  const nS = sc.przesla || 0, wl = sc.wspL ? 0.6 : 0, wr = sc.wspP ? (nS ? 0.6 : 2) : 0;
  const tot = nS + wl + wr || 1, X = (u) => 8 + (w - 16) * u / tot, yb = h / 2;
  let g = `<line x1="${X(0)}" y1="${yb}" x2="${X(tot)}" y2="${yb}" stroke="#1b2230" stroke-width="2.4"/>`;
  const pos = []; let u = wl; pos.push(u); for (let i = 0; i < nS; i++) { u += 1; pos.push(u); }
  (sc.sup || []).forEach((t, i) => { const x = X(pos[i]); g += t === 'utwierdzenie' ? `<line x1="${x}" y1="${yb - 9}" x2="${x}" y2="${yb + 9}" stroke="#1b2230" stroke-width="2.2"/>${[-8, -3, 2, 7].map(k => `<line x1="${x}" y1="${yb + k}" x2="${x + (i ? 5 : -5)}" y2="${yb + k + 4}" stroke="#1b2230" stroke-width="0.8"/>`).join('')}` : `<path d="M ${x} ${yb + 1} l -5 9 l 10 0 Z" fill="#ffffff" stroke="#1b2230"/>`; });
  if (sc.tmp) { const x = X(wl + 0.5); g += `<path d="M ${x} ${yb + 1} l -5 9 l 10 0 Z" fill="none" stroke="#a35d00" stroke-dasharray="2 1.5"/>`; }
  if (sc.stages) g += `<line x1="${X(0)}" y1="${yb - 4}" x2="${X(tot)}" y2="${yb - 4}" stroke="#1d5bb8" stroke-dasharray="2 2"/>`;
  return svgOpen(w, h) + g + '</svg>';
};
const J0 = () => BS.J;
})();
