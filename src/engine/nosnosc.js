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

/* ---------------------------------------------------------- klasyfikacja (tabl. 5.2) */
// położenie osi obojętnej plastycznej przy sile Nc (ściskanie +) i ściskanej stronie Mpos
function plasticNA(sec, fy, Nc, Mpos) {
  const Ac = U.clamp((sec.A + Nc / fy) / 2, 0, sec.A);
  let lo = 0, hi = sec.h;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    const a = P.integrals(P.clip(sec.rings, m, Mpos), 0).A; // pole po stronie ściskanej
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  return (lo + hi) / 2;
}
R.plasticNA = plasticNA;
// klasa ścianki wewnętrznej przy rozkładzie (α – plastycznie, ψ – sprężyście)
function internalClass(ct, eps, alpha, ps) {
  let l1, l2, l3;
  if (alpha >= 0.999 && ps >= 0.999) { l1 = 33 * eps; l2 = 38 * eps; l3 = 42 * eps; }
  else {
    l1 = alpha > 0.5 ? 396 * eps / (13 * alpha - 1) : 36 * eps / Math.max(alpha, 1e-6);
    l2 = alpha > 0.5 ? 456 * eps / (13 * alpha - 1) : 41.5 * eps / Math.max(alpha, 1e-6);
    l3 = ps > -1 ? 42 * eps / (0.67 + 0.33 * ps) : 62 * eps * (1 - ps) * Math.sqrt(-ps);
  }
  return { cls: ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4, lim: [l1, l2, l3] };
}
/* pełna klasyfikacja dla stanu (M, Nc): M > 0 – ściskana góra przekroju; Nc > 0 – ściskanie */
R.classAt = function (sec, fy, M, Nc) {
  const eps = Math.sqrt(235 / fy);
  const Mpos = M >= 0, hasM = Math.abs(M) > 1;
  const sig = (z) => Nc / sec.A + (hasM ? M : 0) * (z - sec.zc) / sec.Iy; // ściskanie +
  const out = { eps, all: [] };
  if (sec.kind === 'L') {
    // kątowniki: przy ściskaniu – tabl. 5.2 (ark. 3); przy zginaniu – ramiona jako ścianki wspornikowe (ark. 2) z rozkładem naprężeń
    const { h, b, t } = sec;
    if (!hasM) {
      const r1 = h / t, r2 = (b + h) / (2 * t), c3 = r1 <= 15 * eps && r2 <= 11.5 * eps;
      out.all.push({ n: 'kątownik ściskany: h/t', typ: 'kątownik', c: h, t, ct: r1, lim: [Infinity, Infinity, 15 * eps], cls: c3 ? 3 : 4, ref: 'tabl. 5.2 (ark. 3)' });
      out.all.push({ n: 'kątownik ściskany: (b + h)/2t', typ: 'kątownik', c: (b + h) / 2, t, ct: r2, lim: [Infinity, Infinity, 11.5 * eps], cls: c3 ? 3 : 4, ref: 'tabl. 5.2 (ark. 3)' });
    } else {
      const zpL = plasticNA(sec, fy, Nc, Mpos);
      const top = sec.poz === 'gora';
      // ramię pionowe: krawędź swobodna u góry (poz = dol) lub u dołu (gora)
      const zTip = top ? 0 : h, zRoot = top ? h : 0;
      const sTip = sig(zTip), sRoot = sig(zRoot), ct = h / t;
      if (Math.max(sTip, sRoot) <= 0) out.all.push({ n: 'ramię pionowe', typ: 'wspornikowa', c: h, t, ct, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: 'tabl. 5.2 (ark. 2)' });
      else {
        const tipC = sTip >= sRoot;
        const alpha = U.clamp(tipC ? Math.abs(zTip - zpL) / h : Math.abs(zpL - zRoot) / h, 1e-6, 1);
        let ks, l1, l2;
        if (tipC) { const ps = sRoot / sTip; ks = ps >= 1 ? 0.43 : 0.57 - 0.21 * ps + 0.07 * ps * ps; l1 = 9 * eps / alpha; l2 = 10 * eps / alpha; }
        else { const ps = sTip / sRoot; ks = ps >= 1 ? 0.43 : ps > 0 ? 0.578 / (ps + 0.34) : ps > -1 ? 1.7 - 5 * ps + 17.1 * ps * ps : 23.8; l1 = 9 * eps / (alpha * Math.sqrt(alpha)); l2 = 10 * eps / (alpha * Math.sqrt(alpha)); }
        const l3 = 21 * eps * Math.sqrt(ks);
        out.all.push({ n: `ramię pionowe (${tipC ? 'ściskana krawędź swobodna' : 'rozciągana krawędź swobodna'})`, typ: 'wspornikowa', c: h, t, ct, alpha, lim: [l1, l2, l3], cls: ct <= l1 ? 1 : ct <= l2 ? 2 : ct <= l3 ? 3 : 4, ref: 'tabl. 5.2 (ark. 2)' });
      }
      const zH = top ? h - t / 2 : t / 2, sH = sig(zH), cth = b / t;
      if (sH <= 0) out.all.push({ n: 'ramię poziome', typ: 'wspornikowa', c: b, t, ct: cth, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: 'tabl. 5.2 (ark. 2)' });
      else { const lim = [9 * eps, 10 * eps, 14 * eps]; out.all.push({ n: 'ramię poziome (ściskane)', typ: 'wspornikowa', c: b, t, ct: cth, lim, cls: cth <= lim[0] ? 1 : cth <= lim[1] ? 2 : cth <= lim[2] ? 3 : 4, ref: 'tabl. 5.2 (ark. 2)' }); }
    }
    out.cls = Math.max(...out.all.map(p => p.cls)); out.alpha = 0.5; out.parts = out.all.slice(1); out.web = out.all[0];
    return out;
  }
  const zp = hasM ? plasticNA(sec, fy, Nc, Mpos) : null;
  sec.parts.forEach(p => {
    const ct = p.c / p.t;
    if (p.side === 'web') {
      const c = p.z1 - p.z0;
      let alpha;
      if (!hasM) alpha = Nc >= 0 ? 1 : 0;
      else alpha = U.clamp(Mpos ? (p.z1 - zp) / c : (zp - p.z0) / c, 0, 1);
      const sT = sig(p.z1), sB = sig(p.z0), smax = Math.max(sT, sB), smin = Math.min(sT, sB);
      if (smax <= 0) { out.all.push({ n: p.n, typ: 'wewnętrzna', c: p.c, t: p.t, ct, alpha, psi: -Infinity, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: 'tabl. 5.2 (ark. 1)' }); return; }
      const ps = smin / smax, k = internalClass(ct, eps, alpha, ps);
      out.all.push({ n: p.n, typ: 'wewnętrzna', c: p.c, t: p.t, ct, alpha, psi: ps, lim: k.lim, cls: k.cls, ref: 'tabl. 5.2 (ark. 1)' });
      out.alpha = alpha;
    } else {
      const sg = sig(p.z);
      if (sg <= 0) { out.all.push({ n: p.n, typ: p.typ === 'wsp' ? 'wspornikowa' : 'wewnętrzna', c: p.c, t: p.t, ct, lim: [Infinity, Infinity, Infinity], cls: 1, tension: true, ref: p.typ === 'wsp' ? 'tabl. 5.2 (ark. 2)' : 'tabl. 5.2 (ark. 1)' }); return; }
      const lim = p.typ === 'wsp' ? [9 * eps, 10 * eps, 14 * eps] : [33 * eps, 38 * eps, 42 * eps];
      out.all.push({ n: p.n, typ: p.typ === 'wsp' ? 'wspornikowa' : 'wewnętrzna', c: p.c, t: p.t, ct, lim, cls: ct <= lim[0] ? 1 : ct <= lim[1] ? 2 : ct <= lim[2] ? 3 : 4, ref: p.typ === 'wsp' ? 'tabl. 5.2 (ark. 2)' : 'tabl. 5.2 (ark. 1)' });
    }
  });
  out.cls = Math.max(...out.all.map(p => p.cls));
  out.parts = out.all.filter(p => !/środnik|boczne/.test(p.n));
  out.web = out.all.find(p => /środnik|boczne/.test(p.n)) || out.all[out.all.length - 1];
  return out;
};

/* ---------------------------------------------------------- przekrój efektywny (PN-EN 1993-1-5, 4.4) */
const rhoInternal = (lp, psi) => (lp <= 0.5 + Math.sqrt(0.085 - 0.055 * psi) ? 1 : Math.min(1, (lp - 0.055 * (3 + psi)) / (lp * lp)));
const rhoOutstand = (lp) => (lp <= 0.748 ? 1 : Math.min(1, (lp - 0.188) / (lp * lp)));
const kSigInternal = (psi) => (psi >= 1 ? 4 : psi > 0 ? 8.2 / (1.05 + psi) : psi === 0 ? 7.81 : psi > -1 ? 7.81 - 6.29 * psi + 9.78 * psi * psi : psi >= -3 ? 5.98 * (1 - psi) * (1 - psi) : 5.98 * 16);

// mode: 'Mpos' | 'Mneg' | 'N' – zwraca prostokąty efektywne i charakterystyki
R.effective = function (sec, fy, mode) {
  if (sec.kind === 'L') throw new Error('Kątownik klasy 4 – przekrój efektywny kątownika nie jest obsługiwany (dobierz grubszy kątownik).');
  const eps = Math.sqrt(235 / fy);
  let rects = P.rects(sec);
  const info = [];
  const flange = (id) => {
    const p = sec.parts.find(q => q.side === (id === 'fg' ? 'top' : 'bot'));
    if (!p) return;
    const out = p.typ === 'wsp';
    const kS = out ? 0.43 : 4;
    const lp = (p.c / p.t) / (28.4 * eps * Math.sqrt(kS));
    const rho = out ? rhoOutstand(lp) : rhoInternal(lp, 1), cut = (1 - rho) * p.c;
    info.push({ el: p.n, lp, rho, kS, beff: rho * p.c, c: p.c });
    if (cut <= 1e-6) return;
    const r = rects.find(q => q.id === id);
    rects = rects.filter(q => q !== r);
    if (!out) { const ym = (r.y0 + r.y1) / 2; rects.push(Object.assign({}, r, { y1: ym - cut / 2, id: id + 'L' }), Object.assign({}, r, { y0: ym + cut / 2, id: id + 'P' })); }   // ścianka wewnętrzna – część środkowa nieefektywna
    else if (r.tip === 'right') rects.push(Object.assign({}, r, { y1: r.y1 - cut, id: id + 'e' }));
    else rects.push(Object.assign({}, r, { y0: r.y0 + cut, y1: r.y1 - cut, id: id + 'e' }));     // dwuteownik – krawędzie swobodne po obu stronach
  };
  if (mode === 'Mpos' || mode === 'N') flange('fg');
  if (mode === 'Mneg' || mode === 'N') flange('fd');
  // ścianki pionowe – rozkład naprężeń z przekroju z efektywnymi pasami i pełnymi ściankami
  const g1 = P.rectProps(rects);
  const pw = sec.parts.find(q => q.side === 'web');
  const zTw = pw.z1, zBw = pw.z0, c = zTw - zBw;
  let psi; const zc = g1.zc;
  if (mode === 'N') psi = 1;
  else if (mode === 'Mpos') psi = (zBw - zc) / (zTw - zc); // σ ∝ (z − zc), ściskanie u góry
  else psi = (zTw - zc) / (zBw - zc);
  const kS = kSigInternal(psi);
  const lp = (c / pw.t) / (28.4 * eps * Math.sqrt(kS));
  const rho = rhoInternal(lp, psi);
  const bc = psi < 0 ? c / (1 - psi) : c; // długość strefy ściskanej
  const beff = rho * bc;
  let hole = null;
  if (rho < 1) {
    let be1, be2;
    if (psi >= 1) { be1 = 0.5 * beff; be2 = 0.5 * beff; }
    else if (psi >= 0) { be1 = 2 * beff / (5 - psi); be2 = beff - be1; }
    else { be1 = 0.4 * beff; be2 = 0.6 * beff; }
    if (mode === 'Mpos') hole = [zTw - bc + be2, zTw - be1];
    else if (mode === 'Mneg') hole = [zBw + be1, zBw + bc - be2];
    else hole = [zBw + be2, zTw - be1];
    const ws = rects.filter(q => q.id === 'w');
    rects = rects.filter(q => q.id !== 'w');
    ws.forEach(w => rects.push(Object.assign({}, w, { z1: hole[0], id: 'w1' }), Object.assign({}, w, { z0: hole[1], id: 'w2' })));
  }
  info.push({ el: pw.n, lp, rho, kS, psi, bc, beff, c, hole });
  const g = P.rectProps(rects);
  return { rects, A: g.A, zc: g.zc, Iy: g.Iy, Wt: g.Wt, Wb: g.Wb, Weff: mode === 'N' ? null : Math.min(g.Wt, g.Wb), eN: g.zc - sec.zc, info, reduced: info.some(i => i.rho < 1) };
};

/* ---------------------------------------------------------- nośności podstawowe */
R.basic = function (sec, mat, ndp) {
  const fy = mat.fy, g0 = ndp.gM0, g1 = ndp.gM1;
  const eta = fy > 460 ? 1.0 : ndp.eta;
  const Av = sec.kind === 'I' ? (sec.typ === 'walc' ? Math.max(sec.Avz, eta * sec.hw * sec.tw) : eta * sec.hw * sec.tw) : sec.Avz;
  const o = {
    fy, eps: Math.sqrt(235 / fy), eta, Av,
    Npl: sec.A * fy / g0,
    Vpl: Av * fy / (s3 * g0),
    Vplz_y: sec.Avy * fy / (s3 * g0),
    Mpl_pos: sec.Wpl_y * fy / g0, Mpl_neg: sec.Wpl_y * fy / g0,
    Mel_pos: Math.min(sec.Wel_t, sec.Wel_b) * fy / g0, Mel_neg: Math.min(sec.Wel_t, sec.Wel_b) * fy / g0,
    Mplz: sec.Wpl_z * fy / g0, Melz: sec.Wel_z * fy / g0,
    Mf: (sec.Af || 0) * sec.hs * fy / g0,
    hwtw: sec.hw / sec.tw
  };
  // klasy przy czystym zginaniu (+/−) i czystym ściskaniu
  o.kPos = R.classAt(sec, fy, 1e9, 0); o.kNeg = R.classAt(sec, fy, -1e9, 0); o.kN = R.classAt(sec, fy, 0, 1e6);
  o.effPos = o.kPos.cls === 4 ? R.effective(sec, fy, 'Mpos') : null;
  o.effNeg = o.kNeg.cls === 4 ? R.effective(sec, fy, 'Mneg') : null;
  o.effN = null;
  if (o.kN.cls === 4) { try { o.effN = R.effective(sec, fy, 'N'); } catch (e) { o.effNerr = e.message; } }
  const Wfor = (k, eff) => (k.cls <= 2 ? sec.Wpl_y : k.cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : eff.Weff);
  o.Wy_pos = Wfor(o.kPos, o.effPos); o.Wy_neg = Wfor(o.kNeg, o.effNeg);
  o.Mc_pos = o.Wy_pos * fy / g0; o.Mc_neg = o.Wy_neg * fy / g0;
  o.Aeff = o.effN ? o.effN.A : sec.A;   // kątownik kl. 4 przy ściskaniu – sprawdzenie blokowane w projekt.js
  o.Nc = o.Aeff * fy / g0;
  // pas – klasa przy zginaniu względem osi z (pasy wspornikowe zginane w swojej płaszczyźnie: przyjęto klasę pasa)
  o.Wz = o.kN.cls <= 2 ? sec.Wpl_z : sec.Wel_z;
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
    const a = P.integrals(P.clip(sec.rings, m, Mpos), 0).A;
    if (Mpos) { if (a > Ac) lo = m; else hi = m; } else { if (a > Ac) hi = m; else lo = m; }
  }
  const zp = (lo + hi) / 2;
  const up = P.integrals(P.clip(sec.rings, zp, true), sec.zc), dn = P.integrals(P.clip(sec.rings, zp, false), sec.zc);
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
      negl = Math.abs(Nc) <= 0.25 * b.Npl && Math.abs(Nc) <= 0.5 * sec.Aw * fy / g0; // 6.2.9.1(4)
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
    if (c.cls <= 2) { const Aw = sec.Aw; const Mv = (sec.Wpl_y - rho * Aw * Aw / (4 * sec.tw * (sec.nWeb || 1))) * fy / g0; red = Math.min(1, Mv / McRd); }
    else {
      const rp = P.rectProps(P.rects(sec, (1 - rho) * sec.tw).filter(r => r.id !== 'r'));
      red = Math.min(1, Math.min(rp.Wt, rp.Wb) / Math.min(sec.Wel_t, sec.Wel_b));
    }
    McRd *= red;
  }
  out.McRd = McRd;
  const n = Math.abs(Nc) / b.Npl;
  if (c.cls <= 2) {
    const MN = c.MN * red;
    const a = sec.kind === 'RHS' ? Math.min(0.5, (sec.A - 2 * sec.b * sec.t) / sec.A) : sec.kind === 'I' ? Math.min(0.5, (sec.A - (sec.bg * sec.tg + sec.bd * sec.td)) / sec.A) : 0.5;
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
  const nw = sec.nWeb || 1;
  const Vbw = nw * chi * fy * hw * t / (s3 * ndp.gM1);
  const Vmax = nw * eta * fy * hw * t / (s3 * ndp.gM1);
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
  const tf = o.pas === 'd' ? sec.td : sec.tg, bf = sec.kind === 'RHS' ? sec.b / 2 : (o.pas === 'd' ? sec.bd : sec.bg);
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
  const nw = sec.nWeb || 1;
  const FRd = nw * fyw * Leff * tw / ndp.gM1;
  return Object.assign(r, { m1, chi, Leff, FRd, F: o.F, u: Math.abs(o.F) / FRd, tf, bf, ss, c, typ: o.typ, nw });
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
