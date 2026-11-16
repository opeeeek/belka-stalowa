/* =====================================================================
   BelkaStal – nośność przekroju (PN-EN 1993-1-1, rozdz. 5.5 i 6.2)
   oraz elementy płytowe (PN-EN 1993-1-5: 4, 5, 6, 7, 9).
   Znak momentu: M > 0 – ściskany pas górny; N > 0 – ściskanie (Nc).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, P = BS.P;
const R = BS.R = {};
const s3 = Math.sqrt(3);

/* ---------------------------------------------------------- klasyfikacja */
// Mpos: true – ściskany pas górny (moment dodatni), Nc – siła ściskająca [N] (+), fy
R.classify = function (sec, fy, Mpos, Nc, hasM) {
  const eps = Math.sqrt(235 / fy);
  const out = { eps, parts: [] };
  const bendingOnly = hasM !== false;
  // pas ściskany (wspornikowy) – tabl. 5.2 ark. 2
  const flanges = [];
  if (Nc > 0 || !bendingOnly) { flanges.push({ n: 'pas górny', c: sec.c_fg, t: sec.tg }, { n: 'pas dolny', c: sec.c_fd, t: sec.td }); }
  else flanges.push(Mpos ? { n: 'pas górny (ściskany)', c: sec.c_fg, t: sec.tg } : { n: 'pas dolny (ściskany)', c: sec.c_fd, t: sec.td });
  flanges.forEach(f => {
    const ct = f.c / f.t, lim = [9 * eps, 10 * eps, 14 * eps];
    const cls = ct <= lim[0] ? 1 : ct <= lim[1] ? 2 : ct <= lim[2] ? 3 : 4;
    out.parts.push({ n: f.n, typ: 'wspornikowa', c: f.c, t: f.t, ct, lim, cls, ref: 'tabl. 5.2 (ark. 2)' });
  });
  // środnik – tabl. 5.2 ark. 1
  const c = sec.c_w, t = sec.tw, ct = c / t;
  const rw = sec.typ === 'walc' ? sec.r : Math.SQRT2 * (sec.aw || 0);
  const zTopW = sec.h - sec.tg - rw, zBotW = sec.td + rw;
  // α – zasięg strefy ściskanej (plastycznie); oś obojętna plastyczna przy sile Nc
  const Ac = U.clamp((sec.A + Nc / fy) / 2, 0, sec.A);
  let alpha;
  if (!bendingOnly) alpha = Nc >= 0 ? 1 : 0;
  else {
    // pole ściskane od strony pasa ściskanego = Ac → położenie osi zp
    let lo = 0, hi = sec.h;
    for (let k = 0; k < 60; k++) {
      const m = (lo + hi) / 2;
      const a = P.integrals(P.clip(sec.pts, m, Mpos), 0).A; // pole po stronie ściskanej
      if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
    }
    const zp = (lo + hi) / 2;
    alpha = U.clamp(Mpos ? (zTopW - zp) / c : (zp - zBotW) / c, 0, 1);
  }
  // ψ – rozkład sprężysty (ściskanie dodatnie) – na końcach części c
  let psi;
  if (!bendingOnly) psi = 1;
  else {
    // naprężenie od jednostkowego M (proporcja ustalana przez stosunek do N jest nieznana – przyjmujemy M = Mel)
    psi = null;
  }
  out.alpha = alpha;
  out.webFn = function (sigTop, sigBot) { // naprężenia (ściskanie +) na końcach części c środnika
    const smax = Math.max(sigTop, sigBot), smin = Math.min(sigTop, sigBot);
    if (smax <= 0) return { cls: 1, psi: -Infinity, lim: [Infinity, Infinity, Infinity], tension: true };
    const ps = smin / smax;
    let l1, l2, l3;
    if (alpha >= 0.999 && ps >= 0.999) { l1 = 33 * eps; l2 = 38 * eps; l3 = 42 * eps; }
    else {
      l1 = alpha > 0.5 ? 396 * eps / (13 * alpha - 1) : 36 * eps / Math.max(alpha, 1e-6);
      l2 = alpha > 0.5 ? 456 * eps / (13 * alpha - 1) : 41.5 * eps / Math.max(alpha, 1e-6);
      l3 = ps > -1 ? 42 * eps / (0.67 + 0.33 * ps) : 62 * eps * (1 - ps) * Math.sqrt(-ps);
    }
    const cls = ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4;
    return { cls, psi: ps, lim: [l1, l2, l3] };
  };
  out.web = { n: 'środnik', typ: 'wewnętrzna', c, t, ct, alpha, ref: 'tabl. 5.2 (ark. 1)' };
  return out;
};

/* pełna klasyfikacja dla stanu (M, Nc) – naprężenia sprężyste określają ψ */
R.classAt = function (sec, fy, M, Nc) {
  const Mpos = M >= 0;
  const hasM = Math.abs(M) > 1;
  const k = R.classify(sec, fy, Mpos, Nc, hasM);
  const rw = sec.typ === 'walc' ? sec.r : Math.SQRT2 * (sec.aw || 0);
  const zT = sec.h - sec.tg - rw - sec.zc, zB = sec.td + rw - sec.zc;
  // σ (ściskanie +) = Nc/A + M·z/Iy  (M > 0 ściska górę)
  const Mref = hasM ? M : 0;
  const sT = Nc / sec.A + Mref * zT / sec.Iy, sB = Nc / sec.A + Mref * zB / sec.Iy;
  const w = k.webFn(sT, sB);
  Object.assign(k.web, w);
  const all = k.parts.concat([k.web]);
  k.cls = Math.max(...all.map(p => p.cls));
  k.all = all;
  return k;
};

/* ---------------------------------------------------------- przekrój efektywny (PN-EN 1993-1-5, 4.4) */
const rhoInternal = (lp, psi) => (lp <= 0.5 + Math.sqrt(0.085 - 0.055 * psi) ? 1 : Math.min(1, (lp - 0.055 * (3 + psi)) / (lp * lp)));
const rhoOutstand = (lp) => (lp <= 0.748 ? 1 : Math.min(1, (lp - 0.188) / (lp * lp)));
const kSigInternal = (psi) => (psi >= 1 ? 4 : psi > 0 ? 8.2 / (1.05 + psi) : psi === 0 ? 7.81 : psi > -1 ? 7.81 - 6.29 * psi + 9.78 * psi * psi : psi >= -3 ? 5.98 * (1 - psi) * (1 - psi) : 5.98 * 16);

// mode: 'Mpos' | 'Mneg' | 'N' – zwraca prostokąty efektywne i charakterystyki
R.effective = function (sec, fy, mode) {
  const eps = Math.sqrt(235 / fy);
  let rects = P.rects(sec);
  const info = [];
  const cutFlange = (id, c, t) => {
    const lp = (c / t) / (28.4 * eps * Math.sqrt(0.43));
    const rho = rhoOutstand(lp), cut = (1 - rho) * c;
    info.push({ el: id === 'fg' ? 'pas górny' : 'pas dolny', lp, rho, kS: 0.43, beff: rho * c, c });
    if (cut > 1e-6) {
      const r = rects.find(q => q.id === id);
      rects = rects.filter(q => q !== r);
      rects.push(Object.assign({}, r, { y0: r.y0 + cut, id: id + 'L' }), Object.assign({}, r, { y1: r.y1 - cut, id: id + 'P' }));
    }
  };
  if (mode === 'Mpos' || mode === 'N') cutFlange('fg', sec.c_fg, sec.tg);
  if (mode === 'Mneg' || mode === 'N') cutFlange('fd', sec.c_fd, sec.td);
  // środnik – rozkład naprężeń z przekroju z efektywnymi pasami i pełnym środnikiem
  const g1 = P.rectProps(rects);
  const rw = sec.typ === 'walc' ? sec.r : Math.SQRT2 * (sec.aw || 0);
  const zTw = sec.h - sec.tg - rw, zBw = sec.td + rw, c = zTw - zBw;
  let psi, zc = g1.zc;
  if (mode === 'N') psi = 1;
  else if (mode === 'Mpos') psi = (zBw - zc) / (zTw - zc); // σ ∝ (z − zc), ściskanie u góry
  else psi = (zTw - zc) / (zBw - zc);
  const kS = kSigInternal(psi);
  const lp = (c / sec.tw) / (28.4 * eps * Math.sqrt(kS));
  const rho = rhoInternal(lp, psi);
  let bc = psi < 0 ? c / (1 - psi) : c; // długość strefy ściskanej
  const beff = rho * bc;
  let hole = null;
  if (rho < 1) {
    let be1, be2;
    if (psi >= 1) { be1 = 0.5 * beff; be2 = 0.5 * beff; }
    else if (psi >= 0) { be1 = 2 * beff / (5 - psi); be2 = beff - be1; }
    else { be1 = 0.4 * beff; be2 = 0.6 * beff; }
    // strefa ściskana zaczyna się przy pasie ściskanym
    if (mode === 'Mpos') hole = [zTw - bc + be2, zTw - be1];
    else if (mode === 'Mneg') hole = [zBw + be1, zBw + bc - be2];
    else hole = [zBw + be2, zTw - be1];
    const w = rects.find(q => q.id === 'w');
    rects = rects.filter(q => q !== w);
    rects.push(Object.assign({}, w, { z1: hole[0], id: 'w1' }), Object.assign({}, w, { z0: hole[1], id: 'w2' }));
  }
  info.push({ el: 'środnik', lp, rho, kS, psi, bc, beff, c, hole });
  const g = P.rectProps(rects);
  return { rects, A: g.A, zc: g.zc, Iy: g.Iy, Wt: g.Wt, Wb: g.Wb, Weff: mode === 'Mpos' ? Math.min(g.Wt, g.Wb) : mode === 'Mneg' ? Math.min(g.Wt, g.Wb) : null, eN: g.zc - sec.zc, info, reduced: info.some(i => i.rho < 1) };
};

/* ---------------------------------------------------------- nośności podstawowe */
R.basic = function (sec, mat, ndp) {
  const fy = mat.fy, g0 = ndp.gM0, g1 = ndp.gM1;
  const eta = fy > 460 ? 1.0 : ndp.eta;
  const Av = sec.typ === 'walc' ? Math.max(sec.Avz, eta * sec.hw * sec.tw) : eta * sec.hw * sec.tw;
  const o = {
    fy, eps: Math.sqrt(235 / fy), eta, Av,
    Npl: sec.A * fy / g0,
    Vpl: Av * fy / (s3 * g0),
    Vplz_y: sec.Avy * fy / (s3 * g0),
    Mpl_pos: sec.Wpl_y * fy / g0, Mpl_neg: sec.Wpl_y * fy / g0,
    Mel_pos: Math.min(sec.Wel_t, sec.Wel_b) * fy / g0, Mel_neg: Math.min(sec.Wel_t, sec.Wel_b) * fy / g0,
    Mplz: sec.Wpl_z * fy / g0, Melz: sec.Wel_z * fy / g0,
    Mf: Math.min(sec.bg * sec.tg, sec.bd * sec.td) * sec.hs * fy / g0,
    hwtw: sec.hw / sec.tw
  };
  // klasy przy czystym zginaniu (+/−) i czystym ściskaniu
  o.kPos = R.classAt(sec, fy, 1e9, 0); o.kNeg = R.classAt(sec, fy, -1e9, 0); o.kN = R.classAt(sec, fy, 0, 1e6);
  o.effPos = o.kPos.cls === 4 ? R.effective(sec, fy, 'Mpos') : null;
  o.effNeg = o.kNeg.cls === 4 ? R.effective(sec, fy, 'Mneg') : null;
  o.effN = o.kN.cls === 4 ? R.effective(sec, fy, 'N') : null;
  const Wfor = (k, eff) => (k.cls <= 2 ? sec.Wpl_y : k.cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : eff.Weff);
  o.Wy_pos = Wfor(o.kPos, o.effPos); o.Wy_neg = Wfor(o.kNeg, o.effNeg);
  o.Mc_pos = o.Wy_pos * fy / g0; o.Mc_neg = o.Wy_neg * fy / g0;
  o.Aeff = o.effN ? o.effN.A : sec.A;
  o.Nc = o.Aeff * fy / g0;
  // pas – klasa przy zginaniu względem osi z (pasy wspornikowe zginane w swojej płaszczyźnie: przyjęto klasę pasa)
  o.Wz = o.kN.parts.every(p => p.cls <= 2) ? sec.Wpl_z : sec.Wel_z;
  o.Mcz = o.Wz * fy / g0;
  return o;
};

/* nośność plastyczna przy zginaniu ze siłą osiową (przekrój dowolny – numerycznie): MN,y,Rd */
R.MNpl = function (sec, fy, Nc, Mpos, g0) {
  // oś obojętna: pole ściskane − pole rozciągane = Nc/fy
  const A = sec.A, Ac = U.clamp((A + Nc / fy) / 2, 0, A);
  let lo = 0, hi = sec.h;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const a = P.integrals(P.clip(sec.pts, m, Mpos), 0).A;
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  const zp = (lo + hi) / 2;
  const up = P.integrals(P.clip(sec.pts, zp, true), sec.zc), dn = P.integrals(P.clip(sec.pts, zp, false), sec.zc);
  // moment względem środka ciężkości: ściskanie u góry (Mpos) → M = fy(∫_up z − ∫_dn z)
  // moment względem środka ciężkości przekroju brutto (ściskanie po stronie Mpos)
  const M = fy * (up.Sz - dn.Sz);
  return Math.abs(M) / g0;
};

/* ---------------------------------------------------------- sprawdzenie przekroju w punkcie */
// kontekst kombinacji: klasa i nośności zależne od N (stałej w kombinacji) i znaku M
R.ctx = function (sec, b, ndp, Nc, Mpos, Mneg) {
  const fy = b.fy, g0 = ndp.gM0;
  const small = Math.abs(Nc) < 1e-3 * b.Npl;
  const one = (sign, Mref) => {
    const k = small ? (sign > 0 ? b.kPos : b.kNeg) : R.classAt(sec, fy, sign * Math.max(Math.abs(Mref), 1e3), Nc);
    let Wy, eff = null;
    if (k.cls <= 2) Wy = sec.Wpl_y; else if (k.cls === 3) Wy = Math.min(sec.Wel_t, sec.Wel_b);
    else { eff = sign > 0 ? (b.effPos || R.effective(sec, fy, 'Mpos')) : (b.effNeg || R.effective(sec, fy, 'Mneg')); Wy = eff.Weff; }
    let MN = null, negl = true;
    if (k.cls <= 2) {
      negl = Math.abs(Nc) <= 0.25 * b.Npl && Math.abs(Nc) <= 0.5 * sec.hw * sec.tw * fy / g0; // 6.2.9.1(4)
      MN = negl ? Wy * fy / g0 : Math.min(Wy * fy / g0, R.MNpl(sec, fy, Nc, sign > 0, g0));
    }
    return { k, cls: k.cls, Wy, eff, MN, negl };
  };
  const o = { Nc, pos: one(1, Mpos), neg: one(-1, Mneg) };
  if (Nc > 0 && Math.max(o.pos.cls, o.neg.cls) === 4) o.effN = b.effN || R.effective(sec, fy, 'N');
  return o;
};
// e: { M, V, Mz, Vy } [Nmm, N]; ctx – z R.ctx; zwraca wytężenia składowe
R.atPoint = function (sec, b, ndp, e, ctx) {
  const fy = b.fy, g0 = ndp.gM0, Nc = ctx.Nc;
  const M = e.M, V = Math.abs(e.V), Mz = Math.abs(e.Mz || 0), Vy = Math.abs(e.Vy || 0);
  const c = M >= 0 ? ctx.pos : ctx.neg;
  const out = { cls: c.cls };
  out.uV = V / b.Vpl; out.uVy = Vy / b.Vplz_y;
  const rho = V > 0.5 * b.Vpl ? Math.pow(2 * V / b.Vpl - 1, 2) : 0;
  out.rho = rho;
  let McRd = c.Wy * fy / g0, red = 1;
  if (rho > 0) {
    if (c.cls <= 2) { const Aw = sec.hw * sec.tw; const Mv = (sec.Wpl_y - rho * Aw * Aw / (4 * sec.tw)) * fy / g0; red = Math.min(1, Mv / McRd); }
    else {
      const s2 = Object.assign({}, sec, { tw: (1 - rho) * sec.tw, r: 0 });
      const rp = P.rectProps(P.rects(s2).filter(r => r.id !== 'r'));
      red = Math.min(1, Math.min(rp.Wt, rp.Wb) / Math.min(sec.Wel_t, sec.Wel_b));
    }
    McRd *= red;
  }
  out.McRd = McRd;
  const n = Math.abs(Nc) / b.Npl;
  if (c.cls <= 2) {
    const MN = c.MN * red;
    const a = Math.min(0.5, (sec.A - (sec.bg * sec.tg + sec.bd * sec.td)) / sec.A);
    const MNz = n <= a ? b.Mplz : b.Mplz * (1 - Math.pow((n - a) / (1 - a), 2));
    out.MN = MN; out.MNz = MNz;
    if (Mz > 0) { const be = Math.max(1, 5 * n); out.uMN = Math.pow(Math.abs(M) / MN, 2) + Math.pow(Mz / MNz, be); out.f = '6.41'; }
    else { out.uMN = Math.abs(M) / MN; out.f = c.negl ? '6.12' : '6.31'; }
  } else {
    let Aeff = sec.A, eN = 0;
    if (c.cls === 4 && Nc > 0 && ctx.effN) { Aeff = ctx.effN.A; eN = ctx.effN.eN; }
    const sx = Math.abs(Nc) / Aeff + (Math.abs(M) + Math.abs(Nc * eN)) / (c.Wy * red) + Mz / sec.Wel_z;
    out.uMN = sx / (fy / g0);
    out.f = c.cls === 3 ? '6.42' : '6.44';
  }
  out.uN = Math.abs(Nc) / (Nc > 0 ? b.Nc : b.Npl);
  out.u = Math.max(out.uMN, out.uV, out.uVy, out.uN);
  return out;
};

/* ---------------------------------------------------------- wyboczenie przy ścinaniu (PN-EN 1993-1-5, 5) */
R.shearBuckling = function (sec, b, ndp, opt) {
  const fy = b.fy, eps = b.eps, eta = b.eta, t = sec.tw, hw = sec.hw;
  const a = opt && opt.a > 0 ? opt.a : Infinity;
  const kt = a === Infinity ? 5.34 : (a / hw >= 1 ? 5.34 + 4 * Math.pow(hw / a, 2) : 4 + 5.34 * Math.pow(hw / a, 2));
  const limit = a === Infinity ? 72 * eps / eta : 31 * eps * Math.sqrt(kt) / eta;
  const need = hw / t > limit;
  const lw = a === Infinity ? hw / (86.4 * t * eps) : hw / (37.4 * t * eps * Math.sqrt(kt));
  const rigid = opt && opt.sztywny;
  let chi;
  if (lw < 0.83 / eta) chi = eta;
  else if (lw < 1.08) chi = 0.83 / lw;
  else chi = rigid ? 1.37 / (0.7 + lw) : 0.83 / lw;
  const Vbw = chi * fy * hw * t / (s3 * ndp.gM1);
  const Vmax = eta * fy * hw * t / (s3 * ndp.gM1);
  return { need, limit, ht: hw / t, kt, a, lw, chi, Vbw, Vb: Math.min(Vbw, Vmax), Vmax, rigid };
};

/* interakcja M–V z wyboczeniem przy ścinaniu (7.1) */
R.interMV = function (b, sb, M, V) {
  const e1 = Math.abs(M) / b.Mpl_pos, e3 = Math.abs(V) / sb.Vbw;
  const mf = b.Mf / b.Mpl_pos;
  if (e3 <= 0.5) return { u: e3, e1, e3, f: '(7.1) η̄3 ≤ 0,5 – bez interakcji' };
  if (e1 < mf) return { u: e3, e1, e3, f: '(7.1) η̄1 < Mf,Rd/Mpl,Rd – pasy przenoszą moment' };
  return { u: e1 + (1 - mf) * Math.pow(2 * e3 - 1, 2), e1, e3, f: '(7.1) η̄1 + (1 − Mf,Rd/Mpl,Rd)(2η̄3 − 1)² ≤ 1' };
};

/* ---------------------------------------------------------- obciążenie skupione środnika (PN-EN 1993-1-5, 6) */
// o: { F [N], ss, typ: 'a'|'c', c (odległość do końca belki), pas: 'g'|'d', a (rozstaw żeber) }
R.patch = function (sec, b, ndp, o) {
  const E = U.E, fyw = b.fy, fyf = b.fy, tw = sec.tw, hw = sec.hw;
  const tf = o.pas === 'd' ? sec.td : sec.tg, bf = o.pas === 'd' ? sec.bd : sec.bg;
  const a = o.a > 0 ? o.a : Infinity;
  const ss = Math.max(0, o.ss || 0), c = Math.max(0, o.c || 0);
  const m1 = fyf * bf / (fyw * tw);
  const run = (m2) => {
    let kF, ly, le = null;
    if (o.typ === 'c') {
      kF = Math.min(6, 2 + 6 * (ss + c) / hw);
      le = Math.min(kF * E * tw * tw / (2 * fyw * hw), ss + c);
      const l1 = le + tf * Math.sqrt(m1 / 2 + Math.pow(le / tf, 2) + m2);
      const l2 = le + tf * Math.sqrt(m1 + m2);
      ly = Math.min(l1, l2, ss + 2 * tf * (1 + Math.sqrt(m1 + m2)));
    } else {
      kF = 6 + 2 * (a === Infinity ? 0 : Math.pow(hw / a, 2));
      ly = Math.min(ss + 2 * tf * (1 + Math.sqrt(m1 + m2)), a);
    }
    const Fcr = 0.9 * kF * E * tw * tw * tw / hw;
    const lF = Math.sqrt(ly * tw * fyw / Fcr);
    return { kF, ly, le, Fcr, lF, m2 };
  };
  let r = run(0.02 * Math.pow(hw / tf, 2));
  if (r.lF <= 0.5) r = run(0);
  const chi = Math.min(1, 0.5 / r.lF);
  const Leff = chi * r.ly;
  const FRd = fyw * Leff * tw / ndp.gM1;
  return Object.assign(r, { m1, chi, Leff, FRd, F: o.F, u: Math.abs(o.F) / FRd, tf, bf, ss, c, typ: o.typ });
};

/* ---------------------------------------------------------- żebro podporowe (PN-EN 1993-1-5, 9.4; PN-EN 1993-1-1, 6.3.1) */
// o: { F, bs, ts, ch (fazka), koniec: true – żebro na końcu belki (jednostronny udział środnika), e (odl. do końca), pasyUstalone }
R.stiffener = function (sec, b, ndp, o) {
  const fy = b.fy, eps = b.eps, tw = sec.tw, hw = sec.hw;
  const bs = o.bs, ts = o.ts;
  const lw = 15 * eps * tw;
  const left = o.koniec ? Math.min(lw, Math.max(0, o.e || 0)) : lw;
  const right = lw;
  const As = 2 * bs * ts + (left + right + ts) * tw;
  const Is = ts * Math.pow(2 * bs + tw, 3) / 12 + (left + right) * Math.pow(tw, 3) / 12;
  const i = Math.sqrt(Is / As);
  const Lcr = (o.pasyUstalone === false ? 1.0 : 0.75) * hw;
  const lam1 = 93.9 * eps, lam = Lcr / (i * lam1);
  const al = 0.49; // krzywa c
  const ph = 0.5 * (1 + al * (lam - 0.2) + lam * lam);
  const chi = Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lam * lam)));
  const NbRd = chi * As * fy / ndp.gM1;
  const Acont = 2 * Math.max(0, bs - (o.ch || 0)) * ts;
  const Fbear = Acont * fy / ndp.gM0;
  // wymagana sztywność/smukłość ścianek żebra (pas wspornikowy kl. 3: bs/ts ≤ 14ε)
  const ctS = bs / ts, ctLim = 14 * eps;
  return { As, Is, i, Lcr, lam, chi, NbRd, Acont, Fbear, uB: Math.abs(o.F) / NbRd, uC: Math.abs(o.F) / Fbear, ctS, ctLim, lw: left + right, F: o.F, bs, ts };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
