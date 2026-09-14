// Training: list, settings sheet, the three modes running, session end.
import { F, CN, B, ic, lab, h1, num, txt, dot, phone, nav, card, primary, secondary, bone, chips, choices, playerRow, dim, sheet, board } from './lib.mjs';
import { keypad } from './match.mjs';

const modeCard = (kicker, title, desc, best, bestLabel) => card(`
  <div style="display:flex;justify-content:space-between;gap:12px">
    <div style="display:flex;flex-direction:column;gap:6px">${lab(kicker, F.mute, 10, '.14em')}<div style="font:600 30px/1 ${CN}">${title}</div>${txt(desc, 13)}</div>
    <div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">${num(best, 30)}${txt(bestLabel, 11, F.mute2)}</div>
  </div>`, { r: 22, pad: '16px 18px' });

export const trainingList = () => phone({
  pad: '66px 18px 0',
  inner: `${h1('Training')}
    <div style="margin-top:6px">${txt('Drei Modi · mit Bots und bis zu vier Spielern', 13)}</div>
    <div style="margin-top:18px">${chips(['X01 Match', 'Training'], 1)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
      ${modeCard('Finishen', 'Checkout-Training', 'Zufällige Finishes unter Druck — alle spielen dieselben Ziele.', '8/10', 'bester Lauf')}
      ${modeCard('Scoring', 'Power Scoring', 'So viele Punkte wie möglich in 10 Runden.', '812', 'Bestwert')}
      ${modeCard('Präzision', 'Split Score', 'Ziel treffen — sonst wird halbiert.', '396', 'Bestwert')}
    </div>
    ${card(`<div style="display:flex;justify-content:space-between;align-items:center">${lab('Zuletzt', F.mute, 10, '.14em')}${txt('gestern', 12, F.mute2)}</div><div style="font:600 22px/1 ${CN};margin-top:6px">Checkout-Training · 7/10</div>`, { r: 20, pad: '14px 18px', extra: 'margin-top:10px' })}
    ${nav('Spielen')}`
});

export const trainingSettings = () => phone({
  pad: '66px 18px 0',
  inner: `${h1('Training')}<div style="margin-top:18px;opacity:0.35">${modeCard('Finishen', 'Checkout-Training', 'Zufällige Finishes unter Druck.', '8/10', 'bester Lauf')}</div>`,
  overlay: dim(sheet(`
    <div style="display:flex;justify-content:space-between;align-items:center">${h1('Checkout-Training', 32)}${lab('Schließen')}</div>
    <div style="display:flex;flex-direction:column;gap:10px">${lab('Spieler')}${choices(['1', '2', '3', '4'], 1, { h: 52, fs: 24 })}</div>
    <div style="display:flex;flex-direction:column;gap:8px">${playerRow({ name: 'Marcus', sub: 'Eigenes Profil', color: F.p[0] })}${playerRow({ name: 'Bot leicht', sub: 'Bot · Ø 40', color: F.p[1], bot: true })}</div>
    <div style="display:flex;flex-direction:column;gap:10px">${lab('Ziele')}${choices(['5', '10', '15', '20'], 1, { h: 52, fs: 24 })}</div>
    <div style="display:flex;flex-direction:column;gap:10px">${lab('Runden pro Ziel')}${choices(['1', '2', '3', '5'], 1, { h: 52, fs: 24 })}</div>
    <div style="margin-top:auto">${primary('Training starten', '10 Ziele · 2 Runden')}</div>`, { h: 720 }))
});

const trainHead = (left, mid) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px">${lab(left)}${lab(mid)}<div style="display:flex;gap:14px;align-items:center">${ic('sound', 18)}${lab('Menü', F.bone)}</div></div>`;
const tiles = (items) => `<div style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:6px">${items.map(([top, val, state]) => {
  const bg = state === 'hit' ? 'rgba(99, 196, 138, 0.16)' : state === 'miss' ? 'rgba(224, 86, 75, 0.16)' : state === 'now' ? F.c2 : F.c1;
  const col = state === 'hit' ? F.ok : state === 'miss' ? F.bad : state === 'now' ? F.bone : F.mute;
  return `<div style="height:48px;border-radius:12px;background:${bg};${state === 'now' ? `border:1.5px solid ${F.bone};` : ''}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-sizing:border-box"><span style="font:600 11px/1 ${B};color:${F.mute}">${top}</span><span style="font:600 16px/1 ${CN};color:${col}">${val}</span></div>`;
}).join('')}</div>`;
const others = (text) => `<div style="display:flex;gap:8px">${text.map(([n, c, v]) => `<span style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:${F.c1};border:1px solid ${F.line1};font:500 12px/1 ${B}">${dot(c)}${n}<b style="font-weight:600;color:${F.mute}">${v}</b></span>`).join('')}</div>`;

export const trainingCheckout = () => phone({
  pad: '62px 14px 0',
  inner: `${trainHead('Checkout-Training', 'Ziel 3 / 5')}
    <div style="margin-top:12px;background:${F.c1};border:1.5px solid ${F.hit};border-radius:22px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;gap:7px;align-items:center">${dot(F.p[0])}${lab('Marcus · wirft', F.hit)}</span>${txt('Ziel 96 · Runde 1 / 2', 13)}</div>
      ${num('96', 88, F.bone, '-.04em')}
    </div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${F.hit};color:${F.bg}">${lab('Zu checken', 'rgba(15, 22, 19, 0.75)')}<span style="font:600 26px/1 ${CN}">T20 · D18</span></div>
    <div style="margin-top:8px">${tiles([['57', '3D', 'hit'], ['40', '1D', 'hit'], ['96', '…', 'now'], ['112', '–'], ['68', '–']])}</div>
    <div style="margin-top:8px">${others([['Bot leicht', F.p[1], '1/2']])}</div>
    <div style="margin-top:8px">${keypad({ keyH: 50 })}</div>`
});

export const trainingSplit = () => phone({
  pad: '62px 14px 0',
  inner: `${trainHead('Split Score', 'Ziel 17 · 4 / 9')}
    <div style="margin-top:12px;background:${F.c1};border:1.5px solid ${F.hit};border-radius:22px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;gap:7px;align-items:center">${dot(F.p[0])}${lab('Marcus · wirft', F.hit)}</span><div style="display:flex;gap:8px;align-items:baseline">${lab('Ziel')}${num('17', 34, F.bone)}</div></div>
      ${num('116', 88, F.bone, '-.04em')}
    </div>
    <div style="margin-top:8px">${tiles([['15', '+45', 'hit'], ['16', 'SPLIT', 'miss'], ['Double', '+40', 'hit'], ['17', '…', 'now'], ['18', '–'], ['Triple', '–'], ['19', '–'], ['20', '–'], ['Bull', '–']])}</div>
    <div style="margin-top:8px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr)) 64px;gap:8px">
      ${[['S17', '17'], null, null].map((d, i) => d ? `<div style="height:56px;border-radius:14px;background:${F.c2};display:flex;align-items:center;justify-content:center;gap:8px;font:600 24px/1 ${CN}">${d[0]}<span style="font:500 13px ${B};color:${F.mute}">${d[1]}</span></div>` : `<div style="height:56px;border-radius:14px;border:1.5px dashed ${F.line2};display:grid;place-items:center;font:600 20px/1 ${CN};color:rgba(237, 230, 211, 0.35)">${i + 1}. Dart</div>`).join('')}
      <div style="height:56px;border-radius:14px;border:1px solid ${F.line2};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px">${ic('undo', 18)}${lab('Zurück', F.bone, 9, '.06em')}</div>
    </div>
    <div style="margin-top:8px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">
      <div style="grid-column:span 2;height:64px;border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 26px/1 ${CN};color:${F.mute}">Miss (0)</div>
      ${['Single · 17', 'Double · 34', 'Triple · 51'].map((t, i) => `<div style="${i === 2 ? 'grid-column:span 2;' : ''}height:96px;border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 30px/1 ${CN}">${t}</div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:10px">${txt('Kein Dart im Ziel halbiert den Stand.', 12, F.mute2)}</div>`
});

export const trainingPower = () => phone({
  pad: '62px 14px 0',
  inner: `${trainHead('Power Scoring', 'Runde 4 / 10')}
    <div style="margin-top:12px;background:${F.c1};border:1.5px solid ${F.hit};border-radius:22px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;gap:7px;align-items:center">${dot(F.p[0])}${lab('Marcus · wirft', F.hit)}</span>${txt('Ø Runde 105.7 · Triples 5', 13)}</div>
      ${num('377', 88, F.bone, '-.04em')}
    </div>
    <div style="margin-top:8px">${tiles([['1', '96', 'hit'], ['2', '81', 'hit'], ['3', '140', 'hit'], ['4', '60', 'now'], ['5', '–'], ['6', '–'], ['7', '–'], ['8', '–'], ['9', '–'], ['10', '–']])}</div>
    <div style="margin-top:8px">${others([['Jonas', F.p[1], '355']])}</div>
    <div style="margin-top:8px">${keypad({ darts: [['T20', '60'], null, null], keyH: 48 })}</div>`
});

export const trainingDone = () => phone({
  h: 1000,
  pad: '66px 18px 28px',
  inner: `<div style="display:flex;justify-content:space-between;align-items:center">${lab('Checkout-Training · 10 Ziele')}${lab('Fertig', F.bone)}</div>
    <div style="margin-top:16px;background:${F.hit};color:${F.bg};border-radius:22px;padding:20px 22px">
      ${lab('Neue Bestleistung', 'rgba(15, 22, 19, 0.75)')}
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:10px">${num('8/10', 84, F.bg, '-.03em')}<span style="font:600 24px/1 ${CN}">gecheckt</span></div>
      <div style="font:500 14px/1.3 ${B};margin-top:8px">Vorher 7/10 · Ø 2.4 Darts pro Finish · Höchstes 112</div>
    </div>
    ${card(`${lab('Rangliste')}${[['1', 'Marcus', F.p[0], '8/10', '2.4 Darts'], ['2', 'Bot leicht', F.p[1], '5/10', '2.9 Darts']].map(([r, n, c, v, s], i) => `<div style="display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:12px 0;${i === 0 ? `border-bottom:1px solid ${F.line1}` : ''}"><span style="font:600 18px/1 ${CN};color:${i === 0 ? F.hit : F.mute}">${r}</span><span style="display:flex;gap:8px;align-items:center;font:500 16px/1 ${B}">${dot(c)}${n}<span style="font:400 12px ${B};color:${F.mute}">${s}</span></span>${num(v, 26)}</div>`).join('')}`, { extra: 'margin-top:10px' })}
    ${card(`<div style="display:flex;justify-content:space-between">${lab('Treffer der Sitzung')}${txt('41 Darts', 12, F.mute2)}</div><div style="display:grid;place-items:center;margin-top:10px">${board({ size: 220, numbers: true, heat: { D16: 0.9, D20: 0.7, S16: 0.5, T20: 0.45, D8: 0.55 } })}</div>`, { extra: 'margin-top:10px' })}
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:14px">${bone('Nochmal', { h: 60 })}${secondary('Alle Modi', { h: 60 })}</div>
    <div style="display:flex;justify-content:center;gap:8px;align-items:center;margin-top:14px">${ic('share', 16, F.mute)}${lab('Story-Bild teilen', F.mute)}</div>`
});
