/* =====================================================================
   BelkaStal – projektowanie połączeń (PN-EN 1993-1-8 + zasady SCI P358
   „Simple joints to Eurocode 3” dla połączeń przegubowych)

   Połączenia podporowe belki (siła poprzeczna V, opcjonalnie siła
   rozciągająca wiązania N_t i moment M dla połączeń spawanych):
   • blacha czołowa krótka / pełna,
   • blacha żebrowa (n rzędów × 1–2 kolumny śrub, mimośród grupy),
   • kątowniki podwójne (śruby dwuciętne w środniku, jednocięte w podporze),
   • połączenie spawane (spoiny pachwinowe środnika / obwodowe, spoina
     czołowa z pełnym przetopem).
   Styki montażowe belki (M, V, N z obwiedni w miejscu styku):
   • nakładkowy śrubowy (nakładki pasów zewnętrzne i wewnętrzne,
     nakładki środnika dwustronne; kategorie A, B, C),
   • spawany czołowy (pełny przetop).

   Elementy składowe: śruby (tabl. 3.1–3.4: klasy 4.6–10.9, otwory
   normalne / powiększone, gwint w płaszczyźnie ścinania, sprężanie,
   poślizg 3.9, długie złącza 3.8, przebicie Bp,Rd, interakcja V + N),
   docisk w dwóch kierunkach z interakcją, rozstaw (tabl. 3.3),
   rozerwanie blokowe (3.10.2), ścinanie brutto / netto, zginanie
   i zwichrzenie blachy, T-króciec przy rozciąganiu (6.2.4), spoiny
   pachwinowe metodą kierunkową (4.5.3.2), spoiny długie (4.11).
   Jednostki: N, mm, MPa.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M, P = BS.P;
const W = BS.W = {};
const s3 = Math.sqrt(3), f = (v, n) => U.fmt(v, n === undefined ? 1 : n), kN = (v) => U.fmt(v / 1e3, 1);

// nakrętki: rozwartość klucza s [mm] – ISO 4032 / HV (PN-EN 14399-4)
const NUT = { M12: [18, 22], M14: [21, 24], M16: [24, 27], M20: [30, 32], M22: [32, 36], M24: [36, 41], M27: [41, 46], M30: [46, 50] };
// otwory powiększone: d0 = d + Δ (PN-EN 1090-2, tabl. 11)
const OVER = { M12: 3, M14: 4, M16: 4, M20: 4, M22: 4, M24: 6, M27: 8, M30: 8 };
W.MU = { A: 0.5, B: 0.4, C: 0.3, D: 0.2 };
W.MU_N = { A: 'A – śrutowane / piaskowane, bez luźnej rdzy (μ = 0,5)', B: 'B – śrutowane, malowane natryskowo (μ = 0,4)', C: 'C – oczyszczane szczotką / płomieniowo (μ = 0,3)', D: 'D – nieobrobione (μ = 0,2)' };
W.TYPY = {
  blacha_czolowa: 'blacha czołowa',
  blacha_zebrowa: 'blacha żebrowa',
  katowniki: 'kątowniki podwójne',
  spawane: 'połączenie spawane',
  oparcie: 'płyta podporowa (oparcie)',
  brak: 'oparcie na stali'
};
W.STYKI = { nakladkowy: 'styk nakładkowy śrubowy', spawany: 'styk spawany czołowy' };
W.PODPORA = { pas_slupa: 'pas słupa', srodnik_slupa: 'środnik słupa', srodnik_belki: 'środnik podciągu', blacha: 'blacha / marka stalowa' };

/* ---------------------------------------------------------- śruba */
W.bolt = function (w, ndp) {
  const d = M.SRUBY[w.d] ? w.d : 'M16', b = M.SRUBY[d], cl = M.SRUBY_KL[w.kl] ? w.kl : '8.8', k = M.SRUBY_KL[cl];
  const otw = w.otw === 'powiekszone' ? 'powiekszone' : 'normalne';
  const d0 = otw === 'powiekszone' ? b.d + OVER[d] : b.d0;
  const thread = w.gwint !== false, A = thread ? b.As : b.A, av = thread ? k.av : 0.6, g2 = ndp.gM2;
  const pre = !!w.sprezane && (cl === '8.8' || cl === '10.9');
  const s = NUT[d][pre ? 1 : 0], dm = (s + s * 2 / s3) / 2;
  const ks = otw === 'powiekszone' ? 0.85 : 1.0, mu = W.MU[w.pow] || 0.4, FpC = 0.7 * k.fub * b.As;
  const kat = pre ? (w.kat === 'B' || w.kat === 'C' ? w.kat : 'A') : 'A';
  return { d, dd: b.d, d0, A, As: b.As, fub: k.fub, fyb: k.fyb, av, cl, thread, otw, pre, kat, dm, s,
    Fv: av * k.fub * A / g2, Ft: 0.9 * k.fub * b.As / g2, FpC, ks, mu,
    Fs: ks * mu * FpC / (ndp.gM3 || 1.25), FsSer: ks * mu * FpC / (ndp.gM3ser || 1.1), kb: otw === 'powiekszone' ? 0.8 : 1 };
};
W.boltTxt = (B) => `${B.d} kl. ${B.cl}${B.pre ? ', sprężane' : ''}${B.otw === 'powiekszone' ? ', otwory powiększone' : ''} (d₀ = ${B.d0} mm${B.thread ? ', gwint w płaszczyźnie ścinania' : ', trzpień w płaszczyźnie ścinania'})`;
// docisk (tabl. 3.4): end – śruba skrajna w kierunku siły (e1), inaczej p1; edge – śruba przy krawędzi bocznej (e2), p2 – rozstaw prostopadle
W.Fb = function (B, t, fu, g2, o) {
  const ad = o.end ? o.e1 / (3 * B.d0) : o.p1 / (3 * B.d0) - 0.25;
  const ab = Math.max(0, Math.min(ad, B.fub / fu, 1));
  const p2 = o.p2 > 0 && isFinite(o.p2) ? o.p2 : Infinity, kIn = isFinite(p2) ? 1.4 * p2 / B.d0 - 1.7 : 2.5;
  const k1 = Math.max(0, o.edge && isFinite(o.e2) ? Math.min(2.8 * o.e2 / B.d0 - 1.7, kIn, 2.5) : Math.min(kIn, 2.5));
  return { Fb: B.kb * k1 * ab * fu * B.dd * t / g2, k1, ab, ad };
};
// długie złącza (3.8)
W.betaLf = (Lj, d) => (Lj > 15 * d ? U.clamp(1 - (Lj - 15 * d) / (200 * d), 0.75, 1) : 1);
// sprężysty rozkład sił w grupie śrub: V – pionowa (w dół +), H – pozioma, Mc – moment względem środka grupy
W.group = function (pts, V, H, Mc) {
  const n = pts.length, xc = pts.reduce((a, p) => a + p.x, 0) / n, zc = pts.reduce((a, p) => a + p.z, 0) / n;
  const Ip = pts.reduce((a, p) => a + (p.x - xc) ** 2 + (p.z - zc) ** 2, 0);
  return pts.map(p => { const dx = p.x - xc, dz = p.z - zc; const Fz = V / n + (Ip > 0 ? Mc * dx / Ip : 0), Fx = H / n - (Ip > 0 ? Mc * dz / Ip : 0); return Object.assign({}, p, { Fx, Fz, F: Math.hypot(Fx, Fz) }); });
};
// spoina pachwinowa – metoda kierunkowa (4.5.3.2)
W.fillet = function (fu, bw, g2, sp, tp, tl) {
  const s = Math.sqrt(sp * sp + 3 * (tp * tp + tl * tl)), R1 = fu / (bw * g2), R2 = 0.9 * fu / g2;
  return { s, R1, R2, u: Math.max(s / R1, Math.abs(sp) / R2) };
};
// spoina pełnonośna (dwustronna) dla blachy t: 2·a·fu/(βw·γM2·√2) ≥ t·fy/γM0
W.aFull = (t, fy, fu, bw, g0, g2) => t * fy * Math.SQRT2 * bw * g2 / (2 * fu * g0);
const bwOf = (gat) => (M.STAL[gat] || {}).bw || 0.9;
// spoina łącząca różne gatunki – właściwości słabszego materiału (4.5.3.2(6))
const weaker = (a, b) => (a.fu <= b.fu ? { fu: a.fu, bw: a.bw } : { fu: b.fu, bw: b.bw });
const steel = (gat, t, ndp) => { const g = M.STAL[gat] ? gat : 'S235'; const r = M.fy(g, Math.max(1, t || 10), ndp.fySrc); return { gat: g, fy: r.fy, fu: r.fu, bw: bwOf(g) }; };
// χ – krzywa d (α = 0,76), λ0 = 0,2
const chiD = (lam) => { if (lam <= 0.2) return 1; const ph = 0.5 * (1 + 0.76 * (lam - 0.2) + lam * lam); return Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lam * lam))); };

/* ---------------------------------------------------------- rejestr sprawdzeń połączenia */
function rec() {
  const o = { checks: [], detal: [], uwagi: [] };
  o.add = (grp, n, ref, Ed, Rd, unit, fx, extra) => { const u = Rd > 0 ? Math.abs(Ed) / Rd : (Math.abs(Ed) > 0 ? Infinity : 0); o.checks.push(Object.assign({ grp, n, ref, Ed, Rd, unit: unit || 'F', u, f: fx || '' }, extra || {})); return u; };
  o.ratio = (grp, n, ref, u, fx, extra) => o.checks.push(Object.assign({ grp, n, ref, Ed: u, Rd: 1, unit: '-', u, f: fx || '' }, extra || {}));
  // rozstaw (tabl. 3.3): min – wymaganie normy; max – wymaganie normy; zal – zalecenie (ciągliwość, montaż)
  o.dmin = (el, n, v, lim, typ) => { if (v === undefined || v === null || !isFinite(v)) return; o.detal.push({ el, n, v, lim, ok: v >= lim - 1e-6, typ: typ || 'min', rel: '≥' }); };
  o.dmax = (el, n, v, lim, typ) => { if (v === undefined || v === null || !isFinite(v) || !isFinite(lim)) return; o.detal.push({ el, n, v, lim, ok: v <= lim + 1e-6, typ: typ || 'max', rel: '≤' }); };
  return o;
}
// komplet warunków rozstawu dla blachy / kątownika / środnika (tabl. 3.3)
function spacing(o, el, B, t, g) {
  const d0 = B.d0;
  o.dmin(el, 'e₁ ≥ 1,2·d₀', g.e1, 1.2 * d0); o.dmin(el, 'e₂ ≥ 1,2·d₀', g.e2, 1.2 * d0);
  if (g.p1 !== undefined) { o.dmin(el, 'p₁ ≥ 2,2·d₀', g.p1, 2.2 * d0); o.dmax(el, 'p₁ ≤ min(14t; 200)', g.p1, Math.min(14 * t, 200)); }
  if (g.p2 !== undefined) { o.dmin(el, 'p₂ ≥ 2,4·d₀', g.p2, 2.4 * d0); o.dmax(el, 'p₂ ≤ min(14t; 200)', g.p2, Math.min(14 * t, 200)); }
  if (g.exp) { o.dmax(el, 'e₁ ≤ 4t + 40 (korozja)', g.e1, 4 * t + 40, 'zal'); o.dmax(el, 'e₂ ≤ 4t + 40 (korozja)', g.e2, 4 * t + 40, 'zal'); }
}
// przekrój podcięty belki – moduł sprężysty (wycięcie górne dnt i/lub dolne dnb)
function notchW(sec, dnt, dnb) {
  const h = sec.h, tw = sec.tw, rects = [];
  const tg = sec.tg || 0, td = sec.td || 0, bg = sec.bg || sec.b || 0, bd = sec.bd || sec.b || 0;
  if (!(dnb > 0)) rects.push([bd, td, 0]);
  if (!(dnt > 0)) rects.push([bg, tg, h - tg]);
  const z0 = dnb > 0 ? dnb : td, z1 = dnt > 0 ? h - dnt : h - tg;
  rects.push([tw, Math.max(0, z1 - z0), z0]);
  const A = rects.reduce((a, r) => a + r[0] * r[1], 0), zc = rects.reduce((a, r) => a + r[0] * r[1] * (r[2] + r[1] / 2), 0) / A;
  const I = rects.reduce((a, r) => a + r[0] * r[1] ** 3 / 12 + r[0] * r[1] * (r[2] + r[1] / 2 - zc) ** 2, 0);
  const zt = (dnt > 0 ? h - dnt : h) - zc, zb = zc - (dnb > 0 ? dnb : 0);
  return { A, I, W: I / Math.max(zt, zb), hr: (dnt > 0 ? h - dnt : h) - (dnb > 0 ? dnb : 0) };
}
// sprawdzenia środnika belki przy połączeniu (ścinanie netto, podcięcie, rozerwanie blokowe)
function beamWeb(o, ctx, B, V, lay) {
  const { sec, mat, ndp } = ctx, g0 = ndp.gM0, g2 = ndp.gM2, tw = sec.tw;
  const dnt = U.num(lay.dnt), dnb = U.num(lay.dnb), ln = U.num(lay.ln);
  const nr = lay.nr;
  if (dnt > 0 || dnb > 0) {
    const nw = notchW(sec, dnt, dnb);
    o.add('Belka', 'Środnik podcięty – ścinanie brutto', 'PN-EN 1993-1-1 6.2.6', V, nw.hr * tw * mat.fy / (s3 * g0), 'F', `Av = h_r·t_w = ${f(nw.hr, 0)}·${f(tw)} mm (h_r – wysokość po podcięciu)`);
    o.add('Belka', 'Środnik podcięty – ścinanie netto', 'PN-EN 1993-1-8 3.10', V, (nw.hr - nr * B.d0) * tw * mat.fu / (s3 * g2), 'F', `Av,net = (h_r − n_r·d₀)·t_w = (${f(nw.hr, 0)} − ${nr}·${B.d0})·${f(tw)}`);
    const e = ln + U.num(lay.gap);
    o.add('Belka', 'Przekrój podcięty – zginanie V·(l_n + g)', 'PN-EN 1993-1-1 6.2.5 (SCI P358)', V * e, nw.W * mat.fy / g0, 'M', `M = V·(l_n + g) = ${kN(V)}·${f(e, 0)} mm; W_el,N = ${f(nw.W / 1e3, 1)} cm³ (przekrój podcięty)`);
    if (dnt > 0 && lay.e1b > 0) {
      const Ant = Math.max(0, (lay.e2bt - (lay.nc - 0.5) * B.d0)) * tw, Anv = Math.max(0, lay.e1b + (nr - 1) * lay.p1 - (nr - 0.5) * B.d0) * tw;
      o.add('Belka', 'Środnik podcięty – rozerwanie blokowe', 'PN-EN 1993-1-8 3.10.2 (3.10)', V, 0.5 * mat.fu * Ant / g2 + mat.fy * Anv / (s3 * g0), 'F', `0,5·f_u·A_nt/γM2 + f_y·A_nv/(√3·γM0); A_nt = ${f(Ant, 0)} mm², A_nv = ${f(Anv, 0)} mm²`);
    }
    if (dnt > 0) { o.dmax('belka', 'głębokość podcięcia d_nt ≤ h/2', dnt, sec.h / 2, 'zal'); o.dmin('belka', 'odległość śruby od podcięcia e₁,b ≥ 1,2·d₀', lay.e1b, 1.2 * B.d0); }
  } else {
    const Av = sec.Avz || sec.hw * tw;
    o.add('Belka', 'Środnik – ścinanie przekroju netto w linii śrub', 'PN-EN 1993-1-1 6.2.6; 1-8 3.10', V, Math.max(0, Av - nr * B.d0 * tw) * mat.fu / (s3 * g2), 'F', `A_v,net = A_v − n_r·d₀·t_w = ${f(Av, 0)} − ${nr}·${B.d0}·${f(tw)} mm²`);
  }
}
/* ---------------------------------------------------------- wysokość środnika w świetle (między zaokrągleniami lub do podcięć) */
function webClear(sec, w) {
  const r = sec.r || 0, dnt = U.num(w && w.dnt), dnb = U.num(w && w.dnb);
  return sec.h - (dnt > 0 ? dnt : (sec.tg || 0) + r) - (dnb > 0 ? dnb : (sec.td || 0) + r);
}
W.webClear = webClear;
// element podpierający
function support(o, ctx, w, B, V, n, hp, extra) {
  const { ndp } = ctx, g2 = ndp.gM2, g0 = ndp.gM0, t = U.num(w.tsup, 0);
  if (!(t > 0)) return null;
  const sp = w.supGat && M.STAL[w.supGat] ? steel(w.supGat, t, ndp) : { fy: U.num(w.fysup, 235), fu: U.num(w.fusup, 360), gat: 'f_u = ' + U.num(w.fusup, 360) + ' MPa' };
  const fb = W.Fb(B, t, sp.fu, g2, { end: false, p1: extra && extra.p1 > 0 ? extra.p1 : 3 * B.d0, edge: false, p2: extra && extra.p2 });
  const R = n * Math.min(B.Fv * (extra && extra.planes || 1), fb.Fb);
  o.add('Podpora', 'Docisk śrub do elementu podpierającego', 'PN-EN 1993-1-8 tabl. 3.4', V, n * fb.Fb, 'F', `${W.PODPORA[w.sup] || 'element podpierający'}: t = ${f(t)} mm, ${sp.gat}: f_u = ${sp.fu} MPa; F_b,Rd = k₁·α_b·f_u·d·t/γM2 = ${f(fb.k1, 2)}·${f(fb.ab, 3)}·${sp.fu}·${B.dd}·${f(t)}/${f(g2, 2)} = ${kN(fb.Fb)} kN; n = ${n}`);
  if (w.sup === 'srodnik_slupa' || w.sup === 'srodnik_belki') {
    const Av = Math.max(0, hp - (extra && extra.nr || 1) * B.d0) * t;
    o.add('Podpora', 'Ścianka podpory – ścinanie lokalne netto', 'PN-EN 1993-1-8 3.10; SCI P358', V, Av * sp.fu / (s3 * g2), 'F', `A_v,net = (h_p − n_r·d₀)·t = ${f(Av, 0)} mm²`);
  }
  return { R, sp };
}
// T-króciec (6.2.4) – rozciąganie wiązania: m, n, Σl_eff, ΣF_t,Rd
function tstub(o, grp, m, n, leff, t, fy, g0, nb, B) {
  const Mpl = 0.25 * leff * t * t * fy / g0, Ft = nb * B.Ft;
  const F1 = m > 0 ? 4 * Mpl / m : Infinity, F2 = (2 * Mpl + n * Ft) / (m + n), F3 = Ft;
  return { F1, F2, F3, FT: Math.min(F1, F2, F3), Mpl, m, n, leff, mode: F1 <= Math.min(F2, F3) ? 1 : F2 <= F3 ? 2 : 3 };
}

/* =========================================================== BLACHA CZOŁOWA */
// w: hp, bp, tp, nr, e1, p1, e2, p3, a, d, kl, gwint, otw, sprezane, kat, pow, gatP, sup, tsup, supGat|fusup, pelna, Nt [kN]
W.endPlate = function (ctx, w, F) {
  const { sec, mat, ndp } = ctx, g0 = ndp.gM0, g1 = ndp.gM1, g2 = ndp.gM2;
  const o = rec(); o.typ = 'blacha_czolowa';
  const B = W.bolt(w, ndp), nr = Math.max(1, Math.round(U.num(w.nr, 2))), n = 2 * nr;
  const hp = U.num(w.hp), bp = U.num(w.bp), tp = U.num(w.tp), e1 = U.num(w.e1), p1 = U.num(w.p1), p3 = U.num(w.p3), a = U.num(w.a), e2 = bp > 0 ? (bp - p3) / 2 : U.num(w.e2), e1d = hp - e1 - (nr - 1) * p1;
  const pl = steel(w.gatP || mat.gatunek, tp, ndp), V = Math.abs(F.V), Nt = Math.max(0, U.num(F.Nt));
  o.B = B; o.pl = pl; o.n = n;
  // współrzędne śrub: x – od osi środnika, z – od górnej krawędzi blachy w dół
  const pts = []; for (let i = 0; i < nr; i++) for (const s of [-1, 1]) pts.push({ x: s * p3 / 2, z: e1 + i * p1, r: i, c: s < 0 ? 0 : 1 });
  o.bolts = W.group(pts, V, 0, 0);
  const Lj = (nr - 1) * p1, bL = W.betaLf(Lj, B.dd);
  // --- śruby i docisk (3.7: nośność grupy)
  const fbE = W.Fb(B, tp, pl.fu, g2, { end: true, e1, edge: true, e2, p2: p3 }), fbI = W.Fb(B, tp, pl.fu, g2, { end: false, p1, edge: true, e2, p2: p3 });
  const nEnd = nr === 1 ? 2 : 2, nIn = n - nEnd;  // śruby skrajne – dolny rząd (siła w dół na blachę), pozostałe pośrednie
  const FbPl = nEnd * fbE.Fb + nIn * fbI.Fb;
  o.add('Śruby', 'Ścinanie śrub (0,8·n·F_v,Rd – udział rozciągania od mimośrodu)', 'PN-EN 1993-1-8 tabl. 3.4; 3.8; SCI P358', V, 0.8 * n * B.Fv * bL, 'F',
    `F_v,Rd = α_v·f_ub·A/γM2 = ${f(B.av, 1)}·${B.fub}·${f(B.A, 0)}/${f(g2, 2)} = ${kN(B.Fv)} kN; 0,8·${n}·${kN(B.Fv)}${bL < 1 ? `·β_Lf(${f(bL, 3)})` : ''} = ${kN(0.8 * n * B.Fv * bL)} kN`);
  o.add('Śruby', 'Docisk śrub do blachy czołowej', 'PN-EN 1993-1-8 tabl. 3.4', V, FbPl, 'F',
    `skrajne (e₁ = ${f(e1, 0)}): k₁ = ${f(fbE.k1, 2)}, α_b = ${f(fbE.ab, 3)}, F_b = ${kN(fbE.Fb)} kN × ${nEnd}${nIn ? `; pośrednie (p₁ = ${f(p1, 0)}): k₁ = ${f(fbI.k1, 2)}, α_b = ${f(fbI.ab, 3)}, F_b = ${kN(fbI.Fb)} kN × ${nIn}` : ''}; blacha ${pl.gat} t = ${f(tp)} mm, f_u = ${pl.fu} MPa`);
  const sup = support(o, ctx, w, B, V, n, hp, { p1, p2: p3, nr });
  const minPer = Math.min(B.Fv, fbE.Fb, nIn ? fbI.Fb : Infinity, sup ? sup.R / n : Infinity);
  const grp = B.Fv >= Math.max(fbE.Fb, nIn ? fbI.Fb : 0) ? Math.min(FbPl, sup ? sup.R : Infinity) : n * minPer;
  o.add('Śruby', 'Nośność grupy łączników', 'PN-EN 1993-1-8 3.7(1)', V, grp, 'F', B.Fv >= Math.max(fbE.Fb, nIn ? fbI.Fb : 0) ? `F_v,Rd ≥ F_b,Rd każdej śruby → ΣF_b,Rd = ${kN(grp)} kN` : `n·min(F_v,Rd; F_b,Rd) = ${n}·${kN(minPer)} = ${kN(grp)} kN`);
  slip(o, B, V, F.Vser, n);
  // --- blacha
  o.add('Blacha czołowa', 'Ścinanie przekroju brutto (2 płaszczyzny)', 'PN-EN 1993-1-1 6.2.6; SCI P358 (1,27)', V, 2 * hp * tp * pl.fy / (1.27 * s3 * g0), 'F', `2·h_p·t_p·f_y/(1,27·√3·γM0) = 2·${f(hp, 0)}·${f(tp)}·${pl.fy}/(1,27·√3·${f(g0, 2)}) – współczynnik 1,27 uwzględnia zginanie w płaszczyźnie blachy`);
  o.add('Blacha czołowa', 'Ścinanie przekroju netto', 'PN-EN 1993-1-8 3.10; 1-1 6.2.6', V, 2 * (hp - nr * B.d0) * tp * pl.fu / (s3 * g2), 'F', `2·(h_p − n_r·d₀)·t_p·f_u/(√3·γM2) = 2·(${f(hp, 0)} − ${nr}·${B.d0})·${f(tp)}·${pl.fu}/(√3·${f(g2, 2)})`);
  const Ant = (e2 - B.d0 / 2) * tp, Anv = (hp - e1 - (nr - 0.5) * B.d0) * tp;
  o.add('Blacha czołowa', 'Rozerwanie blokowe (2 bloki)', 'PN-EN 1993-1-8 3.10.2 (3.10)', V, 2 * (0.5 * pl.fu * Ant / g2 + pl.fy * Anv / (s3 * g0)), 'F', `2·(0,5·f_u·A_nt/γM2 + f_y·A_nv/(√3·γM0)); A_nt = (e₂ − d₀/2)·t_p = ${f(Ant, 0)} mm², A_nv = (h_p − e₁ − (n_r − 0,5)·d₀)·t_p = ${f(Anv, 0)} mm²`);
  // --- belka
  o.add('Belka', 'Środnik belki – ścinanie na wysokości blachy', 'PN-EN 1993-1-1 6.2.6', V, hp * sec.tw * mat.fy / (s3 * g0), 'F', `A_v = h_p·t_w = ${f(hp, 0)}·${f(sec.tw)} mm²`);
  if (U.num(w.dnt) > 0 || U.num(w.dnb) > 0) { const nw = notchW(sec, U.num(w.dnt), U.num(w.dnb)); o.add('Belka', 'Środnik podcięty – ścinanie brutto', 'PN-EN 1993-1-1 6.2.6', V, nw.hr * sec.tw * mat.fy / (s3 * g0), 'F', `h_r = ${f(nw.hr, 0)} mm`); }
  // --- spoiny środnik–blacha (dwustronne)
  const wk = weaker(pl, { fu: mat.fu, bw: bwOf(mat.gatunek) }), bw = wk.bw, fuW = wk.fu, Lw = Math.max(1, hp - 2 * a);
  const tl = V / (2 * a * Lw), wf = W.fillet(fuW, bw, g2, 0, 0, tl);
  o.add('Spoiny', 'Spoiny pachwinowe środnik–blacha (ścinanie τ∥)', 'PN-EN 1993-1-8 4.5.3.2 (4.1)', wf.s, wf.R1, 'MPa', `τ∥ = V/(2·a·l_w) = ${kN(V)}·10³/(2·${f(a)}·${f(Lw, 0)}) = ${f(tl)} MPa; √(3τ∥²) = ${f(wf.s)} ≤ f_u/(β_w·γM2) = ${fuW}/(${f(bw, 2)}·${f(g2, 2)}) = ${f(wf.R1)} MPa`);
  const aF = W.aFull(sec.tw, mat.fy, fuW, bw, g0, g2);
  o.dmin('spoiny', `a ≥ a_pełnonośna środnika = ${f(aF)} mm (zalecenie SCI – ciągliwość)`, a, aF, 'zal');
  o.dmin('spoiny', 'a ≥ 3 mm', a, 3);
  // --- wiązanie (rozciąganie) – sytuacja wyjątkowa, osobno od ścinania
  if (Nt > 0) {
    const m = Math.max(1, (p3 - sec.tw) / 2 - 0.8 * a * Math.SQRT2), nn = Math.min(e2, 1.25 * m);
    const Bp = 0.6 * Math.PI * B.dm * tp * pl.fu / g2, Bt = Object.assign({}, B, { Ft: Math.min(B.Ft, Bp) });
    const T = tstub(o, 'Wiązanie', m, nn, 2 * hp, tp, pl.fy, g0, n, Bt);
    o.add('Wiązanie (N_t)', 'Blacha czołowa jako T-króciec – rozciąganie', 'PN-EN 1993-1-8 6.2.4, tabl. 6.2', Nt, T.FT, 'F', `m = ${f(m)} mm, n = ${f(nn)} mm, Σl_eff = 2·h_p = ${f(2 * hp, 0)} mm; F_T,1 = ${kN(T.F1)}, F_T,2 = ${kN(T.F2)}, F_T,3 = ΣF_t,Rd = ${kN(T.F3)} kN (F_t,Rd = min(0,9·f_ub·A_s/γM2; B_p,Rd = 0,6·π·d_m·t_p·f_u/γM2 = ${kN(Bp)} kN)) → postać ${T.mode}`);
    o.add('Wiązanie (N_t)', 'Środnik belki – rozciąganie na wysokości blachy', 'PN-EN 1993-1-8 6.2.6.8', Nt, hp * sec.tw * mat.fy / g0, 'F', `h_p·t_w·f_y/γM0`);
    const sw = Nt / (2 * a * Lw), wt = W.fillet(fuW, bw, g2, sw / Math.SQRT2, sw / Math.SQRT2, 0);
    o.add('Wiązanie (N_t)', 'Spoiny środnik–blacha – rozciąganie', 'PN-EN 1993-1-8 4.5.3.2', wt.s, wt.R1, 'MPa', `σ_w = N_t/(2·a·l_w) = ${f(sw)} MPa; σ⊥ = τ⊥ = σ_w/√2`, { u: wt.u });
    o.uwagi.push('Siła wiązania N_t – sytuacja wyjątkowa (integralność konstrukcji); sprawdzana niezależnie od siły poprzecznej (PN-EN 1991-1-7, zał. A).');
  }
  // --- konstrukcja i ciągliwość
  spacing(o, 'blacha czołowa', B, tp, { e1, e2, p1: nr > 1 ? p1 : undefined, p2: p3, exp: w.exp });
  o.dmin('blacha czołowa', 'otwory w obrysie blachy: e₁,dół = h_p − e₁ − (n_r − 1)·p₁ ≥ 1,2·d₀', e1d, 1.2 * B.d0);
  o.dmin('blacha czołowa', 'otwór poza spoiną środnika: (p₃ − t_w)/2 − a√2 ≥ d₀/2', (p3 - sec.tw) / 2 - a * Math.SQRT2, B.d0 / 2);
  const tpMax = (pl.fy <= 275 ? 0.5 : 0.42) * B.dd * (B.cl === '10.9' ? 0.85 : 1);
  o.dmax('blacha czołowa', `t_p ≤ ${pl.fy <= 275 ? '0,5' : '0,42'}·d (zdolność do obrotu przegubu)`, tp, tpMax, 'zal');
  o.dmin('blacha czołowa', 'h_p ≥ 0,6·h_b (stężenie skrętne końca belki)', hp, 0.6 * sec.h, 'zal');
  o.dmax('blacha czołowa', w.pelna ? 'h_p ≤ h (blacha w obrysie belki)' : 'h_p ≤ h − 2(t_f + r) (blacha w obrysie środnika)', hp, w.pelna ? sec.h : sec.h - (sec.tg || 0) - (sec.td || 0) - 2 * (sec.r || 0));
  o.dmin('blacha czołowa', 'odstęp śruby od spoiny (p₃ − t_w)/2 − a√2 ≥ 0,5·s (klucz)', (p3 - sec.tw) / 2 - a * Math.SQRT2, 0.5 * B.s, 'zal');
  o.dmax('blacha czołowa', 'b_p ≤ szerokość pasa belki + 10 mm', bp, Math.min(sec.bg || sec.b || 1e9, sec.bd || sec.b || 1e9) + 10, 'zal');
  o.mass = 7.85e-6 * hp * bp * tp; o.nb = n; o.weldL = 2 * hp; o.geom = { hp, bp, tp, nr, e1, p1, e2, p3, a, e1d, pelna: !!w.pelna };
  return fin(o);
};

/* ---------------------------------------------------------- poślizg (kat. B, C) */
function slip(o, B, V, Vser, n, planes, lab) {
  planes = planes || 1; lab = lab ? ` – ${lab}` : '';
  if (!B.pre || B.kat === 'A') return;
  if (B.kat === 'C') o.add('Śruby', `Nośność na poślizg w SGN (kat. C)${lab}`, 'PN-EN 1993-1-8 3.9.1 (3.6)', V, n * planes * B.Fs, 'F', `F_s,Rd = k_s·n·μ·F_p,C/γM3 = ${f(B.ks, 2)}·${planes}·${f(B.mu, 2)}·0,7·${B.fub}·${f(B.As, 0)}/γM3 = ${kN(B.Fs * planes)} kN na śrubę`);
  else { const Vs = Vser > 0 ? Vser : V / 1.4; o.add('Śruby', `Nośność na poślizg w SGU (kat. B)${lab}`, 'PN-EN 1993-1-8 3.9.1 (3.6)', Vs, n * planes * B.FsSer, 'F', `V_Ed,ser = ${kN(Vs)} kN${Vser > 0 ? ' (reakcja charakterystyczna)' : ' (≈ V_Ed/1,4)'}; F_s,Rd,ser = ${kN(B.FsSer * planes)} kN na śrubę`); }
}
// sprawdzenie najbardziej obciążonej śruby grupy mimośrodowej: ścinanie i docisk w 2 kierunkach (interakcja)
function boltGroupChecks(o, grpName, B, bolts, planes, bL, plates, ndp, label) {
  const g2 = ndp.gM2, Fv = B.Fv * planes * bL;
  let wv = bolts[0]; bolts.forEach(b => { if (b.F > wv.F) wv = b; });
  o.add(grpName, `${label}: ścinanie najbardziej obciążonej śruby`, 'PN-EN 1993-1-8 tabl. 3.4; 3.8', wv.F, Fv, 'F', `F = √(F_x² + F_z²) = √(${kN(wv.Fx)}² + ${kN(wv.Fz)}²) = ${kN(wv.F)} kN; F_v,Rd = ${planes > 1 ? `${planes}·` : ''}α_v·f_ub·A/γM2${bL < 1 ? '·β_Lf' : ''} = ${kN(Fv)} kN`);
  plates.forEach(pl => {
    let worst = null;
    bolts.forEach(b => {
      const gz = pl.geomZ(b), gx = pl.geomX(b);
      const fz = W.Fb(B, pl.t, pl.fu, g2, gz), fx = W.Fb(B, pl.t, pl.fu, g2, gx);
      const u = Math.sqrt((b.Fz / Math.max(1e-9, fz.Fb)) ** 2 + (b.Fx / Math.max(1e-9, fx.Fb)) ** 2);
      if (!worst || u > worst.u) worst = { u, b, fz, fx };
    });
    const q = worst;
    o.ratio(grpName, `Docisk – ${pl.n} (interakcja pion / poziom)`, 'PN-EN 1993-1-8 tabl. 3.4', q.u, `(F_z/F_b,z)² + (F_x/F_b,x)² ≤ 1: śruba ${q.b.id || ''}: F_z = ${kN(q.b.Fz)} kN, F_b,z = ${kN(q.fz.Fb)} kN (k₁ = ${f(q.fz.k1, 2)}, α_b = ${f(q.fz.ab, 3)}); F_x = ${kN(q.b.Fx)} kN, F_b,x = ${kN(q.fx.Fb)} kN (k₁ = ${f(q.fx.k1, 2)}, α_b = ${f(q.fx.ab, 3)}); t = ${f(pl.t)} mm, f_u = ${pl.fu} MPa`);
  });
  return wv;
}

/* =========================================================== BLACHA ŻEBROWA */
// w: hp, tp, nr|n, nc, e1, p1, e2, p2, z, e2b, a, śruby…, gatP, sup, tsup, dnt, dnb, ln, e1b, Nt
W.finPlate = function (ctx, w, F) {
  const { sec, mat, ndp } = ctx, g0 = ndp.gM0, g1 = ndp.gM1, g2 = ndp.gM2;
  const o = rec(); o.typ = 'blacha_zebrowa';
  const B = W.bolt(w, ndp), nr = Math.max(1, Math.round(U.num(w.nr, U.num(w.n, 3)))), nc = U.clamp(Math.round(U.num(w.nc, 1)), 1, 2), n = nr * nc;
  const hp = U.num(w.hp), tp = U.num(w.tp), e1 = U.num(w.e1), p1 = U.num(w.p1), e2 = U.num(w.e2), p2 = nc > 1 ? U.num(w.p2, 3 * B.dd) : 0, z = U.num(w.z), e2b = U.num(w.e2b), a = U.num(w.a);
  const pl = steel(w.gatP || mat.gatunek, tp, ndp), V = Math.abs(F.V), Nt = Math.max(0, U.num(F.Nt));
  const zc = z + (nc - 1) * p2 / 2, gap = Math.max(0, z - e2b), wk = weaker(pl, { fu: mat.fu, bw: bwOf(mat.gatunek) }), bw = wk.bw, fuW = wk.fu;
  o.B = B; o.pl = pl; o.n = n;
  // x – od lica podpory, z – od górnej krawędzi blachy w dół
  const pts = []; let id = 0;
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) pts.push({ id: ++id, x: z + j * p2, z: e1 + i * p1, r: i, c: j });
  const bolts = W.group(pts, V, 0, V * zc); o.bolts = bolts;
  const bL = W.betaLf((nr - 1) * p1, B.dd);
  // geometria docisku: blacha – siła z w dół (koniec: dolny rząd, e₁), siła x – krawędź swobodna blachy (e₂ za ostatnią kolumną)
  const plateG = { n: 'blacha żebrowa', t: tp, fu: pl.fu,
    geomZ: (b) => ({ end: b.r === nr - 1, e1, p1, edge: b.c === nc - 1 || b.c === 0, e2: b.c === nc - 1 ? e2 : Infinity, p2: nc > 1 ? p2 : Infinity }),
    geomX: (b) => ({ end: b.c === nc - 1, e1: e2, p1: p2 || 3 * B.d0, edge: b.r === 0 || b.r === nr - 1, e2: e1, p2: nr > 1 ? p1 : Infinity }) };
  const notT = U.num(w.dnt) > 0, e1b = U.num(w.e1b, 60);
  const webG = { n: 'środnik belki', t: sec.tw, fu: mat.fu,
    geomZ: (b) => ({ end: notT && b.r === 0, e1: e1b, p1: nr > 1 ? p1 : 3 * B.d0, edge: false, p2: nc > 1 ? p2 : Infinity }),
    geomX: (b) => ({ end: b.c === 0, e1: e2b, p1: p2 || 3 * B.d0, edge: false, p2: nr > 1 ? p1 : Infinity }) };
  boltGroupChecks(o, 'Śruby', B, bolts, 1, bL, [plateG, webG], ndp, 'Śruby w środniku (mimośród z_c = ' + f(zc, 0) + ' mm)');
  slip(o, B, V, F.Vser, n);
  // --- blacha
  o.add('Blacha żebrowa', 'Ścinanie przekroju brutto', 'PN-EN 1993-1-1 6.2.6; SCI P358 (1,27)', V, hp * tp * pl.fy / (1.27 * s3 * g0), 'F', `h_p·t_p·f_y/(1,27·√3·γM0) = ${f(hp, 0)}·${f(tp)}·${pl.fy}/(1,27·√3·${f(g0, 2)})`);
  o.add('Blacha żebrowa', 'Ścinanie przekroju netto', 'PN-EN 1993-1-8 3.10', V, (hp - nr * B.d0) * tp * pl.fu / (s3 * g2), 'F', `(h_p − n_r·d₀)·t_p·f_u/(√3·γM2) = (${f(hp, 0)} − ${nr}·${B.d0})·${f(tp)}·${pl.fu}/(√3·${f(g2, 2)})`);
  const Ant = (e2 + (nc - 1) * p2 - (nc - 0.5) * B.d0) * tp, Anv = (hp - e1 - (nr - 0.5) * B.d0) * tp;
  o.add('Blacha żebrowa', 'Rozerwanie blokowe', 'PN-EN 1993-1-8 3.10.2 (3.10)', V, 0.5 * pl.fu * Ant / g2 + pl.fy * Anv / (s3 * g0), 'F', `0,5·f_u·A_nt/γM2 + f_y·A_nv/(√3·γM0); A_nt = ${f(Ant, 0)} mm², A_nv = ${f(Anv, 0)} mm²`);
  const Wel = tp * hp * hp / 6;
  if (hp < 2.73 * zc) o.add('Blacha żebrowa', 'Zginanie blachy (V·z_c)', 'PN-EN 1993-1-1 6.2.5; SCI P358', V * zc, Wel * pl.fy / g0, 'M', `h_p = ${f(hp, 0)} < 2,73·z_c = ${f(2.73 * zc, 0)} mm → M = V·z_c = ${kN(V)}·${f(zc, 0)}; W_el = t_p·h_p²/6 = ${f(Wel / 1e3, 1)} cm³`);
  else o.uwagi.push(`Blacha żebrowa: h_p ≥ 2,73·z_c – zginanie blachy nie jest decydujące (SCI P358).`);
  if (zc > tp / 0.15) {
    const lam = 2.8 * Math.sqrt(zc * hp / (1.5 * tp * tp)) / (93.9 * Math.sqrt(235 / pl.fy)), chi = chiD(lam);
    o.add('Blacha żebrowa', 'Zwichrzenie długiej blachy żebrowej', 'PN-EN 1993-1-1 6.3.2 (krzywa d); SCI P358', V * zc, chi * Wel * pl.fy / g1, 'M', `z_c = ${f(zc, 0)} > t_p/0,15 = ${f(tp / 0.15, 0)} mm; λ̄_LT = 2,8·√(z_c·h_p/(1,5·t_p²))/(93,9ε) = ${f(lam, 3)}; χ_LT = ${f(chi, 3)}`);
  }
  // --- belka
  beamWeb(o, ctx, B, V, { nr, nc, p1, dnt: w.dnt, dnb: w.dnb, ln: w.ln, gap, e1b, e2bt: e2b + (nc - 1) * p2 + (B.d0 / 2) * 0 });
  // --- spoiny blachy do podpory (V i moment V·z_c)
  const Lw = Math.max(1, hp - 2 * a), tl = V / (2 * a * Lw), sw = 6 * V * zc / (2 * a * Lw * Lw), wf = W.fillet(fuW, bw, g2, sw / Math.SQRT2, sw / Math.SQRT2, tl);
  o.add('Spoiny', 'Spoiny blachy do podpory (V + V·z_c)', 'PN-EN 1993-1-8 4.5.3.2 (4.1)', wf.s, wf.R1, 'MPa', `τ∥ = V/(2a·l_w) = ${f(tl)} MPa; σ_w = 6·V·z_c/(2a·l_w²) = ${f(sw)} MPa → σ⊥ = τ⊥ = ${f(sw / Math.SQRT2)} MPa; √(σ⊥² + 3(τ⊥² + τ∥²)) = ${f(wf.s)} ≤ ${f(wf.R1)} MPa`, { u: wf.u });
  const aF = W.aFull(tp, pl.fy, fuW, bw, g0, g2);
  o.dmin('spoiny', `a ≥ a_pełnonośna blachy = ${f(aF)} mm (SCI – spoina silniejsza od blachy)`, a, aF, 'zal');
  o.dmin('spoiny', 'a ≥ 3 mm', a, 3);
  // --- podpora
  const t = U.num(w.tsup, 0);
  if (t > 0) {
    const sp = w.supGat && M.STAL[w.supGat] ? steel(w.supGat, t, ndp) : { fy: U.num(w.fysup, 235), fu: U.num(w.fusup, 360), gat: '' };
    o.add('Podpora', 'Ścianka podpory – ścinanie lokalne przy spoinach', 'PN-EN 1993-1-1 6.2.6; SCI P358', V, 2 * hp * t * sp.fy / (s3 * g0), 'F', `2·h_p·t·f_y/(√3·γM0) = 2·${f(hp, 0)}·${f(t)}·${sp.fy}/(√3·${f(g0, 2)})`);
    o.dmax('podpora', `t_p ≤ t·f_u,s/(f_y,p·γM2) = ${f(t * sp.fu / (pl.fy * g2))} mm (przebicie ścianki podpory)`, tp, t * sp.fu / (pl.fy * g2), 'zal');
  }
  // --- wiązanie
  if (Nt > 0) {
    const tieB = W.group(pts, 0, Nt, 0);
    boltGroupChecks(o, 'Wiązanie (N_t)', B, tieB.map(b => Object.assign(b, { Fz: 0, F: Math.abs(b.Fx) })), 1, 1, [plateG, webG], ndp, 'Wiązanie');
    o.add('Wiązanie (N_t)', 'Blacha – rozciąganie przekroju netto', 'PN-EN 1993-1-1 6.2.3', Nt, 0.9 * (hp - nr * B.d0) * tp * pl.fu / g2, 'F', `0,9·A_net·f_u/γM2, A_net = (h_p − n_r·d₀)·t_p`);
    o.add('Wiązanie (N_t)', 'Środnik belki – rozciąganie netto', 'PN-EN 1993-1-1 6.2.3', Nt, 0.9 * (hp - nr * B.d0) * sec.tw * mat.fu / g2, 'F', `0,9·(h_p − n_r·d₀)·t_w·f_u/γM2`);
    const swt = Nt / (2 * a * Lw), wt = W.fillet(fuW, bw, g2, swt / Math.SQRT2, swt / Math.SQRT2, 0);
    o.add('Wiązanie (N_t)', 'Spoiny – rozciąganie', 'PN-EN 1993-1-8 4.5.3.2', wt.s, wt.R1, 'MPa', `σ_w = N_t/(2a·l_w) = ${f(swt)} MPa`, { u: wt.u });
  }
  // --- konstrukcja
  spacing(o, 'blacha żebrowa', B, tp, { e1, e2, p1: nr > 1 ? p1 : undefined, p2: nc > 1 ? p2 : undefined, exp: w.exp });
  o.dmin('blacha żebrowa', 'otwory w obrysie blachy: e₁,dół = h_p − e₁ − (n_r − 1)·p₁ ≥ 1,2·d₀', hp - e1 - (nr - 1) * p1, 1.2 * B.d0);
  o.dmax('blacha żebrowa', 'h_p ≤ wysokość środnika w świetle (otwory w środniku belki)', hp, webClear(sec, w));
  spacing(o, 'środnik belki', B, sec.tw, { e2: e2b, p1: undefined });
  o.dmax('blacha żebrowa', 't_p ≤ 0,5·d (ciągliwość – SCI)', tp, 0.5 * B.dd, 'zal');
  o.dmin('blacha żebrowa', 'e₂ ≥ 2·d (ciągliwość – SCI)', e2, 2 * B.dd, 'zal');
  o.dmin('środnik belki', 'e₂,b ≥ 2·d (ciągliwość – SCI)', e2b, 2 * B.dd, 'zal');
  o.dmin('blacha żebrowa', 'h_p ≥ 0,6·h_b (stężenie skrętne)', hp, 0.6 * sec.h, 'zal');
  o.dmin('blacha żebrowa', 'szczelina belka–podpora g = z − e₂,b ≥ 10 mm', gap, 10, 'zal');
  o.mass = 7.85e-6 * hp * (z + (nc - 1) * p2 + e2) * tp; o.nb = n; o.weldL = 2 * hp;
  o.geom = { hp, tp, nr, nc, e1, p1, e2, p2, z, e2b, a, gap, zc };
  return fin(o);
};

/* =========================================================== KĄTOWNIKI PODWÓJNE */
// w: L ('90x90x10'), Lser ('L'|'LN'), dlugiNaPodp, hp, nr, e1, p1, gb, gs, gap (c), śruby, gatP, sup, tsup, dnt, dnb, ln, e1b, Nt
W.cleats = function (ctx, w, F) {
  const { sec, mat, ndp } = ctx, g0 = ndp.gM0, g2 = ndp.gM2;
  const o = rec(); o.typ = 'katowniki';
  const ser = w.Lser === 'LN' ? 'LN' : 'L', row = (P.KAT[ser] || {})[w.L] || P.KAT.L['90x9'];
  const longSup = ser === 'LN' && !!w.dlugiNaPodp, lb = longSup ? row[1] : row[0], ls = longSup ? row[0] : row[1], ta = row[2], ra = row[3];
  const B = W.bolt(w, ndp), nr = Math.max(1, Math.round(U.num(w.nr, 3)));
  const hp = U.num(w.hp), e1 = U.num(w.e1), p1 = U.num(w.p1), gb = U.num(w.gb, Math.round(lb * 0.55)), gs = U.num(w.gs, Math.round(ls * 0.55)), gap = U.num(w.gap, 10);
  const pl = steel(w.gatP || 'S235', ta, ndp), V = Math.abs(F.V), Nt = Math.max(0, U.num(F.Nt));
  const e2b = gb - gap, eb = lb - gb, es = ls - gs;
  o.B = B; o.pl = pl; o.n = 3 * nr; o.ang = { ser, nr: w.L, lb, ls, ta, ra };
  // strona belki: jedna kolumna, x – od lica podpory (pięta kątownika przy podporze)
  const pts = []; for (let i = 0; i < nr; i++) pts.push({ id: i + 1, x: gb, z: e1 + i * p1, r: i, c: 0 });
  const bolts = W.group(pts, V, 0, V * gb); o.bolts = bolts;
  const bL = W.betaLf((nr - 1) * p1, B.dd);
  const angB = { n: 'kątowniki – ramię na belce (2·t_a)', t: 2 * ta, fu: pl.fu,
    geomZ: (b) => ({ end: b.r === nr - 1, e1, p1, edge: true, e2: eb, p2: Infinity }),
    geomX: (b) => ({ end: true, e1: eb, edge: b.r === 0 || b.r === nr - 1, e2: e1, p2: nr > 1 ? p1 : Infinity }) };
  const notT = U.num(w.dnt) > 0, e1b = U.num(w.e1b, 60);
  const webG = { n: 'środnik belki', t: sec.tw, fu: mat.fu,
    geomZ: (b) => ({ end: notT && b.r === 0, e1: e1b, p1: nr > 1 ? p1 : 3 * B.d0, edge: false, p2: Infinity }),
    geomX: (b) => ({ end: true, e1: e2b, edge: false, p2: nr > 1 ? p1 : Infinity }) };
  boltGroupChecks(o, 'Śruby', B, bolts, 2, bL, [angB, webG], ndp, 'Śruby w środniku – dwucięte (mimośród g_b = ' + f(gb, 0) + ' mm)');
  slip(o, B, V, F.Vser, nr, 2, 'śruby w środniku');
  // strona podpory: 2·n_r śrub jednociętych
  const ns = 2 * nr, Fs = V / ns;
  o.add('Śruby', 'Śruby w podporze – ścinanie (jednocięte)', 'PN-EN 1993-1-8 tabl. 3.4', Fs, B.Fv * bL, 'F', `F = V/(2·n_r) = ${kN(V)}/${ns} = ${kN(Fs)} kN (mimośród ramienia na podporze pominięto – SCI P358); F_v,Rd = ${kN(B.Fv)} kN`);
  const fsE = W.Fb(B, ta, pl.fu, g2, { end: true, e1, edge: true, e2: es }), fsI = W.Fb(B, ta, pl.fu, g2, { end: false, p1, edge: true, e2: es });
  o.add('Śruby', 'Docisk – kątowniki, ramię na podporze', 'PN-EN 1993-1-8 tabl. 3.4', V, 2 * (fsE.Fb + (nr - 1) * (nr > 1 ? fsI.Fb : 0)), 'F', `2 kątowniki × (śruba skrajna F_b = ${kN(fsE.Fb)} kN${nr > 1 ? ` + ${nr - 1} × ${kN(fsI.Fb)} kN` : ''}); e₂ (do krawędzi ramienia) = ${f(es, 0)} mm`);
  support(o, ctx, w, B, V, ns, hp, { p1, p2: sec.tw + 2 * gs, nr });
  slip(o, B, V, F.Vser, ns, 1, 'śruby w podporze');
  // --- kątowniki
  o.add('Kątowniki', 'Ścinanie przekroju brutto (2 kątowniki)', 'PN-EN 1993-1-1 6.2.6; SCI P358 (1,27)', V, 2 * hp * ta * pl.fy / (1.27 * s3 * g0), 'F', `2·h_p·t_a·f_y/(1,27·√3·γM0) = 2·${f(hp, 0)}·${f(ta)}·${pl.fy}/(1,27·√3)`);
  o.add('Kątowniki', 'Ścinanie przekroju netto', 'PN-EN 1993-1-8 3.10', V, 2 * (hp - nr * B.d0) * ta * pl.fu / (s3 * g2), 'F', `2·(h_p − n_r·d₀)·t_a·f_u/(√3·γM2)`);
  const blk = (e) => { const Ant = (e - B.d0 / 2) * ta, Anv = (hp - e1 - (nr - 0.5) * B.d0) * ta; return { R: 2 * (0.5 * pl.fu * Ant / g2 + pl.fy * Anv / (s3 * g0)), Ant, Anv }; };
  const bb = blk(eb), bs = blk(es);
  o.add('Kątowniki', 'Rozerwanie blokowe – ramię na belce', 'PN-EN 1993-1-8 3.10.2', V, bb.R, 'F', `2·(0,5·f_u·A_nt/γM2 + f_y·A_nv/(√3·γM0)); A_nt = ${f(bb.Ant, 0)}, A_nv = ${f(bb.Anv, 0)} mm²`);
  o.add('Kątowniki', 'Rozerwanie blokowe – ramię na podporze', 'PN-EN 1993-1-8 3.10.2', V, bs.R, 'F', `A_nt = ${f(bs.Ant, 0)}, A_nv = ${f(bs.Anv, 0)} mm²`);
  if (hp < 2.73 * gb) o.add('Kątowniki', 'Zginanie ramion na belce (V·g_b)', 'PN-EN 1993-1-1 6.2.5', V * gb, 2 * ta * hp * hp / 6 * pl.fy / g0, 'M', `W_el = 2·t_a·h_p²/6 = ${f(2 * ta * hp * hp / 6 / 1e3, 1)} cm³`);
  // --- belka
  beamWeb(o, ctx, B, V, { nr, nc: 1, p1, dnt: w.dnt, dnb: w.dnb, ln: w.ln, gap, e1b, e2bt: e2b });
  // --- wiązanie
  if (Nt > 0) {
    const m = Math.max(1, gs - ta - 0.8 * ra), nn = Math.min(es, 1.25 * m);
    const Bp = 0.6 * Math.PI * B.dm * ta * pl.fu / g2, Bt = Object.assign({}, B, { Ft: Math.min(B.Ft, Bp) });
    const T = tstub(o, '', m, nn, 2 * hp, ta, pl.fy, g0, ns, Bt);
    o.add('Wiązanie (N_t)', 'Ramiona kątowników na podporze jako T-króciec', 'PN-EN 1993-1-8 6.2.4 (SCI P358)', Nt, T.FT, 'F', `m = g_s − t_a − 0,8r = ${f(m)} mm, n = ${f(nn)} mm, Σl_eff = 2·h_p; F_T,1 = ${kN(T.F1)}, F_T,2 = ${kN(T.F2)}, F_T,3 = ${kN(T.F3)} kN → postać ${T.mode}`);
    o.add('Wiązanie (N_t)', 'Śruby w środniku – ścinanie (dwucięte)', 'PN-EN 1993-1-8 tabl. 3.4', Nt / nr, 2 * B.Fv, 'F', `N_t/n_r = ${kN(Nt / nr)} kN`);
  }
  // --- konstrukcja
  spacing(o, 'kątowniki (ramię na belce)', B, ta, { e1, e2: eb, p1: nr > 1 ? p1 : undefined, exp: w.exp });
  spacing(o, 'kątowniki (ramię na podporze)', B, ta, { e1, e2: es, p1: nr > 1 ? p1 : undefined });
  o.dmin('kątowniki', 'otwory w obrysie kątowników: e₁,dół = h_p − e₁ − (n_r − 1)·p₁ ≥ 1,2·d₀', hp - e1 - (nr - 1) * p1, 1.2 * B.d0);
  o.dmin('kątowniki', 'otwór poza zaokrągleniem: g_b ≥ t_a + r + d₀/2', gb, ta + ra + B.d0 / 2);
  o.dmin('kątowniki', 'otwór poza zaokrągleniem: g_s ≥ t_a + r + d₀/2', gs, ta + ra + B.d0 / 2);
  o.dmin('środnik belki', 'e₂,b = g_b − c ≥ 1,2·d₀', e2b, 1.2 * B.d0);
  o.dmin('kątowniki', 'g_b ≥ t_a + r + 0,5·s (dostęp klucza)', gb, ta + ra + 0.5 * B.s, 'zal');
  o.dmin('kątowniki', 'g_s ≥ t_a + r + 0,5·s (dostęp klucza)', gs, ta + ra + 0.5 * B.s, 'zal');
  o.dmax('kątowniki', 't_a ≤ 0,5·d (ciągliwość)', ta, 0.5 * B.dd, 'zal');
  o.dmin('kątowniki', 'h_p ≥ 0,6·h_b (stężenie skrętne)', hp, 0.6 * sec.h, 'zal');
  o.dmax('kątowniki', 'h_p ≤ wysokość środnika w świetle (otwory w środniku belki)', hp, webClear(sec, w));
  const mpm = (P.props({ typ: 'kat', seria: ser, nr: w.L }) || {}).masa || 0;
  o.mass = 2 * mpm * hp / 1000; o.nb = nr + ns; o.weldL = 0;
  o.geom = { hp, nr, e1, p1, gb, gs, gap, lb, ls, ta, ra, e2b, eb, es };
  return fin(o);
};

/* =========================================================== POŁĄCZENIE SPAWANE */
// w: spoiny ('srodnik'|'obwodowe'|'czolowa'), aw, af, sup, tsup, supGat; F: V, N (+ rozciąganie), M
W.welded = function (ctx, w, F) {
  const { sec, mat, ndp, base } = ctx, g0 = ndp.gM0, g2 = ndp.gM2;
  const o = rec(); o.typ = 'spawane';
  const V = Math.abs(F.V), N = U.num(F.N), Mm = Math.abs(U.num(F.M)), rodz = w.spoiny || 'srodnik';
  const sp = w.supGat && M.STAL[w.supGat] ? steel(w.supGat, U.num(w.tsup, 20), ndp) : { fu: mat.fu, bw: bwOf(mat.gatunek), gat: mat.gatunek };
  const wk = weaker({ fu: mat.fu, bw: bwOf(mat.gatunek) }, { fu: sp.fu, bw: sp.bw || bwOf(mat.gatunek) }), fuW = wk.fu, bw = wk.bw;
  o.n = 0; o.bolts = [];
  if (rodz === 'czolowa') {
    const uV = V / base.Vpl, uM = Mm / Math.min(base.Mc_pos, base.Mc_neg), uN = Math.abs(N) / base.Npl;
    o.ratio('Spoiny', 'Spoina czołowa z pełnym przetopem – nośność jak przekroju belki', 'PN-EN 1993-1-8 4.7.1(1)', Math.max(uV, uM + uN), `V/V_pl,Rd = ${f(uV, 3)}; N/N_pl,Rd + M/M_c,Rd = ${f(uN, 3)} + ${f(uM, 3)}; materiał dodatkowy o wytrzymałości ≥ materiału rodzimego`);
    o.uwagi.push('Spoina czołowa z pełnym przetopem: poziom jakości B (PN-EN ISO 5817), zakres badań nieniszczących wg klasy wykonania (PN-EN 1090-2, tabl. 24).');
    o.geom = { rodz }; o.mass = 0; o.nb = 0; o.weldL = 2 * (sec.bg || sec.b || 0) + sec.h;
    return fin(o);
  }
  const aw = U.num(w.aw, 5), af = U.num(w.af, 6), lines = [];
  // linie spoin w płaszczyźnie styku: { L, a, z (środek), poz (true – pozioma), web }
  if (sec.kind === 'RHS') {
    const b = sec.b, h = sec.h;
    lines.push({ L: b, a: aw, z: h / 2, poz: true }, { L: b, a: aw, z: -h / 2, poz: true }, { L: h, a: aw, z: 0, poz: false, web: true }, { L: h, a: aw, z: 0, poz: false, web: true });
  } else {
    const tg = sec.tg || sec.t || 0, td = sec.td || sec.t || 0, r = sec.r || 0;
    const Lweb = Math.max(10, sec.h - tg - td - 2 * Math.max(r, aw));
    const zw = (sec.h - tg - td) / 2 + td - sec.zc;     // środek środnika względem środka ciężkości
    lines.push({ L: Lweb, a: aw, z: zw, poz: false, web: true });
    if (sec.kind !== 'L') lines.push({ L: Lweb, a: aw, z: zw, poz: false, web: true });
    if (rodz === 'obwodowe' && sec.kind !== 'L') {
      const bt = sec.bg || sec.b, bb = sec.bd || sec.b, inT = Math.max(0, (sec.kind === 'U' ? bt - sec.tw - r : bt - sec.tw - 2 * r)), inB = Math.max(0, (sec.kind === 'U' ? bb - sec.tw - r : bb - sec.tw - 2 * r));
      lines.push({ L: bt, a: af, z: sec.h - sec.zc, poz: true }, { L: inT, a: af, z: sec.h - tg - sec.zc, poz: true }, { L: bb, a: af, z: -sec.zc, poz: true }, { L: inB, a: af, z: td - sec.zc, poz: true });
    }
  }
  const Aw = lines.reduce((s, l) => s + l.a * l.L, 0), Aweb = lines.filter(l => l.web).reduce((s, l) => s + l.a * l.L, 0);
  const Iw = lines.reduce((s, l) => s + (l.poz ? l.a * l.L * l.z * l.z : l.a * l.L ** 3 / 12 + l.a * l.L * l.z * l.z), 0);
  const zmax = Math.max(...lines.map(l => Math.abs(l.z) + (l.poz ? 0 : l.L / 2)));
  const web = lines.find(l => l.web), zwt = Math.abs(web.z) + web.L / 2;
  const tl = V / Aweb;
  const sMax = N / Aw + (Iw > 0 ? Mm * zmax / Iw : 0), sWeb = N / Aw + (Iw > 0 ? Mm * zwt / Iw : 0);
  const wE = W.fillet(fuW, bw, g2, sMax / Math.SQRT2, sMax / Math.SQRT2, rodz === 'srodnik' ? tl : 0);
  const wW = W.fillet(fuW, bw, g2, sWeb / Math.SQRT2, sWeb / Math.SQRT2, tl);
  o.add('Spoiny', 'Spoiny środnika – ścinanie τ∥ (V przenoszą spoiny środnika)', 'PN-EN 1993-1-8 4.5.3.2', wW.s, wW.R1, 'MPa', `A_w,środnik = ${f(Aweb, 0)} mm² → τ∥ = ${f(tl)} MPa; σ_w = N/A_w + M·z/I_w = ${f(sWeb)} MPa w skrajnym punkcie spoiny środnika → √(σ⊥² + 3(τ⊥² + τ∥²)) = ${f(wW.s)} ≤ f_u/(β_w·γM2) = ${f(wW.R1)} MPa`, { u: wW.u });
  if (Mm > 0 || Math.abs(N) > 0) o.add('Spoiny', `${rodz === 'obwodowe' ? 'Spoiny pasów' : 'Spoiny'} – naprężenia od M i N (włókno skrajne)`, 'PN-EN 1993-1-8 4.5.3.2 (4.1)', wE.s, wE.R1, 'MPa', `A_w = ${f(Aw, 0)} mm², I_w = ${f(Iw / 1e4, 0)} cm⁴, z_max = ${f(zmax, 0)} mm: σ_w = ${f(sMax)} MPa; σ⊥ = τ⊥ = σ_w/√2; σ⊥ ≤ 0,9·f_u/γM2 = ${f(wE.R2)} MPa`, { u: wE.u });
  const aF = W.aFull(sec.tw || sec.t, mat.fy, fuW, bw, g0, g2);
  o.dmin('spoiny', `a_w ≥ a_pełnonośna środnika = ${f(aF)} mm (zalecenie)`, aw, aF, 'zal');
  o.dmin('spoiny', 'a ≥ 3 mm', Math.min(aw, rodz === 'obwodowe' ? af : aw), 3);
  o.dmax('spoiny', 'a_w ≤ 0,7·t_w (spoina pachwinowa)', aw, 0.7 * (sec.tw || sec.t) + 0.5, 'zal');
  if (rodz === 'obwodowe') { const tf = Math.min(sec.tg || 99, sec.td || 99); o.dmin('spoiny', `a_f ≥ a_pełnonośna pasa = ${f(W.aFull(tf, mat.fy, fuW, bw, g0, g2))} mm (zalecenie dla połączenia sztywnego)`, af, W.aFull(tf, mat.fy, fuW, bw, g0, g2), 'zal'); }
  o.uwagi.push(rodz === 'srodnik' ? 'Belka przyspawana tylko środnikiem – połączenie traktowane jako przegubowe pod warunkiem swobody obrotu (podatność ścianki podpory); sprawdź element podpierający.' : 'Spoiny obwodowe – połączenie sztywne lub półsztywne: przyjmij w schemacie utwierdzenie lub sprężynę obrotową; sprawdź strefę panelu i ściskanie / rozciąganie poprzeczne środnika słupa (PN-EN 1993-1-8, 6.2.6).');
  o.mass = 0; o.nb = 0; o.weldL = lines.reduce((s, l) => s + l.L, 0); o.geom = { rodz, aw, af, lines };
  return fin(o);
};

/* =========================================================== STYK NAKŁADKOWY ŚRUBOWY */
// s: tfo, bfo, tfi (0 – brak wewnętrznych), bfi, nf, gf, e1f, p1f, ef, gap, tpw, hpw, nw, ncw, p1w, p2w, e1w, ew, e2w, śruby, gatP; F: M, V, N
W.splice = function (ctx, s, F) {
  const { sec, mat, ndp } = ctx, g0 = ndp.gM0, g2 = ndp.gM2;
  const o = rec(); o.typ = 'nakladkowy';
  if (sec.kind !== 'I') { o.uwagi.push('Styk nakładkowy – obsługiwany dla dwuteowników (walcowanych i spawanych). Dla innych przekrojów zastosuj styk spawany czołowy.'); return fin(o); }
  const B = W.bolt(s, ndp), Mm = Math.abs(U.num(F.M)), V = Math.abs(U.num(F.V)), N = U.num(F.N);
  const tf = Math.min(sec.tg, sec.td), bf = Math.min(sec.bg, sec.bd), h = sec.h, tw = sec.tw, r = sec.r || 0;
  const tfo = U.num(s.tfo), bfo = U.num(s.bfo, bf), tfi = U.num(s.tfi), bfi = U.num(s.bfi, Math.floor((bf - tw - 2 * r) / 2 - 5)), nf = Math.max(1, Math.round(U.num(s.nf, 3))), gf = U.num(s.gf, Math.round(bf * 0.55));
  const e1f = U.num(s.e1f, 40), p1f = U.num(s.p1f, 70), ef = U.num(s.ef, 40), gap = U.num(s.gap, 10);
  const tpw = U.num(s.tpw), hpw = U.num(s.hpw), nw = Math.max(1, Math.round(U.num(s.nw, 3))), ncw = U.clamp(Math.round(U.num(s.ncw, 1)), 1, 3), p1w = U.num(s.p1w, 70), p2w = U.num(s.p2w, 60), e1w = U.num(s.e1w, 40), ew = U.num(s.ew, 40), e2w = U.num(s.e2w, 40);
  const plf = steel(s.gatP || mat.gatunek, Math.max(tfo, tfi), ndp), plw = steel(s.gatP || mat.gatunek, tpw, ndp);
  o.B = B; o.plf = plf; o.plw = plw;
  // podział sił: moment pasów i środnika wg sztywności, siła osiowa wg pól
  const Af = bf * tf, Aw = sec.A - 2 * Af, If = 2 * (bf * tf ** 3 / 12 + Af * ((h - tf) / 2) ** 2), Iwb = Math.max(0, sec.Iy - If);
  const Mw = Mm * Iwb / sec.Iy, Mf = Mm - Mw, Ff = Mf / (h - tf) + Math.abs(N) * Af / sec.A;
  const ecc = gap / 2 + ew + (ncw - 1) * p2w / 2, Mwt = Mw + V * ecc, Nw = Math.abs(N) * Aw / sec.A;
  o.forces = { Ff, Mf, Mw, Mwt, Nw, V, ecc };
  // ---------------- pasy
  const planes = tfi > 0 ? 2 : 1, nb = 2 * nf, Ffb = Ff / nb, bL = W.betaLf((nf - 1) * p1f, B.dd);
  o.add('Pas – śruby', 'Ścinanie śrub nakładek pasa', 'PN-EN 1993-1-8 tabl. 3.4; 3.8', Ffb, planes * B.Fv * bL, 'F', `M_f = M·(1 − I_w/I) = ${U.fmt(Mf / 1e6, 2)} kNm; F_f = M_f/(h − t_f) + |N|·A_f/A = ${kN(Ff)} kN; na śrubę F_f/(2·n_f) = ${kN(Ffb)} kN; ${planes} płaszczyzny ścinania${bL < 1 ? `, β_Lf = ${f(bL, 3)}` : ''}`);
  const e2f = (bf - gf) / 2, e2o = (bfo - gf) / 2;
  const fbF = (t, fu, e1x, e2x) => { const E = W.Fb(B, t, fu, g2, { end: true, e1: e1x, edge: true, e2: e2x, p2: gf }), I = W.Fb(B, t, fu, g2, { end: false, p1: p1f, edge: true, e2: e2x, p2: gf }); return 2 * (E.Fb + (nf - 1) * (nf > 1 ? I.Fb : 0)); };
  o.add('Pas – śruby', 'Docisk do pasa belki', 'PN-EN 1993-1-8 tabl. 3.4', Ff, fbF(tf, mat.fu, ef, e2f), 'F', `t_f = ${f(tf)} mm, e₁ = e_f = ${f(ef, 0)} (od końca belki), e₂ = ${f(e2f, 0)}, p₂ = g_f = ${f(gf, 0)} mm`);
  o.add('Pas – śruby', 'Docisk do nakładek pasa', 'PN-EN 1993-1-8 tabl. 3.4', Ff, fbF(tfo + (tfi > 0 ? 2 * tfi : 0), plf.fu, e1f, Math.min(e2o, tfi > 0 ? e2f : e2o)), 'F', `Σt = ${f(tfo + (tfi > 0 ? 2 * tfi : 0))} mm, e₁ = ${f(e1f, 0)}, e₂ = ${f(e2o, 0)} mm`);
  if (B.pre && B.kat === 'C') o.add('Pas – śruby', 'Poślizg (kat. C)', 'PN-EN 1993-1-8 3.9', Ffb, planes * B.Fs, 'F', `F_s,Rd = k_s·n·μ·F_p,C/γM3 = ${kN(planes * B.Fs)} kN`);
  if (B.pre && B.kat === 'B') o.add('Pas – śruby', 'Poślizg w SGU (kat. B)', 'PN-EN 1993-1-8 3.9', Ffb / 1.4, planes * B.FsSer, 'F', `F_Ed,ser ≈ F_Ed/1,4`);
  const Ao = bfo * tfo, Ai = tfi > 0 ? 2 * bfi * tfi : 0, Aon = Ao - 2 * B.d0 * tfo, Ain = tfi > 0 ? Ai - 2 * B.d0 * tfi : 0;
  o.add('Pas – nakładki', 'Nakładki pasa – rozciąganie przekroju brutto', 'PN-EN 1993-1-1 6.2.3 (6.6)', Ff, (Ao + Ai) * plf.fy / g0, 'F', `A = ${f(Ao, 0)}${Ai ? ` + ${f(Ai, 0)}` : ''} mm² (${f(bfo, 0)}×${f(tfo)}${tfi > 0 ? ` + 2×${f(bfi, 0)}×${f(tfi)}` : ''})`);
  o.add('Pas – nakładki', 'Nakładki pasa – rozciąganie przekroju netto', 'PN-EN 1993-1-1 6.2.3 (6.7)', Ff, 0.9 * (Aon + Ain) * plf.fu / g2, 'F', `0,9·A_net·f_u/γM2, A_net = ${f(Aon + Ain, 0)} mm²`);
  const blkO = Math.min((gf - B.d0) * tfo * plf.fu / g2 + 2 * (e1f + (nf - 1) * p1f - (nf - 0.5) * B.d0) * tfo * plf.fy / (s3 * g0), 2 * (e2o - B.d0 / 2) * tfo * plf.fu / g2 + 2 * (e1f + (nf - 1) * p1f - (nf - 0.5) * B.d0) * tfo * plf.fy / (s3 * g0));
  o.add('Pas – nakładki', 'Nakładka zewnętrzna – rozerwanie blokowe', 'PN-EN 1993-1-8 3.10.2 (3.9)', Ff * Ao / (Ao + Ai), blkO, 'F', `min z dwóch postaci (rozciąganie między liniami śrub / przy krawędziach); udział nakładki zewnętrznej ${f(Ao / (Ao + Ai) * 100, 0)}%`);
  o.add('Pas – belka', 'Pas rozciągany belki – przekrój netto', 'PN-EN 1993-1-1 6.2.3', Ff, 0.9 * (bf - 2 * B.d0) * tf * mat.fu / g2, 'F', `0,9·(b_f − 2d₀)·t_f·f_u/γM2`);
  const epsP = Math.sqrt(235 / plf.fy);
  o.dmax('nakładki pasa (ściskane)', 'p₁ ≤ 9·t·ε (wyboczenie między łącznikami)', p1f, 9 * tfo * epsP, 'max');
  o.dmax('nakładki pasa (ściskane)', 'szczelina + 2e_f ≤ 9·t·ε', gap + 2 * ef, 9 * tfo * epsP, 'zal');
  spacing(o, 'nakładki pasa', B, tfo, { e1: e1f, e2: e2o, p1: nf > 1 ? p1f : undefined, p2: gf, exp: s.exp });
  o.dmin('pas belki', 'e_f (koniec belki) ≥ 1,2·d₀', ef, 1.2 * B.d0); o.dmin('pas belki', 'e₂ ≥ 1,2·d₀', e2f, 1.2 * B.d0);
  if (tfi > 0) o.dmax('nakładki wewnętrzne', 'b_fi ≤ (b_f − t_w − 2r)/2', bfi, (bf - tw - 2 * r) / 2);
  o.dmin('pas belki', 'otwór poza zaokrągleniem środnika: g_f/2 ≥ t_w/2 + r + d₀/2', gf / 2, tw / 2 + r + B.d0 / 2);
  o.dmax('nakładki pasa', 'otwory w obrysie nakładki zewnętrznej: g_f ≤ b_fo − 2·1,2·d₀', gf, bfo - 2.4 * B.d0);
  if (tfi > 0) { const yi0 = tw / 2 + r, yi1 = yi0 + bfi; o.dmin('nakładki wewnętrzne', 'otwór w obrysie nakładki: g_f/2 − (t_w/2 + r) ≥ 1,2·d₀', gf / 2 - yi0, 1.2 * B.d0); o.dmin('nakładki wewnętrzne', 'otwór w obrysie nakładki: (t_w/2 + r + b_fi) − g_f/2 ≥ 1,2·d₀', yi1 - gf / 2, 1.2 * B.d0); }
  // ---------------- środnik
  const pts = []; let id = 0;
  for (let i = 0; i < nw; i++) for (let j = 0; j < ncw; j++) pts.push({ id: ++id, x: gap / 2 + ew + j * p2w, z: e1w + i * p1w, r: i, c: j });
  const wb = W.group(pts, V, Nw, Mwt); o.bolts = wb;
  const bLw = W.betaLf((nw - 1) * p1w, B.dd);
  const plateG = { n: 'nakładki środnika (2·t_p)', t: 2 * tpw, fu: plw.fu,
    geomZ: (b) => ({ end: b.r === nw - 1 || b.r === 0, e1: e1w, p1: p1w, edge: b.c === ncw - 1, e2: e2w, p2: ncw > 1 ? p2w : Infinity }),
    geomX: (b) => ({ end: b.c === ncw - 1, e1: e2w, p1: p2w, edge: b.r === 0 || b.r === nw - 1, e2: e1w, p2: nw > 1 ? p1w : Infinity }) };
  const webG = { n: 'środnik belki', t: tw, fu: mat.fu,
    geomZ: (b) => ({ end: false, p1: nw > 1 ? p1w : 3 * B.d0, edge: false, p2: ncw > 1 ? p2w : Infinity }),
    geomX: (b) => ({ end: b.c === 0, e1: ew, p1: p2w, edge: false, p2: nw > 1 ? p1w : Infinity }) };
  boltGroupChecks(o, 'Środnik – śruby', B, wb, 2, bLw, [plateG, webG], ndp, `Śruby środnika – dwucięte (V, N_w, M_w + V·e = ${U.fmt(Mwt / 1e6, 2)} kNm)`);
  o.add('Środnik – nakładki', 'Nakładki środnika – ścinanie brutto', 'PN-EN 1993-1-1 6.2.6', V, 2 * hpw * tpw * plw.fy / (s3 * g0), 'F', `2·h_p·t_p·f_y/(√3·γM0) = 2·${f(hpw, 0)}·${f(tpw)}·${plw.fy}/√3`);
  o.add('Środnik – nakładki', 'Nakładki środnika – ścinanie netto', 'PN-EN 1993-1-8 3.10', V, 2 * (hpw - nw * B.d0) * tpw * plw.fu / (s3 * g2), 'F', `2·(h_p − n_w·d₀)·t_p·f_u/(√3·γM2)`);
  const Wn = 2 * tpw * hpw * hpw / 6;
  o.add('Środnik – nakładki', 'Nakładki środnika – zginanie (M_w + V·e) z N_w', 'PN-EN 1993-1-1 6.2.9 (6.42)', Mwt / Wn + Nw / (2 * hpw * tpw), plw.fy / g0, 'MPa', `σ = (M_w + V·e)/W + N_w/A = ${f(Mwt / Wn)} + ${f(Nw / (2 * hpw * tpw))} MPa; e = ${f(ecc, 0)} mm`);
  o.add('Środnik – belka', 'Środnik belki – ścinanie netto w linii śrub', 'PN-EN 1993-1-8 3.10', V, Math.max(0, (sec.Avz || sec.hw * tw) - nw * B.d0 * tw) * mat.fu / (s3 * g2), 'F', `(A_v − n_w·d₀·t_w)·f_u/(√3·γM2)`);
  spacing(o, 'nakładki środnika', B, tpw, { e1: e1w, e2: e2w, p1: nw > 1 ? p1w : undefined, p2: ncw > 1 ? p2w : undefined, exp: s.exp });
  o.dmin('środnik belki', 'e_w (koniec belki) ≥ 1,2·d₀', ew, 1.2 * B.d0);
  o.dmax('nakładki środnika', 'h_p ≤ h − 2(t_f + r) − 10', hpw, h - 2 * (tf + r) - 10);
  o.dmin('nakładki środnika', 'otwory w obrysie nakładki: h_p − e₁ − (n_w − 1)·p₁ ≥ 1,2·d₀', hpw - e1w - (nw - 1) * p1w, 1.2 * B.d0);
  const Lf = 2 * (e1f + (nf - 1) * p1f + ef) + gap, Lw2 = 2 * (ew + (ncw - 1) * p2w + e2w) + gap;
  o.mass = 7.85e-6 * (2 * (Ao + Ai) * Lf + 2 * hpw * tpw * Lw2); o.nb = 2 * (2 * nb + nw * ncw); o.weldL = 0;
  o.geom = { tfo, bfo, tfi, bfi, nf, gf, e1f, p1f, ef, gap, tpw, hpw, nw, ncw, p1w, p2w, e1w, ew, e2w, Lf, Lw: Lw2 };
  return fin(o);
};
W.spliceWeld = function (ctx, s, F) {
  const { base, ndp } = ctx, o = rec(); o.typ = 'spawany';
  const Mm = Math.abs(U.num(F.M)), V = Math.abs(U.num(F.V)), N = Math.abs(U.num(F.N));
  const uV = V / base.Vpl, rho = uV > 0.5 ? (2 * uV - 1) ** 2 : 0, Mc = Math.min(base.Mc_pos, base.Mc_neg) * (1 - 0.3 * rho), uM = Mm / Mc + N / base.Npl;
  o.ratio('Spoina', 'Spoina czołowa z pełnym przetopem – nośność przekroju (M + N, V)', 'PN-EN 1993-1-8 4.7.1(1)', Math.max(uV, uM), `V/V_pl,Rd = ${f(uV, 3)}; M/M_c,Rd + N/N_pl,Rd = ${f(uM, 3)}${rho ? ` (redukcja nośności przy zginaniu od ścinania, ρ = ${f(rho, 3)})` : ''}`);
  o.uwagi.push('Styk spawany czołowy: spoiny z pełnym przetopem z podpawaniem lub podkładką, poziom jakości B wg PN-EN ISO 5817; badania nieniszczące wg PN-EN 1090-2 tabl. 24; w strefie dużych naprężeń rozciągających – zaleca się 100% UT/RT. Uwaga na zmęczenie (kategoria szczegółu wg PN-EN 1993-1-9 tabl. 8.3).');
  o.nb = 0; o.mass = 0; void ndp;
  return fin(o);
};

/* ---------------------------------------------------------- wynik */
function fin(o) {
  const order = []; o.checks.forEach(c => { if (!order.includes(c.grp)) order.push(c.grp); });
  o.checks = order.flatMap(g => o.checks.filter(c => c.grp === g));
  o.u = Math.max(0, ...o.checks.map(c => (isFinite(c.u) ? c.u : 9.99)));
  o.detalFail = o.detal.filter(d => !d.ok && d.typ !== 'zal');
  o.zalFail = o.detal.filter(d => !d.ok && d.typ === 'zal');
  delete o.add; delete o.ratio; delete o.dmin; delete o.dmax;
  return o;
}

/* ---------------------------------------------------------- wejście ogólne */
W.design = function (ctx, w, F) {
  const t = w.typ;
  if (t === 'blacha_czolowa') return W.endPlate(ctx, w, F);
  if (t === 'blacha_zebrowa') return W.finPlate(ctx, w, F);
  if (t === 'katowniki') return W.cleats(ctx, w, F);
  if (t === 'spawane') return W.welded(ctx, w, F);
  return null;
};
W.designSplice = function (ctx, s, F) { return s.typ === 'spawany' ? W.spliceWeld(ctx, s, F) : W.splice(ctx, s, F); };


/* ---------------------------------------------------------- dobór automatyczny (najmniejszy koszt przy spełnionych warunkach) */
const okRes = (o, eta, zal) => o && o.checks.every(c => c.u <= eta + 1e-9) && !o.detalFail.length && (!zal || !o.zalFail.length);
const boltKg = (d) => ({ M12: 0.06, M14: 0.09, M16: 0.12, M20: 0.22, M22: 0.29, M24: 0.38, M27: 0.55, M30: 0.75 })[d] || 0.2;
const cost = (o, w) => o.mass + o.nb * boltKg(w.d) * 3 + (o.weldL || 0) * (U.num(w.a || w.aw, 5) ** 2) * 2e-5 + o.zalFail.length * 6;
W.auto = function (ctx, w0, F, eta) {
  const sec = ctx.sec, t = w0.typ, h = sec.h, hwc = sec.h - (sec.tg || 0) - (sec.td || 0) - 2 * (sec.r || 0);
  let best = null;
  const tryW = (w) => { let o; try { o = W.design(ctx, w, F); } catch (e) { return; } if (!okRes(o, eta)) return; const c = cost(o, w); if (!best || c < best.c) best = { w, o, c }; };
  const geo = (d) => { const b = M.SRUBY[d]; return { e1: Math.max(30, Math.ceil(1.5 * b.d0 / 5) * 5), p1: Math.max(55, Math.ceil(3 * b.d / 5) * 5), e2: Math.max(25, Math.ceil(1.5 * b.d0 / 5) * 5) }; };
  // wysokość blachy: ≥ 0,6·h i ≥ 2e₁ + (n − 1)p₁, e₁ zaokrąglone do 5 mm (układ symetryczny)
  const hpE = (g, nr) => { const hp0 = Math.max(Math.ceil(0.6 * h / 10) * 10, 2 * g.e1 + (nr - 1) * g.p1); const e1 = Math.ceil((hp0 - (nr - 1) * g.p1) / 2 / 5) * 5; return { hp: 2 * e1 + (nr - 1) * g.p1, e1 }; };
  const ds = ['M12', 'M16', 'M20', 'M24'];
  if (t === 'blacha_czolowa') {
    for (const d of ds) { const g = geo(d), b = M.SRUBY[d]; for (let nr = 1; nr <= 8; nr++) for (const tp of [8, 10, 12, 15]) for (const a of [3, 4, 5, 6, 7, 8]) {
      const { hp, e1 } = hpE(g, nr); if (hp > (w0.pelna ? h : hwc)) continue;
      const p3 = Math.max(Math.ceil((sec.tw + 2 * a * Math.SQRT2 + NUT[d][0] + 4) / 10) * 10, Math.ceil(2.4 * b.d0 / 10) * 10);
      const bp = Math.min(Math.max(p3 + 2 * g.e2, 100), Math.min(sec.bg || 999, sec.bd || 999) + 10);
      tryW(Object.assign({}, w0, { d, nr, tp, a, hp, p3, bp, e1, p1: g.p1, e2: Math.floor((bp - p3) / 2) }));
    } }
  } else if (t === 'blacha_zebrowa') {
    for (const d of ds.slice(1)) { const g = geo(d), b = M.SRUBY[d]; for (let nr = 2; nr <= 8; nr++) for (const nc of [1, 2]) for (const tp of [8, 10, 12, 15]) for (const a of [5, 6, 7, 8, 10]) {
      const { hp, e1 } = hpE(g, nr); if (hp > hwc) continue;
      const e2 = Math.max(2 * b.d, g.e2), e2b = Math.max(2 * b.d, 40), z = e2b + U.num(w0.gap, 10);
      tryW(Object.assign({}, w0, { d, nr, n: nr, nc, tp, a, hp, e1, p1: g.p1, e2, p2: Math.max(60, Math.ceil(3 * b.d / 5) * 5), z, e2b }));
    } }
  } else if (t === 'katowniki') {
    for (const L of ['70x7', '80x8', '90x9', '100x10', '120x10', '120x12', '150x12']) { const row = P.KAT.L[L]; if (!row) continue; for (const d of ds.slice(1)) { const g = geo(d), b = M.SRUBY[d]; if (row[0] < 2 * (row[2] + row[3]) + NUT[d][0]) continue; for (let nr = 2; nr <= 8; nr++) {
      const { hp, e1 } = hpE(g, nr); if (hp > hwc) continue;
      const gg = Math.max(Math.ceil((row[2] + row[3] + 0.5 * NUT[d][0]) / 5) * 5, row[0] - Math.max(1.5 * b.d0, 25));
      tryW(Object.assign({}, w0, { L, Lser: 'L', d, nr, hp, e1, p1: g.p1, gb: Math.min(gg, row[0] - Math.ceil(1.25 * b.d0)), gs: Math.min(gg, row[0] - Math.ceil(1.25 * b.d0)) }));
    } } }
  } else if (t === 'spawane') {
    for (const aw of [3, 4, 5, 6, 7, 8, 10, 12]) for (const af of (w0.spoiny === 'obwodowe' ? [4, 5, 6, 8, 10, 12, 15] : [U.num(w0.af, 6)])) tryW(Object.assign({}, w0, { aw, af }));
  }
  return best ? { ok: true, w: best.w, o: best.o } : { ok: false };
};
W.autoSplice = function (ctx, s0, F, eta) {
  const sec = ctx.sec; if (s0.typ === 'spawany' || sec.kind !== 'I') return { ok: false };
  const tf = Math.min(sec.tg, sec.td), bf = Math.min(sec.bg, sec.bd), r = sec.r || 0, h = sec.h;
  let best = null;
  for (const d of ['M16', 'M20', 'M24']) { const b = M.SRUBY[d], e = Math.max(35, Math.ceil(1.5 * b.d0 / 5) * 5), p = Math.max(60, Math.ceil(3 * b.d / 5) * 5);
    for (const tfo of [8, 10, 12, 15, 20, 25]) for (const inner of [false, true]) for (let nf = 2; nf <= 6; nf++) for (const ncw of [1, 2, 3]) for (const tpw of [6, 8, 10, 12]) {
      const hpw = Math.floor((h - 2 * (tf + r) - 20) / 10) * 10; const nw = Math.max(2, Math.floor((hpw - 2 * e) / p) + 1);
      const s = Object.assign({}, s0, { d, tfo, tfi: inner ? Math.max(8, tfo) : 0, bfi: Math.floor((bf - sec.tw - 2 * r) / 2 - 5), nf, e1f: e, p1f: p, ef: e, gf: Math.round(Math.min(bf - 2 * e, Math.max(sec.tw + 2 * r + 2 * e + 10, bf * 0.55)) / 5) * 5, tpw, hpw, nw, ncw, p1w: Math.floor((hpw - 2 * e) / (nw - 1) / 5) * 5, e1w: Math.round((hpw - (nw - 1) * Math.floor((hpw - 2 * e) / (nw - 1) / 5) * 5) / 2), p2w: p, ew: e, e2w: e });
      let o; try { o = W.splice(ctx, s, F); } catch (er) { continue; }
      if (!okRes(o, eta)) continue;
      const c = o.mass + o.nb * boltKg(d) * 3 + o.zalFail.length * 6;
      if (!best || c < best.c) best = { s, o, c };
    } }
  return best ? { ok: true, w: best.s, o: best.o } : { ok: false };
};

/* ---------------------------------------------------------- wartości domyślne */
W.defaults = function (typ, sec) {
  const h = (sec && sec.h) || 300, hw = sec ? sec.h - (sec.tg || 0) - (sec.td || 0) - 2 * (sec.r || 0) : 250, tw = (sec && sec.tw) || 7;
  let nr = Math.max(1, Math.min(8, Math.round((0.62 * h - 80) / 70) + 1)); while (nr > 1 && 80 + (nr - 1) * 70 > hw) nr--;
  const p1 = 70, hp = 80 + (nr - 1) * p1;
  const com = { gatP: 'S235', d: 'M20', kl: '8.8', gwint: true, otw: 'normalne', sprezane: false, kat: 'A', pow: 'B', sup: 'pas_slupa', tsup: 12, supGat: 'S235', Nt: 0, dnt: 0, dnb: 0, ln: 0, e1b: 60 };
  if (typ === 'blacha_czolowa') return Object.assign(com, { d: 'M16', hp, bp: 150, tp: 10, nr, e1: 40, p1, e2: 30, p3: 90, a: 5, pelna: false });
  if (typ === 'blacha_zebrowa') return Object.assign(com, { hp, tp: 10, nr, n: nr, nc: 1, e1: 40, p1, e2: 50, p2: 60, z: 60, e2b: 50, a: 6 });
  if (typ === 'katowniki') return Object.assign(com, { L: '90x9', Lser: 'L', dlugiNaPodp: false, hp, nr, e1: 40, p1, gb: 50, gs: 50, gap: 10, sup: 'pas_slupa' });
  if (typ === 'spawane') return Object.assign(com, { spoiny: 'srodnik', aw: Math.max(3, Math.ceil(0.55 * tw)), af: 6 });
  if (typ === 'oparcie') return { podloze: 'beton', bp: 200, lp: 150, tp: 15, beton: 'C25/30', alfa: 1.5, lb: 150, fd: 2.0, beta: 1.2, zebro: false, bs: 70, ts: 10, ch: 15 };
  return { zebro: false, bs: 70, ts: 10, ch: 15 };
};
W.spliceDefaults = function (sec, x) {
  const bf = sec ? Math.min(sec.bg || 150, sec.bd || 150) : 150, tf = sec ? Math.min(sec.tg || 10, sec.td || 10) : 10, h = sec ? sec.h : 300, r = sec ? sec.r || 0 : 0;
  const hpw = Math.max(80, Math.floor((h - 2 * (tf + r) - 20) / 10) * 10), nw = Math.max(2, Math.floor((hpw - 80) / 70) + 1), p1w = Math.floor((hpw - 80) / Math.max(1, nw - 1) / 5) * 5;
  return { x, typ: 'nakladkowy', d: 'M20', kl: '10.9', gwint: true, otw: 'normalne', sprezane: true, kat: 'C', pow: 'B', gatP: '',
    tfo: Math.max(8, Math.ceil(tf / 2) * 2), bfo: bf, tfi: 0, bfi: Math.floor((bf - (sec ? sec.tw : 7) - 2 * r) / 2 - 5), nf: 3, gf: Math.round(bf * 0.55 / 5) * 5, e1f: 40, p1f: 70, ef: 40, gap: 10,
    tpw: 8, hpw, nw, ncw: 1, p1w: p1w || 70, p2w: 60, e1w: 40, ew: 40, e2w: 40, silyRecz: false, MEd: 0, VEd: 0, NEd: 0 };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
