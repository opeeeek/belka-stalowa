/* =====================================================================
   BelkaStal – widoki zakładek wyników
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS, U = BS.U, D = BS.D, K = BS.K, S0 = BS.S;
const V = BS.V = {};
const esc = U.esc;
const kN = (v) => U.fmt(v / 1e3, 1), kNm = (v) => U.fmt(v / 1e6, 1);
V.unitFmt = function (v, unit) {
  if (v === null || v === undefined) return '—';
  if (v === Infinity) return '∞';
  switch (unit) {
    case 'M': return U.fmt(v / 1e6, 1) + ' kNm';
    case 'F': return U.fmt(v / 1e3, 1) + ' kN';
    case 'q': return U.fmt(v, 1) + ' N/mm';
    case 'mm': return U.fmt(v, 1) + ' mm';
    case 'Hz': return U.fmt(v, 2) + ' Hz';
    case 'min': return U.fmt(v, 1) + ' min';
    case 'MPa': return U.fmt(v, 1) + ' MPa';
    default: return U.fmt(v, 3);
  }
};
V.ub = function (u, st) {
  if (u === null || u === undefined) return '<span class="hint">—</span>';
  const w = isFinite(u) ? Math.min(100, u * 100) : 100;
  return `<span class="ub ${st === 'fail' ? 'fail' : st === 'warn' || u > 0.9 ? 'warn' : ''}"><i style="width:${w}%"></i></span><span class="pct">${isFinite(u) ? Math.round(u * 100) + '%' : '∞'}</span>`;
};
V.stBadge = (st) => `<span class="st ${st}">${st === 'ok' ? 'OK' : st === 'fail' ? 'NIE' : st === 'warn' ? 'UWAGA' : 'INFO'}</span>`;
const noRes = (R) => (!R || !R.md ? `<div class="msg err">${R && R.errors ? R.errors.map(esc).join('<br>') : 'Brak wyników.'}</div>` : '');

/* ---------------------------------------------------------- przekrój */
V.sec = function (S, R) {
  if (!R || !R.sec) return noRes(R);
  const s = R.sec, b = R.base, m = R.mat;
  let h = `<div class="h2">${esc(s.nazwa)} <small>${esc(m.gatunek)}${esc(m.podgatunek)} · fy = ${m.fy} MPa, fu = ${m.fu} MPa (${esc(m.zr)}) · ε = ${U.fmt(b.eps, 3)}</small></div><div class="flex">`;
  h += `<div class="box"><h4>Przekrój</h4>${D.section(s, { size: 300, eff: b.effNeg || b.effPos })}${(b.effNeg || b.effPos) ? '<p class="hint">Kolor czerwony – części nieefektywne (kl. 4, PN-EN 1993-1-5, 4.4).</p>' : ''}</div>`;
  const row = (a, v, u) => `<tr><td>${a}</td><td>${v}</td><td>${u || ''}</td></tr>`;
  h += `<div class="box"><h4>Charakterystyki geometryczne</h4><table class="kv">${row('A', U.fmt(s.A / 100, 2), 'cm²')}${row('I<sub>y</sub>', U.fmt(s.Iy / 1e4, 0), 'cm⁴')}${row('I<sub>z</sub>', U.fmt(s.Iz / 1e4, 1), 'cm⁴')}${row('W<sub>el,y</sub> (góra / dół)', U.fmt(s.Wel_t / 1e3, 1) + ' / ' + U.fmt(s.Wel_b / 1e3, 1), 'cm³')}${row('W<sub>pl,y</sub>', U.fmt(s.Wpl_y / 1e3, 1), 'cm³')}${row('W<sub>el,z</sub> / W<sub>pl,z</sub>', U.fmt(s.Wel_z / 1e3, 1) + ' / ' + U.fmt(s.Wpl_z / 1e3, 1), 'cm³')}${row('i<sub>y</sub> / i<sub>z</sub>', U.fmt(s.iy / 10, 2) + ' / ' + U.fmt(s.iz / 10, 2), 'cm')}${row('I<sub>t</sub>', U.fmt(s.It / 1e4, 2), 'cm⁴')}${row('I<sub>w</sub>', U.fmt(s.Iw / 1e9, 1), '×10³ cm⁶')}${row('A<sub>v,z</sub>', U.fmt(b.Av / 100, 2), 'cm²')}${row('z<sub>c</sub> / z<sub>s</sub> (od spodu)', U.fmt(s.zc, 1) + ' / ' + U.fmt(s.zs, 1), 'mm')}${!s.sym ? row('β<sub>z</sub> (monosymetria)', U.fmt(s.betaZ, 1), 'mm') : ''}${row('masa / g<sub>k</sub>', U.fmt(s.masa, 1) + ' / ' + U.fmt(s.gk, 3), 'kg/m / kN/m')}</table><p class="hint">Z geometrii (wymiary PN-EN 10365${s.typ === 'walc' ? ', zaokrąglenia r' : ', spoiny pominięte'}); I<sub>t</sub> ${s.typ === 'walc' ? 'wzorem dla kształtowników walcowanych z zaokrągleniami' : '= Σ b·t³/3'}.</p></div>`;
  // klasyfikacja
  const cls = (k, t) => `<h4>${t}: klasa ${k.cls}</h4><table class="grid"><tr><th>Ścianka</th><th>c [mm]</th><th>t [mm]</th><th>c/t</th><th>granice kl. 1/2/3</th><th>klasa</th></tr>${k.all.map(p => `<tr><td>${esc(p.n)}${p.alpha !== undefined && p.typ === 'wewnętrzna' ? ` <span class="hint">α = ${U.fmt(p.alpha, 3)}, ψ = ${isFinite(p.psi) ? U.fmt(p.psi, 3) : '—'}</span>` : ''}</td><td class="n">${U.fmt(p.c, 1)}</td><td class="n">${U.fmt(p.t, 1)}</td><td class="n">${U.fmt(p.ct, 2)}</td><td class="n">${p.lim.map(l => isFinite(l) ? U.fmt(l, 1) : '—').join(' / ')}</td><td class="n"><b>${p.cls}</b></td></tr>`).join('')}</table>`;
  h += `<div class="box" style="flex:1 1 420px"><h4>Klasyfikacja (PN-EN 1993-1-1, tabl. 5.2)</h4>${cls(b.kPos, 'Zginanie M > 0 (ściskany pas górny)')}${cls(b.kNeg, 'Zginanie M < 0 (ściskany pas dolny)')}${cls(b.kN, 'Ściskanie osiowe')}</div>`;
  // nośności
  h += `<div class="box"><h4>Nośności obliczeniowe przekroju</h4><table class="kv">${row('M<sub>c,Rd</sub> (M > 0)', kNm(b.Mc_pos), 'kNm')}${row('M<sub>c,Rd</sub> (M < 0)', kNm(b.Mc_neg), 'kNm')}${row('M<sub>pl,Rd</sub>', kNm(b.Mpl_pos), 'kNm')}${row('M<sub>c,z,Rd</sub>', kNm(b.Mcz), 'kNm')}${row('V<sub>pl,z,Rd</sub>', kN(b.Vpl), 'kN')}${row('N<sub>pl,Rd</sub> / N<sub>c,Rd</sub>', kN(b.Npl) + ' / ' + kN(b.Nc), 'kN')}${row('M<sub>f,Rd</sub> (pasy)', kNm(b.Mf), 'kNm')}${row('h<sub>w</sub>/t<sub>w</sub>', U.fmt(R.sb.ht, 1), `granica ${U.fmt(R.sb.limit, 1)}`)}${R.sb.need ? row('V<sub>b,Rd</sub> (wyboczenie przy ścinaniu)', kN(R.sb.Vb), `χw = ${U.fmt(R.sb.chi, 3)}`) : ''}</table>`;
  [['effPos', 'M > 0'], ['effNeg', 'M < 0'], ['effN', 'ściskanie']].forEach(([k, t]) => {
    const e = b[k]; if (!e) return;
    h += `<p class="hint"><b>Przekrój efektywny (${t})</b>: ${e.info.map(i => `${esc(i.el)}: λ̄p = ${U.fmt(i.lp, 3)}, kσ = ${U.fmt(i.kS, 2)}, ρ = ${U.fmt(i.rho, 3)}`).join('; ')} → A<sub>eff</sub> = ${U.fmt(e.A / 100, 2)} cm²${e.Weff ? `, W<sub>eff,min</sub> = ${U.fmt(e.Weff / 1e3, 1)} cm³` : ''}</p>`;
  });
  h += '</div></div>';
  return h;
};

/* ---------------------------------------------------------- wykresy */
V.chart = function (S, R, o) {
  if (!R || !R.md) return noRes(R);
  const md = R.md, s = o.etap, an = R.an, ev = R.env[s];
  const sup = md.systems[s].map(p => p.x);
  let h = `<div class="bar"><b class="h2" style="margin:0">Siły wewnętrzne i ugięcia – ${esc(md.etapy[s].nazwa)}</b><span class="sp"></span>${o.stageSeg}</div>`;
  h += `<div class="box">${D.scheme(S, md, { etap: s, width: 900 })}</div>`;
  const P = (o2) => `<div class="box">${D.plot(Object.assign({ xs: an.xs, L: md.L, width: 900, height: 210, sup }, o2))}</div>`;
  h += P({ title: 'Momenty zginające M_Ed [kNm] – obwiednia SGN (rysowane po stronie włókien rozciąganych)', unit: 'kNm', scale: 1e-6, series: [{ y: ev.Mmax, col: D.C.M, fill: true, name: 'max' }, { y: ev.Mmin, col: D.C.M, fill: true, dash: '4 2', name: 'min' }] });
  h += P({ title: 'Siły poprzeczne V_Ed [kN] – obwiednia SGN', unit: 'kN', scale: 1e-3, down: false, series: [{ y: ev.Vmax, col: D.C.V, fill: true, name: 'max' }, { y: ev.Vmin, col: D.C.V, fill: true, dash: '4 2', name: 'min' }] });
  if (Math.max(...ev.Mzmax.map(Math.abs), ...ev.Mzmin.map(Math.abs)) > 1) h += P({ title: 'Momenty M_z,Ed [kNm] – płaszczyzna pozioma', unit: 'kNm', scale: 1e-6, series: [{ y: ev.Mzmax, col: D.C.z, fill: true }, { y: ev.Mzmin, col: D.C.z, fill: true }] });
  if (isFinite(ev.Nmax) && (Math.abs(ev.Nmax) > 1 || Math.abs(ev.Nmin) > 1)) h += `<div class="msg inf">Siła osiowa N<sub>Ed</sub> (stała na długości): od ${kN(ev.Nmin)} do ${kN(ev.Nmax)} kN (+ rozciąganie).</div>`;
  h += P({ title: 'Ugięcia w [mm] – obwiednia kombinacji charakterystycznych', unit: 'mm', dec: 1, series: [{ y: ev.wmax, col: D.C.w, fill: true, name: 'max' }, { y: ev.wmin, col: D.C.w, dash: '4 2', name: 'min' }].concat(s === md.nE - 1 && R.sgu && R.sgu.wcMax > 0 ? [{ y: R.sgu.wc, col: D.C.ink3, dash: '2 3', name: 'podniesienie wc', lab: false }] : []) });
  // reakcje
  h += `<div class="box"><h4>Reakcje podpór – etap ${s + 1}</h4><table class="grid"><tr><th>Podpora</th><th>x [m]</th><th>R<sub>Ed,max</sub> [kN]</th><th>R<sub>Ed,min</sub> [kN]</th><th>|M<sub>Ed</sub>| [kNm]</th><th>R<sub>y,Ed</sub> [kN]</th>${Object.keys(an.res[s]).map(k => `<th>R<sub>k</sub> ${esc(an.res[s][k].c.id)}</th>`).join('')}<th>EQU R<sub>min</sub> [kN]</th></tr>`;
  md.systems[s].forEach(p => {
    const r = ev.R[p.id] || {}; const eq = (R.equ || []).find(z => z.id === p.id && z.etap === s);
    h += `<tr><td><b>${esc(p.id)}</b>${p.tymcz ? ' (tymcz.)' : ''}</td><td class="n">${U.fmt(p.x / 1000, 2)}</td><td class="n">${kN(r.max)}</td><td class="n">${kN(r.min)}</td><td class="n">${kNm(r.Mmax || 0)}</td><td class="n">${kN(r.Rymax || 0)}</td>${Object.keys(an.res[s]).map(k => { const q = an.res[s][k].tot.R[p.id]; return `<td class="n">${q ? kN(q.R) : '—'}</td>`; }).join('')}<td class="n"${eq && eq.Rmin < 0 ? ' style="color:var(--fail);font-weight:700"' : ''}>${eq ? kN(eq.Rmin) : '—'}</td></tr>`;
  });
  h += '</table><p class="hint">R<sub>k</sub> – reakcje charakterystyczne od przypadków (z historią etapów); dodatnie – docisk. EQU – γ<sub>G,sup</sub> = 1,10 / γ<sub>G,inf</sub> = 0,90 dla części G w segmentach, zmienne niekorzystne γ<sub>Q</sub> = 1,5.</p></div>';
  // wykresy od przypadków
  h += '<details class="box"><summary><b>Wykresy charakterystyczne od poszczególnych przypadków</b></summary>';
  Object.keys(an.res[s]).forEach(k => { const r = an.res[s][k]; h += D.plot({ xs: an.xs, L: md.L, width: 900, height: 150, sup, title: `${r.c.id} – ${r.c.nazwa}: M_k [kNm]`, scale: 1e-6, series: [{ y: r.tot.M, col: D.loadColor(r.c), fill: true }] }); });
  h += '</details>';
  return h;
};

/* ---------------------------------------------------------- stateczność */
V.ltb = function (S, R, o) {
  if (!R || !R.md) return noRes(R);
  const md = R.md, s = o.etap, L = R.ltb[s];
  let h = `<div class="bar"><b class="h2" style="margin:0">Zwichrzenie i interakcja – ${esc(md.etapy[s].nazwa)}</b><span class="sp"></span>${o.stageSeg}</div>`;
  if (!L) return h + '<p class="hint">Brak momentów zginających w tym etapie.</p>';
  h += `<div class="box">${D.scheme(S, md, { etap: s, width: 900 })}</div>`;
  h += `<div class="msg inf">Metoda: χ<sub>LT</sub> wg ${L.met === '6.3.2.3' ? '6.3.2.3 (kształtowniki walcowane i spawane równoważne), λ̄<sub>LT,0</sub> = ' + U.fmt(+R.ndp.lamLT0, 2) + ', β = ' + U.fmt(+R.ndp.betaLT, 2) : '6.3.2.2 (przypadek ogólny)' }. M<sub>cr</sub> – MES (4 st. swobody w węźle: u, u′, φ, φ′; ${md.xl.length - 1} elementów) dla rozkładu M<sub>y</sub> z kombinacji SGN; α<sub>cr</sub> dotyczy całej belki, M<sub>cr,seg</sub> = α<sub>cr</sub>·|M<sub>Ed,max,seg</sub>|.</div>`;
  h += `<div class="box"><h4>Kombinacje analizowane (najbardziej wytężające segmenty)</h4><table class="grid"><tr><th>Kombinacja</th><th>α<sub>cr</sub></th><th>|M<sub>Ed</sub>|<sub>max</sub> [kNm]</th></tr>${L.runs.map(r => `<tr><td>${esc(r.combo.opis)}</td><td class="n">${r.err ? '<span style="color:var(--fail)">' + esc(r.err) + '</span>' : r.lam === Infinity ? '∞' : U.fmt(r.lam, 3)}</td><td class="n">${kNm(Math.max(...Array.from(r.E.M).map(Math.abs)))}</td></tr>`).join('')}</table></div>`;
  h += `<div class="box"><h4>Segmenty zwichrzeniowe</h4><table class="grid"><tr><th>Segment [m]</th><th>|M<sub>Ed</sub>| [kNm]</th><th>M<sub>cr</sub> [kNm]</th><th>λ̄<sub>LT</sub></th><th>krzywa</th><th>χ<sub>LT</sub></th><th>k<sub>c</sub> / f</th><th>χ<sub>LT,mod</sub></th><th>M<sub>b,Rd</sub> [kNm]</th><th>wytężenie</th></tr>`;
  L.segs.forEach(g => {
    if (g.brak) { h += `<tr><td>${U.fmt(g.sg.x0 / 1000, 2)}–${U.fmt(g.sg.x1 / 1000, 2)}</td><td colspan="9" class="hint">brak momentu</td></tr>`; return; }
    const l = g.ltb;
    h += `<tr><td>${U.fmt(g.sg.x0 / 1000, 2)}–${U.fmt(g.sg.x1 / 1000, 2)}${g.sg.free ? ' (wspornik)' : ''}</td><td class="n">${kNm(g.sh.mabs)} ${g.Mpos ? '(+)' : '(−)'}</td><td class="n">${g.Mcr === Infinity ? '∞' : kNm(g.Mcr)}</td><td class="n">${U.fmt(g.lam, 3)}</td><td class="n">${l.curve} (α = ${U.fmt(l.alLT, 2)})</td><td class="n">${U.fmt(l.chi, 3)}</td><td class="n">${l.skip ? '—' : U.fmt(l.kc, 3) + ' / ' + U.fmt(l.f, 3)}</td><td class="n">${U.fmt(l.chimod, 3)}${l.skip ? ' <span class="hint">(λ̄ ≤ λ̄₀)</span>' : ''}</td><td class="n">${kNm(g.Mb)}</td><td>${V.ub(g.u, g.u > 1 ? 'fail' : 'ok')}</td></tr>`;
    if (l.kcSrc) h += `<tr><td></td><td colspan="9" class="hint">${esc(l.kcSrc)} · ${esc(g.combo.opis)}</td></tr>`;
  });
  h += '</table></div>';
  const gov = L.runs.filter(r => r.mode).sort((a, b) => a.lam - b.lam)[0];
  if (gov && gov.lam <= 100) h += `<div class="box">${D.mode(gov.mode, md.L, md.systems[s].map(p => p.x), { width: 900, title: `Postać zwichrzenia – α_cr = ${U.fmt(gov.lam, 3)} (${gov.combo.opis.slice(0, 80)})` })}</div>`;
  else if (gov) h += `<div class="msg inf">α<sub>cr</sub> = ${U.fmt(gov.lam, 1)} > 100 – zwichrzenie praktycznie wykluczone (np. ściskany pas stężony ciągle); postaci własnej nie pokazano.</div>`;
  if (L.inter.length) {
    h += `<div class="box"><h4>Interakcja N + M<sub>y</sub> + M<sub>z</sub> (6.3.3, zał. B)</h4><table class="grid"><tr><th>Segment</th><th>N<sub>Ed</sub> [kN]</th><th>M<sub>y</sub> / M<sub>z</sub> [kNm]</th><th>χ<sub>y</sub> / χ<sub>z</sub> / χ<sub>T</sub></th><th>χ<sub>LT</sub></th><th>C<sub>my</sub> / C<sub>mz</sub> / C<sub>mLT</sub></th><th>k<sub>yy</sub> / k<sub>yz</sub> / k<sub>zy</sub> / k<sub>zz</sub></th><th>(6.61)</th><th>(6.62)</th></tr>`;
    L.inter.forEach(it => { h += `<tr><td>${U.fmt(it.sg.x0 / 1000, 2)}–${U.fmt(it.sg.x1 / 1000, 2)}</td><td class="n">${kN(it.Nc)}</td><td class="n">${kNm(it.My)} / ${kNm(it.Mz)}</td><td class="n">${[it.chiy, it.chiz, it.chiT].map(v => U.fmt(v, 3)).join(' / ')}</td><td class="n">${U.fmt(it.chiLT, 3)}</td><td class="n">${[it.Cmy, it.Cmz, it.CmLT].map(v => U.fmt(v, 3)).join(' / ')}</td><td class="n">${[it.kyy, it.kyz, it.kzy, it.kzz].map(v => U.fmt(v, 3)).join(' / ')}</td><td>${V.ub(it.u61, it.u61 > 1 ? 'fail' : 'ok')}</td><td>${V.ub(it.u62, it.u62 > 1 ? 'fail' : 'ok')}</td></tr>`; });
    h += '</table></div>';
  }
  return h;
};

/* ---------------------------------------------------------- podpory i połączenia */
V.sup = function (S, R) {
  if (!R || !R.md) return noRes(R);
  let h = '<div class="h2">Podpory, oparcia i połączenia</div>';
  (R.podpory || []).forEach(p => {
    h += `<div class="box" style="margin-bottom:14px"><h4>Podpora ${esc(p.id)}${p.tymcz ? ' (tymczasowa)' : ''} – x = ${U.fmt(p.x / 1000, 2)} m · ${esc(({ przegub: 'przegubowa', utwierdzenie: 'utwierdzenie', sprezyna: 'sprężysta', podatne: 'podatna' })[p.typ] || p.typ)} · węzeł: ${esc(({ brak: 'oparcie na elemencie stalowym', oparcie: 'oparcie na płycie', blacha_czolowa: 'krótka blacha czołowa', blacha_zebrowa: 'blacha żebrowa' })[(p.wezel || {}).typ] || '—')}</h4><div class="flex">`;
    h += `<div>${D.joint(R.sec, p.wezel || {})}</div><div style="flex:1 1 380px">`;
    h += `<table class="kv"><tr><td>R<sub>Ed,max</sub> (SGN, etap ${p.etapMax + 1})</td><td>${kN(p.Rmax)}</td><td>kN</td></tr><tr><td>|M<sub>Ed</sub>| nad podporą</td><td>${kNm(p.Mmax)}</td><td>kNm</td></tr>${p.equ.map(e => `<tr><td>EQU R<sub>min</sub> – etap ${e.etap + 1}</td><td${e.Rmin < 0 ? ' style="color:var(--fail)"' : ''}>${kN(e.Rmin)}</td><td>kN${e.Rmin < 0 ? ' (odrywanie)' : ''}</td></tr>`).join('')}</table>`;
    h += `<table class="grid" style="margin-top:6px"><tr><th>Przypadek (wart. char., etap ${p.eK + 1})</th><th>R<sub>k</sub> [kN]</th></tr>${p.Rk.map(r => `<tr><td>${esc(r.id)} – ${esc(r.nazwa)}</td><td class="n">${kN(r.R)}</td></tr>`).join('')}</table>`;
    h += '</div></div>';
    if (p.checks.length) {
      h += `<table class="ctab" style="margin-top:8px"><thead><tr><th>Sprawdzenie</th><th>Punkt normy</th><th class="val">E<sub>d</sub></th><th class="val">R<sub>d</sub></th><th>Wykorzystanie</th><th>Status</th></tr></thead><tbody>`;
      p.checks.forEach(c => { h += `<tr class="${c.status === 'fail' ? 'fail' : ''}"><td>${esc(c.n)}${c.f ? `<div class="hint">${esc(c.f)}</div>` : ''}${c.note ? `<div class="hint">${esc(c.note)}</div>` : ''}</td><td class="ref">${esc(c.ref)}</td><td class="val">${V.unitFmt(c.Ed, c.unit)}</td><td class="val">${V.unitFmt(c.Rd, c.unit)}</td><td>${V.ub(c.util, c.status)}</td><td>${V.stBadge(c.status)}</td></tr>`; });
      h += '</tbody></table>';
    }
    if (p.pol && p.pol.uwagi.length) h += p.pol.uwagi.map(u => `<div class="msg wrn">${esc(u)}</div>`).join('');
    h += '</div>';
  });
  return h;
};

/* ---------------------------------------------------------- podsumowanie */
V.sum = function (S, R) {
  if (!R) return '';
  let h = '';
  if (R.checks && R.checks.length) {
    const card = (t, c, sub) => { if (!c) return ''; return `<div class="card ${c.status}"><div class="t">${t}</div><div class="v">${c.util === null ? V.unitFmt(c.Ed, c.unit) : U.pct(c.util)}</div><div class="s">${sub || esc(c.n)}</div></div>`; };
    const maxOf = (f) => R.checks.filter(c => !c.info && f(c)).reduce((m, c) => (!m || (c.util || 0) > (m.util || 0) ? c : m), null);
    h += '<div class="cards">';
    h += card('Nośność przekroju', maxOf(c => c.grp.startsWith('SGN – nośność')));
    h += card('Stateczność', maxOf(c => c.grp.startsWith('SGN – stateczność')));
    h += card('Środnik (1-5)', maxOf(c => c.grp.startsWith('PN-EN 1993-1-5')));
    h += card('Ugięcia / drgania', maxOf(c => c.grp.startsWith('SGU')));
    h += card('Podpory i połączenia', maxOf(c => c.grp.startsWith('Podpory')));
    h += card('Pożar', maxOf(c => c.grp.startsWith('Pożar')));
    h += card('Zmęczenie', maxOf(c => c.grp.startsWith('Zmęczenie')));
    h += card('Kruche pękanie', maxOf(c => c.grp.startsWith('Kruche')));
    if (R.exc) h += `<div class="card"><div class="t">Klasa wykonania</div><div class="v">${R.exc.exc}</div><div class="s">PN-EN 1090-2</div></div>`;
    if (R.norm) h += `<div class="card ${R.norm.bledy.length ? 'fail' : R.norm.ostrz.length ? 'warn' : 'ok'}"><div class="t">Profil normowy</div><div class="v">${R.norm.genStosowana}. gen.</div><div class="s">${R.norm.dokumenty.length} dok. · ${R.norm.dokumenty.filter(d => d.zweryfikowano).length} zweryf.</div></div>`;
    h += '</div>';
  }
  (R.errors || []).forEach(e => { h += `<div class="msg err">${esc(e)}</div>`; });
  (R.warnings || []).forEach(e => { h += `<div class="msg wrn">${esc(e)}</div>`; });
  (R.info || []).forEach(e => { h += `<div class="msg inf">${esc(e)}</div>`; });
  if (!R.checks || !R.checks.length) return h;
  h += `<table class="ctab"><thead><tr><th>Sprawdzenie</th><th>Punkt normy</th><th class="val">E<sub>d</sub></th><th class="val">R<sub>d</sub> / granica</th><th>Wykorzystanie</th><th>Status</th><th>Miejsce, kombinacja</th></tr></thead><tbody>`;
  let g0 = '';
  R.checks.forEach(c => {
    if (c.grp !== g0) { g0 = c.grp; h += `<tr class="g"><td colspan="7">${esc(g0)}</td></tr>`; }
    h += `<tr class="${c.status === 'fail' ? 'fail' : ''}"><td>${esc(c.n)}</td><td class="ref">${esc(c.ref || '')}</td><td class="val">${c.unit === '-' && c.Rd === 1 ? '' : V.unitFmt(c.Ed, c.unit)}</td><td class="val">${c.unit === '-' && c.Rd === 1 ? '' : V.unitFmt(c.Rd, c.unit)}${c.lim ? ` <span class="hint">(${esc(c.lim)})</span>` : ''}</td><td>${c.info ? '<span class="hint">informacyjnie</span>' : V.ub(c.util, c.status)}</td><td>${c.info ? V.stBadge('info') : V.stBadge(c.status)}</td><td class="nt">${c.x !== undefined && c.x !== null ? `x = ${U.fmt(c.x / 1000, 2)} m; ` : ''}${esc(c.combo || '')}</td></tr>`;
  });
  h += '</tbody></table>';
  return h;
};

/* ---------------------------------------------------------- raport */
V.report = function (S, R) {
  let h = `<div class="rtools noprint"><span class="hint">Raport pełny: profil normowy, założenia, analiza, wszystkie sprawdzenia z tokiem obliczeń, wymagania wykonawcze i dane do odtworzenia (SHA-256).</span><button class="btn" data-act="json">Zapisz dane (.belkastal)</button><button class="btn" data-act="exporthtml">Zapisz raport HTML…</button><button class="btn pri" data-act="print">Drukuj / zapisz PDF</button></div>`;
  if (!R || R.errors && R.errors.length) return h + (R ? R.errors.map(e => `<div class="msg err">${esc(e)}</div>`).join('') : '');
  h += `<div id="report">${BS.Raport.build(S, R)}</div>`;
  return h;
};

})(typeof globalThis !== 'undefined' ? globalThis : this);
