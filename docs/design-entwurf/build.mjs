// Assembles the provisional redesign canvas: artboards + canvas.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { F, CN, B, lab, num, txt, dot, primary, secondary, bone, destructive, segment, choices, toggle, card } from './lib.mjs';
import * as S from './start.mjs';
import * as M from './match.mjs';
import * as T from './training.mjs';
import * as O from './online.mjs';
import * as P from './statsprofil.mjs';
import * as G from './stats.mjs';
import * as R from './result.mjs';

const dir = dirname(fileURLToPath(import.meta.url));

// Slider: the checked radio moves the thumb; label colours follow. `.sl-demo`
// loops through three options so the motion shows without tapping.
const SPRING = 'cubic-bezier(.34, 1.36, .5, 1)';
const SLIDER_CSS = `
    .sl { --i: 0; }
    .sl > label { transition: color .3s ease, transform .12s ease; -webkit-tap-highlight-color: transparent; }
    .sl > .sl-t { transition: transform .45s ${SPRING}; }
    .sl:has(> input:checked) > label { color: var(--off) !important; }
    .sl > input:checked + label { color: var(--on) !important; }
    .sl:has(> input:checked) > .sl-t { transform: translateX(calc(var(--i) * (100% + var(--g)))) !important; }
    .sl > label:active { transform: scale(.96); }
${[1, 2, 3, 4, 5].map(i => `    .sl:has(> input:nth-of-type(${i + 1}):checked) { --i: ${i}; }`).join('\n')}
    .sl-demo > .sl-t { animation: sl-demo-thumb 6s infinite; }
    .sl-demo > label { animation: sl-demo-label 6s infinite; }
    .sl-demo > label:nth-of-type(2) { animation-delay: -4s; }
    .sl-demo > label:nth-of-type(3) { animation-delay: -2s; }
    @keyframes sl-demo-thumb {
      0%, 28% { transform: translateX(0); animation-timing-function: ${SPRING}; }
      33%, 61% { transform: translateX(calc(1 * (100% + var(--g)))); animation-timing-function: ${SPRING}; }
      66%, 94% { transform: translateX(calc(2 * (100% + var(--g)))); animation-timing-function: ${SPRING}; }
      100% { transform: translateX(0); }
    }
    @keyframes sl-demo-label { 0%, 30% { color: var(--on); } 34%, 96% { color: var(--off); } 100% { color: var(--on); } }
    @media (prefers-reduced-motion: reduce) { .sl > .sl-t, .sl > label { transition: none; } .sl-demo > .sl-t, .sl-demo > label { animation: none; } }`;

const head = () => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&amp;family=Barlow:wght@400;500;600&amp;display=swap">
  <style>
    body { margin: 0; background: ${F.paper}; }
    a { color: ${F.hit}; } a:hover { color: #E0552B; }
${SLIDER_CSS}
  </style>
</helmet>`;
const tail = `</x-dc>
</body>
</html>
`;

const artboards = [];

// A row of screens with a short heading; the frame size follows the content.
const area = ({ file, title, kicker, intro, screens, page }) => {
  const gap = 44;
  const width = 96 + screens.reduce((s, x) => s + x.w, 0) + gap * (screens.length - 1);
  const tallest = Math.max(...screens.map(x => x.h));
  const height = 48 + 150 + 32 + tallest + 60;
  const html = `${head()}
<div style="width:${width}px;min-height:${height}px;box-sizing:border-box;padding:48px;background:${F.paper};color:${F.ink};font-family:${B};display:flex;flex-direction:column;gap:32px">
  <div style="display:flex;flex-direction:column;gap:8px;max-width:980px">
    <div style="font:600 12px/1 ${B};letter-spacing:.12em;text-transform:uppercase;color:${F.inkSoft}">${kicker}</div>
    <div style="font:600 52px/1 ${CN};letter-spacing:-.02em">${title}</div>
    <p style="margin:0;font:400 16px/1.5 ${B};color:${F.inkSoft};text-wrap:pretty">${intro}</p>
  </div>
  <div style="display:flex;gap:${gap}px;align-items:flex-start">
    ${screens.map(x => `<div style="display:flex;flex-direction:column;gap:12px;flex-shrink:0">
      <div style="display:flex;align-items:baseline;gap:8px"><span style="font:600 11px/1 ui-monospace, Menlo, monospace;padding:3px 7px;border-radius:5px;background:rgba(28, 27, 24, 0.08)">${x.id}</span><span style="font:500 13px/1.3 ${B};color:${F.inkSoft}">${x.label}</span></div>
      ${x.html}
    </div>`).join('')}
  </div>
</div>
${tail}`;
  writeFileSync(join(dir, `${file}.dc.html`), html);
  artboards.push({ file: `${file}.dc.html`, title, w: width, h: height, page });
};

const ph = (id, label, fn, h = 874, w = 402) => ({ id, label, html: fn(), w, h });

// ── System (Main) ───────────────────────────────────────────────────────────
const swatch = (hex, name, role, darkText = false) => `<div style="display:flex;flex-direction:column;gap:8px">
  <div style="height:84px;border-radius:16px;background:${hex};border:1px solid rgba(28, 27, 24, 0.12);display:flex;align-items:flex-end;padding:10px;box-sizing:border-box;font:600 12px/1 ui-monospace, Menlo, monospace;color:${darkText ? F.bg : F.bone}">${hex}</div>
  <div style="font:600 15px/1.2 ${B}">${name}</div><div style="font:400 13px/1.4 ${B};color:${F.inkSoft}">${role}</div></div>`;

const panel = (inner, extra = '') => `<div style="background:${F.bg};border-radius:24px;padding:28px;color:${F.bone};font-family:${B};${extra}">${inner}</div>`;

const decisions = [
  ['Ein Look', 'Filz, Knochenweiß, Orange ersetzen Navy/Amber. Vaporwave und Cyberpunk entfallen.'],
  ['Spielerfarben', 'Bleiben als Punkt am Namen; der Werfer ist orange umrandet.'],
  ['Schrift', 'Zahlen und Überschriften Barlow Condensed 600, Text Barlow 400/500, kurze Labels in gesperrten Versalien.'],
  ['Eingabe', 'Double/Triple-Schalter wie heute, Bull mit Multiplikator. Dart-Kästen zeigen Wert und Punkte.'],
  ['Live-Statistik', 'Am Handy als Blatt hinter dem Diagramm-Symbol, am iPad und quer daneben.'],
  ['Leg-Ende', 'Die Feier-Animationen bleiben, im neuen Farbsystem. Vollfläche nur beim Matchende.'],
  ['Profile', 'Eigenes Profil vorn, „Spieler & Bots" und „Daten & Konto" als Unterseiten.'],
  ['Training', 'Neuer Look, die heutigen drei Modi; neue Drills später.'],
  ['Neue Funktionen', 'Revanche, Standardspiel, Bildschirm wach halten, Custom-Startpunktzahl.']
];

const provisional = [
  ['Navigation', 'Start · Spielen · Online · Statistik · Profil — heutige Struktur, neue Worte. Die Frage aus dem Plan ist noch offen.'],
  ['Zurück-Taste', 'Hell umrandet statt orange, damit Orange nur Werfer, Checkout und die Hauptaktion markiert.'],
  ['Spielerfarben', 'Auf den Filz neu abgestimmt; Gelb statt Orange für Spieler 2, damit es nicht mit dem Werfer verwechselt wird.'],
  ['Rot', '#E0564B für Text und Rahmen (auf Filz lesbar), #C4372E als Fläche.']
];

const mainWidth = 1500;
const mainHtml = `${head()}
<div style="width:${mainWidth}px;box-sizing:border-box;padding:56px;background:${F.paper};color:${F.ink};font-family:${B};display:flex;flex-direction:column;gap:36px">
  <div style="display:flex;flex-direction:column;gap:10px;max-width:1000px">
    <div style="font:600 12px/1 ${B};letter-spacing:.12em;text-transform:uppercase;color:${F.inkSoft}">Provisorisches Design · Stand 14. September 2026</div>
    <div style="font:600 72px/0.95 ${CN};letter-spacing:-.02em">Dartcounter — neuer Entwurf</div>
    <p style="margin:0;font:400 18px/1.5 ${B};color:${F.inkSoft};text-wrap:pretty">Die App, wie sie heute ist, im Look des Vorschlags „Dartcounter Pro" — mit den neun Entscheidungen vom 14. September. Alles, was die App kann, ist drin: 2v2, Bots, Ausbullen, mehrere Profile, Cloud-Konto, drei Trainingsmodi, öffentliche Räume. Die Seiten oben im Menü zeigen die Screens nach Bereich.</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:16px">
    ${swatch('#0F1613', 'Filz', 'Grund jeder Seite')}
    ${swatch('#17211C', 'Filz · Karte', 'Karten, Tasten, Leisten')}
    ${swatch('#1F2B25', 'Filz · erhöht', 'Dart-Kästen, Stepper, Blätter')}
    ${swatch('#EDE6D3', 'Knochen', 'Text und ausgewählter Zustand', true)}
    ${swatch('#FF6A3D', 'Treffer', 'Nur Werfer, Checkout, eine Hauptaktion', true)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(6, minmax(0, 1fr));gap:16px">
    ${swatch('#63C48A', 'Erfolg', 'Sieg, Check, positive Deltas', true)}
    ${swatch('#E0564B', 'Destruktiv', 'Löschen, Aufgeben, Fehler', true)}
    ${F.p.map((c, i) => swatch(c, `Spieler ${i + 1}`, 'Punkt am Namen, nie als Fläche', true)).join('')}
  </div>

  <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:20px">
    ${panel(`<div style="display:flex;flex-direction:column;gap:18px">
      ${lab('Schrift')}
      <div style="display:flex;align-items:baseline;gap:18px">${num('170', 118, F.bone, '-.04em')}<div style="display:flex;flex-direction:column;gap:6px">${txt('Score · Barlow Condensed 600 · 118 px', 13)}${txt('Ziffern mit gleicher Breite (tabular-nums)', 13)}</div></div>
      <div style="font:600 40px/1 ${CN};letter-spacing:-.02em">Neues Spiel <span style="font:400 13px ${B};color:${F.mute};letter-spacing:0">Überschrift · Condensed 600 · 40 px</span></div>
      <div style="font:600 28px/1 ${CN}">Kacheltitel <span style="font:400 13px ${B};color:${F.mute}">Condensed 600 · 28 px</span></div>
      <div style="display:flex;gap:16px;align-items:center">${lab('Satz 1 · Leg 3')}<span style="font:400 13px ${B};color:${F.mute}">Label · Barlow 600 · 11 px · Versalien, .16em</span></div>
      <div style="font:400 15px/1.5 ${B};color:${F.bone}">Fließtext in Barlow 400, gedämpft bei 55 % Deckkraft für Erklärungen und Metadaten.</div>
    </div>`)}
    ${panel(`<div style="display:flex;flex-direction:column;gap:14px">
      ${lab('Bausteine')}
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">${primary('Spiel starten', '501 · DO')}${primary('Spiel starten', 'prüfen', { disabled: true })}${bone('Ausgewählt / Nochmal')}${secondary('Zweitrangig')}</div>
      ${destructive('Destruktiv')}
      <div style="display:flex;flex-direction:column;gap:8px">${lab('Slider · genau eine Auswahl · läuft als Demo')}${segment(['Double Out', 'Single Out', 'Master Out'], 0, { demo: true })}</div>
      ${choices(['301', '501', '701', 'Custom'], 1, { fs: 26 })}
      ${lab('Alle Slider im Entwurf lassen sich antippen', F.mute2)}
      <div style="display:flex;gap:16px;align-items:center">${toggle(true)}${toggle(false)}<span style="display:flex;gap:8px;align-items:center">${dot(F.p[0])}${lab('Marcus', F.hit)}</span><span style="display:flex;gap:8px;align-items:center">${dot(F.p[1])}${lab('Jonas')}</span></div>
      ${M.bar.checkout('T20 · T20 · Bull')}
      ${M.bar.bust()}
    </div>`)}
  </div>

  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
    <div style="background:#FFFFFF;border-radius:24px;padding:28px;border:1px solid rgba(28, 27, 24, 0.1)">
      <div style="font:600 13px/1 ${B};letter-spacing:.1em;text-transform:uppercase;color:#1F8A57">Umgesetzte Entscheidungen</div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px 24px;margin-top:16px">${decisions.map(([k, v], i) => `<div style="display:flex;gap:10px"><span style="font:600 22px/1 ${CN};color:${F.hit}">${i + 1}</span><div><div style="font:600 15px/1.3 ${B}">${k}</div><div style="font:400 14px/1.45 ${B};color:${F.inkSoft}">${v}</div></div></div>`).join('')}</div>
    </div>
    <div style="background:#FFFFFF;border-radius:24px;padding:28px;border:1px solid rgba(28, 27, 24, 0.1)">
      <div style="font:600 13px/1 ${B};letter-spacing:.1em;text-transform:uppercase;color:#B7791F">Provisorisch gesetzt — bitte prüfen</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">${provisional.map(([k, v]) => `<div><div style="font:600 15px/1.3 ${B}">${k}</div><div style="font:400 14px/1.45 ${B};color:${F.inkSoft}">${v}</div></div>`).join('')}</div>
    </div>
  </div>
</div>
${tail}`;
writeFileSync(join(dir, 'Main.dc.html'), mainHtml);
artboards.push({ file: 'Main.dc.html', title: 'System', w: mainWidth, h: 1900, page: 'p-system', x: 0, y: 0 });

// ── Areas ───────────────────────────────────────────────────────────────────
area({
  file: 'Start', page: 'p-spielen', kicker: 'Bereich · Start', title: 'Startseite',
  intro: 'Eine Seite ohne Scrollen. Die orange Karte ist je nach Lage das Fortsetzen eines Matches, der Ein-Tap-Start „Weiter wie zuletzt" oder beim ersten Start der Einstieg.',
  screens: [ph('A1', 'Laufendes Match', S.startResume), ph('A2', 'Weiter wie zuletzt', S.startQuick), ph('A3', 'Erster Start · Gast', S.startFirst)]
});
area({
  file: 'NeuesSpiel', page: 'p-spielen', kicker: 'Bereich · Setup', title: 'Neues Spiel',
  intro: 'Eine Spalte statt zwei Karten. Einzel und 2v2, Profile, Bots und Gäste, Ausbullen und Zufallsreihenfolge bleiben; neu ist die freie Startpunktzahl. Die Seite scrollt, der Startknopf sitzt am Ende.',
  screens: [ph('B1', 'Einzel · 2 Spieler', S.setupSingle, 1220), ph('B2', '2v2 Doppel', S.setupDoubles, 1220), ph('B3', 'Prüfung · Custom, Namen', S.setupInvalid, 1220), ph('B4', 'Ausbullen', S.setupBullOff)]
});
area({
  file: 'Match', page: 'p-spielen', kicker: 'Bereich · Match', title: 'Match am Handy',
  intro: 'Passt ohne Scrollen. Scores in Condensed, der Werfer orange umrandet, Spielerfarbe als Punkt. Unter den Karten eine Leiste für Checkout, Bogey, Bust (nur das Wort, ohne Erklärung) oder den 2v2-Freeze. Double/Triple wie heute, Zurück fest in der Dart-Zeile. Live-Statistik über das Diagramm-Symbol oben.',
  screens: [ph('C1', 'Checkout · Triple gewählt', M.matchCheckout), ph('C2', 'Bust', M.matchBust), ph('C3', 'Bogey', M.matchBogey), ph('C4', '2v2 · Freeze', M.match2v2), ph('C5', 'Live-Statistik als Blatt', M.matchStatsSheet), ph('C6', 'Feier bleibt · High Finish', M.matchHighFinish), ph('C7', 'Darts aufs Doppel (Bull 50)', M.matchDartsPrompt), ph('C8', 'Match verlassen', M.matchLeave)]
});
area({
  file: 'MatchQuer', page: 'p-spielen', kicker: 'Bereich · Match', title: 'Querformat und Matchende',
  intro: 'Am iPad steht die Live-Statistik neben dem Board, am Telefon quer teilen sich Karten und Eingabe die Breite. Das Matchende ersetzt das heutige Statistik-Fenster.',
  screens: [ph('D1', 'iPad quer · Live-Statistik daneben', M.ipadLandscape, 820, 1180), ph('D2', 'Telefon quer', M.phoneLandscape, 402, 874), ph('D3', 'Matchende · alle Match-Statistiken', R.matchEnd, 1780)]
});
area({
  file: 'Training', page: 'p-training', kicker: 'Bereich · Training', title: 'Training',
  intro: 'Die drei heutigen Modi als Liste mit Bestwert, Einstellungen als Blatt. Die laufenden Screens teilen Karten, Leisten und Keypad mit dem Match.',
  screens: [ph('E1', 'Modi', T.trainingList), ph('E2', 'Einstellungen', T.trainingSettings), ph('E3', 'Checkout-Training', T.trainingCheckout), ph('E4', 'Split Score', T.trainingSplit), ph('E5', 'Power Scoring', T.trainingPower), ph('E6', 'Abschluss · Bestleistung', R.trainingDone, 1240)]
});
area({
  file: 'Online', page: 'p-online', kicker: 'Bereich · Online', title: 'Online',
  intro: 'Code als Einzelfelder, öffentliche Räume bleiben, Codes bleiben 4-stellig. Dazu die Zustände ohne Verbindung und beim Wiederverbinden im Match.',
  screens: [ph('F1', 'Beitreten · öffentliche Räume', O.onlineJoin), ph('F2', 'Keine Verbindung · Raum fehlt', O.onlineOffline), ph('F3', 'Lobby · wartet', O.onlineLobby), ph('F4', 'Online-Match · wiederverbinden', O.onlineReconnect)]
});
area({
  file: 'Statistik', page: 'p-statistik', kicker: 'Bereich · Statistik', title: 'Statistik',
  intro: 'Alles von heute bleibt: Kennzahlen mit L5, Average- und Checkout-Verlauf, Segment-Verteilung, Radar, Heatmap mit Filter, Rekorde, Head-to-Head, Mini-Games und die Trainingsmodi. Oben Offline/Online, Spieler und Modus, darunter drei Bereiche.',
  screens: [ph('G1', 'Überblick', G.statsOverview, 1040), ph('G2', 'Treffer · Heatmap', G.statsHits, 1080), ph('G3', 'Rekorde · Head-to-Head', G.statsRecords, 1360), ph('G4', 'Modus Power Scoring', G.statsTraining), ph('G5', 'Leer · Online', G.statsEmpty), ph('G6', 'Match-Historie', P.statsHistory, 1040)]
});
area({
  file: 'Profil', page: 'p-statistik', kicker: 'Bereich · Profil', title: 'Profil',
  intro: 'Das eigene Profil vorn mit den Einstellungen, dahinter „Spieler & Bots" und „Daten & Konto". Anmelden und das Löschen als eigene Zustände.',
  screens: [ph('H1', 'Mein Profil', P.profileMine, 1000), ph('H2', 'Spieler & Bots', P.profilePlayers, 1000), ph('H3', 'Daten & Konto', P.profileData, 1000), ph('H4', 'Alle Daten löschen', P.profileDeleteDialog), ph('H5', 'Anmelden', P.signIn)]
});

// ── Layout ──────────────────────────────────────────────────────────────────
const byPage = {};
for (const a of artboards) (byPage[a.page] ||= []).push(a);
for (const list of Object.values(byPage)) {
  let y = 0;
  for (const a of list) { if (a.x === undefined) { a.x = 0; a.y = y; } y = a.y + a.h + 160; }
}

writeFileSync(join(dir, 'canvas.json'), JSON.stringify({
  pages: [
    { id: 'p-system', name: 'System' },
    { id: 'p-spielen', name: 'Spielen' },
    { id: 'p-training', name: 'Training' },
    { id: 'p-online', name: 'Online' },
    { id: 'p-statistik', name: 'Statistik & Profil' }
  ],
  artboards: artboards.map(({ file, title, x, y, w, h, page }) => ({ file, title, x, y, w, h, page, is_interactive: true })),
  launch: { view: 'canvas', page: 'p-system' }
}, null, 2));

console.log(artboards.map(a => `${a.file} ${a.w}x${a.h}`).join('\n'));
