// Raport i widoki budują się bez błędów dla przypadków złożonych (etapy, wsporniki, klasa 4, pożar, zmęczenie).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const BS = require('./_load.js');
// minimalne środowisko przeglądarki dla modułów rysunków i raportu (generują tekst SVG/HTML)
globalThis.window = globalThis;
const noop = () => {};
globalThis.document = { addEventListener: noop, documentElement: {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
globalThis.MutationObserver = class { observe() {} };
globalThis.addEventListener = noop;
for (const f of ['baza', 'rysunki', 'rys_wezly', 'raport']) require(path.join(__dirname, '..', 'src', 'ui', f + '.js'));
const { J } = BS;

function zlozony() {
  const st = J.defaultState();
  st.geom = { przesla: [8, 8], wspL: 0, wspP: 2 };
  st.podpory = [
    { typ: 'przegub', ss: 100, c: 0, wezel: { typ: 'oparcie', podloze: 'mur', bp: 250, lp: 200, tp: 20, fd: 2.0, beta: 1.2, lb: 200 } },
    { typ: 'przegub', ss: 150, wezel: { typ: 'brak', zebro: true, bs: 90, ts: 12, ch: 15 } },
    { typ: 'przegub', ss: 150, wezel: { typ: 'blacha_zebrowa', hp: 600, tp: 10, n: 6, d: 'M20', kl: '8.8', e1: 50, p1: 100, e2: 40, z: 60, e2b: 40, a: 6 } }];
  st.przekroj = { typ: 'spaw', h: 900, bg: 300, tg: 20, bd: 220, td: 16, tw: 6, aw: 4 };
  st.material = { gatunek: 'S355', podgatunek: 'K2' };
  st.podporyTymczasowe = [{ x: 4, usunietaPo: 0 }];
  st.obciazenia.push({ id: 'W1', nazwa: 'Ssanie wiatru', rodzaj: 'W', etap: 1, uklad: 'staly', wyklucz: 'W', N: 0, sklad: [{ typ: 'q', q0: -6, x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] });
  st.obciazenia.push({ id: 'W2', nazwa: 'Siła z tężnika', rodzaj: 'W', etap: 1, uklad: 'staly', wyklucz: 'W', N: -150, sklad: [] });
  st.obciazenia.push({ id: 'P1', nazwa: 'Maszyna', rodzaj: 'M', etap: 1, uklad: 'staly', sklad: [{ typ: 'P', P: 80, x: 12, kier: 'z', wys: 'pas_g', ss: 100 }, { typ: 'q', q0: 1.5, x0: 0, x1: '', kier: 'y', wys: 'srodek' }] });
  st.stezenieCiagle = { pasG: false };
  st.stezenia = [{ x: 4, typ: 'boczne', wys: 'pas_g', odEtapu: 1 }, { x: 12, typ: 'pelne', odEtapu: 0 }];
  st.pozar.aktywny = true; st.pozar.ochrona = 'plyty';
  st.zmeczenie.aktywny = true; st.zmeczenie.przypadki = ['P1']; st.zmeczenie.n = 1e6;
  st.kruche.z.aktywny = true;
  st.sgu.podniesienie = 'auto';
  st.normy.generacja = 2;
  return st;
}

test('raport i widoki – projekt domyślny', () => {
  const st = J.defaultState(), r = J.run(st);
  const h = BS.Raport.build(st, r);
  assert.ok(h.includes('Podstawa normowa') && h.includes(r.hash) && h.includes('Wymagania wykonawcze'));
  assert.ok(!/NaN|undefined/.test(h.replace(/"[^"]*"/g, '')), 'brak NaN/undefined w treści raportu');
  const hs = BS.Raport.buildStatic(st, r);
  assert.ok(hs.includes('Wykresy sił wewnętrznych') && !/NaN|undefined/.test(hs.replace(/"[^"]*"/g, '')), 'raport statyki');
  const jb = BS.Raport.jointBlock(st, r, { sup: 0 });
  assert.ok(jb.includes('Rozerwanie blokowe') && jb.includes('<svg'), 'tok obliczeń połączenia');
  const ex = BS.Raport.explain(st, r, r.checks.find(c => c.id === '1-M'));
  assert.ok(ex.includes('M<sub>c,Rd</sub>'), 'jak obliczono – zginanie');
});

test('raport – przypadek złożony (2. generacja → 1., etapy, kl. 4, pożar, zmęczenie, połączenia)', () => {
  const st = zlozony(), r = J.run(st);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.norm.genStosowana, 1);
  const h = BS.Raport.build(st, r);
  assert.ok(h.includes('Nośność w warunkach pożaru') && h.includes('Zmęczenie') && h.includes('blacha żebrowa'));
  assert.ok(/zastosowano|zestaw 1\. generacji|1\. generacji z załącznikami/.test(h));
  const bad = h.replace(/"[^"]*"/g, '').match(/.{40}(NaN|undefined).{40}/);
  assert.ok(!bad, 'NaN/undefined: ' + (bad && bad[0]));
});

test('raport – połączenia wszystkich rodzajów i styki', () => {
  const st = J.defaultState();
  st.podpory[0].wezel = Object.assign({ typ: 'katowniki' }, BS.W.defaults('katowniki'));
  st.podpory[1].wezel = Object.assign({ typ: 'spawane' }, BS.W.defaults('spawane'), { spoiny: 'obwodowe' });
  st.styki = [BS.W.spliceDefaults(null, 2), Object.assign(BS.W.spliceDefaults(null, 4), { typ: 'spawany' })];
  const r = J.run(st), h = BS.Raport.build(st, r);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.ok(h.includes('Styki montażowe') && h.includes('Kątowniki') && h.includes('Spoina czołowa'));
  const bad = h.replace(/"[^"]*"/g, '').match(/.{40}(NaN|undefined).{40}/);
  assert.ok(!bad, 'NaN/undefined: ' + (bad && bad[0]));
  const to = BS.Raport.takeoff(st, r);
  assert.ok(to.rows.some(q => /Kątowniki/.test(q.n)) && to.rows.some(q => /nakładki pasów/.test(q.n)) && to.total > 0);
});
