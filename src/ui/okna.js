/* =====================================================================
   BelkaStal – okna (jak w BelkaŻB): obciążenia (całej belki, zaznaczonych
   przęseł, jednego przypadku), podpora z oparciem / połączeniem (wymiary
   blach, śruby, spoiny – szkic i sprawdzenia na bieżąco), przekrój
   (klikane strefy), tablica kształtowników, stężenia, etapy i podpory
   montażowe, węzeł (dwuklik na belce), schematy typowe, śnieg,
   objaśnienia punktów normy, „jak obliczono”, przejście do miejsca
   sprawdzenia („pokaż →”).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, N = BS.N, P = BS.P, M = BS.M, D = BS.D, Q = BS.Q, A = BS.A;
const { $, $$, esc, fmt, sym, setP, getP, parseNum, showNum, exDetails } = Q;
const S = () => A.S(), R = () => A.R();
const RODZ = () => BS.S.RODZAJE;
const closeM = () => { A.setPopRedraw(null); Q.closeModal(); };
const unitFmt = (v, u) => (v === null || v === undefined || !isFinite(v)) ? '—' : u === 'M' ? fmt(v / 1e6, 2) + ' kNm' : u === 'F' ? fmt(v / 1e3, 2) + ' kN' : u === 'q' ? fmt(v, 1) + ' N/mm' : u === 'mm' ? fmt(v, 1) + ' mm' : u === 'Hz' ? fmt(v, 2) + ' Hz' : u === 'C' ? fmt(v, 0) + ' °C' : u === 'min' ? fmt(v, 0) + ' min' : u === 'MPa' ? fmt(v, 1) + ' MPa' : fmt(v, 3);
A.unitFmt = unitFmt;
const pct = (u) => (u === null || u === undefined) ? '—' : isFinite(u) ? fmt(u * 100, 0) + '%' : '∞';
const STL = { ok: 'spełniony', warn: 'uwaga', fail: 'NIE spełniony', info: 'informacyjnie' };
A.STL = STL;
const utilBar = (c) => { if (c.info || c.util === null || c.util === undefined) return `<span class="hint" style="margin:0">${c.info ? 'inf.' : '—'}</span>`; const u = isFinite(c.util) ? c.util : 9.99; const w = Math.min(100, u * 100); return `<span class="ubar ${c.status}"><i style="width:${w.toFixed(0)}%"></i></span> <b>${pct(c.util)}</b>`; };
A.utilBar = utilBar;
const ckCond = (c) => { if (c.Rd === null || c.Rd === undefined) return c.Ed !== undefined && c.Ed !== null ? unitFmt(c.Ed, c.unit) : ''; if (c.unit === '-' && c.Rd === 1) return fmt(c.Ed, 3) + ' ≤ 1,0'; return `${unitFmt(c.Ed, c.unit)} ${c.inverse ? '≥' : '≤'} ${unitFmt(c.Rd, c.unit)}`; };
A.ckCond = ckCond;
function checksHTML(cs) {
  if (!cs || !cs.length) return '<p class="hint">Brak sprawdzeń.</p>';
  return `<div class="tscroll"><table class="ctab"><tbody>${cs.map(c => `<tr><td>${esc(c.n)}</td><td class="ref"><button class="nref" data-nref="${esc(c.id)}" type="button">${esc(c.ref || '')}</button></td><td class="val">${ckCond(c)}</td><td class="bar" style="white-space:nowrap">${utilBar(c)}</td><td class="stc"><span class="st ${c.info ? 'info' : c.status}">${STL[c.info ? 'info' : c.status]}</span></td></tr>`).join('')}</tbody></table></div>`;
}
A.checksHTML = checksHTML;
function bindNref(root) { $$('[data-nref]', root).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const c = (R().checks || []).find(q => q.id === b.dataset.nref); if (c) A.explainPopup(c); })); }
A.bindNref = bindNref;
// pole liczbowe okna (z listą ▾ wartości typowych): k – ścieżka w stanie
const fNum = (k, l, u, list, o) => { o = o || {}; const v = getP(S(), k); return `<div class="row"><label>${sym(l)}</label><div class="combo"><input data-k="${k}" value="${esc(showNum(v))}" data-min="${o.min !== undefined ? o.min : ''}" data-max="${o.max !== undefined ? o.max : ''}" data-opt="${o.opt ? 1 : ''}" data-re="${o.re ? 1 : ''}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} autocomplete="off" spellcheck="false"><button tabindex="-1" type="button" data-list="${esc(JSON.stringify(list || []))}" aria-label="lista">▾</button></div><span class="unit">${u || ''}</span></div>`; };
const fSel = (k, l, opts, o) => { o = o || {}; const v = getP(S(), k); return `<div class="row ${o.wide ? 'wide' : ''}"><label>${sym(l)}</label><select data-k="${k}" data-num="${o.num ? 1 : ''}" data-re="${o.re === false ? '' : 1}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(v) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${o.wide ? '' : '<span></span>'}</div>`; };
const fChk = (k, l, o) => `<label class="chk"><input type="checkbox" data-k="${k}" data-re="${(o || {}).re === false ? '' : 1}" ${getP(S(), k) ? 'checked' : ''}><span>${sym(l)}</span></label>`;
A.fNum = fNum; A.fSel = fSel; A.fChk = fChk;

/* ================================================================ OBCIĄŻENIA */
const KINDS = [['G', 'stałe'], ['Q', 'użytkowe'], ['S', 'śnieg'], ['W', 'wiatr'], ['Qc', 'montażowe'], ['M', 'urządzenia'], ['A', 'wyjątkowe']];
const QCAT = () => Object.keys(N.PSI).filter(k => /^Q-/.test(k)).map(k => [k, N.PSI[k].n]);
const WYS = [['pas_g', 'na pasie górnym'], ['srodek', 'w środku ścinania'], ['pas_d', 'na pasie dolnym']];
function nextId(r) { const L = S().obciazenia; let n = 1; while (L.some(o => o.id === r + n)) n++; return r + n; }
function spanRange(segIdx) { const md = R().md, sg = md.seg[segIdx]; return [sg.x0 / 1000, sg.x1 / 1000]; }
function inScope(o, tg) {
  if (tg.all) return true;
  if (tg.focus !== undefined) return S().obciazenia[tg.focus] === o;
  if (!tg.segs) return true;
  const rs = tg.segs.map(spanRange), L = R().md.L / 1000;
  return (o.sklad || []).some(k => { if (k.typ === 'q') { const a = U.num(k.x0), b = k.x1 === '' || k.x1 === undefined ? L : U.num(k.x1); return rs.some(([p, q]) => a < q - 1e-6 && b > p + 1e-6 && !(a <= 1e-6 && b >= L - 1e-6)); } const x = U.num(k.x); return rs.some(([p, q]) => x >= p - 1e-6 && x <= q + 1e-6); });
}
const wholeBeam = (o) => (o.sklad || []).some(k => k.typ === 'q' && U.num(k.x0) <= 1e-6 && (k.x1 === '' || k.x1 === undefined || U.num(k.x1) >= R().md.L / 1000 - 1e-6));
function loadCard(o, i) {
  const st = S(), md = R().md, rz = RODZ()[o.rodzaj] || {}, col = D.KC[o.rodzaj] || '#6a3fb5', key = i;
  const inp = (f, cls, ph) => `<input class="txt ${cls || ''}" data-lo="${key}.${f}" value="${esc(showNum(o[f]))}" ${ph ? `placeholder="${esc(ph)}"` : ''} spellcheck="false" autocomplete="off">`;
  const cin = (j, f, cls, ph) => `<input class="txt ${cls || ''}" data-lc="${key}.${j}.${f}" value="${esc(showNum(o.sklad[j][f]))}" ${ph ? `placeholder="${esc(ph)}"` : ''} spellcheck="false" autocomplete="off">`;
  const csel = (j, f, opts) => `<select data-lc="${key}.${j}.${f}">${opts.map(([a, b]) => `<option value="${a}" ${String(o.sklad[j][f] || opts[0][0]) === String(a) ? 'selected' : ''}>${b}</option>`).join('')}</select>`;
  let h = `<div class="litem" data-lidx="${i}" style="border-left-color:var(--sv-${col.slice(1)}, ${col})"><div class="lrow top"><label class="chk sm" title="Uwzględnij w obliczeniach"><input type="checkbox" data-lon="${i}" ${o.aktywne === false ? '' : 'checked'}><span></span></label><span class="lid">${esc(o.id)}</span><input class="txt lname" data-lo="${key}.nazwa" value="${esc(o.nazwa)}" placeholder="nazwa" spellcheck="false"><button class="del" data-ldel="${i}" title="Usuń przypadek obciążenia" type="button">×</button></div>`;
  h += `<div class="lrow"><select data-los="${key}.rodzaj">${Object.keys(RODZ()).filter(k => k !== 'T').map(k => `<option value="${k}" ${k === o.rodzaj ? 'selected' : ''}>${esc(RODZ()[k].n)}</option>`).join('')}</select>${o.rodzaj === 'Q' ? `<select data-los="${key}.kat">${QCAT().map(([a, b]) => `<option value="${a}" ${a === (o.kat || 'Q-B') ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>` : ''}${md.nE > 1 ? `<select data-los="${key}.etap" data-num="1" title="Etap, w którym obciążenie działa (stałe – od tego etapu)">${md.etapy.map((e, s) => `<option value="${s}" ${U.num(o.etap) === s ? 'selected' : ''}>etap ${s + 1}: ${esc(e.nazwa.slice(0, 28))}</option>`).join('')}</select>` : ''}</div>`;
  if (!rz.stale && o.rodzaj !== 'A') h += `<div class="lrow"><select data-los="${key}.uklad" title="Układ obciążenia zmiennego w przęsłach"><option value="staly" ${o.uklad !== 'szachownica' ? 'selected' : ''}>w całości (jednocześnie wszędzie)</option><option value="szachownica" ${o.uklad === 'szachownica' ? 'selected' : ''}>niekorzystnie w przęsłach (szachownica)</option></select><span title="Przypadki o tej samej nazwie grupy wykluczają się (nie działają jednocześnie)">grupa wykluczeń</span>${inp('wyklucz', 'sm', '—')}</div>`;
  (o.sklad || []).forEach((k, j) => {
    if (k.typ === 'q') h += `<div class="lrow pt"><span>q<sub>${o.rodzaj === 'A' ? 'd' : 'k'}</sub></span>${cin(j, 'q0')}<span>→</span>${cin(j, 'q1', 'sm', '=')}<span class="u">kN/m</span><span>od</span>${cin(j, 'x0', 'sm', '0')}<span>do</span>${cin(j, 'x1', 'sm', 'L')}<span class="u">m</span>${csel(j, 'kier', [['z', 'pionowo ↓'], ['y', 'poziomo (y)']])}${(k.kier || 'z') === 'z' ? csel(j, 'wys', WYS) : ''}<button class="del sm" data-cdel="${i}.${j}" title="Usuń składnik" type="button">×</button></div>`;
    else if (k.typ === 'P') h += `<div class="lrow pt"><span>P<sub>${o.rodzaj === 'A' ? 'd' : 'k'}</sub></span>${cin(j, 'P')}<span class="u">kN</span><span>x</span>${cin(j, 'x', 'sm')}<span class="u">m</span>${csel(j, 'kier', [['z', 'pionowo ↓'], ['y', 'poziomo (y)']])}${(k.kier || 'z') === 'z' ? csel(j, 'wys', WYS) : ''}<span title="Długość docisku s_s siły skupionej (sprawdzenie środnika – PN-EN 1993-1-5, 6)">s<sub>s</sub></span>${cin(j, 'ss', 'sm', '0')}<span class="u">mm</span><button class="del sm" data-cdel="${i}.${j}" title="Usuń składnik" type="button">×</button></div>`;
    else h += `<div class="lrow pt"><span>M<sub>k</sub></span>${cin(j, 'M')}<span class="u">kNm</span><span>x</span>${cin(j, 'x', 'sm')}<span class="u">m</span><span class="lx">(+ zgodnie z ruchem wskazówek zegara)</span><button class="del sm" data-cdel="${i}.${j}" title="Usuń składnik" type="button">×</button></div>`;
  });
  h += `<div class="lrow"><button class="addp" data-cadd="${i}.q" type="button">+ obciążenie ciągłe</button><button class="addp" data-cadd="${i}.P" type="button">+ siła skupiona</button><button class="addp" data-cadd="${i}.M" type="button">+ moment skupiony</button><span>N</span>${inp('N', 'sm', '0')}<span class="u" title="Siła podłużna (+ rozciąga), stała na długości belki">kN</span></div>`;
  if (!rz.stale && o.rodzaj !== 'A') { const p = BS.K.psi(o); h += `<div class="lpsi">ψ₀ = ${fmt(p[0], 1)} · ψ₁ = ${fmt(p[1], 1)} · ψ₂ = ${fmt(p[2], 1)} (PN-EN 1990, tabl. A1.1)</div>`; }
  return h + '</div>';
}
A.loadPopup = function (tg) {
  tg = tg || { all: true };
  const m = $('#modal');
  const draw = () => {
    const st = S(), r = R(); if (!r || !r.md) { Q.toast('Najpierw usuń błędy geometrii.'); return; }
    const md = r.md, segs = (tg.segs || []).filter(i => md.seg[i]);
    let title, sub;
    if (tg.focus !== undefined) { const o = st.obciazenia[tg.focus]; if (!o) { closeM(); return; } title = `${o.id} – ${o.nazwa || RODZ()[o.rodzaj].n}`; sub = 'Położenia x mierzone od lewego końca belki.'; }
    else if (segs.length) { title = segs.map(i => md.seg[i].n).join(', '); sub = `Nowe obciążenie ciągłe obejmie ${segs.length > 1 ? 'zaznaczone przęsła' : 'zaznaczone przęsło'} (x = ${segs.map(i => `${fmt(md.seg[i].x0 / 1000, 2)}–${fmt(md.seg[i].x1 / 1000, 2)}`).join('; ')} m). Położenia od lewego końca belki.`; }
    else { title = 'cała belka'; sub = `Długość belki L = ${fmt(md.L / 1000, 2)} m; położenia od lewego końca belki (pola „od / do” – obciążenie części belki).`; }
    let h = `<div class="dlg fpop lpop"><h3>Obciążenia – ${esc(title)}</h3><p class="hint">${sub} Wartości charakterystyczne (wyjątkowe – obliczeniowe A<sub>d</sub>). Wysokość przyłożenia obciążenia wpływa na moment krytyczny zwichrzenia M<sub>cr</sub>.</p>`;
    if (tg.focus === undefined) h += `<div class="addbar"><span>Dodaj:</span>${KINDS.map(([k, l]) => `<button class="addb" data-ladd="${k}" type="button">+ ${l}</button>`).join('')}</div>`;
    const own = st.obciazenia.map((o, i) => [o, i]).filter(([o]) => segs.length ? inScope(o, { segs }) && !wholeBeam(o) : inScope(o, tg));
    h += `<div class="fields">${own.map(([o, i]) => loadCard(o, i)).join('') || '<p class="lnone">Brak obciążeń – dodaj je przyciskami powyżej.</p>'}</div>`;
    if (segs.length) { const all = st.obciazenia.map((o, i) => [o, i]).filter(([o]) => wholeBeam(o)); if (all.length) h += `<h4 class="lsec">Obciążenia całej belki (obejmują też zaznaczone przęsła)</h4><div class="fields">${all.map(([o, i]) => loadCard(o, i)).join('')}</div>`; }
    if (st.ciezarWlasny.auto !== false && r.sec) h += `<p class="hint">Ciężar własny belki G₀ = ${fmt(r.sec.gk * (1 + U.num(st.ciezarWlasny.dodatek) / 100), 3)} kN/m dodawany automatycznie (pole wyboru pod schematem).</p>`;
    h += `<div class="dbtn">${tg.focus !== undefined ? '<button class="btn" id="lAll" type="button">Wszystkie obciążenia…</button><span class="sp"></span>' : ''}<button class="btn pri" id="nClose" type="button">Zamknij</button></div></div>`;
    const keep = $('.dlg.lpop', m) ? $('.dlg.lpop', m).scrollTop : 0;
    m.innerHTML = h; m.style.display = 'flex'; $('.dlg.lpop', m).scrollTop = keep;
    if (tg.focus !== undefined && !keep) { const it = $(`.litem[data-lidx="${tg.focus}"]`, m); if (it) it.classList.add('focus'); }
    bindLoads(m, draw, segs);
    $('#nClose', m).onclick = closeM;
    const la = $('#lAll', m); if (la) la.onclick = () => A.loadPopup({ all: true });
  };
  A.setPopRedraw(null);
  draw();
};
function bindLoads(m, draw, segs) {
  const st = S(), L = st.obciazenia;
  const numOrEmpty = (v) => { const t = String(v).trim(); return t === '' ? '' : parseNum(t); };
  $$('[data-lo]', m).forEach(el => el.addEventListener('input', () => {
    const [i, f] = el.dataset.lo.split('.'), o = L[+i];
    if (f === 'nazwa' || f === 'wyklucz') o[f] = el.value; else { const v = numOrEmpty(el.value); el.classList.toggle('bad', v === null); if (v === null) return; o[f] = v === '' ? 0 : v; }
    A.changed(false);
  }));
  $$('[data-los]', m).forEach(el => el.addEventListener('change', () => {
    const [i, f] = el.dataset.los.split('.'), o = L[+i];
    o[f] = el.dataset.num ? +el.value : el.value;
    if (f === 'rodzaj') { if (o.rodzaj === 'Q' && !o.kat) o.kat = 'Q-B'; if (RODZ()[o.rodzaj].stale) o.uklad = 'staly'; }
    A.changed(false); draw();
  }));
  $$('[data-lc]', m).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
    const [i, j, f] = el.dataset.lc.split('.'), k = L[+i].sklad[+j];
    if (el.tagName === 'SELECT') { k[f] = el.value; A.changed(false); draw(); return; }
    const v = numOrEmpty(el.value), canEmpty = f === 'q1' || f === 'x1';
    const bad = v === null || (v === '' && !canEmpty);
    el.classList.toggle('bad', bad); if (bad) return;
    k[f] = v; A.changed(false);
  }));
  $$('[data-lon]', m).forEach(cb => cb.addEventListener('change', () => { L[+cb.dataset.lon].aktywne = cb.checked; A.changed(false); }));
  $$('[data-ldel]', m).forEach(b => b.addEventListener('click', () => { L.splice(+b.dataset.ldel, 1); A.changed(true); draw(); }));
  $$('[data-cdel]', m).forEach(b => b.addEventListener('click', () => { const [i, j] = b.dataset.cdel.split('.').map(Number); L[i].sklad.splice(j, 1); if (!L[i].sklad.length) L.splice(i, 1); A.changed(false); draw(); }));
  $$('[data-cadd]', m).forEach(b => b.addEventListener('click', () => {
    const [i, t] = b.dataset.cadd.split('.'), o = L[+i], md = R().md, sg = segs && segs.length ? md.seg[segs[0]] : null;
    const xm = sg ? (sg.x0 + sg.x1) / 2000 : md.L / 2000;
    o.sklad.push(t === 'q' ? { typ: 'q', q0: 1, q1: '', x0: sg ? +(sg.x0 / 1000).toFixed(3) : 0, x1: sg ? +(sg.x1 / 1000).toFixed(3) : '', kier: 'z', wys: 'pas_g' } : t === 'P' ? { typ: 'P', P: 10, x: +xm.toFixed(3), kier: 'z', wys: 'pas_g', ss: 0 } : { typ: 'M', M: 10, x: +xm.toFixed(3) });
    A.changed(false); draw();
  }));
  $$('[data-ladd]', m).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.ladd, md = R().md, fin = md.nE - 1;
    const sk = segs && segs.length ? segs.map(i => ({ typ: 'q', q0: k === 'G' ? 5 : 3, q1: '', x0: +(md.seg[i].x0 / 1000).toFixed(3), x1: +(md.seg[i].x1 / 1000).toFixed(3), kier: 'z', wys: 'pas_g' })) : [{ typ: 'q', q0: k === 'G' ? 5 : 3, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }];
    const nm = { G: 'Obciążenie stałe', Q: 'Obciążenie użytkowe', S: 'Śnieg', W: 'Wiatr', Qc: 'Obciążenie montażowe', M: 'Urządzenia', A: 'Oddziaływanie wyjątkowe' }[k];
    L.push({ id: nextId(k), nazwa: nm, rodzaj: k, kat: k === 'Q' ? 'Q-B' : undefined, etap: k === 'Qc' ? 0 : fin, uklad: k === 'Q' ? 'szachownica' : 'staly', wyklucz: '', N: 0, sklad: sk });
    A.changed(true); draw();
    const last = $$('.litem', m).pop(); if (last) { last.scrollIntoView({ block: 'nearest' }); last.classList.add('focus'); const f = $('[data-lc$=".q0"]', last); if (f) { f.focus(); f.select(); } }
  }));
}

/* ---------------------------------------------------------- śnieg (PN-EN 1991-1-3 z ZK) */
A.snowPopup = function () {
  const m = Q.modal(`<h3>Śnieg na dachu – PN-EN 1991-1-3 (ZK PL)</h3><p class="hint">s = μ<sub>i</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub>; s<sub>k</sub> wg strefy (ZK, rys. NB.1); obciążenie belki q = s·b (b – szerokość pasma zbierania, np. rozstaw belek).</p>
    <div class="zg"><span>Strefa</span><select id="snZ">${[1, 2, 3, 4, 5].map(z => `<option value="${z}" ${z === 2 ? 'selected' : ''}>${z}</option>`).join('')}</select><span>wysokość A</span><input class="txt" id="snA" value="200"><span>m n.p.m.</span></div>
    <div class="zg"><span>μ₁ (dach płaski 0–30°)</span><input class="txt" id="snMu" value="0,8"><span>C<sub>e</sub></span><input class="txt" id="snCe" value="1,0"><span>C<sub>t</sub></span><input class="txt" id="snCt" value="1,0"></div>
    <div class="zg"><span>pasmo b</span><input class="txt" id="snB" value="${esc(showNum(2))}"><span>m</span></div>
    <p id="snRes" class="hint"></p><div class="dbtn"><button class="btn" id="snC" type="button">Anuluj</button><button class="btn pri" id="snOk" type="button">Dodaj obciążenie śniegiem</button></div>`, 'fpop sm');
  const calc = () => {
    const z = +$('#snZ', m).value, Aa = parseNum($('#snA', m).value) || 0;
    const sk = z === 1 ? Math.max(0.7, 0.007 * Aa - 1.4) : z === 2 ? 0.9 : z === 3 ? Math.max(1.2, 0.006 * Aa - 0.6) : z === 4 ? 1.6 : Math.max(2.0, 0.93 * Math.exp(0.00134 * Aa));
    const s = (parseNum($('#snMu', m).value) || 0) * (parseNum($('#snCe', m).value) || 1) * (parseNum($('#snCt', m).value) || 1) * sk, q = s * (parseNum($('#snB', m).value) || 0);
    $('#snRes', m).innerHTML = `s<sub>k</sub> = ${fmt(sk, 2)} kN/m² → s = ${fmt(s, 3)} kN/m² → <b>q<sub>k</sub> = ${fmt(q, 2)} kN/m</b>`;
    return { sk, s, q, z };
  };
  $$('input, select', m).forEach(e => e.addEventListener('input', calc)); calc();
  $('#snC', m).onclick = Q.closeModal;
  $('#snOk', m).onclick = () => { const c = calc(); const st = S(); st.obciazenia.push({ id: nextId('S'), nazwa: `Śnieg – strefa ${c.z}, s = ${fmt(c.s, 2)} kN/m² × ${showNum(parseNum($('#snB', m).value))} m`, rodzaj: 'S', etap: (R().md ? R().md.nE - 1 : 0), uklad: 'szachownica', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: +c.q.toFixed(3), q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] }); Q.closeModal(); A.changed(true); };
};

/* ================================================================ PODPORA (oparcie, połączenie) */
const JDEF = (v, h) => ({
  oparcie: { podloze: 'beton', bp: 200, lp: 150, tp: 15, beton: 'C25/30', alfa: 1.5, lb: 150, fd: 2.0, beta: 1.2, zebro: false, bs: 70, ts: 10, ch: 15 },
  blacha_czolowa: { hp: Math.max(100, Math.round(0.65 * (h || 300) / 10) * 10), bp: 150, tp: 10, nr: 2, d: 'M16', kl: '8.8', e1: 40, p1: 70, e2: 30, p3: 90, a: 4, tsup: 12, fusup: 510, gwint: true },
  blacha_zebrowa: { hp: Math.max(100, Math.round(0.65 * (h || 300) / 10) * 10), tp: 10, n: 3, d: 'M20', kl: '8.8', e1: 40, p1: 70, e2: 40, z: 60, e2b: 40, a: 6, tsup: 12, fusup: 510, gwint: true },
  brak: { zebro: false, bs: 70, ts: 10, ch: 15 }
}[v] || {});
A.JDEF = JDEF;
const BOLTS = () => Object.keys(M.SRUBY).map(k => [k, k]), BKL = () => Object.keys(M.SRUBY_KL).map(k => [k, 'kl. ' + k]);
function jointFields(i, designer) {
  const st = S(), p = st.podpory[i], w = p.wezel || (p.wezel = { typ: 'brak' }), q = `podpory.${i}.wezel`, sec = R() && R().sec;
  const sub = (k, l) => `<div class="lsub" data-jz="${k}" data-js="${k}">${l}</div>`;
  let h = designer ? '' : fSel(q + '.typ', 'Oparcie / połączenie', [['brak', 'oparcie na elemencie stalowym (bez płyty)'], ['oparcie', 'płyta podporowa na betonie / murze'], ['blacha_czolowa', 'blacha czołowa (śruby do podpory)'], ['blacha_zebrowa', 'blacha żebrowa (śruby przez środnik)'], ['katowniki', 'kątowniki podwójne'], ['spawane', 'połączenie spawane']], { wide: true });
  if (w.typ === 'oparcie') {
    h += fSel(q + '.podloze', 'Podłoże', [['beton', 'beton (PN-EN 1992-1-1, 6.7)'], ['mur', 'mur (PN-EN 1996-1-1, 6.1.3)'], ['stal', 'element stalowy']], { wide: true });
    if (w.podloze !== 'stal') {
      h += sub('plate', 'Płyta podporowa') + fNum(q + '.bp', 'Szerokość płyty b_{p}', 'mm', [120, 150, 180, 200, 220, 250, 300], { min: 20 }) + fNum(q + '.lp', 'Długość oparcia l_{p}', 'mm', [80, 100, 120, 150, 180, 200, 250], { min: 20 }) + fNum(q + '.tp', 'Grubość płyty t_{p}', 'mm', [8, 10, 12, 15, 20, 25, 30], { min: 4 });
      if (w.podloze === 'beton') h += fSel(q + '.beton', 'Klasa betonu', Object.keys(M.BETON).map(k => [k, k])) + fNum(q + '.alfa', 'α = √(A_{c1}/A_{c0}) ≤ 3', '', [1, 1.5, 2, 2.5, 3], { min: 1, max: 3 });
      else h += fNum(q + '.fd', 'Wytrzymałość muru f_{d}', 'MPa', [1, 1.5, 2, 2.5, 3, 4], { min: 0.1 }) + fNum(q + '.beta', 'β – docisk skupiony (1,0–1,5)', '', [1, 1.2, 1.5], { min: 1, max: 1.5 });
    }
  }
  if (w.typ === 'oparcie' || w.typ === 'brak') {
    if (designer) h += sub('sup', 'Docisk środnika nad podporą') + fNum(`podpory.${i}.ss`, 'Długość docisku s_{s}', 'mm', [0, 50, 80, 100, 120, 150, 200], { min: 0 }) + fNum(`podpory.${i}.c`, 'Odległość docisku od końca belki c', 'mm', [0, 10, 20, 30, 50, 80, 100], { min: 0 });
    if (sec && (sec.kind === 'I' || sec.kind === 'U')) {
      h += fChk(q + '.zebro', 'Żebra podporowe (para żeber nad podporą)', { re: true });
      if (w.zebro) h += sub('stiff', 'Żebra podporowe') + fNum(q + '.bs', 'Szerokość żebra b_{s}', 'mm', [40, 50, 60, 70, 80, 90, 100, 120], { min: 20 }) + fNum(q + '.ts', 'Grubość żebra t_{s}', 'mm', [6, 8, 10, 12, 15, 20], { min: 4 }) + fNum(q + '.ch', 'Ścięcie naroża (spoina pas–środnik)', 'mm', [10, 15, 20, 25], { min: 0 });
    }
  }
  if (!designer && ['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes(w.typ)) {
    h += `<div class="lsub" data-jz="plate">Połączenie</div><p class="hint" style="margin:2px 0 6px">${esc(J.jointTxt(w, sec))}.</p><div class="row wide"><span></span><button class="btn pri sm" data-jdes="${i}" type="button">Projektowanie połączenia…</button></div>`;
  }
  return h;
}
A.jointFields = jointFields;
A.supportPopup = function (i, focus) {
  const m = $('#modal');
  const live = () => {
    const r = R(); if (!r || !r.md) return;
    const p = r.md.sup[i], rp = (r.podpory || []).find(q => q.id === (p && p.id)), sk = $('#spSk', m), ck = $('#spCk', m), rr = $('#spR', m);
    if (sk && r.sec) { const w0 = S().podpory[i].wezel || {}; sk.innerHTML = rp && rp.pol ? D.jointViews(r.sec, w0, rp.pol, { W: 350, H: 280 }).elev : D.joint(r.sec, w0, { W: 330, H: 250 }); Q.themeSvgIn(sk); bindSketch(); }
    if (ck) { ck.innerHTML = rp ? checksHTML(rp.checks) : '<p class="hint">Brak wyników (błąd danych).</p>'; bindNref(ck); }
    if (rr && rp) rr.innerHTML = `R<sub>Ed,max</sub> = <b>${fmt(rp.Rmax / 1e3, 1)} kN</b>${rp.Mmax > 1e3 ? ` · |M<sub>Ed</sub>| = ${fmt(rp.Mmax / 1e6, 1)} kNm` : ''} · reakcje charakterystyczne: ${rp.Rk.map(q => `${esc(q.id)} ${fmt(q.R / 1e3, 1)} kN`).join(', ')}`;
  };
  const bindSketch = () => { const sk = $('#spSk', m); if (!sk) return; if (['blacha_czolowa', 'blacha_zebrowa', 'katowniki', 'spawane'].includes((S().podpory[i].wezel || {}).typ)) { sk.style.cursor = 'pointer'; sk.title = 'Kliknij – okno projektowania połączenia'; sk.onclick = () => A.jointDesigner({ sup: i }); return; } sk.style.cursor = 'pointer'; sk.title = 'Kliknij blachę, śruby lub żebro – przejście do wymiarów'; sk.onclick = (ev) => { const r2 = sk.getBoundingClientRect(), x = ev.clientX - r2.left, y = ev.clientY - r2.top; const z = x < r2.width * 0.42 ? (y > r2.height * 0.75 ? 'sup' : 'plate') : 'bolts'; const t = $(`[data-jz="${z}"]`, m) || $('[data-jz]', m); if (t) { t.scrollIntoView({ block: 'center' }); Q.hlg(t.nextElementSibling || t); } }; };
  const draw = () => {
    const st = S(), r = R(); if (!r || !r.md || !st.podpory[i]) { closeM(); return; }
    const p = st.podpory[i], sp = r.md.sup[i], q = `podpory.${i}`;
    let h = `<div class="dlg fpop suppop" style="max-width:940px"><h3>Podpora ${esc(sp ? sp.id : i + 1)} – x = ${fmt(sp ? sp.x / 1000 : 0, 2)} m</h3>`;
    h += `<div class="spgrid" style="display:grid;grid-template-columns:minmax(320px,1fr) 360px;gap:16px;align-items:start"><div class="fields">`;
    h += `<div class="lsub">Warunki podparcia</div>` + fSel(q + '.typ', 'Rodzaj podpory', [['przegub', 'przegubowa'], ['utwierdzenie', 'utwierdzenie (węzeł sztywny)'], ['sprezyna', 'sprężysta (k_z, k_φ)'], ['podatne', 'przegub + sprężyna obrotowa k_φ']], { wide: true });
    if (p.typ === 'przegub') h += fChk(q + '.przesuwna', 'Przesuwna w kierunku osi belki (łożysko przesuwne)');
    if (p.typ === 'sprezyna') h += fNum(q + '.kz', 'Sztywność pionowa k_{z}', 'kN/mm', [1, 5, 10, 20, 50, 100], { min: 0 });
    if (p.typ === 'sprezyna' || p.typ === 'podatne') h += fNum(q + '.kfi', 'Sztywność obrotowa k_{φ}', 'kNm/rad', [0, 500, 1000, 5000, 10000, 50000], { min: 0 });
    h += fSel(q + '.ltb', 'Podparcie dla zwichrzenia', [['widelkowe', 'widełkowe (u = φ = 0, swobodne spaczenie)'], ['pelne', 'pełne utwierdzenie (u = u′ = φ = φ′ = 0)']], { wide: true });
    h += fNum(q + '.ss', 'Długość docisku s_{s}', 'mm', [0, 50, 80, 100, 120, 150, 200], { min: 0 }) + fNum(q + '.c', 'Odległość docisku od końca belki c', 'mm', [0, 10, 20, 30, 50, 80, 100], { min: 0 });
    h += jointFields(i);
    h += `</div><div><div id="spSk" class="fig" style="margin:0"></div><p class="hint" style="margin:0 0 4px">Kliknij blachę, śruby lub podporę na rysunku – przejście do wymiarów.</p><p id="spR" class="hint"></p></div></div><div class="lsub">Sprawdzenia podpory (na bieżąco)</div><div id="spCk"></div>`;
    h += `<div class="dbtn"><button class="btn" id="spDes" type="button" title="Osobne okno: rodzaj połączenia, blachy, kątowniki, śruby, spoiny, rysunki i pełne sprawdzenia">Projektowanie połączenia…</button><button class="btn" id="spAuto" type="button" title="Dobór oparcia / połączenia tej podpory dla obecnej reakcji (wytężenie ≤ η z paska doboru)">⚙ Dobierz połączenie</button><span class="sp"></span>${i > 0 ? '<button class="btn" id="spPrev" type="button">◀ poprzednia</button>' : ''}${i < st.podpory.length - 1 ? '<button class="btn" id="spNext" type="button">następna ▶</button>' : ''}<button class="btn pri" id="nClose" type="button">Zamknij</button></div></div>`;
    const keep = $('.dlg.suppop', m) ? $('.dlg.suppop', m).scrollTop : 0;
    m.innerHTML = h; m.style.display = 'flex'; $('.dlg.suppop', m).scrollTop = keep;
    if (window.innerWidth < 760) $('.spgrid', m).style.gridTemplateColumns = '1fr';
    A.bindFields(m, (re) => { if (re) draw(); });
    $$('select[data-k$=".wezel.typ"]', m).forEach(sel => sel.addEventListener('change', () => { const p0 = S().podpory[i], t = p0.wezel.typ; p0.wezel = Object.assign({ typ: t }, BS.W.defaults(t, R().sec)); A.recalcNow(); draw(); }));
    $$('[data-jdes]', m).forEach(b2 => b2.addEventListener('click', () => A.jointDesigner({ sup: i })));
    $('#nClose', m).onclick = closeM; $('#spDes', m).onclick = () => A.jointDesigner({ sup: i });
    const pv = $('#spPrev', m), nx = $('#spNext', m); if (pv) pv.onclick = () => A.supportPopup(i - 1); if (nx) nx.onclick = () => A.supportPopup(i + 1);
    $('#spAuto', m).onclick = () => {
      const eta = ((S().design && S().design.eta) || 100) / 100, r0 = J.run(S());
      const d = J.dobierzWezly(S(), r0, eta), nw = d.st.podpory[i];
      if (nw) { S().podpory[i].wezel = nw.wezel; A.recalcNow(); draw(); Q.toast(d.log.filter(t => t.indexOf(sp.id) >= 0).join(' ') || 'Bez zmian – węzeł spełnia warunki.', 6000); }
    };
    live();
    if (focus) setTimeout(() => { const t = $(`[data-jz="${focus}"]`, m); if (t) { t.scrollIntoView({ block: 'center' }); Q.hlg(t.nextElementSibling || t); } }, 40);
  };
  A.setPopRedraw(live);
  draw();
};

/* ================================================================ PRZEKRÓJ */
A.secPopup = function (zone) {
  const m = $('#modal');
  const live = () => {
    const r = R(), sk = $('#psSk', m), pr = $('#psPr', m); if (!r) return;
    if (sk) { sk.innerHTML = r.sec ? D.section(r.sec, { size: 270, zones: true }) : '<p class="hint">Błąd przekroju.</p>'; Q.themeSvgIn(sk); $$('.zhit', sk).forEach(z => z.addEventListener('click', () => focusZone(z.dataset.z))); }
    if (pr) pr.innerHTML = r.sec && r.base ? secProps(r) : (r.errors || []).map(e => `<div class="msg err">${esc(e)}</div>`).join('');
  };
  const focusZone = (z) => {
    const map = { fg: ['przekroj.bg', 'przekroj.tg'], fd: ['przekroj.bd', 'przekroj.td'], w: ['przekroj.tw', 'przekroj.h'], all: ['przekroj.nr', 'przekroj.h', 'przekroj.t'] }[z] || [];
    const els = map.map(k => $(`[data-k="${k}"]`, m)).filter(Boolean);
    if (!els.length) { const n = $('[data-k="przekroj.nr"]', m) || $('[data-k="przekroj.typ"]', m); if (n) { Q.hlg(n); n.focus(); } return; }
    Q.hlg(els); els[0].focus(); if (els[0].select) els[0].select();
  };
  const draw = () => {
    const g = A.GROUPS.find(q => q.id === 'sec');
    m.innerHTML = `<div class="dlg fpop" style="max-width:860px"><h3>Przekrój i materiał</h3><div class="spgrid" style="display:grid;grid-template-columns:minmax(300px,1fr) 300px;gap:14px;align-items:start"><div class="fields">${A.fieldsHTML(g.items.filter(f => f.t !== 'html' && f.t !== 'hint'), 'psec')}</div><div><div id="psSk" class="fig" style="margin:0"></div><p class="hint" style="margin-top:2px">Kliknij pas lub środnik na rysunku – przejście do wymiarów.</p><div id="psPr"></div></div></div>
      <div class="dbtn"><button class="btn" id="psTab" type="button">Tablica kształtowników…</button><button class="btn" id="psAuto" type="button" title="Najlżejszy przekrój tego rodzaju spełniający warunki elementu">⚙ Dobierz przekrój</button><span class="sp"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div></div>`;
    m.style.display = 'flex';
    if (window.innerWidth < 760) $('.spgrid', m).style.gridTemplateColumns = '1fr';
    A.bindFields(m, (re) => { if (re) { A.recalcNow(); draw(); } });
    $('#nClose', m).onclick = closeM;
    $('#psTab', m).onclick = () => A.secTablePopup();
    $('#psAuto', m).onclick = async () => { await A.runDesign('sec'); A.secPopup(); };
    live();
  };
  A.setPopRedraw(live);
  draw();
  if (zone) setTimeout(() => focusZone(zone), 40);
};
function secProps(r) {
  const s = r.sec, b = r.base;
  const rows = [['A', fmt(s.A / 100, 2), 'cm²'], ['I_{y}', fmt(s.Iy / 1e4, 0), 'cm⁴'], ['I_{z}', fmt(s.Iz / 1e4, 1), 'cm⁴'], ['W_{el,y}', fmt(Math.min(s.Wel_t, s.Wel_b) / 1e3, 1), 'cm³'], ['W_{pl,y}', fmt(s.Wpl_y / 1e3, 1), 'cm³'], ['I_{t}', fmt(s.It / 1e4, 2), 'cm⁴'], ['I_{w}', fmt(s.Iw / 1e9, 2), '·10³ cm⁶'], ['masa', fmt(s.masa, 1), 'kg/m'],
    ['klasa (M+ / M− / N)', `${b.kPos.cls} / ${b.kNeg.cls} / ${b.kN.cls}`, ''], ['M_{c,Rd}', fmt(b.Mc_pos / 1e6, 1), 'kNm'], ['V_{pl,Rd}', fmt(b.Vpl / 1e3, 1), 'kN']];
  return `<table class="kv">${rows.map(([a, v, u]) => `<tr><td>${sym(a)}</td><td class="n"><b>${v}</b> ${u}</td></tr>`).join('')}</table>${(s.uwagi || []).map(t => `<p class="hint">${esc(t)}</p>`).join('')}`;
}
A.secProps = secProps;
A.secTablePopup = function () {
  const st = S(), d = st.przekroj, kind = d.typ;
  if (kind === 'spaw' || d.seria === 'wlasna') { Q.toast('Tablica dotyczy kształtowników katalogowych – dla przekroju spawanego / własnego zadaj wymiary.'); return; }
  const list = (P.katalog ? P.katalog(kind, [d.seria]) : []).sort((a, b) => a.h - b.h || a.masa - b.masa);
  const rows = list.map(c => { let s; try { s = P.props(Object.assign({}, d, c.d)); } catch (e) { return ''; } const cur = String(c.d.nr) === String(d.nr) && (!c.d.seria || c.d.seria === d.seria);
    return `<tr class="${cur ? 'done' : ''}" data-pick='${esc(JSON.stringify(c.d))}' style="cursor:pointer"><td><b>${esc(s.nazwa)}</b></td><td class="n">${fmt(s.h, 0)}</td><td class="n">${fmt(s.A / 100, 1)}</td><td class="n">${fmt(s.Iy / 1e4, 0)}</td><td class="n">${fmt(s.Iz / 1e4, 1)}</td><td class="n">${fmt(s.Wpl_y / 1e3, 1)}</td><td class="n">${fmt(s.It / 1e4, 2)}</td><td class="n">${fmt(s.masa, 1)}</td></tr>`; }).join('');
  const m = Q.modal(`<h3>Tablica kształtowników – ${esc(P.SERIA_N[d.seria] || d.seria)}</h3><p class="hint">Charakterystyki obliczone z geometrii (wielobok z zaokrągleniami). Kliknij wiersz, aby wybrać kształtownik.</p><div class="tscroll" style="max-height:60vh"><table class="sched"><tr><th>Kształtownik</th><th>h [mm]</th><th>A [cm²]</th><th>I<sub>y</sub> [cm⁴]</th><th>I<sub>z</sub> [cm⁴]</th><th>W<sub>pl,y</sub> [cm³]</th><th>I<sub>t</sub> [cm⁴]</th><th>m [kg/m]</th></tr>${rows}</table></div><div class="dbtn"><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop');
  m.querySelector('.dlg').style.maxWidth = '820px';
  $('#nClose', m).onclick = closeM;
  $$('[data-pick]', m).forEach(tr => tr.addEventListener('click', () => { Object.assign(S().przekroj, JSON.parse(tr.dataset.pick)); closeM(); A.changed(true); }));
  const cur = $('tr.done', m); if (cur) cur.scrollIntoView({ block: 'center' });
};

/* ================================================================ STĘŻENIA */
A.bracePopup = function (focus) {
  const m = $('#modal');
  const draw = () => {
    const st = S(), r = R(), md = r && r.md; if (!md) { closeM(); return; }
    const L = st.stezenia, nE = md.nE;
    const stS = (k, v) => `<select data-bz="${k}" data-num="1">${md.etapy.map((e, s) => `<option value="${s}" ${U.num(v) === s ? 'selected' : ''}>od etapu ${s + 1}</option>`).join('')}</select>`;
    let h = `<div class="dlg fpop lpop"><h3>Stężenia boczne i skrętne</h3><p class="hint">Stężenie blokuje w swoim punkcie przemieszczenie boczne (<i>boczne</i>) lub skręcenie (<i>skrętne</i>) albo oba (<i>pełne</i>) na wybranej wysokości przekroju; wpływa na M<sub>cr</sub> i długości wyboczeniowe z płaszczyzny. Położenie x od lewego końca belki.</p>`;
    h += `<div class="addbar"><span>Dodaj:</span><button class="addb" data-badd="boczne" type="button">+ stężenie boczne</button><button class="addb" data-badd="skretne" type="button">+ stężenie skrętne</button><button class="addb" data-badd="pelne" type="button">+ stężenie pełne</button>${md.seg.filter(z => !z.wsp).length ? '<button class="addb" data-badd="mid" type="button">+ w środkach przęseł</button>' : ''}</div><div class="fields">`;
    if (!L.length) h += '<p class="lnone">Brak stężeń dyskretnych.</p>';
    L.forEach((z, i) => {
      h += `<div class="litem" data-bidx="${i}"><div class="lrow"><span class="lid">S${i + 1}</span><span>x</span><input class="txt sm" data-bz="${i}.x" value="${esc(showNum(z.x))}" autocomplete="off"><span class="u">m</span><select data-bz="${i}.typ">${[['boczne', 'boczne (u = 0)'], ['skretne', 'skrętne (φ = 0)'], ['pelne', 'pełne (u = φ = 0)']].map(([a, b]) => `<option value="${a}" ${z.typ === a ? 'selected' : ''}>${b}</option>`).join('')}</select><select data-bz="${i}.wys">${WYS.map(([a, b]) => `<option value="${a}" ${z.wys === a ? 'selected' : ''}>${b.replace('na ', '').replace('w ', '')}</option>`).join('')}</select>${nE > 1 ? stS(i + '.odEtapu', z.odEtapu) : ''}<label class="chk sm" title="Stężenie podpiera też belkę przy zginaniu poziomym (obciążenia w kierunku y)"><input type="checkbox" data-bzc="${i}.bocznieY" ${z.bocznieY !== false ? 'checked' : ''}><span>podpora dla y</span></label><button class="del sm" data-bdl="${i}" type="button" title="Usuń">×</button></div></div>`;
    });
    h += `</div><h4 class="lsec">Stężenia rozmieszczone równomiernie</h4><div class="fields">${fNum('analiza.ltRozstaw', 'Rozstaw stężeń l_{t} (w przęsłach)', 'm', ['', 1, 1.5, 2, 2.5, 3, 4, 5, 6], { opt: true, ph: 'brak', min: 0.2, re: true })}${U.num(st.analiza.ltRozstaw) > 0 ? fSel('analiza.ltWys', 'na wysokości', WYS.map(([a, b]) => [a, b])) + (nE > 1 ? fSel('analiza.ltOd', 'działają', md.etapy.map((e, s) => [s, `od etapu ${s + 1}`]), { num: true }) : '') : ''}</div>`;
    h += `<h4 class="lsec">Stężenie ciągłe</h4><div class="fields">${fChk('stezenieCiagle.pasG', 'Pas górny stężony ciągle (płyta, blacha fałdowa, płyty warstwowe)')}${st.stezenieCiagle.pasG && nE > 1 ? fSel('stezenieCiagle.odEtapu', 'od etapu', md.etapy.map((e, s) => [s, `${s + 1}. ${e.nazwa}`]), { num: true, wide: true }) : ''}${fChk('stezenieCiagle.pasD', 'Pas dolny stężony ciągle')}${st.stezenieCiagle.pasD && nE > 1 ? fSel('stezenieCiagle.odEtapuD', 'od etapu', md.etapy.map((e, s) => [s, `${s + 1}. ${e.nazwa}`]), { num: true, wide: true }) : ''}</div>`;
    h += `<p class="hint">Stężenia traktowane są jako sztywne – ich nośność i sztywność należy sprawdzić odrębnie (PN-EN 1993-1-1, 5.3.3; siła stabilizująca ok. 1–2,5% siły w pasie ściskanym).</p><div class="dbtn"><button class="btn pri" id="nClose" type="button">Zamknij</button></div></div>`;
    const keep = $('.dlg.lpop', m) ? $('.dlg.lpop', m).scrollTop : 0;
    m.innerHTML = h; m.style.display = 'flex'; $('.dlg.lpop', m).scrollTop = keep;
    A.bindFields(m, (re) => { if (re) draw(); });
    $$('[data-bz]', m).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const [i, f] = el.dataset.bz.split('.'); let v = el.value; if (f === 'x' || el.dataset.num) { v = parseNum(v); const bad = v === null || v < 0; el.classList.toggle('bad', bad); if (bad) return; } S().stezenia[+i][f] = v; A.changed(false); }));
    $$('[data-bzc]', m).forEach(cb => cb.addEventListener('change', () => { const [i, f] = cb.dataset.bzc.split('.'); S().stezenia[+i][f] = cb.checked; A.changed(false); }));
    $$('[data-bdl]', m).forEach(b => b.addEventListener('click', () => { S().stezenia.splice(+b.dataset.bdl, 1); A.changed(false); A.recalcNow(); draw(); }));
    $$('[data-badd]', m).forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.badd, md2 = R().md;
      if (t === 'mid') md2.seg.filter(z => !z.wsp).forEach(z => { const x = +((z.x0 + z.x1) / 2000).toFixed(3); if (!S().stezenia.some(q => Math.abs(U.num(q.x) - x) < 0.01)) S().stezenia.push({ x, typ: 'boczne', wys: 'pas_g', odEtapu: 0, bocznieY: true }); });
      else S().stezenia.push({ x: +(md2.L / 2000).toFixed(3), typ: t, wys: 'pas_g', odEtapu: 0, bocznieY: t !== 'skretne' });
      A.changed(false); A.recalcNow(); draw();
    }));
    $('#nClose', m).onclick = closeM;
    if (focus !== undefined && focus !== null) { const it = $(`.litem[data-bidx="${focus}"]`, m); if (it) { it.classList.add('focus'); it.scrollIntoView({ block: 'center' }); } }
  };
  A.setPopRedraw(null);
  draw();
};

/* ================================================================ ETAPY I PODPORY MONTAŻOWE */
A.stagesPopup = function () {
  const m = $('#modal');
  const draw = () => {
    const st = S(), E = st.etapy;
    let h = `<div class="dlg fpop lpop"><h3>Etapy realizacji i podpory montażowe</h3><p class="hint">Każdy etap ma własny układ podpór i stężeń. Obciążenia stałe przyłożone w etapie k działają na układ tego etapu; po usunięciu podpory montażowej jej reakcja przechodzi na układ etapu następnego (siły „zamrożone”). Ostatni etap – eksploatacja (sytuacja trwała).</p><div class="fields">`;
    E.forEach((e, i) => { h += `<div class="litem"><div class="lrow top"><span class="lid">${i + 1}</span><input class="txt lname" data-ez="${i}.nazwa" value="${esc(e.nazwa)}" spellcheck="false"><select data-ez="${i}.typ"><option value="montaz" ${e.typ === 'montaz' ? 'selected' : ''}>montaż (przejściowa)</option><option value="eksploatacja" ${e.typ !== 'montaz' ? 'selected' : ''}>eksploatacja (trwała)</option></select>${E.length > 1 ? `<button class="del" data-edl="${i}" type="button" title="Usuń etap">×</button>` : ''}</div><div class="lrow"><input class="txt" style="flex:1" data-ez="${i}.opis" value="${esc(e.opis || '')}" placeholder="opis etapu (np. stan stężeń)" spellcheck="false"></div></div>`; });
    h += `<button class="addp" id="eAdd" type="button">+ etap</button></div><h4 class="lsec">Podpory montażowe (tymczasowe)</h4><div class="fields">`;
    if (!st.podporyTymczasowe.length) h += '<p class="lnone">Brak podpór montażowych.</p>';
    st.podporyTymczasowe.forEach((t, i) => { h += `<div class="litem"><div class="lrow"><span class="lid">T${i + 1}</span><span>x</span><input class="txt sm" data-tz="${i}.x" value="${esc(showNum(t.x))}"><span class="u">m</span><span>usuwana po etapie</span><select data-tz="${i}.usunietaPo">${E.map((e, s) => `<option value="${s}" ${U.num(t.usunietaPo) === s ? 'selected' : ''}>${s + 1}</option>`).join('')}</select><span>s<sub>s</sub></span><input class="txt sm" data-tz="${i}.ss" value="${esc(showNum(t.ss))}"><span class="u">mm</span><button class="del sm" data-tdl="${i}" type="button" title="Usuń">×</button></div></div>`; });
    h += `<button class="addp" id="tAdd" type="button" ${E.length < 2 ? 'disabled title="Dodaj najpierw etap montażu"' : ''}>+ podpora montażowa</button></div><div class="dbtn"><button class="btn pri" id="nClose" type="button">Zamknij</button></div></div>`;
    const keep = $('.dlg.lpop', m) ? $('.dlg.lpop', m).scrollTop : 0;
    m.innerHTML = h; m.style.display = 'flex'; $('.dlg.lpop', m).scrollTop = keep;
    $$('[data-ez]', m).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const [i, f] = el.dataset.ez.split('.'); S().etapy[+i][f] = el.value; A.changed(el.tagName === 'SELECT'); }));
    $$('[data-edl]', m).forEach(b => b.addEventListener('click', () => { const i = +b.dataset.edl, st2 = S(); st2.etapy.splice(i, 1); const n = st2.etapy.length; st2.obciazenia.forEach(o => { if (U.num(o.etap) >= n) o.etap = n - 1; }); st2.podporyTymczasowe = st2.podporyTymczasowe.filter(t => U.num(t.usunietaPo) < n - 1); st2.stezenia.forEach(z => { if (U.num(z.odEtapu) >= n) z.odEtapu = n - 1; }); A.setStage(null); A.changed(true); draw(); }));
    $('#eAdd', m).onclick = () => { const st2 = S(); st2.etapy.splice(st2.etapy.length - 1, 0, { id: 'E' + (st2.etapy.length + 1), nazwa: `Montaż – etap ${st2.etapy.length}`, typ: 'montaz', opis: '' }); st2.obciazenia.forEach(o => { if (U.num(o.etap) >= st2.etapy.length - 2) o.etap = U.num(o.etap) + 1; }); st2.etapy.forEach((e, k) => { e.id = 'E' + (k + 1); }); A.changed(true); draw(); };
    $$('[data-tz]', m).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const [i, f] = el.dataset.tz.split('.'); const v = parseNum(el.value); el.classList.toggle('bad', v === null); if (v === null) return; S().podporyTymczasowe[+i][f] = v; A.changed(false); }));
    $$('[data-tdl]', m).forEach(b => b.addEventListener('click', () => { S().podporyTymczasowe.splice(+b.dataset.tdl, 1); A.changed(true); draw(); }));
    $('#tAdd', m).onclick = () => { const md = R().md, sg = md.seg.find(z => !z.wsp) || md.seg[0]; S().podporyTymczasowe.push({ x: +((sg.x0 + sg.x1) / 2000).toFixed(3), usunietaPo: 0, ss: 100 }); A.changed(true); draw(); };
    $('#nClose', m).onclick = closeM;
  };
  A.setPopRedraw(null);
  draw();
};

/* ================================================================ WĘZEŁ (dwuklik na belce) */
A.nodePopup = function (x) {
  const r = R(); if (!r || !r.md) return;
  const md = r.md, s = A.stage(), an = r.an, ev = r.env[s], xs = an.xs;
  let k = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[k] - x)) k = i; });
  const sg = md.seg.find(z => x >= z.x0 - 1 && x <= z.x1 + 1);
  const at = (arr) => arr ? arr[k] : 0;
  const cases = S().obciazenia.map((o, i) => [i, `${o.id} – ${o.nazwa}`]);
  const m = Q.modal(`<h3>Węzeł – x = ${fmt(x / 1000, 2)} m${sg ? ` (${esc(sg.n)})` : ''}</h3>
    <table class="kv"><tr><td>M<sub>Ed</sub> (obwiednia SGN, etap ${s + 1})</td><td class="n"><b>${fmt(at(ev.Mmax) / 1e6, 2)} / ${fmt(at(ev.Mmin) / 1e6, 2)}</b> kNm</td></tr><tr><td>V<sub>Ed</sub></td><td class="n"><b>${fmt(at(ev.Vmax) / 1e3, 2)} / ${fmt(at(ev.Vmin) / 1e3, 2)}</b> kN</td></tr><tr><td>ugięcie (char.)</td><td class="n"><b>${fmt(at(ev.wmax), 2)}</b> mm</td></tr></table>
    <h4 class="lsec">Dodaj w tym miejscu</h4>
    <div class="zg"><span>Siła skupiona P</span><input class="txt" id="ndP" value="10"><span>kN do przypadku</span><select id="ndC">${cases.map(([i, l]) => `<option value="${i}">${esc(l.slice(0, 40))}</option>`).join('')}<option value="new">nowy przypadek (Q)</option></select><button class="btn sm" id="ndAddP" type="button">Dodaj siłę</button></div>
    <div class="zg"><button class="btn sm" id="ndBr" type="button">+ stężenie boczne pasa górnego</button><button class="btn sm" id="ndTs" type="button" ${S().etapy.length < 2 ? 'disabled title="Wymaga co najmniej dwóch etapów"' : ''}>+ podpora montażowa</button><button class="btn sm" id="ndSp" type="button">+ styk montażowy</button></div>
    <div class="dbtn"><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop sm');
  const X = +(x / 1000).toFixed(3);
  $('#nClose', m).onclick = closeM;
  $('#ndAddP', m).onclick = () => { const P0 = parseNum($('#ndP', m).value); if (P0 === null) { $('#ndP', m).classList.add('bad'); return; } const c = $('#ndC', m).value, st = S(); if (c === 'new') st.obciazenia.push({ id: nextId('Q'), nazwa: `Siła skupiona x = ${showNum(X)} m`, rodzaj: 'Q', kat: 'Q-B', etap: md.nE - 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'P', P: P0, x: X, kier: 'z', wys: 'pas_g', ss: 0 }] }); else st.obciazenia[+c].sklad.push({ typ: 'P', P: P0, x: X, kier: 'z', wys: 'pas_g', ss: 0 }); closeM(); A.changed(true); };
  $('#ndBr', m).onclick = () => { S().stezenia.push({ x: X, typ: 'boczne', wys: 'pas_g', odEtapu: 0, bocznieY: true }); closeM(); A.changed(true); };
  $('#ndTs', m).onclick = () => { S().podporyTymczasowe.push({ x: X, usunietaPo: 0, ss: 100 }); closeM(); A.changed(true); };
  $('#ndSp', m).onclick = () => { closeM(); A.addSplice(X); };
};

/* ================================================================ SCHEMATY TYPOWE */
A.schemesPopup = function () {
  const cur = S().schemat;
  const m = Q.modal(`<h3>Schematy typowe</h3><p class="hint">Wybór ustawia przęsła, wsporniki, rodzaje podpór (i etapy dla schematów montażowych). Rozpiętości, obciążenia i przekrój pozostają; obciążenia zadane na nieistniejących odcinkach przenieś ręcznie.</p><div class="schgal" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px">${J.SCHEMATY.map(q => `<button class="card ${q.id === cur ? 'ok' : ''}" data-sch="${q.id}" type="button" style="text-align:left;cursor:pointer"><div>${D.pict(q.id, 170, 46)}</div><div class="t"><b>${esc(q.n)}</b></div><div class="s">${esc(q.d)}</div></button>`).join('')}</div><div class="dbtn"><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop');
  m.querySelector('.dlg').style.maxWidth = '860px';
  $('#nClose', m).onclick = closeM;
  $$('[data-sch]', m).forEach(b => b.addEventListener('click', () => { J.applyScheme(S(), b.dataset.sch); A.selSpans.clear(); A.setStage(null); closeM(); A.changed(true); Q.toast('Schemat: ' + J.SCHEMATY.find(q => q.id === b.dataset.sch).n); }));
};

/* ================================================================ OBJAŚNIENIA */
A.normPopup = function (c) {
  const keys = BS.OBJ ? BS.OBJ.find(c.ref || '', c.grp || '') : [];
  const body = keys.map(k => { const e = BS.OBJ.N[k]; return `<div class="nsec"><div class="nlab">${esc(e.lab || k)}</div><h4>${e.t}</h4><p>${e.s}</p>${e.f ? `<div class="nf">${e.f}</div>` : ''}${e.h ? `<div class="nh"><b>Podpowiedź:</b> ${e.h}</div>` : ''}</div>`; }).join('') || `<p>Brak objaśnienia dla odnośnika „${esc(c.ref)}”.</p>`;
  const m = Q.modal(`<h3>${esc(c.n)}</h3><p class="hint">${esc(c.grp)} · ${esc(c.ref || '')}</p>${body}<div class="dbtn"><button class="btn" id="nEx" type="button">Jak obliczono…</button><span class="sp"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop npop');
  $('#nClose', m).onclick = closeM; $('#nEx', m).onclick = () => A.explainPopup(c);
};
// „jak obliczono”: fragment raportu pełnego dotyczący sprawdzenia (wzory, podstawienia)
A.explainPopup = function (c) {
  const r = R(); if (!r || !r.md) return;
  let frag = '';
  try { frag = BS.Raport.explain(S(), r, c); } catch (e) { console.error(e); }
  const m = Q.modal(`<h3>${esc(c.n)}</h3><p class="hint">${esc(c.grp)}${c.ref ? ' · ' + esc(c.ref) : ''}${c.x !== undefined && c.x !== null && isFinite(c.x) ? ` · x = ${fmt(c.x / 1000, 2)} m` : ''}${c.combo ? ' · ' + esc(c.combo) : ''}</p>
    <div class="xbox"><table class="kv"><tr><td>Warunek</td><td class="n"><b>${ckCond(c)}</b></td></tr><tr><td>Wytężenie</td><td>${utilBar(c)}</td></tr><tr><td>Status</td><td><span class="st ${c.info ? 'info' : c.status}">${STL[c.info ? 'info' : c.status]}</span></td></tr></table>${c.note ? `<p class="hint">${esc(c.note)}</p>` : ''}</div>
    <div class="rep xrep">${frag || '<p class="hint">Szczegóły – w raporcie obliczeń.</p>'}</div>
    <div class="dbtn"><button class="btn" id="nNorm" type="button">Punkt normy…</button><button class="btn" id="nGo" type="button">Pokaż miejsce →</button><span class="sp"></span><button class="btn pri" id="nClose" type="button">Zamknij</button></div>`, 'fpop');
  m.querySelector('.dlg').style.maxWidth = '900px';
  $('#nClose', m).onclick = closeM; $('#nNorm', m).onclick = () => A.normPopup(c); $('#nGo', m).onclick = () => A.gotoCheck(c);
};

/* ================================================================ „POKAŻ →” – miejsce, którego dotyczy warunek */
A.gotoCheck = function (c) {
  const id = c.id || '', grp = c.grp || '';
  const go = (tab, fn) => { closeM(); A.selectTab(tab); setTimeout(() => { try { fn && fn(); } catch (e) { console.error(e); } }, 90); };
  const hl = (sel) => Q.hlg(sel);
  const supI = () => { const r = R(); const sid = (/podpora (\S+)/.exec(grp) || [])[1] || id.split('-')[0]; const i = r.md.sup.findIndex(p => p.id === sid); return i; };
  if (/^Podpory/.test(grp)) { const i = supI(); if (i < 0) return go('elev', () => hl('#p-elev .elevbox')); if (/-C\d|-D\d|-Z\d/.test(id)) return go('elev', () => A.jointDesigner({ sup: i })); const foc = /-B\d/.test(id) ? 'plate' : /-ZB|-ZD|-ZC/.test(id) ? 'stiff' : null; return go('elev', () => A.supportPopup(i, foc)); }
  if (/^Styki/.test(grp)) { const j = +((/S(\d+)/.exec(id) || [])[1] || 1) - 1; return go('elev', () => A.jointDesigner({ styk: j })); }
  if (/-LT\d|-I\d/.test(id)) return go('ltb', () => hl(`#p-ltb tr[data-cid="${esc(id)}"]`) || hl('#p-ltb .card'));
  if (/^SGU – ugięcia/.test(grp)) return go('data', () => hl(['#inputs [data-k="sgu.wmax"]', '#inputs [data-k="sgu.w3"]', '#inputs [data-k="sgu.podniesienie"]']));
  if (/^SGU – drgania/.test(grp)) return go('data', () => hl(['#inputs [data-k="sgu.fmin"]', '[data-ck="sgu.drgania"]']));
  if (/^Pożar/.test(grp)) return go('data', () => { const d = $('#inputs details[data-g="fire"]'); if (d) d.open = true; hl(['#inputs [data-k="pozar.ochrona"]', '#inputs [data-k="pozar.dp"]', '.firest']); });
  if (/^Zmęczenie/.test(grp)) return go('data', () => { const d = $('#inputs details[data-g="fat"]'); if (d) d.open = true; hl(['#inputs [data-k="zmeczenie.n"]', '#inputs [data-fd]']); });
  if (/^Kruche/.test(grp)) return go('data', () => { const d = $('#inputs details[data-g="brit"]'); if (d) d.open = true; hl(['#inputs [data-k="material.podgatunek"]', '#inputs [data-k="kruche.Tmd"]']); });
  if (/^pt/.test(id)) return go('data', () => A.loadPopup({ all: true }));
  if (/-Vb$|-MV$/.test(id)) return go('sec', () => { A.secPopup('w'); setTimeout(() => hl(['#modal [data-k="przekroj.tw"]', '#modal [data-k="przekroj.nr"]']), 80); });
  return go('sec', () => { const z = $$('#p-sec .zhit'); if (z.length) hl(z); else hl('#p-sec .secbox'); });
};
})();
