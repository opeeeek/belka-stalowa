/* =====================================================================
   BelkaStal – projekt: stan domyślny, walidacja i pełny przebieg obliczeń
   (profil normowy → model → analiza etapów → kombinacje → sprawdzenia
   SGN/SGU/stateczność/podpory/połączenia/pożar/zmęczenie/kruche pękanie
   → klasa wykonania), suma kontrolna danych wejściowych.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, N = BS.N, M = BS.M, P = BS.P, S = BS.S, K = BS.K, R = BS.R, T = BS.T, C = BS.C, X = BS.X, F = BS.FE, W = BS.W;
const J = BS.J = {};

J.defaultState = function () {
  return {
    format: BS.FORMAT,
    meta: { nazwa: 'Belka B-1', obiekt: 'Budynek biurowy – strop nad parterem', projektant: '', sprawdzajacy: '', nrUprawnien: '', data: '', opis: 'Belka stropowa jednoprzęsłowa; płyty stropowe układane w etapie montażu, stężenie montażowe w środku rozpiętości; w eksploatacji pas górny stężony płytą.' },
    normy: N.defaultProfile(),
    geom: { przesla: [6.0], wspL: 0, wspP: 0 },
    podpory: [
      { typ: 'przegub', ltb: 'widelkowe', ss: 0, c: 0, wezel: { typ: 'blacha_czolowa', hp: 200, bp: 150, tp: 10, nr: 2, d: 'M20', kl: '8.8', e1: 40, p1: 120, e2: 30, p3: 90, a: 5, gatP: 'S235', sup: 'pas_slupa', tsup: 12, supGat: 'S355', gwint: true, otw: 'normalne', Nt: 0 } },
      { typ: 'przegub', ltb: 'widelkowe', ss: 150, c: 50, wezel: { typ: 'oparcie', podloze: 'beton', bp: 200, lp: 150, tp: 15, beton: 'C25/30', alfa: 1.5, lb: 150, zebro: false, bs: 70, ts: 10, ch: '' } }
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
    analiza: { muY: 1.0, muZ: 1.0, zebraRozstaw: 0, zebraBs: '', zebraTs: '', zebraPodpory: true, slupekSztywny: false, zebraWc: '' },
    zebraSrodnika: [],
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
  ['obciazenia', 'etapy', 'stezenia', 'podporyTymczasowe', 'styki', 'zebraSrodnika'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  if (!o.etapy.length) o.etapy = [{ id: 'E1', nazwa: 'Eksploatacja', typ: 'eksploatacja', opis: '' }];
  if (/^c[234]$/.test(o.schemat)) o.schemat = 'ciagla';
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
  nrm.bledy.forEach(err);   // ostrzeżenia dotyczące weryfikacji profilu – tylko w raporcie (sekcja Podstawa normowa)
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
  const tMax = sec.tMax;
  const fyr = M.fy(gat, tMax, ndp.fySrc);
  if (fyr.poza) wrn('Grubość ścianki > 80 mm – poza zakresem tablicy 3.1.');
  const mat = { gatunek: gat, podgatunek: pod, fy: fyr.fy, fu: fyr.fu, zr: fyr.zr, tMax, E: U.E, G: U.G };
  out.mat = mat;
  let base;
  try { base = R.basic(sec, mat, ndp); } catch (e) { err('Przekrój: ' + e.message); return out; }
  out.base = base;
  // --- model i analiza
  const md = S.model(st, sec); out.md = md;
  md.err.forEach(err);
  if (out.errors.length) return out;
  let an;
  try { an = S.analyze(md, sec); } catch (e) { err('Analiza statyczna: ' + e.message); return out; }
  out.an = an;
  if (base.effNerr && md.cases.some(c => c.Nn < 0)) err('Przekrój: ' + base.effNerr + ' (występuje siła ściskająca).');
  const gk = K.generate(md, an, ndp, { pozar: !!st.pozar.aktywny });
  gk.warn.forEach(wrn);
  const combos = gk.list; out.combos = combos;
  const finalS = md.nE - 1;
  const ns = an.ns, xs = an.xs;
  // żebra poprzeczne środnika i panele (PN-EN 1993-1-5, 5): granice paneli – żebra pośrednie i podpory z żebrami
  const zebra = J.webStiff(st, md, sec); out.zebra = zebra;
  J.snipeWarn(st, sec, zebra, wrn);
  const panels = J.panels(st, md, sec, base, ndp, zebra); out.panels = panels;
  const sbPts = Array.from(xs, x => { const q = panels.find(pn => x >= pn.x0 - 1e-6 && x <= pn.x1 + 1e-6); return q ? q.sb : panels[0].sb; });
  const sb = panels.reduce((m2, q) => (!m2 || q.sb.Vb < m2.Vb ? q.sb : m2), null);
  out.sb = sb;
  (sec.uwagi || []).forEach(u => out.info.push(u));
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
      const sbi = sbPts[i];
      if (sbi.need) {
        const ub = Math.abs(E.V[i]) / sbi.Vb;
        if (better(kp.Vb, ub)) rec(kp.Vb, { util: ub, V: E.V[i], x: xs[i], combo: c, etap: c.etap, sb: sbi });
        const im = R.interMV(base, sbi, E.M[i], E.V[i]);
        if (better(kp.MV, im.u)) rec(kp.MV, { util: im.u, im, M: E.M[i], V: E.V[i], x: xs[i], combo: c, etap: c.etap, sb: sbi });
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
    if (panels.some(q => q.sb.need)) {
      const b = reg[`${s}|Vb`]; if (b) out.checks.push(BS.check({ id: `${s}-Vb`, grp: `PN-EN 1993-1-5 – środnik${stName(s)}`, etap: s, n: `Wyboczenie przy ścinaniu (panel a = ${b.sb.a === Infinity ? '∞' : U.fmt(b.sb.a / 1000, 2) + ' m'})`, ref: 'PN-EN 1993-1-5, 5.2', Ed: Math.abs(b.V), Rd: b.sb.Vb, unit: 'F', util: b.util, x: b.x, combo: fmtCombo(b.combo), d: b }));
      const i7 = reg[`${s}|MV71`]; if (i7) out.checks.push(BS.check({ id: `${s}-MV`, grp: `PN-EN 1993-1-5 – środnik${stName(s)}`, etap: s, n: 'Interakcja M–V (wyboczenie przy ścinaniu)', ref: 'PN-EN 1993-1-5, 7.1', Ed: i7.util, Rd: 1, unit: '-', util: i7.util, x: i7.x, combo: fmtCombo(i7.combo), d: i7 }));
    }
  }
  if (!panels.some(q => q.sb.need)) out.info.push(`Środnik: hw/tw = ${U.fmt(sb.ht, 1)} ≤ ${U.fmt(sb.limit, 1)} – sprawdzenie wyboczenia przy ścinaniu nie jest wymagane (PN-EN 1993-1-5, 5.1(2)).`);
  // --- siły skupione na środnik (poza podporami)
  ptLoads.forEach((pl, k) => {
    const r = ptRes[k]; if (!r || r.F <= 0) return;
    const zs = zebra.find(z => Math.abs(z.x - pl.x) <= Math.max(30, U.num(pl.ss) / 2)); if (zs) { zs.F = Math.max(zs.F || 0, r.F); return; }
    const pnl = panels.find(q => pl.x >= q.x0 - 1e-6 && pl.x <= q.x1 + 1e-6);
    const pr = R.patch(sec, base, ndp, { F: r.F, ss: pl.ss, typ: 'a', pas: pl.wys === 'pas_d' ? 'd' : 'g', a: pnl && isFinite(pnl.a) ? pnl.a : 0 });
    const e1 = Math.abs(r.M) / (Math.min(sec.Wel_t, sec.Wel_b) * base.fy / ndp.gM0);
    out.checks.push(BS.check({ id: `pt${k}`, grp: `PN-EN 1993-1-5 – środnik${stName(pl.etap)}`, etap: pl.etap, n: `Siła skupiona na środnik (x = ${U.fmt(pl.x / 1000, 2)} m)`, ref: 'PN-EN 1993-1-5, 6.2', Ed: r.F, Rd: pr.FRd, unit: 'F', util: pr.u, x: pl.x, combo: fmtCombo(r.combo), d: pr }));
    out.checks.push(BS.check({ id: `pt${k}i`, grp: `PN-EN 1993-1-5 – środnik${stName(pl.etap)}`, etap: pl.etap, n: `Interakcja F–M (x = ${U.fmt(pl.x / 1000, 2)} m)`, ref: 'PN-EN 1993-1-5, 7.2', Ed: pr.u + 0.8 * e1, Rd: 1.4, unit: '-', util: (pr.u + 0.8 * e1) / 1.4, x: pl.x, combo: fmtCombo(r.combo), d: { eta1: e1, eta2: pr.u } }));
  });
  // --- żebra poprzeczne środnika (PN-EN 1993-1-5, 9.1–9.4)
  J.stiffChecks(st, md, sec, base, ndp, zebra, panels, env, xs, out);
  // --- zwichrzenie i interakcja (każdy etap)
  out.ltb = [];
  for (let s = 0; s < md.nE; s++) {
    if (sec.kind === 'L') { out.ltb.push(null); continue; }   // kątownik – element stężony (założenie modelu)
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
  try { out.styki = J.spliceRun(st, sec, mat, ndp, base, md, env, an, out); } catch (e) { err('Styki: ' + e.message); }
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
    zmeczenie: !!st.zmeczenie.aktywny, spawana: sec.typ === 'spaw' || sec.kind === 'RHS' && sec.wyk === 'zimn', fy: mat.fy, gatunek: gat, podgatunek: pod,
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
      const anch = p.wezel && ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(p.wezel.typ);
      r.checks.push(BS.check({ id: `${p.id}-EQU`, grp, n: 'Odrywanie podpory (EQU) – wymagane zakotwienie', ref: 'PN-EN 1990 6.4.3.1, tabl. A1.2(A)', Ed: -Rmin, Rd: null, unit: 'F', util: null, forceStatus: anch ? 'warn' : 'fail', info: false, x: p.x, combo: 'EQU: 1,10/0,90·G + 1,5·Q', note: anch ? 'Siłę odrywającą musi przenieść połączenie (sprawdź śruby na rozciąganie).' : 'Oparcie bez zakotwienia – zaprojektuj kotwienie na siłę odrywającą.' }));
    }
    const isEnd = !p.tymcz && ((p.idx === 0 && md.wL === 0) || (p.idx === md.sup.length - 1 && md.wP === 0));
    const w = p.wezel || { typ: 'brak' };
    let conn = ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(w.typ);
    if (conn && w.typ !== 'spawane' && !(sec.kind === 'I' || sec.kind === 'U')) { out.errors.push(`Podpora ${p.id}: połączenie śrubowe przez środnik (blacha czołowa / żebrowa / kątowniki) jest obsługiwane dla dwuteowników i ceowników – dla ${sec.kind === 'RHS' ? 'rur' : 'kątowników'} wybierz połączenie spawane lub oparcie.`); conn = false; }
    // docisk środnika / żebro
    if (!conn && Rmax > 0 && sec.kind !== 'L') {
      const zSup = (out.zebra || []).find(z => Math.abs(z.x - p.x) <= 30);
      if ((w.zebro || zSup) && (sec.kind === 'I' || sec.kind === 'U')) {
        const sr = R.stiffener(sec, base, ndp, { F: Rmax, bs: w.zebro ? U.num(w.bs, 80) : zSup.bs, ts: w.zebro ? U.num(w.ts, 10) : zSup.ts, ch: w.zebro ? J.snipeSup(st, sec, w).c : zSup.c, koniec: isEnd, e: U.num(p.src && p.src.c, 0) + U.num(p.ss) / 2, jedno: !w.zebro && zSup.strona === 'jedna' });
        if (zSup) zSup.podpora = p.id;
        r.zebro = sr;
        r.checks.push(BS.check({ id: `${p.id}-ZB`, grp, n: 'Żebro podporowe – wyboczenie (przekrój krzyżowy z 15εtw)', ref: 'PN-EN 1993-1-5 9.4; PN-EN 1993-1-1 6.3.1', Ed: Rmax, Rd: sr.NbRd, unit: 'F', util: sr.uB, x: p.x, combo: cMax !== null ? combos[cMax].opis : '', d: sr }));
        r.checks.push(BS.check({ id: `${p.id}-ZD`, grp, n: 'Żebro podporowe – docisk końców żeber', ref: 'PN-EN 1993-1-1 6.2.4', Ed: Rmax, Rd: sr.Fbear, unit: 'F', util: sr.uC, x: p.x, combo: '', d: sr }));
        if (sr.ctS > sr.ctLim) r.checks.push(BS.check({ id: `${p.id}-ZC`, grp, n: 'Żebro – smukłość ścianki bs/ts', ref: 'PN-EN 1993-1-5 9.2.1(8)', Ed: sr.ctS, Rd: sr.ctLim, unit: '-', util: sr.ctS / sr.ctLim, d: sr }));
      } else {
        const pnl = (out.panels || []).find(q => p.x >= q.x0 - 1e-6 && p.x <= q.x1 + 1e-6);
        const pr = R.patch(sec, base, ndp, { F: Rmax, ss: U.num(p.ss, 0), typ: isEnd ? 'c' : 'a', c: U.num(p.src && p.src.c, 0), pas: 'd', a: pnl && isFinite(pnl.a) ? pnl.a : 0 });
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
      const res2 = J.jointRun(st, sec, mat, ndp, base, p, w, { Rmax, Mmax, Rk: r.Rk, typ: p.typ }, grp, cMax !== null ? combos[cMax].opis : '', out);
      if (res2) { r.pol = res2.o; r.F = res2.F; res2.checks.forEach(c => r.checks.push(c)); }
    }
    r.checks.forEach(c => out.checks.push(c));
    res.push(r);
  });
  return res;
};



/* ---------------------------------------------------------- żebra poprzeczne środnika */
// lista żeber: zadane w punktach (st.zebraSrodnika) + rozmieszczone co a w przęsłach (st.analiza.zebraRozstaw)
/* wcięcie narożne żebra 45° (c × c) przy pasach od strony środnika:
   • odpływ cynku i odpowietrzenie przy cynkowaniu zanurzeniowym (PN-EN ISO 14713-2),
   • ominięcie promienia wyokrąglenia r (kształtowniki walcowane) / spoiny pas–środnik √2·a (blachownice).
   v – wartość zadana [mm] ('' – automatycznie, 0 – bez wcięć: żebro dopasowane do promienia / spoiny). */
J.snipe = function (sec, v) {
  const cMin = sec.typ === 'spaw' ? Math.SQRT2 * U.num(sec.aw, 0) : U.num(sec.r, 0);
  const auto = Math.ceil(Math.max(20, cMin + 10) / 5) * 5;
  const t = v === '' || v === null || v === undefined ? NaN : U.num(v, NaN), isAuto = !(isFinite(t) && t >= 0);
  return { c: isAuto ? auto : t, cMin, auto, isAuto };
};
// wcięcie żeber podporowych: wartość z węzła lub (puste) – jak dla wszystkich żeber
J.snipeSup = function (st, sec, w) {
  const g = J.snipe(sec, (st.analiza || {}).zebraWc);
  return (w && w.ch !== '' && w.ch !== undefined && w.ch !== null && isFinite(U.num(w.ch, NaN))) ? Object.assign({}, g, { c: Math.max(0, U.num(w.ch)), isAuto: false, own: true }) : g;
};
J.snipeWarn = function (st, sec, zebra, wrn) {
  if (!(sec.kind === 'I' || sec.kind === 'U')) return;
  const all = zebra.map(z => ({ n: `żebra środnika`, c: z.c, bs: z.bs, g: J.snipe(sec, (st.analiza || {}).zebraWc) }));
  (st.podpory || []).forEach((p, i) => { const w = p.wezel || {}; if (w.zebro && ['oparcie', 'brak'].includes(w.typ || 'brak')) { const g = J.snipeSup(st, sec, w); all.push({ n: `żebra podporowe (podpora ${i + 1})`, c: g.c, bs: U.num(w.bs, 70), g }); } });
  const seen = {};
  all.forEach(q => {
    const nr = sec.typ === 'spaw' ? `spoiny pas–środnik (√2·a = ${U.fmt(q.g.cMin, 1)} mm)` : `promienia wyokrąglenia (r = ${U.fmt(q.g.cMin, 0)} mm)`;
    let m = null;
    if (q.c <= 0) m = `${q.n} bez wcięć narożnych – żebro trzeba dopasować do ${sec.typ === 'spaw' ? 'spoin pas–środnik' : 'promienia wyokrąglenia'}, a przy cynkowaniu zanurzeniowym zamknięte naroża zatrzymują cynk i powietrze – zalecane wcięcia 45° c ≥ ${U.fmt(q.g.auto, 0)} mm (PN-EN ISO 14713-2).`;
    else if (q.c < q.g.cMin + 2) m = `wcięcie narożne ${q.n} c = ${U.fmt(q.c, 0)} mm nie omija ${nr} – zwiększ do c ≥ ${U.fmt(q.g.auto, 0)} mm (również odpływ cynku, PN-EN ISO 14713-2).`;
    else if (q.c > 0.5 * q.bs) m = `wcięcie narożne ${q.n} c = ${U.fmt(q.c, 0)} mm > 0,5·b_s = ${U.fmt(0.5 * q.bs, 0)} mm – mała powierzchnia docisku i krótka spoina żebra z pasem.`;
    if (m && !seen[m]) { seen[m] = 1; wrn(m.charAt(0).toUpperCase() + m.slice(1)); }
  });
};
J.stiffAuto = function (sec) {
  const tw = sec.tw || 6, bf = sec.kind === 'U' ? sec.b : Math.min(sec.bg || 100, sec.bd || 100);
  const bs = Math.max(30, Math.floor((sec.kind === 'U' ? bf - tw - 5 : (bf - tw) / 2 - 5) / 5) * 5);
  const ts = Math.max(6, Math.ceil(Math.max(tw, bs / Math.sqrt(U.E / (5.3 * 355))) / 2) * 2);
  return { bs, ts };
};
J.webStiff = function (st, md, sec) {
  if (!(sec.kind === 'I' || sec.kind === 'U')) return [];
  const au = J.stiffAuto(sec), out = [], c = J.snipe(sec, (st.analiza || {}).zebraWc).c;
  (st.zebraSrodnika || []).forEach((z, j) => { const x = U.num(z.x) * 1000; if (x < -1 || x > md.L + 1) return; out.push({ src: j, x: U.clamp(x, 0, md.L), strona: sec.kind === 'U' ? 'jedna' : (z.strona === 'jedna' ? 'jedna' : 'obie'), bs: U.num(z.bs, au.bs) || au.bs, ts: U.num(z.ts, au.ts) || au.ts, c }); });
  const a = U.num((st.analiza || {}).zebraRozstaw) * 1000;
  if (a > 0) {
    const xs = md.sup.map(p => p.x).sort((p, q) => p - q), bs = U.num(st.analiza.zebraBs, au.bs) || au.bs, ts = U.num(st.analiza.zebraTs, au.ts) || au.ts;
    const atSup = st.analiza.zebraPodpory !== false;
    for (let i = 0; i < xs.length - 1; i++) { const L = xs[i + 1] - xs[i], n = Math.ceil(L / a - 1e-9); for (let k = atSup ? 0 : 1; k <= (atSup ? n : n - 1); k++) { const x = xs[i] + L * k / n; if (!out.some(z => Math.abs(z.x - x) < 20)) out.push({ src: 'g', x, strona: sec.kind === 'U' ? 'jedna' : 'obie', bs, ts, c }); } }
  }
  return out.sort((p, q) => p.x - q.x);
};
// panele środnika: granice – żebra pośrednie i podpory z żebrami podporowymi; poza nimi a = ∞
J.panels = function (st, md, sec, base, ndp, zebra) {
  const B = zebra.map(z => z.x);
  md.sup.forEach((p, i) => { const w = (st.podpory[i] || {}).wezel || {}; if (w.zebro && !B.some(x => Math.abs(x - p.x) < 20)) B.push(p.x); });
  B.sort((p, q) => p - q);
  const cuts = [0].concat(B.filter(x => x > 1 && x < md.L - 1)).concat([md.L]).filter((v, i, a) => i === 0 || v - a[i - 1] > 1);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const x0 = cuts[i], x1 = cuts[i + 1], bounded = B.some(x => Math.abs(x - x0) < 21) && B.some(x => Math.abs(x - x1) < 21);
    const a = bounded ? x1 - x0 : Infinity;
    out.push({ x0, x1, a, sb: R.shearBuckling(sec, base, ndp, { a, sztywny: !!st.analiza.slupekSztywny }) });
  }
  return out;
};
// sprawdzenia żeber pośrednich (9.3.3, 9.2.1(8), 9.4) i żeber pod siłami skupionymi
J.stiffChecks = function (st, md, sec, base, ndp, zebra, panels, env, xs, out) {
  if (!zebra.length) return;
  const fy = base.fy, eps = base.eps, tw = sec.tw, hw = sec.hw, E = U.E, g1 = ndp.gM1;
  const grp = 'PN-EN 1993-1-5 – żebra poprzeczne środnika';
  zebra.forEach((z, j) => {
    if (md.sup.some(p => Math.abs(p.x - z.x) <= 30)) return;          // żebro podporowe – sprawdzane w podporze
    const id = `ZS${j + 1}`, nm = `Żebro x = ${U.fmt(z.x / 1000, 2)} m (${z.strona === 'jedna' ? 'jednostronne' : 'obustronne'} ${U.fmt(z.bs, 0)}×${U.fmt(z.ts, 0)})`;
    // przekrój współpracujący: żebro + 2 × 15εt_w środnika (9.1(2))
    const lw = 15 * eps * tw, two = z.strona !== 'jedna';
    const parts = two ? [[2 * z.bs + tw, z.ts, 0], [2 * lw, tw, 0]] : [[z.bs, z.ts, tw / 2 + z.bs / 2], [2 * lw + z.ts, tw, 0]];
    const As = parts.reduce((s2, q) => s2 + q[0] * q[1], 0), yc = parts.reduce((s2, q) => s2 + q[0] * q[1] * q[2], 0) / As;
    const Ist = two ? z.ts * Math.pow(2 * z.bs + tw, 3) / 12 + 2 * lw * Math.pow(tw, 3) / 12 : parts.reduce((s2, q) => s2 + q[1] * Math.pow(q[0], 3) / 12 + q[0] * q[1] * Math.pow(q[2] - yc, 2), 0);
    // sąsiednie panele
    const adj = panels.filter(q => Math.abs(q.x0 - z.x) < 21 || Math.abs(q.x1 - z.x) < 21);
    const aMin = Math.min(...adj.map(q => q.a).filter(isFinite), Infinity);
    const reqI = !isFinite(aMin) ? 0.75 * hw * tw ** 3 : (aMin / hw < Math.SQRT2 ? 1.5 * hw ** 3 * tw ** 3 / (aMin * aMin) : 0.75 * hw * tw ** 3);
    out.checks.push(BS.check({ id: `${id}-I`, grp, n: `${nm}: sztywność (żebro sztywne)`, ref: 'PN-EN 1993-1-5, 9.3.3(3)', Ed: reqI, Rd: Ist, unit: 'I', util: reqI / Ist, x: z.x, d: { Ist, reqI, aMin }, f: `I_st = ${U.fmt(Ist / 1e4, 1)} cm⁴ ≥ ${isFinite(aMin) && aMin / hw < Math.SQRT2 ? '1,5·h_w³·t³/a²' : '0,75·h_w·t³'} = ${U.fmt(reqI / 1e4, 1)} cm⁴ (a = ${isFinite(aMin) ? U.fmt(aMin, 0) + ' mm' : '∞'})` }));
    // skręcenie żebra płaskiego (9.2.1(8)): I_T/I_p ≥ 5,3·f_y/E → b_s/t_s ≤ √(E/(5,3·f_y))
    const lim = Math.sqrt(E / (5.3 * fy));
    out.checks.push(BS.check({ id: `${id}-T`, grp, n: `${nm}: wyboczenie skrętne (b_s/t_s)`, ref: 'PN-EN 1993-1-5, 9.2.1(8)', Ed: z.bs / z.ts, Rd: lim, unit: '-', util: (z.bs / z.ts) / lim, x: z.x, f: `b_s/t_s = ${U.fmt(z.bs / z.ts, 2)} ≤ √(E/(5,3·f_y)) = ${U.fmt(lim, 2)}` }));
    // siła w żebrze: N_st = V_Ed − f_yw·h_w·t/(√3·γM1·λ̄_w²) (9.13) + siła skupiona w miejscu żebra
    let k = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - z.x) < Math.abs(xs[k] - z.x)) k = i;
    const VEd = Math.max(...env.map(e => Math.max(Math.abs(e.Vmax[k]), Math.abs(e.Vmin[k]))));
    const pn = adj.length ? adj.reduce((m2, q) => (q.sb.lw > m2.sb.lw ? q : m2)) : panels[0];
    const Nst = Math.max(0, pn.sb.need && isFinite(pn.a) ? VEd - fy * hw * tw / (Math.sqrt(3) * g1 * pn.sb.lw * pn.sb.lw) : 0) + (z.F || 0);
    const i2 = Math.sqrt(Ist / As), lam = 0.75 * hw / (i2 * 93.9 * eps), ph = 0.5 * (1 + 0.49 * (lam - 0.2) + lam * lam), chi = Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lam * lam)));
    const NbRd = chi * As * fy / g1;
    out.checks.push(BS.check({ id: `${id}-N`, grp, n: `${nm}: wyboczenie żebra (${z.F ? 'siła skupiona + ' : ''}siła od pola ścinania)`, ref: 'PN-EN 1993-1-5, 9.3.3(3), 9.4', Ed: Nst, Rd: NbRd, unit: 'F', util: Nst / NbRd, x: z.x, d: { As, Ist, lam, chi, Nst, VEd, F: z.F || 0 }, f: `N_st = ${z.F ? `F = ${U.fmt(z.F / 1e3, 1)} kN + ` : ''}max(0; V_Ed − f_yw·h_w·t/(√3·γM1·λ̄_w²)) = ${U.fmt(Nst / 1e3, 1)} kN; A_s = ${U.fmt(As, 0)} mm², l = 0,75·h_w, λ̄ = ${U.fmt(lam, 3)}, χ (krzywa c) = ${U.fmt(chi, 3)}` }));
    if (z.F) {
      const Ac = (two ? 2 : 1) * Math.max(0, z.bs - z.c) * z.ts, Fb = Ac * fy / ndp.gM0;
      out.checks.push(BS.check({ id: `${id}-D`, grp, n: `${nm}: docisk żebra pod siłą skupioną`, ref: 'PN-EN 1993-1-1, 6.2.4', Ed: z.F, Rd: Fb, unit: 'F', util: z.F / Fb, x: z.x, d: { Ac, c: z.c }, f: `A_c = ${two ? 2 : 1}·(b_s − c)·t_s = ${two ? 2 : 1}·(${U.fmt(z.bs, 0)} − ${U.fmt(z.c, 0)})·${U.fmt(z.ts, 0)} = ${U.fmt(Ac, 0)} mm² (c – wcięcie narożne 45°); F_Rd = A_c·f_y/γM0 = ${U.fmt(Fb / 1e3, 1)} kN` }));
    }
  });
};
/* ---------------------------------------------------------- połączenia (BS.W) – siły, sprawdzenia, rejestr */
J.jointForces = function (w, info) {
  const Vser = (info.Rk || []).reduce((s2, q) => s2 + Math.max(0, q.R), 0);
  if (w.silyRecz) return { V: Math.abs(U.num(w.VEd)) * 1e3, Nt: Math.max(0, U.num(w.Nt)) * 1e3, N: U.num(w.NEd) * 1e3, M: Math.abs(U.num(w.MEd)) * 1e6, Vser: Vser || Math.abs(U.num(w.VEd)) * 1e3 / 1.4, recz: true };
  return { V: info.Rmax, Nt: Math.max(0, U.num(w.Nt)) * 1e3, N: 0, M: w.typ === 'spawane' && info.typ === 'utwierdzenie' ? info.Mmax : 0, Vser };
};
J.jointCtx = (sec, mat, ndp, base) => ({ sec, mat, ndp: Object.assign({ gM3: 1.25, gM3ser: 1.1 }, ndp), base });
const UNIT = { F: 'F', M: 'M', '-': '-', MPa: 'MPa', mm: 'mm' };
J.jointChecks = function (o, idp, grp, x, combo) {
  const out = [];
  o.checks.forEach((c, k) => out.push(BS.check({ id: `${idp}-C${k}`, grp, n: `${c.grp}: ${c.n}`, ref: c.ref, Ed: c.Ed, Rd: c.Rd, unit: UNIT[c.unit] || 'F', util: c.u, x, combo, d: c, f: c.f })));
  o.detalFail.forEach((d, k) => out.push(BS.check({ id: `${idp}-D${k}`, grp, n: `Konstrukcja – ${d.el}: ${d.n}`, ref: 'PN-EN 1993-1-8 tabl. 3.3', Ed: d.v, Rd: d.lim, unit: 'mm', util: d.rel === '≥' ? d.lim / Math.max(d.v, 1e-9) : d.v / Math.max(d.lim, 1e-9), inverse: d.rel === '≥', d })));
  o.zalFail.forEach((d, k) => out.push(BS.check({ id: `${idp}-Z${k}`, grp, n: `Zalecenie – ${d.el}: ${d.n}`, ref: 'SCI P358 / dobra praktyka', Ed: d.v, Rd: d.lim, unit: 'mm', util: null, forceStatus: 'warn', inverse: d.rel === '≥', d, note: 'Zalecenie konstrukcyjne (ciągliwość, montaż, trwałość) – nie jest warunkiem nośności.' })));
  return out;
};
J.jointRun = function (st, sec, mat, ndp, base, p, w, info, grp, combo, out) {
  const F = J.jointForces(w, info);
  let o;
  try { o = W.design(J.jointCtx(sec, mat, ndp, base), w, F); } catch (e) { out.errors.push(`Połączenie ${p.id}: ${e.message}`); return null; }
  if (!o) return null;
  o.uwagi.forEach(u => out.warnings.push(`Połączenie ${p.id}: ${u}`));
  return { o, F, checks: J.jointChecks(o, p.id, grp, p.x, F.recz ? 'siły zadane ręcznie' : combo) };
};
J.spliceForces = function (s, md, env, an) {
  if (s.silyRecz) return { M: Math.abs(U.num(s.MEd)) * 1e6, V: Math.abs(U.num(s.VEd)) * 1e3, N: U.num(s.NEd) * 1e3, recz: true };
  const x = U.clamp(U.num(s.x) * 1000, 0, md.L), xs = an.xs; let k = 0; for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[k] - x)) k = i;
  let Mx = 0, Vx = 0, Nx = 0;
  env.forEach(e => { Mx = Math.max(Mx, Math.abs(e.Mmax[k]), Math.abs(e.Mmin[k])); Vx = Math.max(Vx, Math.abs(e.Vmax[k]), Math.abs(e.Vmin[k])); if (isFinite(e.Nmax)) Nx = Math.max(Nx, Math.abs(e.Nmax), Math.abs(e.Nmin)); });
  return { M: Mx, V: Vx, N: Nx, x };
};
J.spliceRun = function (st, sec, mat, ndp, base, md, env, an, out) {
  return (st.styki || []).map((s, j) => {
    const F = J.spliceForces(s, md, env, an), id = 'S' + (j + 1), grp = `Styki – styk ${id} (x = ${U.fmt(U.num(s.x), 2)} m)`;
    let o;
    try { o = W.designSplice(J.jointCtx(sec, mat, ndp, base), s, F); } catch (e) { out.errors.push(`Styk ${id}: ${e.message}`); return { id, F, o: null }; }
    o.uwagi.forEach(u => out.warnings.push(`Styk ${id}: ${u}`));
    J.jointChecks(o, id, grp, U.num(s.x) * 1000, F.recz ? 'siły zadane ręcznie' : 'obwiednia |M|, |V|, |N| w miejscu styku (wszystkie etapy)').forEach(c => out.checks.push(c));
    return { id, F, o, x: U.num(s.x) * 1000 };
  });
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
  const els = sec.kind === 'I' ? [{ n: 'pas górny', t: sec.tg, s: sT }, { n: 'pas dolny', t: sec.td, s: sB }, { n: 'środnik', t: sec.tw, s: sW }]
    : sec.kind === 'U' ? [{ n: 'półki', t: sec.tf, s: Math.max(sT, sB) }, { n: 'środnik', t: sec.tw, s: sW }]
      : [{ n: sec.kind === 'RHS' ? 'ścianki rury' : 'ramiona kątownika', t: sec.tMax, s: Math.max(sT, sB, sW) }];
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


/* ---------------------------------------------------------- schematy typowe */
J.SCHEMATY = [
  { id: 'swob', n: 'Belka swobodnie podparta', d: 'przegub – przegub (np. belka stropowa, nadproże)', przesla: 1, sup: ['przegub', 'przegub'] },
  { id: 'wspornik', n: 'Wspornik', d: 'utwierdzenie – koniec swobodny (balkon, daszek)', przesla: 0, wspP: true, sup: ['utwierdzenie'] },
  { id: 'utwprz', n: 'Utwierdzona – przegubowa', d: 'jeden koniec sztywny (węzeł momentowy), drugi przegubowy', przesla: 1, sup: ['utwierdzenie', 'przegub'] },
  { id: 'utwutw', n: 'Obustronnie utwierdzona', d: 'oba końce sztywne', przesla: 1, sup: ['utwierdzenie', 'utwierdzenie'] },
  { id: 'wspP', n: 'Jednoprzęsłowa ze wspornikiem', d: 'przęsło + wspornik prawy', przesla: 1, wspP: true, sup: ['przegub', 'przegub'] },
  { id: 'wsp2', n: 'Jednoprzęsłowa z dwoma wspornikami', d: 'wsporniki z obu stron przęsła', przesla: 1, wspL: true, wspP: true, sup: ['przegub', 'przegub'] },
  { id: 'ciagla', n: 'Belka ciągła', d: 'liczba przęseł – pole „Liczba przęseł” (np. płatew, podciąg)', przesla: 3, ciagla: true, sup: ['przegub', 'przegub', 'przegub', 'przegub'] },
  { id: 'montaz', n: 'Belka z podporą montażową', d: 'etap 1 – podpora tymczasowa w środku, etap 2 – po jej usunięciu', przesla: 1, sup: ['przegub', 'przegub'], tmp: true },
  { id: 'stropowa', n: 'Belka stropowa z etapem montażu', d: 'montaż bez stężenia pasa górnego, eksploatacja – pas górny stężony płytą', przesla: 1, sup: ['przegub', 'przegub'], stages: true }
];
J.applyScheme = function (st, id) {
  const sc = J.SCHEMATY.find(q => q.id === id); if (!sc) return st;
  const g = st.geom || (st.geom = {});
  const L0 = U.num((g.przesla || [])[0], 6) || 6;
  const nP = sc.ciagla ? Math.max(2, (g.przesla || []).length) : sc.przesla;
  g.przesla = Array.from({ length: nP }, (_, i) => U.num((g.przesla || [])[i], L0) || L0);
  g.wspL = sc.wspL ? (U.num(g.wspL) || Math.max(1, Math.round(L0 / 4 * 2) / 2)) : 0;
  g.wspP = sc.wspP ? (U.num(g.wspP) || (sc.przesla ? Math.max(1, Math.round(L0 / 4 * 2) / 2) : L0 / 2)) : 0;
  if (!sc.przesla && sc.wspP) g.wspP = U.num(g.wspP) || 2;
  const old = st.podpory || [];
  const sup = sc.ciagla ? Array.from({ length: nP + 1 }, () => 'przegub') : sc.sup;
  st.podpory = sup.map((t, i) => Object.assign({ ss: 100, c: 0, wezel: { typ: 'brak' } }, old[i] || {}, { typ: t, ltb: t === 'utwierdzenie' ? 'pelne' : 'widelkowe' }));
  st.schemat = id;
  if (sc.tmp) {
    if (!st.etapy || st.etapy.length < 2) st.etapy = [{ id: 'E1', nazwa: 'Montaż – na podporze tymczasowej', typ: 'montaz', opis: '' }, { id: 'E2', nazwa: 'Eksploatacja', typ: 'eksploatacja', opis: '' }];
    st.podporyTymczasowe = [{ x: (g.wspL || 0) + g.przesla[0] / 2, usunietaPo: 0, ss: 100 }];
  } else st.podporyTymczasowe = [];
  if (sc.stages) {
    st.etapy = [{ id: 'E1', nazwa: 'Montaż – układanie płyt stropowych', typ: 'montaz', opis: 'Belka bez stężenia pasa górnego.' }, { id: 'E2', nazwa: 'Eksploatacja', typ: 'eksploatacja', opis: 'Pas górny stężony ciągle przez płyty.' }];
    st.stezenieCiagle = Object.assign({}, st.stezenieCiagle, { pasG: true, odEtapu: 1 });
  }
  if (!sc.tmp && !sc.stages && st.etapy && st.etapy.length > 1 && id !== st._keepStages) { /* etapy pozostają – zmienia je użytkownik */ }
  return st;
};

/* ---------------------------------------------------------- dobór */
// grupy sprawdzeń pomijane w doborze przekroju (połączenia/oparcia dobiera „Dobierz węzły”; pożar – zabezpieczenie; kruche pękanie – gatunek)
const MEMBER = (c) => !/^Podpory|^Styki|^Pożar|^Kruche|^Zmęczenie/.test(c.grp);
J.passesFor = function (r, eta, filt) {
  if (r.errors.length) return false;
  return r.checks.filter(c => !c.info && (!filt || filt(c))).every(c => c.status !== 'fail' && (c.util === null || !isFinite(c.util) ? c.status !== 'fail' : c.util <= eta + 1e-9));
};
J.memberFilter = MEMBER;
// kandydaci przekroju tego samego rodzaju, rosnąco wg masy
J.doborKandydaci = function (st) {
  const d = st.przekroj || {};
  if (d.typ === 'spaw') {
    const out = [], h = U.num(d.h, 600), b = U.num(d.bg, 250), aw = U.num(d.aw, 4);
    [6, 8, 10, 12, 14, 16, 20].forEach(tw => [8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40].forEach(tf => {
      const q = { typ: 'spaw', h, bg: b, tg: tf, bd: d.sym === false ? U.num(d.bd, b) : b, td: tf, tw, aw: Math.max(aw, Math.min(tw, 0.5 * tw)) };
      out.push({ d: q, masa: (2 * b * tf + (h - 2 * tf) * tw) * 1e-6 * U.RHO, nazwa: `I ${h}×${b}×${tw}×${tf}` });
    }));
    return out.sort((a, c) => a.masa - c.masa);
  }
  const typ = d.typ || 'walc';
  if (typ === 'walc') return P.katalog('walc', [d.seria || 'IPE']);
  if (typ === 'rura') { const L = P.katalog('rura', Object.assign([d.seria === 'wlasna' ? 'RHS' : (d.seria || 'SHS')], { wyk: d.wyk })); L.forEach(c => { c.d.wyk = d.wyk; }); return L; }
  if (typ === 'kat') { const L = P.katalog('kat', [d.seria || 'L']); L.forEach(c => { c.d.poz = d.poz; }); return L; }
  return P.katalog(typ, [d.seria]);
};

/* dobór węzłów i oparć przy znanych reakcjach (wynik obliczeń r) */
J.dobierzWezly = function (st0, r, eta) {
  const st = U.clone(st0), log = [];
  eta = eta || 1;
  if (!r || !r.podpory) return { st, log: ['Brak wyników – najpierw usuń błędy danych.'], ok: false };
  const sec = r.sec, mat = r.mat, ndp = r.ndp, base = r.base;
  let allOk = true;
  r.podpory.forEach((p, k) => {
    if (p.tymcz) return;
    const sp = st.podpory[p.idx === undefined ? k : p.idx] || st.podpory[k]; if (!sp) return;
    const w = sp.wezel || (sp.wezel = { typ: 'brak' });
    const R0 = p.Rmax; if (!(R0 > 0)) return;
    const okU = (o) => o.checks.every(c => c.u <= eta + 1e-9) && (!o.detal || o.detal.every(d => d.ok));
    if (['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(w.typ) && (w.typ === 'spawane' || sec.kind === 'I' || sec.kind === 'U')) {
      const F = J.jointForces(w, { Rmax: R0, Mmax: p.Mmax, Rk: p.Rk, typ: sp.typ });
      const d = W.auto(J.jointCtx(sec, mat, ndp, base), Object.assign({}, W.defaults(w.typ, sec), w), F, eta);
      if (d.ok) { Object.keys(d.w).forEach(k => { w[k] = d.w[k]; }); log.push(`Podpora ${p.id}: ${J.jointTxt(w, sec)} – wytężenie ${Math.round(d.o.u * 100)}%.`); }
      else { allOk = false; log.push(`Podpora ${p.id}: nie znaleziono wariantu „${W.TYPY[w.typ]}” spełniającego warunki – zmień rodzaj połączenia lub klasę śrub.`); }
    } else if (sec.kind !== 'L') {
      // oparcie – płyta podporowa i ewentualne żebra
      if (w.typ === 'oparcie' && w.podloze !== 'stal') {
        let ok = false;
        for (const lp of [100, 120, 150, 180, 200, 250, 300, 350, 400]) { for (const tp of [10, 12, 15, 20, 25, 30]) {
          const bp = Math.max(U.num(w.bp, 0), Math.ceil((Math.max(sec.bd || sec.b, sec.b) + 40) / 10) * 10);
          const wv = { podloze: w.podloze, bp, lp, tp, beton: w.beton, alfa: w.alfa, fd: w.fd, beta: w.beta, lb: lp };
          const o = C.bearingPlate(sec, mat, ndp, wv, R0);
          if (o.checks.every(c => c.u <= eta + 1e-9)) { Object.assign(w, { bp, lp, tp, lb: lp }); ok = true; break; } } if (ok) break; }
        log.push(ok ? `Podpora ${p.id}: płyta podporowa ${w.bp}×${w.lp}×${w.tp} mm.` : `Podpora ${p.id}: docisk do podłoża niewystarczający nawet dla płyty 400 mm – zwiększ podłoże/wieniec.`);
        if (!ok) allOk = false;
      }
      if (sec.kind === 'I' || sec.kind === 'U' || sec.kind === 'RHS') {
        const isEnd = (p.idx === 0 && U.num(st.geom.wspL) === 0) || (p.idx === r.md.sup.length - 1 && U.num(st.geom.wspP) === 0);
        const pr = R.patch(sec, base, ndp, { F: R0, ss: U.num(sp.ss, 0), typ: isEnd ? 'c' : 'a', c: U.num(sp.c, 0), pas: 'd', a: 0 });
        if (pr.u > eta && (sec.kind === 'I' || sec.kind === 'U')) {
          const bsMax = Math.floor(((sec.kind === 'U' ? sec.b - sec.tw : (Math.min(sec.bg, sec.bd) - sec.tw) / 2) - 5) / 5) * 5;
          let ok = false; const cS = J.snipeSup(st, sec, w).c;
          for (const ts of [8, 10, 12, 15, 20, 25]) { const sr = R.stiffener(sec, base, ndp, { F: R0, bs: bsMax, ts, ch: cS, koniec: isEnd, e: U.num(sp.c, 0) + U.num(sp.ss) / 2 }); if (sr.uB <= eta && sr.uC <= eta && sr.ctS <= sr.ctLim) { Object.assign(w, { zebro: true, bs: bsMax, ts }); ok = true; break; } }
          log.push(ok ? `Podpora ${p.id}: docisk środnika niewystarczający (${Math.round(pr.u * 100)}%) – dodano żebra podporowe 2×${w.bs}×${w.ts} mm.` : `Podpora ${p.id}: nie dobrano żeber podporowych.`);
          if (!ok) allOk = false;
        } else if (w.zebro && pr.u <= eta * 0.9) { log.push(`Podpora ${p.id}: żebra podporowe nie są wymagane (docisk środnika ${Math.round(pr.u * 100)}%).`); }
      }
    }
  });
  // styki montażowe
  (st.styki || []).forEach((s0, k) => {
    if (s0.typ === 'spawany' || sec.kind !== 'I') return;
    const rs = (r.styki || [])[k]; if (!rs) return;
    const d = W.autoSplice(J.jointCtx(sec, mat, ndp, base), s0, rs.F, eta);
    if (d.ok) { Object.assign(s0, d.w); log.push(`Styk S${k + 1}: nakładki pasów ${s0.bfo}×${s0.tfo}${s0.tfi > 0 ? ` + 2×${s0.bfi}×${s0.tfi}` : ''} mm (2×${s0.nf} ${s0.d}), nakładki środnika 2×${s0.hpw}×${s0.tpw} mm (${s0.nw}×${s0.ncw} ${s0.d}) – wytężenie ${Math.round(d.o.u * 100)}%.`); }
    else { allOk = false; log.push(`Styk S${k + 1}: nie znaleziono układu nakładek spełniającego warunki – zastosuj styk spawany lub zmień położenie styku.`); }
  });
  return { st, log, ok: allOk };
};

J.jointTxt = function (w, sec) {
  const u = U.num;
  if (w.typ === 'blacha_czolowa') return `blacha czołowa ${u(w.hp)}×${u(w.bp)}×${u(w.tp)} mm, śruby 2×${u(w.nr)} ${w.d} kl. ${w.kl}, spoiny a = ${u(w.a)} mm`;
  if (w.typ === 'blacha_zebrowa') return `blacha żebrowa ${u(w.hp)}×${u(w.tp)} mm, śruby ${u(w.nr || w.n)}${u(w.nc, 1) > 1 ? '×' + u(w.nc) : ''} ${w.d} kl. ${w.kl}, spoiny a = ${u(w.a)} mm`;
  if (w.typ === 'katowniki') return `kątowniki 2×L${String(w.L).replace(/x/g, '×')} dł. ${u(w.hp)} mm, śruby ${u(w.nr)} ${w.d} kl. ${w.kl} (środnik) + 2×${u(w.nr)} (podpora)`;
  if (w.typ === 'spawane') return w.spoiny === 'czolowa' ? 'spoina czołowa z pełnym przetopem' : `spoiny pachwinowe ${w.spoiny === 'obwodowe' ? `obwodowe a_w = ${u(w.aw)}, a_f = ${u(w.af)}` : `środnika a = ${u(w.aw)}`} mm`;
  if (w.typ === 'oparcie') return `płyta podporowa ${u(w.bp)}×${u(w.lp)}×${u(w.tp)} mm`;
  return 'oparcie na stali';
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
