// Online: join, offline state, lobby, reconnecting in a match.
import { F, CN, B, ic, lab, h1, num, txt, dot, phone, nav, card, primary, secondary, avatar } from './lib.mjs';
import { keypad, scoreCard } from './match.mjs';

const status = (text, color) => `<span style="display:flex;align-items:center;gap:7px">${dot(color, 8)}${lab(text, color)}</span>`;
const codeBoxes = (chars, { error = false, cursor = -1 } = {}) =>
  `<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:10px">${chars.map((c, i) => `<div style="height:78px;border-radius:16px;background:${F.c1};border:1.5px solid ${error ? F.bad : i === cursor ? F.bone : F.line1};display:grid;place-items:center;font:600 44px/1 ${CN};color:${c ? F.bone : F.mute2};box-sizing:border-box">${c || (i === cursor ? '|' : '')}</div>`).join('')}</div>`;

export const onlineJoin = () => phone({
  pad: '66px 18px 0',
  inner: `<div style="display:flex;justify-content:space-between;align-items:center">${h1('Online')}${status('Verbunden · 24 ms', F.ok)}</div>
    ${card(`<div style="display:flex;align-items:center;gap:12px">${avatar('G', F.p[0], 40)}<div style="flex:1;display:flex;flex-direction:column;gap:4px">${lab('Anzeigename', F.mute, 10, '.14em')}${txt('Gast 583', 16, F.bone, 500)}</div>${lab('Anmelden', F.bone)}</div>`, { r: 18, pad: '12px 14px', extra: 'margin-top:18px' })}
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">${lab('Raumcode')}${codeBoxes(['A', '7', 'K', ''], { cursor: 3 })}${txt('Den 4-stelligen Code bekommst du vom Gastgeber.', 13)}</div>
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">${primary('Beitreten', 'A7K…')}${secondary('Raum erstellen', { iconName: 'plus' })}</div>
    <div style="margin-top:18px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between">${lab('Öffentliche Räume · 2')}${lab('Aktualisieren', F.mute2)}</div>
      ${[['Lena K.', '501 · DO · Bis 3 Legs', '1 / 2'], ['Tom B.', '301 · SO · Bis 2 Legs', '1 / 2']].map(([n, r, p]) => card(`<div style="display:flex;align-items:center;gap:12px">${avatar(n[0], F.p[1], 36)}<div style="flex:1;display:flex;flex-direction:column;gap:3px">${txt(n, 15, F.bone, 500)}${txt(r, 12)}</div>${lab(p, F.mute)}${ic('chev', 18, F.mute)}</div>`, { r: 16, pad: '10px 14px' })).join('')}
    </div>
    ${nav('Online')}`
});

export const onlineOffline = () => phone({
  pad: '0 0 0',
  inner: `<div style="padding:62px 18px 12px;background:${F.c1};display:flex;align-items:center;gap:10px;border-bottom:1px solid ${F.line1}">${ic('nowifi', 18, F.bone)}${lab('Keine Verbindung · lokale Spiele gehen weiter', F.bone, 10, '.12em')}</div>
    <div style="padding:18px 18px 0;display:flex;flex-direction:column;flex:1">
      <div style="display:flex;justify-content:space-between;align-items:center">${h1('Online')}${status('Offline', F.bad)}</div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px">${lab('Raumcode')}${codeBoxes(['Q', '9', 'Z', 'Z'], { error: true })}${txt('Raum Q9ZZ nicht gefunden oder schon geschlossen.', 13, F.bad)}${txt('Codes laufen 30 Minuten nach dem Gastgeber ab.', 13)}</div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">${primary('Beitreten', 'offline', { disabled: true })}<div style="opacity:0.45">${secondary('Raum erstellen')}</div></div>
      <div style="margin-top:10px;text-align:center">${txt('Verbinde dich, um beizutreten oder einen Raum zu öffnen. Deine letzten Online-Ergebnisse sind gespeichert.', 12, F.mute2)}</div>
      ${card(`<div style="display:flex;align-items:center;justify-content:space-between"><div>${lab('Solange', F.mute, 10, '.14em')}<div style="font:600 24px/1 ${CN};margin-top:6px">Lokales Match spielen</div></div><div style="width:40px;height:40px;border-radius:50%;background:${F.bone};display:grid;place-items:center">${ic('chev', 18, F.bg, 2.2)}</div></div>`, { extra: 'margin-top:16px' })}
      ${nav('Online')}
    </div>`
});

export const onlineLobby = () => phone({
  pad: '66px 18px 0',
  inner: `<div style="display:flex;justify-content:space-between;align-items:center">${h1('Dein Raum')}${status('Verbunden · 24 ms', F.ok)}</div>
    ${card(`<div style="text-align:center">${lab('Diesen Code teilen')}</div><div style="text-align:center;margin-top:12px;font:600 76px/1 ${CN};letter-spacing:.14em">A7K2</div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:14px">${secondary('Code kopieren', { h: 50, iconName: 'copy' })}${secondary('Link teilen', { h: 50, iconName: 'share' })}</div>
      <div style="text-align:center;margin-top:10px">${txt('Der Raum schließt 30 Minuten, nachdem du gehst.', 12, F.mute2)}</div>`, { extra: 'margin-top:16px', pad: '18px' })}
    ${card(`<div style="display:flex;justify-content:space-between">${lab('Spieler · 1 / 2')}${lab('501 · Bis 3 Legs · DO', F.mute2)}</div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid ${F.line1}">${avatar('M', F.p[0], 40)}<div style="flex:1;display:flex;flex-direction:column;gap:3px">${txt('Marcus (du) · Gastgeber', 15, F.bone, 500)}${txt('Ø 58.4 · 24 ms', 12)}</div>${lab('Bereit', F.ok)}</div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0 2px"><div style="width:40px;height:40px;border-radius:50%;border:1.5px dashed ${F.line2};box-sizing:border-box"></div>${txt('Warte auf Gegner …', 14, F.mute2)}</div>`, { extra: 'margin-top:10px' })}
    ${card(`${lab('Regeln')}<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${['501', 'Bis 3 Legs', 'Double Out'].map((c, i) => `<span style="padding:9px 12px;border-radius:10px;font:600 16px/1 ${CN};${i === 0 ? `background:${F.bone};color:${F.bg}` : `background:${F.c2}`}">${c}</span>`).join('')}<span style="padding:9px 12px;font:600 12px/1.2 ${B};letter-spacing:.08em;text-transform:uppercase;color:${F.mute}">Ändern</span></div>`, { extra: 'margin-top:10px' })}
    <div style="margin-top:auto;padding:14px 0 28px;display:grid;grid-template-columns:1.3fr 1fr;gap:8px">${primary('Match starten', '', { disabled: true })}${secondary('Raum schließen', { h: 64 })}</div>`
});

export const onlineReconnect = () => phone({
  pad: '62px 14px 0',
  inner: `<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px">${lab('501 · DO · Online')}${lab('Leg 2')}${lab('Aufgeben', F.bad)}</div>
    <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1.55fr;gap:8px">
      ${scoreCard({ name: 'Marcus (du)', color: F.p[0], score: 261, items: [['Ø', '60.0'], ['Legs', '1']] })}
      ${scoreCard({ name: 'Lena K.', color: F.p[1], score: 321, active: true, items: [['Ø', '63.8'], ['Darts', '9'], ['Legs', '0']] })}
    </div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${F.c1};border:1px solid ${F.line2}">
      <span style="width:10px;height:10px;border-radius:50%;border:2px solid ${F.hit};box-sizing:border-box"></span>
      <div style="display:flex;flex-direction:column;gap:5px">${lab('Wiederverbinden', F.bone)}${txt('Verbindung vor 4 s getrennt · Lenas Darts kommen nach', 13)}</div>
    </div>
    <div style="margin-top:8px">${keypad({ darts: [['T20', '60'], ['S20', '20'], null], locked: true, hint: 'Die Tasten sind frei, sobald du dran bist.' })}</div>`
});
