/* =====================================================================
   BelkaStal – rdzeń silnika: przestrzeń nazw, wersja, narzędzia,
   kanoniczny JSON i SHA-256 (odtwarzalność obliczeń).
   Jednostki wewnętrzne: N, mm, MPa (N/mm²).  kN/m ≡ N/mm, kNm = 1e6 Nmm.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS = root.BS || {};

BS.APP = 'BelkaStal';
BS.VERSION = '1.0.0';
// Wersja silnika obliczeniowego – zmienia się przy każdej zmianie wzorów,
// tabel lub algorytmów (raport podaje ją razem z sumą kontrolną danych).
BS.ENGINE = 'BS-ENG 1.0.0 (2026-11-16)';
BS.FORMAT = 'belkastal/1';

const U = BS.U = {};
U.E = 210000;           // MPa – PN-EN 1993-1-1, 3.2.6
U.G = 81000;            // MPa
U.NU = 0.3;
U.RHO = 7850;           // kg/m³
U.GAMMA_STEEL = 78.5;   // kN/m³ – PN-EN 1991-1-1, tabl. A.4 (stal)
U.g = 9.81;

U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
U.sq = v => v * v;
U.round = (v, n) => { const p = Math.pow(10, n || 0); return Math.round(v * p) / p; };
U.sum = a => a.reduce((s, v) => s + v, 0);
U.max = a => a.reduce((m, v) => (v > m ? v : m), -Infinity);
U.min = a => a.reduce((m, v) => (v < m ? v : m), Infinity);
U.isNum = v => typeof v === 'number' && isFinite(v);
U.num = (v, d) => { const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : +v; return isFinite(x) ? x : (d === undefined ? 0 : d); };
U.clone = o => JSON.parse(JSON.stringify(o));
U.uid = (p) => (p || 'id') + Math.random().toString(36).slice(2, 8);
// interpolacja liniowa w tablicy par [x, y] (x rosnące); poza zakresem – wartości skrajne
U.interp = (tab, x) => {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return tab[tab.length - 1][1];
};

/* ---- formatowanie liczb po polsku (przecinek dziesiętny) */
U.fmt = (v, n) => {
  if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '—';
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  const d = n === undefined ? 2 : n;
  let s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  s = s.replace('-', '−').replace('.', ',');
  // separator tysięcy (wąska spacja) dla dużych liczb
  const parts = s.split(',');
  if (Math.abs(v) >= 10000) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
};
// liczba cyfr znaczących ~3–4
U.fmtS = (v) => {
  if (!U.isNum(v)) return U.fmt(v);
  const a = Math.abs(v);
  if (a >= 1000) return U.fmt(v, 0);
  if (a >= 100) return U.fmt(v, 1);
  if (a >= 10) return U.fmt(v, 2);
  if (a >= 1) return U.fmt(v, 3);
  if (a === 0) return '0';
  return U.fmt(v, 4);
};
U.pct = (v) => (U.isNum(v) ? Math.round(v * 100) + '%' : '—');
U.esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---- kanoniczny JSON: klucze sortowane, liczby w postaci JS – stała reprezentacja danych */
U.canon = function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined && !k.startsWith('_')).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};

/* ---- SHA-256 (FIPS 180-4), synchronicznie – wynik jako hex */
U.sha256 = function (str) {
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const l = bytes.length, nBlk = ((l + 9 + 63) >> 6);
  const m = new Uint8Array(nBlk * 64); m.set(bytes); m[l] = 0x80;
  const bitLen = l * 8;
  m[m.length - 4] = (bitLen >>> 24) & 255; m[m.length - 3] = (bitLen >>> 16) & 255; m[m.length - 2] = (bitLen >>> 8) & 255; m[m.length - 1] = bitLen & 255;
  m[m.length - 5] = Math.floor(bitLen / 4294967296) & 255;
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < nBlk; b++) {
    for (let i = 0; i < 16; i++) { const o = b * 64 + i * 4; W[i] = (m[o] << 24) | (m[o + 1] << 16) | (m[o + 2] << 8) | m[o + 3]; }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const mj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return Array.from(H).map(x => x.toString(16).padStart(8, '0')).join('');
};

/* ---- rejestr sprawdzeń: każde sprawdzenie ma identyfikator, grupę, punkt normy,
   wartość obliczeniową, nośność, wytężenie i status.  Raport korzysta z pól „tok”. */
BS.check = function (o) {
  const c = Object.assign({ status: 'ok', util: null, info: false }, o);
  if (c.util !== null && c.util !== undefined && !c.info) {
    if (!isFinite(c.util) || c.util > 1.0 + 1e-9) c.status = 'fail';
    else if (c.warnAt && c.util > c.warnAt) c.status = 'warn';
  }
  if (c.forceStatus) c.status = c.forceStatus;
  return c;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
