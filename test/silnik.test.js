// Testy weryfikacyjne silnika BelkaStal – porównanie z rozwiązaniami analitycznymi,
// danymi katalogowymi kształtowników i obliczeniem ręcznym.
const test = require('node:test');
const assert = require('node:assert/strict');
const BS = require('./_load.js');
const { U, P, FE, N, J, X, T, R } = BS;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12), `${msg || ''}: ${a} ≠ ${b} (tol ${tol})`);

test('SHA-256 – wektory testowe FIPS 180-4', () => {
  assert.equal(U.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(U.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(U.sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
});

test('kanoniczny JSON – niezależny od kolejności kluczy', () => {
  assert.equal(U.canon({ b: 1, a: [2, { d: 3, c: 4 }] }), U.canon({ a: [2, { c: 4, d: 3 }], b: 1 }));
});

test('charakterystyki kształtowników = katalog (±0,5%)', () => {
  // [seria, nr, A cm², Iy cm⁴, Wpl,y cm³, Iz cm⁴, It cm⁴]
  const cat = [['IPE', 300, 53.81, 8356, 628.4, 603.8, 20.12], ['IPE', 200, 28.48, 1943, 220.6, 142.4, 6.98], ['HEA', 200, 53.83, 3692, 429.5, 1336, 20.98], ['HEB', 300, 149.1, 25170, 1869, 8563, 185.0], ['IPE', 600, 156.0, 92080, 3512, 3387, 165.4]];
  for (const [s, n, A, Iy, Wpl, Iz, It] of cat) {
    const p = P.props({ typ: 'walc', seria: s, nr: n });
    near(p.A / 100, A, 0.005, `${s}${n} A`); near(p.Iy / 1e4, Iy, 0.005, `${s}${n} Iy`); near(p.Wpl_y / 1e3, Wpl, 0.005, `${s}${n} Wpl`);
    near(p.Iz / 1e4, Iz, 0.005, `${s}${n} Iz`); near(p.It / 1e4, It, 0.01, `${s}${n} It`);
  }
});

test('dwuteownik monosymetryczny – βz zgodny ze wzorem przybliżonym (±6%)', () => {
  const w = P.props({ typ: 'spaw', h: 800, bg: 300, tg: 20, bd: 150, td: 20, tw: 10 });
  const rho = w.If1 / (w.If1 + w.If2);
  const approx = 0.9 * w.hs * (2 * rho - 1) * (1 - (w.Iz / w.Iy) ** 2);
  near(w.betaZ, approx, 0.06, 'βz');
  assert.ok(w.betaZ > 0, 'większy pas ściskany → βz > 0');
});

test('MES – belka swobodnie podparta i obustronnie utwierdzona (rozwiązania zamknięte)', () => {
  const L = 6000, q = -10, EI = 210000 * 8356e4, xs = FE.mesh([], L, L / 40);
  let s = FE.sample(FE.plane({ xs, EI, supports: [{ x: 0, kv: 'fix' }, { x: L, kv: 'fix' }], dist: [{ x0: 0, x1: L, q0: q, q1: q }] }));
  near(Math.max(...s.M), 10 * L * L / 8, 1e-9, 'M = qL²/8');
  near(Math.max(...s.w), 5 * 10 * L ** 4 / (384 * EI), 1e-6, 'w = 5qL⁴/384EI');
  s = FE.sample(FE.plane({ xs, EI, supports: [{ x: 0, kv: 'fix', kr: 'fix' }, { x: L, kv: 'fix', kr: 'fix' }], dist: [{ x0: 0, x1: L, q0: q, q1: q }] }));
  near(Math.min(...s.M), -10 * L * L / 12, 1e-9, 'M podporowy = −qL²/12');
  // belka dwuprzęsłowa: reakcja środkowa 10qL/8 (L – przęsło)
  const r = FE.plane({ xs: FE.mesh([L], 2 * L, 100), EI, supports: [{ x: 0, kv: 'fix', id: 'A' }, { x: L, kv: 'fix', id: 'B' }, { x: 2 * L, kv: 'fix', id: 'C' }], dist: [{ x0: 0, x1: 2 * L, q0: q, q1: q }] });
  near(r.reactions[1].R, 10 * 10 * L / 8, 1e-9, 'RB = 10qL/8');
});

test('MES – Mcr przy stałym momencie = wzór analityczny (podpory widełkowe)', () => {
  const p = P.props({ typ: 'walc', seria: 'IPE', nr: 300 });
  const E = 210000, G = 81000, L = 6000;
  const xs = FE.mesh([], L, L / 40);
  const r = FE.ltb({ xs, EIz: E * p.Iz, EIw: E * p.Iw, GIt: G * p.It, Mfun: () => [1e6, 1e6, 1e6], bc: [{ x: 0, u: 1, phi: 1 }, { x: L, u: 1, phi: 1 }] });
  const Mcr0 = Math.PI / L * Math.sqrt(E * p.Iz * G * p.It * (1 + Math.PI ** 2 * E * p.Iw / (L * L * G * p.It)));
  near(r.lam * 1e6, Mcr0, 1e-4, 'Mcr');
});

test('MES – C1 dla obciążenia równomiernego w środku ścinania ≈ 1,13; obciążenie na pasie górnym obniża Mcr', () => {
  const p = P.props({ typ: 'walc', seria: 'IPE', nr: 300 });
  const E = 210000, G = 81000, L = 6000, xs = FE.mesh([], L, L / 40);
  const Mx = (x) => x * (L - x) / 2, Mf = (e) => [Mx(xs[e]), Mx((xs[e] + xs[e + 1]) / 2), Mx(xs[e + 1])];
  const base = { xs, EIz: E * p.Iz, EIw: E * p.Iw, GIt: G * p.It, Mfun: Mf, bc: [{ x: 0, u: 1, phi: 1 }, { x: L, u: 1, phi: 1 }] };
  const Mcr0 = Math.PI / L * Math.sqrt(E * p.Iz * G * p.It * (1 + Math.PI ** 2 * E * p.Iw / (L * L * G * p.It)));
  const sc = FE.ltb(Object.assign({}, base, { qe: () => [{ w0: 1, w1: 1, e: 0 }] }));
  const C1 = sc.lam * Mx(L / 2) / Mcr0;
  assert.ok(C1 > 1.12 && C1 < 1.14, 'C1 = ' + C1);
  const top = FE.ltb(Object.assign({}, base, { qe: () => [{ w0: 1, w1: 1, e: 150 }] }));
  const bot = FE.ltb(Object.assign({}, base, { qe: () => [{ w0: 1, w1: 1, e: -150 }] }));
  assert.ok(top.lam < sc.lam && sc.lam < bot.lam, 'kolejność: pas górny < ŚŚ < pas dolny');
});

test('MES – stężenie pasa ściskanego w środku rozpiętości ≡ dwa segmenty L/2', () => {
  const p = P.props({ typ: 'walc', seria: 'IPE', nr: 300 });
  const E = 210000, G = 81000, L = 6000, xs = FE.mesh([L / 2], L, L / 40);
  const zr = p.h / 2 - p.tf / 2;
  const r = FE.ltb({ xs, EIz: E * p.Iz, EIw: E * p.Iw, GIt: G * p.It, Mfun: () => [1e6, 1e6, 1e6], bc: [{ x: 0, u: 1, phi: 1 }, { x: L, u: 1, phi: 1 }], springs: [{ x: L / 2, k: 'rigid', zr }] });
  const Ls = L / 2, Mcr = Math.PI / Ls * Math.sqrt(E * p.Iz * G * p.It * (1 + Math.PI ** 2 * E * p.Iw / (Ls * Ls * G * p.It)));
  near(r.lam * 1e6, Mcr, 2e-3, 'Mcr segmentu');
});

test('MES – pierwsza częstotliwość belki swobodnie podpartej', () => {
  const L = 6000, EI = 210000 * 8356e4, m = 4.22e-5, xs = FE.mesh([], L, L / 40);
  const f = FE.freq({ xs, EI, mass: [{ x0: 0, x1: L, m }], supports: [{ x: 0, kv: 'fix' }, { x: L, kv: 'fix' }] }).f;
  near(f, Math.PI / (2 * L * L) * Math.sqrt(EI / m), 1e-4, 'f1');
});

test('PN-EN 1993-1-10 tabl. 2.1 – spójność przesunięć między podgatunkami (co 20 K = 2 kolumny)', () => {
  const T27 = { JR: 20, J0: 0, J2: -20, K2: -30, 'K2,M,N': -30, 'M,N': -30, 'ML,NL': -50 };
  for (const g of Object.keys(X.T21)) {
    const keys = Object.keys(X.T21[g]);
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
      const ka = keys[a], kb = keys[b], sh = (T27[ka] - T27[kb]) / 10; // przesunięcie w kolumnach (b – niższa temperatura)
      if (!Number.isInteger(sh) || sh <= 0) continue;
      for (let r = 0; r < 3; r++) for (let i = 0; i + sh < 7; i++) {
        const va = X.T21[g][ka][r][i], vb = X.T21[g][kb][r][i + sh];
        if (va >= 200 || vb >= 200) continue;
        // wartości tablicy są zaokrąglane do 5 mm – dopuszczalna różnica jednego kroku
        assert.ok(Math.abs(vb - va) <= 5, `${g} ${ka}→${kb} wiersz ${r} kol. ${i}: ${va} vs ${vb}`);
      }
    }
  }
});

test('Profil normowy – 1. generacja kompletna; 2. generacja → udokumentowane zastosowanie 1. generacji', () => {
  const st = J.defaultState();
  let o = N.ocen(st);
  assert.equal(o.genStosowana, 1); assert.equal(o.bledy.length, 0);
  assert.ok(o.dokumenty.every(d => d.gen === 1));
  st.normy.generacja = 2;
  o = N.ocen(st);
  assert.equal(o.genZadana, 2); assert.equal(o.genStosowana, 1);
  assert.match(o.decyzja, /PKN/); assert.match(o.decyzja, /nie mieszano/i);
  assert.ok(o.braki2.length > 0);
});

test('Profil normowy – ZK 1. generacji wpisany do 2. generacji jest błędem; dokument 2. gen. w zestawie 1. gen. – błąd', () => {
  const st = J.defaultState();
  st.normy.zestawy[2]['EN1993-1-1'].zk = 'Załącznik krajowy do PN-EN 1993-1-1:2006';
  assert.ok(N.ocen(st).bledy.some(e => /1\. generacji/.test(e)));
  const st2 = J.defaultState();
  st2.normy.zestawy[1]['EN1993-1-1'].oznaczenie = 'PN-EN 1993-1-1:2022';
  assert.ok(N.ocen(st2).bledy.some(e => /2\. generacji/.test(e)));
  assert.ok(J.run(st2).errors.length > 0, 'obliczenia blokowane przy mieszaniu generacji');
});

test('Projekt domyślny – wyniki zgodne z obliczeniem ręcznym', () => {
  const st = J.defaultState();
  const r = J.run(st);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  const g = r.sec.gk * 1.05 + 8.0;        // kN/m – G (ciężar własny +5% i płyty)
  // etap 2: 6.10b decyduje: 0,85·1,35·G + 1,5·Q1 + 1,5·0,7·Q2
  const q610b = 0.85 * 1.35 * g + 1.5 * 6.0 + 1.5 * 0.7 * 1.6, q610a = 1.35 * g + 1.5 * 0.7 * (6.0 + 1.6);
  const MEd = Math.max(q610a, q610b) * 36 / 8;
  const cM = r.checks.find(c => c.id === '1-M');
  near(cM.Ed / 1e6, MEd, 1e-6, 'MEd etap 2');
  near(cM.Rd / 1e6, 628.4e3 * 355 / 1e6, 0.003, 'Mpl,Rd');
  // etap 1 (montaż): 1,35·G + 1,5·1,0·Qc
  near(r.checks.find(c => c.id === '0-M').Ed / 1e6, (1.35 * g + 1.5 * 1.5) * 36 / 8, 1e-6, 'MEd montaż');
  // ugięcie charakterystyczne: G + Q1 + 0,7·Q2 (Q1 wiodące), bez podniesienia
  const EI = 210000 * r.sec.Iy, qk = g + 6.0 + 0.7 * 1.6;
  near(r.sgu.seg[0].wmax, 5 * qk * 6000 ** 4 / (384 * EI), 2e-3, 'wmax');
  // reakcja charakterystyczna od G1
  near(r.podpory[0].Rk.find(x => x.id === 'G1').R / 1e3, 8.0 * 3, 1e-6, 'R_k G1');
  assert.equal(r.nFail, 0);
  // zwichrzenie w montażu sprawdzone, w eksploatacji (pas górny stężony) χLT = 1
  const lt0 = r.checks.filter(c => c.id.startsWith('0-LT')), lt1 = r.checks.filter(c => c.id.startsWith('1-LT'));
  assert.ok(lt0.length === 2 && lt0.every(c => c.d.ltb.chimod < 1));
  assert.ok(lt1.every(c => c.d.ltb.chimod === 1));
});

test('Etapy realizacji – podpora tymczasowa: siły zamrożone + przeniesienie reakcji (superpozycja)', () => {
  const st = J.defaultState();
  st.stezenia = []; st.stezenieCiagle = { pasG: false };
  st.podporyTymczasowe = [{ x: 3.0, usunietaPo: 0 }];
  st.obciazenia = [{ id: 'G1', nazwa: 'G', rodzaj: 'G', etap: 0, uklad: 'staly', N: 0, sklad: [{ typ: 'q', q0: 10, x0: 0, x1: '', kier: 'z', wys: 'srodek' }] }];
  st.ciezarWlasny.auto = false;
  const r = J.run(st);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  // po usunięciu podpory: stan końcowy = belka jednoprzęsłowa obciążona q (superpozycja: q na układzie 2-przęsłowym + R_T na 1-przęsłowym)
  const res = r.an.res[1].G1.tot;
  const Mmid = BS.S.at(r.an.xs, res.M, 3000);
  near(Mmid / 1e6, 10 * 36 / 8, 1e-6, 'M w środku po usunięciu podpory');
  near(res.R.A.R / 1e3, 30, 1e-6, 'RA'); assert.ok(Math.abs(res.R.T1.R) < 1e-6);
  // w etapie 1 moment podporowy belki ciągłej −qL²/8 (L = 3 m)
  near(BS.S.at(r.an.xs, r.an.res[0].G1.tot.M, 3000) / 1e6, -10 * 9 / 8, 1e-6, 'M nad podporą tymczasową');
});

test('EQU – ssanie wiatru powoduje odrywanie podpory', () => {
  const st = J.defaultState();
  st.obciazenia.push({ id: 'W1', nazwa: 'Ssanie', rodzaj: 'W', etap: 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: -12, x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] });
  const r = J.run(st);
  const e = r.equ.find(q => q.id === 'A' && q.etap === 1);
  const g = (r.sec.gk * 1.05 + 8.0) * 3;
  near(e.Rmin / 1e3, 0.9 * g - 1.5 * 12 * 3, 1e-6, 'Rmin EQU');
  assert.ok(r.checks.some(c => c.id === 'A-EQU'));
});

test('Klasyfikacja – IPE 300 S355 kl. 1; dwuteownik smukły – kl. 4 i przekrój efektywny', () => {
  const s = P.props({ typ: 'walc', seria: 'IPE', nr: 300 });
  const k = R.classAt(s, 355, 1e9, 0); assert.equal(k.cls, 1);
  const w = P.props({ typ: 'spaw', h: 1000, bg: 300, tg: 12, bd: 300, td: 12, tw: 6, aw: 4 });
  const kw = R.classAt(w, 355, 1e9, 0); assert.equal(kw.cls, 4);
  const e = R.effective(w, 355, 'Mpos');
  assert.ok(e.reduced && e.Weff < Math.min(w.Wel_t, w.Wel_b));
});

test('Pożar – θcr zgodne z (4.22) dla belki bez zwichrzenia (±25 °C)', () => {
  const st = J.defaultState();
  st.pozar.aktywny = true; st.pozar.ochrona = 'brak'; st.pozar.ekspozycja = '3';
  const r = J.run(st);
  const fr = r.pozar;
  assert.ok(fr && fr.thcr > 400 && fr.thcr < 900, 'θcr = ' + fr.thcr);
  assert.ok(Math.abs(fr.thcr - fr.thcr424) < 25, `${fr.thcr} vs ${fr.thcr424}`);
  // krzywa ISO 834: 30 min → 841,8 °C
  near(X.iso834(30), 841.8, 1e-3, 'ISO 834');
});

test('Odtwarzalność – ta sama treść → ten sam hash; zmiana danych → inny hash', () => {
  const a = J.defaultState(), b = JSON.parse(JSON.stringify(a));
  assert.equal(J.hash(a), J.hash(b));
  b.obciazenia[0].sklad[0].q0 = 8.01;
  assert.notEqual(J.hash(a), J.hash(b));
  const r1 = J.run(a), r2 = J.run(JSON.parse(JSON.stringify(a)));
  assert.deepEqual(r1.checks.map(c => c.util), r2.checks.map(c => c.util));
});
