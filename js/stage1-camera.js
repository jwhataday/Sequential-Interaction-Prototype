// Stage 1: Camera Push Forward (from 01-camera-push-forward).
// Tap twice anywhere: the camera crouches back, then pushes forward in true perspective
// down the path to the back of the crowd.
window.Seq = window.Seq || {};
Seq.stage1 = (() => {
  const music = Seq.music;
  const frame = document.getElementById('frame');
  const root = document.getElementById('s1');
  const hint = document.getElementById('s1-hint');
  const dots = [...document.getElementById('s1-dots').children];
  const layers = [...root.querySelectorAll('.layer')].map(el => ({
    el, r: parseFloat(el.dataset.r), e: parseFloat(el.dataset.e), blur: !!el.dataset.blur, prev: null
  }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = { onComplete: () => {} };

  // The camera starts far out and travels TRAVEL units; it ends NEAR units past the old
  // reference point, standing directly behind the front row of the crowd.
  const TRAVEL = 8.6, NEAR = 0.4;
  // Eye level: each layer has a line (data-e) at a standing person's eye height. That line is
  // pinned to one horizon on screen, so every head in the crowd sits on the viewer's eye line.
  const HORIZON = 270;            // screen y, in 800×500 viewBox units
  for (const L of layers) L.el.style.transformOrigin = `55% ${L.e / 5}%`;
  let count = 0, phase = 'idle', introTimer, cam = 0;

  // True perspective: apparent size = r / (distance still between camera and layer).
  function setCamera(c, moving = false) {
    cam = c;
    const left = TRAVEL - c - NEAR;
    drawPath(left);
    for (const L of layers) {
      const s = L.r / (L.r + left);
      L.el.style.transform = `translateY(${((HORIZON - L.e) / 5).toFixed(3)}%) scale(${s})`;
      let b = 0;
      if (moving && L.prev) b = Math.min(6, (Math.abs(s - L.prev) / s) * 60 * (L.blur ? 1.6 : 0.6));
      // at rest, the heads right in front of the lens sit slightly out of focus
      if (!moving && L.blur && s > 2.2) b = Math.max(b, 1.2);
      L.el.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : '';
      L.prev = moving ? s : null;
    }
  }

  // Ground path. A ground point at depth z (front row of the crowd = r 1) lands at
  // y = HORIZON + EYE / z and x = CX + X / z. EYE matches the crowd's eye-to-feet drop.
  const EYE = 74, CX = 440, PATH_W = 46, PATH_END = 2.0;
  const NS = 'http://www.w3.org/2000/svg';
  const pathBody = document.getElementById('s1-pathBody');
  const edgeL = document.getElementById('s1-pathEdgeL'), edgeR = document.getElementById('s1-pathEdgeR');
  const marksG = document.getElementById('s1-pathMarks'), postsG = document.getElementById('s1-posts');
  // pebbles/ruts on the path and posts along its edges, at fixed world depths
  const marks = [], posts = [];
  for (let d = -9; d < PATH_END; d += 0.23) {
    const el = document.createElementNS(NS, 'ellipse'); marksG.appendChild(el);
    marks.push({ el, d, x: ((d * 37.3) % 1 + 1) % 1 * 1.4 - 0.7 });
  }
  for (let d = -9; d <= 0.85; d += 0.45) for (const side of [-1, 1]) {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('stroke', '#3e3e3e'); el.setAttribute('stroke-linecap', 'round'); el.dataset.c = 's1-posts';
    postsG.appendChild(el); posts.push({ el, d, side });
  }
  function drawPath(left) {
    const zNear = 0.22, zFar = PATH_END + left;
    if (zFar <= zNear) { pathBody.setAttribute('points', ''); return; }
    const L = [], R = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const z = zNear * Math.pow(zFar / zNear, i / N);
      const y = HORIZON + EYE / z;
      L.push(`${(CX - PATH_W / z).toFixed(1)},${y.toFixed(1)}`);
      R.push(`${(CX + PATH_W / z).toFixed(1)},${y.toFixed(1)}`);
    }
    pathBody.setAttribute('points', L.concat(R.slice().reverse()).join(' '));
    edgeL.setAttribute('points', L.join(' ')); edgeR.setAttribute('points', R.join(' '));
    const sw = Math.min(6, 2.2 / zNear * 0.25);
    edgeL.setAttribute('stroke-width', sw); edgeR.setAttribute('stroke-width', sw);
    for (const m of marks) {
      const z = m.d + left;
      if (z < 0.2 || z > zFar) { m.el.setAttribute('rx', 0); continue; }
      m.el.setAttribute('cx', (CX + m.x * PATH_W / z).toFixed(1));
      m.el.setAttribute('cy', (HORIZON + EYE / z).toFixed(1));
      m.el.setAttribute('rx', (5 / z).toFixed(2)); m.el.setAttribute('ry', (1.6 / z).toFixed(2));
    }
    for (const q of posts) {
      const z = q.d + left;
      if (z < 0.12) { q.el.setAttribute('stroke-width', 0); continue; }
      const x = CX + q.side * (PATH_W + 14) / z;
      q.el.setAttribute('x1', x.toFixed(1)); q.el.setAttribute('x2', x.toFixed(1));
      q.el.setAttribute('y1', (HORIZON + EYE / z).toFixed(1));
      q.el.setAttribute('y2', (HORIZON + (EYE - 26) / z).toFixed(1));
      q.el.setAttribute('stroke-width', Math.min(40, 3.2 / z).toFixed(2));
      q.el.setAttribute('opacity', Math.min(1, (z - 0.12) / 0.15).toFixed(2));
    }
  }

  function intro() {
    count = 0; phase = 'armed';
    dots.forEach(d => d.classList.remove('on'));
    hint.classList.remove('out');
    clearTimeout(introTimer);
    introTimer = setTimeout(() => hint.classList.add('in'), 700);
  }

  function ripple(x, y) {
    const r = frame.getBoundingClientRect();
    const px = Math.min(Math.max(x - r.left, 0), r.width);
    const py = Math.min(Math.max(y - r.top, 0), r.height);
    const el = document.createElement('span');
    el.className = 'ripple'; el.style.left = px + 'px'; el.style.top = py + 'px';
    frame.appendChild(el); setTimeout(() => el.remove(), 560);
  }

  function register(x, y) {
    if (phase !== 'armed') return;
    hint.classList.add('in'); clearTimeout(introTimer);
    dots[count].classList.add('on');
    count++;
    ripple(x, y);
    if (count === 2) { phase = 'pushing'; setTimeout(push, 260); }
  }

  // A tiny crouch back, then an instant burst that settles like a dolly braking.
  const DUR = 1700, CROUCH = 0.08;
  const ease = x => 1 - Math.pow(1 - x, 4);
  const curve = p => p < CROUCH ? -0.25 * Math.sin((p / CROUCH) * Math.PI)
                                : ease((p - CROUCH) / (1 - CROUCH));

  function push() {
    hint.classList.add('out');
    if (reduce) { setCamera(TRAVEL); done(); return; }
    let start = null;
    function step(now) {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / DUR);
      setCamera(TRAVEL * curve(p), p < 1);
      if (p > 0.55) music.set(0.42, 260, 0.35);
      if (p < 1) requestAnimationFrame(step); else { setCamera(TRAVEL); done(); }
    }
    requestAnimationFrame(step);
  }

  function done() {
    phase = 'done';
    music.set(0.42, 260, 0.35);
    api.onComplete();
  }

  // The sequence reset: a quick reverse camera move from wherever the camera is
  // back to the far view, then the two-tap hint again.
  function rewind(then) {
    hint.classList.remove('in');
    const from = cam;
    const finish = () => { setCamera(0); intro(); if (then) then(); };
    if (reduce) { finish(); return; }
    let start = null; phase = 'resetting';
    function back(now) {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / 900);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setCamera(from * (1 - e));
      if (p < 1) requestAnimationFrame(back); else finish();
    }
    requestAnimationFrame(back);
  }

  setCamera(0);
  intro();

  return Object.assign(api, {
    TRAVEL, setCamera, rewind,
    down: e => register(e.clientX, e.clientY),
    busy: () => phase === 'pushing' || phase === 'resetting'
  });
})();
