// Charts for results and statistics: line, donut, radar, comparison table, heatmap card.
import { F, CN, B, lab, num, txt, dot, card, segment, heatBoard, heatLegend } from './lib.mjs';

// Sample hits of a 20-player: mostly the 20 bed, spill into 1 and 5, doubles 16/20/8.
const HITS_20 = { S20: 64, T20: 21, S1: 26, S5: 24, T1: 6, T5: 7, S19: 18, T19: 6, S18: 9, S12: 7, S16: 11, D16: 9, D20: 7, D8: 5, S8: 6, S3: 5, S17: 4, S7: 5, S14: 3, S9: 3, S11: 3, SB: 6, DB: 2, D1: 2, D5: 2, T18: 2, S4: 3, S13: 2, S6: 2, S10: 2, S15: 2, S2: 2 };
export const sampleHits = (scale = 1) =>
  Object.fromEntries(Object.entries(HITS_20).map(([k, v]) => [k, Math.max(1, Math.round(v * scale))]));

export const chartCard = (title, right, body, extra = '') =>
  card(`<div style="display:flex;justify-content:space-between;align-items:center">${lab(title, F.mute, 10, '.14em')}${right ? lab(right, F.mute2, 10, '.14em') : ''}</div><div style="margin-top:12px">${body}</div>`, { extra });

export const lineChart = (vals, { min, max, color = F.hit, H = 90, W = 320 } = {}) => {
  const lo = min ?? Math.floor(Math.min(...vals)) - 2;
  const hi = max ?? Math.ceil(Math.max(...vals)) + 2;
  const pts = vals.map((v, i) => [+((i / (vals.length - 1)) * W).toFixed(1), +(H - ((v - lo) / (hi - lo)) * H).toFixed(1)]);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  const grid = [0.25, 0.5, 0.75].map(f => `<line x1="0" y1="${H * f}" x2="${W}" y2="${H * f}" stroke="rgba(237, 230, 211, 0.08)"></line>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;overflow:visible">${grid}<path d="${path} L${W} ${H} L0 ${H} Z" fill="${color}" fill-opacity="0.12"></path><path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>${pts.slice(0, -1).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}"></circle>`).join('')}<circle cx="${lx}" cy="${ly}" r="5" fill="${color}" stroke="${F.c1}" stroke-width="3"></circle></svg>`;
};

// parts: [name, value, colour]
export const donut = (parts, { size = 132, stroke = 20 } = {}) => {
  const total = parts.reduce((s, p) => s + p[1], 0);
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let off = 0;
  const arcs = parts.map(([, v, c]) => {
    const len = (v / total) * C;
    const arc = `<circle r="${r}" fill="none" stroke="${c}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0, len - 3).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90)"></circle>`;
    off += len;
    return arc;
  }).join('');
  return `<div style="position:relative;width:${size}px;height:${size}px;margin:0 auto"><svg viewBox="${-size / 2} ${-size / 2} ${size} ${size}" width="${size}" height="${size}" style="display:block">${arcs}</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">${num(total, 28)}${lab('Treffer', F.mute, 9)}</div></div>`;
};
export const donutLegend = (parts) => {
  const total = parts.reduce((s, p) => s + p[1], 0);
  return `<div style="display:flex;flex-wrap:wrap;gap:7px 10px;justify-content:center">${parts.map(([n, v, c]) => `<span style="display:flex;align-items:center;gap:5px;font:500 12px/1 ${B};color:${F.bone}">${dot(c)}${n}<span style="color:${F.mute}">${Math.round((v / total) * 100)} %</span></span>`).join('')}</div>`;
};

// axes: [label, value]
export const radar = (axes, { size = 160, color = F.hit } = {}) => {
  const m = Math.max(...axes.map(a => a[1]));
  const r0 = size / 2 - 22;
  const n = axes.length;
  const p = (i, f) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [(Math.cos(a) * r0 * f).toFixed(1), (Math.sin(a) * r0 * f).toFixed(1)]; };
  const ring = (f) => `<polygon points="${axes.map((_, i) => p(i, f).join(',')).join(' ')}" fill="none" stroke="rgba(237, 230, 211, 0.12)"></polygon>`;
  const spokes = axes.map((_, i) => `<line x1="0" y1="0" x2="${p(i, 1)[0]}" y2="${p(i, 1)[1]}" stroke="rgba(237, 230, 211, 0.08)"></line>`).join('');
  const shape = `<polygon points="${axes.map(([, v], i) => p(i, v / m).join(',')).join(' ')}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2" stroke-linejoin="round"></polygon>`;
  const labels = axes.map(([t], i) => { const [x, y] = p(i, 1.24); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="11" font-family="Barlow, sans-serif" font-weight="600" fill="rgba(237, 230, 211, 0.55)">${t}</text>`; }).join('');
  return `<svg viewBox="${-size / 2} ${-size / 2} ${size} ${size}" width="${size}" height="${size}" style="display:block;margin:0 auto;overflow:visible">${[1, 0.66, 0.33].map(ring).join('')}${spokes}${shape}${labels}</svg>`;
};

// players: [name, colour]; rows: [label, values, 'high' | 'low' | null] — a unique best value turns orange.
export const compareTable = (players, rows) => {
  const cols = `minmax(0, 1.3fr) repeat(${players.length}, minmax(0, 1fr))`;
  const head = `<div style="display:grid;grid-template-columns:${cols};gap:8px;padding-bottom:10px;border-bottom:1px solid ${F.line1}"><span></span>${players.map(([n, c]) => `<span style="display:flex;gap:6px;align-items:center;justify-content:flex-end">${dot(c)}${lab(n, F.bone, 10, '.12em')}</span>`).join('')}</div>`;
  const body = rows.map(([label, vals, better], ri) => {
    const nums = vals.map(v => parseFloat(v));
    const best = better === 'high' ? Math.max(...nums) : better === 'low' ? Math.min(...nums) : null;
    const unique = best !== null && nums.filter(x => x === best).length === 1;
    return `<div style="display:grid;grid-template-columns:${cols};gap:8px;align-items:baseline;padding:9px 0;${ri < rows.length - 1 ? `border-bottom:1px solid ${F.line}` : ''}"><span style="font:500 13px/1.2 ${B};color:${F.mute}">${label}</span>${vals.map((v, i) => `<span style="text-align:right;font:600 20px/1 ${CN};font-variant-numeric:tabular-nums;color:${unique && nums[i] === best ? F.hit : F.bone}">${v}</span>`).join('')}</div>`;
  }).join('');
  return head + body;
};

const RING = { T: 'Triple', D: 'Doppel', S: 'Single' };
// Heatmap card: optional player slider, filter slider, tapped-segment detail, board, legend.
export const heatCard = ({ title, hits, players = null, active = 0, filter = 0, focus = '', size = 300, extra = '' }) => {
  const total = Object.values(hits).reduce((s, v) => s + v, 0);
  const detail = focus ? `${RING[focus[0]]} ${focus.slice(1)} · ${hits[focus] || 0} Treffer · ${(((hits[focus] || 0) / total) * 100).toFixed(1)} %` : '';
  return card(`
    <div style="display:flex;justify-content:space-between;align-items:center">${lab(title, F.mute, 10, '.14em')}${txt(`${total} Darts`, 12, F.mute2)}</div>
    ${players ? `<div style="margin-top:12px">${segment(players, active, { h: 34, fs: 11 })}</div>` : ''}
    <div style="margin-top:8px">${segment(['Alle', 'Triples', 'Doppel'], filter, { h: 34, fs: 11 })}</div>
    ${detail ? `<div style="margin:12px auto 0;width:max-content;padding:8px 14px;border-radius:999px;background:${F.c2};font:500 13px/1 ${B}">${detail}</div>` : ''}
    <div style="display:grid;place-items:center;margin-top:12px">${heatBoard({ size, hits, filter: ['all', 'triples', 'doubles'][filter], focus })}</div>
    <div style="margin-top:12px">${heatLegend()}</div>`, { extra });
};
