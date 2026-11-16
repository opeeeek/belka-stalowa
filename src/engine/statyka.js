/* =====================================================================
   BelkaStal – model obliczeniowy i analiza statyczna
   • geometria: przęsła + wsporniki, podpory stałe i tymczasowe;
   • etapy realizacji: w każdym etapie własny układ podpór; obciążenia
     stałe przyłożone w etapie k pozostają w układzie („historia”):
     po usunięciu podpory tymczasowej jej reakcja jest przykładana
     przeciwnie na układ następnego etapu (superpozycja liniowa);
   • obciążenia zmienne działają w etapie, do którego przypisano przypadek;
   • każdy przypadek dzielony jest na części w segmentach (wspornik/przęsło)
     – układ szachownicowy i obwiednie EQU.
   Wejście: m, kN/m, kN, kNm.  Wewnętrznie: mm, N/mm, N, Nmm.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, F = BS.FE;
const S = BS.S = {};

S.RODZAJE = {
  G: { n: 'stałe (G)', stale: true },
  Q: { n: 'użytkowe (Q)', psiKey: (o) => o.kat || 'Q-B' },
  S: { n: 'śnieg (S)', psiKey: () => 'S' },
  W: { n: 'wiatr (W)', psiKey: () => 'W' },
  T: { n: 'temperatura (T)', psiKey: () => 'T' },
  Qc: { n: 'montażowe (Qc)', psiKey: () => 'Qc' },
  M: { n: 'urządzenia/maszyny (M)', psiKey: () => 'M' },
  A: { n: 'wyjątkowe (A)', wyj: true }
};

const LIT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ------------------------------------------------------- model */
S.model = function (st, sec) {
  const g = st.geom || {}, err = [];
  const spans = (g.przesla || []).map(v => U.num(v) * 1000).filter(v => v > 0);
  if (!spans.length) err.push('Podaj co najmniej jedno przęsło o dodatniej długości.');
  const wL = Math.max(0, U.num(g.wspL) * 1000), wP = Math.max(0, U.num(g.wspP) * 1000);
  const L = wL + U.sum(spans) + wP;
  // podpory stałe
  const xsup = [wL]; spans.forEach(s => xsup.push(xsup[xsup.length - 1] + s));
  const sup = xsup.map((x, i) => {
    const p = (st.podpory || [])[i] || {};
    const typ = p.typ || 'przegub';
    return {
      id: LIT[i] || ('P' + i), idx: i, x, typ, tymcz: false,
      kv: typ === 'sprezyna' ? Math.max(0, U.num(p.kz) * 1000) : 'fix',            // kN/mm → N/mm
      kr: typ === 'utwierdzenie' ? 'fix' : (typ === 'sprezyna' || typ === 'podatne') ? Math.max(0, U.num(p.kfi) * 1e6) : 0, // kNm/rad → Nmm/rad
      ltb: p.ltb || (typ === 'utwierdzenie' ? 'pelne' : 'widelkowe'),
      ss: Math.max(0, U.num(p.ss, 100)), wezel: p.wezel || { typ: 'brak' }, src: p
    };
  });
  if (spans.length && sup.length !== spans.length + 1) err.push('Niezgodna liczba podpór.');
  // podpory tymczasowe (montażowe)
  const etapy = (st.etapy && st.etapy.length) ? st.etapy : [{ id: 'E1', nazwa: 'Eksploatacja', typ: 'eksploatacja' }];
  const nE = etapy.length;
  const tmp = (st.podporyTymczasowe || []).map((p, i) => ({
    id: 'T' + (i + 1), x: U.num(p.x) * 1000, typ: 'przegub', tymcz: true, kv: 'fix', kr: 0, ltb: 'widelkowe', ss: U.num(p.ss, 100),
    do: U.clamp(Math.round(U.num(p.usunietaPo, 0)), 0, nE - 1), src: p, wezel: { typ: 'brak' }
  })).filter(p => p.x > 0 && p.x < L);
  tmp.forEach(t => { if (t.do >= nE - 1) err.push(`Podpora tymczasowa ${t.id} nie jest usuwana przed etapem końcowym – w eksploatacji byłaby podporą stałą.`); });
  // segmenty (części do układów szachownicowych i EQU)
  const seg = [];
  if (wL > 0) seg.push({ id: 'wL', n: 'wspornik lewy', x0: 0, x1: wL, wsp: true });
  spans.forEach((s, i) => seg.push({ id: 'p' + (i + 1), n: 'przęsło ' + (i + 1), x0: xsup[i], x1: xsup[i + 1], i }));
  if (wP > 0) seg.push({ id: 'wP', n: 'wspornik prawy', x0: L - wP, x1: L, wsp: true });
  const segOf = (x) => { for (let i = 0; i < seg.length; i++) if (x <= seg[i].x1 + 1e-6) return i; return seg.length - 1; };

  // przypadki obciążeń
  const cases = [];
  const cw = st.ciezarWlasny || { auto: true, dodatek: 0, etap: 0 };
  if (cw.auto !== false && sec) {
    const q = sec.gk * (1 + U.num(cw.dodatek) / 100);
    cases.push({ id: 'G0', nazwa: 'Ciężar własny belki' + (U.num(cw.dodatek) ? ` (+${U.fmt(U.num(cw.dodatek), 0)}% na połączenia)` : ''), rodzaj: 'G', etap: U.clamp(U.num(cw.etap, 0), 0, nE - 1), uklad: 'staly', wyklucz: '', N: 0, auto: true,
      sklad: [{ typ: 'q', q0: q, q1: q, x0: 0, x1: L / 1000, kier: 'z', wys: 'srodek' }] });
  }
  (st.obciazenia || []).forEach((o, i) => {
    if (o.aktywne === false) return;
    const c = U.clone(o); c.id = o.id || ('L' + (i + 1)); c.etap = U.clamp(Math.round(U.num(o.etap, nE - 1)), 0, nE - 1);
    if (!S.RODZAJE[c.rodzaj]) { err.push(`Przypadek ${c.id}: nieznany rodzaj oddziaływania.`); return; }
    cases.push(c);
  });
  // normalizacja składników → mm, N
  cases.forEach(c => {
    c.parts = []; c.Nn = U.num(c.N) * 1000; // N [N], + rozciąganie
    (c.sklad || []).forEach((k, j) => {
      const kier = k.kier === 'y' ? 'y' : 'z';
      if (k.typ === 'q') {
        let x0 = U.num(k.x0) * 1000, x1 = (k.x1 === null || k.x1 === '' || k.x1 === undefined) ? L : U.num(k.x1) * 1000;
        x0 = U.clamp(x0, 0, L); x1 = U.clamp(x1, 0, L);
        if (x1 - x0 < 1) { err.push(`${c.id}: obciążenie rozłożone o zerowej długości.`); return; }
        const q0 = U.num(k.q0), q1 = (k.q1 === '' || k.q1 === undefined || k.q1 === null) ? q0 : U.num(k.q1);
        c.parts.push({ typ: 'q', x0, x1, q0, q1, kier, wys: k.wys || 'pas_g', j });
      } else if (k.typ === 'P') {
        const x = U.clamp(U.num(k.x) * 1000, 0, L);
        c.parts.push({ typ: 'P', x, P: U.num(k.P) * 1000, kier, wys: k.wys || 'pas_g', ss: U.num(k.ss, 100), j });
      } else if (k.typ === 'M') {
        c.parts.push({ typ: 'M', x: U.clamp(U.num(k.x) * 1000, 0, L), M: U.num(k.M) * 1e6, kier, j });
      }
    });
  });

  // stężenia boczne
  const stez = (st.stezenia || []).map(s => ({ x: U.num(s.x) * 1000, typ: s.typ || 'boczne', wys: s.wys || 'pas_g', od: U.clamp(Math.round(U.num(s.odEtapu, 0)), 0, nE - 1), bocznieY: s.bocznieY !== false })).filter(s => s.x >= 0 && s.x <= L);
  const ciagle = st.stezenieCiagle || {};

  // siatka
  const keys = [];
  sup.forEach(s => keys.push(s.x)); tmp.forEach(s => keys.push(s.x)); stez.forEach(s => keys.push(s.x));
  seg.forEach(s => { keys.push(s.x0, s.x1); });
  cases.forEach(c => c.parts.forEach(p => { if (p.typ === 'q') keys.push(p.x0, p.x1); else keys.push(p.x); }));
  const hmax = Math.max(20, Math.min(L / 150, 100));
  const xs = L > 0 ? F.mesh(keys, L, hmax) : [0, 1];
  const xl = L > 0 ? F.mesh(keys, L, Math.max(L / 48, 50)) : [0, 1];   // siatka zwichrzeniowa

  // układy podpór w etapach
  const systems = etapy.map((e, s) => sup.concat(tmp.filter(t => s <= t.do)));
  return { L, wL, wP, spans, sup, tmp, seg, segOf, etapy, nE, cases, stez, ciagle, xs, xl, systems, err };
};

/* ------------------------------------------------------- analiza */
// zwraca: an.res[stage][caseId] = { tot:{M,V,w,Mz,Vy,u,R}, seg:[{...}] }, an.xs (punkty próbkowania)
S.analyze = function (md, sec) {
  const E = BS.U.E;
  const EIy = E * sec.Iy, EIz = E * sec.Iz;
  const xsamp = F.sample(F.plane({ xs: md.xs, EI: EIy, supports: [{ x: 0, kv: 'fix', kr: 'fix' }] })).xs;
  const ns = xsamp.length;
  const zero = () => ({ M: new Float64Array(ns), V: new Float64Array(ns), w: new Float64Array(ns), Mz: new Float64Array(ns), Vy: new Float64Array(ns), u: new Float64Array(ns), R: {} });
  const addTo = (A, B, f) => {
    for (let i = 0; i < ns; i++) { A.M[i] += f * B.M[i]; A.V[i] += f * B.V[i]; A.w[i] += f * B.w[i]; A.Mz[i] += f * B.Mz[i]; A.Vy[i] += f * B.Vy[i]; A.u[i] += f * B.u[i]; }
    Object.keys(B.R).forEach(k => { const a = A.R[k] || (A.R[k] = { R: 0, M: 0, Ry: 0 }); const b = B.R[k]; a.R += f * b.R; a.M += f * b.M; a.Ry += f * (b.Ry || 0); });
  };
  const cloneR = (o) => { const z = zero(); addTo(z, o, 1); return z; };
  const supVert = (sys) => sys.map(s => ({ id: s.id, x: s.x, kv: s.kv, kr: s.kr }));
  const supHor = (stage) => {
    const a = md.sup.map(s => ({ id: s.id, x: s.x, kv: 'fix', kr: s.typ === 'utwierdzenie' && s.ltb === 'pelne' ? 'fix' : 0 }));
    md.stez.filter(s => s.bocznieY && s.od <= stage && (s.typ === 'boczne' || s.typ === 'pelne')).forEach((s, i) => { if (!a.some(q => Math.abs(q.x - s.x) < 1)) a.push({ id: 'S' + (i + 1), x: s.x, kv: 'fix', kr: 0 }); });
    return a;
  };
  // rozwiązanie jednej płaszczyzny
  const solveV = (sys, loads) => {
    const r = F.plane({ xs: md.xs, EI: EIy, supports: supVert(sys), dist: loads.dist, point: loads.point, mom: loads.mom });
    const s = F.sample(r), o = zero();
    o.M.set(s.M); o.V.set(s.V); o.w.set(s.w);
    r.reactions.forEach(q => { o.R[q.id] = { R: q.R, M: q.M, Ry: 0 }; });
    return o;
  };
  const solveH = (stage, loads) => {
    const sp = supHor(stage);
    const r = F.plane({ xs: md.xs, EI: EIz, supports: sp, dist: loads.dist, point: loads.point, mom: loads.mom });
    const s = F.sample(r), o = zero();
    o.Mz.set(s.M); o.Vy.set(s.V); o.u.set(s.w);
    r.reactions.forEach(q => { o.R[q.id] = { R: 0, M: 0, Ry: q.R }; });
    return o;
  };
  // obciążenia części przypadku w segmencie (lub całość, gi = -1)
  const loadsOf = (c, gi, kier) => {
    const L = { dist: [], point: [], mom: [] };
    c.parts.forEach(p => {
      if (p.kier !== kier) return;
      const sg = gi >= 0 ? md.seg[gi] : null;
      const sgn = kier === 'z' ? -1 : 1; // grawitacja w dół → q w górę ujemne
      if (p.typ === 'q') {
        let a = p.x0, b = p.x1;
        if (sg) { a = Math.max(a, sg.x0); b = Math.min(b, sg.x1); if (b - a < 1e-6) return; }
        const qa = p.q0 + (p.q1 - p.q0) * (a - p.x0) / (p.x1 - p.x0), qb = p.q0 + (p.q1 - p.q0) * (b - p.x0) / (p.x1 - p.x0);
        L.dist.push({ x0: a, x1: b, q0: sgn * qa, q1: sgn * qb });
      } else if (p.typ === 'P') {
        if (sg && md.segOf(p.x) !== gi) return;
        L.point.push({ x: p.x, P: sgn * p.P });
      } else if (p.typ === 'M') {
        if (sg && md.segOf(p.x) !== gi) return;
        L.mom.push({ x: p.x, M: p.M });
      }
    });
    return L;
  };
  const isEmpty = (L) => !L.dist.length && !L.point.length && !L.mom.length;

  const res = md.etapy.map(() => ({}));
  md.cases.forEach(c => {
    const stale = S.RODZAJE[c.rodzaj].stale;
    const segIdx = md.seg.map((s, i) => i);
    const one = (gi) => {
      // wynik części przypadku dla wszystkich etapów (null – nieaktywny)
      const out = md.etapy.map(() => null);
      const LV = loadsOf(c, gi, 'z'), LH = loadsOf(c, gi, 'y');
      if (isEmpty(LV) && isEmpty(LH)) return out;
      const k = c.etap;
      let acc = isEmpty(LV) ? zero() : solveV(md.systems[k], LV);
      if (!isEmpty(LH)) addTo(acc, solveH(k, LH), 1);
      out[k] = cloneR(acc);
      if (stale) {
        for (let s = k + 1; s < md.nE; s++) {
          const prev = md.systems[s - 1], cur = md.systems[s];
          const removed = prev.filter(p => !cur.some(q => q.id === p.id));
          if (removed.length && !isEmpty(LV)) {
            const pl = { dist: [], point: removed.map(p => ({ x: p.x, P: -((acc.R[p.id] && acc.R[p.id].R) || 0) })), mom: [] };
            const d = solveV(cur, pl);
            removed.forEach(p => { if (acc.R[p.id]) acc.R[p.id].R = 0; });
            addTo(acc, d, 1);
          }
          if (!isEmpty(LH)) { // płaszczyzna pozioma – bez historii (układ etapu s)
            const prevH = solveH(s - 1, LH), curH = solveH(s, LH);
            addTo(acc, prevH, -1); addTo(acc, curH, 1);
          }
          out[s] = cloneR(acc);
        }
      }
      return out;
    };
    const tot = one(-1);
    const parts = segIdx.map(gi => one(gi));
    md.etapy.forEach((e, s) => {
      if (!tot[s]) return;
      res[s][c.id] = { tot: tot[s], seg: parts.map(p => p[s] || zero()), N: c.Nn, c };
    });
  });
  return { xs: Float64Array.from(xsamp), ns, res, zero, addTo };
};

/* wartości w punkcie x (interpolacja liniowa po próbkach; przy nieciągłości – większa |wartość|) */
S.at = function (xs, arr, x) {
  // wyszukiwanie binarne pierwszego indeksu z xs[i] ≥ x − ε
  let lo = 0, hi = xs.length - 1;
  if (x <= xs[0]) return arr[0];
  if (x >= xs[hi]) { let b = arr[hi]; for (let i = hi; i >= 0 && Math.abs(xs[i] - x) < 1e-6; i--) if (Math.abs(arr[i]) > Math.abs(b)) b = arr[i]; return b; }
  while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < x - 1e-6) lo = m + 1; else hi = m; }
  if (lo === 0) return arr[0];
  if (Math.abs(xs[lo] - x) < 1e-6) { let b = arr[lo]; for (let i = lo + 1; i < xs.length && Math.abs(xs[i] - x) < 1e-6; i++) if (Math.abs(arr[i]) > Math.abs(b)) b = arr[i]; return b; }
  const i = lo, t = (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
  return arr[i - 1] + t * (arr[i] - arr[i - 1]);
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
