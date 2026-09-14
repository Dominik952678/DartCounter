// Result screens with everything today's result sheet shows: per-player match stats,
// leg averages, per-player heatmap, rematch, undo last throw, share image.
import { F, CN, B, ic, lab, num, txt, dot, phone, card, primary, secondary, bone, segment } from './lib.mjs';
import { compareTable, heatCard, sampleHits } from './charts.mjs';

const who = ([n, c]) => `<span style="display:flex;gap:6px;align-items:center">${dot(c)}${n}</span>`;

const MATCH = [['Marcus', F.p[0]], ['Jonas', F.p[1]]];
const LEG_COLS = 'grid-template-columns:28px repeat(2, minmax(0, 1fr)) 1.3fr';

export const matchEnd = () => phone({
  h: 1780,
  pad: '72px 18px 28px',
  inner: `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px">
      ${lab('Marcus gewinnt das Match', F.hit, 12)}
      ${num('3 – 1', 110, F.bone, '-.03em')}
      ${txt('501 · Double Out · Bis 3 Legs · 23 Min', 14, F.mute)}
    </div>
    ${card(`${lab('Match-Statistik', F.mute, 10, '.14em')}<div style="margin-top:12px">${compareTable(MATCH, [
      ['Average', ['61.2', '54.0'], 'high'],
      ['Erste 9', ['66.7', '58.3'], 'high'],
      ['Bestes Leg (Darts)', ['12', '21'], 'low'],
      ['Checkout-Quote', ['43 %', '17 %'], 'high'],
      ['Checkouts', ['3/7', '1/6'], null],
      ['Triple-Quote', ['14.6 %', '9.8 %'], 'high'],
      ['180', ['1', '0'], 'high'],
      ['140+', ['3', '1'], 'high'],
      ['100+', ['6', '4'], 'high'],
      ['Höchstes Finish', ['170', '40'], 'high'],
      ['Darts', ['96', '102'], null]
    ])}</div>`, { extra: 'margin-top:22px' })}
    ${card(`<div style="display:grid;${LEG_COLS};gap:8px;padding-bottom:10px;border-bottom:1px solid ${F.line1}">${lab('Leg', F.mute, 10, '.12em')}${MATCH.map(([n]) => `<span style="display:flex;justify-content:flex-end">${lab(`Ø ${n}`, F.mute, 10, '.1em')}</span>`).join('')}<span style="display:flex;justify-content:flex-end">${lab('Gewinner', F.mute, 10, '.1em')}</span></div>
      ${[['1', '58.3', '49.0', 0, '15 D · D16'], ['2', '51.0', '60.1', 1, '21 D · D20'], ['3', '70.5', '52.4', 0, '12 D · 170'], ['4', '62.1', '55.8', 0, '18 D · D8']].map(([n, a, b, w, t], i) => `<div style="display:grid;${LEG_COLS};gap:8px;align-items:center;padding:10px 0;${i < 3 ? `border-bottom:1px solid ${F.line}` : ''}"><span style="font:600 18px/1 ${CN};color:${F.mute}">${n}</span><span style="text-align:right;font:600 20px/1 ${CN}">${a}</span><span style="text-align:right;font:600 20px/1 ${CN}">${b}</span><span style="display:flex;justify-content:flex-end;gap:6px;align-items:center;font:500 13px/1 ${B};${n === '3' ? `color:${F.hit}` : ''}">${dot(MATCH[w][1])}${t}</span></div>`).join('')}`, { extra: 'margin-top:10px' })}
    ${heatCard({ title: 'Treffer-Board', players: MATCH.map(who), hits: sampleHits(0.35), focus: 'T20', size: 280, extra: 'margin-top:10px' })}
    <div style="margin-top:14px">${primary('Revanche', 'gleiche Einstellungen')}</div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:8px">${secondary('Wurf zurück', { iconName: 'undo' })}${secondary('Start', { iconName: 'home' })}</div>
    <div style="display:flex;justify-content:center;gap:8px;align-items:center;margin-top:16px">${ic('share', 16, F.mute)}${lab('Match-Bild teilen', F.mute)}</div>`
});

const TRAIN = [['Marcus', F.p[0]], ['Bot leicht', F.p[1]]];
const CHECKOUT_HITS = { D16: 9, D20: 6, S16: 5, T20: 5, D8: 5, S20: 4, S8: 3, T19: 2, S19: 2, S1: 2, DB: 1 };

export const trainingDone = () => phone({
  h: 1240,
  pad: '66px 18px 28px',
  inner: `<div style="display:flex;justify-content:space-between;align-items:center">${lab('Checkout-Training · 10 Ziele')}${lab('Fertig', F.bone)}</div>
    <div style="margin-top:16px;background:${F.hit};color:${F.bg};border-radius:22px;padding:20px 22px">
      ${lab('Neue Bestleistung', 'rgba(15, 22, 19, 0.75)')}
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:10px">${num('8/10', 84, F.bg, '-.03em')}<span style="font:600 24px/1 ${CN}">gecheckt</span></div>
      <div style="font:500 14px/1.3 ${B};margin-top:8px">Vorher 7/10</div>
    </div>
    ${card(`${lab('Ergebnis', F.mute, 10, '.14em')}<div style="margin-top:12px">${compareTable(TRAIN, [['Gecheckt', ['8', '5'], 'high'], ['Bestes Checkout', ['112', '64'], 'high'], ['Versuche', ['10', '10'], null], ['Darts', ['41', '52'], 'low']])}</div>`, { extra: 'margin-top:10px' })}
    ${heatCard({ title: 'Treffer der Sitzung', players: TRAIN.map(who), hits: CHECKOUT_HITS, size: 240, extra: 'margin-top:10px' })}
    ${card(`${lab('Als Bild teilen', F.mute, 10, '.14em')}<div style="margin-top:12px">${segment(TRAIN.map(who), 0, { h: 34, fs: 11 })}</div><div style="margin-top:10px">${secondary('Story-Bild erstellen', { iconName: 'share' })}</div>`, { extra: 'margin-top:10px' })}
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:14px">${bone('Nochmal', { h: 60 })}${secondary('Alle Modi', { h: 60 })}</div>`
});
