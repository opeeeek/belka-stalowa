/* =====================================================================
   BelkaStal – raport obliczeniowy (notka) z pełnym tokiem obliczeń.
   Odtwarzalność: wersja programu i silnika, suma SHA-256 kanonicznego
   JSON danych, osadzone dane projektu (plik HTML można otworzyć w programie).
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, D = BS.D, N = BS.N, K = BS.K, X = BS.X, S0 = BS.S;
const RP = BS.Raport = {};
const esc = U.esc;
const f = (v, n) => U.fmt(v, n === undefined ? 2 : n);
const kN = (v) => U.fmt(v / 1e3, 2), kNm = (v) => U.fmt(v / 1e6, 2);
const eq = (s, r) => `<div class="eq">${s}${r ? `<span class="r">[${r}]</span>` : ''}</div>`;
const okS = (u) => (u === null || u === undefined ? '' : u <= 1 + 1e-9 ? '<span class="ok">– warunek spełniony</span>' : '<span class="fail">– warunek NIE spełniony</span>');
const tbl = (head, rows) => `<table class="grid"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const ubT = (c) => (c.util === null || c.util === undefined ? (c.info ? 'inf.' : '—') : (isFinite(c.util) ? Math.round(c.util * 100) + '%' : '∞'));
const stT = (c) => (c.info ? 'INFO' : c.status === 'ok' ? '<span class="ok">OK</span>' : c.status === 'warn' ? '<span class="warn">UWAGA</span>' : '<span class="fail">NIE</span>');

RP.build = function (S, R) {
  const md = R.md, sec = R.sec, b = R.base, mat = R.mat, ndp = R.ndp, an = R.an;
  const nE = md.nE, fin = nE - 1;
  let h = '';
  let sn = 0; const H2 = (t) => `<h2>${++sn}. ${t}</h2>`;
  // ---------------------------------------------------------- nagłówek
  h += `<h1>Obliczenia belki stalowej – ${esc(S.meta.nazwa)}</h1>`;
  h += `<p>${esc(S.meta.obiekt || '')}</p>`;
  h += `<table class="meta">${[
    ['Element', esc(S.meta.nazwa)], ['Opis', esc(S.meta.opis || '—')], ['Projektant', esc(S.meta.projektant || '—') + (S.meta.nrUprawnien ? ', upr. ' + esc(S.meta.nrUprawnien) : '')], ['Sprawdzający', esc(S.meta.sprawdzajacy || '—')], ['Data opracowania', esc(S.meta.data || '—')],
    ['Program', `${BS.APP} ${BS.VERSION}; silnik: ${esc(BS.ENGINE)}`], ['Podstawa normowa', `${R.norm.genStosowana}. generacja Eurokodów, ${esc(N.KRAJE[R.norm.kraj] || R.norm.kraj)}`],
    ['Suma kontrolna danych (SHA-256)', `<span class="mono">${R.hash}</span>`]
  ].map(r => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td></tr>`).join('')}</table>`;
  const vOk = !R.nFail && !R.errors.length;
  h += `<div class="verdict ${vOk ? 'ok' : 'fail'}">${vOk ? `Wszystkie warunki nośności, stateczności i użytkowalności są spełnione. Maksymalne wytężenie: ${U.pct(R.uMax)} – ${esc(R.gov ? R.gov.n : '')}.` : `Niespełnione warunki: ${R.nFail}. Maksymalne wytężenie: ${isFinite(R.uMax) ? U.pct(R.uMax) : '∞'} – ${esc(R.gov ? R.gov.n : '')}.`}${R.nWarn ? ` Ostrzeżenia: ${R.nWarn}.` : ''}</div>`;

  // ---------------------------------------------------------- 1. profil normowy
  const no = R.norm, P0 = S.normy;
  h += H2('Podstawa normowa – profil normowy projektu');
  h += tbl(['Pozycja', 'Wartość'], [
    ['Kraj stosowania', esc(N.KRAJE[no.kraj] || no.kraj)], ['Generacja wybrana', `${no.genZadana}. – ${esc(N.GENERACJE[no.genZadana])}`], ['Generacja zastosowana', `<b>${no.genStosowana}.</b>`],
    ['Decyzja i uzasadnienie', esc(no.decyzja)], ['Data weryfikacji zestawu', esc(P0.dataWeryfikacji || '— (nie podano)')], ['Weryfikował(a)', esc(P0.zweryfikowal || '— (nie podano)')], ['Źródło weryfikacji', esc(P0.zrodloWeryfikacji || '—')]
  ]);
  if (no.genZadana === 2 && no.braki2.length) h += `<p class="note">Braki zestawu 2. generacji dla zakresu projektu: ${no.braki2.map(esc).join('; ')}.</p>`;
  h += '<h3>Dokumenty normowe stosowane (zakres projektu)</h3>';
  h += tbl(['Dokument (wydanie)', 'Zmiany', 'Poprawki', 'Załącznik krajowy', 'Zakres zastosowania', 'Zweryf.'], no.dokumenty.map(d => [`<b>${esc(d.oznaczenie)}</b><br><span class="note">${esc(d.tytul)}</span>`, esc(d.zmiany.join('; ') || '—'), esc(d.poprawki.join('; ') || '—'), esc(d.zk || '—') + (d.zkStatus ? `<br><span class="note">${esc(d.zkStatus)}</span>` : ''), esc(d.zakres), d.zweryfikowano ? 'tak' : '<span class="warn">nie</span>']));
  h += '<h3>Normy wyrobów i wykonawcze</h3>' + tbl(['Norma', 'Wydanie EN', 'Zakres'], N.WYROBY.map(w => [esc(w.oznaczenie), esc(w.en), esc(w.zakres)]));
  h += '<h3>Parametry ustalane krajowo (NDP) zastosowane w obliczeniach</h3>';
  h += tbl(['Parametr', 'Wartość', 'Punkt normy', 'Źródło'], Object.keys(N.NDP1_PL).map(k => { const d = N.NDP1_PL[k]; const ch = no.ndpZmienione.includes(k); return [esc(d.d), `<b>${esc(typeof ndp[k] === 'number' ? U.fmt(ndp[k], 3).replace(/,?0+$/, '') : String(ndp[k]))}</b>${ch ? ' <span class="warn">(zmieniono)</span>' : ''}`, esc(d.ref), esc(d.z) + (d.sp ? ' – do potwierdzenia z ZK' : '')]; }));
  h += `<p class="note">Stan wiedzy programu na ${esc(N.STAN_WIEDZY.data)}: ${N.STAN_WIEDZY.tekst.map(esc).join(' ')}</p>`;
  if (no.ostrz.length || no.bledy.length) h += no.bledy.concat(no.ostrz).map(t => `<p class="warn">${esc(t)}</p>`).join('');

  // ---------------------------------------------------------- 2. założenia
  h += H2('Założenia i dane wejściowe');
  h += '<h3>Schemat statyczny i geometria</h3>';
  h += `<p>Długość belki L = ${f(md.L / 1000)} m; przęsła: ${md.spans.map((s, i) => `L<sub>${i + 1}</sub> = ${f(s / 1000)} m`).join(', ')}${md.wL ? `; wspornik lewy ${f(md.wL / 1000)} m` : ''}${md.wP ? `; wspornik prawy ${f(md.wP / 1000)} m` : ''}.</p>`;
  h += tbl(['Podpora', 'x [m]', 'Rodzaj', 'Warunek dla zwichrzenia', 'ss / c [mm]', 'Węzeł'], md.sup.map(p => [p.id, f(p.x / 1000), esc(p.typ) + (p.kv !== 'fix' ? ` (kz = ${f(p.kv / 1000, 1)} kN/mm)` : '') + (p.kr && p.kr !== 'fix' ? ` (kφ = ${f(p.kr / 1e6, 0)} kNm/rad)` : ''), p.ltb === 'pelne' ? 'pełne utwierdzenie (u = u′ = φ = φ′ = 0)' : 'widełkowe (u = φ = 0)', `${f(p.ss, 0)} / ${f(U.num(p.src && p.src.c), 0)}`, esc((p.wezel || {}).typ || 'brak')]).concat(md.tmp.map(t => [t.id + ' (tymcz.)', f(t.x / 1000), 'przegubowa, montażowa', 'widełkowe', f(t.ss, 0), `usuwana po etapie ${t.do + 1}`])));
  h += '<h3>Etapy realizacji</h3>';
  h += tbl(['Etap', 'Sytuacja obliczeniowa', 'Podpory czynne', 'Stężenia czynne', 'Przypadki obciążeń wprowadzane'], md.etapy.map((e, s) => [`${s + 1}. ${esc(e.nazwa)}${e.opis ? `<br><span class="note">${esc(e.opis)}</span>` : ''}`, e.typ === 'montaz' ? 'przejściowa (montaż)' : 'trwała (eksploatacja)', md.systems[s].map(p => p.id).join(', '), md.stez.filter(z => z.od <= s).map(z => `${z.typ} x = ${f(z.x / 1000)} m (${z.wys})`).concat((md.ciagle.pasG && U.num(md.ciagle.odEtapu) <= s) ? ['ciągłe – pas górny'] : []).concat((md.ciagle.pasD && U.num(md.ciagle.odEtapuD) <= s) ? ['ciągłe – pas dolny'] : []).join('; ') || '—', md.cases.filter(c => c.etap === s).map(c => esc(c.id)).join(', ') || '—']));
  h += '<p class="note">Analiza etapowa: obciążenia stałe wprowadzone w etapie k obciążają układ podpór tego etapu; po usunięciu podpory tymczasowej jej reakcja jest przykładana przeciwnie do układu kolejnego etapu (zachowanie sił „zamrożonych”). Obciążenia zmienne działają w etapie przypisania.</p>';
  md.etapy.forEach((e, s) => { h += `<div class="fig">${D.scheme(S, md, { etap: s, width: 900 })}<div class="note">Etap ${s + 1}: ${esc(e.nazwa)}</div></div>`; });
  h += '<h3>Materiał</h3>';
  h += `<p>Stal ${esc(mat.gatunek)}${esc(mat.podgatunek)} wg ${esc((BS.M.STAL[mat.gatunek] || {}).norma)}; t<sub>max</sub> = ${f(mat.tMax, 1)} mm → f<sub>y</sub> = ${mat.fy} MPa, f<sub>u</sub> = ${mat.fu} MPa (${esc(mat.zr)}); E = 210 000 MPa, G = 81 000 MPa, ν = 0,3; ciężar 78,5 kN/m³; ε = √(235/f<sub>y</sub>) = ${f(b.eps, 3)}.</p>`;
  h += '<h3>Przekrój</h3>';
  h += `<div class="fig">${D.section(sec, { size: 240, eff: b.effNeg || b.effPos })}</div>`;
  h += `<p>${esc(sec.nazwa)}: h = ${f(sec.h, 1)} mm, b<sub>g</sub> × t<sub>g</sub> = ${f(sec.bg, 0)} × ${f(sec.tg, 1)} mm, b<sub>d</sub> × t<sub>d</sub> = ${f(sec.bd, 0)} × ${f(sec.td, 1)} mm, t<sub>w</sub> = ${f(sec.tw, 1)} mm${sec.r ? `, r = ${f(sec.r, 0)} mm` : ''}${sec.aw ? `, spoiny a = ${f(sec.aw, 1)} mm` : ''}.</p>`;
  h += `<p>A = ${f(sec.A / 100)} cm², I<sub>y</sub> = ${f(sec.Iy / 1e4, 0)} cm⁴, I<sub>z</sub> = ${f(sec.Iz / 1e4, 1)} cm⁴, W<sub>el,y</sub> = ${f(sec.Wel_t / 1e3, 1)} / ${f(sec.Wel_b / 1e3, 1)} cm³ (góra/dół), W<sub>pl,y</sub> = ${f(sec.Wpl_y / 1e3, 1)} cm³, W<sub>pl,z</sub> = ${f(sec.Wpl_z / 1e3, 1)} cm³, I<sub>t</sub> = ${f(sec.It / 1e4)} cm⁴, I<sub>w</sub> = ${f(sec.Iw / 1e9, 1)}·10³ cm⁶, i<sub>y</sub> = ${f(sec.iy / 10)} cm, i<sub>z</sub> = ${f(sec.iz / 10)} cm${!sec.sym ? `, z<sub>s</sub> − z<sub>c</sub> = ${f(sec.z0, 1)} mm, β<sub>z</sub> = ${f(sec.betaZ, 1)} mm` : ''}; masa ${f(sec.masa, 1)} kg/m. Charakterystyki obliczone z geometrii przekroju (wielobok z zaokrągleniami).</p>`;
  h += '<h3>Oddziaływania (wartości charakterystyczne)</h3>';
  const wysN = { pas_g: 'pas górny', srodek: 'środek ścinania', pas_d: 'pas dolny' };
  h += tbl(['Przypadek', 'Rodzaj / kategoria', 'Etap', 'Układ / grupa', 'ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub>', 'Składniki'], md.cases.map(c => [`<b>${esc(c.id)}</b> – ${esc(c.nazwa)}`, esc(S0.RODZAJE[c.rodzaj].n) + (c.rodzaj === 'Q' ? '<br>' + esc((N.PSI[c.kat] || {}).n || c.kat) : ''), String(c.etap + 1), S0.RODZAJE[c.rodzaj].stale ? 'jednolite źródło' : `${c.uklad === 'szachownica' ? 'niekorzystnie w przęsłach' : 'w całości'}${c.wyklucz ? ` / grupa „${esc(c.wyklucz)}”` : ''}`, S0.RODZAJE[c.rodzaj].stale || c.rodzaj === 'A' ? '—' : K.psi(c).map(v => f(v, 2)).join(' / '),
    c.parts.map(p => p.typ === 'q' ? `q = ${f(p.q0)}${p.q1 !== p.q0 ? '…' + f(p.q1) : ''} kN/m, x = ${f(p.x0 / 1000)}–${f(p.x1 / 1000)} m, ${p.kier === 'y' ? 'poziomo' : wysN[p.wys]}` : p.typ === 'P' ? `P = ${f(p.P / 1000)} kN, x = ${f(p.x / 1000)} m, ${p.kier === 'y' ? 'poziomo' : wysN[p.wys]}, ss = ${f(p.ss, 0)} mm` : `M = ${f(p.M / 1e6)} kNm, x = ${f(p.x / 1000)} m`).join('<br>') + (c.Nn ? `<br>N = ${f(c.Nn / 1000)} kN` : '')]));
  h += '<h3>Kombinacje oddziaływań (PN-EN 1990)</h3>';
  const gS = ndp.gG_sup * ndp.KFI;
  h += ndp.komb === '6.10' ? eq(`E<sub>d</sub> = Σ γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub>; γ<sub>G,sup</sub> = ${f(gS)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf)}, γ<sub>Q</sub> = ${f(ndp.gQ * ndp.KFI)}`, '6.10')
    : eq(`mniej korzystna z: Σ γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·ψ<sub>0,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub> (6.10a) oraz Σ ξ·γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub> (6.10b); γ<sub>G,sup</sub> = ${f(gS)} (K<sub>FI</sub> = ${f(ndp.KFI)}), γ<sub>G,inf</sub> = ${f(ndp.gG_inf)}, γ<sub>Q</sub> = ${f(ndp.gQ * ndp.KFI)}, ξ = ${f(ndp.xi)}`, '6.10a, 6.10b, tabl. A1.2(B)');
  h += eq('SGU: charakterystyczna G + Q<sub>k,1</sub> + Σψ<sub>0,i</sub>Q<sub>k,i</sub> (6.14b); częsta G + ψ<sub>1,1</sub>Q<sub>k,1</sub> + Σψ<sub>2,i</sub>Q<sub>k,i</sub> (6.15b); quasi-stała G + Σψ<sub>2,i</sub>Q<sub>k,i</sub> (6.16b)');
  h += eq(`EQU: γ<sub>G,sup</sub> = ${f(ndp.gG_sup_equ)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf_equ)}, γ<sub>Q</sub> = ${f(ndp.gQ_equ)} – części G w segmentach rozdzielone na korzystne i niekorzystne`, 'tabl. A1.2(A)');
  if (S.pozar.aktywny || md.cases.some(c => c.rodzaj === 'A')) h += eq(`sytuacje wyjątkowa i pożarowa: G + A<sub>d</sub> + (${ndp.psiAcc === 'psi2' ? 'ψ<sub>2,1</sub>' : 'ψ<sub>1,1</sub>'})·Q<sub>k,1</sub> + Σψ<sub>2,i</sub>Q<sub>k,i</sub>`, '6.11b');
  const cnt = {}; R.combos.forEach(c => { const k = c.typ + '|' + c.etap; cnt[k] = (cnt[k] || 0) + 1; });
  h += `<p class="note">Przegląd kombinacji: ${Object.keys(cnt).map(k => { const [t, s] = k.split('|'); return `${({ SGN: 'SGN', char: 'charakterystyczne', czest: 'częste', qp: 'quasi-stałe', kruche: 'do doboru stali', poz: 'pożarowe', wyj: 'wyjątkowe' })[t] || t} (etap ${+s + 1}): ${cnt[k]}`; }).join('; ')}. Obciążenia zmienne – wszystkie podzbiory, każde jako wiodące; układy w przęsłach: ${K.patterns(md).map(p => esc(p.n)).join('; ')}.</p>`;

  // ---------------------------------------------------------- 3. analiza
  h += H2('Analiza statyczna');
  h += `<p>Analiza sprężysta I rzędu metodą elementów skończonych (belka Eulera–Bernoulliego, ${md.xs.length - 1} elementów, dokładne M(x), V(x) w elementach), osobno w płaszczyźnie pionowej (I<sub>y</sub>) i poziomej (I<sub>z</sub>). Siły wewnętrzne dla kombinacji – superpozycja wyników przypadków (z historią etapów).</p>`;
  for (let s = 0; s < nE; s++) {
    const ev = R.env[s], sup = md.systems[s].map(p => p.x);
    h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    h += `<div class="fig">${D.plot({ xs: an.xs, L: md.L, width: 900, height: 190, sup, title: 'Obwiednia M_Ed [kNm] (SGN)', scale: 1e-6, series: [{ y: ev.Mmax, col: D.C.M, fill: true }, { y: ev.Mmin, col: D.C.M, fill: true }] })}</div>`;
    h += `<div class="fig">${D.plot({ xs: an.xs, L: md.L, width: 900, height: 170, sup, title: 'Obwiednia V_Ed [kN] (SGN)', scale: 1e-3, down: false, series: [{ y: ev.Vmax, col: D.C.V, fill: true }, { y: ev.Vmin, col: D.C.V, fill: true }] })}</div>`;
    if (Math.max(...Array.from(ev.Mzmax).map(Math.abs)) > 1) h += `<div class="fig">${D.plot({ xs: an.xs, L: md.L, width: 900, height: 160, sup, title: 'Obwiednia M_z,Ed [kNm]', scale: 1e-6, series: [{ y: ev.Mzmax, col: D.C.z, fill: true }, { y: ev.Mzmin, col: D.C.z, fill: true }] })}</div>`;
    h += `<div class="fig">${D.plot({ xs: an.xs, L: md.L, width: 900, height: 160, sup, title: 'Ugięcia w [mm] – kombinacje charakterystyczne', dec: 1, series: [{ y: ev.wmax, col: D.C.w, fill: true }, { y: ev.wmin, col: D.C.w, dash: '4 2' }] })}</div>`;
    h += tbl(['Podpora', 'R<sub>Ed,max</sub> [kN]', 'R<sub>Ed,min</sub> [kN]', '|M<sub>Ed</sub>| [kNm]'].concat(Object.keys(an.res[s]).map(k => `R<sub>k</sub> ${esc(an.res[s][k].c.id)} [kN]`)), md.systems[s].map(p => { const r = ev.R[p.id] || {}; return [p.id, kN(r.max), kN(r.min), kNm(r.Mmax || 0)].concat(Object.keys(an.res[s]).map(k => { const q = an.res[s][k].tot.R[p.id]; return q ? kN(q.R) : '—'; })); }));
  }

  // ---------------------------------------------------------- 4. nośność przekroju
  h += H2('Stan graniczny nośności – nośność przekroju (PN-EN 1993-1-1, 6.2)');
  const cl = (k, t) => `<p><b>${t}</b> – klasa ${k.cls}: ${k.all.map(p => `${esc(p.n)}: c/t = ${f(p.c, 1)}/${f(p.t, 1)} = ${f(p.ct, 2)} → kl. ${p.cls} (granice ${p.lim.map(l => isFinite(l) ? f(l, 1) : '—').join('/')})`).join('; ')}.</p>`;
  h += '<h3>Klasyfikacja przekroju (tabl. 5.2)</h3>' + cl(b.kPos, 'Zginanie M > 0') + cl(b.kNeg, 'Zginanie M < 0') + cl(b.kN, 'Ściskanie');
  [['effPos', 'M > 0'], ['effNeg', 'M < 0'], ['effN', 'ściskanie']].forEach(([k, t]) => { const e = b[k]; if (!e) return; h += `<p>Przekrój efektywny (${t}) wg PN-EN 1993-1-5, 4.4: ${e.info.map(i => `${esc(i.el)}: λ̄<sub>p</sub> = (c/t)/(28,4ε√k<sub>σ</sub>) = ${f(i.lp, 3)}, k<sub>σ</sub> = ${f(i.kS, 2)}${i.psi !== undefined ? `, ψ = ${f(i.psi, 3)}` : ''}, ρ = ${f(i.rho, 3)}`).join('; ')} → A<sub>eff</sub> = ${f(e.A / 100)} cm²${e.Weff ? `, W<sub>eff,min</sub> = ${f(e.Weff / 1e3, 1)} cm³` : ''}.</p>`; });
  for (let s = 0; s < nE; s++) {
    const cs = R.checks.filter(c => c.etap === s && c.grp.startsWith('SGN – nośność'));
    if (!cs.length) continue;
    h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    cs.forEach(c => {
      const d = c.d || {};
      if (c.id.endsWith('-M')) {
        const p = d.p || {};
        h += `<p><b>${esc(c.n)}</b> – x = ${f(c.x / 1000)} m; ${esc(c.combo)}</p>`;
        h += eq(`M<sub>Ed</sub> = ${kNm(Math.abs(d.M))} kNm${Math.abs(d.N) > 1 ? `, N<sub>Ed</sub> = ${kN(d.N)} kN` : ''}${Math.abs(d.Mz) > 1 ? `, M<sub>z,Ed</sub> = ${kNm(Math.abs(d.Mz))} kNm` : ''}, V<sub>Ed</sub> = ${kN(Math.abs(d.V))} kN`);
        const W = p.cls <= 2 ? sec.Wpl_y : p.cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : (d.M >= 0 ? b.effPos : b.effNeg || {}).Weff;
        h += eq(`M<sub>c,Rd</sub> = W·f<sub>y</sub>/γ<sub>M0</sub> = ${f(W / 1e3, 1)}·10³·${mat.fy}/${f(ndp.gM0)} = ${kNm(W * mat.fy / ndp.gM0)} kNm (W = ${p.cls <= 2 ? 'W<sub>pl,y</sub>' : p.cls === 3 ? 'W<sub>el,min</sub>' : 'W<sub>eff,min</sub>'})`, '6.13–6.15');
        if (p.rho > 0) h += eq(`V<sub>Ed</sub> > 0,5·V<sub>pl,Rd</sub>: ρ = (2V<sub>Ed</sub>/V<sub>pl,Rd</sub> − 1)² = ${f(p.rho, 4)} → M<sub>V,Rd</sub> = ${kNm(p.McRd)} kNm`, '6.2.8');
        if (p.MN && Math.abs(d.N) > 1) h += eq(`M<sub>N,Rd</sub> = ${kNm(p.MN)} kNm (oś obojętna plastyczna przy N<sub>Ed</sub>)`, '6.2.9.1');
        h += eq(`${p.f === '6.41' ? `(M<sub>y,Ed</sub>/M<sub>N,y,Rd</sub>)<sup>α</sup> + (M<sub>z,Ed</sub>/M<sub>N,z,Rd</sub>)<sup>β</sup>` : p.cls >= 3 && (Math.abs(d.N) > 1 || Math.abs(d.Mz) > 1) ? 'σ<sub>x,Ed</sub>/(f<sub>y</sub>/γ<sub>M0</sub>)' : `M<sub>Ed</sub>/M<sub>${Math.abs(d.N) > 1 && p.cls <= 2 ? 'N' : 'c'},Rd</sub>`} = ${f(c.util, 3)} ≤ 1,0 ${okS(c.util)}`, p.f);
      } else if (c.id.endsWith('-V')) {
        h += `<p><b>${esc(c.n)}</b> – x = ${f(c.x / 1000)} m</p>`;
        h += eq(`A<sub>v</sub> = ${sec.typ === 'walc' ? `max(A − 2b·t<sub>f</sub> + (t<sub>w</sub> + 2r)t<sub>f</sub>; η·h<sub>w</sub>·t<sub>w</sub>)` : 'η·h<sub>w</sub>·t<sub>w</sub>'} = ${f(b.Av / 100)} cm² (η = ${f(b.eta, 2)}); V<sub>pl,Rd</sub> = A<sub>v</sub>·f<sub>y</sub>/(√3·γ<sub>M0</sub>) = ${kN(b.Vpl)} kN`, '6.18');
        h += eq(`V<sub>Ed</sub>/V<sub>pl,Rd</sub> = ${kN(c.Ed)}/${kN(c.Rd)} = ${f(c.util, 3)} ≤ 1,0 ${okS(c.util)}`, '6.17');
      } else {
        h += eq(`${esc(c.n)}: ${esc(V0(c.Ed, c.unit))} / ${esc(V0(c.Rd, c.unit))} = ${f(c.util, 3)} ${okS(c.util)}`, esc(c.ref));
      }
    });
  }

  // ---------------------------------------------------------- 5. PN-EN 1993-1-5
  h += H2('Środnik – PN-EN 1993-1-5');
  const sb = R.sb;
  h += eq(`h<sub>w</sub>/t<sub>w</sub> = ${f(sec.hw, 1)}/${f(sec.tw, 1)} = ${f(sb.ht, 1)} ${sb.need ? '>' : '≤'} ${sb.a === Infinity ? '72ε/η' : '31ε√k<sub>τ</sub>/η'} = ${f(sb.limit, 1)} → ${sb.need ? 'wymagane sprawdzenie wyboczenia przy ścinaniu' : 'wyboczenie przy ścinaniu nie występuje'}`, '5.1(2)');
  if (sb.need) {
    h += eq(`λ̄<sub>w</sub> = ${sb.a === Infinity ? 'h<sub>w</sub>/(86,4·t·ε)' : `h<sub>w</sub>/(37,4·t·ε·√k<sub>τ</sub>), k<sub>τ</sub> = ${f(sb.kt, 3)}`} = ${f(sb.lw, 3)}; χ<sub>w</sub> = ${f(sb.chi, 3)} (${sb.rigid ? 'sztywny' : 'niesztywny'} słupek podporowy); V<sub>b,Rd</sub> = χ<sub>w</sub>·f<sub>yw</sub>·h<sub>w</sub>·t/(√3·γ<sub>M1</sub>) = ${kN(sb.Vb)} kN (udział pasów V<sub>bf,Rd</sub> pominięto – bezpiecznie)`, '5.2, 5.3, tabl. 5.1');
  }
  R.checks.filter(c => c.grp.startsWith('PN-EN 1993-1-5')).forEach(c => {
    if (c.id.startsWith('pt') && !c.id.endsWith('i')) h += patchTxt(c.d, c.n);
    else h += eq(`${esc(c.n)}: ${c.unit === '-' ? f(c.Ed, 3) + ' / ' + f(c.Rd, 2) : esc(V0(c.Ed, c.unit)) + ' / ' + esc(V0(c.Rd, c.unit))} → wytężenie ${f(c.util, 3)} ${okS(c.util)}`, esc(c.ref));
  });

  // ---------------------------------------------------------- 6. stateczność
  h += H2('Stateczność – zwichrzenie i interakcja (PN-EN 1993-1-1, 6.3)');
  h += `<p>Sprężysty moment krytyczny M<sub>cr</sub> wyznaczono metodą elementów skończonych (funkcje Hermite'a dla u i φ; ${md.xl.length - 1} elementów) z równania K<sub>E</sub>·x = α<sub>cr</sub>·K<sub>G</sub>·x, gdzie K<sub>G</sub> zawiera: sprzężenie od rozkładu M<sub>y</sub>(x) kombinacji, wpływ wysokości przyłożenia obciążeń względem środka ścinania${sec.sym ? '' : ', człon monosymetrii β<sub>z</sub>'}; więzy: podpory (widełkowe lub pełne), stężenia dyskretne i ciągłe na wysokości pasa. Najmniejsza dodatnia wartość własna α<sub>cr</sub> dotyczy całej belki; M<sub>cr,seg</sub> = α<sub>cr</sub>·|M<sub>Ed,max,seg</sub>|. Krzywe zwichrzenia: ${R.ltb.some(l => l && l.met === '6.3.2.2') ? 'tabl. 6.4 (6.3.2.2)' : 'tabl. 6.5 (6.3.2.3)'}.</p>`;
  R.ltb.forEach((L, s) => {
    if (!L) return;
    h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    h += tbl(['Kombinacja', 'α<sub>cr</sub>'], L.runs.map(r => [esc(r.combo.opis), r.err ? esc(r.err) : r.lam === Infinity ? '∞' : f(r.lam, 3)]));
    L.segs.forEach(g => {
      if (g.brak) return;
      const l = g.ltb;
      h += `<p><b>Segment ${f(g.sg.x0 / 1000)}–${f(g.sg.x1 / 1000)} m</b>${g.sg.free ? ' (wspornik)' : ''} – ${esc(g.combo.opis)}</p>`;
      h += eq(`|M<sub>Ed,max</sub>| = ${kNm(g.sh.mabs)} kNm (${g.Mpos ? 'ściskany pas górny' : 'ściskany pas dolny'}); M<sub>cr</sub> = ${g.Mcr === Infinity ? '∞' : `${f(g.alphaCr, 3)}·${kNm(g.sh.mabs)} = ${kNm(g.Mcr)} kNm`}`);
      h += eq(`λ̄<sub>LT</sub> = √(W<sub>y</sub>·f<sub>y</sub>/M<sub>cr</sub>) = √(${f(g.Wy / 1e3, 1)}·10³·${mat.fy}/${g.Mcr === Infinity ? '∞' : f(g.Mcr, 0)}) = ${f(g.lam, 3)} (W<sub>y</sub> – przekrój kl. ${g.cls})`, '6.56');
      if (l.skip) h += eq(`λ̄<sub>LT</sub> ≤ λ̄<sub>LT,0</sub> = ${f(l.lam0, 2)} lub M<sub>Ed</sub>/M<sub>cr</sub> ≤ λ̄<sub>LT,0</sub>² → χ<sub>LT</sub> = 1,0 (zwichrzenie można pominąć)`, '6.3.2.2(4)');
      else {
        h += eq(`krzywa ${l.curve}: α<sub>LT</sub> = ${f(l.alLT, 2)}; Φ<sub>LT</sub> = 0,5[1 + α<sub>LT</sub>(λ̄<sub>LT</sub> − ${f(l.lam0, 2)}) + ${l.met === '6.3.2.3' ? f(l.beta, 2) + '·' : ''}λ̄<sub>LT</sub>²] = ${f(l.phi, 3)}; χ<sub>LT</sub> = ${f(l.chi, 3)}`, l.met === '6.3.2.3' ? '6.57' : '6.56');
        if (l.met === '6.3.2.3') h += eq(`k<sub>c</sub> = ${f(l.kc, 3)} (${esc(l.kcSrc || '')}); f = 1 − 0,5(1 − k<sub>c</sub>)[1 − 2(λ̄<sub>LT</sub> − 0,8)²] = ${f(l.f, 3)}; χ<sub>LT,mod</sub> = χ<sub>LT</sub>/f = ${f(l.chimod, 3)}`, '6.58, tabl. 6.6');
      }
      h += eq(`M<sub>b,Rd</sub> = χ<sub>LT${l.met === '6.3.2.3' ? ',mod' : ''}</sub>·W<sub>y</sub>·f<sub>y</sub>/γ<sub>M1</sub> = ${kNm(g.Mb)} kNm; M<sub>Ed</sub>/M<sub>b,Rd</sub> = ${f(g.u, 3)} ≤ 1,0 ${okS(g.u)}`, '6.54, 6.55');
    });
    const gov = L.runs.filter(r => r.mode).sort((a, b2) => a.lam - b2.lam)[0];
    if (gov && gov.lam <= 100) h += `<div class="fig">${D.mode(gov.mode, md.L, md.systems[s].map(p => p.x), { width: 900, title: `Postać zwichrzenia, etap ${s + 1}: α_cr = ${U.fmt(gov.lam, 3)}` })}</div>`;
    L.inter.forEach(it => {
      h += `<p><b>Interakcja – segment ${f(it.sg.x0 / 1000)}–${f(it.sg.x1 / 1000)} m</b> (${esc(it.combo.opis)})</p>`;
      h += eq(`N<sub>Ed</sub> = ${kN(it.Nc)} kN, M<sub>y,Ed</sub> = ${kNm(it.My)} kNm, M<sub>z,Ed</sub> = ${kNm(it.Mz)} kNm; L<sub>cr,y</sub> = ${f(it.Lcy / 1000)} m, L<sub>cr,z</sub> = ${f(it.Lcz / 1000)} m; λ̄<sub>y</sub> = ${f(it.ly, 3)}, λ̄<sub>z</sub> = ${f(it.lz, 3)}, λ̄<sub>T</sub> = ${f(it.lT, 3)}; χ<sub>y</sub> = ${f(it.chiy, 3)} (krzywa ${it.curves.y}), χ<sub>z</sub> = ${f(it.chiz, 3)}, χ<sub>T</sub> = ${f(it.chiT, 3)} (krzywa ${it.curves.z}); χ<sub>LT</sub> = ${f(it.chiLT, 3)}`, '6.3.1');
      h += eq(`C<sub>my</sub> = ${f(it.Cmy, 3)}, C<sub>mz</sub> = ${f(it.Cmz, 3)}, C<sub>mLT</sub> = ${f(it.CmLT, 3)}; k<sub>yy</sub> = ${f(it.kyy, 3)}, k<sub>yz</sub> = ${f(it.kyz, 3)}, k<sub>zy</sub> = ${f(it.kzy, 3)}, k<sub>zz</sub> = ${f(it.kzz, 3)}`, 'zał. B, tabl. B.1–B.3');
      h += eq(`(6.61): ${f(it.u61, 3)} ≤ 1,0 ${okS(it.u61)}; (6.62): ${f(it.u62, 3)} ≤ 1,0 ${okS(it.u62)}`, '6.61, 6.62');
    });
  });

  // ---------------------------------------------------------- 7. SGU
  h += H2('Stan graniczny użytkowalności');
  const sg = R.sgu;
  h += `<p>Kryteria: w<sub>max</sub> ≤ L/${esc(String(S.sgu.wmax))}, w<sub>3</sub> ≤ L/${esc(String(S.sgu.w3))} (wspornik: L = 2·L<sub>w</sub>); ugięcia względem cięciwy łączącej podpory przęsła. Podniesienie wykonawcze: ${S.sgu.podniesienie === 'brak' ? 'brak' : S.sgu.podniesienie === 'auto' ? `równe ugięciu od G (w<sub>c,max</sub> = ${f(sg.wcMax, 1)} mm)` : `w<sub>c</sub> = ${f(U.num(S.sgu.wc), 1)} mm (kształt wg ugięcia od G)`}.</p>`;
  sg.seg.forEach(r => { h += eq(`${esc(r.sg.n)}: w<sub>max</sub> = ${f(Math.max(0, r.wmax), 1)} mm ≤ ${f(r.limMax, 1)} mm; w<sub>3</sub> = ${f(Math.max(0, r.w3), 1)} mm ≤ ${f(r.lim3, 1)} mm ${okS(Math.max(r.wmax / r.limMax, r.w3 / r.lim3))}`, 'PN-EN 1990 A1.4.3'); });
  (sg.montaz || []).forEach(m => { h += eq(`Etap ${m.etap + 1} (${esc(md.etapy[m.etap].nazwa)}): ugięcie charakterystyczne w = ${f(m.w, 1)} mm (x = ${f(m.x / 1000)} m) – informacyjnie (wpływ na niwelację, podniesienie, montaż)`); });
  if (sg.f1) h += eq(`Pierwsza częstotliwość drgań własnych (MES, masa z G + Σψ<sub>2</sub>·Q): f<sub>1</sub> = ${f(sg.f1, 2)} Hz ${sg.f1 >= U.num(S.sgu.fmin, 3) ? '≥' : '<'} f<sub>min</sub> = ${f(U.num(S.sgu.fmin, 3), 1)} Hz ${okS(U.num(S.sgu.fmin, 3) / sg.f1)}`, 'PN-EN 1990 A1.4.4; PN-EN 1993-1-1 7.2.3');

  // ---------------------------------------------------------- 8. podpory i połączenia
  h += H2('Podpory, oparcia i połączenia (PN-EN 1993-1-5, PN-EN 1993-1-8)');
  (R.podpory || []).forEach(p => {
    h += `<h3>Podpora ${esc(p.id)}${p.tymcz ? ' (tymczasowa)' : ''} – x = ${f(p.x / 1000)} m</h3>`;
    h += `<div class="fig">${D.joint(sec, p.wezel || {})}</div>`;
    h += eq(`R<sub>Ed,max</sub> = ${kN(p.Rmax)} kN; |M<sub>Ed</sub>| = ${kNm(p.Mmax)} kNm; reakcje charakterystyczne (etap ${p.eK + 1}): ${p.Rk.map(r => `${esc(r.id)}: ${kN(r.R)} kN`).join(', ')}`);
    p.equ.forEach(e => { h += eq(`EQU, etap ${e.etap + 1}: R<sub>min</sub> = ${kN(e.Rmin)} kN ${e.Rmin < 0 ? '<span class="fail">– odrywanie: wymagane zakotwienie</span>' : '– docisk zapewniony'}`, 'PN-EN 1990 tabl. A1.2(A)'); });
    if (p.patch) h += patchTxt(p.patch, `Docisk środnika nad podporą ${p.id}`);
    if (p.zebro) { const z = p.zebro; h += eq(`Żebra podporowe 2 × ${f(z.bs, 0)} × ${f(z.ts, 0)} mm + środnik 2 × 15εt<sub>w</sub>: A<sub>s</sub> = ${f(z.As / 100)} cm², I<sub>s</sub> = ${f(z.Is / 1e4, 1)} cm⁴, i = ${f(z.i, 1)} mm, l = ${f(z.Lcr, 0)} mm, λ̄ = ${f(z.lam, 3)}, krzywa c: χ = ${f(z.chi, 3)}, N<sub>b,Rd</sub> = ${kN(z.NbRd)} kN ≥ ${kN(z.F)} kN ${okS(z.uB)}`, 'PN-EN 1993-1-5 9.4'); h += eq(`Docisk końców żeber: A<sub>c</sub> = ${f(z.Acont, 0)} mm², F<sub>Rd</sub> = ${kN(z.Fbear)} kN ${okS(z.uC)}`); }
    if (p.plyta) p.plyta.checks.forEach(c => { h += eq(`${esc(c.n)}: ${esc(c.f)}; F<sub>Rd</sub> = ${kN(c.Rd)} kN ≥ R<sub>Ed</sub> = ${kN(c.Ed)} kN ${okS(c.u)}`, esc(c.ref)); });
    if (p.pol) {
      const w = p.pol;
      h += `<p>${w.typ === 'blacha_czolowa' ? 'Krótka blacha czołowa' : 'Blacha żebrowa'}: śruby ${w.n} × ${esc(p.wezel.d)} kl. ${esc(p.wezel.kl)} (d<sub>0</sub> = ${w.bolt.d0} mm), blacha ${esc(mat.gatunek)} t<sub>p</sub> = ${f(U.num(p.wezel.tp), 0)} mm (f<sub>y</sub> = ${w.plate.fy}, f<sub>u</sub> = ${w.plate.fu} MPa); F<sub>v,Rd</sub> = ${kN(w.bolt.Fv)} kN/śrubę.</p>`;
      h += tbl(['Sprawdzenie', 'Punkt normy', 'E<sub>d</sub>', 'R<sub>d</sub>', 'Wytężenie', 'Tok'], w.checks.map(c => [esc(c.n), esc(c.ref), c.Rd === 1 ? '' : (c.n.includes('V·z') ? kNm(c.Ed) + ' kNm' : c.n.includes('Spoiny blachy do podpory') ? f(c.Ed, 1) + ' N/mm' : kN(c.Ed) + ' kN'), c.Rd === 1 ? '' : (c.n.includes('V·z') ? kNm(c.Rd) + ' kNm' : c.n.includes('Spoiny blachy do podpory') ? f(c.Rd, 1) + ' N/mm' : kN(c.Rd) + ' kN'), (isFinite(c.u) ? Math.round(c.u * 100) + '%' : '∞') + ' ' + okS(c.u), `<span class="note">${esc(c.f || '')}</span>`]));
      if (w.detal.length) h += `<p class="note">Rozmieszczenie łączników (tabl. 3.3): ${w.detal.map(d => `${esc(d.n)}: ${f(d.v, 0)} ${d.ok ? '≥' : '<'} ${f(d.lim, 1)} mm`).join('; ')}.</p>`;
      w.uwagi.forEach(u => { h += `<p class="warn">${esc(u)}</p>`; });
    }
  });

  // ---------------------------------------------------------- 9. pożar
  if (R.pozar && R.pozar.hist) {
    const fr = R.pozar;
    h += H2('Nośność w warunkach pożaru (PN-EN 1993-1-2)');
    h += `<p>Wymagana odporność R${fr.Rreq}; pożar standardowy (PN-EN 1991-1-2, krzywa ISO 834); nagrzewanie ${S.pozar.ekspozycja === '3' ? 'z 3 stron (płyta na pasie górnym)' : 'z 4 stron'}; ${fr.prot ? `zabezpieczenie: ${S.pozar.ochrona === 'plyty' ? 'okładzina skrzynkowa' : 'natrysk konturowy'}, λ<sub>p</sub> = ${esc(String(S.pozar.lp))} W/mK, d<sub>p</sub> = ${esc(String(S.pozar.dp))} mm, c<sub>p</sub> = ${esc(String(S.pozar.cp))} J/kgK, ρ<sub>p</sub> = ${esc(String(S.pozar.rp))} kg/m³` : 'bez zabezpieczenia'}. Kombinacja: ${esc(fr.combo.opis)}.</p>`;
    h += eq(`A<sub>m</sub>/V = ${f(fr.sf.AmV, 0)} m⁻¹ (kontur), [A<sub>m</sub>/V]<sub>b</sub> = ${f(fr.sf.AmVb, 0)} m⁻¹${fr.prot ? `, A<sub>p</sub>/V = ${f(fr.sf.ApV, 0)} m⁻¹` : `, k<sub>sh</sub> = 0,9·[A<sub>m</sub>/V]<sub>b</sub>/[A<sub>m</sub>/V] = ${f(fr.ksh, 3)}`}`, '4.2.5');
    h += eq(`M<sub>fi,Ed</sub> = ${kNm(Math.abs(fr.Efi.M))} kNm, V<sub>fi,Ed</sub> = ${kN(fr.Efi.V)} kN; κ<sub>1</sub> = ${f(fr.kap.k1, 2)}, κ<sub>2</sub> = ${f(fr.kap.k2, 2)}; μ<sub>0</sub> = ${f(fr.mu0, 3)}`, '4.2.3.3');
    h += eq(fr.cls4 ? 'Przekrój klasy 4 – temperatura krytyczna θ<sub>crit</sub> = 350 °C (zał. E)' : `θ<sub>a,cr</sub> = ${f(fr.thcr, 0)} °C (z warunku nośności M<sub>fi,θ,Rd</sub> = k<sub>y,θ</sub>·M<sub>Rd</sub>·γ<sub>M0</sub>/(γ<sub>M,fi</sub>·κ<sub>1</sub>·κ<sub>2</sub>), zwichrzenia χ<sub>LT,fi</sub> z λ̄<sub>LT,θ</sub> = λ̄<sub>LT</sub>√(k<sub>y,θ</sub>/k<sub>E,θ</sub>), α = 0,65√(235/f<sub>y</sub>) i ścinania); porównawczo wg (4.22): θ<sub>a,cr</sub> = ${f(fr.thcr424, 0)} °C`, '4.2.3.3, 4.2.3.4, 4.2.4');
    h += `<div class="fig">${D.fire(fr, { width: 640 })}</div>`;
    h += eq(`czas osiągnięcia θ<sub>a,cr</sub>: t<sub>cr</sub> = ${fr.tcr === null ? `> ${f(fr.hist[fr.hist.length - 1][0], 0)}` : f(fr.tcr, 1)} min ${fr.ok ? '≥' : '<'} ${fr.Rreq} min ${fr.ok ? '<span class="ok">– warunek spełniony</span>' : '<span class="fail">– warunek NIE spełniony</span>'}; w ${fr.Rreq}. min θ<sub>a</sub> = ${f(fr.thR, 0)} °C, wytężenie ${f(fr.uR, 3)}`, '4.2.5.1/4.2.5.2');
  }

  // ---------------------------------------------------------- 10. zmęczenie
  if (R.zm && R.zm.det) {
    const z = R.zm;
    h += H2('Zmęczenie (PN-EN 1993-1-9)');
    h += `<p>Przypadki cykliczne: ${z.ids.map(esc).join(', ')}; współczynnik dynamiczny φ = ${esc(String(S.zmeczenie.phi))}${S.zmeczenie.zmiennyZnak ? ', obciążenie zmiennego znaku' : ''}; n = ${U.fmt(z.n, 0)} cykli; γ<sub>Ff</sub> = ${f(ndp.gFf)}, γ<sub>Mf</sub> = ${f(z.gMf)} (${S.zmeczenie.ocena === 'bezpieczna' ? 'bezpieczny okres użytkowania' : 'tolerancja uszkodzeń'}, ${S.zmeczenie.skutki === 'duze' ? 'duże' : 'małe'} skutki).</p>`;
    z.det.forEach(d => { h += eq(`${esc(d.cat.n)} (${esc(d.miejsce)}): Δσ = ${f(d.ds, 1)} MPa (x = ${f(d.x / 1000)} m); Δσ<sub>C</sub>/γ<sub>Mf</sub> = ${f(d.dcd, 1)} MPa; N<sub>R</sub> = ${isFinite(d.Nf) ? U.fmt(d.Nf, 0) : '∞ (poniżej progu Δσ<sub>L</sub>)'}; D = n/N<sub>R</sub> = ${f(d.D, 4)} ≤ 1,0 ${okS(d.D)}`, 'rys. 7.1, 8(2)'); });
    h += eq(`Δτ = ${f(z.tau.dt, 1)} MPa; Δτ<sub>C</sub> = ${f(z.tau.dtc, 0)} MPa (m = 5); D = ${f(z.tau.D, 4)} ${okS(z.tau.D)}`, 'rys. 7.2');
  }

  // ---------------------------------------------------------- 11. kruche pękanie
  if (R.kr) {
    const k = R.kr;
    h += H2('Dobór stali ze względu na kruche pękanie (PN-EN 1993-1-10)');
    h += eq(`T<sub>Ed</sub> = T<sub>md</sub> + ΔT<sub>r</sub> + ΔT<sub>σ</sub> + ΔT<sub>R</sub> + ΔT<sub>ε̇</sub> + ΔT<sub>εcf</sub> = ${f(U.num(S.kruche.Tmd), 0)} + ${f(U.num(S.kruche.dTr), 0)} + 0 + ${f(U.num(ndp.dTR), 0)} + ${f(U.num(S.kruche.dTeps), 0)} + ${f(U.num(S.kruche.dTcf), 0)} = ${f(k.TEd, 0)} °C`, '2.2(5), (2.2)');
    h += `<p>σ<sub>Ed</sub> z kombinacji G + ψ<sub>1</sub>·Q<sub>k,1</sub> + Σψ<sub>2,i</sub>·Q<sub>k,i</sub> (2.6); f<sub>y</sub>(t) = f<sub>y,nom</sub> − 0,25·t (2.4); dopuszczalna grubość z tabl. 2.1 (interpolacja liniowa).</p>`;
    h += tbl(['Element', 't [mm]', 'σ<sub>Ed</sub> [MPa]', 'f<sub>y</sub>(t) [MPa]', 'σ<sub>Ed</sub>/f<sub>y</sub>(t)', 't<sub>max</sub> [mm]', 'Wynik'], k.el.map(e => [esc(e.n), f(e.t, 1), e.s === null ? 'przyjęto' : f(e.s, 1), f(e.fyt, 1), f(e.ratio, 2), e.r.err ? esc(e.r.err) : f(e.r.t, 0), e.r.err ? '<span class="fail">poza tablicą</span>' : e.t <= e.r.t ? '<span class="ok">OK</span>' : '<span class="fail">NIE</span>']));
    if (k.z) h += eq(`Klasa Z (rozdz. 3): Z<sub>Ed</sub> = Z<sub>a</sub> + Z<sub>b</sub> + Z<sub>c</sub> + Z<sub>d</sub> + Z<sub>e</sub> = ${k.z.Za} + ${k.z.Zb} + ${k.z.Zc} + ${k.z.Zd} + ${k.z.Ze} = ${k.z.ZEd} → ${esc(k.z.cls)}`, 'tabl. 3.1, 3.2');
  }

  // ---------------------------------------------------------- 12. wykonanie
  h += H2('Wymagania wykonawcze (PN-EN 1090-2)');
  h += `<p><b>Klasa wykonania: ${R.exc.exc}</b> – ${R.exc.why.map(esc).join('; ')}.</p>`;
  h += tbl(['Zakres', 'Wymaganie'], R.exc.req.map(r => [esc(r[0]), esc(r[1])]));
  if (S.wykonanie.uwagi) h += `<p>${esc(S.wykonanie.uwagi)}</p>`;
  h += '<p class="note">Wymagania należy przenieść do specyfikacji wykonania (PN-EN 1090-2, 4.1) i rysunków warsztatowych; tolerancje – zasadnicze wg zał. B oraz funkcjonalne wg klasy tolerancji ustalonej w specyfikacji.</p>';

  // ---------------------------------------------------------- 13. zestawienie
  h += H2('Zestawienie wyników');
  h += tbl(['Grupa', 'Sprawdzenie', 'Punkt normy', 'E<sub>d</sub>', 'R<sub>d</sub>', 'Wytężenie', 'Wynik'], R.checks.map(c => [esc(c.grp), esc(c.n), esc(c.ref || ''), c.unit === '-' && c.Rd === 1 ? '' : esc(V0(c.Ed, c.unit)), c.unit === '-' && c.Rd === 1 ? '' : esc(V0(c.Rd, c.unit)), ubT(c), stT(c)]));
  if (R.warnings.length) h += '<h3>Ostrzeżenia</h3>' + R.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('');
  if (R.info.length) h += R.info.map(w => `<p class="note">${esc(w)}</p>`).join('');
  h += `<div class="verdict ${vOk ? 'ok' : 'fail'}">${vOk ? 'Belka spełnia wymagania PN-EN w zakresie objętym obliczeniami.' : 'Belka NIE spełnia wszystkich wymagań – patrz pozycje oznaczone „NIE”.'}</div>`;

  // ---------------------------------------------------------- 14. ograniczenia
  h += H2('Założenia i ograniczenia modelu');
  h += `<ul><li>Belka pryzmatyczna o przekroju dwuteowym (walcowanym lub spawanym, bi- lub monosymetrycznym); obciążenia w płaszczyźnie środnika (z) i poziome (y) bez mimośrodu względem środka ścinania – skręcanie od mimośrodu obciążeń nie jest analizowane.</li><li>Analiza sprężysta I rzędu; imperfekcje elementu ujęte przez krzywe wyboczeniowe i zwichrzeniowe; odkształcalność postaciowa pominięta.</li><li>Zwichrzenie: α<sub>cr</sub> dla całej belki (bezpieczne przypisanie do segmentów); stężenia traktowane jako sztywne – ich nośność i sztywność należy sprawdzić odrębnie (PN-EN 1993-1-1, 5.3.3).</li><li>Połączenia: przegubowe (krótka blacha czołowa, blacha żebrowa) na reakcję pionową; połączenia momentowe – poza zakresem.</li><li>Pożar: metody uproszczone, rozkład temperatury równomierny; zmęczenie: obciążenia stacjonarne o stałej amplitudzie.</li><li>Wartości NDP oznaczone „do potwierdzenia z ZK” oraz oznaczenia dokumentów niezweryfikowane w katalogu PKN wymagają potwierdzenia przez projektanta.</li></ul>`;

  // ---------------------------------------------------------- 15. odtwarzalność
  h += H2('Odtwarzalność obliczeń');
  h += `<p>Program: ${BS.APP} ${BS.VERSION}; silnik: ${esc(BS.ENGINE)}; format danych: ${esc(BS.FORMAT)}; czas obliczeń: ${R.time} ms.</p>`;
  h += `<p>Suma kontrolna SHA-256 danych wejściowych (kanoniczny JSON – klucze sortowane): <span class="mono">${R.hash}</span></p>`;
  h += '<p class="note">Aby odtworzyć obliczenia: otwórz w programie plik projektu (.belkastal) lub plik HTML tego raportu (zawiera pełne dane); sprawdź zgodność sumy kontrolnej i wersji silnika. Ta sama wersja silnika i te same dane dają identyczne wyniki.</p>';
  h += `<h3>Załącznik A – dane wejściowe projektu (JSON)</h3><pre class="mono" style="white-space:pre-wrap;font-size:9px;line-height:1.25">${esc(JSON.stringify(S))}</pre>`;
  return h;
};
function V0(v, unit) { return BS.V ? BS.V.unitFmt(v, unit).replace(/<[^>]+>/g, '') : String(v); }

function patchTxt(p, title) {
  if (!p) return '';
  let h = `<p><b>${esc(title)}</b> – typ ${p.typ === 'c' ? 'c (przy końcu belki)' : 'a (siła przez pas, opór obu stron środnika)'}</p>`;
  h += eq(`m<sub>1</sub> = f<sub>yf</sub>b<sub>f</sub>/(f<sub>yw</sub>t<sub>w</sub>) = ${f(p.m1, 2)}; m<sub>2</sub> = ${f(p.m2, 2)}; k<sub>F</sub> = ${f(p.kF, 3)}; s<sub>s</sub> = ${f(p.ss, 0)} mm${p.typ === 'c' ? `, c = ${f(p.c, 0)} mm, l<sub>e</sub> = ${f(p.le, 1)} mm` : ''}; l<sub>y</sub> = ${f(p.ly, 1)} mm`, '6.3–6.5');
  h += eq(`F<sub>cr</sub> = 0,9·k<sub>F</sub>·E·t<sub>w</sub>³/h<sub>w</sub> = ${kN(p.Fcr)} kN; λ̄<sub>F</sub> = √(l<sub>y</sub>t<sub>w</sub>f<sub>yw</sub>/F<sub>cr</sub>) = ${f(p.lF, 3)}; χ<sub>F</sub> = 0,5/λ̄<sub>F</sub> ≤ 1 = ${f(p.chi, 3)}; L<sub>eff</sub> = ${f(p.Leff, 1)} mm`, '6.4');
  h += eq(`F<sub>Rd</sub> = f<sub>yw</sub>·L<sub>eff</sub>·t<sub>w</sub>/γ<sub>M1</sub> = ${kN(p.FRd)} kN; η<sub>2</sub> = F<sub>Ed</sub>/F<sub>Rd</sub> = ${kN(p.F)}/${kN(p.FRd)} = ${f(p.u, 3)} ${okS(p.u)}`, '6.1, 6.14');
  return h;
}

/* pełny, samodzielny dokument HTML raportu (z osadzonymi danymi) */
RP.document = function (S, R) {
  const css = (document.getElementById('appcss') || {}).textContent || '';
  const data = JSON.stringify(S).replace(/<\//g, '<\\/');
  return `<!doctype html><html lang="pl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc('Raport – ' + (S.meta.nazwa || 'belka'))}</title><meta name="generator" content="${esc(BS.APP + ' ' + BS.VERSION + '; ' + BS.ENGINE)}"><meta name="belkastal-sha256" content="${R.hash}"><style>${css}
html,body{height:auto;overflow:auto;background:#fff}body{padding:20px 16px}#report{border:0}@media print{body{padding:0}.rtools{display:none}}</style></head><body><div class="rtools"><button class="btn pri" onclick="window.print()">Drukuj / zapisz PDF</button><span class="hint" style="margin-left:10px">Plik zawiera dane projektu – można go otworzyć w programie ${BS.APP} (Otwórz).</span></div><div id="report">${RP.build(S, R)}</div><script type="application/json" id="belkastal-dane">${data}</script></body></html>`;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
