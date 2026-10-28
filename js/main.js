// The sequence: one linear path to the front.
//   1. Tap twice: the camera pushes forward to the back of the crowd.
//   2. Hold and swipe left and right: push the people blocking the stage aside.
//   3. Drag forward, stroke after stroke: push through the gap to the barrier.
// Only the current stage takes input; the next opens only when it succeeds. Each success
// hands off with a camera move that crossfades into the next stage's opening view.
(() => {
  const { music, stage1: S1, stage2: S2, stage3: S3 } = Seq;
  const frame = document.getElementById('frame');
  const panes = { 1: document.getElementById('s1'), 2: document.getElementById('s2'), 3: document.getElementById('s3') };
  const opacity = { 1: 1, 2: 0, 3: 0 };
  const labels = {
    1: 'Outdoor festival scene seen from far away. Click twice to push the camera forward.',
    2: 'View from the back of a festival crowd. Hold and swipe left and right to push people aside.',
    3: 'In the crowd at an outdoor concert, with a gap ahead toward the stage. Press and swipe forward to move through it.'
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stage = 1, busy = false;

  function show(n, o) {
    opacity[n] = o;
    panes[n].style.opacity = o.toFixed(3);
    panes[n].style.visibility = o > 0 ? 'visible' : 'hidden';
  }
  function setStage(n) {
    stage = n;
    frame.dataset.stage = n;
    frame.setAttribute('aria-label', labels[n]);
  }
  function tween(dur, fn, then) {
    if (reduce || dur <= 0) { fn(1); if (then) then(); return; }
    let start = null;
    function f(now) {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / dur);
      fn(p);
      if (p < 1) requestAnimationFrame(f); else if (then) then();
    }
    requestAnimationFrame(f);
  }
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => x * x * (3 - 2 * x);
  const inOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  // 1 → 2: the camera keeps easing forward past the back row while the crowd scene fades in
  // at the same horizon, growing toward its resting framing.
  S1.onComplete = () => {
    busy = true;
    music.setFloor(0.42, 260);
    S2.prepare(); S2.setIntro(0.9); show(2, 0);
    tween(1200, p => {
      const e = inOut(p);
      S1.setCamera(S1.TRAVEL + 0.2 * e, p < 1);
      S2.setIntro(0.9 + 0.1 * e);
      show(2, smooth(clamp01((p - 0.15) / 0.75)));
    }, () => {
      show(2, 1); show(1, 0);
      setStage(2); S2.arm(); busy = false;
    });
  };

  // 2 → 3: the lurch through the parted crowd carries on while the camera dollies in
  // to the gap inside the crowd.
  S2.onComplete = () => {
    busy = true;
    music.setFloor(0.42, 650);
    S3.prepare(); S3.setIntro(0.7); show(3, 0);
    tween(1400, p => {
      const e = inOut(p);
      S2.setIntro(1 + 0.16 * e);
      S3.setIntro(0.7 * (1 - e));
      show(3, smooth(clamp01((p - 0.1) / 0.7)));
    }, () => {
      show(3, 1); S2.stop(); show(2, 0);
      setStage(3); S3.arm(); busy = false;
    });
  };

  // One reset for the whole sequence: back to the silent far view with a quick reverse
  // camera move, the music fading out.
  function reset() {
    if (busy || S1.busy()) return;
    busy = true;
    S2.stop(); S3.stop();
    music.setFloor(0, 0); music.set(0, 260, 0.25);
    setStage(1);
    show(1, 1);
    const o2 = opacity[2], o3 = opacity[3];
    if (o2 || o3) tween(400, p => { show(2, o2 * (1 - p)); show(3, o3 * (1 - p)); });
    S1.rewind(() => { busy = false; });
  }
  document.getElementById('reset').addEventListener('click', reset);

  // The appearance panel's "Show this step": jump straight to a step's opening view, skipping
  // the gestures before it, so its elements can be styled while they are on screen.
  function jump(n) {
    if (busy || S1.busy() || n === stage) return false;
    if (n === 1) { reset(); return true; }
    music.start();
    S2.stop(); S3.stop();
    S1.setCamera(S1.TRAVEL + 0.2); show(1, 0);
    if (n === 2) {
      music.setFloor(0.42, 260);
      S2.prepare(); S2.setIntro(1); show(2, 1); show(3, 0);
      setStage(2); S2.arm();
    } else {
      music.setFloor(0.42, 650);
      show(2, 0);
      S3.prepare(); S3.setIntro(0); show(3, 1);
      setStage(3); S3.arm();
    }
    return true;
  }
  Seq.sequence = { jump, current: () => stage };

  // Any click counts in stage 1: left, right, middle, or a tap. The first press anywhere
  // also starts the (still silent) music engine, as browsers require.
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.reset, .panel')) return;
    music.start();
    if (stage === 1 && !busy) S1.down(e);
  });
})();
