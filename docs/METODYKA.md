# BelkaStal – metodyka obliczeń i weryfikacja

Dokument opisuje algorytmy silnika `BS-ENG 1.0.0` oraz punkty norm (1. generacja, PN-EN z ZK PL), które realizują. Wartości NDP są zapisane w profilu normowym projektu (`normy.ndp1`) i drukowane w raporcie razem ze źródłem.

## 1. Profil normowy (`src/engine/normy.js`)

| Element | Realizacja |
|---|---|
| Zestaw dokumentów | Katalog `DOC1` (1. gen., oznaczenia PN z A/AC/ZK) i `DOC2` (2. gen., oznaczenia EN). Dla każdego dokumentu zdefiniowany jest warunek zakresu `gdy(projekt)`. |
| Dokumenty wymagane | Zawsze: PN-EN 1990, 1991-1-1, 1991-1-5 (T<sub>md</sub>), 1993-1-1, 1993-1-5, 1993-1-10 i PN-EN 1090-2. Dodatkowo, gdy zakres tego wymaga: 1991-1-3 (S), 1991-1-4 (W), 1991-1-6 (etapy, Qc), 1991-1-7 (A), 1991-3 (M), 1991-1-2 i 1993-1-2 (pożar), 1993-1-8 (połączenia, oparcie na betonie), 1993-1-9 (zmęczenie), 1992-1-1 (beton), 1996-1-1 (mur). |
| Kompletność 2. gen. | Każdy dokument wymagany musi mieć status PN różny od „nieustalony” i „nieopublikowana” oraz ZK „opublikowany” lub „nie dotyczy”. Silnik musi też obsługiwać 2. generację (`N.SILNIK[2]`). Jeśli któryś warunek nie jest spełniony, program stosuje w całości zestaw 1. generacji i zapisuje uzasadnienie. |
| Zakaz mieszania | Błędem jest dokument EN 199x:202x w zestawie 1. gen. Błędem jest też ZK z oznaczeniem 1. gen. (np. `:2006`) wpisany w zestawie 2. gen. |
| Weryfikacja | Program ostrzega, gdy brakuje daty lub osoby weryfikującej, gdy dokumenty nie są oznaczone jako zweryfikowane i gdy weryfikacja jest starsza niż 12 miesięcy. |

## 2. Przekrój (`przekroje.js`)

- Kontur dwuteownika jest wielobokiem. Zaokrąglenia r są aproksymowane 24 odcinkami. Całki ∫y<sup>p</sup>z<sup>q</sup>dA (do stopnia 3) liczy się kwadraturą trójkątną.
- W<sub>pl,y</sub> wyznacza się z osi obojętnej plastycznej znalezionej bisekcją pola.
- I<sub>t</sub> dla kształtowników walcowanych liczy się wzorem z zaokrągleniami: (2/3)(b − 0,63t<sub>f</sub>)t<sub>f</sub>³ + (1/3)(h − 2t<sub>f</sub>)t<sub>w</sub>³ + 2α·D⁴. Dla przekrojów spawanych I<sub>t</sub> = Σbt³/3.
- I<sub>w</sub> = I<sub>z</sub>(h − t<sub>f</sub>)²/4 dla dwuteowników bisymetrycznych walcowanych. Dla pozostałych I<sub>w</sub> = h<sub>s</sub>²·I<sub>1</sub>I<sub>2</sub>/(I<sub>1</sub> + I<sub>2</sub>).
- Monosymetria: β<sub>z</sub> = 2z<sub>s</sub> − ∫z(y² + z²)dA/I<sub>y</sub>. Oś z jest skierowana do pasa ściskanego przy M > 0.
- Weryfikacja z katalogiem: IPE 300, IPE 200, IPE 600, HEA 200 i HEB 300 dają A, I<sub>y</sub>, W<sub>pl</sub> i I<sub>z</sub> z dokładnością ±0,2%, a I<sub>t</sub> ±0,1%.

## 3. Analiza statyczna (`mes.js`, `statyka.js`)

- Elementy belkowe Hermite'a mają 2 stopnie swobody w węźle. Zastępcze obciążenia węzłowe obciążenia trapezowego są dokładne. Siatka zawiera wszystkie punkty charakterystyczne, element ma długość ≤ min(L/150, 100 mm).
- M(x) i V(x) w elemencie wynikają z sił węzłowych i całek obciążenia, więc są dokładne dla obciążeń liniowych.
- Etapy realizacji:
  - Przypadek stały wprowadzony w etapie k liczy się na układzie podpór etapu k.
  - Przy przejściu do etapu s usuwane podpory tymczasowe dostają siłę −R<sub>zakumulowana</sub> przyłożoną na układzie etapu s.
  - Reakcje i ugięcia się sumują.
  - Przypadki zmienne działają tylko w swoim etapie.
- Przypadki dzieli się na segmenty (wsporniki, przęsła). Służy to układom szachownicowym i rozdziałowi G w EQU.

## 4. Kombinacje (`kombinacje.js`)

- Obciążenia stałe tworzą jednolite źródło: γ<sub>G,sup</sub>·K<sub>FI</sub> albo γ<sub>G,inf</sub>.
- Obciążenia zmienne:
  - program przegląda wszystkie podzbiory „slotów”; grupa wykluczająca się stanowi jeden slot z alternatywami,
  - każde obciążenie z podzbioru jest raz wiodące (6.10, 6.10b), a raz towarzyszące (6.10a),
  - układy w przęsłach: wszystkie, nieparzyste, parzyste i „przy podporze j” (dwa sąsiednie segmenty plus naprzemiennie).
- EQU liczy się jako obwiednia reakcji. Część G w segmencie dostaje 0,90, gdy działa korzystnie, a 1,10 w przeciwnym razie. Zmienne liczą się tylko w części niekorzystnej, jedno wiodące, pozostałe z ψ<sub>0</sub>.

## 5. Nośność przekroju (`nosnosc.js`)

| Sprawdzenie | Punkt |
|---|---|
| Klasyfikacja: pas wspornikowy 9ε/10ε/14ε; środnik α (oś plastyczna przy N) i ψ (rozkład sprężysty) | 5.5, tabl. 5.2 |
| Przekrój efektywny: ρ dla ścianek wewnętrznych i wspornikowych, k<sub>σ</sub>(ψ); pasy, potem środnik z rozkładem od przekroju z efektywnymi pasami | 1-5: 4.4 |
| M<sub>c,Rd</sub> = W·f<sub>y</sub>/γ<sub>M0</sub> (W<sub>pl</sub> / W<sub>el,min</sub> / W<sub>eff,min</sub>) | 6.2.5 |
| V<sub>pl,Rd</sub>, A<sub>v</sub> z η (NDP) | 6.2.6 |
| M–V: ρ = (2V<sub>Ed</sub>/V<sub>pl,Rd</sub> − 1)²; kl. 1–2 wzór (6.30), kl. 3–4 zredukowana grubość środnika | 6.2.8 |
| M–N: M<sub>N,Rd</sub> z osi plastycznej przy N (numerycznie), warunek pominięcia N (6.2.9.1(4)); kl. 3–4 σ<sub>x,Ed</sub> | 6.2.9 |
| Zginanie dwukierunkowe: (M<sub>y</sub>/M<sub>N,y</sub>)² + (M<sub>z</sub>/M<sub>N,z</sub>)<sup>5n≥1</sup> | (6.41) |
| Wyboczenie przy ścinaniu: λ̄<sub>w</sub>, χ<sub>w</sub> (sztywny lub niesztywny słupek), k<sub>τ</sub> przy żebrach pośrednich; V<sub>bf,Rd</sub> pominięte (bezpiecznie) | 1-5: 5.2–5.3 |
| Interakcja M–V: η̄<sub>1</sub> + (1 − M<sub>f,Rd</sub>/M<sub>pl,Rd</sub>)(2η̄<sub>3</sub> − 1)² ≤ 1 | 1-5: 7.1 |
| Siła skupiona: typy a i c, m<sub>1</sub>, m<sub>2</sub> (iteracja po λ̄<sub>F</sub>), l<sub>y</sub>, F<sub>cr</sub>, χ<sub>F</sub> = 0,5/λ̄<sub>F</sub> | 1-5: 6 |
| Interakcja F–M: η<sub>2</sub> + 0,8η<sub>1</sub> ≤ 1,4 | 1-5: 7.2 |
| Żebro podporowe: przekrój żeber + 2×15εt<sub>w</sub>, l = 0,75h<sub>w</sub>, krzywa c; docisk końców | 1-5: 9.4 |

## 6. Stateczność (`statecznosc.js`, `mes.js`)

**M<sub>cr</sub> z MES.** Każdy węzeł ma stopnie swobody u, u′, φ, φ′ (Hermite).

- K<sub>E</sub> = EI<sub>z</sub>∫N″N″ + EI<sub>w</sub>∫N″N″ + GI<sub>t</sub>∫N′N′.
- K<sub>G</sub> składa się z trzech członów:
  - sprężenie M(x)·(u″φ + φu″),
  - monosymetria M·β<sub>z</sub>·φ′φ′,
  - wysokość obciążenia −q·e·φ² oraz −P·e·φ²; e > 0 nad środkiem ścinania działa destabilizująco.
- Więzy:
  - podpory widełkowe: u = φ = 0,
  - podpory pełne: dodatkowo u′ = φ′ = 0,
  - stężenia: sprężyny kary dla u − z<sub>r</sub>φ (na wysokości z<sub>r</sub>) i dla φ.
- Najmniejszą dodatnią wartość własną α<sub>cr</sub> wyznacza metoda Lanczosa z pełną reortogonalizacją na operatorze U⁻ᵀK<sub>G</sub>U⁻¹ (K<sub>E</sub> = UᵀU, rozkład pasmowy).

**Weryfikacja M<sub>cr</sub>:**

| Przypadek | Wynik |
|---|---|
| Stały moment | M<sub>cr</sub> = analityczny (różnica < 0,01%) |
| Obciążenie równomierne w środku ścinania | C<sub>1</sub> = 1,131 |
| Obciążenie na pasie górnym / dolnym | M<sub>cr</sub> maleje / rośnie |
| Stężenie pasa ściskanego w środku rozpiętości | M<sub>cr</sub> = M<sub>cr</sub>(L/2) |

**Segmenty i χ<sub>LT</sub>.**
- Segmenty dzielą podpory i stężenia dyskretne. Moment krytyczny segmentu: M<sub>cr,seg</sub> = α<sub>cr</sub>·|M<sub>Ed,max,seg</sub>|. Jest to podejście bezpieczne, bo α<sub>cr</sub> dotyczy całej belki.
- χ<sub>LT</sub>:
  - 6.3.2.3 (λ̄<sub>LT,0</sub> i β z NDP; tabl. 6.5),
  - 6.3.2.2 (tabl. 6.4) dla przekrojów monosymetrycznych.
- Współczynnik f liczy się z k<sub>c</sub>:
  - przy rozkładzie liniowym k<sub>c</sub> = 1/(1,33 − 0,33ψ) według tabl. 6.6,
  - w innych przypadkach k<sub>c</sub> = 1/√C<sub>1</sub> ≥ 0,6; C<sub>1</sub> pochodzi z MES segmentu na podporach widełkowych z obciążeniem w środku ścinania,
  - dla wsporników k<sub>c</sub> = 1.

**Interakcja.** Wyboczenie giętne (krzywe z tabl. 6.2). Wyboczenie skrętne liczy się z N<sub>cr,T</sub> = (GI<sub>t</sub> + π²EI<sub>w</sub>/L²)/i<sub>0</sub>². Interakcja (6.61) i (6.62) wykorzystuje współczynniki k<sub>ij</sub> z zał. B (tabl. B.1, B.2) oraz C<sub>m</sub> z tabl. B.3.

## 7. SGU

- Ugięcia oblicza się dla kombinacji charakterystycznych etapu końcowego, względem cięciwy przęsła. Dla wspornika liczy się względem podpory, a długość odniesienia wynosi L = 2L<sub>w</sub>.
- Od ugięcia odejmuje się podniesienie w<sub>c</sub>: albo równe ugięciu od G, albo zadane, w kształcie linii ugięcia od G.
- w<sub>3</sub> obejmuje tylko część zmienną kombinacji.
- Częstotliwość f<sub>1</sub> wyznacza MES z macierzą mas konsystentną i masą G + Σψ<sub>2</sub>Q.

## 8. Podpory i połączenia (`polaczenia.js`)

- Docisk środnika bez żebra:
  - podpora skrajna bez wspornika – typ c,
  - pozostałe podpory – typ a.
- Płyta podporowa: f<sub>jd</sub> = β<sub>j</sub>·α·f<sub>cd</sub> dla betonu, f<sub>d</sub>·β dla muru. Wysięg c = t<sub>p</sub>√(f<sub>y</sub>/(3f<sub>jd</sub>γ<sub>M0</sub>)). Pole efektywne (b<sub>f</sub> + 2c)(l<sub>b</sub> + 2c) nie może przekroczyć wymiarów płyty.
- Krótka blacha czołowa i blacha żebrowa – sprawdza się:
  - ścinanie śrub, docisk i grupę łączników (3.7),
  - ścinanie blachy brutto i netto oraz rozerwanie blokowe (3.10.2),
  - zginanie blachy żebrowej V·z,
  - spoiny metodą uproszczoną (4.5.3.3),
  - minimalne rozstawy (tabl. 3.3).
- Zalecenia konstrukcyjne dotyczące ciągliwości (t<sub>p</sub> ≤ d/2, h<sub>p</sub> ≥ 0,6h, spoiny o pełnej nośności) program zgłasza jako uwagi.

## 9. Pożar, zmęczenie, kruche pękanie, EXC (`dodatkowe.js`)

**Pożar (PN-EN 1993-1-2)**
- k<sub>y,θ</sub> i k<sub>E,θ</sub> pochodzą z tabl. 3.1, c<sub>a</sub>(θ) z 3.4.1.2. Krzywa ISO 834.
- Przyrost temperatury przekroju niezabezpieczonego liczy się z k<sub>sh</sub> (4.2.5.1), zabezpieczonego – według (4.27). Krok wynosi 2 s.
- θ<sub>cr</sub> to temperatura, przy której wytężenie osiąga 1. Wytężenie uwzględnia:
  - M<sub>fi,θ,Rd</sub> z κ<sub>1</sub> i κ<sub>2</sub>,
  - zwichrzenie χ<sub>LT,fi</sub> z α = 0,65√(235/f<sub>y</sub>), tylko gdy λ̄<sub>LT</sub> > 0,2,
  - ścinanie.
- Dla porównania raport podaje też θ<sub>cr</sub> z (4.22). Dla klasy 4 przyjmuje się θ<sub>cr</sub> = 350 °C.

**Zmęczenie (PN-EN 1993-1-9)**
- Zakres naprężeń wynika z przypadków cyklicznych × φ (×2 przy zmianie znaku).
- Krzywe S-N: m = 3 i 5 z progami Δσ<sub>D</sub> i Δσ<sub>L</sub>; m = 5 dla Δτ.
- Ocena: D = n/N<sub>R</sub>, przy czym γ<sub>Mf</sub> zależy od metody oceny i skutków zniszczenia.

**Kruche pękanie (PN-EN 1993-1-10)**
- Temperatura obliczeniowa: T<sub>Ed</sub> według (2.2).
- σ<sub>Ed</sub> pochodzi z kombinacji (2.6), granica plastyczności z f<sub>y</sub>(t) = f<sub>y,nom</sub> − 0,25t.
- Grubość dopuszczalna: tabl. 2.1 z interpolacją liniową. Spójność tablicy względem T<sub>27J</sub> jest sprawdzana testem (krok 5 mm).
- Klasa Z: Z<sub>Ed</sub> = ΣZ<sub>i</sub> według tabl. 3.2.

**Klasa wykonania**
- EXC wynika z klasy konsekwencji według PN-EN 1993-1-1/A1, zał. C. Program podnosi ją przy zmęczeniu.
- Program generuje listę wymagań PN-EN 1090-2: materiały, spawanie, NDT, śruby, tolerancje, korozja, zabezpieczenie ogniochronne, podniesienie, montaż.

## 10. Odtwarzalność

- `J.hash(stan)` = SHA-256 kanonicznego JSON-u, czyli rekurencyjnie posortowanych kluczy. Implementację SHA-256 sprawdzają wektory FIPS 180-4.
- Raport HTML zawiera `<script type="application/json" id="belkastal-dane">` oraz metadane `belkastal-sha256`. Polecenie „Otwórz” w programie odczytuje z nich dane projektu.
