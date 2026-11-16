/* =====================================================================
   BelkaStal – interfejs: stan projektu, formularze, obliczenia, pliki.
   Most do aplikacji okienkowej (WebView2) jak w BelkaŻB/SłupŻB:
   window.hostRequest(JSON) → window.__hostReply(id, wynik).
   ===================================================================== */
(function () {
'use strict';
const BS = window.BS, U = BS.U, J = BS.J, N = BS.N, P = BS.P, M = BS.M, D = BS.D;
const A = BS.A = {};
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = U.esc;
let S = J.defaultState(), R = null, filePath = '', dirty = false, tab = 'data', vStage = null, openGrp = null;
const rendered = {};
A.get = () => ({ S, R });

/* ---------------------------------------------------------- ścieżki w stanie */
function getP(path) { return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), S); }
function setP(path, v) {
  const ks = path.split('.'); let o = S;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = v;
}
A.getP = getP; A.setP = setP;

/* ---------------------------------------------------------- generatory pól */
const val = (p) => { const v = getP(p); return v === undefined || v === null ? '' : v; };
const numStr = (v) => (v === '' || v === undefined || v === null ? '' : (typeof v === 'number' ? String(+v.toPrecision(10)).replace('.', ',') : String(v)));
const opt = (o, v) => o.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('');
function fNum(lab, p, unit, o) { o = o || {}; return `<div class="row"><label>${lab}</label><input class="txt num" data-p="${p}" data-t="${o.empty ? 'numE' : 'num'}"${o.r ? ' data-r="1"' : ''} value="${esc(numStr(val(p)))}" inputmode="decimal"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}><span class="unit">${unit || ''}</span></div>`; }
function fSel(lab, p, options, o) { o = o || {}; return `<div class="row${o.wide ? ' wide' : ''}"><label>${lab}</label><select data-p="${p}" data-t="${o.num ? 'num' : 'str'}"${o.r !== false ? ' data-r="1"' : ''}>${opt(options, val(p))}</select>${o.wide ? '' : `<span class="unit">${o.unit || ''}</span>`}</div>`; }
function fChk(lab, p, o) { o = o || {}; return `<label class="chk"><input type="checkbox" data-p="${p}" data-t="bool"${o.r !== false ? ' data-r="1"' : ''}${getP(p) ? ' checked' : ''}> ${lab}</label>`; }
function fTxt(lab, p, o) { o = o || {}; return `<div class="row wide"><label>${lab}</label>${o.area ? `<textarea class="txt" data-p="${p}" data-t="str" rows="3">${esc(val(p))}</textarea>` : `<input class="txt" data-p="${p}" data-t="str" value="${esc(val(p))}"${o.type ? ` type="${o.type}"` : ''}>`}</div>`; }
const inl = (p, o) => { o = o || {}; return `<input class="txt${o.cls ? ' ' + o.cls : ''}" data-p="${p}" data-t="${o.t || 'num'}"${o.r ? ' data-r="1"' : ''} value="${esc(o.t === 'str' ? val(p) : numStr(val(p)))}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''} title="${esc(o.title || '')}">`; };
const ins = (p, options, o) => { o = o || {}; return `<select data-p="${p}" data-t="${o.num ? 'num' : 'str'}"${o.r !== false ? ' data-r="1"' : ''} title="${esc(o.title || '')}">${opt(options, val(p))}</select>`; };
const hint = (t) => `<p class="hint">${t}</p>`;
const grp = (id, title, body, badge) => `<details class="grp" data-g="${id}"${isOpen(id) ? ' open' : ''}><summary>${title}${badge ? `<span class="badge">${badge}</span>` : ''}</summary><div class="fields">${body}</div></details>`;
function isOpen(id) { if (!openGrp) { try { openGrp = new Set(JSON.parse(localStorage.getItem('belkastal-grp') || 'null') || ['norm', 'geom', 'sec', 'load', 'stage']); } catch (e) { openGrp = new Set(['norm', 'geom', 'sec', 'load', 'stage']); } } return openGrp.has(id); }

/* ---------------------------------------------------------- opcje */
const O = {
  podpora: [['przegub', 'przegubowa'], ['utwierdzenie', 'utwierdzenie'], ['sprezyna', 'sprężysta (kz, kφ)'], ['podatne', 'przegub + sprężyna obrotowa']],
  ltb: [['widelkowe', 'widełkowa (u = φ = 0)'], ['pelne', 'pełna (+ u′ = φ′ = 0)']],
  rodzaj: Object.keys(BS.S.RODZAJE).map(k => [k, BS.S.RODZAJE[k].n]),
  kat: Object.keys(N.PSI).filter(k => k.startsWith('Q-')).map(k => [k, N.PSI[k].n]),
  uklad: [['staly', 'w całości'], ['szachownica', 'niekorzystnie w przęsłach']],
  wys: [['pas_g', 'na pasie górnym'], ['srodek', 'w środku ścinania'], ['pas_d', 'na pasie dolnym']],
  kier: [['z', 'pionowo (z)'], ['y', 'poziomo (y)']],
  typS: [['q', 'rozłożone q'], ['P', 'skupione P'], ['M', 'moment M']],
  etapTyp: [['montaz', 'montaż / sytuacja przejściowa'], ['eksploatacja', 'eksploatacja / trwała']],
  stez: [['boczne', 'boczne (blokuje u na wysokości)'], ['skretne', 'skrętne (blokuje φ)'], ['pelne', 'boczne + skrętne']],
  wezel: [['brak', 'brak / oparcie na stali'], ['oparcie', 'oparcie na płycie (beton/mur)'], ['blacha_czolowa', 'krótka blacha czołowa'], ['blacha_zebrowa', 'blacha żebrowa (nakładka)']],
  sruby: Object.keys(M.SRUBY).map(k => [k, k]), klasy: Object.keys(M.SRUBY_KL).map(k => [k, k]),
  beton: Object.keys(M.BETON).map(k => [k, k]),
  ugi: Object.keys(N.UGIECIA).map(k => [k, N.UGIECIA[k].nazwa])
};
const stageOpts = () => S.etapy.map((e, i) => [i, `${i + 1}. ${e.nazwa}`]);

/* ================================================================ DANE */
function renderInputs() {
  const H = [];
  H.push(grpNorm(), grpGeom(), grpSec(), grpLoads(), grpStages(), grpSup(), grpSGU(), grpAnal(), grpFire(), grpFat(), grpBrittle(), grpExec(), grpMeta());
  $('#inputs').innerHTML = H.join('');
  renderSide();
}

function grpNorm() {
  const o = N.ocen(S);
  const P0 = S.normy;
  let b = '';
  b += fSel('Kraj / załączniki krajowe', 'normy.kraj', Object.keys(N.KRAJE).map(k => [k, N.KRAJE[k]]), { wide: true });
  b += fSel('Generacja Eurokodów', 'normy.generacja', [[1, '1. generacja (PN-EN 199x z ZK PL)'], [2, '2. generacja (EN 199x:2022+)']], { wide: true, num: true });
  b += `<div class="normbox"><div><span class="g">Stosowana: ${o.genStosowana}. generacja</span> · dokumentów w zakresie projektu: ${o.dokumenty.length}${o.genZadana !== o.genStosowana ? ' · <b style="color:var(--warn)">zastosowano zastępczo 1. generację</b>' : ''}</div><div style="margin-top:4px">${esc(o.decyzja)}</div></div>`;
  b += fTxt('Data weryfikacji zestawu', 'normy.dataWeryfikacji', { type: 'date' });
  b += fTxt('Zweryfikował(a)', 'normy.zweryfikowal');
  b += fTxt('Źródło weryfikacji', 'normy.zrodloWeryfikacji');
  b += `<div class="bar" style="margin-top:8px"><button class="btn sm" data-act="normy">Dokumenty, zmiany, poprawki, ZK i NDP…</button></div>`;
  const nv = o.dokumenty.filter(d => !d.zweryfikowano).length;
  const badge = o.bledy.length ? `<span class="st fail">błędy: ${o.bledy.length}</span>` : (nv || !P0.dataWeryfikacji) ? '<span class="st warn">do weryfikacji</span>' : '<span class="st ok">zweryfikowany</span>';
  return grp('norm', 'Profil normowy', b, badge);
}

function grpGeom() {
  let b = '<div class="lhead">Przęsła <button class="addb" data-act="addSpan">+ przęsło</button></div>';
  S.geom.przesla.forEach((v, i) => { b += `<div class="lrow"><span class="lid">${i + 1}</span> L<sub>${i + 1}</sub> = ${inl('geom.przesla.' + i, { r: true })}<span class="u">m</span>${S.geom.przesla.length > 1 ? `<button class="del sm" data-act="delSpan" data-i="${i}" title="Usuń przęsło">×</button>` : ''}</div>`; });
  b += fNum('Wspornik lewy', 'geom.wspL', 'm', { r: true }) + fNum('Wspornik prawy', 'geom.wspP', 'm', { r: true });
  b += '<div class="sub">Podpory</div>';
  b += '<table class="grid"><tr><th></th><th>Rodzaj</th><th>Zwichrzenie</th><th title="Długość sztywnego docisku ss">ss [mm]</th><th title="Odległość od końca docisku do końca belki (podpora skrajna)">c [mm]</th></tr>';
  S.podpory.forEach((p, i) => {
    b += `<tr><td><b>${'ABCDEFGHIJKLMNOP'[i]}</b></td><td>${ins(`podpory.${i}.typ`, O.podpora)}${['sprezyna', 'podatne'].includes(p.typ) ? `<div class="lrow">${p.typ === 'sprezyna' ? `kz ${inl(`podpory.${i}.kz`, { cls: 'sm' })}<span class="u">kN/mm</span>` : ''} kφ ${inl(`podpory.${i}.kfi`, { cls: 'sm' })}<span class="u">kNm/rad</span></div>` : ''}</td><td>${ins(`podpory.${i}.ltb`, O.ltb)}</td><td>${inl(`podpory.${i}.ss`, { cls: 'sm' })}</td><td>${inl(`podpory.${i}.c`, { cls: 'sm' })}</td></tr>`;
  });
  b += '</table>';
  b += `<div class="lhead">Podpory tymczasowe (montażowe) <button class="addb" data-act="addTmp">+ podpora</button></div>`;
  if (!S.podporyTymczasowe.length) b += hint('Brak. Podpora tymczasowa działa w etapach do „usunięta po” włącznie; jej reakcja jest przenoszona na układ końcowy.');
  S.podporyTymczasowe.forEach((t, i) => { b += `<div class="lrow"><span class="lid">T${i + 1}</span> x = ${inl(`podporyTymczasowe.${i}.x`, { r: true })}<span class="u">m</span> usunięta po etapie ${ins(`podporyTymczasowe.${i}.usunietaPo`, stageOpts(), { num: true })}<button class="del sm" data-act="delTmp" data-i="${i}">×</button></div>`; });
  return grp('geom', 'Schemat statyczny i geometria', b);
}

function grpSec() {
  const p = S.przekroj;
  let b = fSel('Rodzaj przekroju', 'przekroj.typ', [['walc', 'kształtownik walcowany (PN-EN 10365)'], ['spaw', 'dwuteownik spawany']], { wide: true });
  if (p.typ === 'walc') {
    b += fSel('Seria', 'przekroj.seria', Object.keys(P.SERIE).map(k => [k, k]));
    if (!P.SERIE[p.seria] || !P.SERIE[p.seria][p.nr]) { p.nr = P.lista(p.seria)[Math.floor(P.lista(p.seria).length / 2)]; }
    b += fSel('Wielkość', 'przekroj.nr', P.lista(p.seria).map(n => [n, `${p.seria} ${n}`]), { num: true });
  } else {
    b += fNum('Wysokość h', 'przekroj.h', 'mm', { r: true }) + fNum('Pas górny b<sub>g</sub>', 'przekroj.bg', 'mm', { r: true }) + fNum('Pas górny t<sub>g</sub>', 'przekroj.tg', 'mm', { r: true });
    b += fNum('Pas dolny b<sub>d</sub>', 'przekroj.bd', 'mm', { r: true }) + fNum('Pas dolny t<sub>d</sub>', 'przekroj.td', 'mm', { r: true }) + fNum('Środnik t<sub>w</sub>', 'przekroj.tw', 'mm', { r: true }) + fNum('Spoina pas–środnik a', 'przekroj.aw', 'mm', { r: true });
  }
  b += fSel('Gatunek stali', 'material.gatunek', Object.keys(M.STAL).map(k => [k, `${k} (${M.STAL[k].norma})`]), { wide: true });
  const pods = (M.STAL[S.material.gatunek] || { pod: ['JR'] }).pod;
  if (!pods.includes(S.material.podgatunek)) S.material.podgatunek = pods[pods.length - 1];
  b += fSel('Podgatunek (udarność)', 'material.podgatunek', pods.map(k => [k, `${k} (27 J w ${M.T27J[k]} °C${k === 'K2' ? ', 40 J w −20 °C' : ''})`]), { wide: true });
  if (R && R.sec && R.mat) b += hint(`<b>${esc(R.sec.nazwa)}</b>: A = ${U.fmt(R.sec.A / 100, 1)} cm², Iy = ${U.fmt(R.sec.Iy / 1e4, 0)} cm⁴, ${U.fmt(R.sec.masa, 1)} kg/m · fy = ${R.mat.fy} MPa, fu = ${R.mat.fu} MPa (${esc(R.mat.zr)}) · klasa przy zginaniu: ${R.base.kPos.cls}${R.base.kNeg.cls !== R.base.kPos.cls ? '/' + R.base.kNeg.cls : ''}`);
  b += `<div class="bar"><button class="btn sm" data-act="dobor">Dobierz kształtownik…</button></div>`;
  return grp('sec', 'Przekrój i materiał', b);
}

function grpLoads() {
  let b = '';
  b += `<div class="lrow">${fChk('ciężar własny belki (automatycznie, 78,5 kN/m³)', 'ciezarWlasny.auto')}</div>`;
  if (S.ciezarWlasny.auto !== false) b += `<div class="lrow">+ dodatek na połączenia ${inl('ciezarWlasny.dodatek', { cls: 'sm' })}<span class="u">%</span> etap ${ins('ciezarWlasny.etap', stageOpts(), { num: true })}</div>`;
  b += `<div class="lhead">Przypadki obciążeń <span><button class="addb" data-act="snow">Śnieg…</button> <button class="addb" data-act="addLoad">+ przypadek</button></span></div>`;
  S.obciazenia.forEach((o, i) => {
    const p = `obciazenia.${i}`;
    const psi = BS.K.psi(o);
    b += `<div class="litem" style="border-left-color:${D.loadColor(o)}">`;
    b += `<div class="lrow"><span class="lid">${esc(o.id || '')}</span>${inl(p + '.id', { t: 'str', cls: 'sm', title: 'Oznaczenie', r: true })}${inl(p + '.nazwa', { t: 'str', cls: 'lname', title: 'Opis' })}<label class="chk" title="Aktywny"><input type="checkbox" data-p="${p}.aktywne" data-t="boolT" data-r="1"${o.aktywne !== false ? ' checked' : ''}></label><button class="del" data-act="delLoad" data-i="${i}" title="Usuń przypadek">×</button></div>`;
    b += `<div class="lrow">${ins(p + '.rodzaj', O.rodzaj)}${o.rodzaj === 'Q' ? ins(p + '.kat', O.kat) : ''} etap ${ins(p + '.etap', stageOpts(), { num: true })}</div>`;
    if (!BS.S.RODZAJE[o.rodzaj].stale && o.rodzaj !== 'A') b += `<div class="lrow">${ins(p + '.uklad', O.uklad)} grupa wykluczająca ${inl(p + '.wyklucz', { t: 'str', cls: 'sm', title: 'Przypadki z tą samą etykietą nie działają jednocześnie (np. W dla kierunków wiatru)' })} <span class="u">ψ0/ψ1/ψ2 = ${psi.map(v => U.fmt(v, 2)).join('/')}</span></div>`;
    b += `<div class="lrow">siła osiowa N ${inl(p + '.N', { cls: 'sm', title: '+ rozciąganie, − ściskanie' })}<span class="u">kN (+ rozc.)</span></div>`;
    (o.sklad || []).forEach((k, j) => {
      const q = `${p}.sklad.${j}`;
      b += `<div class="lrow comp">${ins(q + '.typ', O.typS)}`;
      if (k.typ === 'q') b += `${inl(q + '.q0', { title: 'q na początku [kN/m]' })}…${inl(q + '.q1', { t: 'numE', ph: '=q₀', title: 'q na końcu (puste = stałe)' })}<span class="u">kN/m</span> x ${inl(q + '.x0', { cls: 'sm', r: true })}–${inl(q + '.x1', { t: 'numE', cls: 'sm', ph: 'L', r: true })}<span class="u">m</span>`;
      else if (k.typ === 'P') b += `${inl(q + '.P')}<span class="u">kN</span> x ${inl(q + '.x', { cls: 'sm', r: true })}<span class="u">m</span> ss ${inl(q + '.ss', { cls: 'sm', title: 'długość docisku [mm]' })}<span class="u">mm</span>`;
      else b += `${inl(q + '.M')}<span class="u">kNm</span> x ${inl(q + '.x', { cls: 'sm', r: true })}<span class="u">m</span>`;
      if (k.typ !== 'M') b += `${ins(q + '.kier', O.kier)}${k.kier !== 'y' ? ins(q + '.wys', O.wys) : ''}`;
      b += `<button class="del sm" data-act="delComp" data-i="${i}" data-j="${j}">×</button></div>`;
    });
    b += `<div class="lrow"><button class="addp" data-act="addComp" data-i="${i}" data-k="q">+ q</button><button class="addp" data-act="addComp" data-i="${i}" data-k="P">+ P</button><button class="addp" data-act="addComp" data-i="${i}" data-k="M">+ M</button></div>`;
    b += '</div>';
  });
  b += hint('Wartości charakterystyczne. q, P dodatnie – w dół (grawitacyjnie); wiatr ssący – ujemne. Wysokość przyłożenia wpływa na M<sub>cr</sub>.');
  return grp('load', 'Obciążenia (PN-EN 1991)', b, `<span class="st info">${S.obciazenia.length}</span>`);
}

function grpStages() {
  let b = '<div class="lhead">Etapy realizacji <button class="addb" data-act="addStage">+ etap</button></div>';
  S.etapy.forEach((e, i) => {
    b += `<div class="litem"><div class="lrow"><span class="lid">${i + 1}</span>${inl(`etapy.${i}.nazwa`, { t: 'str', cls: 'lname', r: true })}${ins(`etapy.${i}.typ`, O.etapTyp)}${S.etapy.length > 1 ? `<button class="del" data-act="delStage" data-i="${i}">×</button>` : ''}</div><div class="lrow">${inl(`etapy.${i}.opis`, { t: 'str', cls: 'lname', ph: 'opis etapu' })}</div></div>`;
  });
  b += hint('Etap ostatni = eksploatacja (sytuacja trwała). Obciążenia stałe kumulują się z historią podpór; zmienne działają w etapie, do którego je przypisano.');
  b += `<div class="lhead">Stężenia boczne/skrętne (dyskretne) <button class="addb" data-act="addBrace">+ stężenie</button></div>`;
  S.stezenia.forEach((z, i) => {
    b += `<div class="lrow"><span class="lid">S${i + 1}</span> x ${inl(`stezenia.${i}.x`, { cls: 'sm', r: true })}<span class="u">m</span>${ins(`stezenia.${i}.typ`, O.stez)}${z.typ !== 'skretne' ? ins(`stezenia.${i}.wys`, O.wys.map(([k, l]) => [k, l.replace('na ', '').replace('w ', '')])) : ''} od etapu ${ins(`stezenia.${i}.odEtapu`, stageOpts(), { num: true })}<button class="del sm" data-act="delBrace" data-i="${i}">×</button></div>`;
  });
  b += '<div class="sub">Stężenie ciągłe (np. płyta, blacha fałdowa)</div>';
  b += `<div class="lrow">${fChk('pas górny stężony ciągle', 'stezenieCiagle.pasG')} ${S.stezenieCiagle.pasG ? 'od etapu ' + ins('stezenieCiagle.odEtapu', stageOpts(), { num: true }) : ''}</div>`;
  b += `<div class="lrow">${fChk('pas dolny stężony ciągle', 'stezenieCiagle.pasD')} ${S.stezenieCiagle.pasD ? 'od etapu ' + ins('stezenieCiagle.odEtapuD', stageOpts(), { num: true }) : ''}</div>`;
  return grp('stage', 'Etapy realizacji i stężenia', b, S.etapy.length > 1 ? `<span class="st info">${S.etapy.length} etapy</span>` : '');
}

function grpSup() {
  let b = '';
  const ids = 'ABCDEFGHIJKLMNOP';
  S.podpory.forEach((p, i) => {
    const w = p.wezel || (p.wezel = { typ: 'brak' }); const q = `podpory.${i}.wezel`;
    b += `<div class="sub">Podpora ${ids[i]}<span class="sp"></span>${ins(q + '.typ', O.wezel)}</div>`;
    if (w.typ === 'oparcie' || w.typ === 'brak') {
      if (w.typ === 'oparcie') {
        b += fSel('Podłoże', q + '.podloze', [['beton', 'beton (PN-EN 1992-1-1)'], ['mur', 'mur (PN-EN 1996-1-1)'], ['stal', 'element stalowy']], { wide: true });
        if (w.podloze !== 'stal') {
          b += `<div class="lrow">płyta b<sub>p</sub> ${inl(q + '.bp', { cls: 'sm' })} × l<sub>p</sub> ${inl(q + '.lp', { cls: 'sm' })} × t<sub>p</sub> ${inl(q + '.tp', { cls: 'sm' })}<span class="u">mm</span> docisk belki l<sub>b</sub> ${inl(q + '.lb', { cls: 'sm' })}<span class="u">mm</span></div>`;
          if (w.podloze === 'beton') b += `<div class="lrow">beton ${ins(q + '.beton', O.beton)} α = √(A<sub>c1</sub>/A<sub>c0</sub>) ${inl(q + '.alfa', { cls: 'sm', title: '1,0…3,0' })}</div>`;
          else b += `<div class="lrow">f<sub>d</sub> muru ${inl(q + '.fd', { cls: 'sm' })}<span class="u">MPa</span> β ${inl(q + '.beta', { cls: 'sm', title: 'współczynnik zwiększający 1,0…1,5 (PN-EN 1996-1-1, 6.1.3)' })}</div>`;
        }
      }
      b += `<div class="lrow">${fChk('żebra podporowe (para)', q + '.zebro')}${w.zebro ? ` b<sub>s</sub> ${inl(q + '.bs', { cls: 'sm' })} t<sub>s</sub> ${inl(q + '.ts', { cls: 'sm' })} fazka ${inl(q + '.ch', { cls: 'sm' })}<span class="u">mm</span>` : ''}</div>`;
    } else if (w.typ === 'blacha_czolowa') {
      b += `<div class="lrow">blacha h<sub>p</sub> ${inl(q + '.hp', { cls: 'sm' })} b<sub>p</sub> ${inl(q + '.bp', { cls: 'sm' })} t<sub>p</sub> ${inl(q + '.tp', { cls: 'sm' })}<span class="u">mm</span> spoina a ${inl(q + '.a', { cls: 'sm' })}<span class="u">mm</span></div>`;
      b += `<div class="lrow">śruby 2 × ${inl(q + '.nr', { cls: 'sm', title: 'liczba rzędów' })} rz. ${ins(q + '.d', O.sruby)} kl. ${ins(q + '.kl', O.klasy)} ${fChk('gwint w płaszczyźnie ścinania', q + '.gwint')}</div>`;
      b += `<div class="lrow">e<sub>1</sub> ${inl(q + '.e1', { cls: 'sm' })} p<sub>1</sub> ${inl(q + '.p1', { cls: 'sm' })} e<sub>2</sub> ${inl(q + '.e2', { cls: 'sm' })} p<sub>3</sub> ${inl(q + '.p3', { cls: 'sm', title: 'rozstaw poprzeczny śrub' })}<span class="u">mm</span></div>`;
      b += `<div class="lrow">element podpierający: t ${inl(q + '.tsup', { cls: 'sm' })}<span class="u">mm</span> f<sub>u</sub> ${inl(q + '.fusup', { cls: 'sm' })}<span class="u">MPa</span></div>`;
    } else if (w.typ === 'blacha_zebrowa') {
      b += `<div class="lrow">blacha h<sub>p</sub> ${inl(q + '.hp', { cls: 'sm' })} t<sub>p</sub> ${inl(q + '.tp', { cls: 'sm' })}<span class="u">mm</span> spoiny a ${inl(q + '.a', { cls: 'sm' })}<span class="u">mm</span></div>`;
      b += `<div class="lrow">śruby ${inl(q + '.n', { cls: 'sm', title: 'liczba śrub w jednym rzędzie pionowym' })} × ${ins(q + '.d', O.sruby)} kl. ${ins(q + '.kl', O.klasy)} ${fChk('gwint w płaszczyźnie ścinania', q + '.gwint')}</div>`;
      b += `<div class="lrow">e<sub>1</sub> ${inl(q + '.e1', { cls: 'sm' })} p<sub>1</sub> ${inl(q + '.p1', { cls: 'sm' })} e<sub>2</sub> ${inl(q + '.e2', { cls: 'sm' })} z ${inl(q + '.z', { cls: 'sm', title: 'od lica podpory do osi śrub' })} e<sub>2,b</sub> ${inl(q + '.e2b', { cls: 'sm', title: 'od osi śrub do końca belki' })}<span class="u">mm</span></div>`;
    }
  });
  b += hint('Połączenia przegubowe sprawdzane na maksymalną reakcję SGN. Węzły momentowe (sztywne) – poza zakresem tej wersji.');
  return grp('sup', 'Podpory i połączenia (PN-EN 1993-1-8)', b);
}

function grpSGU() {
  let b = fSel('Rodzaj elementu', 'sgu.typ', O.ugi, { wide: true });
  b += fNum('Ugięcie graniczne w<sub>max</sub> = L /', 'sgu.wmax', '') + fNum('Ugięcie od zmiennych w<sub>3</sub> = L /', 'sgu.w3', '');
  b += fSel('Podniesienie wykonawcze w<sub>c</sub>', 'sgu.podniesienie', [['brak', 'brak'], ['auto', 'równe ugięciu od G'], ['wartosc', 'zadana strzałka']], { wide: true });
  if (S.sgu.podniesienie === 'wartosc') b += fNum('Strzałka w<sub>c</sub>', 'sgu.wc', 'mm');
  b += fChk('sprawdź częstotliwość drgań własnych', 'sgu.drgania');
  if (S.sgu.drgania !== false) b += fNum('Częstotliwość minimalna f<sub>min</sub>', 'sgu.fmin', 'Hz');
  b += fNum('Przemieszczenie poziome u = L /', 'sgu.uLim', '');
  b += hint('Wspornik: L = 2·L<sub>w</sub>. Kryteria SGU uzgadnia się z inwestorem (PN-EN 1990, A1.4) – wartości domyślne do weryfikacji z ZK do PN-EN 1993-1-1.');
  return grp('sgu', 'Użytkowalność (SGU)', b);
}

function grpAnal() {
  let b = fNum('Współczynnik długości wyboczeniowej μ<sub>y</sub>', 'analiza.muY', '') + fNum('Współczynnik długości wyboczeniowej μ<sub>z</sub>', 'analiza.muZ', '');
  b += fNum('Rozstaw żeber pośrednich a (0 – brak)', 'analiza.zebraRozstaw', 'm');
  b += fChk('sztywny słupek podporowy (wyboczenie przy ścinaniu)', 'analiza.slupekSztywny');
  b += hint('M<sub>cr</sub> wyznaczany MES (u, u′, φ, φ′) dla rzeczywistego rozkładu M<sub>y</sub> w każdym etapie, z uwzględnieniem wysokości przyłożenia obciążeń, monosymetrii i stężeń. χ<sub>LT</sub> i kombinacja – wg NDP profilu.');
  return grp('anal', 'Analiza i stateczność', b);
}

function grpFire() {
  let b = fChk('sprawdź nośność ogniową (PN-EN 1993-1-2)', 'pozar.aktywny');
  if (S.pozar.aktywny) {
    b += fNum('Wymagana klasa R', 'pozar.R', 'min');
    b += fSel('Nagrzewanie', 'pozar.ekspozycja', [['3', 'z 3 stron (płyta na pasie górnym)'], ['4', 'z 4 stron']], { wide: true });
    b += fSel('Zabezpieczenie', 'pozar.ochrona', [['brak', 'brak'], ['plyty', 'okładzina płytowa (skrzynkowa)'], ['natrysk', 'natrysk/powłoka (konturowa)']], { wide: true });
    if (S.pozar.ochrona !== 'brak') b += `<div class="lrow">λ<sub>p</sub> ${inl('pozar.lp', { cls: 'sm' })}<span class="u">W/mK</span> d<sub>p</sub> ${inl('pozar.dp', { cls: 'sm' })}<span class="u">mm</span> c<sub>p</sub> ${inl('pozar.cp', { cls: 'sm' })}<span class="u">J/kgK</span> ρ<sub>p</sub> ${inl('pozar.rp', { cls: 'sm' })}<span class="u">kg/m³</span></div>`;
    b += fNum('κ<sub>1</sub> (puste – automatycznie)', 'pozar.kappa1', '', { empty: true });
  }
  return grp('fire', 'Pożar', b, S.pozar.aktywny ? `<span class="st info">R${S.pozar.R}</span>` : '');
}

function grpFat() {
  let b = fChk('sprawdź zmęczenie (PN-EN 1993-1-9)', 'zmeczenie.aktywny');
  if (S.zmeczenie.aktywny) {
    b += '<div class="lrow">przypadki cykliczne: ' + S.obciazenia.filter(o => !BS.S.RODZAJE[o.rodzaj].stale).map(o => `<label class="chk"><input type="checkbox" data-act="fatCase" data-id="${esc(o.id)}"${(S.zmeczenie.przypadki || []).includes(o.id) ? ' checked' : ''}> ${esc(o.id)}</label>`).join(' ') + '</div>';
    b += fNum('Liczba cykli n w okresie użytkowania', 'zmeczenie.n', '') + fNum('Współczynnik dynamiczny φ', 'zmeczenie.phi', '');
    b += fChk('obciążenie zmienia znak (zakres ×2)', 'zmeczenie.zmiennyZnak');
    b += fSel('Metoda oceny', 'zmeczenie.ocena', [['tolerancja', 'tolerancji uszkodzeń'], ['bezpieczna', 'bezpiecznego okresu użytkowania']], { wide: true });
    b += fSel('Skutki zniszczenia', 'zmeczenie.skutki', [['male', 'małe'], ['duze', 'duże']], { wide: true });
    b += `<div class="lhead">Szczegóły konstrukcyjne <button class="addb" data-act="addDet">+ szczegół</button></div>`;
    (S.zmeczenie.detale || []).forEach((d, i) => { b += `<div class="lrow">${ins(`zmeczenie.detale.${i}.k`, BS.X.DETALE.map(q => [q.k, q.n]))}${ins(`zmeczenie.detale.${i}.miejsce`, [['pas_d', 'pas dolny'], ['pas_g', 'pas górny'], ['spoina_d', 'styk pas d.–środnik'], ['spoina_g', 'styk pas g.–środnik']])}${d.k === 'user' ? ` Δσ<sub>c</sub> ${inl(`zmeczenie.detale.${i}.dc`, { cls: 'sm' })}` : ''}<button class="del sm" data-act="delDet" data-i="${i}">×</button></div>`; });
    b += fNum('Δτ<sub>c</sub> środnika', 'zmeczenie.dtc', 'MPa');
  }
  return grp('fat', 'Zmęczenie', b);
}

function grpBrittle() {
  let b = fNum('Temperatura minimalna T<sub>md</sub>', 'kruche.Tmd', '°C') + fNum('ΔT<sub>r</sub> (promieniowanie)', 'kruche.dTr', 'K') + fNum('ΔT<sub>ε̇</sub> (prędkość odkształceń)', 'kruche.dTeps', 'K') + fNum('ΔT<sub>εcf</sub> (zgniot)', 'kruche.dTcf', 'K');
  b += fNum('σ<sub>Ed</sub>/f<sub>y</sub>(t) dla blach połączeń', 'kruche.plyty', '');
  b += hint('T<sub>md</sub> – z mapy temperatur minimalnych ZK do PN-EN 1991-1-5 (wnętrze ogrzewane – można przyjąć wyższą). ΔT<sub>R</sub> – z profilu normowego.');
  b += fChk('wymagania w kierunku grubości (klasa Z)', 'kruche.z.aktywny');
  if (S.kruche.z.aktywny) b += `<div class="lrow">a<sub>eff</sub> ${inl('kruche.z.a', { cls: 'sm' })}<span class="u">mm</span> Z<sub>b</sub> ${inl('kruche.z.Zb', { cls: 'sm', title: 'wg tabl. 3.2 b)' })} s ${inl('kruche.z.s', { cls: 'sm' })}<span class="u">mm</span> Z<sub>d</sub> ${ins('kruche.z.Zd', [[0, '0 – małe'], [3, '3 – średnie'], [5, '5 – duże']], { num: true })} Z<sub>e</sub> ${ins('kruche.z.Ze', [[0, '0 – bez podgrzewania'], [-8, '−8 – podgrzewanie ≥ 100 °C']], { num: true })}</div>`;
  return grp('brit', 'Kruche pękanie (PN-EN 1993-1-10)', b);
}

function grpExec() {
  let b = fSel('Klasa konsekwencji', 'wykonanie.CC', [['CC1', 'CC1'], ['CC2', 'CC2'], ['CC3', 'CC3']]);
  b += fSel('Klasa wykonania', 'wykonanie.EXC', [['auto', 'automatycznie (zał. C)'], ['EXC1', 'EXC1'], ['EXC2', 'EXC2'], ['EXC3', 'EXC3'], ['EXC4', 'EXC4']], { wide: true });
  if (S.wykonanie.EXC !== 'auto') b += fTxt('Uzasadnienie', 'wykonanie.uzasadnienie');
  b += fSel('Korozyjność (PN-EN ISO 12944-2)', 'wykonanie.korozja', ['C1', 'C2', 'C3', 'C4', 'C5', 'CX'].map(k => [k, k]));
  b += fSel('Trwałość ochrony', 'wykonanie.trwalosc', [['L', 'L (≤ 7 lat)'], ['M', 'M (7–15 lat)'], ['H', 'H (15–25 lat)'], ['VH', 'VH (> 25 lat)']], { wide: true });
  b += fTxt('Uwagi wykonawcze', 'wykonanie.uwagi', { area: true });
  return grp('exec', 'Wykonanie (PN-EN 1090-2)', b, R && R.exc ? `<span class="st info">${R.exc.exc}</span>` : '');
}

function grpMeta() {
  let b = fTxt('Obiekt', 'meta.obiekt') + fTxt('Projektant', 'meta.projektant') + fTxt('Nr uprawnień', 'meta.nrUprawnien') + fTxt('Sprawdzający', 'meta.sprawdzajacy') + fTxt('Data opracowania', 'meta.data', { type: 'date' }) + fTxt('Opis elementu', 'meta.opis', { area: true });
  return grp('meta', 'Metryka opracowania', b);
}

/* ---------------------------------------------------------- panel boczny: schemat */
function renderSide() {
  const el = $('#dataside'); if (!el) return;
  if (!R || !R.md) { el.innerHTML = `<div class="box">${(R && R.errors.length) ? R.errors.map(e => `<div class="msg err">${esc(e)}</div>`).join('') : '<p class="hint">Brak modelu.</p>'}</div>`; return; }
  const s = vStage === null ? R.md.nE - 1 : Math.min(vStage, R.md.nE - 1);
  let h = '<div class="box">';
  h += `<div class="bar"><b class="h2" style="margin:0">Schemat statyczny i obciążenia</b><span class="sp"></span>${stageSeg(s)}</div>`;
  h += D.scheme(S, R.md, { etap: s, width: 760 });
  h += hint(`${esc(R.md.etapy[s].nazwa)} – ${R.md.etapy[s].typ === 'montaz' ? 'sytuacja przejściowa' : 'sytuacja trwała'}. Kółko – stężenie boczne (krzyżyk – skrętne/pełne); linia przerywana – stężenie ciągłe.`);
  h += '</div>';
  if (R.env && R.env[s]) {
    const sup = R.md.systems[s].map(p => p.x);
    h += `<div class="box">${D.plot({ xs: R.an.xs, L: R.md.L, width: 760, height: 170, title: 'Obwiednia M_Ed [kNm] – SGN', unit: 'kNm', scale: 1e-6, sup, series: [{ y: R.env[s].Mmax, col: D.C.M, fill: true }, { y: R.env[s].Mmin, col: D.C.M, fill: true }] })}</div>`;
  }
  h += summaryBox();
  el.innerHTML = h;
}
function stageSeg(s) {
  if (!R || !R.md || R.md.nE < 2) return '';
  return `<span class="seg">${R.md.etapy.map((e, i) => `<button data-act="stage" data-i="${i}" class="${i === s ? 'on' : ''}" title="${esc(e.nazwa)}">Etap ${i + 1}</button>`).join('')}</span>`;
}
function summaryBox() {
  if (!R || !R.checks) return '';
  const g = R.gov;
  let h = '<div class="box"><h4>Wynik</h4>';
  if (R.errors.length) h += R.errors.map(e => `<div class="msg err">${esc(e)}</div>`).join('');
  h += `<div class="chips">${chipsHTML()}</div>`;
  if (g) h += `<p style="margin:0">Decyduje: <b>${esc(g.n)}</b> (${esc(g.ref)}) – wytężenie <b>${U.pct(g.util)}</b>${g.combo ? `<br><span class="hint">${esc(g.combo)}</span>` : ''}</p>`;
  h += '</div>';
  return h;
}
function chipsHTML() {
  if (!R || !R.checks) return '';
  const groups = {};
  R.checks.filter(c => !c.info).forEach(c => { const k = c.grp.replace(/ – etap \d+/, '').replace(/ – podpora .*/, ''); const g = groups[k] || (groups[k] = { u: 0, st: 'ok' }); if (c.util > g.u) g.u = c.util; if (c.status === 'fail') g.st = 'fail'; else if (c.status === 'warn' && g.st !== 'fail') g.st = 'warn'; });
  return Object.keys(groups).map(k => `<span class="chip ${groups[k].st}" data-act="tab" data-tab="sum">${groups[k].st === 'fail' ? '✖' : groups[k].st === 'warn' ? '!' : '✔'} ${esc(k)} <b>${isFinite(groups[k].u) ? U.pct(groups[k].u) : '∞'}</b></span>`).join('');
}

/* ================================================================ OBLICZENIA */
let tmr = null;
function schedule(ms) { clearTimeout(tmr); $('#busy').style.display = 'block'; tmr = setTimeout(recalc, ms === undefined ? 300 : ms); }
function recalc() {
  try { R = J.run(S); } catch (e) { console.error(e); R = { errors: ['Błąd obliczeń: ' + e.message], warnings: [], checks: [] }; }
  $('#busy').style.display = 'none';
  Object.keys(rendered).forEach(k => { rendered[k] = false; });
  updStatus(); renderSide(); refreshBadges();
  if (tab !== 'data') renderTab(tab);
}
A.recalc = recalc;
function refreshBadges() {
  // odświeża podsumowania w grupach bez przebudowy pól (np. klasa przekroju, EXC)
  $$('#inputs details.grp').forEach(d => {
    const id = d.dataset.g;
    if (['norm', 'sec', 'exec'].includes(id)) {
      const tmp = document.createElement('div');
      tmp.innerHTML = ({ norm: grpNorm, sec: grpSec, exec: grpExec })[id]();
      const nd = tmp.firstElementChild; nd.open = d.open;
      if (document.activeElement && d.contains(document.activeElement)) return;
      d.replaceWith(nd);
    }
  });
}
function updStatus() {
  const st = $('#status');
  if (!R) { st.textContent = '…'; st.className = ''; return; }
  if (R.errors.length) { st.textContent = `✖ Błędy danych: ${R.errors.length}`; st.className = 'fail'; }
  else if (R.nFail) { st.textContent = `✖ Niespełnione warunki: ${R.nFail}`; st.className = 'fail'; }
  else if (R.nWarn) { st.textContent = `! Ostrzeżenia: ${R.nWarn} · max ${U.pct(R.uMax)}`; st.className = 'warn'; }
  else { st.textContent = `✔ Warunki spełnione · max ${U.pct(R.uMax)}`; st.className = 'ok'; }
}

/* ================================================================ ZDARZENIA FORMULARZA */
function onInput(e) {
  const el = e.target; const p = el.dataset && el.dataset.p; if (!p) return;
  const t = el.dataset.t;
  let v;
  if (t === 'bool') v = el.checked; else if (t === 'boolT') v = el.checked;
  else if (t === 'num') { v = U.num(el.value, NaN); el.classList.toggle('bad', isNaN(v) && el.value.trim() !== ''); if (isNaN(v)) return; }
  else if (t === 'numE') { if (el.value.trim() === '') v = ''; else { v = U.num(el.value, NaN); el.classList.toggle('bad', isNaN(v)); if (isNaN(v)) return; } }
  else v = el.value;
  if (el.tagName === 'SELECT' && t === 'num') v = +el.value;
  setP(p, v);
  side(p, v);
  markDirty();
  if (el.dataset.r === '1' && e.type === 'change') { const sc = $('#inputs').closest('.pane').scrollTop; renderInputs(); $('#inputs').closest('.pane').scrollTop = sc; }
  schedule(e.type === 'change' ? 50 : 350);
}
// skutki uboczne zmian (zależności pól)
function side(p, v) {
  if (p === 'geom.przesla' || p.startsWith('geom.')) syncSupports();
  if (p === 'sgu.typ' && N.UGIECIA[v]) { S.sgu.wmax = N.UGIECIA[v].wmax; S.sgu.w3 = N.UGIECIA[v].w3; }
  if (p === 'przekroj.typ' && v === 'spaw') Object.assign(S.przekroj, { h: S.przekroj.h || 600, bg: S.przekroj.bg || 250, tg: S.przekroj.tg || 16, bd: S.przekroj.bd || 250, td: S.przekroj.td || 16, tw: S.przekroj.tw || 8, aw: S.przekroj.aw || 4 });
  if (p === 'przekroj.typ' && v === 'walc') { S.przekroj.seria = S.przekroj.seria || 'IPE'; S.przekroj.nr = S.przekroj.nr || 300; }
  if (p === 'przekroj.seria') S.przekroj.nr = P.lista(v)[Math.floor(P.lista(v).length / 2)];
  if (p === 'meta.nazwa') updateTitle();
  if (/^podpory\.\d+\.wezel\.typ$/.test(p)) {
    const i = +p.split('.')[1], w = S.podpory[i].wezel;
    const def = { oparcie: { podloze: 'beton', bp: 200, lp: 150, tp: 15, beton: 'C25/30', alfa: 1.5, lb: 150, fd: 2.0, beta: 1.2, zebro: false, bs: 70, ts: 10, ch: 15 }, blacha_czolowa: { hp: Math.round(0.65 * ((R && R.sec && R.sec.h) || 300) / 10) * 10, bp: 150, tp: 10, nr: 2, d: 'M16', kl: '8.8', e1: 40, p1: 70, e2: 30, p3: 90, a: 4, tsup: 12, fusup: 510, gwint: true }, blacha_zebrowa: { hp: Math.round(0.65 * ((R && R.sec && R.sec.h) || 300) / 10) * 10, tp: 10, n: 3, d: 'M20', kl: '8.8', e1: 40, p1: 70, e2: 40, z: 60, e2b: 40, a: 6, gwint: true }, brak: { zebro: false, bs: 70, ts: 10, ch: 15 } }[v] || {};
    Object.keys(def).forEach(k => { if (w[k] === undefined) w[k] = def[k]; });
  }
}
function syncSupports() {
  const n = S.geom.przesla.length + 1;
  while (S.podpory.length < n) S.podpory.push({ typ: 'przegub', ltb: 'widelkowe', ss: 100, c: 0, wezel: { typ: 'brak' } });
  S.podpory.length = n;
}
function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, i = +b.dataset.i;
  const re = () => { renderInputs(); markDirty(); schedule(30); };
  switch (act) {
    case 'addSpan': S.geom.przesla.push(S.geom.przesla[S.geom.przesla.length - 1] || 6); syncSupports(); re(); break;
    case 'delSpan': S.geom.przesla.splice(i, 1); syncSupports(); re(); break;
    case 'addTmp': S.podporyTymczasowe.push({ x: (U.sum(S.geom.przesla) + U.num(S.geom.wspL)) / 2, usunietaPo: Math.max(0, S.etapy.length - 2), ss: 100 }); re(); break;
    case 'delTmp': S.podporyTymczasowe.splice(i, 1); re(); break;
    case 'addLoad': { const n = S.obciazenia.length + 1; S.obciazenia.push({ id: 'Q' + n, nazwa: 'Nowe obciążenie', rodzaj: 'Q', kat: 'Q-B', etap: S.etapy.length - 1, uklad: 'staly', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: 5, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] }); re(); break; }
    case 'delLoad': S.obciazenia.splice(i, 1); re(); break;
    case 'addComp': { const k = b.dataset.k; const c = k === 'q' ? { typ: 'q', q0: 5, q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' } : k === 'P' ? { typ: 'P', P: 10, x: (U.sum(S.geom.przesla) + U.num(S.geom.wspL)) / 2, kier: 'z', wys: 'pas_g', ss: 100 } : { typ: 'M', M: 10, x: 0 }; S.obciazenia[i].sklad.push(c); re(); break; }
    case 'delComp': S.obciazenia[i].sklad.splice(+b.dataset.j, 1); re(); break;
    case 'addStage': S.etapy.splice(S.etapy.length - 1, 0, { id: 'E' + (S.etapy.length + 1), nazwa: 'Montaż – etap ' + S.etapy.length, typ: 'montaz', opis: '' }); shiftStages(S.etapy.length - 2, +1); re(); break;
    case 'delStage': S.etapy.splice(i, 1); shiftStages(i, -1); re(); break;
    case 'addBrace': S.stezenia.push({ x: (U.sum(S.geom.przesla) + U.num(S.geom.wspL)) / 2, typ: 'boczne', wys: 'pas_g', odEtapu: 0, bocznieY: true }); re(); break;
    case 'delBrace': S.stezenia.splice(i, 1); re(); break;
    case 'addDet': S.zmeczenie.detale.push({ k: 'w80', miejsce: 'pas_d' }); re(); break;
    case 'delDet': S.zmeczenie.detale.splice(i, 1); re(); break;
    case 'fatCase': { const id = b.dataset.id, L = S.zmeczenie.przypadki || (S.zmeczenie.przypadki = []); if (b.checked) { if (!L.includes(id)) L.push(id); } else L.splice(L.indexOf(id), 1); markDirty(); schedule(30); break; }
    case 'stage': vStage = i; renderSide(); if (tab !== 'data') { rendered[tab] = false; renderTab(tab); } break;
    case 'tab': selectTab(b.dataset.tab); break;
    case 'normy': dlgNormy(); break;
    case 'dobor': dlgDobor(); break;
    case 'snow': dlgSnow(); break;
    default: if (A.acts[act]) A.acts[act](b, e);
  }
}
function shiftStages(from, d) {
  const n = S.etapy.length;
  const fix = (v) => U.clamp((v > from || (d > 0 && v >= from)) ? v + d : v, 0, n - 1);
  S.obciazenia.forEach(o => { o.etap = fix(U.num(o.etap)); });
  S.stezenia.forEach(z => { z.odEtapu = fix(U.num(z.odEtapu)); });
  S.podporyTymczasowe.forEach(t => { t.usunietaPo = U.clamp(fix(U.num(t.usunietaPo)), 0, Math.max(0, n - 2)); });
  S.ciezarWlasny.etap = fix(U.num(S.ciezarWlasny.etap));
}
A.acts = {};

/* ================================================================ DIALOGI */
function modal(html, cls) { const m = $('#modal'); m.innerHTML = `<div class="dlg ${cls || ''}" role="document">${html}</div>`; m.classList.add('on'); const f = m.querySelector('input,select,button'); if (f) f.focus(); }
function closeModal() { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; }
A.modal = modal; A.closeModal = closeModal;
function ask(msg, title) { return new Promise(res => { modal(`<h3>${esc(title || 'Potwierdź')}</h3><p>${esc(msg)}</p><div class="dbtn"><button class="btn" id="aN">Anuluj</button><button class="btn pri" id="aY">OK</button></div>`, 'sm'); $('#aN').onclick = () => { closeModal(); res(false); }; $('#aY').onclick = () => { closeModal(); res(true); }; }); }

function dlgNormy() {
  const P0 = S.normy, o = N.ocen(S);
  const gen = +P0.generacja === 2 ? 2 : 1;
  const draw = (g) => {
    const req = N.wymagane(S, g), cat = g === 2 ? N.DOC2 : N.DOC1, z = P0.zestawy[g];
    let h = `<h3>Profil normowy projektu</h3><p>${esc(o.decyzja)}</p>`;
    if (o.bledy.length) h += o.bledy.map(e => `<div class="msg err">${esc(e)}</div>`).join('');
    h += `<div class="bar"><span class="seg"><button data-g="1" class="${g === 1 ? 'on' : ''}">Zestaw 1. generacji</button><button data-g="2" class="${g === 2 ? 'on' : ''}">Zestaw 2. generacji</button></span><span class="hint">Pogrubione – dokumenty wymagane dla zakresu tego projektu.</span></div>`;
    h += '<div class="normtab"><table class="grid"><tr><th>Dokument (wydanie)</th><th>Zmiany (A)</th><th>Poprawki (AC/Ap)</th><th>Załącznik krajowy</th><th>Status PN / ZK</th><th>Zweryf.</th></tr>';
    cat.forEach(d => {
      const q = `normy.zestawy.${g}.${d.k}`, e = z[d.k] || {};
      const rq = req.includes(d.k);
      h += `<tr style="${rq ? '' : 'opacity:.55'}"><td>${rq ? '<b>' : ''}<input class="txt" data-p="${q}.oznaczenie" data-t="str" value="${esc(e.oznaczenie || '')}">${rq ? '</b>' : ''}<div class="hint">${esc(d.tytul)}${d.zakres ? ' – ' + esc(d.zakres) : ''}${d.pewnosc === 'sprawdz' ? ' <b>[sprawdź oznaczenie]</b>' : ''}</div></td>`;
      h += `<td><input class="txt" data-p="${q}.zmiany" data-t="list" value="${esc((e.zmiany || []).join('; '))}"></td><td><input class="txt" data-p="${q}.poprawki" data-t="list" value="${esc((e.poprawki || []).join('; '))}"></td><td><input class="txt" data-p="${q}.zk" data-t="str" value="${esc(e.zk || '')}"></td>`;
      h += `<td><select data-p="${q}.pn" data-t="str">${opt([['PN – wydanie polskie', 'PN – wyd. polskie'], ['PN – wydanie angielskie (uznanie)', 'PN – uznanie (ang.)'], ['nieustalony', 'nieustalony'], ['nieopublikowana', 'nieopublikowana']], e.pn)}</select><select data-p="${q}.zkStatus" data-t="str">${opt([['opublikowany', 'ZK opublikowany'], ['brak', 'brak ZK'], ['nie dotyczy', 'ZK nie dotyczy']], e.zkStatus)}</select></td>`;
      h += `<td style="text-align:center"><input type="checkbox" data-p="${q}.zweryfikowano" data-t="bool"${e.zweryfikowano ? ' checked' : ''}></td></tr>`;
    });
    h += '</table></div>';
    h += `<div class="bar" style="margin-top:8px"><button class="btn sm" id="nAll">Oznacz wymagane jako zweryfikowane</button><button class="btn sm" id="nDef">Przywróć oznaczenia programu</button></div>`;
    if (g === 1) {
      h += '<h4>Parametry ustalane krajowo (NDP) – 1. generacja, ZK PL</h4><div class="normtab"><table class="grid"><tr><th>Parametr</th><th>Wartość</th><th>Punkt normy</th><th>Źródło</th></tr>';
      Object.keys(N.NDP1_PL).forEach(k => {
        const d = N.NDP1_PL[k], v = P0.ndp1[k] !== undefined ? P0.ndp1[k] : d.v;
        const ch = String(v) !== String(d.v);
        h += `<tr><td>${esc(d.d)}</td><td style="width:120px"><input class="txt${typeof d.v === 'number' ? ' num' : ''}" data-p="normy.ndp1.${k}" data-t="${typeof d.v === 'number' ? 'num' : 'str'}" value="${esc(typeof v === 'number' ? numStr(v) : v)}"${ch ? ' style="border-color:var(--warn)"' : ''}></td><td class="hint">${esc(d.ref)}</td><td class="hint">${esc(d.z)}${d.sp ? ' – <b>zweryfikuj w ZK</b>' : ''}${ch ? ` · <b>zmieniono (program: ${esc(String(d.v))})</b>` : ''}</td></tr>`;
      });
      h += '</table></div>';
    } else {
      h += '<div class="msg wrn">NDP 2. generacji należy wprowadzić z polskich załączników krajowych do 2. generacji (gdy zostaną opublikowane). Program nie przenosi wartości z ZK do 1. generacji. Silnik tej wersji realizuje obliczenia wyłącznie wg 1. generacji – przy wyborze 2. generacji następuje udokumentowane zastosowanie zestawu 1. generacji w całości.</div>';
    }
    h += `<h4>Stan wiedzy programu (${esc(N.STAN_WIEDZY.data)})</h4><ul>${N.STAN_WIEDZY.tekst.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="hint">Źródła: ${N.STAN_WIEDZY.zrodla.map(esc).join('; ')}</p>`;
    h += '<div class="dbtn"><button class="btn pri" id="nOk">Zamknij</button></div>';
    modal(h, 'lg');
    $$('#modal [data-g]').forEach(b => { b.onclick = () => draw(+b.dataset.g); });
    $('#nOk').onclick = () => { closeModal(); renderInputs(); schedule(10); };
    $('#nAll').onclick = () => { req.forEach(k => { if (z[k]) z[k].zweryfikowano = true; }); if (!P0.dataWeryfikacji) P0.dataWeryfikacji = new Date().toISOString().slice(0, 10); markDirty(); draw(g); };
    $('#nDef').onclick = () => { const d0 = N.defaultProfile(); P0.zestawy[g] = d0.zestawy[g]; if (g === 1) P0.ndp1 = d0.ndp1; markDirty(); draw(g); };
  };
  draw(gen);
}

function dlgDobor() {
  const ser = new Set(['IPE', 'HEA']);
  modal(`<h3>Dobór kształtownika walcowanego</h3><p>Program sprawdza kolejne kształtowniki (od najlżejszego) z wybranych serii pełnym tokiem obliczeń (SGN, stateczność, SGU, podpory, połączenia) i przyjmuje najlżejszy spełniający wszystkie warunki.</p>
    <div class="lrow">${J.SERIE_DOBOR.map(s => `<label class="chk"><input type="checkbox" data-s="${s}"${ser.has(s) ? ' checked' : ''}> ${s}</label>`).join(' ')}</div>
    <div class="row"><label>Wytężenie dopuszczalne</label><input class="txt num" id="dLim" value="100"><span class="unit">%</span></div>
    <div id="dProg" class="hint"></div><div class="dbtn"><button class="btn" id="dX">Anuluj</button><button class="btn pri" id="dGo">Dobierz</button></div>`);
  let stop = false;
  $('#dX').onclick = () => { stop = true; closeModal(); };
  $('#dGo').onclick = async () => {
    const list = J.candidates($$('#modal [data-s]').filter(c => c.checked).map(c => c.dataset.s));
    const lim = U.num($('#dLim').value, 100) / 100;
    $('#dGo').disabled = true;
    for (let k = 0; k < list.length && !stop; k++) {
      const c = list[k];
      $('#dProg').textContent = `Sprawdzam ${c.seria} ${c.nr} (${U.fmt(c.masa, 1)} kg/m)… ${k + 1}/${list.length}`;
      await new Promise(r => setTimeout(r, 0));
      const st = U.clone(S); st.przekroj = { typ: 'walc', seria: c.seria, nr: c.nr };
      let r; try { r = J.run(st, { fast: true }); } catch (e) { continue; }
      if (J.passes(r, lim)) {
        $('#dProg').innerHTML = `<b>Dobrano: ${c.seria} ${c.nr}</b> (${U.fmt(c.masa, 1)} kg/m), wytężenie max ${U.pct(r.uMax)} – decyduje: ${esc(r.gov ? r.gov.n : '')}.`;
        $('#dGo').disabled = false; $('#dGo').textContent = 'Przyjmij';
        $('#dGo').onclick = () => { S.przekroj = { typ: 'walc', seria: c.seria, nr: c.nr }; closeModal(); markDirty(); renderInputs(); schedule(10); toast(`Przyjęto ${c.seria} ${c.nr}`); };
        return;
      }
    }
    if (!stop) { $('#dProg').textContent = 'Żaden kształtownik z wybranych serii nie spełnia warunków – rozważ zmianę schematu, stężeń, gatunku stali lub dwuteownik spawany.'; $('#dGo').disabled = false; }
  };
}

function dlgSnow() {
  modal(`<h3>Obciążenie śniegiem – PN-EN 1991-1-3 z ZK PL</h3>
    <div class="row"><label>Strefa obciążenia śniegiem</label><select id="sZ">${[1, 2, 3, 4, 5].map(z => `<option value="${z}"${z === 2 ? ' selected' : ''}>strefa ${z}</option>`).join('')}</select><span class="unit"></span></div>
    <div class="row"><label>Wysokość nad poziomem morza A</label><input class="txt num" id="sA" value="200"><span class="unit">m</span></div>
    <div class="row"><label>Kąt nachylenia dachu α</label><input class="txt num" id="sAl" value="5"><span class="unit">°</span></div>
    <div class="row"><label>C<sub>e</sub> (0,8 / 1,0 / 1,2)</label><input class="txt num" id="sCe" value="1,0"><span class="unit"></span></div>
    <div class="row"><label>C<sub>t</sub></label><input class="txt num" id="sCt" value="1,0"><span class="unit"></span></div>
    <div class="row"><label>Rozstaw belek (szerokość zbierania)</label><input class="txt num" id="sB" value="2,0"><span class="unit">m</span></div>
    <p id="sOut" class="hint"></p>
    <p class="hint">Wartości s<sub>k</sub> wg ZK PL: strefa 1: 0,007A − 1,4 ≥ 0,70; 2: 0,9; 3: 0,006A − 0,6 ≥ 1,2; 4: 1,6; 5: 0,93·exp(0,00134A) ≥ 2,0 kN/m². μ<sub>1</sub> dla dachu jedno- i dwuspadowego. Worki śnieżne i inne układy – wprowadź osobno.</p>
    <div class="dbtn"><button class="btn" id="sX">Anuluj</button><button class="btn pri" id="sGo">Dodaj przypadek S</button></div>`);
  const calc = () => {
    const z = +$('#sZ').value, Aa = U.num($('#sA').value), al = U.num($('#sAl').value);
    const sk = z === 1 ? Math.max(0.7, 0.007 * Aa - 1.4) : z === 2 ? 0.9 : z === 3 ? Math.max(1.2, 0.006 * Aa - 0.6) : z === 4 ? 1.6 : Math.max(2.0, 0.93 * Math.exp(0.00134 * Aa));
    const mu = al <= 30 ? 0.8 : al < 60 ? 0.8 * (60 - al) / 30 : 0;
    const s = mu * U.num($('#sCe').value, 1) * U.num($('#sCt').value, 1) * sk, q = s * U.num($('#sB').value, 1);
    $('#sOut').innerHTML = `s<sub>k</sub> = ${U.fmt(sk, 2)} kN/m², μ<sub>1</sub> = ${U.fmt(mu, 2)} → s = ${U.fmt(s, 3)} kN/m² → <b>q = ${U.fmt(q, 2)} kN/m</b>`;
    return { sk, mu, s, q, z, Aa };
  };
  $$('#modal input, #modal select').forEach(e => { e.oninput = calc; e.onchange = calc; }); calc();
  $('#sX').onclick = closeModal;
  $('#sGo').onclick = () => { const r = calc(); S.obciazenia.push({ id: 'S' + (S.obciazenia.filter(o => o.rodzaj === 'S').length + 1), nazwa: `Śnieg – strefa ${r.z}, A = ${r.Aa} m, s = ${U.fmt(r.s, 2)} kN/m²`, rodzaj: 'S', etap: S.etapy.length - 1, uklad: 'szachownica', wyklucz: '', N: 0, sklad: [{ typ: 'q', q0: +r.q.toFixed(3), q1: '', x0: 0, x1: '', kier: 'z', wys: 'pas_g' }] }); closeModal(); markDirty(); renderInputs(); schedule(10); };
}

function dlgAbout() {
  modal(`<h3>${BS.APP} ${BS.VERSION}</h3><p>Analiza i projektowanie belek stalowych według Eurokodów z jawnym profilem normowym (Polska: PN-EN z załącznikami krajowymi). Program prowadzi od założeń do kompletnego, odtwarzalnego raportu: nośność, stateczność, SGU, podpory, połączenia, etapy realizacji, pożar, zmęczenie, kruche pękanie, klasa wykonania.</p>
  <p><b>Silnik:</b> ${esc(BS.ENGINE)} · format danych: ${esc(BS.FORMAT)}</p>
  <p><b>Odtwarzalność:</b> raport zawiera sumę kontrolną SHA-256 danych wejściowych (postać kanoniczna JSON), wersję silnika i pełne dane projektu – plik raportu HTML można ponownie otworzyć w programie.</p>
  <p><b>Zakres i ograniczenia:</b> przekroje dwuteowe walcowane i spawane (bi- i monosymetryczne), pryzmatyczne; analiza sprężysta I rzędu; zwichrzenie – MES z obciążeniami w płaszczyźnie środnika; brak skręcania od mimośrodu obciążeń; węzły przegubowe (bez węzłów momentowych); zmęczenie – obciążenia stacjonarne o stałej amplitudzie; pożar – metody uproszczone (4.2.3–4.2.5).</p>
  <p class="hint">Skróty: Ctrl+N nowy, Ctrl+O otwórz, Ctrl+S zapisz, Ctrl+P drukuj raport.</p>
  <div class="dbtn"><button class="btn pri" id="abOk">OK</button></div>`, 'sm');
  $('#abOk').onclick = closeModal;
}

/* ================================================================ PLIKI */
let reqId = 0; const pending = {};
window.__hostReply = (id, res) => { const p = pending[id]; if (p) { delete pending[id]; p(res); } };
function hostCall(op, args) { return new Promise(res => { const id = ++reqId; pending[id] = res; try { window.hostRequest(JSON.stringify(Object.assign({ id, op }, args))); } catch (e) { delete pending[id]; res({ ok: false, err: String(e) }); } }); }
const inHost = () => typeof window.hostRequest === 'function';
function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, ms || 2600); }
A.toast = toast;
const baseName = (p) => (p || '').split(/[\\/]/).pop();
const safeName = (ext) => (S.meta.nazwa || 'belka').replace(/[\\/:*?"<>|]+/g, '_').trim() + ext;
function markDirty() { dirty = true; updateTitle(); autosave(); }
function updateTitle() {
  const fn = filePath ? baseName(filePath) : 'bez nazwy';
  $('#fileName').textContent = (dirty ? '● ' : '') + fn;
  const t = `${BS.APP} – ${S.meta.nazwa || 'belka'} [${fn}${dirty ? ' *' : ''}]`;
  document.title = t;
  if (typeof window.hostTitle === 'function') { try { window.hostTitle(t); } catch (e) { /* */ } }
}
function projectJSON() {
  return JSON.stringify({ format: BS.FORMAT, program: `${BS.APP} ${BS.VERSION}`, silnik: BS.ENGINE, zapisano: new Date().toISOString(), sha256: J.hash(S), dane: S }, null, 1);
}
A.projectJSON = projectJSON;
function download(name, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
A.download = download;
async function saveProject(as) {
  if (inHost()) {
    const r = await hostCall('save', { path: as ? '' : filePath, name: safeName('.belkastal'), content: projectJSON(), filter: 'project' });
    if (r && r.ok) { filePath = r.path; dirty = false; updateTitle(); toast('Zapisano: ' + baseName(r.path)); } else if (r && r.err) toast('Błąd zapisu: ' + r.err);
  } else { download(safeName('.belkastal'), projectJSON(), 'application/json'); dirty = false; updateTitle(); }
}
function loadProject(text, name) {
  let o;
  try {
    const t = text.trim();
    if (t.startsWith('<')) { const m = t.match(/<script type="application\/json" id="belkastal-dane">([\s\S]*?)<\/script>/); if (!m) throw new Error('plik HTML nie zawiera danych projektu BelkaStal'); o = JSON.parse(m[1].replace(/<\\\//g, '</')); }
    else o = JSON.parse(t);
  } catch (e) { toast('Nie można odczytać pliku: ' + e.message, 4000); return; }
  const dane = o.dane || o;
  if (o.format && o.format !== BS.FORMAT) toast('Uwaga: inny format pliku – dane zostały uzupełnione.', 3500);
  S = J.normalize(dane); filePath = name || ''; dirty = false; vStage = null;
  $('#projName').value = S.meta.nazwa;
  if (o.sha256 && o.sha256 !== J.hash(dane)) toast('Uwaga: suma kontrolna danych w pliku nie zgadza się z zawartością (plik edytowany ręcznie?).', 5000);
  renderInputs(); recalc(); updateTitle(); autosave();
}
async function openProject() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Otworzyć inny projekt?', 'Otwórz'))) return;
  if (inHost()) { const r = await hostCall('open', { filter: 'project' }); if (r && r.ok) loadProject(r.content, r.path); else if (r && r.err) toast('Błąd odczytu: ' + r.err); return; }
  const inp = $('#fileIn'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (f) f.text().then(t => loadProject(t, f.name)); }; inp.click();
}
async function newProject() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Utworzyć nowy projekt?', 'Nowy projekt'))) return;
  S = J.defaultState(); filePath = ''; dirty = false; vStage = null; $('#projName').value = S.meta.nazwa; renderInputs(); recalc(); updateTitle(); autosave();
}
function autosave() { try { localStorage.setItem('belkastal-autosave', JSON.stringify(S)); } catch (e) { /* tryb prywatny */ } }
async function exportHTML() {
  if (!R || R.errors.length) { toast('Usuń błędy danych przed eksportem raportu.'); return; }
  const doc = BS.Raport.document(S, R);
  const name = safeName(' – raport.html');
  if (inHost()) { const r = await hostCall('save', { path: '', name, content: doc, filter: 'html' }); if (r && r.ok) toast('Zapisano raport: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); }
  else download(name, doc, 'text/html');
}
function doPrint() { selectTab('report'); setTimeout(() => window.print(), 150); }
A.acts.exporthtml = exportHTML; A.acts.print = doPrint; A.acts.save = () => saveProject(false); A.acts.saveas = () => saveProject(true); A.acts.open = openProject; A.acts.new = newProject; A.acts.about = dlgAbout; A.acts.json = () => download(safeName('.belkastal'), projectJSON(), 'application/json');
A.acts.status = () => selectTab('sum');

/* ================================================================ ZAKŁADKI */
function selectTab(t) {
  tab = t;
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  renderTab(t);
}
A.selectTab = selectTab;
function renderTab(t) {
  if (t === 'data' || rendered[t]) return;
  const el = $('#p-' + t); if (!el) return;
  const s = vStage === null ? (R && R.md ? R.md.nE - 1 : 0) : vStage;
  try { el.innerHTML = BS.V[t](S, R, { etap: s, stageSeg: stageSeg(s) }); } catch (e) { console.error(e); el.innerHTML = `<div class="msg err">Błąd widoku: ${esc(e.message)}</div>`; }
  rendered[t] = true;
}

/* ================================================================ START */
function init() {
  try { const a = localStorage.getItem('belkastal-autosave'); if (a) S = J.normalize(JSON.parse(a)); } catch (e) { S = J.defaultState(); }
  $('#projName').value = S.meta.nazwa;
  $('#projName').addEventListener('input', e => { S.meta.nazwa = e.target.value; markDirty(); schedule(800); });
  const inputs = $('#inputs');
  inputs.addEventListener('input', onInput); inputs.addEventListener('change', onInput);
  document.addEventListener('click', onClick);
  $('#modal').addEventListener('input', e => { if (e.target.dataset.p) { if (e.target.dataset.t === 'list') { setP(e.target.dataset.p, e.target.value.split(';').map(s => s.trim()).filter(Boolean)); markDirty(); return; } onInput(e); } });
  $('#modal').addEventListener('change', e => { if (e.target.dataset.p && e.target.dataset.t !== 'list') onInput(e); });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  inputs.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.g) { if (d.open) openGrp.add(d.dataset.g); else openGrp.delete(d.dataset.g); try { localStorage.setItem('belkastal-grp', JSON.stringify(Array.from(openGrp))); } catch (er) { /* */ } } }, true);
  $$('.tabs button').forEach(b => { b.onclick = () => selectTab(b.dataset.tab); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#modal').classList.contains('on')) closeModal();
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); saveProject(e.shiftKey); } else if (k === 'o') { e.preventDefault(); openProject(); } else if (k === 'p') { e.preventDefault(); doPrint(); } else if (k === 'n' && e.altKey) { e.preventDefault(); newProject(); }
  });
  window.addEventListener('beforeunload', e => { if (dirty && inHost()) { e.preventDefault(); e.returnValue = ''; } });
  renderInputs(); recalc(); updateTitle();
  if (window.__hostOpenFile) loadProject(window.__hostOpenFile.content, window.__hostOpenFile.path);
}
A.init = init;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
