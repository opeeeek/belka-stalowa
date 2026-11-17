/* =====================================================================
   BelkaStal – widok 3D belki z połączeniami (zakładka „Belka i połączenia”).
   Własny renderer (bez bibliotek – aplikacja działa offline): bryły
   z wielokątów, perspektywa, cieniowanie płaskie, algorytm malarza
   z podziałem długich ścian, krawędzie charakterystyczne, wybór
   elementu myszą.  Elementy: belka (wyciągnięty przekrój), żebra
   środnika i podporowe, blachy czołowe / żebrowe, kątowniki, śruby,
   spoiny, elementy podpierające (słup, podciąg, płyta, mur / beton),
   styki nakładkowe, stężenia, podpory montażowe, płyta stropowa.
   Obsługa: przeciąganie – obrót, prawy przycisk / Shift – przesuw,
   kółko – przybliżenie, dwuklik – widok ogólny, kliknięcie – edycja.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, Q = BS.Q, A = BS.A, M = BS.M, P = BS.P;
const V3 = BS.V3 = {};
const { esc, fmt } = Q;
const COL = { beam: [150, 170, 200], plate: [230, 163, 90], angle: [196, 128, 64], bolt: [70, 76, 90], weld: [200, 50, 50], col: [176, 184, 196], conc: [205, 199, 186], mur: [190, 120, 92], stiff: [214, 150, 80], brace: [120, 90, 190], tmp: [235, 160, 40], slab: [190, 190, 185], cover: [235, 175, 100] };
let cam = null;                       // stan kamery – zachowany między przeliczeniami
let opts = (() => { try { return Object.assign({ slab: false, sup: true, xray: false }, JSON.parse(localStorage.getItem('bs.v3') || '{}')); } catch (e) { return { slab: false, sup: true, xray: false }; } })();

/* ---------------------------------------------------------- wektory */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* ---------------------------------------------------------- scena */
function Scene() { this.f = []; this.obj = []; }
Scene.prototype.o = function (name, act, extra) { this.obj.push(Object.assign({ name, act }, extra || {})); return this.obj.length - 1; };
// ściana płaska: pts – wierzchołki, n – normalna zewnętrzna, e – krawędzie charakterystyczne (tablica bool), hole – otwór
Scene.prototype.face = function (pts, n, col, ob, e, alpha, hole) { this.f.push({ p: pts, n, col, ob, e: e || pts.map(() => true), a: alpha || 1, hole }); };
// prostopadłościan (osie X, Y, Z); nx – podział wzdłuż X (długie elementy)
Scene.prototype.box = function (x0, x1, y0, y1, z0, z1, col, ob, alpha, nx) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  if (x1 - x0 < 1e-6 || y1 - y0 < 1e-6 || z1 - z0 < 1e-6) return;
  const n = Math.max(1, nx || 1), X = (k) => x0 + (x1 - x0) * k / n;
  for (let k = 0; k < n; k++) {
    const a = X(k), b = X(k + 1), first = k === 0, last = k === n - 1;
    this.face([[a, y0, z0], [b, y0, z0], [b, y0, z1], [a, y0, z1]], [0, -1, 0], col, ob, [true, last, true, first], alpha);
    this.face([[a, y1, z0], [b, y1, z0], [b, y1, z1], [a, y1, z1]], [0, 1, 0], col, ob, [true, last, true, first], alpha);
    this.face([[a, y0, z0], [b, y0, z0], [b, y1, z0], [a, y1, z0]], [0, 0, -1], col, ob, [true, last, true, first], alpha);
    this.face([[a, y0, z1], [b, y0, z1], [b, y1, z1], [a, y1, z1]], [0, 0, 1], col, ob, [true, last, true, first], alpha);
  }
  this.face([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0], col, ob, null, alpha);
  this.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], col, ob, null, alpha);
};
// graniastosłup o osi od p0 do p1, przekrój – wielokąt foremny (k boków, promień r); sharp – krawędzie boczne widoczne
Scene.prototype.prism = function (p0, p1, r, k, col, ob, sharp, rot) {
  const d = norm(sub(p1, p0)), t = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(d, t)), v = cross(d, u);
  const ring = []; for (let i = 0; i < k; i++) { const a = (rot || 0) + 2 * Math.PI * i / k; ring.push(add(mul(u, r * Math.cos(a)), mul(v, r * Math.sin(a)))); }
  for (let i = 0; i < k; i++) {
    const a = ring[i], b = ring[(i + 1) % k], nn = norm(add(a, b));
    this.face([add(p0, a), add(p1, a), add(p1, b), add(p0, b)], nn, col, ob, [!!sharp, true, !!sharp, true]);
  }
  this.face(ring.map(q => add(p0, q)).reverse(), mul(d, -1), col, ob);
  this.face(ring.map(q => add(p1, q)), d, col, ob);
};
// śruba: łeb (sześciokąt) przy p0, trzpień do p1, nakrętka przy p1
Scene.prototype.bolt = function (p0, p1, B, ob) {
  const d = norm(sub(p1, p0)), dd = B ? B.dd : 16, s = B ? B.s : 24, R6 = s / Math.sqrt(3);
  this.prism(sub(p0, mul(d, 0.65 * dd)), p0, R6, 6, COL.bolt, ob, true, Math.PI / 6);
  this.prism(sub(p0, mul(d, 0.1)), add(p1, mul(d, 0.25 * dd)), dd / 2, 8, COL.bolt, ob, false);
  this.prism(p1, add(p1, mul(d, 0.8 * dd)), R6, 6, COL.bolt, ob, true, Math.PI / 6);
};
// żebro środnika: blacha w płaszczyźnie y–z (grubość wzdłuż X) z wcięciami narożnymi 45° c × c przy pasach (od strony środnika)
Scene.prototype.stiff = function (x, ts, yIn, s, bs, z0, z1, c, col, ob) {
  const yo = yIn + s * bs, cc = Math.max(0, Math.min(c || 0, 0.9 * bs, 0.45 * (z1 - z0)));
  const ring = cc > 0 ? [[yIn, z0 + cc], [yIn + s * cc, z0], [yo, z0], [yo, z1], [yIn + s * cc, z1], [yIn, z1 - cc]] : [[yIn, z0], [yo, z0], [yo, z1], [yIn, z1]];
  this.extrude([ring], [x - ts / 2, x + ts / 2], col, ob);
};
// wyciągnięcie przekroju (pierścienie y–z) wzdłuż X od x0 do x1
// podział belki wzdłuż X: gęsto przy elementach (połączenia, żebra, styki), rzadziej dalej – poprawna kolejność rysowania
function gridXs(L, feats, maxStep) {
  const F = Array.from(new Set([0, L].concat(feats).filter(x => x >= 0 && x <= L).map(x => Math.round(x)))).sort((a, b) => a - b);
  const out = [F[0]];
  for (let i = 0; i < F.length - 1; i++) {
    const a = F[i], b = F[i + 1]; if (b - a < 1) continue;
    const mid = (a + b) / 2, lt = [], rt = []; let s = 35, x = a; while (x + s < mid - 10) { x += s; lt.push(x); s = Math.min(s * 1.55, maxStep); }
    s = 35; x = b; while (x - s > mid + 10) { x -= s; rt.push(x); s = Math.min(s * 1.55, maxStep); }
    lt.concat(rt.reverse()).forEach(v => out.push(v)); out.push(b);
  }
  return out;
}
// uproszczenie pierścienia przekroju (łuki zaokrągleń – mniej ścian)
function simplify(r, h) {
  if (r.length < 12) return r;
  const keep = r.filter((p, i) => { const a = r[(i - 1 + r.length) % r.length], c = r[(i + 1) % r.length]; const e1 = norm([0, p[0] - a[0], p[1] - a[1]]), e2 = norm([0, c[0] - p[0], c[1] - p[1]]); return dot(e1, e2) < 0.985 || i % 3 === 0; });
  return keep.length >= 4 ? keep : r;
}
Scene.prototype.extrude = function (rings, xs, col, ob, alpha) {
  if (!Array.isArray(xs)) xs = [xs, arguments[2]];
  const area = (r) => r.reduce((s2, p, i) => { const q = r[(i + 1) % r.length]; return s2 + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const R0 = rings.map((r, i) => { const ccw = area(r) > 0; return (i === 0) === ccw ? r : r.slice().reverse(); });
  const sharpAt = (r, i) => { const a = r[(i - 1 + r.length) % r.length], b = r[i], c = r[(i + 1) % r.length]; const e1 = norm([0, b[0] - a[0], b[1] - a[1]]), e2 = norm([0, c[0] - b[0], c[1] - b[1]]); return dot(e1, e2) < 0.93; };
  const n = xs.length - 1, X = (k) => xs[k], x0 = xs[0], x1 = xs[n];
  R0.forEach(r => {
    const sh = r.map((p, i) => sharpAt(r, i));
    for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length], dy = q[0] - p[0], dz = q[1] - p[1]; if (Math.hypot(dy, dz) < 1e-6) continue;
      const nn = norm([0, dz, -dy]);
      for (let k = 0; k < n; k++) {
        const a = X(k), b = X(k + 1);
        this.face([[a, p[0], p[1]], [b, p[0], p[1]], [b, q[0], q[1]], [a, q[0], q[1]]], nn, col, ob, [sh[i], k === n - 1, sh[(i + 1) % r.length], k === 0], alpha);
      }
    }
  });
  const cap = (x, s) => { const outer = R0[0].map(p => [x, p[0], p[1]]); this.face(s > 0 ? outer : outer.slice().reverse(), [s, 0, 0], col, ob, null, alpha, R0.length > 1 ? R0.slice(1).map(r => r.map(p => [x, p[0], p[1]])) : null); };
  cap(x0, -1); cap(x1, 1);
};

/* ---------------------------------------------------------- budowa modelu */
function build(S, R) {
  const sc = new Scene(), md = R.md, sec = R.sec, L = md.L, h = sec.h, tw = sec.tw || sec.t || 6;
  const tg = sec.tg || sec.t || 0, td = sec.td || sec.t || 0, bg = sec.bg || sec.b || 100, bd = sec.bd || sec.b || 100;
  const yw0 = sec.kind === 'U' || sec.kind === 'L' ? 0 : -tw / 2, yw1 = yw0 + tw, ywc = (yw0 + yw1) / 2;
  const nseg = U.clamp(Math.round(L / Math.max(150, 1.5 * h)), 6, 90);
  const beam = sc.o(`Belka ${sec.nazwa} – ${S.material.gatunek}${S.material.podgatunek}, L = ${fmt(L / 1000, 2)} m`, () => A.secPopup(), { kind: 'beam' });
  const feats = [];
  md.sup.forEach(p => [-400, -200, -100, -40, 0, 40, 100, 200, 400].forEach(d => feats.push(p.x + d)));
  (R.zebra || []).forEach(z => [-60, 0, 60].forEach(d => feats.push(z.x + d)));
  (R.styki || []).forEach(q => { const g = (q.o && q.o.geom) || {}, hl = Math.max(U.num(g.Lf), U.num(g.Lw), 200) / 2; [-hl - 60, -hl, -hl / 2, 0, hl / 2, hl, hl + 60].forEach(d => feats.push(q.x + d)); });
  (md.stez || []).forEach(z => [-40, 0, 40].forEach(d => feats.push(z.x + d)));
  md.tmp.forEach(t => [-60, 0, 60].forEach(d => feats.push(t.x + d)));
  const xsB = gridXs(L, feats, Math.max(200, 1.2 * h));
  sc.extrude(sec.rings.map(r => simplify(r, h)), xsB, COL.beam, beam, opts.xray ? 0.35 : 1);
  // żebra środnika
  (R.zebra || []).forEach(z => {
    const ob = sc.o(`Żebro środnika x = ${fmt(z.x / 1000, 2)} m – ${z.strona === 'jedna' ? 'jednostronne' : 'obustronne'} ${fmt(z.bs, 0)}×${fmt(z.ts, 0)} mm${z.c > 0 ? `, wcięcia narożne 45° c = ${fmt(z.c, 0)} mm` : ', bez wcięć narożnych'}`, () => A.stiffPopup(z.src === 'g' ? null : z.src), { kind: 'stiff', x: z.x });
    const zz0 = td, zz1 = h - tg;
    if (sec.kind === 'U' || z.strona !== 'jedna') sc.stiff(z.x, z.ts, yw1, 1, z.bs, zz0, zz1, z.c, COL.stiff, ob);
    if (sec.kind === 'I') sc.stiff(z.x, z.ts, yw0, -1, z.bs, zz0, zz1, z.c, COL.stiff, ob);
  });
  // podpory i połączenia
  const last = md.sup.length - 1;
  md.sup.forEach((p, i) => {
    const w = (S.podpory[i] || {}).wezel || { typ: 'brak' }, rp = (R.podpory || []).find(q => q.id === p.id) || {}, o = rp.pol;
    const isEnd = (i === 0 && md.wL === 0) || (i === last && md.wP === 0), s = i === 0 && isEnd ? 1 : i === last && isEnd ? -1 : 1;
    const X = (xi) => p.x + s * xi;              // współrzędna lokalna ξ: od czoła belki w głąb belki
    const name = `Podpora ${p.id} – ${BS.J.jointTxt(w, sec)}`;
    const ob = sc.o(name, () => (['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(w.typ) ? A.jointDesigner({ sup: i }) : A.supportPopup(i)), { kind: 'sup', x: p.x });
    const conn = isEnd && o && ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(w.typ);
    // żebra podporowe
    if (w.zebro && (sec.kind === 'I' || sec.kind === 'U')) { const bs = U.num(w.bs, 70), ts = U.num(w.ts, 10), c = BS.J.snipeSup(S, sec, w).c; sc.stiff(p.x, ts, yw1, 1, bs, td, h - tg, c, COL.stiff, ob); if (sec.kind === 'I') sc.stiff(p.x, ts, yw0, -1, bs, td, h - tg, c, COL.stiff, ob); }
    if (!opts.sup && !conn) return;
    if (conn) {
      const g = o.geom || {}, B = o.B, tsup = Math.max(6, U.num(w.tsup, 12)), sup = w.sup || 'pas_slupa';
      const face0 = w.typ === 'blacha_czolowa' ? -U.num(g.tp, 10) : w.typ === 'spawane' ? 0 : -U.num(g.gap, U.num(w.gap, 10));
      // element podpierający
      if (opts.sup) {
        const bc = Math.max(bg + 120, 260), hc = Math.max(240, 0.9 * bc), zA = -350, zB = h + 300;
        const sob = sc.o(`${BS.W.PODPORA[sup] || 'Element podpierający'} – t = ${fmt(tsup, 0)} mm (${w.supGat || ''})`, () => A.jointDesigner({ sup: i }), { kind: 'sup', x: p.x });
        if (sup === 'pas_slupa') { sc.box(X(face0), X(face0 - tsup), ywc - bc / 2, ywc + bc / 2, zA, zB, COL.col, sob); sc.box(X(face0 - tsup), X(face0 - hc + tsup), ywc - 0.35 * tsup, ywc + 0.35 * tsup, zA, zB, COL.col, sob); sc.box(X(face0 - hc + tsup), X(face0 - hc), ywc - bc / 2, ywc + bc / 2, zA, zB, COL.col, sob); }
        else if (sup === 'srodnik_slupa') { sc.box(X(face0), X(face0 - tsup), ywc - hc / 2, ywc + hc / 2, zA, zB, COL.col, sob); [-1, 1].forEach(k => sc.box(X(face0 + 0.0), X(face0 - bc), ywc + k * hc / 2, ywc + k * (hc / 2 + 1.6 * tsup), zA, zB, COL.col, sob)); }
        else if (sup === 'srodnik_belki') { const hz0 = -150, hz1 = h + 20; sc.box(X(face0), X(face0 - tsup), ywc - 900, ywc + 900, hz0, hz1, COL.col, sob, 1, 6); [hz1, hz0 - 18].forEach(zf => sc.box(X(face0 + bc / 2 - tsup / 2 - 60), X(face0 - bc / 2 - tsup / 2 + 60), ywc - 900, ywc + 900, zf, zf + 18, COL.col, sob, 1, 6)); }
        else sc.box(X(face0), X(face0 - tsup), ywc - bc / 2, ywc + bc / 2, -60, h + 60, COL.col, sob);
      }
      const hp = U.num(g.hp, 0.6 * h), zTop = h - (h - hp) / 2;
      const bob = sc.o(`Śruby ${B ? BS.W.boltTxt(B) : ''} – podpora ${p.id}`, () => A.jointDesigner({ sup: i }), { kind: 'sup', x: p.x });
      const wob = sc.o(`Spoiny – podpora ${p.id}`, () => A.jointDesigner({ sup: i }), { kind: 'sup', x: p.x });
      if (w.typ === 'blacha_czolowa') {
        const tp = g.tp, bp = g.bp;
        sc.box(X(0), X(-tp), ywc - bp / 2, ywc + bp / 2, zTop - hp, zTop, COL.plate, ob);
        (o.bolts || []).forEach(b => { const y = ywc + b.x, z = zTop - b.z; sc.bolt([X(0), y, z], [X(-tp - tsup), y, z], B, bob); });
        const a = U.num(g.a, 5); [yw0 - a, yw1].forEach(y0 => sc.box(X(0), X(a), y0, y0 + a, zTop - hp + a, zTop - a, COL.weld, wob));
      } else if (w.typ === 'blacha_zebrowa') {
        const lp = g.z + (g.nc - 1) * g.p2 + g.e2, tp = g.tp, gp = g.gap;
        // blacha po stronie obserwatora (−y); dla ceownika – od strony grzbietu środnika
        sc.box(X(-gp), X(-gp + lp), yw0 - tp, yw0, zTop - hp, zTop, COL.plate, ob);
        (o.bolts || []).forEach(b => { const x = X(-gp + b.x), z = zTop - b.z; sc.bolt([x, yw1, z], [x, yw0 - tp, z], B, bob); });
        const a = U.num(g.a, 6); sc.box(X(-gp), X(-gp + a), yw0 - tp - a, yw0 - tp, zTop - hp, zTop, COL.weld, wob); sc.box(X(-gp), X(-gp + a), yw0, yw0 + a, zTop - hp, zTop, COL.weld, wob);
      } else if (w.typ === 'katowniki') {
        const ta = g.ta, gp = g.gap;
        [1, -1].forEach(k => {
          const yA = k > 0 ? yw1 : yw0;
          sc.box(X(-gp), X(-gp + g.lb), yA, yA + k * ta, zTop - hp, zTop, COL.angle, ob);
          sc.box(X(-gp), X(-gp + ta), yA, yA + k * g.ls, zTop - hp, zTop, COL.angle, ob);
        });
        (o.bolts || []).forEach(b => { const x = X(-gp + g.gb), z = zTop - b.z; sc.bolt([x, yw0 - ta, z], [x, yw1 + ta, z], B, bob); [1, -1].forEach(k => { const y = (k > 0 ? yw1 : yw0) + k * g.gs; sc.bolt([X(-gp + ta), y, z], [X(-gp - tsup), y, z], B, bob); }); });
      } else if (w.typ === 'spawane') {
        const aw = U.num(w.aw, 5);
        if (w.spoiny === 'czolowa') sc.box(X(0), X(3), yw0 - 1, yw1 + 1, 0, h, COL.weld, wob);
        else { [yw0 - aw, yw1].forEach(y0 => sc.box(X(0), X(aw), y0, y0 + aw, td, h - tg, COL.weld, wob)); if (w.spoiny === 'obwodowe' && sec.kind !== 'RHS') { const af = U.num(w.af, 6); [[h, af], [h - tg - af, af], [td, af], [-af, af]].forEach(([z0, t]) => sc.box(X(0), X(af), ywc - bg / 2, ywc + bg / 2, z0, z0 + t, COL.weld, wob)); } }
      }
      return;
    }
    // oparcie (płyta / mur / beton / element stalowy) – także podpory pośrednie
    const lp = w.typ === 'oparcie' ? U.num(w.lp, 150) : Math.max(100, U.num((S.podpory[i] || {}).ss, 100)), bp = w.typ === 'oparcie' ? U.num(w.bp, 200) : bd + 60;
    let zb = 0;
    if (w.typ === 'oparcie' && w.podloze !== 'stal') { const tp = U.num(w.tp, 15); sc.box(p.x - lp / 2, p.x + lp / 2, ywc - bp / 2, ywc + bp / 2, -tp, 0, COL.plate, ob); zb = -tp; }
    if (w.typ === 'oparcie' && w.podloze !== 'stal') sc.box(p.x - lp / 2 - 120, p.x + lp / 2 + 120, ywc - bp / 2 - 150, ywc + bp / 2 + 150, zb - 320, zb, w.podloze === 'mur' ? COL.mur : COL.conc, ob);
    else { const bf2 = 160, hz = 260; sc.box(p.x - bf2 / 2, p.x + bf2 / 2, ywc - 500, ywc + 500, -12, 0, COL.col, ob, 1, 1); sc.box(p.x - 4, p.x + 4, ywc - 500, ywc + 500, -hz + 12, -12, COL.col, ob); sc.box(p.x - bf2 / 2, p.x + bf2 / 2, ywc - 500, ywc + 500, -hz, -hz + 12, COL.col, ob); }
  });
  // podpory montażowe
  md.tmp.forEach(t => { const ob = sc.o(`Podpora montażowa ${t.id} – x = ${fmt(t.x / 1000, 2)} m, usuwana po etapie ${t.do + 1}`, () => A.stagesPopup(), { kind: 'tmp', x: t.x }); sc.box(t.x - 50, t.x + 50, ywc - 50, ywc + 50, -900, 0, COL.tmp, ob, 0.75); });
  // stężenia boczne
  (md.stez || []).forEach(z => {
    const zz = z.wys === 'pas_d' ? td / 2 : z.wys === 'srodek' ? h / 2 : h - tg / 2;
    const ob = sc.o(`Stężenie ${z.typ} x = ${fmt(z.x / 1000, 2)} m (${z.wys === 'pas_d' ? 'pas dolny' : z.wys === 'srodek' ? 'środek ścinania' : 'pas górny'})`, () => A.bracePopup(z.src === 'g' ? null : z.src), { kind: 'brace', x: z.x });
    sc.box(z.x - 25, z.x + 25, ywc + bg / 2, ywc + bg / 2 + 700, zz - 25, zz + 25, COL.brace, ob);
    sc.box(z.x - 25, z.x + 25, ywc - bg / 2 - 700, ywc - bg / 2, zz - 25, zz + 25, COL.brace, ob);
  });
  // płyta stropowa (stężenie ciągłe pasa górnego)
  if (opts.slab && md.ciagle && md.ciagle.pasG) { const ob = sc.o('Płyta stropowa / poszycie – stężenie ciągłe pasa górnego', () => A.bracePopup(), { kind: 'slab' }); sc.box(0, L, ywc - Math.max(900, 3 * bg), ywc + Math.max(900, 3 * bg), h, h + 100, COL.slab, ob, 0.3, Math.max(4, Math.round(nseg / 2))); }
  // styki montażowe
  (R.styki || []).forEach((q, j) => {
    const o = q.o, s2 = S.styki[j] || {}, x0 = q.x;
    const ob = sc.o(`Styk ${q.id} – x = ${fmt(x0 / 1000, 2)} m – ${BS.W.STYKI[s2.typ] || ''}`, () => A.jointDesigner({ styk: j }), { kind: 'splice', x: x0 });
    if (s2.typ === 'spawany' || !o || !o.geom) { sc.box(x0 - 2, x0 + 2, sec.ymin - 1, sec.ymax + 1, -1, h + 1, COL.weld, ob); return; }
    const g = o.geom, B = o.B, Lf = g.Lf, Lw = g.Lw;
    sc.box(x0 - Lf / 2, x0 + Lf / 2, ywc - g.bfo / 2, ywc + g.bfo / 2, h, h + g.tfo, COL.cover, ob);
    sc.box(x0 - Lf / 2, x0 + Lf / 2, ywc - g.bfo / 2, ywc + g.bfo / 2, -g.tfo, 0, COL.cover, ob);
    if (g.tfi > 0) [-1, 1].forEach(k => { const ya = ywc + k * (tw / 2 + (sec.r || 0)), yb = ya + k * g.bfi; sc.box(x0 - Lf / 2, x0 + Lf / 2, ya, yb, h - tg - g.tfi, h - tg, COL.cover, ob); sc.box(x0 - Lf / 2, x0 + Lf / 2, ya, yb, td, td + g.tfi, COL.cover, ob); });
    const zw0 = (h - g.hpw) / 2;
    sc.box(x0 - Lw / 2, x0 + Lw / 2, yw1, yw1 + g.tpw, zw0, zw0 + g.hpw, COL.cover, ob);
    sc.box(x0 - Lw / 2, x0 + Lw / 2, yw0 - g.tpw, yw0, zw0, zw0 + g.hpw, COL.cover, ob);
    for (let k = 0; k < g.nf; k++) [-1, 1].forEach(sd => { const x = x0 + sd * (g.gap / 2 + g.ef + k * g.p1f); [-1, 1].forEach(e => { const y = ywc + e * g.gf / 2; sc.bolt([x, y, h + g.tfo], [x, y, h - tg - (g.tfi || 0)], B, ob); sc.bolt([x, y, -g.tfo], [x, y, td + (g.tfi || 0)], B, ob); }); });
    (o.bolts || []).forEach(b => [-1, 1].forEach(sd => { const x = x0 + sd * b.x, z = zw0 + g.hpw - b.z; sc.bolt([x, yw0 - g.tpw, z], [x, yw1 + g.tpw, z], B, ob); }));
  });
  sc.L = L; sc.h = h; sc.ywc = ywc; sc.bmax = Math.max(bg, bd);
  return sc;
}

/* ---------------------------------------------------------- kamera i rysowanie */
function camFit(sc, focus) {
  const L = sc.L, h = sc.h;
  if (focus === null || focus === undefined) return { t: [L / 2, sc.ywc, h / 2], yaw: -1.05, pitch: 0.42, d: Math.max(L * 0.85, 6 * h), fov: 0.62 };
  return { t: [focus, sc.ywc, h / 2], yaw: focus < L / 2 ? -0.75 : -2.4, pitch: 0.38, d: Math.max(5 * h, 4 * sc.bmax, 1300), fov: 0.62 };
}
function eyeOf(c) { return add(c.t, [c.d * Math.cos(c.pitch) * Math.cos(c.yaw), c.d * Math.cos(c.pitch) * Math.sin(c.yaw), c.d * Math.sin(c.pitch)]); }
function render(st) {
  const { cv, sc, hov } = st, ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(cv), bgc = css.getPropertyValue('--panel').trim() || '#ffffff', ink = css.getPropertyValue('--ink').trim() || '#1b2230';
  ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
  const c = cam, eye = eyeOf(c), fw = norm(sub(c.t, eye)), rt = norm(cross(fw, [0, 0, 1])), up = cross(rt, fw), F = (H / 2) / Math.tan(c.fov / 2), cx = W / 2, cy = H / 2, near = 20;
  const L0 = norm(add(add(mul(rt, -0.45), mul(up, 0.8)), mul(fw, -0.6)));
  const pr = (p) => { const d = sub(p, eye), z = dot(d, fw); return [cx + F * dot(d, rt) / z, cy - F * dot(d, up) / z, z]; };
  const list = [];
  sc.f.forEach((f, k) => {
    const cen = f.p.reduce((a, p) => add(a, p), [0, 0, 0]).map(v => v / f.p.length);
    if (dot(f.n, sub(eye, cen)) <= 0 && f.a >= 1) return;            // ściana odwrócona
    const q = f.p.map(pr); if (q.some(v => v[2] < near)) return;
    const depth = q.reduce((a, v) => a + v[2], 0) / q.length;
    list.push({ k, q, depth, hq: f.hole ? f.hole.map(r => r.map(pr)) : null });
  });
  list.sort((a, b) => b.depth - a.depth);
  const paths = [];
  list.forEach(it => {
    const f = sc.f[it.k], n = dot(f.n, sub(eye, f.p[0])) < 0 ? mul(f.n, -1) : f.n;
    const lit = 0.42 + 0.58 * Math.max(0, dot(n, L0)) + 0.08 * Math.max(0, n[2]);
    const hl = hov !== null && hov === f.ob, col = f.col.map(v => Math.min(255, Math.round(v * lit + (hl ? 45 : 0))));
    const p2 = new Path2D(); it.q.forEach((v, i) => (i ? p2.lineTo(v[0], v[1]) : p2.moveTo(v[0], v[1]))); p2.closePath();
    if (it.hq) it.hq.forEach(r => { r.forEach((v, i) => (i ? p2.lineTo(v[0], v[1]) : p2.moveTo(v[0], v[1]))); p2.closePath(); });
    ctx.globalAlpha = f.a;
    const rgb = `rgb(${hl ? Math.max(0, col[0] - 40) : col[0]},${col[1]},${hl ? Math.min(255, col[2] + 40) : col[2]})`;
    ctx.fillStyle = rgb; ctx.fill(p2, 'evenodd');
    if (f.a >= 1) { ctx.strokeStyle = rgb; ctx.lineWidth = 1.1; ctx.stroke(p2); }
    ctx.beginPath();
    it.q.forEach((v, i) => { if (!f.e[i]) return; const w2 = it.q[(i + 1) % it.q.length]; ctx.moveTo(v[0], v[1]); ctx.lineTo(w2[0], w2[1]); });
    if (it.hq) it.hq.forEach(r => r.forEach((v, i) => { const w2 = r[(i + 1) % r.length]; ctx.moveTo(v[0], v[1]); ctx.lineTo(w2[0], w2[1]); }));
    ctx.strokeStyle = hl ? 'rgba(29,91,184,0.95)' : 'rgba(20,26,38,0.55)'; ctx.lineWidth = hl ? 1.4 : 0.8; ctx.stroke();
    ctx.globalAlpha = 1;
    paths.push({ p2, ob: f.ob, a: f.a });
  });
  st.paths = paths;
  // osie
  const ax = [[1, 0, 0, 'x', '#c0262d'], [0, 1, 0, 'y', '#1d7f3c'], [0, 0, 1, 'z', '#1d5bb8']], o2 = [46, H - 40];
  ax.forEach(([x, y, z, l, cc]) => { const v = [dot([x, y, z], rt), dot([x, y, z], up)]; ctx.strokeStyle = cc; ctx.fillStyle = cc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o2[0], o2[1]); ctx.lineTo(o2[0] + 26 * v[0], o2[1] - 26 * v[1]); ctx.stroke(); ctx.font = '11px sans-serif'; ctx.fillText(l, o2[0] + 31 * v[0] - 3, o2[1] - 31 * v[1] + 4); });
  ctx.fillStyle = ink; ctx.globalAlpha = 0.55; ctx.font = '11px sans-serif'; ctx.fillText(`${sc.f.length} ścian · ${list.length} widocznych`, W - 150, H - 10); ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------- osadzenie w zakładce */
V3.mount = function (host, S, R) {
  if (!host || !R || !R.md || !R.sec) return;
  const sc = build(S, R);
  if (!cam || cam.L !== sc.L || cam.h !== sc.h) { cam = camFit(sc); cam.L = sc.L; cam.h = sc.h; }
  const md = R.md;
  const zMid = (R.zebra || []).map((z, j) => [z, j]).filter(([z]) => !md.sup.some(p => Math.abs(p.x - z.x) <= 30)).slice(0, 6);
  const views = [['all', 'Widok ogólny']].concat(md.sup.map((p, i) => [`s${i}`, `Podpora ${p.id}`])).concat((R.styki || []).map((q, j) => [`t${j}`, `Styk ${q.id}`])).concat(zMid.map(([z, j]) => [`z${j}`, `Żebro x = ${fmt(z.x / 1000, 2)} m`]));
  host.innerHTML = `<div class="v3bar"><span class="segsw sm">${views.map(([k, l]) => `<button type="button" data-v3="${k}">${esc(l)}</button>`).join('')}</span><span class="segsw sm">${[['iso', 'Izometria'], ['side', 'Z boku'], ['top', 'Z góry'], ['end', 'Od czoła']].map(([k, l]) => `<button type="button" data-v3d="${k}">${l}</button>`).join('')}</span>
    <label class="chk sm"><input type="checkbox" data-v3o="slab" ${opts.slab ? 'checked' : ''}><span>płyta / poszycie</span></label><label class="chk sm"><input type="checkbox" data-v3o="sup" ${opts.sup ? 'checked' : ''}><span>elementy podpierające</span></label><label class="chk sm"><input type="checkbox" data-v3o="xray" ${opts.xray ? 'checked' : ''}><span>belka przezroczysta</span></label></div>
    <div class="v3wrap"><canvas class="v3cv" tabindex="0" aria-label="Widok 3D belki"></canvas><div class="v3tip" style="display:none"></div></div>`;
  const cv = host.querySelector('canvas'), tip = host.querySelector('.v3tip'), st = { cv, sc, hov: null, paths: [] };
  let raf = 0; const draw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; render(st); }); };
  // wybór: najpierw elementy nieprzezroczyste (płyta / belka przezroczysta nie zasłaniają połączeń)
  const pick = (x, y) => { const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); for (const pass of [1, 0]) for (let i = st.paths.length - 1; i >= 0; i--) { const q = st.paths[i]; if (pass && q.a < 1) continue; if (ctx.isPointInPath(q.p2, x * dpr, y * dpr)) return q.ob; } return null; };
  let drag = null;
  const touches = new Map(); let pinch = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { const [a, b2] = [...touches.values()]; pinch = { d0: Math.hypot(a[0] - b2[0], a[1] - b2[1]), cd: cam.d }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey, moved: false, c0: Object.assign({}, cam, { t: cam.t.slice() }) }; });
  const endTouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  cv.addEventListener('pointercancel', endTouch);
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && touches.size === 2) { const [a, b2] = [...touches.values()]; cam.d = U.clamp(pinch.cd * pinch.d0 / Math.max(10, Math.hypot(a[0] - b2[0], a[1] - b2[1])), 150, 40 * Math.max(sc.L, 1000)); draw(); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 3) drag.moved = true;
      if (drag.b === 2 || drag.sh) { const eye = eyeOf(drag.c0), fw = norm(sub(drag.c0.t, eye)), rt = norm(cross(fw, [0, 0, 1])), up = cross(rt, fw), k = drag.c0.d * Math.tan(cam.fov / 2) * 2 / cv.clientHeight; cam.t = add(drag.c0.t, add(mul(rt, -dx * k), mul(up, dy * k))); }
      else { cam.yaw = drag.c0.yaw - dx * 0.008; cam.pitch = U.clamp(drag.c0.pitch + dy * 0.008, -1.45, 1.45); }
      tip.style.display = 'none'; draw(); return;
    }
    const ob = pick(x, y);
    if (ob !== st.hov) { st.hov = ob; draw(); }
    if (ob !== null) { tip.textContent = sc.obj[ob].name + ' – kliknij, aby zmienić'; tip.style.display = 'block'; tip.style.left = Math.min(x + 14, cv.clientWidth - 260) + 'px'; tip.style.top = (y + 16) + 'px'; cv.style.cursor = 'pointer'; }
    else { tip.style.display = 'none'; cv.style.cursor = 'grab'; }
  });
  cv.addEventListener('pointerup', e => { endTouch(e); const d = drag; drag = null; if (!d || d.moved || d.b !== 0) return; const r = cv.getBoundingClientRect(), ob = pick(e.clientX - r.left, e.clientY - r.top); if (ob !== null && sc.obj[ob].act) sc.obj[ob].act(); });
  cv.addEventListener('pointerleave', () => { if (st.hov !== null) { st.hov = null; draw(); } tip.style.display = 'none'; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.d = U.clamp(cam.d * Math.exp(e.deltaY * 0.0012), 150, 40 * Math.max(sc.L, 1000)); draw(); }, { passive: false });
  cv.addEventListener('dblclick', () => { cam = Object.assign(camFit(sc), { L: sc.L, h: sc.h }); draw(); });
  host.querySelectorAll('[data-v3]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.v3; let x = null;
    if (k[0] === 's') x = md.sup[+k.slice(1)].x; else if (k[0] === 't') x = (R.styki[+k.slice(1)] || {}).x; else if (k[0] === 'z') x = (R.zebra[+k.slice(1)] || {}).x;
    cam = Object.assign(camFit(sc, x), { L: sc.L, h: sc.h }); draw();
  }));
  host.querySelectorAll('[data-v3d]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.v3d; if (k === 'iso') { cam.yaw = -1.05; cam.pitch = 0.42; } else if (k === 'side') { cam.yaw = -Math.PI / 2; cam.pitch = 0.02; } else if (k === 'top') { cam.yaw = -Math.PI / 2; cam.pitch = 1.45; } else { cam.yaw = Math.PI; cam.pitch = 0.08; } draw();
  }));
  host.querySelectorAll('[data-v3o]').forEach(cb => cb.addEventListener('change', () => { opts[cb.dataset.v3o] = cb.checked; try { localStorage.setItem('bs.v3', JSON.stringify(opts)); } catch (e) { /* */ } V3.mount(host, S, R); }));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => draw()); ro.observe(cv); }
  draw();
  V3._st = st;
};
V3.build = build;
})();
