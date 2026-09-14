// Shared tokens and building blocks for the provisional redesign canvas.
// Values lifted from redesign/new_design ("Dartcounter Pro"), adjusted by the
// decisions of 14 Sept 2026 (weight 600, player dots, Double/Triple toggles).

export const F = {
  bg: '#0F1613', c0: '#141D19', c1: '#17211C', c2: '#1F2B25',
  bone: '#EDE6D3', mute: 'rgba(237, 230, 211, 0.55)', mute2: 'rgba(237, 230, 211, 0.4)',
  line: 'rgba(237, 230, 211, 0.07)', line1: 'rgba(237, 230, 211, 0.1)', line2: 'rgba(237, 230, 211, 0.25)',
  hit: '#FF6A3D', ok: '#63C48A', bad: '#E0564B', badFill: '#C4372E',
  p: ['#7FB8E8', '#E8C46B', '#6FCFC4', '#D98FC6'],
  paper: '#E7E4DC', ink: '#1C1B18', inkSoft: '#5E5A52'
};
export const CN = "'Barlow Condensed', 'Arial Narrow', sans-serif";
export const B = "'Barlow', system-ui, sans-serif";

const P = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"></path>',
  target: '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle><circle cx="12" cy="12" r="1"></circle>',
  globe: '<circle cx="12" cy="12" r="8.5"></circle><path d="M3.5 12h17"></path><path d="M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5s1.2-5.9 3.7-8.5z"></path>',
  bars: '<path d="M6 20v-7"></path><path d="M12 20V5"></path><path d="M18 20v-10"></path>',
  user: '<circle cx="12" cy="8.5" r="3.8"></circle><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"></path>',
  chart: '<path d="M4 19h16"></path><path d="M5 15l4-4 3 3 7-7"></path>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"></path><path d="M15.5 9a4 4 0 0 1 0 6"></path><path d="M18 6.5a7.5 7.5 0 0 1 0 11"></path>',
  close: '<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>',
  chev: '<path d="m9 5 7 7-7 7"></path>',
  back: '<path d="m15 5-7 7 7 7"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  minus: '<path d="M5 12h14"></path>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"></path>',
  bot: '<rect x="5" y="8" width="14" height="11" rx="3"></rect><path d="M12 4v4"></path><circle cx="9.5" cy="13.5" r="1"></circle><circle cx="14.5" cy="13.5" r="1"></circle>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"></path>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M5 15V6a1 1 0 0 1 1-1h9"></path>',
  share: '<path d="M12 4v11"></path><path d="m7.5 8.5 4.5-4.5 4.5 4.5"></path><path d="M5 13v6h14v-6"></path>',
  play: '<path d="M8 5.5v13l10.5-6.5z"></path>',
  undo: '<path d="M9 7 4.5 11.5 9 16"></path><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"></path>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
  nowifi: '<path d="M4 9a12 12 0 0 1 16 0"></path><path d="M7.5 12.5a7 7 0 0 1 9 0"></path><circle cx="12" cy="16.5" r="1"></circle><path d="M4 4l16 16"></path>',
  down: '<path d="m6 9 6 6 6-6"></path>',
  shuffle: '<path d="M4 7h3l10 10h3"></path><path d="M4 17h3l3-3"></path><path d="M14 10l3-3h3"></path><path d="m18 5 2 2-2 2"></path><path d="m18 15 2 2-2 2"></path>'
};

export const ic = (name, s = 20, c = F.bone, w = 1.8) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0">${P[name]}</svg>`;

// ── Type ────────────────────────────────────────────────────────────────────
export const lab = (t, c = F.mute, s = 11, ls = '.16em') =>
  `<span style="font:600 ${s}px/1 ${B};letter-spacing:${ls};text-transform:uppercase;color:${c};white-space:nowrap">${t}</span>`;
export const h1 = (t, s = 40, c = F.bone) =>
  `<div style="font:600 ${s}px/1 ${CN};letter-spacing:-.02em;color:${c}">${t}</div>`;
export const num = (t, s, c = F.bone, ls = '-.03em') =>
  `<span style="font:600 ${s}px/.9 ${CN};letter-spacing:${ls};font-variant-numeric:tabular-nums;color:${c}">${t}</span>`;
export const txt = (t, s = 13, c = F.mute, w = 400) =>
  `<span style="font:${w} ${s}px/1.4 ${B};color:${c}">${t}</span>`;
export const dot = (c, s = 8) => `<span style="width:${s}px;height:${s}px;border-radius:50%;background:${c};flex-shrink:0;display:inline-block"></span>`;

// ── Frames ──────────────────────────────────────────────────────────────────
export const phone = ({ inner, h = 874, w = 402, pad = '62px 16px 0', overlay = '', bg = F.bg }) =>
  `<div style="width:${w}px;height:${h}px;border-radius:40px;overflow:hidden;position:relative;background:${bg};box-shadow:0 24px 60px rgba(28, 27, 24, 0.28)">
  <div style="height:100%;box-sizing:border-box;padding:${pad};display:flex;flex-direction:column;color:${F.bone};font-family:${B}">${inner}</div>
  ${overlay}
</div>`;

const NAV = [['Start', 'home'], ['Spielen', 'target'], ['Online', 'globe'], ['Statistik', 'bars'], ['Profil', 'user']];
export const nav = (active) =>
  `<div style="margin-top:auto;padding:12px 4px 14px"><div style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));height:64px;background:${F.c1};border:1px solid ${F.line1};border-radius:24px;padding:5px;box-sizing:border-box;box-shadow:0 12px 30px rgba(0, 0, 0, 0.35)">${NAV.map(([l, i]) => {
    const on = l === active;
    return `<div style="border-radius:19px;background:${on ? F.bone : 'transparent'};color:${on ? F.bg : F.mute};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:600 10px/1 ${B};letter-spacing:.08em;text-transform:uppercase">${ic(i, 18, on ? F.bg : F.mute)}${l}</div>`;
  }).join('')}</div></div>`;

// ── Surfaces & controls ─────────────────────────────────────────────────────
export const card = (inner, { bg = F.c1, r = 22, pad = '16px 18px', border = 'none', extra = '' } = {}) =>
  `<div style="background:${bg};border-radius:${r}px;padding:${pad};border:${border};box-sizing:border-box;${extra}">${inner}</div>`;

export const primary = (t, sub = '', { disabled = false, h = 64 } = {}) =>
  `<div style="height:${h}px;border-radius:20px;background:${disabled ? 'rgba(255, 106, 61, 0.3)' : F.hit};color:${disabled ? 'rgba(15, 22, 19, 0.6)' : F.bg};display:flex;align-items:center;justify-content:space-between;padding:0 22px;box-sizing:border-box;gap:12px"><span style="font:600 26px/1 ${CN}">${t}</span>${sub ? lab(sub, disabled ? 'rgba(15, 22, 19, 0.55)' : 'rgba(15, 22, 19, 0.7)', 11, '.12em') : ''}</div>`;
export const secondary = (t, { h = 56, iconName = '' } = {}) =>
  `<div style="height:${h}px;border-radius:18px;border:1px solid ${F.line2};display:flex;align-items:center;justify-content:center;gap:8px;font:600 22px/1 ${CN};color:${F.bone};box-sizing:border-box">${iconName ? ic(iconName, 18) : ''}${t}</div>`;
export const bone = (t, { h = 56 } = {}) =>
  `<div style="height:${h}px;border-radius:18px;background:${F.bone};color:${F.bg};display:flex;align-items:center;justify-content:center;font:600 22px/1 ${CN};box-sizing:border-box">${t}</div>`;
export const destructive = (t, { h = 56, filled = false } = {}) =>
  `<div style="height:${h}px;border-radius:18px;${filled ? `background:${F.badFill};color:${F.bone}` : `border:1.5px solid ${F.bad};color:${F.bad}`};display:flex;align-items:center;justify-content:center;font:600 22px/1 ${CN};box-sizing:border-box">${t}</div>`;

// Exactly-one choice: a track with a thumb that slides to the picked option.
// Radios drive it (CSS in build.mjs `SLIDER_CSS`), so tapping animates it.
let sliderId = 0;
const SLIDER = {
  pill: { p: 4, g: 4, track: `background:${F.c1};border-radius:999px`, thumb: `background:${F.bone};border-radius:999px`, on: F.bg, off: F.mute, font: (fs) => `font:600 ${fs}px/1 ${B};letter-spacing:.06em;text-transform:uppercase` },
  tiles: { p: 4, g: 4, track: `background:${F.c1};border-radius:18px;border:1px solid ${F.line}`, thumb: `background:${F.bone};border-radius:14px`, on: F.bg, off: F.bone, font: (fs) => `font:600 ${fs}px/1 ${CN};font-variant-numeric:tabular-nums` },
  chips: { p: 3, g: 2, track: `background:${F.c1};border-radius:999px;display:inline-grid`, thumb: `background:${F.c2};border:1px solid ${F.line2};border-radius:999px;box-sizing:border-box`, on: F.bone, off: F.mute, font: (fs) => `font:600 ${fs}px/1 ${B};letter-spacing:.08em;text-transform:uppercase;padding:0 14px` }
};
// The picked state is written inline, so it reads right even where the tap
// styles don't apply; once a radio is checked, the CSS takes over and animates.
export const slider = (opts, active, { kind = 'pill', h = 44, fs = 13, demo = false } = {}) => {
  const k = SLIDER[kind];
  const id = `sl${++sliderId}`;
  const n = opts.length;
  const thumb = `position:absolute;z-index:0;top:${k.p}px;bottom:${k.p}px;left:${k.p}px;width:calc((100% - ${2 * k.p}px - ${(n - 1) * k.g}px) / ${n});transform:translateX(calc(${active} * (100% + ${k.g}px)));${k.thumb}`;
  return `<div class="sl${demo ? ' sl-demo' : ''}" style="position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0, 1fr);box-sizing:border-box;--g:${k.g}px;--on:${k.on};--off:${k.off};padding:${k.p}px;gap:${k.g}px;${k.track}"><span class="sl-t" style="${thumb}"></span>${opts.map((o, i) =>
    `<input type="radio" name="${id}" id="${id}-${i}"${i === active && !demo ? ' checked' : ''} style="position:absolute;opacity:0;width:0;height:0;margin:0;pointer-events:none"><label for="${id}-${i}" style="position:relative;z-index:1;display:grid;place-items:center;white-space:nowrap;cursor:pointer;height:${h}px;color:${i === active ? k.on : k.off};${k.font(fs)}">${o}</label>`).join('')}</div>`;
};

export const segment = (opts, active, { h = 44, fs = 13, demo = false } = {}) => slider(opts, active, { kind: 'pill', h, fs, demo });
export const choices = (opts, active, { h = 60, fs = 28 } = {}) => slider(opts, active, { kind: 'tiles', h: h - 10, fs });
export const chips = (opts, active) => `<div>${slider(opts, active, { kind: 'chips', h: 32, fs: 12 })}</div>`;

export const toggle = (on) =>
  `<div style="width:52px;height:32px;border-radius:999px;background:${on ? F.bone : F.c2};position:relative;flex-shrink:0"><div style="position:absolute;top:4px;${on ? 'right:4px' : 'left:4px'};width:24px;height:24px;border-radius:50%;background:${on ? F.bg : F.mute2}"></div></div>`;

export const stepper = (label, value, hint) => card(`
    <div style="display:flex;justify-content:space-between">${lab(label)}${lab(hint, F.mute2)}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
      <div style="width:44px;height:44px;border-radius:50%;background:${F.c2};display:grid;place-items:center">${ic('minus', 18)}</div>
      ${num(value, 48)}
      <div style="width:44px;height:44px;border-radius:50%;background:${F.c2};display:grid;place-items:center">${ic('plus', 18)}</div>
    </div>`, { r: 18, pad: '14px 14px 12px' });

export const row = (left, right, { pad = '14px 0', border = true } = {}) =>
  `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:${pad};${border ? `border-bottom:1px solid ${F.line1}` : ''}">${left}${right}</div>`;

export const avatar = (letter, color, s = 40) =>
  `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${F.c2};border:2px solid ${color};display:grid;place-items:center;font:600 ${Math.round(s * 0.42)}px/1 ${CN};color:${F.bone};box-sizing:border-box;flex-shrink:0">${letter}</div>`;

export const playerRow = ({ name, sub, color, tag = '', tagColor = F.mute, bot = false }) =>
  `<div style="display:flex;align-items:center;gap:12px;background:${F.c1};border-radius:16px;padding:10px 14px">
    ${bot ? `<div style="width:40px;height:40px;border-radius:50%;background:${F.c2};border:2px solid ${color};display:grid;place-items:center;box-sizing:border-box">${ic('bot', 18)}</div>` : avatar(name[0], color)}
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">${txt(name, 16, F.bone, 500)}${txt(sub, 12)}</div>
    ${tag ? lab(tag, tagColor) : ''}
    ${ic('close', 16, F.mute2)}
  </div>`;

export const dim = (inner, { align = 'flex-end', pad = '0' } = {}) =>
  `<div style="position:absolute;inset:0;background:rgba(15, 22, 19, 0.72);display:flex;flex-direction:column;justify-content:${align};padding:${pad};box-sizing:border-box">${inner}</div>`;

export const sheet = (inner, { h = 560 } = {}) =>
  `<div style="height:${h}px;background:${F.c1};border-radius:28px 28px 0 0;border-top:1px solid ${F.line1};padding:10px 18px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;color:${F.bone};font-family:${B}">
    <div style="width:40px;height:5px;border-radius:999px;background:${F.line2};margin:0 auto 4px"></div>${inner}</div>`;

export const dialog = (inner) =>
  `<div style="margin:0 20px;background:${F.c1};border-radius:26px;border:1px solid ${F.line1};padding:24px 22px;display:flex;flex-direction:column;gap:12px;color:${F.bone};font-family:${B};box-shadow:0 30px 60px rgba(0, 0, 0, 0.5)">${inner}</div>`;

// ── Dartboard ───────────────────────────────────────────────────────────────
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const R = { bi: 6.35, bo: 15.9, ti: 99, to: 107, di: 162, do: 170 };
const pt = (r, a) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`; };
const sec = (r1, r2, a0, a1) => `M ${pt(r2, a0)} A ${r2} ${r2} 0 0 1 ${pt(r2, a1)} L ${pt(r1, a1)} A ${r1} ${r1} 0 0 0 ${pt(r1, a0)} Z`;
const ang = (n) => -90 + ORDER.indexOf(n) * 18;
const area = (key) => {
  if (key === 'DB') return `M ${R.bi} 0 A ${R.bi} ${R.bi} 0 1 1 -${R.bi} 0 A ${R.bi} ${R.bi} 0 1 1 ${R.bi} 0 Z`;
  const ring = key[0]; const n = Number(key.slice(1)); const c = ang(n);
  // S = outer single, I = inner single
  const [r1, r2] = ring === 'T' ? [R.ti, R.to] : ring === 'D' ? [R.di, R.do] : ring === 'I' ? [R.bo, R.ti] : [R.to, R.di];
  return sec(r1, r2, c - 9, c + 9);
};

export const BOARD_HERO = { light: '#7C786E', dark: '#1B2520', ringA: '#7A2E29', ringB: '#1F5C3E' };
export const BOARD_CLASSIC = { light: '#E8E1CE', dark: '#151D19', ringA: '#B23A33', ringB: '#2E7D55' };
export const BOARD_QUIET = { light: '#3A4640', dark: '#1A241F', ringA: '#4A5650', ringB: '#2C3833' };

export const board = ({ size, colors = BOARD_CLASSIC, heat = {}, numbers = false, overlay = '' }) => {
  let s = '';
  ORDER.forEach((n, i) => {
    const c = ang(n); const even = i % 2 === 0;
    s += `<path d="${sec(R.bo, R.ti, c - 9, c + 9)} ${sec(R.to, R.di, c - 9, c + 9)}" fill="${even ? colors.dark : colors.light}"></path>`;
    s += `<path d="${sec(R.ti, R.to, c - 9, c + 9)} ${sec(R.di, R.do, c - 9, c + 9)}" fill="${even ? colors.ringA : colors.ringB}"></path>`;
  });
  s += `<circle r="${R.bo}" fill="${colors.ringB}"></circle><circle r="${R.bi}" fill="${colors.ringA}"></circle>`;
  for (const [key, op] of Object.entries(heat)) s += `<path d="${area(key)}" fill="${F.hit}" fill-opacity="${op}"></path>`;
  if (numbers) ORDER.forEach(n => { const c = ang(n); const [x, y] = pt(182, c).split(' '); s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="15" font-family="Barlow, sans-serif" font-weight="600" fill="rgba(237, 230, 211, 0.55)">${n}</text>`; });
  return `<svg viewBox="${numbers ? '-200 -200 400 400' : '-172 -172 344 344'}" width="${size}" height="${size}" style="display:block;overflow:visible">${s}${overlay}</svg>`;
};
export const hitPath = (key, color, extra = '') => `<path d="${area(key)}" fill="${color}" ${extra}></path>`;

// Heatmap in the board's shape (today's DartboardHeatmap): each segment tinted
// by its share of the hottest visible one. filter: all | triples | doubles.
export const heatBoard = ({ size, hits, filter = 'all', focus = '' }) => {
  const shown = (key) => filter === 'all' || (filter === 'triples' ? key[0] === 'T' : key[0] === 'D' || key === 'SB');
  const valueOf = (key) => (key[0] === 'I' ? hits[`S${key.slice(1)}`] : hits[key]) || 0;
  const keys = ORDER.flatMap(n => [`D${n}`, `S${n}`, `T${n}`, `I${n}`]);
  const max = Math.max(1, ...[...keys, 'SB', 'DB'].filter(shown).map(valueOf));
  const fill = (key) => {
    if (!shown(key)) return 'rgba(237, 230, 211, 0.02)';
    const v = valueOf(key);
    return v ? `rgba(255, 106, 61, ${(0.16 + (0.84 * v) / max).toFixed(2)})` : 'rgba(237, 230, 211, 0.05)';
  };
  const edge = `stroke="${F.bg}" stroke-width="1.4"`;
  let s = `<circle r="${R.do + 3}" fill="${F.c0}"></circle>`;
  keys.forEach(k => { s += `<path d="${area(k)}" fill="${fill(k)}" ${edge}></path>`; });
  s += `<circle r="${R.bo}" fill="${F.c0}"></circle><circle r="${R.bo}" fill="${fill('SB')}" ${edge}></circle><circle r="${R.bi}" fill="${F.c0}"></circle><circle r="${R.bi}" fill="${fill('DB')}" ${edge}></circle>`;
  if (focus) s += `<path d="${area(focus)}" fill="none" stroke="${F.bone}" stroke-width="3" stroke-linejoin="round"></path>`;
  ORDER.forEach(n => { const [x, y] = pt(186, ang(n)).split(' '); s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" font-family="Barlow, sans-serif" font-weight="600" fill="rgba(237, 230, 211, 0.55)">${n}</text>`; });
  return `<svg viewBox="-200 -200 400 400" width="${size}" height="${size}" style="display:block">${s}</svg>`;
};
export const heatLegend = () =>
  `<div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap">${[['Keine', 'rgba(237, 230, 211, 0.12)'], ['Niedrig', 'rgba(255, 106, 61, 0.3)'], ['Mittel', 'rgba(255, 106, 61, 0.6)'], ['Hotspot', F.hit]].map(([t, c]) => `<span style="display:flex;align-items:center;gap:6px;font:500 12px/1 ${B};color:${F.mute}"><span style="width:10px;height:10px;border-radius:50%;background:${c}"></span>${t}</span>`).join('')}</div>`;
