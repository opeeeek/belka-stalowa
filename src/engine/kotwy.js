/* =====================================================================
   BelkaStal – kotwienie płyty podporowej w betonie (BS.KT)
   • PN-EN 1992-4 (zamocowania w betonie): kotwy wklejane (pręt
     gwintowany na zaprawie żywicznej), mechaniczne rozporowe, śruby
     fundamentowe wbetonowane z płytką kotwiącą (łbem).
     Rozciąganie: stal, wyrywanie, stożek betonu (h'ef przy ≥ 3
     krawędziach), wyrywanie z przyczepności + stożek (kotwy wklejane),
     rozłupanie (beton niezarysowany).  Ścinanie: stal bez / z ramieniem
     (podlewka > d/2), podważenie (pry-out), krawędź betonu (rząd
     przedni / tylny), interakcja N–V (stal, beton).
   • PN-EN 1993-1-8: blacha podstawy przy odrywaniu – króciec teowy
     (6.2.4, 6.2.6.11–12, efekt dźwigni gdy L_b ≤ L_b*), spoiny belka–
     blacha (4.5.3.3), rozstaw otworów (tabl. 3.3).
   Układ: kotwy po obu stronach pasa dolnego belki (2 kolumny w poprzek,
   n_L rzędów wzdłuż belki), grupa centryczna, płyta sztywna.
   Parametry wyrobu (τ_Rk, N_Rk,p, s_min, c_min, h_min, γ_inst) – z ETA;
   wartości domyślne są orientacyjne i oznaczone w raporcie.
   Jednostki: N, mm, MPa.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, M = BS.M, W = BS.W;
const KT = BS.KT = {};
const f = (v, n) => U.fmt(v, n === undefined ? 1 : n), kN = (v) => U.fmt(v / 1e3, 1);
const BIG = 1e5;

KT.TYPY = {
  wklejane: 'kotwy wklejane – pręt gwintowany na zaprawie żywicznej',
  rozporowe: 'kotwy mechaniczne rozporowe',
  wbetonowane: 'śruby fundamentowe wbetonowane z płytką kotwiącą'
};
KT.KROTKO = { wklejane: 'wklejane', rozporowe: 'rozporowe', wbetonowane: 'wbetonowane' };
// klasy stali kotew: f_yk, f_uk [MPa] (PN-EN ISO 898-1, PN-EN ISO 3506-1)
KT.KL = { '4.6': { fyk: 240, fuk: 400 }, '5.6': { fyk: 300, fuk: 500 }, '5.8': { fyk: 400, fuk: 500 }, '8.8': { fyk: 640, fuk: 800 }, '10.9': { fyk: 900, fuk: 1000 }, 'A4-70': { fyk: 450, fuk: 700 }, 'A4-80': { fyk: 600, fuk: 800 } };
KT.SIZES = ['M12', 'M16', 'M20', 'M24', 'M27', 'M30'];
// podkładka PN-EN ISO 7089 (d_w, t_w), nakrętka PN-EN ISO 4032 (m), skok gwintu P; otwór w blasze d_f (PN-EN 1992-4 tabl. 6.1)
const HW = { 12: [24, 2.5, 10.8, 1.75, 14], 16: [30, 3, 14.8, 2, 18], 20: [37, 3, 18, 2.5, 22], 24: [44, 4, 21.5, 3, 26], 27: [50, 4, 23.8, 3, 30], 30: [56, 4, 25.6, 3.5, 33] };
KT.hw = (d) => { const r = HW[d] || [2 * d, Math.round(0.15 * d), 0.85 * d, 0.12 * d, d + 3]; return { dw: r[0], tw: r[1], m: r[2], P: r[3], df: r[4] }; };
const dOf = (k) => (M.SRUBY[k] ? M.SRUBY[k].d : 16);

// minimalny rozstaw kolumn w poprzek: pas b_f + podkładka + spoina pas–blacha + 10 mm luzu
KT.sBmin = (bf, d, aw) => Math.ceil((bf + KT.hw(d).dw + 2 * Math.SQRT2 * (aw || 0) + 10) / 10) * 10;
// minimalna szerokość płyty: e₂ ≥ max(1,5·d_f; d_w/2 + 5)
KT.bpMin = (sB, d) => Math.ceil((sB + 2 * Math.max(1.5 * KT.hw(d).df, KT.hw(d).dw / 2 + 5)) / 10) * 10;
// głębokość domyślna
KT.hefDef = (typ, d) => (typ === 'wbetonowane' ? Math.max(150, Math.ceil(10 * d / 25) * 25) : typ === 'rozporowe' ? Math.max(50, Math.round(5 * d / 5) * 5) : Math.max(80, Math.ceil(8 * d / 10) * 10));

KT.defaults = function (sec, typ) {
  const bf = sec ? (sec.bd || sec.b || 100) : 100, t = typ || 'wklejane', d = 20;
  return { on: true, auto: true, stab: true, typ: t, d: 'M20', kl: '5.8', nL: 1, sB: KT.sBmin(bf, d, 4), sL: 100, hef: KT.hefDef(t, d), tauCr: 5, tauUcr: 9, NRkp: '', dh: '', ginst: '', otw: 'normalne', tg: 10, rysy: true, zbrKr: false, zbrGes: false, utw: false };
};
// parametry podpory betonowej i blachy (w węźle): b_c, l_c (0 – ściana ciągła), h_c, e_c, spoina a_w, siły dodatkowe
KT.supDefaults = () => ({ bc: 300, lc: 0, hc: 400, ec: 0, aw: 4, Hx: 0, Hy: 0, Nt: 0 });

/* ---------------------------------------------------------- geometria grupy */
KT.geom = function (sec, w) {
  const k = Object.assign(KT.defaults(sec), w.kotwy || {});
  const d = dOf(k.d), H = KT.hw(d), B = M.SRUBY[k.d] || M.SRUBY.M20;
  const slot = k.otw === 'owalne';
  const df = k.otw === 'powiekszone' || k.otw === 'podkladki' ? d + 6 : Math.max(B.d0, H.df);
  const nL = U.clamp(Math.round(U.num(k.nL, 1)), 1, 3), n = 2 * nL;
  const sB = U.num(k.sB, 0), sL = nL > 1 ? U.num(k.sL, 100) : 0;
  const bp = U.num(w.bp), lp = U.num(w.lp), tp = U.num(w.tp, 15);
  const e2 = (bp - sB) / 2, e1 = (lp - sL * (nL - 1)) / 2;
  const xs = Array.from({ length: nL }, (z, i) => (i - (nL - 1) / 2) * sL), ys = [-sB / 2, sB / 2];
  const bc = U.num(w.bc, 0), lc = U.num(w.lc, 0), hc = U.num(w.hc, 0) > 0 ? U.num(w.hc) : BIG, ec = U.num(w.ec, 0);
  const ext = sL * (nL - 1) / 2;
  // odległości kotew skrajnych od krawędzi betonu: x – w kierunku belki (lico od strony przęsła / lico zewnętrzne), y – w poprzek
  const cxP = bc > 0 ? bc / 2 - ec - ext : BIG, cxZ = bc > 0 ? bc / 2 + ec - ext : BIG, cy = lc > 0 ? lc / 2 - sB / 2 : BIG;
  // płyta względem krawędzi podpory
  const pxP = bc > 0 ? bc / 2 - ec - lp / 2 : BIG, pxZ = bc > 0 ? bc / 2 + ec - lp / 2 : BIG, py = lc > 0 ? (lc - bp) / 2 : BIG;
  return { k, d, H, B, As: B.As, df, slot, nL, n, sB, sL, bp, lp, tp, e1, e2, xs, ys, bc, lc, hc, ec, cxP, cxZ, cy, pxP, pxZ, py };
};

/* ---------------------------------------------------------- długość kotwy */
KT.length = function (g) {
  const k = g.k, d = g.d, H = g.H, tg = Math.max(0, U.num(k.tg, 0)), hef = U.num(k.hef, KT.hefDef(k.typ, d));
  const nad = tg + g.tp + H.tw + H.m + 2 * H.P;          // część nad betonem: podlewka + blacha + podkładka + nakrętka + 2 zwoje
  let L, h0, dDrill = null, tAP = null, opis;
  if (k.typ === 'wbetonowane') {
    tAP = Math.max(8, Math.ceil(0.5 * d / 2) * 2);       // płytka kotwiąca
    L = hef + tAP + H.m + nad; h0 = null;
    opis = `L = h_ef + t_pk + m + t_g + t_p + t_w + m + 2P = ${f(hef, 0)} + ${f(tAP, 0)} + ${f(H.m, 1)} + ${f(tg, 0)} + ${f(g.tp, 0)} + ${f(H.tw, 1)} + ${f(H.m, 1)} + ${f(2 * H.P, 1)}`;
  } else if (k.typ === 'rozporowe') {
    L = hef + 0.5 * d + nad; h0 = Math.ceil((hef + d) / 5) * 5; dDrill = d;
    opis = `L ≈ h_ef + 0,5d + t_g + t_p + t_w + m + 2P (orientacyjnie – długość handlowa wg ETA)`;
  } else {
    L = hef + nad; h0 = hef; dDrill = d + (d <= 16 ? 2 : 4);
    opis = `L = h_ef + t_g + t_p + t_w + m + 2P = ${f(hef, 0)} + ${f(tg, 0)} + ${f(g.tp, 0)} + ${f(H.tw, 1)} + ${f(H.m, 1)} + ${f(2 * H.P, 1)}`;
  }
  return { L, Lr: Math.ceil(L / 10) * 10, h0, dDrill, tAP, opis, nad };
};

/* ---------------------------------------------------------- odporności – rozciąganie */
function tensionRes(g, fck, k, gMc, gMsN, kl) {
  const d = g.d, n = g.n, cr = k.rysy !== false, castIn = k.typ === 'wbetonowane', bonded = k.typ === 'wklejane';
  const hef = U.num(k.hef, KT.hefDef(k.typ, d));
  const r = { hef };
  // stal
  r.NRks = g.As * kl.fuk; r.NRds = r.NRks / gMsN;
  // stożek betonu – h'ef przy co najmniej 3 krawędziach bliżej niż c_cr,N (7.2.1.4(8))
  const k1 = castIn ? (cr ? 8.9 : 12.7) : (cr ? 7.7 : 11.0);
  const edges = [g.cxP, g.cxZ, g.cy, g.cy];
  let hefC = hef; const near = edges.filter(c => c < 1.5 * hef);
  if (near.length >= 3) { const cmax = Math.max(...near), smax = Math.max(g.sB, g.sL); hefC = Math.min(hef, Math.max(cmax / 1.5, smax / 3)); }
  const scr = 3 * hefC, ccr = 1.5 * hefC;
  const cmin = Math.max(0, Math.min(...edges));
  const span = (c1, sum, c2, s, cc) => Math.min(c1, cc) + sum + Math.min(c2, cc);
  const sumL = (s) => (g.nL - 1) * Math.min(g.sL, s);
  const AcN = span(Math.max(0, g.cxP), sumL(scr), Math.max(0, g.cxZ), 0, ccr) * span(Math.max(0, g.cy), Math.min(g.sB, scr), Math.max(0, g.cy), 0, ccr);
  const A0cN = scr * scr;
  const psiS = Math.min(1, 0.7 + 0.3 * cmin / ccr), psiRe = k.zbrGes ? Math.min(1, 0.5 + hef / 200) : 1;
  const N0c = k1 * Math.sqrt(fck) * Math.pow(hefC, 1.5);
  Object.assign(r, { k1, hefC, scr, ccr, cmin, AcN, A0cN, psiS, psiRe, N0c, NRkc: N0c * AcN / A0cN * psiS * psiRe });
  r.NRdc = r.NRkc / gMc;
  // wyrywanie (pojedyncza kotwa)
  if (castIn) {
    const dh = U.num(k.dh, 0) > d ? U.num(k.dh) : Math.ceil(3 * d / 5) * 5, Ah = Math.PI / 4 * (dh * dh - d * d), k2 = cr ? 7.5 : 10.5;
    Object.assign(r, { dh, Ah, k2, NRkp1: k2 * Ah * fck }); r.NRdp1 = r.NRkp1 / gMc;
  } else if (!bonded) {
    const v = U.num(k.NRkp, 0); if (v > 0) { r.NRkp1 = v * 1e3; r.NRdp1 = r.NRkp1 / gMc; }
  }
  // wyrywanie z przyczepności + stożek (kotwy wklejane, 7.2.1.6), ψ_sus = 1
  if (bonded) {
    const tauR = cr ? U.num(k.tauCr, 5) : U.num(k.tauUcr, 9), tauU = U.num(k.tauUcr, 9);
    const N0p = tauR * Math.PI * d * hef, scrP = Math.min(3 * hef, 7.3 * d * Math.sqrt(tauU)), ccrP = scrP / 2;
    const ApN = span(Math.max(0, g.cxP), (g.nL - 1) * Math.min(g.sL, scrP), Math.max(0, g.cxZ), 0, ccrP) * span(Math.max(0, g.cy), Math.min(g.sB, scrP), Math.max(0, g.cy), 0, ccrP);
    const k3 = cr ? 7.7 : 11.0, tauRkc = k3 / (Math.PI * d) * Math.sqrt(hef * fck);
    const psi0g = Math.max(1, Math.sqrt(n) - (Math.sqrt(n) - 1) * Math.pow(Math.min(1, tauR / tauRkc), 1.5));
    const sAvg = g.nL > 1 ? (g.sB + g.sL) / 2 : g.sB;
    const psiG = Math.max(1, psi0g - Math.sqrt(Math.min(1, sAvg / scrP)) * (psi0g - 1));
    const psiSp = Math.min(1, 0.7 + 0.3 * cmin / ccrP);
    Object.assign(r, { tauR, N0p, scrP, ccrP, ApN, A0pN: scrP * scrP, tauRkc, psi0g, psiG, psiSp, NRkp: N0p * ApN / (scrP * scrP) * psiG * psiSp * psiRe });
    r.NRdp = r.NRkp / gMc;
  }
  // rozłupanie – beton niezarysowany (7.2.1.7); c_cr,sp, h_min – orientacyjnie (ETA)
  r.hmin = castIn ? hef + 50 : bonded ? Math.max(100, hef + Math.max(30, 2 * (d + 4))) : Math.max(100, 2 * hef);
  if (!cr) {
    const ccrSp = (castIn ? 1.5 : 2.0) * hef, scrSp = 2 * ccrSp;
    const notReq = cmin >= 1.2 * ccrSp && g.hc >= r.hmin;
    r.sp = { ccrSp, scrSp, notReq };
    if (!notReq) {
      const N0sp = Math.min(bonded ? r.N0p : (r.NRkp1 || r.N0c), r.N0c);
      const AcNsp = span(Math.max(0, g.cxP), (g.nL - 1) * Math.min(g.sL, scrSp), Math.max(0, g.cxZ), 0, ccrSp) * span(Math.max(0, g.cy), Math.min(g.sB, scrSp), Math.max(0, g.cy), 0, ccrSp);
      const psiSsp = Math.min(1, 0.7 + 0.3 * cmin / ccrSp);
      const hh = Math.min(g.hc, 10 * hef);
      const psiH = Math.min(2, Math.min(Math.pow(hh / r.hmin, 2 / 3), Math.max(1, Math.pow((hef + 1.5 * cmin) / r.hmin, 2 / 3))));
      Object.assign(r.sp, { N0sp, AcNsp, A0sp: scrSp * scrSp, psiSsp, psiH: Math.max(psiH, 0.01), NRksp: N0sp * AcNsp / (scrSp * scrSp) * psiSsp * psiRe * Math.max(psiH, 0.01) });
      r.sp.NRdsp = r.sp.NRksp / gMc;
    }
  }
  return r;
}

/* ---------------------------------------------------------- odporności – krawędź betonu przy ścinaniu (7.2.2.5) */
function edgeRes(c1, c2a, c2b, s2, hc, d, hef, fck, cr, zbrKr) {
  if (!(c1 > 0) || c1 >= Math.max(10 * hef, 60 * d) || c1 >= BIG / 2) return null;
  const lf = d <= 24 ? Math.min(hef, 12 * d) : Math.min(hef, Math.max(8 * d, 300));
  const al = 0.1 * Math.sqrt(lf / c1), be = 0.1 * Math.pow(d / c1, 0.2), k9 = cr ? 1.7 : 2.4;
  const V0 = k9 * Math.pow(d, al) * Math.pow(lf, be) * Math.sqrt(fck) * Math.pow(c1, 1.5);
  const hV = Math.min(hc, 1.5 * c1), bV = Math.min(c2a, 1.5 * c1) + Math.min(s2, 3 * c1) + Math.min(c2b, 1.5 * c1);
  const AcV = bV * hV, A0cV = 4.5 * c1 * c1;
  const psiS = Math.min(1, 0.7 + 0.3 * Math.min(c2a, c2b) / (1.5 * c1)), psiH = Math.max(1, Math.sqrt(1.5 * c1 / hc)), psiRe = cr && zbrKr ? 1.4 : 1.0;
  return { c1, lf, al, be, k9, V0, AcV, A0cV, bV, hV, psiS, psiH, psiRe, VRk: V0 * AcV / A0cV * psiS * psiH * psiRe };
}

/* ---------------------------------------------------------- projekt / sprawdzenie
   w – węzeł oparcia (bp, lp, tp, lb, beton, bc, lc, hc, ec, aw, kotwy: {...})
   F – { N: odrywanie (rozciąganie grupy) [N], Vx: siła pozioma wzdłuż belki, Vy: w poprzek }
   ctx – { sec, mat, ndp }                                                          */
KT.design = function (ctx, w, F) {
  const { sec, mat, ndp } = ctx;
  const o = W.rec(), g = KT.geom(sec, w), k = g.k, d = g.d;
  o.typ = 'kotwy'; o.geom = g; o.F = F;
  const kl = KT.KL[k.kl] || KT.KL['5.8'];
  const gMsN = Math.max(1.4, 1.2 * kl.fuk / kl.fyk);
  const gMsV = kl.fuk <= 800 && kl.fyk / kl.fuk <= 0.8 ? Math.max(1.25, kl.fuk / kl.fyk) : 1.5;
  const ginst = U.num(k.ginst, 0) > 0 ? U.num(k.ginst) : (k.typ === 'wbetonowane' ? 1.0 : 1.2);
  const gc = ndp.gcK || 1.5, gMc = gc * ginst;
  const fck = M.BETON[w.beton] || 25, cr = k.rysy !== false;
  const hef = U.num(k.hef, KT.hefDef(k.typ, d));
  Object.assign(o, { kl, gMsN, gMsV, ginst, gMc, fck, cr, hef });
  o.len = KT.length(g);
  const ref4 = 'PN-EN 1992-4', grpN = 'Kotwy – rozciąganie', grpV = 'Kotwy – ścinanie', grpI = 'Kotwy – interakcja N–V';
  const N = Math.max(0, F.N || 0);
  let Vx = Math.abs(F.Vx || 0); const Vy = Math.abs(F.Vy || 0);
  if (g.slot && Vx > 0) { o.uwagi.push(`Otwory owalne wzdłuż belki (podpora przesuwna) – kotwy nie przenoszą siły poziomej wzdłuż belki V_x = ${kN(Vx)} kN; przesuw z tarciem.`); Vx = 0; }
  const V = Math.hypot(Vx, Vy);
  o.Nd = N; o.Vx = Vx; o.Vy = Vy; o.V = V;
  const n = g.n, N1 = N / n, V1 = V / n;

  // --- rozciąganie
  const T = tensionRes(g, fck, k, gMc, gMsN, kl); o.T = T;
  const bN = [];       // wytężenia betonu przy rozciąganiu
  if (N > 0) {
    o.add(grpN, 'Zniszczenie stali kotwy (najbardziej obciążona)', `${ref4} 7.2.1.3`, N1, T.NRds, 'F', `N_Ed^h = N_Ed/n = ${kN(N)}/${n} = ${kN(N1)} kN; N_Rk,s = A_s·f_uk = ${f(g.As, 1)}·${f(kl.fuk, 0)} = ${kN(T.NRks)} kN; γ_Ms = 1,2·f_uk/f_yk ≥ 1,4 → ${f(gMsN, 2)}`);
    if (T.NRdp1) bN.push(o.add(grpN, k.typ === 'wbetonowane' ? 'Wyrwanie (docisk pod łbem / płytką kotwiącą)' : 'Wyrwanie kotwy (N_Rk,p z ETA)', `${ref4} 7.2.1.5`, N1, T.NRdp1, 'F', k.typ === 'wbetonowane' ? `N_Rk,p = k₂·A_h·f_ck = ${f(T.k2, 1)}·${f(T.Ah, 0)}·${f(fck, 0)} = ${kN(T.NRkp1)} kN (d_h = ${f(T.dh, 0)} mm, ${cr ? 'beton zarysowany' : 'niezarysowany'}); γ_Mp = γ_Mc = ${f(gMc, 2)}` : `N_Rk,p = ${kN(T.NRkp1)} kN (ETA); γ_Mp = ${f(gMc, 2)}`));
    else if (k.typ === 'rozporowe') o.uwagi.push('Kotwy rozporowe: brak N_Rk,p z ETA – wyrwanie nie zostało sprawdzone (wpisz wartość z ETA wyrobu).');
    bN.push(o.add(grpN, 'Stożek betonu (grupa kotew)', `${ref4} 7.2.1.4`, N, T.NRdc, 'F', `N⁰_Rk,c = k₁·√f_ck·h_ef^1,5 = ${f(T.k1, 1)}·√${f(fck, 0)}·${f(T.hefC, 0)}^1,5 = ${kN(T.N0c)} kN${T.hefC < hef - 1e-6 ? ` (h'_ef = ${f(T.hefC, 0)} mm – ≥ 3 krawędzie, 7.2.1.4(8))` : ''}; A_c,N/A⁰_c,N = ${f(T.AcN / 100, 0)}/${f(T.A0cN / 100, 0)} cm²; ψ_s,N = ${f(T.psiS, 3)}; ψ_re,N = ${f(T.psiRe, 3)}; ψ_ec,N = ψ_M,N = 1; N_Rk,c = ${kN(T.NRkc)} kN; γ_Mc = γ_c·γ_inst = ${f(gc, 2)}·${f(ginst, 2)} = ${f(gMc, 2)}`));
    if (T.NRkp) bN.push(o.add(grpN, 'Wyrwanie z przyczepności + stożek betonu (kotwy wklejane)', `${ref4} 7.2.1.6`, N, T.NRdp, 'F', `N⁰_Rk,p = τ_Rk·π·d·h_ef = ${f(T.tauR, 1)}·π·${f(d, 0)}·${f(hef, 0)} = ${kN(T.N0p)} kN (τ_Rk ${cr ? 'zarysowany' : 'niezarysowany'} – ETA); s_cr,Np = ${f(T.scrP, 0)} mm; A_p,N/A⁰_p,N = ${f(T.ApN / 100, 0)}/${f(T.A0pN / 100, 0)} cm²; ψ_g,Np = ${f(T.psiG, 3)}; ψ_s,Np = ${f(T.psiSp, 3)}; N_Rk,p = ${kN(T.NRkp)} kN`));
    if (T.sp) {
      if (T.sp.notReq) o.uwagi.push(`Rozłupanie betonu (7.2.1.7) – sprawdzenie niewymagane: c ≥ 1,2·c_cr,sp = ${f(1.2 * T.sp.ccrSp, 0)} mm i h ≥ h_min.`);
      else bN.push(o.add(grpN, 'Rozłupanie betonu (beton niezarysowany)', `${ref4} 7.2.1.7`, N, T.sp.NRdsp, 'F', `c_cr,sp = ${f(T.sp.ccrSp, 0)} mm (orientacyjnie – ETA); N⁰_Rk,sp = ${kN(T.sp.N0sp)} kN; ψ_h,sp = ${f(T.sp.psiH, 3)}; N_Rk,sp = ${kN(T.sp.NRksp)} kN`));
    } else o.uwagi.push('Rozłupanie betonu (7.2.1.7(2)c) – nie sprawdza się: nośności wyznaczono dla betonu zarysowanego, a zbrojenie elementu ma przenosić siły rozłupujące i ograniczać rysy do w_k ≤ 0,3 mm.');
  }
  // nośność grupy na rozciąganie (do króćca teowego i ostrzeżeń)
  o.NRd = Math.min(n * T.NRds, T.NRdc, T.NRdp || Infinity, T.NRdp1 ? n * T.NRdp1 : Infinity, T.sp && !T.sp.notReq ? T.sp.NRdsp : Infinity);

  // --- ścinanie
  const bV = [];
  let VRds = 0;
  if (V > 0) {
    if (k.otw === 'powiekszone') o.add(grpV, 'Przeniesienie ścinania przez kotwy w otworach powiększonych', `${ref4} 6.2.2.2, tabl. 6.1`, V, 0, 'F', `luz otworu d_f = ${f(g.df, 0)} mm > wartości z tabl. 6.1 – kotwy nie przenoszą ścinania; zastosuj podkładki przyspawane do blachy (otwór d + 2 mm) lub otwory normalne`);
    const tg = Math.max(0, U.num(k.tg, 0)), lever = tg > d / 2;
    const k6 = kl.fuk <= 500 ? 0.6 : 0.5;
    if (!lever) {
      const VRks = k6 * g.As * kl.fuk; VRds = VRks / gMsV;
      o.add(grpV, 'Zniszczenie stali kotwy bez ramienia (najbardziej obciążona)', `${ref4} 7.2.2.3.1`, V1, VRds, 'F', `V_Ed^h = V_Ed/n = ${kN(V)}/${n} = ${kN(V1)} kN; V_Rk,s = k₆·A_s·f_uk = ${f(k6, 1)}·${f(g.As, 1)}·${f(kl.fuk, 0)} = ${kN(VRks)} kN (podlewka t_g = ${f(tg, 0)} ≤ d/2); γ_Ms = ${f(gMsV, 2)}`);
      o.Vs = { lever: false, k6, VRks };
    } else {
      const ds = Math.sqrt(4 * g.As / Math.PI), Wel = Math.PI * ds ** 3 / 32, M0 = 1.2 * Wel * kl.fuk;
      const MRks = M0 * Math.max(0, 1 - N1 / T.NRds), aM = k.utw ? 2 : 1, la = 0.5 * d + tg + g.tp / 2;
      const VRksM = aM * MRks / la; VRds = VRksM / gMsV;
      o.add(grpV, 'Zniszczenie stali kotwy z ramieniem (podlewka > d/2)', `${ref4} 6.2.2.3, 7.2.2.3.2`, V1, VRds, 'F', `l_a = 0,5d + t_g + t_p/2 = ${f(la, 1)} mm; M⁰_Rk,s = 1,2·W_el·f_uk = ${f(M0 / 1e6, 3)} kNm; M_Rk,s = M⁰_Rk,s·(1 − N_Ed^h/N_Rd,s) = ${f(MRks / 1e6, 3)} kNm; α_M = ${aM} (${aM === 2 ? 'płyta utwierdzona na kotwie' : 'bez utwierdzenia – bezpiecznie'}); V_Rk,s,M = α_M·M_Rk,s/l_a = ${kN(VRksM)} kN`);
      o.Vs = { lever: true, la, M0, MRks, aM, VRksM };
    }
    // podważenie (pry-out)
    const k8 = hef >= 60 ? 2 : 1, NRkcp = k.typ === 'wklejane' ? Math.min(T.NRkc, T.NRkp || Infinity) : T.NRkc, VRkcp = k8 * NRkcp;
    bV.push(o.add(grpV, 'Podważenie betonu (pry-out) – grupa', `${ref4} 7.2.2.4`, V, VRkcp / gMc, 'F', `V_Rk,cp = k₈·${k.typ === 'wklejane' ? 'min(N_Rk,c; N_Rk,p)' : 'N_Rk,c'} = ${k8}·${kN(NRkcp)} = ${kN(VRkcp)} kN (k₈ – ETA, orientacyjnie ${k8}); γ_Mc = ${f(gMc, 2)}`));
    // krawędź betonu – wzdłuż belki (V_x ku bliższemu licu podpory)
    const edge = (lab, Vd, c1f, c2a, c2b, s2, sBack, nRows) => {
      const fr = edgeRes(c1f, c2a, c2b, s2, g.hc, d, hef, fck, cr, k.zbrKr); if (!fr) return;
      bV.push(o.add(grpV, `Krawędź betonu – ${lab}, rząd przedni (c₁ = ${f(fr.c1, 0)} mm)`, `${ref4} 7.2.2.5`, Vd / nRows, fr.VRk / gMc, 'F', `V⁰_Rk,c = k₉·d^α·l_f^β·√f_ck·c₁^1,5 = ${f(fr.k9, 1)}·${f(d, 0)}^${f(fr.al, 3)}·${f(fr.lf, 0)}^${f(fr.be, 3)}·√${f(fck, 0)}·${f(fr.c1, 0)}^1,5 = ${kN(fr.V0)} kN; A_c,V/A⁰_c,V = ${f(fr.AcV / 100, 0)}/${f(fr.A0cV / 100, 0)} cm²; ψ_s,V = ${f(fr.psiS, 3)}; ψ_h,V = ${f(fr.psiH, 3)}; ψ_re,V = ${f(fr.psiRe, 1)}; V_Rk,c = ${kN(fr.VRk)} kN; udział rzędu 1/${nRows}`));
      if (nRows > 1) { const bk = edgeRes(c1f + sBack, c2a, c2b, s2, g.hc, d, hef, fck, cr, k.zbrKr); if (bk) bV.push(o.add(grpV, `Krawędź betonu – ${lab}, rząd tylny (c₁ = ${f(bk.c1, 0)} mm, całe V)`, `${ref4} 7.2.2.5`, Vd, bk.VRk / gMc, 'F', `V⁰_Rk,c = ${kN(bk.V0)} kN; A_c,V/A⁰_c,V = ${f(bk.AcV / 100, 0)}/${f(bk.A0cV / 100, 0)} cm²; ψ_s,V = ${f(bk.psiS, 3)}; ψ_h,V = ${f(bk.psiH, 3)}; V_Rk,c = ${kN(bk.VRk)} kN`)); }
    };
    if (Vx > 0 && g.bc > 0) edge('V_x ku licu podpory', Vx, Math.min(g.cxP, g.cxZ), g.cy, g.cy, g.sB, g.sL * (g.nL - 1), g.nL);
    if (Vy > 0 && g.lc > 0) edge('V_y w poprzek', Vy, g.cy, g.cxP, g.cxZ, g.sL * (g.nL - 1), g.sB, 2);
    if (g.bc <= 0) o.uwagi.push('Nie podano wymiarów podpory betonowej – krawędzie betonu przyjęto jako odległe (bez sprawdzenia krawędzi przy ścinaniu i bez redukcji stożka).');
  }
  // --- interakcja N–V (7.2.3)
  if (N > 0 && V > 0) {
    const bNs = N1 / T.NRds, bVs = VRds > 0 ? V1 / VRds : Infinity;
    o.ratio(grpI, 'Stal: β_N² + β_V² ≤ 1', `${ref4} 7.2.3.1 (7.54)`, bNs * bNs + bVs * bVs, `β_N = ${f(bNs, 3)}, β_V = ${f(bVs, 3)}`);
    const bNc = Math.max(0, ...bN), bVc = Math.max(0, ...bV);
    if (bNc > 0 && bVc > 0) o.ratio(grpI, 'Beton: β_N^1,5 + β_V^1,5 ≤ 1', `${ref4} 7.2.3.1 (7.55)`, Math.pow(bNc, 1.5) + Math.pow(bVc, 1.5), `β_N = ${f(bNc, 3)} (max. z trybów betonu przy rozciąganiu), β_V = ${f(bVc, 3)} (max. z trybów betonu przy ścinaniu)`);
  }

  // --- blacha podstawy przy odrywaniu: króciec teowy (PN-EN 1993-1-8 6.2.4, 6.2.6.11–12)
  const bf = sec.bd || sec.b || 100, aw = Math.max(0, U.num(w.aw, 0));
  const pl = M.fy(mat.gatunek, g.tp || 10, ndp.fySrc);
  const m = g.sB / 2 - bf / 2 - 0.8 * Math.SQRT2 * aw;
  o.dmin('kotwy', 'kotwy poza pasem belki: m = s_B/2 − b_f/2 − 0,8·√2·a_w > 0', m, 1e-3, 'min', 'geometria; PN-EN 1993-1-8 6.2.6.11');
  if (N > 0 && m > 0) {
    const ee = g.e2, nn = Math.min(ee, 1.25 * m);
    const leff = Math.min(g.lp, g.nL * Math.min(2 * Math.PI * m, 4 * m + 1.25 * ee));
    const Mpl = 0.25 * leff * g.tp * g.tp * pl.fy / ndp.gM0;
    const Lb = 8 * d + Math.max(0, U.num(k.tg, 0)) + g.tp + g.H.tw + 0.5 * g.H.m;
    const Lbs = 8.8 * m ** 3 * g.As * g.nL / (leff * g.tp ** 3);
    const pry = Lb <= Lbs, SFt = o.NRd;
    const FT1 = pry ? 4 * Mpl / m : 2 * Mpl / m, FT2 = pry ? (2 * Mpl + nn * SFt) / (m + nn) : Infinity, FT3 = SFt;
    const FT = Math.min(FT1, FT2);                 // tryby z udziałem blachy; tryb 3 (same kotwy) – sprawdzenia kotew
    o.tstub = { m, nn, leff, Mpl, Lb, Lbs, pry, FT1, FT2, FT3, FT, fy: pl.fy };
    o.add('Blacha podstawy', 'Zginanie blachy przy odrywaniu (króciec teowy)', 'PN-EN 1993-1-8 6.2.4, 6.2.6.11, tabl. 6.2', N, FT, 'F', `m = ${f(m, 1)} mm, n = ${f(nn, 1)} mm, l_eff = ${f(leff, 0)} mm, M_pl,Rd = 0,25·l_eff·t_p²·f_y/γM0 = ${f(Mpl / 1e6, 3)} kNm; L_b = ${f(Lb, 0)} mm ${pry ? '≤' : '>'} L_b* = ${f(Lbs, 0)} mm → ${pry ? 'efekt dźwigni: F_T,1 = 4M_pl/m = ' + kN(FT1) + ' kN, F_T,2 = (2M_pl + n·ΣF_t,Rd)/(m + n) = ' + kN(FT2) + ' kN' : 'bez efektu dźwigni: F_T,1-2 = 2M_pl/m = ' + kN(FT1) + ' kN'}; (tryb 3 – zerwanie kotew: ΣF_t,Rd = ${kN(FT3)} kN – sprawdzenia kotew)`);
  }
  // --- spoiny belka–blacha (pas dolny, dwie spoiny pachwinowe wzdłuż krawędzi pasa)
  if (N > 0 || V > 0) {
    const lb = Math.min(U.num(w.lb, g.lp) || g.lp, g.lp), lw = Math.max(0, lb - 2 * aw);
    const bw = (M.STAL[mat.gatunek] || {}).bw || 0.9, fvw = pl.fu / (Math.sqrt(3) * bw * ndp.gM2);
    if (aw <= 0) o.add('Spoiny belka–blacha', 'Brak spoin belki z blachą – siły odrywania / poziome nieprzeniesione', 'PN-EN 1993-1-8 4.5.3.3', Math.hypot(N, V), 0, 'F', 'podaj grubość spoiny a_w');
    else {
      const fN = N / (2 * lw), fVx = Vx / (2 * lw), fVy = Vy / (2 * lw), FwEd = Math.hypot(fN, fVx, fVy), FwRd = aw * fvw;
      o.add('Spoiny belka–blacha', 'Spoiny pachwinowe pasa z blachą (metoda uproszczona)', 'PN-EN 1993-1-8 4.5.3.3', FwEd, FwRd, 'q', `2 spoiny a_w = ${f(aw, 0)} mm, l_w = l_b − 2a_w = ${f(lw, 0)} mm; F_w,Ed = √(N² + V_x² + V_y²)/(2l_w) = ${f(FwEd, 1)} N/mm; F_w,Rd = a·f_u/(√3·β_w·γM2) = ${f(FwRd, 1)} N/mm`);
    }
  }

  // --- wymagania konstrukcyjne
  const el = 'kotwy', hm = g.H;
  o.dmin('blacha podstawy', 'otwory w obrysie blachy: e₂ = (b_p − s_B)/2 ≥ 1,2·d_f', g.e2, 1.2 * g.df, 'min', 'PN-EN 1993-1-8 tabl. 3.3');
  o.dmin('blacha podstawy', 'otwory w obrysie blachy: e₁ = (l_p − (n_L − 1)·s_L)/2 ≥ 1,2·d_f', g.e1, 1.2 * g.df, 'min', 'PN-EN 1993-1-8 tabl. 3.3');
  o.dmin(el, 'luz montażowy przy pasie: (s_B − b_f)/2 ≥ d_w/2 + √2·a_w + 5 mm', (g.sB - bf) / 2, hm.dw / 2 + Math.SQRT2 * aw + 5, 'zal', 'montaż (klucz, podkładka, spoina)');
  const smin = Math.max(5 * d, 50), cminR = Math.max(5 * d, 50);
  o.dmin(el, `rozstaw s_B ≥ s_min ≈ ${f(smin, 0)} mm (ETA)`, g.sB, smin, 'zal', 'ETA wyrobu (orientacyjnie 5d)');
  if (g.nL > 1) o.dmin(el, `rozstaw s_L ≥ s_min ≈ ${f(smin, 0)} mm (ETA)`, g.sL, smin, 'zal', 'ETA wyrobu (orientacyjnie 5d)');
  if (g.bc > 0 || g.lc > 0) {
    const cm = Math.min(g.cxP, g.cxZ, g.cy);
    o.dmin(el, 'kotwy w obrysie podpory betonowej: c > d/2', cm, d / 2, 'min', 'geometria');
    o.dmin(el, `odległość od krawędzi c ≥ c_min ≈ ${f(cminR, 0)} mm (ETA)`, cm, cminR, 'zal', 'ETA wyrobu (orientacyjnie 5d)');
    o.dmin('blacha podstawy', 'blacha w obrysie podpory (od strony przęsła)', g.pxP, 0, 'zal', 'oparcie');
    o.dmin('blacha podstawy', 'blacha w obrysie podpory (od czoła)', g.pxZ, 0, 'zal', 'oparcie');
  }
  if (g.hc < BIG / 2) o.dmin(el, `grubość elementu betonowego h ≥ h_min ≈ ${f(T.hmin, 0)} mm (ETA)`, g.hc, T.hmin, 'zal', 'ETA wyrobu');
  if (g.hc < BIG / 2) o.dmin(el, 'kotwa w obrysie elementu: h_c ≥ h_ef (+ płytka i nakrętka) + 30 mm otuliny', g.hc, hef + (k.typ === 'wbetonowane' ? (o.len.tAP || 10) + g.H.m : 0) + 30, 'min', 'geometria');
  if (k.typ === 'wklejane') { o.dmin(el, 'h_ef ≥ max(60; 4d) (ETA – typowo)', hef, Math.max(60, 4 * d), 'zal', 'ETA wyrobu'); o.dmax(el, 'h_ef ≤ 20d (ETA – typowo)', hef, 20 * d, 'zal'); }
  else o.dmin(el, 'h_ef ≥ 40 mm', hef, 40, 'min', 'PN-EN 1992-4 1.1');
  if (k.typ === 'wbetonowane') o.dmin(el, 'płytka kotwiąca: d_h ≥ 2d', T.dh, 2 * d, 'zal', 'PN-EN 1992-4 7.2.1.5');
  if (k.typ !== 'wklejane' && k.typ !== 'wbetonowane' && !(U.num(k.NRkp, 0) > 0)) o.uwagi.push('Uzupełnij parametry kotwy rozporowej z ETA (N_Rk,p, s_min, c_min, h_min, k₈).');
  if (k.typ === 'wklejane') o.uwagi.push(`Kotwy wklejane: τ_Rk = ${f(T.tauR, 1)} MPa (${cr ? 'beton zarysowany' : 'niezarysowany'}) – przyjmij z ETA zaprawy dla ${w.beton || 'C25/30'}, temperatury i warunków montażu; otwór Ø${f(o.len.dDrill, 0)} głęb. ${f(o.len.h0, 0)} mm.`);
  if (k.otw === 'podkladki') o.uwagi.push(`Otwory w blasze Ø${f(g.df, 0)} (powiększone) – na każdą kotwę podkładka przyspawana do blachy z otworem Ø${f(d + 2, 0)} mm (przeniesienie ścinania, PN-EN 1992-4 6.2.2.2).`);
  // podsumowanie
  const res = W.fin(o);
  res.opis = KT.txt(w);
  return res;
};

KT.txt = function (w) {
  const k = Object.assign({}, KT.defaults(null), w.kotwy || {});
  const nL = U.clamp(Math.round(U.num(k.nL, 1)), 1, 3);
  return `${2 * nL} × ${k.d} kl. ${k.kl}, ${KT.KROTKO[k.typ] || k.typ}, h_ef = ${U.fmt(U.num(k.hef), 0)} mm, rozstaw ${U.fmt(U.num(k.sB), 0)}${nL > 1 ? ` × ${U.fmt(U.num(k.sL), 0)}` : ''} mm`;
};

/* ---------------------------------------------------------- dobór automatyczny: kotwy, rozstaw i płyta podstawy
   Zmienne: średnica (od M16), liczba rzędów n_L, h_ef (kotwy wklejane / wbetonowane; rozporowe – h_ef z ETA bez zmian),
   rozstaw s_B (minimalny przy pasie), s_L, płyta b_p × l_p × t_p (l_p ≤ b_c, b_p ≤ l_c), l_b = l_p.
   Warunki: docisk płyty do betonu, wszystkie sprawdzenia kotew, blachy i spoin, wymagania konstrukcyjne.
   Kryterium: najmniejszy koszt umowny [kg] = masa płyty + 4·masa kotew + 0,4·n + 2·10⁻⁵·n·h_ef·d (wiercenie, zaprawa).
   Wynik zależy tylko od danych wejściowych (nie od wymiarów dobranych poprzednio) – obliczenia odtwarzalne. */
KT.bearArgs = (w) => ({ podloze: w.podloze, bp: U.num(w.bp), lp: U.num(w.lp), tp: U.num(w.tp), beton: w.beton, alfa: w.alfa, fd: w.fd, beta: w.beta, lb: U.num(w.lb, U.num(w.lp)), bc: U.num(w.bc, 0), lc: U.num(w.lc, 0), hc: U.num(w.hc, 0), ec: U.num(w.ec, 0) });
const CACHE = new Map();
KT.autoBase = function (ctx, w, F, REd, eta) {
  eta = eta || 1;
  const { sec, mat, ndp } = ctx, C = BS.C;
  const key = JSON.stringify([sec.nazwa, sec.h, sec.bd || sec.b, mat.gatunek, ndp.gcK, ndp.gM0, ndp.gM2, ndp.betaJ, ndp.gc, w.beton, w.alfa, w.bc, w.lc, w.hc, w.ec, w.aw, w.podloze, w.kotwy, Math.round(F.N), Math.round(F.Vx), Math.round(F.Vy), Math.round(REd || 0), eta]);
  if (CACHE.has(key)) return CACHE.get(key);
  const bf = sec.bd || sec.b || 100, aw = U.num(w.aw, 4) > 0 ? U.num(w.aw, 4) : 4;
  const k0 = Object.assign(KT.defaults(sec, (w.kotwy || {}).typ), w.kotwy || {});
  const bc = U.num(w.bc, 0), lc = U.num(w.lc, 0), lpMax = bc > 0 ? bc - 2 * Math.abs(U.num(w.ec, 0)) : 500, bpMax = lc > 0 ? lc : 900;
  const okA = (o) => o.checks.every(c => c.u <= eta + 1e-9) && o.detalFail.length === 0;
  const okB = (ww) => { if (!(REd > 0) || w.podloze === 'stal') return true; const o = C.bearingPlate(sec, mat, ndp, KT.bearArgs(ww), REd); return o.checks.every(c => c.u <= eta + 1e-9); };
  const kg = 7.85e-6;
  // warianty kotew uporządkowane wg dolnego oszacowania kosztu
  const vars = [];
  KT.SIZES.filter(D => dOf(D) >= 16).forEach(D => {
    const d = dOf(D), df = KT.hw(d).df, sB = KT.sBmin(bf, d, aw), bp = Math.max(KT.bpMin(sB, d), Math.ceil((bf + 40) / 10) * 10);
    if (bp > bpMax) return;
    [1, 2, 3].forEach(nL => {
      const sL = nL > 1 ? Math.ceil(Math.max(5 * d, 3 * df) / 10) * 10 : U.num(k0.sL, 100);
      const lpMin = Math.max(100, Math.ceil(((nL - 1) * sL + 2.4 * df) / 10) * 10);
      if (lpMin > lpMax) return;
      const hefs = k0.typ === 'wbetonowane' ? [150, 200, 250, 300, 350, 400, 500] : k0.typ === 'rozporowe' ? [U.num(k0.hef, KT.hefDef('rozporowe', d))] : [8, 10, 12, 15, 20].map(m => Math.ceil(m * d / 10) * 10).filter(h => h >= 60);
      hefs.forEach(hef => {
        const kk = Object.assign({}, k0, { d: D, nL, hef, sB, sL });
        const n = 2 * nL, L = KT.length(KT.geom(sec, Object.assign({}, w, { bp, lp: lpMin, tp: 10, kotwy: kk }))).Lr;
        const cA = 4 * n * kg * Math.PI / 4 * d * d * L + 0.4 * n + 2e-5 * n * hef * d;
        vars.push({ kk, bp, lpMin, n, cA, lb: cA + kg * bp * lpMin * 10 });
      });
    });
  });
  vars.sort((a, b) => a.lb - b.lb);
  const lps = (m) => Array.from(new Set([m, 120, 150, 180, 200, 250, 300, 350, 400, 450, 500].filter(v => v >= m && v <= lpMax)));
  let best = null, tries = 0;
  for (const v of vars) {
    if (best && v.lb >= best.cost) break;
    // wstępnie: same kotwy przy najcieńszej płycie (najkrótsze ramię przy ścinaniu) – jeśli nie spełniają, wariant odpada
    const pre = KT.design(ctx, Object.assign({}, w, { bp: v.bp, lp: v.lpMin, tp: 10, lb: v.lpMin, aw, kotwy: v.kk }), F); tries++;
    if (pre.checks.some(c => /^Kotwy/.test(c.grp) && !(c.u <= eta + 1e-9))) continue;
    for (const lp of lps(v.lpMin)) {
      if (best && v.cA + kg * v.bp * lp * 10 >= best.cost) break;
      let hit = null;
      for (const tp of [10, 12, 15, 20, 25, 30]) {
        if (best && v.cA + kg * v.bp * lp * tp >= best.cost) break;
        const ww = Object.assign({}, w, { bp: v.bp, lp, tp, lb: lp, aw, kotwy: v.kk });
        if (!okB(ww)) continue;
        tries++; const o = KT.design(ctx, ww, F);
        if (okA(o)) { hit = { w: ww, o, cost: v.cA + kg * v.bp * lp * tp }; break; }
      }
      if (hit) { if (!best || hit.cost < best.cost) best = hit; break; }
    }
  }
  const res = best ? { ok: true, w: best.w, o: best.o, cost: best.cost, tries } : { ok: false, tries };
  if (CACHE.size > 60) CACHE.clear();
  CACHE.set(key, res);
  return res;
};
// opis wariantu dobranego automatycznie
KT.autoTxt = (w) => `płyta ${U.fmt(U.num(w.bp), 0)}×${U.fmt(U.num(w.lp), 0)}×${U.fmt(U.num(w.tp), 0)} mm, kotwy ${KT.txt(w)}`;

/* ---------------------------------------------------------- dobór kotew (i szerokości płyty) */
// wariant o najmniejszym „koszcie” n·d²·(h_ef + 50) spełniający wszystkie warunki; typ i klasa – jak wybrane
KT.auto = function (ctx, w, F, eta) {
  eta = eta || 1;
  const { sec } = ctx, bf = sec.bd || sec.b || 100, k0 = Object.assign(KT.defaults(sec, (w.kotwy || {}).typ), w.kotwy || {});
  const aw = U.num(w.aw, 4) || 4;
  const ok = (o) => o.checks.every(c => c.u <= eta + 1e-9) && o.detalFail.length === 0;
  let best = null;
  for (const D of KT.SIZES) {
    const d = dOf(D);
    for (const nL of [1, 2]) {
      const hefs = k0.typ === 'wbetonowane' ? [150, 200, 250, 300, 350, 400, 500] : k0.typ === 'rozporowe' ? [U.num(k0.hef, KT.hefDef('rozporowe', d))] : [8, 10, 12, 15, 20].map(m => Math.ceil(m * d / 10) * 10).filter(h => h >= 60);
      for (const hef of hefs) {
        const sB = KT.sBmin(bf, d, aw);
        const bp = Math.max(U.num(w.bp, 0), KT.bpMin(sB, d));
        const df = KT.hw(d).df, sL = nL > 1 ? Math.max(Math.ceil(Math.max(5 * d, 3 * df) / 10) * 10, U.num(k0.sL, 0)) : U.num(k0.sL, 100);
        const lp = Math.max(U.num(w.lp, 0), nL > 1 ? Math.ceil((sL + 2.4 * df) / 10) * 10 : Math.ceil(2.4 * df / 10) * 10);
        const kk = Object.assign({}, k0, { d: D, nL, hef, sB, sL, on: true });
        const ww = Object.assign({}, w, { bp, lp, aw, kotwy: kk });
        const o = KT.design(ctx, ww, F);
        if (ok(o)) { const cost = 2 * nL * d * d * (hef + 50); if (!best || cost < best.cost) best = { w: ww, o, cost }; break; }
      }
    }
  }
  return best ? { ok: true, w: best.w, o: best.o } : { ok: false };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
