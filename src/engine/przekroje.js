/* =====================================================================
   BelkaStal – przekroje: kształtowniki walcowane (IPE, HEA, HEB, HEM wg
   wymiarów PN-EN 10365) i dwuteowniki spawane (bi- i monosymetryczne).
   Charakterystyki liczone z geometrii (wielobok z zaokrągleniami r):
   A, Iy, Iz, Wel, Wpl (oś obojętna plastyczna), It, Iw, środek ścinania,
   współczynnik Wagnera βz (monosymetria – zwichrzenie).
   Układ: y – poziomo (oś środnika y = 0), z – pionowo od spodu.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U;
const P = BS.P = {};

/* [h, b, tw, tf, r] mm */
P.SERIE = {
  IPE: { 80: [80, 46, 3.8, 5.2, 5], 100: [100, 55, 4.1, 5.7, 7], 120: [120, 64, 4.4, 6.3, 7], 140: [140, 73, 4.7, 6.9, 7], 160: [160, 82, 5.0, 7.4, 9],
    180: [180, 91, 5.3, 8.0, 9], 200: [200, 100, 5.6, 8.5, 12], 220: [220, 110, 5.9, 9.2, 12], 240: [240, 120, 6.2, 9.8, 15], 270: [270, 135, 6.6, 10.2, 15],
    300: [300, 150, 7.1, 10.7, 15], 330: [330, 160, 7.5, 11.5, 18], 360: [360, 170, 8.0, 12.7, 18], 400: [400, 180, 8.6, 13.5, 21], 450: [450, 190, 9.4, 14.6, 21],
    500: [500, 200, 10.2, 16.0, 21], 550: [550, 210, 11.1, 17.2, 24], 600: [600, 220, 12.0, 19.0, 24] },
  HEA: { 100: [96, 100, 5, 8, 12], 120: [114, 120, 5, 8, 12], 140: [133, 140, 5.5, 8.5, 12], 160: [152, 160, 6, 9, 15], 180: [171, 180, 6, 9.5, 15],
    200: [190, 200, 6.5, 10, 18], 220: [210, 220, 7, 11, 18], 240: [230, 240, 7.5, 12, 21], 260: [250, 260, 7.5, 12.5, 24], 280: [270, 280, 8, 13, 24],
    300: [290, 300, 8.5, 14, 27], 320: [310, 300, 9, 15.5, 27], 340: [330, 300, 9.5, 16.5, 27], 360: [350, 300, 10, 17.5, 27], 400: [390, 300, 11, 19, 27],
    450: [440, 300, 11.5, 21, 27], 500: [490, 300, 12, 23, 27], 550: [540, 300, 12.5, 24, 27], 600: [590, 300, 13, 25, 27], 650: [640, 300, 13.5, 26, 27],
    700: [690, 300, 14.5, 27, 27], 800: [790, 300, 15, 28, 30], 900: [890, 300, 16, 30, 30], 1000: [990, 300, 16.5, 31, 30] },
  HEB: { 100: [100, 100, 6, 10, 12], 120: [120, 120, 6.5, 11, 12], 140: [140, 140, 7, 12, 12], 160: [160, 160, 8, 13, 15], 180: [180, 180, 8.5, 14, 15],
    200: [200, 200, 9, 15, 18], 220: [220, 220, 9.5, 16, 18], 240: [240, 240, 10, 17, 21], 260: [260, 260, 10, 17.5, 24], 280: [280, 280, 10.5, 18, 24],
    300: [300, 300, 11, 19, 27], 320: [320, 300, 11.5, 20.5, 27], 340: [340, 300, 12, 21.5, 27], 360: [360, 300, 12.5, 22.5, 27], 400: [400, 300, 13.5, 24, 27],
    450: [450, 300, 14, 26, 27], 500: [500, 300, 14.5, 28, 27], 550: [550, 300, 15, 29, 27], 600: [600, 300, 15.5, 30, 27], 650: [650, 300, 16, 31, 27],
    700: [700, 300, 17, 32, 27], 800: [800, 300, 17.5, 33, 30], 900: [900, 300, 18.5, 35, 30], 1000: [1000, 300, 19, 36, 30] },
  HEM: { 100: [120, 106, 12, 20, 12], 120: [140, 126, 12.5, 21, 12], 140: [160, 146, 13, 22, 12], 160: [180, 166, 14, 23, 15], 180: [200, 186, 14.5, 24, 15],
    200: [220, 206, 15, 25, 18], 220: [240, 226, 15.5, 26, 18], 240: [270, 248, 18, 32, 21], 260: [290, 268, 18, 32.5, 24], 280: [310, 288, 18.5, 33, 24],
    300: [340, 310, 21, 39, 27], 320: [359, 309, 21, 40, 27], 340: [377, 309, 21, 40, 27], 360: [395, 308, 21, 40, 27], 400: [432, 307, 21, 40, 27],
    450: [478, 307, 21, 40, 27], 500: [524, 306, 21, 40, 27], 550: [572, 306, 21, 40, 27], 600: [620, 305, 21, 40, 27] }
};
P.lista = (seria) => Object.keys(P.SERIE[seria] || {}).map(Number).sort((a, b) => a - b);

/* ---------------------------------------------------------- wielobok */
function arc(pts, cx, cy, r, a0, a1, n) {
  for (let i = 1; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
}
// kontur dwuteownika (CCW).  g – pas górny, d – pas dolny.
P.polygon = function (g) {
  const { h, tw } = g, bt = g.bg, tt = g.tg, bb = g.bd, tb = g.td, r = g.r || 0, n = 24;
  const pts = [];
  const H = Math.PI / 2;
  pts.push([-bb / 2, 0], [bb / 2, 0], [bb / 2, tb]);
  if (r > 0) { pts.push([tw / 2 + r, tb]); arc(pts, tw / 2 + r, tb + r, r, -H, -2 * H, n); pts.push([tw / 2, tb + r]); } else pts.push([tw / 2, tb]);
  if (r > 0) { pts.push([tw / 2, h - tt - r]); arc(pts, tw / 2 + r, h - tt - r, r, 2 * H, H, n); pts.push([tw / 2 + r, h - tt]); } else pts.push([tw / 2, h - tt]);
  pts.push([bt / 2, h - tt], [bt / 2, h], [-bt / 2, h], [-bt / 2, h - tt]);
  if (r > 0) { pts.push([-tw / 2 - r, h - tt]); arc(pts, -tw / 2 - r, h - tt - r, r, H, 0, n); pts.push([-tw / 2, h - tt - r]); } else pts.push([-tw / 2, h - tt]);
  if (r > 0) { pts.push([-tw / 2, tb + r]); arc(pts, -tw / 2 - r, tb + r, r, 0, -H, n); pts.push([-tw / 2 - r, tb]); } else pts.push([-tw / 2, tb]);
  pts.push([-bb / 2, tb]);
  return pts;
};

/* całki po wieloboku: A, ∫y, ∫z, ∫y², ∫z², ∫z³, ∫y²z (kwadratura trójkątna – dokładna dla wielomianów st. 3) */
const TRI = [[1 / 3, 1 / 3, -27 / 48], [0.6, 0.2, 25 / 48], [0.2, 0.6, 25 / 48], [0.2, 0.2, 25 / 48]];
P.integrals = function (pts, z0) {
  const o = { A: 0, Sy: 0, Sz: 0, Iyy: 0, Izz: 0, Iz3: 0, Iy2z: 0 }; // Iyy = ∫z² (zginanie względem y), Izz = ∫y²
  const zr = z0 || 0;
  for (let i = 0; i < pts.length; i++) {
    const [y1, a1] = pts[i], [y2, a2] = pts[(i + 1) % pts.length];
    const z1 = a1 - zr, z2 = a2 - zr;
    const c = y1 * z2 - y2 * z1, area = c / 2;
    if (area === 0) continue;
    o.A += area;
    for (const [s, t, w] of TRI) {
      const y = s * y1 + t * y2, z = s * z1 + t * z2, W = w * area;
      o.Sy += W * y; o.Sz += W * z; o.Iyy += W * z * z; o.Izz += W * y * y; o.Iz3 += W * z * z * z; o.Iy2z += W * y * y * z;
    }
  }
  return o;
};
// obcięcie wieloboku półpłaszczyzną z ≥ zc (above=true) lub z ≤ zc
P.clip = function (pts, zc, above) {
  const inside = p => (above ? p[1] >= zc : p[1] <= zc);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (zc - a[1]) / (b[1] - a[1]); out.push([a[0] + t * (b[0] - a[0]), zc]); }
  }
  return out;
};
P.clipY = function (pts, yc) { // y ≥ yc
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = a[0] >= yc, ib = b[0] >= yc;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (yc - a[0]) / (b[0] - a[0]); out.push([yc, a[1] + t * (b[1] - a[1])]); }
  }
  return out;
};

/* ---------------------------------------------------------- definicja geometrii */
// d: { typ:'walc', seria:'IPE', nr:300 } lub { typ:'spaw', h, bg, tg, bd, td, tw, aw }
P.geom = function (d) {
  if (d.typ === 'walc') {
    const row = (P.SERIE[d.seria] || {})[d.nr];
    if (!row) throw new Error(`Nieznany kształtownik ${d.seria} ${d.nr}`);
    const [h, b, tw, tf, r] = row;
    return { typ: 'walc', nazwa: `${d.seria} ${d.nr}`, seria: d.seria, nr: d.nr, h, bg: b, tg: tf, bd: b, td: tf, tw, r, aw: 0, b, tf, sym: true };
  }
  const g = { typ: 'spaw', nazwa: d.nazwa || 'Dwuteownik spawany', h: +d.h, bg: +d.bg, tg: +d.tg, bd: +(d.bd || d.bg), td: +(d.td || d.tg), tw: +d.tw, r: 0, aw: +(d.aw || 0) };
  g.b = Math.max(g.bg, g.bd); g.tf = Math.max(g.tg, g.td);
  g.sym = Math.abs(g.bg - g.bd) < 1e-9 && Math.abs(g.tg - g.td) < 1e-9;
  if (!d.nazwa) g.nazwa = g.sym ? `I ${g.h}×${g.bg}×${g.tw}×${g.tg} (spaw.)` : `I ${g.h}×${g.bg}/${g.bd}×${g.tw}×${g.tg}/${g.td} (spaw.)`;
  return g;
};

P.validate = function (g) {
  const e = [];
  if (!(g.h > 0 && g.bg > 0 && g.bd > 0 && g.tw > 0 && g.tg > 0 && g.td > 0)) e.push('Wymiary przekroju muszą być dodatnie.');
  if (g.tg + g.td >= g.h) e.push('Suma grubości pasów nie może przekraczać wysokości przekroju.');
  if (g.tw >= Math.min(g.bg, g.bd)) e.push('Grubość środnika musi być mniejsza od szerokości pasów.');
  return e;
};

/* ---------------------------------------------------------- charakterystyki */
P.props = function (d) {
  const g = d.h !== undefined && d.tw !== undefined && d.bg !== undefined ? d : P.geom(d);
  const pts = P.polygon(g);
  const I0 = P.integrals(pts, 0);
  const A = I0.A, zc = I0.Sz / A;
  const I = P.integrals(pts, zc);
  const Iy = I.Iyy, Iz = I.Izz;
  const zt = g.h - zc, zb = zc;
  // oś obojętna plastyczna – bisekcja: pole poniżej = A/2
  let lo = 0, hi = g.h;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; const Ab = P.integrals(P.clip(pts, m, false), 0).A; if (Ab < A / 2) lo = m; else hi = m; }
  const zpl = (lo + hi) / 2;
  const up = P.integrals(P.clip(pts, zpl, true), zpl), dn = P.integrals(P.clip(pts, zpl, false), zpl);
  const Wply = up.Sz - dn.Sz;
  const right = P.integrals(P.clipY(pts, 0), 0);
  const Wplz = 2 * right.Sy;
  const hw = g.h - g.tg - g.td;
  // skręcanie
  let It;
  if (g.typ === 'walc') {
    const { h, b, tw, tf, r } = g;
    const al = (tw / tf) * (0.145 + 0.1 * r / tf);
    const D = ((r + tw / 2) ** 2 + (r + tf) ** 2 - r * r) / (2 * r + tf);
    It = 2 / 3 * (b - 0.63 * tf) * tf ** 3 + 1 / 3 * (h - 2 * tf) * tw ** 3 + 2 * al * D ** 4;
  } else {
    It = (g.bg * g.tg ** 3 + g.bd * g.td ** 3 + hw * g.tw ** 3) / 3;
  }
  const If1 = g.tg * g.bg ** 3 / 12, If2 = g.td * g.bd ** 3 / 12; // pas górny / dolny względem osi z
  const hs = g.h - g.tg / 2 - g.td / 2;
  const Iw = g.sym && g.typ === 'walc' ? Iz * (g.h - g.tf) ** 2 / 4 : hs * hs * If1 * If2 / (If1 + If2);
  const zs = g.td / 2 + hs * If1 / (If1 + If2);  // środek ścinania od spodu
  const z0 = zs - zc;
  // βz – współczynnik monosymetrii (dodatni, gdy ściskany pas górny jest większy)
  const betaZ = g.sym ? 0 : 2 * z0 - (I.Iz3 + I.Iy2z) / Iy;   // βz = 2·zj, zj = zs − ½∫(y²+z²)z dA/Iy (z ku pasowi ściskanemu)
  const eta = 1.0; // η uwzględniane w nośności (NDP)
  const Avz = g.typ === 'walc' ? Math.max(A - 2 * g.b * g.tf + (g.tw + 2 * g.r) * g.tf, hw * g.tw) : hw * g.tw;
  const Avy = g.bg * g.tg + g.bd * g.td;
  const o = Object.assign({}, g, {
    A, zc, Iy, Iz, zt, zb, Wel_t: Iy / zt, Wel_b: Iy / zb, Wel_y: Iy / Math.max(zt, zb), Wpl_y: Wply, zpl,
    Wel_z: Iz / (Math.max(g.bg, g.bd) / 2), Wpl_z: Wplz, iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A),
    It, Iw, zs, z0, betaZ, hw, hs, If1, If2, Avz, Avy, eta,
    masa: A * 1e-6 * U.RHO,                       // kg/m
    gk: A * 1e-6 * U.GAMMA_STEEL,                 // kN/m
    pts
  });
  // geometria do klasyfikacji (c – PN-EN 1993-1-1 tabl. 5.2)
  const rw = g.typ === 'walc' ? g.r : Math.SQRT2 * g.aw;
  o.c_fg = (g.bg - g.tw) / 2 - rw; o.c_fd = (g.bd - g.tw) / 2 - rw; o.c_w = g.h - g.tg - g.td - 2 * rw;
  o.hsym = g.sym;
  return o;
};

/* prostokąty do przekroju efektywnego (kl. 4): pas g, środnik, pas d + naroża (zaokrąglenia jako kwadraty równoważne) */
P.rects = function (s) {
  const R = [];
  R.push({ id: 'fd', y0: -s.bd / 2, y1: s.bd / 2, z0: 0, z1: s.td });
  R.push({ id: 'w', y0: -s.tw / 2, y1: s.tw / 2, z0: s.td, z1: s.h - s.tg });
  R.push({ id: 'fg', y0: -s.bg / 2, y1: s.bg / 2, z0: s.h - s.tg, z1: s.h });
  if (s.r) {
    const a = Math.sqrt((1 - Math.PI / 4)) * s.r; // kwadrat o polu (1−π/4)r²
    [[s.tw / 2, s.td], [-s.tw / 2 - a, s.td], [s.tw / 2, s.h - s.tg - a], [-s.tw / 2 - a, s.h - s.tg - a]].forEach(([y, z]) => R.push({ id: 'r', y0: y, y1: y + a, z0: z, z1: z + a }));
  }
  return R;
};
P.rectProps = function (R) {
  let A = 0, Sz = 0;
  R.forEach(r => { const a = (r.y1 - r.y0) * (r.z1 - r.z0); A += a; Sz += a * (r.z0 + r.z1) / 2; });
  const zc = Sz / A; let Iy = 0;
  R.forEach(r => { const b = r.y1 - r.y0, h = r.z1 - r.z0, zm = (r.z0 + r.z1) / 2 - zc; Iy += b * h ** 3 / 12 + b * h * zm * zm; });
  const zmax = Math.max(...R.map(r => r.z1)), zmin = Math.min(...R.map(r => r.z0));
  return { A, zc, Iy, Wt: Iy / (zmax - zc), Wb: Iy / (zc - zmin) };
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
