/* Pompom Parade - WebAudio only: synthesized SFX + generative 16-step music. No audio files. */
(function () {
  'use strict';
  var PP = window.PP;
  var A = PP.audio = {
    ctx: null, ok: false, musicOn: true, sfxOn: true, platformOn: true, paused: false,
    voices: 0, wantMusic: null, playing: null
  };
  var ctx, master, comp, musicGain, sfxGain, noiseBuf;
  var last = {};            // per-sound last play time (rate limiting)
  var LIMITS = { shot: 1 / 12, pop: 1 / 16, hit: 1 / 14, tink: 1 / 10, button: 1 / 14, lost: 1 / 6, click: 0.03 };

  function mk() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = A.ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 1;
      musicGain = ctx.createGain(); sfxGain = ctx.createGain();
      musicGain.connect(master); sfxGain.connect(master);
      master.connect(comp); comp.connect(ctx.destination);
      var len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.ok = true;
      A.applyGains();
      return true;
    } catch (e) { A.ok = false; return false; }
  }

  /* created + resumed on the first pointerdown / keydown */
  A.unlock = function () {
    if (PP.params.mute === '1' || PP.headlessAudio) return;
    if (!ctx) { if (!mk()) return; }
    if (ctx.state === 'suspended' && !A.paused) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    if (A.wantMusic && !A.playing) startScheduler();
  };

  A.applyGains = function () {
    if (!A.ok) return;
    var live = A.platformOn && !A.paused;
    musicGain.gain.value = live && A.musicOn ? 0.22 : 0;
    sfxGain.gain.value = live && A.sfxOn ? 0.5 : 0;
  };
  A.setSettings = function (music, sfx) { A.musicOn = !!music; A.sfxOn = !!sfx; A.applyGains(); if (!A.sfxOn) A.beam(false); };
  A.setPlatformEnabled = function (on) {
    A.platformOn = !!on; A.applyGains();
    if (on && A.wantMusic && !A.playing && A.ok) startScheduler();
  };
  A.pause = function () {
    A.paused = true; A.applyGains(); A.beam(false);
    if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } }
  };
  A.resume = function () {
    A.paused = false; A.applyGains();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
  };

  /* ---------- primitive voices ---------- */
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f0, f1, dur, peak, delay, dest, vib) {
    if (A.voices >= 24) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vib; lg.gain.value = f0 * 0.06; l.connect(lg); lg.connect(o.frequency);
      l.start(t); l.stop(t + dur + 0.02);
    }
    env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(dest || sfxGain);
    A.voices++;
    o.onended = function () { A.voices--; };
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, peak, ftype, freq, q, delay, dest, f1) {
    if (A.voices >= 24) return;
    var t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain(); env(g, t, 0.003, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxGain);
    A.voices++;
    s.onended = function () { A.voices--; };
    s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  }
  function filtTone(type, f0, f1, dur, peak, lp0, lp1, delay) {
    if (A.voices >= 24) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.type = 'lowpass'; f.frequency.setValueAtTime(lp0, t); f.frequency.exponentialRampToValueAtTime(lp1, t + dur);
    env(g, t, 0.006, peak, dur);
    o.connect(f); f.connect(g); g.connect(sfxGain);
    A.voices++;
    o.onended = function () { A.voices--; };
    o.start(t); o.stop(t + dur + 0.02);
  }

  /* ---------- SFX recipes ---------- */
  var S = {
    shot_wand: function () { tone('sine', 880, 1320, 0.04, 0.16); },
    shot_shaker: function () { tone('triangle', 1500, 1500, 0.02, 0.1); tone('triangle', 1800, 1800, 0.02, 0.1, 0.025); tone('triangle', 2100, 2100, 0.02, 0.1, 0.05); },
    shot_gumball: function () { tone('sine', 220, 110, 0.12, 0.3); noise(0.015, 0.2, 'highpass', 3000, 1); },
    shot_star: function () { tone('sine', 1047, 1047, 0.07, 0.12); tone('sine', 1568, 1568, 0.09, 0.1, 0.04); },
    shot_cookie: function () { filtTone('square', 180, 240, 0.16, 0.12, 400, 2400); },
    shot_confetti: function () { noise(0.07, 0.25, 'bandpass', 1800, 2); },
    shot_beam: function () { /* looped pad, see A.beam */ },
    pop: function () {
      var p = 0.9 + Math.random() * 0.2;
      noise(0.03, 0.3, 'bandpass', 2000 * p, 1.5); tone('sine', 600 * p, 200 * p, 0.08, 0.28);
    },
    hit: function () { tone('triangle', 500, 380, 0.03, 0.08); },
    tink: function () { tone('sine', 2400, 2000, 0.04, 0.12); },
    gate_good: function () { tone('triangle', 523.25, 0, 0.09, 0.3); tone('triangle', 659.25, 0, 0.09, 0.3, 0.06); tone('triangle', 783.99, 0, 0.14, 0.3, 0.12); },
    gate_bad: function () { tone('square', 400, 200, 0.2, 0.14); },
    lost: function () { tone('sine', 300, 150, 0.22, 0.28, 0, null, 8); },
    button: function () { tone('sine', 1320, 0, 0.05, 0.14); tone('sine', 1760, 0, 0.06, 0.14, 0.05); },
    pickup: function () { tone('triangle', 880, 1320, 0.1, 0.2); tone('triangle', 1320, 1760, 0.1, 0.16, 0.07); },
    shield: function () { tone('sine', 500, 900, 0.18, 0.2); },
    slam: function () { tone('sine', 60, 40, 0.3, 0.7); noise(0.18, 0.3, 'lowpass', 500, 1); },
    roar: function () { filtTone('sawtooth', 190, 120, 0.32, 0.3, 900, 500); noise(0.2, 0.06, 'bandpass', 800, 3); },
    warn: function () { tone('square', 660, 0, 0.07, 0.08); tone('square', 660, 0, 0.07, 0.08, 0.14); },
    card: function () { tone('triangle', 700, 1050, 0.1, 0.2); },
    click: function () { tone('triangle', 900, 700, 0.05, 0.16); },
    buy: function () { tone('triangle', 660, 0, 0.07, 0.25); tone('triangle', 880, 0, 0.07, 0.25, 0.07); tone('triangle', 1320, 0, 0.14, 0.25, 0.14); },
    star: function (i) { var f = [784, 988, 1175][i || 0]; tone('triangle', f, 0, 0.2, 0.3); tone('sine', f * 2, 0, 0.25, 0.12, 0.02); },
    win: function () {
      var n = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      for (var i = 0; i < 5; i++) tone('triangle', n[i], 0, i === 4 ? 0.5 : 0.14, 0.3, i * 0.12);
    },
    lose: function () {
      var n = [392, 349.2, 293.7];
      for (var i = 0; i < 3; i++) tone('triangle', n[i], n[i] * 0.94, 0.3, 0.28, i * 0.26, null, 6);
    },
    bossdown: function () { for (var i = 0; i < 6; i++) tone('triangle', 400 + i * 150, 0, 0.12, 0.25, i * 0.07); noise(0.4, 0.3, 'bandpass', 1500, 0.7); },
    cheer: function () { for (var i = 0; i < 4; i++) tone('sine', 700 + Math.random() * 600, 1200 + Math.random() * 600, 0.12, 0.1, i * 0.05); }
  };

  A.sfx = function (name, arg) {
    if (PP.headless || !A.ok || !A.sfxOn || A.paused || !A.platformOn || ctx.state !== 'running') return;
    var grp = name.indexOf('shot_') === 0 ? 'shot' : name;
    var lim = LIMITS[grp];
    if (lim) {
      var t = ctx.currentTime;
      if (last[grp] !== undefined && t - last[grp] < lim) return;
      last[grp] = t;
    }
    var f = S[name];
    if (f) { try { f(arg); } catch (e) { /* never crash the game for a sound */ } }
  };

  /* looping saw pad while the Rainbow Beam is active */
  var beamOsc = null, beamGain = null;
  A.beam = function (on) {
    if (!A.ok) return;
    if (on && !PP.headless && A.sfxOn && !A.paused && ctx.state === 'running') {
      if (beamOsc) return;
      try {
        beamOsc = ctx.createOscillator(); beamOsc.type = 'sawtooth'; beamOsc.frequency.value = 196;
        var o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 294.5;
        var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        beamGain = ctx.createGain(); beamGain.gain.value = 0.0001;
        beamGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.15);
        beamOsc.connect(f); o2.connect(f); f.connect(beamGain); beamGain.connect(sfxGain);
        beamOsc.start(); o2.start(); beamOsc._o2 = o2;
      } catch (e) { beamOsc = null; }
    } else if (!on && beamOsc) {
      try {
        var t = ctx.currentTime;
        beamGain.gain.cancelScheduledValues(t); beamGain.gain.setValueAtTime(beamGain.gain.value, t);
        beamGain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
        beamOsc.stop(t + 0.15); beamOsc._o2.stop(t + 0.15);
      } catch (e) { /* ignore */ }
      beamOsc = null; beamGain = null;
    }
  };

  /* ---------- generative music ---------- */
  var MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  var WORLDS = [null,
    { root: 60, bpm: 110, minor: false }, { root: 65, bpm: 116, minor: false }, { root: 55, bpm: 104, minor: false },
    { root: 62, bpm: 112, minor: false }, { root: 57, bpm: 120, minor: true }];
  var seq = { timer: 0, step: 0, next: 0, w: null, boss: false, melody: null, key: '' };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function degNote(scale, d) { var o = Math.floor(d / 7); return scale[((d % 7) + 7) % 7] + 12 * o; }
  function chord(w, bar, boss) {
    var scale = w.minor ? MIN : MAJ;
    var prog = w.minor ? [0, 5, 2, 6] : [0, 4, 5, 3];
    var d = prog[bar % 4];
    var c = [degNote(scale, d), degNote(scale, d + 2), degNote(scale, d + 4)];
    if (boss && !w.minor && d === 3) c[1] -= 1; // minor IV on the boss track
    return c;
  }
  function genMelody(w, seed) {
    var r = PP.util.rng(seed), m = [], idx = 3;
    for (var bar = 0; bar < 8; bar++) {
      var c = chord(w, bar, false);
      var tones = [c[0], c[1], c[2], c[0] + 12, c[1] + 12, c[2] + 12];
      for (var s = 0; s < 16; s++) {
        var on = (s % 4 === 0) ? r() < 0.8 : ((s % 2 === 0) ? r() < 0.45 : r() < 0.08);
        if (bar % 4 === 3 && s > 11) on = false;
        if (on) { idx += r.int(-1, 1); if (idx < 0) idx = 1; if (idx > 5) idx = 4; m.push(tones[idx]); } else m.push(-1);
      }
    }
    return m;
  }
  function mNote(type, midi, t, dur, peak, lp) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(musicGain); o.start(t); o.stop(t + dur + 0.03);
  }
  function mKick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.18);
  }
  function mHat(t, peak) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    var g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t, Math.random() * 0.3); s.stop(t + 0.06);
  }
  function schedStep(step, t) {
    var w = seq.w, bar = Math.floor(step / 16), s = step % 16;
    var c = chord(w, bar, seq.boss), root = w.root;
    var sd = 60 / (w.bpm + (seq.boss ? 12 : 0)) / 4;
    if (s === 0 || s === 8 || (seq.boss && s === 12)) mKick(t);
    if (s % 4 === 2) mHat(t, 0.18); else if (s % 2 === 1 && seq.boss) mHat(t, 0.07);
    if (s === 0 || s === 6 || s === 8 || s === 12) mNote('triangle', root - 24 + c[0], t, sd * 2.2, 0.75);
    if (s % 2 === 0) { var a = c[(s / 2) % 3] + (s % 8 >= 6 ? 12 : 0); mNote('square', root + a, t, sd * 1.4, 0.06 / 0.22 * 0.5, 2400); }
    if (s === 0) for (var i = 0; i < 3; i++) mNote('sine', root - 12 + c[i], t, sd * 15, 0.16);
    var m = seq.melody[step % 128];
    if (m >= 0) mNote('triangle', root + 12 + m, t, sd * 2.6, 0.34);
  }
  function tick() {
    if (!A.ok || !seq.w || ctx.state !== 'running') return;
    var sd = 60 / (seq.w.bpm + (seq.boss ? 12 : 0)) / 4;
    if (seq.next < ctx.currentTime) seq.next = ctx.currentTime + 0.05;
    while (seq.next < ctx.currentTime + 0.1) {
      if (A.musicOn && A.platformOn) { try { schedStep(seq.step, seq.next); } catch (e) { /* ignore */ } }
      seq.step = (seq.step + 1) % 128; seq.next += sd;
    }
  }
  function startScheduler() {
    if (!A.ok || !A.platformOn || !A.wantMusic) return; // platform muted at boot: never start
    var want = A.wantMusic;
    seq.w = WORLDS[want.world] || WORLDS[1]; seq.boss = !!want.boss;
    var key = want.world + (want.boss ? 'b' : '');
    if (seq.key !== key) { seq.key = key; seq.step = 0; seq.melody = genMelody(seq.w, 1000 + want.world * 77 + (want.boss ? 5 : 0)); seq.next = 0; }
    if (!seq.timer) seq.timer = setInterval(tick, 40);
    A.playing = key;
  }
  /* world 1..5, boss flag. music(0) stops. */
  A.music = function (world, boss) {
    if (!world) {
      A.wantMusic = null; A.playing = null; seq.key = '';
      if (seq.timer) { clearInterval(seq.timer); seq.timer = 0; }
      return;
    }
    A.wantMusic = { world: world, boss: !!boss };
    if (A.ok) startScheduler();
  };
})();
