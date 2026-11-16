/* =====================================================================
   BelkaStal – podpory i połączenia przegubowe
   • oparcie belki: docisk środnika (PN-EN 1993-1-5, 6), żebro podporowe
     (9.4), płyta podporowa na betonie (PN-EN 1993-1-8, 6.2.5;
     PN-EN 1992-1-1, 6.7) lub na murze (PN-EN 1996-1-1, 6.1.3 – fd i β
     podaje projektant);
   • krótka blacha czołowa (połączenie przegubowe) i blacha żebrowa
     (nakładka jednostronna) – PN-EN 1993-1-8: tabl. 3.3, 3.4, 3.10.2, 4.5.3.3.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M;
const C = BS.C = {};
const s3 = Math.sqrt(3);

/* ---------------------------------------------------------- śruby (tabl. 3.4) */
C.boltShear = function (d, cls, gM2, gwintWPl) {
  const b = M.SRUBY[d], k = M.SRUBY_KL[cls];
  const A = gwintWPl === false ? b.A : b.As;
  const av = gwintWPl === false ? 0.6 : k.av;
  return { Fv: av * k.fub * A / gM2, av, A, fub: k.fub, d0: b.d0, d: b.d };
};
// docisk: e1, p1 – w kierunku obciążenia; e2, p2 – prostopadle (Infinity – brak krawędzi/rzędu)
C.bearing = function (d, cls, t, fu, gM2, g) {
  const b = M.SRUBY[d], k = M.SRUBY_KL[cls], d0 = b.d0;
  const end = g.koniec !== false;
  const ad = end ? g.e1 / (3 * d0) : g.p1 / (3 * d0) - 0.25;
  const ab = Math.min(ad, k.fub / fu, 1);
  const edge = g.e2 !== Infinity && g.e2 !== undefined;
  const k1 = edge ? Math.min(2.8 * g.e2 / d0 - 1.7, (g.p2 && g.p2 !== Infinity ? 1.4 * g.p2 / d0 - 1.7 : 2.5), 2.5) : Math.min(g.p2 && g.p2 !== Infinity ? 1.4 * g.p2 / d0 - 1.7 : 2.5, 2.5);
  return { Fb: Math.max(0, k1) * ab * fu * b.d * t / gM2, k1, ab, ad, end, t, fu };
};
// minimalne odległości (tabl. 3.3)
C.detailing = function (d0, g) {
  const out = [];
  const chk = (n, v, lim) => { if (v !== undefined && v !== null && isFinite(v)) out.push({ n, v, lim, ok: v >= lim - 1e-9 }); };
  chk('e1 ≥ 1,2·d0', g.e1, 1.2 * d0); chk('e2 ≥ 1,2·d0', g.e2, 1.2 * d0);
  chk('p1 ≥ 2,2·d0', g.p1, 2.2 * d0); chk('p2 ≥ 2,4·d0', g.p2, 2.4 * d0);
  return out;
};
C.fvw = function (fu, bw, gM2) { return fu / (s3 * bw * gM2); };

/* ---------------------------------------------------------- krótka blacha czołowa */
// w: { hp, bp, tp, nr (rzędy), d, kl, e1, p1, e2, p3 (rozstaw poprzeczny), a, tsup, fusup, gwint }
C.endPlate = function (sec, mat, ndp, w, VEd) {
  const g0 = ndp.gM0, g2 = ndp.gM2;
  const pl = M.fy(mat.gatunek, w.tp, ndp.fySrc);
  const nr = Math.max(1, Math.round(w.nr)), n = 2 * nr;
  const bs = C.boltShear(w.d, w.kl, g2, w.gwint !== false), d0 = bs.d0;
  const hp = w.hp, tp = w.tp, e1 = w.e1, p1 = w.p1, e2 = w.e2, p3 = w.p3;
  const out = { typ: 'blacha_czolowa', VEd, n, bolt: bs, plate: pl, checks: [] };
  const add = (n2, ref, Ed, Rd, f) => out.checks.push({ n: n2, ref, Ed, Rd, u: Math.abs(Ed) / Rd, f });
  add('Ścinanie śrub', 'PN-EN 1993-1-8 tabl. 3.4', VEd, n * bs.Fv, `n·Fv,Rd = ${n}·αv·fub·A/γM2 = ${n}·${U.fmt(bs.av, 1)}·${bs.fub}·${U.fmt(bs.A, 0)}/${U.fmt(g2, 2)}`);
  // docisk do blachy czołowej: rząd skrajny (e1) i pośrednie (p1); krawędź boczna e2, p2 = p3
  const bE = C.bearing(w.d, w.kl, tp, pl.fu, g2, { koniec: true, e1, e2, p2: p3 });
  const bI = C.bearing(w.d, w.kl, tp, pl.fu, g2, { koniec: false, p1, e2, p2: p3 });
  // rzędy skrajne (górny i dolny) traktowane jako „końcowe” (e1); pozostałe – pośrednie (p1)
  const nEnd = nr === 1 ? 2 : 4, nIn = n - nEnd;
  const FbPl = nEnd * bE.Fb + nIn * bI.Fb;
  const FbMin = nIn > 0 ? Math.min(bE.Fb, bI.Fb) : bE.Fb;
  const grpPl = bs.Fv >= Math.max(bE.Fb, nIn > 0 ? bI.Fb : 0) ? FbPl : n * Math.min(bs.Fv, FbMin);
  add('Docisk śrub do blachy czołowej', 'tabl. 3.4; 3.7(1)', VEd, grpPl, `Fb,Rd = k1·αb·fu·d·t/γM2; skrajne: k1 = ${U.fmt(bE.k1, 2)}, αb = ${U.fmt(bE.ab, 3)}; pośrednie: k1 = ${U.fmt(bI.k1, 2)}, αb = ${U.fmt(bI.ab, 3)}`);
  // docisk do elementu podpierającego (pas słupa / środnik podciągu) – śruby jak wewnętrzne
  if (w.tsup > 0) {
    const bS = C.bearing(w.d, w.kl, w.tsup, w.fusup || 360, g2, { koniec: false, p1, e2: Infinity, p2: p3 });
    add('Docisk śrub do elementu podpierającego', 'tabl. 3.4', VEd, n * Math.min(bs.Fv, bS.Fb), `t = ${U.fmt(w.tsup, 1)} mm, fu = ${w.fusup || 360} MPa, k1 = ${U.fmt(bS.k1, 2)}, αb = ${U.fmt(bS.ab, 3)}`);
  }
  // blacha – ścinanie brutto (2 płaszczyzny), netto, rozerwanie blokowe
  add('Blacha czołowa – ścinanie przekroju brutto', 'PN-EN 1993-1-1 6.2.6', VEd, 2 * hp * tp * pl.fy / (s3 * g0), `Av = 2·hp·tp = 2·${hp}·${tp}`);
  add('Blacha czołowa – ścinanie przekroju netto', 'PN-EN 1993-1-1 6.2.6; 1-8 3.10', VEd, 2 * (hp - nr * d0) * tp * pl.fu / (s3 * g2), `Anv = 2·(hp − nr·d0)·tp`);
  const Ant = (e2 - d0 / 2) * tp, Anv = (hp - e1 - (nr - 0.5) * d0) * tp;
  add('Blacha czołowa – rozerwanie blokowe', 'PN-EN 1993-1-8 3.10.2 (3.10)', VEd, 2 * (0.5 * pl.fu * Ant / g2 + pl.fy * Anv / (s3 * g0)), `2·(0,5·fu·Ant/γM2 + fy·Anv/(√3·γM0)), Ant = ${U.fmt(Ant, 0)} mm², Anv = ${U.fmt(Anv, 0)} mm²`);
  // środnik belki na wysokości blachy
  add('Środnik belki – ścinanie na wysokości blachy', 'PN-EN 1993-1-1 6.2.6', VEd, hp * sec.tw * mat.fy / (s3 * g0), `Av = hp·tw = ${hp}·${U.fmt(sec.tw, 1)}`);
  // spoina pachwinowa dwustronna środnik–blacha
  const bw = (M.STAL[mat.gatunek] || {}).bw || 0.9;
  const fv = C.fvw(mat.fu, bw, g2), Lw = 2 * Math.max(0, hp - 2 * w.a);
  add('Spoiny pachwinowe środnik–blacha', 'PN-EN 1993-1-8 4.5.3.3', VEd, fv * w.a * Lw, `fvw,d = fu/(√3·βw·γM2) = ${U.fmt(fv, 1)} MPa, a = ${w.a} mm, ΣL = 2·(hp − 2a) = ${U.fmt(Lw, 0)} mm`);
  out.detal = C.detailing(d0, { e1, e2, p1: nr > 1 ? p1 : undefined, p2: p3 });
  out.uwagi = [];
  if (hp < 0.6 * sec.hw) out.uwagi.push('Zalecana wysokość blachy hp ≥ 0,6·h (stabilizacja skrętna podpory – podpora widełkowa).');
  if (tp > M.SRUBY[w.d].d / 2 && /8\.8|10\.9/.test(w.kl)) out.uwagi.push('Dla zapewnienia zdolności do obrotu (przegub) zaleca się tp ≤ d/2 (śruby 8.8) – sprawdź ciągliwość połączenia.');
  if (w.a < 0.4 * sec.tw) out.uwagi.push('Spoina a < 0,4·tw – rozważ spoinę o pełnej nośności środnika.');
  out.u = Math.max(...out.checks.map(c => c.u), 0);
  return out;
};

/* ---------------------------------------------------------- blacha żebrowa (nakładka jednostronna) */
// w: { hp, tp, n, d, kl, e1, p1, e2 (od osi śrub do krawędzi blachy), z (od lica podpory do osi śrub), e2b (od osi śrub do końca belki), a, gwint }
C.finPlate = function (sec, mat, ndp, w, VEd) {
  const g0 = ndp.gM0, g2 = ndp.gM2;
  const pl = M.fy(mat.gatunek, w.tp, ndp.fySrc);
  const n = Math.max(1, Math.round(w.n));
  const bs = C.boltShear(w.d, w.kl, g2, w.gwint !== false), d0 = bs.d0;
  const { hp, tp, e1, p1, e2, z } = w;
  const out = { typ: 'blacha_zebrowa', VEd, n, bolt: bs, plate: pl, checks: [] };
  const add = (n2, ref, Ed, Rd, f) => out.checks.push({ n: n2, ref, Ed, Rd, u: Math.abs(Ed) / Rd, f });
  // siły w śrubach – sprężysty rozkład dla grupy w jednej kolumnie z mimośrodem z
  const ys = []; for (let i = 0; i < n; i++) ys.push((i - (n - 1) / 2) * p1);
  const I = ys.reduce((s, y) => s + y * y, 0);
  const Fv = VEd / n, Fh = I > 0 ? VEd * z * Math.max(...ys.map(Math.abs)) / I : 0;
  const Fr = Math.hypot(Fv, Fh);
  out.Fv = Fv; out.Fh = Fh; out.Fr = Fr;
  add('Ścinanie najbardziej obciążonej śruby', 'tabl. 3.4', Fr, bs.Fv, `F = √(Fv² + Fh²): Fv = V/n = ${U.fmt(Fv / 1e3, 2)} kN, Fh = V·z·ymax/Σy² = ${U.fmt(Fh / 1e3, 2)} kN`);
  // docisk – blacha: pionowo (e1/p1 w kierunku obciążenia, e2 prostopadle) i poziomo (e2 w kierunku obciążenia)
  const bV = C.bearing(w.d, w.kl, tp, pl.fu, g2, { koniec: n === 1, e1, p1, e2, p2: Infinity });
  const bVe = C.bearing(w.d, w.kl, tp, pl.fu, g2, { koniec: true, e1, e2, p2: Infinity });
  const bH = C.bearing(w.d, w.kl, tp, pl.fu, g2, { koniec: true, e1: e2, e2: e1, p2: n > 1 ? p1 : Infinity });
  const FbVp = Math.min(bV.Fb, bVe.Fb);
  add('Docisk do blachy (interakcja pion/poziom)', 'tabl. 3.4 (interakcja kierunków)', Math.sqrt(Math.pow(Fv / FbVp, 2) + Math.pow(Fh / bH.Fb, 2)), 1, `(Fv/Fb,ver)² + (Fh/Fb,hor)² ≤ 1: Fb,ver = ${U.fmt(FbVp / 1e3, 1)} kN, Fb,hor = ${U.fmt(bH.Fb / 1e3, 1)} kN`);
  // docisk – środnik belki (pionowo: śruby wewnętrzne; poziomo: krawędź e2b)
  const wV = C.bearing(w.d, w.kl, sec.tw, mat.fu, g2, { koniec: false, p1: n > 1 ? p1 : 3 * d0, e2: Infinity, p2: Infinity });
  const wH = C.bearing(w.d, w.kl, sec.tw, mat.fu, g2, { koniec: true, e1: w.e2b, e2: Infinity, p2: n > 1 ? p1 : Infinity });
  add('Docisk do środnika belki (interakcja)', 'tabl. 3.4', Math.sqrt(Math.pow(Fv / wV.Fb, 2) + Math.pow(Fh / wH.Fb, 2)), 1, `Fb,ver = ${U.fmt(wV.Fb / 1e3, 1)} kN, Fb,hor = ${U.fmt(wH.Fb / 1e3, 1)} kN (e2,b = ${w.e2b} mm)`);
  add('Blacha – ścinanie brutto', 'PN-EN 1993-1-1 6.2.6', VEd, hp * tp * pl.fy / (s3 * g0), `Av = hp·tp = ${hp}·${tp}`);
  add('Blacha – ścinanie netto', '3.10; 6.2.6', VEd, (hp - n * d0) * tp * pl.fu / (s3 * g2), `Anv = (hp − n·d0)·tp`);
  const Ant = (e2 - d0 / 2) * tp, Anv = (hp - e1 - (n - 0.5) * d0) * tp;
  add('Blacha – rozerwanie blokowe', 'PN-EN 1993-1-8 3.10.2 (3.10)', VEd, 0.5 * pl.fu * Ant / g2 + pl.fy * Anv / (s3 * g0), `Ant = ${U.fmt(Ant, 0)} mm², Anv = ${U.fmt(Anv, 0)} mm²`);
  add('Blacha – zginanie (moment V·z)', 'PN-EN 1993-1-1 6.2.5', VEd * z, tp * hp * hp / 6 * pl.fy / g0, `M = V·z = ${U.fmt(VEd * z / 1e6, 2)} kNm, Wel = tp·hp²/6`);
  // spoiny blachy do podpory (dwustronne)
  const bw = (M.STAL[mat.gatunek] || {}).bw || 0.9;
  const fv = C.fvw(pl.fu, bw, g2);
  const fV = VEd / (2 * hp), fM = 6 * VEd * z / (2 * hp * hp);
  add('Spoiny blachy do podpory (V + V·z)', 'PN-EN 1993-1-8 4.5.3.3', Math.hypot(fV, fM), fv * w.a, `wypadkowa siła na jednostkę długości [N/mm] ≤ fvw,d·a; fvw,d = ${U.fmt(fv, 1)} MPa, a = ${w.a} mm`);
  out.detal = C.detailing(d0, { e1, e2, p1: n > 1 ? p1 : undefined }).concat([{ n: 'e2,b ≥ 1,2·d0 (środnik)', v: w.e2b, lim: 1.2 * d0, ok: w.e2b >= 1.2 * d0 }]);
  out.uwagi = [];
  const aMin = (mat.fy >= 355 ? 0.6 : 0.5) * tp;
  if (w.a < aMin) out.uwagi.push(`Spoiny blachy żebrowej: zalecane spoiny o pełnej nośności blachy, a ≥ ${U.fmt(aMin, 1)} mm.`);
  if (hp < 0.6 * sec.hw) out.uwagi.push('Zalecana wysokość blachy hp ≥ 0,6·h (stabilizacja skrętna podpory).');
  if (tp > 0.5 * M.SRUBY[w.d].d) out.uwagi.push('Zalecane tp ≤ 0,5·d (ciągliwość – deformacja otworów zamiast ścięcia śrub).');
  out.u = Math.max(...out.checks.map(c => c.u), 0);
  return out;
};

/* ---------------------------------------------------------- oparcie na płycie podporowej */
// w: { podloze: 'beton'|'mur'|'stal', bp, lp, tp, beton:'C25/30', alfa (√(Ac1/Ac0) ≤ 3), fd (mur), beta (mur), lb (długość docisku belki) }
C.bearingPlate = function (sec, mat, ndp, w, REd) {
  const out = { typ: 'oparcie', REd, checks: [], uwagi: [] };
  if (w.podloze === 'stal' || !(w.bp > 0 && w.lp > 0)) return out;
  const pl = M.fy(mat.gatunek, w.tp || 10, ndp.fySrc);
  let fjd, desc;
  if (w.podloze === 'beton') {
    const fck = M.BETON[w.beton] || 25;
    const fcd = ndp.acc * fck / ndp.gc;
    const al = U.clamp(U.num(w.alfa, 1), 1, 3);
    fjd = ndp.betaJ * al * fcd;
    desc = `fjd = βj·α·fcd = ${U.fmt(ndp.betaJ, 3)}·${U.fmt(al, 2)}·${U.fmt(fcd, 2)} = ${U.fmt(fjd, 2)} MPa (${w.beton}, fcd = αcc·fck/γc)`;
  } else {
    const fd = U.num(w.fd, 1.5), be = U.clamp(U.num(w.beta, 1), 1, 1.5);
    fjd = be * fd;
    desc = `fd·β = ${U.fmt(fd, 2)}·${U.fmt(be, 2)} = ${U.fmt(fjd, 2)} MPa (mur – wartości podane przez projektanta wg PN-EN 1996-1-1, 6.1.3)`;
  }
  const tp = w.tp || 0;
  const c = tp > 0 ? tp * Math.sqrt(pl.fy / (3 * fjd * ndp.gM0)) : 0;
  const lb = Math.min(w.lb || w.lp, w.lp);
  const beff = Math.min(w.bp, sec.bd + 2 * c), leff = Math.min(w.lp, lb + 2 * c);
  const FRd = fjd * beff * leff;
  out.fjd = fjd; out.c = c; out.beff = beff; out.leff = leff; out.desc = desc;
  out.checks.push({ n: 'Docisk płyty do podłoża (pole efektywne)', ref: w.podloze === 'beton' ? 'PN-EN 1993-1-8 6.2.5; PN-EN 1992-1-1 6.7' : 'PN-EN 1996-1-1 6.1.3', Ed: REd, Rd: FRd, u: Math.abs(REd) / FRd,
    f: `${desc}; c = tp·√(fy/(3·fjd·γM0)) = ${U.fmt(c, 1)} mm; Aeff = ${U.fmt(beff, 0)}×${U.fmt(leff, 0)} mm` });
  if (w.podloze === 'mur' && lb < 100) out.uwagi.push('Długość oparcia na murze < 100 mm – sprawdź wymagania konstrukcyjne dla oparcia belek na murze.');
  if (w.podloze === 'beton' && lb < 80) out.uwagi.push('Długość oparcia na betonie < 80 mm – zalecane zwiększenie.');
  out.u = Math.max(...out.checks.map(q => q.u), 0);
  return out;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
