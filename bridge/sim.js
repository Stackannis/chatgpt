/* Pompom Bridge: pure deterministic simulation (no DOM). Runs in browser and node. */
(function (root) {
  'use strict';
  var CFG = {
    DT: 1 / 60,
    SQUAD_Y: 0.07, CONTACT_Y: 0.16,
    FARM_X: 0.125, FARM_EDGE: 0.2, TREAS_X: 0.875, TREAS_EDGE: 0.8,
    HORDE_X0: 0.26, HORDE_X1: 0.74, TREAS_X0: 0.78,
    X_MIN: 0.1, X_MAX: 0.9,
    COLS: 11, ROW_SP: 0.03, START_FRONT: 0.9,
    HORDE_V0: 0.0175, HORDE_V1: 0.02,      // speed = V0 + V1 * t/90
    G_HP0: 1, G_HP1: 0.7,                  // grumbly hp = HP0 + HP1 * t/90
    SPILL_GAP: 0.05, SPILL_V: 0.05,
    LOSS_RATE: 0.4,                        // squad lost per second per column in contact
    D0: 3.2, DP: 0.72, HERO_MULT: 1.8, SQUAD_MAX: 99,
    SHOT_V: 1.9, SPREAD0: 0.03, SPREAD1: 0.01, SPREAD_MAX: 0.09,
    TILE_SP: 0.09, TILE_V: 0.14, TILE_N: 13,
    TREAS_HP: 360, TREAS_Y: 0.5, GOLD_N: 6, GOLD_VAL: 5, GOLD_V: 0.2, GOLD_SP: 0.085,
    BOSS: [{ t: 32, hp: 300, dur: 22 }, { t: 68, hp: 1400, dur: 24 }],
    BOSS_HW: 0.085, BOSS_REACH: 0.1, BOSS_PUSH: 0.14,
    STAR2: 60, STAR3: 85
  };
  var CW = (CFG.HORDE_X1 - CFG.HORDE_X0) / CFG.COLS;
  var EV = { POP: 1, PLUS: 2, LOST: 3, THIT: 4, BREAK: 5, BOSSIN: 6, BOSSHIT: 7, BOSSDOWN: 8, GOLD: 9, WIN: 10, LOSE: 11, SHOT: 12 };
  var MAX_SHOTS = 96, MAX_EV = 96;

  function Sim(seed) {
    var C = CFG.COLS;
    this.front = new Float64Array(C); this.colHp = new Float64Array(C);
    this.killed = new Int32Array(C); this.phase = new Float64Array(C);
    this.shX = new Float64Array(MAX_SHOTS); this.shY = new Float64Array(MAX_SHOTS); this.shD = new Float64Array(MAX_SHOTS);
    this.tileY = new Float64Array(CFG.TILE_N);
    this.goldY = new Float64Array(CFG.GOLD_N); this.goldOn = new Uint8Array(CFG.GOLD_N);
    this.evT = new Uint8Array(MAX_EV); this.evX = new Float64Array(MAX_EV); this.evY = new Float64Array(MAX_EV); this.evV = new Float64Array(MAX_EV);
    this.boss = { active: false, hp: 0, max: 0, y: 1, x: 0.5, speed: 0, idx: -1, final: false };
    this.bot = {};
    this.reset(seed);
  }
  Sim.prototype.reset = function (seed) {
    var i, C = CFG.COLS;
    this.seed = (seed >>> 0) || 1; this.rs = this.seed;
    this.t = 0; this.result = null; this.reason = ''; this.stars = 0;
    this.squad = 1; this.sx = 0.5; this.tx = 0.5; this.moveSpeed = 5;
    this.hero = false; this.fireAcc = 0; this.lossAcc = 0; this.shotCount = 0;
    this.nShots = 0; this.evN = 0; this.kills = 0; this.contact = 0; this.minFront = CFG.START_FRONT;
    for (i = 0; i < C; i++) {
      this.front[i] = CFG.START_FRONT + this.rand() * 0.05; this.colHp[i] = CFG.G_HP0;
      this.killed[i] = 0; this.phase[i] = this.rand() * 6.283;
    }
    for (i = 0; i < CFG.TILE_N; i++) this.tileY[i] = 0.25 + i * CFG.TILE_SP;
    for (i = 0; i < CFG.GOLD_N; i++) { this.goldOn[i] = 0; this.goldY[i] = 0; }
    this.trHp = CFG.TREAS_HP; this.goldLeft = 0;
    this.boss.active = false; this.boss.idx = -1; this.boss.hp = 0; this.bossNext = 0; this.bossLeft = 0;
    var b = this.bot; b.mode = 'grow'; b.tx = 0.5; b.pend = 0.5; b.pendAt = 0; b.next = 0; b.idleUntil = 0; b.nextIdle = 3 + this.rand() * 5;
  };
  Sim.prototype.rand = function () { // mulberry32
    var t = (this.rs += 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Sim.prototype.ev = function (type, x, y, v) {
    if (this.evN >= MAX_EV) return;
    var i = this.evN++; this.evT[i] = type; this.evX[i] = x; this.evY[i] = y; this.evV[i] = v || 0;
  };
  Sim.prototype.dps = function () { return CFG.D0 * Math.pow(this.squad, CFG.DP) * (this.hero ? CFG.HERO_MULT : 1); };
  Sim.prototype.spread = function () { return Math.min(CFG.SPREAD0 + CFG.SPREAD1 * Math.sqrt(this.squad), CFG.SPREAD_MAX); };
  Sim.prototype.gHp = function () { return CFG.G_HP0 + CFG.G_HP1 * this.t / 90; };
  Sim.prototype.firing = function () { return this.sx >= CFG.FARM_EDGE; };
  Sim.prototype.duration = function () { var b = CFG.BOSS[CFG.BOSS.length - 1]; return b.t + b.dur; };

  Sim.prototype.finish = function (res, reason) {
    this.result = res; this.reason = reason;
    this.stars = res === 'win' ? (this.squad >= CFG.STAR3 ? 3 : this.squad >= CFG.STAR2 ? 2 : 1) : 0;
    this.ev(res === 'win' ? EV.WIN : EV.LOSE, this.sx, CFG.SQUAD_Y, 0);
  };

  Sim.prototype.step = function () {
    if (this.result) return;
    var dt = CFG.DT, C = CFG.COLS, i, c, B = this.boss;
    this.t += dt;
    // move squad
    var d = this.tx - this.sx, m = this.moveSpeed * dt;
    this.sx += d > m ? m : d < -m ? -m : d;
    if (this.sx < CFG.X_MIN) this.sx = CFG.X_MIN; else if (this.sx > CFG.X_MAX) this.sx = CFG.X_MAX;
    // fire
    if (this.firing()) {
      var rate = Math.min(3 + 1.2 * this.squad, 30), dmg = this.dps() / rate, sp = this.spread();
      this.fireAcc += rate * dt;
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1;
        if (this.nShots < MAX_SHOTS) {
          var u = (this.shotCount++ * 0.6180339887) % 1;
          i = this.nShots++; this.shX[i] = this.sx + (u * 2 - 1) * sp; this.shY[i] = CFG.SQUAD_Y + 0.02 + this.fireAcc * 0.02; this.shD[i] = dmg;
        }
      }
    } else this.fireAcc = 0;
    // shots
    var ghp = this.gHp();
    for (i = this.nShots - 1; i >= 0; i--) {
      var y = (this.shY[i] += CFG.SHOT_V * dt), x = this.shX[i], hit = false;
      if (x >= CFG.HORDE_X0 && x < CFG.HORDE_X1) {
        c = ((x - CFG.HORDE_X0) / CW) | 0;
        if (B.active && Math.abs(x - B.x) < CFG.BOSS_HW && y >= B.y - CFG.BOSS_REACH) {
          B.hp -= this.shD[i]; hit = true; this.ev(EV.BOSSHIT, x, B.y - CFG.BOSS_REACH, 0);
        } else if (y >= this.front[c]) {
          hit = true;
          if (this.front[c] < 0.995) {
            this.colHp[c] -= this.shD[i];
            while (this.colHp[c] <= 0 && this.front[c] < 0.995) {
              this.ev(EV.POP, CFG.HORDE_X0 + (c + 0.5) * CW, this.front[c], c);
              this.front[c] += CFG.ROW_SP; this.killed[c]++; this.kills++; this.colHp[c] += ghp;
            }
            if (this.colHp[c] <= 0) this.colHp[c] = ghp;
          }
        }
      } else if (x >= CFG.TREAS_X0 && this.trHp > 0 && y >= CFG.TREAS_Y) {
        hit = true; this.trHp -= this.shD[i]; this.ev(EV.THIT, x, CFG.TREAS_Y, 0);
        if (this.trHp <= 0) {
          this.trHp = 0; this.hero = true; this.goldLeft = CFG.GOLD_N;
          for (c = 0; c < CFG.GOLD_N; c++) { this.goldOn[c] = 1; this.goldY[c] = CFG.TREAS_Y + c * CFG.GOLD_SP; }
          this.ev(EV.BREAK, CFG.TREAS_X, CFG.TREAS_Y, 0);
        }
      }
      if (hit || y > 1.03) { var l = --this.nShots; this.shX[i] = this.shX[l]; this.shY[i] = this.shY[l]; this.shD[i] = this.shD[l]; }
    }
    // horde march
    var v = CFG.HORDE_V0 + CFG.HORDE_V1 * this.t / 90, contact = 0, mf = 2;
    for (c = 0; c < C; c++) {
      var f = this.front[c] - v * (1 + 0.35 * Math.sin(this.t * 0.7 + this.phase[c])) * dt;
      var nb = Math.min(c > 0 ? this.front[c - 1] : 2, c < C - 1 ? this.front[c + 1] : 2);
      if (f > nb + CFG.SPILL_GAP) f -= CFG.SPILL_V * dt;
      if (f <= CFG.CONTACT_Y) { f = CFG.CONTACT_Y; contact++; }
      this.front[c] = f; if (f < mf) mf = f;
    }
    this.contact = contact; this.minFront = mf;
    if (contact) {
      this.lossAcc += contact * CFG.LOSS_RATE * dt;
      while (this.lossAcc >= 1 && this.squad > 0) { this.lossAcc -= 1; this.squad--; this.ev(EV.LOST, this.sx, CFG.SQUAD_Y, 0); }
      if (this.squad <= 0) { this.finish('lose', 'horde'); return; }
    }
    // +1 conveyor
    var farm = this.sx < CFG.FARM_EDGE;
    for (i = 0; i < CFG.TILE_N; i++) {
      var ty = (this.tileY[i] -= CFG.TILE_V * dt);
      if (farm && ty <= CFG.SQUAD_Y + 0.03 && ty > CFG.SQUAD_Y - 0.03) {
        if (this.squad < CFG.SQUAD_MAX) this.squad++;
        this.ev(EV.PLUS, CFG.FARM_X, CFG.SQUAD_Y, 1); this.tileY[i] = ty + CFG.TILE_N * CFG.TILE_SP;
      } else if (ty < -0.12) this.tileY[i] = ty + CFG.TILE_N * CFG.TILE_SP;
    }
    // gold tiles
    if (this.goldLeft > 0) {
      var tre = this.sx > CFG.TREAS_EDGE;
      for (i = 0; i < CFG.GOLD_N; i++) if (this.goldOn[i]) {
        var gy = (this.goldY[i] -= CFG.GOLD_V * dt);
        if (tre && gy <= CFG.SQUAD_Y + 0.03 && gy > CFG.SQUAD_Y - 0.03) {
          this.squad = Math.min(CFG.SQUAD_MAX, this.squad + CFG.GOLD_VAL);
          this.goldOn[i] = 0; this.goldLeft--; this.ev(EV.GOLD, CFG.TREAS_X, CFG.SQUAD_Y, CFG.GOLD_VAL);
        } else if (gy < -0.12) { this.goldOn[i] = 0; this.goldLeft--; }
      }
    }
    // boss
    if (!B.active && this.bossNext < CFG.BOSS.length && this.t >= CFG.BOSS[this.bossNext].t) {
      var bd = CFG.BOSS[this.bossNext];
      B.active = true; B.idx = this.bossNext++; B.hp = B.max = bd.hp; B.y = 1; B.x = 0.5;
      B.speed = (1 - CFG.CONTACT_Y) / bd.dur; B.final = this.bossNext >= CFG.BOSS.length;
      this.ev(EV.BOSSIN, 0.5, 1, B.idx);
    }
    if (B.active) {
      B.y -= B.speed * dt; B.x = 0.5 + 0.1 * Math.sin((this.t - CFG.BOSS[B.idx].t) * 0.45);
      if (B.hp <= 0) {
        B.active = false; B.hp = 0; this.ev(EV.BOSSDOWN, B.x, B.y, B.idx);
        for (c = 0; c < C; c++) this.front[c] = Math.min(1, this.front[c] + CFG.BOSS_PUSH);
        if (B.final) { this.finish('win', 'boss'); return; }
      } else if (B.y <= CFG.CONTACT_Y) { this.bossLeft = Math.ceil(B.hp); this.finish('lose', 'boss'); return; }
    }
  };

  /* ---------------- bots (also used by ?autoplay=) ---------------- */
  var BOTS = {
    smart:    { react: 0.1, lo: 0.33, hi: 0.56, noise: 0, idle: 0, speed: 1.8, farmTo: 24, treasure: true, farm: true },
    mediocre: { react: 0.4, lo: 0.37, hi: 0.63, noise: 0.035, idle: 1.0, speed: 1.2, farmTo: 24, treasure: true, farm: true },
    notreasure: { react: 0.1, lo: 0.33, hi: 0.56, noise: 0, idle: 0, speed: 1.8, farmTo: 24, treasure: false, farm: true },
    horde:    { react: 0.1, lo: 2, hi: 3, noise: 0, idle: 0, speed: 1.8, farmTo: 0, treasure: false, farm: false },
    farm:     { react: 0.1, lo: -1, hi: -1, noise: 0, idle: 0, speed: 1.8, farmTo: 999, treasure: false, farm: true, only: true },
    greedy:   { react: 0.1, lo: 0.24, hi: 0.5, noise: 0, idle: 0, speed: 1.8, farmTo: 999, treasure: false, farm: true },
    treasurefirst: { react: 0.1, lo: 0.36, hi: 0.56, noise: 0, idle: 0, speed: 1.8, farmTo: 1, treasure: true, farm: true }
  };
  Sim.prototype.botGoal = function (P) {
    var b = this.bot, B = this.boss, C = CFG.COLS, c, best = 0, bs = 9;
    if (P.only) return CFG.FARM_X;
    for (c = 0; c < C; c++) {
      var s = this.front[c] + 0.25 * Math.abs(CFG.HORDE_X0 + (c + 0.5) * CW - this.sx);
      if (s < bs) { bs = s; best = c; }
    }
    var sweep = CFG.HORDE_X0 + (best + 0.5) * CW;
    if (b.mode === 'grow' && this.minFront < P.lo) b.mode = 'hold';
    else if (b.mode === 'hold' && this.minFront > P.hi) b.mode = 'grow';
    if (B.active) {
      var eta = (B.y - CFG.CONTACT_Y) / B.speed, need = B.hp / this.dps();
      if (!(this.minFront < 0.22 && need < eta - 4)) {
        if (need > eta - 9 || B.y < 0.6 || b.mode === 'hold' || !P.farm) return B.x;
      }
    }
    if (this.goldLeft > 0 && P.treasure && this.minFront > 0.24) return CFG.TREAS_X;
    if (b.mode === 'hold') return sweep;
    if (P.treasure && this.trHp > 0 && (this.squad >= P.farmTo || this.trHp < CFG.TREAS_HP) && this.trHp / this.dps() < (P.trTime || 12)) return CFG.TREAS_X;
    if (P.farm && this.squad < CFG.SQUAD_MAX) return CFG.FARM_X;
    if (P.treasure && this.trHp > 0) return CFG.TREAS_X;
    return P.farm ? CFG.FARM_X : sweep;
  };
  Sim.prototype.botStep = function (kind) {
    var P = BOTS[kind] || BOTS.smart, b = this.bot;
    this.moveSpeed = P.speed;
    if (this.t >= b.next) {
      b.next = this.t + 0.12;
      if (P.idle && this.t >= b.nextIdle) { b.idleUntil = this.t + P.idle * (0.5 + this.rand()); b.nextIdle = this.t + 4 + this.rand() * 6; }
      if (this.t >= b.idleUntil) {
        var g = this.botGoal(P);
        if (Math.abs(g - b.pend) > 0.02) { b.pend = g + (P.noise ? (this.rand() * 2 - 1) * P.noise : 0); b.pendAt = this.t + P.react * (P.noise ? 0.6 + this.rand() * 0.8 : 1); }
      }
    }
    if (this.t >= b.pendAt) b.tx = b.pend;
    this.tx = b.tx;
  };
  /* Headless run. Returns summary. */
  function run(kind, seed) {
    var s = new Sim(seed), maxSquad = 1, breakT = -1, guard = 0;
    while (!s.result && guard++ < 60 * 200) {
      s.botStep(kind); s.step(); s.evN = 0;
      if (s.squad > maxSquad) maxSquad = s.squad;
      if (breakT < 0 && s.trHp <= 0) breakT = s.t;
    }
    return { result: s.result || 'timeout', reason: s.reason, t: s.t, squad: s.squad, maxSquad: maxSquad, breakT: breakT, bossLeft: s.bossLeft, bossIdx: s.boss.idx, stars: s.stars };
  }

  var api = { CFG: CFG, EV: EV, Sim: Sim, BOTS: BOTS, run: run, CW: CW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BridgeSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
