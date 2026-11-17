/* =====================================================================
   BelkaStal – eksport raportu do edytowalnego pliku OpenDocument (.odt)
   (nagłówki, akapity, tabele, indeksy, rysunki SVG → PNG; ZIP „stored”)
   oraz wersja raportu bez odwołań do punktów normy (jak w BelkaŻB).
   ===================================================================== */
(function () {
'use strict';
const BZR = window.BS.ODT = {};
BZR.odt = async function (html, title) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;'; host.innerHTML = html; document.body.appendChild(host);
  const pics = [];
  const svgPng = async svg => {
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
    const w = vb ? vb.width : (+svg.getAttribute('width') || svg.getBoundingClientRect().width || 800), h = vb ? vb.height : (+svg.getAttribute('height') || svg.getBoundingClientRect().height || 400);
    const cl = svg.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', w); cl.setAttribute('height', h);
    cl.querySelectorAll('[style*="var("]').forEach(el => el.removeAttribute('style'));
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl).replace(/var\(--[^,)]+,\s*([^)]+)\)/g, '$1').replace(/var\(--[^)]+\)/g, '#1b2230'));
    const img = new Image(); await new Promise(res => { img.onload = res; img.onerror = res; img.src = src; });
    const k = 2, cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height); try { cx.drawImage(img, 0, 0, cv.width, cv.height); } catch (e) { /* */ }
    const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const name = `Pictures/r${pics.length + 1}.png`; pics.push({ name, data: u });
    const wcm = Math.min(17, w / 96 * 2.54 * 0.85), hcm = wcm * h / w;
    return `<draw:frame draw:name="r${pics.length}" text:anchor-type="as-char" svg:width="${wcm.toFixed(2)}cm" svg:height="${hcm.toFixed(2)}cm"><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  };
  const inline = async el => {
    let o = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { o += esc(n.nodeValue.replace(/\s+/g, ' ')); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'svg') { o += await svgPng(n); continue; }
      if (t === 'br') { o += '<text:line-break/>'; continue; }
      if (t === 'sub') { o += `<text:span text:style-name="Tsub">${await inline(n)}</text:span>`; continue; }
      if (t === 'sup') { o += `<text:span text:style-name="Tsup">${await inline(n)}</text:span>`; continue; }
      if (t === 'b' || t === 'strong' || t === 'th') { o += `<text:span text:style-name="Tb">${await inline(n)}</text:span>`; continue; }
      if (n.classList && (n.classList.contains('ok') || n.classList.contains('fail') || n.classList.contains('warn'))) { o += `<text:span text:style-name="${n.classList.contains('ok') ? 'Tok' : n.classList.contains('fail') ? 'Tfail' : 'Twarn'}">${await inline(n)}</text:span>`; continue; }
      if (n.classList && n.classList.contains('r')) { o += `<text:tab/>${await inline(n)}`; continue; }
      o += await inline(n);
    }
    return o;
  };
  let body = `<text:p text:style-name="Title">${esc(title || 'Raport obliczeń')}</text:p>`;
  const block = async el => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) body += `<text:p text:style-name="Body">${esc(n.nodeValue.trim())}</text:p>`; continue; }      // tekst wpisany wprost (raport własny)
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'br') continue;
      if (/^h[1-4]$/.test(t)) { body += `<text:h text:style-name="H${t[1]}" text:outline-level="${+t[1] > 1 ? +t[1] - 1 : 1}">${await inline(n)}</text:h>`; continue; }
      if (t === 'table') {
        if (n.classList.contains('pwrap')) { const tb = n.querySelector('td.pbody'); if (tb) await block(tb); continue; }
        const rows = [...n.querySelectorAll('tr')]; if (!rows.length) continue; const nc = Math.max(...rows.map(r => [...r.children].reduce((a, c) => a + (+c.getAttribute('colspan') || 1), 0)));
        body += `<table:table table:style-name="Tab"><table:table-column table:number-columns-repeated="${nc}"/>`;
        for (const r of rows) { body += '<table:table-row>'; for (const c of r.children) { const cs = +c.getAttribute('colspan') || 1; body += `<table:table-cell table:style-name="Cell" office:value-type="string"${cs > 1 ? ` table:number-columns-spanned="${cs}"` : ''}><text:p text:style-name="${c.tagName === 'TH' ? 'Th' : 'Td'}">${await inline(c)}</text:p></table:table-cell>`; for (let k = 1; k < cs; k++) body += '<table:covered-table-cell/>'; } body += '</table:table-row>'; }
        body += '</table:table>'; continue;
      }
      if (t === 'div' && (n.classList.contains('fig') || n.classList.contains('tscroll'))) { if (n.querySelector('table') && !n.querySelector('svg')) { await block(n); continue; } body += `<text:p text:style-name="Fig">${await inline(n)}</text:p>`; continue; }
      if (t === 'ul' || t === 'ol') { for (const li of n.children) body += `<text:p text:style-name="Li">• ${await inline(li)}</text:p>`; continue; }
      if (t === 'div' && n.children.length && [...n.children].some(c => /^(h[1-4]|table|div|p|ul|ol)$/i.test(c.tagName)) && !n.classList.contains('eq')) { await block(n); continue; }
      const st = n.classList.contains('eq') ? 'Eq' : n.classList.contains('note') ? 'Note' : n.classList.contains('verdict') ? 'Verdict' : 'Body';
      const tx = await inline(n); if (tx.trim()) body += `<text:p text:style-name="${st}">${tx}</text:p>`;
    }
  };
  try { await block(host); } finally { host.remove(); }
  const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
  const ps = (n, o) => `<style:style style:name="${n}" style:family="paragraph"${o.parent ? ` style:parent-style-name="${o.parent}"` : ''}><style:paragraph-properties fo:margin-top="${o.mt || '0cm'}" fo:margin-bottom="${o.mb || '0.1cm'}"${o.ml ? ` fo:margin-left="${o.ml}"` : ''}${o.tab ? '><style:tab-stops><style:tab-stop style:position="16.5cm" style:type="right"/></style:tab-stops></style:paragraph-properties>' : '/>'}<style:text-properties fo:font-size="${o.fs || '10pt'}"${o.b ? ' fo:font-weight="bold"' : ''}${o.c ? ` fo:color="${o.c}"` : ''}${o.it ? ' fo:font-style="italic"' : ''}/></style:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-family="Calibri, Arial, sans-serif" fo:font-size="10pt" fo:language="pl" fo:country="PL"/></style:default-style></office:styles><office:automatic-styles><style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="1.8cm" fo:margin-bottom="1.8cm" fo:margin-left="2cm" fo:margin-right="1.8cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL"/></office:master-styles></office:document-styles>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:automatic-styles>` +
    ps('Title', { fs: '16pt', b: true, mb: '0.3cm' }) + ps('H1', { fs: '13pt', b: true, mt: '0.4cm', mb: '0.15cm', c: '#1d3f78' }) + ps('H2', { fs: '13pt', b: true, mt: '0.4cm', mb: '0.15cm', c: '#1d3f78' }) + ps('H3', { fs: '11pt', b: true, mt: '0.25cm', mb: '0.1cm' }) + ps('H4', { fs: '10pt', b: true, mt: '0.2cm' }) +
    ps('Body', {}) + ps('Eq', { ml: '0.4cm', tab: true }) + ps('Note', { fs: '9pt', it: true, c: '#4a5466' }) + ps('Verdict', { fs: '11pt', b: true, mt: '0.3cm' }) + ps('Li', { ml: '0.4cm' }) + ps('Fig', { mt: '0.2cm', mb: '0.2cm' }) + ps('Td', { fs: '9pt', mb: '0cm' }) + ps('Th', { fs: '9pt', b: true, mb: '0cm' }) +
    `<style:style style:name="Tsub" style:family="text"><style:text-properties style:text-position="sub 58%"/></style:style><style:style style:name="Tsup" style:family="text"><style:text-properties style:text-position="super 58%"/></style:style><style:style style:name="Tb" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="Tok" style:family="text"><style:text-properties fo:color="#1d7f3c" fo:font-weight="bold"/></style:style><style:style style:name="Tfail" style:family="text"><style:text-properties fo:color="#c0262d" fo:font-weight="bold"/></style:style><style:style style:name="Twarn" style:family="text"><style:text-properties fo:color="#a35d00" fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="Tab" style:family="table"><style:table-properties style:width="17cm" table:align="left" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm"/></style:style><style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.05cm" fo:border="0.5pt solid #9aa3b0"/></style:style>` +
    `</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text" manifest:version="1.2"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${pics.map(p => `<manifest:file-entry manifest:full-path="${p.name}" manifest:media-type="image/png"/>`).join('')}</manifest:manifest>`;
  const enc = new TextEncoder();
  return BZR.zip([{ name: 'mimetype', data: enc.encode('application/vnd.oasis.opendocument.text') }, { name: 'META-INF/manifest.xml', data: enc.encode(manifest) }, { name: 'styles.xml', data: enc.encode(styles) }, { name: 'content.xml', data: enc.encode(content) }, ...pics]);
};
BZR.noRefs = function (html) {
  const COMBO = /^\(?6\.1[0-6][ab]?(?:\s*\/\s*6\.1[0-6][ab]?(?:,b)?)*\)?:?$/;
  const KW = '(?:tab\\.|tabl\\.|tablica|tablicy|rys\\.|zał\\.|załącznik|wz[óo]r)';
  const ATOM = `(?:${KW}\\s*(?:[A-Z]\\.?)?(?:\\d+(?:\\.\\d+)*)?[A-Za-z]?|(?:[A-Z]\\.)?[1-9]\\d?\\.\\d{1,2}(?:\\.\\d{1,2})*[a-zN]?(?:\\(\\d+\\))*)`;
  const PART = new RegExp(`^(?:wg\\s+|por\\.\\s+|patrz\\s+)?(?:(?:PN-)?EN\\s[\\d-]+,?\\s*)?${ATOM}(?:\\s*(?:,|i|oraz)\\s*${ATOM})*$`);
  const isRef = t => { t = t.trim(); if (!t || COMBO.test(t)) return false; return PART.test(t); };
  const clean = s => {
    if (!/\d\.\d|tab\.|tabl|rys\.|zał\.|wz[óo]r/.test(s)) return s;
    let o = s;
    // nawiasy (także z jednym poziomem zagnieżdżenia): części będące odwołaniami usuwane, nawias pusty – cały
    o = o.replace(/\s?\(((?:[^()]|\([^()]*\))*)\)/g, (m, inner) => {
      const parts = inner.split(/\s*(?:,|;| \/ | – )\s*/); const keep = parts.filter(q => !isRef(q));
      if (keep.length === parts.length) return m;
      if (!keep.length || keep.every(q => !q.trim())) return '';
      return `${m[0] === ' ' ? ' ' : ''}(${keep.join(', ')})`;
    });
    // odwołania poza nawiasami: „tab. 4.4N”, „zał. E”, punkty z podpunktem / numerem ustępu (np. 8.2(4), 9.2.1.1(1), 4.4.1)
    o = o.replace(new RegExp(`(,\\s*)?\\b${KW}\\s*(?:[A-Z]\\.?)?(?:\\d+(?:\\.\\d+)*)?[A-Za-z]?(?=[\\s,.;:)]|$)`, 'g'), '');
    o = o.replace(/(^|[^=\d.,\s]\s|[(\[,;]\s?)((?:wg\s+)?(?:[1-9]\d?\.\d{1,2}(?:\.\d{1,2})+|[1-9]\d?\.\d{1,2})(?:\(\d+\))+|[1-9]\d?\.\d{1,2}(?:\.\d{1,2}){2,})(?=[\s,.;:)\]]|$)/g, (m, pre, ref) => COMBO.test(ref) ? m : pre.replace(/[,;]\s?$/, ''));
    o = o.replace(/=\s*,\s*/g, '= ').replace(/\(\s*,\s*/g, '(').replace(/,\s*\)/g, ')').replace(/\(\s*\)/g, '').replace(/ {2,}/g, ' ').replace(/ ([,.;:])/g, '$1');
    return o;
  };
  const t = document.createElement('template'); t.innerHTML = html;
  t.content.querySelectorAll('span.r').forEach(sp => { const tx = sp.textContent.replace(/^\s*\[|\]\s*$/g, '').trim(); if (!COMBO.test(tx)) sp.remove(); });
  const w = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && /^(style|script)$/i.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { const v = clean(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
  return t.innerHTML;
};
BZR.zip = function (files) {
  const T = BZR._crcT || (BZR._crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })());
  const crc = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  files.forEach(f => {
    const nm = enc.encode(f.name), c = crc(f.data), sz = f.data.length;
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, c, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, f.data);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, c, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + sz;
  });
  const cs = cen.reduce((a, u) => a + u.length, 0), ed = new DataView(new ArrayBuffer(22)); ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, files.length, true); ed.setUint16(10, files.length, true); ed.setUint32(12, cs, true); ed.setUint32(16, off, true);
  const all = [...parts, ...cen, new Uint8Array(ed.buffer)], n = all.reduce((a, u) => a + u.length, 0), out = new Uint8Array(n); let p = 0; all.forEach(u => { out.set(u, p); p += u.length; });
  return out;
};
})();
