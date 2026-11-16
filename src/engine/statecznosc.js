/* =====================================================================
   BelkaStal – stateczność elementu (PN-EN 1993-1-1, 6.3)
   • Mcr – sprężysty moment krytyczny z analizy MES całej belki w danym
     etapie (rzeczywisty rozkład My, wysokość przyłożenia obciążeń,
     monosymetria βz, podpory widełkowe/utwierdzenia, stężenia dyskretne
     i ciągłe na wysokości pasa).  αcr dotyczy całej belki – w każdym
     segmencie Mcr,seg = αcr·|MEd,max,seg| (podejście bezpieczne).
   • χLT – 6.3.2.2 (ogólna) lub 6.3.2.3 (walcowane i spawane równoważne)
     z modyfikacją f (kc wg tabl. 6.6 dla rozkładu liniowego, w pozostałych
     przypadkach kc = 1/√C1, C1 z MES segmentu na podporach widełkowych).
   • 6.3.1 – wyboczenie giętne/skrętne, 6.3.3 – interakcja (zał. B).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, F = BS.FE, S = BS.S;
const T = BS.T = {};
const ALPHA = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 };
T.ALPHA = ALPHA;

T.chi = (lam, al) => { if (lam <= 0.2) return 1; const ph = 0.5 * (1 + al * (lam - 0.2) + lam * lam); return Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lam * lam))); };

// krzywe wyboczenia giętnego – tabl. 6.2
T.curveFlex = function (sec, fy) {
  const hb = sec.h / Math.max(sec.bg, sec.bd), tf = Math.max(sec.tg, sec.td);
  if (sec.typ === 'walc') {
    if (fy >= 460) { if (hb > 1.2) return tf <= 40 ? { y: 'a0', z: 'a0' } : { y: 'a', z: 'a' }; return tf <= 100 ? { y: 'a', z: 'a' } : { y: 'c', z: 'c' }; }
    if (hb > 1.2) return tf <= 40 ? { y: 'a', z: 'b' } : { y: 'b', z: 'c' };
    return tf <= 100 ? { y: 'b', z: 'c' } : { y: 'd', z: 'd' };
  }
  return tf <= 40 ? { y: 'b', z: 'c' } : { y: 'c', z: 'd' };
};
// krzywe zwichrzenia – tabl. 6.4 (ogólna) i 6.5 (6.3.2.3)
T.curveLT = function (sec, met) {
  const hb = sec.h / Math.min(sec.bg, sec.bd);
  if (met === '6.3.2.3') return sec.typ === 'walc' ? (hb <= 2 ? 'b' : 'c') : (hb <= 2 ? 'c' : 'd');
  return sec.typ === 'walc' ? (hb <= 2 ? 'a' : 'b') : (hb <= 2 ? 'c' : 'd');
};

T.chiLT = function (lam, MEd, Mcr, sec, ndp, kc, met) {
  const curve = T.curveLT(sec, met), al = ALPHA[curve];
  const o = { met, curve, alLT: al, lam, kc };
  if (met === '6.3.2.3') {
    const l0 = +ndp.lamLT0, be = +ndp.betaLT;
    o.lam0 = l0; o.beta = be;
    if (lam <= l0 || Math.abs(MEd) / Mcr <= l0 * l0) { o.skip = true; o.chi = 1; o.f = 1; o.chimod = 1; return o; }
    const ph = 0.5 * (1 + al * (lam - l0) + be * lam * lam);
    o.phi = ph;
    o.chi = Math.min(1, 1 / lam / lam, 1 / (ph + Math.sqrt(ph * ph - be * lam * lam)));
    o.f = Math.min(1, 1 - 0.5 * (1 - kc) * (1 - 2 * Math.pow(lam - 0.8, 2)));
    o.chimod = Math.min(1, 1 / lam / lam, o.chi / o.f);
  } else {
    o.lam0 = 0.2; o.beta = 1;
    if (lam <= 0.2 || Math.abs(MEd) / Mcr <= 0.04) { o.skip = true; o.chi = 1; o.f = 1; o.chimod = 1; return o; }
    const ph = 0.5 * (1 + al * (lam - 0.2) + lam * lam);
    o.phi = ph; o.chi = Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lam * lam))); o.f = 1; o.chimod = o.chi;
  }
  return o;
};

/* opis obciążeń kombinacji dla zwichrzenia: rozłożone (na elementach siatki) i skupione z wysokością względem ŚŚ */
T.heightOf = (sec, wys) => (wys === 'pas_g' ? sec.h - sec.zs : wys === 'pas_d' ? -sec.zs : 0);
T.restrZ = (sec, wys) => (wys === 'pas_g' ? sec.h - sec.tg / 2 - sec.zs : wys === 'pas_d' ? sec.td / 2 - sec.zs : 0);

T.loadsForCombo = function (md, an, sec, combo) {
  const dist = [], pts = [];
  const R = an.res[combo.etap];
  combo.terms.forEach(t => {
    const r = R[t.id]; if (!r) return;
    r.c.parts.forEach(p => {
      if (p.kier !== 'z') return;
      const e = T.heightOf(sec, p.wys);
      const segs = t.seg ? t.seg.map(i => md.seg[i]) : [{ x0: 0, x1: md.L }];
      segs.forEach(sg => {
        if (p.typ === 'q') {
          const a = Math.max(p.x0, sg.x0), b = Math.min(p.x1, sg.x1); if (b - a < 1e-6) return;
          const qa = p.q0 + (p.q1 - p.q0) * (a - p.x0) / (p.x1 - p.x0), qb = p.q0 + (p.q1 - p.q0) * (b - p.x0) / (p.x1 - p.x0);
          dist.push({ x0: a, x1: b, w0: t.f * qa, w1: t.f * qb, e });
        } else if (p.typ === 'P') {
          if (t.seg && md.segOf(p.x) !== md.seg.indexOf(sg)) return;
          pts.push({ x: p.x, P: t.f * p.P, e });
        }
      });
    });
  });
  return { dist, pts };
};

T.bcStage = function (md, sec, s, xs) {
  const bc = [], springs = [];
  md.systems[s].forEach(p => bc.push({ x: p.x, u: true, phi: true, du: p.ltb === 'pelne', dphi: p.ltb === 'pelne' }));
  md.stez.filter(z => z.od <= s).forEach(z => {
    if (z.typ === 'pelne') bc.push({ x: z.x, u: true, phi: true });
    else if (z.typ === 'skretne') springs.push({ x: z.x, kt: 'rigid' });
    else springs.push({ x: z.x, k: 'rigid', zr: T.restrZ(sec, z.wys) });
  });
  const c = md.ciagle || {};
  if (c.pasG && U.num(c.odEtapu, 0) <= s) xs.forEach(x => springs.push({ x, k: 'rigid', zr: T.restrZ(sec, 'pas_g') }));
  if (c.pasD && U.num(c.odEtapuD, 0) <= s) xs.forEach(x => springs.push({ x, k: 'rigid', zr: T.restrZ(sec, 'pas_d') }));
  return { bc, springs };
};

// segmenty zwichrzeniowe: między podporami i stężeniami dyskretnymi aktywnymi w etapie s
T.segments = function (md, s) {
  const pts = new Set([0, md.L]);
  md.systems[s].forEach(p => pts.add(p.x));
  md.stez.filter(z => z.od <= s).forEach(z => pts.add(z.x));
  const xs = Array.from(pts).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 1) out.push({ x0: xs[i - 1], x1: xs[i] });
  // wolny koniec wspornika
  out.forEach(sg => { sg.free = (sg.x0 === 0 && md.wL > 0) || (sg.x1 === md.L && md.wP > 0); });
  return out;
};

T.mcrRun = function (md, an, sec, E, G, combo, Marr) {
  const xs = md.xl, ne = xs.length - 1;
  const ld = T.loadsForCombo(md, an, sec, combo);
  const Mfun = (e) => [S.at(an.xs, Marr, xs[e]), S.at(an.xs, Marr, (xs[e] + xs[e + 1]) / 2), S.at(an.xs, Marr, xs[e + 1])];
  const qcache = [];
  for (let e = 0; e < ne; e++) {
    const xa = xs[e], xb = xs[e + 1], xm = (xa + xb) / 2, arr = [];
    ld.dist.forEach(d => { if (xm > d.x0 && xm < d.x1) { const L = d.x1 - d.x0; arr.push({ w0: d.w0 + (d.w1 - d.w0) * (xa - d.x0) / L, w1: d.w0 + (d.w1 - d.w0) * (xb - d.x0) / L, e: d.e }); } });
    qcache.push(arr);
  }
  const { bc, springs } = T.bcStage(md, sec, combo.etap, xs);
  return F.ltb({ xs, EIz: E * sec.Iz, EIw: E * sec.Iw, GIt: G * sec.It, betaZ: sec.betaZ, Mfun, qe: (e) => qcache[e], pts: ld.pts, bc, springs });
};

// C1 segmentu (podpory widełkowe, obciążenie w środku ścinania)
T.C1seg = function (sec, E, G, sg, Marr, xsS) {
  const Ls = sg.x1 - sg.x0, xs = F.mesh([sg.x0, sg.x1], sg.x1, Ls / 24).filter(x => x >= sg.x0 - 1e-6);
  const Mfun = (e) => [S.at(xsS, Marr, xs[e]), S.at(xsS, Marr, (xs[e] + xs[e + 1]) / 2), S.at(xsS, Marr, xs[e + 1])];
  const bc = [{ x: sg.x0, u: true, phi: true }, { x: sg.x1, u: true, phi: true }];
  const r = F.ltb({ xs, EIz: E * sec.Iz, EIw: E * sec.Iw, GIt: G * sec.It, betaZ: 0, Mfun, bc });
  let Mm = 0; xs.forEach(x => { Mm = Math.max(Mm, Math.abs(S.at(xsS, Marr, x))); });
  const Mcr0 = Math.PI / Ls * Math.sqrt(E * sec.Iz * G * sec.It * (1 + Math.PI * Math.PI * E * sec.Iw / (Ls * Ls * G * sec.It)));
  return Math.max(1, r.lam * Mm / Mcr0);
};

// analiza rozkładu w segmencie: liniowy? ψ, Mh, Ms
T.shape = function (xsS, Marr, sg) {
  const ma = S.at(xsS, Marr, sg.x0 + 1e-6), mb = S.at(xsS, Marr, sg.x1 - 1e-6);
  let dev = 0, mmax = 0, xmax = sg.x0, mabs = 0;
  for (let i = 0; i < xsS.length; i++) {
    const x = xsS[i]; if (x < sg.x0 - 1e-6 || x > sg.x1 + 1e-6) continue;
    const lin = ma + (mb - ma) * (x - sg.x0) / (sg.x1 - sg.x0);
    dev = Math.max(dev, Math.abs(Marr[i] - lin));
    if (Math.abs(Marr[i]) > mabs) { mabs = Math.abs(Marr[i]); mmax = Marr[i]; xmax = x; }
  }
  const linear = dev <= 0.01 * Math.max(mabs, 1);
  const Mh = Math.abs(ma) >= Math.abs(mb) ? ma : mb, Mo = Math.abs(ma) >= Math.abs(mb) ? mb : ma;
  const psi = Math.abs(Mh) > 1e-9 ? Mo / Mh : 1;
  // moment w przęśle (ekstremum wewnętrzne)
  let Ms = (ma + mb) / 2;
  if (!linear) { Ms = mmax; }
  return { ma, mb, linear, psi, Mh, Ms, Mmax: mmax, xmax, mabs };
};

// Cm wg tabl. B.3 (obciążenie równomierne/skupione – wariant „równomierne”, bezpieczny dla typowych belek)
T.Cm = function (sh, conc) {
  const psi = sh.psi;
  if (sh.linear) return Math.max(0.4, 0.6 + 0.4 * psi);
  const Mh = sh.Mh, Ms = sh.Ms;
  if (Math.abs(Ms) < Math.abs(Mh)) {
    const as = Ms / Mh;
    if (as >= 0) return Math.max(0.4, 0.2 + 0.8 * as);
    if (psi >= 0) return Math.max(0.4, conc ? -0.8 * as : 0.1 - 0.8 * as);
    return Math.max(0.4, conc ? 0.2 * (-psi) - 0.8 * as : 0.1 * (1 - psi) - 0.8 * as);
  }
  const ah = Math.abs(Ms) > 1e-9 ? Mh / Ms : 0;
  if (ah >= 0 || psi >= 0) return conc ? 0.90 + 0.10 * ah : 0.95 + 0.05 * ah;
  return conc ? 0.90 + 0.10 * ah * (1 + 2 * psi) : 0.95 + 0.05 * ah * (1 + 2 * psi);
};

/* ---------------------------------------------------------- etap: zwichrzenie + interakcja */
// cand: [{ combo, E: wynik kombinacji }]
T.stage = function (md, an, sec, base, ndp, s, cand, opt) {
  const E = U.E, G = U.G, fy = base.fy;
  const met = sec.sym ? (ndp.ltbMet || '6.3.2.3') : '6.3.2.2';
  const segs = T.segments(md, s);
  const runs = [];
  cand.forEach(cd => {
    let r;
    try { r = T.mcrRun(md, an, sec, E, G, cd.combo, cd.E.M); } catch (e) { r = { lam: NaN, err: String(e.message || e) }; }
    runs.push({ combo: cd.combo, E: cd.E, lam: r.lam, mode: r.mode, err: r.err });
  });
  const segOut = segs.map(sg => {
    let best = null;
    runs.forEach(rn => {
      if (rn.err || !isFinite(rn.lam) && rn.lam !== Infinity) return;
      const sh = T.shape(an.xs, rn.E.M, sg);
      if (sh.mabs < 1) return;
      const Mpos = sh.Mmax >= 0;
      const Wy = Mpos ? base.Wy_pos : base.Wy_neg, cls = (Mpos ? base.kPos : base.kNeg).cls;
      const Mcr = rn.lam === Infinity ? Infinity : rn.lam * sh.mabs;
      const lam = Mcr === Infinity ? 0 : Math.sqrt(Wy * fy / Mcr);
      const o = T.chiLT(lam, sh.mabs, Mcr, sec, ndp, 1, met);
      const Mb = o.chimod * Wy * fy / ndp.gM1;
      const u = sh.mabs / Mb;
      const c = { sg, combo: rn.combo, E: rn.E, alphaCr: rn.lam, Mcr, lam, Wy, cls, Mpos, sh, ltb: o, Mb, u };
      if (!best || u > best.u) best = c;
    });
    if (!best) return { sg, brak: true };
    // kc – dla segmentu rozstrzygającego
    if (met === '6.3.2.3' && !best.ltb.skip) {
      let kc = 1, kcSrc = 'kc = 1 (wspornik – bezpiecznie)', C1 = null;
      if (!sg.free) {
        if (ndp.kcMet === '1') { kc = 1; kcSrc = 'kc = 1 (przyjęto bezpiecznie, f = 1)'; }
        else if (best.sh.linear) { kc = Math.min(1, 1 / (1.33 - 0.33 * best.sh.psi)); kcSrc = `tabl. 6.6: kc = 1/(1,33 − 0,33ψ), ψ = ${U.fmt(best.sh.psi, 3)}`; }
        else { try { C1 = T.C1seg(sec, E, G, sg, best.E.M, an.xs); kc = Math.min(1, 1 / Math.sqrt(C1)); kcSrc = `kc = 1/√C1, C1 = ${U.fmt(C1, 3)} (MES segmentu)`; } catch (e) { kc = 1; kcSrc = 'kc = 1 (C1 nie wyznaczono)'; } }
      }
      const o = T.chiLT(best.lam, best.sh.mabs, best.Mcr, sec, ndp, kc, met);
      best.ltb = o; best.ltb.kcSrc = kcSrc; best.ltb.C1 = C1;
      best.Mb = o.chimod * best.Wy * fy / ndp.gM1; best.u = best.sh.mabs / best.Mb;
    }
    return best;
  });
  // ---- interakcja N + My (+ Mz) – 6.3.1, 6.3.3
  const inter = [];
  const fl = T.curveFlex(sec, fy);
  segOut.forEach(sb => {
    if (sb.brak) return;
    runs.forEach(rn => {
      if (rn.err) return;
      const Nc = -(rn.E.N || 0); // ściskanie +
      let Mz = 0; for (let i = 0; i < an.xs.length; i++) if (an.xs[i] >= sb.sg.x0 - 1e-6 && an.xs[i] <= sb.sg.x1 + 1e-6) Mz = Math.max(Mz, Math.abs(rn.E.Mz[i]));
      if (Nc <= 1e-3 * base.Npl && Mz < 1e3) return;
      const sh = T.shape(an.xs, rn.E.M, sb.sg);
      const Mpos = sh.Mmax >= 0, Wy = Mpos ? base.Wy_pos : base.Wy_neg, cls = (Mpos ? base.kPos : base.kNeg).cls;
      const Mcr = rn.lam === Infinity ? Infinity : rn.lam * Math.max(sh.mabs, 1);
      const lamLT = Mcr === Infinity ? 0 : Math.sqrt(Wy * fy / Mcr);
      const ltb = sh.mabs > 1 ? T.chiLT(lamLT, sh.mabs, Mcr, sec, ndp, sb.ltb.kc || 1, met) : { chimod: 1, skip: true };
      const NRk = base.Aeff * fy;
      // długości wyboczeniowe: y – przęsło (między podporami głównymi) × μy; z – segment × μz
      const sp = md.seg.find(g => sb.sg.x0 >= g.x0 - 1 && sb.sg.x1 <= g.x1 + 1) || { x0: sb.sg.x0, x1: sb.sg.x1 };
      const Lcy = (U.num(opt.muY, 1) || 1) * (sp.x1 - sp.x0) * (sp.wsp ? 2 : 1), Lcz = (U.num(opt.muZ, 1) || 1) * (sb.sg.x1 - sb.sg.x0);
      const lam1 = 93.9 * base.eps;
      const ly = Lcy / sec.iy / lam1 * Math.sqrt(base.Aeff / sec.A), lz = Lcz / sec.iz / lam1 * Math.sqrt(base.Aeff / sec.A);
      const chiy = T.chi(ly, ALPHA[fl.y]), chiz = T.chi(lz, ALPHA[fl.z]);
      // skrętne
      const i0s = sec.iy * sec.iy + sec.iz * sec.iz + sec.z0 * sec.z0;
      const NcrT = (G * sec.It + Math.PI * Math.PI * E * sec.Iw / (Lcz * Lcz)) / i0s;
      const lT = Math.sqrt(NRk / NcrT), chiT = T.chi(lT, ALPHA[fl.z]);
      const MyRk = Wy * fy, MzRk = base.Wz * fy;
      const My = sh.mabs;
      const Cmy = T.Cm(T.shape(an.xs, rn.E.M, sp)), CmLT = Math.max(0.4, T.Cm(sh));
      const shz = T.shape(an.xs, rn.E.Mz, sb.sg), Cmz = shz.mabs > 1 ? T.Cm(shz) : 1;
      const g1 = ndp.gM1;
      const ny = Math.max(0, Nc) / (chiy * NRk / g1), nz = Math.max(0, Nc) / (Math.min(chiz, chiT) * NRk / g1);
      let kyy, kyz, kzy, kzz;
      if (cls <= 2) {
        kyy = Math.min(Cmy * (1 + (ly - 0.2) * ny), Cmy * (1 + 0.8 * ny));
        kzz = Math.min(Cmz * (1 + (2 * lz - 0.6) * nz), Cmz * (1 + 1.4 * nz));
        kyz = 0.6 * kzz;
        kzy = lz < 0.4 ? Math.min(0.6 + lz, 1 - 0.1 * lz * nz / (CmLT - 0.25)) : Math.max(1 - 0.1 * lz * nz / (CmLT - 0.25), 1 - 0.1 * nz / (CmLT - 0.25));
      } else {
        kyy = Math.min(Cmy * (1 + 0.6 * ly * ny), Cmy * (1 + 0.6 * ny));
        kzz = Math.min(Cmz * (1 + 0.6 * lz * nz), Cmz * (1 + 0.6 * nz));
        kyz = kzz;
        kzy = Math.max(1 - 0.05 * lz * nz / (CmLT - 0.25), 1 - 0.05 * nz / (CmLT - 0.25));
      }
      const dMy = Math.abs(Nc * (base.effN ? base.effN.eN : 0));
      const t1 = Math.max(0, Nc) / (chiy * NRk / g1), t2 = (My + dMy) / (ltb.chimod * MyRk / g1), t3 = Mz / (MzRk / g1);
      const u61 = t1 + kyy * t2 + kyz * t3;
      const u62 = Math.max(0, Nc) / (Math.min(chiz, chiT) * NRk / g1) + kzy * t2 + kzz * t3;
      const r = { sg: sb.sg, combo: rn.combo, Nc, My, Mz, Lcy, Lcz, ly, lz, lT, chiy, chiz, chiT, NcrT, curves: fl, Cmy, Cmz, CmLT, kyy, kyz, kzy, kzz, ny, nz, chiLT: ltb.chimod, MyRk, MzRk, NRk, u61, u62, u: Math.max(u61, u62), cls, lamLT };
      const prev = inter.find(q => q.sg === sb.sg);
      if (!prev) inter.push(r); else if (r.u > prev.u) inter[inter.indexOf(prev)] = r;
    });
  });
  return { met, segs: segOut, runs, inter };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
