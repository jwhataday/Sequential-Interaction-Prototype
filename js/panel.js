// Appearance panel: one floating, collapsible tool for tuning how the whole experience looks.
//   Overall  - a palette that recolors all three steps, lighting and atmosphere, page and frame
//   Step 1-3 - every element of each step: fill, texture, SVG asset, opacity, stroke, radius, shadow
// Changes preview live. "Restore defaults" returns to the saved values in
// js/appearance-defaults.js; "Copy settings" copies every component's values.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const saved = Seq.appearanceDefaults || {};
  const frame = document.getElementById('frame');
  const STORE = 'gttf-appearance-v2';
  const COPY_NOTE = 'Apply these values as the prototype’s saved defaults. Retain the panel code for later adjustments. Commit and push the changes.';

  // ---------- Helpers ----------
  const toHex = c => {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    const m = String(c).match(/[\d.]+/g);
    if (!m || m.length < 3) return '#000000';
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('');
  };
  const parseHex = s => {
    let t = String(s).trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(t)) t = t.replace(/./g, x => x + x);
    return /^[0-9a-f]{6}$/.test(t) ? '#' + t : null;
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  // move a color by the same amount another color moved (keeps a family's shades apart)
  const shiftHex = (hex, from, to) => {
    if (from === to) return hex;
    const ch = (x, i) => parseInt(x.slice(1 + i * 2, 3 + i * 2), 16);
    return '#' + [0, 1, 2].map(i => Math.max(0, Math.min(255, ch(hex, i) + ch(to, i) - ch(from, i))).toString(16).padStart(2, '0')).join('');
  };
  const shadowCSS = s => `0 ${(s * 0.35).toFixed(1)}px ${s}px rgba(0,0,0,0.35)`;
  const dropCSS = s => `drop-shadow(0 ${(s * 0.25).toFixed(1)}px ${(s * 0.4).toFixed(1)}px rgba(0,0,0,0.35))`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const button = (cls, text) => { const b = h('button', cls, text); b.type = 'button'; return b; };

  // ---------- Textures: small tiles laid over a component's own shape ----------
  const TEX = {
    grain: [`<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.65'/></filter><rect width='120' height='120' filter='url(#n)'/>`, 120],
    dots: [`<circle cx='4' cy='4' r='1.3' fill='black' fill-opacity='0.35'/>`, 8],
    stripes: [`<path d='M-2 2l4-4M0 8l8-8M6 10l4-4' stroke='black' stroke-opacity='0.3' stroke-width='1.5'/>`, 8],
    crosshatch: [`<path d='M-2 2l4-4M0 8l8-8M6 10l4-4M-2 6l4 4M0 0l8 8M6 -2l4 4' stroke='black' stroke-opacity='0.25' stroke-width='1.2'/>`, 8]
  };
  const TEXTURES = { none: 'None', grain: 'Grain', dots: 'Dots', stripes: 'Stripes', crosshatch: 'Crosshatch' };
  const tileURI = t => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${TEX[t][1]}' height='${TEX[t][1]}'>${TEX[t][0]}</svg>`);
  const texCSS = t => t && t !== 'none' ? `url("${tileURI(t)}")` : '';

  // SVG components get texture and shadow through one generated filter each
  const fxDefs = document.createElementNS(NS, 'svg');
  fxDefs.setAttribute('width', 0); fxDefs.setAttribute('height', 0); fxDefs.setAttribute('aria-hidden', 'true');
  fxDefs.style.position = 'absolute';
  document.body.appendChild(fxDefs);
  function filterFor(c, v) {
    const id = 'fx-' + c.id;
    let f = document.getElementById(id);
    const tex = c.props.includes('texture') && v.texture !== 'none';
    const sh = c.props.includes('shadow') ? v.shadow : 0;
    if (!tex && !sh) { if (f) f.remove(); return ''; }
    if (!f) { f = document.createElementNS(NS, 'filter'); f.id = id; fxDefs.appendChild(f); }
    const box = c.big ? ['0%', '0%', '100%', '100%'] : ['-50%', '-50%', '200%', '200%'];
    ['x', 'y', 'width', 'height'].forEach((k, i) => f.setAttribute(k, box[i]));
    f.setAttribute('color-interpolation-filters', 'sRGB');
    let src = 'SourceGraphic', body = '';
    if (tex) {
      const n = TEX[v.texture][1];
      body += `<feImage href="${tileURI(v.texture)}" x="0" y="0" width="${n}" height="${n}" result="tile"/>`
            + `<feTile in="tile" result="tiled"/><feComposite in="tiled" in2="SourceGraphic" operator="in" result="tex"/>`
            + `<feMerge result="tx"><feMergeNode in="SourceGraphic"/><feMergeNode in="tex"/></feMerge>`;
      src = 'tx';
    }
    if (sh) body += `<feDropShadow in="${src}" dx="0" dy="${(sh * 0.35).toFixed(2)}" stdDeviation="${(sh * 0.5).toFixed(2)}" flood-color="#000" flood-opacity="0.35"/>`;
    f.innerHTML = body;
    return `url(#${id})`;
  }

  // ---------- Hint icons: built-in assets or an uploaded SVG ----------
  const ASSETS = { hand: 'Pointing hand', touch: 'Touch point', arrow: 'Arrow', circle: 'Circle', custom: 'Custom SVG…' };
  function assetMarkup(v, o) {
    const F = o.fill;
    switch (v.asset) {
      case 'touch': return { key: 'touch', viewBox: '0 0 32 32', html:
        `<circle cx="16" cy="16" r="6" fill="${F}" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-opacity="0.5"/>` };
      case 'arrow': return { key: 'arrow', viewBox: '0 0 32 32', html:
        `<path d="M16 27V6M8.5 13.5L16 6l7.5 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` };
      case 'circle': return { key: 'circle', viewBox: '0 0 32 32', html:
        `<circle cx="16" cy="16" r="9" fill="${F}" stroke="currentColor" stroke-width="1.8"/>` };
      case 'custom': if (v.custom) return { key: 'custom:' + v.custom.markup, viewBox: v.custom.viewBox, html: v.custom.markup };
    }
    return { key: 'hand', viewBox: o.viewBox, html: o.html };
  }
  // Read an uploaded .svg, keeping only its drawing (no scripts, styles or outside links).
  async function readSvg(file) {
    const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('That file is not a valid SVG.');
    root.querySelectorAll('script, style, foreignObject, iframe, object, embed, audio, video').forEach(n => n.remove());
    for (const n of root.querySelectorAll('*')) for (const at of [...n.attributes]) {
      const nm = at.name.toLowerCase();
      if (nm.startsWith('on') || ((nm === 'href' || nm === 'xlink:href') && !/^(#|data:image\/)/i.test(at.value.trim()))) n.removeAttribute(at.name);
    }
    let viewBox = root.getAttribute('viewBox');
    if (!viewBox) viewBox = `0 0 ${parseFloat(root.getAttribute('width')) || 32} ${parseFloat(root.getAttribute('height')) || 32}`;
    const ser = new XMLSerializer();
    const markup = [...root.childNodes].map(n => ser.serializeToString(n)).join('').trim();
    return { name: file.name, viewBox, markup };
  }

  // ---------- Element components ----------
  const svg = (id, label, o = {}) => ({ id, label, kind: 'svg', ...o });
  const BIG = { big: true };        // fills the whole scene: no shadow or corner radius
  const html = (id, label, sel, base, apply) => ({ id, label, kind: 'html', sel, base, props: Object.keys(base), apply });

  function pill(id, label, sel, radius) {
    return html(id, label, sel, { fill: '#ffffff', texture: 'none', opacity: 84, stroke: 1, radius, shadow: 0 }, (els, v, d) => {
      for (const el of els) {
        el.style.backgroundColor = d('fill') || d('opacity') ? rgba(v.fill, v.opacity / 100) : '';
        el.style.backgroundImage = texCSS(v.texture);
        el.style.borderWidth = d('stroke') ? v.stroke + 'px' : '';
        el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        el.style.boxShadow = v.shadow ? shadowCSS(v.shadow) : '';
      }
    });
  }
  function icon(id, label, sel) {
    const c = html(id, label, sel, { asset: 'hand', fill: '#ffffff', opacity: 100, stroke: 1.8, shadow: 0 }, (els, v, d) => {
      for (const el of els) {
        const o = el._orig, a = assetMarkup(v, o);
        if (el._asset !== a.key) { el.setAttribute('viewBox', a.viewBox); el.innerHTML = a.html; el._asset = a.key; }
        const op = d('opacity') ? String(v.opacity / 100) : '';
        for (const s of el.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon')) {
          s.style.fill = d('fill') && s.getAttribute('fill') !== 'none' ? v.fill : '';
          s.style.strokeWidth = d('stroke') ? v.stroke + 'px' : '';
          s.style.fillOpacity = op; s.style.strokeOpacity = op;
        }
        el.style.filter = v.shadow ? `${o.filter !== 'none' ? o.filter + ' ' : ''}${dropCSS(v.shadow)}` : '';
      }
    });
    c.icon = true;
    return c;
  }

  const PAGE = [
    html('page', 'Page background', 'body', { fill: '#e6e6e4', texture: 'none' }, ([el], v, d) => {
      el.style.backgroundColor = d('fill') ? v.fill : '';
      el.style.backgroundImage = texCSS(v.texture);
    }),
    html('frame', 'Scene frame', '#frame', { stroke: 1, radius: 6, shadow: 0 }, ([el], v, d) => {
      el.style.outlineWidth = d('stroke') ? v.stroke + 'px' : '';
      el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
      el.style.boxShadow = v.shadow ? shadowCSS(v.shadow) : '';
    }),
    pill('reset', 'Reset button', '#reset', 17)
  ];
  const STEP_COMPS = {
    1: [
      svg('s1-sky', 'Sky', { grad: '#s1-sky', ...BIG }),
      svg('s1-sun', 'Sun'),
      svg('s1-clouds', 'Clouds'),
      svg('s1-hills-far', 'Far hills', BIG),
      svg('s1-hills-near', 'Near hills', BIG),
      svg('s1-ground', 'Ground', BIG),
      svg('s1-wheel-frame', 'Ferris wheel frame'),
      svg('s1-wheel-spokes', 'Ferris wheel spokes'),
      svg('s1-wheel-hub', 'Ferris wheel hub'),
      svg('s1-wheel-cabins', 'Ferris wheel cabins'),
      svg('s1-stage-back', 'Stage backdrop'),
      svg('s1-stage-roof', 'Stage roof and posts'),
      svg('s1-stage-truss', 'Stage truss'),
      svg('s1-stage-deck', 'Stage deck'),
      svg('s1-speakers', 'Speakers'),
      svg('s1-cones', 'Speaker cones'),
      svg('s1-performer', 'Performer'),
      svg('s1-mic', 'Mic stand'),
      svg('s1-tent-left', 'Left tent'),
      svg('s1-tent-right', 'Right tent'),
      svg('s1-tent-doors', 'Tent doors'),
      svg('s1-flags', 'Tent flags'),
      svg('s1-lights-wire', 'String-light wire'),
      svg('s1-bulbs', 'Light bulbs'),
      svg('s1-path', 'Path'),
      svg('s1-path-edges', 'Path edges'),
      svg('s1-path-marks', 'Path pebbles'),
      svg('s1-posts', 'Path posts', { noStroke: true }),
      svg('s1-crowd-back', 'Crowd, back row'),
      svg('s1-crowd-front', 'Crowd, front row'),
      pill('s1-hint', 'Hint pill', '#s1 .hint', 30),
      icon('s1-icon', 'Hint hand icon', '#s1 .hand'),
      html('s1-dots', 'Progress dots and tap ripple', '#s1 .dot', { fill: '#f6c90e', stroke: 2, radius: 8, shadow: 0 }, (els, v, d) => {
        if (d('fill')) frame.style.setProperty('--yellow', v.fill); else frame.style.removeProperty('--yellow');
        for (const el of els) {
          el.style.borderWidth = d('stroke') ? v.stroke + 'px' : '';
          el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
          el.style.boxShadow = v.shadow ? shadowCSS(v.shadow) : '';
        }
      })
    ],
    2: [
      svg('s2-sky', 'Sky', { grad: '#s2-sky', ...BIG }),
      svg('s2-stage-back', 'Stage backdrop'),
      svg('s2-stage-roof', 'Stage roof and posts'),
      svg('s2-stage-truss', 'Stage truss'),
      svg('s2-beams', 'Light beams', { grad: '#s2-beam' }),
      svg('s2-lights', 'Stage lights'),
      svg('s2-speakers', 'Speakers'),
      svg('s2-cones', 'Speaker cones'),
      svg('s2-performer', 'Performer'),
      svg('s2-ground', 'Ground', BIG),
      svg('s2-crowd-far', 'Crowd, far row'),
      svg('s2-crowd-mid', 'Crowd, middle row'),
      svg('s2-crowd-near', 'Crowd, near row'),
      svg('s2-blockers-back', 'Blockers, back pair'),
      svg('s2-blockers-front', 'Blockers, front pair'),
      svg('s2-arms', 'Viewer’s arms'),
      svg('s2-sleeves', 'Viewer’s sleeves'),
      pill('s2-meters', 'Push meter pills', '#s2 .meter', 14),
      icon('s2-icon', 'Meter hand icons', '#s2 .hand'),
      html('s2-bar', 'Meter bars', '#s2 .bar', { fill: '#2b2b2b', opacity: 100, stroke: 2, radius: 3 }, (els, v, d) => {
        const root = document.getElementById('s2');
        if (d('fill')) root.style.setProperty('--bar-fill', v.fill); else root.style.removeProperty('--bar-fill');
        for (const el of els) {
          el.querySelector('.fill').style.opacity = d('opacity') ? v.opacity / 100 : '';
          el.style.borderWidth = d('stroke') ? v.stroke + 'px' : '';
          el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        }
      })
    ],
    3: [
      svg('s3-sky', 'Sky', { grad: '#s3-sky', ...BIG }),
      svg('s3-stage-back', 'Stage backdrop'),
      svg('s3-stage-roof', 'Stage roof and posts'),
      svg('s3-stage-truss', 'Stage truss'),
      svg('s3-beams', 'Light beams', { grad: '#s3-beam' }),
      svg('s3-lights', 'Stage lights'),
      svg('s3-speakers', 'Speakers'),
      svg('s3-cones', 'Speaker cones'),
      svg('s3-performer', 'Performer'),
      svg('s3-smile', 'Performer’s smile'),
      svg('s3-guitar', 'Guitar'),
      svg('s3-mic', 'Mic stand'),
      svg('s3-stage-deck', 'Stage deck'),
      svg('s3-stage-front', 'Stage front'),
      svg('s3-stage-edge', 'Stage edge'),
      svg('s3-ground', 'Ground', BIG),
      svg('s3-barrier', 'Barrier'),
      svg('s3-barrier-ticks', 'Barrier posts'),
      svg('s3-crowd-front-row', 'Crowd at the barrier'),
      svg('s3-crowd-mid', 'Crowd, middle row'),
      svg('s3-crowd-nearest', 'Crowd, nearest heads'),
      svg('s3-blockers-1', 'Gap row, far'),
      svg('s3-blockers-2', 'Gap row, near'),
      svg('s3-hands', 'Viewer’s hands'),
      svg('s3-sleeves', 'Viewer’s sleeves'),
      icon('s3-icon', 'Hint hand icon', '#s3 .hint .hand'),
      html('s3-trail', 'Hint swipe trail', '#s3 .trail', { fill: '#ffffff', opacity: 95, radius: 2 }, (els, v, d) => {
        for (const el of els) {
          el.style.background = d('fill') || d('opacity') ? `linear-gradient(to bottom, ${rgba(v.fill, 0)}, ${rgba(v.fill, v.opacity / 100)})` : '';
          el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        }
      })
    ]
  };
  const ELEMENTS = [...PAGE, ...STEP_COMPS[1], ...STEP_COMPS[2], ...STEP_COMPS[3]];
  const byId = Object.fromEntries(ELEMENTS.map(c => [c.id, c]));

  // ---------- Palette: one color per family of elements, across all three steps ----------
  // Each family color moves every member by the same amount, so their shades stay apart,
  // and it combines with any per-element fill set in the step tabs.
  const ROLES = [
    ['sky', 'Sky', '#cfcfcf', ['s1-sky', 's2-sky', 's3-sky']],
    ['distance', 'Hills and distance', '#b5b5b5', ['s1-hills-far', 's1-hills-near']],
    ['ground', 'Ground and path', '#7a7a7a', ['s1-ground', 's2-ground', 's3-ground', 's1-path', 's1-path-edges', 's1-path-marks']],
    ['stage', 'Stage and barrier', '#8a8a8a', ['s1-stage-back', 's1-stage-roof', 's1-stage-truss', 's1-stage-deck', 's1-speakers', 's1-cones',
      's2-stage-back', 's2-stage-roof', 's2-stage-truss', 's2-speakers', 's2-cones',
      's3-stage-back', 's3-stage-roof', 's3-stage-truss', 's3-speakers', 's3-cones', 's3-stage-deck', 's3-stage-front', 's3-stage-edge', 's3-barrier', 's3-barrier-ticks']],
    ['performer', 'Performer', '#2b2b2b', ['s1-performer', 's1-mic', 's2-performer', 's3-performer', 's3-mic', 's3-guitar']],
    ['crowd', 'Crowd', '#555555', ['s1-crowd-back', 's1-crowd-front', 's2-crowd-far', 's2-crowd-mid', 's2-crowd-near', 's2-blockers-back', 's2-blockers-front',
      's3-crowd-front-row', 's3-crowd-mid', 's3-crowd-nearest', 's3-blockers-1', 's3-blockers-2']],
    ['fairground', 'Fairground', '#555555', ['s1-wheel-frame', 's1-wheel-spokes', 's1-wheel-hub', 's1-wheel-cabins', 's1-tent-left', 's1-tent-right',
      's1-tent-doors', 's1-flags', 's1-lights-wire', 's1-posts']],
    ['lights', 'Sun, clouds and lights', '#ffffff', ['s1-sun', 's1-clouds', 's1-bulbs', 's2-lights', 's3-lights', 's2-beams', 's3-beams']],
    ['viewer', 'Viewer’s arms and hands', '#1f1f1f', ['s2-arms', 's2-sleeves', 's3-hands', 's3-sleeves']],
    ['pills', 'Signifier pills', '#ffffff', ['s1-hint', 's2-meters', 'reset']],
    ['accent', 'Signifier accent', '#f6c90e', ['s1-dots']]
  ];
  const roleOf = {};
  for (const [key, , , ids] of ROLES) for (const id of ids) roleOf[id] = key;
  const palette = {
    id: 'palette', label: 'Palette', kind: 'group',
    hint: 'Each color recolors a family of elements in all three steps.',
    fields: ROLES.map(([key, label, , ids]) => ({ key, label, type: 'color', title: `${ids.length} component${ids.length > 1 ? 's' : ''}` })),
    base: Object.fromEntries(ROLES.map(([key, , base]) => [key, base])),
    apply(keys) {
      const roles = keys || ROLES.map(r => r[0]);
      for (const [key, , , ids] of ROLES) if (roles.includes(key)) for (const id of ids) { applyEl(byId[id]); byId[id].sync?.(); }
    }
  };

  // ---------- Lighting and atmosphere: the whole scene in every step ----------
  const arts = ['#s1 .art', '#s2 .scene', '#s3 .scene'].map(q => document.querySelector(q));
  const atmos = [...document.querySelectorAll('.atmos')];
  const beamStops = [...document.querySelectorAll('#s2-beam stop, #s3-beam stop')]
    .map(el => ({ el, o: parseFloat(el.getAttribute('stop-opacity')) }));
  const lighting = {
    id: 'lighting', label: 'Lighting and atmosphere', kind: 'group',
    fields: [
      { key: 'brightness', label: 'Brightness', type: 'range', min: 50, max: 150, step: 1, unit: '%' },
      { key: 'contrast', label: 'Contrast', type: 'range', min: 50, max: 150, step: 1, unit: '%' },
      { key: 'saturation', label: 'Saturation', type: 'range', min: 0, max: 300, step: 5, unit: '%' },
      { key: 'warmth', label: 'Warmth', type: 'range', min: -100, max: 100, step: 1, unit: '', title: 'Negative is cooler (blue), positive is warmer (amber)' },
      { key: 'haze', label: 'Horizon haze', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'hazeColor', label: 'Haze color', type: 'color' },
      { key: 'beams', label: 'Light beams', type: 'range', min: 0, max: 200, step: 5, unit: '%', title: 'Strength of the stage-light beams in steps 2 and 3' },
      { key: 'vignette', label: 'Vignette', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
    ],
    base: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, haze: 0, hazeColor: '#ffffff', beams: 100, vignette: 0 },
    apply() {
      const v = values.lighting, b = this.base;
      const f = [];
      if (v.brightness !== b.brightness) f.push(`brightness(${v.brightness}%)`);
      if (v.contrast !== b.contrast) f.push(`contrast(${v.contrast}%)`);
      if (v.saturation !== b.saturation) f.push(`saturate(${v.saturation}%)`);
      for (const a of arts) a.style.filter = f.join(' ');
      for (const a of atmos) {
        const [haze, tint, vig] = a.children;
        haze.style.opacity = v.haze ? v.haze / 100 : '';
        haze.style.setProperty('--haze', v.hazeColor);
        tint.style.opacity = v.warmth ? (Math.abs(v.warmth) / 100 * 0.7).toFixed(3) : '';
        tint.style.background = v.warmth > 0 ? '#ff8a2a' : v.warmth < 0 ? '#2a7bff' : '';
        vig.style.opacity = v.vignette ? v.vignette / 100 : '';
      }
      for (const s of beamStops) s.el.style.stopOpacity = v.beams === b.beams ? '' : Math.min(1, s.o * v.beams / 100).toFixed(3);
    }
  };
  const GROUPS = [palette, lighting];

  // ---------- Read each element's original look from the artwork ----------
  const ORDER = ['fill', 'texture', 'asset', 'opacity', 'stroke', 'radius', 'shadow'];
  for (const c of ELEMENTS) {
    if (c.kind === 'html') {
      c.els = [...document.querySelectorAll(c.sel)];
      if (c.icon) for (const el of c.els) {
        const shape = el.querySelector('[fill]');
        el._orig = { viewBox: el.getAttribute('viewBox'), html: el.innerHTML,
                     fill: shape ? shape.getAttribute('fill') : 'none', filter: getComputedStyle(el).filter };
        el._asset = 'hand';
      }
      continue;
    }
    const els = [...document.querySelectorAll(`[data-c="${c.id}"]`)];
    c.info = els.map(el => {
      const cs = getComputedStyle(el), t = el.tagName.toLowerCase();
      const strokePaint = t === 'line' || t === 'polyline' || cs.fill === 'none' ||
                          (t === 'g' && el.hasAttribute('stroke') && !el.hasAttribute('fill'));
      const rects = t === 'rect' ? [el] : [...el.querySelectorAll('rect')];
      for (const r of rects) if (r.dataset.rx0 == null) r.dataset.rx0 = r.getAttribute('rx') ?? '';
      return { el, cs, strokePaint, hasStroke: strokePaint || cs.stroke !== 'none', rects,
               nested: !!el.parentElement.closest(`[data-c="${c.id}"]`) };
    });
    if (c.grad) c.stops = [...document.querySelectorAll(`${c.grad} stop`)].map(el => ({ el, hex: toHex(getComputedStyle(el).stopColor) }));
    const first = c.info[0], stroked = c.info.find(i => i.hasStroke), rect = c.info.flatMap(i => i.rects)[0];
    c.props = ['fill'];
    if (c.info.some(i => !i.strokePaint)) c.props.push('texture');
    c.props.push('opacity');
    if (!c.noStroke && stroked) c.props.push('stroke');
    if (!c.big && rect) c.props.push('radius');
    if (!c.big) c.props.push('shadow');
    c.base = {
      fill: c.grad ? c.stops[0].hex : toHex(first.strokePaint ? first.cs.stroke : first.cs.fill),
      texture: 'none', opacity: 100,
      stroke: stroked ? Math.round(parseFloat(stroked.cs.strokeWidth) * 10) / 10 : 0,
      radius: rect ? parseFloat(rect.getAttribute('rx')) || 0 : 0,
      shadow: 0
    };
    for (const k of Object.keys(c.base)) if (!c.props.includes(k)) delete c.base[k];
    c.apply = (_, v, d) => {
      // a gradient keeps its shape: every stop moves by the same amount as the first
      if (c.grad) for (const st of c.stops) st.el.style.stopColor = d('fill') ? shiftHex(st.hex, c.base.fill, v.fill) : '';
      const fx = filterFor(c, v);
      const op = d('opacity') ? String(v.opacity / 100) : '';
      for (const i of c.info) {
        const el = i.el;
        if (!c.grad) {
          if (i.strokePaint) el.style.stroke = d('fill') ? v.fill : '';
          else el.style.fill = d('fill') ? v.fill : '';
        }
        el.style.fillOpacity = op; el.style.strokeOpacity = op;
        if (c.props.includes('stroke') && i.hasStroke) el.style.strokeWidth = d('stroke') ? v.stroke + 'px' : '';
        if (c.props.includes('radius')) for (const r of i.rects) {
          if (d('radius')) r.setAttribute('rx', v.radius);
          else if (r.dataset.rx0) r.setAttribute('rx', r.dataset.rx0); else r.removeAttribute('rx');
        }
        // a filter can't draw on a perfectly straight line (no area), or twice on one shape
        let ok = !!fx && !i.nested;
        if (ok) { try { const b = el.getBBox(); ok = b.width > 0 && b.height > 0; } catch (e) { ok = false; } }
        el.style.filter = ok ? fx : '';
      }
    };
  }
  // field definitions for each element, with units and ranges
  const LABELS = { fill: 'Fill color', texture: 'Texture', asset: 'SVG asset', opacity: 'Opacity', stroke: 'Stroke width', radius: 'Corner radius', shadow: 'Shadow' };
  for (const c of ELEMENTS) {
    c.props = ORDER.filter(k => c.props.includes(k));
    c.fields = c.props.map(k => {
      const b = c.base[k], f = { key: k, label: LABELS[k] };
      if (k === 'fill') return { ...f, type: 'color' };
      if (k === 'texture') return { ...f, type: 'select', options: TEXTURES };
      if (k === 'asset') return { ...f, type: 'asset', options: ASSETS };
      if (k === 'opacity') return { ...f, type: 'range', min: 0, max: 100, step: 1, unit: '%' };
      if (k === 'stroke') return { ...f, type: 'range', min: 0, max: Math.max(8, Math.ceil(b * 3)), step: b >= 4 ? 0.5 : 0.1, unit: 'px' };
      if (k === 'radius') return { ...f, type: 'range', min: 0, max: Math.max(40, Math.ceil(b * 2)), step: 0.5, unit: 'px' };
      return { ...f, type: 'range', min: 0, max: 24, step: 1, unit: 'px', title: 'Shadow blur' };
    });
  }

  // ---------- Values ----------
  const ALL = [...GROUPS, ...ELEMENTS];
  const defaults = {};
  for (const c of ALL) {
    const d = { ...c.base };
    for (const [k, val] of Object.entries(saved[c.id] || {})) if (k in d || k === 'custom') d[k] = val;
    defaults[c.id] = d;
  }
  const sig = JSON.stringify(saved);
  let values = clone(defaults);
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (s && s.sig === sig) for (const c of ALL) if (s.values[c.id]) values[c.id] = { ...values[c.id], ...s.values[c.id] };
  } catch (e) {}
  let saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify({ sig, values })); } catch (e) {} }, 250);
  }
  // an element's values with its palette family applied
  function effective(c) {
    const v = values[c.id], r = roleOf[c.id];
    return r && 'fill' in v ? { ...v, fill: shiftHex(v.fill, palette.base[r], values.palette[r]) } : v;
  }
  function applyEl(c) {
    const v = effective(c);
    c.apply(c.els, v, k => v[k] !== c.base[k]);
  }
  const changed = c => !same(values[c.id], defaults[c.id]);

  // ---------- Panel ----------
  const panel = h('aside', 'panel');
  panel.setAttribute('aria-label', 'Appearance controls');
  const toggle = button('panel-toggle');
  toggle.innerHTML = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Appearance</span><span class="mod" title="Changed from the saved defaults"></span>';
  const body = h('div', 'panel-body');
  const tabs = h('div', 'panel-tabs'); tabs.setAttribute('role', 'tablist');
  const search = h('input', 'panel-search');
  search.type = 'search'; search.placeholder = 'Find a component…'; search.setAttribute('aria-label', 'Find a component in this tab');
  const scroll = h('div', 'panel-scroll');
  const empty = h('p', 'panel-empty', 'No matching components in this tab.'); empty.hidden = true;
  const actions = h('div', 'panel-actions');
  const restoreBtn = button(null, 'Restore defaults');
  const copyBtn = button('primary', 'Copy settings');
  const status = h('p', 'panel-status'); status.setAttribute('aria-live', 'polite');
  actions.append(restoreBtn, copyBtn);
  body.append(tabs, search, scroll, actions, status);
  panel.append(toggle, body);
  document.body.appendChild(panel);

  const remember = (k, v) => { try { localStorage.setItem(STORE + '-' + k, v); } catch (e) {} };
  const recall = k => { try { return localStorage.getItem(STORE + '-' + k); } catch (e) { return null; } };

  function setCollapsed(on) {
    panel.classList.toggle('collapsed', on);
    toggle.setAttribute('aria-expanded', String(!on));
    remember('collapsed', on ? '1' : '0');
  }
  const c0 = recall('collapsed');
  setCollapsed(c0 != null ? c0 === '1' : innerWidth < 900);
  toggle.addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));

  let statusTimer;
  function say(msg) { status.textContent = msg; clearTimeout(statusTimer); statusTimer = setTimeout(() => { status.textContent = ''; }, 3600); }

  // One row per field: label, control, and an exact value with its unit.
  function buildRow(c, f) {
    const row = h('div', 'row');
    const id = `pf-${c.id}-${f.key}`;
    const label = h('label', 'row-label', f.label); label.htmlFor = id;
    if (f.title) label.title = f.title;
    row.appendChild(label);
    let sync;
    if (f.type === 'color') {
      const pick = h('input'); pick.type = 'color'; pick.id = id;
      row.classList.add('row-color');
      const hex = h('input', 'num hex'); hex.type = 'text'; hex.spellcheck = false; hex.maxLength = 7;
      hex.setAttribute('aria-label', `${f.label} hex value`);
      pick.addEventListener('input', () => set(c, f.key, pick.value));
      hex.addEventListener('change', () => {
        const v = parseHex(hex.value);
        if (v) set(c, f.key, v); else { hex.classList.add('bad'); setTimeout(() => hex.classList.remove('bad'), 900); sync(); }
      });
      row.append(pick, hex);
      sync = () => { pick.value = hex.value = values[c.id][f.key]; };
    } else if (f.type === 'range') {
      const range = h('input'); range.type = 'range'; range.id = id;
      [range.min, range.max, range.step] = [f.min, f.max, f.step];
      const box = h('span', 'num-wrap');
      const num = h('input', 'num'); num.type = 'number';
      [num.min, num.max, num.step] = [f.min, f.max, f.step];
      num.setAttribute('aria-label', `${f.label}${f.unit ? ' in ' + (f.unit === '%' ? 'percent' : f.unit) : ''}`);
      box.append(num, h('span', 'unit', f.unit || ''));
      range.addEventListener('input', () => set(c, f.key, +range.value));
      num.addEventListener('change', () => {
        let v = parseFloat(num.value);
        if (!isFinite(v)) { sync(); return; }
        v = Math.min(f.max, Math.max(f.min, Math.round(v / f.step) * f.step));
        set(c, f.key, +v.toFixed(2));
      });
      row.append(range, box);
      sync = () => { range.value = num.value = values[c.id][f.key]; };
    } else {
      const sel = h('select'); sel.id = id;
      for (const [val, text] of Object.entries(f.options)) { const o = h('option', null, text); o.value = val; sel.appendChild(o); }
      row.classList.add('row-wide');
      row.appendChild(sel);
      if (f.type === 'asset') {
        // uploading a custom SVG for the icon
        const file = h('input'); file.type = 'file'; file.accept = '.svg,image/svg+xml'; file.hidden = true;
        const up = button('mini', 'Upload'); up.title = 'Upload your own .svg';
        up.addEventListener('click', () => file.click());
        file.addEventListener('change', async () => {
          const fl = file.files[0]; file.value = '';
          if (!fl) return;
          try { values[c.id].custom = await readSvg(fl); set(c, 'asset', 'custom'); say(`Using ${fl.name}`); }
          catch (e) { say(e.message || 'Could not read that SVG.'); }
        });
        sel.addEventListener('change', () => {
          if (sel.value === 'custom' && !values[c.id].custom) { file.click(); sel.value = values[c.id].asset; return; }
          set(c, f.key, sel.value);
        });
        row.classList.replace('row-wide', 'row-asset');
        row.append(up, file);
        sync = () => { sel.value = values[c.id].asset; up.textContent = values[c.id].custom ? 'Replace' : 'Upload'; };
      } else {
        sel.addEventListener('change', () => set(c, f.key, sel.value));
        sync = () => { sel.value = values[c.id][f.key]; };
      }
    }
    return { row, sync };
  }

  // An element: a collapsible entry with a color swatch, its fields, and its own reset.
  function buildElement(c) {
    const det = h('details', 'comp');
    det.dataset.name = (c.label + ' ' + c.id).toLowerCase();
    const sum = h('summary');
    const sw = h('span', 'swatch');
    sum.append(sw, h('span', 'comp-name', c.label), h('span', 'mod'));
    sum.lastChild.title = 'Changed from the saved defaults';
    det.appendChild(sum);
    const rows = c.fields.map(f => buildRow(c, f));
    rows.forEach(r => det.appendChild(r.row));
    const foot = h('div', 'comp-foot');
    if (roleOf[c.id]) foot.appendChild(h('span', 'note', `Palette: ${ROLES.find(r => r[0] === roleOf[c.id])[1]}`));
    const rb = button('link', 'Reset'); rb.title = `Reset ${c.label} to its saved default`;
    rb.addEventListener('click', () => resetOne(c));
    foot.appendChild(rb);
    det.appendChild(foot);
    c.sync = () => {
      rows.forEach(r => r.sync());
      if (c.props.includes('fill')) sw.style.background = effective(c).fill; else sw.style.visibility = 'hidden';
      const ch = changed(c);
      det.classList.toggle('changed', ch); rb.disabled = !ch;
    };
    return det;
  }

  // A whole-experience group: an always-visible section of fields.
  function buildGroup(g) {
    const sec = h('details', 'group'); sec.open = true;
    const sum = h('summary');
    sum.append(h('span', 'group-name', g.label), h('span', 'mod'));
    sec.appendChild(sum);
    if (g.hint) sec.appendChild(h('p', 'group-hint', g.hint));
    const rows = g.fields.map(f => {
      const r = buildRow(g, f);
      r.row.dataset.name = (f.label + ' ' + g.label).toLowerCase();
      sec.appendChild(r.row);
      return r;
    });
    const foot = h('div', 'comp-foot');
    const rb = button('link', 'Reset'); rb.title = `Reset ${g.label.toLowerCase()} to the saved defaults`;
    rb.addEventListener('click', () => resetOne(g));
    foot.appendChild(rb);
    sec.appendChild(foot);
    g.rows = rows;
    g.sync = () => {
      rows.forEach(r => r.sync());
      const ch = changed(g);
      sec.classList.toggle('changed', ch); rb.disabled = !ch;
    };
    return sec;
  }

  const STEP_TITLES = { 1: 'Camera push forward', 2: 'Push to the side', 3: 'Push forward' };
  const TABS = [
    { id: 'overall', label: 'Overall', comps: [palette, lighting, ...PAGE] },
    ...[1, 2, 3].map(n => ({ id: 's' + n, label: 'Step ' + n, step: n, comps: STEP_COMPS[n] }))
  ];
  for (const t of TABS) {
    const tb = button('tab', t.label); tb.setAttribute('role', 'tab'); tb.id = 'ptab-' + t.id;
    tb.appendChild(h('span', 'mod'));
    const pane = h('div', 'tab-pane'); pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', tb.id);
    if (t.step) {
      const head = h('div', 'step-head');
      head.appendChild(h('span', 'step-title', STEP_TITLES[t.step]));
      const show = button('mini', 'Show this step');
      show.title = 'Jump the prototype to this step so you can see its elements';
      show.addEventListener('click', () => {
        if (Seq.sequence.jump(t.step)) say(`Showing step ${t.step}.`); else say('Wait for the current move to finish, then try again.');
        updateShowButtons();
      });
      head.appendChild(show);
      t.show = show;
      pane.appendChild(head);
    } else {
      pane.appendChild(buildGroup(palette));
      pane.appendChild(buildGroup(lighting));
      const sub = h('details', 'group'); sub.open = true;
      sub.appendChild(h('summary', null, 'Page and frame'));
      pane.appendChild(sub);
      t.pageSection = sub;
    }
    for (const c of t.step ? t.comps : PAGE) (t.pageSection || pane).appendChild(buildElement(c));
    tb.addEventListener('click', () => selectTab(t.id));
    tabs.appendChild(tb); scroll.appendChild(pane);
    t.tab = tb; t.pane = pane;
  }
  // arrow keys move between tabs
  tabs.addEventListener('keydown', e => {
    const i = TABS.findIndex(t => t.tab === document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    selectTab(n.id); n.tab.focus(); e.preventDefault();
  });
  let active = TABS.some(t => t.id === recall('tab')) ? recall('tab') : 'overall';
  function selectTab(id) {
    active = id;
    for (const t of TABS) {
      const on = t.id === id;
      t.tab.setAttribute('aria-selected', String(on)); t.tab.tabIndex = on ? 0 : -1;
      t.pane.hidden = !on;
    }
    remember('tab', id);
    filter();
  }
  function updateShowButtons() {
    const cur = Seq.sequence.current();
    for (const t of TABS) if (t.show) { t.show.disabled = cur === t.step; t.show.textContent = cur === t.step ? 'On screen' : 'Show this step'; }
  }
  new MutationObserver(updateShowButtons).observe(frame, { attributes: true, attributeFilter: ['data-stage'] });

  // Find: hide components (and whole-experience rows) that don't match, in the open tab.
  function filter() {
    const q = search.value.trim().toLowerCase();
    const t = TABS.find(x => x.id === active);
    let shown = 0;
    for (const el of t.pane.querySelectorAll('details.comp, details.group > .row')) {
      const hit = !q || el.dataset.name.includes(q);
      el.hidden = !hit; if (hit) shown++;
      if (q && hit && el.matches('details.comp')) el.open = true;
    }
    for (const g of t.pane.querySelectorAll('details.group')) g.hidden = !!q && !g.querySelector('.row:not([hidden]), details.comp:not([hidden])');
    empty.hidden = shown > 0;
  }
  search.addEventListener('input', filter);
  scroll.appendChild(empty);

  function refreshMarks() {
    let any = false;
    for (const t of TABS) {
      const ch = t.comps.some(changed);
      t.tab.classList.toggle('changed', ch); any = any || ch;
    }
    toggle.classList.toggle('changed', any);
  }

  function set(c, k, val) {
    values[c.id][k] = val;
    if (c === palette) palette.apply([k]);
    else if (c === lighting) lighting.apply();
    else applyEl(c);
    c.sync(); refreshMarks(); persist();
  }
  function resetOne(c) {
    values[c.id] = clone(defaults[c.id]);
    if (c === palette) palette.apply(); else if (c === lighting) lighting.apply(); else applyEl(c);
    c.sync(); refreshMarks(); persist();
    say(`${c.label} reset.`);
  }

  restoreBtn.addEventListener('click', () => {
    values = clone(defaults);
    lighting.apply();
    for (const c of ELEMENTS) { applyEl(c); c.sync(); }
    for (const g of GROUPS) g.sync();
    refreshMarks();
    try { localStorage.removeItem(STORE); } catch (e) {}
    say('Restored the saved defaults.');
  });

  // ---------- Copy settings ----------
  const fmt = (f, x) => f.type === 'range' ? `${+(+x).toFixed(2)}${f.unit || ''}` : String(x);
  function settingsText() {
    const lines = ['Getting to the Front — appearance settings', ''];
    const customs = [];
    for (const t of TABS) {
      lines.push(t.step ? `${t.label} · ${STEP_TITLES[t.step]}` : 'Overall');
      for (const c of t.comps) {
        const v = values[c.id];
        lines.push(`- ${c.label} [${c.id}]: ` + c.fields.map(f => `${f.label.toLowerCase()} ${fmt(f, v[f.key])}`).join(', '));
        if (v.asset === 'custom' && v.custom) customs.push(`[${c.id}] ${v.custom.name}, viewBox "${v.custom.viewBox}":\n${v.custom.markup}`);
      }
      lines.push('');
    }
    if (customs.length) lines.push('Custom SVG assets', ...customs, '');
    lines.push(COPY_NOTE);
    return lines.join('\n');
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try {
      const ta = h('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (ok) return true;
    } catch (e) {}
    return false;
  }
  copyBtn.addEventListener('click', async () => {
    const t = settingsText();
    body.querySelector('.copy-fallback')?.remove();
    if (await copyText(t)) { say('Copied all settings to the clipboard.'); return; }
    // clipboard blocked: show the text so it can be copied by hand
    const ta = h('textarea', 'copy-fallback'); ta.value = t; ta.readOnly = true;
    ta.setAttribute('aria-label', 'Settings to copy');
    body.insertBefore(ta, status); ta.focus(); ta.select();
    say('Copying was blocked here. Select the text above and copy it.');
  });

  // ---------- Start ----------
  lighting.apply();
  for (const c of ELEMENTS) { applyEl(c); c.sync(); }
  for (const g of GROUPS) g.sync();
  refreshMarks();
  selectTab(active);
  updateShowButtons();
})();
