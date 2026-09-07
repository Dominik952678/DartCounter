# Dartcounter – Design System

Referenzdokument für Claude Code. Bei jeder UI-Änderung zuerst gegen dieses Dokument prüfen, nicht neu improvisieren.

---

## 1. Farbsystem

Aktuell werden vier Farben (Orange, Blau, Grün, Rot) je nach Screen für unterschiedliche Bedeutungen verwendet — das wird hier durch feste **Rollen** ersetzt. Jede Farbe hat ab jetzt genau eine Bedeutung, unabhängig vom Screen.

| Rolle | Hex (Basis) | Verwendung | NICHT verwenden für |
|---|---|---|---|
| `--bg-base` | `#0B1120` | App-Hintergrund, überall identisch | — |
| `--surface-card` | `rgba(255,255,255,0.05)` | Karten-Hintergrund auf `--bg-base` | Vollflächige Screens |
| `--accent-primary` | `#F59E0B` | Genau 1 primäre CTA pro Screen (Button, aktive Tab-Auswahl) | Dekorative Icons, sekundäre Aktionen |
| `--accent-info` | `#5DCAA5` (Teal) | Kategorische Kennzeichnung (z. B. Multiplayer-Icon) | Auswahl-Zustand, Erfolg |
| `--accent-pro` | `#AFA9EC` (Violett) | Kategorische Kennzeichnung (z. B. Statistik-Icon) | Auswahl-Zustand |
| `--text-success` | `#10B981` | Nur Erfolgsmeldungen, Sieg-Screen, positive Deltas | Navigation, Buttons |
| `--text-danger` | `#EF4444` | Nur destruktive Aktionen (Abmelden, Löschen), Hotspot-Segmente | Aktive Auswahl |
| `--text-primary` | `#F5F5F0` | Haupttext | — |
| `--text-secondary` | `#8B93A6` | Sekundärtext, Labels | — |

**Regel:** Pro Screen maximal **eine** `--accent-primary`-gefüllte Fläche. Alles andere sind `--surface-card` mit Icon-Akzent oder reine Text-Buttons.

---

## 2. Typografie

- **Sentence case überall.** Keine ALL-CAPS-Headlines mehr ("NEUES SPIEL STARTEN" → "Neues Spiel starten"). Ausnahme: Eigennamen/Marken (z. B. "Dartcounter" als Logo-Schriftzug ist ok, wenn bewusst als Wortmarke gesetzt).
- Skala: `12px` (Label/Meta) · `14px` (Body) · `16px` (Body groß) · `20px` (Card-Titel) · `24px` (Screen-Titel) · `32px` (Live-Score, große Zahlen).
- Gewichte: nur `400` (regular) und `500` (medium). Kein `700` — wirkt in der dunklen UI zu schwer.
- Labels über Kennzahlen (Pattern aus dem Stats-Screen, beibehalten): `12px`, `--text-secondary`, Sentence case, keine Caps.

---

## 3. Spacing & Grid

- Basis-Einheit: `4px`. Alle Abstände sind Vielfache davon: `8 · 12 · 16 · 20 · 24 · 32`.
- Karten-Padding: einheitlich `16px` (mobil) / `20px` (Tablet, siehe Abschnitt 6).
- Card-Radius: `12px` durchgehend.
- Karten in einer Reihe (Grid) haben **immer gleiche Höhe** — kein Content-getriebenes Ungleichgewicht wie aktuell auf dem Home-Screen. Höhe wird vom Inhalt mit den meisten Zeilen bestimmt, kürzerer Inhalt wird vertikal zentriert, nicht der Container gestreckt.

---

## 4. Touch-Targets

Kritisch für ein Spiel, das oft unter Zeitdruck / im Stehen bedient wird:

- **Minimum 44×44pt** (Apple HIG) für jedes tappbare Element — auch Icon-only-Buttons.
- Für primäre Spielaktionen (Score eintragen, Wurf revidieren, Quick-Start-Kacheln): **mindestens 64pt Höhe**, nicht nur das Minimum ausreizen. Das war der konkrete Fehler bei den "Quick Start Training"-Kacheln (siehe Mockup) — reine Text+Icon-Pills mit ~36px Höhe.
- Abstand zwischen zwei tappbaren Elementen: mindestens `8px`, bei Elementen die während des Spiels unter Stress bedient werden (Score-Eingabe, Checkout-Board) mindestens `12px`.

---

## 5. Component-Patterns

### Buttons
- **Primary**: `--accent-primary` gefüllt, `--bg-base`-dunkler Text (nicht Schwarz, sondern ein dunkler Ton der gleichen Farbfamilie, siehe Kontrastregel unten).
- **Secondary**: `--surface-card`-Hintergrund, `--text-primary`-Text, kein farbiger Rand.
- **Ghost/Destructive-Text**: transparent, `--text-danger`, nur für "Abmelden"-artige Aktionen.

### Selected-State (einheitlich, ersetzt die zwei aktuell gemischten Patterns)
Aktuell: mal Border-Glow ("Einzel", "X01 Match"-Tab), mal Solid-Fill ("Double", "501"). Ab jetzt **ein** Pattern für beides:
- Nicht ausgewählt: `--surface-card`, `--text-secondary`.
- Ausgewählt: `2px solid --accent-primary` + `--bg-accent-muted` (10 % Wash der Akzentfarbe) als Hintergrund + `--text-primary`.
- Gilt für Tabs, Auswahl-Chips (Sets/Legs, Out-Modus, Startpunktzahl) und Trainings-Modus-Karten gleichermaßen.

### Kontrast auf gefüllten Flächen
Text auf `--accent-primary` nie reines Schwarz — dunkelster Ton der gleichen Farbfamilie (z. B. `#4A3A10` auf `#F59E0B`), das gilt für alle Akzentflächen.

---

## 6. Responsive Design & Ziel-Geräte

Die App läuft als Web-App/PWA (Meta-Tags `apple-mobile-web-app-capable` sind bereits gesetzt) auf iPhone 17 Pro und iPad Air (11" und 13", M3) — jeweils Hoch- und Querformat. Das deckt vier sehr unterschiedliche Breiten ab, deshalb ist eine feste Ein-Spalten-Optik (aktueller Stand) auf dem Tablet verschenkter Platz.

### Recherchierte Viewport-Werte (logische Punkte, CSS-Pixel)

| Gerät | Hochformat | Querformat |
|---|---|---|
| iPhone 17 Pro | 402 × 874 | 874 × 402 |
| iPad Air 11" (M3) | 820 × 1180 | 1180 × 820 |
| iPad Air 13" (M3) | 1024 × 1366 | 1366 × 1024 |

### Breakpoint-Strategie (min-width, 4 Stufen)

```css
/* Basis: iPhone Hochformat, < 600px — Standard-Layout, single column */
@media (min-width: 600px)  { /* Phone Querformat */ }
@media (min-width: 900px)  { /* iPad Air 11" (beide Ausrichtungen), iPad 13" Hochformat */ }
@media (min-width: 1200px) { /* iPad Air 13" Querformat, große Displays */ }
```

Konkrete Layout-Änderungen pro Stufe:

- **< 600px (Phone Hochformat, aktueller Ist-Zustand):** Single-Column, Bottom-Tab-Navigation, Karten volle Breite oder 2-Grid wie im Mockup.
- **≥ 600px (Phone Querformat):** Content bekommt `max-width: 600px` und wird zentriert statt gestreckt — sonst werden Karten unnatürlich breit und Buttons unangenehm lang. Bottom-Tabs bleiben.
- **≥ 900px (iPad Air Querformat, iPad 13" Hochformat):** Navigation wechselt von Bottom-Tabs zu einer linken Sidebar (klassisches iPad-Pattern, mehr Platz, kein Daumen-Reach-Problem). Home-Grid wird 3-spaltig statt 2-spaltig. Formulare (Neues Spiel, Training) zeigen beide Spalten (Modus & Spieler / Einstellungen) nebeneinander mit mehr Breite statt gestrecktem Inhalt.

  > **Korrektur zur Gerätetabelle oben:** Hier stand ursprünglich „iPad Air, beide Ausrichtungen". Das iPad Air 11" ist im Hochformat aber nur **820px** breit und fällt damit unter diese Stufe — es behält bewusst die Bottom-Tabs. Eine 232px-Sidebar ließe dort nur 588px für den Inhalt, weniger als das iPhone im Querformat hat, und die zweispaltigen Formulare dieser Stufe würden ohnehin wieder umbrechen. Entschieden am 07.09.2026.
- **≥ 1200px (iPad Air 13" Querformat):** Max-Content-Width von `~960px` für die Hauptinhalte, zentriert — sonst verlieren sich Karten in der Breite. Statistik-Screen kann Offline/Online-Stats echt nebeneinander mit mehr Detail zeigen statt der aktuellen sehr leeren rechten Spalte (siehe Screenshot "Online Stats" — auf Tablet ist da Platz für ein zweites Diagramm statt Leerraum).

### Safe Areas

`viewport-fit=cover` ist bereits gesetzt — konsequent nutzen:
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```
Betrifft v. a. iPhone (Dynamic Island, Home-Indicator) und iPad im Querformat mit abgerundeten Ecken.

### Sonderfall: Live-Match-Screen (Score/Board)

Das ist der Screen, der am meisten im Stehen/unter Zeitdruck genutzt wird und am meisten von Querformat profitiert:
- **Phone Hochformat:** aktuelles gestapeltes Layout (Board unten, Stats oben) beibehalten.
- **Tablet/Phone Querformat:** Board und Live-Stats **nebeneinander** statt gestapelt — Board bleibt dominant und groß, Stats-Panel daneben statt darunter. Verhindert, dass man im Querformat scrollen muss, um den Board zu sehen.

### Umsetzungshinweis für Claude Code

Kein natives Auto-Layout nötig — reine CSS-Breakpoints/Container-Queries reichen, da es eine Web-App ist. Bei neuen Komponenten: relative Einheiten (`rem`, `%`, `clamp()`) statt fixer `px`-Breiten verwenden, damit die vier Zielbreiten nicht einzeln durchgetestet werden müssen.

---

## 7. Was beibehalten wird (bereits gut)

- Bottom-Nav-Icon+Label-Kombination (Konzept bleibt, wandert nur auf Tablet in die Sidebar).
- Stats-Karten-Pattern: kleines graues Caps-Label + große Zahl.
- Empty-State-Pattern (Multiplayer-Screen): Icon + Headline + Erklärung + CTA.
- Custom-Dartboard-Visualisierung als Kernstück der App — nicht durch generische Chart-Library ersetzen.
