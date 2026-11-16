/* =====================================================================
   BelkaStal – PROFIL NORMOWY PROJEKTU
   Jawny zestaw dokumentów: kraj, generacja Eurokodów, dokładne wydania,
   zmiany (A), poprawki (AC/Ap), załączniki krajowe (ZK/NA), data
   i autor weryfikacji zestawu.  Zasady:
     • generacji nie miesza się – cały projekt liczony jest wg jednej generacji;
     • ZK do 1. generacji nie jest przenoszony do 2. generacji
       (PKN: ZK opublikowany do Eurokodu 1. edycji stosuje się wyłącznie z nim);
     • gdy zestaw 2. generacji potrzebny dla zakresu projektu jest niekompletny
       (brak PN, brak ZK, brak obsługi w silniku) – stosuje się w całości
       zestaw 1. generacji zgodnie z aktualnymi wytycznymi PKN dotyczącymi
       okresu współistnienia; decyzja i jej uzasadnienie trafiają do raportu.
   Oznaczenia dokumentów są danymi profilu: projektant potwierdza każdą
   pozycję w katalogu PKN (pole „zweryfikowano”) i wpisuje datę weryfikacji.
   ===================================================================== */
(function (root) {
'use strict';
const BS = root.BS;
const N = BS.N = {};

N.KRAJE = { PL: 'Polska (PN-EN, załączniki krajowe PL)' };
N.GENERACJE = {
  1: '1. generacja Eurokodów (EN 1990…1999:2002–2007 ze zmianami i poprawkami)',
  2: '2. generacja Eurokodów (EN 1990:2023, EN 1993-1-1:2022 i kolejne)'
};
// Obsługa generacji przez silnik obliczeniowy tej wersji programu.
N.SILNIK = { 1: true, 2: false };

// Stan wiedzy wbudowany w program (do potwierdzenia przez projektanta – pole data weryfikacji).
N.STAN_WIEDZY = {
  data: '2026-11-16',
  tekst: [
    'Eurokody 2. edycji (EN 1990…EN 1999) mają zostać wprowadzone do zbioru Polskich Norm najpóźniej do 30.09.2027 r.; załączniki krajowe do 2. edycji będą opracowywane przez komitety techniczne PKN w terminie późniejszym (informacja PKN – strona „Eurokody”).',
    'Załącznik krajowy opublikowany do Eurokodu 1. edycji stosuje się wyłącznie z Eurokodem 1. edycji (informacja PKN).',
    'Termin wycofania (DoW) Eurokodów 1. generacji przyjęty przez CEN: 30.03.2028 r. Do tego czasu 1. generacja z ZK pozostaje kompletnym, spójnym zestawem do projektowania w Polsce.',
    'Komunikat PKN nr 2/2026 (cytowany w źródłach wtórnych) – części 1. generacji pozostają aktualne do 31.03.2028 r. Treść komunikatu należy potwierdzić u źródła.'
  ],
  zrodla: ['PKN – Eurokody (pkn.pl, sektor: budownictwo i konstrukcje budowlane)', 'CEN/TC 250 – program 2. generacji (DoP 30.09.2027, DoW 30.03.2028)', 'JRC – Eurocodes: EN 1993-1-1:2022 opublikowana przez CEN 2022-11-09']
};

/* ------------------------------------------------------------------
   Katalog dokumentów.  Pole „gdy” – warunek zakresu (funkcja stanu projektu).
   Pole „pewnosc”: 'tak' – oznaczenie zgodne ze stanem wiedzy programu;
   'sprawdz' – szczególnie wymaga potwierdzenia w katalogu PKN.
   ------------------------------------------------------------------ */
const always = () => true;
const has = (rodzaj) => (st) => (st.obciazenia || []).some(o => o.rodzaj === rodzaj && o.aktywne !== false);
const anyConn = (st) => (st.podpory || []).some(p => p.wezel && ['blacha_czolowa', 'blacha_zebrowa'].includes(p.wezel.typ));
const anyBearing = (kind) => (st) => (st.podpory || []).some(p => p.wezel && p.wezel.typ === 'oparcie' && p.wezel.podloze === kind);
const stages = (st) => (st.etapy || []).length > 1 || (st.podpory || []).some(p => p.tymczasowa);
const fire = (st) => !!(st.pozar && st.pozar.aktywny);
const fat = (st) => !!(st.zmeczenie && st.zmeczenie.aktywny);

const DOC1 = [
  { k: 'EN1990', oznaczenie: 'PN-EN 1990:2004', en: 'EN 1990:2002', tytul: 'Eurokod – Podstawy projektowania konstrukcji',
    zmiany: ['PN-EN 1990:2004/A1:2008'], poprawki: ['PN-EN 1990:2004/AC:2008', 'PN-EN 1990:2004/A1:2008/AC:2010'],
    zk: 'Załącznik krajowy NA – w polskiej wersji PN-EN 1990:2004', gdy: always, zakres: 'sytuacje obliczeniowe, kombinacje oddziaływań (6.10, 6.10a/b, 6.11, 6.14–6.16), współczynniki γ i ψ (zał. A1), klasy konsekwencji (zał. B)', pewnosc: 'tak' },
  { k: 'EN1991-1-1', oznaczenie: 'PN-EN 1991-1-1:2004', en: 'EN 1991-1-1:2002', tytul: 'Eurokod 1 – Oddziaływania ogólne – Ciężar objętościowy, ciężar własny, obciążenia użytkowe w budynkach',
    zmiany: [], poprawki: ['PN-EN 1991-1-1:2004/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: always, zakres: 'ciężar własny (stal 77–78,5 kN/m³), obciążenia użytkowe kategorii A–H', pewnosc: 'tak' },
  { k: 'EN1991-1-3', oznaczenie: 'PN-EN 1991-1-3:2005', en: 'EN 1991-1-3:2003', tytul: 'Eurokod 1 – Oddziaływania ogólne – Obciążenie śniegiem',
    zmiany: ['PN-EN 1991-1-3:2005/A1:2015'], poprawki: ['PN-EN 1991-1-3:2005/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy (strefy obciążenia śniegiem 1–5)', gdy: has('S'), zakres: 'obciążenie śniegiem dachu s = μᵢ·Cₑ·Cₜ·sₖ', pewnosc: 'sprawdz' },
  { k: 'EN1991-1-4', oznaczenie: 'PN-EN 1991-1-4:2008', en: 'EN 1991-1-4:2005', tytul: 'Eurokod 1 – Oddziaływania ogólne – Oddziaływania wiatru',
    zmiany: ['PN-EN 1991-1-4:2008/A1:2010'], poprawki: ['PN-EN 1991-1-4:2008/AC:2009'], zk: 'PN-EN 1991-1-4:2008/NA:2010', gdy: has('W'), zakres: 'ciśnienie/ssanie wiatru na przekrycie przekazywane na belkę', pewnosc: 'sprawdz' },
  { k: 'EN1991-1-5', oznaczenie: 'PN-EN 1991-1-5:2005', en: 'EN 1991-1-5:2003', tytul: 'Eurokod 1 – Oddziaływania ogólne – Oddziaływania termiczne',
    zmiany: [], poprawki: ['PN-EN 1991-1-5:2005/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy (mapy Tmin/Tmax)', gdy: (st) => has('T')(st) || true, zakres: 'temperatura minimalna Tmd do doboru gatunku stali (PN-EN 1993-1-10), oddziaływania termiczne', pewnosc: 'tak' },
  { k: 'EN1991-1-6', oznaczenie: 'PN-EN 1991-1-6:2007', en: 'EN 1991-1-6:2005', tytul: 'Eurokod 1 – Oddziaływania ogólne – Oddziaływania w czasie wykonywania konstrukcji',
    zmiany: [], poprawki: ['PN-EN 1991-1-6:2007/AC:2008'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: (st) => stages(st) || has('Qc')(st), zakres: 'obciążenia montażowe Qca…Qcf, sytuacje przejściowe – etapy realizacji', pewnosc: 'tak' },
  { k: 'EN1991-1-7', oznaczenie: 'PN-EN 1991-1-7:2008', en: 'EN 1991-1-7:2006', tytul: 'Eurokod 1 – Oddziaływania ogólne – Oddziaływania wyjątkowe',
    zmiany: ['PN-EN 1991-1-7:2008/A1:2014'], poprawki: ['PN-EN 1991-1-7:2008/AC:2010'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: has('A'), zakres: 'oddziaływania wyjątkowe Ad (uderzenie, wybuch) – kombinacja 6.11', pewnosc: 'sprawdz' },
  { k: 'EN1991-3', oznaczenie: 'PN-EN 1991-3:2009', en: 'EN 1991-3:2006', tytul: 'Eurokod 1 – Oddziaływania wywołane dźwignicami i maszynami',
    zmiany: [], poprawki: ['PN-EN 1991-3:2009/AC:2012'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: has('M'), zakres: 'oddziaływania od urządzeń i maszyn (współczynniki dynamiczne)', pewnosc: 'sprawdz' },
  { k: 'EN1991-1-2', oznaczenie: 'PN-EN 1991-1-2:2006', en: 'EN 1991-1-2:2002', tytul: 'Eurokod 1 – Oddziaływania ogólne – Oddziaływania na konstrukcje w warunkach pożaru',
    zmiany: [], poprawki: ['PN-EN 1991-1-2:2006/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: fire, zakres: 'pożar standardowy (krzywa ISO 834), kombinacja w sytuacji pożarowej', pewnosc: 'tak' },
  { k: 'EN1993-1-1', oznaczenie: 'PN-EN 1993-1-1:2006', en: 'EN 1993-1-1:2005', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Reguły ogólne i reguły dla budynków',
    zmiany: ['PN-EN 1993-1-1:2006/A1:2014-07'], poprawki: ['PN-EN 1993-1-1:2006/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: always, zakres: 'analiza, klasyfikacja przekrojów, nośność przekroju (6.2), stateczność (6.3), SGU (7), wybór klasy wykonania (zał. C)', pewnosc: 'tak' },
  { k: 'EN1993-1-5', oznaczenie: 'PN-EN 1993-1-5:2008', en: 'EN 1993-1-5:2006', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Blachownice',
    zmiany: ['PN-EN 1993-1-5:2008/A1:2017', 'PN-EN 1993-1-5:2008/A2:2019'], poprawki: ['PN-EN 1993-1-5:2008/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: always, zakres: 'szerokość efektywna (kl. 4), wyboczenie przy ścinaniu (5), siły skupione (6), interakcje (7), żebra (9)', pewnosc: 'sprawdz' },
  { k: 'EN1993-1-8', oznaczenie: 'PN-EN 1993-1-8:2006', en: 'EN 1993-1-8:2005', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Projektowanie węzłów',
    zmiany: [], poprawki: ['PN-EN 1993-1-8:2006/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: (st) => anyConn(st) || anyBearing('beton')(st), zakres: 'śruby (3), spoiny (4), połączenia przegubowe, podstawy/oparcia (6.2.5)', pewnosc: 'tak' },
  { k: 'EN1993-1-9', oznaczenie: 'PN-EN 1993-1-9:2007', en: 'EN 1993-1-9:2005', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Zmęczenie',
    zmiany: [], poprawki: ['PN-EN 1993-1-9:2007/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: fat, zakres: 'kategorie szczegółów, krzywe S-N, γMf, sumowanie uszkodzeń', pewnosc: 'tak' },
  { k: 'EN1993-1-10', oznaczenie: 'PN-EN 1993-1-10:2007', en: 'EN 1993-1-10:2005', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Dobór stali ze względu na odporność na kruche pękanie i ciągliwość międzywarstwową',
    zmiany: [], poprawki: ['PN-EN 1993-1-10:2007/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: always, zakres: 'maksymalna grubość elementów (tabl. 2.1), klasy Z (rozdz. 3)', pewnosc: 'tak' },
  { k: 'EN1993-1-2', oznaczenie: 'PN-EN 1993-1-2:2007', en: 'EN 1993-1-2:2005', tytul: 'Eurokod 3 – Projektowanie konstrukcji stalowych – Obliczanie konstrukcji z uwagi na warunki pożarowe',
    zmiany: [], poprawki: ['PN-EN 1993-1-2:2007/AC:2009'], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: fire, zakres: 'właściwości stali w temperaturze, nośność w pożarze (4.2.3), przyrost temperatury (4.2.5)', pewnosc: 'tak' },
  { k: 'EN1992-1-1', oznaczenie: 'PN-EN 1992-1-1:2008', en: 'EN 1992-1-1:2004', tytul: 'Eurokod 2 – Projektowanie konstrukcji z betonu – Reguły ogólne i reguły dla budynków',
    zmiany: ['PN-EN 1992-1-1:2008/A1:2015'], poprawki: ['PN-EN 1992-1-1:2008/AC:2011'], zk: 'Załącznik krajowy NA – w polskiej wersji normy (γc = 1,4; αcc = 1,0)', gdy: anyBearing('beton'), zakres: 'fcd, docisk lokalny (6.7) – oparcie belki na betonie', pewnosc: 'sprawdz' },
  { k: 'EN1996-1-1', oznaczenie: 'PN-EN 1996-1-1+A1:2013-05', en: 'EN 1996-1-1:2005+A1:2012', tytul: 'Eurokod 6 – Projektowanie konstrukcji murowych – Reguły ogólne',
    zmiany: [], poprawki: [], zk: 'Załącznik krajowy NA – w polskiej wersji normy', gdy: anyBearing('mur'), zakres: 'nośność muru na obciążenie skupione (6.1.3) – oparcie belki na murze', pewnosc: 'sprawdz' },
  { k: 'EN1090-2', oznaczenie: 'PN-EN 1090-2:2018-09', en: 'EN 1090-2:2018', tytul: 'Wykonanie konstrukcji stalowych i aluminiowych – Część 2: Wymagania techniczne dotyczące konstrukcji stalowych',
    zmiany: [], poprawki: [], zk: '— (norma wykonawcza – nie ma ZK)', gdy: always, zakres: 'klasa wykonania EXC, spawanie, śruby, tolerancje, kontrola', pewnosc: 'sprawdz', wykonawcza: true }
];

// Normy wyrobów i wykonawcze (niezależne od generacji Eurokodów).
N.WYROBY = [
  { k: 'EN10025', oznaczenie: 'PN-EN 10025-1/-2/-3/-4', en: 'EN 10025-1:2004, EN 10025-2:2019, EN 10025-3:2019, EN 10025-4:2019', tytul: 'Wyroby walcowane na gorąco ze stali konstrukcyjnych', zakres: 'gatunek i podgatunek stali (S235…S460, JR/J0/J2/K2/N/NL/M/ML)' },
  { k: 'EN10365', oznaczenie: 'PN-EN 10365', en: 'EN 10365:2017', tytul: 'Kształtowniki walcowane na gorąco – ceowniki, dwuteowniki – wymiary i masy', zakres: 'wymiary IPE, HEA, HEB, HEM' },
  { k: 'EN10034', oznaczenie: 'PN-EN 10034', en: 'EN 10034:1993', tytul: 'Kształtowniki I i H ze stali konstrukcyjnej – tolerancje wymiarów i kształtu', zakres: 'tolerancje wyrobu' },
  { k: 'EN10029', oznaczenie: 'PN-EN 10029', en: 'EN 10029:2010', tytul: 'Blachy stalowe walcowane na gorąco grubości ≥ 3 mm – tolerancje', zakres: 'blachy: pasy blachownic, blachy czołowe, żebra' },
  { k: 'EN10164', oznaczenie: 'PN-EN 10164', en: 'EN 10164:2018', tytul: 'Wyroby stalowe o polepszonych właściwościach plastycznych w kierunku prostopadłym do powierzchni', zakres: 'klasy Z15/Z25/Z35' },
  { k: 'EN10204', oznaczenie: 'PN-EN 10204', en: 'EN 10204:2004', tytul: 'Wyroby metalowe – rodzaje dokumentów kontroli', zakres: 'świadectwa 2.2 / 3.1' },
  { k: 'EN15048', oznaczenie: 'PN-EN 15048-1', en: 'EN 15048-1:2016', tytul: 'Zestawy śrubowe konstrukcyjne bez sprężania', zakres: 'śruby kl. 4.6…10.9 (PN-EN ISO 4014/4017, nakrętki PN-EN ISO 4032, PN-EN ISO 898-1)' },
  { k: 'EN14399', oznaczenie: 'PN-EN 14399-1/-3/-4', en: 'EN 14399-1:2015', tytul: 'Zestawy śrubowe wysokiej wytrzymałości do połączeń sprężanych', zakres: 'połączenia sprężane HR/HV' },
  { k: 'EN5817', oznaczenie: 'PN-EN ISO 5817', en: 'EN ISO 5817:2023', tytul: 'Spawanie – złącza spawane – poziomy jakości według niezgodności spawalniczych', zakres: 'poziomy jakości B/C/D wg EXC' },
  { k: 'EN3834', oznaczenie: 'PN-EN ISO 3834-2/-3', en: 'EN ISO 3834-2:2021', tytul: 'Wymagania jakości dotyczące spawania materiałów metalowych', zakres: 'system jakości spawalniczej wytwórcy' },
  { k: 'EN9606', oznaczenie: 'PN-EN ISO 9606-1, PN-EN ISO 15614-1, PN-EN ISO 14731', en: 'EN ISO 9606-1:2017, EN ISO 15614-1:2017, EN ISO 14731:2019', tytul: 'Kwalifikowanie spawaczy, technologii spawania, nadzór spawalniczy', zakres: 'personel i technologie spawania' },
  { k: 'EN12944', oznaczenie: 'PN-EN ISO 12944-1…-9', en: 'EN ISO 12944-2:2017', tytul: 'Ochrona przed korozją konstrukcji stalowych za pomocą ochronnych systemów malarskich', zakres: 'kategoria korozyjności C1…CX, trwałość L/M/H/VH' }
];

/* 2. generacja – oznaczenia EN; status PN i ZK uzupełnia projektant.  ZK do 1. generacji
   nie może być tu wpisany (sprawdzane).  Rok wydania null = do uzupełnienia/zweryfikowania. */
const DOC2 = [
  { k: 'EN1990', en: 'EN 1990:2023', tytul: 'Eurocode – Basis of structural and geotechnical design', gdy: always },
  { k: 'EN1991-1-1', en: 'EN 1991-1-1 (2. gen.)', tytul: 'Eurocode 1 – Actions on structures – Part 1-1: Specific weight of materials, self-weight of construction works and imposed loads on buildings', gdy: always },
  { k: 'EN1991-1-3', en: 'EN 1991-1-3 (2. gen.)', tytul: 'Eurocode 1 – Part 1-3: Snow loads', gdy: has('S') },
  { k: 'EN1991-1-4', en: 'EN 1991-1-4 (2. gen.)', tytul: 'Eurocode 1 – Part 1-4: Wind actions', gdy: has('W') },
  { k: 'EN1991-1-5', en: 'EN 1991-1-5 (2. gen.)', tytul: 'Eurocode 1 – Part 1-5: Thermal actions', gdy: always },
  { k: 'EN1991-1-6', en: 'EN 1991-1-6 (2. gen.)', tytul: 'Eurocode 1 – Part 1-6: Actions during execution', gdy: (st) => stages(st) || has('Qc')(st) },
  { k: 'EN1991-1-7', en: 'EN 1991-1-7 (2. gen.)', tytul: 'Eurocode 1 – Part 1-7: Accidental actions', gdy: has('A') },
  { k: 'EN1991-3', en: 'EN 1991-3 (2. gen.)', tytul: 'Eurocode 1 – Part 3: Actions induced by cranes and machinery', gdy: has('M') },
  { k: 'EN1991-1-2', en: 'EN 1991-1-2 (2. gen.)', tytul: 'Eurocode 1 – Part 1-2: Actions on structures exposed to fire', gdy: fire },
  { k: 'EN1993-1-1', en: 'EN 1993-1-1:2022', tytul: 'Eurocode 3 – Design of steel structures – Part 1-1: General rules and rules for buildings', gdy: always },
  { k: 'EN1993-1-5', en: 'EN 1993-1-5:2024', tytul: 'Eurocode 3 – Part 1-5: Plated structural elements', gdy: always },
  { k: 'EN1993-1-8', en: 'EN 1993-1-8:2024', tytul: 'Eurocode 3 – Part 1-8: Joints', gdy: (st) => anyConn(st) || anyBearing('beton')(st) },
  { k: 'EN1993-1-9', en: 'EN 1993-1-9 (2. gen.)', tytul: 'Eurocode 3 – Part 1-9: Fatigue', gdy: fat },
  { k: 'EN1993-1-10', en: 'EN 1993-1-10 (2. gen.)', tytul: 'Eurocode 3 – Part 1-10: Material toughness and through-thickness properties', gdy: always },
  { k: 'EN1993-1-2', en: 'EN 1993-1-2:2024', tytul: 'Eurocode 3 – Part 1-2: Structural fire design', gdy: fire },
  { k: 'EN1992-1-1', en: 'EN 1992-1-1:2023', tytul: 'Eurocode 2 – Design of concrete structures – Part 1-1', gdy: anyBearing('beton') },
  { k: 'EN1996-1-1', en: 'EN 1996-1-1 (2. gen.)', tytul: 'Eurocode 6 – Design of masonry structures – Part 1-1', gdy: anyBearing('mur') },
  { k: 'EN1090-2', en: 'EN 1090-2:2018', tytul: 'Execution of steel structures – Part 2 (norma wykonawcza – wspólna dla obu generacji)', gdy: always, wykonawcza: true }
];
N.DOC1 = DOC1; N.DOC2 = DOC2;

/* ------------------------------------------------------------------
   Parametry ustalane krajowo (NDP) – 1. generacja, Polska.
   z: źródło wartości; sp: true = wartość do szczególnej weryfikacji z ZK.
   ------------------------------------------------------------------ */
N.NDP1_PL = {
  gG_sup:   { v: 1.35, d: 'γG,sup – oddziaływania stałe niekorzystne (STR)', ref: 'PN-EN 1990, tabl. A1.2(B)', z: 'ZK PL' },
  gG_inf:   { v: 1.00, d: 'γG,inf – oddziaływania stałe korzystne (STR)', ref: 'PN-EN 1990, tabl. A1.2(B)', z: 'ZK PL' },
  gQ:       { v: 1.50, d: 'γQ – oddziaływania zmienne (STR)', ref: 'PN-EN 1990, tabl. A1.2(B)', z: 'ZK PL' },
  xi:       { v: 0.85, d: 'ξ – współczynnik redukcyjny w 6.10b', ref: 'PN-EN 1990, tabl. A1.2(B)', z: 'ZK PL' },
  komb:     { v: '6.10ab', d: 'Postać kombinacji SGN (6.10 lub mniej korzystna z 6.10a i 6.10b)', ref: 'PN-EN 1990, 6.4.3.2 i tabl. A1.2(B)', z: 'ZK PL – dopuszcza obie postacie', sp: true },
  gG_sup_equ: { v: 1.10, d: 'γG,sup (EQU)', ref: 'PN-EN 1990, tabl. A1.2(A)', z: 'ZK PL' },
  gG_inf_equ: { v: 0.90, d: 'γG,inf (EQU)', ref: 'PN-EN 1990, tabl. A1.2(A)', z: 'ZK PL' },
  gQ_equ:   { v: 1.50, d: 'γQ (EQU)', ref: 'PN-EN 1990, tabl. A1.2(A)', z: 'ZK PL' },
  KFI:      { v: 1.00, d: 'KFI – zróżnicowanie niezawodności (RC2/CC2 = 1,0)', ref: 'PN-EN 1990, zał. B, B3.3', z: 'wartość zalecana', sp: true },
  psiAcc:   { v: 'psi1', d: 'Wiodące towarzyszące w sytuacji wyjątkowej i pożarowej: ψ1,1 lub ψ2,1', ref: 'PN-EN 1990, 6.4.3.3; PN-EN 1991-1-2, 4.3.1', z: 'przyjęto ψ1,1 (bezpieczniej); sprawdź ZK', sp: true },
  gM0:      { v: 1.00, d: 'γM0 – nośność przekroju', ref: 'PN-EN 1993-1-1, 6.1(1)', z: 'ZK PL' },
  gM1:      { v: 1.00, d: 'γM1 – stateczność elementu', ref: 'PN-EN 1993-1-1, 6.1(1)', z: 'ZK PL' },
  gM2:      { v: 1.25, d: 'γM2 – nośność przekroju netto, śruby, spoiny', ref: 'PN-EN 1993-1-1, 6.1(1); PN-EN 1993-1-8, 2.2', z: 'ZK PL' },
  fySrc:    { v: 'tab31', d: 'Źródło fy, fu: tablica 3.1 PN-EN 1993-1-1 (tab31) lub norma wyrobu (wyrob)', ref: 'PN-EN 1993-1-1, 3.2.1(1)', z: 'ZK PL', sp: true },
  lamLT0:   { v: 0.40, d: 'λLT,0 – metoda 6.3.2.3', ref: 'PN-EN 1993-1-1, 6.3.2.3(1)', z: 'ZK PL', sp: true },
  betaLT:   { v: 0.75, d: 'β – metoda 6.3.2.3', ref: 'PN-EN 1993-1-1, 6.3.2.3(1)', z: 'ZK PL', sp: true },
  ltbMet:   { v: '6.3.2.3', d: 'Metoda wyznaczania χLT dla dwuteowników walcowanych i spawanych równoważnych', ref: 'PN-EN 1993-1-1, 6.3.2.2 / 6.3.2.3', z: 'ZK PL', sp: true },
  kcMet:    { v: 'tab66', d: 'kc do współczynnika f: tabl. 6.6 (rozkład liniowy) / 1/√C1 (pozostałe)', ref: 'PN-EN 1993-1-1, 6.3.2.3(2), tabl. 6.6', z: 'program; sprawdź ZK', sp: true },
  interMet: { v: 'B', d: 'Metoda współczynników interakcji kij (zał. A lub B)', ref: 'PN-EN 1993-1-1, 6.3.3(5)', z: 'ZK PL (zał. B)', sp: true },
  eta:      { v: 1.20, d: 'η – dla stali do S460 (1,0 dla wyższych)', ref: 'PN-EN 1993-1-5, 5.1(2)', z: 'wartość zalecana', sp: true },
  gMfi:     { v: 1.00, d: 'γM,fi – sytuacja pożarowa', ref: 'PN-EN 1993-1-2, 2.3(1)', z: 'ZK PL' },
  gFf:      { v: 1.00, d: 'γFf – zmęczenie, obciążenie', ref: 'PN-EN 1993-1-9, 3(7)', z: 'wartość zalecana' },
  dTR:      { v: 0, d: 'ΔTR – element bezpieczeństwa [K]', ref: 'PN-EN 1993-1-10, 2.2(5)', z: 'wartość zalecana', sp: true },
  gc:       { v: 1.40, d: 'γc – beton (sytuacja trwała)', ref: 'PN-EN 1992-1-1, 2.4.2.4', z: 'ZK PL' },
  acc:      { v: 1.00, d: 'αcc', ref: 'PN-EN 1992-1-1, 3.1.6(1)', z: 'ZK PL' },
  betaJ:    { v: 2 / 3, d: 'βj – współczynnik materiałowy podlewki', ref: 'PN-EN 1993-1-8, 6.2.5(7)', z: 'norma' }
};
// Ugięcia graniczne – kryteria uzgadniane z inwestorem (PN-EN 1990, A1.4; PN-EN 1993-1-1, 7.2.1 z ZK).
N.UGIECIA = {
  strop:   { nazwa: 'belka stropowa', wmax: 250, w3: 350 },
  stropT:  { nazwa: 'belka stropowa pod kruchymi ściankami/tynkiem', wmax: 350, w3: 500 },
  dach:    { nazwa: 'belka dachowa / dźwigar', wmax: 250, w3: 300 },
  platew:  { nazwa: 'płatew, rygiel ścienny', wmax: 200, w3: 250 },
  podciag: { nazwa: 'podciąg (podpierający inne belki)', wmax: 350, w3: 400 },
  inne:    { nazwa: 'inne – wartości własne', wmax: 250, w3: 300 }
};

/* ψ wg PN-EN 1990 tabl. A1.1 (Polska – wartości przyjęte w ZK; śnieg dla H ≤ 1000 m n.p.m.) */
N.PSI = {
  'Q-A': { n: 'Kat. A – powierzchnie mieszkalne', p: [0.7, 0.5, 0.3] },
  'Q-B': { n: 'Kat. B – powierzchnie biurowe', p: [0.7, 0.5, 0.3] },
  'Q-C': { n: 'Kat. C – miejsca zebrań', p: [0.7, 0.7, 0.6] },
  'Q-D': { n: 'Kat. D – powierzchnie handlowe', p: [0.7, 0.7, 0.6] },
  'Q-E': { n: 'Kat. E – magazyny', p: [1.0, 0.9, 0.8] },
  'Q-F': { n: 'Kat. F – ruch pojazdów ≤ 30 kN', p: [0.7, 0.7, 0.6] },
  'Q-G': { n: 'Kat. G – ruch pojazdów 30–160 kN', p: [0.7, 0.5, 0.3] },
  'Q-H': { n: 'Kat. H – dachy', p: [0.0, 0.0, 0.0] },
  'S':   { n: 'Śnieg (H ≤ 1000 m n.p.m.)', p: [0.5, 0.2, 0.0] },
  'W':   { n: 'Wiatr', p: [0.6, 0.2, 0.0] },
  'T':   { n: 'Temperatura (nie pożar)', p: [0.6, 0.5, 0.0] },
  'Qc':  { n: 'Obciążenia montażowe (PN-EN 1991-1-6)', p: [1.0, 1.0, 0.2], sp: true },
  'M':   { n: 'Urządzenia i maszyny (PN-EN 1991-3)', p: [1.0, 0.9, 0.5], sp: true }
};

/* ------------------------------------------------------------------
   Profil domyślny w danych projektu
   ------------------------------------------------------------------ */
N.defaultProfile = function () {
  const z1 = {}, z2 = {};
  DOC1.forEach(d => { z1[d.k] = { oznaczenie: d.oznaczenie, zmiany: d.zmiany.slice(), poprawki: d.poprawki.slice(), zk: d.zk, pn: 'PN – wydanie polskie', zkStatus: d.wykonawcza ? 'nie dotyczy' : 'opublikowany', zweryfikowano: false, uwagi: '' }; });
  DOC2.forEach(d => { z2[d.k] = { oznaczenie: 'PN-' + d.en, zmiany: [], poprawki: [], zk: '', pn: d.wykonawcza ? 'PN – wydanie polskie' : 'nieustalony', zkStatus: d.wykonawcza ? 'nie dotyczy' : 'brak', zweryfikowano: false, uwagi: '' }; });
  const ndp = {}; Object.keys(N.NDP1_PL).forEach(k => { ndp[k] = N.NDP1_PL[k].v; });
  return {
    kraj: 'PL', generacja: 1, dataWeryfikacji: '', zweryfikowal: '', zrodloWeryfikacji: 'Katalog Polskich Norm PKN; komunikaty PKN dot. Eurokodów',
    zestawy: { 1: z1, 2: z2 }, ndp1: ndp, ndp2: {}
  };
};

N.docMeta = (gen, k) => (gen === 2 ? DOC2 : DOC1).find(d => d.k === k);

/* Dokumenty wymagane dla zakresu projektu (z uzasadnieniem) */
N.wymagane = function (st, gen) {
  const cat = gen === 2 ? DOC2 : DOC1;
  return cat.filter(d => { try { return d.gdy(st); } catch (e) { return true; } }).map(d => d.k);
};

/* ------------------------------------------------------------------
   Ocena profilu: która generacja będzie stosowana, braki, błędy mieszania.
   ------------------------------------------------------------------ */
N.ocen = function (st) {
  const P = st.normy || N.defaultProfile();
  const out = { genZadana: +P.generacja || 1, genStosowana: 1, kraj: P.kraj, bledy: [], ostrz: [], decyzja: '', braki2: [], dokumenty: [], ndp: {} };
  if (P.kraj !== 'PL') out.bledy.push('Program zawiera parametry krajowe wyłącznie dla Polski (PL).');
  const req1 = N.wymagane(st, 1), req2 = N.wymagane(st, 2);
  const z1 = (P.zestawy && P.zestawy[1]) || {}, z2 = (P.zestawy && P.zestawy[2]) || {};

  // --- ocena kompletności zestawu 2. generacji dla zakresu projektu
  const braki2 = [];
  req2.forEach(k => {
    const d = z2[k] || {}; const meta = N.docMeta(2, k);
    if (!d.pn || d.pn === 'nieustalony' || d.pn === 'nieopublikowana') braki2.push(`${meta.en}: brak potwierdzonej publikacji jako PN`);
    if (!meta.wykonawcza && d.zkStatus !== 'opublikowany' && d.zkStatus !== 'nie dotyczy') braki2.push(`${meta.en}: brak polskiego załącznika krajowego do 2. generacji`);
    // ZK 1. generacji wpisany do 2. generacji – niedopuszczalne
    const m1 = N.docMeta(1, k);
    if (d.zk && m1 && (d.zk.indexOf(m1.oznaczenie) >= 0 || /:200\d|:201\d/.test(d.zk))) out.bledy.push(`${meta.en}: wpisano załącznik krajowy 1. generacji („${d.zk}”) – ZK do 1. edycji stosuje się wyłącznie z 1. edycją; usuń wpis.`);
  });
  if (!N.SILNIK[2]) braki2.push('silnik obliczeniowy tej wersji programu nie obejmuje reguł 2. generacji (wzory i NDP nie są mieszane z 1. generacją)');
  out.braki2 = braki2;

  if (out.genZadana === 2) {
    if (braki2.length) {
      out.genStosowana = 1;
      out.decyzja = 'Wybrano 2. generację, ale zestaw dokumentów 2. generacji potrzebny dla zakresu projektu jest niekompletny. ' +
        'Zgodnie z wytycznymi PKN dotyczącymi okresu współistnienia (ZK do 1. edycji stosuje się wyłącznie z 1. edycją; 1. generacja pozostaje w zbiorze PN do wycofania) ' +
        'obliczenia wykonano w całości według zestawu 1. generacji z załącznikami krajowymi PL. Generacji nie mieszano.';
      out.ostrz.push('Profil 2. generacji niekompletny – zastosowano w całości 1. generację (szczegóły: Profil normowy).');
    } else {
      out.genStosowana = 2;
      out.decyzja = 'Zestaw 2. generacji kompletny dla zakresu projektu.';
    }
  } else {
    out.genStosowana = 1;
    out.decyzja = 'Wybrano 1. generację Eurokodów z polskimi załącznikami krajowymi – kompletny zestaw dla zakresu projektu. Generacji nie mieszano.';
  }

  // --- dokumenty stosowane (tylko jednej generacji)
  const gen = out.genStosowana;
  const req = gen === 2 ? req2 : req1, z = gen === 2 ? z2 : z1;
  req.forEach(k => {
    const meta = N.docMeta(gen, k), d = z[k] || {};
    out.dokumenty.push({ k, gen, oznaczenie: d.oznaczenie || meta.oznaczenie || meta.en, en: meta.en, tytul: meta.tytul, zmiany: d.zmiany || [], poprawki: d.poprawki || [], zk: d.zk || '', zkStatus: d.zkStatus || '', pn: d.pn || '', zakres: meta.zakres || '', zweryfikowano: !!d.zweryfikowano, pewnosc: meta.pewnosc || '', uwagi: d.uwagi || '', wykonawcza: !!meta.wykonawcza });
    // spójność generacji: oznaczenie dokumentu musi należeć do stosowanej generacji
    const des = d.oznaczenie || '';
    if (gen === 1 && /EN 199\d[-\d]*:202\d/.test(des) && !meta.wykonawcza) out.bledy.push(`Dokument ${des} należy do 2. generacji – nie może wchodzić do zestawu 1. generacji.`);
    if (gen === 1 && !meta.wykonawcza && !d.zk) out.bledy.push(`${des}: brak wskazania załącznika krajowego.`);
  });
  const nVer = out.dokumenty.filter(d => !d.zweryfikowano).length;
  if (!P.dataWeryfikacji) out.ostrz.push('Profil normowy: nie podano daty weryfikacji zestawu dokumentów.');
  if (!P.zweryfikowal) out.ostrz.push('Profil normowy: nie podano osoby weryfikującej zestaw.');
  if (nVer) out.ostrz.push(`Profil normowy: ${nVer} z ${out.dokumenty.length} dokumentów nie oznaczono jako zweryfikowane w katalogu PKN.`);
  if (P.dataWeryfikacji) {
    const age = (Date.parse(N.STAN_WIEDZY.data) - Date.parse(P.dataWeryfikacji)) / 864e5;
    if (age > 365) out.ostrz.push('Profil normowy: weryfikacja zestawu starsza niż 12 miesięcy – sprawdź aktualność wydań, zmian i poprawek.');
  }
  // --- NDP stosowane
  const base = N.NDP1_PL, ndpU = P.ndp1 || {};
  Object.keys(base).forEach(k => {
    const v = ndpU[k] !== undefined && ndpU[k] !== '' ? ndpU[k] : base[k].v;
    out.ndp[k] = v;
  });
  out.ndpZmienione = Object.keys(base).filter(k => ndpU[k] !== undefined && ndpU[k] !== '' && String(ndpU[k]) !== String(base[k].v));
  return out;
};

N.refPrefix = (gen) => (gen === 2 ? 'EN ' : 'PN-EN ');

})(typeof globalThis !== 'undefined' ? globalThis : this);
