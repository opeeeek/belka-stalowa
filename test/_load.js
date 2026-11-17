// Ładuje moduły silnika w kolejności (jak w przeglądarce) i zwraca przestrzeń nazw BS.
const path = require('path');
const ORDER = ['core', 'normy', 'materialy', 'przekroje', 'mes', 'statyka', 'kombinacje', 'nosnosc', 'statecznosc', 'polaczenia', 'wezly', 'kotwy', 'dodatkowe', 'projekt'];
for (const f of ORDER) require(path.join(__dirname, '..', 'src', 'engine', f + '.js'));
module.exports = globalThis.BS;
module.exports.ORDER = ORDER;
