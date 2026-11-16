/* =====================================================================
   BelkaStal – przekroje
   • dwuteowniki walcowane IPE, HEA, HEB, HEM (wymiary PN-EN 10365),
   • ceowniki UPN (półki zbieżne 8%/5%) i UPE (półki równoległe),
   • kątowniki równoramienne i nierównoramienne (PN-EN 10056-1),
   • rury kwadratowe i prostokątne gorąco wykończone (PN-EN 10210)
     i formowane na zimno (PN-EN 10219), także o wymiarach dowolnych,
   • dwuteowniki spawane (bi- i monosymetryczne).
   Charakterystyki liczone z geometrii (wieloboki z zaokrągleniami, otwory
   jako pierścienie o przeciwnej orientacji): A, Iy, Iz, Iyz, Wel, Wpl,
   It, Iw, środek ścinania, βz; części ścianek do klasyfikacji.
   Układ: y – poziomo, z – pionowo od spodu przekroju.  Zginanie My – w płaszczyźnie z.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U;
const P = BS.P = {};

/* ------------------------------------------------------------ tablice wymiarów */
// dwuteowniki: [h, b, tw, tf, r]
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
    450: [478, 307, 21, 40, 27], 500: [524, 306, 21, 40, 27], 550: [572, 306, 21, 40, 27], 600: [620, 305, 21, 40, 27] },
  // ceowniki: [h, b, tw, tf, r]  (UPN: tf – grubość w połowie szerokości półki, zbieżność 8% dla h ≤ 300, 5% powyżej)
  UPN: { 80: [80, 45, 6, 8, 8], 100: [100, 50, 6, 8.5, 8.5], 120: [120, 55, 7, 9, 9], 140: [140, 60, 7, 10, 10], 160: [160, 65, 7.5, 10.5, 10.5],
    180: [180, 70, 8, 11, 11], 200: [200, 75, 8.5, 11.5, 11.5], 220: [220, 80, 9, 12.5, 12.5], 240: [240, 85, 9.5, 13, 13], 260: [260, 90, 10, 14, 14],
    280: [280, 95, 10, 15, 15], 300: [300, 100, 10, 16, 16], 320: [320, 100, 14, 17.5, 17.5], 350: [350, 100, 14, 16, 16], 380: [380, 102, 13.5, 16, 16], 400: [400, 110, 14, 18, 18] },
  UPE: { 80: [80, 50, 4.0, 7.0, 10], 100: [100, 55, 4.5, 7.5, 10], 120: [120, 60, 5.0, 8.0, 12], 140: [140, 65, 5.0, 9.0, 12], 160: [160, 70, 5.5, 9.5, 12],
    180: [180, 75, 5.5, 10.5, 12], 200: [200, 80, 6.0, 11.0, 13], 220: [220, 85, 6.5, 12.0, 13], 240: [240, 90, 7.0, 12.5, 15], 270: [270, 95, 7.5, 13.5, 15],
    300: [300, 100, 9.5, 15.0, 15], 330: [330, 105, 11.0, 16.0, 18], 360: [360, 110, 12.0, 17.0, 18], 400: [400, 115, 13.5, 18.0, 18] }
};
// kątowniki: nazwa → [h (ramię pionowe), b (ramię poziome), t, r1]
P.KAT = {
  L: { '20x3': [20, 20, 3, 3.5], '25x3': [25, 25, 3, 3.5], '25x4': [25, 25, 4, 3.5], '30x3': [30, 30, 3, 5], '30x4': [30, 30, 4, 5], '35x4': [35, 35, 4, 5],
    '40x4': [40, 40, 4, 6], '40x5': [40, 40, 5, 6], '45x4.5': [45, 45, 4.5, 7], '50x5': [50, 50, 5, 7], '50x6': [50, 50, 6, 7], '60x5': [60, 60, 5, 8],
    '60x6': [60, 60, 6, 8], '60x8': [60, 60, 8, 8], '65x7': [65, 65, 7, 9], '70x7': [70, 70, 7, 9], '75x8': [75, 75, 8, 9], '80x8': [80, 80, 8, 10],
    '80x10': [80, 80, 10, 10], '90x9': [90, 90, 9, 11], '100x8': [100, 100, 8, 12], '100x10': [100, 100, 10, 12], '100x12': [100, 100, 12, 12],
    '120x10': [120, 120, 10, 13], '120x12': [120, 120, 12, 13], '130x12': [130, 130, 12, 14], '150x10': [150, 150, 10, 16], '150x12': [150, 150, 12, 16],
    '150x15': [150, 150, 15, 16], '160x15': [160, 160, 15, 17], '180x16': [180, 180, 16, 18], '180x18': [180, 180, 18, 18], '200x16': [200, 200, 16, 18],
    '200x20': [200, 200, 20, 18], '200x24': [200, 200, 24, 18] },
  LN: { '60x40x5': [60, 40, 5, 6], '60x40x6': [60, 40, 6, 6], '75x50x6': [75, 50, 6, 7], '75x50x8': [75, 50, 8, 7], '80x40x6': [80, 40, 6, 7],
    '80x60x7': [80, 60, 7, 8], '100x50x6': [100, 50, 6, 9], '100x50x8': [100, 50, 8, 9], '100x65x7': [100, 65, 7, 10], '100x75x8': [100, 75, 8, 10],
    '100x75x10': [100, 75, 10, 10], '120x80x8': [120, 80, 8, 11], '120x80x10': [120, 80, 10, 11], '120x80x12': [120, 80, 12, 11], '150x75x9': [150, 75, 9, 12],
    '150x75x10': [150, 75, 10, 12], '150x90x10': [150, 90, 10, 12], '150x100x10': [150, 100, 10, 12], '150x100x12': [150, 100, 12, 12],
    '200x100x10': [200, 100, 10, 15], '200x100x12': [200, 100, 12, 15], '200x150x12': [200, 150, 12, 15], '200x150x15': [200, 150, 15, 15] }
};
// rury: nazwa → [h, b, t]
P.RURY = {
  SHS: {}, RHS: {}
};
['40x3', '40x4', '50x3', '50x4', '50x5', '60x4', '60x5', '70x4', '70x5', '80x4', '80x5', '80x6', '90x5', '90x6', '100x4', '100x5', '100x6', '100x8', '120x5', '120x6',
  '120x8', '120x10', '140x6', '140x8', '140x10', '150x6', '150x8', '150x10', '160x8', '160x10', '180x8', '180x10', '200x8', '200x10', '200x12.5', '250x10',
  '250x12.5', '300x10', '300x12.5', '350x12.5', '400x12.5'].forEach(k => { const [a, t] = k.split('x').map(Number); P.RURY.SHS[k] = [a, a, t]; });
['60x40x3', '60x40x4', '80x40x4', '80x60x4', '80x60x5', '100x50x4', '100x50x5', '100x60x5', '120x60x5', '120x80x5', '120x80x6', '140x80x6', '150x100x6', '160x80x6',
  '160x80x8', '180x100x8', '200x100x6', '200x100x8', '200x100x10', '200x120x8', '250x150x8', '250x150x10', '300x100x10', '300x200x8', '300x200x10', '300x200x12.5',
  '400x200x10', '400x200x12.5', '450x250x12.5', '500x300x12.5'].forEach(k => { const [h, b, t] = k.split('x').map(Number); P.RURY.RHS[k] = [h, b, t]; });

P.RODZAJE = {
  walc: { n: 'Dwuteownik walcowany', serie: ['IPE', 'HEA', 'HEB', 'HEM'] },
  ceow: { n: 'Ceownik', serie: ['UPN', 'UPE'] },
  kat: { n: 'Kątownik', serie: ['L', 'LN'] },
  rura: { n: 'Rura kwadratowa / prostokątna', serie: ['SHS', 'RHS', 'wlasna'] },
  spaw: { n: 'Dwuteownik spawany (blachownica)', serie: [] }
};
P.SERIA_N = { IPE: 'IPE', HEA: 'HEA', HEB: 'HEB', HEM: 'HEM', UPN: 'UPN – półki zbieżne', UPE: 'UPE – półki równoległe', L: 'L – równoramienne', LN: 'L – nierównoramienne', SHS: 'kwadratowe', RHS: 'prostokątne', wlasna: 'wymiary dowolne' };
const sortNames = (o) => Object.keys(o).sort((a, b) => { const A = a.split('x').map(Number), B = b.split('x').map(Number); for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d; } return 0; });
P.lista = (seria) => {
  if (P.SERIE[seria]) return Object.keys(P.SERIE[seria]).map(Number).sort((a, b) => a - b);
  if (P.KAT[seria]) return sortNames(P.KAT[seria]);
  if (P.RURY[seria]) return sortNames(P.RURY[seria]);
  return [];
};
P.cornerRad = (wyk, t) => (wyk === 'zimn' ? { ro: t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t, ri: (t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t) - t } : { ro: 1.5 * t, ri: t });

/* ------------------------------------------------------------ wieloboki */
function arc(pts, cx, cy, r, a0, a1, n) { for (let i = 1; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } }
const H = Math.PI / 2, NA = 24;
// dwuteownik (CCW), oś środnika y = 0
P.polygon = function (g) {
  const { h, tw } = g, bt = g.bg, tt = g.tg, bb = g.bd, tb = g.td, r = g.r || 0, n = NA;
  const pts = [];
  pts.push([-bb / 2, 0], [bb / 2, 0], [bb / 2, tb]);
  if (r > 0) { pts.push([tw / 2 + r, tb]); arc(pts, tw / 2 + r, tb + r, r, -H, -2 * H, n); pts.push([tw / 2, tb + r]); } else pts.push([tw / 2, tb]);
  if (r > 0) { pts.push([tw / 2, h - tt - r]); arc(pts, tw / 2 + r, h - tt - r, r, 2 * H, H, n); pts.push([tw / 2 + r, h - tt]); } else pts.push([tw / 2, h - tt]);
  pts.push([bt / 2, h - tt], [bt / 2, h], [-bt / 2, h], [-bt / 2, h - tt]);
  if (r > 0) { pts.push([-tw / 2 - r, h - tt]); arc(pts, -tw / 2 - r, h - tt - r, r, H, 0, n); pts.push([-tw / 2, h - tt - r]); } else pts.push([-tw / 2, h - tt]);
  if (r > 0) { pts.push([-tw / 2, tb + r]); arc(pts, -tw / 2 - r, tb + r, r, 0, -H, n); pts.push([-tw / 2 - r, tb]); } else pts.push([-tw / 2, tb]);
  pts.push([-bb / 2, tb]);
  return pts;
};
// ceownik: tył środnika przy y = 0, półki w kierunku +y; zbieżność s (UPN) – grubość t(y) = tf + s·(b/2 − y)
P.polyU = function (g) {
  const { h, b, tw, tf, r } = g, s = g.slope || 0, n = NA;
  const t = (y) => tf + s * (b / 2 - y);
  const tr = t(tw + r), tt = t(b), r2 = g.slope ? r / 2 : 0;  // zaokrąglenie krawędzi półki r2 ≈ r/2 (UPN)
  const pts = [[0, 0], [b, 0]];
  if (r2 > 0) { pts.push([b, tt - r2]); arc(pts, b - r2, tt - r2, r2, 0, H, 8); pts.push([b - r2, tt]); } else pts.push([b, tt]);
  pts.push([tw + r, tr]); arc(pts, tw + r, tr + r, r, -H, -2 * H, n); pts.push([tw, tr + r]);
  pts.push([tw, h - tr - r]); arc(pts, tw + r, h - tr - r, r, 2 * H, H, n); pts.push([tw + r, h - tr]);
  if (r2 > 0) { pts.push([b - r2, h - tt]); arc(pts, b - r2, h - tt + r2, r2, -H, 0, 8); pts.push([b, h - tt + r2]); } else pts.push([b, h - tt]);
  pts.push([b, h], [0, h]);
  return pts;
};
// kątownik: ramię pionowe (wys. h) przy y ∈ [0, t]; ramię poziome (szer. b) u dołu (poz = 'dol') lub u góry ('gora')
P.polyL = function (g) {
  const { h, b, t, r } = g, n = NA, r2 = r / 2;   // r2 – zaokrąglenie krawędzi ramion (PN-EN 10056-1: r2 ≈ r1/2)
  let pts = [[0, 0], [b, 0], [b, t - r2]];
  arc(pts, b - r2, t - r2, r2, 0, H, 8); pts.push([b - r2, t], [t + r, t]);
  arc(pts, t + r, t + r, r, -H, -2 * H, n); pts.push([t, t + r], [t, h - r2]);
  arc(pts, t - r2, h - r2, r2, 0, H, 8); pts.push([t - r2, h], [0, h]);
  if (g.poz === 'gora') pts = pts.map(([y, z]) => [y, h - z]).reverse();
  return pts;
};
// prostokąt z zaokrąglonymi narożami (CCW); środek y = 0, z ∈ [z0, z0 + h]
function rrect(b, h, rad, z0, cw) {
  const pts = [], n = 12, x0 = -b / 2, x1 = b / 2, y0 = z0, y1 = z0 + h, r = Math.max(0, Math.min(rad, b / 2, h / 2));
  const c = (cx, cy, a0) => { if (r <= 0) { pts.push([cx, cy]); return; } for (let i = 0; i <= n; i++) { const a = a0 + H * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  if (r <= 0) { pts.push([x0, y0], [x1, y0], [x1, y1], [x0, y1]); }
  else { c(x1 - r, y0 + r, -H); c(x1 - r, y1 - r, 0); c(x0 + r, y1 - r, H); c(x0 + r, y0 + r, 2 * H); }
  return cw ? pts.reverse() : pts;
}
P.polyRHS = function (g) {
  const { h, b, t } = g, cr = P.cornerRad(g.wyk, t);
  return [rrect(b, h, cr.ro, 0, false), rrect(b - 2 * t, h - 2 * t, cr.ri, t, true)];
};

/* całki po pierścieniach: A, ∫y, ∫z, ∫y², ∫z², ∫yz, ∫z³, ∫y²z (kwadratura trójkątna, dokładna dla st. 3) */
const TRI = [[1 / 3, 1 / 3, -27 / 48], [0.6, 0.2, 25 / 48], [0.2, 0.6, 25 / 48], [0.2, 0.2, 25 / 48]];
P.integrals = function (pts, z0, y0) {
  const o = { A: 0, Sy: 0, Sz: 0, Iyy: 0, Izz: 0, Iyz: 0, Iz3: 0, Iy2z: 0 };
  const zr = z0 || 0, yr = y0 || 0;
  const rings = Array.isArray(pts[0]) && Array.isArray(pts[0][0]) ? pts : [pts];
  rings.forEach(ring => {
    for (let i = 0; i < ring.length; i++) {
      const [ya, a1] = ring[i], [yb, a2] = ring[(i + 1) % ring.length];
      const y1 = ya - yr, y2 = yb - yr, z1 = a1 - zr, z2 = a2 - zr;
      const area = (y1 * z2 - y2 * z1) / 2;
      if (area === 0) continue;
      o.A += area;
      for (const [s, t, w] of TRI) {
        const y = s * y1 + t * y2, z = s * z1 + t * z2, W = w * area;
        o.Sy += W * y; o.Sz += W * z; o.Iyy += W * z * z; o.Izz += W * y * y; o.Iyz += W * y * z; o.Iz3 += W * z * z * z; o.Iy2z += W * y * y * z;
      }
    }
  });
  return o;
};
// obcięcie pierścienia półpłaszczyzną (z ≥ zc dla above = true; z ≤ zc) – działa na każdym pierścieniu osobno
const clipRing = (pts, zc, above, ax) => {
  const k = ax === 'y' ? 0 : 1;
  const inside = p => (above ? p[k] >= zc : p[k] <= zc);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (zc - a[k]) / (b[k] - a[k]); out.push(k === 1 ? [a[0] + t * (b[0] - a[0]), zc] : [zc, a[1] + t * (b[1] - a[1])]); }
  }
  return out;
};
const isRings = (p) => Array.isArray(p[0]) && Array.isArray(p[0][0]);
P.clip = (pts, zc, above) => (isRings(pts) ? pts.map(r => clipRing(r, zc, above)).filter(r => r.length >= 3) : clipRing(pts, zc, above));
P.clipY = (pts, yc) => (isRings(pts) ? pts.map(r => clipRing(r, yc, true, 'y')).filter(r => r.length >= 3) : clipRing(pts, yc, true, 'y'));

/* ------------------------------------------------------------ definicja geometrii */
P.geom = function (d) {
  const typ = d.typ || 'walc';
  if (typ === 'walc') {
    const row = (P.SERIE[d.seria] || {})[d.nr];
    if (!row) throw new Error(`Nieznany kształtownik ${d.seria} ${d.nr}`);
    const [h, b, tw, tf, r] = row;
    return { kind: 'I', typ, nazwa: `${d.seria} ${d.nr}`, seria: d.seria, nr: d.nr, h, bg: b, tg: tf, bd: b, td: tf, tw, r, aw: 0, b, tf, sym: true };
  }
  if (typ === 'ceow') {
    const row = (P.SERIE[d.seria] || {})[d.nr];
    if (!row || !/^UP/.test(d.seria)) throw new Error(`Nieznany ceownik ${d.seria} ${d.nr}`);
    const [h, b, tw, tf, r] = row;
    const slope = d.seria === 'UPN' ? (h <= 300 ? 0.08 : 0.05) : 0;
    return { kind: 'U', typ, nazwa: `${d.seria} ${d.nr}`, seria: d.seria, nr: d.nr, h, b, bg: b, bd: b, tw, tf, tg: tf, td: tf, r, slope, aw: 0, sym: true };
  }
  if (typ === 'kat') {
    const row = (P.KAT[d.seria] || {})[d.nr];
    if (!row) throw new Error(`Nieznany kątownik ${d.seria} ${d.nr}`);
    const [h, b, t, r] = row;
    return { kind: 'L', typ, nazwa: `L ${d.nr.replace(/x/g, '×')}`, seria: d.seria, nr: d.nr, h, b, t, r, bg: d.poz === 'gora' ? b : t, bd: d.poz === 'gora' ? t : b, tg: t, td: t, tw: t, tf: t, poz: d.poz === 'gora' ? 'gora' : 'dol', aw: 0, sym: false };
  }
  if (typ === 'rura') {
    let h, b, t;
    if (d.seria === 'wlasna') { h = +d.h; b = +d.b; t = +d.t; }
    else { const row = (P.RURY[d.seria] || {})[d.nr]; if (!row) throw new Error(`Nieznana rura ${d.seria} ${d.nr}`); [h, b, t] = row; }
    const wyk = d.wyk === 'zimn' ? 'zimn' : 'gor';
    return { kind: 'RHS', typ, nazwa: `${h === b ? 'SHS' : 'RHS'} ${h}×${b === h ? '' : b + '×'}${U.fmt(t, t % 1 ? 1 : 0)} (${wyk === 'zimn' ? 'PN-EN 10219' : 'PN-EN 10210'})`, seria: d.seria, nr: d.nr, h, b, t, wyk, bg: b, bd: b, tg: t, td: t, tw: t, tf: t, aw: 0, sym: true };
  }
  const g = { kind: 'I', typ: 'spaw', nazwa: d.nazwa || '', h: +d.h, bg: +d.bg, tg: +d.tg, bd: +(d.bd || d.bg), td: +(d.td || d.tg), tw: +d.tw, r: 0, aw: +(d.aw || 0) };
  g.b = Math.max(g.bg, g.bd); g.tf = Math.max(g.tg, g.td);
  g.sym = Math.abs(g.bg - g.bd) < 1e-9 && Math.abs(g.tg - g.td) < 1e-9;
  if (!g.nazwa) g.nazwa = g.sym ? `I ${g.h}×${g.bg}×${g.tw}×${g.tg} (spaw.)` : `I ${g.h}×${g.bg}/${g.bd}×${g.tw}×${g.tg}/${g.td} (spaw.)`;
  return g;
};

P.validate = function (g) {
  const e = [];
  if (g.kind === 'RHS') { if (!(g.h > 0 && g.b > 0 && g.t > 0)) e.push('Wymiary rury muszą być dodatnie.'); else if (2 * g.t >= Math.min(g.h, g.b)) e.push('Grubość ścianki rury zbyt duża względem wymiarów.'); return e; }
  if (g.kind === 'L' || g.kind === 'U') return e;
  if (!(g.h > 0 && g.bg > 0 && g.bd > 0 && g.tw > 0 && g.tg > 0 && g.td > 0)) e.push('Wymiary przekroju muszą być dodatnie.');
  if (g.tg + g.td >= g.h) e.push('Suma grubości pasów nie może przekraczać wysokości przekroju.');
  if (g.tw >= Math.min(g.bg, g.bd)) e.push('Grubość środnika musi być mniejsza od szerokości pasów.');
  return e;
};

/* ------------------------------------------------------------ charakterystyki */
P.props = function (d) {
  const g = d.kind ? d : P.geom(d);
  const pts = g.kind === 'I' ? P.polygon(g) : g.kind === 'U' ? P.polyU(g) : g.kind === 'L' ? P.polyL(g) : P.polyRHS(g);
  const rings = isRings(pts) ? pts : [pts];
  const I0 = P.integrals(rings, 0, 0);
  const A = I0.A, zc = I0.Sz / A, yc = I0.Sy / A;
  const I = P.integrals(rings, zc, yc);
  const Iy = I.Iyy, Iz = I.Izz, Iyz = I.Iyz;
  const zt = g.h - zc, zb = zc;
  const ymin = Math.min(...rings[0].map(p => p[0])), ymax = Math.max(...rings[0].map(p => p[0]));
  // oś obojętna plastyczna (pole poniżej = A/2)
  let lo = 0, hi = g.h;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; const Ab = P.integrals(P.clip(rings, m, false), 0).A; if (Ab < A / 2) lo = m; else hi = m; }
  const zpl = (lo + hi) / 2;
  const up = P.integrals(P.clip(rings, zpl, true), zpl), dn = P.integrals(P.clip(rings, zpl, false), zpl);
  const Wply = up.Sz - dn.Sz;
  let ylo = ymin, yhi = ymax;
  for (let k = 0; k < 60; k++) { const m = (ylo + yhi) / 2; const Ar = P.integrals(P.clipY(rings, m), 0).A; if (Ar > A / 2) ylo = m; else yhi = m; }
  const ypl = (ylo + yhi) / 2;
  const rt = P.integrals(P.clipY(rings, ypl), 0, ypl), Wplz = 2 * rt.Sy;
  const o = Object.assign({}, g, { pts: rings[0], rings, A, zc, yc, Iy, Iz, Iyz, zt, zb, ymin, ymax, zpl, Wpl_y: Wply, Wpl_z: Wplz });
  o.Wel_t = Iy / zt; o.Wel_b = Iy / zb; o.Wel_y = Iy / Math.max(zt, zb);
  o.Wel_z = Iz / Math.max(yc - ymin, ymax - yc);
  o.iy = Math.sqrt(Iy / A); o.iz = Math.sqrt(Iz / A);
  o.masa = A * 1e-6 * U.RHO; o.gk = A * 1e-6 * U.GAMMA_STEEL;
  o.betaZ = 0; o.z0 = 0; o.zs = zc; o.ys = yc; o.nWeb = 1; o.parts = []; o.uwagi = [];
  if (g.kind === 'I') {
    const hw = g.h - g.tg - g.td;
    let It;
    if (g.typ === 'walc') {
      const { h, b, tw, tf, r } = g;
      const al = (tw / tf) * (0.145 + 0.1 * r / tf), D = ((r + tw / 2) ** 2 + (r + tf) ** 2 - r * r) / (2 * r + tf);
      It = 2 / 3 * (b - 0.63 * tf) * tf ** 3 + 1 / 3 * (h - 2 * tf) * tw ** 3 + 2 * al * D ** 4;
    } else It = (g.bg * g.tg ** 3 + g.bd * g.td ** 3 + hw * g.tw ** 3) / 3;
    const If1 = g.tg * g.bg ** 3 / 12, If2 = g.td * g.bd ** 3 / 12, hs = g.h - g.tg / 2 - g.td / 2;
    const Iw = g.sym && g.typ === 'walc' ? Iz * (g.h - g.tf) ** 2 / 4 : hs * hs * If1 * If2 / (If1 + If2);
    const zs = g.td / 2 + hs * If1 / (If1 + If2), z0 = zs - zc;
    const betaZ = g.sym ? 0 : 2 * z0 - (I.Iz3 + I.Iy2z) / Iy;   // βz = 2·zj, zj = zs − ½∫(y²+z²)z dA/Iy (z ku pasowi ściskanemu)
    const Avz = g.typ === 'walc' ? Math.max(A - 2 * g.b * g.tf + (g.tw + 2 * g.r) * g.tf, hw * g.tw) : hw * g.tw;
    const rw = g.typ === 'walc' ? g.r : Math.SQRT2 * g.aw;
    Object.assign(o, { It, Iw, zs, z0, betaZ, hw, hs, If1, If2, Avz, Avy: g.bg * g.tg + g.bd * g.td, Aw: hw * g.tw, Af: Math.min(g.bg * g.tg, g.bd * g.td) });
    o.c_fg = (g.bg - g.tw) / 2 - rw; o.c_fd = (g.bd - g.tw) / 2 - rw; o.c_w = g.h - g.tg - g.td - 2 * rw;
    o.parts = [
      { n: 'pas górny', typ: 'wsp', c: o.c_fg, t: g.tg, side: 'top', z: g.h - g.tg / 2 },
      { n: 'pas dolny', typ: 'wsp', c: o.c_fd, t: g.td, side: 'bot', z: g.td / 2 },
      { n: 'środnik', typ: 'wew', c: o.c_w, t: g.tw, side: 'web', z0: g.td + rw, z1: g.h - g.tg - rw }
    ];
    o.thick = [{ n: 'pas górny', t: g.tg, z: 'top' }, { n: 'pas dolny', t: g.td, z: 'bot' }, { n: 'środnik', t: g.tw, z: 'web' }];
    o.opis = g.typ === 'walc' ? `${g.nazwa}: h = ${U.fmt(g.h, 0)} mm, b = ${U.fmt(g.b, 0)} mm, t<sub>w</sub> = ${U.fmt(g.tw, 1)} mm, t<sub>f</sub> = ${U.fmt(g.tf, 1)} mm, r = ${U.fmt(g.r, 0)} mm`
      : `${g.nazwa}: h = ${U.fmt(g.h, 0)} mm, pas górny ${U.fmt(g.bg, 0)}×${U.fmt(g.tg, 1)} mm, pas dolny ${U.fmt(g.bd, 0)}×${U.fmt(g.td, 1)} mm, środnik t<sub>w</sub> = ${U.fmt(g.tw, 1)} mm, spoiny a = ${U.fmt(g.aw, 1)} mm`;
  } else if (g.kind === 'U') {
    const { h, b, tw, tf, r } = g, hw = h - 2 * tf;
    const bp = b - tw / 2, hp = h - tf;
    const It = (2 * bp * tf ** 3 + hp * tw ** 3) / 3;
    const Iw = tf * bp ** 3 * hp ** 2 / 12 * (3 * bp * tf + 2 * hp * tw) / (6 * bp * tf + hp * tw);
    const e = bp * bp * hp * hp * tf / (4 * Iy);           // środek ścinania od osi środnika (na zewnątrz)
    o.ys = tw / 2 - e; o.eSC = yc - o.ys;                    // odległość ŚŚ od środka ciężkości
    Object.assign(o, { It, Iw, zs: zc, z0: 0, hw, hs: hp, Avz: Math.max(A - 2 * b * tf + (tw + r) * tf, hw * tw), Avy: 2 * b * tf, Aw: hw * tw, Af: b * tf });
    o.c_fg = o.c_fd = b - tw - r; o.c_w = h - 2 * tf - 2 * r;
    o.parts = [
      { n: 'półka górna', typ: 'wsp', c: o.c_fg, t: tf, side: 'top', z: h - tf / 2 },
      { n: 'półka dolna', typ: 'wsp', c: o.c_fd, t: tf, side: 'bot', z: tf / 2 },
      { n: 'środnik', typ: 'wew', c: o.c_w, t: tw, side: 'web', z0: tf + r, z1: h - tf - r }
    ];
    o.thick = [{ n: 'półki', t: tf, z: 'top' }, { n: 'środnik', t: tw, z: 'web' }];
    o.uwagi.push(`Ceownik: środek ścinania leży poza środnikiem (e = ${U.fmt(o.eSC, 1)} mm od środka ciężkości) – obciążenie przyłożone w płaszczyźnie środnika wywołuje skręcanie, którego program nie analizuje; przyjęto obciążenie przez środek ścinania lub skręcanie zablokowane (np. przez przekrycie).`);
    o.opis = `${g.nazwa}: h = ${U.fmt(h, 0)} mm, b = ${U.fmt(b, 0)} mm, t<sub>w</sub> = ${U.fmt(tw, 1)} mm, t<sub>f</sub> = ${U.fmt(tf, 1)} mm${g.slope ? ` (w połowie półki, zbieżność ${U.fmt(g.slope * 100, 0)}%)` : ''}, r = ${U.fmt(r, 1)} mm`;
  } else if (g.kind === 'L') {
    const { h, b, t } = g;
    const It = (h + b - t) * t ** 3 / 3;
    const zsL = g.poz === 'gora' ? h - t / 2 : t / 2;
    Object.assign(o, { It, Iw: 0, zs: zsL, ys: t / 2, z0: zsL - zc, hw: h - t, hs: h - t / 2, Avz: (h - t / 2) * t, Avy: (b - t / 2) * t, Aw: (h - t) * t, Af: 0 });
    // osie główne
    const a2 = 0.5 * Math.atan2(-2 * Iyz, Iy - Iz);
    const Iu = (Iy + Iz) / 2 + Math.hypot((Iy - Iz) / 2, Iyz), Iv = (Iy + Iz) / 2 - Math.hypot((Iy - Iz) / 2, Iyz);
    Object.assign(o, { alfa: a2, Iu, Iv, iv: Math.sqrt(Iv / A) });
    o.parts = [{ n: 'ramię pionowe', typ: 'kat', c: h, t, side: 'web' }, { n: 'ramię poziome', typ: 'kat', c: b, t, side: g.poz === 'gora' ? 'top' : 'bot' }];
    o.thick = [{ n: 'ramiona', t, z: 'web' }];
    o.uwagi.push('Kątownik: przyjęto zginanie względem osi geometrycznej poziomej przy zablokowanym przemieszczeniu bocznym i skręcaniu (element stężony, np. nadproże oparte na murze) – zwichrzenie i zginanie ukośne względem osi głównych nie są analizowane.');
    o.opis = `${g.nazwa}: ramię pionowe ${U.fmt(h, 0)} mm, poziome ${U.fmt(b, 0)} mm (${g.poz === 'gora' ? 'u góry' : 'u dołu'}), t = ${U.fmt(t, 1)} mm, r = ${U.fmt(g.r, 1)} mm; osie główne: I<sub>u</sub> = ${U.fmt(Iu / 1e4, 1)} cm⁴, I<sub>v</sub> = ${U.fmt(Iv / 1e4, 1)} cm⁴`;
  } else {
    const { h, b, t } = g, cr = P.cornerRad(g.wyk, t), Rc = (cr.ro + cr.ri) / 2;
    const Ah = (b - t) * (h - t) - Rc * Rc * (4 - Math.PI), p = 2 * ((b - t) + (h - t)) - 2 * Rc * (4 - Math.PI);
    const It = t ** 3 * p / 3 + 2 * (2 * Ah * t / p) * Ah;
    const Iw = 0;
    Object.assign(o, { It, Iw, zs: zc, z0: 0, nWeb: 2, hw: h - 2 * t, hs: h - t, Avz: A * h / (b + h), Avy: A * b / (b + h), Aw: 2 * (h - 2 * t) * t, Af: b * t, ro: cr.ro, ri: cr.ri });
    o.c_fg = o.c_fd = b - 3 * t; o.c_w = h - 3 * t;
    o.parts = [
      { n: 'ścianka górna', typ: 'wew', c: o.c_fg, t, side: 'top', z: h - t / 2 },
      { n: 'ścianka dolna', typ: 'wew', c: o.c_fd, t, side: 'bot', z: t / 2 },
      { n: 'ścianki boczne', typ: 'wew', c: o.c_w, t, side: 'web', z0: 1.5 * t, z1: h - 1.5 * t }
    ];
    o.thick = [{ n: 'ścianki', t, z: 'top' }];
    o.opis = `${g.nazwa}: h × b × t = ${U.fmt(h, 0)} × ${U.fmt(b, 0)} × ${U.fmt(t, 1)} mm, promienie naroży r<sub>o</sub> = ${U.fmt(cr.ro, 1)} mm, r<sub>i</sub> = ${U.fmt(cr.ri, 1)} mm`;
  }
  o.tMax = Math.max(...o.thick.map(q => q.t));
  return o;
};

/* prostokąty do przekroju efektywnego (kl. 4) i redukcji ścinania; tw – grubość ścianek pionowych */
P.rects = function (s, twOverride) {
  const R = [];
  const tw = twOverride !== undefined ? twOverride : s.tw;
  if (s.kind === 'RHS') {
    const { h, b, t } = s;
    R.push({ id: 'fd', y0: -b / 2 + t, y1: b / 2 - t, z0: 0, z1: t, typ: 'wew' });
    R.push({ id: 'fg', y0: -b / 2 + t, y1: b / 2 - t, z0: h - t, z1: h, typ: 'wew' });
    R.push({ id: 'w', y0: -b / 2, y1: -b / 2 + tw, z0: 0, z1: h }, { id: 'w', y0: b / 2 - tw, y1: b / 2, z0: 0, z1: h });
    return R;
  }
  if (s.kind === 'U') {
    R.push({ id: 'fd', y0: s.tw, y1: s.b, z0: 0, z1: s.tf, tip: 'right' });
    R.push({ id: 'fg', y0: s.tw, y1: s.b, z0: s.h - s.tf, z1: s.h, tip: 'right' });
    R.push({ id: 'w', y0: s.tw - tw, y1: s.tw, z0: 0, z1: s.h });
    if (s.r) { const a = Math.sqrt(1 - Math.PI / 4) * s.r; R.push({ id: 'r', y0: s.tw, y1: s.tw + a, z0: s.tf, z1: s.tf + a }, { id: 'r', y0: s.tw, y1: s.tw + a, z0: s.h - s.tf - a, z1: s.h - s.tf }); }
    return R;
  }
  if (s.kind === 'L') {
    R.push({ id: 'w', y0: 0, y1: s.t, z0: 0, z1: s.h });
    R.push(s.poz === 'gora' ? { id: 'fg', y0: s.t, y1: s.b, z0: s.h - s.t, z1: s.h } : { id: 'fd', y0: s.t, y1: s.b, z0: 0, z1: s.t });
    return R;
  }
  R.push({ id: 'fd', y0: -s.bd / 2, y1: s.bd / 2, z0: 0, z1: s.td, tip: 'both' });
  R.push({ id: 'w', y0: -tw / 2, y1: tw / 2, z0: s.td, z1: s.h - s.tg });
  R.push({ id: 'fg', y0: -s.bg / 2, y1: s.bg / 2, z0: s.h - s.tg, z1: s.h, tip: 'both' });
  if (s.r) {
    const a = Math.sqrt((1 - Math.PI / 4)) * s.r;
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

/* lista wszystkich kształtowników danego rodzaju (dobór) */
P.katalog = function (typ, serie) {
  const out = [];
  const add = (d) => { try { const p = P.props(d); out.push({ d, masa: p.masa, h: p.h, nazwa: p.nazwa }); } catch (e) { /* pomiń */ } };
  (serie || P.RODZAJE[typ].serie).forEach(sr => {
    if (sr === 'wlasna') return;
    P.lista(sr).forEach(nr => add(typ === 'rura' ? { typ, seria: sr, nr, wyk: serie && serie.wyk || 'gor' } : { typ, seria: sr, nr }));
  });
  return out.sort((a, b) => a.masa - b.masa);
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
