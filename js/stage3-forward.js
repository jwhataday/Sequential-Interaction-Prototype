// Stage 3: Push Forward (from 03-push-forward-through-crowd).
// Press and drag forward (up), stroke after stroke, through the gap while the crowd shoves
// back. At the barrier the performer notices you: a smile and a thumbs up.
window.Seq = window.Seq || {};
Seq.stage3 = (() => {
  const music = Seq.music;
  const frame = document.getElementById('frame');
  const root = document.getElementById('s3');
  const hint = document.getElementById('s3-hint');
  const world = document.getElementById('s3-world');
  const handL = document.getElementById('s3-handL'), handR = document.getElementById('s3-handR');
  const smile = document.getElementById('s3-smile'), thumb = document.getElementById('s3-thumb');
  const armUp = document.getElementById('s3-armUp'), pBody = document.getElementById('s3-pBody');
  const cones = [...root.querySelectorAll('.cone')];
  const beams = document.getElementById('s3-beams');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = [...root.querySelectorAll('.layer')].map((el, i) => ({
    el, r: +el.dataset.r, k: +el.dataset.k, crowd: el.classList.contains('crowd'), phase: i * 1.7
  }));
  let active = false;   // only the current stage of the sequence takes input and drives the music
  let introOff = 0;     // extra camera distance, set by the sequence during the handoff dolly

  // Camera path: START units behind the reference view, END units past it (at the barrier).
  const START = 2.2, END = 1.36, VX = 400, VY = 300;
  const BEAT = music.BEAT;

  let st;
  function fresh() {
    return { phase: 'fight', p: 0, v: 0, holding: false, lastY: 0, idle: 0, started: false,
             pressure: 0.3, shoveIn: 1.2, reach: { s: 0, v: 0 }, knock: 0,
             jolt: { x: 0, vx: 0, r: 0, vr: 0 }, doneT: 0 };
  }

  // ---------- Sound: the same track, closer and louder with every step forward ----------
  function setLoudness(p) {
    music.set(0.12 + p * 0.38, 380 + Math.pow(p, 1.4) * 7000, 0.08);
  }

  // ---------- Input: press and drag forward (up), stroke after stroke ----------
  const toView = d => d / frame.getBoundingClientRect().height * 500;
  const GAIN = 0.0014;          // forward speed gained per viewBox unit of upward drag
  frame.addEventListener('pointerdown', e => {
    if (!active || st.phase !== 'fight') return;
    st.holding = true; st.lastY = e.clientY;
    frame.classList.add('holding'); frame.setPointerCapture?.(e.pointerId);
  });
  frame.addEventListener('pointermove', e => {
    if (!active || !st.holding || st.phase !== 'fight') return;
    const dy = toView(st.lastY - e.clientY); st.lastY = e.clientY;
    if (dy <= 0) return;                         // pulling back down just resets your hands
    st.started = true; st.idle = 0; hint.classList.remove('in');
    st.v += dy * GAIN;
    st.reach.v += dy * 0.09;
    st.pressure = Math.max(0, st.pressure - dy * 0.0025);   // you pry the gap open
  });
  const release = () => {
    if (!st.holding) return;
    st.holding = false; frame.classList.remove('holding');
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);

  // the crowd shoves back: a knock that costs you ground and rocks the camera
  function shove() {
    const hard = 0.06 + Math.random() * 0.07 + st.p * 0.05;
    st.v -= hard;
    const dir = Math.random() < 0.5 ? -1 : 1;
    st.jolt.vx += dir * (90 + Math.random() * 80);
    st.jolt.vr += -dir * (14 + Math.random() * 10);
    st.pressure = Math.min(1, st.pressure + 0.45);
    st.knock = 1;
  }

  // ---------- Loop ----------
  let last = performance.now();
  function step(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (root.style.visibility === 'hidden') { requestAnimationFrame(step); return; }
    const t = music.now();
    const beat = music.beat();                               // 1 on the kick, decaying

    if (st.phase === 'fight') {
      // slippery: very little friction, a steady push back from the crowd
      if (st.p > 0) st.v -= (0.075 + 0.03 * st.p) * dt;
      st.v *= Math.exp(-0.85 * dt);
      st.v = Math.max(st.v, -0.22);            // you slide back, but never faster than this
      st.p += st.v * dt;
      if (st.p < 0) { st.p = 0; st.v = Math.max(0, st.v) * 0.3; }
      if (st.started) {
        st.shoveIn -= dt;
        if (st.shoveIn <= 0 && st.p > 0.03) { shove(); st.shoveIn = 0.55 + Math.random() * 0.9; }
      }
      st.pressure += (0.3 - st.pressure) * 0.6 * dt;
      if (!st.holding) st.idle += dt;
      if (active && st.idle > 2.2 && st.p < 0.6) hint.classList.add('in');
      if (st.p >= 0.985) { st.phase = 'arrived'; st.doneT = 0; st.v = Math.min(st.v, 0.4); hint.classList.remove('in'); }
    } else if (st.phase === 'arrived') {
      st.doneT += dt;
      // slide the last bit and settle against the barrier
      st.v += ((1 - st.p) * 60 - st.v * 6) * dt;
      st.p += st.v * dt;
      st.pressure += (0 - st.pressure) * 2 * dt;
    }
    const pc = Math.max(0, Math.min(1, st.p));
    frame.dataset.p = pc.toFixed(2);
    if (active) setLoudness(pc);

    // camera jolts spring back to centre
    const J = st.jolt;
    J.vx += (-J.x * 70 - J.vx * 7) * dt; J.x += J.vx * dt;
    J.vr += (-J.r * 70 - J.vr * 7) * dt; J.r += J.vr * dt;
    st.knock *= Math.exp(-5 * dt);
    const jostle = reduce || st.phase !== 'fight' ? 0 : st.pressure * 1.6;
    const roll = reduce ? 0 : J.r + Math.sin(t * 7.3) * jostle * 0.5;
    const slip = reduce ? 0 : J.x + Math.sin(t * 5.1) * jostle * 4;
    const pulse = reduce ? 0 : beat * 0.006 * (0.3 + pc);
    const left = START - pc * (START + END) + introOff;
    world.setAttribute('transform', `translate(${(VX + slip).toFixed(2)} ${VY}) rotate(${roll.toFixed(2)}) scale(${(1 + pulse).toFixed(4)}) translate(${-VX} ${-VY})`);

    for (const L of layers) {
      const dist = L.r + left;
      if (dist <= 0.17) { L.el.setAttribute('opacity', 0); continue; }
      const s = L.k / dist;
      L.el.setAttribute('opacity', dist < 0.4 ? ((dist - 0.17) / 0.23).toFixed(3) : 1);
      let sway = 0, bob = 0, squeeze = 1;
      if (L.crowd && !reduce) {
        sway = Math.sin(t * Math.PI / BEAT + L.phase) * 0.9;
        bob = beat * 3 * Math.min(1, s);
        // the nearest rows crowd in on the gap when they push back
        if (dist < 1.8) squeeze = 1 - st.pressure * 0.13 * (1.8 - dist) / 1.8 * 2;
      }
      L.el.setAttribute('transform',
        `translate(${VX} ${VY + bob}) scale(${(s * squeeze).toFixed(4)} ${s.toFixed(4)}) rotate(${sway.toFixed(2)}) translate(${-VX} ${-VY})`);
    }

    // speakers thump, lights breathe
    const boom = beat * (0.25 + st.p);
    for (const c of cones) c.setAttribute('r', (+c.dataset.r0 * (1 + boom * 0.18)).toFixed(2));
    beams.setAttribute('opacity', (0.75 + beat * 0.25).toFixed(3));

    // your hands claw forward on each stroke, and get knocked back on each shove
    const R = st.reach;
    R.v += (-R.s * 55 - R.v * 6) * dt; R.s += R.v * dt;
    const reach = Math.max(-0.4, Math.min(1.4, R.s));
    let hx = 0, hy = 0, hr = 0;
    if (!reduce) {
      hx = Math.max(0, reach) * 60 - st.knock * 16;
      hy = -reach * 70 + st.knock * 40;
      hr = Math.max(0, reach) * 12;
    }
    handL.setAttribute('transform', `translate(${-hx} ${hy}) rotate(${-hr} 235 500)`);
    handR.setAttribute('transform', `translate(${hx} ${hy}) rotate(${hr} 565 500)`);

    // the performer notices you
    if (st.phase === 'arrived') {
      const k = Math.min(1, Math.max(0, (st.doneT - 0.25) / 0.25));
      smile.setAttribute('opacity', k.toFixed(2));
      const th = Math.min(1, Math.max(0, (st.doneT - 0.45) / 0.18));
      thumb.setAttribute('opacity', th.toFixed(2)); armUp.setAttribute('opacity', (1 - th).toFixed(2));
      const pop = th > 0 && th < 1 ? Math.sin(th * Math.PI) * 4 : 0;
      pBody.setAttribute('transform', `translate(0 ${(-pop - beat * 2).toFixed(2)})`);
    } else {
      pBody.setAttribute('transform', `translate(0 ${(-beat * 1.5).toFixed(2)})`);
    }

    requestAnimationFrame(step);
  }

  // ---------- Sequence hooks ----------
  let hintTimer;
  // stop taking input and cancel anything still scheduled
  function stop() {
    active = false;
    clearTimeout(hintTimer); hint.classList.remove('in');
    release();
  }
  // a fresh start at the gap, ready to fade in
  function prepare() {
    stop();
    st = fresh(); introOff = 0;
    smile.setAttribute('opacity', 0); thumb.setAttribute('opacity', 0); armUp.setAttribute('opacity', 1);
  }
  // this stage is now the current one
  function arm() {
    active = true;
    hintTimer = setTimeout(() => { if (st.phase === 'fight' && !st.started) hint.classList.add('in'); }, 700);
  }

  st = fresh();
  requestAnimationFrame(step);

  return { prepare, arm, stop, setIntro: off => { introOff = off; } };
})();
