// Statistics, match history, profile, players & bots, data & account, sign-in.
import { F, CN, B, ic, lab, h1, num, txt, dot, phone, nav, card, primary, secondary, destructive, bone, segment, chips, toggle, row, avatar, dim, dialog, board, BOARD_QUIET } from './lib.mjs';

const kpi = (label, value, unit, sub, subColor = F.mute2) => card(`${lab(label, F.mute, 10, '.14em')}<div style="margin-top:8px;display:flex;align-items:baseline;gap:3px">${num(value, 44)}${unit ? `<span style="font:600 22px/1 ${CN}">${unit}</span>` : ''}</div><div style="margin-top:6px">${txt(sub, 12, subColor, 600)}</div>`, { r: 18, pad: '14px 14px 12px' });

const trend = () => {
  const vals = [52.1, 54.3, 53.2, 56.0, 55.1, 57.4, 58.9, 57.6, 60.3, 58.4];
  const min = 50, max = 62, W = 320, H = 90;
  const pts = vals.map((v, i) => [Math.round((i / (vals.length - 1)) * W), Math.round(H - ((v - min) / (max - min)) * H)]);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;overflow:visible"><line x1="0" y1="75" x2="${W}" y2="75" stroke="rgba(237, 230, 211, 0.12)"></line><line x1="0" y1="40" x2="${W}" y2="40" stroke="rgba(237, 230, 211, 0.08)"></line><path d="${path} L${W} ${H} L0 ${H} Z" fill="rgba(255, 106, 61, 0.12)"></path><path d="${path}" fill="none" stroke="${F.hit}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path><circle cx="${lx}" cy="${ly}" r="5" fill="${F.hit}" stroke="${F.c1}" stroke-width="3"></circle></svg>`;
};

const statsHead = (onlineActive) => `<div style="display:flex;justify-content:space-between;align-items:center">${h1('Statistik')}<div style="width:180px">${segment(['Offline', 'Online'], onlineActive ? 1 : 0, { h: 34, fs: 11 })}</div></div>`;
const filters = `<div style="display:flex;gap:8px;margin-top:14px">${[['Marcus', F.p[0]], ['X01', null]].map(([t, c]) => `<span style="display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:12px;background:${F.c1};font:500 14px/1 ${B}">${c ? dot(c) : ''}${t}${ic('down', 14, F.mute)}</span>`).join('')}</div>`;

export const statsData = () => phone({
  h: 1320,
  pad: '66px 18px 0',
  inner: `${statsHead(false)}${filters}
    <div style="margin-top:12px">${chips(['3 Monate', 'Jahr', 'Gesamt'], 0)}</div>
    <div style="margin-top:14px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">
      ${kpi('Ø 3 Darts', '58.4', '', '▲ 2.1 zum Vorzeitraum', F.ok)}${kpi('Checkout', '31', '%', '19 von 61 Darts')}${kpi('Siegquote', '64', '%', '9 von 14 Matches')}${kpi('180er', '7', '', 'Höchste Aufnahme 180')}
    </div>
    ${card(`<div style="display:flex;justify-content:space-between">${lab('Ø pro Match', F.mute, 10, '.14em')}${lab('Juni → Sept.', F.mute, 10, '.14em')}</div><div style="margin-top:10px">${trend()}</div><div style="display:flex;justify-content:space-between;margin-top:6px">${txt('52.1 Tief', 11, F.mute2)}${txt('60.3 Hoch', 11, F.mute2)}</div>`, { extra: 'margin-top:10px' })}
    ${card(`<div style="display:flex;gap:14px;align-items:center">${board({ size: 140, numbers: true, heat: { T20: 0.9, S20: 0.6, T19: 0.35, D16: 0.5 } })}<div style="flex:1;display:flex;flex-direction:column;gap:8px">${lab('Wo du triffst', F.mute, 10, '.14em')}<div style="font:600 24px/1.05 ${CN}">T20 ist dein Zuhause. <span style="color:${F.mute}">D16 dein Finish.</span></div>${[['T20', '18.2 %'], ['S20', '14.7 %'], ['D16', '6.1 %']].map(([k, v]) => `<div style="display:flex;justify-content:space-between;font:500 13px/1 ${B}"><span style="color:${F.mute}">${k}</span><span>${v}</span></div>`).join('')}</div></div>`, { extra: 'margin-top:10px' })}
    ${card(`<div style="display:flex;justify-content:space-between">${lab('Matches · 14', F.mute, 10, '.14em')}${lab('Alle', F.bone, 10, '.14em')}</div>${[['Sieg gegen Jonas', '2–1 Legs · 501 DO · 13. Sept.', '58.2'], ['Sieg gegen Bot mittel', '3–1 Legs · 501 DO · 9. Sept.', '54.4'], ['Niederlage gegen Tom', '1–2 Legs · 301 SO · 2. Sept.', '53.5']].map(([t, m, a], i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;${i < 2 ? `border-bottom:1px solid ${F.line1}` : ''}"><div style="display:flex;flex-direction:column;gap:4px"><span style="font:600 20px/1 ${CN};${i === 2 ? `color:${F.mute}` : ''}">${t}</span>${txt(m, 12)}</div><div style="text-align:right">${num(a, 26)}<div>${lab('Ø', F.mute2, 9)}</div></div></div>`).join('')}`, { extra: 'margin-top:10px' })}
    ${nav('Statistik')}`
});

export const statsEmpty = () => phone({
  pad: '66px 18px 0',
  inner: `${statsHead(true)}
    <div style="margin-top:14px">${chips(['3 Monate', 'Jahr', 'Gesamt'], 0)}</div>
    ${card(`<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:12px 4px">${board({ size: 130, colors: BOARD_QUIET })}<div style="font:600 30px/1 ${CN}">Noch keine Online-Matches</div>${txt('Tritt mit dem Code eines Freundes einem Raum bei. Online-Ergebnisse zählen getrennt von lokalen Spielen.', 14)}<div style="margin-top:6px;padding:14px 22px;border-radius:16px;background:${F.hit};color:${F.bg};font:600 22px/1 ${CN}">Online spielen</div></div>`, { extra: 'margin-top:16px', pad: '22px 18px' })}
    ${card(`<div style="display:flex;justify-content:space-between;align-items:center"><div>${lab('Offline · 3 Monate', F.mute, 10, '.14em')}<div style="font:600 24px/1 ${CN};margin-top:6px">14 Matches · 58.4 Ø</div></div>${lab('Wechseln', F.bone)}</div>`, { extra: 'margin-top:10px' })}
    ${nav('Statistik')}`
});

export const statsHistory = () => phone({
  h: 1040,
  pad: '66px 18px 0',
  inner: `<div style="display:flex;align-items:center;gap:8px">${ic('back', 18, F.mute)}${lab('Statistik')}</div>
    <div style="margin-top:10px">${h1('Matches')}</div>
    <div style="margin-top:14px">${chips(['Alle', 'Offline', 'Online', 'Training'], 0)}</div>
    ${[['September', [['Sieg gegen Jonas', '2–1 Legs · 501 DO · 13. Sept. · offline', '58.2', false], ['Checkout-Training', '8/10 gecheckt · 12. Sept.', '8/10', false], ['Sieg gegen Lena K.', '3–2 Legs · 501 DO · 10. Sept. · online', '61.0', false], ['Niederlage gegen Tom', '1–2 Legs · 301 SO · 2. Sept. · offline', '53.5', true]]], ['August', [['Sieg gegen Bot mittel', '3–1 Legs · 501 DO · 29. Aug. · offline', '54.4', false], ['Power Scoring', '812 Punkte · 21. Aug.', '812', false]]]].map(([month, items]) => `
      <div style="margin-top:18px">${lab(month)}</div>
      ${card(items.map(([t, m, v, lost], i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;${i < items.length - 1 ? `border-bottom:1px solid ${F.line1}` : ''}"><div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font:600 20px/1 ${CN};${lost ? `color:${F.mute}` : ''}">${t}</span>${txt(m, 12)}</div><div style="display:flex;align-items:center;gap:10px">${num(v, 24)}${ic('chev', 16, F.mute2)}</div></div>`).join(''), { extra: 'margin-top:8px', pad: '4px 16px' })}`).join('')}
    ${nav('Statistik')}`
});

// ── Profil ──────────────────────────────────────────────────────────────────
const profileHead = `<div style="display:flex;align-items:center;gap:16px">
  <div style="position:relative;width:88px;height:88px">${board({ size: 88, colors: { light: '#E8E1CE', dark: '#151D19', ringA: '#B23A33', ringB: '#2E7D55' } })}<div style="position:absolute;inset:16px;border-radius:50%;background:${F.bg};border:2px solid ${F.p[0]};display:grid;place-items:center;font:600 26px/1 ${CN}">M</div></div>
  <div style="display:flex;flex-direction:column;gap:6px">${h1('Marcus')}${txt('Eigenes Profil · seit März 2026', 13)}</div>
</div>`;

export const profileMine = () => phone({
  h: 1000,
  pad: '66px 18px 0',
  inner: `${profileHead}
    <div style="margin-top:18px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:8px">${[['Matches', '212', F.bone], ['Siegquote', '57%', F.bone], ['High Finish', '121', F.hit]].map(([k, v, c]) => card(`${lab(k, F.mute, 10, '.12em')}<div style="margin-top:8px">${num(v, 34, c)}</div>`, { r: 16, pad: '12px 12px' })).join('')}</div>
    <div style="margin-top:22px">${lab('Einstellungen')}</div>
    ${row(txt('Standardspiel', 16, F.bone, 500), `<span style="display:flex;gap:8px;align-items:center">${txt('501 · Double Out', 14, F.mute)}${ic('chev', 16, F.mute2)}</span>`)}
    ${row(`<div style="display:flex;flex-direction:column;gap:3px">${txt('Checkout-Hinweise', 16, F.bone, 500)}${txt('Weg zeigen, sobald ein Finish geht', 12)}</div>`, toggle(true))}
    ${row(`<div style="display:flex;flex-direction:column;gap:3px">${txt('Caller', 16, F.bone, 500)}${txt('Sagt Punkte und Game Shot an', 12)}</div>`, toggle(true))}
    ${row(`<div style="display:flex;flex-direction:column;gap:3px">${txt('Bildschirm wach halten', 16, F.bone, 500)}${txt('Während Matches und Training', 12)}</div>`, toggle(true))}
    <div style="margin-top:22px">${lab('Verwalten')}</div>
    ${row(`<span style="display:flex;gap:12px;align-items:center">${ic('user', 20, F.mute)}${txt('Spieler & Bots', 16, F.bone, 500)}</span>`, `<span style="display:flex;gap:8px;align-items:center">${txt('6', 14, F.mute)}${ic('chev', 16, F.mute2)}</span>`)}
    ${row(`<span style="display:flex;gap:12px;align-items:center">${ic('cloud', 20, F.mute)}${txt('Daten & Konto', 16, F.bone, 500)}</span>`, `<span style="display:flex;gap:8px;align-items:center">${txt('Gast-Modus', 14, F.mute)}${ic('chev', 16, F.mute2)}</span>`, { border: false })}
    ${nav('Profil')}`
});

const personRow = ({ name, sub, color, bot = false, right = '' }) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid ${F.line1}">${bot ? `<div style="width:40px;height:40px;border-radius:50%;background:${F.c2};border:2px solid ${color};display:grid;place-items:center;box-sizing:border-box">${ic('bot', 18)}</div>` : avatar(name[0], color)}<div style="flex:1;display:flex;flex-direction:column;gap:3px;min-width:0">${txt(name, 16, F.bone, 500)}${txt(sub, 12)}</div>${right}</div>`;

export const profilePlayers = () => phone({
  h: 1000,
  pad: '66px 18px 0',
  inner: `<div style="display:flex;align-items:center;gap:8px">${ic('back', 18, F.mute)}${lab('Profil')}</div>
    <div style="margin-top:10px">${h1('Spieler & Bots')}</div>
    ${card(`${lab('Neuer Spieler')}<div style="display:flex;gap:8px;margin-top:10px"><div style="flex:1;height:52px;border-radius:14px;background:${F.bg};display:flex;align-items:center;padding:0 14px;box-sizing:border-box">${txt('Name', 16, F.mute2)}</div><div style="width:52px;height:52px;border-radius:14px;background:${F.bone};display:grid;place-items:center">${ic('plus', 22, F.bg, 2.2)}</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">${txt('Als Bot anlegen', 14, F.bone, 500)}${toggle(false)}</div>`, { extra: 'margin-top:16px' })}
    <div style="margin-top:20px;display:flex;justify-content:space-between">${lab('Profile · 6')}${lab('Gast importieren', F.bone)}</div>
    ${personRow({ name: 'Marcus', sub: 'Eigenes Profil · 212 Matches', color: F.p[0], right: lab('Du', F.hit) })}
    ${personRow({ name: 'Jonas', sub: 'Lokal · 48 Matches · Ø 54.0', color: F.p[1], right: ic('close', 16, F.mute2) })}
    ${personRow({ name: 'Leon', sub: 'Cloud-Gast · synchronisiert', color: F.p[2], right: `<span style="display:flex;gap:10px;align-items:center">${ic('cloud', 18, F.mute)}${ic('close', 16, F.mute2)}</span>` })}
    ${['Bot leicht · Ø 40', 'Bot mittel · Ø 60', 'Bot stark · Ø 80'].map((b, i) => personRow({ name: b.split(' · ')[0], sub: 'Bot', color: F.p[3], bot: true, right: `<span style="display:flex;gap:10px;align-items:center"><span style="padding:8px 10px;border-radius:10px;background:${F.c1};font:600 14px/1 ${CN};display:flex;gap:6px;align-items:center">${b.split(' · ')[1]}${ic('down', 12, F.mute)}</span>${ic('close', 16, F.mute2)}</span>` })).join('')}
    ${nav('Profil')}`
});

export const profileData = () => phone({
  h: 1000,
  pad: '66px 18px 0',
  inner: `<div style="display:flex;align-items:center;gap:8px">${ic('back', 18, F.mute)}${lab('Profil')}</div>
    <div style="margin-top:10px">${h1('Daten & Konto')}</div>
    ${card(`${lab('Konto')}<div style="margin-top:10px;display:flex;flex-direction:column;gap:4px">${txt('Gast-Modus', 18, F.bone, 500)}${txt('Profile und Matches liegen nur in diesem Browser. Mit einem Konto werden sie gesichert und auf anderen Geräten verfügbar.', 13)}</div><div style="margin-top:14px">${primary('Anmelden')}</div>`, { extra: 'margin-top:16px' })}
    <div style="margin-top:20px">${lab('Gast-Sync')}</div>
    ${row(`<span style="display:flex;gap:12px;align-items:center">${ic('cloud', 20, F.mute)}${txt('Sync-Code einlösen', 16, F.bone, 500)}</span>`, ic('chev', 16, F.mute2), { border: false })}
    <div style="margin-top:14px">${lab('Sicherung · 212 Matches · 6 Profile')}</div>
    <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">${secondary('Sicherung exportieren (JSON)', { iconName: 'share' })}${secondary('Sicherung einspielen')}${secondary('Testdaten laden')}</div>
    <div style="margin-top:20px">${lab('Gefahrenzone', F.bad)}</div>
    <div style="margin-top:10px">${destructive('Alle Daten auf diesem Gerät löschen')}</div>
    <div style="margin-top:16px;text-align:center">${txt('Dartcounter v2.0.0 · Build 14.09.2026', 12, F.mute2)}</div>
    ${nav('Profil')}`
});

export const profileDeleteDialog = () => phone({
  pad: '66px 18px 0',
  inner: `<div style="opacity:0.3">${h1('Daten & Konto')}</div>`,
  overlay: dim(dialog(`
    <div style="font:600 30px/1 ${CN}">Alle Daten löschen?</div>
    ${txt('212 Matches, 6 Profile und alle Einstellungen verschwinden von diesem Gerät. Das lässt sich nicht rückgängig machen — exportiere vorher eine Sicherung.', 14)}
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">${destructive('Endgültig löschen', { filled: true })}${secondary('Erst Sicherung exportieren')}</div>
    <div style="text-align:center;margin-top:4px">${lab('Abbrechen', F.mute)}</div>`), { align: 'center' })
});

export const signIn = () => phone({
  pad: '66px 18px 28px',
  inner: `<div style="display:flex;align-items:center;gap:8px">${ic('back', 18, F.mute)}${lab('Zurück')}</div>
    <div style="margin-top:22px">${h1('Anmelden', 48)}</div>
    <div style="margin-top:8px">${txt('Mit Konto werden deine Matches gesichert und sind auf allen Geräten da.', 15)}</div>
    <div style="margin-top:24px;display:flex;flex-direction:column;gap:14px">
      ${['E-Mail', 'Passwort'].map((l, i) => `<div style="display:flex;flex-direction:column;gap:8px">${lab(l)}<div style="height:56px;border-radius:16px;background:${F.c1};border:1.5px solid ${i === 0 ? F.bone : F.line1};display:flex;align-items:center;padding:0 16px;box-sizing:border-box">${txt(i === 0 ? 'marcus@beispiel.de' : '••••••••', 16, i === 0 ? F.bone : F.mute)}</div></div>`).join('')}
      <div style="text-align:right">${lab('Passwort vergessen?', F.mute)}</div>
    </div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px">${primary('Anmelden')}${secondary('Konto erstellen')}</div>
    <div style="margin-top:auto;display:flex;gap:10px;align-items:flex-start">${ic('lock', 18, F.mute)}${txt('Ohne Konto bleibt alles auf diesem Gerät. Du kannst jederzeit später anmelden — lokale Daten werden übernommen.', 13)}</div>`
});
