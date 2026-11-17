/* =====================================================================
   BelkaStal – okno „Projektowanie połączeń” (osobne, kompleksowe):
   wszystkie węzły podporowe i styki montażowe belki w jednym oknie;
   rodzaj połączenia (piktogramy), element podpierający, blachy /
   kątowniki, śruby (średnica, klasa, otwory, gwint, sprężanie,
   kategoria, powierzchnia cierna), rozmieszczenie, spoiny, podcięcia,
   siły (z obliczeń lub zadane, siła wiązania); rysunki w skali
   (klikane), sprawdzenia składnikowe z tokiem obliczeń, zalecenia
   konstrukcyjne, dobór automatyczny.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, W = BS.W, P = BS.P, M = BS.M, D = BS.D, Q = BS.Q, A = BS.A;
const { $, $$, esc, fmt, sym, parseNum, showNum } = Q;
const S = () => A.S(), R = () => A.R();
let cur = { sup: 0 };
const TYPES_S = ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane', 'oparcie', 'brak'];
const TNAME = { blacha_czolowa: 'Blacha czołowa', blacha_zebrowa: 'Blacha żebrowa', katowniki: 'Kątowniki podwójne', spawane: 'Spawane', oparcie: 'Płyta podporowa', brak: 'Oparcie na stali', nakladkowy: 'Nakładki śrubowe', spawany: 'Spoina czołowa' };
const BOLTS = () => Object.keys(M.SRUBY).map(k => [k, k]), BKL = () => Object.keys(M.SRUBY_KL).map(k => [k, 'kl. ' + k]);
const GAT = () => Object.keys(M.STAL).map(k => [k, k]);

/* ---------------------------------------------------------- dane wybranego węzła */
function ctxCur() {
  const st = S(), r = R(); if (!r || !r.md || !r.sec) return null;
  if (cur.styk !== undefined) {
    const s = st.styki[cur.styk]; if (!s) return null;
    const rs = (r.styki || [])[cur.styk] || {};
    return { kind: 'styk', base: `styki.${cur.styk}`, w: s, o: rs.o, F: rs.F, id: 'S' + (cur.styk + 1), title: `Styk S${cur.styk + 1} – x = ${fmt(U.num(s.x), 2)} m` };
  }
  const i = Math.min(cur.sup, st.podpory.length - 1), p = r.md.sup[i]; if (!p) return null;
  const rp = (r.podpory || []).find(q => q.id === p.id) || {}, w = st.podpory[i].wezel || (st.podpory[i].wezel = { typ: 'brak' });
  return { kind: 'sup', i, base: `podpory.${i}.wezel`, w, o: rp.pol, rp, F: rp.F, id: p.id, title: `Podpora ${p.id} – x = ${fmt(p.x / 1000, 2)} m` };
}
const checksOf = (c) => {
  if (c.o && c.o.checks) return c.o.checks;
  if (c.rp && c.rp.checks) return c.rp.checks.map(q => ({ grp: /^Kotwy|Kotwy płyty|kotwy:/.test(q.n) ? 'Kotwy (PN-EN 1992-4)' : /^Blacha podstawy|blacha podstawy:/.test(q.n) ? 'Blacha podstawy' : /^Spoiny belka/.test(q.n) ? 'Spoiny belka–blacha' : /Żebro/.test(q.n) ? 'Żebra' : /płyty|Docisk płyty/.test(q.n) ? 'Płyta podporowa' : /środnika/.test(q.n) ? 'Środnik belki' : 'Podpora', n: q.n, ref: q.ref, Ed: q.Ed, Rd: q.Rd, unit: q.unit, u: q.util, f: q.f || (q.d && q.d.f) || '', status: q.status }));
  return [];
};
const stOf = (u) => (u === null || u === undefined ? 'info' : !isFinite(u) || u > 1 + 1e-9 ? 'fail' : 'ok');

/* ---------------------------------------------------------- wymiary blach wynikają z rozmieszczenia śrub (otwory zawsze w obrysie blachy) */
const roRow = (l, id, v, f2) => `<div class="row" title="Wymiar wynika z rozmieszczenia śrub: ${esc(f2.replace(/^= /, ''))}"><label>${sym(l)}</label><div class="roval" id="${id}"><b>${fmt(v, 0)}</b> mm</div><span class="unit" style="font-size:10.5px;white-space:nowrap">auto</span></div>`;
function syncLayout(c) {
  const w = c.w, sec = R().sec, u = U.num;
  if (c.kind === 'sup' && ['blacha_czolowa', 'blacha_zebrowa', 'katowniki'].includes(w.typ)) {
    const nr = Math.max(1, Math.round(u(w.nr, u(w.n, 2)))); w.nr = nr; if (w.typ === 'blacha_zebrowa') w.n = nr;
    w.hp = w.typ === 'blacha_czolowa' && w.pelna ? sec.h : 2 * u(w.e1) + (nr - 1) * u(w.p1);
    if (w.typ === 'blacha_czolowa') w.bp = u(w.p3) + 2 * u(w.e2);
  } else if (c.kind === 'styk' && w.typ === 'nakladkowy') {
    const nw = Math.max(1, Math.round(u(w.nw, 3))); w.nw = nw; w.hpw = 2 * u(w.e1w) + (nw - 1) * u(w.p1w);
  }
}
function limits(c) {
  const w = c.w, sec = R().sec, u = U.num, B = M.SRUBY[w.d] || M.SRUBY.M16, d0 = B.d0, r = sec.r || 0, tw = sec.tw || 0;
  const H = c.kind === 'sup' && w.typ === 'blacha_czolowa' && w.pelna ? sec.h : W.webClear(sec, w);
  const nr = Math.max(1, Math.round(u(w.nr, 2))), e1 = u(w.e1), p1 = u(w.p1);
  const L = {
    nr: w.typ === 'blacha_czolowa' && w.pelna ? Math.floor((H - e1 - 1.2 * d0) / Math.max(1, p1)) + 1 : Math.floor((H - 2 * e1) / Math.max(1, p1)) + 1,
    e1: w.typ === 'blacha_czolowa' && w.pelna ? H - (nr - 1) * p1 - 1.2 * d0 : (H - (nr - 1) * p1) / 2,
    p1: nr > 1 ? (w.typ === 'blacha_czolowa' && w.pelna ? (H - e1 - 1.2 * d0) / (nr - 1) : (H - 2 * e1) / (nr - 1)) : 1e6,
    p3Min: Math.ceil(tw + 2 * u(w.a) * Math.SQRT2 + d0)
  };
  if (c.kind === 'styk') {
    const tf = Math.min(sec.tg || 10, sec.td || 10), Hw = sec.h - 2 * (tf + r) - 10, nw = Math.max(1, Math.round(u(w.nw, 3))), e1w = u(w.e1w), p1w = u(w.p1w);
    L.nw = Math.floor((Hw - 2 * e1w) / Math.max(1, p1w)) + 1; L.e1w = (Hw - (nw - 1) * p1w) / 2; L.p1w = nw > 1 ? (Hw - 2 * e1w) / (nw - 1) : 1e6;
    L.gfMin = Math.ceil(tw + 2 * r + d0); L.gfMax = Math.floor(Math.min(u(w.bfo, sec.bg), Math.min(sec.bg || 999, sec.bd || 999)) - 2.4 * d0);
  }
  Object.keys(L).forEach(k => { L[k] = Math.floor(L[k] * 10) / 10; });
  return L;
}
/* ---------------------------------------------------------- formularz */
function formHTML(c) {
  const b = c.base, w = c.w, sec = R().sec, t = w.typ, fN = A.fNum, fS = A.fSel, fC = A.fChk, lim = limits(c);
  const sub = (k, l) => `<div class="lsub" data-js="${k}">${l}</div>`;
  let h = '';
  if (c.kind === 'styk') {
    h += sub('type', 'Rodzaj styku') + `<div class="jtypes">${['nakladkowy', 'spawany'].map(k => `<button class="jtype ${w.typ === k ? 'on' : ''}" data-jt="${k}" type="button">${D.jointPict(k)}<span>${TNAME[k]}</span></button>`).join('')}</div>`;
    h += fN(b + '.x', 'Położenie styku x', 'm', [], { min: 0, re: true });
  } else {
    h += sub('type', 'Rodzaj połączenia') + `<div class="jtypes">${TYPES_S.map(k => `<button class="jtype ${t === k ? 'on' : ''}" data-jt="${k}" type="button" ${['blacha_czolowa', 'blacha_zebrowa', 'katowniki'].includes(k) && !(sec.kind === 'I' || sec.kind === 'U') ? 'disabled title="Dla dwuteowników i ceowników"' : ''}>${D.jointPict(k)}<span>${TNAME[k]}</span></button>`).join('')}</div>`;
  }
  // siły
  h += sub('forces', 'Siły obliczeniowe') + `<div id="jdF" class="hint" style="margin:2px 0 6px"></div>`;
  if (t !== 'oparcie' && t !== 'brak') {
    h += fC(b + '.silyRecz', 'Siły zadane ręcznie (zamiast wyników obliczeń belki)', { re: true });
    if (w.silyRecz) h += fN(b + '.VEd', 'V_{Ed}', 'kN', [], {}) + (c.kind === 'styk' || t === 'spawane' ? fN(b + '.MEd', 'M_{Ed}', 'kNm', [], {}) + fN(b + '.NEd', 'N_{Ed} (+ rozciąganie)', 'kN', [], {}) : '');
    if (c.kind === 'sup' && t !== 'spawane') h += fN(b + '.Nt', 'Siła wiązania N_{t} (sytuacja wyjątkowa)', 'kN', [0, 50, 75, 100, 150, 200], { min: 0 });
  }
  if (c.kind === 'sup' && (t === 'oparcie' || t === 'brak')) return h + A.jointFields(c.i, true);
  // element podpierający
  if (c.kind === 'sup') h += sub('sup', 'Element podpierający') + fS(b + '.sup', 'Rodzaj', Object.keys(W.PODPORA).map(k => [k, W.PODPORA[k]]), { wide: true }) + fN(b + '.tsup', 'Grubość ścianki t', 'mm', [6, 8, 10, 12, 15, 20, 25], { min: 3 }) + fS(b + '.supGat', 'Gatunek stali', GAT());
  // elementy łączące
  if (t === 'blacha_czolowa') h += sub('plate', 'Blacha czołowa') + fC(b + '.pelna', 'Blacha pełnej wysokości (spawana także do pasów)', { re: true }) + roRow('Wysokość h_{p}', 'jdHp', U.num(w.hp), w.pelna ? '= h belki' : '= 2e₁ + (n_r − 1)p₁') + roRow('Szerokość b_{p}', 'jdBp', U.num(w.bp), '= p₃ + 2e₂') + fN(b + '.tp', 'Grubość t_{p}', 'mm', [8, 10, 12, 15, 20], { min: 4 }) + fS(b + '.gatP', 'Gatunek blachy', GAT());
  if (t === 'blacha_zebrowa') h += sub('plate', 'Blacha żebrowa') + roRow('Wysokość h_{p}', 'jdHp', U.num(w.hp), '= 2e₁ + (n_r − 1)p₁') + roRow('Długość blachy', 'jdLp', U.num(w.z) + (U.num(w.nc, 1) - 1) * U.num(w.p2) + U.num(w.e2), '= z + (n_c − 1)p₂ + e₂') + fN(b + '.tp', 'Grubość t_{p}', 'mm', [8, 10, 12, 15], { min: 4 }) + fN(b + '.z', 'Lico podpory – 1. kolumna śrub z', 'mm', [50, 55, 60, 70, 80, 100], { min: 20 }) + fN(b + '.e2b', 'Koniec belki – 1. kolumna e_{2,b}', 'mm', [35, 40, 45, 50, 60], { min: 10 }) + fS(b + '.gatP', 'Gatunek blachy', GAT());
  if (t === 'katowniki') {
    const ser = w.Lser === 'LN' ? 'LN' : 'L';
    h += sub('angle', 'Kątowniki (2 szt.)') + fS(b + '.Lser', 'Seria', [['L', 'równoramienne L'], ['LN', 'nierównoramienne L']], { re: true }) + fS(b + '.L', 'Kątownik', P.lista(ser).map(n => [n, 'L ' + String(n).replace(/x/g, '×')])) + (ser === 'LN' ? fC(b + '.dlugiNaPodp', 'Dłuższe ramię na podporze') : '') + roRow('Długość kątowników h_{p}', 'jdHp', U.num(w.hp), '= 2e₁ + (n_r − 1)p₁') + fN(b + '.gb', 'Rozstaw g_{b} (ramię na belce)', 'mm', [35, 40, 45, 50, 55, 60], { min: 15 }) + fN(b + '.gs', 'Rozstaw g_{s} (ramię na podporze)', 'mm', [35, 40, 45, 50, 55, 60], { min: 15 }) + fN(b + '.gap', 'Szczelina belka–podpora c', 'mm', [5, 10, 15, 20], { min: 0 }) + fS(b + '.gatP', 'Gatunek kątowników', GAT());
  }
  if (t === 'spawane') h += sub('weld', 'Spoiny') + fS(b + '.spoiny', 'Rodzaj spoin', [['srodnik', 'pachwinowe – tylko środnik (przegub)'], ['obwodowe', 'pachwinowe obwodowe (środnik + pasy)'], ['czolowa', 'czołowa z pełnym przetopem']], { wide: true, re: true }) + (w.spoiny !== 'czolowa' ? fN(b + '.aw', 'Spoiny środnika a_{w}', 'mm', [3, 4, 5, 6, 7, 8, 10], { min: 3 }) + (w.spoiny === 'obwodowe' ? fN(b + '.af', 'Spoiny pasów a_{f}', 'mm', [4, 5, 6, 8, 10, 12], { min: 3 }) : '') : '');
  if (c.kind === 'styk' && w.typ === 'nakladkowy') {
    h += sub('fcov', 'Nakładki pasów') + fN(b + '.tfo', 'Zewnętrzna – grubość t_{fo}', 'mm', [8, 10, 12, 15, 20, 25], { min: 4 }) + fN(b + '.bfo', 'Zewnętrzna – szerokość b_{fo}', 'mm', [100, 120, 150, 180, 200, 250, 300], { min: 50 }) + fN(b + '.tfi', 'Wewnętrzne – grubość t_{fi} (0 – brak)', 'mm', [0, 8, 10, 12, 15], { min: 0, re: true }) + fN(b + '.bfi', 'Wewnętrzne – szerokość b_{fi}', 'mm', [40, 50, 60, 70, 80, 100], { min: 20 }) + fN(b + '.nf', 'Rzędy śrub n_{f} (na stronę styku)', 'szt.', [2, 3, 4, 5, 6], { min: 1 }) + fN(b + '.gf', 'Rozstaw poprzeczny g_{f}', 'mm', [70, 80, 90, 100, 110, 120, 140], { min: lim.gfMin, max: lim.gfMax, maxMsg: 'Otwory nie zmieszczą się w pasie / nakładce – g_f ≤ {max} mm' }) + fN(b + '.p1f', 'Rozstaw podłużny p_{1}', 'mm', [55, 60, 70, 80, 90, 100], { min: 20 }) + fN(b + '.e1f', 'Koniec nakładki e_{1}', 'mm', [30, 35, 40, 45, 50], { min: 10 }) + fN(b + '.ef', 'Koniec belki – 1. rząd e_{f}', 'mm', [30, 35, 40, 45, 50], { min: 10 }) + fN(b + '.gap', 'Szczelina między belkami g', 'mm', [5, 10, 15, 20], { min: 0 });
    h += sub('wcov', 'Nakładki środnika (2 szt.)') + fN(b + '.tpw', 'Grubość t_{p}', 'mm', [6, 8, 10, 12, 15], { min: 4 }) + roRow('Wysokość h_{p}', 'jdHp', U.num(w.hpw), '= 2e₁ + (n_w − 1)p₁') + fN(b + '.nw', 'Rzędy śrub n_{w}', 'szt.', [2, 3, 4, 5, 6, 7, 8], { min: 1, max: lim.nw, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – najwięcej {max} rzędów' }) + fN(b + '.ncw', 'Kolumny śrub (na stronę)', 'szt.', [1, 2, 3], { min: 1, max: 3 }) + fN(b + '.p1w', 'Rozstaw pionowy p_{1}', 'mm', [55, 60, 70, 80, 90, 100], { min: 20, max: lim.p1w, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – p₁ ≤ {max} mm' }) + fN(b + '.p2w', 'Rozstaw poziomy p_{2}', 'mm', [55, 60, 70, 80], { min: 20 }) + fN(b + '.e1w', 'Krawędź pozioma e_{1}', 'mm', [30, 35, 40, 45, 50], { min: 10, max: lim.e1w, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – e₁ ≤ {max} mm' }) + fN(b + '.ew', 'Koniec belki – 1. kolumna e_{w}', 'mm', [30, 35, 40, 45, 50], { min: 10 }) + fN(b + '.e2w', 'Koniec nakładki e_{2}', 'mm', [30, 35, 40, 45, 50], { min: 10 }) + fS(b + '.gatP', 'Gatunek nakładek', [['', 'jak belka']].concat(GAT()));
  }
  // śruby
  if (t !== 'spawane' && !(c.kind === 'styk' && w.typ === 'spawany')) {
    h += sub('bolts', 'Śruby') + fS(b + '.d', 'Średnica', BOLTS()) + fS(b + '.kl', 'Klasa', BKL(), { re: true }) + fS(b + '.otw', 'Otwory', [['normalne', 'normalne (d₀ = d + 1…3)'], ['powiekszone', 'powiększone']], { wide: true }) + fC(b + '.gwint', 'Gwint w płaszczyźnie ścinania');
    if (w.kl === '8.8' || w.kl === '10.9') { h += fC(b + '.sprezane', 'Śruby sprężane (PN-EN 14399, kontrolowane dokręcenie)', { re: true }); if (w.sprezane) h += fS(b + '.kat', 'Kategoria połączenia', [['A', 'A – docisk (sprężanie montażowe)'], ['B', 'B – cierne w SGU'], ['C', 'C – cierne w SGN']], { wide: true }) + fS(b + '.pow', 'Klasa powierzchni ciernej', Object.keys(W.MU).map(k => [k, W.MU_N[k]]), { wide: true }); }
    if (c.kind === 'sup') {
      h += sub('layout', 'Rozmieszczenie śrub') + fN(b + '.nr', 'Liczba rzędów n_{r}', 'szt.', [1, 2, 3, 4, 5, 6, 7, 8].filter(v => v <= lim.nr), { min: 1, max: lim.nr, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – najwięcej {max} rzędów' }) + (lim.nr < 1 ? '<p class="hint" style="color:var(--fail)">Rozmieszczenie nie mieści się w środniku – zmniejsz e₁ lub p₁.</p>' : '');
      if (t === 'blacha_zebrowa') h += fN(b + '.nc', 'Liczba kolumn', 'szt.', [1, 2], { min: 1, max: 2, re: true }) + (U.num(w.nc, 1) > 1 ? fN(b + '.p2', 'Rozstaw kolumn p_{2}', 'mm', [50, 55, 60, 70, 80], { min: 20, re: true }) : '');
      h += fN(b + '.e1', 'Krawędź pionowa e_{1}', 'mm', [30, 35, 40, 45, 50, 60], { min: 10, max: lim.e1, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – e₁ ≤ {max} mm' }) + fN(b + '.p1', 'Rozstaw pionowy p_{1}', 'mm', [55, 60, 65, 70, 75, 80, 90, 100], { min: 20, max: lim.p1, re: true, maxMsg: 'Otwory nie zmieszczą się w środniku belki (wysokość w świetle) – p₁ ≤ {max} mm' });
      if (t === 'blacha_czolowa') h += fN(b + '.p3', 'Rozstaw poprzeczny p_{3} (gauge)', 'mm', [70, 80, 90, 100, 110, 120, 140], { min: lim.p3Min, re: true }) + fN(b + '.e2', 'Krawędź boczna e_{2}', 'mm', [25, 30, 35, 40, 45, 50], { min: 10, re: true });
      if (t === 'blacha_zebrowa') h += fN(b + '.e2', 'Krawędź pozioma blachy e_{2}', 'mm', [35, 40, 45, 50, 60], { min: 10, re: true });
    }
  }
  if (t === 'blacha_czolowa' || t === 'blacha_zebrowa') h += sub('weld', 'Spoiny blachy') + fN(b + '.a', 'Grubość spoin pachwinowych a (dwustronne)', 'mm', [3, 4, 5, 6, 7, 8, 10], { min: 3 });
  if (c.kind === 'sup' && ['blacha_czolowa', 'blacha_zebrowa', 'katowniki'].includes(t)) h += sub('notch', 'Podcięcie belki (połączenie z podciągiem)') + fN(b + '.dnt', 'Głębokość podcięcia górnego d_{nt}', 'mm', [0, 20, 30, 40, 50, 60, 80], { min: 0, re: true }) + fN(b + '.dnb', 'Głębokość podcięcia dolnego d_{nb}', 'mm', [0, 20, 30, 40, 50, 60], { min: 0 }) + fN(b + '.ln', 'Długość podcięcia l_{n}', 'mm', [0, 80, 100, 120, 150], { min: 0 }) + (U.num(w.dnt) > 0 ? fN(b + '.e1b', 'Śruba – krawędź podcięcia e_{1,b}', 'mm', [30, 35, 40, 50, 60], { min: 10 }) : '');
  return h;
}

/* ---------------------------------------------------------- wyniki: siły, rysunki, sprawdzenia */
function forcesHTML(c) {
  const F = c.F, w = c.w;
  if (c.kind === 'styk') return F ? `M<sub>Ed</sub> = <b>${fmt(F.M / 1e6, 2)} kNm</b>, V<sub>Ed</sub> = <b>${fmt(F.V / 1e3, 1)} kN</b>${F.N ? `, N<sub>Ed</sub> = ${fmt(F.N / 1e3, 1)} kN` : ''} – ${F.recz ? 'zadane ręcznie' : 'obwiednia w miejscu styku (wszystkie etapy, wartości bezwzględne – bezpiecznie)'}` : '';
  const rp = c.rp || {};
  if (!F) return rp.Rmax ? `R<sub>Ed,max</sub> = <b>${fmt(rp.Rmax / 1e3, 1)} kN</b>${rp.Mmax > 1e3 ? ` · |M<sub>Ed</sub>| = ${fmt(rp.Mmax / 1e6, 1)} kNm` : ''}` : '';
  return `V<sub>Ed</sub> = <b>${fmt(F.V / 1e3, 1)} kN</b>${F.M ? ` · M<sub>Ed</sub> = ${fmt(F.M / 1e6, 1)} kNm` : ''}${F.Nt ? ` · N<sub>t</sub> = ${fmt(F.Nt / 1e3, 1)} kN (wiązanie)` : ''} · V<sub>ser</sub> ≈ ${fmt(F.Vser / 1e3, 1)} kN${F.recz ? ' – zadane ręcznie' : ` – z obliczeń belki${w.typ === 'spawane' && F.M ? ' (utwierdzenie)' : ''}`}`;
}
function viewsHTML(c, Wv) {
  const sec = R().sec;
  if (c.kind === 'styk') { if (c.w.typ === 'spawany') return `<div class="jview">${D.section(sec, { size: 260 })}</div><p class="hint">Styk spawany czołowy – spoiny z pełnym przetopem na całym obwodzie przekroju.</p>`; const v = D.spliceViews(sec, c.w, c.o, { W: Wv }); return `<div class="jview">${v.elev}</div><div class="jview">${v.sect}</div>`; }
  const t = c.w.typ;
  if (t === 'oparcie' || t === 'brak') { const ko = c.rp && c.rp.kotwy, v = ko ? D.anchorViews(sec, c.w, ko, { W: Math.min(Wv || 420, 460) }) : null; return `<div class="jview">${D.joint(sec, c.w, { W: 380, H: 280 })}</div>${v ? `<div class="jview">${v.plan}</div><div class="jview">${v.sect}</div>` : ''}`; }
  if (!c.o) return '<p class="hint">Brak wyniku – sprawdź komunikaty (np. rodzaj przekroju).</p>';
  const v = D.jointViews(sec, c.w, c.o, { W: Wv, H: 380 });
  return `<div class="jview">${v.elev}</div>${v.sect ? `<div class="jview">${v.sect}</div>` : ''}`;
}
function checksHTML(c) {
  const cs = checksOf(c);
  if (!cs.length) return '<p class="hint">Brak sprawdzeń (brak reakcji lub błąd danych).</p>';
  let h = '<table class="ctab jck"><tbody>', g = '';
  cs.forEach((q, k) => {
    if (q.grp !== g) { g = q.grp; h += `<tr class="g"><td colspan="3">${esc(g)}</td></tr>`; }
    const st = q.status || stOf(q.u);
    h += `<tr data-jc="${k}" class="xclick" title="Kliknij – tok obliczeń"><td>${esc(q.n)}<br><small class="hint" style="margin:0">${esc(q.ref || '')}</small></td><td class="val" style="white-space:nowrap">${q.unit === '-' ? fmt(q.Ed, 3) + ' ≤ 1,0' : `${A.unitFmt(q.Ed, q.unit)} ≤ ${A.unitFmt(q.Rd, q.unit)}`}</td><td class="bar" style="white-space:nowrap">${A.utilBar({ util: q.u, status: st })}</td></tr><tr class="jf" data-jf="${k}" style="display:none"><td colspan="3">${esc(q.f || '—')}</td></tr>`;
  });
  return h + '</tbody></table>';
}
function detailHTML(c) {
  const o = c.o; if (!o || !o.detal || !o.detal.length) return '';
  const rows = o.detal.map(d => `<tr class="${d.ok ? '' : d.typ === 'zal' ? 'warnrow' : 'failrow'}"><td>${d.ok ? '<span class="st ok">✔</span>' : d.typ === 'zal' ? '<span class="st warn">!</span>' : '<span class="st fail">✖</span>'}</td><td>${esc(d.el)}: ${esc(d.n)}</td><td class="n" style="white-space:nowrap">${fmt(d.v, 1)} ${d.rel} ${fmt(d.lim, 1)}</td></tr>`).join('');
  return `<div class="lsub">Konstrukcja (PN-EN 1993-1-8 tabl. 3.3) i zalecenia</div><table class="ctab"><tbody>${rows}</tbody></table>${(o.uwagi || []).map(t => `<p class="hint">${esc(t)}</p>`).join('')}`;
}
function summaryHTML(c) {
  const cs = checksOf(c), um = Math.max(0, ...cs.map(q => (isFinite(q.u) ? q.u || 0 : 9.99))), dF = c.o && c.o.detalFail ? c.o.detalFail.length : 0, zF = c.o && c.o.zalFail ? c.o.zalFail.length : 0;
  const st = um > 1 + 1e-9 || dF ? 'fail' : zF ? 'warn' : 'ok';
  const B = c.o && c.o.B;
  return `<div class="jsum ${st}"><b>${st === 'fail' ? '✖ Niespełnione warunki' : st === 'warn' ? '✔ Nośność spełniona · zalecenia: ' + zF : '✔ Wszystkie warunki spełnione'}</b> · max wytężenie <b>${fmt(um * 100, 0)}%</b>${B ? ` · śruby ${c.o.nb || c.o.n || 0} × ${esc(BS.W.boltTxt(B))}; F<sub>v,Rd</sub> = ${fmt(B.Fv / 1e3, 1)} kN, F<sub>t,Rd</sub> = ${fmt(B.Ft / 1e3, 1)} kN${B.pre ? `, F<sub>s,Rd</sub> = ${fmt(B.Fs / 1e3, 1)} kN` : ''}` : ''}${c.o && c.o.mass ? ` · masa blach / kątowników ${fmt(c.o.mass, 1)} kg` : ''}</div>`;
}
function tabsHTML(c) {
  const st = S(), r = R(), md = r.md;
  const chip = (cs, o) => { const um = Math.max(0, ...cs.map(q => (isFinite(q.u) ? q.u || 0 : 9.99))), bad = um > 1 + 1e-9 || (o && o.detalFail && o.detalFail.length); return `<i class="${bad ? 'fail' : 'ok'}">${bad ? '✖' : '✔'} ${fmt(um * 100, 0)}%</i>`; };
  let h = md.sup.map((p, i) => { const rp = (r.podpory || []).find(q => q.id === p.id) || {}, w = st.podpory[i].wezel || {}; return `<button class="btab ${cur.styk === undefined && cur.sup === i ? 'on' : ''}" data-jsup="${i}" type="button">Podpora ${esc(p.id)}<span>${esc(TNAME[w.typ || 'brak'])}</span>${chip(checksOf({ o: rp.pol, rp }), rp.pol)}</button>`; }).join('');
  h += (st.styki || []).map((s, j) => { const rs = (r.styki || [])[j] || {}; return `<button class="btab ${cur.styk === j ? 'on' : ''}" data-jsty="${j}" type="button">Styk S${j + 1}<span>${esc(TNAME[s.typ])} · x = ${fmt(U.num(s.x), 2)} m</span>${rs.o ? chip(rs.o.checks, rs.o) : ''}</button>`; }).join('');
  h += `<button class="btab add" data-jadd="1" type="button" title="Dodaj styk montażowy belki">+ styk</button>`;
  void c;
  return h;
}

/* ---------------------------------------------------------- okno */
A.jointDesigner = function (sel) {
  if (sel) cur = sel.styk !== undefined ? { styk: sel.styk } : { sup: sel.sup || 0 };
  const r = R(); if (!r || !r.md || !r.sec) { Q.toast('Najpierw usuń błędy danych.'); return; }
  const m = $('#modal');
  const live = () => {
    const c = ctxCur(); if (!c || !$('.dlg.jdes', m)) return;
    syncLayout(c);
    const setRo = (id, v) => { const e = $('#' + id, m); if (e) e.querySelector('b').textContent = fmt(v, 0); };
    setRo('jdHp', U.num(c.kind === 'styk' ? c.w.hpw : c.w.hp)); setRo('jdBp', U.num(c.w.bp)); setRo('jdLp', U.num(c.w.z) + (U.num(c.w.nc, 1) - 1) * U.num(c.w.p2) + U.num(c.w.e2));
    const vw = $('#jdV', m), wv = Math.max(360, Math.min(640, (vw ? vw.clientWidth : 560) - 12));
    $('#jdTabs', m).innerHTML = tabsHTML(c); bindTabs();
    $('#jdF', m).innerHTML = forcesHTML(c);
    $('#jdS', m).innerHTML = summaryHTML(c);
    vw.innerHTML = viewsHTML(c, wv); Q.themeSvgIn(vw);
    $$('.jz', vw).forEach(z => z.addEventListener('click', ev => { ev.stopPropagation(); focusSec(z.dataset.jz); }));
    $('#jdC', m).innerHTML = checksHTML(c) + detailHTML(c);
    $$('#jdC tr[data-jc]', m).forEach(tr => tr.addEventListener('click', () => { const f2 = $(`#jdC tr[data-jf="${tr.dataset.jc}"]`, m); if (f2) f2.style.display = f2.style.display === 'none' ? '' : 'none'; }));
  };
  const focusSec = (z) => {
    const map = { plate: 'plate', bolts: 'bolts', weld: 'weld', sup: 'sup', notch: 'notch', beam: 'notch', angle: 'angle', fcov: 'fcov', wcov: 'wcov' };
    const s = $(`#jdForm [data-js="${map[z] || z}"]`, m) || $(`#jdForm [data-js="layout"]`, m); if (!s) return;
    s.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const els = []; let n = s.nextElementSibling; while (n && !n.classList.contains('lsub') && els.length < 6) { const f = n.querySelector && n.querySelector('input, select'); if (f) els.push(f); n = n.nextElementSibling; }
    Q.hlg(els.length ? els : [s]);
  };
  const bindTabs = () => {
    $$('[data-jsup]', m).forEach(b => b.onclick = () => { cur = { sup: +b.dataset.jsup }; draw(); });
    $$('[data-jsty]', m).forEach(b => b.onclick = () => { cur = { styk: +b.dataset.jsty }; draw(); });
    $$('[data-jadd]', m).forEach(b => b.onclick = () => { const st = S(), md = R().md, sg = md.seg.find(z => !z.wsp) || md.seg[0]; st.styki = st.styki || []; st.styki.push(W.spliceDefaults(R().sec, +((sg.x0 + sg.x1) / 2000).toFixed(2))); cur = { styk: st.styki.length - 1 }; A.changed(true); A.recalcNow(); draw(); });
  };
  const draw = () => {
    const c = ctxCur(); if (!c) { A.setPopRedraw(null); Q.closeModal(); return; }
    syncLayout(c);
    const keep = $('#jdForm', m) ? $('#jdForm', m).scrollTop : 0;
    m.innerHTML = `<div class="dlg jdes" role="document"><div class="jhead"><h3 style="margin:0">Projektowanie połączeń</h3><span class="hint" style="margin:0">PN-EN 1993-1-8 · ${esc(c.title)}</span><span class="sp"></span><button class="btn sm pri" id="jdAuto" type="button" title="Najtańszy wariant tego rodzaju połączenia spełniający wszystkie warunki (wytężenie ≤ η z paska doboru)">⚙ Dobierz ten węzeł</button>${c.kind === 'sup' ? '<button class="btn sm" id="jdCopy" type="button" title="Skopiuj połączenie na pozostałe podpory belki">Kopiuj na inne podpory</button>' : '<button class="btn sm dng" id="jdDel" type="button">Usuń styk</button>'}<button class="btn sm" id="jdRep" type="button">Tok obliczeń…</button><button class="btn sm" id="nClose" type="button">Zamknij</button></div>
      <div class="beamtabs jtabs" id="jdTabs"></div>
      <div class="jbody"><div class="jcol fields" id="jdForm">${formHTML(c)}</div><div class="jcol"><div id="jdS"></div><div class="jviews" id="jdV"></div><p class="hint">Kliknij element rysunku (blachę, śruby, spoinę, podporę, podcięcie) – przejście do jego parametrów. Kolor śrub wg wytężenia (czerwony – przekroczenie); najedź na śrubę – siły.</p></div><div class="jcol" id="jdC"></div></div></div>`;
    m.style.display = 'flex';
    $('#jdForm', m).scrollTop = keep;
    A.bindFields($('#jdForm', m), (re) => { const c2 = ctxCur(); if (c2) syncLayout(c2); if (re) { A.recalcNow(); draw(); } });
    A.bindAnchorFields($('#jdForm', m), draw);
    $$('[data-jt]', m).forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.jt, st = S();
      if (c.kind === 'styk') { st.styki[cur.styk].typ = t; }
      else { const p0 = st.podpory[c.i], old = p0.wezel || {}; p0.wezel = Object.assign({ typ: t }, W.defaults(t, R().sec), ['sup', 'tsup', 'supGat', 'd', 'kl'].reduce((o2, k) => { if (old[k] !== undefined && t !== 'oparcie' && t !== 'brak') o2[k] = old[k]; return o2; }, {})); }
      A.changed(true); A.recalcNow(); draw();
    }));
    $('#nClose', m).onclick = () => { A.setPopRedraw(null); Q.closeModal(); };
    $('#jdAuto', m).onclick = () => autoCur();
    const cp = $('#jdCopy', m); if (cp) cp.onclick = () => { const st = S(); let n = 0; st.podpory.forEach((p2, k) => { if (k !== c.i) { p2.wezel = U.clone(c.w); n++; } }); A.changed(true); Q.toast(`Skopiowano połączenie na ${n} podpor${n === 1 ? 'ę' : 'y'}.`); };
    const dl = $('#jdDel', m); if (dl) dl.onclick = async () => { if (!(await Q.ask(`Usunąć styk S${cur.styk + 1}?`, 'Usuń', true))) return; S().styki.splice(cur.styk, 1); cur = { sup: 0 }; A.changed(true); A.recalcNow(); draw(); };
    $('#jdRep', m).onclick = () => repPopup();
    live();
  };
  const autoCur = () => {
    const c = ctxCur(), r2 = R(), eta = ((S().design && S().design.eta) || 100) / 100, ctx = J.jointCtx(r2.sec, r2.mat, r2.ndp, r2.base);
    let d;
    if (c.kind === 'styk') { if (!c.F) return; d = W.autoSplice(ctx, Object.assign(W.spliceDefaults(r2.sec, c.w.x), c.w), c.F, eta); if (d.ok) Object.assign(c.w, d.w); }
    else if (['oparcie', 'brak'].includes(c.w.typ)) { const dd = J.dobierzWezly(S(), r2, eta); S().podpory[c.i].wezel = dd.st.podpory[c.i].wezel; d = { ok: true }; Q.toast(dd.log.filter(t => t.indexOf(`Podpora ${c.id}`) === 0).join(' ') || 'Oparcie spełnia warunki.', 6000); }
    else { const rp = c.rp; d = W.auto(ctx, Object.assign({}, W.defaults(c.w.typ, r2.sec), c.w), J.jointForces(c.w, { Rmax: rp.Rmax, Mmax: rp.Mmax, Rk: rp.Rk, typ: S().podpory[c.i].typ }), eta); if (d.ok) Object.assign(c.w, d.w); }
    if (!d.ok) { Q.toast('Nie znaleziono wariantu spełniającego warunki – zmień rodzaj połączenia, klasę śrub lub gatunek blach.', 6000); return; }
    if (d.o) Q.toast(`Dobrano: ${c.kind === 'styk' ? 'styk nakładkowy' : J.jointTxt(c.w, r2.sec)} – wytężenie ${Math.round(d.o.u * 100)}%.`, 6000);
    A.changed(true); A.recalcNow(); draw();
  };
  const repPopup = () => {
    const c = ctxCur(); if (!c) return;
    const html = BS.Raport.jointBlock(S(), R(), c.kind === 'styk' ? { styk: cur.styk } : { sup: c.i });
    const n = $('#nmodal');
    n.innerHTML = `<div class="dlg" style="max-width:920px;max-height:90vh;overflow:auto"><h3>${esc(c.title)} – tok obliczeń</h3><div class="rep xrep">${html}</div><div class="dbtn"><button class="btn pri" id="jrClose" type="button">Zamknij</button></div></div>`;
    n.style.display = 'flex'; $('#jrClose', n).onclick = () => { n.style.display = 'none'; };
  };
  A.setPopRedraw(live);
  draw();
};
})();
