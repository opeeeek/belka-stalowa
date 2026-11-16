/* =====================================================================
   BelkaStal – moduły dodatkowe:
   • pożar – PN-EN 1993-1-2 (4.2.3.3, 4.2.3.4, 4.2.4, 4.2.5), krzywa ISO 834;
   • zmęczenie – PN-EN 1993-1-9 (krzywe S-N, γMf, reguła Palmgrena–Minera);
   • kruche pękanie – PN-EN 1993-1-10 (tabl. 2.1, klasy Z – rozdz. 3);
   • klasa wykonania i wymagania wykonawcze – PN-EN 1993-1-1 zał. C,
     PN-EN 1090-2.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M, T = BS.T, R = BS.R;
const X = BS.X = {};

/* ================================================================ POŻAR */
X.iso834 = (tmin) => 20 + 345 * Math.log10(8 * tmin + 1);

X.sectionFactor = function (sec, eksp, ochrona) {
  // obwód konturu z wieloboku przekroju
  let P = 0; const pts = sec.pts;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const b = Math.max(sec.bg, sec.bd);
  const Pk = eksp === '3' ? P - sec.bg : P;               // kontur (górna powierzchnia pasa przykryta płytą)
  const Pb = eksp === '3' ? 2 * sec.h + b : 2 * sec.h + 2 * b; // „pudełko”
  const A = sec.A;
  return { P, Pk, Pb, AmV: Pk / A * 1000, AmVb: Pb / A * 1000, ApV: (ochrona === 'plyty' ? Pb : Pk) / A * 1000, kind: sec.kind, closed: sec.kind === 'RHS' };
};

// przyrost temperatury: zwraca historię θa(t) co 30 s do tmax [min]
X.heating = function (sf, o, tmax) {
  const dt = 2, rho = U.RHO, sig = 5.67e-8, ac = 25, em = 0.7, ef = 1.0;
  let th = 20, thg = 20; const hist = [[0, 20, 20]];
  const prot = o.ochrona && o.ochrona !== 'brak';
  const ksh = prot ? 1 : sf.closed ? 1 : sf.kind === 'I' ? Math.min(1, 0.9 * sf.AmVb / sf.AmV) : Math.min(1, sf.AmVb / sf.AmV);
  const lp = U.num(o.lp, 0.12), dp = U.num(o.dp, 20) / 1000, cp = U.num(o.cp, 1200), rp = U.num(o.rp, 300);
  for (let t = dt; t <= tmax * 60 + 1e-9; t += dt) {
    const thg1 = X.iso834(t / 60);
    const ca = M.ca(th);
    if (!prot) {
      const h = ac * (thg1 - th) + em * ef * sig * (Math.pow(thg1 + 273, 4) - Math.pow(th + 273, 4));
      th += ksh * sf.AmV / (ca * rho) * h * dt;
    } else {
      const phi = cp * rp / (ca * rho) * dp * sf.ApV;
      let d = lp * sf.ApV / dp / (ca * rho) * (thg1 - th) / (1 + phi / 3) * dt - (Math.exp(phi / 10) - 1) * (thg1 - thg);
      if (d < 0 && thg1 > thg) d = 0; // 4.2.5.2(2): Δθa ≥ 0 przy rosnącej θg
      th += d;
    }
    thg = thg1;
    if (Math.abs(t % 30) < 1e-9) hist.push([t / 60, th, thg]);
  }
  return { hist, ksh };
};

/* wytężenie w pożarze w temperaturze θ: Efi = { M, V, Mcr (zimne, dla tej kombinacji), Mpos, przyPodporze } */
X.fireUtil = function (sec, base, ndp, Efi, th, kap) {
  const fy = base.fy, gfi = ndp.gMfi;
  const ky = M.kFire(th, 1), kE = M.kFire(th, 3);
  const kf = R.classAt(sec, fy / 0.7225, Efi.Mpos ? 1e9 : -1e9, 0); // ε = 0,85·√(235/fy) – 4.2.2
  const cls = kf.cls;
  const W = cls <= 2 ? sec.Wpl_y : Math.min(sec.Wel_t, sec.Wel_b);
  const MRd = ky * W * fy / gfi / (kap.k1 * kap.k2);
  // zwichrzenie 4.2.3.3(4)/4.2.3.4(2)
  // zwichrzenie w pożarze – tylko dla belek niestężonych bocznie (λ̄LT w temp. normalnej > 0,2)
  let chi = 1, lamT = 0, ltb = false;
  if (Efi.Mcr && isFinite(Efi.Mcr)) {
    const lam = Math.sqrt(W * fy / Efi.Mcr);
    if (lam > 0.2) {
      ltb = true;
      lamT = lam * Math.sqrt(ky / Math.max(kE, 1e-9));
      const a = 0.65 * Math.sqrt(235 / fy), ph = 0.5 * (1 + a * lamT + lamT * lamT);
      chi = Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lamT * lamT)));
    }
  }
  const Mb = ltb ? chi * W * ky * fy / gfi : Infinity;
  const VRd = ky * base.Vpl * ndp.gM0 / gfi;
  return { th, ky, kE, cls, W, MRd, chi, lamT, ltb, Mb, VRd, uM: Math.abs(Efi.M) / MRd, uLT: ltb ? Math.abs(Efi.Mlt || Efi.M) / Mb : 0, uV: Math.abs(Efi.V) / VRd };
};

X.fire = function (sec, base, ndp, o, Efi) {
  const sf = X.sectionFactor(sec, o.ekspozycja || '3', o.ochrona || 'brak');
  const prot = o.ochrona && o.ochrona !== 'brak';
  const kap = { k1: (o.ekspozycja === '3' ? (prot ? 0.85 : 0.70) : 1.0), k2: Efi.przyPodporze ? 0.85 : 1.0 };
  if (o.kappa1 !== undefined && o.kappa1 !== '' && o.kappa1 !== null) kap.k1 = U.num(o.kappa1, kap.k1);
  const cls4 = Math.max(base.kPos.cls, base.kNeg.cls) === 4;
  const util = (th) => { const u = X.fireUtil(sec, base, ndp, Efi, th, kap); return Math.max(u.uM, u.uLT, u.uV); };
  let thcr;
  if (cls4) thcr = 350;
  else if (util(20) >= 1) thcr = 20;
  else {
    let lo = 20, hi = 1200;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (util(m) < 1) lo = m; else hi = m; }
    thcr = (lo + hi) / 2;
  }
  // 4.2.4 – temperatura krytyczna (porównawczo, przekroje bez zwichrzenia)
  const u0 = X.fireUtil(sec, base, ndp, Efi, 20, kap);
  const mu0 = Math.max(0.013, Math.max(u0.uM, u0.uV));
  const thcr424 = 39.19 * Math.log(1 / (0.9674 * Math.pow(mu0, 3.833)) - 1) + 482;
  const Rreq = U.num(o.R, 60);
  const ht = X.heating(sf, o, Math.max(Rreq * 1.5, 120));
  let tcr = null;
  for (let i = 1; i < ht.hist.length; i++) if (ht.hist[i][1] >= thcr) { const [t0, a0] = ht.hist[i - 1], [t1, a1] = ht.hist[i]; tcr = t0 + (t1 - t0) * (thcr - a0) / (a1 - a0); break; }
  const thR = U.interp(ht.hist.map(r => [r[0], r[1]]), Rreq);
  const atR = X.fireUtil(sec, base, ndp, Efi, thR, kap);
  return { sf, kap, cls4, thcr, thcr424, mu0, Rreq, tcr, thR, atR, at20: u0, hist: ht.hist, ksh: ht.ksh, prot, uR: Math.max(atR.uM, atR.uLT, atR.uV), ok: tcr === null || tcr >= Rreq };
};

/* ================================================================ ZMĘCZENIE */
X.DETALE = [
  { k: 'w160', dc: 160, n: '160 – materiał rodzimy, wyroby walcowane (tabl. 8.1)', miejsce: 'pas' },
  { k: 'w125', dc: 125, n: '125 – spoiny podłużne ciągłe, automatyczne, bez przerw (tabl. 8.2)', miejsce: 'spoina' },
  { k: 'w112', dc: 112, n: '112 – spoiny podłużne automatyczne z miejscami start/stop (tabl. 8.2)', miejsce: 'spoina' },
  { k: 'w100', dc: 100, n: '100 – spoiny podłużne ręczne (tabl. 8.2)', miejsce: 'spoina' },
  { k: 'w80', dc: 80, n: '80 – żebro poprzeczne przyspawane do pasa/środnika (tabl. 8.4)', miejsce: 'pas' },
  { k: 'w71', dc: 71, n: '71 – przyspawany element poprzeczny – przyjęcie projektanta', miejsce: 'pas' },
  { k: 'user', dc: null, n: 'kategoria wg projektanta (Δσc podane ręcznie)', miejsce: 'pas' }
];
X.gMf = (ocena, skutki) => (ocena === 'bezpieczna' ? (skutki === 'duze' ? 1.35 : 1.15) : (skutki === 'duze' ? 1.15 : 1.00));
X.Nsigma = function (ds, dc) { // ds, dc – wartości obliczeniowe (po γ)
  const dD = 0.737 * dc, dL = 0.549 * dD;
  if (ds >= dD) return 2e6 * Math.pow(dc / ds, 3);
  if (ds >= dL) return 5e6 * Math.pow(dD / ds, 5);
  return Infinity;
};
X.Ntau = function (dt, dtc) { const dL = 0.457 * dtc; return dt >= dL ? 2e6 * Math.pow(dtc / dt, 5) : Infinity; };

/* ================================================================ KRUCHE PĘKANIE – tabl. 2.1 */
// kolumny TEd: +10, 0, −10, −20, −30, −40, −50 °C; wiersze σEd = 0,75 fy(t), 0,50 fy(t), 0,25 fy(t)
X.T21_TEMPS = [10, 0, -10, -20, -30, -40, -50];
X.T21 = {
  S235: { JR: [[60, 50, 40, 35, 30, 25, 20], [90, 75, 65, 55, 45, 40, 35], [135, 115, 100, 85, 75, 65, 60]],
          J0: [[90, 75, 60, 50, 40, 35, 30], [125, 105, 90, 75, 65, 55, 45], [175, 155, 135, 115, 100, 85, 75]],
          J2: [[125, 105, 90, 75, 60, 50, 40], [170, 145, 125, 105, 90, 75, 65], [200, 200, 175, 155, 135, 115, 100]] },
  S275: { JR: [[55, 45, 35, 30, 25, 20, 15], [80, 70, 55, 50, 40, 35, 30], [125, 110, 95, 80, 70, 60, 55]],
          J0: [[75, 65, 55, 45, 35, 30, 25], [115, 95, 80, 70, 55, 50, 40], [165, 145, 125, 110, 95, 80, 70]],
          J2: [[110, 95, 75, 65, 55, 45, 35], [155, 130, 115, 95, 80, 70, 55], [200, 190, 165, 145, 125, 110, 95]],
          'M,N': [[135, 110, 95, 75, 65, 55, 45], [180, 155, 130, 115, 95, 80, 70], [200, 200, 190, 165, 145, 125, 110]],
          'ML,NL': [[185, 160, 135, 110, 95, 75, 65], [200, 200, 180, 155, 130, 115, 95], [230, 200, 200, 200, 190, 165, 145]] },
  S355: { JR: [[40, 35, 25, 20, 15, 15, 10], [65, 55, 45, 40, 30, 25, 25], [110, 95, 80, 70, 60, 55, 45]],
          J0: [[60, 50, 40, 35, 25, 20, 15], [95, 80, 65, 55, 45, 40, 35], [150, 130, 110, 95, 80, 70, 60]],
          J2: [[90, 75, 60, 50, 40, 35, 25], [135, 110, 95, 80, 65, 55, 45], [200, 175, 150, 130, 110, 95, 80]],
          'K2,M,N': [[110, 90, 75, 60, 50, 40, 35], [155, 135, 110, 95, 80, 65, 55], [200, 200, 175, 150, 130, 110, 95]],
          'ML,NL': [[155, 130, 110, 90, 75, 60, 50], [200, 180, 155, 135, 110, 95, 80], [210, 200, 200, 200, 175, 150, 130]] },
  S420: { 'M,N': [[95, 80, 65, 55, 45, 35, 30], [140, 120, 100, 85, 70, 60, 50], [200, 185, 160, 140, 120, 100, 85]],
          'ML,NL': [[135, 115, 95, 80, 65, 55, 45], [190, 165, 140, 120, 100, 85, 70], [200, 200, 200, 185, 160, 140, 120]] },
  S460: { 'M,N': [[90, 70, 60, 50, 40, 30, 25], [130, 110, 95, 75, 65, 55, 45], [200, 175, 155, 130, 115, 95, 80]],
          'ML,NL': [[125, 105, 90, 70, 60, 50, 40], [180, 155, 130, 110, 95, 75, 65], [200, 200, 200, 175, 155, 130, 115]] }
};
X.t21Row = function (gat, pod) {
  const base = gat.replace(/[NM]$/, '').replace('S450', 'S460');
  const g = X.T21[base]; if (!g) return null;
  const key = Object.keys(g).find(k => k.split(',').includes(pod));
  return key ? { rows: g[key], key, base } : null;
};
// maksymalna grubość [mm] dla TEd i poziomu σEd/fy(t)
X.tmax = function (gat, pod, TEd, ratio) {
  const r = X.t21Row(gat, pod); if (!r) return { err: `Brak danych tablicy 2.1 dla ${gat} ${pod}.` };
  const temps = X.T21_TEMPS;
  if (TEd < -50) return { err: 'TEd < −50 °C – poza zakresem tablicy 2.1 (wymagana analiza wg mechaniki pękania).' };
  const Tc = Math.min(10, TEd);
  const colVal = (row) => { for (let i = 1; i < temps.length; i++) if (Tc >= temps[i]) { const t = (Tc - temps[i]) / (temps[i - 1] - temps[i]); return row[i] + t * (row[i - 1] - row[i]); } return row[0]; };
  const v75 = colVal(r.rows[0]), v50 = colVal(r.rows[1]), v25 = colVal(r.rows[2]);
  const rr = Math.max(0.25, ratio);
  let t;
  if (rr >= 0.75) t = v75; else if (rr >= 0.5) t = v50 + (v75 - v50) * (rr - 0.5) / 0.25; else t = v25 + (v50 - v25) * (rr - 0.25) / 0.25;
  return { t, v75, v50, v25, key: r.key, over: ratio > 0.75 };
};
// klasa Z – rozdz. 3, tabl. 3.1/3.2
X.zClass = function (z) {
  const ZEd = U.num(z.Za) + U.num(z.Zb) + U.num(z.Zc) + U.num(z.Zd) + U.num(z.Ze);
  const cls = ZEd <= 10 ? 'brak wymagań (ZEd ≤ 10)' : ZEd <= 20 ? 'Z15' : ZEd <= 30 ? 'Z25' : 'Z35';
  return { ZEd, cls };
};
X.Za = (a) => (a <= 7 ? 0 : a <= 10 ? 3 : a <= 20 ? 6 : a <= 30 ? 9 : a <= 40 ? 12 : 15);
X.Zc = (s) => (s <= 10 ? 2 : s <= 20 ? 4 : s <= 30 ? 6 : s <= 40 ? 8 : s <= 50 ? 10 : s <= 60 ? 12 : 15);

/* ================================================================ WYKONANIE */
X.exc = function (o, opts) {
  const base = { CC1: 1, CC2: 2, CC3: 3 }[o.CC || 'CC2'] || 2;
  let exc = base;
  const why = [`klasa konsekwencji ${o.CC || 'CC2'} → EXC${base} (PN-EN 1993-1-1/A1 zał. C, tabl. C.1)`];
  if (opts.zmeczenie && exc < 2) { exc = 2; why.push('obciążenia zmęczeniowe – co najmniej EXC2'); }
  if (opts.spawana && exc < 2 && opts.fy > 355) { exc = 2; why.push('elementy spawane ze stali > S355 – zalecana EXC2'); }
  if (o.EXC && o.EXC !== 'auto') { why.push(`przyjęto ręcznie ${o.EXC} – uzasadnienie: ${o.uzasadnienie || '(brak)'}`); exc = +o.EXC.replace('EXC', ''); }
  const E = 'EXC' + exc;
  const req = [];
  req.push(['Klasa wykonania', `${E} – całość elementu i jego połączeń (PN-EN 1090-2, 4.1.2)`]);
  req.push(['Materiał', `${opts.gatunek}${opts.podgatunek ? opts.podgatunek : ''} wg ${(M.STAL[opts.gatunek] || {}).norma || 'PN-EN 10025'}; dokument kontroli ${exc >= 2 ? '3.1' : '2.2'} wg PN-EN 10204; identyfikowalność ${exc >= 3 ? 'pełna (każdy element)' : 'partii wyrobów'}`]);
  req.push(['Wyroby i tolerancje', 'kształtowniki wg PN-EN 10365 i PN-EN 10034; blachy wg PN-EN 10029 (klasa grubości wg zamówienia)']);
  req.push(['Spawanie', `system jakości wg PN-EN ISO 3834-${exc >= 3 ? '2' : '3'}; poziom jakości spoin wg PN-EN ISO 5817: ${exc === 1 ? 'D' : exc === 2 ? 'C' : 'B'}${exc === 4 ? ' (+ wymagania dodatkowe)' : ''}; spawacze wg PN-EN ISO 9606-1; WPS/WPQR wg PN-EN ISO 15614-1${exc >= 2 ? '' : ' (dla EXC1 – wg PN-EN 1090-2, 7.4.1)'}; nadzór spawalniczy wg PN-EN ISO 14731`]);
  req.push(['Badania nieniszczące spoin', exc === 1 ? '100% VT; badania dodatkowe – nie wymagane' : `100% VT; zakres badań dodatkowych (UT/RT/MT/PT) wg PN-EN 1090-2, tabl. 24 dla ${E}`]);
  req.push(['Połączenia śrubowe', 'zestawy niesprężane wg PN-EN 15048-1 (lub sprężane PN-EN 14399); otwory normalne wg PN-EN 1090-2, tabl. 11; dokręcenie – „do styku” (połączenia niesprężane)']);
  req.push(['Tolerancje geometryczne', 'tolerancje zasadnicze i funkcjonalne wg PN-EN 1090-2, rozdz. 11 i zał. B (m.in. prostoliniowość, wygięcie wstępne, płaskość środnika, prostopadłość blach czołowych)']);
  req.push(['Ochrona przed korozją', `kategoria korozyjności ${o.korozja || 'C2'} wg PN-EN ISO 12944-2; trwałość ${o.trwalosc || 'M'}; przygotowanie powierzchni wg PN-EN 1090-2, rozdz. 10`]);
  if (opts.pozar) req.push(['Zabezpieczenie ogniochronne', opts.pozar]);
  if (opts.podniesienie) req.push(['Podniesienie wykonawcze', opts.podniesienie]);
  if (opts.etapy) req.push(['Montaż', opts.etapy]);
  return { exc: E, n: exc, why, req };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
