// SUNFOX — audio. 100% WebAudio synthesis (no samples, no files)  ->  window.G.audio
//
//   init()            create/resume the AudioContext (call on the first user gesture; idempotent)
//   music(name)       'title' | 'level' (loops)  ·  'clear' | 'gameover' (one-shot jingles)
//   stopMusic()       fade the current music out
//   sfx(name)         jump land gem bigcoin stomp hurt die spring block checkpoint heart splash select pause
//   setMuted(bool)    / .muted
//
// Nothing touches an AudioContext before init(); every entry point is safe to call earlier
// (a music() request made before init() simply starts when init() runs).
//
// Sound design: Mega Drive flavoured 2-operator FM (bass, brass, steel-pan) + SNES/PSG flavoured
// detuned pulse lead, saw stabs, synthesised drums, tempo-synced echo. The songs are written in a
// tiny text notation (see SONGS) and played by a look-ahead scheduler locked to AudioContext.currentTime.
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const A = (G.audio = G.audio || {});
  const nop = function () {};
  A.muted = false;
  A.ready = false;
  A.init = A.music = A.stopMusic = A.sfx = A.setMuted = nop; // real ones are installed at the bottom

  // ------------------------------------------------------------------ mix
  const MIX = { master: 0.85, music: 0.5, sfx: 0.8 };
  // per-instrument strip levels (music)
  const LV = { lead: 0.2, brass: 0.2, flute: 0.26, pan: 0.2, bass: 0.34, stab: 0.085, pad: 0.06, drum: 0.5, hat: 0.2, perc: 0.3 };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ------------------------------------------------------------------ rack (one per AudioContext)
  function softClip() {
    // linear up to 0.62, then a tanh knee that saturates below 0.88: the output can never clip.
    const n = 2049, c = new Float32Array(n), k = 0.62, L = 0.92;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      const y = a <= k ? a : k + (L - k) * Math.tanh((a - k) / (L - k));
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }
  function noiseBuf(ctx) {
    const n = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    return b;
  }
  function pulseWave(ctx, duty) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let k = 1; k < N; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }
  function makeRack(ctx, opt) {
    opt = opt || {};
    const R = { ctx: ctx, nOff: 0 };
    const g = (R.gain = v => { const n = ctx.createGain(); n.gain.value = v; return n; });
    R.out = g(A.muted && !opt.offline ? 0 : 1); // mute gate
    R.clip = ctx.createWaveShaper(); R.clip.curve = softClip();
    const c = (R.comp = ctx.createDynamicsCompressor()); // bus limiter
    c.threshold.value = -15; c.knee.value = 9; c.ratio.value = 10; c.attack.value = 0.003; c.release.value = 0.16;
    R.master = g(MIX.master);
    R.music = g(MIX.music);
    R.sfx = g(MIX.sfx);
    R.music.connect(R.master); R.sfx.connect(R.master);
    if (opt.raw) R.master.connect(R.out); // (analysis only) bypass limiter + clipper
    else { R.master.connect(c); c.connect(R.clip); R.clip.connect(R.out); }
    R.out.connect(ctx.destination);
    // short slap echo used by the "reward" sfx
    const d = ctx.createDelay(0.5), fb = g(0.32), wet = g(0.4);
    d.delayTime.value = 0.125;
    R.sfxEcho = g(1); R.sfxEcho.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(R.sfx);
    R.noise = noiseBuf(ctx);
    R.waves = { p25: pulseWave(ctx, 0.25), p12: pulseWave(ctx, 0.125) };
    return R;
  }

  // ------------------------------------------------------------------ primitives
  function mkOsc(R, type, f, t, end, det) {
    const o = R.ctx.createOscillator();
    if (R.waves[type]) o.setPeriodicWave(R.waves[type]); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (det) o.detune.value = det;
    o.start(t); o.stop(end);
    return o;
  }
  // attack (linear) -> decay to sustain (time constant dTc) -> release at tOff (time constant rTc)
  function adsr(p, t, tOff, a, peak, dTc, sus, rTc) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * sus, t + a, dTc);
    p.setTargetAtTime(0, tOff, rTc);
  }
  function vibrato(R, t, end, rate, cents, delay, targets) {
    const ctx = R.ctx, l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = rate;
    lg.gain.setValueAtTime(0, t + delay); lg.gain.linearRampToValueAtTime(cents, t + delay + 0.12);
    l.connect(lg); for (let i = 0; i < targets.length; i++) lg.connect(targets[i].detune);
    l.start(t + delay); l.stop(end);
  }
  function noiseSrc(R, t, dur) {
    const s = R.ctx.createBufferSource(); s.buffer = R.noise;
    R.nOff = (R.nOff + 0.2371) % 1.6;
    s.start(t, R.nOff, dur + 0.03);
    return s;
  }

  // ------------------------------------------------------------------ pitched voices
  // PSG/SNES style lead: narrow pulse + slightly detuned second oscillator, delayed vibrato.
  function vPulse(R, dest, t, f, dur, vel, o) {
    const ctx = R.ctx, a = o.a || 0.005, rTc = o.rTc || 0.03;
    const tOff = Math.max(t + dur, t + a + 0.005), end = tOff + rTc * 7 + 0.02;
    const g = ctx.createGain();
    adsr(g.gain, t, tOff, a, vel, o.dTc || 0.06, o.sus == null ? 0.7 : o.sus, rTc);
    const o1 = mkOsc(R, o.wave || 'p25', f, t, end, 0), osc = [o1];
    o1.connect(g);
    if (o.mix2) {
      const o2 = mkOsc(R, o.wave2 || 'square', f * (o.mul2 || 1), t, end, o.det == null ? 9 : o.det), g2 = ctx.createGain();
      g2.gain.value = o.mix2; o2.connect(g2); g2.connect(g); osc.push(o2);
    }
    if (o.vib && dur > (o.vibDelay || 0.16) + 0.08) vibrato(R, t, end, o.vibRate || 5.8, o.vib, o.vibDelay || 0.16, osc);
    g.connect(dest);
    return g;
  }
  // Mega Drive style 2-operator FM: modulator -> carrier.frequency, with an index envelope.
  //   ratio  modulator/carrier frequency ratio      i0 -> i1 (iTc)  modulation index envelope
  //   det    cents: adds a 2nd detuned carrier      oct     level of an extra sine partial at 2f
  function vFM(R, dest, t, f, dur, vel, o) {
    const ctx = R.ctx, a = o.a || 0.004, rTc = o.rTc || 0.04;
    const tOff = Math.max(t + dur, t + a + 0.005), end = tOff + rTc * 7 + 0.02;
    const g = ctx.createGain();
    adsr(g.gain, t, tOff, a, vel, o.dTc || 0.1, o.sus == null ? 0.7 : o.sus, rTc);
    const mod = mkOsc(R, 'sine', f * o.ratio, t, end, o.mdet || 0), mg = ctx.createGain();
    const dev = f * o.ratio;
    mg.gain.setValueAtTime(o.i0 * dev, t); mg.gain.setTargetAtTime(o.i1 * dev, t, o.iTc || 0.06);
    mod.connect(mg);
    const car = mkOsc(R, o.wave || 'sine', f, t, end, 0), osc = [car, mod];
    mg.connect(car.frequency); car.connect(g);
    if (o.det) {
      const c2 = mkOsc(R, o.wave || 'sine', f, t, end, o.det), g2 = ctx.createGain();
      g2.gain.value = 0.7; mg.connect(c2.frequency); c2.connect(g2); g2.connect(g); osc.push(c2);
    }
    if (o.oct) {
      const p = mkOsc(R, 'sine', f * 2, t, end, o.octDet || 0), pg = ctx.createGain();
      pg.gain.setValueAtTime(o.oct, t); pg.gain.setTargetAtTime(0, t, o.octTc || 0.09);
      p.connect(pg); pg.connect(g);
    }
    if (o.vib && dur > (o.vibDelay || 0.2) + 0.08) vibrato(R, t, end, o.vibRate || 5.6, o.vib, o.vibDelay || 0.2, osc);
    g.connect(dest);
    return g;
  }
  // chord of saws (alternately detuned): short = off-beat stab, long + slow attack = pad
  function vChord(R, dest, t, notes, dur, vel, o) {
    const ctx = R.ctx, a = o.a || 0.004, rTc = o.rTc || 0.03;
    const tOff = Math.max(t + dur, t + a + 0.005), end = tOff + rTc * 7 + 0.02;
    const g = ctx.createGain();
    adsr(g.gain, t, tOff, a, vel, o.dTc || 0.05, o.sus == null ? 0.6 : o.sus, rTc);
    for (let i = 0; i < notes.length; i++) mkOsc(R, o.wave || 'sawtooth', mtof(notes[i]), t, end, (i & 1 ? -1 : 1) * (o.det || 7)).connect(g);
    g.connect(dest);
  }

  // instrument presets
  const P = {
    lead: { wave: 'p25', mix2: 0.4, det: 10, a: 0.006, dTc: 0.07, sus: 0.72, rTc: 0.03, vib: 11, vibDelay: 0.17 },
    lead2: { wave: 'p12', mix2: 0, a: 0.006, dTc: 0.07, sus: 0.7, rTc: 0.03, vib: 8, vibDelay: 0.2 },
    brass: { ratio: 1, i0: 3.3, i1: 1.45, iTc: 0.08, a: 0.014, dTc: 0.12, sus: 0.82, rTc: 0.04, det: 7, vib: 9, vibDelay: 0.22 },
    flute: { ratio: 1, i0: 1.3, i1: 0.45, iTc: 0.06, a: 0.03, dTc: 0.2, sus: 0.85, rTc: 0.07, det: 5, vib: 10, vibDelay: 0.26 },
    pan: { ratio: 2, mdet: 7, i0: 2.3, i1: 0.22, iTc: 0.05, a: 0.003, dTc: 0.17, sus: 0.1, rTc: 0.09, oct: 0.42, octTc: 0.1 },
    bell: { ratio: 3.5, i0: 1.6, i1: 0.1, iTc: 0.09, a: 0.002, dTc: 0.22, sus: 0, rTc: 0.12, oct: 0.3, octTc: 0.2 },
    bass: { ratio: 1, i0: 3.2, i1: 0.85, iTc: 0.055, a: 0.004, dTc: 0.14, sus: 0.72, rTc: 0.028 },
    stab: { a: 0.004, dTc: 0.05, sus: 0.55, rTc: 0.03, det: 8 },
    pad: { a: 0.09, dTc: 0.4, sus: 0.8, rTc: 0.13, det: 6 },
  };

  // ------------------------------------------------------------------ drums
  function dKick(R, dest, t, v) {
    const ctx = R.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.05, 0.045);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.42);
    const n = noiseSrc(R, t, 0.012), ng = ctx.createGain(); // beater click
    ng.gain.setValueAtTime(v * 0.22, t); ng.gain.setTargetAtTime(0, t, 0.004);
    n.connect(ng); ng.connect(dest);
  }
  function dSnare(R, B, t, v) {
    const ctx = R.ctx, n = noiseSrc(R, t, 0.22), ng = ctx.createGain();
    ng.gain.setValueAtTime(v, t); ng.gain.setTargetAtTime(0, t + 0.012, 0.04);
    n.connect(ng); ng.connect(B.snF);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(265, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.07);
    g.gain.setValueAtTime(v * 0.75, t); g.gain.setTargetAtTime(0, t + 0.008, 0.028);
    o.connect(g); g.connect(B.drum); o.start(t); o.stop(t + 0.25);
  }
  function dHat(R, B, t, v, open) {
    const ctx = R.ctx, n = noiseSrc(R, t, open ? 0.32 : 0.07), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + (open ? 0.02 : 0.002), open ? 0.06 : 0.011);
    n.connect(g); g.connect(B.hatF);
  }
  function dShaker(R, B, t, v) {
    const ctx = R.ctx, n = noiseSrc(R, t, 0.08), g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.setTargetAtTime(0, t + 0.012, 0.014);
    n.connect(g); g.connect(B.shF);
  }
  function dTom(R, dest, t, f, v, tc, bend) { // toms, congas, timpani
    const ctx = R.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * (bend || 1.5), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.02, tc || 0.07);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.03 + (tc || 0.07) * 8);
  }
  function dRim(R, dest, t, v) {
    const ctx = R.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(1760, t);
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.004, 0.011);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.12);
  }
  function dCrash(R, dest, t, v) {
    const ctx = R.ctx, n = noiseSrc(R, t, 1.4), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 4200;
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t + 0.03, 0.26);
    n.connect(f); f.connect(g); g.connect(dest);
  }

  // ------------------------------------------------------------------ songs
  // Everything is written in C major / A minor on a 16th-note grid and transposed by `tr` semitones.
  // Melodic lines:  <pitch>:<steps>  (c4 = middle C, # sharp, b flat) · r:<n> rest · ~:<n> tie (extends the
  //   previous note) · | bar check · suffixes: ! accent  , soft  ' staccato
  //   %[:n] / &[:n] = automatic steel-pan figure on the current chord (16th tresillo ostinato / 8th arpeggio)
  // ch:   one chord per bar ("Dm/G" = half a bar each, "C:24" = explicit length in steps)
  // bass: 'tres' (3-3-2 calypso bounce) | 'pump' (octave 8ths) | 'long'   ·   bassLine: explicit notes
  // comp: 'skank' (off-beat stabs) | 'pad' (soft sustained chords) | 'hold' (bright sustained chords)
  // dr:   one drum bar name (see DR) per bar   ·   cr: crash cymbal on the first beat
  const SONGS = {
    // ---- Emerald Coast: sunny calypso-pop in Bb, 132 bpm.  intro(2) | A A' B B' C (40 bars, ~73 s) loop
    level: {
      bpm: 132, tr: -2, swing: 0.08, echo: 0.3, loop: 'A1', order: ['I1', 'I2', 'A1', 'A2', 'B1', 'B2', 'C'],
      sec: {
        I1: { ch: 'C', pan: 'e5:2 g5:1 c6:2 g5:1 e5:2 g5:2 e5:1 c5:2 e5:1 g5:2', dr: 'I1' },
        I2: { ch: 'G', li: 'lead', lead: 'r:14 c5:1 d5:1', bass: 'pump', dr: 'I2',
          pan: 'd5:2 g5:1 b5:2 g5:1 d5:2 g5:1 b5:1 d6:2 r:4' },
        // A: the hook — tresillo (3-3-2) arpeggio up, stepwise answer down; sequence on IV and V; climax bar 5
        A1: { ch: 'C C F G C Am Dm/G C', li: 'lead', comp: 'skank', bass: 'tres', cr: 1, dr: 'A A A A2 A A A Af',
          lead: 'e5:3 g5:3 c6:2 b5:2 a5:2 g5:4 | a5:3 g5:3 e5:2 g5:4 r:2 c5:1 e5:1 | f5:3 a5:3 c6:2 d6:2 c6:2 a5:4 | ' +
            'b5:3 a5:3 g5:2 d6:4 r:1 g5:1 b5:1 d6:1 | e6:3 d6:3 c6:2 g5:2 a5:2 c6:4 | e6:3 d6:3 c6:2 a5:4 r:2 a5:2 | ' +
            'd6:3 c6:3 a5:2 b5:3 a5:3 g5:2 | c6:6 r:10',
          pan: '% | %:8 c6:1 e6:1 g6:2 e6:1 c6:1 g5:2 | % | %:8 b5:1 d6:1 g6:2 d6:2 r:2 | % | % | % | ' +
            '%:8 g5:1 c6:1 e6:2 c6:1 g5:1 e5:2' },
        A2: { ch: 'C C F G C Am Dm/G C', li: 'lead', l2i: 'lead2', comp: 'skank', bass: 'tres', dr: 'A A A A2 A A A Af',
          lead: 'e5:3 g5:3 c6:2 b5:2 a5:2 g5:4 | a5:3 g5:3 e5:2 g5:4 r:2 c5:1 e5:1 | f5:3 a5:3 c6:2 d6:2 c6:2 a5:4 | ' +
            'b5:3 a5:3 g5:2 d6:4 r:1 g5:1 b5:1 d6:1 | e6:3 d6:3 c6:2 g5:2 a5:2 c6:4 | e6:3 d6:3 c6:2 a5:4 r:2 a5:2 | ' +
            'd6:3 c6:3 a5:2 b5:3 a5:3 g5:2 | c6:4 r:6 e5:2 f5:2 g5:2',
          lead2: 'r:16 | r:16 | r:16 | r:16 | c6:3 b5:3 g5:2 e5:2 f5:2 g5:4 | c6:3 b5:3 a5:2 e5:4 r:2 f5:2 | ' +
            'a5:3 a5:3 f5:2 g5:3 f5:3 d5:2 | g5:4 r:12',
          pan: '% | %:8 c6:1 e6:1 g6:2 e6:1 c6:1 g5:2 | % | %:8 b5:1 d6:1 g6:2 d6:2 r:2 | % | % | % | ' +
            '%:8 e6:1 g6:1 c7:2 g6:1 e6:1 c6:2' },
        // B: lyrical brass line over a driving octave bass; rising sequence IV-V, peak on iii, half cadence
        B1: { ch: 'F G Em Am F G C G', li: 'brass', comp: 'pad', bass: 'pump', cr: 1, dr: 'B B B B B B B Bf',
          lead: 'a5:6 g5:2 f5:2 a5:2 c6:4 | b5:6 a5:2 g5:2 b5:2 d6:4 | e6:6 d6:2 b5:4 g5:4 | a5:8 r:2 e5:2 a5:2 b5:2 | ' +
            'c6:6 d6:2 c6:2 a5:2 f5:4 | d6:6 e6:2 d6:2 b5:2 g5:4 | e6:6 d6:2 c6:2 d6:2 e6:4 | d6:8 r:2 e5:2 f5:2 g5:2',
          pan: '& | & | & | & | & | & | & | &' },
        // B': same with a harmony voice, then the bVI - bVII - I "victory" cadence on the tresillo rhythm
        B2: { ch: 'F G Em Am F G Ab/Bb C', li: 'brass', l2i: 'lead2', comp: 'pad', bass: 'pump', cr: 1, dr: 'B B B B B B Bg Bh',
          lead: 'a5:6 g5:2 f5:2 a5:2 c6:4 | b5:6 a5:2 g5:2 b5:2 d6:4 | e6:6 d6:2 b5:4 g5:4 | a5:8 r:2 e5:2 a5:2 b5:2 | ' +
            'c6:6 d6:2 c6:2 a5:2 f5:4 | d6:6 e6:2 d6:2 b5:2 g5:4 | ab5:3 c6:3 eb6:2 bb5:3 d6:3 f6:2 | g6:8 r:8',
          lead2: 'f5:6 e5:2 c5:2 f5:2 a5:4 | g5:6 f5:2 d5:2 g5:2 b5:4 | b5:6 b5:2 g5:4 e5:4 | e5:8 r:8 | ' +
            'a5:6 a5:2 a5:2 f5:2 c5:4 | b5:6 b5:2 b5:2 g5:2 d5:4 | eb5:3 ab5:3 c6:2 f5:3 bb5:3 d6:2 | e6:8 r:8',
          pan: '& | & | & | & | & | & | & | &:8 c6:1 e6:1 g6:1 c7:1 g6:1 e6:1 c6:2' },
        // C: break — steel-pan solo calls, brass answers, then long tones building back into A
        C: { ch: 'Am Am F F Dm Dm G G', li: 'brass', comp: 'pad', bass: 'long', dr: 'C C C C C C C Cf',
          lead: 'r:16 | r:10 e5:2 a5:2 c6:2 | r:16 | r:10 c5:2 f5:2 a5:2 | f5:16 | a5:12 r:4 | g5:8 b5:8 | d6:8 r:6 c5:1 d5:1',
          pan: 'a5:1 c6:1 e6:2 c6:1 a5:1 e5:2 a5:1 c6:1 e6:2 d6:2 c6:2 | b5:2 a5:2 e5:2 a5:4 r:6 | ' +
            'f5:1 a5:1 c6:2 a5:1 f5:1 c5:2 f5:1 a5:1 c6:2 d6:2 c6:2 | a5:2 g5:2 f5:2 a5:4 r:6 | ' +
            'd5:1 f5:1 a5:2 f5:1 d5:1 a4:2 d5:1 f5:1 a5:2 g5:2 f5:2 | e5:2 f5:2 g5:2 a5:4 r:6 | ' +
            'g5:1 b5:1 d6:2 b5:1 g5:1 d5:2 g5:1 b5:1 d6:2 e6:2 d6:2 | b5:2 d6:2 g6:4 r:8' },
      },
    },
    // ---- Title: the level hook, augmented and calm (ocarina-like FM lead, pan arpeggios), 92 bpm, 8 bars
    title: {
      bpm: 92, tr: -2, swing: 0.1, echo: 0.36, loop: 'T', order: ['T'], lv: { drum: 0.55, perc: 0.6, hat: 0.6, pan: 0.8, bass: 0.85 },
      sec: {
        T: { ch: 'C Am F G C Am F/G C', li: 'flute', comp: 'pad', bass: 'long', dr: 'T T T T T T T T',
          lead: 'e5:6 g5:2 c6:8 | b5:4 a5:4 g5:4 e5:4 | f5:6 a5:2 c6:8 | d6:4 c6:4 b5:6 r:2 | ' +
            'e6:6 d6:2 c6:4 g5:4 | a5:6 b5:2 c6:8 | a5:4 c6:4 b5:4 d6:4 | c6:12 r:4',
          pan: '& | & | & | & | & | & | & | &' },
      },
    },
    // ---- Stage clear: rising arpeggio fanfare I - bVI - bVII - I, ~4 s, one-shot
    clear: {
      bpm: 150, tr: -2, swing: 0, echo: 0.3, order: ['J'], barLen: 8, lv: { stab: 1.5, drum: 1.1 },
      sec: {
        J: { ch: 'C:8 Ab:8 Bb:8 C:24', li: 'lead', l2i: 'lead2', comp: 'hold', dr: 'J1 J2 J3',
          lead: 'g4:1 c5:1 e5:1 g5:3 r:2 | ab4:1 c5:1 eb5:1 ab5:3 r:2 | bb4:1 d5:1 f5:1 bb5:3 r:2 | c6:8 | ~:6 r:2 | r:8',
          lead2: 'e4:1 g4:1 c5:1 e5:3 r:2 | eb4:1 ab4:1 c5:1 eb5:3 r:2 | f4:1 bb4:1 d5:1 f5:3 r:2 | e5:8 | ~:6 r:2 | r:8',
          pan: 'r:8 | r:8 | r:8 | c6:1 e6:1 g6:1 c7:1 g6:1 e6:1 c6:1 e6:1 | g6:1 c7:3 r:4 | r:8',
          bassLine: 'c3:6 r:2 | ab2:6 r:2 | bb2:6 r:2 | c3:8 | ~:6 r:2 | r:8' },
      },
    },
    // ---- Game over: falling minor phrase, iv - V - i, one-shot
    gameover: {
      bpm: 100, tr: -2, swing: 0, echo: 0.42, order: ['O'], barLen: 8, lv: { pad: 1.5 },
      sec: {
        O: { ch: 'Am:8 Dm:4 E:4 Am:16', li: 'flute', comp: 'pad', dr: '',
          lead: 'e5:3 c5:1 a4:4 | f5:3 d5:1 b4:2 g#4:2 | a4:8 | r:8',
          pan: 'r:4 e6:2 c6:2 | r:8 | e6:1 c6:1 a5:1 e5:1 c5:1 a4:3 | r:8',
          bassLine: 'a2:8 | d3:4 e3:4 | a2:8 | r:8' },
      },
    },
  };

  // drum bars — k kick · s snare · h hats (x closed, o open) · m shaker · c congas (h/l) · t toms (1 2 3)
  // r rim/clave · C crash.   Velocity: '-' ghost, lowercase normal, UPPERCASE accent.
  const DR = {
    I1: { h: 'x.-.x.-.x.-.x.-.', c: '...h..l....h..l.' },
    I2: { k: 'x...x...x.......', h: 'x.-.x.-.........', s: '........x.xx....', t: '............1123' },
    A: { k: 'x.....x.x..x....', s: '....X.......X...', h: 'x.-.x.-.x.-.x.o.', c: '...h..l....h.ll.' },
    A2: { k: 'x.....x.x.x.....', s: '....X.......X..-', h: 'x.-.x.-.x.-.x.o.', c: '...h..l....h.ll.' },
    Af: { k: 'x.....x.x.......', s: '....X.....x.xx..', h: 'x.-.x.-.x.......', c: '...h..l.........', t: '..............23' },
    B: { k: 'x...x...x...x...', s: '....X.......X...', h: '..o...o...o...o.', m: 'x-x-x-x-x-x-x-x-' },
    Bf: { k: 'x...x...x...x...', s: '....X.......-xxX', h: '..o...o...o.....', m: 'x-x-x-x-x-x-....' },
    Bg: { k: 'X..x..x.X..x..x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', C: 'x.......x.......' },
    Bh: { k: 'X.....x.........', s: '........x..x....', t: '............1223', C: 'X...............', m: 'x-x-x-x-........' },
    C: { k: 'x.........x.....', r: 'x..x..x...x.x...', m: 'x-xxx-xxx-xxx-xx', c: '..h...l...h..ll.' },
    Cf: { k: 'x...x...x...x...', s: '....-...-.-.xxXX', m: 'x-xxx-xxx-xx....', c: '..h...l...h.....', t: '..............3.' },
    T: { k: 'x.........x.....', r: '....x.......x...', m: 'x.-.x.-.x.-.x.-.', c: '...h..l....h..l.' },
    J1: { k: '...x.......x....', s: 'xxx.....xxx.....', t: '...3.......3....' },
    J2: { k: '...x....X.......', s: 'xxx...-x........', t: '...3....3.......', C: '........X.......' },
    J3: {},
  };
  const TOM = { 1: 196, 2: 147, 3: 110 }, CONGA = { h: 392, l: 262 };
  const PANPAT = { '%': 'a.bc.bc.d.cb.cb.', '&': 'a.b.c.d.c.b.c.b.' };
  const BASSPAT = { // [step, R root | 5 fifth | 8 octave, length in steps, velocity]
    tres: [[0, 'R', 2.6, 1], [3, 'R', 2, 0.8], [6, '5', 1.7, 0.85], [8, '8', 2, 0.95], [11, 'R', 2, 0.8], [14, '5', 1.7, 0.85]],
    pump: [[0, 'R', 1.6, 1], [2, '8', 1.4, 0.72], [4, 'R', 1.6, 0.9], [6, '8', 1.4, 0.72], [8, 'R', 1.6, 1], [10, '8', 1.4, 0.72], [12, 'R', 1.6, 0.9], [14, '8', 1.4, 0.78]],
    long: [[0, 'R', 5.5, 1], [6, '5', 1.8, 0.7], [8, 'R', 5.5, 0.9], [14, '5', 1.8, 0.7]],
  };

  const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function pitch(s) {
    const m = /^([a-g])([#b]?)(-?\d)$/.exec(s);
    return m ? NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (+m[3] + 1) : null;
  }
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus: [0, 5, 7], 6: [0, 4, 7, 9] };
  function chord(name) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(name);
    if (!m || !QUAL[m[3]]) return null;
    return { pc: NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), q: QUAL[m[3]], name: name };
  }
  const wrap = (n, lo) => lo + ((((n - lo) % 12) + 12) % 12); // pitch class of n placed in [lo, lo+12)
  const voicing = (c, tr, lo, max) => c.q.slice(0, max).map(iv => wrap(c.pc + iv + tr, lo)).sort((a, b) => a - b);

  function parseLine(str, barLen, errs, tag) {
    const out = [], toks = String(str).trim().split(/\s+/);
    let pos = 0, last = null, bar = 0;
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (!tk) continue;
      if (tk === '|') { bar++; if (pos % barLen) errs.push(tag + ': bar ' + bar + ' ends at step ' + pos); continue; }
      const m = /^([^:!,']+)(?::([\d.]+))?([!,']*)$/.exec(tk);
      if (!m) { errs.push(tag + ': bad token "' + tk + '"'); continue; }
      const h = m[1], auto = h === '%' || h === '&', d = m[2] ? parseFloat(m[2]) : auto ? 16 : 1;
      if (h === '~') { if (last) last.d += d; else errs.push(tag + ': tie without a note at step ' + pos); }
      else if (h === 'r') last = null;
      else if (auto) { out.push({ p: pos, auto: h, d: d }); last = null; }
      else {
        const n = pitch(h);
        if (n == null) errs.push(tag + ': bad pitch "' + tk + '"');
        else { last = { p: pos, n: n, d: d, v: m[3].indexOf('!') >= 0 ? 1.2 : m[3].indexOf(',') >= 0 ? 0.7 : 1, st: m[3].indexOf("'") >= 0 }; out.push(last); }
      }
      pos += d;
    }
    return { ev: out, len: pos };
  }

  const compiled = {};
  function getSong(name) {
    if (compiled[name]) return compiled[name];
    const def = SONGS[name];
    if (!def) return null;
    const errs = [], steps = [], barLen = def.barLen || 16, tr = def.tr || 0;
    let off = 0, loopFrom = -1;
    const add = (pos, ev) => { (steps[pos] || (steps[pos] = [])).push(ev); };
    def.order.forEach(sn => {
      const S = def.sec[sn], tag = name + '.' + sn;
      if (sn === def.loop) loopFrom = off;
      // chord track -> chord per step
      const chAt = [];
      S.ch.split(/\s+/).forEach(tk => {
        const ex = tk.split(':'), parts = ex.length > 1 ? [ex[0]] : tk.split('/'), n = ex.length > 1 ? +ex[1] : 16 / parts.length;
        parts.forEach(pn => { const c = chord(pn); if (!c) errs.push(tag + ': bad chord "' + pn + '"'); for (let i = 0; i < n; i++) chAt.push(c || chord('C')); });
      });
      const len = chAt.length;
      // melodic lines
      const line = (str, inst, vel) => {
        if (!str) return;
        const L = parseLine(str, barLen, errs, tag + '.' + inst);
        if (L.len !== len) errs.push(tag + '.' + inst + ': ' + L.len + ' steps, expected ' + len);
        L.ev.forEach(e => {
          if (e.p >= len) return;
          if (!e.auto) { add(off + e.p, { i: inst, n: e.n + tr, d: e.d, v: e.v * vel, st: e.st }); return; }
          for (let q = 0; q < e.d && e.p + q < len; q++) { // automatic steel-pan figure
            const s = e.p + q, ch = PANPAT[e.auto][s % 16];
            if (ch === '.') continue;
            const t = voicing(chAt[s], tr, 62, 3), n = ch === 'd' ? t[0] + 12 : t[ch.charCodeAt(0) - 97];
            add(off + s, { i: inst, n: n, d: 1.5, v: vel * (s % 16 % 8 % 3 === 0 && e.auto === '%' ? 0.95 : 0.66) });
          }
        });
      };
      line(S.lead, S.li || 'lead', 1);
      line(S.lead2, S.l2i || 'lead2', 0.62);
      line(S.pan, 'pan', 1);
      line(S.bassLine, 'bass', 1);
      // generated bass
      if (S.bass && BASSPAT[S.bass]) for (let b = 0; b < len; b += 16) BASSPAT[S.bass].forEach(p => {
        const s = b + p[0];
        if (s >= len) return;
        const r = wrap(chAt[s].pc + tr, 40);
        add(off + s, { i: 'bass', n: p[1] === 'R' ? r : p[1] === '5' ? (r + 7 <= 53 ? r + 7 : r - 5) : (r >= 47 ? r - 12 : r + 12), d: p[2], v: p[3] });
      });
      else if (S.bass) errs.push(tag + ': unknown bass style ' + S.bass);
      // chords
      if (S.comp === 'skank') { for (let s = 2; s < len; s += 4) add(off + s, { i: 'stab', n: voicing(chAt[s], tr, 55, 4), d: 1.1, v: s % 8 === 6 ? 1 : 0.8 }); }
      else if (S.comp === 'pad' || S.comp === 'hold') {
        for (let s = 0; s < len;) {
          let e = s + 1;
          while (e < len && e % 16 && chAt[e] === chAt[s]) e++;
          add(off + s, { i: S.comp, n: voicing(chAt[s], tr, 55, 4), d: e - s - (S.comp === 'pad' ? 0.3 : 1), v: 1 });
          s = e;
        }
      } else if (S.comp) errs.push(tag + ': unknown comp style ' + S.comp);
      // drums
      (S.dr ? S.dr.split(/\s+/) : []).forEach((bn, bi) => {
        const D = DR[bn];
        if (!D) { errs.push(tag + ': unknown drum bar ' + bn); return; }
        Object.keys(D).forEach(k => {
          const row = D[k];
          if (row.length !== 16) errs.push('drum bar ' + bn + '.' + k + ' has ' + row.length + ' steps');
          for (let s = 0; s < 16 && bi * 16 + s < len; s++) {
            const c = row[s];
            if (c === '.') continue;
            const lc = c.toLowerCase(), v = c === '-' ? 0.45 : c !== lc ? 1.15 : 0.85, at = off + bi * 16 + s;
            if (k === 'h') add(at, { i: lc === 'o' ? 'o' : 'h', v: v * (c === '-' ? 1.2 : 1) });
            else if (k === 'c') add(at, { i: 'c', n: CONGA[lc] || 330, v: v });
            else if (k === 't') add(at, { i: 't', n: TOM[c] || 147, v: 0.95 });
            else add(at, { i: k, v: v });
          }
        });
      });
      if (S.cr) add(off, { i: 'C', v: 0.85 });
      off += len;
    });
    // identical chord objects per (bar, name) are compared by reference above: chord() returns a new
    // object per token, so "C C" re-triggers the pad on each bar (wanted) and "C:24" holds.
    const song = { name: name, def: def, sd: 60 / def.bpm / 4, steps: steps, len: off, loopFrom: loopFrom, swing: def.swing || 0, errs: errs };
    if (errs.length && window.console) console.warn('G.audio song "' + name + '":\n' + errs.join('\n'));
    return (compiled[name] = song);
  }

  //@@PART3@@
})();
