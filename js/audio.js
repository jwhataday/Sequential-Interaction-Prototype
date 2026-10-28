// Music: the synthesized kick, bass and hats shared by all three studies, heard through a
// low-pass "distance" filter. A floor keeps the sound from closing up again at a handoff,
// so the music only ever gets closer as the sequence moves forward.
window.Seq = window.Seq || {};
Seq.music = (() => {
  const BEAT = 60 / 124;
  let ac = null, lp, master;
  let floor = { gain: 0, cutoff: 0 };
  function start() {
    if (ac) { ac.resume?.(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; lp.Q.value = 0.7;
    master = ac.createGain(); master.gain.value = 0;
    lp.connect(master); master.connect(ac.destination);
    const noise = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const notes = [41.2, 41.2, 49, 36.7];      // E1 E1 G1 D1
    let next = ac.currentTime + 0.05, n = 0;
    const kick = t => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.4);
    };
    const hat = t => {
      const s = ac.createBufferSource(); s.buffer = noise;
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ac.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(lp); s.start(t); s.stop(t + 0.06);
    };
    const bass = (t, hz) => {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = hz * 2; f.type = 'lowpass'; f.frequency.value = 520;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.9);
      o.connect(f); f.connect(g); g.connect(lp); o.start(t); o.stop(t + BEAT);
    };
    setInterval(() => {
      while (next < ac.currentTime + 0.25) {
        kick(next); hat(next + BEAT / 2); bass(next + BEAT / 2, notes[Math.floor(n / 4) % 4]);
        next += BEAT; n++;
      }
    }, 60);
  }
  // gain 0..1, cutoff in Hz (low = far away and muffled), tc = smoothing time
  function set(gain, cutoff, tc = 0.15) {
    if (!ac) return;
    master.gain.setTargetAtTime(Math.max(gain, floor.gain), ac.currentTime, tc);
    lp.frequency.setTargetAtTime(Math.max(cutoff, floor.cutoff), ac.currentTime, tc);
  }
  // the closest the music has come so far; reset clears it
  function setFloor(gain, cutoff) { floor = { gain, cutoff }; }
  // the music clock, slightly behind so visuals land on the audible kick
  const now = () => ac ? ac.currentTime - 0.05 : performance.now() / 1000;
  // 1 on each kick, decaying to 0 before the next
  function beat() {
    const t = now();
    return Math.exp(-((((t % BEAT) + BEAT) % BEAT) / BEAT) * 7);
  }
  return { start, set, setFloor, now, beat, BEAT };
})();
