/* =====================================================================
   BelkaStal – raport obliczeń (jak w BelkaŻB): raport pełny (pełny tok
   obliczeń: wzór = podstawienie = wynik [punkt normy]), raport „Statyka”
   (dane, schemat, obciążenia, wykresy sił wewnętrznych, reakcje),
   fragmenty „jak obliczono” dla pojedynczych sprawdzeń, zestawienie
   materiałów.  Odtwarzalność: wersja programu i silnika, SHA-256
   kanonicznego JSON danych, dane projektu osadzone w pliku HTML.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, D = BS.D, N = BS.N, K = BS.K, S0 = BS.S, M = BS.M;
const RP = BS.Raport = {};
const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fm = (v, dp) => (BS.Q ? BS.Q.fmt(v, dp) : U.fmt(v, dp));
const f = (v, n) => fm(v, n === undefined ? 2 : n);
const kN = (v) => fm(v / 1e3, 2), kNm = (v) => fm(v / 1e6, 2);
const sym = (s) => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
// linia równania: lhs = wzór = podstawienie = wynik [jedn.] status [ref]
const eq = (lhs, fx, sub, val, unit, ref, stt) => {
  let s = `<div class="eq">${sym(lhs)}`;
  if (fx) s += ` = ${fx}`;
  if (sub) s += ` = ${sub}`;
  if (val !== undefined && val !== null && val !== '') s += ` = <b>${val}</b>`;
  if (unit) s += ` ${unit}`;
  if (stt) s += ` <span class="${stt[0]}">${stt[1]}</span>`;
  if (ref) s += `<span class="r">[${ref}]</span>`;
  return s + '</div>';
};
const line = (t, ref) => `<div class="eq">${t}${ref ? `<span class="r">[${esc(ref)}]</span>` : ''}</div>`;
const okS = (u) => (u === null || u === undefined ? '' : u <= 1 + 1e-9 ? ' <span class="ok">✔ warunek spełniony</span>' : ' <span class="fail">✖ warunek NIESPEŁNIONY</span>');
const kv = (pairs) => pairs.filter(q => q && q[1] !== '' && q[1] !== undefined && q[1] !== null).map(([k, v]) => `<div class="eq">${k}: ${v}</div>`).join('');
const tbl = (head, rows) => `<table class="rtab"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const mk = (id, html) => `<!--ck:${id}-->${html}<!--/ck:${id}-->`;
const WYS = { pas_g: 'pas górny', srodek: 'środek ścinania', pas_d: 'pas dolny' };
const SUPN = { przegub: 'przegubowa', utwierdzenie: 'utwierdzenie', sprezyna: 'sprężysta', podatne: 'przegub + sprężyna obrotowa' };
// wcięcia narożne żeber 45° – opis i szczegół (odpływ cynku, ominięcie promienia / spoiny pas–środnik)
function snipeTxt(S, R) {
  const sec = R.sec, z = (R.zebra || [])[0]; if (!z || !sec) return '';
  const g = BS.J.snipe(sec, (S.analiza || {}).zebraWc), c = z.c || 0, hw = sec.hw || (sec.h - sec.tg - sec.td);
  const t = c > 0
    ? `Wcięcia narożne żeber 45° c × c = ${f(c, 0)} × ${f(c, 0)} mm${g.isAuto ? ' (wymiar automatyczny)' : ''} przy obu pasach od strony środnika: odpływ cynku i odpowietrzenie podczas cynkowania zanurzeniowego (PN-EN ISO 14713-2), ominięcie ${sec.typ === 'spaw' ? `spoiny pas–środnik (√2·a = ${f(g.cMin, 1)} mm)` : `promienia wyokrąglenia r = ${f(g.cMin, 0)} mm`}. Długość spoin żebro–środnik l<sub>w</sub> = h<sub>w</sub> − 2c = ${f(hw - 2 * c, 0)} mm; docisk żebra do pasa na szerokości b<sub>s</sub> − c.`
    : 'Żebra bez wcięć narożnych (dopasowane do promienia / spoiny pas–środnik) – przy cynkowaniu zanurzeniowym wymagane wcięcia lub otwory odpływowe (PN-EN ISO 14713-2).';
  return `${line(t)}<div class="fig">${BS.D.stiffDetail(sec, { bs: z.bs, ts: z.ts, c, strona: z.strona, a: sec.aw })}</div>`;
}
const WEZN = { brak: 'oparcie na stali', oparcie: 'płyta podporowa', blacha_czolowa: 'krótka blacha czołowa', blacha_zebrowa: 'blacha żebrowa' };
const V0 = (v, unit) => (v === null || v === undefined || !isFinite(v)) ? '—' : unit === 'I' ? f(v / 1e4, 1) + ' cm⁴' : unit === 'MPa' ? f(v, 1) + ' MPa' : unit === 'M' ? f(v / 1e6) + ' kNm' : unit === 'F' ? f(v / 1e3) + ' kN' : unit === 'q' ? f(v, 1) + ' N/mm' : unit === 'mm' ? f(v, 1) + ' mm' : f(v, 3);
RP.unitFmt = V0;

/* ---------------------------------------------------------- dane wykresów (zakładka Wykresy i raport) */
RP.charts = function (S, R, s, W) {
  const md = R.md, an = R.an, ev = R.env[s], x = Array.from(an.xs).map(v => v / 1000), sup = md.systems[s].map(p => ({ x: p.x / 1000, l: p.id }));
  const arr = (a, k) => Array.from(a).map(v => (isFinite(v) ? v * k : 0));
  const mx = (y) => { let i = 0; y.forEach((v, j) => { if (v > y[i]) i = j; }); return i; }, mn = (y) => { let i = 0; y.forEach((v, j) => { if (v < y[i]) i = j; }); return i; };
  const marks = (y, c, dp) => { const a = mx(y), b = mn(y), o = []; if (Math.abs(y[a]) > 1e-6) o.push({ x: x[a], y: y[a], c, l: f(y[a], dp) }); if (b !== a && Math.abs(y[b]) > 1e-6) o.push({ x: x[b], y: y[b], c, l: f(y[b], dp) }); return o; };
  const out = {};
  const Mmax = arr(ev.Mmax, 1e-6), Mmin = arr(ev.Mmin, 1e-6), hseg = [];
  if (R.base) { hseg.push({ x0: 0, x1: md.L / 1000, y: R.base.Mc_pos / 1e6, c: '#1d7f3c', l: `M_c,Rd = ${f(R.base.Mc_pos / 1e6, 1)}` }); if (Math.min(...Mmin) < -1e-3) hseg.push({ x0: 0, x1: md.L / 1000, y: -R.base.Mc_neg / 1e6, c: '#1d7f3c', l: `−M_c,Rd` }); }
  const L2 = R.ltb && R.ltb[s]; if (L2) L2.segs.forEach(sg => { if (!sg.brak && sg.ltb && !sg.ltb.skip) hseg.push({ x0: sg.sg.x0 / 1000, x1: sg.sg.x1 / 1000, y: (sg.Mpos ? 1 : -1) * sg.Mb / 1e6, c: '#a35d00', l: `M_b,Rd = ${f(sg.Mb / 1e6, 1)}` }); });
  out.M = { W, H: 230, kind: 'M', short: 'M', title: `Momenty zginające M_Ed [kNm] – obwiednia SGN${md.nE > 1 ? `, etap ${s + 1}` : ''} (po stronie włókien rozciąganych)`, yl: 'M [kNm]', unit: 'kNm', dp: 1, invert: true, vl: sup, hseg, series: [{ x, y: Mmax, c: '#c0262d', l: 'M_Ed,max', fill: 'rgba(192,38,45,.10)' }, { x, y: Mmin, c: '#c0262d', l: '', dash: '', fill: 'rgba(192,38,45,.10)' }], marks: marks(Mmax, '#c0262d', 1).concat(marks(Mmin, '#c0262d', 1)).filter((q, i, a) => a.findIndex(z => Math.abs(z.x - q.x) < 1e-6 && Math.abs(z.y - q.y) < 1e-6) === i) };
  const Vmax = arr(ev.Vmax, 1e-3), Vmin = arr(ev.Vmin, 1e-3), Vr = R.base ? (R.sb && R.sb.need ? Math.min(R.base.Vpl, R.sb.Vb) : R.base.Vpl) / 1e3 : null;
  out.V = { W, H: 200, kind: 'V', short: 'V', title: 'Siły poprzeczne V_Ed [kN] – obwiednia SGN', yl: 'V [kN]', unit: 'kN', dp: 1, vl: sup, hl: Vr ? [{ y: Vr, c: '#1d7f3c', l: `V_Rd = ${f(Vr, 1)}` }, { y: -Vr, c: '#1d7f3c', l: '−V_Rd' }] : [], series: [{ x, y: Vmax, c: '#1d5bb8', l: 'V_Ed', fill: 'rgba(29,91,184,.10)' }, { x, y: Vmin, c: '#1d5bb8', l: '', fill: 'rgba(29,91,184,.10)' }], marks: marks(Vmax, '#1d5bb8', 1).concat(marks(Vmin, '#1d5bb8', 1)) };
  if (isFinite(ev.Nmax) && (Math.abs(ev.Nmax) > 1 || Math.abs(ev.Nmin) > 1)) out.N = { W, H: 150, kind: 'N', short: 'N', title: 'Siła podłużna N_Ed [kN] (+ rozciąganie)', yl: 'N [kN]', unit: 'kN', dp: 1, vl: sup, series: [{ x, y: x.map(() => ev.Nmax / 1e3), c: '#155e2c', l: 'N_Ed,max' }, { x, y: x.map(() => ev.Nmin / 1e3), c: '#155e2c', l: 'N_Ed,min', dash: '5 3' }] };
  const Mz = arr(ev.Mzmax, 1e-6), Mz2 = arr(ev.Mzmin, 1e-6);
  if (Math.max(...Mz.map(Math.abs), ...Mz2.map(Math.abs)) > 1e-3) out.Mz = { W, H: 170, kind: 'Mz', short: 'M_z', title: 'Momenty zginające M_z,Ed [kNm] (obciążenia poziome)', yl: 'M_z [kNm]', unit: 'kNm', dp: 2, invert: true, vl: sup, series: [{ x, y: Mz, c: '#6a3fb5', l: 'M_z,Ed', fill: 'rgba(106,63,181,.10)' }, { x, y: Mz2, c: '#6a3fb5', l: '', fill: 'rgba(106,63,181,.10)' }] };
  const w = arr(ev.wmax, 1), w2 = arr(ev.wmin, 1), hs = [];
  if (s === md.nE - 1 && R.sgu) R.sgu.seg.forEach(q => hs.push({ x0: q.sg.x0 / 1000, x1: q.sg.x1 / 1000, y: q.limMax, c: '#a35d00', l: `${q.sg.wsp ? '2L' : 'L'}/${S.sgu.wmax} = ${f(q.limMax, 1)}` }));
  out.w = { W, H: 190, kind: 'w', short: 'w', title: `Ugięcia w [mm] – kombinacje charakterystyczne${md.nE > 1 ? `, etap ${s + 1}` : ''} (bez podniesienia wykonawczego)`, yl: 'w [mm]', unit: 'mm', dp: 1, invert: true, vl: sup, hseg: hs, series: [{ x, y: w, c: '#1d7f3c', l: 'w_max', fill: 'rgba(29,127,60,.10)' }, { x, y: w2, c: '#1d7f3c', l: 'w_min', dash: '4 3' }], marks: marks(w, '#1d7f3c', 1) };
  return out;
};

/* ---------------------------------------------------------- zestawienie materiałów */
RP.takeoff = function (S, R) {
  const md = R.md, sec = R.sec, rows = [];
  if (!md || !sec) return { rows, total: 0 };
  const rho = 7.85e-6; // kg/mm³
  const Lb = md.L; rows.push({ poz: 1, n: `Belka ${sec.nazwa}`, mat: `${S.material.gatunek}${S.material.podgatunek}`, szt: 1, wym: `L = ${f(Lb, 0)} mm`, m: sec.masa * Lb / 1000 });
  let poz = 2; const bolts = {}; let weld = 0;
  const addB = (o) => { if (!o || !o.B || !o.nb) return; const k = `${o.B.d} kl. ${o.B.cl}${o.B.pre ? ' HV' : ''}`; bolts[k] = (bolts[k] || 0) + o.nb; };
  md.sup.forEach((p, i) => {
    const w = (S.podpory[i] || {}).wezel || {}, rp = (R.podpory || []).find(q => q.id === p.id) || {}, o = rp.pol;
    if (o && w.typ === 'blacha_czolowa') rows.push({ poz: poz++, n: `Blacha czołowa – podpora ${p.id}`, mat: o.pl.gat, szt: 1, wym: `${f(U.num(w.tp), 0)}×${f(U.num(w.bp), 0)}×${f(U.num(w.hp), 0)}`, m: o.mass });
    else if (o && w.typ === 'blacha_zebrowa') rows.push({ poz: poz++, n: `Blacha żebrowa – podpora ${p.id}`, mat: o.pl.gat, szt: 1, wym: `${f(U.num(w.tp), 0)}×${f(o.geom.z + (o.geom.nc - 1) * o.geom.p2 + o.geom.e2, 0)}×${f(U.num(w.hp), 0)}`, m: o.mass });
    else if (o && w.typ === 'katowniki') rows.push({ poz: poz++, n: `Kątowniki – podpora ${p.id}`, mat: o.pl.gat, szt: 2, wym: `L${String(w.L).replace(/x/g, '×')}, l = ${f(U.num(w.hp), 0)}`, m: o.mass });
    else if (w.typ === 'oparcie' && w.podloze !== 'stal') rows.push({ poz: poz++, n: `Płyta podporowa – podpora ${p.id}`, mat: S.material.gatunek, szt: 1, wym: `${f(U.num(w.tp), 0)}×${f(U.num(w.bp), 0)}×${f(U.num(w.lp), 0)}`, m: rho * U.num(w.tp) * U.num(w.bp) * U.num(w.lp) });
    if (o) { addB(o); weld += o.weldL || 0; }
    if (w.zebro && (sec.kind === 'I' || sec.kind === 'U')) { const hs = sec.hw || (sec.h - sec.tg - sec.td), c = BS.J.snipeSup(S, sec, w).c, nP = sec.kind === 'U' ? 1 : 2; rows.push({ poz: poz++, n: `Żebra podporowe – podpora ${p.id}`, mat: S.material.gatunek, szt: nP, wym: `${f(U.num(w.ts), 0)}×${f(U.num(w.bs), 0)}×${f(hs, 0)}${c > 0 ? `, wcięcia 45° ${f(c, 0)}×${f(c, 0)}` : ''}`, m: nP * rho * U.num(w.ts) * (U.num(w.bs) * hs - c * c) }); weld += 2 * nP * Math.max(0, hs - 2 * c); }
  });
  (R.styki || []).forEach((q, j) => { const o = q.o, s2 = S.styki[j] || {}; if (!o) return; if (o.geom && o.typ === 'nakladkowy') { const g = o.geom; rows.push({ poz: poz++, n: `Styk ${q.id} – nakładki pasów`, mat: (o.plf || {}).gat || S.material.gatunek, szt: g.tfi > 0 ? 6 : 2, wym: `${f(g.bfo, 0)}×${f(g.tfo, 0)}${g.tfi > 0 ? ` + 4×${f(g.bfi, 0)}×${f(g.tfi, 0)}` : ''}, l = ${f(g.Lf, 0)}`, m: 7.85e-6 * 2 * (g.bfo * g.tfo + (g.tfi > 0 ? 2 * g.bfi * g.tfi : 0)) * g.Lf }); rows.push({ poz: poz++, n: `Styk ${q.id} – nakładki środnika`, mat: (o.plw || {}).gat || S.material.gatunek, szt: 2, wym: `${f(g.hpw, 0)}×${f(g.tpw, 0)}, l = ${f(g.Lw, 0)}`, m: 7.85e-6 * 2 * g.hpw * g.tpw * g.Lw }); addB(o); } else if (s2.typ === 'spawany') weld += 2 * (sec.bg || sec.b || 0) + sec.h; });
  const zg = {}; (R.zebra || []).forEach(z => { const nS = z.strona === 'jedna' ? 1 : 2, c = z.c || 0, k = `${f(z.ts, 0)}×${f(z.bs, 0)}|${f(c, 0)}`; zg[k] = zg[k] || { n: 0, ts: z.ts, bs: z.bs, c }; zg[k].n += nS; });
  const hsz = sec.hw || sec.h; Object.keys(zg).forEach(k => { const q = zg[k]; rows.push({ poz: poz++, n: 'Żebra poprzeczne środnika', mat: S.material.gatunek, szt: q.n, wym: `${f(q.ts, 0)}×${f(q.bs, 0)}×${f(hsz, 0)}${q.c > 0 ? `, wcięcia 45° ${f(q.c, 0)}×${f(q.c, 0)}` : ''}`, m: q.n * rho * q.ts * (q.bs * hsz - q.c * q.c) }); weld += 2 * q.n * Math.max(0, hsz - 2 * q.c); });
  const tot = rows.reduce((q, r) => q + r.m, 0);
  return { rows, total: tot, bolts, weld, surf: (sec.AmV ? null : null), area: R.pozar && R.pozar.sf ? null : null };
};

/* ---------------------------------------------------------- raport pełny */
RP.build = function (S, R, opt) {
  opt = opt || {};
  const md = R.md, sec = R.sec, b = R.base, mat = R.mat, ndp = R.ndp, an = R.an;
  const nE = md.nE;
  let h = '', sn = 0; const H2 = (t) => `<h2>${++sn}. ${t}</h2>`;
  const vOk = !R.nFail && !R.errors.length;
  // ---------------------------------------------------------- nagłówek
  h += `<h1>Obliczenia statyczno-wytrzymałościowe belki stalowej – ${esc(S.meta.nazwa)}</h1>`;
  const meta = [['Obiekt', esc(S.meta.obiekt)], ['Projektant', esc(S.meta.projektant) + (S.meta.nrUprawnien ? ', upr. ' + esc(S.meta.nrUprawnien) : '')], ['Sprawdzający', esc(S.meta.sprawdzajacy)], ['Data', esc(S.meta.data)]].filter(q => q[1]);
  if (meta.length) h += kv(meta);
  // ---------------------------------------------------------- 1. dane wejściowe
  h += H2('Dane wejściowe');
  const sch = (BS.J.SCHEMATY.find(q => q.id === S.schemat) || {}).n;
  h += kv([
    ['Schemat statyczny', `${esc(sch || 'belka ' + (md.spans.length > 1 ? 'ciągła' : 'jednoprzęsłowa'))}${md.spans.length ? ` – ${md.spans.length} przęs${md.spans.length === 1 ? 'ło' : md.spans.length < 5 ? 'ła' : 'eł'}` : ''}${md.wL ? ', wspornik lewy' : ''}${md.wP ? ', wspornik prawy' : ''}`],
    ['Rozpiętości', md.seg.map(q => `${esc(q.n)} ${f((q.x1 - q.x0) / 1000)} m`).join('; ') + `; długość belki L = ${f(md.L / 1000)} m`],
    ['Przekrój', `${esc(sec.nazwa)} (${esc(BS.P.RODZAJE[S.przekroj.typ].n)})`],
    ['Stal', `${esc(mat.gatunek)}${esc(mat.podgatunek)} wg ${esc((M.STAL[mat.gatunek] || {}).norma)}`],
    ['Podpory', md.sup.map((p, i) => `${p.id} (x = ${f(p.x / 1000)} m): ${SUPN[p.typ] || p.typ}${p.przesuwna ? ' przesuwna' : ''}, ${p.ltb === 'pelne' ? 'utwierdzenie dla zwichrzenia' : 'podparcie widełkowe'}, ${esc(BS.J.jointTxt((S.podpory[i] || {}).wezel || {}, sec))}`).join('; ') + (md.tmp.length ? `; montażowe: ${md.tmp.map(t => `${t.id} x = ${f(t.x / 1000)} m (usuwana po etapie ${t.do + 1})`).join(', ')}` : '')],
    ['Etapy', nE > 1 ? md.etapy.map((e, s) => `${s + 1}. ${esc(e.nazwa)} (${e.typ === 'montaz' ? 'sytuacja przejściowa' : 'sytuacja trwała'})`).join('; ') : 'jeden etap – eksploatacja (sytuacja trwała)'],
    ['Stężenia boczne', (md.stez.length ? md.stez.map(z => `${z.typ} x = ${f(z.x / 1000)} m (${WYS[z.wys]}${nE > 1 ? `, od etapu ${z.od + 1}` : ''})`).join('; ') : 'brak stężeń dyskretnych') + (md.ciagle.pasG ? `; pas górny stężony ciągle${nE > 1 ? ` od etapu ${U.num(md.ciagle.odEtapu) + 1}` : ''}` : '') + (md.ciagle.pasD ? '; pas dolny stężony ciągle' : '')],
    ['Ugięcia graniczne', `w<sub>max</sub> ≤ L/${esc(String(S.sgu.wmax))}, w<sub>3</sub> ≤ L/${esc(String(S.sgu.w3))}${S.sgu.podniesienie !== 'brak' ? `, podniesienie wykonawcze ${S.sgu.podniesienie === 'auto' ? 'równe ugięciu od G' : f(U.num(S.sgu.wc), 0) + ' mm'}` : ''}`],
    ['Klasa konsekwencji / wykonania', `${esc(S.wykonanie.CC)} / ${R.exc ? R.exc.exc : '—'}`],
    ['Podstawa normowa', `Eurokody ${R.norm.genStosowana}. generacji z polskimi załącznikami krajowymi (PN-EN 1990, PN-EN 1991, PN-EN 1993-1-1, -1-5, -1-8${S.pozar.aktywny ? ', -1-2' : ''}${S.zmeczenie.aktywny ? ', -1-9' : ''}, -1-10; PN-EN 1090-2)`]
  ]);
  if (S.meta.opis) h += `<p class="note">${esc(S.meta.opis)}</p>`;
  // ---------------------------------------------------------- 2. podstawa normowa
  const no = R.norm;
  h += H2('Podstawa normowa');
  h += no.dokumenty.map(d => line(`<b>${esc(d.oznaczenie)}</b> – ${esc(d.tytul)}${d.zmiany.length ? `; zmiany: ${esc(d.zmiany.join(', '))}` : ''}${d.poprawki.length ? `; poprawki: ${esc(d.poprawki.join(', '))}` : ''}${d.zk ? `; ZK: ${esc(d.zk)}` : ''} – ${esc(d.zakres)}`)).join('');
  h += line('Normy wyrobów i wykonania: ' + N.WYROBY.map(w => esc(w.oznaczenie)).join('; '));
  h += line(`Parametry krajowe (NDP): γ<sub>M0</sub> = ${f(ndp.gM0)}, γ<sub>M1</sub> = ${f(ndp.gM1)}, γ<sub>M2</sub> = ${f(ndp.gM2)}, γ<sub>G,sup</sub> = ${f(ndp.gG_sup)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf)}, γ<sub>Q</sub> = ${f(ndp.gQ)}, ξ = ${f(ndp.xi)}, K<sub>FI</sub> = ${f(ndp.KFI)}, η = ${f(ndp.eta)}, λ̄<sub>LT,0</sub> = ${f(ndp.lamLT0)}, β = ${f(ndp.betaLT)}${no.ndpZmienione.length ? ` (zmienione względem ZK: ${esc(no.ndpZmienione.join(', '))})` : ''}`);
  h += `<p class="note">Zestaw dokumentów wg stanu wiedzy programu na ${esc(N.STAN_WIEDZY.data)}. ${esc(no.decyzja || '')}</p>`;
  // ---------------------------------------------------------- 3. materiał i przekrój
  h += H2('Parametry materiałowe i przekrój');
  h += line(`Stal ${esc(mat.gatunek)}${esc(mat.podgatunek)}: t<sub>max</sub> = ${f(mat.tMax, 1)} mm → f<sub>y</sub> = ${mat.fy} MPa, f<sub>u</sub> = ${mat.fu} MPa (${esc(mat.zr)}); E = 210 000 MPa, G = 81 000 MPa, ν = 0,3; ciężar 78,5 kN/m³`, 'tabl. 3.1');
  h += eq('ε', '√(235/f_{y})', `√(235/${mat.fy})`, f(b.eps, 3), '', '');
  h += `<div class="fig">${D.section(sec, { size: 240, eff: b.effNeg || b.effPos })}</div>`;
  const dimTxt = sec.kind === 'I' ? `h = ${f(sec.h, 1)} mm, b<sub>g</sub> × t<sub>g</sub> = ${f(sec.bg, 0)} × ${f(sec.tg, 1)} mm, b<sub>d</sub> × t<sub>d</sub> = ${f(sec.bd, 0)} × ${f(sec.td, 1)} mm, t<sub>w</sub> = ${f(sec.tw, 1)} mm${sec.r ? `, r = ${f(sec.r, 0)} mm` : ''}${sec.aw ? `, spoiny pas–środnik a = ${f(sec.aw, 1)} mm` : ''}`
    : sec.kind === 'U' ? `h = ${f(sec.h, 1)} mm, b = ${f(sec.b, 0)} mm, t<sub>w</sub> = ${f(sec.tw, 1)} mm, t<sub>f</sub> = ${f(sec.tg, 1)} mm${sec.r ? `, r = ${f(sec.r, 1)} mm` : ''}; środek ścinania e<sub>S</sub> = ${f(sec.eSC, 1)} mm od środnika`
    : sec.kind === 'L' ? `h × b × t = ${f(sec.h, 0)} × ${f(sec.b, 0)} × ${f(sec.t, 1)} mm${sec.r ? `, r = ${f(sec.r, 1)} mm` : ''}; ramię poziome ${sec.poz === 'gora' ? 'u góry' : 'u dołu'}; osie główne: α = ${f(sec.alfa * 180 / Math.PI, 1)}°, I<sub>u</sub> = ${f(sec.Iu / 1e4, 1)} cm⁴, I<sub>v</sub> = ${f(sec.Iv / 1e4, 1)} cm⁴`
    : `h × b × t = ${f(sec.h, 0)} × ${f(sec.b, 0)} × ${f(sec.t, 1)} mm, promienie naroży r<sub>o</sub> = ${f(sec.ro, 1)} / r<sub>i</sub> = ${f(sec.ri, 1)} mm`;
  h += line(`${esc(sec.nazwa)}: ${dimTxt}`);
  h += line(`A = ${f(sec.A / 100)} cm², I<sub>y</sub> = ${f(sec.Iy / 1e4, 0)} cm⁴, I<sub>z</sub> = ${f(sec.Iz / 1e4, 1)} cm⁴, W<sub>el,y</sub> = ${f(sec.Wel_t / 1e3, 1)} / ${f(sec.Wel_b / 1e3, 1)} cm³ (góra / dół), W<sub>pl,y</sub> = ${f(sec.Wpl_y / 1e3, 1)} cm³, W<sub>el,z</sub> = ${f(sec.Wel_z / 1e3, 1)} cm³, W<sub>pl,z</sub> = ${f(sec.Wpl_z / 1e3, 1)} cm³, I<sub>t</sub> = ${f(sec.It / 1e4)} cm⁴, I<sub>w</sub> = ${f(sec.Iw / 1e9, 2)}·10³ cm⁶${Math.abs(sec.z0 || 0) > 0.5 ? `, z<sub>s</sub> − z<sub>c</sub> = ${f(sec.z0, 1)} mm, β<sub>z</sub> = ${f(sec.betaZ, 1)} mm` : ''}; masa ${f(sec.masa, 1)} kg/m (g<sub>k</sub> = ${f(sec.gk, 3)} kN/m)`);
  (sec.uwagi || []).forEach(t => { h += `<p class="note">${esc(t)}</p>`; });
  const cl = (k, t) => line(`<b>${t}</b> – klasa ${k.cls}: ${k.all.map(p => `${esc(p.n)}: c/t = ${f(p.c, 1)}/${f(p.t, 1)} = ${f(p.ct, 2)}${p.tension ? ' (rozciągana)' : ` → kl. ${p.cls} (granice ${p.lim.map(l => isFinite(l) ? f(l, 1) : '—').join(' / ')})`}`).join('; ')}`, 'tabl. 5.2');
  h += '<h3>Klasyfikacja przekroju</h3>' + cl(b.kPos, 'Zginanie M > 0') + cl(b.kNeg, 'Zginanie M < 0') + cl(b.kN, 'Ściskanie');
  [['effPos', 'M > 0'], ['effNeg', 'M < 0'], ['effN', 'ściskanie']].forEach(([k, t]) => { const e = b[k]; if (!e) return; h += line(`Przekrój efektywny (${t}): ${e.info.map(i => `${esc(i.el)}: λ̄<sub>p</sub> = ${f(i.lp, 3)}, k<sub>σ</sub> = ${f(i.kS, 2)}${i.psi !== undefined ? `, ψ = ${f(i.psi, 3)}` : ''}, ρ = ${f(i.rho, 3)}`).join('; ')} → A<sub>eff</sub> = ${f(e.A / 100)} cm²${e.Weff ? `, W<sub>eff,min</sub> = ${f(e.Weff / 1e3, 1)} cm³` : ''}`, 'PN-EN 1993-1-5, 4.4'); });
  h += eq('M_{c,Rd}', 'W_{y}·f_{y}/γ_{M0}', `${f(b.Wy_pos / 1e3, 1)}·10³·${mat.fy}/${f(ndp.gM0)}`, kNm(b.Mc_pos), 'kNm', '6.13–6.15') + (Math.abs(b.Mc_neg - b.Mc_pos) > 1 ? eq('M_{c,Rd}^{−}', '', '', kNm(b.Mc_neg), 'kNm') : '');
  h += eq('A_{v}', '', '', f(b.Av / 100), 'cm²', '6.2.6(3)') + eq('V_{pl,Rd}', 'A_{v}·f_{y}/(√3·γ_{M0})', `${f(b.Av, 0)}·${mat.fy}/(√3·${f(ndp.gM0)})`, kN(b.Vpl), 'kN', '6.18');
  h += eq('N_{pl,Rd}', 'A·f_{y}/γ_{M0}', '', kN(b.Npl), 'kN', '6.6');
  // ---------------------------------------------------------- 4. schemat i obciążenia
  h += staticPart(S, R, H2, true);
  // ---------------------------------------------------------- 5. nośność przekroju
  h += H2('SGN – nośność przekroju (PN-EN 1993-1-1, 6.2)');
  for (let s = 0; s < nE; s++) {
    const cs = R.checks.filter(c => c.etap === s && c.grp.startsWith('SGN – nośność'));
    if (!cs.length) continue;
    if (nE > 1) h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    cs.forEach(c => { h += mk(c.id, checkSec(c, R)); });
  }
  // ---------------------------------------------------------- 6. środnik
  const sb = R.sb;
  if (sec.kind === 'I' || sec.kind === 'U' || sec.kind === 'RHS') {
    h += H2('Środnik – PN-EN 1993-1-5');
    h += line(`h<sub>w</sub>/t<sub>w</sub> = ${f(sec.hw, 1)}/${f(sec.tw || sec.t, 1)} = ${f(sb.ht, 1)} ${sb.need ? '>' : '≤'} ${sb.a === Infinity ? '72ε/η' : '31ε√k<sub>τ</sub>/η'} = ${f(sb.limit, 1)} → ${sb.need ? 'wymagane sprawdzenie wyboczenia przy ścinaniu' : 'wyboczenie przy ścinaniu nie występuje'}`, '5.1(2)');
    if (sb.need) h += eq('λ̄_{w}', sb.a === Infinity ? 'h_{w}/(86,4·t·ε)' : `h_{w}/(37,4·t·ε·√k_{τ}), k_{τ} = ${f(sb.kt, 3)}`, '', f(sb.lw, 3), '', '5.3') + eq('χ_{w}', '', `${sb.rigid ? 'sztywny' : 'niesztywny'} słupek podporowy`, f(sb.chi, 3), '', 'tabl. 5.1') + eq('V_{b,Rd}', 'χ_{w}·f_{yw}·h_{w}·t/(√3·γ_{M1})', '', kN(sb.Vb), 'kN', '5.2');
    R.checks.filter(c => c.grp.startsWith('PN-EN 1993-1-5')).forEach(c => {
      let t = '';
      if (/^pt\d+$/.test(c.id)) t = patchTxt(c.d, c.n);
      else if (/-MV$/.test(c.id)) t = line(`<b>${esc(c.n)}</b> (x = ${f(c.x / 1000)} m): η̄<sub>1</sub> = M<sub>Ed</sub>/M<sub>pl,Rd</sub> = ${f(c.d.im.e1, 3)}, η̄<sub>3</sub> = V<sub>Ed</sub>/V<sub>bw,Rd</sub> = ${f(c.d.im.e3, 3)}; ${esc(c.d.im.f)} → ${f(c.util, 3)}${okS(c.util)}`, '7.1');
      else if (/-Vb$/.test(c.id)) t = line(`<b>${esc(c.n)}</b> (x = ${f(c.x / 1000)} m; ${esc(c.combo)}): V<sub>Ed</sub>/V<sub>b,Rd</sub> = ${kN(c.Ed)}/${kN(c.Rd)} = ${f(c.util, 3)}${okS(c.util)}`, '5.2');
      else if (/^ZS\d/.test(c.id)) t = line(`<b>${esc(c.n)}</b>${c.f ? `: ${esc(c.f)}` : ''} → ${f(c.util, 3)} ≤ 1,0${okS(c.util)}`, c.ref);
      else t = line(`<b>${esc(c.n)}</b>: ${f(c.d.eta2, 3)} + 0,8·${f(c.d.eta1, 3)} = ${f(c.Ed, 3)} ≤ 1,4${okS(c.util)}`, '7.2');
      h += mk(c.id, t);
    });
    if ((R.zebra || []).length) h += '<h3>Żebra poprzeczne środnika i panele</h3>' + line(`Żebra: ${R.zebra.map(z => `x = ${f(z.x / 1000)} m (${z.strona === 'jedna' ? 'jednostronne' : 'obustronne'} ${f(z.bs, 0)}×${f(z.ts, 0)} mm)`).join('; ')}`) + snipeTxt(S, R) + (R.panels || []).map(q => line(`Panel ${f(q.x0 / 1000)}–${f(q.x1 / 1000)} m: a = ${isFinite(q.a) ? f(q.a, 0) + ' mm' : '∞'}, k<sub>τ</sub> = ${f(q.sb.kt, 3)}, λ̄<sub>w</sub> = ${f(q.sb.lw, 3)}, χ<sub>w</sub> = ${f(q.sb.chi, 3)}, V<sub>b,Rd</sub> = ${kN(q.sb.Vb)} kN`, '5.2, 5.3')).join('');
  }
  // ---------------------------------------------------------- 7. stateczność
  h += H2('SGN – stateczność: zwichrzenie i interakcja (PN-EN 1993-1-1, 6.3)');
  if (sec.kind === 'L') h += `<p class="note">Kątownik – element przyjęty jako stężony bocznie na całej długości (zwichrzenie wykluczone konstrukcyjnie); stężenie należy zapewnić.</p>`;
  else h += `<p>Sprężysty moment krytyczny M<sub>cr</sub> wyznaczono metodą elementów skończonych (u, u′, φ, φ′) z równania K<sub>E</sub>·x = α<sub>cr</sub>·K<sub>G</sub>·x dla rozkładu M<sub>y</sub>(x) każdej decydującej kombinacji, z wysokością przyłożenia obciążeń względem środka ścinania${Math.abs(sec.betaZ || 0) > 0.5 ? ', członem monosymetrii β<sub>z</sub>' : ''}, warunkami podparcia (widełkowe / pełne) i stężeniami. M<sub>cr,seg</sub> = α<sub>cr</sub>·|M<sub>Ed,max,seg</sub>|.</p>`;
  (R.ltb || []).forEach((L, s) => {
    if (!L) return;
    if (nE > 1) h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    h += line('Mnożniki krytyczne: ' + L.runs.map(r => `${esc(r.combo.opis)}: α<sub>cr</sub> = ${r.err ? esc(r.err) : r.lam === Infinity ? '∞' : f(r.lam, 3)}`).join('; '));
    L.segs.forEach((g, k) => { if (g.brak) return; h += mk(`${s}-LT${k}`, ltbTxt(g, mat, ndp)); });
    const gov = L.runs.filter(r => r.mode).sort((a, b2) => a.lam - b2.lam)[0];
    if (gov && gov.lam <= 100) h += `<div class="fig">${D.mode(gov.mode, md.L, md.systems[s].map(p => p.x), { width: 900, title: `Postać zwichrzenia${nE > 1 ? `, etap ${s + 1}` : ''}: α_cr = ${f(gov.lam, 3)}` })}</div>`;
    L.inter.forEach((it, k) => { h += mk(`${s}-I${k}`, interTxt(it)); });
  });
  // ---------------------------------------------------------- 8. SGU
  h += H2('SGU – ugięcia i drgania');
  const sg = R.sgu;
  h += `<p>Kryteria: w<sub>max</sub> ≤ L/${esc(String(S.sgu.wmax))}, w<sub>3</sub> ≤ L/${esc(String(S.sgu.w3))} (wspornik: L = 2·L<sub>w</sub>); ugięcia względem cięciwy podpór przęsła, kombinacje charakterystyczne z historią etapów. Podniesienie wykonawcze: ${S.sgu.podniesienie === 'brak' ? 'brak' : S.sgu.podniesienie === 'auto' ? `równe ugięciu od G (w<sub>c,max</sub> = ${f(sg.wcMax, 1)} mm)` : `w<sub>c</sub> = ${f(U.num(S.sgu.wc), 1)} mm`}.</p>`;
  sg.seg.forEach((r) => { h += mk(`w-${r.sg.id}`, line(`${esc(r.sg.n)}: w<sub>max</sub> = ${f(Math.max(0, r.wmax), 1)} mm ≤ ${r.sg.wsp ? '2L' : 'L'}/${S.sgu.wmax} = ${f(r.limMax, 1)} mm${okS(r.wmax / r.limMax)}; w<sub>3</sub> = ${f(Math.max(0, r.w3), 1)} mm ≤ ${f(r.lim3, 1)} mm${okS(r.w3 / r.lim3)}`, 'PN-EN 1990 A1.4.3')); });
  (sg.montaz || []).forEach(q => { h += line(`Etap ${q.etap + 1} (${esc(md.etapy[q.etap].nazwa)}): ugięcie charakterystyczne w = ${f(q.w, 1)} mm (x = ${f(q.x / 1000)} m) – informacyjnie`); });
  if (sg.f1) h += mk('f1', eq('f_{1}', 'MES, masa z G + Σψ_{2}·Q', '', f(sg.f1, 2), 'Hz', 'PN-EN 1990 A1.4.4', [sg.f1 >= U.num(S.sgu.fmin, 3) ? 'ok' : 'fail', `${sg.f1 >= U.num(S.sgu.fmin, 3) ? '≥' : '<'} f<sub>min</sub> = ${f(U.num(S.sgu.fmin, 3), 1)} Hz`]));
  // ---------------------------------------------------------- 9. podpory
  h += H2('Podpory, oparcia i połączenia (PN-EN 1993-1-5, PN-EN 1993-1-8)');
  (R.podpory || []).forEach(p => {
    h += `<h3>Podpora ${esc(p.id)}${p.tymcz ? ' (montażowa)' : ''} – x = ${f(p.x / 1000)} m</h3>`;
    if (!p.tymcz && sec.kind !== 'L' && !p.pol) h += `<div class="fig">${D.joint(sec, p.wezel || {}, { W: 360, H: 250 })}</div>`;
    h += line(`R<sub>Ed,max</sub> = <b>${kN(p.Rmax)} kN</b>${p.Mmax > 1e3 ? `; |M<sub>Ed</sub>| = ${kNm(p.Mmax)} kNm` : ''}; reakcje charakterystyczne (etap ${p.eK + 1}): ${p.Rk.map(r => `${esc(r.id)}: ${kN(r.R)} kN`).join(', ')}`);
    p.equ.forEach(e => { h += mk(`${p.id}-EQU`, line(`EQU, etap ${e.etap + 1}: R<sub>min</sub> = ${kN(e.Rmin)} kN ${e.Rmin < 0 ? '<span class="fail">– odrywanie: wymagane zakotwienie</span>' : '– docisk zapewniony'}`, 'PN-EN 1990 tabl. A1.2(A)')); });
    if (p.patch) h += mk(`${p.id}-PL`, patchTxt(p.patch, `Docisk środnika nad podporą ${p.id}`));
    if (p.zebro) { const z = p.zebro; h += mk(`${p.id}-ZB`, line(`Żebra podporowe ${f(z.bs, 0)} × ${f(z.ts, 0)} mm + pasmo środnika 15εt<sub>w</sub>: A<sub>s</sub> = ${f(z.As / 100)} cm², I<sub>s</sub> = ${f(z.Is / 1e4, 1)} cm⁴, i = ${f(z.i, 1)} mm, l = ${f(z.Lcr, 0)} mm, λ̄ = ${f(z.lam, 3)}, krzywa c: χ = ${f(z.chi, 3)}; N<sub>b,Rd</sub> = ${kN(z.NbRd)} kN ≥ R<sub>Ed</sub> = ${kN(z.F)} kN${okS(z.uB)}`, 'PN-EN 1993-1-5 9.4')) + mk(`${p.id}-ZD`, line(`Docisk końców żeber: A<sub>c</sub> = ${z.nS || 2}·(b<sub>s</sub> − c)·t<sub>s</sub> = ${z.nS || 2}·(${f(z.bs, 0)} − ${f(z.c || 0, 0)})·${f(z.ts, 0)} = ${f(z.Acont, 0)} mm² (c – wcięcie narożne 45° przy pasie), F<sub>Rd</sub> = A<sub>c</sub>·f<sub>y</sub>/γ<sub>M0</sub> = ${kN(z.Fbear)} kN${okS(z.uC)}`, '6.2.4')); }
    if (p.plyta) p.plyta.checks.forEach((c, k) => { h += mk(`${p.id}-B${k}`, line(`${esc(c.n)}: ${esc(c.f || '')}; F<sub>Rd</sub> = ${kN(c.Rd)} kN ≥ R<sub>Ed</sub> = ${kN(c.Ed)} kN${okS(c.u)}`, c.ref)); });
    if (p.pol) h += jointBody(S, R, p.pol, p.F, p.wezel, p.id);
  });
  // ---------------------------------------------------------- styki
  if ((R.styki || []).length) {
    h += H2('Styki montażowe belki (PN-EN 1993-1-8)');
    R.styki.forEach((q, j) => { h += `<h3>Styk ${q.id} – x = ${f(q.x / 1000)} m – ${esc(BS.W.STYKI[(S.styki[j] || {}).typ] || '')}</h3>`; if (q.o) h += spliceBody(S, R, q.o, q.F, S.styki[j], q.id); });
  }
  // ---------------------------------------------------------- pożar, zmęczenie, kruche pękanie
  if (R.pozar && R.pozar.hist) {
    const fr = R.pozar;
    h += H2('Nośność w warunkach pożaru (PN-EN 1993-1-2)');
    h += `<p>Wymagana odporność R${fr.Rreq}; pożar standardowy ISO 834 (PN-EN 1991-1-2); nagrzewanie ${S.pozar.ekspozycja === '3' ? 'z 3 stron' : 'z 4 stron'}; ${fr.prot ? `zabezpieczenie ${S.pozar.ochrona === 'plyty' ? 'skrzynkowe' : 'konturowe'}: λ<sub>p</sub> = ${esc(String(S.pozar.lp))} W/mK, d<sub>p</sub> = ${esc(String(S.pozar.dp))} mm, c<sub>p</sub> = ${esc(String(S.pozar.cp))} J/kgK, ρ<sub>p</sub> = ${esc(String(S.pozar.rp))} kg/m³` : 'bez zabezpieczenia'}; kombinacja: ${esc(fr.combo.opis)}.</p>`;
    h += line(`A<sub>m</sub>/V = ${f(fr.sf.AmV, 0)} m⁻¹, [A<sub>m</sub>/V]<sub>b</sub> = ${f(fr.sf.AmVb, 0)} m⁻¹${fr.prot ? `, A<sub>p</sub>/V = ${f(fr.sf.ApV, 0)} m⁻¹` : `, k<sub>sh</sub> = ${f(fr.ksh, 3)}`}`, '4.2.5');
    h += line(`M<sub>fi,Ed</sub> = ${kNm(Math.abs(fr.Efi.M))} kNm, V<sub>fi,Ed</sub> = ${kN(fr.Efi.V)} kN; κ<sub>1</sub> = ${f(fr.kap.k1, 2)}, κ<sub>2</sub> = ${f(fr.kap.k2, 2)}; μ<sub>0</sub> = ${f(fr.mu0, 3)}`, '4.2.3.3');
    h += line(fr.cls4 ? 'Przekrój klasy 4 – θ<sub>crit</sub> = 350 °C (zał. E)' : `θ<sub>a,cr</sub> = <b>${f(fr.thcr, 0)} °C</b> (z warunków nośności przy zginaniu, zwichrzeniu i ścinaniu w temperaturze θ); porównawczo wg (4.22): ${f(fr.thcr424, 0)} °C`, '4.2.3.3, 4.2.4');
    h += `<div class="fig">${D.fire(fr, { width: 640 })}</div>`;
    h += mk('fi-t', line(`czas osiągnięcia θ<sub>a,cr</sub>: t<sub>cr</sub> = ${fr.tcr === null ? `> ${f(fr.hist[fr.hist.length - 1][0], 0)}` : f(fr.tcr, 1)} min ${fr.ok ? '≥' : '<'} ${fr.Rreq} min ${fr.ok ? '<span class="ok">✔ warunek spełniony</span>' : '<span class="fail">✖ warunek NIESPEŁNIONY</span>'}; w ${fr.Rreq}. minucie θ<sub>a</sub> = ${f(fr.thR, 0)} °C`, '4.2.5'));
  }
  if (R.zm && R.zm.det) {
    const z = R.zm;
    h += H2('Zmęczenie (PN-EN 1993-1-9)');
    h += `<p>Przypadki cykliczne: ${z.ids.map(esc).join(', ')}; φ = ${esc(String(S.zmeczenie.phi))}${S.zmeczenie.zmiennyZnak ? ', obciążenie zmiennego znaku' : ''}; n = ${fm(z.n, 0)} cykli; γ<sub>Ff</sub> = ${f(ndp.gFf)}, γ<sub>Mf</sub> = ${f(z.gMf)}.</p>`;
    z.det.forEach(d => { h += mk('fat', line(`${esc(d.cat.n)} (${esc(d.miejsce)}): Δσ = ${f(d.ds, 1)} MPa (x = ${f(d.x / 1000)} m); Δσ<sub>C</sub>/γ<sub>Mf</sub> = ${f(d.dcd, 1)} MPa; N<sub>R</sub> = ${isFinite(d.Nf) ? fm(d.Nf, 0) : '∞'}; D = ${f(d.D, 4)}${okS(d.D)}`, 'rys. 7.1, 8(2)')); });
    h += mk('fatT', line(`Δτ = ${f(z.tau.dt, 1)} MPa; Δτ<sub>C</sub> = ${f(z.tau.dtc, 0)} MPa; D = ${f(z.tau.D, 4)}${okS(z.tau.D)}`, 'rys. 7.2'));
  }
  if (R.kr) {
    const k = R.kr;
    h += H2('Dobór stali ze względu na kruche pękanie (PN-EN 1993-1-10)');
    h += eq('T_{Ed}', 'T_{md} + ΔT_{r} + ΔT_{σ} + ΔT_{R} + ΔT_{ε̇} + ΔT_{εcf}', `${f(U.num(S.kruche.Tmd), 0)} + ${f(U.num(S.kruche.dTr), 0)} + 0 + ${f(U.num(ndp.dTR), 0)} + ${f(U.num(S.kruche.dTeps), 0)} + ${f(U.num(S.kruche.dTcf), 0)}`, f(k.TEd, 0), '°C', '2.2(5)');
    h += mk('kr', k.el.map(e => line(`${esc(e.n)}: t = ${f(e.t, 1)} mm, σ<sub>Ed</sub> = ${e.s === null ? 'przyjęto' : f(e.s, 1) + ' MPa'}, σ<sub>Ed</sub>/f<sub>y</sub>(t) = ${f(e.ratio, 2)} → t<sub>max</sub> = ${e.r.err ? esc(e.r.err) : f(e.r.t, 0) + ' mm'} ${e.r.err ? '<span class="fail">poza tablicą</span>' : e.t <= e.r.t ? '<span class="ok">✔</span>' : '<span class="fail">✖</span>'}`, 'tabl. 2.1')).join(''));
    if (k.z) h += mk('krZ', line(`Klasa Z: Z<sub>Ed</sub> = Z<sub>a</sub> + Z<sub>b</sub> + Z<sub>c</sub> + Z<sub>d</sub> + Z<sub>e</sub> = ${k.z.Za} + ${k.z.Zb} + ${k.z.Zc} + ${k.z.Zd} + ${k.z.Ze} = ${k.z.ZEd} → ${esc(k.z.cls)}`, 'tabl. 3.1, 3.2'));
  }
  // ---------------------------------------------------------- wykonanie
  h += H2('Wymagania wykonawcze (PN-EN 1090-2)');
  h += line(`<b>Klasa wykonania ${R.exc.exc}</b> – ${R.exc.why.map(esc).join('; ')}`, 'PN-EN 1993-1-1 zał. C');
  h += R.exc.req.map(r => line(`${esc(r[0])}: ${esc(r[1])}`)).join('');
  h += line(`Ochrona przed korozją: kategoria ${esc(S.wykonanie.korozja)}, trwałość ${esc(S.wykonanie.trwalosc)} (PN-EN ISO 12944)`);
  if (S.wykonanie.uwagi) h += `<p>${esc(S.wykonanie.uwagi)}</p>`;
  // ---------------------------------------------------------- belka i zestawienie
  h += H2('Belka – widok i zestawienie materiałów');
  h += `<p class="note">Rysunek poglądowy (skala pionowa powiększona).</p><div class="fig">${D.elevation(S, R, { W: 940 })}</div>`;
  const to = RP.takeoff(S, R);
  h += to.rows.map(r => line(`Poz. ${r.poz} – ${esc(r.n)}: ${r.szt} szt., ${esc(r.wym)}, ${esc(r.mat)} → ${f(r.m, 1)} kg`)).join('');
  h += line(`<b>Razem stal ${f(to.total, 1)} kg</b>${Object.keys(to.bolts).length ? `; śruby: ${Object.keys(to.bolts).map(k => `${to.bolts[k]} × ${esc(k)}`).join(', ')}` : ''}${to.weld ? `; spoiny pachwinowe ok. ${f(to.weld / 1000, 2)} m` : ''}`);
  // ---------------------------------------------------------- zestawienie sprawdzeń
  h += H2('Zestawienie sprawdzeń');
  const list = R.checks;
  let grp = '';
  list.forEach(c => {
    if (c.grp !== grp) { grp = c.grp; h += `<h3>${esc(grp)}</h3>`; }
    const cond = c.Rd === null || c.Rd === undefined ? V0(c.Ed, c.unit) : c.unit === '-' && c.Rd === 1 ? `${f(c.Ed, 3)} ≤ 1,0` : `${V0(c.Ed, c.unit)} ${c.inverse ? '≥' : '≤'} ${V0(c.Rd, c.unit)}`;
    h += line(`${esc(c.n)}: ${cond}${c.util !== null && c.util !== undefined && !c.info ? `, η = ${isFinite(c.util) ? f(c.util * 100, 0) + '%' : '∞'}` : ''} – <span class="${c.info ? 'info' : c.status}">${c.info ? 'informacyjnie' : c.status === 'ok' ? 'spełniony' : c.status === 'warn' ? 'uwaga' : 'NIE spełniony'}</span>`, c.ref);
  });
  const fl = list.filter(c => c.status === 'fail').length, mx = Math.max(0, ...list.filter(c => !c.info && c.util !== null && isFinite(c.util)).map(c => c.util));
  h += `<p class="verdict"><span class="${fl || R.errors.length ? 'fail' : 'ok'}">${fl ? `✖ Spośród przedstawionych sprawdzeń niespełnione: ${fl}.` : `✔ Przedstawione warunki normowe są spełnione. Maksymalne wykorzystanie η = ${f(mx * 100, 0)}%.`}</span></p>`;
  if (R.warnings.length) h += R.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('');
  if (R.info.length) h += R.info.map(w => `<p class="note">${esc(w)}</p>`).join('');
  // ---------------------------------------------------------- odtwarzalność
  h += H2('Założenia modelu i odtwarzalność');
  h += `<p class="note">Belka pryzmatyczna; analiza sprężysta I rzędu (MES), imperfekcje ujęte krzywymi wyboczeniowymi i zwichrzeniowymi; obciążenia bez mimośrodu względem środka ścinania (skręcanie od mimośrodu nie jest analizowane); stężenia sztywne – ich nośność należy sprawdzić odrębnie; połączenia przegubowe na reakcję pionową.</p>`;
  h += line(`Program ${BS.APP} ${BS.VERSION}; silnik ${esc(BS.ENGINE)}; format danych ${esc(BS.FORMAT)}; suma kontrolna SHA-256 danych: <span class="mono">${R.hash}</span>`);
  if (opt.data !== false) h += `<p class="note">Plik HTML raportu zawiera pełne dane projektu – można go otworzyć w programie (Otwórz), aby odtworzyć obliczenia.</p>`;
  return h;
};

/* ---------------------------------------------------------- część statyczna (raport pełny i „Statyka”) */
function staticPart(S, R, H2, full) {
  const md = R.md, an = R.an, ndp = R.ndp, nE = md.nE;
  let h = H2('Schemat statyczny i obciążenia');
  for (let s = 0; s < nE; s++) h += `<div class="fig">${D.scheme(S, R, { W: 900, etap: s, dims: true })}</div>${nE > 1 ? `<p class="note">Etap ${s + 1}: ${esc(md.etapy[s].nazwa)} – podpory: ${md.systems[s].map(p => p.id).join(', ')}${md.stez.filter(z => z.od <= s).length ? `; stężenia: ${md.stez.filter(z => z.od <= s).map(z => `x = ${f(z.x / 1000)} m`).join(', ')}` : ''}${md.ciagle.pasG && U.num(md.ciagle.odEtapu) <= s ? '; pas górny stężony ciągle' : ''}</p>` : ''}`;
  h += '<h3>Oddziaływania (wartości charakterystyczne)</h3>';
  if (S.ciezarWlasny.auto !== false) h += line(`G₀ – ciężar własny belki: g<sub>k</sub> = ${f(R.sec.gk, 3)} kN/m × (1 + ${f(U.num(S.ciezarWlasny.dodatek), 0)}% na połączenia) = ${f(R.sec.gk * (1 + U.num(S.ciezarWlasny.dodatek) / 100), 3)} kN/m (stałe)`);
  md.cases.filter(c => c.id !== 'G0').forEach(c => {
    const ps = S0.RODZAJE[c.rodzaj].stale || c.rodzaj === 'A' ? '' : `; ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub> = ${K.psi(c).map(v => f(v, 1)).join(' / ')}`;
    h += line(`<b>${esc(c.id)}</b> – ${esc(c.nazwa)} (${esc(S0.RODZAJE[c.rodzaj].n)}${c.rodzaj === 'Q' ? ', ' + esc((N.PSI[c.kat] || {}).n || c.kat) : ''}${nE > 1 ? `, etap ${c.etap + 1}` : ''}${!S0.RODZAJE[c.rodzaj].stale && c.uklad === 'szachownica' ? ', niekorzystnie w przęsłach' : ''}${c.wyklucz ? `, grupa „${esc(c.wyklucz)}”` : ''}${ps}): ` + c.parts.map(p => p.typ === 'q' ? `q = ${f(p.q0)}${p.q1 !== p.q0 ? '…' + f(p.q1) : ''} kN/m na x = ${f(p.x0 / 1000)}–${f(p.x1 / 1000)} m, ${p.kier === 'y' ? 'poziomo' : WYS[p.wys]}` : p.typ === 'P' ? `P = ${f(p.P / 1000)} kN w x = ${f(p.x / 1000)} m, ${p.kier === 'y' ? 'poziomo' : WYS[p.wys]}${p.ss ? `, s<sub>s</sub> = ${f(p.ss, 0)} mm` : ''}` : `M = ${f(p.M / 1e6)} kNm w x = ${f(p.x / 1000)} m`).join('; ') + (c.Nn ? `; N = ${f(c.Nn / 1000)} kN` : ''));
  });
  const off = (S.obciazenia || []).filter(o => o.aktywne === false);
  if (off.length) h += `<p class="note">Pominięte w obliczeniach (wyłączone): ${off.map(o => esc(o.id)).join(', ')}.</p>`;
  h += '<h3>Kombinacje oddziaływań (PN-EN 1990)</h3>';
  const gS = ndp.gG_sup * ndp.KFI;
  h += ndp.komb === '6.10' ? line(`E<sub>d</sub> = Σ γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub>; γ<sub>G,sup</sub> = ${f(gS)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf)}, γ<sub>Q</sub> = ${f(ndp.gQ * ndp.KFI)}`, '6.10')
    : line(`mniej korzystna z: Σ γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·ψ<sub>0,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub> oraz Σ ξ·γ<sub>G,j</sub>·G<sub>k,j</sub> + γ<sub>Q,1</sub>·Q<sub>k,1</sub> + Σ γ<sub>Q,i</sub>·ψ<sub>0,i</sub>·Q<sub>k,i</sub>; γ<sub>G,sup</sub> = ${f(gS)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf)}, γ<sub>Q</sub> = ${f(ndp.gQ * ndp.KFI)}, ξ = ${f(ndp.xi)}`, '6.10a, 6.10b');
  h += line('SGU: charakterystyczna G + Q<sub>k,1</sub> + Σψ<sub>0,i</sub>Q<sub>k,i</sub>; częsta G + ψ<sub>1,1</sub>Q<sub>k,1</sub> + Σψ<sub>2,i</sub>Q<sub>k,i</sub>; quasi-stała G + Σψ<sub>2,i</sub>Q<sub>k,i</sub>', '6.14b–6.16b');
  if (full) h += line(`EQU: γ<sub>G,sup</sub> = ${f(ndp.gG_sup_equ)}, γ<sub>G,inf</sub> = ${f(ndp.gG_inf_equ)}, γ<sub>Q</sub> = ${f(ndp.gQ_equ)}`, 'tabl. A1.2(A)');
  const cnt = {}; R.combos.forEach(c => { cnt[c.typ] = (cnt[c.typ] || 0) + 1; });
  h += `<p class="note">Liczba kombinacji: ${Object.keys(cnt).map(t => `${({ SGN: 'SGN', char: 'charakterystyczne', czest: 'częste', qp: 'quasi-stałe', kruche: 'do doboru stali', poz: 'pożarowe', wyj: 'wyjątkowe' })[t] || t} ${cnt[t]}`).join(', ')}; obciążenia zmienne – każde jako wiodące; układy w przęsłach: ${K.patterns(md).map(p => esc(p.n)).join('; ')}.</p>`;
  h += H2('Siły wewnętrzne, reakcje i ugięcia');
  h += `<p>Analiza sprężysta I rzędu metodą elementów skończonych (${md.xs.length - 1} elementów), osobno w płaszczyźnie pionowej (I<sub>y</sub>) i poziomej (I<sub>z</sub>); kombinacje – superpozycja przypadków z historią etapów.</p>`;
  for (let s = 0; s < nE; s++) {
    const ev = R.env[s], ch = RP.charts(S, R, s, 900);
    if (nE > 1) h += `<h3>Etap ${s + 1}: ${esc(md.etapy[s].nazwa)}</h3>`;
    const strip = (o) => full ? o : Object.assign({}, o, { hseg: (o.kind === 'w' ? o.hseg : []), hl: [] });
    h += `<div class="fig">${D.lineChart(strip(ch.M))}${ch.Mz ? D.lineChart(strip(ch.Mz)) : ''}${D.lineChart(strip(ch.V))}${ch.N ? D.lineChart(strip(ch.N)) : ''}${D.lineChart(strip(ch.w))}</div>`;
    let iM = 0, im = 0; ev.Mmax.forEach((v, i) => { if (v > ev.Mmax[iM]) iM = i; }); ev.Mmin.forEach((v, i) => { if (v < ev.Mmin[im]) im = i; });
    const vA = Math.max(...Array.from(ev.Vmax).map(Math.abs), ...Array.from(ev.Vmin).map(Math.abs));
    h += line(`Ekstrema (obwiednia SGN): M<sub>Ed,max</sub> = <b>${kNm(ev.Mmax[iM])} kNm</b> (x = ${f(an.xs[iM] / 1000)} m)${ev.Mmin[im] < -1e3 ? `, M<sub>Ed,min</sub> = <b>${kNm(ev.Mmin[im])} kNm</b> (x = ${f(an.xs[im] / 1000)} m)` : ''}; |V<sub>Ed</sub>|<sub>max</sub> = <b>${kN(vA)} kN</b>; ugięcie charakterystyczne max ${f(Math.max(...ev.wmax), 1)} mm`);
    h += `<div class="fig">${D.reactions(S, R, s, 900)}</div>`;
    h += md.systems[s].map(p => { const r = ev.R[p.id] || {}; return line(`Podpora ${p.id}: R<sub>Ed,max</sub> = <b>${kN(r.max || 0)} kN</b>, R<sub>Ed,min</sub> = ${kN(r.min || 0)} kN${r.Mmax > 1e3 ? `, |M<sub>Ed</sub>| = ${kNm(r.Mmax)} kNm` : ''}; charakterystyczne: ${Object.keys(an.res[s]).map(k => { const q = an.res[s][k].tot.R[p.id]; return q ? `${esc(an.res[s][k].c.id)} ${kN(q.R)}` : ''; }).filter(Boolean).join(', ')} kN`); }).join('');
  }
  return h;
}


/* ---------------------------------------------------------- połączenia: tok obliczeń */
const UN = (v, u) => (u === 'MPa' ? f(v, 1) + ' MPa' : u === '-' ? f(v, 3) : V0(v, u));
function checksBody(o, idp) {
  let h = '', g = '';
  o.checks.forEach((c, k) => {
    if (c.grp !== g) { g = c.grp; h += `<p><b>${esc(g)}</b></p>`; }
    h += mk(`${idp}-C${k}`, line(`${esc(c.n)}${c.f ? `: ${esc(c.f)}` : ''} → ${c.unit === '-' ? `<b>${f(c.u, 3)}</b> ≤ 1,0` : `E<sub>d</sub> = <b>${UN(c.Ed, c.unit)}</b> ≤ R<sub>d</sub> = <b>${UN(c.Rd, c.unit)}</b>`} (${isFinite(c.u) ? f(c.u * 100, 0) : '∞'}%)${okS(c.u)}`, c.ref));
  });
  if (o.detal && o.detal.length) {
    h += '<p><b>Wymagania konstrukcyjne i zalecenia</b></p>';
    h += o.detal.map(d => line(`${esc(d.el)}: ${esc(d.n)} – ${f(d.v, 1)} ${d.rel} ${f(d.lim, 1)} mm ${d.ok ? '<span class="ok">✔</span>' : d.typ === 'zal' ? '<span class="warn">! zalecenie niespełnione</span>' : '<span class="fail">✖ NIE</span>'}`, d.typ === 'zal' ? 'SCI P358' : 'PN-EN 1993-1-8 tabl. 3.3')).join('');
  }
  (o.uwagi || []).forEach(t => { h += `<p class="note">${esc(t)}</p>`; });
  return h;
}
function jointBody(S, R, o, F, w, idp) {
  const B = o.B;
  let h = `<div class="fig">${(() => { const v = D.jointViews(R.sec, w || {}, o, { W: 480, H: 340 }); return v.elev + (v.sect || ''); })()}</div>`;
  h += line(`Połączenie: <b>${esc(BS.J.jointTxt(w || {}, R.sec))}</b>; siły: V<sub>Ed</sub> = ${kN(F.V)} kN${F.M ? `, M<sub>Ed</sub> = ${kNm(F.M)} kNm` : ''}${F.Nt ? `, N<sub>t</sub> = ${kN(F.Nt)} kN (wiązanie – sytuacja wyjątkowa)` : ''}${F.recz ? ' (zadane ręcznie)' : ''}`);
  if (B) h += line(`Śruby ${esc(BS.W.boltTxt(B))}: f<sub>ub</sub> = ${B.fub} MPa, A<sub>s</sub> = ${f(B.As, 0)} mm²; F<sub>v,Rd</sub> = ${kN(B.Fv)} kN, F<sub>t,Rd</sub> = ${kN(B.Ft)} kN${B.pre ? `, F<sub>p,C</sub> = ${kN(B.FpC)} kN, μ = ${f(B.mu, 2)}, kategoria ${B.kat}` : ''}`, 'PN-EN 1993-1-8 tabl. 3.1, 3.4');
  if (o.pl) h += line(`Blachy / kątowniki: ${esc(o.pl.gat)} – f<sub>y</sub> = ${o.pl.fy} MPa, f<sub>u</sub> = ${o.pl.fu} MPa, β<sub>w</sub> = ${f(o.pl.bw, 2)}`, 'PN-EN 1993-1-1 tabl. 3.1; 1-8 tabl. 4.1');
  return h + checksBody(o, idp);
}
function spliceBody(S, R, o, F, s, idp) {
  let h = '';
  if (o.geom) { const v = D.spliceViews(R.sec, s, o, { W: 560 }); h += `<div class="fig">${v.elev}${v.sect}</div>`; }
  h += line(`Siły w miejscu styku: M<sub>Ed</sub> = ${kNm(F.M)} kNm, V<sub>Ed</sub> = ${kN(F.V)} kN${F.N ? `, N<sub>Ed</sub> = ${kN(F.N)} kN` : ''} (${F.recz ? 'zadane ręcznie' : 'obwiednia wartości bezwzględnych ze wszystkich etapów – bezpiecznie'})`);
  if (o.forces) h += line(`Podział: M<sub>w</sub> = M·I<sub>w</sub>/I = ${kNm(o.forces.Mw)} kNm, M<sub>f</sub> = ${kNm(o.forces.Mf)} kNm → F<sub>f</sub> = ${kN(o.forces.Ff)} kN w pasie; środnik: V, N<sub>w</sub> = ${kN(o.forces.Nw)} kN, M<sub>w</sub> + V·e = ${kNm(o.forces.Mwt)} kNm (e = ${f(o.forces.ecc, 0)} mm)`, 'rozkład sprężysty');
  if (o.B) h += line(`Śruby ${esc(BS.W.boltTxt(o.B))}: F<sub>v,Rd</sub> = ${kN(o.B.Fv)} kN${o.B.pre ? `, F<sub>s,Rd</sub> = ${kN(o.B.Fs)} kN (kat. ${o.B.kat})` : ''}`, 'PN-EN 1993-1-8 tabl. 3.4, 3.9');
  return h + checksBody(o, idp);
}
// blok jednego węzła / styku (okno „Tok obliczeń”)
RP.jointBlock = function (S, R, sel) {
  if (sel.styk !== undefined) { const q = (R.styki || [])[sel.styk]; return q && q.o ? spliceBody(S, R, q.o, q.F, S.styki[sel.styk], q.id) : '<p class="hint">Brak wyników.</p>'; }
  const p = R.md.sup[sel.sup], rp = (R.podpory || []).find(q => q.id === (p && p.id));
  if (!rp) return '<p class="hint">Brak wyników.</p>';
  if (rp.pol) return jointBody(S, R, rp.pol, rp.F, S.podpory[sel.sup].wezel, rp.id);
  return rp.checks.map(c => line(`${esc(c.n)}${c.f ? `: ${esc(c.f)}` : ''} → ${V0(c.Ed, c.unit)} ≤ ${V0(c.Rd, c.unit)}${okS(c.util)}`, c.ref)).join('') || '<p class="hint">Brak sprawdzeń.</p>';
};
/* raport „Statyka”: dane, schemat, obciążenia, wykresy, reakcje */
RP.buildStatic = function (S, R) {
  const md = R.md, sec = R.sec, mat = R.mat;
  let h = '', sn = 0; const H2 = (t) => `<h2>${++sn}. ${t}</h2>`;
  h += `<h1>Statyka belki stalowej – ${esc(S.meta.nazwa)}</h1>`;
  h += H2('Dane materiałowe');
  h += line(`Stal ${esc(mat.gatunek)}${esc(mat.podgatunek)}: f<sub>y</sub> = ${mat.fy} MPa, f<sub>u</sub> = ${mat.fu} MPa, E = 210 000 MPa, G = 81 000 MPa; ciężar 78,5 kN/m³`, 'PN-EN 1993-1-1 tabl. 3.1');
  h += H2('Przekrój');
  h += `<div class="fig">${D.section(sec, { size: 220 })}</div>` + line(`${esc(sec.nazwa)}: A = ${f(sec.A / 100)} cm², I<sub>y</sub> = ${f(sec.Iy / 1e4, 0)} cm⁴, I<sub>z</sub> = ${f(sec.Iz / 1e4, 1)} cm⁴; masa ${f(sec.masa, 1)} kg/m`);
  h += H2('Schemat statyczny');
  h += line(`Długość belki L = ${f(md.L / 1000)} m; ${md.seg.map(q => `${esc(q.n)} ${f((q.x1 - q.x0) / 1000)} m`).join('; ')}`);
  h += md.sup.map((p, i) => line(`Podpora <b>${p.id}</b>: x = ${f(p.x / 1000)} m; ${SUPN[p.typ] || p.typ}${p.przesuwna ? ' przesuwna' : ''}`)).join('') + md.tmp.map(t => line(`Podpora montażowa <b>${t.id}</b>: x = ${f(t.x / 1000)} m, usuwana po etapie ${t.do + 1}`)).join('');
  h += staticPart(S, R, H2, false).replace(/<h2>\d+\. Schemat statyczny i obciążenia<\/h2>/, '<h2>' + (++sn) + '. Obciążenia</h2>').replace(/<h2>\d+\. Siły wewnętrzne, reakcje i ugięcia<\/h2>/, '<h2>' + (++sn) + '. Wykresy sił wewnętrznych i reakcje podporowe</h2>');
  return h;
};

/* ---------------------------------------------------------- treści sprawdzeń (raport i „jak obliczono”) */
function checkSec(c, R) {
  const sec = R.sec, b = R.base, mat = R.mat, ndp = R.ndp, d = c.d || {};
  let h = '';
  if (/-M$/.test(c.id)) {
    const p = d.p || {};
    h += `<p><b>${esc(c.n)}</b> – x = ${f(c.x / 1000)} m; ${esc(c.combo)}</p>`;
    h += line(`M<sub>Ed</sub> = ${kNm(Math.abs(d.M))} kNm${Math.abs(d.N) > 1 ? `, N<sub>Ed</sub> = ${kN(d.N)} kN` : ''}${Math.abs(d.Mz) > 1 ? `, M<sub>z,Ed</sub> = ${kNm(Math.abs(d.Mz))} kNm` : ''}, V<sub>Ed</sub> = ${kN(Math.abs(d.V))} kN`);
    const W = p.cls <= 2 ? sec.Wpl_y : p.cls === 3 ? Math.min(sec.Wel_t, sec.Wel_b) : ((d.M >= 0 ? b.effPos : b.effNeg) || {}).Weff;
    h += eq('M_{c,Rd}', 'W·f_{y}/γ_{M0}', `${f(W / 1e3, 1)}·10³·${mat.fy}/${f(ndp.gM0)}`, kNm(W * mat.fy / ndp.gM0), `kNm (W = ${p.cls <= 2 ? 'W<sub>pl,y</sub>' : p.cls === 3 ? 'W<sub>el,min</sub>' : 'W<sub>eff,min</sub>'}, klasa ${p.cls})`, '6.13–6.15');
    if (p.rho > 0) h += eq('ρ', '(2V_{Ed}/V_{pl,Rd} − 1)²', '', f(p.rho, 4), `→ M<sub>V,Rd</sub> = ${kNm(p.McRd)} kNm`, '6.2.8');
    if (p.MN && Math.abs(d.N) > 1) h += eq('M_{N,Rd}', '', '', kNm(p.MN), 'kNm', '6.2.9.1');
    h += line(`${p.f === '6.41' ? '(M<sub>y,Ed</sub>/M<sub>N,y,Rd</sub>)<sup>α</sup> + (M<sub>z,Ed</sub>/M<sub>N,z,Rd</sub>)<sup>β</sup>' : p.cls >= 3 && (Math.abs(d.N) > 1 || Math.abs(d.Mz) > 1) ? 'σ<sub>x,Ed</sub>/(f<sub>y</sub>/γ<sub>M0</sub>)' : `M<sub>Ed</sub>/M<sub>${Math.abs(d.N) > 1 && p.cls <= 2 ? 'N' : 'c'},Rd</sub>`} = <b>${f(c.util, 3)}</b> ≤ 1,0${okS(c.util)}`, p.f);
  } else if (/-V$/.test(c.id)) {
    h += `<p><b>${esc(c.n)}</b> – x = ${f(c.x / 1000)} m; ${esc(c.combo)}</p>`;
    h += eq('V_{pl,Rd}', 'A_{v}·f_{y}/(√3·γ_{M0})', `${f(b.Av, 0)}·${mat.fy}/(√3·${f(ndp.gM0)})`, kN(b.Vpl), 'kN', '6.18');
    h += line(`V<sub>Ed</sub>/V<sub>pl,Rd</sub> = ${kN(c.Ed)}/${kN(c.Rd)} = <b>${f(c.util, 3)}</b> ≤ 1,0${okS(c.util)}`, '6.17');
  } else h += line(`<b>${esc(c.n)}</b>${c.x !== undefined ? ` (x = ${f(c.x / 1000)} m)` : ''}: ${V0(c.Ed, c.unit)} / ${V0(c.Rd, c.unit)} = <b>${f(c.util, 3)}</b>${okS(c.util)}`, c.ref);
  return h;
}
function ltbTxt(g, mat, ndp) {
  const l = g.ltb;
  let h = `<p><b>Segment ${f(g.sg.x0 / 1000)}–${f(g.sg.x1 / 1000)} m</b>${g.sg.free ? ' (wspornik)' : ''} – ${esc(g.combo.opis)}</p>`;
  h += line(`|M<sub>Ed,max</sub>| = ${kNm(g.sh.mabs)} kNm (${g.Mpos ? 'ściskany pas górny' : 'ściskany pas dolny'}); M<sub>cr</sub> = ${g.Mcr === Infinity ? '∞' : `α<sub>cr</sub>·|M<sub>Ed,max</sub>| = ${f(g.alphaCr, 3)}·${kNm(g.sh.mabs)} = <b>${kNm(g.Mcr)} kNm</b>`}`);
  h += eq('λ̄_{LT}', '√(W_{y}·f_{y}/M_{cr})', `√(${f(g.Wy / 1e3, 1)}·10³·${mat.fy}/${g.Mcr === Infinity ? '∞' : f(g.Mcr, 0)})`, f(g.lam, 3), `(klasa ${g.cls})`, '6.56');
  if (l.skip) h += line(`λ̄<sub>LT</sub> ≤ λ̄<sub>LT,0</sub> = ${f(l.lam0, 2)} lub M<sub>Ed</sub>/M<sub>cr</sub> ≤ λ̄<sub>LT,0</sub>² → χ<sub>LT</sub> = 1,0 (zwichrzenie można pominąć)`, '6.3.2.2(4)');
  else {
    h += eq('Φ_{LT}', `0,5[1 + α_{LT}(λ̄_{LT} − ${f(l.lam0, 2)}) + ${l.met === '6.3.2.3' ? f(l.beta, 2) + '·' : ''}λ̄_{LT}²]`, `krzywa ${l.curve}, α<sub>LT</sub> = ${f(l.alLT, 2)}`, f(l.phi, 3), '', l.met === '6.3.2.3' ? '6.57' : '6.56') + eq('χ_{LT}', '', '', f(l.chi, 3), '');
    if (l.met === '6.3.2.3') h += eq('f', '1 − 0,5(1 − k_{c})[1 − 2(λ̄_{LT} − 0,8)²]', `k<sub>c</sub> = ${f(l.kc, 3)} (${esc(l.kcSrc || '')})`, f(l.f, 3), `→ χ<sub>LT,mod</sub> = ${f(l.chimod, 3)}`, '6.58, tabl. 6.6');
  }
  h += eq('M_{b,Rd}', `χ_{LT${l.met === '6.3.2.3' ? ',mod' : ''}}·W_{y}·f_{y}/γ_{M1}`, '', kNm(g.Mb), 'kNm', '6.55') + line(`M<sub>Ed</sub>/M<sub>b,Rd</sub> = ${kNm(g.sh.mabs)}/${kNm(g.Mb)} = <b>${f(g.u, 3)}</b> ≤ 1,0${okS(g.u)}`, '6.54');
  return h;
}
function interTxt(it) {
  let h = `<p><b>Interakcja – segment ${f(it.sg.x0 / 1000)}–${f(it.sg.x1 / 1000)} m</b> (${esc(it.combo.opis)})</p>`;
  h += line(`N<sub>Ed</sub> = ${kN(it.Nc)} kN, M<sub>y,Ed</sub> = ${kNm(it.My)} kNm, M<sub>z,Ed</sub> = ${kNm(it.Mz)} kNm; L<sub>cr,y</sub> = ${f(it.Lcy / 1000)} m, L<sub>cr,z</sub> = ${f(it.Lcz / 1000)} m; λ̄<sub>y</sub> = ${f(it.ly, 3)}, λ̄<sub>z</sub> = ${f(it.lz, 3)}, λ̄<sub>T</sub> = ${f(it.lT, 3)}; χ<sub>y</sub> = ${f(it.chiy, 3)} (krzywa ${it.curves.y}), χ<sub>z</sub> = ${f(it.chiz, 3)}, χ<sub>T</sub> = ${f(it.chiT, 3)} (krzywa ${it.curves.z}); χ<sub>LT</sub> = ${f(it.chiLT, 3)}`, '6.3.1');
  h += line(`C<sub>my</sub> = ${f(it.Cmy, 3)}, C<sub>mz</sub> = ${f(it.Cmz, 3)}, C<sub>mLT</sub> = ${f(it.CmLT, 3)}; k<sub>yy</sub> = ${f(it.kyy, 3)}, k<sub>yz</sub> = ${f(it.kyz, 3)}, k<sub>zy</sub> = ${f(it.kzy, 3)}, k<sub>zz</sub> = ${f(it.kzz, 3)}`, 'zał. B');
  h += line(`(6.61): <b>${f(it.u61, 3)}</b> ≤ 1,0${okS(it.u61)}; (6.62): <b>${f(it.u62, 3)}</b> ≤ 1,0${okS(it.u62)}`, '6.3.3');
  return h;
}
function patchTxt(p, title) {
  if (!p) return '';
  let h = `<p><b>${esc(title)}</b> – typ ${p.typ === 'c' ? 'c (przy końcu belki)' : 'a (siła przez pas)'}</p>`;
  h += line(`m<sub>1</sub> = ${f(p.m1, 2)}; m<sub>2</sub> = ${f(p.m2, 2)}; k<sub>F</sub> = ${f(p.kF, 3)}; s<sub>s</sub> = ${f(p.ss, 0)} mm${p.typ === 'c' ? `, c = ${f(p.c, 0)} mm, l<sub>e</sub> = ${f(p.le, 1)} mm` : ''}; l<sub>y</sub> = ${f(p.ly, 1)} mm`, 'PN-EN 1993-1-5 6.5');
  h += eq('F_{cr}', '0,9·k_{F}·E·t_{w}³/h_{w}', '', kN(p.Fcr), 'kN', '6.5') + eq('λ̄_{F}', '√(l_{y}·t_{w}·f_{yw}/F_{cr})', '', f(p.lF, 3), `; χ<sub>F</sub> = 0,5/λ̄<sub>F</sub> ≤ 1 = ${f(p.chi, 3)}; L<sub>eff</sub> = ${f(p.Leff, 1)} mm`, '6.4');
  h += eq('F_{Rd}', 'f_{yw}·L_{eff}·t_{w}/γ_{M1}', '', kN(p.FRd), 'kN', '6.1') + line(`η<sub>2</sub> = F<sub>Ed</sub>/F<sub>Rd</sub> = ${kN(p.F)}/${kN(p.FRd)} = <b>${f(p.u, 3)}</b> ≤ 1,0${okS(p.u)}`, '6.14');
  return h;
}

/* fragment raportu dla jednego sprawdzenia („jak obliczono”) */
RP.explain = function (S, R, c) {
  const full = RP.build(S, R, { data: false });
  const tag = `<!--ck:${c.id}-->`;
  let i = full.indexOf(tag);
  if (i < 0 && /^w3-/.test(c.id)) i = full.indexOf(`<!--ck:w-${c.id.slice(3)}-->`);
  if (i >= 0) { const id = full.slice(i + 7, full.indexOf('-->', i)); const j = full.indexOf(`<!--/ck:${id}-->`, i); return full.slice(i, j); }
  // brak znacznika – rozdział raportu wg grupy
  const rx = /^SGN – nośność/.test(c.grp) ? /SGN – nośność/ : /^SGN – stateczność/.test(c.grp) ? /stateczność/ : /^SGU/.test(c.grp) ? /SGU/ : /^Podpory/.test(c.grp) ? /Podpory/ : /^Pożar/.test(c.grp) ? /pożaru/ : /^Zmęczenie/.test(c.grp) ? /Zmęczenie/ : /^Kruche/.test(c.grp) ? /kruche/ : /1993-1-5/.test(c.grp) ? /Środnik/ : null;
  if (!rx) return '';
  const parts = full.split(/(?=<h2>)/);
  const sec = parts.find(p => rx.test((/<h2>([^<]*)<\/h2>/.exec(p) || [])[1] || ''));
  return sec ? sec.replace(/<h2>[^<]*<\/h2>/, '') : '';
};

/* pełny, samodzielny dokument HTML raportu (z osadzonymi danymi projektu) */
RP.document = function (S, R, body, title) {
  const css = (typeof document !== 'undefined' && document.getElementById('appcss') || {}).textContent || '';
  const data = JSON.stringify(S).replace(/<\//g, '<\\/');
  return `<!doctype html><html lang="pl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title || ('Raport – ' + (S.meta.nazwa || 'belka')))}</title><meta name="generator" content="${esc(BS.APP + ' ' + BS.VERSION + '; ' + BS.ENGINE)}"><meta name="belkastal-sha256" content="${R ? R.hash : ''}"><style>${css}
html,body{height:auto;overflow:auto;background:#fff}body{padding:20px 16px}#report{border:0}@media print{body{padding:0}.rtools{display:none}}</style></head><body><div class="rtools"><button class="btn pri" onclick="window.print()">Drukuj / zapisz PDF</button><span class="hint" style="margin-left:10px">Plik zawiera dane projektu – można go otworzyć w programie ${BS.APP} (Otwórz).</span></div><div id="report">${body}</div><script type="application/json" id="belkastal-dane">${data}</script></body></html>`;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
