// Buduje jeden samodzielny plik dist/BelkaStal.html (bez zależności zewnętrznych).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ENGINE = ['core', 'normy', 'materialy', 'przekroje', 'mes', 'statyka', 'kombinacje', 'nosnosc', 'statecznosc', 'polaczenia', 'wezly', 'dodatkowe', 'projekt'].map(f => `src/engine/${f}.js`);
const UI = ['baza', 'rysunki', 'rys_wezly', 'objasnienia', 'raport', 'odt', 'app', 'okna', 'projektant', 'widok3d', 'widoki'].map(f => `src/ui/${f}.js`);
const read = (p) => readFileSync(p, 'utf8');
const css = read('src/ui/app.css');
const scripts = ENGINE.concat(UI).map(p => `<script>/* ${p} */\n${read(p).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
// ikona strony (ta sama co ikona programu .exe – dwuteownik)
const icon = `<link rel="icon" type="image/png" href="data:image/png;base64,${readFileSync('host/ikona32.png').toString('base64')}">`;
let html = read('src/ui/index.html').replace('/*@CSS@*/', () => css).replace('<!--@ICON@-->', () => icon).replace('<!--@SCRIPTS@-->', () => scripts);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/BelkaStal.html', html);
const h = createHash('sha256').update(html).digest('hex');
console.log(`dist/BelkaStal.html – ${(html.length / 1024).toFixed(0)} kB, sha256 ${h.slice(0, 16)}…`);
