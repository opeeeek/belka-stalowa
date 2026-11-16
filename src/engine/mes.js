/* =====================================================================
   BelkaStal – metoda elementów skończonych
   • statyka belki Eulera–Bernoulliego (2 st. swobody w węźle: v, θ),
     obciążenia rozłożone liniowo zmienne, siły i momenty skupione,
     podpory sztywne i sprężyste; dokładne M(x), V(x) w elemencie;
   • zwichrzenie sprężyste (4 st. swobody: u, u', φ, φ'): K_E·x = λ·K_G·x,
     wpływ rozkładu momentu, wysokości przyłożenia obciążenia, monosymetrii
     (βz), stężeń bocznych/skrętnych na dowolnej wysokości (sprężyny kary);
   • drgania własne (macierz mas konsystentna) – pierwsza częstotliwość.
   Konwencja: v w górę, obciążenie q w górę dodatnie; M = EI·v'' (dodatni
   moment = rozciągane włókna dolne), V = dM/dx.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS;
const F = BS.FE = {};

/* ------------------------------------------------------- algebra pasmowa */
// macierz symetryczna pasmowa: A[i][k] = a(i, i+k), k = 0..hb
function bandNew(n, hb) { const A = new Array(n); for (let i = 0; i < n; i++) A[i] = new Float64Array(hb + 1); return { n, hb, A }; }
function bandAdd(B, i, j, v) { if (j < i) { const t = i; i = j; j = t; } const k = j - i; if (k > B.hb) throw new Error('poza pasmem'); B.A[i][k] += v; }
function bandGet(B, i, j) { if (j < i) { const t = i; i = j; j = t; } const k = j - i; return k > B.hb ? 0 : B.A[i][k]; }
function bandChol(B) { // in situ: L^T w paśmie (U = L^T)
  const { n, hb, A } = B;
  for (let i = 0; i < n; i++) {
    for (let k = Math.max(0, i - hb); k < i; k++) {
      const uki = A[k][i - k]; if (uki === 0) continue;
      for (let j = i; j <= Math.min(n - 1, k + hb); j++) A[i][j - i] -= uki * A[k][j - k];
    }
    const d = A[i][0];
    if (!(d > 0)) throw new Error('Macierz sztywności nie jest dodatnio określona – układ geometrycznie zmienny (sprawdź podpory).');
    const s = Math.sqrt(d); A[i][0] = s;
    for (let j = i + 1; j <= Math.min(n - 1, i + hb); j++) A[i][j - i] /= s;
  }
  return B;
}
function bandSolve(C, b) { // C – po bandChol; rozwiązuje U^T U x = b
  const { n, hb, A } = C, x = Float64Array.from(b);
  for (let i = 0; i < n; i++) { let s = x[i]; for (let k = Math.max(0, i - hb); k < i; k++) s -= A[k][i - k] * x[k]; x[i] = s / A[i][0]; }
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j <= Math.min(n - 1, i + hb); j++) s -= A[i][j - i] * x[j]; x[i] = s / A[i][0]; }
  return x;
}
function bandMul(B, x) {
  const { n, hb, A } = B, y = new Float64Array(n);
  for (let i = 0; i < n; i++) { y[i] += A[i][0] * x[i]; for (let k = 1; k <= hb && i + k < n; k++) { const a = A[i][k]; if (a) { y[i] += a * x[i + k]; y[i + k] += a * x[i]; } } }
  return y;
}
F.band = { bandNew, bandAdd, bandGet, bandChol, bandSolve, bandMul };

/* ------------------------------------------------------- symetryczne zagadnienie własne (gęste) */
// Householder (tred2) + QL z przesunięciami (tql2) – wartości i wektory własne macierzy symetrycznej
function eigSym(a) {
  const n = a.length, V = a.map(r => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) d[j] = V[n - 1][j];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0;
    for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) { e[i] = d[i - 1]; for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; } }
    else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], g = Math.sqrt(h); if (f > 0) g = -g;
      e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f; }
        e[j] = g;
      }
      f = 0; for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h); for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) { f = d[j]; g = e[j]; for (let k = j; k <= i - 1; k++) V[k][j] -= (f * e[k] + g * d[k]); d[j] = V[i - 1][j]; V[i][j] = 0; }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    V[n - 1][i] = V[i][i]; V[i][i] = 1; const h = d[i + 1];
    if (h !== 0) { for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h; for (let j = 0; j <= i; j++) { let g = 0; for (let k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j]; for (let k = 0; k <= i; k++) V[k][j] -= g * d[k]; } }
    for (let k = 0; k <= i; k++) V[k][i + 1] = 0;
  }
  for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; } V[n - 1][n - 1] = 1; e[0] = 0;
  // tql2
  for (let i = 1; i < n; i++) e[i - 1] = e[i]; e[n - 1] = 0;
  let f = 0, tst1 = 0; const eps = Math.pow(2, -52);
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l; while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
    if (m > l) {
      let iter = 0;
      do {
        iter++; if (iter > 200) break;
        let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1); if (p < 0) r = -r;
        d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r); const dl1 = d[l + 1]; let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h; f += h;
        p = d[m]; let c = 1, c2 = c, c3 = c, el1 = e[l + 1], s = 0, s2 = 0;
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s; g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]); e[i + 1] = s * r; s = e[i] / r; c = p / r; p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
        }
        p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst1);
    }
    d[l] = d[l] + f; e[l] = 0;
  }
  return { d, V };
}
F.eigSym = eigSym;

/* ------------------------------------------------------- siatka */
// keys – położenia obowiązkowych węzłów [mm]; L – długość; hmax – maks. długość elementu
F.mesh = function (keys, L, hmax) {
  const k = Array.from(new Set(keys.concat([0, L]).map(x => Math.round(Math.min(L, Math.max(0, x)) * 1000) / 1000))).sort((a, b) => a - b);
  const xs = [k[0]];
  for (let i = 1; i < k.length; i++) {
    const a = k[i - 1], b = k[i]; if (b - a < 1e-6) continue;
    const n = Math.max(1, Math.ceil((b - a) / hmax - 1e-9));
    for (let j = 1; j <= n; j++) xs.push(a + (b - a) * j / n);
  }
  return xs;
};
F.nodeAt = (xs, x) => { let best = 0, bd = Infinity; for (let i = 0; i < xs.length; i++) { const d = Math.abs(xs[i] - x); if (d < bd) { bd = d; best = i; } } return best; };

/* ------------------------------------------------------- statyka w płaszczyźnie */
// model: { xs, EI, supports:[{x, kv:'fix'|number|0, kr:'fix'|number|0}], dist:[{x0,x1,q0,q1}], point:[{x,P}], mom:[{x,M}] }
// q, P dodatnie w górę (grawitacja – ujemne). Zwraca: v, th (węzły), elementy z siłami końcowymi, reakcje.
F.plane = function (m) {
  const xs = m.xs, ne = xs.length - 1, n = 2 * xs.length, EI = m.EI;
  const K = bandNew(n, 3), f = new Float64Array(n);
  const elq = new Array(ne);
  for (let e = 0; e < ne; e++) elq[e] = [0, 0];
  // obciążenia rozłożone → wartości na końcach elementów (liniowe w elemencie – węzły w punktach załamania)
  (m.dist || []).forEach(d => {
    const L = d.x1 - d.x0; if (!(L > 1e-9)) return;
    for (let e = 0; e < ne; e++) {
      const a = Math.max(xs[e], d.x0), b = Math.min(xs[e + 1], d.x1);
      if (b - a < 1e-9 * Math.max(1, L)) continue;
      const qa = d.q0 + (d.q1 - d.q0) * (xs[e] - d.x0) / L, qb = d.q0 + (d.q1 - d.q0) * (xs[e + 1] - d.x0) / L;
      // element w całości w zakresie (siatka zawiera końce obciążeń)
      elq[e][0] += qa; elq[e][1] += qb;
    }
  });
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], c = EI / (L * L * L), i0 = 2 * e;
    const ke = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]];
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) bandAdd(K, i0 + a, i0 + b, c * ke[a][b]);
    const [q1, q2] = elq[e];
    f[i0] += L * (7 * q1 + 3 * q2) / 20; f[i0 + 1] += L * L * (3 * q1 + 2 * q2) / 60;
    f[i0 + 2] += L * (3 * q1 + 7 * q2) / 20; f[i0 + 3] -= L * L * (2 * q1 + 3 * q2) / 60;
  }
  (m.point || []).forEach(p => { f[2 * F.nodeAt(xs, p.x)] += p.P; });
  (m.mom || []).forEach(p => { f[2 * F.nodeAt(xs, p.x) + 1] += p.M; });
  const Kfull = { n, hb: 3, A: K.A.map(r => Float64Array.from(r)) };
  const fixed = new Set(), springs = [];
  (m.supports || []).forEach(s => {
    const i = F.nodeAt(xs, s.x);
    if (s.kv === 'fix') fixed.add(2 * i); else if (s.kv > 0) { bandAdd(K, 2 * i, 2 * i, s.kv); springs.push({ dof: 2 * i, k: s.kv }); }
    if (s.kr === 'fix') fixed.add(2 * i + 1); else if (s.kr > 0) { bandAdd(K, 2 * i + 1, 2 * i + 1, s.kr); springs.push({ dof: 2 * i + 1, k: s.kr }); }
  });
  fixed.forEach(i => { for (let k = 0; k <= 3; k++) { K.A[i][k] = 0; if (i - k >= 0) K.A[i - k][k] = 0; } K.A[i][0] = 1; f[i] = 0; });
  // stabilizacja: brak podpór w ogóle
  bandChol(K);
  const d = bandSolve(K, f);
  fixed.forEach(i => { d[i] = 0; });
  // siły końcowe elementów
  const els = [];
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], c = EI / (L * L * L), i0 = 2 * e;
    const de = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const ke = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]];
    const [q1, q2] = elq[e];
    const fe = [L * (7 * q1 + 3 * q2) / 20, L * L * (3 * q1 + 2 * q2) / 60, L * (3 * q1 + 7 * q2) / 20, -L * L * (2 * q1 + 3 * q2) / 60];
    const Fe = [0, 1, 2, 3].map(a => c * (ke[a][0] * de[0] + ke[a][1] * de[1] + ke[a][2] * de[2] + ke[a][3] * de[3]) - fe[a]);
    els.push({ x0: xs[e], x1: xs[e + 1], L, q1, q2, F1: Fe[0], M1: Fe[1], F2: Fe[2], M2: Fe[3], v1: de[0], t1: de[1], v2: de[2], t2: de[3] });
  }
  // reakcje: R = K·d − f w stopniach podpartych (pełna macierz) + sprężyny
  const Kd = bandMul(Kfull, d);
  const f0 = new Float64Array(n);
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], [q1, q2] = elq[e], i0 = 2 * e;
    f0[i0] += L * (7 * q1 + 3 * q2) / 20; f0[i0 + 1] += L * L * (3 * q1 + 2 * q2) / 60; f0[i0 + 2] += L * (3 * q1 + 7 * q2) / 20; f0[i0 + 3] -= L * L * (2 * q1 + 3 * q2) / 60;
  }
  (m.point || []).forEach(p => { f0[2 * F.nodeAt(xs, p.x)] += p.P; });
  (m.mom || []).forEach(p => { f0[2 * F.nodeAt(xs, p.x) + 1] += p.M; });
  const reactions = (m.supports || []).map(s => {
    const i = F.nodeAt(xs, s.x);
    let R = 0, Mr = 0;
    if (s.kv === 'fix') R = Kd[2 * i] - f0[2 * i]; else if (s.kv > 0) R = -s.kv * d[2 * i];
    if (s.kr === 'fix') Mr = Kd[2 * i + 1] - f0[2 * i + 1]; else if (s.kr > 0) Mr = -s.kr * d[2 * i + 1];
    return { x: s.x, R, M: Mr, id: s.id };
  });
  return { xs, d, els, reactions };
};

// próbkowanie wyników: punkty = końce elementów (wartości lewo/prawo przy nieciągłościach) + środki
F.sample = function (res) {
  const xs = [], M = [], V = [], w = [];
  res.els.forEach(el => {
    const { L, q1, q2, F1, M1 } = el;
    const at = (t) => {
      const x = t * L;
      const Q = q1 * x + (q2 - q1) * x * x / (2 * L);
      const QQ = q1 * x * x / 2 + (q2 - q1) * x * x * x / (6 * L);
      // ugięcie: interpolacja Hermite'a (+ niewielki składnik od obciążenia pominięty – siatka gęsta)
      const N1 = 1 - 3 * t * t + 2 * t * t * t, N2 = L * (t - 2 * t * t + t * t * t), N3 = 3 * t * t - 2 * t * t * t, N4 = L * (-t * t + t * t * t);
      return { x: el.x0 + x, V: F1 + Q, M: -M1 + F1 * x + QQ, v: N1 * el.v1 + N2 * el.t1 + N3 * el.v2 + N4 * el.t2 };
    };
    [0, 0.5, 1].forEach(t => { const r = at(t); xs.push(r.x); M.push(r.M); V.push(r.V); w.push(-r.v); });
  });
  return { xs, M, V, w };
};

/* ------------------------------------------------------- zwichrzenie – zagadnienie własne */
// Funkcje kształtu Hermite'a i pochodne w punkcie ξ ∈ [0,1] dla elementu długości L
function herm(t, L) {
  const N = [1 - 3 * t * t + 2 * t ** 3, L * (t - 2 * t * t + t ** 3), 3 * t * t - 2 * t ** 3, L * (-t * t + t ** 3)];
  const d1 = [(-6 * t + 6 * t * t) / L, 1 - 4 * t + 3 * t * t, (6 * t - 6 * t * t) / L, -2 * t + 3 * t * t];
  const d2 = [(-6 + 12 * t) / (L * L), (-4 + 6 * t) / L, (6 - 12 * t) / (L * L), (-2 + 6 * t) / L];
  return { N, d1, d2 };
}
const GP4 = [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461], [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]];

/* m: { xs, EIz, EIw, GIt, betaZ,
        Mfun(e) -> [Ma, Mm, Mb] moment w elemencie (dodatni – ściskany pas górny),
        qe(e) -> [{w0, w1, e}] obciążenia rozłożone w dół [N/mm] i wysokość nad środkiem ścinania [mm],
        pts: [{x, P, e}] siły skupione w dół,
        bc: [{x, u, du, phi, dphi}] – więzy sztywne (true),
        springs: [{x, k, zr}] (boczne na wysokości zr nad ŚŚ), [{x, kt}] (skrętne) }
   Zwraca λcr (najmniejsza dodatnia) i postać (u, φ w węzłach). */
F.ltb = function (m) {
  const xs = m.xs, ne = xs.length - 1, nn = xs.length, n = 4 * nn, HB = 7;
  const KE = bandNew(n, HB), KG = bandNew(n, HB);
  const ke = [], kg = [];
  for (let a = 0; a < 8; a++) { ke.push(new Float64Array(8)); kg.push(new Float64Array(8)); }
  const UI = [0, 1, 4, 5], PI = [2, 3, 6, 7];
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e];
    for (let a = 0; a < 8; a++) { ke[a].fill(0); kg[a].fill(0); }
    const [Ma, Mm, Mb] = m.Mfun(e);
    const ql = m.qe ? m.qe(e) : [];
    for (const [g, wg] of GP4) {
      const t = (g + 1) / 2, W = wg * L / 2, H = herm(t, L);
      const Mx = Ma * (1 - t) * (1 - 2 * t) + Mm * 4 * t * (1 - t) + Mb * t * (2 * t - 1);
      let qh = 0; for (const q of ql) qh += (q.w0 + (q.w1 - q.w0) * t) * q.e;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        ke[UI[a]][UI[b]] += W * m.EIz * H.d2[a] * H.d2[b];
        ke[PI[a]][PI[b]] += W * (m.EIw * H.d2[a] * H.d2[b] + m.GIt * H.d1[a] * H.d1[b]);
        // K_L = −M(u''φ + φu'') + M·βz·φ'φ' − q·e·φφ ;  K_G = −K_L
        const c = -Mx * H.d2[a] * H.N[b];
        kg[UI[a]][PI[b]] -= W * c; kg[PI[b]][UI[a]] -= W * c;
        kg[PI[a]][PI[b]] -= W * (Mx * (m.betaZ || 0) * H.d1[a] * H.d1[b] - qh * H.N[a] * H.N[b]);
      }
    }
    const i0 = 4 * e;
    for (let a = 0; a < 8; a++) for (let b = a; b < 8; b++) { if (ke[a][b]) bandAdd(KE, i0 + a, i0 + b, ke[a][b]); if (kg[a][b]) bandAdd(KG, i0 + a, i0 + b, kg[a][b]); }
  }
  (m.pts || []).forEach(p => { const i = F.nodeAt(xs, p.x); bandAdd(KG, 4 * i + 2, 4 * i + 2, p.P * p.e); });
  // sprężyny (kara) – skala względem sztywności
  const Lt = xs[nn - 1] - xs[0], kref = Math.max(m.EIz, m.GIt * Lt * Lt / 10, m.EIw / (Lt * Lt)) / Math.pow(Lt / 20, 3) * 1e4;
  (m.springs || []).forEach(s => {
    const i = F.nodeAt(xs, s.x), a = 4 * i, b = 4 * i + 2;
    if (s.zr !== undefined && s.k !== 0) { const k = s.k === 'rigid' || s.k === undefined ? kref : s.k; bandAdd(KE, a, a, k); bandAdd(KE, a, b, -k * s.zr); bandAdd(KE, b, b, k * s.zr * s.zr); }
    if (s.kt) { const k = s.kt === 'rigid' ? kref * Lt * Lt : s.kt; bandAdd(KE, b, b, k); }
  });
  // więzy sztywne: wiersz/kolumna jednostkowa w K_E, zerowa w K_G
  const fixed = new Set();
  (m.bc || []).forEach(b => { const i = F.nodeAt(xs, b.x); if (b.u) fixed.add(4 * i); if (b.du) fixed.add(4 * i + 1); if (b.phi) fixed.add(4 * i + 2); if (b.dphi) fixed.add(4 * i + 3); });
  fixed.forEach(i => { for (let k = 0; k <= HB; k++) { KE.A[i][k] = 0; KG.A[i][k] = 0; if (i - k >= 0) { KE.A[i - k][k] = 0; KG.A[i - k][k] = 0; } } KE.A[i][0] = 1; });
  try { bandChol(KE); } catch (e) { return { lam: NaN, err: 'Układ zwichrzeniowy geometrycznie zmienny – brak wystarczających więzów bocznych/skrętnych (podpory widełkowe?).' }; }
  // operator symetryczny A = U^-T·K_G·U^-1 (K_E = U^T U)
  const A = KE.A;
  const solveU = (x) => { const y = Float64Array.from(x); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let j = i + 1; j <= Math.min(n - 1, i + HB); j++) s -= A[i][j - i] * y[j]; y[i] = s / A[i][0]; } return y; };
  const solveUT = (x) => { const y = Float64Array.from(x); for (let i = 0; i < n; i++) { let s = y[i]; for (let k = Math.max(0, i - HB); k < i; k++) s -= A[k][i - k] * y[k]; y[i] = s / A[i][0]; } return y; };
  const op = (x) => solveUT(bandMul(KG, solveU(x)));
  // Lanczos z pełną reortogonalizacją – skrajne wartości własne
  const mMax = Math.min(n - fixed.size, 80);
  const Q = [], al = [], be = [];
  let q = new Float64Array(n);
  for (let i = 0; i < n; i++) q[i] = fixed.has(i) ? 0 : Math.sin(0.37 * i + 1) + 0.3 * Math.cos(1.7 * i);
  let nq = Math.sqrt(q.reduce((s, v) => s + v * v, 0)); for (let i = 0; i < n; i++) q[i] /= nq;
  let bPrev = 0, qPrev = null, muBest = 0, sBest = null, kBest = 0;
  for (let k = 0; k < mMax; k++) {
    Q.push(q);
    let w = op(q);
    let a = 0; for (let i = 0; i < n; i++) a += w[i] * q[i];
    al.push(a);
    for (let i = 0; i < n; i++) w[i] -= a * q[i] + (qPrev ? bPrev * qPrev[i] : 0);
    for (let r = 0; r < 2; r++) for (const v of Q) { let d = 0; for (let i = 0; i < n; i++) d += w[i] * v[i]; for (let i = 0; i < n; i++) w[i] -= d * v[i]; }
    const b = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    // wartości Ritza
    if (k >= 4 && (k % 4 === 0 || b < 1e-12 || k === mMax - 1)) {
      const m2 = al.length, Tm = [];
      for (let i = 0; i < m2; i++) { const row = new Float64Array(m2); row[i] = al[i]; if (i > 0) row[i - 1] = be[i - 1]; if (i < m2 - 1) row[i + 1] = be[i]; Tm.push(row); }
      const { d, V } = eigSym(Tm);
      let kk = -1, mu = 0; for (let j = 0; j < m2; j++) if (d[j] > mu) { mu = d[j]; kk = j; }
      if (kk >= 0) {
        const s = new Float64Array(m2); for (let j = 0; j < m2; j++) s[j] = V[j][kk];
        const res = Math.abs(b * s[m2 - 1]);
        const conv = Math.abs(mu - muBest) <= 1e-9 * Math.abs(mu) && res <= 1e-6 * Math.abs(mu);
        muBest = mu; sBest = s; kBest = m2;
        if (conv) break;
      }
    }
    if (b < 1e-12) break;
    be.push(b); qPrev = q; bPrev = b;
    q = new Float64Array(n); for (let i = 0; i < n; i++) q[i] = w[i] / b;
  }
  if (!(muBest > 1e-14) || !sBest) return { lam: Infinity, mode: null };
  const y = new Float64Array(n); for (let j = 0; j < kBest; j++) { const c = sBest[j]; const v = Q[j]; for (let i = 0; i < n; i++) y[i] += c * v[i]; }
  const full = solveU(y); fixed.forEach(i => { full[i] = 0; });
  const u = [], phi = [];
  for (let i = 0; i < nn; i++) { u.push(full[4 * i]); phi.push(full[4 * i + 2]); }
  return { lam: 1 / muBest, mode: { xs: xs.slice(), u, phi } };
};

/* ------------------------------------------------------- drgania własne (płaszczyzna pionowa) */
// m: { xs, EI, mass: [{x0,x1,m}] [kg/mm → t/mm w jednostkach N-mm-s: m w t/mm], pm: [{x, m}], supports }
F.freq = function (m) {
  const xs = m.xs, ne = xs.length - 1, n = 2 * xs.length, EI = m.EI;
  const K = bandNew(n, 3), Mm = bandNew(n, 3);
  for (let e = 0; e < ne; e++) {
    const L = xs[e + 1] - xs[e], c = EI / L ** 3, i0 = 2 * e;
    const ke = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]];
    let mu = 0; const xm = (xs[e] + xs[e + 1]) / 2;
    (m.mass || []).forEach(q => { if (xm >= q.x0 && xm <= q.x1) mu += q.m; });
    const cm = mu * L / 420;
    const me = [[156, 22 * L, 54, -13 * L], [22 * L, 4 * L * L, 13 * L, -3 * L * L], [54, 13 * L, 156, -22 * L], [-13 * L, -3 * L * L, -22 * L, 4 * L * L]];
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) { bandAdd(K, i0 + a, i0 + b, c * ke[a][b]); bandAdd(Mm, i0 + a, i0 + b, cm * me[a][b]); }
  }
  (m.pm || []).forEach(p => { const i = F.nodeAt(xs, p.x); bandAdd(Mm, 2 * i, 2 * i, p.m); });
  const fixed = new Set();
  (m.supports || []).forEach(s => { const i = F.nodeAt(xs, s.x); if (s.kv === 'fix') fixed.add(2 * i); else if (s.kv > 0) bandAdd(K, 2 * i, 2 * i, s.kv); if (s.kr === 'fix') fixed.add(2 * i + 1); else if (s.kr > 0) bandAdd(K, 2 * i + 1, 2 * i + 1, s.kr); });
  fixed.forEach(i => { for (let k = 0; k <= 3; k++) { K.A[i][k] = 0; Mm.A[i][k] = 0; if (i - k >= 0) { K.A[i - k][k] = 0; Mm.A[i - k][k] = 0; } } K.A[i][0] = 1; });
  bandChol(K);
  let x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = fixed.has(i) ? 0 : (i % 2 === 0 ? Math.sin(Math.PI * (xs[i >> 1] - xs[0]) / (xs[ne] - xs[0]) + 0.3) : 0.001);
  let lam = 0;
  for (let it = 0; it < 500; it++) {
    const y = bandSolve(K, bandMul(Mm, x)); fixed.forEach(i => { y[i] = 0; });
    const My = bandMul(Mm, y); let num = 0, den = 0; const Mx = bandMul(Mm, x);
    for (let i = 0; i < n; i++) { num += y[i] * Mx[i]; den += y[i] * My[i]; }
    const lnew = num / den; // iloraz Rayleigha: ω² = yᵀKy / yᵀMy = yᵀMx / yᵀMy
    let s = 0; for (let i = 0; i < n; i++) s += y[i] * My[i]; s = Math.sqrt(s) || 1;
    for (let i = 0; i < n; i++) x[i] = y[i] / s;
    if (it > 5 && Math.abs(lnew - lam) < 1e-12 * Math.abs(lnew)) { lam = lnew; break; }
    lam = lnew;
  }
  const w2 = lam;
  const f = Math.sqrt(Math.abs(w2)) / (2 * Math.PI);
  const shape = []; for (let i = 0; i < xs.length; i++) shape.push(x[2 * i]);
  return { f, shape };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
