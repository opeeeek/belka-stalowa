/* =====================================================================
   BelkaStal – kombinacje oddziaływań wg PN-EN 1990 (zał. A1)
   SGN STR: 6.10 lub mniej korzystna z 6.10a i 6.10b (sytuacje trwałe
   i przejściowe – etapy realizacji), sytuacja wyjątkowa 6.11b, sytuacja
   pożarowa, SGU: charakterystyczna 6.14b, częsta 6.15b, quasi-stała 6.16b,
   kombinacja do doboru stali (PN-EN 1993-1-10, 2.2(5)), EQU – obwiednia
   reakcji z rozdziałem G na części korzystne/niekorzystne.
   Obciążenia stałe – „jednolite źródło” (γG,sup lub γG,inf dla całości),
   zmienne – wybór podzbiorów, wiodące, grupy wykluczające się,
   układy szachownicowe w przęsłach.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, N = BS.N, S = BS.S;
const K = BS.K = {};

K.psi = function (c) {
  if (Array.isArray(c.psi) && c.psi.length === 3 && c.psi.every(v => v !== '' && v !== null && isFinite(+v))) return c.psi.map(Number);
  const R = S.RODZAJE[c.rodzaj];
  if (!R || !R.psiKey) return [1, 1, 1];
  const e = N.PSI[R.psiKey(c)];
  return e ? e.p.slice() : [1, 1, 1];
};

// układy obciążenia przęseł (indeksy segmentów)
K.patterns = function (md) {
  const n = md.seg.length;
  const all = md.seg.map((s, i) => i);
  if (n <= 1) return [{ id: 'all', n: 'wszystkie', set: all }];
  const P = [{ id: 'all', n: 'wszystkie segmenty', set: all }];
  const odd = all.filter(i => i % 2 === 0), even = all.filter(i => i % 2 === 1);
  P.push({ id: 'odd', n: 'segmenty ' + odd.map(i => md.seg[i].n).join(', '), set: odd });
  if (even.length) P.push({ id: 'even', n: 'segmenty ' + even.map(i => md.seg[i].n).join(', '), set: even });
  for (let j = 0; j < n - 1; j++) {
    const set = all.filter(i => i === j || i === j + 1 || (i < j && (j - i) % 2 === 0) || (i > j + 1 && (i - j - 1) % 2 === 0));
    const key = set.join(',');
    if (!P.some(p => p.set.join(',') === key)) P.push({ id: 'adj' + j, n: 'przy podporze ' + (md.seg[j].x1 / 1000).toFixed(2) + ' m: ' + set.map(i => md.seg[i].n).join(', '), set });
  }
  return P;
};

const fmtF = (f) => U.fmt(f, 3).replace(/,?0+$/, '').replace(/,$/, '');

/* generacja kombinacji dla etapu s */
K.generate = function (md, an, ndp, opt) {
  opt = opt || {};
  const out = [], warn = [];
  const kfi = +ndp.KFI || 1;
  const gS = ndp.gG_sup * kfi, gI = ndp.gG_inf, gQ = ndp.gQ * kfi, xi = ndp.xi;
  const pats = K.patterns(md);
  const finalS = md.nE - 1;
  const seen = new Set();
  const push = (c) => {
    const key = c.typ + '|' + c.etap + '|' + c.terms.map(t => t.id + (t.seg ? ':' + t.seg.join('.') : '') + '=' + t.f.toFixed(5)).sort().join(';');
    if (seen.has(key)) return; seen.add(key);
    c.id = c.typ + (out.filter(o => o.typ === c.typ).length + 1);
    out.push(c);
  };
  for (let s = 0; s < md.nE; s++) {
    const R = an.res[s] || {};
    const ids = Object.keys(R);
    const Gc = ids.filter(k => S.RODZAJE[R[k].c.rodzaj].stale);
    const Ac = ids.filter(k => R[k].c.rodzaj === 'A' && R[k].c.etap === s);
    const Vc = ids.filter(k => !S.RODZAJE[R[k].c.rodzaj].stale && R[k].c.rodzaj !== 'A' && R[k].c.etap === s);
    // sloty: grupy wykluczające się
    const slots = [], grp = {};
    Vc.forEach(k => { const w = (R[k].c.wyklucz || '').trim(); if (w) { if (!grp[w]) { grp[w] = []; slots.push(grp[w]); } grp[w].push(k); } else slots.push([k]); });
    let choices = [[]];
    const total = slots.reduce((p, sl) => p * (sl.length + 1), 1);
    if (total <= 1024) {
      slots.forEach(sl => { const nx = []; choices.forEach(ch => { nx.push(ch); sl.forEach(k => nx.push(ch.concat([k]))); }); choices = nx; });
    } else {
      warn.push(`Etap ${s + 1}: ${slots.length} niezależnych oddziaływań zmiennych – ograniczono przegląd podzbiorów (wszystkie razem lub pojedynczo).`);
      choices = [[]]; slots.forEach(sl => sl.forEach(k => choices.push([k])));
      const allFirst = slots.map(sl => sl[0]); choices.push(allFirst);
    }
    const patterned = (k) => R[k].c.uklad === 'szachownica' && md.seg.length > 1;
    const sit = md.etapy[s].typ === 'montaz' ? 'przejściowa' : 'trwała';
    const term = (k, f, pat) => ({ id: k, f, seg: pat && patterned(k) ? pat.set : null });
    const desc = (parts) => parts.filter(p => p).join(' + ');
    const lbl = (k) => R[k].c.id;
    const mk = (typ, gf, lead, acc, accF, leadF, pat, form) => {
      const terms = Gc.map(k => ({ id: k, f: gf, seg: null }));
      if (lead) terms.push(term(lead, leadF, pat));
      acc.forEach((k, i) => { if (accF[i] > 0) terms.push(term(k, accF[i], pat)); });
      const ps = [];
      if (Gc.length) ps.push(fmtF(gf) + '·G');
      if (lead) ps.push(fmtF(leadF) + '·' + lbl(lead));
      acc.forEach((k, i) => { if (accF[i] > 0) ps.push(fmtF(accF[i]) + '·' + lbl(k)); });
      const usesPat = pat && terms.some(t => t.seg);
      return { typ, etap: s, sytuacja: typ === 'SGN' ? sit : typ, forma: form, gf, lead: lead || null, terms, opis: (form ? form + ': ' : '') + desc(ps) + (usesPat ? ` [układ: ${pat.n}]` : ''), pat: usesPat ? pat.id : 'all' };
    };
    choices.forEach(ch => {
      const pList = ch.some(patterned) ? pats : [pats[0]];
      pList.forEach(pat => {
        const psi = (k) => K.psi(R[k].c);
        // ---- SGN (STR)
        [gS, gI].forEach(gf => {
          if (!ch.length) { push(mk('SGN', gf, null, [], [], 0, pat, '6.10')); return; }
          if (ndp.komb === '6.10') {
            ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('SGN', gf, L, acc, acc.map(k => gQ * psi(k)[0]), gQ, pat, '6.10')); });
          } else {
            push(mk('SGN', gf, null, ch, ch.map(k => gQ * psi(k)[0]), 0, pat, '6.10a'));
            ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('SGN', gf === gS ? xi * gS : gI, L, acc, acc.map(k => gQ * psi(k)[0]), gQ, pat, '6.10b')); });
          }
        });
        // ---- SGU charakterystyczna (wszystkie etapy – ugięcia montażowe informacyjnie)
        if (!ch.length) push(mk('char', 1, null, [], [], 0, pat, '6.14b'));
        ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('char', 1, L, acc, acc.map(k => psi(k)[0]), 1, pat, '6.14b')); });
        if (s !== finalS) return;
        // ---- częsta, quasi-stała, do doboru stali (kruche pękanie)
        if (!ch.length) { push(mk('czest', 1, null, [], [], 0, pat, '6.15b')); push(mk('qp', 1, null, [], [], 0, pat, '6.16b')); push(mk('kruche', 1, null, [], [], 0, pat, 'PN-EN 1993-1-10 (2.6)')); }
        ch.forEach(L => {
          const acc = ch.filter(k => k !== L);
          push(mk('czest', 1, L, acc, acc.map(k => psi(k)[2]), psi(L)[1], pat, '6.15b'));
          push(mk('kruche', 1, L, acc, acc.map(k => psi(k)[2]), psi(L)[1], pat, 'PN-EN 1993-1-10 (2.6)'));
        });
        if (ch.length) push(mk('qp', 1, null, ch, ch.map(k => psi(k)[2]), 0, pat, '6.16b'));
        // ---- pożar
        if (opt.pozar) {
          const pf = (k) => (ndp.psiAcc === 'psi2' ? psi(k)[2] : psi(k)[1]);
          if (!ch.length) push(mk('poz', 1, null, [], [], 0, pat, '6.11b (pożar)'));
          ch.forEach(L => { const acc = ch.filter(k => k !== L); push(mk('poz', 1, L, acc, acc.map(k => psi(k)[2]), pf(L), pat, '6.11b (pożar)')); });
        }
        // ---- wyjątkowa
        Ac.forEach(A => {
          const pf = (k) => (ndp.psiAcc === 'psi2' ? psi(k)[2] : psi(k)[1]);
          const base = (L, acc, accF, lf) => { const c = mk('wyj', 1, L, acc, accF, lf, pat, '6.11b'); c.terms.push({ id: A, f: 1, seg: null }); c.opis = c.opis.replace('6.11b: ', '6.11b: ' + lbl(A) + ' + '); return c; };
          if (!ch.length) push(base(null, [], [], 0));
          ch.forEach(L => { const acc = ch.filter(k => k !== L); push(base(L, acc, acc.map(k => psi(k)[2]), pf(L))); });
        });
      });
    });
  }
  return { list: out, warn };
};

/* ewaluacja kombinacji: zwraca tablice wyników w punktach próbkowania */
K.evaluate = function (an, c) {
  const z = an.zero(); let Nsum = 0;
  const R = an.res[c.etap];
  c.terms.forEach(t => {
    const r = R[t.id]; if (!r) return;
    if (t.seg) t.seg.forEach(gi => an.addTo(z, r.seg[gi], t.f));
    else an.addTo(z, r.tot, t.f);
    // siła osiowa: przy układzie szachownicowym przyjęto pełną wartość N przypadku
    Nsum += t.f * (r.N || 0);
  });
  z.N = Nsum;
  return z;
};

/* EQU – minimalne (i maksymalne) reakcje pionowe podpór: obwiednia z rozdziałem
   G na segmenty (γG,sup = 1,10 / γG,inf = 0,90) i zmiennych niekorzystnych */
K.equ = function (md, an, ndp) {
  const out = [];
  for (let s = 0; s < md.nE; s++) {
    const R = an.res[s] || {}, ids = Object.keys(R);
    md.systems[s].forEach(sp => {
      let rmin = 0, rmax = 0, rk = 0;
      const vars = [];
      ids.forEach(k => {
        const r = R[k], c = r.c, st = S.RODZAJE[c.rodzaj].stale;
        if (c.rodzaj === 'A') return;
        const segVals = r.seg.map(g => (g.R[sp.id] ? g.R[sp.id].R : 0));
        if (st) {
          segVals.forEach(v => { rmin += v > 0 ? ndp.gG_inf_equ * v : ndp.gG_sup_equ * v; rmax += v > 0 ? ndp.gG_sup_equ * v : ndp.gG_inf_equ * v; rk += v; });
        } else if (c.etap === s) {
          const psi0 = K.psi(c)[0];
          const neg = segVals.reduce((a, v) => a + Math.min(0, v), 0), pos = segVals.reduce((a, v) => a + Math.max(0, v), 0);
          vars.push({ k, neg, pos, psi0, grp: (c.wyklucz || '').trim() });
        }
      });
      // wiodące = największy wpływ niekorzystny; grupy wykluczające się – jedno z grupy
      const pick = (sel) => {
        const byGrp = {}; const list = [];
        vars.forEach(v => { const val = sel(v); if (val === 0) return; if (v.grp) { if (!byGrp[v.grp] || Math.abs(val) > Math.abs(sel(byGrp[v.grp]))) byGrp[v.grp] = v; } else list.push(v); });
        return list.concat(Object.values(byGrp));
      };
      const negV = pick(v => v.neg), posV = pick(v => v.pos);
      const comb = (arr, key) => { let best = 0; arr.forEach(L => { let t = ndp.gQ_equ * L[key]; arr.forEach(o => { if (o !== L) t += ndp.gQ_equ * o.psi0 * o[key]; }); if (Math.abs(t) > Math.abs(best)) best = t; }); return best; };
      out.push({ etap: s, id: sp.id, x: sp.x, tymcz: sp.tymcz, Rmin: rmin + comb(negV, 'neg'), Rmax: rmax + comb(posV, 'pos'), RkG: rk });
    });
  }
  return out;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
