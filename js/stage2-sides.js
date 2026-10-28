// Stage 2: Push to the Side (from 02-push-to-the-side).
// Hold and swipe sideways to fill one side's meter; finish the other side before the
// first side's timer runs out, or those people stumble back. Both clear: the crowd parts.
window.Seq = window.Seq || {};
Seq.stage2 = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const music = Seq.music;
  const frame = document.getElementById('frame');
  const root = document.getElementById('s2');
  const crowdG = document.getElementById('s2-crowd');
  const cam = document.getElementById('s2-cam');
  const armEls = { '-1': document.getElementById('s2-armL'), '1': document.getElementById('s2-armR') };
  const meters = { '-1': document.getElementById('s2-meterL'), '1': document.getElementById('s2-meterR') };
  const fills = { '-1': document.getElementById('s2-fillL'), '1': document.getElementById('s2-fillR') };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = { onComplete: () => {} };
  let active = false;   // only the current stage of the sequence takes input and drives the music
  let intro = 1;        // extra camera scale, set by the sequence during handoffs
  let timers = [];

  // ---------- Crowd, taken from the festival-crowd SVG ----------
  // Each person: head (cx, cy, r), body below it, optional raised arms, a row weight w,
  // and F = how far the full shove carries them (viewBox units).
  const people = [];
  function person({ c, x, y, r, bw, bh, color, arms = [], sw = 4, s = 1, w, F }) {
    const outer = document.createElementNS(NS, 'g');
    const inner = document.createElementNS(NS, 'g');
    inner.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
    inner.setAttribute('fill', color);
    inner.dataset.c = c;               // the appearance panel's component name
    const head = document.createElementNS(NS, 'circle');
    head.setAttribute('cx', 0); head.setAttribute('cy', 0); head.setAttribute('r', r);
    const body = document.createElementNS(NS, 'rect');
    body.setAttribute('x', -bw / 2); body.setAttribute('y', r);
    body.setAttribute('width', bw); body.setAttribute('height', bh); body.setAttribute('rx', r);
    inner.append(head, body);
    for (const [x1, y1, x2, y2] of arms) {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1 - x); l.setAttribute('y1', y1 - y);
      l.setAttribute('x2', x2 - x); l.setAttribute('y2', y2 - y);
      l.setAttribute('stroke', color); l.setAttribute('stroke-width', sw); l.setAttribute('stroke-linecap', 'round');
      l.dataset.c = c;
      inner.appendChild(l);
    }
    outer.appendChild(inner); crowdG.appendChild(outer);
    const side = x < 400 ? -1 : 1;
    people.push({ el: outer, x, footY: y + (r + bh) * s, side, w, F: side * F, phase: Math.random() * Math.PI * 2 });
  }

  // far row
  const farArms = { 130: [[135,282,142,252]], 330: [[335,282,342,252]], 430: [[425,282,418,252]], 580: [[585,282,592,252]], 730: [[735,282,742,252]] };
  [[30,268],[80,266],[130,269],[180,267],[230,268],[280,266],[330,269],[380,267],[430,268],[480,266],[530,269],[580,267],[630,268],[680,266],[730,269],[780,267]]
    .forEach(([x, y]) => person({ c: 's2-crowd-far', x, y, r: 8, bw: 20, bh: 30, color: '#9a9a9a', arms: farArms[x], sw: 4, w: 0.15, F: 26 }));
  // middle row
  const midArms = { 140: [[150,308,162,262],[130,308,118,262]], 490: [[500,308,512,262]], 660: [[670,308,682,262],[650,308,638,262]] };
  [[55,290],[140,288],[225,291],[310,289],[490,289],[575,291],[660,288],[745,290]]
    .forEach(([x, y]) => person({ c: 's2-crowd-mid', x, y, r: 12, bw: 30, bh: 50, color: '#666666', arms: midArms[x], sw: 7, w: 0.55, F: 240 }));
  // near row
  person({ c: 's2-crowd-near', x: 20, y: 330, r: 22, bw: 56, bh: 160, color: '#3a3a3a', w: 0.75, F: 200 });
  person({ c: 's2-crowd-near', x: 175, y: 326, r: 22, bw: 56, bh: 160, color: '#3a3a3a', arms: [[195,366,222,290]], sw: 12, w: 0.75, F: 280 });
  person({ c: 's2-crowd-near', x: 625, y: 326, r: 22, bw: 56, bh: 160, color: '#3a3a3a', arms: [[605,366,578,290]], sw: 12, w: 0.75, F: 280 });
  person({ c: 's2-crowd-near', x: 780, y: 330, r: 22, bw: 56, bh: 160, color: '#3a3a3a', w: 0.75, F: 200 });
  // the people right in front of the viewer: near-row figures, closer, blocking the stage
  const near = { r: 22, bw: 56, bh: 160 };
  person({ ...near, c: 's2-blockers-back', x: 368, y: 222, s: 1.6, color: '#4c4c4c', w: 0.9, F: 470 });
  person({ ...near, c: 's2-blockers-back', x: 438, y: 220, s: 1.6, color: '#4c4c4c', arms: [[458,260,485,184]], sw: 12, w: 0.9, F: 470 });
  person({ ...near, c: 's2-blockers-front', x: 316, y: 206, s: 2.3, color: '#333333', w: 1, F: 470 });
  person({ ...near, c: 's2-blockers-front', x: 494, y: 204, s: 2.3, color: '#333333', w: 1, F: 470 });

  // ---------- State ----------
  const SWIPE = 260;           // viewBox units of sideways drag needed to fill one bar
  const DECAY = 0.12;          // bar leak per second while held but not swiping
  const PARTIAL = 0.3;         // share of the full shove reached while charging
  const TICKS = 8;
  const SHOVED = 0.72;         // how far a side is shoved while it waits for the other side
  const WINDOW = 3.2;          // seconds a shoved side stays clear: time to swipe the other way, plus spare
  const sides = [-1, 1];
  let st;
  function fresh() {
    return {
      phase: 'armed', holding: false, lastX: 0, t: 0,
      fill: { '-1': 0, '1': 0 }, window: { '-1': 0, '1': 0 }, locked: { '-1': false, '1': false }, tick: { '-1': 0, '1': 0 },
      push: { '-1': { s: 0, v: 0, target: 0 }, '1': { s: 0, v: 0, target: 0 } },
      arm: { '-1': { s: 0, v: 0 }, '1': { s: 0, v: 0 } },
      hop: { '-1': 0, '1': 0 }, shake: 0, zoom: { s: 0, v: 0, target: 0 }
    };
  }

  function bump(side, power = 1) {
    const m = Math.abs(power);
    st.push[side].v += 0.55 * power;
    st.arm[side].v += 6 * m;
    st.hop[side] = Math.min(1.4, st.hop[side] + 0.8 * m);
    st.shake = Math.min(1.5, st.shake + 0.45 * m);
  }

  // ---------- Input: hold and swipe ----------
  const toView = dx => dx / frame.getBoundingClientRect().width * 800;
  frame.addEventListener('pointerdown', e => {
    if (!active || st.phase !== 'armed') return;
    st.holding = true; st.lastX = e.clientX;
    frame.classList.add('holding');
    frame.setPointerCapture?.(e.pointerId);
    showMeters();
    sides.forEach(s => meters[s].classList.add('active'));
  });
  frame.addEventListener('pointermove', e => {
    if (!active || !st.holding || st.phase !== 'armed') return;
    const dx = toView(e.clientX - st.lastX); st.lastX = e.clientX;
    const side = dx < 0 ? -1 : 1;
    if (st.locked[side] || dx === 0) return;
    // one side at a time: the other side opens only after this one is shoved clear
    if (activeSide() !== 0 && activeSide() !== side) return;
    st.fill[side] = Math.min(1, st.fill[side] + Math.abs(dx) / SWIPE);
    if (st.fill[side] >= 1) {
      st.locked[side] = true; st.lastLocked = side; st.window[side] = WINDOW;
      bump(side, 1.7);
      meters[side].classList.remove('full'); void meters[side].offsetWidth; meters[side].classList.add('full');
    }
  });
  const release = () => {
    if (!st.holding) return;
    st.holding = false; frame.classList.remove('holding');
    sides.forEach(s => meters[s].classList.remove('active'));
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);

  // The side currently being worked: a locked side hands over to the other; a side that has
  // started filling holds the turn until it locks or drains away.
  function activeSide() {
    for (const s of sides) if (st.locked[s] && !st.locked[-s]) return -s;
    for (const s of sides) if (st.fill[s] > 0 && !st.locked[s]) return s;
    return 0;
  }

  // ---------- Signifiers ----------
  let meterTimer;
  function showMeters() { sides.forEach(s => meters[s].classList.add('in')); }
  function hideMeters() { sides.forEach(s => meters[s].classList.add('out')); }

  // ---------- Completion ----------
  function complete() {
    st.phase = 'shoving';
    hideMeters();
    // two hard shoves, a beat apart, then the crowd settles out of the way
    const order = st.lastLocked === -1 ? [1, -1] : [-1, 1];
    order.forEach((s, i) => timers.push(setTimeout(() => { st.push[s].target = 1; bump(s, 1.6); }, i * 150)));
    timers.push(setTimeout(() => { sides.forEach(s => bump(s, 0.9)); st.zoom.target = 1; }, 420));
    timers.push(setTimeout(() => { st.phase = 'done'; api.onComplete(); }, 1600));
  }

  // ---------- Loop ----------
  function spring(o, target, k, c, dt) {
    o.v += ((target - o.s) * k - o.v * c) * dt;
    o.s += o.v * dt;
  }
  let last = performance.now();
  function frameStep(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (root.style.visibility === 'hidden') { requestAnimationFrame(frameStep); return; }
    st.t += dt;

    for (const s of sides) {
      if (st.phase === 'armed' && st.locked[s]) {
        // shoved aside for a moment; the full bar empties like a timer
        st.window[s] -= dt;
        st.fill[s] = Math.max(0, st.window[s] / WINDOW);
        st.tick[s] = Math.floor(st.fill[s] * TICKS + 1e-6);
        st.push[s].target = SHOVED;
        if (st.window[s] <= 0) {             // too slow on the other side: they stumble back
          st.locked[s] = false; st.fill[s] = 0; st.tick[s] = 0; st.push[s].target = 0;
          bump(s, -0.9);
        }
      } else if (st.phase === 'armed') {
        if (st.holding && !st.locked[s]) st.fill[s] = Math.max(0, st.fill[s] - DECAY * dt);
        if (!st.holding) st.fill[s] = Math.max(0, st.fill[s] - 2.4 * dt);
        // a bump each time the bar crosses a tick
        const tk = Math.floor(st.fill[s] * TICKS + 1e-6);
        if (st.holding && tk > st.tick[s]) bump(s, tk === TICKS ? 1.3 : 0.6);
        st.tick[s] = tk;
        st.push[s].target = st.fill[s] * PARTIAL;
      }
      fills[s].style.width = (st.fill[s] * 100).toFixed(1) + '%';
      spring(st.push[s], st.push[s].target, 120, 9, dt);
      const armTarget = st.phase === 'armed' && st.holding ? st.fill[s] * 0.5 : 0;
      spring(st.arm[s], armTarget, 160, 12, dt);
      st.hop[s] *= Math.exp(-5 * dt);
    }
    if (st.phase === 'armed' && st.locked[-1] && st.locked[1]) complete();
    if (st.phase === 'armed') {
      const a = activeSide();
      for (const s of sides) meters[s].classList.toggle('wait', a !== 0 && a !== s && !st.locked[s]);
    }

    spring(st.zoom, st.zoom.target, 90, 11, dt);
    // music grows louder as you push, but stays far off and muffled
    const prog = st.phase === 'armed' ? (st.fill[-1] + st.fill[1] + (st.locked[-1] ? 1 : 0) + (st.locked[1] ? 1 : 0)) / 4 : 1;
    if (active) music.set(0.16 + prog * 0.26, 170 + prog * 480, 0.2);
    const beat = music.beat(), tb = st.t * Math.PI / music.BEAT;
    st.shake *= Math.exp(-6 * dt);

    // crowd
    for (const p of people) {
      const P = st.push[p.side];
      const dx = p.F * P.s;
      const hop = reduce ? 0 : st.hop[p.side] * p.w * 16 * Math.abs(Math.sin(st.t * 19 + p.phase))
                             + beat * (3 + 5 * p.w) * (0.6 + 0.4 * Math.sin(p.phase));   // dancing on the kick
      const lean = p.side * (P.v * 9 * p.w + P.s * 7 * p.w) + (reduce ? 0 : Math.sin(tb + p.phase) * (1.5 + 2.5 * p.w));
      p.el.setAttribute('transform', `translate(${dx.toFixed(2)} ${(-hop).toFixed(2)}) rotate(${lean.toFixed(2)} ${p.x} ${p.footY})`);
    }
    // the viewer's arms shove outward
    for (const s of sides) {
      const a = st.arm[s].s;
      armEls[s].setAttribute('transform', `translate(${(s * a * 70).toFixed(2)} ${(a * 14).toFixed(2)}) rotate(${(s * a * 14).toFixed(2)} ${400 + s * 200} 500)`);
    }
    // camera: jolts on every shove, and lurches forward once the gap opens
    const sh = reduce ? 0 : st.shake * 5;
    const z = (1 + st.zoom.s * 0.08) * intro;
    const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    cam.setAttribute('transform', `translate(${(400 + jx).toFixed(2)} ${(230 + jy).toFixed(2)}) scale(${z.toFixed(4)}) translate(-400 -230)`);

    requestAnimationFrame(frameStep);
  }

  // ---------- Sequence hooks ----------
  // stop taking input and cancel anything still scheduled
  function stop() {
    active = false;
    timers.forEach(clearTimeout); timers = [];
    clearTimeout(meterTimer);
    release();
  }
  // a fresh crowd, ready to fade in
  function prepare() {
    stop();
    st = fresh(); intro = 1;
    sides.forEach(s => { meters[s].classList.remove('in', 'out', 'full', 'active', 'wait'); fills[s].style.width = '0%'; });
  }
  // this stage is now the current one
  function arm() {
    active = true;
    meterTimer = setTimeout(showMeters, 700);
  }

  st = fresh();
  requestAnimationFrame(frameStep);

  return Object.assign(api, { prepare, arm, stop, setIntro: z => { intro = z; } });
})();
