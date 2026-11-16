/* =====================================================================
   BelkaStal – materiały: stal konstrukcyjna, śruby, spoiny, beton/mur.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U;
const M = BS.M = {};

/* Tablica 3.1 PN-EN 1993-1-1: [fy, fu] dla t ≤ 40 mm oraz 40 < t ≤ 80 mm */
M.STAL = {
  S235:  { norma: 'PN-EN 10025-2', t40: [235, 360], t80: [215, 360], wyrob: [[16, 235], [40, 225], [63, 215], [80, 215], [100, 215]], fuW: 360, bw: 0.80, pod: ['JR', 'J0', 'J2'] },
  S275:  { norma: 'PN-EN 10025-2', t40: [275, 430], t80: [255, 410], wyrob: [[16, 275], [40, 265], [63, 255], [80, 245], [100, 235]], fuW: 410, bw: 0.85, pod: ['JR', 'J0', 'J2'] },
  S355:  { norma: 'PN-EN 10025-2', t40: [355, 510], t80: [335, 470], wyrob: [[16, 355], [40, 345], [63, 335], [80, 325], [100, 315]], fuW: 470, bw: 0.90, pod: ['JR', 'J0', 'J2', 'K2'] },
  S450:  { norma: 'PN-EN 10025-2', t40: [440, 550], t80: [410, 550], wyrob: [[16, 450], [40, 430], [63, 410], [80, 390], [100, 380]], fuW: 550, bw: 1.00, pod: ['J0'] },
  S355N: { norma: 'PN-EN 10025-3', t40: [355, 490], t80: [335, 470], wyrob: [[16, 355], [40, 345], [63, 335], [80, 325], [100, 315]], fuW: 470, bw: 0.90, pod: ['N', 'NL'] },
  S420N: { norma: 'PN-EN 10025-3', t40: [420, 520], t80: [390, 520], wyrob: [[16, 420], [40, 400], [63, 390], [80, 370], [100, 360]], fuW: 520, bw: 1.00, pod: ['N', 'NL'] },
  S460N: { norma: 'PN-EN 10025-3', t40: [460, 540], t80: [430, 540], wyrob: [[16, 460], [40, 440], [63, 430], [80, 410], [100, 400]], fuW: 540, bw: 1.00, pod: ['N', 'NL'] },
  S355M: { norma: 'PN-EN 10025-4', t40: [355, 470], t80: [335, 450], wyrob: [[16, 355], [40, 345], [63, 335], [80, 325], [100, 325]], fuW: 470, bw: 0.90, pod: ['M', 'ML'] },
  S420M: { norma: 'PN-EN 10025-4', t40: [420, 520], t80: [390, 500], wyrob: [[16, 420], [40, 400], [63, 390], [80, 380], [100, 370]], fuW: 520, bw: 1.00, pod: ['M', 'ML'] },
  S460M: { norma: 'PN-EN 10025-4', t40: [460, 540], t80: [430, 530], wyrob: [[16, 460], [40, 440], [63, 430], [80, 410], [100, 400]], fuW: 540, bw: 1.00, pod: ['M', 'ML'] }
};
// temperatura badania udarności (27 J) – PN-EN 1993-1-10, tabl. 2.1 (K2: 40 J w −20 °C ≡ 27 J w −30 °C)
M.T27J = { JR: 20, J0: 0, J2: -20, K2: -30, N: -20, M: -20, NL: -50, ML: -50 };

/* fy, fu dla danej grubości t [mm] */
M.fy = function (gat, t, src) {
  const s = M.STAL[gat]; if (!s) throw new Error('Nieznany gatunek stali: ' + gat);
  if (src === 'wyrob') {
    const row = s.wyrob.find(r => t <= r[0]) || s.wyrob[s.wyrob.length - 1];
    return { fy: row[1], fu: s.fuW, zr: `${s.norma} (norma wyrobu), t = ${U.fmt(t, 1)} mm` };
  }
  const r = t <= 40 ? s.t40 : s.t80;
  if (t > 80) return { fy: s.t80[0], fu: s.t80[1], zr: `PN-EN 1993-1-1 tabl. 3.1 – t = ${U.fmt(t, 1)} mm > 80 mm, poza zakresem tablicy (przyjęto 40 < t ≤ 80)`, poza: true };
  return { fy: r[0], fu: r[1], zr: `PN-EN 1993-1-1 tabl. 3.1, ${t <= 40 ? 't ≤ 40 mm' : '40 < t ≤ 80 mm'}` };
};
M.eps = fy => Math.sqrt(235 / fy);

/* Śruby – PN-EN 1993-1-8 tabl. 3.1: [fyb, fub]; αv wg tabl. 3.4 (gwint w płaszczyźnie ścinania) */
M.SRUBY_KL = {
  '4.6': { fyb: 240, fub: 400, av: 0.6 }, '4.8': { fyb: 320, fub: 400, av: 0.5 }, '5.6': { fyb: 300, fub: 500, av: 0.6 },
  '5.8': { fyb: 400, fub: 500, av: 0.5 }, '6.8': { fyb: 480, fub: 600, av: 0.5 }, '8.8': { fyb: 640, fub: 800, av: 0.6 }, '10.9': { fyb: 900, fub: 1000, av: 0.5 }
};
// średnica: As (pole czynne), A (trzon), d0 (otwór normalny wg PN-EN 1090-2: +1 dla M12–M14, +2 dla M16–M24, +3 dla ≥ M27)
M.SRUBY = {
  M12: { d: 12, As: 84.3, d0: 13 }, M14: { d: 14, As: 115, d0: 15 }, M16: { d: 16, As: 157, d0: 18 }, M20: { d: 20, As: 245, d0: 22 },
  M22: { d: 22, As: 303, d0: 24 }, M24: { d: 24, As: 353, d0: 26 }, M27: { d: 27, As: 459, d0: 30 }, M30: { d: 30, As: 561, d0: 33 }
};
Object.keys(M.SRUBY).forEach(k => { const s = M.SRUBY[k]; s.A = Math.PI * s.d * s.d / 4; });

/* Beton – fck [MPa] */
M.BETON = { 'C12/15': 12, 'C16/20': 16, 'C20/25': 20, 'C25/30': 25, 'C30/37': 30, 'C35/45': 35, 'C40/50': 40, 'C45/55': 45, 'C50/60': 50 };

/* Właściwości stali w podwyższonej temperaturze – PN-EN 1993-1-2, tabl. 3.1: θ, ky, kp, kE */
M.FIRE_K = [
  [20, 1.000, 1.000, 1.000], [100, 1.000, 1.000, 1.000], [200, 1.000, 0.807, 0.900], [300, 1.000, 0.613, 0.800],
  [400, 1.000, 0.420, 0.700], [500, 0.780, 0.360, 0.600], [600, 0.470, 0.180, 0.310], [700, 0.230, 0.075, 0.130],
  [800, 0.110, 0.050, 0.090], [900, 0.060, 0.0375, 0.0675], [1000, 0.040, 0.0250, 0.0450], [1100, 0.020, 0.0125, 0.0225], [1200, 0.000, 0.000, 0.000]
];
M.kFire = function (th, col) { // col: 1 ky, 2 kp, 3 kE
  return U.interp(M.FIRE_K.map(r => [r[0], r[col]]), th);
};
// ciepło właściwe stali ca(θ) [J/kgK] – PN-EN 1993-1-2, 3.4.1.2
M.ca = function (th) {
  if (th < 600) return 425 + 0.773 * th - 1.69e-3 * th * th + 2.22e-6 * th * th * th;
  if (th < 735) return 666 + 13002 / (738 - th);
  if (th < 900) return 545 + 17820 / (th - 731);
  return 650;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
