// Statistics in the new look, keeping everything today's stats page and profile dashboard show:
// KPIs with L5, average and checkout curves, segment donut, radar, heatmap, records,
// head-to-head, mini-games, training modes.
import { F, CN, B, ic, lab, h1, num, txt, dot, phone, nav, card, segment, board, BOARD_QUIET } from './lib.mjs';
import { lineChart, chartCard, donut, donutLegend, radar, compareTable, heatCard, sampleHits } from './charts.mjs';

const head = ({ tab = 0, online = false, mode = 'Alle X01', tabs = true } = {}) => `
  <div style="display:flex;justify-content:space-between;align-items:center">${h1('Statistik')}<div style="width:180px">${segment(['Offline', 'Online'], online ? 1 : 0, { h: 34, fs: 11 })}</div></div>
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-top:14px">${[['Spieler', `${dot(F.p[0])}Marcus`], ['Modus', mode]].map(([k, v]) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:14px;background:${F.c1}"><div style="display:flex;flex-direction:column;gap:6px">${lab(k, F.mute2, 9, '.14em')}<span style="display:flex;align-items:center;gap:7px;font:500 15px/1 ${B}">${v}</span></div>${ic('down', 16, F.mute)}</div>`).join('')}</div>
  ${tabs ? `<div style="margin-top:10px">${segment(['Überblick', 'Treffer', 'Rekorde'], tab, { h: 38, fs: 12 })}</div>` : ''}`;

const kpi = (label, value, unit, sub, subColor = F.mute2) => card(`${lab(label, F.mute, 10, '.14em')}<div style="margin-top:8px;display:flex;align-items:baseline;gap:3px">${num(value, 40)}${unit ? `<span style="font:600 20px/1 ${CN}">${unit}</span>` : ''}</div><div style="margin-top:6px">${txt(sub, 12, subColor, 600)}</div>`, { r: 18, pad: '12px 14px' });
const grid = (items, cols = 2) => `<div style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:8px">${items.join('')}</div>`;

export const statsOverview = () => phone({
  h: 1040,
  pad: '66px 18px 0',
  inner: `${head({ tab: 0 })}
    <div style="margin-top:12px">${grid([kpi('Siegquote', '64', '%', '9 von 14 Spielen'), kpi('Average', '58.4', '', 'L5 · 61.2', F.ok), kpi('Erste 9', '63.1', '', 'L5 · 65.0', F.ok), kpi('Checkout', '31', '%', 'L5 · 36 %', F.ok), kpi('Darts pro Leg', '25.7', '', 'Ø für 501'), kpi('Triple-Quote', '12.4', '%', 'Trefferrate')])}</div>
    ${chartCard('Average-Verlauf', 'Letzte 20 Spiele', `${lineChart([52.1, 54.3, 53.2, 56.0, 55.1, 57.4, 58.9, 57.6, 60.3, 58.4, 59.1, 57.2, 60.8, 61.5, 59.9, 62.3, 60.1, 61.8, 63.0, 61.2])}<div style="display:flex;justify-content:space-between;margin-top:8px">${txt('Tief 52.1', 11, F.mute2)}${txt('Hoch 63.0', 11, F.mute2)}</div>`, 'margin-top:10px')}
    ${chartCard('Checkout-Verlauf', 'in %', lineChart([25, 33, 20, 40, 29, 38, 33, 44, 30, 36, 42, 31, 50, 38, 33, 40, 45, 36, 41, 36], { min: 0, max: 60, color: F.p[0], H: 80 }), 'margin-top:10px')}
    ${nav('Statistik')}`
});

const SEGMENTS = [['S20', 64, F.hit], ['S1', 26, F.p[1]], ['S5', 24, F.p[0]], ['T20', 21, F.p[2]], ['S19', 18, F.p[3]], ['Rest', 112, 'rgba(237, 230, 211, 0.3)']];

export const statsHits = () => phone({
  h: 1080,
  pad: '66px 18px 0',
  inner: `${head({ tab: 1 })}
    <div style="margin-top:12px">${grid([
      card(`${lab('Segmente', F.mute, 10, '.14em')}<div style="margin-top:12px">${donut(SEGMENTS, { size: 124, stroke: 18 })}</div><div style="margin-top:12px">${donutLegend(SEGMENTS)}</div>`, { r: 18, pad: '12px 12px 14px' }),
      card(`${lab('Radar', F.mute, 10, '.14em')}<div style="margin-top:14px">${radar([['20', 85], ['19', 24], ['18', 11], ['17', 4], ['16', 20], ['15', 2], ['Bull', 8]], { size: 150 })}</div>`, { r: 18, pad: '12px 12px 14px' })
    ])}</div>
    ${heatCard({ title: 'Treffer-Heatmap', hits: sampleHits(), focus: 'T20', size: 300, extra: 'margin-top:10px' })}
    ${nav('Statistik')}`
});

const record = (label, value, sub) => card(`${lab(label, F.mute, 10, '.12em')}<div style="margin-top:8px">${num(value, 32)}</div><div style="margin-top:5px">${txt(sub, 11, F.mute2, 600)}</div>`, { r: 16, pad: '12px 12px 10px' });

export const statsRecords = () => phone({
  h: 1360,
  pad: '66px 18px 0',
  inner: `${head({ tab: 2 })}
    <div style="margin-top:12px">${grid([record('Bestes Leg', '12', 'Darts'), record('Bestes Finish', '170', 'Checkout'), record('Bester Wurf', '180', '3 Darts'), record('180er', '7', 'gesamt'), record('140+', '23', 'gesamt'), record('100+', '61', 'gesamt')], 3)}</div>
    ${card(`<div style="display:flex;justify-content:space-between;align-items:center">${lab('Head-to-Head', F.mute, 10, '.14em')}<span style="display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:10px;background:${F.c2};font:500 13px/1 ${B}">gegen Jonas${ic('down', 14, F.mute)}</span></div>
      <div style="margin-top:12px">${compareTable([['Marcus', F.p[0]], ['Jonas', F.p[1]]], [
        ['Siegquote', ['64 %', '48 %'], 'high'],
        ['Average', ['58.4', '54.0'], 'high'],
        ['Ø Erste 9', ['63.1', '57.9'], 'high'],
        ['Checkout-Quote', ['31 %', '27 %'], 'high'],
        ['Bestes Leg', ['12', '15'], 'low'],
        ['Highest Finish', ['170', '121'], 'high'],
        ['Highest Throw', ['180', '180'], 'high'],
        ['180s', ['7', '3'], 'high'],
        ['140+', ['23', '17'], 'high'],
        ['100+', ['61', '52'], 'high'],
        ['60+', ['140', '151'], 'high']
      ])}</div>`, { extra: 'margin-top:10px' })}
    ${card(`${lab('Mini-Games', F.mute, 10, '.14em')}${[['Power Scoring', '812', 'Ø 640 · 5 Siege'], ['Split Score', '396', 'Ø 301 · 2 Siege'], ['Checkout-Training', '112', '72 % Quote · bestes Finish']].map(([t, v, s], i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;${i < 2 ? `border-bottom:1px solid ${F.line1}` : ''}"><div style="display:flex;flex-direction:column;gap:4px"><span style="font:600 19px/1 ${CN}">${t}</span>${txt(s, 12)}</div>${num(v, 28)}</div>`).join('')}`, { extra: 'margin-top:10px' })}
    ${nav('Statistik')}`
});

export const statsTraining = () => phone({
  pad: '66px 18px 0',
  inner: `${head({ mode: 'Power Scoring', tabs: false })}
    <div style="margin-top:12px">${grid([kpi('Bestpunktzahl', '812', '', 'Power Scoring'), kpi('Ø Punktzahl', '640', '', 'Ø pro Spiel'), kpi('Spiele', '14', '', 'offline'), kpi('Siege', '5', '', 'mit anderen')])}</div>
    ${chartCard('Punkte-Verlauf', 'Letzte 14 Spiele', lineChart([540, 610, 580, 655, 600, 690, 640, 700, 620, 735, 680, 760, 720, 812]), 'margin-top:10px')}
    ${nav('Statistik')}`
});

export const statsEmpty = () => phone({
  pad: '66px 18px 0',
  inner: `${head({ online: true, tabs: false })}
    ${card(`<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:12px 4px">${board({ size: 130, colors: BOARD_QUIET })}<div style="font:600 30px/1 ${CN}">Noch keine Online-Matches</div><div style="padding:14px 22px;border-radius:16px;background:${F.hit};color:${F.bg};font:600 22px/1 ${CN}">Online spielen</div></div>`, { extra: 'margin-top:16px', pad: '22px 18px' })}
    ${nav('Statistik')}`
});
