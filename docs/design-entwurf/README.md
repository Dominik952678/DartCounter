# Design-Entwurf (Referenz für v2.0.0)

Der provisorische Gesamtentwurf, nach dem das Redesign umgesetzt wird:
https://claude.ai/code/artifact/8e0eff6b-fc8b-417a-8806-f74181ba5188

Die Screens entstehen aus kleinen Generatoren. Maße, Farben und Abstände hier
nachschlagen, statt sie vom Bild abzulesen.

| Datei | Inhalt |
|---|---|
| `lib.mjs` | Tokens (`F`), Schriften, Icons, Karten, Buttons, Slider, Toggle, Stepper, Sheet, Dialog, Dartboard und Heatmap |
| `charts.mjs` | Linien-Diagramm, Donut, Radar, Vergleichstabelle, Heatmap-Karte |
| `start.mjs` | A1–A3 Start, B1–B4 Neues Spiel |
| `match.mjs` | C1–C8 Match am Handy, D1–D2 Querformat |
| `result.mjs` | D3 Matchende, E6 Training-Abschluss |
| `training.mjs` | E1–E5 Training |
| `online.mjs` | F1–F4 Online |
| `stats.mjs` | G1–G5 Statistik |
| `statsprofil.mjs` | G6 Match-Historie, H1–H5 Profil (enthält noch ältere, ersetzte Statistik-Screens) |
| `build.mjs` | Schreibt die Artboards `*.dc.html` und `canvas.json` |
| `screenshot.mjs` | Headless-Chrome-Screenshot: `node screenshot.mjs <url> <out.png> <waitMs> <w> <h>` |

Neu bauen:

```bash
node docs/design-entwurf/build.mjs
```

Die `*.dc.html` sind die gebauten Artboards. Das veröffentlichte Canvas selbst
liegt nicht im Repo.

Abweichung zur Navigation im Entwurf: umgesetzt wird
**Start · Spielen · Training · Statistik · Profil**, Online liegt unter „Spielen“.
