/* =====================================================================
   BelkaStal – interfejs (układ i sposób pracy jak w BelkaŻB/SłupŻB):
   chipy sprawdzeń, „Dobierz przekrój / połączenia / wszystko”, grupy
   pól z listami wartości typowych, klikany schemat (lewy przycisk –
   zaznaczanie przęseł, prawy – menu), legenda obciążeń z polami
   wyboru, wykres pod schematem, wiele belek w projekcie, pliki.
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, N = BS.N, P = BS.P, M = BS.M, D = BS.D, Q = BS.Q;
const { $, $$, esc, fmt, sym, getP, setP, parseNum, showNum, exDetails } = Q;
const A = BS.A = {};
let S = J.defaultState(), R = null, filePath = '', dirty = false;
let BEAMS = null, curB = 0;
let vStage = null;                              // etap pokazywany na schemacie (null – końcowy)
const selSpans = new Set();
let diagMode = (() => { try { return localStorage.getItem('bs.diag') || 'M'; } catch (e) { return 'M'; } })();
let showDims = (() => { try { return localStorage.getItem('bs.dims') !== '0'; } catch (e) { return true; } })();
let rendered = {};
A.S = () => S; A.R = () => R;
A.stage = () => (vStage === null || !R || !R.md ? (R && R.md ? R.md.nE - 1 : 0) : Math.min(vStage, R.md.nE - 1));
A.setStage = (i) => { vStage = i; rendered = {}; renderDataSide(); renderActive(); };
A.selSpans = selSpans;

/* ================================================================ DEFINICJE PÓL */
const rng = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push(+v.toFixed(3)); return r; };
const ND = (k) => `normy.ndp1.${k}`;
const stOpts = () => S.etapy.map((e, i) => [i, `${i + 1}. ${e.nazwa}`]);
const KIND = () => (S.przekroj || {}).typ || 'walc';
const serieOf = (t) => P.RODZAJE[t].serie.map(k => [k, P.SERIA_N[k] || k]);
const GROUPS = [
  { id: 'geo', title: 'Schemat statyczny i geometria', items: [
    { k: 'schemat', t: 'sel', l: 'Schemat statyczny', o: () => J.SCHEMATY.map(q => [q.id, q.n]).concat([['wlasny', 'własny (zmieniony na schemacie)']]), wide: true, re: true },
    { t: 'html', h: () => `<div class="row wide"><span></span><button class="btn sm" data-act="schemes" type="button">Schematy typowe…</button></div>` },
    { t: 'spans' },
    { k: 'geom.wspL', t: 'num', l: 'Wspornik lewy', u: 'm', list: [0, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3], min: 0, re: true },
    { k: 'geom.wspP', t: 'num', l: 'Wspornik prawy', u: 'm', list: [0, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3], min: 0, re: true },
    { k: 'analiza.ltRozstaw', t: 'num', l: 'Rozstaw stężeń bocznych l_{t}', u: 'm', list: ['', 1, 1.5, 2, 2.5, 3, 4, 5, 6], opt: true, ph: 'brak', min: 0.2 },
    { k: 'analiza.ltWys', t: 'sel', l: 'Stężenia l_{t} na wysokości', o: [['pas_g', 'pasa górnego'], ['pas_d', 'pasa dolnego'], ['srodek', 'środka ścinania']], show: s => U.num(s.analiza.ltRozstaw) > 0 },
    { k: 'stezenieCiagle.pasG', t: 'chk', l: 'Pas górny stężony ciągle (płyta, blacha fałdowa, płyty warstwowe)', re: true },
    { k: 'stezenieCiagle.odEtapu', t: 'sel', l: 'Stężenie ciągłe od etapu', o: stOpts, num: true, show: s => s.stezenieCiagle.pasG && s.etapy.length > 1 },
    { t: 'hint', ex: true, exT: 'Co to jest stężenie boczne?', h: () => 'Stężenie boczne – element, który w danym punkcie blokuje przemieszczenie boczne pasa (np. belka poprzeczna, płatew, stężenie montażowe). Stężenia pasa ściskanego najbardziej zwiększają moment krytyczny M<sub>cr</sub>. Stężenia dyskretne o dowolnym położeniu i typie (boczne / skrętne) – przycisk <b>Stężenia</b> nad schematem lub prawy przycisk na przęśle.' },
    { t: 'hint', h: () => R && R.md ? `Długość belki ${fmt(R.md.L / 1000, 2)} m · podpory: ${R.md.sup.map(p => p.id).join(', ')}${R.md.tmp.length ? ` · podpory montażowe: ${R.md.tmp.map(t => t.id).join(', ')}` : ''} · stężeń: ${R.md.stez.length}` : '' }
  ] },
  { id: 'sec', title: 'Przekrój i materiał', items: [
    { k: 'przekroj.typ', t: 'sel', l: 'Rodzaj przekroju', o: () => Object.keys(P.RODZAJE).map(k => [k, P.RODZAJE[k].n]), wide: true, re: true },
    { k: 'przekroj.seria', t: 'sel', l: 'Seria', o: () => serieOf(KIND()), show: s => KIND() !== 'spaw', re: true },
    { k: 'przekroj.nr', t: 'sel', l: 'Kształtownik', o: () => P.lista(S.przekroj.seria).map(n => [n, (KIND() === 'walc' || KIND() === 'ceow' ? S.przekroj.seria + ' ' : KIND() === 'kat' ? 'L ' : '') + String(n).replace(/x/g, '×')]), num: () => KIND() === 'walc' || KIND() === 'ceow', show: s => KIND() !== 'spaw' && s.przekroj.seria !== 'wlasna', re: true, badge: true },
    { k: 'przekroj.wyk', t: 'sel', l: 'Wykonanie rury', o: [['gor', 'gorąco wykończona (PN-EN 10210)'], ['zimn', 'formowana na zimno (PN-EN 10219)']], wide: true, show: () => KIND() === 'rura' },
    { k: 'przekroj.poz', t: 'sel', l: 'Ramię poziome kątownika', o: [['dol', 'u dołu (kształt L)'], ['gora', 'u góry (kształt Γ)']], show: () => KIND() === 'kat' },
    { k: 'przekroj.h', t: 'num', l: 'Wysokość h', u: 'mm', list: () => KIND() === 'rura' ? [40, 50, 60, 80, 100, 120, 140, 150, 160, 180, 200, 250, 300, 350, 400] : [300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000], min: 20, show: s => KIND() === 'spaw' || (KIND() === 'rura' && s.przekroj.seria === 'wlasna'), re: true, badge: true },
    { k: 'przekroj.b', t: 'num', l: 'Szerokość b', u: 'mm', list: [40, 50, 60, 80, 100, 120, 150, 200, 250, 300], min: 20, show: s => KIND() === 'rura' && s.przekroj.seria === 'wlasna', re: true },
    { k: 'przekroj.t', t: 'num', l: 'Grubość ścianki t', u: 'mm', list: [3, 4, 5, 6, 6.3, 8, 10, 12.5, 16], min: 1.5, show: s => KIND() === 'rura' && s.przekroj.seria === 'wlasna', re: true },
    { k: 'przekroj.bg', t: 'num', l: 'Pas górny – szerokość b_{g}', u: 'mm', list: rng(150, 600, 25), min: 30, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.tg', t: 'num', l: 'Pas górny – grubość t_{g}', u: 'mm', list: [8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40, 50], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.bd', t: 'num', l: 'Pas dolny – szerokość b_{d}', u: 'mm', list: rng(150, 600, 25), min: 30, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.td', t: 'num', l: 'Pas dolny – grubość t_{d}', u: 'mm', list: [8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40, 50], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.tw', t: 'num', l: 'Środnik – grubość t_{w}', u: 'mm', list: [5, 6, 8, 10, 12, 14, 16, 20], min: 3, show: () => KIND() === 'spaw', re: true },
    { k: 'przekroj.aw', t: 'num', l: 'Spoina pas–środnik a', u: 'mm', list: [3, 4, 5, 6, 7, 8], min: 0, show: () => KIND() === 'spaw' },
    { k: 'material.gatunek', t: 'sel', l: 'Gatunek stali', o: () => Object.keys(M.STAL).map(k => [k, `${k} (${M.STAL[k].norma})`]), wide: true, re: true },
    { k: 'material.podgatunek', t: 'sel', l: 'Podgatunek (udarność)', o: () => (M.STAL[S.material.gatunek] || { pod: ['JR'] }).pod.map(k => [k, `${k} – 27 J w ${M.T27J[k]} °C`]), wide: true },
    { t: 'hint', h: () => secHint() },
    { t: 'html', h: () => `<div class="row wide"><span></span><span><button class="btn sm" data-act="secwin" type="button">Przekrój…</button> <button class="btn sm" data-act="sectab" type="button">Tablica kształtowników…</button></span></div>` }
  ] },
  { id: 'load', title: 'Obciążenia', items: [
    { t: 'sub', l: 'Kombinacje i siły przekrojowe' },
    { k: ND('komb'), t: 'sel', l: 'Kombinacja SGN (PN-EN 1990)', o: [['6.10ab', 'wzory 6.10a i 6.10b'], ['6.10', 'wzór 6.10']], wide: true, re: true },
    { k: ND('gG_sup'), t: 'num', l: 'γ_{G,sup} (γ_{G,inf} = 1,0)', list: [1.0, 1.15, 1.35], min: 0 },
    { k: ND('gQ'), t: 'num', l: 'γ_{Q}', list: [0, 1.0, 1.5], min: 0 },
    { k: ND('xi'), t: 'num', l: 'ξ (redukcja obc. stałych w 6.10b)', list: [0.85, 0.9, 1.0], min: 0, show: s => s.normy.ndp1.komb !== '6.10' },
    { k: ND('psiAcc'), t: 'sel', l: 'Wiodące zmienne w 6.11b (wyjątkowa, pożar)', o: [['psi1', 'ψ₁ – wartość częsta'], ['psi2', 'ψ₂ – wartość quasi-stała']], wide: true, show: s => s.pozar.aktywny || s.obciazenia.some(o => o.rodzaj === 'A') },
    { t: 'hint', h: () => 'Obciążenia zadajesz na schemacie: przycisk <b>Obciążenia</b> nad schematem (całej belki albo zaznaczonych przęseł) lub prawy przycisk na przęśle. Kliknięcie pasma obciążenia – zmiana; pole wyboru przy paśmie – uwzględnij / pomiń w obliczeniach.' },
    { t: 'html', h: () => loadMiniHTML() }
  ] },
  { id: 'stab', title: 'Stateczność', items: [
    { k: ND('ltbMet'), t: 'sel', l: 'Metoda χ_{LT}', o: [['6.3.2.3', '6.3.2.3 – walcowane i spawane równoważne'], ['6.3.2.2', '6.3.2.2 – przypadek ogólny']], wide: true },
    { k: ND('kcMet'), t: 'sel', l: 'Współczynnik k_{c}', o: [['tab66', 'tabl. 6.6 / 1/√C₁ (MES)'], ['1', 'k_c = 1 (f = 1, bezpiecznie)']], wide: true },
    { k: 'analiza.muY', t: 'num', l: 'Wyboczenie w płaszczyźnie μ_{y}', list: [0.5, 0.7, 0.85, 1, 1.5, 2], min: 0.1 },
    { k: 'analiza.muZ', t: 'num', l: 'Wyboczenie z płaszczyzny μ_{z}', list: [0.5, 0.7, 0.85, 1], min: 0.1 },
    { k: 'analiza.zebraRozstaw', t: 'num', l: 'Rozstaw żeber środnika a', u: 'm', list: [0, 0.5, 1, 1.5, 2, 2.5, 3], min: 0, ph: '0 – brak' },
    { k: 'analiza.slupekSztywny', t: 'chk', l: 'Sztywny słupek podporowy (wyboczenie środnika przy ścinaniu)' },
    { t: 'hint', ex: true, exT: 'Jak liczony jest moment krytyczny M_cr?', h: () => 'M<sub>cr</sub> wyznacza metoda elementów skończonych (u, u′, φ, φ′) dla rzeczywistego rozkładu M<sub>y</sub> z każdej decydującej kombinacji i każdego etapu – z wysokością przyłożenia obciążeń (pas górny / środek ścinania / pas dolny), monosymetrią przekroju i wszystkimi stężeniami. Postać zwichrzenia – zakładka <b>Stateczność</b>.' }
  ] },
  { id: 'conn', title: 'Połączenia i styki', items: [
    { t: 'html', h: () => connSummaryHTML() },
    { t: 'hint', ex: true, exT: 'Jakie połączenia można zaprojektować?', h: () => 'Podpory: blacha czołowa (krótka lub pełna), blacha żebrowa (1–2 kolumny śrub), kątowniki podwójne, połączenie spawane (środnik, obwodowe, czołowe), płyta podporowa, oparcie na stali z żebrami. Styki montażowe: nakładkowy śrubowy (nakładki pasów zewnętrzne i wewnętrzne, nakładki środnika; kategorie A/B/C, śruby sprężane) lub spawany czołowy. Śruby: M12–M30, klasy 4.6–10.9, otwory normalne lub powiększone, gwint w płaszczyźnie ścinania. Sprawdzenia wg PN-EN 1993-1-8 (tabl. 3.3, 3.4, 3.7–3.10, 4.5, 6.2.4) i zaleceń SCI P358 (ciągliwość, stężenie skrętne).' }
  ] },
  { id: 'sls', title: 'SGU – parametry', items: [
    { k: 'sgu.typ', t: 'sel', l: 'Rodzaj elementu', o: () => Object.keys(N.UGIECIA).map(k => [k, N.UGIECIA[k].nazwa]), wide: true, re: true },
    { k: 'sgu.wmax', t: 'sel', l: 'Ugięcie graniczne w_{max}', o: [150, 200, 250, 300, 350, 400, 500].map(v => [v, 'L/' + v]), num: true },
    { k: 'sgu.w3', t: 'sel', l: 'Ugięcie od zmiennych w_{3}', o: [200, 250, 300, 350, 400, 500, 600].map(v => [v, 'L/' + v]), num: true },
    { k: 'sgu.podniesienie', t: 'sel', l: 'Podniesienie wykonawcze w_{c}', o: [['brak', 'brak'], ['auto', 'równe ugięciu od G'], ['wartosc', 'zadana strzałka']], wide: true, re: true },
    { k: 'sgu.wc', t: 'num', l: 'Strzałka podniesienia w_{c}', u: 'mm', list: [5, 10, 15, 20, 25, 30, 40, 50], min: 0, show: s => s.sgu.podniesienie === 'wartosc' },
    { k: 'sgu.fmin', t: 'num', l: 'Częstotliwość f_{min}', u: 'Hz', list: [3, 4, 5, 6, 8, 10], min: 0, show: s => s.sgu.drgania !== false },
    { k: 'sgu.uLim', t: 'sel', l: 'Przemieszczenie poziome u', o: [100, 150, 200, 250, 300].map(v => [v, 'L/' + v]), num: true },
    { t: 'hint', ex: true, exT: 'Kiedy L/200, L/250, L/350…?', h: () => 'Kryteria ugięć uzgadnia się z inwestorem (PN-EN 1990, A1.4.2) – wartości domyślne wg praktyki krajowej (por. ZK do PN-EN 1993-1-1): stropy L/250, stropy pod kruchymi ściankami i tynkami L/350, płatwie i rygle L/200, podciągi L/350. Dla wspornika L = 2·L<sub>w</sub>. Podniesienie wykonawcze odejmuje się od ugięcia całkowitego (w<sub>max</sub> = w<sub>tot</sub> − w<sub>c</sub>).' }
  ] },
  { id: 'fire', title: 'Pożar – PN-EN 1993-1-2', show: s => s.pozar.aktywny, items: [
    { k: 'pozar.R', t: 'sel', l: 'Wymagana klasa odporności', o: [15, 30, 45, 60, 90, 120, 180, 240].map(v => [v, 'R' + v]), num: true },
    { k: 'pozar.ekspozycja', t: 'sel', l: 'Nagrzewanie', o: [['3', 'z 3 stron (płyta na pasie górnym)'], ['4', 'z 4 stron']], wide: true },
    { k: 'pozar.ochrona', t: 'sel', l: 'Zabezpieczenie ogniochronne', o: [['brak', 'brak'], ['plyty', 'okładzina płytowa (skrzynkowa)'], ['natrysk', 'natrysk / powłoka (konturowa)']], wide: true, re: true },
    { k: 'pozar.dp', t: 'num', l: 'Grubość zabezpieczenia d_{p}', u: 'mm', list: [10, 12.5, 15, 20, 25, 30, 40, 50], min: 1, show: s => s.pozar.ochrona !== 'brak' },
    { k: 'pozar.lp', t: 'num', l: 'Przewodność λ_{p}', u: 'W/mK', list: [0.08, 0.1, 0.12, 0.15, 0.2, 0.25], min: 0.01, show: s => s.pozar.ochrona !== 'brak' },
    { k: 'pozar.cp', t: 'num', l: 'Ciepło właściwe c_{p}', u: 'J/kgK', list: [1000, 1100, 1200, 1500], min: 100, show: s => s.pozar.ochrona !== 'brak' },
    { k: 'pozar.rp', t: 'num', l: 'Gęstość ρ_{p}', u: 'kg/m³', list: [150, 300, 500, 800, 900], min: 10, show: s => s.pozar.ochrona !== 'brak' },
    { k: 'pozar.kappa1', t: 'num', l: 'κ_{1} (puste – automatycznie)', list: ['', 0.7, 0.85, 1.0], opt: true, ph: 'auto' }
  ] },
  { id: 'fat', title: 'Zmęczenie – PN-EN 1993-1-9', show: s => s.zmeczenie.aktywny, items: [
    { t: 'html', h: () => `<div class="row wide"><label>Przypadki cykliczne</label><span>${S.obciazenia.filter(o => !BS.S.RODZAJE[o.rodzaj].stale).map(o => `<label class="chk sm"><input type="checkbox" data-fatc="${esc(o.id)}" ${(S.zmeczenie.przypadki || []).includes(o.id) ? 'checked' : ''}><span>${esc(o.id)}</span></label>`).join(' ') || '<span class="hint">brak obciążeń zmiennych</span>'}</span></div>` },
    { k: 'zmeczenie.n', t: 'num', l: 'Liczba cykli n w okresie użytkowania', list: [1e5, 5e5, 1e6, 2e6, 5e6, 1e7], min: 1 },
    { k: 'zmeczenie.phi', t: 'num', l: 'Współczynnik dynamiczny φ', list: [1.0, 1.1, 1.2, 1.3, 1.5], min: 1 },
    { k: 'zmeczenie.zmiennyZnak', t: 'chk', l: 'Obciążenie zmienia znak (zakres ×2)' },
    { k: 'zmeczenie.ocena', t: 'sel', l: 'Metoda oceny', o: [['tolerancja', 'tolerancji uszkodzeń'], ['bezpieczna', 'bezpiecznego okresu użytkowania']], wide: true },
    { k: 'zmeczenie.skutki', t: 'sel', l: 'Skutki zniszczenia', o: [['male', 'małe'], ['duze', 'duże']] },
    { t: 'html', h: () => fatDetHTML() },
    { k: 'zmeczenie.dtc', t: 'num', l: 'Δτ_{c} środnika', u: 'MPa', list: [80, 100], min: 10 }
  ] },
  { id: 'brit', title: 'Dobór stali – kruche pękanie (PN-EN 1993-1-10)', closed: true, items: [
    { k: 'kruche.Tmd', t: 'num', l: 'Temperatura minimalna T_{md}', u: '°C', list: [0, -10, -15, -20, -25, -30, -32, -34, -36, -38], max: 30 },
    { k: 'kruche.dTr', t: 'num', l: 'ΔT_{r} (promieniowanie)', u: 'K', list: [0, -3, -5], },
    { k: 'kruche.dTeps', t: 'num', l: 'ΔT_{ε̇} (prędkość odkształceń)', u: 'K', list: [0, -10, -20] },
    { k: 'kruche.dTcf', t: 'num', l: 'ΔT_{εcf} (zgniot na zimno)', u: 'K', list: [0, -10, -20] },
    { k: 'kruche.plyty', t: 'num', l: 'σ_{Ed}/f_{y}(t) dla blach połączeń', list: [0.25, 0.5, 0.75], min: 0.05, max: 1 },
    { k: 'kruche.z.aktywny', t: 'chk', l: 'Wymagania w kierunku grubości (klasa Z)', re: true },
    { k: 'kruche.z.a', t: 'num', l: 'Grubość spoiny a_{eff}', u: 'mm', list: [5, 7, 10, 15, 20, 30], show: s => s.kruche.z.aktywny },
    { k: 'kruche.z.Zb', t: 'num', l: 'Z_{b} – kształt złącza (tabl. 3.2 b)', list: [-25, -10, -5, 0, 3, 5, 8], show: s => s.kruche.z.aktywny },
    { k: 'kruche.z.s', t: 'num', l: 'Grubość blachy s', u: 'mm', list: [10, 20, 30, 40, 50, 60], show: s => s.kruche.z.aktywny },
    { k: 'kruche.z.Zd', t: 'sel', l: 'Z_{d} – sztywność skurczu', o: [[0, '0 – małe'], [3, '3 – średnie'], [5, '5 – duże']], num: true, show: s => s.kruche.z.aktywny },
    { k: 'kruche.z.Ze', t: 'sel', l: 'Z_{e} – podgrzewanie', o: [[0, '0 – bez podgrzewania'], [-8, '−8 – podgrzewanie ≥ 100 °C']], num: true, show: s => s.kruche.z.aktywny },
    { t: 'hint', h: () => 'T<sub>md</sub> – temperatura minimalna powietrza (ZK do PN-EN 1991-1-5, mapa T<sub>min</sub>); dla wnętrz ogrzewanych można przyjąć wyższą. ΔT<sub>R</sub> – w grupie Współczynniki.' }
  ] },
  { id: 'exec', title: 'Wykonanie (PN-EN 1090-2)', closed: true, items: [
    { k: 'wykonanie.CC', t: 'sel', l: 'Klasa konsekwencji', o: [['CC1', 'CC1'], ['CC2', 'CC2'], ['CC3', 'CC3']] },
    { k: 'wykonanie.EXC', t: 'sel', l: 'Klasa wykonania', o: [['auto', 'automatycznie (PN-EN 1993-1-1, zał. C)'], ['EXC1', 'EXC1'], ['EXC2', 'EXC2'], ['EXC3', 'EXC3'], ['EXC4', 'EXC4']], wide: true, re: true },
    { k: 'wykonanie.uzasadnienie', t: 'txt', l: 'Uzasadnienie', show: s => s.wykonanie.EXC !== 'auto' },
    { k: 'wykonanie.korozja', t: 'sel', l: 'Korozyjność (PN-EN ISO 12944-2)', o: ['C1', 'C2', 'C3', 'C4', 'C5', 'CX'].map(k => [k, k]) },
    { k: 'wykonanie.trwalosc', t: 'sel', l: 'Trwałość ochrony', o: [['L', 'L (≤ 7 lat)'], ['M', 'M (7–15 lat)'], ['H', 'H (15–25 lat)'], ['VH', 'VH (> 25 lat)']] },
    { k: 'wykonanie.uwagi', t: 'txt', l: 'Uwagi wykonawcze' },
    { t: 'hint', h: () => R && R.exc ? `Przyjęto <b>${R.exc.exc}</b>: ${esc(R.exc.why.join('; '))}.` : '' }
  ] },
  { id: 'coef', title: 'Współczynniki (Załącznik krajowy PL)', closed: true, items: [
    { k: ND('gM0'), t: 'num', l: 'γ_{M0} – nośność przekroju', list: [1.0, 1.05, 1.1], min: 1 },
    { k: ND('gM1'), t: 'num', l: 'γ_{M1} – stateczność elementu', list: [1.0, 1.05, 1.1], min: 1 },
    { k: ND('gM2'), t: 'num', l: 'γ_{M2} – połączenia, przekrój netto', list: [1.25], min: 1 },
    { k: ND('gMfi'), t: 'num', l: 'γ_{M,fi} – pożar', list: [1.0], min: 1 },
    { k: ND('eta'), t: 'num', l: 'η – ścinanie (PN-EN 1993-1-5, 5.1)', list: [1.0, 1.2], min: 1 },
    { k: ND('lamLT0'), t: 'num', l: 'λ_{LT,0} (6.3.2.3)', list: [0.2, 0.4], min: 0 },
    { k: ND('betaLT'), t: 'num', l: 'β (6.3.2.3)', list: [0.75, 1.0], min: 0.1 },
    { k: ND('KFI'), t: 'num', l: 'K_{FI} (PN-EN 1990, zał. B)', list: [0.9, 1.0, 1.1], min: 0.5 },
    { k: ND('gG_sup_equ'), t: 'num', l: 'γ_{G,sup} (EQU)', list: [1.1], min: 0 },
    { k: ND('gG_inf_equ'), t: 'num', l: 'γ_{G,inf} (EQU)', list: [0.9], min: 0 },
    { k: ND('fySrc'), t: 'sel', l: 'Źródło f_{y}, f_{u}', o: [['tab31', 'PN-EN 1993-1-1, tabl. 3.1'], ['wyrob', 'norma wyrobu (EN 10025)']], wide: true },
    { k: ND('dTR'), t: 'num', l: 'ΔT_{R} (PN-EN 1993-1-10)', u: 'K', list: [0, 5, 10] },
    { k: ND('gc'), t: 'num', l: 'γ_{c} – beton (oparcia)', list: [1.4, 1.5], min: 1 },
    { t: 'hint', h: () => 'Wartości z polskich załączników krajowych do PN-EN 1990 i PN-EN 1993 (1. generacja). Pełne zestawienie dokumentów, wydań, zmian i poprawek – w raporcie (Podstawa normowa).' }
  ] }
];
A.GROUPS = GROUPS;

function secHint() {
  if (!R || !R.sec || !R.base) return '';
  const s = R.sec, b = R.base;
  return `${esc(s.nazwa)}: A = ${fmt(s.A / 100, 1)} cm², I<sub>y</sub> = ${fmt(s.Iy / 1e4, 0)} cm⁴, W<sub>pl,y</sub> = ${fmt(s.Wpl_y / 1e3, 1)} cm³, ${fmt(s.masa, 1)} kg/m · f<sub>y</sub> = ${R.mat.fy} MPa, f<sub>u</sub> = ${R.mat.fu} MPa · klasa przy zginaniu ${b.kPos.cls}${b.kNeg.cls !== b.kPos.cls ? '/' + b.kNeg.cls : ''} · M<sub>c,Rd</sub> = ${fmt(b.Mc_pos / 1e6, 1)} kNm, V<sub>Rd</sub> = ${fmt(b.Vpl / 1e3, 1)} kN`;
}
function connSummaryHTML() {
  if (!R || !R.md) return '';
  const row = (lab, txt, cs, attr) => { const um = Math.max(0, ...cs.filter(c => c.util !== null && isFinite(c.util)).map(c => c.util)), bad = cs.some(c => c.status === 'fail'); return `<tr ${attr} class="xclick" style="cursor:pointer"><td style="white-space:nowrap"><b>${lab}</b></td><td style="text-align:left">${esc(txt)}</td><td class="n"><span class="st ${bad ? 'fail' : cs.some(c => c.status === 'warn') ? 'warn' : 'ok'}">${bad ? '✖' : '✔'} ${fmt(um * 100, 0)}%</span></td></tr>`; };
  let h = '<table class="kv" style="width:100%">';
  R.md.sup.forEach((p, i) => { const rp = (R.podpory || []).find(q => q.id === p.id) || { checks: [] }; h += row(`Podpora ${p.id}`, J.jointTxt((S.podpory[i] || {}).wezel || {}, R.sec), rp.checks, `data-cjs="${i}"`); });
  (S.styki || []).forEach((st2, j) => { const cs = R.checks.filter(c => c.id.indexOf(`S${j + 1}-`) === 0); h += row(`Styk S${j + 1}`, `x = ${fmt(U.num(st2.x), 2)} m – ${(BS.W.STYKI[st2.typ] || '')}`, cs, `data-cjt="${j}"`); });
  return h + `</table><div class="row wide"><span></span><span><button class="btn sm pri" data-act="jdes" type="button">Projektowanie połączeń…</button> <button class="btn sm" data-act="addsplice" type="button">+ styk montażowy</button></span></div>`;
}
function loadMiniHTML() {
  const n = S.obciazenia.length, on = S.obciazenia.filter(o => o.aktywne !== false).length;
  return `<div class="row wide"><span class="hint" style="margin:0">Przypadków obciążeń: <b>${n}</b>${n !== on ? ` (uwzględnionych ${on})` : ''}</span><button class="btn sm" data-act="loads" type="button">Obciążenia…</button></div>`;
}
function fatDetHTML() {
  const L = S.zmeczenie.detale || [];
  return `<div class="lsub">Szczegóły konstrukcyjne (kategorie Δσ<sub>c</sub>)</div>` + L.map((d, i) => `<div class="lrow"><select data-fd="${i}" data-fk="k">${BS.X.DETALE.map(q => `<option value="${q.k}" ${q.k === d.k ? 'selected' : ''}>${esc(q.n)}</option>`).join('')}</select><select data-fd="${i}" data-fk="miejsce">${[['pas_d', 'pas dolny'], ['pas_g', 'pas górny'], ['spoina_d', 'styk pas d.–środnik'], ['spoina_g', 'styk pas g.–środnik']].map(([k, l]) => `<option value="${k}" ${k === d.miejsce ? 'selected' : ''}>${l}</option>`).join('')}</select>${d.k === 'user' ? `<input class="txt sm" data-fd="${i}" data-fk="dc" value="${esc(showNum(d.dc || 71))}" title="Δσc [MPa]">` : ''}<button class="del sm" data-fdel="${i}" title="Usuń">×</button></div>`).join('') + `<button class="addp" data-fadd="1" type="button">+ szczegół</button>`;
}
function spansHTML() {
  const n = S.geom.przesla.length;
  let h = `<div class="row"><label>Liczba przęseł</label><select data-nspan="1">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(v => `<option value="${v}" ${v === n ? 'selected' : ''}>${v === 0 ? '0 – sam wspornik' : v}</option>`).join('')}</select><span></span></div>`;
  S.geom.przesla.forEach((v, i) => {
    h += `<div class="row"><label>${n > 1 ? `Przęsło ${i + 1}: rozpiętość` : 'Rozpiętość'} L${n > 1 ? `<sub>${i + 1}</sub>` : '<sub>eff</sub>'}</label><div class="combo"><input data-k="geom.przesla.${i}" value="${esc(showNum(v))}" data-min="0.2" data-re="1" autocomplete="off" spellcheck="false"><button tabindex="-1" type="button" data-list="${esc(JSON.stringify([2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 12, 15, 18, 20]))}" aria-label="lista">▾</button></div><span class="unit">m</span></div>`;
  });
  return h;
}

/* ================================================================ POLA FORMULARZA */
const optsOf = (f) => (typeof f.o === 'function' ? f.o(S) : f.o);
function hintHTML(f) { const h = f.h(S); if (!h) return ''; return f.ex ? exDetails(h, f.exT) : h; }
function fieldsHTML(items, gid) {
  let html = '';
  items.forEach((f, i) => {
    if (f.show && !f.show(S)) return;
    const id = `f_${gid}_${i}`;
    if (f.t === 'hint') { const h = hintHTML(f); if (h) html += `<div class="hint">${h}</div>`; return; }
    if (f.t === 'sub') { html += `<div class="lsub">${sym(f.l)}</div>`; return; }
    if (f.t === 'html') { html += f.h(S); return; }
    if (f.t === 'spans') { html += spansHTML(); return; }
    if (f.t === 'sel') {
      const v = getP(S, f.k), num = typeof f.num === 'function' ? f.num() : f.num;
      const sel = optsOf(f).map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('');
      html += `<div class="row ${f.wide ? 'wide' : ''}"><label for="${id}">${sym(f.l)}</label><select id="${id}" data-k="${f.k}" data-num="${num ? 1 : ''}" data-re="${f.re ? 1 : ''}">${sel}</select>${f.wide ? '' : '<span></span>'}</div>`;
    } else if (f.t === 'num') {
      const v = getP(S, f.k), list = typeof f.list === 'function' ? f.list() : (f.list || []);
      html += `<div class="row"><label for="${id}">${sym(f.l)}</label><div class="combo"><input id="${id}" data-k="${f.k}" value="${esc(showNum(v))}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} data-opt="${f.opt ? 1 : ''}" data-min="${f.min !== undefined ? f.min : ''}" data-max="${f.max !== undefined ? f.max : ''}" data-re="${f.re ? 1 : ''}" autocomplete="off" spellcheck="false"><button tabindex="-1" type="button" data-list="${esc(JSON.stringify(list))}" aria-label="lista">▾</button></div><span class="unit">${f.u || ''}</span></div>`;
    } else if (f.t === 'txt') {
      html += `<div class="row wide"><label for="${id}">${sym(f.l)}</label><input class="txt" id="${id}" data-kt="${f.k}" value="${esc(getP(S, f.k) || '')}" spellcheck="false" autocomplete="off"></div>`;
    } else if (f.t === 'chk') {
      html += `<label class="chk"><input type="checkbox" data-k="${f.k}" data-re="${f.re ? 1 : ''}" ${getP(S, f.k) ? 'checked' : ''}><span>${sym(f.l)}</span></label>`;
    }
  });
  return html;
}
A.fieldsHTML = fieldsHTML;
let openG = null;
function isOpen(g) {
  if (!openG) { try { openG = JSON.parse(localStorage.getItem('bs.grp') || 'null'); } catch (e) { openG = null; } }
  if (openG && g.id in openG) return openG[g.id];
  return !g.closed;
}
function renderInputs() {
  const el = $('#inputs'); if (!el) return;
  const sc = el.closest('.dleft') ? el.closest('.dleft').scrollTop : 0;
  el.innerHTML = GROUPS.filter(g => !g.show || g.show(S)).map(g => `<details class="grp" data-g="${g.id}" ${isOpen(g) ? 'open' : ''}><summary>${esc(g.title)}</summary><div class="fields">${fieldsHTML(g.items, g.id)}</div></details>`).join('');
  bindFields(el);
  $$('details.grp', el).forEach(d => d.addEventListener('toggle', () => { openG = openG || {}; openG[d.dataset.g] = d.open; try { localStorage.setItem('bs.grp', JSON.stringify(openG)); } catch (e) { /* */ } }));
  renderAutoBar(); renderDsum(); renderDataSide();
  if (el.closest('.dleft')) el.closest('.dleft').scrollTop = sc;
}
A.renderInputs = renderInputs;

/* skutki zmian wybranych pól */
function onSet(k, v) {
  if (k === 'schemat' && v !== 'wlasny') { J.applyScheme(S, v); selSpans.clear(); }
  if (/^geom\./.test(k) || k === 'nspan') { syncSupports(); if (k !== 'schemat') S.schemat = schemeOf(); }
  if (k === 'sgu.typ' && N.UGIECIA[v]) { S.sgu.wmax = N.UGIECIA[v].wmax; S.sgu.w3 = N.UGIECIA[v].w3; }
  if (k === 'przekroj.typ') {
    const d = S.przekroj;
    if (v === 'walc') Object.assign(d, { seria: 'IPE', nr: 300 });
    else if (v === 'ceow') Object.assign(d, { seria: 'UPN', nr: 200 });
    else if (v === 'kat') Object.assign(d, { seria: 'L', nr: '100x10', poz: d.poz || 'dol' });
    else if (v === 'rura') Object.assign(d, { seria: 'RHS', nr: '200x100x8', wyk: d.wyk || 'gor', h: d.h || 200, b: d.b || 100, t: d.t || 8 });
    else if (v === 'spaw') Object.assign(d, { h: U.num(d.h) > 200 ? d.h : 600, bg: d.bg || 250, tg: d.tg || 16, bd: d.bd || 250, td: d.td || 16, tw: d.tw || 8, aw: d.aw || 4 });
  }
  if (k === 'przekroj.seria') { const L = P.lista(v); if (L.length && !L.map(String).includes(String(S.przekroj.nr))) S.przekroj.nr = L[Math.floor(L.length / 2)]; }
  if (k === 'material.gatunek') { const pods = (M.STAL[v] || { pod: ['JR'] }).pod; if (!pods.includes(S.material.podgatunek)) S.material.podgatunek = pods[pods.length - 1]; }
}
function schemeOf() {
  const g = S.geom, n = g.przesla.length, wl = U.num(g.wspL) > 0, wp = U.num(g.wspP) > 0, t = S.podpory.map(p => p.typ);
  const allP = t.every(x => x === 'przegub');
  if (n === 1 && !wl && !wp && allP && !(S.podporyTymczasowe || []).length) return 'swob';
  if (n === 0 && wp && t[0] === 'utwierdzenie') return 'wspornik';
  if (n === 1 && !wl && wp && allP) return 'wspP';
  if (n === 1 && wl && wp && allP) return 'wsp2';
  if (n === 1 && !wl && !wp && t[0] === 'utwierdzenie' && t[1] === 'przegub') return 'utwprz';
  if (n === 1 && !wl && !wp && t[0] === 'utwierdzenie' && t[1] === 'utwierdzenie') return 'utwutw';
  if (n >= 2 && n <= 4 && !wl && !wp && allP) return 'c' + n;
  return 'wlasny';
}
A.schemeOf = schemeOf;
function syncSupports() {
  const n = S.geom.przesla.length + 1;
  while (S.podpory.length < n) S.podpory.push({ typ: 'przegub', ltb: 'widelkowe', ss: 100, c: 0, wezel: { typ: 'brak' } });
  S.podpory.length = n;
}
A.syncSupports = syncSupports;
function numInput(el, final) {
  const raw = el.value.trim(), opt = !!el.dataset.opt;
  const min = el.dataset.min !== '' && el.dataset.min !== undefined ? parseFloat(el.dataset.min) : null, max = el.dataset.max ? parseFloat(el.dataset.max) : null;
  if (raw === '' && opt) { el.classList.remove('bad'); setP(S, el.dataset.k, ''); changed(final && !!el.dataset.re); return; }
  const v = parseNum(raw);
  const bad = v === null || (min !== null && v < min) || (max !== null && v > max);
  el.classList.toggle('bad', bad);
  if (bad) return;
  setP(S, el.dataset.k, v); onSet(el.dataset.k, v);
  if (final) el.value = showNum(v);
  changed(final && !!el.dataset.re);
}
A.numInput = numInput;
// wiązanie pól (dane i okna): select[data-k], .combo input[data-k], checkbox[data-k], input[data-kt]
function bindFields(host, after) {
  // przebudowa okna odroczona i scalona (zmiana pola → blur → change nie może przebudowywać DOM w trakcie przebudowy)
  const done = (re) => { if (!after) return; if (!re) { after(false); return; } if (host.__pend) return; host.__pend = true; setTimeout(() => { host.__pend = false; after(true); }, 0); };
  $$('select[data-k]', host).forEach(el => el.addEventListener('change', () => {
    let v = el.value; if (el.dataset.num) v = parseNum(v);
    setP(S, el.dataset.k, v); onSet(el.dataset.k, v); changed(!!el.dataset.re); done(!!el.dataset.re);
  }));
  $$('.combo input[data-k]', host).forEach(el => {
    el.addEventListener('input', () => { numInput(el, false); done(false); });
    el.addEventListener('change', () => { numInput(el, true); done(!!el.dataset.re); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { numInput(el, true); done(!!el.dataset.re); } });
  });
  $$('.combo button', host).forEach(b => b.addEventListener('click', () => Q.openList(b, inp => { numInput(inp, true); done(!!inp.dataset.re); })));
  $$('input[type=checkbox][data-k]', host).forEach(el => el.addEventListener('change', () => { setP(S, el.dataset.k, el.checked); onSet(el.dataset.k, el.checked); changed(!!el.dataset.re); done(!!el.dataset.re); }));
  $$('input[data-kt], textarea[data-kt]', host).forEach(el => el.addEventListener('input', () => { setP(S, el.dataset.kt, el.value); changed(false); done(false); }));
  const ns = $('select[data-nspan]', host);
  if (ns) ns.addEventListener('change', () => { const n = +ns.value, g = S.geom; while (g.przesla.length < n) g.przesla.push(g.przesla[g.przesla.length - 1] || 6); g.przesla.length = n; if (n === 0 && !(U.num(g.wspL) > 0) && !(U.num(g.wspP) > 0)) g.wspP = 2; syncSupports(); if (n === 0) { S.podpory[0].typ = 'utwierdzenie'; S.podpory[0].ltb = 'pelne'; } S.schemat = schemeOf(); selSpans.clear(); changed(true); });
  $$('[data-fatc]', host).forEach(cb => cb.addEventListener('change', () => { const L = S.zmeczenie.przypadki || (S.zmeczenie.przypadki = []); const id = cb.dataset.fatc; if (cb.checked) { if (!L.includes(id)) L.push(id); } else L.splice(L.indexOf(id), 1); changed(false); }));
  $$('[data-fd]', host).forEach(el => el.addEventListener('change', () => { const d = S.zmeczenie.detale[+el.dataset.fd]; d[el.dataset.fk] = el.dataset.fk === 'dc' ? parseNum(el.value) : el.value; changed(el.tagName === 'SELECT'); }));
  $$('[data-fdel]', host).forEach(b => b.addEventListener('click', () => { S.zmeczenie.detale.splice(+b.dataset.fdel, 1); changed(true); }));
  $$('[data-fadd]', host).forEach(b => b.addEventListener('click', () => { (S.zmeczenie.detale = S.zmeczenie.detale || []).push({ k: 'w80', miejsce: 'pas_d' }); changed(true); }));
}
A.bindFields = bindFields;

/* ================================================================ OBLICZENIA */
let tmr = null, popRedraw = null;
A.setPopRedraw = (f) => { popRedraw = f; };
function changed(rerender) {
  dirty = true; updateTitle();
  if (rerender) renderInputs();
  clearTimeout(tmr); tmr = setTimeout(recalc, 80);
  autosave();
}
A.changed = changed;
function recalc() {
  try { R = J.run(S); } catch (e) { console.error(e); R = { errors: ['Błąd obliczeń: ' + e.message], warnings: [], checks: [], info: [] }; }
  rendered = {};
  renderStatus(); renderDsum(); refreshHints(); renderDataSide(); renderActive();
  if (popRedraw && Q.isModal()) { try { popRedraw(); } catch (e) { console.error(e); } }
}
A.recalc = recalc;
A.recalcNow = () => { clearTimeout(tmr); recalc(); };
function refreshHints() {
  // odświeżenie podpowiedzi zależnych od wyników bez przebudowy pól (fokus zostaje)
  const el = $('#inputs'); if (!el) return;
  GROUPS.forEach(g => {
    const d = $(`details[data-g="${g.id}"] .fields`, el); if (!d || d.contains(document.activeElement)) return;
    if (!g.items.some(f => f.t === 'hint' || f.t === 'html')) return;
    const open = d.parentElement.open; d.innerHTML = fieldsHTML(g.items, g.id); bindFields(d); d.parentElement.open = open;
  });
}
function renderStatus() {
  const el = $('#status');
  if (!R || (R.errors && R.errors.length)) { el.className = 'fail'; el.textContent = '✖ Błąd danych'; return; }
  const fails = R.checks.filter(c => c.status === 'fail').length, warns = R.checks.filter(c => c.status === 'warn').length;
  if (fails) { el.className = 'fail'; el.textContent = `✖ Niespełnione warunki: ${fails}`; }
  else if (warns) { el.className = 'warn'; el.textContent = `✔ Nośność OK · uwagi: ${warns} · η = ${fmt(R.uMax * 100, 0)}%`; }
  else { el.className = 'ok'; el.textContent = `✔ Wszystkie warunki spełnione · η = ${fmt(R.uMax * 100, 0)}%`; }
}

/* ---------------------------------------------------------- chipy sprawdzeń (nad danymi i wynikami) */
const DSUM = [
  ['SGN', 'zginanie', c => /^SGN – nośność/.test(c.grp) && /-M$|-N$/.test(c.id)],
  ['SGN', 'ścinanie', c => (/^SGN – nośność/.test(c.grp) && /-Vy?$/.test(c.id)) || /-Vb$|-MV$/.test(c.id)],
  ['', 'zwichrzenie', c => /^SGN – stateczność/.test(c.grp)],
  ['', 'środnik', c => /^PN-EN 1993-1-5/.test(c.grp) && !/-Vb$|-MV$/.test(c.id)],
  ['SGU', 'ugięcie', c => /^SGU – ugięcia/.test(c.grp)],
  ['SGU', 'drgania', c => /^SGU – drgania/.test(c.grp)],
  ['', 'podpory i węzły', c => /^Podpory/.test(c.grp)],
  ['', 'styki', c => /^Styki/.test(c.grp)],
  ['', 'pożar', c => /^Pożar/.test(c.grp)],
  ['', 'zmęczenie', c => /^Zmęczenie/.test(c.grp)],
  ['', 'kruche pękanie', c => /^Kruche/.test(c.grp)]
];
function dsumHTML() {
  if (!R || !R.checks) return '';
  if (R.errors && R.errors.length) return `<div class="dsum"><button class="dsb fail" data-dgerr="1">✖ błąd danych – ${esc(R.errors[0]).slice(0, 90)}</button></div>`;
  let h = '<div class="dsum">';
  DSUM.forEach(([a, l, pr], gi) => {
    const cs = R.checks.filter(pr).filter(x => !x.info); if (!cs.length) return;
    const st = cs.some(x => x.status === 'fail') ? 'fail' : cs.some(x => x.status === 'warn') ? 'warn' : 'ok';
    const rv = x => (x.util !== null && isFinite(x.util) ? x.util : (x.status === 'fail' ? 9.99 : 0)), w = cs.reduce((p, q) => (rv(q) > rv(p) ? q : p));
    const bad = cs.filter(x => x.status === 'fail').length;
    h += `<button class="dsb ${st}" data-dg="${gi}" title="${esc(w.n)}${w.util !== null && isFinite(w.util) ? ' – ' + fmt(w.util * 100, 0) + '%' : ''} · kliknij, aby przejść do Podsumowania"><span class="ic">${st === 'fail' ? '✖' : st === 'warn' ? '!' : '✔'}</span>${a ? `<b>${a}</b> ` : ''}${l}<span class="pc">${w.util !== null && isFinite(w.util) ? fmt(w.util * 100, 0) + '%' : (w.status === 'fail' ? '∞' : '')}</span>${bad ? `<span class="nb">${bad}</span>` : ''}</button>`;
  });
  return h + '</div>';
}
function bindDsum(el) {
  $$('[data-dgerr]', el).forEach(b => b.addEventListener('click', () => A.selectTab('sum')));
  $$('[data-dg]', el).forEach(b => b.addEventListener('click', () => {
    const pr = DSUM[+b.dataset.dg][2], c = R.checks;
    const x = c.find(q => pr(q) && q.status === 'fail') || c.find(q => pr(q) && q.status === 'warn');
    if (x) { A.gotoCheck(x); return; }
    const i = c.findIndex(pr);
    A.selectTab('sum'); setTimeout(() => { const tr = $(`#p-sum tr[data-ci="${i}"]`); if (tr) { tr.scrollIntoView({ block: 'center' }); Q.flash(tr); } }, 60);
  }));
}
function renderDsum() {
  const el = $('#dsum'); if (el) { el.innerHTML = dsumHTML(); bindDsum(el); }
  $$('.dsumx').forEach(x => { x.innerHTML = dsumHTML(); bindDsum(x); });
}
A.dsumHTML = dsumHTML; A.bindDsum = bindDsum;

/* ---------------------------------------------------------- dobór (pasek nad danymi) */
function renderAutoBar() {
  const el = $('#autobar'); if (!el) return;
  const eta = (S.design && S.design.eta) || 100;
  el.innerHTML = `<div class="autobar"><button class="btn sm" id="adSec" type="button" title="Najlżejszy kształtownik tego samego rodzaju i serii (dla blachownicy – grubości pasów i środnika przy zadanej wysokości i szerokości), dla którego spełnione są wszystkie warunki elementu: nośność przekroju, środnik, zwichrzenie, SGU – z wytężeniem ≤ η">⚙ Dobierz przekrój</button>
    <button class="btn sm" id="adJnt" type="button" title="Połączenia i oparcia dla obecnych reakcji: śruby, grubość i wysokość blach, spoiny, płyty podporowe, żebra podporowe – wszystkie warunki z wytężeniem ≤ η">⚙ Dobierz połączenia</button>
    <button class="btn sm pri" id="adAll" type="button" title="Przekrój, a następnie połączenia i oparcia – wszystkie sprawdzenia z Podsumowania spełnione z wytężeniem ≤ η">⚙ Dobierz wszystko</button>
    <label class="adeta" title="Wymagane wytężenie: E_d / R_d ≤ η w doborze">wytężenie ≤ <input class="txt sm" id="adEta" value="${eta}" inputmode="numeric" autocomplete="off" spellcheck="false"> %</label></div>`;
  const inp = $('#adEta', el);
  inp.addEventListener('change', () => { const v = parseNum(inp.value); const ok = v !== null && v >= 50 && v <= 100; inp.classList.toggle('bad', !ok); if (ok) { S.design = Object.assign({}, S.design, { eta: Math.round(v) }); dirty = true; autosave(); } });
  $('#adSec', el).onclick = () => A.runDesign('sec');
  $('#adJnt', el).onclick = () => A.runDesign('jnt');
  $('#adAll', el).onclick = () => A.runDesign('all');
}
A.runDesign = async function (kind) {
  const eta = ((S.design && S.design.eta) || 100) / 100;
  if (!R || R.errors.length) { Q.toast('Najpierw usuń błędy danych.'); return; }
  const m = Q.modal(`<h3>${kind === 'jnt' ? 'Dobór połączeń i oparć' : kind === 'all' ? 'Dobór wszystkiego' : 'Dobór przekroju'}</h3><p><i class="dpend"></i> <span id="dProg">Trwa dobór – każdy wariant sprawdzany jest pełnym tokiem obliczeń${eta < 1 ? ` (wytężenie ≤ ${Math.round(eta * 100)}%)` : ''}…</span></p>`);
  await new Promise(r => setTimeout(r, 30));
  const log = [];
  let ok = true;
  if (kind !== 'jnt') {
    const list = J.doborKandydaci(S);
    let found = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i]; const pe = $('#dProg', m); if (pe) pe.textContent = `Sprawdzam ${c.nazwa} (${fmt(c.masa, 1)} kg/m) – ${i + 1}/${list.length}…`;
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
      const st = U.clone(S); st.przekroj = Object.assign({}, S.przekroj, c.d);
      let r; try { r = J.run(st, { fast: true }); } catch (e) { continue; }
      if (J.passesFor(r, eta, J.memberFilter)) { found = { c, r }; break; }
    }
    if (found) { S.przekroj = Object.assign({}, S.przekroj, found.c.d); log.push(`Przekrój: ${found.c.nazwa} (${fmt(found.c.masa, 1)} kg/m) – największe wytężenie elementu ${fmt(Math.max(...found.r.checks.filter(J.memberFilter).filter(c => !c.info && c.util !== null).map(c => c.util)) * 100, 0)}%.`); }
    else { ok = false; log.push('Żaden przekrój tego rodzaju i serii nie spełnia warunków elementu – zmień serię, gatunek stali, schemat lub stężenia.'); }
  }
  if (kind !== 'sec' && ok) {
    const r0 = J.run(S);
    const d = J.dobierzWezly(S, r0, eta);
    S = d.st; if (BEAMS) BEAMS[curB] = S; log.push(...d.log); if (!d.ok) ok = false;
    if (!d.log.length) log.push('Brak połączeń śrubowych i oparć do doboru (podpory „oparcie na stali” bez żeber).');
  }
  Q.closeModal();
  dirty = true; renderInputs(); recalc(); autosave();
  Q.toast((ok ? 'Dobrano: ' : 'Dobór niepełny: ') + log.join(' '), 9000);
};

/* ================================================================ PANEL SCHEMATU (Dane) */
function beamTabsHTML() {
  const B = BEAMS || [S];
  return `<div class="beamtabs" role="tablist" aria-label="Belki w projekcie">${B.map((b, i) => `<button class="btab ${i === curB ? 'on' : ''}" data-btab="${i}" type="button" title="${esc(b.meta.nazwa || 'Belka ' + (i + 1))} – kliknij, aby przełączyć; dwuklik – zmiana nazwy">${i + 1}<span>${esc((b.meta.nazwa || '').slice(0, 14))}</span>${i === curB && B.length > 1 ? `<i data-bdel="${i}" title="Usuń belkę z projektu">×</i>` : ''}</button>`).join('')}<button class="btab add" data-badd="1" type="button" title="Dodaj belkę do projektu (do 10)">+</button></div>`;
}
function selList() { const md = R && R.md; return md ? Array.from(selSpans).filter(i => md.seg[i]).sort((a, b) => a - b) : []; }
A.selList = selList;
A.addSplice = function (x) {
  if (!R || !R.md || !R.sec) { Q.toast('Najpierw usuń błędy danych.'); return; }
  const sg = R.md.seg.find(z => !z.wsp) || R.md.seg[0];
  if (x === undefined) x = +((sg.x0 + sg.x1) / 2000).toFixed(2);
  S.styki = S.styki || []; S.styki.push(BS.W.spliceDefaults(R.sec, x));
  changed(true); recalc(); A.jointDesigner({ styk: S.styki.length - 1 });
};
function renderDataSide() {
  const el = $('#dataside'); if (!el) return;
  if (!R || !R.md) { el.innerHTML = `<div class="box">${beamTabsHTML()}${(R && R.errors || []).map(e => `<div class="msg err">${esc(e)}</div>`).join('') || '<p class="hint">Brak modelu.</p>'}</div>`; bindSide(el); return; }
  const md = R.md, s = A.stage();
  const LEGW = (el.clientWidth || 600) < 560 ? 0 : 132;
  const W2 = Math.max(320, Math.min(860, ((el.clientWidth || 640) - 30 - LEGW) * 0.98));
  const leg = [], out = {};
  const svg = D.scheme(S, R, { W: W2, etap: s, edit: true, sel: selSpans, diag: diagMode === 'off' ? null : diagMode, legend: leg, dims: showDims, out });
  const sel = selList().map(i => md.seg[i].n);
  const tools = `<span class="schtools">${[['loads', 'Obciążenia', 'Okno obciążeń: zaznaczonych przęseł albo całej belki'], ['sec', 'Przekrój', 'Przekrój i materiał belki'], ['conn', 'Połączenia', 'Okno projektowania połączeń i styków'], ['brace', 'Stężenia', 'Stężenia boczne i skrętne, stężenie ciągłe'], ['stages', 'Etapy', 'Etapy realizacji i podpory montażowe'], ['dims', 'Wymiary', 'Pokaż / ukryj wymiary']].map(([k, l, t]) => `<button class="btn sm${k === 'dims' && showDims ? ' on' : ''}" data-tool="${k}" type="button" title="${t}">${l}</button>`).join('')}</span>`;
  const seen = new Set(), legH = leg.filter(q => { const k = String(q.li); if (seen.has(k)) return false; seen.add(k); return true; }).map(q => `<label class="ldl${q.off ? ' off' : ''}" style="top:${(q.y / (out.H || 1) * 100).toFixed(2)}%" title="${q.sw ? 'Ciężar własny belki' : q.off ? 'Obciążenie pominięte – zaznacz, aby uwzględnić' : 'Odznacz, aby pominąć obciążenie w obliczeniach'}"><input type="checkbox" data-ldon="${q.li}" ${q.off ? '' : 'checked'}><i style="background:${q.col}"></i><span>${esc(q.lab)}</span></label>`).join('');
  const dgSw = `<span class="segsw sm dgsw">${[['M', 'M'], ['V', 'V'], ['w', 'ugięcie'], ['N', 'N'], ['R', 'R'], ['off', 'bez wykresu']].map(([k, l]) => `<button type="button" data-dgm="${k}" class="${diagMode === k ? 'on' : ''}">${l}</button>`).join('')}</span>`;
  const stSw = md.nE > 1 ? `<span class="segsw sm">${md.etapy.map((e, i) => `<button type="button" data-stg="${i}" class="${i === s ? 'on' : ''}" title="${esc(e.nazwa)}">Etap ${i + 1}</button>`).join('')}</span>` : '';
  let h = `<div class="box"><div class="schsticky">${beamTabsHTML()}<h4 class="schhd">Schemat statyczny i obciążenia${tools}</h4>
    <div class="schsel">${sel.length ? `Zaznaczone: <b>${esc(sel.join(', '))}</b> · <button class="lnk" id="selClr" type="button">odznacz (Esc)</button>` : '<span class="mut">Lewy przycisk – zaznacz przęsło, prawy – menu (obciążenia, przekrój, stężenia, podpora…). Dwuklik na belce – węzeł w tym miejscu.</span>'}${stSw ? ` · ${stSw} <span class="mut">${esc(md.etapy[s].nazwa)}</span>` : ''}</div>
    <div class="schrow">${LEGW ? `<div class="ldleg" style="width:${LEGW}px">${legH}</div>` : ''}<div class="schemewrap"><div class="zoomtgt">${svg}${out.dgY ? `<div class="dgbar" style="top:${((out.dgY - 6) / out.H * 100).toFixed(2)}%">${dgSw}</div>` : ''}</div></div></div>${LEGW ? '' : `<div class="ldlegm">${legH}</div>`}${out.dgY ? '' : `<div style="text-align:center;margin:4px 0">${dgSw}</div>`}</div>`;
  h += `<div class="optchk">
    <label class="chk sm"><input type="checkbox" data-ck="ciezarWlasny.auto" ${S.ciezarWlasny.auto !== false ? 'checked' : ''}><span>Uwzględnij ciężar własny belki (78,5 kN/m³)${S.ciezarWlasny.auto !== false ? ` + dodatek na połączenia <input class="txt sm" style="width:46px;height:22px" data-ckn="ciezarWlasny.dodatek" value="${esc(showNum(S.ciezarWlasny.dodatek))}"> %` : ''}</span></label>
    <label class="chk sm"><input type="checkbox" data-ck="stezenieCiagle.pasG" ${S.stezenieCiagle.pasG ? 'checked' : ''}><span>Pas górny stężony ciągle (płyta, blacha fałdowa)<small class="ophint">Zwichrzenie pasa górnego zablokowane od wskazanego etapu; przy momentach ujemnych ściskany pas dolny pozostaje niestężony.</small></span></label>
    <label class="chk sm"><input type="checkbox" data-ck="sgu.drgania" ${S.sgu.drgania !== false ? 'checked' : ''}><span>Sprawdzaj częstotliwość drgań własnych (f<sub>1</sub> ≥ f<sub>min</sub> = ${fmt(U.num(S.sgu.fmin, 3), 1)} Hz)</span></label>
    <div class="firerow"><label class="chk sm"><input type="checkbox" id="fireOn" ${S.pozar.aktywny ? 'checked' : ''}><span>Odporność ogniowa wg PN-EN 1993-1-2</span></label><select id="fireR" ${S.pozar.aktywny ? '' : 'disabled'}>${[15, 30, 45, 60, 90, 120, 180, 240].map(r => `<option value="${r}" ${U.num(S.pozar.R) === r ? 'selected' : ''}>R${r}</option>`).join('')}</select></div>${fireStatusHTML()}
    <label class="chk sm"><input type="checkbox" data-ck="zmeczenie.aktywny" ${S.zmeczenie.aktywny ? 'checked' : ''}><span>Zmęczenie wg PN-EN 1993-1-9 (parametry w Danych)</span></label>
  </div>`;
  h += `<div class="hint">${exDetails('<b>Lewy przycisk</b> na przęśle – zaznaczanie przęseł (kolejne kliknięcia dodają / odejmują, Esc – odznacz); <b>prawy przycisk</b> – menu: obciążenia, przekrój, stężenia, podpory montażowe. Kliknij <b>podporę</b> – rodzaj podparcia, oparcie lub połączenie (wymiary blach, śruby, spoiny); kliknij <b>pasmo obciążenia</b> – aby je zmienić; pole wyboru w legendzie – uwzględnij / pomiń. <b>Dwuklik</b> na belce – siła skupiona, stężenie lub podpora montażowa w tym miejscu. <b>Ctrl + kółko</b> – powiększenie schematu.', 'Jak zadawać obciążenia i podpory?')}</div>`;
  h += `<h4 class="lsec">Zestawienie obciążeń</h4>${loadSummaryHTML()}`;
  h += `<h4 class="lsec">Podpory</h4><table class="kv suptab">${md.sup.map((p, i) => `<tr data-sup="${i}" title="Kliknij, aby zmienić"><td><b>${esc(p.id)}</b></td><td>${esc(supRowTxt(i))}</td><td><button class="lnk" data-sup="${i}" type="button">zmień…</button></td></tr>`).join('')}${md.tmp.map((t, i) => `<tr data-tmp="${i}"><td><b>${t.id}</b></td><td>montażowa, x = ${fmt(t.x / 1000, 2)} m, usuwana po etapie ${t.do + 1}</td><td><button class="lnk" data-tmp="${i}" type="button">zmień…</button></td></tr>`).join('')}</table>`;
  h += combSumHTML();
  h += '</div>';
  if (R.errors && R.errors.length) h += `<div class="msgs">${R.errors.map(e => `<div class="msg err">${esc(e)}</div>`).join('')}</div>`;
  el.innerHTML = h;
  Q.themeSvgIn(el); Q.zoomApply(el);
  bindSide(el);
  requestAnimationFrame(() => { const lg = $('.ldleg', el); if (!lg) return; let last = -1e9; $$('.ldl', lg).sort((a, b) => a.offsetTop - b.offsetTop).forEach(q => { const t = Math.max(q.offsetTop - q.offsetHeight / 2, last + 1); q.style.top = t + 'px'; q.style.transform = 'none'; last = t + q.offsetHeight; }); });
}
A.renderDataSide = renderDataSide;
function supRowTxt(i) {
  const p = S.podpory[i] || {}, w = p.wezel || {};
  const t = ({ przegub: p.przesuwna ? 'przegubowa przesuwna' : 'przegubowa', utwierdzenie: 'utwierdzenie', sprezyna: 'sprężysta', podatne: 'przegub + sprężyna obrotowa' })[p.typ] || p.typ;
  const wz = ({ brak: 'oparcie na stali', oparcie: `płyta podporowa na ${w.podloze === 'mur' ? 'murze' : w.podloze === 'stal' ? 'stali' : 'betonie'}`, blacha_czolowa: 'blacha czołowa', blacha_zebrowa: 'blacha żebrowa', katowniki: 'kątowniki podwójne', spawane: 'połączenie spawane' })[w.typ || 'brak'] || w.typ;
  return `${t}; zwichrzenie: ${p.ltb === 'pelne' ? 'utwierdzenie' : 'widełkowa'}; ${wz}${w.zebro ? ', żebra podporowe' : ''}`;
}
A.supRowTxt = supRowTxt;
function fireStatusHTML() {
  if (!S.pozar.aktywny) return '';
  const fr = R && R.pozar;
  if (!fr || !fr.hist) return `<div class="firest">Pożar: brak wyniku${R && R.errors.length ? ' (błąd danych)' : ''}.</div>`;
  return `<div class="firest ${fr.ok ? 'ok' : 'fail'}">θ<sub>a,cr</sub> = <b>${fmt(fr.thcr, 0)} °C</b> · czas nagrzania do θ<sub>a,cr</sub>: <b>${fr.tcr === null ? `> ${fmt(fr.hist[fr.hist.length - 1][0], 0)}` : fmt(fr.tcr, 0)} min</b> ${fr.ok ? '≥' : '<'} R${fr.Rreq} ${fr.ok ? '✔' : '✖'} · ${fr.prot ? `zabezpieczenie d<sub>p</sub> = ${esc(String(S.pozar.dp))} mm` : 'bez zabezpieczenia'} · A<sub>m</sub>/V = ${fmt(fr.sf.AmV, 0)} m⁻¹</div>`;
}
function loadSummaryHTML() {
  if (!R || !R.md) return '';
  const rows = [];
  if (S.ciezarWlasny.auto !== false && R.sec) rows.push(`<tr><td><input type="checkbox" checked disabled class="ldon"> G₀</td><td>ciężar własny belki</td><td>stałe</td><td class="n">${fmt(R.sec.gk * (1 + U.num(S.ciezarWlasny.dodatek) / 100), 2)} kN/m</td><td></td></tr>`);
  S.obciazenia.forEach((o, i) => {
    const comp = (o.sklad || []).map(k => k.typ === 'q' ? `${fmt(U.num(k.q0), 2)}${k.q1 !== '' && k.q1 !== undefined && U.num(k.q1) !== U.num(k.q0) ? '…' + fmt(U.num(k.q1), 2) : ''} kN/m` : k.typ === 'P' ? `${fmt(U.num(k.P), 1)} kN @ ${fmt(U.num(k.x), 2)} m` : `${fmt(U.num(k.M), 1)} kNm`).join('; ');
    const psi = BS.S.RODZAJE[o.rodzaj].stale || o.rodzaj === 'A' ? '' : 'ψ ' + BS.K.psi(o).map(v => fmt(v, 1)).join('/');
    rows.push(`<tr class="${o.aktywne === false ? 'ldoff' : ''}" data-li="${i}" style="cursor:pointer" title="Kliknij, aby zmienić"><td><input type="checkbox" class="ldon" data-ldon="${i}" ${o.aktywne === false ? '' : 'checked'}> <b>${esc(o.id)}</b></td><td>${esc(o.nazwa)}</td><td>${esc(BS.S.RODZAJE[o.rodzaj].n)}${R.md.nE > 1 ? ` · etap ${U.num(o.etap) + 1}` : ''}</td><td class="n">${esc(comp)}</td><td class="hint" style="margin:0">${psi}</td></tr>`);
  });
  return `<table class="kv ldsum" style="width:100%">${rows.join('')}</table><div style="margin-top:4px"><button class="addb" data-tool="loads" type="button">Obciążenia…</button> <button class="addb" data-act="snow" type="button">+ śnieg (strefy PL)…</button></div>`;
}
function combSumHTML() {
  if (!R || !R.combos) return '';
  const n = (t) => R.combos.filter(c => c.typ === t).length;
  return `<div class="combsum">Kombinacje: SGN ${n('SGN')} (${S.normy.ndp1.komb === '6.10' ? 'wzór 6.10' : 'wzory 6.10a/6.10b'}), charakterystyczne ${n('char')}, częste ${n('czest')}, quasi-stałe ${n('qp')}${n('wyj') ? `, wyjątkowe ${n('wyj')}` : ''}${n('poz') ? `, pożarowe ${n('poz')}` : ''}; <small>obciążenia zmienne w każdej kombinacji wiodące i towarzyszące, układy niekorzystne w przęsłach (szachownica) – dla obciążeń oznaczonych „niekorzystnie w przęsłach”.</small></div>`;
}
function bindSide(el) {
  $$('.supp', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.supportPopup(+g.dataset.sup); }));
  $$('tr[data-sup], button[data-sup]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); A.supportPopup(+b.dataset.sup); }));
  $$('.tsupp, tr[data-tmp], button[data-tmp]', el).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); A.stagesPopup(); }));
  $$('.rst', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.bracePopup(g.dataset.rst === 'g' ? null : +g.dataset.rst); }));
  $$('.sty', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.jointDesigner({ styk: +g.dataset.sty }); }));
  $$('[data-cont]', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); A.bracePopup(); }));
  $$('.elm', el).forEach(g => g.addEventListener('click', ev => { const k = +g.dataset.seg; if (selSpans.has(k)) selSpans.delete(k); else selSpans.add(k); renderDataSide(); }));
  $$('.ld', el).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); const li = g.dataset.li; if (li === 'sw') { const f = $('[data-ck="ciezarWlasny.auto"]', el); if (f) Q.flash(f.closest('label')); return; } A.loadPopup({ focus: +li }); }));
  const sw = $('.schemewrap', el);
  if (sw) {
    sw.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      const t = ev.target.closest ? ev.target : null; if (!t) return;
      const sp = t.closest('.supp'), ld = t.closest('.ld'), rs = t.closest('.rst'), tp = t.closest('.tsupp'), sy = t.closest('.sty');
      if (sy) return Q.ctxMenu(ev.clientX, ev.clientY, [['jd', `Styk S${+sy.dataset.sty + 1} – projektowanie…`], ['-'], ['del', 'Usuń styk']], async a => { const j = +sy.dataset.sty; if (a === 'jd') A.jointDesigner({ styk: j }); else if (await Q.ask(`Usunąć styk S${j + 1}?`, 'Usuń', true)) { S.styki.splice(j, 1); changed(true); } });
      if (sp) return supMenu(ev.clientX, ev.clientY, +sp.dataset.sup);
      if (ld && ld.dataset.li !== 'sw') return loadMenu(ev.clientX, ev.clientY, +ld.dataset.li);
      if (rs) return braceMenu(ev.clientX, ev.clientY, rs.dataset.rst);
      if (tp) return Q.ctxMenu(ev.clientX, ev.clientY, [['st', 'Etapy i podpory montażowe…'], ['del', 'Usuń podporę montażową']], a => { if (a === 'st') A.stagesPopup(); else { S.podporyTymczasowe.splice(+tp.dataset.tmp, 1); changed(true); } });
      const g = t.closest('.elm'); if (g && !selSpans.has(+g.dataset.seg)) { selSpans.add(+g.dataset.seg); renderDataSide(); }
      schemeMenu(ev.clientX, ev.clientY);
    });
    sw.addEventListener('dblclick', ev => { const svg = $('svg.schemesvg', sw); if (!svg || !R || !R.md) return; const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; const px = (ev.clientX - r.left) * vb.width / r.width; const ml = 34, mr = 34; const x = (px - ml) / (vb.width - ml - mr) * R.md.L; if (x < 0 || x > R.md.L) return; A.nodePopup(Math.round(x / 50) * 50); });
  }
  $$('[data-tool]', el).forEach(b => b.addEventListener('click', () => schemeAct(b.dataset.tool)));
  $$('input[data-ldon]', el).forEach(cb => { cb.addEventListener('click', ev => ev.stopPropagation()); cb.addEventListener('change', () => { const li = cb.dataset.ldon; if (li === 'sw') { S.ciezarWlasny.auto = cb.checked; } else { const o = S.obciazenia[+li]; if (o) o.aktywne = cb.checked; } changed(false); }); });
  $$('tr[data-li]', el).forEach(tr => tr.addEventListener('click', ev => { if (ev.target.closest('input')) return; A.loadPopup({ focus: +tr.dataset.li }); }));
  $$('[data-ck]', el).forEach(cb => cb.addEventListener('change', () => { setP(S, cb.dataset.ck, cb.checked); changed(true); }));
  $$('[data-ckn]', el).forEach(inp => inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v === null || v < 0) { inp.classList.add('bad'); return; } setP(S, inp.dataset.ckn, v); changed(false); }));
  $$('[data-dgm]', el).forEach(b => b.addEventListener('click', () => { diagMode = b.dataset.dgm; try { localStorage.setItem('bs.diag', diagMode); } catch (e) { /* */ } renderDataSide(); }));
  $$('[data-stg]', el).forEach(b => b.addEventListener('click', () => A.setStage(+b.dataset.stg)));
  const fo = $('#fireOn', el), fr = $('#fireR', el);
  if (fo) fo.onchange = () => { S.pozar.aktywny = fo.checked; S.pozar.R = +fr.value; changed(true); };
  if (fr) fr.onchange = () => { S.pozar.R = +fr.value; changed(false); };
  const sc = $('#selClr', el); if (sc) sc.onclick = () => { selSpans.clear(); renderDataSide(); };
  $$('[data-act]', el).forEach(b => b.addEventListener('click', () => doAct(b.dataset.act)));
}
function schemeAct(a) {
  const sel = selList();
  if (a === 'loads') A.loadPopup(sel.length ? { segs: sel } : { all: true });
  else if (a === 'sec') A.secPopup();
  else if (a === 'brace') A.bracePopup();
  else if (a === 'stages') A.stagesPopup();
  else if (a === 'dims') { showDims = !showDims; try { localStorage.setItem('bs.dims', showDims ? '1' : '0'); } catch (e) { /* */ } renderDataSide(); }
  else if (a === 'all') { R.md.seg.forEach((sg, i) => selSpans.add(i)); renderDataSide(); }
  else if (a === 'none') { selSpans.clear(); renderDataSide(); }
  else if (a === 'schemes') A.schemesPopup();
  else if (a === 'conn') A.jointDesigner();
  else if (a === 'splice') { const sl = selList(); const sg = R.md.seg[sl.length ? sl[0] : 0]; A.addSplice(sg ? +((sg.x0 + sg.x1) / 2000).toFixed(2) : undefined); }
}
A.schemeAct = schemeAct;
function supMenu(x, y, i) {
  const p = S.podpory[i]; if (!p) return;
  const id = R.md.sup[i] ? R.md.sup[i].id : i + 1, ck = (c) => (c ? '✓ ' : '');
  Q.ctxMenu(x, y, [['jd', `Projektowanie połączenia ${esc(id)}…`], ['pop', `Podpora ${esc(id)} – warunki podparcia…`], ['-'], ['przegub', ck(p.typ === 'przegub') + 'Przegubowa'], ['utwierdzenie', ck(p.typ === 'utwierdzenie') + 'Utwierdzenie'], ['sprezyna', ck(p.typ === 'sprezyna') + 'Sprężysta…'], ['przes', ck(!!p.przesuwna) + 'Przesuwna (łożysko przesuwne)', p.typ !== 'przegub'], ['-'], ['wid', ck(p.ltb !== 'pelne') + 'Zwichrzenie: podparcie widełkowe'], ['pel', ck(p.ltb === 'pelne') + 'Zwichrzenie: pełne utwierdzenie'], ['-'], ['jb', 'Blacha czołowa…'], ['jf', 'Blacha żebrowa…'], ['jk', 'Kątowniki podwójne…'], ['jw', 'Połączenie spawane…'], ['jo', 'Płyta podporowa (beton / mur)…'], ['js', 'Oparcie na stali (+ żebra)…']], a => {
    if (a === 'pop') return A.supportPopup(i);
    if (a === 'jd') return A.jointDesigner({ sup: i });
    if (['przegub', 'utwierdzenie', 'sprezyna'].includes(a)) { p.typ = a; if (a === 'utwierdzenie') p.ltb = 'pelne'; if (a !== 'przegub') p.przesuwna = false; S.schemat = schemeOf(); changed(true); if (a === 'sprezyna') A.supportPopup(i); return; }
    if (a === 'przes') { p.przesuwna = !p.przesuwna; changed(true); return; }
    if (a === 'wid' || a === 'pel') { p.ltb = a === 'pel' ? 'pelne' : 'widelkowe'; changed(true); return; }
    const t = { jb: 'blacha_czolowa', jf: 'blacha_zebrowa', jk: 'katowniki', jw: 'spawane', jo: 'oparcie', js: 'brak' }[a];
    if (t) { if ((p.wezel || {}).typ !== t) p.wezel = Object.assign({ typ: t }, BS.W.defaults(t, R.sec)); changed(true); A.recalcNow(); A.jointDesigner({ sup: i }); }
  });
}
function loadMenu(x, y, li) {
  const o = S.obciazenia[li]; if (!o) return;
  Q.ctxMenu(x, y, [['ed', `${esc(o.id)} – zmień…`], ['on', o.aktywne === false ? 'Uwzględnij w obliczeniach' : 'Pomiń w obliczeniach'], ['dup', 'Powiel'], ['-'], ['del', 'Usuń obciążenie']], async a => {
    if (a === 'ed') return A.loadPopup({ focus: li });
    if (a === 'on') { o.aktywne = o.aktywne === false; changed(false); return; }
    if (a === 'dup') { const c = U.clone(o); let n = 1; while (S.obciazenia.some(q => q.id === o.rodzaj + n)) n++; c.id = o.rodzaj + n; c.nazwa = (o.nazwa || '') + ' (kopia)'; S.obciazenia.push(c); changed(true); return; }
    if (a === 'del' && await Q.ask(`Usunąć obciążenie „${esc(o.id)} – ${esc(o.nazwa || '')}”?`, 'Usuń', true)) { S.obciazenia.splice(li, 1); changed(true); }
  });
}
function braceMenu(x, y, src) {
  if (src === 'g') { Q.ctxMenu(x, y, [['pop', 'Stężenia (rozstaw l_t)…'], ['off', 'Usuń stężenia rozmieszczone równomiernie']], a => { if (a === 'pop') A.bracePopup(); else { S.analiza.ltRozstaw = ''; changed(true); } }); return; }
  const i = +src, z = S.stezenia[i]; if (!z) return;
  Q.ctxMenu(x, y, [['pop', 'Stężenie – zmień…'], ['boczne', (z.typ === 'boczne' ? '✓ ' : '') + 'boczne'], ['skretne', (z.typ === 'skretne' ? '✓ ' : '') + 'skrętne'], ['pelne', (z.typ === 'pelne' ? '✓ ' : '') + 'pełne'], ['-'], ['del', 'Usuń stężenie']], a => {
    if (a === 'pop') return A.bracePopup(i);
    if (a === 'del') { S.stezenia.splice(i, 1); changed(true); return; }
    z.typ = a; changed(true);
  });
}
function schemeMenu(x, y) {
  const n = selSpans.size, md = R.md;
  const it = [['loads', n ? `Obciążenia – ${n === 1 ? md.seg[selList()[0]].n : `zaznaczone (${n})`}…` : 'Obciążenia – cała belka…'], ['sec', 'Przekrój…'], ['brace', 'Stężenia boczne…'], ['stages', 'Etapy realizacji i podpory montażowe…'], ['schemes', 'Schematy typowe…'], ['conn', 'Projektowanie połączeń…'], ['splice', n ? 'Styk montażowy w środku zaznaczonego przęsła…' : 'Styk montażowy…'], ['dims', `${showDims ? '✓ ' : ''}Wymiary`], ['-'], ['all', 'Zaznacz wszystkie przęsła'], ['none', 'Odznacz wszystko (Esc)', !n]];
  Q.ctxMenu(x, y, it.map(([k, l, d]) => [k, esc(l || ''), d]), schemeAct);
}

/* ================================================================ ZAKŁADKI */
function renderActive() {
  const on = $('.tabs button.on'); if (!on) return;
  const t = on.dataset.tab;
  if (t === 'data') return;
  if (rendered[t]) return;
  const el = $('#p-' + t); if (!el) return;
  try { BS.V[t](el); } catch (e) { console.error(e); el.innerHTML = `<div class="msg err">Błąd widoku: ${esc(e.message)}</div>`; }
  rendered[t] = true;
}
A.renderActive = renderActive;
A.invalidate = (t) => { if (t) rendered[t] = false; else rendered = {}; };
A.selectTab = (t) => { const b = $(`.tabs button[data-tab="${t}"]`); if (b) b.click(); };

/* ================================================================ PLIKI, BELKI */
const pending = {}; let reqId = 0;
window.__hostReply = (id, res) => { const p = pending[id]; if (p) { delete pending[id]; p(res); } };
function hostCall(op, args) { return new Promise(res => { const id = ++reqId; pending[id] = res; try { window.hostRequest(JSON.stringify(Object.assign({ id, op }, args))); } catch (e) { delete pending[id]; res({ ok: false, err: String(e) }); } }); }
const inHost = () => typeof window.hostRequest === 'function';
A.hostCall = hostCall; A.inHost = inHost;
const baseName = (p) => (p || '').split(/[\\/]/).pop();
const safeName = (ext) => (S.meta.nazwa || 'belka').replace(/[\\/:*?"<>|]+/g, '_').trim() + ext;
A.safeName = safeName; A.baseName = baseName;
function updateTitle() {
  const fn = filePath ? baseName(filePath) : 'bez nazwy';
  $('#fileName').textContent = (dirty ? '● ' : '') + fn;
  const t = `BelkaStal – ${S.meta.nazwa || 'belka'} [${fn}${dirty ? ' *' : ''}]`;
  document.title = t;
  if (typeof window.hostTitle === 'function') { try { window.hostTitle(t); } catch (e) { /* */ } }
}
const beamsSync = () => { if (!BEAMS) BEAMS = [S]; BEAMS[curB] = S; };
const beamsOut = () => { beamsSync(); return BEAMS.length > 1 ? { beams: BEAMS, cur: curB } : {}; };
function beamsIn(o, st) {
  if (o && Array.isArray(o.beams) && o.beams.length > 1) { BEAMS = o.beams.slice(0, 10).map(b => J.normalize(b)); curB = U.clamp(+o.cur || 0, 0, BEAMS.length - 1); return BEAMS[curB]; }
  BEAMS = null; curB = 0; return J.normalize(st);
}
function switchBeam(i) { beamsSync(); if (i === curB || !BEAMS[i]) return; curB = i; S = BEAMS[i]; vStage = null; selSpans.clear(); $('#projName').value = S.meta.nazwa || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave(); }
function addBeam() { beamsSync(); if (BEAMS.length >= 10) { Q.toast('Maksymalnie 10 belek w projekcie.'); return; } const n = J.defaultState(); ['material', 'normy', 'sgu', 'wykonanie', 'kruche'].forEach(k => { n[k] = U.clone(S[k]); }); n.meta.nazwa = `Belka B-${BEAMS.length + 1}`; BEAMS.push(J.normalize(n)); dirty = true; switchBeam(BEAMS.length - 1); }
function delBeam(i) { beamsSync(); if (BEAMS.length < 2) return; BEAMS.splice(i, 1); if (i < curB) curB--; curB = Math.min(curB, BEAMS.length - 1); S = BEAMS[curB]; dirty = true; $('#projName').value = S.meta.nazwa || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave(); }
document.addEventListener('click', async e => {
  const d = e.target.closest && e.target.closest('[data-bdel]'); if (d) { e.stopPropagation(); const i = +d.dataset.bdel; if (await Q.ask(`Usunąć belkę „${esc(BEAMS[i].meta.nazwa || i + 1)}” z projektu?`, 'Usuń', true)) delBeam(i); return; }
  const t = e.target.closest && e.target.closest('[data-btab]'); if (t) { switchBeam(+t.dataset.btab); return; }
  if (e.target.closest && e.target.closest('[data-badd]')) addBeam();
});
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-cjs], [data-cjt]'); if (!a || !a.closest('#inputs')) return; if (a.dataset.cjs !== undefined) A.jointDesigner({ sup: +a.dataset.cjs }); else A.jointDesigner({ styk: +a.dataset.cjt }); });
document.addEventListener('dblclick', e => { const t = e.target.closest && e.target.closest('[data-btab]'); if (!t) return; const f = $('#projName'); if (f) { f.focus(); f.select(); } });
let asT = null;
function autosave() {
  clearTimeout(asT);
  asT = setTimeout(() => {
    const data = JSON.stringify(Object.assign({ state: S, filePath }, beamsOut()));
    if (typeof window.hostStore === 'function') { try { window.hostStore(data); } catch (e) { /* */ } }
    else { try { localStorage.setItem('belkastal-autosave', data); } catch (e) { /* */ } }
  }, 600);
}
A.autosave = autosave;
A.markDirty = () => { dirty = true; updateTitle(); autosave(); };
function projectJSON() { return JSON.stringify(Object.assign({ format: BS.FORMAT, program: `${BS.APP} ${BS.VERSION}`, silnik: BS.ENGINE, zapisano: new Date().toISOString(), sha256: J.hash(S), state: S }, beamsOut()), null, 1); }
A.projectJSON = projectJSON;
function download(name, content, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
A.download = download;
async function saveFile(as) {
  if (inHost()) {
    const r = await hostCall('save', { path: as ? '' : filePath, name: safeName('.belkastal'), content: projectJSON(), filter: 'project' });
    if (r && r.ok) { filePath = r.path; dirty = false; updateTitle(); autosave(); Q.toast('Zapisano: ' + baseName(r.path)); } else if (r && r.err) Q.toast('Błąd zapisu: ' + r.err);
  } else { download(safeName('.belkastal'), projectJSON(), 'application/json'); dirty = false; updateTitle(); }
}
function loadProject(text, path) {
  let o;
  try {
    const t = text.trim();
    if (t.startsWith('<')) { const m = t.match(/<script type="application\/json" id="belkastal-dane">([\s\S]*?)<\/script>/); if (!m) throw new Error('plik HTML nie zawiera danych projektu BelkaStal'); o = JSON.parse(m[1].replace(/<\\\//g, '</')); }
    else o = JSON.parse(t);
  } catch (e) { Q.toast('Nie można odczytać pliku: ' + e.message, 4000); return; }
  const st = o.state || o.dane || o;
  S = beamsIn(o, st); filePath = path || ''; dirty = false; vStage = null; selSpans.clear(); rendered = {};
  $('#projName').value = S.meta.nazwa || '';
  if (o.sha256 && !o.beams && o.sha256 !== J.hash(st)) Q.toast('Uwaga: suma kontrolna danych w pliku nie zgadza się z zawartością (plik edytowany ręcznie?).', 5000);
  renderInputs(); recalc(); updateTitle(); autosave();
}
A.loadProject = loadProject;
async function openFile() {
  if (dirty && !(await Q.ask('Niezapisane zmiany zostaną utracone. Otworzyć inny projekt?', 'Otwórz'))) return;
  if (inHost()) { const r = await hostCall('open', { filter: 'project' }); if (r && r.ok) loadProject(r.content, r.path); else if (r && r.err) Q.toast('Błąd odczytu: ' + r.err); return; }
  const inp = $('#fileIn'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (f) f.text().then(t => loadProject(t, f.name)); }; inp.click();
}
async function newProject() {
  if (dirty && !(await Q.ask('Niezapisane zmiany zostaną utracone. Utworzyć nowy projekt?', 'Nowy projekt'))) return;
  S = J.defaultState(); BEAMS = null; curB = 0; filePath = ''; dirty = false; vStage = null; selSpans.clear(); rendered = {};
  $('#projName').value = S.meta.nazwa; renderInputs(); recalc(); updateTitle(); autosave();
}
function doPrint() { A.selectTab('report'); setTimeout(() => window.print(), 250); }
A.doPrint = doPrint;
function about() {
  Q.modal(`<h3>BelkaStal ${BS.VERSION}</h3><p>Analiza i projektowanie belek stalowych według Eurokodów (PN-EN z polskimi załącznikami krajowymi): nośność, stateczność, SGU, podpory i połączenia, etapy realizacji, pożar, zmęczenie, kruche pękanie, klasa wykonania.</p>
  <p><b>Przekroje:</b> IPE, HEA, HEB, HEM, ceowniki UPN/UPE, kątowniki, rury kwadratowe i prostokątne (PN-EN 10210 / 10219), dwuteowniki spawane.</p>
  <p><b>Silnik:</b> ${esc(BS.ENGINE)} · format danych ${esc(BS.FORMAT)}. Raport zawiera sumę kontrolną SHA-256 danych i pełne dane projektu – plik raportu HTML można ponownie otworzyć w programie.</p>
  <p><b>Ograniczenia:</b> belki pryzmatyczne; analiza sprężysta I rzędu; skręcanie od mimośrodu obciążeń nie jest analizowane; połączenia przegubowe (bez węzłów momentowych); kątowniki – element stężony.</p>
  <p class="hint">Skróty: Ctrl+N nowy, Ctrl+O otwórz, Ctrl+S zapisz, Ctrl+P drukuj, F2 – raport, Esc – odznacz / zamknij okno.</p>
  <div class="dbtn"><button class="btn pri" id="abOk" type="button">Zamknij</button></div>`, 'sm');
  $('#abOk').onclick = Q.closeModal;
}
function doAct(a) {
  ({ new: newProject, open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), print: doPrint, exporthtml: () => BS.V.exportHTML(), about,
    schemes: () => A.schemesPopup(), jdes: () => A.jointDesigner(), addsplice: () => A.addSplice(), secwin: () => A.secPopup(), sectab: () => A.secTablePopup(), loads: () => A.loadPopup({ all: true }), snow: () => A.snowPopup() }[a] || (() => {}))();
}
A.doAct = doAct;

/* ================================================================ START */
function init() {
  let saved = window.__AUTOSAVE || null;
  if (!saved) { try { saved = JSON.parse(localStorage.getItem('belkastal-autosave') || 'null'); } catch (e) { saved = null; } }
  if (saved && saved.state) { try { S = beamsIn(saved, saved.state); filePath = saved.filePath || ''; } catch (e) { S = J.defaultState(); } }
  $('#projName').value = S.meta.nazwa || '';
  $('#projName').addEventListener('input', e => { S.meta.nazwa = e.target.value; dirty = true; updateTitle(); autosave(); rendered.report = false; const bt = $(`.btab[data-btab="${curB}"] span`); if (bt) bt.textContent = S.meta.nazwa.slice(0, 14); });
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.tab));
    renderActive();
  }));
  $$('#top [data-act]').forEach(b => b.addEventListener('click', () => doAct(b.dataset.act)));
  $('#status').addEventListener('click', () => A.selectTab('sum'));
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (Q.isModal() && e.key !== 'Escape') return;
    if (e.ctrlKey && k === 's') { e.preventDefault(); saveFile(e.shiftKey); }
    else if (e.ctrlKey && k === 'o') { e.preventDefault(); openFile(); }
    else if (e.ctrlKey && k === 'n') { e.preventDefault(); newProject(); }
    else if (e.ctrlKey && k === 'p') { e.preventDefault(); doPrint(); }
    else if (e.key === 'F2') { e.preventDefault(); A.selectTab('report'); }
    else if (e.key === 'Escape') { const wasM = Q.isModal(), wasC = !!$('.ctxmenu'); Q.closeList(); Q.closeCtx(); if (wasM) Q.closeModal(); if (!wasM && !wasC && selSpans.size) { selSpans.clear(); renderDataSide(); } }
  });
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') Q.closeModal(); });
  // podział zakładki Dane: dane | schemat (przeciąganie)
  const wrap = () => $('#p-data .datawrap'), setDsl = v => { const w = wrap(); if (w) w.style.setProperty('--dsl', v); };
  try { const v = localStorage.getItem('bs.dsl'); if (v) setDsl(v); } catch (e) { /* */ }
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('#dsplit'); if (!h) return;
    e.preventDefault(); const w = wrap(), r = w.getBoundingClientRect(); h.classList.add('drag'); document.body.classList.add('dsdrag');
    const mv = ev => { const pc = Math.max(25, Math.min(75, (ev.clientX - r.left) / r.width * 100)); setDsl(pc.toFixed(1) + '%'); };
    const up = () => { h.classList.remove('drag'); document.body.classList.remove('dsdrag'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); try { localStorage.setItem('bs.dsl', w.style.getPropertyValue('--dsl')); } catch (e2) { /* */ } renderDataSide(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  let rz = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(() => { rendered = {}; renderDataSide(); renderActive(); }, 150); });
  renderInputs(); recalc(); renderInputs(); updateTitle();
  if (window.__hostOpenFile) loadProject(window.__hostOpenFile.content, window.__hostOpenFile.path);
}
A.init = init;
})();
