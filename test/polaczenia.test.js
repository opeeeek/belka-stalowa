// Połączenia (PN-EN 1993-1-8): wartości porównane z obliczeniem ręcznym.
const test = require('node:test');
const assert = require('node:assert/strict');
const BS = require('./_load.js');
const { W, J } = BS;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} ≠ ${b}`);
const ndp = { gM0: 1.0, gM1: 1.0, gM2: 1.25, gM3: 1.25, gM3ser: 1.1, fySrc: 'tab31' };
const ctxOf = (st) => { const r = J.run(st || J.defaultState()); return { r, ctx: J.jointCtx(r.sec, r.mat, r.ndp, r.base) }; };

test('Śruba M20 kl. 8.8 – F_v,Rd, F_t,Rd (tabl. 3.4); poślizg M20 10.9 kat. C', () => {
  const B = W.bolt({ d: 'M20', kl: '8.8', gwint: true }, ndp);
  near(B.Fv, 0.6 * 800 * 245 / 1.25, 1e-9, 'Fv');
  near(B.Ft, 0.9 * 800 * 245 / 1.25, 1e-9, 'Ft');
  assert.equal(B.d0, 22);
  const T = W.bolt({ d: 'M20', kl: '8.8', gwint: false }, ndp);
  near(T.Fv, 0.6 * 800 * Math.PI * 400 / 4 / 1.25, 1e-9, 'Fv – trzpień');
  const H = W.bolt({ d: 'M20', kl: '10.9', sprezane: true, kat: 'C', pow: 'B' }, ndp);
  near(H.Fv, 0.5 * 1000 * 245 / 1.25, 1e-9, 'Fv 10.9 (αv = 0,5)');
  near(H.Fs, 1.0 * 0.4 * 0.7 * 1000 * 245 / 1.25, 1e-9, 'Fs,Rd');
  const O = W.bolt({ d: 'M20', kl: '8.8', otw: 'powiekszone' }, ndp);
  assert.equal(O.d0, 24); assert.equal(O.kb, 0.8);
});

test('Docisk F_b,Rd – śruba skrajna przy krawędzi (tabl. 3.4)', () => {
  const B = W.bolt({ d: 'M20', kl: '8.8' }, ndp);
  const r = W.Fb(B, 10, 360, 1.25, { end: true, e1: 40, edge: true, e2: 30, p2: 90 });
  const ab = Math.min(40 / 66, 800 / 360, 1), k1 = Math.min(2.8 * 30 / 22 - 1.7, 1.4 * 90 / 22 - 1.7, 2.5);
  near(r.Fb, k1 * ab * 360 * 20 * 10 / 1.25, 1e-9, 'Fb');
  const ri = W.Fb(B, 10, 360, 1.25, { end: false, p1: 70, edge: false, p2: Infinity });
  near(ri.Fb, 2.5 * Math.min(70 / 66 - 0.25, 800 / 360, 1) * 360 * 20 * 10 / 1.25, 1e-9, 'Fb wewnętrzna');
});

test('Długie złącza β_Lf (3.8), spoina pełnonośna, metoda kierunkowa', () => {
  near(W.betaLf(400, 16), 1 - (400 - 240) / 3200, 1e-12, 'βLf');
  assert.equal(W.betaLf(200, 16), 1);
  assert.equal(W.betaLf(5000, 16), 0.75);
  near(W.aFull(10, 355, 510, 0.9, 1.0, 1.25), 10 * 355 * Math.SQRT2 * 0.9 * 1.25 / (2 * 510), 1e-12, 'a pełnonośna');
  const w = W.fillet(360, 0.8, 1.25, 60, 60, 44);
  near(w.s, Math.sqrt(3600 + 3 * (3600 + 44 * 44)), 1e-12, 'σ zastępcze'); near(w.R1, 360 / (0.8 * 1.25), 1e-12, 'fu/(βw·γM2)');
});

test('Blacha żebrowa – siły w śrubach grupy mimośrodowej i spoiny (ręcznie)', () => {
  const { ctx } = ctxOf();
  const w = Object.assign({ typ: 'blacha_zebrowa' }, W.defaults('blacha_zebrowa', ctx.sec), { nr: 3, nc: 1, p1: 70, e1: 40, hp: 220, z: 60, e2b: 50, e2: 50, tp: 10, a: 6, d: 'M20', kl: '8.8' });
  const o = W.design(ctx, w, { V: 100e3 });
  const Fx = 100e3 * 60 * 70 / (2 * 70 * 70), Fz = 100e3 / 3;
  const top = o.bolts.reduce((a, b) => (b.F > a.F ? b : a));
  near(top.F, Math.hypot(Fx, Fz), 1e-9, 'F max');
  const c = o.checks.find(q => /ścinanie najbardziej obciążonej/.test(q.n));
  near(c.Ed, Math.hypot(Fx, Fz), 1e-9, 'Ed śruby');
  const sw = o.checks.find(q => /Spoiny blachy do podpory/.test(q.n));
  const Lw = 220 - 12, tl = 100e3 / (2 * 6 * Lw), s = 6 * 100e3 * 60 / (2 * 6 * Lw * Lw);
  near(sw.Ed, Math.sqrt((s / Math.SQRT2) ** 2 + 3 * ((s / Math.SQRT2) ** 2 + tl * tl)), 1e-9, 'σ w spoinie');
});

test('Blacha czołowa – rozerwanie blokowe, ścinanie, T-króciec przy wiązaniu', () => {
  const { ctx } = ctxOf();
  const w = Object.assign({ typ: 'blacha_czolowa' }, W.defaults('blacha_czolowa', ctx.sec), { hp: 200, bp: 150, tp: 10, nr: 2, e1: 40, p1: 120, e2: 30, p3: 90, a: 5, d: 'M20', kl: '8.8', gatP: 'S235' });
  const o = W.design(ctx, w, { V: 120e3, Nt: 80e3 });
  const bt = o.checks.find(q => /Rozerwanie blokowe/.test(q.n));
  const Ant = (30 - 11) * 10, Anv = (200 - 40 - 1.5 * 22) * 10;
  near(bt.Rd, 2 * (0.5 * 360 * Ant / 1.25 + 235 * Anv / (Math.sqrt(3) * 1.0)), 1e-9, 'blok');
  const gs = o.checks.find(q => /Ścinanie przekroju brutto/.test(q.n));
  near(gs.Rd, 2 * 200 * 10 * 235 / (1.27 * Math.sqrt(3)), 1e-9, 'brutto');
  const ts = o.checks.find(q => /T-króciec/.test(q.n));
  assert.ok(ts && ts.Rd > 0 && ts.Rd < 4 * 141120, 'T-króciec ograniczony nośnością śrub');
  assert.equal(o.n, 4);
});

test('Kątowniki, spawane, styk – wynik bez błędów; dobór automatyczny znajduje warianty', () => {
  const { ctx, r } = ctxOf();
  const F = { V: r.podpory[0].Rmax, Vser: 50e3 };
  for (const t of ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane']) {
    const w = Object.assign({ typ: t }, W.defaults(t, ctx.sec));
    const o = W.design(ctx, w, F);
    assert.ok(o.checks.length > 0 && o.checks.every(c => isFinite(c.u)), t);
    const d = W.auto(ctx, w, F, 1.0);
    assert.ok(d.ok, 'dobór ' + t);
    assert.ok(d.o.checks.every(c => c.u <= 1 + 1e-9) && !d.o.detalFail.length, 'dobór spełnia warunki ' + t);
  }
  const s = W.spliceDefaults(ctx.sec, 3), Fs = { M: 120e6, V: 40e3, N: 0 };
  const o = W.designSplice(ctx, s, Fs);
  const Af = ctx.sec.bg * ctx.sec.tg, If = 2 * (ctx.sec.bg * ctx.sec.tg ** 3 / 12 + Af * ((ctx.sec.h - ctx.sec.tg) / 2) ** 2);
  near(o.forces.Ff, 120e6 * (If / ctx.sec.Iy) / (ctx.sec.h - ctx.sec.tg), 1e-9, 'siła w pasie');
  const d = W.autoSplice(ctx, s, Fs, 1.0);
  assert.ok(d.ok && d.o.checks.every(c => c.u <= 1 + 1e-9), 'dobór styku');
});

test('Integracja: połączenia i styki w obliczeniach belki, dobór węzłów', () => {
  const st = J.defaultState();
  st.podpory[1].wezel = Object.assign({ typ: 'katowniki' }, W.defaults('katowniki'));
  st.styki = [W.spliceDefaults(null, 3)];
  const r = J.run(st);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.ok(r.checks.some(c => c.id.startsWith('B-C')), 'sprawdzenia kątowników');
  assert.ok(r.checks.some(c => c.id.startsWith('S1-C')), 'sprawdzenia styku');
  const d = J.dobierzWezly(st, r, 1.0);
  assert.ok(d.ok, d.log.join(' '));
  const r2 = J.run(d.st);
  assert.equal(r2.checks.filter(c => /^Podpory|^Styki/.test(c.grp) && c.status === 'fail').length, 0);
});
