// Żebra poprzeczne środnika (PN-EN 1993-1-5): panele, wyboczenie przy ścinaniu, sprawdzenia żeber.
const test = require('node:test');
const assert = require('node:assert/strict');
const BS = require('./_load.js');
const { J } = BS;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} ≠ ${b}`);

function blachownica() {
  const st = J.defaultState();
  st.przekroj = { typ: 'spaw', h: 1200, bg: 300, tg: 20, bd: 300, td: 20, tw: 8, aw: 5 };
  st.geom.przesla = [16];
  st.obciazenia.push({ id: 'P1', nazwa: 'Siła skupiona', rodzaj: 'Q', kat: 'Q-B', etap: 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'P', P: 300, x: 4, kier: 'z', wys: 'pas_g', ss: 100 }] });
  return st;
}

test('Panele: bez żeber a = ∞ (k_τ = 5,34); żebra co 2 m z żebrami podporowymi – k_τ wg a/h_w', () => {
  const st = blachownica();
  let r = J.run(st);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.ok(r.panels.every(p => p.a === Infinity && Math.abs(p.sb.kt - 5.34) < 1e-12));
  st.analiza.zebraRozstaw = 2; st.analiza.zebraPodpory = true;
  r = J.run(st);
  assert.equal(r.zebra.length, 9, 'żebra: 2 podporowe + 7 pośrednich');
  assert.ok(r.panels.every(p => Math.abs(p.a - 2000) < 1e-6), 'panele po 2 m');
  const hw = r.sec.hw, kt = 5.34 + 4 * (hw / 2000) ** 2;
  near(r.panels[0].sb.kt, kt, 1e-12, 'k_τ (a/h_w ≥ 1)');
  const lw = hw / (37.4 * 8 * Math.sqrt(235 / r.mat.fy) * Math.sqrt(kt));
  near(r.panels[0].sb.lw, lw, 1e-12, 'λ̄_w');
});

test('Żebro pod siłą skupioną zastępuje docisk środnika; siła w żebrze wg (9.13)', () => {
  const st = blachownica();
  let r = J.run(st);
  assert.ok(r.checks.some(c => c.id === 'pt0'), 'bez żebra – docisk środnika');
  st.zebraSrodnika = [{ x: 4, strona: 'obie', bs: 130, ts: 14 }];
  r = J.run(st);
  assert.ok(!r.checks.some(c => c.id === 'pt0'), 'z żebrem – brak sprawdzenia docisku');
  const cN = r.checks.find(c => c.id === 'ZS1-N'), cD = r.checks.find(c => c.id === 'ZS1-D');
  assert.ok(cN && cD, 'sprawdzenia żebra pod siłą');
  // panel żebra nieograniczony z drugiej strony → bez członu od pola ścinania: N_st = F
  near(cN.Ed, cN.d.F, 1e-9, 'N_st = F');
  // sztywność: a = ∞ → I_st ≥ 0,75·h_w·t³
  const cI = r.checks.find(c => c.id === 'ZS1-I');
  near(cI.Ed, 0.75 * r.sec.hw * 8 ** 3, 1e-9, 'wymagane I_st');
  near(cI.Rd, 14 * Math.pow(2 * 130 + 8, 3) / 12 + 2 * 15 * Math.sqrt(235 / r.mat.fy) * 8 * 8 ** 3 / 12, 1e-9, 'I_st żebra obustronnego');
  // wyboczenie skrętne (9.2.1(8))
  const cT = r.checks.find(c => c.id === 'ZS1-T');
  near(cT.Rd, Math.sqrt(210000 / (5.3 * r.mat.fy)), 1e-9, 'b_s/t_s graniczne');
});

test('Żebro w osi podpory działa jako żebro podporowe (bez docisku środnika)', () => {
  const st = blachownica();
  st.podpory[1].wezel = { typ: 'brak' };
  st.zebraSrodnika = [{ x: 16, strona: 'obie', bs: 140, ts: 16 }];
  const r = J.run(st);
  assert.ok(r.checks.some(c => c.id === 'B-ZB'), 'żebro podporowe');
  assert.ok(!r.checks.some(c => c.id === 'B-PL'), 'brak docisku środnika');
  assert.ok(!r.checks.some(c => /^ZS1-/.test(c.id)), 'nie sprawdzane jako pośrednie');
});
