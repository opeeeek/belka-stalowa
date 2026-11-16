/* =====================================================================
   BelkaStal – projekt: stan domyślny, walidacja i pełny przebieg obliczeń
   (profil normowy → model → analiza etapów → kombinacje → sprawdzenia
   SGN/SGU/stateczność/podpory/połączenia/pożar/zmęczenie/kruche pękanie
   → klasa wykonania), suma kontrolna danych wejściowych.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, N = BS.N, M = BS.M, P = BS.P, S = BS.S, K = BS.K, R = BS.R, T = BS.T, C = BS.C, X = BS.X, F = BS.FE;
const J = BS.J = {};

J.defaultState = function () {
  return {
    format: BS.FORMAT,
    meta: { nazwa: 'Belka B-1', obiekt: 'Budynek biurowy – strop nad parterem', projektant: '', sprawdzajacy: '', nrUprawnien: '', data: '', opis: 'Belka stropowa jednoprzęsłowa; płyty stropowe układane w etapie montażu, stężenie montażowe w środku rozpiętości; w eksploatacji pas górny stężony płytą.' },
    normy: N.defaultProfile(),
    geom: { przesla: [6.0], wspL: 0, wspP: 0 },
    podpory: [
      { typ: 'przegub', ltb: 'widelkowe', ss: 0, c: 0, wezel: { typ: 'blacha_czolowa', hp: 200, bp: 150, tp: 8, nr: 2, d: 'M16', kl: '8.8', e1: 40, p1: 120, e2: 30, p3: 90, a: 4, tsup: 12, fusup: 510, gwint: true } },
      { typ: 'przegub', ltb: 'widelkowe', ss: 150, c: 50, wezel: { typ: 'oparcie', podloze: 'beton', bp: 200, lp: 150, tp: 15, beton: 'C25/30', alfa: 1.5, lb: 150, zebro: false, bs: 70, ts: 10, ch: 15 } }
    ],
    podporyTymczasowe: [],
    przekroj: { typ: 'walc', seria: 'IPE', nr: 300 },
    material: { gatunek: 'S355', podgatunek: 'J2' },
    ciezarWlasny: { auto: true, dodatek: 5, etap: 0 },
    obciazenia: [
      { id: 'G1', nazwa: 'Płyty stropowe i warstwy (4,0 kN/m² × 2,0 m)', rodzaj: 'G', etap: 0, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: 8.0, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] },
      { id: 'Qc1', nazwa: 'Obciążenie montażowe Qca+Qcb (0,75 kN/m² × 2,0 m)', rodzaj: 'Qc', etap: 0, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: 1.5, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] },
      { id: 'Q1', nazwa: 'Użytkowe kat. B – biura (3,0 kN/m² × 2,0 m)', rodzaj: 'Q', kat: 'Q-B', etap: 1, uklad: 'szachownica', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: 6.0, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] },
      { id: 'Q2', nazwa: 'Ścianki działowe (0,8 kN/m² × 2,0 m)', rodzaj: 'Q', kat: 'Q-B', etap: 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: 1.6, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] }
    ],
    etapy: [
      { id: 'E1', nazwa: 'Montaż – układanie płyt stropowych', typ: 'montaz', opis: 'Belka bez stężenia pasa górnego; tymczasowe stężenie boczne w środku rozpiętości.' },
      { id: 'E2', nazwa: 'Eksploatacja', typ: 'eksploatacja', opis: 'Pas górny stężony ciągle przez płyty stropowe.' }
    ],
    stezenia: [{ x: 3.0, typ: 'boczne', wys: 'pas_g', odEtapu: 0, bocznieY: true }],
    stezenieCiagle: { pasG: true, odEtapu: 1, pasD: false, odEtapuD: 1 },
    analiza: { muY: 1.0, muZ: 1.0, zebraRozstaw: 0, slupekSztywny: false },
    sgu: { typ: 'strop', wmax: 250, w3: 350, podniesienie: 'brak', wc: 0, drgania: true, fmin: 3.0, uLim: 200 },
    pozar: { aktywny: false, R: 60, ekspozycja: '3', ochrona: 'brak', dp: 20, lp: 0.12, cp: 1200, rp: 300, kappa1: '' },
    zmeczenie: { aktywny: false, przypadki: [], n: 2e6, phi: 1.0, zmiennyZnak: false, ocena: 'tolerancja', skutki: 'duze', detale: [{ k: 'w160', miejsce: 'pas_d', dc: 160 }], dtc: 100 },
    kruche: { Tmd: -30, dTr: 0, dTeps: 0, dTcf: 0, plyty: 0.75, z: { aktywny: false, a: 5, Zb: 0, s: 10, Zd: 0, Ze: 0 } },
    wykonanie: { CC: 'CC2', EXC: 'auto', uzasadnienie: '', korozja: 'C2', trwalosc: 'M', uwagi: '' }
  };
};

/* migracja i uzupełnienie brakujących pól (pliki starsze/niekompletne) */
J.normalize = function (st) {
  const d = J.defaultState();
  const o = Object.assign({}, d, st || {});
  ['meta', 'geom', 'material', 'ciezarWlasny', 'stezenieCiagle', 'analiza', 'sgu', 'pozar', 'zmeczenie', 'kruche', 'wykonanie'].forEach(k => { o[k] = Object.assign({}, d[k], (st || {})[k] || {}); });
  o.normy = Object.assign(N.defaultProfile(), (st || {}).normy || {});
  const dp = N.defaultProfile();
  o.normy.zestawy = { 1: Object.assign({}, dp.zestawy[1], ((st || {}).normy || {}).zestawy ? st.normy.zestawy[1] : {}), 2: Object.assign({}, dp.zestawy[2], ((st || {}).normy || {}).zestawy ? st.normy.zestawy[2] : {}) };
  o.normy.ndp1 = Object.assign({}, dp.ndp1, ((st || {}).normy || {}).ndp1 || {});
  o.kruche.z = Object.assign({}, d.kruche.z, ((st || {}).kruche || {}).z || {});
  const nS = (o.geom.przesla || []).length + 1;
  o.podpory = (o.podpory || []).slice(0, nS);
  while (o.podpory.length < nS) o.podpory.push({ typ: 'przegub', ltb: 'widelkowe', ss: 100, c: 0, wezel: { typ: 'brak' } });
  ['obciazenia', 'etapy', 'stezenia', 'podporyTymczasowe'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  if (!o.etapy.length) o.etapy = [{ id: 'E1', nazwa: 'Eksploatacja', typ: 'eksploatacja', opis: '' }];
  o.format = BS.FORMAT;
  return o;
};

J.hash = (st) => U.sha256(U.canon(st));

/* ================================================================ OBLICZENIA */
J.run = function (st0, opt) {
  opt = opt || {};
  const t0 = Date.now();
  const st = J.normalize(st0);
  const out = { errors: [], warnings: [], checks: [], info: [], engine: BS.ENGINE, version: BS.VERSION, hash: J.hash(st0), st };
  const err = (m) => out.errors.push(m), wrn = (m) => out.warnings.push(m);
  // --- profil normowy
  const nrm = N.ocen(st); out.norm = nrm;
  nrm.bledy.forEach(err); nrm.ostrz.forEach(wrn);
  if (nrm.genStosowana !== 1 || !N.SILNIK[nrm.genStosowana]) { err('Silnik nie obsługuje stosowanej generacji – obliczenia przerwane.'); return out; }
  const ndp = Object.assign({}, nrm.ndp); out.ndp = ndp;
  ['gG_sup', 'gG_inf', 'gQ', 'xi', 'gG_sup_equ', 'gG_inf_equ', 'gQ_equ', 'KFI', 'gM0', 'gM1', 'gM2', 'lamLT0', 'betaLT', 'eta', 'gMfi', 'gFf', 'dTR', 'gc', 'acc', 'betaJ'].forEach(k => { ndp[k] = U.num(ndp[k]); });
  // --- przekrój i materiał
  let sec;
  try {
    const g = P.geom(st.przekroj); const ge = P.validate(g); if (ge.length) { ge.forEach(err); return out; }
    sec = P.props(g);
  } catch (e) { err('Przekrój: ' + e.message); return out; }
  out.sec = sec;
  const gat = st.material.gatunek, pod = st.material.podgatunek;
  if (!M.STAL[gat]) { err('Nieznany gatunek stali.'); return out; }
  const tMax = Math.max(sec.tg, sec.td, sec.tw);
  const fyr = M.fy(gat, tMax, ndp.fySrc);
  if (fyr.poza) wrn('Grubość ścianki > 80 mm – poza zakresem tablicy 3.1.');
  const mat = { gatunek: gat, podgatunek: pod, fy: fyr.fy, fu: fyr.fu, zr: fyr.zr, tMax, E: U.E, G: U.G };
  out.mat = mat;
  const base = R.basic(sec, mat, ndp); out.base = base;
  // --- model i analiza
  const md = S.model(st, sec); out.md = md;
  md.err.forEach(err);
  if (out.errors.length) return out;
  let an;
  try { an = S.analyze(md, sec); } catch (e) { err('Analiza statyczna: ' + e.message); return out; }
  out.an = an;
  const gk = K.generate(md, an, ndp, { pozar: !!st.pozar.aktywny });
  gk.warn.forEach(wrn);
  const combos = gk.list; out.combos = combos;
  const finalS = md.nE - 1;
  const ns = an.ns, xs = an.xs;
  const sb = R.shearBuckling(sec, base, ndp, { a: U.num(st.analiza.zebraRozstaw) * 1000, sztywny: !!st.analiza.slupekSztywny });
  out.sb = sb;
  const reg = {}; // najbardziej wytężone wystąpienie każdego sprawdzenia
  const rec = (key, o) => { if (!reg[key] || o.util > reg[key].util) reg[key] = o; };
  const better = (key, u) => !reg[key] || u > reg[key].util;
  const kN = 1e3, kNm = 1e6;
  // --- obwiednie i sprawdzenia przekroju (SGN) w etapach
  const env = md.etapy.map(() => ({ Mmax: new Float64Array(ns).fill(-Infinity), Mmin: new Float64Array(ns).fill(Infinity), Vmax: new Float64Array(ns).fill(-Infinity), Vmin: new Float64Array(ns).fill(Infinity), Mzmax: new Float64Array(ns).fill(-Infinity), Mzmin: new Float64Array(ns).fill(Infinity), wmax: new Float64Array(ns).fill(-Infinity), wmin: new Float64Array(ns).fill(Infinity), Nmax: -Infinity, Nmin: Infinity, R: {}, uSec: new Float64Array(ns), nSGN: 0, nChar: 0 }));
  const ltbCand = md.etapy.map(() => ({}));
  const segsByStage = md.etapy.map((e, s) => T.segments(md, s));
  const ptLoads = []; // siły skupione do sprawdzenia środnika
  md.cases.forEach(c => c.parts.forEach(p => { if (p.typ === 'P' && p.kier === 'z' && !md.systems[c.etap].some(q => Math.abs(q.x - p.x) < 1)) ptLoads.push({ x: p.x, ss: p.ss, case: c.id, etap: c.etap, P: p.P, wys: p.wys }); }));
  const ptRes = {};
  const KEYS = md.etapy.map((e, s) => ({ M: s + '|M', V: s + '|V', Vy: s + '|Vy', N: s + '|N', Vb: s + '|Vb', MV: s + '|MV71' }));
  combos.forEach((c, ci) => {
    const E = K.evaluate(an, c);
    const ev = env[c.etap];
    if (c.typ === 'char') {
      ev.nChar++;
      for (let i = 0; i < ns; i++) { if (E.w[i] > ev.wmax[i]) ev.wmax[i] = E.w[i]; if (E.w[i] < ev.wmin[i]) ev.wmin[i] = E.w[i]; }
      return;
    }
    if (c.typ !== 'SGN') return;
    ev.nSGN++;
    let mp = 0, mn = 0;
    for (let i = 0; i < ns; i++) {
      const m = E.M[i];
      if (m > ev.Mmax[i]) ev.Mmax[i] = m; if (m < ev.Mmin[i]) ev.Mmin[i] = m;
      if (E.V[i] > ev.Vmax[i]) ev.Vmax[i] = E.V[i]; if (E.V[i] < ev.Vmin[i]) ev.Vmin[i] = E.V[i];
      if (E.Mz[i] > ev.Mzmax[i]) ev.Mzmax[i] = E.Mz[i]; if (E.Mz[i] < ev.Mzmin[i]) ev.Mzmin[i] = E.Mz[i];
      if (m > mp) mp = m; if (m < mn) mn = m;
    }
    ev.Nmax = Math.max(ev.Nmax, E.N); ev.Nmin = Math.min(ev.Nmin, E.N);
    Object.keys(E.R).forEach(id => { const r = ev.R[id] || (ev.R[id] = { max: -Infinity, min: Infinity, cmax: null, Mmax: 0, Mmin: 0, Rymax: 0 }); const v = E.R[id].R; if (v > r.max) { r.max = v; r.cmax = ci; } if (v < r.min) { r.min = v; r.cmin = ci; } r.Mmax = Math.max(r.Mmax, Math.abs(E.R[id].M)); r.Rymax = Math.max(r.Rymax, Math.abs(E.R[id].Ry || 0)); });
    const Nc = -E.N;
    const ctx = R.ctx(sec, base, ndp, Nc, mp, mn);
    for (let i = 0; i < ns; i++) {
      const p = R.atPoint(sec, base, ndp, { M: E.M[i], V: E.V[i], Mz: E.Mz[i], Vy: E.Vy[i] }, ctx);
      if (p.u > ev.uSec[i]) ev.uSec[i] = p.u;
      const kp = KEYS[c.etap];
      if (better(kp.M, p.uMN)) rec(kp.M, { util: p.uMN, M: E.M[i], N: E.N, Mz: E.Mz[i], V: E.V[i], p, x: xs[i], combo: c, etap: c.etap });
      if (better(kp.V, p.uV)) rec(kp.V, { util: p.uV, V: E.V[i], M: E.M[i], p, x: xs[i], combo: c, etap: c.etap });
      if (E.Vy[i] !== 0 && better(kp.Vy, p.uVy)) rec(kp.Vy, { util: p.uVy, V: E.Vy[i], p, x: xs[i], combo: c, etap: c.etap });
      if (Math.abs(E.N) > 1 && better(kp.N, p.uN)) rec(kp.N, { util: p.uN, N: E.N, p, x: xs[i], combo: c, etap: c.etap });
      if (sb.need) {
        const ub = Math.abs(E.V[i]) / sb.Vb;
        if (better(kp.Vb, ub)) rec(kp.Vb, { util: ub, V: E.V[i], x: xs[i], combo: c, etap: c.etap });
        const im = R.interMV(base, sb, E.M[i], E.V[i]);
        if (better(kp.MV, im.u)) rec(kp.MV, { util: im.u, im, M: E.M[i], V: E.V[i], x: xs[i], combo: c, etap: c.etap });
      }
    }
    // kandydaci do zwichrzenia: max |M| w segmentach
    const cand = ltbCand[c.etap];
    segsByStage[c.etap].forEach((sg, k) => {
      let a = 0, b = 0;
      for (let i = 0; i < ns; i++) if (xs[i] >= sg.x0 - 1e-6 && xs[i] <= sg.x1 + 1e-6) { if (E.M[i] > a) a = E.M[i]; if (E.M[i] < b) b = E.M[i]; }
      [['p' + k, a], ['n' + k, -b]].forEach(([key, v]) => { if (v > 1 && (!cand[key] || v > cand[key].v)) cand[key] = { v, ci }; });
      if (Math.abs(E.N) > 1 || ctx.Nc > 0) { const key = 'N' + k; const v = Math.max(0, Nc); if (v > 0 && (!cand[key] || v > cand[key].v)) cand[key] = { v, ci }; }
    });
    // siły skupione (docisk środnika)
    ptLoads.forEach((pl, k) => {
      if (pl.etap !== c.etap) return;
      let Fz = 0;
      c.terms.forEach(t => { const r = an.res[c.etap][t.id]; if (!r) return; r.c.parts.forEach(p => { if (p.typ === 'P' && p.kier === 'z' && Math.abs(p.x - pl.x) < 1 && (!t.seg || t.seg.includes(md.segOf(p.x)))) Fz += t.f * p.P; }); });
      if (!ptRes[k] || Fz > ptRes[k].F) ptRes[k] = { F: Fz, M: S.at(xs, E.M, pl.x), combo: c };
    });
  });
  out.env = env;
  // --- rejestr sprawdzeń przekroju
  const stName = (s) => (md.nE > 1 ? ` – etap ${s + 1}` : '');
  const fmtCombo = (c) => (c ? c.opis : '');
  for (let s = 0; s < md.nE; s++) {
    const g = `SGN – nośność przekroju${stName(s)}`;
    const m = reg[`${s}|M`];
    if (m) out.checks.push(BS.check({ id: `${s}-M`, grp: g, etap: s, n: m.p.f === '6.41' ? 'Zginanie dwukierunkowe z siłą osiową' : Math.abs(m.N) > 1 ? 'Zginanie z siłą osiową (M + N)' : 'Zginanie (przekrój kl. ' + m.p.cls + ')', ref: m.p.f === '6.12' ? '6.2.5' : '6.2.9 (' + m.p.f + ')', Ed: Math.abs(m.M), Rd: m.p.MN || m.p.McRd, unit: 'M', util: m.util, x: m.x, combo: fmtCombo(m.combo), d: m }));
    const v = reg[`${s}|V`];
    if (v) out.checks.push(BS.check({ id: `${s}-V`, grp: g, etap: s, n: 'Ścinanie Vz', ref: '6.2.6', Ed: Math.abs(v.V), Rd: base.Vpl, unit: 'F', util: v.util, x: v.x, combo: fmtCombo(v.combo), d: v }));
    const vy = reg[`${s}|Vy`];
    if (vy && vy.util > 1e-6) out.checks.push(BS.check({ id: `${s}-Vy`, grp: g, etap: s, n: 'Ścinanie Vy (pasy)', ref: '6.2.6', Ed: Math.abs(vy.V), Rd: base.Vplz_y, unit: 'F', util: vy.util, x: vy.x, combo: fmtCombo(vy.combo), d: vy }));
    const nn = reg[`${s}|N`];
    if (nn && nn.util > 1e-6) out.checks.push(BS.check({ id: `${s}-N`, grp: g, etap: s, n: nn.N > 0 ? 'Rozciąganie' : 'Ściskanie (nośność przekroju)', ref: nn.N > 0 ? '6.2.3' : '6.2.4', Ed: Math.abs(nn.N), Rd: nn.N > 0 ? base.Npl : base.Nc, unit: 'F', util: nn.util, x: nn.x, combo: fmtCombo(nn.combo), d: nn }));
    if (sb.need) {
      const b = reg[`${s}|Vb`]; if (b) out.checks.push(BS.check({ id: `${s}-Vb`, grp: `PN-EN 1993-1-5 – środnik${stName(s)}`, etap: s, n: 'Wyboczenie przy ścinaniu', ref: 'PN-EN 1993-1-5, 5.2', Ed: Math.abs(b.V), Rd: sb.Vb, unit: 'F', util: b.util, x: b.x, combo: fmtCombo(b.combo), d: b }));
      const i7 = reg[`${s}|MV71`]; if (i7) out.checks.push(BS.check({ id: `${s}-MV`, grp: `PN-EN 1993-1-5 – środnik${stName(s)}`, etap: s, n: 'Interakcja M–V (wyboczenie przy ścinaniu)', ref: 'PN-EN 1993-1-5, 7.1', Ed: i7.util, Rd: 1, unit: '-', util: i7.util, x: i7.x, combo: fmtCombo(i7.combo), d: i7 }));
    }
  }
  if (!sb.need) out.info.push(`Środnik: hw/tw = ${U.fmt(sb.ht, 1)} ≤ ${U.fmt(sb.limit, 1)} – sprawdzenie wyboczenia przy ścinaniu nie jest wymagane (PN-EN 1993-1-5, 5.1(2)).`);
  // --- siły skupione na środnik (poza podporami)
  ptLoads.forEach((pl, k) => {
    const r = ptRes[k]; if (!r || r.F <= 0) return;
    const pr = R.patch(sec, base, ndp, { F: r.F, ss: pl.ss, typ: 'a', pas: pl.wys === 'pas_d' ? 'd' : 'g', a: U.num(st.analiza.zebraRozstaw) * 1000 });
    const e1 = Math.abs(r.M) / (Math.min(sec.Wel_t, sec.Wel_b) * base.fy / ndp.gM0);
    out.checks.push(BS.check({ id: `pt${k}`, grp: `PN-EN 1993-1-5 – środnik${stName(pl.etap)}`, etap: pl.etap, n: `Siła skupiona na środnik (x = ${U.fmt(pl.x / 1000, 2)} m)`, ref: 'PN-EN 1993-1-5, 6.2', Ed: r.F, Rd: pr.FRd, unit: 'F', util: pr.u, x: pl.x, combo: fmtCombo(r.combo), d: pr }));
    out.checks.push(BS.check({ id: `pt${k}i`, grp: `PN-EN 1993-1-5 – środnik${stName(pl.etap)}`, etap: pl.etap, n: `Interakcja F–M (x = ${U.fmt(pl.x / 1000, 2)} m)`, ref: 'PN-EN 1993-1-5, 7.2', Ed: pr.u + 0.8 * e1, Rd: 1.4, unit: '-', util: (pr.u + 0.8 * e1) / 1.4, x: pl.x, combo: fmtCombo(r.combo), d: { eta1: e1, eta2: pr.u } }));
  });
  // --- zwichrzenie i interakcja (każdy etap)
  out.ltb = [];
  for (let s = 0; s < md.nE; s++) {
    const cl = Object.values(ltbCand[s]).sort((a, b) => b.v - a.v);
    const uniq = []; cl.forEach(c => { if (!uniq.includes(c.ci)) uniq.push(c.ci); });
    const cand = uniq.slice(0, opt.fast ? 3 : 6).map(ci => ({ combo: combos[ci], E: K.evaluate(an, combos[ci]) }));
    if (!cand.length) { out.ltb.push(null); continue; }
    const r = T.stage(md, an, sec, base, ndp, s, cand, st.analiza);
    out.ltb.push(r);
    r.runs.forEach(rn => { if (rn.err) err(`Zwichrzenie (etap ${s + 1}): ${rn.err}`); });
    r.segs.forEach((sg, k) => {
      if (sg.brak) return;
      const nm = `Zwichrzenie – segment ${U.fmt(sg.sg.x0 / 1000, 2)}–${U.fmt(sg.sg.x1 / 1000, 2)} m`;
      out.checks.push(BS.check({ id: `${s}-LT${k}`, grp: `SGN – stateczność${stName(s)}`, etap: s, n: nm, ref: sg.ltb.met === '6.3.2.3' ? '6.3.2.1, 6.3.2.3' : '6.3.2.1, 6.3.2.2', Ed: sg.sh.mabs, Rd: sg.Mb, unit: 'M', util: sg.u, x: sg.sh.xmax, combo: fmtCombo(sg.combo), d: sg }));
    });
    r.inter.forEach((it, k) => {
      out.checks.push(BS.check({ id: `${s}-I${k}`, grp: `SGN – stateczność${stName(s)}`, etap: s, n: `Interakcja N–My–Mz – segment ${U.fmt(it.sg.x0 / 1000, 2)}–${U.fmt(it.sg.x1 / 1000, 2)} m`, ref: '6.3.3 (6.61), (6.62), zał. B', Ed: it.u, Rd: 1, unit: '-', util: it.u, x: (it.sg.x0 + it.sg.x1) / 2, combo: fmtCombo(it.combo), d: it }));
    });
  }
  // --- SGU: ugięcia (etap końcowy) i drgania
  out.sgu = J.sgu(st, md, an, combos, sec, base, ndp);
  out.sgu.checks.forEach(c => out.checks.push(c));
  // --- podpory, połączenia, EQU
  out.podpory = J.supports(st, md, an, combos, sec, base, mat, ndp, env, out);
  // --- pożar
  if (st.pozar.aktywny) {
    try { out.pozar = J.fire(st, md, an, combos, sec, base, ndp); out.pozar.checks.forEach(c => out.checks.push(c)); } catch (e) { err('Pożar: ' + e.message); }
  }
  // --- zmęczenie
  if (st.zmeczenie.aktywny) {
    try { out.zm = J.fatigue(st, md, an, sec, base, ndp); out.zm.checks.forEach(c => out.checks.push(c)); } catch (e) { err('Zmęczenie: ' + e.message); }
  }
  // --- kruche pękanie
  try { out.kr = J.brittle(st, md, an, combos, sec, base, mat, ndp, out); out.kr.checks.forEach(c => out.checks.push(c)); } catch (e) { err('Kruche pękanie: ' + e.message); }
  // --- klasa wykonania
  out.exc = X.exc(st.wykonanie, {
    zmeczenie: !!st.zmeczenie.aktywny, spawana: sec.typ === 'spaw', fy: mat.fy, gatunek: gat, podgatunek: pod,
    pozar: st.pozar.aktywny && out.pozar ? (out.pozar.prot ? `${st.pozar.ochrona === 'plyty' ? 'obudowa płytowa' : 'powłoka/natrysk'}: λp = ${st.pozar.lp} W/(m·K), dp = ${st.pozar.dp} mm (produkt z oceną właściwości użytkowych dla Ap/V = ${U.fmt(out.pozar.sf.ApV, 0)} m⁻¹, θcr = ${U.fmt(out.pozar.thcr, 0)} °C, R${st.pozar.R})` : `bez zabezpieczenia: θcr = ${U.fmt(out.pozar.thcr, 0)} °C`) : null,
    podniesienie: out.sgu && out.sgu.wcMax > 0.5 ? `strzałka podniesienia wykonawczego wc = ${U.fmt(out.sgu.wcMax, 0)} mm (kształt wg ugięcia od G)` : null,
    etapy: md.nE > 1 ? md.etapy.map((e, i) => `etap ${i + 1}: ${e.nazwa}`).join('; ') + (md.tmp.length ? `; podpory montażowe: ${md.tmp.map(t => `${t.id} (x = ${U.fmt(t.x / 1000, 2)} m, usunąć po etapie ${t.do + 1})`).join(', ')}` : '') + (md.stez.length ? `; stężenia: ${md.stez.map(z => `x = ${U.fmt(z.x / 1000, 2)} m od etapu ${z.od + 1}`).join(', ')}` : '') : null
  });
  // --- podsumowanie
  const chk = out.checks.filter(c => !c.info);
  out.nFail = chk.filter(c => c.status === 'fail').length;
  out.nWarn = chk.filter(c => c.status === 'warn').length;
  out.uMax = chk.reduce((m, c) => (c.util !== null && isFinite(c.util) && c.util > m ? c.util : m), 0);
  out.gov = chk.reduce((g, c) => (!g || (c.util || 0) > (g.util || 0) ? c : g), null);
  out.time = Date.now() - t0;
  return out;
};

/* ---------------------------------------------------------- SGU */
J.sgu = function (st, md, an, combos, sec, base, ndp) {
  const o = st.sgu, out = { checks: [], seg: [], wc: null, wcMax: 0 };
  const s = md.nE - 1, xs = an.xs, ns = an.ns;
  const R = an.res[s];
  // ugięcie od G (charakterystyczne, z historią etapów)
  const wG = new Float64Array(ns);
  Object.keys(R).forEach(k => { if (S.RODZAJE[R[k].c.rodzaj].stale) for (let i = 0; i < ns; i++) wG[i] += R[k].tot.w[i]; });
  out.wG = wG;
  let wc = new Float64Array(ns);
  if (o.podniesienie === 'auto') wc = Float64Array.from(wG);
  else if (o.podniesienie === 'wartosc' && U.num(o.wc) > 0) { const m = Math.max(...wG); if (m > 0) for (let i = 0; i < ns; i++) wc[i] = wG[i] / m * U.num(o.wc); }
  out.wc = wc; out.wcMax = Math.max(0, ...wc);
  const chars = combos.filter(c => c.typ === 'char' && c.etap === s);
  const lim = { wmax: U.num(o.wmax, 250), w3: U.num(o.w3, 350) };
  const rel = (arr, sg) => {
    const a = S.at(xs, arr, sg.x0), b = S.at(xs, arr, sg.x1); let mx = -Infinity, mn = Infinity, xm = sg.x0;
    for (let i = 0; i < ns; i++) { const x = xs[i]; if (x < sg.x0 - 1e-6 || x > sg.x1 + 1e-6) continue; let r; if (sg.wsp) r = arr[i] - (sg.x0 === 0 ? b : a); else r = arr[i] - (a + (b - a) * (x - sg.x0) / (sg.x1 - sg.x0)); if (r > mx) { mx = r; xm = x; } if (r < mn) mn = r; }
    return { mx, mn, xm };
  };
  out.envTot = new Float64Array(ns).fill(-Infinity); out.envVar = new Float64Array(ns).fill(-Infinity);
  md.seg.forEach(sg => {
    const Lref = sg.wsp ? 2 * (sg.x1 - sg.x0) : sg.x1 - sg.x0;
    let best = { v: -Infinity }, best3 = { v: -Infinity }, up = { v: Infinity };
    chars.forEach(c => {
      const E = K.evaluate(an, c);
      const wn = new Float64Array(ns); for (let i = 0; i < ns; i++) wn[i] = E.w[i] - wc[i];
      const cv = Object.assign({}, c, { terms: c.terms.filter(t => !S.RODZAJE[R[t.id].c.rodzaj].stale) });
      const Ev = K.evaluate(an, cv);
      for (let i = 0; i < ns; i++) { if (wn[i] > out.envTot[i]) out.envTot[i] = wn[i]; if (Ev.w[i] > out.envVar[i]) out.envVar[i] = Ev.w[i]; }
      const r1 = rel(wn, sg), r3 = rel(Ev.w, sg);
      if (r1.mx > best.v) best = { v: r1.mx, x: r1.xm, c };
      if (r1.mn < up.v) up = { v: r1.mn, c };
      if (r3.mx > best3.v) best3 = { v: r3.mx, x: r3.xm, c };
    });
    if (!chars.length) return;
    const rec = { sg, Lref, wmax: best.v, xw: best.x, w3: best3.v, x3: best3.x, wup: up.v, limMax: Lref / lim.wmax, lim3: Lref / lim.w3, cmax: best.c, c3: best3.c };
    out.seg.push(rec);
    out.checks.push(BS.check({ id: 'w-' + sg.id, grp: 'SGU – ugięcia (eksploatacja)', etap: s, n: `Ugięcie wmax – ${sg.n}${o.podniesienie !== 'brak' ? ' (po odjęciu podniesienia wc)' : ''}`, ref: 'PN-EN 1990 A1.4.3; PN-EN 1993-1-1 7.2.1', Ed: Math.max(0, rec.wmax), Rd: rec.limMax, unit: 'mm', util: Math.max(0, rec.wmax) / rec.limMax, x: rec.xw, combo: best.c ? best.c.opis : '', d: rec, lim: `${sg.wsp ? '2·' : ''}L/${lim.wmax}` }));
    out.checks.push(BS.check({ id: 'w3-' + sg.id, grp: 'SGU – ugięcia (eksploatacja)', etap: s, n: `Ugięcie od obciążeń zmiennych w3 – ${sg.n}`, ref: 'PN-EN 1990 A1.4.3', Ed: Math.max(0, rec.w3), Rd: rec.lim3, unit: 'mm', util: Math.max(0, rec.w3) / rec.lim3, x: rec.x3, combo: best3.c ? best3.c.opis : '', d: rec, lim: `${sg.wsp ? '2·' : ''}L/${lim.w3}` }));
  });
  // ugięcia w etapach montażu (informacyjnie)
  out.montaz = [];
  for (let e = 0; e < md.nE - 1; e++) {
    let mx = 0, xm = 0;
    combos.filter(c => c.typ === 'char' && c.etap === e).forEach(c => { const E = K.evaluate(an, c); for (let i = 0; i < ns; i++) if (E.w[i] > mx) { mx = E.w[i]; xm = xs[i]; } });
    out.montaz.push({ etap: e, w: mx, x: xm });
    out.checks.push(BS.check({ id: 'wm' + e, grp: 'SGU – ugięcia (eksploatacja)', etap: e, n: `Ugięcie w etapie ${e + 1} (${md.etapy[e].nazwa}) – informacyjnie`, ref: 'PN-EN 1991-1-6', Ed: mx, Rd: null, unit: 'mm', util: null, info: true, x: xm, combo: '' }));
  }
  // przemieszczenia poziome (gdy są obciążenia poziome)
  const hasY = md.cases.some(c => c.parts.some(p => p.kier === 'y'));
  if (hasY) {
    let umax = 0, xu = 0, cu = null;
    chars.forEach(c => { const E = K.evaluate(an, c); for (let i = 0; i < ns; i++) if (Math.abs(E.u[i]) > umax) { umax = Math.abs(E.u[i]); xu = xs[i]; cu = c; } });
    const Lm = Math.max(...md.seg.map(g => g.x1 - g.x0));
    out.checks.push(BS.check({ id: 'u', grp: 'SGU – ugięcia (eksploatacja)', n: 'Przemieszczenie poziome u', ref: 'PN-EN 1990 A1.4.3', Ed: umax, Rd: Lm / U.num(o.uLim, 200), unit: 'mm', util: umax / (Lm / U.num(o.uLim, 200)), x: xu, combo: cu ? cu.opis : '', lim: `L/${o.uLim}` }));
  }
  // drgania – masa: G + ψ2·Q (etap końcowy)
  if (o.drgania !== false) {
    const mass = [], pm = [];
    Object.keys(R).forEach(k => {
      const c = R[k].c; let f = 0;
      if (S.RODZAJE[c.rodzaj].stale) f = 1; else if (c.rodzaj !== 'A' && c.etap === s) f = K.psi(c)[2];
      if (f <= 0) return;
      c.parts.forEach(p => {
        if (p.kier !== 'z') return;
        if (p.typ === 'q') {
          // podział na odcinki stałej intensywności (średnia na elemencie siatki)
          const n = 8; for (let j = 0; j < n; j++) { const a = p.x0 + (p.x1 - p.x0) * j / n, b = p.x0 + (p.x1 - p.x0) * (j + 1) / n, q = p.q0 + (p.q1 - p.q0) * (j + 0.5) / n; mass.push({ x0: a, x1: b, m: Math.max(0, f * q) / 9810 }); }
        } else if (p.typ === 'P') pm.push({ x: p.x, m: Math.max(0, f * p.P) / 9810 });
      });
    });
    try {
      const fr = F.freq({ xs: md.xs, EI: U.E * sec.Iy, mass, pm, supports: md.systems[s].map(p => ({ x: p.x, kv: p.kv, kr: p.kr })) });
      out.f1 = fr.f; out.mode = fr.shape;
      out.checks.push(BS.check({ id: 'f1', grp: 'SGU – drgania', n: 'Częstotliwość drgań własnych f1 (masa G + ψ2·Q)', ref: 'PN-EN 1990 A1.4.4; PN-EN 1993-1-1 7.2.3', Ed: fr.f, Rd: U.num(o.fmin, 3), unit: 'Hz', util: U.num(o.fmin, 3) / fr.f, combo: 'G + Σψ2·Q', d: fr, inverse: true }));
    } catch (e) { out.checks.push(BS.check({ id: 'f1', grp: 'SGU – drgania', n: 'Częstotliwość drgań własnych', ref: 'A1.4.4', util: null, info: true, Ed: null, Rd: null, unit: 'Hz', combo: e.message })); }
  }
  return out;
};

/* ---------------------------------------------------------- podpory i połączenia */
J.supports = function (st, md, an, combos, sec, base, mat, ndp, env, out) {
  const res = [];
  const equ = K.equ(md, an, ndp); out.equ = equ;
  const s = md.nE - 1;
  const allSup = md.sup.map(p => ({ p, etapy: md.etapy.map((e, i) => i) })).concat(md.tmp.map(t => ({ p: t, etapy: md.etapy.map((e, i) => i).filter(i => i <= t.do) })));
  allSup.forEach(({ p, etapy }) => {
    const r = { id: p.id, x: p.x, typ: p.typ, tymcz: p.tymcz, wezel: p.wezel, etapy: [], checks: [] };
    let Rmax = 0, Mmax = 0, cMax = null, eMax = 0;
    etapy.forEach(e => { const q = env[e].R[p.id]; if (q) { r.etapy.push({ e, max: q.max, min: q.min, M: q.Mmax, Ry: q.Rymax }); if (Math.abs(q.max) > Rmax) { Rmax = Math.abs(q.max); cMax = q.cmax; eMax = e; } if (q.Mmax > Mmax) Mmax = q.Mmax; } });
    r.Rmax = Rmax; r.Mmax = Mmax; r.etapMax = eMax;
    // reakcje charakterystyczne od przypadków (etap końcowy lub ostatni etap istnienia)
    const eK = Math.max(...etapy);
    r.Rk = Object.keys(an.res[eK]).map(k => ({ id: k, nazwa: an.res[eK][k].c.nazwa, rodzaj: an.res[eK][k].c.rodzaj, R: an.res[eK][k].tot.R[p.id] ? an.res[eK][k].tot.R[p.id].R : 0, M: an.res[eK][k].tot.R[p.id] ? an.res[eK][k].tot.R[p.id].M : 0 }));
    r.eK = eK;
    const q = equ.filter(z => z.id === p.id);
    r.equ = q;
    const grp = `Podpory i połączenia – podpora ${p.id}`;
    const Rmin = Math.min(...q.map(z => z.Rmin));
    if (Rmin < 0) {
      const anch = p.wezel && ['blacha_czolowa', 'blacha_zebrowa'].includes(p.wezel.typ);
      r.checks.push(BS.check({ id: `${p.id}-EQU`, grp, n: 'Odrywanie podpory (EQU) – wymagane zakotwienie', ref: 'PN-EN 1990 6.4.3.1, tabl. A1.2(A)', Ed: -Rmin, Rd: null, unit: 'F', util: null, forceStatus: anch ? 'warn' : 'fail', info: false, x: p.x, combo: 'EQU: 1,10/0,90·G + 1,5·Q', note: anch ? 'Siłę odrywającą musi przenieść połączenie (sprawdź śruby na rozciąganie).' : 'Oparcie bez zakotwienia – zaprojektuj kotwienie na siłę odrywającą.' }));
    }
    const isEnd = !p.tymcz && ((p.idx === 0 && md.wL === 0) || (p.idx === md.sup.length - 1 && md.wP === 0));
    const w = p.wezel || { typ: 'brak' };
    const conn = ['blacha_czolowa', 'blacha_zebrowa'].includes(w.typ);
    // docisk środnika / żebro
    if (!conn && Rmax > 0) {
      if (w.zebro) {
        const sr = R.stiffener(sec, base, ndp, { F: Rmax, bs: U.num(w.bs, 80), ts: U.num(w.ts, 10), ch: U.num(w.ch, 15), koniec: isEnd, e: U.num(p.src && p.src.c, 0) + U.num(p.ss) / 2 });
        r.zebro = sr;
        r.checks.push(BS.check({ id: `${p.id}-ZB`, grp, n: 'Żebro podporowe – wyboczenie (przekrój krzyżowy z 15εtw)', ref: 'PN-EN 1993-1-5 9.4; PN-EN 1993-1-1 6.3.1', Ed: Rmax, Rd: sr.NbRd, unit: 'F', util: sr.uB, x: p.x, combo: cMax !== null ? combos[cMax].opis : '', d: sr }));
        r.checks.push(BS.check({ id: `${p.id}-ZD`, grp, n: 'Żebro podporowe – docisk końców żeber', ref: 'PN-EN 1993-1-1 6.2.4', Ed: Rmax, Rd: sr.Fbear, unit: 'F', util: sr.uC, x: p.x, combo: '', d: sr }));
        if (sr.ctS > sr.ctLim) r.checks.push(BS.check({ id: `${p.id}-ZC`, grp, n: 'Żebro – smukłość ścianki bs/ts', ref: 'PN-EN 1993-1-5 9.2.1(8)', Ed: sr.ctS, Rd: sr.ctLim, unit: '-', util: sr.ctS / sr.ctLim, d: sr }));
      } else {
        const pr = R.patch(sec, base, ndp, { F: Rmax, ss: U.num(p.ss, 0), typ: isEnd ? 'c' : 'a', c: U.num(p.src && p.src.c, 0), pas: 'd', a: U.num(st.analiza.zebraRozstaw) * 1000 });
        r.patch = pr;
        r.checks.push(BS.check({ id: `${p.id}-PL`, grp, n: `Docisk środnika nad podporą (typ ${isEnd ? 'c' : 'a'})`, ref: 'PN-EN 1993-1-5 6.2–6.5', Ed: Rmax, Rd: pr.FRd, unit: 'F', util: pr.u, x: p.x, combo: cMax !== null ? combos[cMax].opis : '', d: pr }));
        if (!isEnd && Mmax > 0) {
          const e1 = Mmax / (Math.min(sec.Wel_t, sec.Wel_b) * base.fy / ndp.gM0);
          r.checks.push(BS.check({ id: `${p.id}-PI`, grp, n: 'Interakcja F–M nad podporą', ref: 'PN-EN 1993-1-5 7.2', Ed: pr.u + 0.8 * e1, Rd: 1.4, unit: '-', util: (pr.u + 0.8 * e1) / 1.4, x: p.x, combo: '', d: { eta1: e1, eta2: pr.u } }));
        }
      }
    }
    if (w.typ === 'oparcie' && w.podloze !== 'stal' && Rmax > 0) {
      const bp = C.bearingPlate(sec, mat, ndp, { podloze: w.podloze, bp: U.num(w.bp), lp: U.num(w.lp), tp: U.num(w.tp), beton: w.beton, alfa: w.alfa, fd: w.fd, beta: w.beta, lb: U.num(w.lb, U.num(w.lp)) }, Rmax);
      r.plyta = bp;
      bp.checks.forEach((c, k) => r.checks.push(BS.check({ id: `${p.id}-B${k}`, grp, n: c.n, ref: c.ref, Ed: c.Ed, Rd: c.Rd, unit: 'F', util: c.u, x: p.x, combo: cMax !== null ? combos[cMax].opis : '', d: c, f: c.f })));
      bp.uwagi.forEach(u => out.warnings.push(`Podpora ${p.id}: ${u}`));
    }
    if (conn && Rmax > 0) {
      const wv = Object.assign({}, w);
      ['hp', 'bp', 'tp', 'nr', 'n', 'e1', 'p1', 'e2', 'p3', 'a', 'tsup', 'fusup', 'z', 'e2b'].forEach(k => { if (wv[k] !== undefined) wv[k] = U.num(wv[k]); });
      let cr;
      try { cr = w.typ === 'blacha_czolowa' ? C.endPlate(sec, mat, ndp, wv, Rmax) : C.finPlate(sec, mat, ndp, wv, Rmax); } catch (e) { out.errors.push(`Połączenie ${p.id}: ${e.message}`); cr = null; }
      if (cr) {
        r.pol = cr;
        cr.checks.forEach((c, k) => r.checks.push(BS.check({ id: `${p.id}-C${k}`, grp, n: c.n, ref: c.ref, Ed: c.Ed, Rd: c.Rd, unit: c.Rd === 1 ? '-' : (c.n.indexOf('V·z') >= 0 && c.n.indexOf('Spoiny') < 0 ? 'M' : c.n.indexOf('Spoiny blachy do podpory') >= 0 ? 'q' : 'F'), util: c.u, x: p.x, combo: cMax !== null ? combos[cMax].opis : '', d: c, f: c.f })));
        cr.detal.filter(d => !d.ok).forEach(d => r.checks.push(BS.check({ id: `${p.id}-D${d.n}`, grp, n: `Rozmieszczenie łączników: ${d.n}`, ref: 'PN-EN 1993-1-8 tabl. 3.3', Ed: d.v, Rd: d.lim, unit: 'mm', util: d.lim / Math.max(d.v, 1e-9), inverse: true })));
        cr.uwagi.forEach(u => out.warnings.push(`Połączenie ${p.id}: ${u}`));
      }
    }
    r.checks.forEach(c => out.checks.push(c));
    res.push(r);
  });
  return res;
};

/* ---------------------------------------------------------- pożar */
J.fire = function (st, md, an, combos, sec, base, ndp) {
  const s = md.nE - 1, xs = an.xs;
  const fc = combos.filter(c => c.typ === 'poz' && c.etap === s);
  let gov = null;
  const intSup = md.sup.filter(p => !((p.idx === 0 && md.wL === 0) || (p.idx === md.sup.length - 1 && md.wP === 0)));
  fc.forEach(c => {
    const E = K.evaluate(an, c);
    for (let i = 0; i < xs.length; i++) {
      const atSup = intSup.some(p => Math.abs(p.x - xs[i]) < 1);
      const sc = Math.abs(E.M[i]) / (atSup ? 0.85 : 1);
      if (!gov || sc > gov.sc) gov = { sc, M: E.M[i], V: Math.max(...Array.from(E.V).map(Math.abs)), x: xs[i], c, E, atSup };
    }
  });
  if (!gov) return { checks: [] };
  let Mcr = Infinity;
  try { const r = T.mcrRun(md, an, sec, U.E, U.G, gov.c, gov.E.M); let mm = 0; for (let i = 0; i < xs.length; i++) mm = Math.max(mm, Math.abs(gov.E.M[i])); Mcr = r.lam * mm; } catch (e) { /* bez zwichrzenia */ }
  let Mlt = 0; for (let i = 0; i < xs.length; i++) Mlt = Math.max(Mlt, Math.abs(gov.E.M[i]));
  const Efi = { M: gov.M, V: gov.V, Mpos: gov.M >= 0, przyPodporze: gov.atSup, Mcr, Mlt };
  const r = X.fire(sec, base, ndp, st.pozar, Efi);
  r.Efi = Efi; r.combo = gov.c;
  r.checks = [
    BS.check({ id: 'fi-t', grp: 'Pożar – PN-EN 1993-1-2', n: `Odporność ogniowa R${r.Rreq}: czas osiągnięcia θa,cr`, ref: '4.2.3, 4.2.5', Ed: r.Rreq, Rd: r.tcr === null ? Infinity : r.tcr, unit: 'min', util: r.tcr === null ? 0 : r.Rreq / r.tcr, combo: gov.c.opis, d: r }),
    BS.check({ id: 'fi-u', grp: 'Pożar – PN-EN 1993-1-2', n: `Wytężenie w ${r.Rreq}. minucie (θa = ${U.fmt(r.thR, 0)} °C)`, ref: '4.2.3.3, 4.2.3.4', Ed: r.uR, Rd: 1, unit: '-', util: r.uR, x: gov.x, combo: gov.c.opis, d: r })
  ];
  return r;
};

/* ---------------------------------------------------------- zmęczenie */
J.fatigue = function (st, md, an, sec, base, ndp) {
  const o = st.zmeczenie, s = md.nE - 1, xs = an.xs, ns = an.ns;
  const ids = (o.przypadki || []).filter(k => an.res[s][k]);
  const out = { checks: [], ids };
  if (!ids.length) { out.checks.push(BS.check({ id: 'fat0', grp: 'Zmęczenie – PN-EN 1993-1-9', n: 'Nie wskazano przypadków obciążenia cyklicznego', ref: '', util: null, info: true, unit: '-' })); return out; }
  const dM = new Float64Array(ns), dV = new Float64Array(ns);
  const k = U.num(o.phi, 1) * (o.zmiennyZnak ? 2 : 1);
  ids.forEach(id => { const r = an.res[s][id].tot; for (let i = 0; i < ns; i++) { dM[i] += k * r.M[i]; dV[i] += k * r.V[i]; } });
  const gMf = X.gMf(o.ocena, o.skutki), gFf = ndp.gFf, n = U.num(o.n, 2e6);
  out.gMf = gMf; out.n = n;
  const zw = (m) => { // odległość włókna od osi obojętnej
    switch (m) { case 'pas_g': return sec.h - sec.zc; case 'spoina_g': return sec.h - sec.tg - sec.zc; case 'spoina_d': return sec.zc - sec.td; default: return sec.zc; }
  };
  out.det = (o.detale || []).map((d, j) => {
    const cat = X.DETALE.find(q => q.k === d.k) || X.DETALE[0];
    const dc = d.k === 'user' ? U.num(d.dc, 71) : cat.dc;
    let ds = 0, xm = 0;
    for (let i = 0; i < ns; i++) { const v = Math.abs(dM[i]) * zw(d.miejsce) / sec.Iy; if (v > ds) { ds = v; xm = xs[i]; } }
    const dsd = gFf * ds, dcd = dc / gMf;
    const Nf = X.Nsigma(dsd, dcd), D = n / Nf;
    const dsE2 = dsd * Math.pow(Math.max(D, 0) * Nf / 2e6, 1 / 3) || 0;
    const r = { cat, dc, ds, x: xm, dsd, dcd, Nf, D, miejsce: d.miejsce };
    out.checks.push(BS.check({ id: 'fat' + j, grp: 'Zmęczenie – PN-EN 1993-1-9', n: `Δσ – ${cat.n.split(' – ')[1] || cat.n} (${d.miejsce})`, ref: '8(2), 7.1, rys. 7.1; Palmgren–Miner', Ed: D, Rd: 1, unit: '-', util: D, x: xm, combo: `Δσ = ${U.fmt(ds, 1)} MPa, n = ${U.fmt(n, 0)}`, d: r }));
    out.checks.push(BS.check({ id: 'fatL' + j, grp: 'Zmęczenie – PN-EN 1993-1-9', n: 'Ograniczenie zakresu naprężeń Δσ ≤ 1,5·fy', ref: '8(1)', Ed: ds, Rd: 1.5 * base.fy, unit: 'MPa', util: ds / (1.5 * base.fy), x: xm }));
    return r;
  });
  let dt = 0, xt = 0;
  for (let i = 0; i < ns; i++) { const v = Math.abs(dV[i]) / (sec.hw * sec.tw); if (v > dt) { dt = v; xt = xs[i]; } }
  const dtc = U.num(o.dtc, 100), Nt = X.Ntau(gFf * dt, dtc / gMf), Dt = n / Nt;
  out.tau = { dt, x: xt, dtc, Nt, D: Dt };
  out.checks.push(BS.check({ id: 'fatT', grp: 'Zmęczenie – PN-EN 1993-1-9', n: 'Δτ – środnik (materiał rodzimy)', ref: '8(2), rys. 7.2', Ed: Dt, Rd: 1, unit: '-', util: Dt, x: xt, combo: `Δτ = ${U.fmt(dt, 1)} MPa`, d: out.tau }));
  return out;
};

/* ---------------------------------------------------------- kruche pękanie */
J.brittle = function (st, md, an, combos, sec, base, mat, ndp, outAll) {
  const o = st.kruche, s = md.nE - 1, xs = an.xs;
  const TEd = U.num(o.Tmd, -30) + U.num(o.dTr) + U.num(ndp.dTR) + U.num(o.dTeps) + U.num(o.dTcf);
  const out = { TEd, checks: [], el: [] };
  let sT = 0, sB = 0, sW = 0;
  combos.filter(c => c.typ === 'kruche' && c.etap === s).forEach(c => {
    const E = K.evaluate(an, c);
    const nT = Math.max(0, E.N) / sec.A;
    for (let i = 0; i < xs.length; i++) {
      const m = E.M[i];
      if (m < 0) sT = Math.max(sT, -m / sec.Wel_t + nT); else sB = Math.max(sB, m / sec.Wel_b + nT);
      sW = Math.max(sW, Math.abs(m) * Math.max(sec.h - sec.tg - sec.zc, sec.zc - sec.td) / sec.Iy + nT);
    }
  });
  const els = [{ n: 'pas górny', t: sec.tg, s: sT }, { n: 'pas dolny', t: sec.td, s: sB }, { n: 'środnik', t: sec.tw, s: sW }];
  (outAll.podpory || []).forEach(p => {
    const w = p.wezel || {};
    if (['blacha_czolowa', 'blacha_zebrowa'].includes(w.typ) && U.num(w.tp) > 0) els.push({ n: `blacha połączenia ${p.id}`, t: U.num(w.tp), s: null });
    if (w.zebro && U.num(w.ts) > 0) els.push({ n: `żebro podporowe ${p.id}`, t: U.num(w.ts), s: null });
    if (w.typ === 'oparcie' && U.num(w.tp) > 0 && w.podloze !== 'stal') els.push({ n: `płyta podporowa ${p.id}`, t: U.num(w.tp), s: null });
  });
  els.forEach((e, j) => {
    const fyt = M.fy(mat.gatunek, e.t, ndp.fySrc).fy - 0.25 * e.t;
    const ratio = e.s === null ? U.num(o.plyty, 0.75) : e.s / fyt;
    const r = X.tmax(mat.gatunek, mat.podgatunek, TEd, ratio);
    Object.assign(e, { fyt, ratio, r });
    out.el.push(e);
    if (r.err) { out.checks.push(BS.check({ id: 'kr' + j, grp: 'Kruche pękanie – PN-EN 1993-1-10', n: `Grubość – ${e.n}`, ref: '2.3, tabl. 2.1', util: null, forceStatus: 'fail', Ed: e.t, Rd: null, unit: 'mm', combo: r.err })); return; }
    out.checks.push(BS.check({ id: 'kr' + j, grp: 'Kruche pękanie – PN-EN 1993-1-10', n: `Grubość ${e.n} t = ${U.fmt(e.t, 1)} mm (${mat.gatunek}${mat.podgatunek}, TEd = ${U.fmt(TEd, 0)} °C, σEd = ${U.fmt(ratio, 2)}·fy(t))`, ref: '2.2, 2.3, tabl. 2.1', Ed: e.t, Rd: r.t, unit: 'mm', util: e.t / r.t, combo: e.s === null ? `σEd przyjęto ${U.fmt(ratio, 2)}·fy(t)` : 'G + ψ1·Q1 + Σψ2·Qi', d: e, forceStatus: r.over ? 'warn' : undefined }));
  });
  if (o.z && o.z.aktywny) {
    const z = { Za: X.Za(U.num(o.z.a)), Zb: U.num(o.z.Zb), Zc: X.Zc(U.num(o.z.s)), Zd: U.num(o.z.Zd), Ze: U.num(o.z.Ze) };
    const zc = X.zClass(z);
    out.z = Object.assign(z, zc);
    out.checks.push(BS.check({ id: 'krZ', grp: 'Kruche pękanie – PN-EN 1993-1-10', n: `Właściwości w kierunku grubości: ZEd = ${zc.ZEd} → ${zc.cls}`, ref: 'rozdz. 3, tabl. 3.1, 3.2', util: null, info: true, Ed: zc.ZEd, Rd: null, unit: '-', combo: `Za = ${z.Za}, Zb = ${z.Zb}, Zc = ${z.Zc}, Zd = ${z.Zd}, Ze = ${z.Ze}` }));
  }
  return out;
};

/* ---------------------------------------------------------- dobór kształtownika */
J.SERIE_DOBOR = ['IPE', 'HEA', 'HEB', 'HEM'];
J.candidates = function (series) {
  const list = [];
  (series || J.SERIE_DOBOR).forEach(sr => P.lista(sr).forEach(nr => { const p = P.props({ typ: 'walc', seria: sr, nr }); list.push({ seria: sr, nr, masa: p.masa, h: p.h }); }));
  return list.sort((a, b) => a.masa - b.masa);
};
J.passes = (r, lim) => !r.errors.length && r.checks.filter(c => !c.info).every(c => c.status !== 'fail' && (c.util === null || !isFinite(c.util) || c.util <= lim + 1e-9));

})(typeof globalThis !== 'undefined' ? globalThis : this);
