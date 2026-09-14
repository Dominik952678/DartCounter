# Dartcounter – Design System

Referenzdokument für Claude Code. Bei jeder UI-Änderung zuerst gegen dieses Dokument prüfen, nicht neu improvisieren.

Seit v2.0.0 hat die App **einen** Look: Filz, Knochen, ein Orange. Die Screens stehen im Entwurf unter `docs/design-entwurf/` (Link zum Canvas in der README dort). Maße und Werte werden aus den Generatoren übernommen, nicht vom Bild abgelesen.

---

## 1. Farbsystem

Jede Farbe hat genau eine Bedeutung, unabhängig vom Screen. Die Werte stehen in `src/styles/tokens.css` und nirgendwo sonst.

| Rolle | Wert | Verwendung | NICHT verwenden für |
|---|---|---|---|
| `--bg-base` | `#0F1613` | Grund jeder Seite | — |
| `--surface-sunken` | `#141D19` | inaktive Score-Karte, Overlays | — |
| `--surface-card` | `#17211C` | Karte, Taste, Leiste | — |
| `--surface-raised` | `#1F2B25` | Dart-Kasten, Stepper, Kachel in einer Karte | — |
| `--line-1/2/3` | Knochen 7 / 10 / 25 % | Trenner, Rahmen, gestrichelte Leerstellen | Flächen |
| `--accent-primary` | `#FF6A3D` | Treffer, wer gerade wirft, genau eine Hauptaktion pro Screen | Deko, Auswahl-Zustand |
| `--accent-bone` | `#EDE6D3` | ausgewählter Zustand (Slider-Thumb, gewählte Taste), ruhige Hauptaktion | Treffer |
| `--text-success` | `#63C48A` | Check, Sieg, positive Deltas | Navigation, Buttons |
| `--text-danger` / `--danger-fill` | `#E0564B` / `#C4372E` | destruktiv: Text und Rahmen / Fläche | Auswahl, Bust |
| `--text-primary/secondary/tertiary` | Knochen 100 / 55 / 40 % | Text in drei Stufen | — |

**Regeln**
- Pro Screen höchstens **eine** orange Fläche. Die ruhige zweite Hauptaktion ist Knochen („Nochmal", „Speichern & verlassen").
- Text auf Orange und Knochen ist Filz (`#0F1613`).
- **Spielerfarben** (`--player-1..4`: `#7FB8E8 #E8C46B #6FCFC4 #D98FC6`) stehen nur als **Punkt am Namen**, nie als Fläche. In 2v2 trägt Team 1 die erste, Team 2 die zweite. Ein im Profil gewählter Farbwert geht vor.
- **Diagrammfarben** (`--chart-1..8`, `--chart-rest`) nur in Diagrammen und deren Legende.
- **Heatmap** ist eine Rampe im Orange (`--heat-none/low/mid/high`), Legende „Keine · Niedrig · Mittel · Hotspot".

---

## 2. Typografie

Zwei Familien, je eine Aufgabe:

- **Barlow Condensed 600** (`--font-display`): jede Zahl, jede Überschrift, jeder Button. Zahlen immer mit `tabular-nums` (`.num`, `.num-lg`).
- **Barlow** 400/500/600 (`--font`): Fließ- und Bedientext.

Regeln:
- Überschriften und Texte in Sentence case.
- **Kurze Labels** über oder neben einem Wert stehen in **gesperrten Großbuchstaben**: Barlow 600, 11px, `letter-spacing: .16em` (`.label-caps`). Beispiele: „CHECKOUT", „SATZ 1 · LEG 3", „SPIELER". Nie für Sätze.
- Skala: 11 (Label) · 14 (Body) · 16 (Body groß) · 20 (Karten-Titel) · 26–44 (Überschriften) · Score bis 150px im Querformat.
- Kein Gewicht über 600.

---

## 3. Spacing & Radien

- Basis-Einheit `4px`: `8 · 12 · 16 · 20 · 24 · 32`.
- Karten-Padding `16px`, ab Tablet `20px`.
- Radien nach Verschachtelung, außen rund, innen flacher: Karte 22 · Kachel/Button 18 · Zeile/Leiste 16 · Taste 14 · kleine Taste 12 · Slider und Chips 999.
- Karten in einer Reihe haben gleiche Höhe.

---

## 4. Touch-Targets

Kritisch für ein Spiel, das oft unter Zeitdruck und im Stehen bedient wird:

- **Minimum 44×44pt** für jedes tappbare Element, auch Icon-only-Buttons.
- Primäre Spielaktionen (Score eintragen, Wurf zurück, Quick-Start): **mindestens 56–64pt Höhe**.
- Abstand zwischen tappbaren Elementen mindestens `8px`. Auf der Keypad-Tastatur hat die Tastengröße Vorrang vor 12px Abstand (Begründung am `.numpad-grid`).

---

## 5. Component-Patterns

### Buttons (`components/ui/Button.tsx`)
- **primary**: Orange gefüllt, Filz-Text. Einmal pro Screen.
- **bone**: Knochen gefüllt, Filz-Text. Die ruhige Hauptaktion neben einer orangen.
- **secondary**: transparent, `--line-3`-Rahmen, Knochen-Text.
- **ghost**: neutrale Textaktion (Zurück, Schließen), Label-Stil.
- **danger** (gefüllt, `--danger-fill`) nur als Bestätigung im Dialog; **dangerText** für „Abmelden"-artige Aktionen.

### Auswahl: der Slider
**Jede Auswahl, bei der genau eine Option gewählt sein muss, ist ein `Slider`** — eine Schiene mit einem Knochen-Thumb, der federnd zur gewählten Option gleitet (`--motion-slide`, `--ease-glide`). Drei Varianten:
- `pill` für Wörter (Einzel / 2v2, Double Out / Single Out / Master Out),
- `tiles` für Zahlenreihen (301 · 501 · 701 · 1001 · Custom, Anzahl Ziele),
- `chips` für Filter über einer Liste (Alle · Triples · Doppel).

Kein Slider: An/Aus-Einstellungen (Schalter), Double/Triple auf dem Keypad (dort darf nichts gewählt sein), offene Zahlenbereiche wie Sätze/Legs (Stepper).

### Keine Regel-Erklärtexte
Die App geht davon aus, dass man Darts kennt. Bust, Bogey, Freeze, Finish-Modi und Ausbullen stehen als Wort oder Zustand da, nicht mit einem Satz, der die Regel erklärt. Fehlermeldungen und Hinweise zum Verhalten der App (z. B. „Leere Namen werden zu Spieler N") sind davon ausgenommen.

### Match
- Score-Karten: die werfende Karte groß und orange umrandet, die anderen kleiner auf `--surface-sunken`.
- Genau eine **Leiste** unter den Karten: Checkout-Weg · BUST · BOGEY · Freeze.
- Feier-Animationen (High Score ab 170, High Finish ab 100, Check, Match) bleiben. Das Vollbild gibt es nur am Matchende.
- Live-Statistik: am Handy als Blatt hinter dem Diagramm-Knopf, im Querformat und auf dem iPad daneben.

### Statistik
Alle Kennzahlen bleiben erhalten — am Matchende und auf der Statistikseite (Average, Erste 9, Checkout- und Triple-Quote mit L5, Rekorde, Head-to-Head, Verläufe, Segmente, Radar, Heatmap).

---

## 6. Responsive Design & Ziel-Geräte

Die App läuft als Web-App/PWA auf iPhone 17 Pro und iPad Air (11" und 13", M3), jeweils im Hoch- und Querformat.

### Viewport-Werte (logische Punkte, CSS-Pixel)

| Gerät | Hochformat | Querformat |
|---|---|---|
| iPhone 17 Pro | 402 × 874 | 874 × 402 |
| iPad Air 11" (M3) | 820 × 1180 | 1180 × 820 |
| iPad Air 13" (M3) | 1024 × 1366 | 1366 × 1024 |

### Breakpoint-Strategie (min-width, 4 Stufen)

```css
/* Basis: iPhone Hochformat, < 600px — single column */
@media (min-width: 600px)  { /* Phone Querformat */ }
@media (min-width: 900px)  { /* iPad Querformat, iPad 13" Hochformat */ }
@media (min-width: 1200px) { /* iPad Air 13" Querformat, große Displays */ }
```

- **< 600px:** eine Spalte, untere Navigation (Start · Spielen · Training · Statistik · Profil).
- **≥ 600px:** Inhalt `max-width: 600px`, zentriert. Untere Navigation bleibt.
- **≥ 900px:** Navigation als linke Leiste, zweispaltige Formulare.

  > Das iPad Air 11" ist im Hochformat nur **820px** breit und behält bewusst die untere Navigation — eine 232px-Leiste ließe dort weniger Platz als das iPhone im Querformat hat. Entschieden am 07.09.2026.
- **≥ 1200px:** Hauptinhalt `~960px` breit, zentriert.

### Safe Areas
`viewport-fit=cover` ist gesetzt. Insets über `--safe-top/right/bottom/left` — rechts ist im Querformat nicht gleich links.

### Sonderfall: Live-Match-Screen
Querformat fragt nach `(orientation: landscape)` plus `max-height`, nicht nach der Breite. Board und Live-Statistik stehen im Querformat nebeneinander, sodass nichts gescrollt werden muss.

---

## 7. Was bleibt

- Untere Navigation mit Icon und Label, die auf dem Tablet zur Leiste wird.
- Kennzahl-Pattern: kleines Label in Großbuchstaben, große Zahl in Condensed.
- Leerzustand: Board-Grafik, Überschrift, eine Aktion.
- Die eigene Dartboard-Visualisierung — nicht durch eine generische Chart-Library ersetzen.
