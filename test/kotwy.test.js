// Kotwy płyty podporowej (PN-EN 1992-4) i blacha podstawy (PN-EN 1993-1-8) – porównanie z obliczeniami ręcznymi.
const test = require('node:test');
const assert = require('node:assert/strict');
const BS = require('./_load.js');
const { J, KT } = BS;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} ≠ ${b}`);

function ctx() { const r = J.run(J.defaultState()); return { sec: r.sec, mat: r.mat, ndp: r.ndp }; }
function wez(k) { return Object.assign({ typ: 'oparcie', podloze: 'beton', bp: 280, lp: 150, tp: 15, beton: 'C25/30', lb: 150, bc: 300, lc: 0, hc: 400, ec: 0, aw: 4 }, { kotwy: Object.assign(KT.defaults(null), { d: 'M20', kl: '5.8', nL: 1, sB: 210, hef: 160, tg: 10 }, k || {}) }); }
const find = (o, re) => o.checks.find(c => re.test(c.n));

test('Kotwy wklejane M20: stal, stożek betonu, przyczepność + stożek (ręcznie)', () => {
  const c = ctx(), o = KT.design(c, wez(), { N: 40e3, Vx: 0, Vy: 0 });
  const gMc = 1.5 * 1.2, fck = 25, hef = 160, d = 20;
  // stal: N_Rk,s = A_s·f_uk, γ_Ms = max(1,4; 1,2·500/400) = 1,5
  near(find(o, /stali kotwy/).Rd, 245 * 500 / 1.5, 1e-12, 'N_Rd,s');
  // stożek: c_x = 150 (ściana b_c = 300, płyta w osi), c_y = ∞; s_cr = 480, c_cr = 240
  const N0 = 7.7 * Math.sqrt(fck) * hef ** 1.5, Ac = (150 + 150) * (240 + 210 + 240), psiS = 0.7 + 0.3 * 150 / 240;
  near(find(o, /Stożek betonu/).Rd, N0 * Ac / (480 * 480) * psiS / gMc, 1e-12, 'N_Rd,c');
  // przyczepność: τ_Rk,cr = 5, τ_Rk,ucr = 9 → s_cr,Np = min(3h_ef; 7,3·d·√9) = 438
  const N0p = 5 * Math.PI * d * hef, scr = Math.min(3 * hef, 7.3 * d * 3), ccr = scr / 2;
  const Ap = 300 * (ccr + 210 + ccr), tRkc = 7.7 / (Math.PI * d) * Math.sqrt(hef * fck);
  const p0 = Math.max(1, Math.SQRT2 - (Math.SQRT2 - 1) * Math.pow(5 / tRkc, 1.5)), pg = Math.max(1, p0 - Math.sqrt(210 / scr) * (p0 - 1)), ps = 0.7 + 0.3 * 150 / ccr;
  near(find(o, /przyczepności/).Rd, N0p * Ap / (scr * scr) * pg * ps / gMc, 1e-12, 'N_Rd,p');
  // długość: h_ef + t_g + t_p + t_w + m + 2P = 160 + 10 + 15 + 3 + 18 + 5 = 211 → 220
  assert.equal(o.len.Lr, 220);
});

test('Śruby wbetonowane: wyrwanie pod płytką, krawędź betonu przy ścinaniu, stal z ramieniem (podlewka > d/2)', () => {
  const c = ctx();
  let o = KT.design(c, wez({ typ: 'wbetonowane', hef: 200, dh: 60, tg: 10 }), { N: 20e3, Vx: 10e3, Vy: 0 });
  near(find(o, /Wyrwanie/).Rd, 7.5 * Math.PI / 4 * (60 * 60 - 20 * 20) * 25 / 1.5, 1e-12, 'N_Rd,p = k₂·A_h·f_ck/γMc');
  // krawędź: c₁ = 150, c₂ = ∞, s₂ = 210, h = 400
  const c1 = 150, lf = Math.min(200, 240), al = 0.1 * Math.sqrt(lf / c1), be = 0.1 * Math.pow(20 / c1, 0.2);
  const V0 = 1.7 * Math.pow(20, al) * Math.pow(lf, be) * 5 * c1 ** 1.5, Ac = (1.5 * c1 + 210 + 1.5 * c1) * Math.min(400, 1.5 * c1);
  near(find(o, /Krawędź betonu/).Rd, V0 * Ac / (4.5 * c1 * c1) / 1.5, 1e-12, 'V_Rd,c');
  near(find(o, /bez ramienia/).Rd, 0.6 * 245 * 500 / 1.25, 1e-12, 'V_Rd,s (t_g = 10 ≤ d/2)');
  // M16 i podlewka 10 mm > d/2 = 8 → ramię l_a = 0,5d + t_g + t_p/2
  o = KT.design(c, wez({ d: 'M16', tg: 10 }), { N: 0, Vx: 5e3, Vy: 0 });
  const ds = Math.sqrt(4 * 157 / Math.PI), M0 = 1.2 * Math.PI * ds ** 3 / 32 * 500, la = 8 + 10 + 7.5;
  near(find(o, /z ramieniem/).Rd, M0 / la / 1.25, 1e-12, 'V_Rd,s,M (α_M = 1)');
});

test('Blacha podstawy przy odrywaniu – króciec teowy bez efektu dźwigni; otwory owalne nie przenoszą V_x', () => {
  const c = ctx(), w = wez();
  let o = KT.design(c, w, { N: 30e3, Vx: 12e3, Vy: 0 });
  const t = o.tstub, m = 105 - 75 - 0.8 * Math.SQRT2 * 4;
  near(t.m, m, 1e-12, 'm');
  assert.equal(t.pry, false, 'L_b > L_b* – bez dźwigni');
  near(find(o, /króciec teowy/).Rd, 2 * t.Mpl / m, 1e-12, 'F_T,1-2 = 2M_pl/m');
  w.kotwy.otw = 'owalne'; o = KT.design(c, w, { N: 0, Vx: 12e3, Vy: 0 });
  assert.equal(o.Vx, 0); assert.ok(!find(o, /ścinanie|Krawędź/i));
  w.kotwy.otw = 'powiekszone'; o = KT.design(c, w, { N: 0, Vx: 12e3, Vy: 0 });
  assert.ok(find(o, /otworach powiększonych/).u === Infinity, 'otwory powiększone bez podkładek – brak przeniesienia V');
});

test('Projekt: odrywanie (EQU) przeniesione kotwami, siła osiowa na podporze nieprzesuwnej, α z wymiarów podpory, dobór', () => {
  const st = J.defaultState();
  // α automatyczne: A_c1 = 2·A_c0 w kierunku belki (b_c = 300, l_p = 150) → α = 2
  let r = J.run(st);
  const wB = r.podpory.find(p => p.id === 'B').wezelEff;
  near(r.podpory.find(p => p.id === 'B').plyta.alfa, Math.min(3, (wB.lp + 2 * (150 - wB.lp / 2)) / wB.lp, (wB.lp + 400) / wB.lp, (wB.bp + 400) / wB.bp), 1e-12, 'α');
  // wspornik za podporą B → odrywanie podpory A; podpora A – płyta na betonie z kotwami
  st.geom.wspP = 2.5;
  st.podpory[0].wezel = Object.assign({ typ: 'oparcie' }, BS.W.defaults('oparcie', r.sec));
  st.obciazenia.push({ id: 'Qw', nazwa: 'Wspornik', rodzaj: 'Q', kat: 'Q-B', etap: 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'P', P: 60, x: 8.5, kier: 'z', wys: 'pas_g', ss: 100 }] });
  r = J.run(st);
  const A = r.podpory.find(p => p.id === 'A');
  assert.ok(A.kotwyF.N > 0, 'siła odrywająca na kotwach');
  assert.equal(r.checks.find(c => c.id === 'A-EQU').status, 'ok', 'EQU – zakotwienie zaprojektowane');
  st.podpory[0].wezel.kotwy.on = false; r = J.run(st);
  assert.equal(r.checks.find(c => c.id === 'A-EQU').status, 'fail', 'bez kotew – odrywanie niezabezpieczone');
  st.podpory[0].wezel.kotwy.on = true;
  // siła osiowa: tylko podpora nieprzesuwna
  st.obciazenia[0].N = 30; r = J.run(st);
  const nax = r.podpory.find(p => p.id === 'A').kotwyF.VxN;
  st.podpory[0].przesuwna = true; r = J.run(st);
  assert.equal(r.podpory.find(p => p.id === 'A').kotwyF.VxN, 0, 'podpora przesuwna – bez siły osiowej');
  assert.ok(nax >= 0);
  // dobór kotew
  const d = J.dobierzWezly(st, r, 1), r2 = J.run(d.st), A2 = r2.podpory.find(p => p.id === 'A');
  assert.ok(A2.kotwy.u <= 1 + 1e-9 && A2.kotwy.detalFail.length === 0, d.log.join(' '));
});

test('Dobór automatyczny płyty i kotew: warunki spełnione, wynik niezależny od poprzednich wymiarów; synchronizacja z danymi', () => {
  const st = J.defaultState(), w = st.podpory[1].wezel;
  Object.assign(w, { Nt: 25, Hx: 10 });
  const r = J.run(st), B = r.podpory.find(p => p.id === 'B');
  assert.ok(B.auto && B.auto.ok, 'dobrano');
  assert.ok(B.kotwy.u <= 1 + 1e-9 && B.kotwy.detalFail.length === 0, 'kotwy spełniają warunki');
  assert.ok(B.plyta.u <= 1 + 1e-9, 'docisk płyty');
  assert.ok(B.wezelEff.lp <= 300, 'płyta w obrysie podpory b_c = 300');
  // inne wymiary wyjściowe → ten sam wynik
  const st2 = JSON.parse(JSON.stringify(st)); Object.assign(st2.podpory[1].wezel, { bp: 600, lp: 300, tp: 40 }); Object.assign(st2.podpory[1].wezel.kotwy, { d: 'M30', nL: 3, hef: 500 });
  const B2 = J.run(st2).podpory.find(p => p.id === 'B');
  assert.deepEqual([B2.wezelEff.bp, B2.wezelEff.lp, B2.wezelEff.tp, B2.wezelEff.kotwy.d, B2.wezelEff.kotwy.nL, B2.wezelEff.kotwy.hef], [B.wezelEff.bp, B.wezelEff.lp, B.wezelEff.tp, B.wezelEff.kotwy.d, B.wezelEff.kotwy.nL, B.wezelEff.kotwy.hef]);
  assert.equal(J.syncAuto(st2, J.run(st2)), true);
  assert.equal(st2.podpory[1].wezel.bp, B.wezelEff.bp); assert.equal(st2.podpory[1].wezel.kotwy.d, B.wezelEff.kotwy.d);
  assert.equal(J.syncAuto(st2, J.run(st2)), false, 'stabilne po synchronizacji');
});

test('Siła stabilizująca podparcia widełkowego V_y = N_f/125 (PN-EN 1993-1-1 5.3.3), pas ściskany bez stężenia ciągłego', () => {
  const st = J.defaultState();
  const r = J.run(st), B = r.podpory.find(p => p.id === 'B');
  // etap 1 (montaż) – pas górny bez stężenia ciągłego; N_f = max M_Ed / h_s
  const hs = r.sec.hs || r.sec.h, Mp = Math.max(...Array.from(r.env[0].Mmax).filter(isFinite));
  near(B.kotwyF.Hst, Mp / hs / 125, 1e-9, 'H_stab');
  st.podpory[1].wezel.kotwy.stab = false;
  assert.equal(J.run(st).podpory.find(p => p.id === 'B').kotwyF.Hst, 0, 'wyłączona');
});
