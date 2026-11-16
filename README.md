# BelkaStal – belki stalowe wg Eurokodów (PN-EN)

Aplikacja do analizy i projektowania belek stalowych według Eurokodów, przygotowana do stosowania w Polsce. Prowadzi projektanta od założeń do kompletnego, odtwarzalnego raportu: nośność, stateczność, użytkowalność, podpory, połączenia i etapy realizacji. Układ ekranu i sposób pracy odpowiadają programom BelkaŻB i SłupŻB: dane po lewej, schemat po prawej, wyniki w zakładkach, raport do druku lub PDF.

| Plik | Przeznaczenie |
|---|---|
| `dist/BelkaStal.html` | Cały program w jednym pliku. Otwierasz go w przeglądarce (Edge, Chrome, Firefox). Działa bez internetu i bez instalacji. |
| `dist/BelkaStal.exe` | Wersja okienkowa dla Windows x64 (WebView2), jak BelkaŻB i SłupŻB. Natywne okna „Otwórz” i „Zapisz”, dwuklik na pliku `.belkastal`. Wymaga Microsoft Edge WebView2 Runtime. |

## Zakres obliczeń

**Schemat i analiza**
- Belka jedno- lub wieloprzęsłowa, ze wspornikami lub bez.
- Podpory: przegubowe, utwierdzone, sprężyste. Osobno określa się warunki podparcia dla zwichrzenia: widełkowe albo pełne.
- Analiza MES w płaszczyźnie pionowej i poziomej (My, Mz). Dostępna jest też stała siła osiowa N.
- Obciążenia: rozłożone (trapezowe), skupione i momenty. Dla każdego obciążenia podaje się wysokość przyłożenia (pas górny, środek ścinania lub pas dolny).

**Etapy realizacji**
- Dowolna liczba etapów, np. montaż i eksploatacja.
- Podpory tymczasowe: obciążenia stałe kumulują się z historią podparcia. Po usunięciu podpory jej reakcja przechodzi na układ następnego etapu.
- Stężenia boczne, skrętne i pełne, dyskretne lub ciągłe, aktywne od wskazanego etapu.
- Sytuacje przejściowe z obciążeniami montażowymi Qc (PN-EN 1991-1-6).
- Podniesienie wykonawcze.

**Kombinacje (PN-EN 1990)**
- SGN: 6.10 albo mniej korzystna z 6.10a i 6.10b.
- Sytuacje wyjątkowa (6.11b) i pożarowa.
- SGU: kombinacje charakterystyczna, częsta i quasi-stała.
- EQU: odrywanie podpór, z rozdziałem G na części korzystne i niekorzystne.
- Kombinacja do doboru stali (PN-EN 1993-1-10).
- Program przegląda wszystkie podzbiory obciążeń zmiennych i każde z nich jako wiodące. Uwzględnia grupy wykluczające się (np. kierunki wiatru) i niekorzystne układy obciążenia w przęsłach.

**Nośność przekroju (PN-EN 1993-1-1, 6.2)**
- Klasyfikacja przekroju z uwzględnieniem siły N.
- Przekrój efektywny klasy 4 (PN-EN 1993-1-5, 4.4).
- Interakcje M–V, M–N i dwukierunkowa (6.41).

**Środnik (PN-EN 1993-1-5)**
- Wyboczenie przy ścinaniu z interakcją M–V (7.1).
- Siły skupione na środnik z interakcją F–M (7.2).
- Żebra podporowe (9.4).

**Stateczność (PN-EN 1993-1-1, 6.3)**
- M<sub>cr</sub> liczony MES dla rzeczywistego rozkładu momentu. Model uwzględnia wysokość przyłożenia obciążenia, monosymetrię (β<sub>z</sub>) i stężenia.
- χ<sub>LT</sub> według 6.3.2.2 lub 6.3.2.3, z k<sub>c</sub> i współczynnikiem f.
- Wyboczenie giętne i skrętne, interakcja 6.3.3 (zał. B).

**SGU**
- Ugięcia w<sub>max</sub> i w<sub>3</sub> oraz przemieszczenie poziome.
- Pierwsza częstotliwość drgań własnych (MES).

**Podpory i połączenia (PN-EN 1993-1-8)**
- Docisk środnika i żebra podporowe.
- Płyta podporowa na betonie lub murze.
- Krótka blacha czołowa i blacha żebrowa: śruby, docisk, rozerwanie blokowe, spoiny, rozmieszczenie łączników.

**Moduły dodatkowe**
- Pożar (PN-EN 1993-1-2): θ<sub>cr</sub>, nagrzewanie wg ISO 834, zabezpieczenie ogniochronne.
- Zmęczenie (PN-EN 1993-1-9).
- Kruche pękanie i klasy Z (PN-EN 1993-1-10).
- Klasa wykonania EXC i wymagania wykonawcze (PN-EN 1090-2).

**Inne funkcje**
- Dobór kształtownika: program wybiera najlżejszy kształtownik z serii IPE, HEA, HEB lub HEM, który spełnia wszystkie warunki.
- Kalkulator śniegu dla stref obciążenia śniegiem z ZK PL.

## Profil normowy projektu

Każdy projekt ma jawny profil normowy:
- kraj i generację Eurokodów,
- dokładne oznaczenia dokumentów z wydaniami, zmianami (A), poprawkami (AC/Ap) i załącznikami krajowymi,
- status PN/ZK każdego dokumentu i znacznik „zweryfikowano”,
- datę, autora i źródło weryfikacji zestawu,
- tabelę parametrów krajowych (NDP) z podanym źródłem i znacznikiem zmian.

Profil pokazuje tylko dokumenty potrzebne w danym projekcie. Ich lista zależy od zakresu: śnieg, wiatr, etapy, oparcie na betonie lub murze, połączenia, pożar, zmęczenie.

Zasady, których pilnuje program:
- **Generacji się nie miesza.** Dokument 2. generacji w zestawie 1. generacji jest błędem i blokuje obliczenia.
- **ZK do 1. generacji nie przechodzi do 2. generacji.** Wpisanie go w zestawie 2. generacji jest błędem.
- **Niekompletny zestaw 2. generacji oznacza pełny powrót do 1. generacji.** Jeśli dla zakresu projektu brakuje którejś PN, polskiego ZK albo obsługi w silniku, program stosuje w całości zestaw 1. generacji. Tak przewidują aktualne wytyczne PKN na okres współistnienia. Decyzja i jej uzasadnienie trafiają do raportu.
- Stan wiedzy wbudowany w program (16.11.2026) mówi, że Eurokody 2. edycji mają wejść do zbioru PN najpóźniej do 30.09.2027. ZK do 2. edycji powstaną później. ZK do 1. edycji stosuje się wyłącznie z 1. edycją. CEN wycofa 1. generację do 30.03.2028.

Projektant musi potwierdzić oznaczenia w katalogu PKN. Do tego czasu program wyświetla ostrzeżenia o niezweryfikowanym profilu. Pozycje wymagające szczególnej uwagi mają oznaczenie „sprawdź”.

## Odtwarzalność

- Raport podaje wersję programu i silnika obliczeń oraz sumę **SHA-256** kanonicznego JSON-u danych (klucze posortowane).
- Plik raportu HTML zawiera pełne dane projektu i można go ponownie otworzyć w programie. Dane są też w załączniku A raportu, więc również wydruk PDF jest samowystarczalny.
- Ta sama wersja silnika i te same dane dają identyczne wyniki (sprawdza to test automatyczny).

## Raport obliczeń

Raport zawiera kolejno:
1. Metrykę i werdykt.
2. Profil normowy: dokumenty, NDP i decyzję o generacji.
3. Założenia: schemat, etapy z rysunkami, materiał, przekrój, oddziaływania z ψ, zasady kombinacji.
4. Analizę statyczną: obwiednie M, V, w i reakcje dla każdego etapu.
5. Nośność przekroju z tokiem obliczeń.
6. Środnik według PN-EN 1993-1-5.
7. Zwichrzenie z αcr, λ̄LT, χLT, kc, f i postacią własną.
8. SGU.
9. Podpory i połączenia.
10. Pożar, zmęczenie i kruche pękanie.
11. Wymagania wykonawcze (EXC, spawanie, NDT, tolerancje, korozja, montaż).
12. Zestawienie wyników, ograniczenia modelu i dane do odtworzenia.

Raport można wydrukować lub zapisać do PDF (Ctrl+P) albo zapisać jako plik HTML.

## Budowa i testy

Wymagany jest Node.js 18 lub nowszy. Program nie ma zależności zewnętrznych.

```bash
npm run build      # src/ → dist/BelkaStal.html
```

```bash
npm test           # testy weryfikacyjne silnika i raportu
```

```bash
./host/build.sh    # dist/BelkaStal.exe (wymaga Go ≥ 1.22)
```

Testy porównują wyniki z rozwiązaniami zamkniętymi i danymi katalogowymi. Szczegóły są w [`docs/METODYKA.md`](docs/METODYKA.md). Testy sprawdzają:
- statykę MES (qL²/8, 5qL⁴/384EI, utwierdzenie, belkę ciągłą),
- M<sub>cr</sub> dla stałego momentu (dokładnie) i C<sub>1</sub> ≈ 1,13,
- charakterystyki IPE, HEA i HEB według katalogu (±0,5%),
- obliczenie ręczne projektu domyślnego,
- przeniesienie reakcji podpory tymczasowej,
- EQU, temperaturę krytyczną z (4.22),
- spójność tablicy 2.1 z PN-EN 1993-1-10,
- profil normowy i zakaz mieszania generacji,
- SHA-256 (wektory FIPS).

## Struktura

```
src/engine/   silnik (bez DOM; działa w przeglądarce i w Node)
  core.js        narzędzia, SHA-256, kanoniczny JSON, rejestr sprawdzeń
  normy.js       profil normowy: dokumenty, generacje, NDP, decyzja o generacji
  materialy.js   stal (tabl. 3.1 / normy wyrobów), śruby, beton, właściwości w pożarze
  przekroje.js   IPE/HEA/HEB/HEM, dwuteowniki spawane; charakterystyki z geometrii
  mes.js         MES: statyka, zwichrzenie (Lanczos), drgania
  statyka.js     model, etapy realizacji, przypadki w segmentach
  kombinacje.js  kombinacje PN-EN 1990, EQU
  nosnosc.js     klasyfikacja, przekrój efektywny, M/V/N, PN-EN 1993-1-5
  statecznosc.js zwichrzenie, 6.3.1, 6.3.3
  polaczenia.js  oparcia, blacha czołowa, blacha żebrowa
  dodatkowe.js   pożar, zmęczenie, kruche pękanie, EXC
  projekt.js     stan domyślny, przebieg obliczeń, SGU, podpory, dobór
src/ui/       interfejs: app.css, index.html, app.js, widoki.js, rysunki.js, raport.js
host/         aplikacja okienkowa Windows (Go + WebView2)
test/         testy weryfikacyjne (node:test)
```

## Ograniczenia tej wersji

- Silnik realizuje obliczenia wyłącznie według 1. generacji Eurokodów. Wybór 2. generacji skutkuje udokumentowanym zastosowaniem 1. generacji, bo zestaw 2. generacji nie jest jeszcze kompletny (brak ZK).
- Belki pryzmatyczne o przekroju dwuteowym. Skręcanie od mimośrodu obciążeń nie jest analizowane. Węzły momentowe są poza zakresem.
- Wartości NDP i kryteria SGU oznaczone „do potwierdzenia” wymagają weryfikacji z ZK. Za ostateczny dobór parametrów odpowiada projektant.
- Plik `BelkaStal.exe` jest kompilowany krzyżowo. Interfejs i obliczenia są te same co w `BelkaStal.html`, który przetestowano w przeglądarce.
