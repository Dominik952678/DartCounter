// Start screen and "Neues Spiel" setup.
import { F, CN, B, ic, lab, h1, num, txt, dot, phone, nav, card, primary, segment, choices, toggle, stepper, playerRow, dim, sheet, board, BOARD_HERO } from './lib.mjs';

const hero = `<div style="position:absolute;right:-150px;top:110px;opacity:0.9;pointer-events:none">${board({ size: 330, colors: BOARD_HERO })}</div>`;

const tile = (mark, title, sub, { muted = false } = {}) =>
  `<div style="background:${F.c1};border-radius:22px;padding:18px 20px;min-height:132px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;${muted ? 'opacity:0.55;' : ''}">${mark}<div><div style="font:600 28px/1 ${CN}">${title}</div><div style="margin-top:4px">${txt(sub, 13)}</div></div></div>`;
const ring = (c) => `<div style="width:14px;height:14px;border-radius:50%;border:3px solid ${c};box-sizing:border-box"></div>`;
const solid = `<div style="width:14px;height:14px;border-radius:50%;background:${F.bone}"></div>`;

const startHead = (kicker, title, avatarHtml) =>
  `<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative">
    <div>${lab(kicker)}<div style="font:600 40px/1 ${CN};letter-spacing:-.02em;margin-top:8px">${title}</div></div>
    ${avatarHtml}
  </div>`;
const avatarM = `<div style="width:44px;height:44px;border-radius:50%;background:${F.c2};border:2px solid ${F.p[0]};display:grid;place-items:center;font:600 18px/1 ${CN};box-sizing:border-box">M</div>`;

const lastMatch = card(`<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px"><div>${lab('Letztes Match', F.mute, 10, '.14em')}<div style="font:600 22px/1 ${CN};margin-top:6px">Sieg gegen Jonas</div></div>${txt('58.7 Ø · offline · 13. Sept.', 12)}</div>`, { r: 20, pad: '14px 18px' });

export const startResume = () => phone({
  pad: '66px 18px 0',
  inner: `${hero}${startHead('Montag · 14. September', 'Guten Abend,<br>Marcus.', avatarM)}
    <div style="margin-top:118px;position:relative;display:flex;flex-direction:column;gap:10px">
      <div style="background:${F.hit};color:${F.bg};border-radius:22px;padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-end;min-height:112px;box-sizing:border-box">
        <div>${lab('Fortsetzen · Satz 1 · Leg 3', 'rgba(15, 22, 19, 0.75)')}<div style="font:600 36px/1 ${CN};letter-spacing:-.02em;margin-top:10px">Marcus vs Jonas</div></div>
        <div style="font:600 26px/1 ${CN};font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:12px">170<span style="opacity:.55;margin:0 5px">·</span>228</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">
        ${tile(ring(F.bone), 'Neues Spiel', '501 · Double Out · wie zuletzt')}
        ${tile(solid, 'Training', '3 Modi · Checkout 7/10')}
        ${tile(ring(F.ok), 'Online', 'Mit Code · 2 offene Räume')}
        ${tile(`<div>${num('58.4', 22)}<span style="font:600 11px ${B};color:${F.mute};margin-left:4px">Ø</span></div>`, 'Statistik', '14 Matches · +2.1 im Monat')}
      </div>
      ${lastMatch}
    </div>
    ${nav('Start')}`
});

export const startQuick = () => phone({
  pad: '66px 18px 0',
  inner: `${hero}${startHead('Montag · 14. September', 'Bereit fürs<br>nächste Leg?', avatarM)}
    <div style="margin-top:118px;position:relative;display:flex;flex-direction:column;gap:10px">
      <div style="background:${F.hit};color:${F.bg};border-radius:22px;padding:20px 22px;display:flex;justify-content:space-between;align-items:center;min-height:112px;box-sizing:border-box">
        <div>${lab('Weiter wie zuletzt · ein Tap', 'rgba(15, 22, 19, 0.75)')}<div style="font:600 40px/1 ${CN};letter-spacing:-.02em;margin-top:10px">501 · Double Out</div><div style="font:500 13px/1 ${B};margin-top:8px">Marcus · Jonas · Bis 3 Legs</div></div>
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(15, 22, 19, 0.14);display:grid;place-items:center">${ic('play', 22, F.bg, 2)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">
        ${tile(ring(F.bone), 'Anderes Spiel', 'Modus, Spieler, Distanz')}
        ${tile(solid, 'Training', '3 Modi · Checkout 7/10')}
        ${tile(ring(F.ok), 'Online', 'Mit Code · 2 offene Räume')}
        ${tile(`<div>${num('58.4', 22)}<span style="font:600 11px ${B};color:${F.mute};margin-left:4px">Ø</span></div>`, 'Statistik', '14 Matches · +2.1 im Monat')}
      </div>
      ${lastMatch}
    </div>
    ${nav('Start')}`
});

export const startFirst = () => phone({
  pad: '66px 18px 0',
  inner: `${hero}${startHead('Willkommen', 'Guten Abend.', `<div style="width:44px;height:44px;border-radius:50%;border:2px dashed ${F.line2};display:grid;place-items:center;font:600 18px/1 ${CN};color:${F.mute};box-sizing:border-box">?</div>`)}
    <div style="margin-top:150px;position:relative;display:flex;flex-direction:column;gap:10px">
      <div style="background:${F.hit};color:${F.bg};border-radius:22px;padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-end;min-height:104px;box-sizing:border-box">
        <div>${lab('Hier anfangen', 'rgba(15, 22, 19, 0.75)')}<div style="font:600 40px/1 ${CN};letter-spacing:-.02em;margin-top:10px">501 spielen</div></div>
        <div style="text-align:right;font:500 13px/1.3 ${B}">2 Spieler<br>Bis 3 Legs · DO</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">
        ${tile(ring(F.bone), 'Profil anlegen', 'Damit Statistiken dir folgen')}
        ${tile(solid, 'Training', '3 Modi zum Üben')}
        ${tile(ring(F.ok), 'Online', 'Mit Code beitreten')}
        ${tile(`<div>${num('—', 22, F.mute)}<span style="font:600 11px ${B};color:${F.mute};margin-left:4px">Ø</span></div>`, 'Statistik', 'Nach dem ersten Match', { muted: true })}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px">
        <span style="display:flex;gap:8px;align-items:center">${dot(F.mute2)}${txt('Gast-Modus · Daten nur auf diesem Gerät', 13)}</span>${lab('Anmelden', F.bone)}
      </div>
    </div>
    ${nav('Start')}`
});

// ── Neues Spiel ─────────────────────────────────────────────────────────────
const setupHead = `<div style="display:flex;justify-content:space-between;align-items:center">${h1('Neues Spiel')}${lab('Schließen')}</div>`;
const section = (label, inner, right = '') => `<div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center">${lab(label)}${right}</div>${inner}</div>`;
const optionRow = (iconName, title, sub, on) => `<div style="display:flex;align-items:center;gap:12px;background:${F.c1};border-radius:16px;padding:12px 14px">${ic(iconName, 20, F.mute)}<div style="flex:1;display:flex;flex-direction:column;gap:3px">${txt(title, 15, F.bone, 500)}${txt(sub, 12)}</div>${toggle(on)}</div>`;

const setupShell = (body, footer) => phone({
  h: 1220,
  pad: '66px 18px 0',
  inner: `${setupHead}<div style="display:flex;flex-direction:column;gap:20px;margin-top:18px">${body}</div>
    <div style="margin-top:auto;padding:16px 0 28px;display:flex;flex-direction:column;gap:8px">${footer}</div>`
});

const distance = `<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">${stepper('Sätze', '1', 'nur Legs')}${stepper('Legs', '3', 'pro Satz')}</div>`;
const finish = (i = 0) => section('Finish', `${segment(['Double Out', 'Single Out', 'Master Out'], i)}`);
const options = `${section('Optionen', `${optionRow('target', 'Ausbullen', 'Wer näher am Bull ist, beginnt', false)}${optionRow('shuffle', 'Zufällige Reihenfolge', 'Beim Start auslosen', false)}`)}`;

export const setupSingle = () => setupShell(`
  ${segment(['Einzel', '2v2 Doppel'], 0, { h: 44 })}
  ${section('Startpunktzahl', choices(['301', '501', '701', 'Custom'], 1, { fs: 26 }))}
  ${distance}
  ${finish(0)}
  ${section('Spieler · 2', `${playerRow({ name: 'Marcus', sub: 'Eigenes Profil · Ø 58.4', color: F.p[0], tag: 'beginnt', tagColor: F.hit })}${playerRow({ name: 'Bot mittel', sub: 'Bot · Ø 60', color: F.p[1], bot: true })}`, lab('+ Spieler', F.bone))}
  ${options}`,
  primary('Spiel starten', '501 · DO · Bis 3 Legs'));

export const setupDoubles = () => setupShell(`
  ${segment(['Einzel', '2v2 Doppel'], 1, { h: 44 })}
  ${section('Startpunktzahl', choices(['301', '501', '701', 'Custom'], 1, { fs: 26 }))}
  ${distance}
  ${section('Team 1', `${playerRow({ name: 'Marcus', sub: 'Eigenes Profil · Ø 58.4', color: F.p[0], tag: 'beginnt', tagColor: F.hit })}${playerRow({ name: 'Tom', sub: 'Profil · Ø 47.3', color: F.p[0] })}`)}
  ${section('Team 2', `${playerRow({ name: 'Lena', sub: 'Profil · Ø 52.0', color: F.p[1] })}${playerRow({ name: 'Kai', sub: 'Profil · Ø 55.9', color: F.p[1] })}`)}`,
  primary('Spiel starten', '501 · 2v2 · Bis 3 Legs'));

export const setupInvalid = () => setupShell(`
  ${segment(['Einzel', '2v2 Doppel'], 0, { h: 44 })}
  ${section('Startpunktzahl', `${choices(['301', '501', '701', 'Custom'], 3, { fs: 26 })}
    <div style="display:flex;align-items:center;justify-content:space-between;border:1.5px solid ${F.bad};border-radius:16px;padding:10px 10px 10px 16px">${lab('Startpunktzahl')}<div style="min-width:110px;height:48px;border-radius:12px;background:${F.bg};display:grid;place-items:center;font:600 30px/1 ${CN};color:${F.bad}">1</div></div>
    ${txt('Die Startpunktzahl muss zwischen 2 und 9999 liegen.', 13, F.bad)}`)}
  ${distance}
  ${section('Spieler · 4', `${playerRow({ name: 'Marcus', sub: 'Eigenes Profil', color: F.p[0], tag: 'beginnt', tagColor: F.hit })}${playerRow({ name: 'Jonas', sub: 'Gast', color: F.p[1] })}${playerRow({ name: 'Jonas 2', sub: 'Gast', color: F.p[2], tag: 'umbenannt', tagColor: F.ok })}${playerRow({ name: 'Spieler 4', sub: 'Gast', color: F.p[3], tag: 'automatisch', tagColor: F.ok })}`, lab('Max. 4', F.mute2))}
  ${txt('Leere Namen werden zu „Spieler N", doppelte bekommen eine Nummer.', 13)}`,
  primary('Spiel starten', 'Startpunktzahl prüfen', { disabled: true }));

export const setupBullOff = () => phone({
  h: 874,
  pad: '66px 18px 0',
  inner: `${setupHead}<div style="margin-top:18px;opacity:0.4">${segment(['Einzel', '2v2 Doppel'], 0, { h: 44 })}</div>`,
  overlay: dim(sheet(`
    <div style="display:flex;justify-content:space-between;align-items:center">${h1('Ausbullen', 34)}${lab('Abbrechen')}</div>    ${[['Marcus', F.p[0], 0], ['Jonas', F.p[1], 1]].map(([n, c, pick]) => `
      <div style="display:flex;flex-direction:column;gap:8px">
        <span style="display:flex;gap:8px;align-items:center">${dot(c)}${lab(n, F.bone)}</span>
        ${choices(['Bull', '25', 'Außen'], pick, { h: 56, fs: 24 })}
      </div>`).join('')}
    <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:${F.c2}">${ic('check', 18, F.ok)}${txt('Marcus beginnt', 15, F.bone, 500)}</div>
    <div style="margin-top:auto">${primary('Spiel starten', 'Marcus beginnt')}</div>`, { h: 640 }))
});
