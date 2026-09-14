// Match screens: phone states, landscape, match end.
import { F, CN, B, ic, lab, num, txt, dot, phone, card, primary, secondary, bone, destructive, dim, sheet, dialog, board, hitPath, BOARD_CLASSIC, BOARD_QUIET } from './lib.mjs';

export const matchHead = (left, mid) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px;gap:8px">
    ${lab(left)}${lab(mid)}
    <div style="display:flex;align-items:center;gap:14px">${ic('chart', 18)}${ic('sound', 18)}${lab('Menü', F.bone)}</div>
  </div>`;

const stats = (items) => `<div style="display:flex;gap:12px;flex-wrap:wrap;font:600 12px/1 ${B};color:rgba(237, 230, 211, 0.6)">${items.map(([k, v]) => `<span>${k} <b style="color:${F.bone};font-weight:600">${v}</b></span>`).join('')}</div>`;

export const scoreCard = ({ name, color, score, active = false, items = [], size = 112, tag = '' }) => active
  ? `<div style="background:${F.c1};border-radius:22px;padding:16px 16px 14px;border:1.5px solid ${F.hit};display:flex;flex-direction:column;justify-content:space-between;min-width:0;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:flex;align-items:center;gap:7px">${dot(color)}${lab(name, F.hit)}</span>${lab(tag || 'wirft', F.hit)}</div>
      <div style="margin-top:10px">${num(score, size, F.bone, '-.04em')}</div>
      <div style="margin-top:10px">${stats(items)}</div>
    </div>`
  : `<div style="background:${F.c0};border-radius:22px;padding:16px 14px 14px;display:flex;flex-direction:column;justify-content:space-between;min-width:0;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:flex;align-items:center;gap:7px">${dot(color)}${lab(name)}</span>${tag ? lab(tag, F.mute2) : ''}</div>
      <div style="margin-top:8px">${num(score, Math.round(size * 0.57), 'rgba(237, 230, 211, 0.85)')}</div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">${items.map(([k, v]) => `<span style="font:600 12px/1 ${B};color:${F.mute}">${k} ${v}</span>`).join('')}</div>
    </div>`;

export const bar = {
  checkout: (route, note = '') => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${F.hit};color:${F.bg}">${lab('Checkout', 'rgba(15, 22, 19, 0.75)')}<span style="font:600 26px/1 ${CN};letter-spacing:.02em">${route}</span>${note ? `<span style="margin-left:auto;font:500 12px/1.2 ${B}">${note}</span>` : ''}</div>`,
  bust: () => `<div style="display:flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:16px;background:${F.bone};color:${F.bg}"><span style="font:600 26px/1 ${CN};letter-spacing:.08em">BUST</span></div>`,
  bogey: () => `<div style="display:flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:16px;background:${F.c1};border:1px solid ${F.line2}"><span style="font:600 26px/1 ${CN};letter-spacing:.08em">BOGEY</span></div>`,
  freeze: (title, text) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${F.c1};border:1px solid ${F.line2}">${ic('lock', 20)}<div style="display:flex;flex-direction:column;gap:5px">${lab(title, F.bone)}${text ? txt(text, 13, F.mute) : ''}</div></div>`,
  info: (title, text, color = F.hit) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:${F.c1};border:1px solid ${F.line1}">${dot(color, 9)}${lab(title, F.bone)}${txt(text, 13, F.mute)}</div>`
};

const slot = (d, i, struck) => d
  ? `<div style="height:56px;border-radius:14px;background:${F.c2};display:flex;align-items:center;justify-content:center;gap:8px;font:600 24px/1 ${CN};${struck ? 'color:rgba(237, 230, 211, 0.5);text-decoration:line-through;' : ''}">${d[0]}<span style="font:500 13px ${B};color:rgba(237, 230, 211, 0.5);text-decoration:none">${d[1]}</span></div>`
  : `<div style="height:56px;border-radius:14px;border:1.5px dashed ${F.line2};display:flex;align-items:center;justify-content:center;font:600 20px/1 ${CN};color:rgba(237, 230, 211, 0.35)">${i + 1}. Dart</div>`;

const key = (label, { h = 56, fs = 30, muted = false, active = false, span = 1 } = {}) =>
  `<div style="height:${h}px;border-radius:14px;${active ? `background:${F.bone};color:${F.bg}` : `background:${F.c1};border:1px solid ${F.line};color:${muted ? F.mute : F.bone}`};display:grid;place-items:center;font:600 ${fs}px/1 ${CN};font-variant-numeric:tabular-nums;grid-column:span ${span};box-sizing:border-box">${label}</div>`;

export const keypad = ({ darts = [null, null, null], mult = 1, struck = false, locked = false, keyH = 56, hint = '' }) =>
  `<div style="display:flex;flex-direction:column;gap:8px;${locked ? 'opacity:0.35;' : ''}">
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr)) 64px;gap:8px">
      ${darts.map((d, i) => slot(d, i, struck)).join('')}
      <div style="height:56px;border-radius:14px;border:1px solid ${F.line2};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px">${ic('undo', 18)}${lab('Zurück', F.bone, 9, '.06em')}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:2px">
      ${key('Double', { h: 52, fs: 24, active: mult === 2 })}${key('Triple', { h: 52, fs: 24, active: mult === 3 })}
    </div>
    <div style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:8px">
      ${Array.from({ length: 20 }, (_, i) => key(i + 1, { h: keyH })).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">
      ${key('Bull', { h: keyH, fs: 28 })}${key('Miss', { h: keyH, fs: 24, muted: true })}
    </div>
  </div>
  ${hint ? `<div style="text-align:center;margin-top:8px">${txt(hint, 12, F.mute2)}</div>` : ''}`;

const two = (a, b, flip = false) => `<div style="display:grid;grid-template-columns:${flip ? '1fr 1.55fr' : '1.55fr 1fr'};gap:8px">${a}${b}</div>`;

const matchPhone = ({ head, cards, barHtml = '', pad, overlay = '' }) => phone({
  pad: '62px 14px 0',
  overlay,
  inner: `${head}<div style="margin-top:12px">${cards}</div>${barHtml ? `<div style="margin-top:8px">${barHtml}</div>` : ''}<div style="margin-top:8px">${pad}</div>`
});

const marcus = (score, active, extra = {}) => scoreCard({ name: 'Marcus', color: F.p[0], score, active, items: active ? [['Ø', '61.2'], ['Darts', '9'], ['Legs', '2']] : [['Ø', '61.2'], ['Legs', '2']], ...extra });
const jonas = (score, active, extra = {}) => scoreCard({ name: 'Jonas', color: F.p[1], score, active, items: active ? [['Ø', '54.0'], ['Darts', '27'], ['Legs', '1']] : [['Ø', '54.0'], ['Legs', '1']], ...extra });

// ── Phone states ────────────────────────────────────────────────────────────
export const matchCheckout = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(121, true), jonas(228, false)),
  barHtml: bar.checkout('T20 · T11 · D14'),
  pad: keypad({ darts: [null, null, null], mult: 3 })
});

export const matchBust = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(32, false), jonas(60, true), true),
  barHtml: bar.bust(),
  pad: keypad({ darts: [['S20', '20'], ['T20', '60'], null], struck: true })
});

export const matchBogey = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 4'),
  cards: two(marcus(169, true), jonas(301, false)),
  barHtml: bar.bogey(),
  pad: keypad({ darts: [null, null, null] })
});

const small = (name, color, score, active, tag, items) => scoreCard({ name, color, score, active, tag, size: 64, items });
export const match2v2 = () => matchPhone({
  head: matchHead('501 · Double Out · 2v2', 'Leg 2'),
  cards: `<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">
    ${small('Marcus', F.p[0], 40, true, 'Team 1', [['Ø', '58.1'], ['Darts', '12']])}
    ${small('Lena', F.p[1], 60, false, 'Team 2', [['Ø', '52.0']])}
    ${small('Tom', F.p[0], 200, false, 'Team 1', [['Ø', '47.3']])}
    ${small('Kai', F.p[1], 40, false, 'Team 2', [['Ø', '55.9']])}
  </div>`,
  barHtml: bar.freeze('Freeze · Team 1'),
  pad: keypad({ darts: [null, null, null], keyH: 48 })
});

export const matchStatsSheet = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(261, true), jonas(321, false)),
  pad: keypad({ darts: [['T20', '60'], ['S20', '20'], null] }),
  overlay: dim(sheet(`
    <div style="display:flex;justify-content:space-between;align-items:center">${lab('Live-Statistik · dieses Leg', F.bone)}${lab('Schließen', F.mute)}</div>
    <div style="display:flex;gap:8px">${['Marcus', 'Jonas'].map((n, i) => `<span style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;${i === 0 ? `background:${F.bone};color:${F.bg}` : `color:${F.mute}`};font:600 12px/1 ${B};letter-spacing:.08em;text-transform:uppercase">${dot(F.p[i])}${n}</span>`).join('')}</div>
    <div style="display:flex;gap:16px;align-items:center">
      ${board({ size: 150, heat: { T20: 0.9, S20: 0.6, S5: 0.35, S1: 0.3, T19: 0.4 } })}
      <div style="flex:1;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">
        ${[['Leg Ø', '80.0'], ['First 9', '80.0'], ['Match Ø', '61.2'], ['Checkout', '2 / 5']].map(([k, v]) => card(`${lab(k, F.mute, 10, '.14em')}<div style="margin-top:8px">${num(v, 30)}</div>`, { bg: F.c2, r: 14, pad: '10px 12px' })).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column">
      ${lab('Aufnahmen')}
      ${[['1', 'T20 T20 S20', '140', '361'], ['2', 'S20 S20 T20', '100', '261'], ['3', 'T20 S20 ·', '80', '181']].map(([n, d, p, r], i) => `<div style="display:grid;grid-template-columns:24px 1fr 50px 50px;gap:8px;padding:11px 0;border-bottom:1px solid ${F.line1};font:500 14px/1 ${B};${i === 2 ? `color:${F.hit}` : ''}"><span style="color:${i === 2 ? F.hit : F.mute}">${n}</span><span>${d}</span><span style="text-align:right;font-variant-numeric:tabular-nums">${p}</span><span style="text-align:right;color:${F.mute};font-variant-numeric:tabular-nums">${r}</span></div>`).join('')}
    </div>`, { h: 600 }))
});

export const matchLeave = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(170, true), jonas(228, false)),
  pad: keypad({}),
  overlay: dim(dialog(`
    ${h('Match verlassen?')}
    ${txt('Das Match bleibt auf diesem Gerät gespeichert. Du kannst es jederzeit von der Startseite fortsetzen — oder es endgültig abbrechen.', 14, F.mute)}
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">${bone('Speichern & verlassen')}${destructive('Match abbrechen')}</div>
    <div style="text-align:center;margin-top:4px">${lab('Weiterspielen', F.mute)}</div>`), { align: 'center' })
});

const h = (t) => `<div style="font:600 30px/1 ${CN}">${t}</div>`;

export const matchDartsPrompt = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(0, true), jonas(228, false)),
  pad: keypad({ darts: [['DB', '50'], null, null] }),
  overlay: dim(dialog(`
    ${lab('Check · 50', F.ok)}
    ${h('Wie viele Darts gingen aufs Doppel?')}
    ${txt('Erkannt: 1 Dart. Bei 50 kann der erste Dart auch ein Setup gewesen sein.', 14, F.mute)}
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:6px">${['0', '1'].map((n, i) => `<div style="height:60px;border-radius:14px;display:grid;place-items:center;font:600 30px/1 ${CN};${i === 1 ? `background:${F.bone};color:${F.bg}` : `background:${F.c2}`}">${n}</div>`).join('')}</div>
    <div style="margin-top:4px">${primary('Bestätigen', '1 Dart')}</div>`), { align: 'center' })
});

// The celebration animations stay (decision 5); one still frame in the new colours.
export const matchHighFinish = () => matchPhone({
  head: matchHead('501 · Double Out', 'Satz 1 · Leg 3'),
  cards: two(marcus(0, true), jonas(228, false)),
  pad: keypad({ darts: [['T20', '60'], ['T11', '33'], ['D14', '28']] }),
  overlay: `
    <div style="position:absolute;left:0;right:0;top:88px;height:444px;background:rgba(15, 22, 19, 0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
      <div style="position:absolute;width:230px;height:230px;border-radius:50%;border:2px solid rgba(99, 196, 138, 0.35)"></div>
      <div style="position:absolute;width:150px;height:150px;border-radius:50%;border:2px solid rgba(99, 196, 138, 0.6)"></div>
      <div style="font:600 24px/1 ${CN};color:${F.ok};position:relative">High Finish</div>
      <div style="position:relative">${num('121', 104, F.bone, '-.04em')}</div>
      <div style="position:relative;display:flex;gap:6px;align-items:center">${dot(F.p[0])}${txt('Marcus · T20 T11 D14', 14, F.mute)}</div>
    </div>
    <div style="position:absolute;left:14px;right:14px;top:606px;bottom:28px;background:rgba(15, 22, 19, 0.94);border-radius:14px;display:grid;place-items:center">
      ${board({ size: 220, colors: BOARD_QUIET, overlay: `${hitPath('T20', F.hit)}${hitPath('T11', F.hit)}${hitPath('D14', F.ok)}<circle r="166" fill="none" stroke="${F.ok}" stroke-width="8" stroke-linecap="round" stroke-dasharray="1043" stroke-dashoffset="260" transform="rotate(-81)"></circle>` })}
    </div>`
});

// ── Landscape ───────────────────────────────────────────────────────────────
export const ipadLandscape = () => `<div style="width:1180px;height:820px;border-radius:36px;background:${F.bg};overflow:hidden;box-shadow:0 24px 60px rgba(28, 27, 24, 0.28);padding:28px 28px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;color:${F.bone};font-family:${B}">
  <div style="display:flex;justify-content:space-between;align-items:center">${lab('501 · Double Out · Bis 3 Sätze')}<div style="font:600 24px/1 ${CN}">Satz 1 · Leg 3</div><div style="display:flex;gap:16px;align-items:center">${ic('sound', 18)}${lab('Pause · Menü', F.bone)}</div></div>
  <div style="flex:1;display:grid;grid-template-columns:minmax(0, 1fr) 340px;gap:14px;min-height:0">
    <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:12px">
        <div style="background:${F.c1};border:1.5px solid ${F.hit};border-radius:24px;padding:18px 22px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between"><span style="display:flex;gap:8px;align-items:center">${dot(F.p[0])}${lab('Marcus', F.hit)}</span>${lab('wirft', F.hit)}</div>
          ${num('170', 150, F.bone, '-.04em')}
          ${bar.checkout('T20 · T20 · Bull', 'einziger Weg')}
        </div>
        <div style="background:${F.c0};border-radius:24px;padding:18px 22px;display:flex;flex-direction:column;justify-content:space-between">
          <span style="display:flex;gap:8px;align-items:center">${dot(F.p[1])}${lab('Jonas')}</span>
          ${num('228', 96, 'rgba(237, 230, 211, 0.85)')}
          ${txt('Ø 54.0 · Legs 1 · zuletzt 45', 13, F.mute)}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr)) 100px;gap:10px">
        ${[['T20', '60'], ['S19', '19']].map(([a, b]) => `<div style="height:60px;border-radius:14px;background:${F.c2};display:flex;align-items:center;justify-content:center;gap:8px;font:600 26px/1 ${CN}">${a}<span style="font:500 13px ${B};color:${F.mute}">${b}</span></div>`).join('')}
        <div style="height:60px;border-radius:14px;border:1.5px dashed ${F.line2};display:grid;place-items:center;font:600 22px/1 ${CN};color:rgba(237, 230, 211, 0.35)">3. Dart</div>
        <div style="height:60px;border-radius:14px;border:1px solid ${F.line2};display:flex;align-items:center;justify-content:center;gap:6px">${ic('undo', 18)}${lab('Zurück', F.bone, 11, '.06em')}</div>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:110px repeat(8, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr));gap:10px">
        <div style="grid-row:span 1;border-radius:14px;background:${F.c2};display:grid;place-items:center;font:600 26px/1 ${CN}">Double</div>
        ${Array.from({ length: 8 }, (_, i) => `<div style="border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 32px/1 ${CN}">${i + 1}</div>`).join('')}
        <div style="border-radius:14px;background:${F.bone};color:${F.bg};display:grid;place-items:center;font:600 26px/1 ${CN}">Triple</div>
        ${Array.from({ length: 8 }, (_, i) => `<div style="border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 32px/1 ${CN}">${i + 9}</div>`).join('')}
        <div style="border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 24px/1 ${CN};color:${F.mute}">Miss</div>
        ${[17, 18, 19, 20].map(n => `<div style="border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 32px/1 ${CN}">${n}</div>`).join('')}
        <div style="grid-column:span 4;border-radius:14px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 30px/1 ${CN}">Bull</div>
      </div>
    </div>
    <div style="background:${F.c1};border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:12px;min-height:0">
      <div style="display:flex;justify-content:space-between">${lab('Live-Statistik · dieses Leg')}<span style="display:flex;gap:6px;align-items:center">${dot(F.p[0])}${lab('Marcus', F.bone)}</span></div>
      <div style="display:grid;place-items:center">${board({ size: 210, numbers: true, heat: { T20: 0.9, S20: 0.55, T19: 0.4, S1: 0.3 } })}</div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">${[['Leg Ø', '61.2'], ['First 9', '66.7'], ['Match Ø', '58.9'], ['Checkout', '2 / 5']].map(([k, v]) => card(`${lab(k, F.mute, 10, '.14em')}<div style="margin-top:6px">${num(v, 28)}</div>`, { bg: F.c2, r: 14, pad: '10px 12px' })).join('')}</div>
      <div>${lab('Aufnahmen')}${[['1 · T20 T20 S20', '140', '361'], ['2 · T20 S20 S20', '100', '261'], ['3 · S20 S5 T20', '85', '176'], ['4 · T20 S19 …', '79', '170']].map(([d, p, r], i) => `<div style="display:grid;grid-template-columns:1fr 44px 44px;gap:6px;padding:9px 0;border-bottom:1px solid ${F.line1};font:500 13px/1 ${B};${i === 3 ? `color:${F.hit}` : ''}"><span>${d}</span><span style="text-align:right">${p}</span><span style="text-align:right;${i === 3 ? '' : `color:${F.mute}`}">${r}</span></div>`).join('')}</div>
    </div>
  </div>
</div>`;

export const phoneLandscape = () => `<div style="width:874px;height:402px;border-radius:36px;background:${F.bg};overflow:hidden;box-shadow:0 24px 60px rgba(28, 27, 24, 0.28);padding:14px 56px 14px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0, 1fr) 380px;gap:14px;color:${F.bone};font-family:${B}">
  <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
    <div style="display:flex;justify-content:space-between">${lab('501 · DO · Leg 3')}<div style="display:flex;gap:12px">${ic('chart', 16)}${lab('Menü', F.bone)}</div></div>
    <div style="flex:1;display:grid;grid-template-rows:1.2fr 1fr;gap:8px">
      <div style="background:${F.c1};border:1.5px solid ${F.hit};border-radius:20px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;gap:7px;align-items:center">${dot(F.p[0])}${lab('Marcus · wirft', F.hit)}</span>${txt('Ø 61.2 · Darts 9', 12, F.mute)}</div>${num('121', 96, F.bone, '-.04em')}</div>
      <div style="background:${F.c0};border-radius:20px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between"><span style="display:flex;gap:7px;align-items:center">${dot(F.p[1])}${lab('Jonas')}</span>${num('228', 64, 'rgba(237, 230, 211, 0.85)')}</div>
    </div>
    ${bar.checkout('T20 · T11 · D14')}
  </div>
  <div style="display:flex;flex-direction:column;gap:5px">
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr)) 54px;gap:5px">${['1.', '2.', '3.'].map(t => `<div style="height:36px;border-radius:10px;border:1.5px dashed ${F.line2};display:grid;place-items:center;font:600 15px/1 ${CN};color:rgba(237, 230, 211, 0.35)">${t} Dart</div>`).join('')}<div style="height:36px;border-radius:10px;border:1px solid ${F.line2};display:grid;place-items:center">${ic('undo', 16)}</div></div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:5px"><div style="height:34px;border-radius:10px;background:${F.c2};display:grid;place-items:center;font:600 18px/1 ${CN}">Double</div><div style="height:34px;border-radius:10px;background:${F.bone};color:${F.bg};display:grid;place-items:center;font:600 18px/1 ${CN}">Triple</div></div>
    <div style="flex:1;display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(5, minmax(0, 1fr));gap:5px">${Array.from({ length: 20 }, (_, i) => `<div style="border-radius:10px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 22px/1 ${CN}">${i + 1}</div>`).join('')}<div style="grid-column:span 2;border-radius:10px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 20px/1 ${CN}">Bull</div><div style="grid-column:span 3;border-radius:10px;background:${F.c1};border:1px solid ${F.line};display:grid;place-items:center;font:600 18px/1 ${CN};color:${F.mute}">Miss</div></div>
  </div>
</div>`;

// ── Match end ───────────────────────────────────────────────────────────────
export const matchEnd = () => phone({
  h: 1000,
  pad: '72px 18px 28px',
  inner: `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px">
      ${lab('Marcus gewinnt das Match', F.hit, 12)}
      ${num('3 – 1', 120, F.bone, '-.03em')}
      ${txt('501 · Double Out · Bis 3 Legs · 23 Min', 14, F.mute)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:22px">
      ${[['Marcus', F.p[0], '61.2', [['Checkout', '3/7 · 43 %'], ['Beste Aufnahme', '180'], ['High Finish', '170'], ['Darts', '96']], true], ['Jonas', F.p[1], '54.0', [['Checkout', '1/6 · 17 %'], ['Beste Aufnahme', '140'], ['High Finish', '40'], ['Darts', '102']], false]].map(([n, c, avg, rows, win]) => `
      <div style="background:${F.c1};border-radius:20px;padding:14px 14px 12px;${win ? `border:1.5px solid ${F.hit}` : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;gap:6px;align-items:center">${dot(c)}${lab(n, F.mute, 10, '.14em')}</span>${win ? lab('Sieger', F.hit, 10, '.14em') : ''}</div>
        <div style="margin-top:10px;display:flex;align-items:baseline;gap:6px">${num(avg, 46)}${lab('Ø', F.mute, 11)}</div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;font:500 13px/1 ${B}"><span style="color:${F.mute}">${k}</span><span style="font-variant-numeric:tabular-nums">${v}</span></div>`).join('')}</div>
      </div>`).join('')}
    </div>
    ${card(`${lab('Legs')}${[['1', 'Marcus · 15 Darts', 'D16'], ['2', 'Jonas · 21 Darts', 'D20'], ['3', 'Marcus · 12 Darts · 170', 'Bull'], ['4', 'Marcus · 18 Darts', 'D8']].map(([n, t, f], i) => `<div style="display:grid;grid-template-columns:24px 1fr auto;gap:8px;padding:11px 0;border-bottom:${i < 3 ? `1px solid ${F.line1}` : 'none'};font:500 14px/1 ${B};${i === 2 ? `color:${F.hit}` : ''}"><span style="color:${F.mute}">${n}</span><span>${t}</span><span>${f}</span></div>`).join('')}`, { extra: 'margin-top:8px' })}
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:14px">${primary('Revanche')}${secondary('Start', { h: 64 })}</div>
    <div style="display:flex;justify-content:center;gap:8px;align-items:center;margin-top:14px">${ic('share', 16, F.mute)}${lab('Match-Bild teilen', F.mute)}</div>`
});
