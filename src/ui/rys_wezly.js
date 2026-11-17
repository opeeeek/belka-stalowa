/* =====================================================================
   BelkaStal – rysunki połączeń w skali: widok z boku (elewacja) i widok
   od czoła / z góry, dla blachy czołowej, blachy żebrowej, kątowników,
   połączenia spawanego oraz styku nakładkowego.  Numeracja śrub, łańcuchy
   wymiarowe, kolor śrub wg wytężenia; elementy klikane (class="jz",
   data-jz: plate, bolts, weld, sup, beam, notch, angle, fcov, wcov).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, Q = BS.Q, D = BS.D;
const { esc, fmt, tx, svgOpen, dimH, dimV } = Q;
const C = { st: '#1b2230', beam: '#c9d4e6', web: '#eef0f3', pl: '#e6a35a', ang: '#b5651d', sup: '#cfd4db', bolt: '#39414f', weld: '#c0262d', dim: '#5d6778', hi: '#1d5bb8' };
const num = (v, d) => U.num(v, d);
const hz = (z, cls, title, body) => `<g class="jz" data-jz="${z}" style="cursor:pointer">${title ? `<title>${esc(title)}</title>` : ''}${body}</g>`;
const rect = (x, y, w, h, fill, o) => `<rect x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" width="${Math.max(0.5, w).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${fill}" ${o && o.op ? `fill-opacity="${o.op}"` : ''} stroke="${(o && o.s) || C.st}" stroke-width="${(o && o.sw) || 1}" ${o && o.dash ? `stroke-dasharray="${o.dash}"` : ''}/>`;
const boltCol = (u) => (u > 1 ? '#c0262d' : u > 0.85 ? '#a35d00' : u > 0.6 ? '#1d5bb8' : '#39414f');
// śruba w widoku (okrąg z numerem), u – wytężenie śruby
const boltC = (x, y, r, n, u, t) => `<g class="jz" data-jz="bolts" style="cursor:pointer"><title>${esc(t || '')}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" stroke="${boltCol(u)}" stroke-width="${u > 0.85 ? 2 : 1.3}"/><line x1="${(x - r * 0.7).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + r * 0.7).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${boltCol(u)}" stroke-width="0.6"/><line x1="${x.toFixed(1)}" y1="${(y - r * 0.7).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + r * 0.7).toFixed(1)}" stroke="${boltCol(u)}" stroke-width="0.6"/>${n ? tx(x + r + 2, y - r - 1, String(n), { fs: 8.5, c: boltCol(u), a: 'start' }) : ''}</g>`;
// śruba w przekroju (trzpień + łeb + nakrętka)
const boltS = (x1, x2, y, d, k, vert) => {
  const h = d * k / 2, hd = Math.max(3, 0.7 * d * k), nt = Math.max(3, 0.8 * d * k);
  if (vert) return `<g class="jz" data-jz="bolts" style="cursor:pointer"><line x1="${y}" y1="${x1}" x2="${y}" y2="${x2}" stroke="${C.bolt}" stroke-width="${Math.max(1.2, 2 * h)}" stroke-opacity="0.55"/>${rect(y - h * 1.7, x1 - hd, 3.4 * h, hd, C.bolt, { op: 0.8 })}${rect(y - h * 1.7, x2, 3.4 * h, nt, C.bolt, { op: 0.8 })}</g>`;
  return `<g class="jz" data-jz="bolts" style="cursor:pointer"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.bolt}" stroke-width="${Math.max(1.2, 2 * h)}" stroke-opacity="0.55"/>${rect(x1 - hd, y - h * 1.7, hd, 3.4 * h, C.bolt, { op: 0.8 })}${rect(x2, y - h * 1.7, nt, 3.4 * h, C.bolt, { op: 0.8 })}</g>`;
};
const weldTri = (x, y, s, dir) => { const d = dir || 1; return `<path d="M ${x} ${y} l ${d * s} 0 l ${-d * s} ${s} z" fill="${C.weld}" fill-opacity="0.8"/>`; };
const chainV = (x, ys, labs, right) => { let g = ''; for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 2) g += dimV(x, ys[i - 1], ys[i], labs[i - 1], { right, fs: 9.5 }); return g; };
const chainH = (y, xs, labs, below) => { let g = ''; for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 2) g += dimH(xs[i - 1], xs[i], y, labs[i - 1], { below, fs: 9.5 }); return g; };
const L = (v) => fmt(v, 0);
function boltInfo(o, B) {
  const m = Math.max(1e-9, ...(o.bolts || []).map(b => b.F));
  return (b) => ({ u: B ? b.F / Math.max(1e-9, B.Fv * (o.typ === 'katowniki' || o.typ === 'nakladkowy' ? 2 : 1)) : b.F / m, t: `Śruba ${b.id || ''}: F_x = ${fmt(b.Fx / 1e3, 1)} kN, F_z = ${fmt(b.Fz / 1e3, 1)} kN, F = ${fmt(b.F / 1e3, 1)} kN` });
}

/* ---------------------------------------------------------- belka w widoku z boku (z podcięciami) */
function beamSide(sec, X, Y, x0, x1, w) {
  const h = sec.h, tg = sec.tg || sec.t || 0, td = sec.td || sec.t || 0, dnt = num(w.dnt), dnb = num(w.dnb), ln = num(w.ln);
  let g = '';
  const xn = x0 + (dnt > 0 || dnb > 0 ? ln : 0);
  // środnik
  const zt = dnt > 0 ? dnt : 0, zb = dnb > 0 ? h - dnb : h;
  g += `<path d="M ${X(x0)} ${Y(zt)} L ${X(xn)} ${Y(zt)} L ${X(xn)} ${Y(0)} L ${X(x1)} ${Y(0)} L ${X(x1)} ${Y(h)} L ${X(xn)} ${Y(h)} L ${X(xn)} ${Y(zb)} L ${X(x0)} ${Y(zb)} Z" fill="${C.web}" stroke="${C.st}" stroke-width="1"/>`;
  // pasy
  if (sec.kind !== 'RHS') {
    g += rect(X(dnt > 0 ? xn : x0), Y(0), X(x1) - X(dnt > 0 ? xn : x0), Y(tg) - Y(0), C.beam);
    g += rect(X(dnb > 0 ? xn : x0), Y(h - td), X(x1) - X(dnb > 0 ? xn : x0), Y(h) - Y(h - td), C.beam);
  } else g += `<line x1="${X(x0)}" y1="${Y(tg)}" x2="${X(x1)}" y2="${Y(tg)}" stroke="${C.dim}" stroke-dasharray="5 3"/><line x1="${X(x0)}" y1="${Y(h - td)}" x2="${X(x1)}" y2="${Y(h - td)}" stroke="${C.dim}" stroke-dasharray="5 3"/>`;
  if (dnt > 0 || dnb > 0) g = hz('notch', '', 'Podcięcie belki – kliknij, aby zmienić', g); else g = hz('beam', '', 'Belka', g);
  g += `<path d="M ${X(x1)} ${Y(-6)} l 6 ${(Y(h) - Y(0)) / 2 + 6} l -6 ${(Y(h) - Y(0)) / 2 + 6}" fill="none" stroke="${C.dim}" stroke-width="0.8"/>`;
  return g;
}
function supportSide(X, Y, h, t, w) {
  const tt = Math.max(8, t);
  return hz('sup', '', `${(BS.W.PODPORA[w.sup] || 'Element podpierający')} – t = ${fmt(num(w.tsup), 0)} mm (kliknij, aby zmienić)`, rect(X(-tt), Y(-40), X(0) - X(-tt), Y(h + 40) - Y(-40), C.sup, { s: '#7a8494' }) + `<line x1="${X(-tt) - 10}" y1="${Y(-40)}" x2="${X(-tt) - 10}" y2="${Y(h + 40)}" stroke="#9aa3b0" stroke-dasharray="8 3 2 3" stroke-width="0.7"/>`);
}
function frame(Wpx, Hpx, ext, pad) {
  const k = Math.min((Wpx - pad.l - pad.r) / (ext.x1 - ext.x0), (Hpx - pad.t - pad.b) / (ext.z1 - ext.z0));
  const X = (x) => +(pad.l + (x - ext.x0) * k).toFixed(1), Y = (z) => +(pad.t + (z - ext.z0) * k).toFixed(1);
  return { k, X, Y, W: Math.ceil(pad.l + (ext.x1 - ext.x0) * k + pad.r), H: Math.ceil(pad.t + (ext.z1 - ext.z0) * k + pad.b) };
}

/* ---------------------------------------------------------- połączenia podporowe */
D.jointViews = function (sec, w, o, opt) {
  opt = opt || {};
  const Wv = opt.W || 520, Hv = opt.H || 400, t = w.typ, h = sec.h, tsup = Math.max(8, num(w.tsup, 12));
  const B = o && o.B, d = B ? B.dd : 16, bi = boltInfo(o || {}, B);
  let el = '', se = '';
  if (t === 'blacha_czolowa') {
    const g = o.geom, hp = g.hp, tp = g.tp, zp = (h - hp) / 2, Lb = Math.max(250, 1.2 * h);
    const F = frame(Wv, Hv, { x0: -tsup - 40, x1: Lb, z0: -30, z1: h + 30 }, { l: 50, r: 20, t: 26, b: 40 }), X = F.X, Y = F.Y, k = F.k;
    el += supportSide(X, Y, h, tsup, w) + beamSide(sec, X, Y, tp, Lb, w);
    el += hz('plate', `Blacha czołowa ${L(hp)}×${L(g.bp)}×${L(tp)} mm`, '', rect(X(0), Y(zp), X(tp) - X(0), Y(zp + hp) - Y(zp), C.pl));
    el += hz('weld', `Spoiny a = ${fmt(g.a, 0)} mm`, '', weldTri(X(tp), Y(zp + 4), Math.max(3, g.a * k * 1.2)) + weldTri(X(tp), Y(zp + hp - 4 - Math.max(3, g.a * k * 1.2)), Math.max(3, g.a * k * 1.2)));
    const zs = []; for (let i = 0; i < g.nr; i++) zs.push(zp + g.e1 + i * g.p1);
    zs.forEach(z => { el += boltS(X(-tsup), X(tp), Y(z), d, k); });
    el += chainV(X(-tsup) - 22, [zp].concat(zs).concat([zp + hp]).map(Y), [L(g.e1)].concat(zs.slice(1).map(() => L(g.p1))).concat([L(hp - g.e1 - (g.nr - 1) * g.p1)]));
    el += dimV(X(Lb) - 14, Y(0), Y(h), `h = ${L(h)}`, { fs: 9.5 }) + tx(X(tp) + 4, Y(zp) - 5, `t_p = ${L(tp)}`.replace('t_p', 't<tspan font-size="7" dy="2">p</tspan><tspan dy="-2"></tspan>'), { a: 'start', fs: 9.5, c: C.ang });
    el = svgOpen(F.W, F.H, 'class="jsvg"') + el + '</svg>';
    // widok od czoła (blacha z otworami, przekrój belki za blachą)
    const F2 = frame(Math.min(Wv, 420), Hv, { x0: -Math.max(g.bp, sec.bg || sec.b || 100) / 2 - 30, x1: Math.max(g.bp, sec.bg || sec.b || 100) / 2 + 40, z0: -30, z1: h + 30 }, { l: 46, r: 70, t: 26, b: 46 }), X2 = F2.X, Y2 = F2.Y, k2 = F2.k;
    const bg = sec.bg || sec.b, bd = sec.bd || sec.b, tg = sec.tg || 0, td = sec.td || 0, tw = sec.tw;
    se += `<g stroke="${C.dim}" stroke-dasharray="4 3" fill="none"><rect x="${X2(-bg / 2)}" y="${Y2(0)}" width="${bg * k2}" height="${tg * k2}"/><rect x="${X2(-bd / 2)}" y="${Y2(h - td)}" width="${bd * k2}" height="${td * k2}"/><rect x="${X2(-tw / 2)}" y="${Y2(tg)}" width="${tw * k2}" height="${(h - tg - td) * k2}"/></g>`;
    se += hz('plate', 'Blacha czołowa', '', rect(X2(-g.bp / 2), Y2(zp), g.bp * k2, hp * k2, C.pl, { op: 0.55 }));
    se += hz('weld', 'Spoiny pachwinowe środnik–blacha', '', rect(X2(-tw / 2 - g.a), Y2(zp + g.a), (tw + 2 * g.a) * k2, (hp - 2 * g.a) * k2, C.weld, { op: 0.35, s: C.weld, sw: 0.6 }));
    let id = 0;
    zs.forEach(z => [-1, 1].forEach(s => { const b = (o.bolts || [])[id++] || { F: 0, Fx: 0, Fz: 0 }; const q = bi(b); se += boltC(X2(s * g.p3 / 2), Y2(z), Math.max(3, B.d0 * k2 / 2), id, q.u, q.t); }));
    se += chainH(Y2(zp + hp) + 18, [-g.bp / 2, -g.p3 / 2, g.p3 / 2, g.bp / 2].map(X2), [L(g.e2), L(g.p3), L(g.e2)], true);
    se += dimV(X2(g.bp / 2) + 22, Y2(zp), Y2(zp + hp), `h_p = ${L(hp)}`.replace('h_p', 'h<tspan font-size="7" dy="2">p</tspan><tspan dy="-2"></tspan>'), { right: true, fs: 9.5 });
    se = svgOpen(F2.W, F2.H, 'class="jsvg"') + se + tx(F2.W / 2, 14, 'Widok od czoła (A–A)', { fs: 10, c: C.dim }) + '</svg>';
    el = el.replace('</svg>', tx(F.W / 2, 14, 'Widok z boku', { fs: 10, c: C.dim }) + '</svg>');
  } else if (t === 'blacha_zebrowa') {
    const g = o.geom, hp = g.hp, zp = (h - hp) / 2, lp = g.z + (g.nc - 1) * g.p2 + g.e2, Lb = Math.max(lp + 120, 1.1 * h);
    const F = frame(Wv, Hv, { x0: -tsup - 30, x1: Lb, z0: -30, z1: h + 34 }, { l: 50, r: 20, t: 26, b: 52 }), X = F.X, Y = F.Y, k = F.k;
    el += supportSide(X, Y, h, tsup, w) + beamSide(sec, X, Y, g.gap, Lb, w);
    el += hz('plate', `Blacha żebrowa ${L(hp)}×${L(lp)}×${L(g.tp)} mm`, '', rect(X(0), Y(zp), X(lp) - X(0), Y(zp + hp) - Y(zp), C.pl, { op: 0.65 }));
    el += hz('weld', `Spoiny a = ${L(g.a)} mm`, '', `<line x1="${X(0) + 1.5}" y1="${Y(zp)}" x2="${X(0) + 1.5}" y2="${Y(zp + hp)}" stroke="${C.weld}" stroke-width="3"/>`);
    (o.bolts || []).forEach(b => { const q = bi(b); el += boltC(X(b.x), Y(zp + b.z), Math.max(3, B.d0 * k / 2), b.id, q.u, q.t); });
    const zs = []; for (let i = 0; i < g.nr; i++) zs.push(zp + g.e1 + i * g.p1);
    el += chainV(X(-tsup) - 20, [zp].concat(zs).concat([zp + hp]).map(Y), [L(g.e1)].concat(zs.slice(1).map(() => L(g.p1))).concat([L(hp - g.e1 - (g.nr - 1) * g.p1)]));
    const xs = [0, g.z]; for (let j = 1; j < g.nc; j++) xs.push(g.z + j * g.p2); xs.push(lp);
    el += chainH(Y(h) + 16, xs.map(X), [L(g.z)].concat(xs.slice(2, -1).map(() => L(g.p2))).concat([L(g.e2)]), true);
    el += dimH(X(0), X(g.gap), Y(h) + 34, `g = ${L(g.gap)}`, { below: true, fs: 9 }) + dimH(X(g.gap), X(g.z), Y(-14), `e₂,b = ${L(g.e2b)}`, { fs: 9 });
    el = svgOpen(F.W, F.H, 'class="jsvg"') + el + tx(F.W / 2, 14, 'Widok z boku', { fs: 10, c: C.dim }) + '</svg>';
    // widok z góry
    const bw2 = sec.bg || sec.b || 150, F2 = frame(Math.min(Wv, 420), Math.min(Hv, 300), { x0: -tsup - 20, x1: Lb, z0: -bw2 / 2 - 20, z1: bw2 / 2 + 30 }, { l: 30, r: 20, t: 26, b: 34 }), X2 = F2.X, Y2 = F2.Y, k2 = F2.k, tw = sec.tw;
    se += hz('sup', '', '', rect(X2(-tsup), Y2(-bw2 / 2 - 15), tsup * k2, (bw2 + 30) * k2, C.sup, { s: '#7a8494' }));
    se += `<rect x="${X2(g.gap)}" y="${Y2(-bw2 / 2)}" width="${(Lb - g.gap) * k2}" height="${bw2 * k2}" fill="none" stroke="${C.dim}" stroke-dasharray="4 3"/>`;
    se += hz('beam', '', 'Środnik belki', rect(X2(g.gap), Y2(0), (Lb - g.gap) * k2, tw * k2, C.web));
    se += hz('plate', '', 'Blacha żebrowa', rect(X2(0), Y2(-g.tp), lp * k2, g.tp * k2, C.pl));
    se += hz('weld', '', 'Spoiny pachwinowe', weldTri(X2(0), Y2(-g.tp) - Math.max(3, g.a * k2), Math.max(3, g.a * k2)) + weldTri(X2(0), Y2(0), Math.max(3, g.a * k2)));
    for (let j = 0; j < g.nc; j++) se += boltS(Y2(-g.tp) , Y2(tw), X2(g.z + j * g.p2), d, k2, true);
    se += tx(X2(lp) + 4, Y2(-g.tp) - 3, `t_p = ${L(g.tp)}`, { a: 'start', fs: 9, c: C.ang });
    se = svgOpen(F2.W, F2.H, 'class="jsvg"') + se + tx(F2.W / 2, 14, 'Widok z góry', { fs: 10, c: C.dim }) + '</svg>';
  } else if (t === 'katowniki') {
    const g = o.geom, hp = g.hp, zp = (h - hp) / 2, Lb = Math.max(g.lb + 140, 1.1 * h);
    const F = frame(Wv, Hv, { x0: -tsup - 40, x1: Lb, z0: -30, z1: h + 34 }, { l: 50, r: 20, t: 26, b: 52 }), X = F.X, Y = F.Y, k = F.k;
    el += supportSide(X, Y, h, tsup, w) + beamSide(sec, X, Y, g.gap, Lb, w);
    el += hz('angle', `Kątowniki 2×L${String(w.L).replace(/x/g, '×')} dł. ${L(hp)} mm`, '', rect(X(0), Y(zp), X(g.lb) - X(0), Y(zp + hp) - Y(zp), C.ang, { op: 0.35 }) + rect(X(0), Y(zp), X(g.ta) - X(0), Y(zp + hp) - Y(zp), C.ang, { op: 0.7 }));
    (o.bolts || []).forEach(b => { const q = bi(b); el += boltC(X(b.x), Y(zp + b.z), Math.max(3, B.d0 * k / 2), b.id, q.u, q.t); });
    const zs = []; for (let i = 0; i < g.nr; i++) zs.push(zp + g.e1 + i * g.p1);
    zs.forEach(z => { el += boltS(X(-tsup), X(g.ta), Y(z) + Math.max(4, d * k * 0.9), d, k); });
    el += chainV(X(-tsup) - 22, [zp].concat(zs).concat([zp + hp]).map(Y), [L(g.e1)].concat(zs.slice(1).map(() => L(g.p1))).concat([L(hp - g.e1 - (g.nr - 1) * g.p1)]));
    el += chainH(Y(h) + 16, [0, g.gb, g.lb].map(X), [L(g.gb), L(g.lb - g.gb)], true) + dimH(X(0), X(g.gap), Y(h) + 34, `c = ${L(g.gap)}`, { below: true, fs: 9 });
    el = svgOpen(F.W, F.H, 'class="jsvg"') + el + tx(F.W / 2, 14, 'Widok z boku', { fs: 10, c: C.dim }) + '</svg>';
    const tw = sec.tw, half = tw / 2 + g.ls + 20, F2 = frame(Math.min(Wv, 420), Math.min(Hv, 320), { x0: -tsup - 20, x1: Math.max(Lb * 0.7, g.lb + 60), z0: -half, z1: half + 10 }, { l: 30, r: 20, t: 26, b: 34 }), X2 = F2.X, Y2 = F2.Y, k2 = F2.k;
    se += hz('sup', '', '', rect(X2(-tsup), Y2(-half + 5), tsup * k2, (2 * half - 10) * k2, C.sup, { s: '#7a8494' }));
    se += hz('beam', '', 'Środnik belki', rect(X2(g.gap), Y2(-tw / 2), (Math.max(Lb * 0.7, g.lb + 60) - g.gap) * k2, tw * k2, C.web));
    [-1, 1].forEach(s => {
      const y0 = s > 0 ? tw / 2 : -tw / 2 - g.ta, ys = s > 0 ? tw / 2 : -tw / 2 - g.ls;
      se += hz('angle', '', 'Kątownik', rect(X2(0), Y2(y0), g.lb * k2, g.ta * k2, C.ang, { op: 0.7 }) + rect(X2(0), Y2(ys), g.ta * k2, g.ls * k2, C.ang, { op: 0.7 }));
      se += boltS(X2(-tsup), X2(g.ta), Y2(s * (tw / 2 + g.gs)), d, k2);
    });
    se += boltS(Y2(-tw / 2 - g.ta), Y2(tw / 2 + g.ta), X2(g.gb), d, k2, true);
    se += dimV(X2(-tsup) - 12, Y2(tw / 2), Y2(tw / 2 + g.gs), `g_s = ${L(g.gs)}`.replace('g_s', 'g<tspan font-size="7" dy="2">s</tspan><tspan dy="-2"></tspan>'), { fs: 9 });
    se = svgOpen(F2.W, F2.H, 'class="jsvg"') + se + tx(F2.W / 2, 14, 'Widok z góry', { fs: 10, c: C.dim }) + '</svg>';
  } else if (t === 'spawane') {
    const Lb = Math.max(250, 1.2 * h), g = (o && o.geom) || {};
    const F = frame(Wv, Hv, { x0: -tsup - 30, x1: Lb, z0: -30, z1: h + 30 }, { l: 40, r: 20, t: 26, b: 30 }), X = F.X, Y = F.Y, k = F.k;
    el += supportSide(X, Y, h, tsup, w) + beamSide(sec, X, Y, 0, Lb, w);
    const aw = num(w.aw, 5) * k * 1.4;
    el += hz('weld', 'Spoiny – kliknij, aby zmienić', '', w.spoiny === 'czolowa' ? `<line x1="${X(0) + 1.5}" y1="${Y(0)}" x2="${X(0) + 1.5}" y2="${Y(h)}" stroke="${C.weld}" stroke-width="3.5"/>` : weldTri(X(0), Y((sec.tg || 0) + 6), Math.max(3, aw)) + `<line x1="${X(0) + 1}" y1="${Y(sec.tg || 0)}" x2="${X(0) + 1}" y2="${Y(h - (sec.td || 0))}" stroke="${C.weld}" stroke-width="2.4"/>` + (w.spoiny === 'obwodowe' ? `<line x1="${X(0) + 1}" y1="${Y(0)}" x2="${X(0) + 1}" y2="${Y(sec.tg || 0)}" stroke="${C.weld}" stroke-width="3"/><line x1="${X(0) + 1}" y1="${Y(h - (sec.td || 0))}" x2="${X(0) + 1}" y2="${Y(h)}" stroke="${C.weld}" stroke-width="3"/>` : ''));
    el = svgOpen(F.W, F.H, 'class="jsvg"') + el + tx(F.W / 2, 14, 'Widok z boku', { fs: 10, c: C.dim }) + '</svg>';
    // przekrój z liniami spoin
    if (o && o.geom && o.geom.lines && sec.rings) {
      const sv = D.section(sec, { size: 240 });
      se = sv.replace('</svg>', `${tx(120, 14, w.spoiny === 'obwodowe' ? 'spoiny obwodowe (środnik + pasy)' : w.spoiny === 'czolowa' ? 'spoina czołowa – pełny przetop' : 'spoiny środnika (dwustronne)', { fs: 10, c: C.weld })}</svg>`);
      se = hz('weld', '', 'Spoiny', se);
    } else se = '';
    void g;
  } else return { elev: '', sect: '' };
  return { elev: el, sect: se };
};

/* ---------------------------------------------------------- styk nakładkowy */
D.spliceViews = function (sec, s, o, opt) {
  opt = opt || {};
  if (!o || !o.geom) return { elev: '', sect: '' };
  const g = o.geom, h = sec.h, tg = sec.tg, td = sec.td, B = o.B, d = B ? B.dd : 20;
  const half = Math.max(g.Lf, g.Lw) / 2 + 60, Wv = opt.W || 620, Hv = opt.H || 400;
  const F = frame(Wv, Hv, { x0: -half, x1: half, z0: -g.tfo - 40, z1: h + g.tfo + 50 }, { l: 46, r: 20, t: 26, b: 46 }), X = F.X, Y = F.Y, k = F.k;
  let el = '';
  [-1, 1].forEach(sd => { const xa = sd * g.gap / 2, xb = sd * half; el += hz('beam', '', 'Belka', `<path d="M ${X(xa)} ${Y(0)} L ${X(xb)} ${Y(0)} L ${X(xb)} ${Y(h)} L ${X(xa)} ${Y(h)} Z" fill="${C.web}" stroke="${C.st}"/>` + rect(Math.min(X(xa), X(xb)), Y(0), Math.abs(X(xb) - X(xa)), tg * k, C.beam) + rect(Math.min(X(xa), X(xb)), Y(h - td), Math.abs(X(xb) - X(xa)), td * k, C.beam)); });
  el += hz('fcov', `Nakładki pasów ${L(g.bfo)}×${L(g.tfo)}${g.tfi > 0 ? ` + 2×${L(g.bfi)}×${L(g.tfi)}` : ''} mm, dł. ${L(g.Lf)} mm`, '', rect(X(-g.Lf / 2), Y(-g.tfo), g.Lf * k, g.tfo * k, C.pl) + rect(X(-g.Lf / 2), Y(h), g.Lf * k, g.tfo * k, C.pl) + (g.tfi > 0 ? rect(X(-g.Lf / 2), Y(tg), g.Lf * k, g.tfi * k, C.pl, { op: 0.6 }) + rect(X(-g.Lf / 2), Y(h - td - g.tfi), g.Lf * k, g.tfi * k, C.pl, { op: 0.6 }) : ''));
  const zw = (h - g.hpw) / 2;
  el += hz('wcov', `Nakładki środnika 2×${L(g.hpw)}×${L(g.tpw)} mm, dł. ${L(g.Lw)} mm`, '', rect(X(-g.Lw / 2), Y(zw), g.Lw * k, g.hpw * k, C.pl, { op: 0.45 }));
  for (let i = 0; i < g.nf; i++) [-1, 1].forEach(sd => { const x = sd * (g.gap / 2 + g.ef + i * g.p1f); el += boltS(Y(-g.tfo), Y(tg + (g.tfi || 0)), X(x), d, k, true) + boltS(Y(h - td - (g.tfi || 0)), Y(h + g.tfo), X(x), d, k, true); });
  const bi = boltInfo(o, B);
  (o.bolts || []).forEach(b => [-1, 1].forEach(sd => { const q = bi(b); el += boltC(X(sd * b.x), Y(zw + b.z), Math.max(3, B.d0 * k / 2), sd > 0 ? b.id : '', q.u, q.t); }));
  const fx = [0]; for (let i = 0; i < g.nf; i++) fx.push(g.gap / 2 + g.ef + i * g.p1f); fx.push(g.Lf / 2);
  el += chainH(Y(-g.tfo) - 14, fx.map(X), [L(g.gap / 2 + g.ef)].concat(fx.slice(2, -1).map(() => L(g.p1f))).concat([L(g.e1f)]));
  const zs = [zw]; for (let i = 0; i < g.nw; i++) zs.push(zw + g.e1w + i * g.p1w); zs.push(zw + g.hpw);
  el += chainV(X(-half) + 10, zs.map(Y), [L(g.e1w)].concat(zs.slice(2, -1).map(() => L(g.p1w))).concat([L(g.e1w)]), true);
  el += dimH(X(-g.gap / 2), X(g.gap / 2), Y(h + g.tfo) + 30, `g = ${L(g.gap)}`, { below: true, fs: 9 });
  el = svgOpen(F.W, F.H, 'class="jsvg"') + el + tx(F.W / 2, 14, 'Widok z boku – styk', { fs: 10, c: C.dim }) + '</svg>';
  // przekrój poprzeczny w styku
  const bf = Math.max(sec.bg, g.bfo), F2 = frame(Math.min(Wv, 380), Hv, { x0: -bf / 2 - 30, x1: bf / 2 + 30, z0: -g.tfo - 30, z1: h + g.tfo + 30 }, { l: 30, r: 20, t: 26, b: 30 }), X2 = F2.X, Y2 = F2.Y, k2 = F2.k;
  let se = hz('beam', '', 'Przekrój belki', rect(X2(-sec.bg / 2), Y2(0), sec.bg * k2, tg * k2, C.beam) + rect(X2(-sec.bd / 2), Y2(h - td), sec.bd * k2, td * k2, C.beam) + rect(X2(-sec.tw / 2), Y2(tg), sec.tw * k2, (h - tg - td) * k2, C.beam));
  se += hz('fcov', '', 'Nakładki pasów', rect(X2(-g.bfo / 2), Y2(-g.tfo), g.bfo * k2, g.tfo * k2, C.pl) + rect(X2(-g.bfo / 2), Y2(h), g.bfo * k2, g.tfo * k2, C.pl) + (g.tfi > 0 ? [-1, 1].map(sd => rect(X2(sd > 0 ? sec.tw / 2 + (sec.r || 0) : -sec.tw / 2 - (sec.r || 0) - g.bfi), Y2(tg), g.bfi * k2, g.tfi * k2, C.pl) + rect(X2(sd > 0 ? sec.tw / 2 + (sec.r || 0) : -sec.tw / 2 - (sec.r || 0) - g.bfi), Y2(h - td - g.tfi), g.bfi * k2, g.tfi * k2, C.pl)).join('') : ''));
  se += hz('wcov', '', 'Nakładki środnika', rect(X2(-sec.tw / 2 - g.tpw), Y2(zw), g.tpw * k2, g.hpw * k2, C.pl) + rect(X2(sec.tw / 2), Y2(zw), g.tpw * k2, g.hpw * k2, C.pl));
  [-1, 1].forEach(sd => { se += boltS(Y2(-g.tfo), Y2(tg + (g.tfi || 0)), X2(sd * g.gf / 2), d, k2, true) + boltS(Y2(h - td - (g.tfi || 0)), Y2(h + g.tfo), X2(sd * g.gf / 2), d, k2, true); });
  for (let i = 0; i < g.nw; i++) se += boltS(X2(-sec.tw / 2 - g.tpw), X2(sec.tw / 2 + g.tpw), Y2(zw + g.e1w + i * g.p1w), d, k2);
  se += dimH(X2(-g.gf / 2), X2(g.gf / 2), Y2(h + g.tfo) + 16, `g_f = ${L(g.gf)}`, { below: true, fs: 9 });
  se = svgOpen(F2.W, F2.H, 'class="jsvg"') + se + tx(F2.W / 2, 14, 'Przekrój w styku', { fs: 10, c: C.dim }) + '</svg>';
  return { elev: el, sect: se };
};

/* ---------------------------------------------------------- piktogramy rodzajów połączeń */
D.jointPict = function (t) {
  const s = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="44" viewBox="0 0 64 44">${b}</svg>`;
  const sup = '<rect x="2" y="2" width="7" height="40" fill="#cfd4db" stroke="#7a8494"/>', beam = (x) => `<rect x="${x}" y="8" width="${62 - x}" height="4" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="${x}" y="32" width="${62 - x}" height="4" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="${x}" y="12" width="${62 - x}" height="20" fill="#eef0f3" stroke="#9aa3b0" stroke-width="0.5"/>`;
  const bolt = (x, y) => `<circle cx="${x}" cy="${y}" r="2" fill="#ffffff" stroke="#39414f"/>`;
  if (t === 'blacha_czolowa') return s(sup + beam(13) + '<rect x="9" y="12" width="4" height="20" fill="#e6a35a" stroke="#1b2230" stroke-width="0.8"/><line x1="4" y1="17" x2="15" y2="17" stroke="#39414f" stroke-width="2"/><line x1="4" y1="27" x2="15" y2="27" stroke="#39414f" stroke-width="2"/>');
  if (t === 'blacha_zebrowa') return s(sup + beam(13) + '<rect x="9" y="13" width="18" height="18" fill="#e6a35a" fill-opacity="0.7" stroke="#1b2230" stroke-width="0.8"/>' + bolt(20, 17) + bolt(20, 27));
  if (t === 'katowniki') return s(sup + beam(13) + '<rect x="9" y="13" width="16" height="18" fill="#b5651d" fill-opacity="0.45" stroke="#1b2230" stroke-width="0.8"/><rect x="9" y="13" width="3" height="18" fill="#b5651d" stroke="#1b2230" stroke-width="0.6"/>' + bolt(19, 17) + bolt(19, 27));
  if (t === 'spawane') return s(sup + beam(9) + '<line x1="10" y1="12" x2="10" y2="32" stroke="#c0262d" stroke-width="2.5"/>');
  if (t === 'oparcie') return s('<rect x="2" y="30" width="60" height="12" fill="#eef0f3" stroke="#9aa3b0"/><rect x="10" y="26" width="26" height="4" fill="#e6a35a" stroke="#1b2230" stroke-width="0.8"/><rect x="6" y="6" width="56" height="3" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="6" y="23" width="56" height="3" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="6" y="9" width="56" height="14" fill="#eef0f3" stroke="#9aa3b0" stroke-width="0.5"/>');
  if (t === 'brak') return s('<rect x="2" y="30" width="60" height="12" fill="#cfd4db" stroke="#7a8494"/><rect x="6" y="6" width="56" height="3" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="6" y="27" width="56" height="3" fill="#c9d4e6" stroke="#1b2230" stroke-width="0.8"/><rect x="6" y="9" width="56" height="18" fill="#eef0f3" stroke="#9aa3b0" stroke-width="0.5"/><line x1="20" y1="9" x2="20" y2="27" stroke="#b5651d" stroke-width="2"/>');
  if (t === 'nakladkowy') return s('<rect x="2" y="12" width="28" height="20" fill="#eef0f3" stroke="#1b2230" stroke-width="0.8"/><rect x="34" y="12" width="28" height="20" fill="#eef0f3" stroke="#1b2230" stroke-width="0.8"/><rect x="12" y="8" width="40" height="4" fill="#e6a35a" stroke="#1b2230" stroke-width="0.8"/><rect x="12" y="32" width="40" height="4" fill="#e6a35a" stroke="#1b2230" stroke-width="0.8"/><rect x="18" y="15" width="28" height="14" fill="#e6a35a" fill-opacity="0.5" stroke="#1b2230" stroke-width="0.6"/>' + bolt(24, 22) + bolt(40, 22));
  if (t === 'spawany') return s('<rect x="2" y="12" width="29" height="20" fill="#eef0f3" stroke="#1b2230" stroke-width="0.8"/><rect x="33" y="12" width="29" height="20" fill="#eef0f3" stroke="#1b2230" stroke-width="0.8"/><path d="M 31 12 L 33 12 L 33 32 L 31 32 Z" fill="#c0262d"/>');
  return s('');
};
})();
