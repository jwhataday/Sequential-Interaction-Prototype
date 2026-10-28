// Appearance panel: a floating, collapsible control panel on the left for tuning how every
// element of each step looks. Changes apply live. "Restore defaults" returns to the saved
// values in js/appearance-defaults.js; "Copy settings" copies every component's values.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const saved = Seq.appearanceDefaults || {};
  const frame = document.getElementById('frame');
  const STORE = 'gttf-appearance-v1';
  const COPY_NOTE = 'Apply these values as the prototype’s saved defaults. Retain the panel code for later adjustments. Commit and push the changes.';

  // ---------- Helpers ----------
  const toHex = c => {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    const m = String(c).match(/[\d.]+/g);
    if (!m || m.length < 3) return '#000000';
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('');
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const shiftHex = (hex, from, to) => {
    const ch = (x, i) => parseInt(x.slice(1 + i * 2, 3 + i * 2), 16);
    return '#' + [0, 1, 2].map(i => Math.max(0, Math.min(255, ch(hex, i) + ch(to, i) - ch(from, i))).toString(16).padStart(2, '0')).join('');
  };
  const shadowCSS = s => `0 ${(s * 0.35).toFixed(1)}px ${s}px rgba(0,0,0,0.35)`;
  const dropCSS = s => `drop-shadow(0 ${(s * 0.25).toFixed(1)}px ${(s * 0.4).toFixed(1)}px rgba(0,0,0,0.35))`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------- Textures: small tiles laid over a component's own shape ----------
  const TEX = {
    grain: [`<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.65'/></filter><rect width='120' height='120' filter='url(#n)'/>`, 120],
    dots: [`<circle cx='4' cy='4' r='1.3' fill='black' fill-opacity='0.35'/>`, 8],
    stripes: [`<path d='M-2 2l4-4M0 8l8-8M6 10l4-4' stroke='black' stroke-opacity='0.3' stroke-width='1.5'/>`, 8],
    crosshatch: [`<path d='M-2 2l4-4M0 8l8-8M6 10l4-4M-2 6l4 4M0 0l8 8M6 -2l4 4' stroke='black' stroke-opacity='0.25' stroke-width='1.2'/>`, 8]
  };
  const TEXTURES = ['none', ...Object.keys(TEX)];
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

  // ---------- Components ----------
  const svg = (id, label, o = {}) => ({ id, label, kind: 'svg', ...o });
  const BIG = { big: true };        // fills the whole scene: no shadow or corner radius
  const html = (id, label, sel, base, apply) => ({ id, label, kind: 'html', sel, base, props: Object.keys(base), apply });

  function pill(id, label, sel, radius) {
    return html(id, label, sel, { fill: '#ffffff', texture: 'none', opacity: 0.84, stroke: 1, radius, shadow: 0 }, (els, v, d) => {
      for (const el of els) {
        el.style.backgroundColor = d('fill') || d('opacity') ? rgba(v.fill, v.opacity) : '';
        el.style.backgroundImage = texCSS(v.texture);
        el.style.borderWidth = d('stroke') ? v.stroke + 'px' : '';
        el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        el.style.boxShadow = v.shadow ? shadowCSS(v.shadow) : '';
      }
    });
  }
  function icon(id, label, sel) {
    const c = html(id, label, sel, { asset: 'hand', fill: '#ffffff', opacity: 1, stroke: 1.8, shadow: 0 }, (els, v, d) => {
      for (const el of els) {
        const o = el._orig, a = assetMarkup(v, o);
        if (el._asset !== a.key) { el.setAttribute('viewBox', a.viewBox); el.innerHTML = a.html; el._asset = a.key; }
        const op = d('opacity') ? String(v.opacity) : '';
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

  const STEPS = [
    { label: 'Shared', comps: [
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
    ] },
    { label: 'Step 1 · Camera push forward', comps: [
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
    ] },
    { label: 'Step 2 · Push to the side', comps: [
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
      html('s2-bar', 'Meter bars', '#s2 .bar', { fill: '#2b2b2b', opacity: 1, stroke: 2, radius: 3 }, (els, v, d) => {
        const root = document.getElementById('s2');
        if (d('fill')) root.style.setProperty('--bar-fill', v.fill); else root.style.removeProperty('--bar-fill');
        for (const el of els) {
          el.querySelector('.fill').style.opacity = d('opacity') ? v.opacity : '';
          el.style.borderWidth = d('stroke') ? v.stroke + 'px' : '';
          el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        }
      })
    ] },
    { label: 'Step 3 · Push forward', comps: [
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
      html('s3-trail', 'Hint swipe trail', '#s3 .trail', { fill: '#ffffff', opacity: 0.95, radius: 2 }, (els, v, d) => {
        for (const el of els) {
          el.style.background = d('fill') || d('opacity') ? `linear-gradient(to bottom, ${rgba(v.fill, 0)}, ${rgba(v.fill, v.opacity)})` : '';
          el.style.borderRadius = d('radius') ? v.radius + 'px' : '';
        }
      })
    ] }
  ];
  const ALL = STEPS.flatMap(s => s.comps);

  // ---------- Read each component's original look from the artwork ----------
  const ORDER = ['fill', 'texture', 'asset', 'opacity', 'stroke', 'radius', 'shadow'];
  for (const c of ALL) {
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
      texture: 'none', opacity: 1,
      stroke: stroked ? Math.round(parseFloat(stroked.cs.strokeWidth) * 10) / 10 : 0,
      radius: rect ? parseFloat(rect.getAttribute('rx')) || 0 : 0,
      shadow: 0
    };
    for (const k of Object.keys(c.base)) if (!c.props.includes(k)) delete c.base[k];
    c.apply = (_, v, d) => {
      // a gradient keeps its shape: every stop moves by the same amount as the first
      if (c.grad) for (const st of c.stops) st.el.style.stopColor = d('fill') ? shiftHex(st.hex, c.base.fill, v.fill) : '';
      const fx = filterFor(c, v);
      const op = d('opacity') ? String(v.opacity) : '';
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
  for (const c of ALL) c.props = ORDER.filter(k => c.props.includes(k));

  // ---------- Values ----------
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
  function apply(c) {
    const v = values[c.id];
    c.apply(c.els, v, k => v[k] !== c.base[k]);
  }
  const changed = c => JSON.stringify(values[c.id]) !== JSON.stringify(defaults[c.id]);

  // ---------- Panel ----------
  const LABELS = { fill: 'Fill color', texture: 'Texture', asset: 'SVG asset', opacity: 'Opacity', stroke: 'Stroke width', radius: 'Corner radius', shadow: 'Shadow' };
  function rangeOf(c, k) {
    const b = c.base[k];
    if (k === 'opacity') return [0, 1, 0.01];
    if (k === 'stroke') return [0, Math.max(8, Math.ceil(b * 3)), b >= 4 ? 0.5 : 0.1];
    if (k === 'radius') return [0, Math.max(40, Math.ceil(b * 2)), 0.5];
    return [0, 24, 1];                                   // shadow
  }
  const fmt = (k, x) => k === 'opacity' ? (+x).toFixed(2) : String(+(+x).toFixed(1));

  const panel = h('aside', 'panel');
  panel.setAttribute('aria-label', 'Appearance controls');
  const toggle = h('button', 'panel-toggle');
  toggle.type = 'button';
  toggle.innerHTML = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Appearance</span>';
  const body = h('div', 'panel-body');
  const scroll = h('div', 'panel-scroll');
  const actions = h('div', 'panel-actions');
  const restoreBtn = h('button', null, 'Restore defaults'); restoreBtn.type = 'button';
  const copyBtn = h('button', null, 'Copy settings'); copyBtn.type = 'button';
  const status = h('p', 'panel-status'); status.setAttribute('aria-live', 'polite');
  actions.append(restoreBtn, copyBtn);
  body.append(scroll, actions, status);
  panel.append(toggle, body);
  document.body.appendChild(panel);

  function setCollapsed(on) {
    panel.classList.toggle('collapsed', on);
    toggle.setAttribute('aria-expanded', String(!on));
    try { localStorage.setItem(STORE + '-collapsed', on ? '1' : '0'); } catch (e) {}
  }
  let startCollapsed = innerWidth < 900;
  try { const s = localStorage.getItem(STORE + '-collapsed'); if (s != null) startCollapsed = s === '1'; } catch (e) {}
  setCollapsed(startCollapsed);
  toggle.addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));

  let statusTimer;
  function say(msg) { status.textContent = msg; clearTimeout(statusTimer); statusTimer = setTimeout(() => { status.textContent = ''; }, 3200); }

  function buildComp(c) {
    const det = h('details', 'comp');
    const sum = h('summary');
    const sw = h('span', 'swatch');
    sum.append(sw, h('span', 'comp-name', c.label), h('span', 'mod'));
    sum.lastChild.title = 'Changed from the saved defaults';
    det.appendChild(sum);
    const inputs = {};
    for (const k of c.props) {
      const row = h('label', 'row');
      row.appendChild(h('span', 'row-label', LABELS[k]));
      let input, out = h('output');
      if (k === 'fill') {
        input = h('input'); input.type = 'color';
        input.addEventListener('input', () => set(c, k, input.value));
      } else if (k === 'texture' || k === 'asset') {
        input = h('select');
        const opts = k === 'texture' ? Object.fromEntries(TEXTURES.map(t => [t, t[0].toUpperCase() + t.slice(1)])) : ASSETS;
        for (const [val, text] of Object.entries(opts)) { const o = h('option', null, text); o.value = val; input.appendChild(o); }
        input.addEventListener('change', () => {
          if (k === 'asset' && input.value === 'custom' && !values[c.id].custom) { file.click(); input.value = values[c.id].asset; return; }
          set(c, k, input.value);
        });
      } else {
        input = h('input'); input.type = 'range';
        [input.min, input.max, input.step] = rangeOf(c, k);
        input.addEventListener('input', () => set(c, k, +input.value));
      }
      row.append(input, out);
      det.appendChild(row);
      inputs[k] = { input, out };
      if (k === 'asset') {
        // uploading a custom SVG for the icon
        var file = h('input'); file.type = 'file'; file.accept = '.svg,image/svg+xml'; file.hidden = true;
        const up = h('button', 'upload', 'Upload SVG…'); up.type = 'button';
        up.addEventListener('click', () => file.click());
        file.addEventListener('change', async () => {
          const f = file.files[0]; file.value = '';
          if (!f) return;
          try { values[c.id].custom = await readSvg(f); set(c, 'asset', 'custom'); say(`Using ${f.name}`); }
          catch (e) { say(e.message || 'Could not read that SVG.'); }
        });
        const urow = h('div', 'row row-upload');
        urow.append(h('span', 'row-label'), up, h('span'));
        det.append(file, urow);
        inputs.upload = { input: up, out: null };
      }
    }
    c.sync = () => {
      const v = values[c.id];
      for (const k of c.props) {
        const { input, out } = inputs[k];
        input.value = v[k];
        if (input.type === 'range') out.textContent = fmt(k, v[k]);
      }
      if (inputs.upload) inputs.upload.input.textContent = v.custom ? `Replace (${v.custom.name})` : 'Upload SVG…';
      if (c.props.includes('fill')) sw.style.background = v.fill; else sw.style.display = 'none';
      det.classList.toggle('changed', changed(c));
    };
    return det;
  }

  function set(c, k, val) {
    values[c.id][k] = val;
    apply(c); c.sync(); persist();
  }

  for (const step of STEPS) {
    const det = h('details', 'step');
    det.appendChild(h('summary', null, step.label));
    for (const c of step.comps) det.appendChild(buildComp(c));
    scroll.appendChild(det);
  }

  restoreBtn.addEventListener('click', () => {
    values = clone(defaults);
    for (const c of ALL) { apply(c); c.sync(); }
    try { localStorage.removeItem(STORE); } catch (e) {}
    say('Restored the saved defaults.');
  });

  function settingsText() {
    const lines = ['Getting to the Front — appearance settings', ''];
    const customs = [];
    for (const step of STEPS) {
      lines.push(step.label);
      for (const c of step.comps) {
        const v = values[c.id];
        const parts = c.props.map(k => `${LABELS[k].toLowerCase()} ${k === 'fill' || k === 'texture' || k === 'asset' ? v[k] : fmt(k, v[k])}`);
        lines.push(`- ${c.label} [${c.id}]: ${parts.join(', ')}`);
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
    body.insertBefore(ta, status); ta.focus(); ta.select();
    say('Copying was blocked here. Select the text above and copy it.');
  });

  for (const c of ALL) { apply(c); c.sync(); }
})();
