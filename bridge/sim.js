/* Pompom Bridge: pure deterministic simulation (no DOM). Runs in browser and node.
   Coordinates: x 0..1 across the bridge, y 0 (near, player) .. 1 (far end). */
(function (root) {
  'use strict';
  var CFG = {
    DT: 1 / 60,
    SQUAD_Y: 0.07, CONTACT_Y: 0.16,
    FARM_X: 0.125, FARM_EDGE: 0.2, TREAS_X: 0.875, TREAS_EDGE: 0.8,
    HORDE_X0: 0.26, HORDE_X1: 0.74, TREAS_X0: 0.78,
    X_MIN: 0.1, X_MAX: 0.9,
    COLS: 11, ROW_SP: 0.03, START_FRONT: 0.62,
    // horde: speed and toughness ramp over the stage (u = t / RAMP_T, capped at 1.25)
    RAMP_T: 140, HORDE_V0: 0.034, HORDE_V1: 0.012, G_HP0: 1, G_HP1: 4.5, G_POW: 1.7, G_LO: 0.25, G_HI: 0.5, G_MIN: 0.5,
    FILL_GAP: 0.04, FILL_V: 0.09, LEAD_GAP: 0.03, LEAD_SLOW: 0.25,           // a column lagging behind its neighbours catches up
    BONK_BACK: 0.07, BONK_LOSS: 0.02,        // a column that reaches the squad bonks it (lose max(1, 2%)) and bounces back
    D0: 3.2, DP: 0.72, SQUAD_MAX: 999,
    RATE0: 4, RATE1: 0.8, RATE_MAX: 16,      // shots per second (damage per shot scales instead of shot count)
    SHOT_V: 2.3, SPREAD0: 0.045, SPREAD1: 0.012, SPREAD_MAX: 0.16,
    TILE_SP: 0.12, TILE_V: 0.36, TILE_N: 10, // +1 belt: about 3 tiles per second
    GOLD_V: 0.3, GOLD_SP: 0.1, GOLD_MAX: 8, TREAS_Y: 0.46,
    GIFTS: [
      { hp: 220, n: 6, val: 5, mult: 1.6, delay: 0 },
      { hp: 800, n: 8, val: 10, mult: 1.35, delay: 7 },
      { hp: 2400, n: 8, val: 25, mult: 1.35, delay: 7 }
    ],
    BOSS: [
      { t: 18, hp: 100, dur: 13, sway: 0.08 },
      { t: 48, hp: 220, dur: 14, sway: 0.1 },
      { t: 82, hp: 450, dur: 15, sway: 0.2 },
      { t: 116, hp: 1000, dur: 20, sway: 0.12 }
    ],
    BOSS_K: 0.18,                            // boss HP = max(hp, K * dur * squad fire power): always a real fight
    BOSS_HW: 0.12, BOSS_CHARGE: 0.3, BOSS_PUSH: 0.16,
    RUSH: [36, 68, 100, 130], RUSH_DUR: 3, RUSH_MULT: 1.6, RUSH_WARN: 1.2,
    SPR_T0: 26, SPR_INT0: 5.5, SPR_INT1: 2.4, SPR_V: 0.3, SPR_HP: 3, SPR_N: 8, SPR_HW: 0.045, SPR_LOSS: 0.05,
    STAR2: 200, STAR3: 300
  };
  var CW = (CFG.HORDE_X1 - CFG.HORDE_X0) / CFG.COLS;
  var EV = { POP: 1, PLUS: 2, LOST: 3, THIT: 4, BREAK: 5, BOSSIN: 6, BOSSHIT: 7, BOSSDOWN: 8, GOLD: 9, WIN: 10, LOSE: 11, RUSH: 12, SPRIN: 13, SPRPOP: 14, SPRHIT: 15, GIFTIN: 16, BONK: 17 };
  var MAX_SHOTS = 48, MAX_EV = 96;

  function Sim(seed) {
    var C = CFG.COLS;
    this.front = new Float64Array(C); this.colHp = new Float64Array(C);
    this.killed = new Int32Array(C); this.phase = new Float64Array(C);
    this.shX = new Float64Array(MAX_SHOTS); this.shY = new Float64Array(MAX_SHOTS); this.shD = new Float64Array(MAX_SHOTS);
    this.tileY = new Float64Array(CFG.TILE_N);
    this.goldY = new Float64Array(CFG.GOLD_MAX); this.goldOn = new Uint8Array(CFG.GOLD_MAX);
    this.spOn = new Uint8Array(CFG.SPR_N); this.spX = new Float64Array(CFG.SPR_N); this.spY = new Float64Array(CFG.SPR_N); this.spHp = new Float64Array(CFG.SPR_N);
    this.evT = new Uint8Array(MAX_EV); this.evX = new Float64Array(MAX_EV); this.evY = new Float64Array(MAX_EV); this.evV = new Float64Array(MAX_EV);
    this.boss = { active: false, hp: 0, max: 0, y: 1, x: 0.5, speed: 0, idx: -1, final: false, out: false, t0: 0 };
    this.bot = {};
    this.reset(seed);
  }
  Sim.prototype.reset = function (seed) {
    var i, C = CFG.COLS;
    this.seed = (seed >>> 0) || 1; this.rs = this.seed;
    this.t = 0; this.result = null; this.reason = ''; this.stars = 0;
    this.squad = 1; this.sx = 0.5; this.tx = 0.5; this.moveSpeed = 5;
    this.mult = 1; this.heroLv = 0; this.fireAcc = 0; this.lossAcc = 0; this.shotCount = 0;
    this.nShots = 0; this.evN = 0; this.kills = 0; this.contact = 0; this.contactT = -9; this.minFront = CFG.START_FRONT;
    for (i = 0; i < C; i++) {
      this.front[i] = CFG.START_FRONT + this.rand() * 0.05; this.colHp[i] = CFG.G_HP0;
      this.killed[i] = 0; this.phase[i] = this.rand() * 6.283;
    }
    for (i = 0; i < CFG.TILE_N; i++) this.tileY[i] = 0.3 + i * CFG.TILE_SP;
    for (i = 0; i < CFG.GOLD_MAX; i++) { this.goldOn[i] = 0; this.goldY[i] = 0; }
    for (i = 0; i < CFG.SPR_N; i++) this.spOn[i] = 0;
    this.giftIdx = 0; this.trHp = CFG.GIFTS[0].hp; this.trMax = this.trHp; this.giftAt = 0; this.goldLeft = 0; this.goldVal = 0;
    var B = this.boss; B.active = false; B.idx = -1; B.hp = 0; this.bossNext = 0; this.bossLeft = 0;
    this.rushNext = 0; this.rushUntil = 0; this.rushWarned = false; this.sprNext = CFG.SPR_T0; this.sprNear = 2;
    var b = this.bot; b.mode = 'grow'; b.camped = false; b.tx = 0.5; b.pend = 0.5; b.pendAt = 0; b.next = 0; b.idleUntil = 0; b.nextIdle = 3 + this.rand() * 5;
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
  Sim.prototype.ramp = function () { return Math.min(1.25, this.t / CFG.RAMP_T); };
  Sim.prototype.dps = function () { return CFG.D0 * Math.pow(this.squad, CFG.DP) * this.mult; };
  Sim.prototype.spread = function () { return Math.min(CFG.SPREAD0 + CFG.SPREAD1 * Math.sqrt(this.squad), CFG.SPREAD_MAX); };
  Sim.prototype.gHp = function () {
    // Time-based toughness, kept inside a band of the squad's fire power: holding the horde always costs
    // between G_LO and G_HI of the squad's time, so there is neither a death spiral nor a moment with nothing to do.
    var tb = CFG.G_HP0 + CFG.G_HP1 * Math.pow(this.ramp(), CFG.G_POW);
    var rows = CFG.COLS * (CFG.HORDE_V0 + CFG.HORDE_V1 * this.ramp()) / CFG.ROW_SP, d = this.dps();
    var lo = CFG.G_LO * d / rows, hi = CFG.G_HI * d / rows;
    return Math.max(CFG.G_MIN, tb < lo ? lo : tb > hi ? hi : tb);
  };
  Sim.prototype.rushing = function () { return this.t < this.rushUntil; };
  Sim.prototype.firing = function () { return this.sx >= CFG.FARM_EDGE; };
  Sim.prototype.duration = function () { var b = CFG.BOSS[CFG.BOSS.length - 1]; return b.t + b.dur + 3; };
  Sim.prototype.lose = function (n) {
    n = Math.min(this.squad, Math.max(1, Math.round(n)));
    this.squad -= n; this.ev(EV.LOST, this.sx, CFG.SQUAD_Y, n);
  };
  Sim.prototype.finish = function (res, reason) {
    this.result = res; this.reason = reason;
    this.stars = res === 'win' ? (this.squad >= CFG.STAR3 ? 3 : this.squad >= CFG.STAR2 ? 2 : 1) : 0;
    this.ev(res === 'win' ? EV.WIN : EV.LOSE, this.sx, CFG.SQUAD_Y, 0);
  };

  Sim.prototype.step = function () {
    if (this.result) return;
    var dt = CFG.DT, C = CFG.COLS, i, c, k, B = this.boss;
    this.t += dt;
    // move squad
    var d = this.tx - this.sx, m = this.moveSpeed * dt;
    this.sx += d > m ? m : d < -m ? -m : d;
    if (this.sx < CFG.X_MIN) this.sx = CFG.X_MIN; else if (this.sx > CFG.X_MAX) this.sx = CFG.X_MAX;
    // fire: the shot count is capped, each shot carries the squad's damage
    if (this.firing()) {
      var rate = Math.min(CFG.RATE0 + CFG.RATE1 * this.squad, CFG.RATE_MAX), dmg = this.dps() / rate, sp = this.spread();
      this.fireAcc += rate * dt;
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1;
        if (this.nShots < MAX_SHOTS) {
          var u = (this.shotCount++ * 0.6180339887) % 1;
          i = this.nShots++; this.shX[i] = this.sx + (u * 2 - 1) * sp; this.shY[i] = CFG.SQUAD_Y + 0.02 + this.fireAcc * 0.03; this.shD[i] = dmg;
        }
      }
    } else this.fireAcc = 0;
    // shots: each hits the NEAREST thing in its path (sprinter, horde front or boss)
    var ghp = this.gHp();
    for (i = this.nShots - 1; i >= 0; i--) {
      var y = (this.shY[i] += CFG.SHOT_V * dt), x = this.shX[i], hit = false;
      if (x >= CFG.HORDE_X0 && x < CFG.HORDE_X1) {
        c = ((x - CFG.HORDE_X0) / CW) | 0;
        var best = 9, kind = 0, si = -1;
        if (y >= this.front[c]) { best = this.front[c]; kind = 1; }
        if (B.active && Math.abs(x - B.x) < CFG.BOSS_HW && y >= B.y && B.y < best) { best = B.y; kind = 2; }
        for (k = 0; k < CFG.SPR_N; k++) if (this.spOn[k] && Math.abs(x - this.spX[k]) < CFG.SPR_HW && y >= this.spY[k] && this.spY[k] < best) { best = this.spY[k]; kind = 3; si = k; }
        if (kind === 2) { hit = true; B.hp -= this.shD[i]; this.ev(EV.BOSSHIT, x, B.y, 0); }
        else if (kind === 3) {
          hit = true; this.spHp[si] -= this.shD[i]; this.ev(EV.SPRHIT, this.spX[si], this.spY[si], 0);
          if (this.spHp[si] <= 0) { this.spOn[si] = 0; this.kills++; this.ev(EV.SPRPOP, this.spX[si], this.spY[si], 0); }
        } else if (kind === 1) {
          hit = true;
          if (this.front[c] < 0.995) {
            this.colHp[c] -= this.shD[i];
            var pops = 0;
            while (this.colHp[c] <= 0 && this.front[c] < 0.995 && pops < 6) {
              this.ev(EV.POP, CFG.HORDE_X0 + (c + 0.5) * CW, this.front[c], c);
              this.front[c] += CFG.ROW_SP; this.killed[c]++; this.kills++; this.colHp[c] += ghp; pops++;
            }
            if (this.colHp[c] <= 0) this.colHp[c] = ghp;
          }
        }
      } else if (x >= CFG.TREAS_X0 && this.trHp > 0 && y >= CFG.TREAS_Y) {
        hit = true; this.trHp -= this.shD[i]; this.ev(EV.THIT, x, CFG.TREAS_Y, 0);
        if (this.trHp <= 0) {
          var G = CFG.GIFTS[this.giftIdx];
          this.trHp = 0; this.mult *= G.mult; this.heroLv++; this.goldLeft = G.n; this.goldVal = G.val;
          for (c = 0; c < G.n; c++) { this.goldOn[c] = 1; this.goldY[c] = CFG.TREAS_Y + c * CFG.GOLD_SP; }
          this.giftIdx++; this.giftAt = this.giftIdx < CFG.GIFTS.length ? this.t + CFG.GIFTS[this.giftIdx].delay : Infinity;
          this.ev(EV.BREAK, CFG.TREAS_X, CFG.TREAS_Y, this.heroLv);
        }
      }
      if (hit || y > 1.03) { var l = --this.nShots; this.shX[i] = this.shX[l]; this.shY[i] = this.shY[l]; this.shD[i] = this.shD[l]; }
    }
    // next gift
    if (this.trHp <= 0 && this.goldLeft <= 0 && this.t >= this.giftAt && this.giftIdx < CFG.GIFTS.length) {
      this.trHp = this.trMax = CFG.GIFTS[this.giftIdx].hp; this.giftAt = Infinity; this.ev(EV.GIFTIN, CFG.TREAS_X, CFG.TREAS_Y, this.giftIdx);
    }
    // rush events
    if (this.rushNext < CFG.RUSH.length) {
      var rt = CFG.RUSH[this.rushNext];
      if (!this.rushWarned && this.t >= rt - CFG.RUSH_WARN) { this.rushWarned = true; this.ev(EV.RUSH, 0.5, 0.5, 0); }
      if (this.t >= rt) { this.rushUntil = rt + CFG.RUSH_DUR; this.rushNext++; this.rushWarned = false; }
    }
    // horde march
    var v = (CFG.HORDE_V0 + CFG.HORDE_V1 * this.ramp()) * (this.rushing() ? CFG.RUSH_MULT : 1), contact = 0, mf = 2;
    for (c = 0; c < C; c++) {
      var f0 = this.front[c], nl = c > 0 ? this.front[c - 1] : f0, nr = c < C - 1 ? this.front[c + 1] : f0, na = (nl + nr) * 0.5;
      // the front behaves like a line: leaders wait for their neighbours, laggards catch up
      var f = f0 - v * (f0 < na - CFG.LEAD_GAP ? CFG.LEAD_SLOW : 1) * (1 + 0.3 * Math.sin(this.t * 0.9 + this.phase[c])) * dt;
      if (f > Math.min(nl, nr) + CFG.FILL_GAP) f -= CFG.FILL_V * dt;
      if (B.active && B.out && Math.abs(CFG.HORDE_X0 + (c + 0.5) * CW - B.x) < CFG.BOSS_HW && f < B.y + 0.03) f = Math.max(f, Math.min(this.front[c], B.y + 0.03));
      if (f <= CFG.CONTACT_Y) { f = CFG.CONTACT_Y + CFG.BONK_BACK; contact++; this.ev(EV.BONK, CFG.HORDE_X0 + (c + 0.5) * CW, CFG.CONTACT_Y, c); if (CFG.CONTACT_Y < mf) mf = CFG.CONTACT_Y; }
      this.front[c] = f; if (f < mf) mf = f;
    }
    if (contact) this.contactT = this.t; this.contact = contact; this.minFront = mf;
    if (contact) {
      this.lose(contact * Math.max(1, this.squad * CFG.BONK_LOSS));
      if (this.squad <= 0) { this.finish('lose', 'horde'); return; }
    }
    // sprinters: fast loners that dash out of the horde
    if (this.t >= this.sprNext) {
      this.sprNext = this.t + (CFG.SPR_INT0 + (CFG.SPR_INT1 - CFG.SPR_INT0) * Math.min(1, this.ramp())) * (0.7 + 0.6 * this.rand());
      for (k = 0; k < CFG.SPR_N; k++) if (!this.spOn[k]) {
        c = (this.rand() * C) | 0; this.spOn[k] = 1; this.spX[k] = CFG.HORDE_X0 + (c + 0.5) * CW; this.spY[k] = Math.min(0.98, this.front[c] + 0.02); this.spHp[k] = CFG.SPR_HP * ghp;
        this.ev(EV.SPRIN, this.spX[k], this.spY[k], 0); break;
      }
    }
    var near = 2;
    for (k = 0; k < CFG.SPR_N; k++) if (this.spOn[k]) {
      this.spY[k] -= CFG.SPR_V * dt;
      if (this.spY[k] <= CFG.CONTACT_Y) {
        this.spOn[k] = 0; this.lose(Math.max(2, this.squad * CFG.SPR_LOSS));
        if (this.squad <= 0) { this.finish('lose', 'horde'); return; }
      } else if (this.spY[k] < near) near = this.spY[k];
    }
    this.sprNear = near;
    // +1 belt
    var farm = this.sx < CFG.FARM_EDGE;
    for (i = 0; i < CFG.TILE_N; i++) {
      var ty = (this.tileY[i] -= CFG.TILE_V * dt);
      if (farm && ty <= CFG.SQUAD_Y + 0.03 && ty > CFG.SQUAD_Y - 0.04) {
        var bv = 1 + this.heroLv; this.squad = Math.min(CFG.SQUAD_MAX, this.squad + bv);
        this.ev(EV.PLUS, CFG.FARM_X, CFG.SQUAD_Y, bv); this.tileY[i] = ty + CFG.TILE_N * CFG.TILE_SP;
      } else if (ty < -0.12) this.tileY[i] = ty + CFG.TILE_N * CFG.TILE_SP;
    }
    // reward tiles
    if (this.goldLeft > 0) {
      var tre = this.sx > CFG.TREAS_EDGE;
      for (i = 0; i < CFG.GOLD_MAX; i++) if (this.goldOn[i]) {
        var gy = (this.goldY[i] -= CFG.GOLD_V * dt);
        if (tre && gy <= CFG.SQUAD_Y + 0.03 && gy > CFG.SQUAD_Y - 0.04) {
          this.squad = Math.min(CFG.SQUAD_MAX, this.squad + this.goldVal);
          this.goldOn[i] = 0; this.goldLeft--; this.ev(EV.GOLD, CFG.TREAS_X, CFG.SQUAD_Y, this.goldVal);
        } else if (gy < -0.12) { this.goldOn[i] = 0; this.goldLeft--; }
      }
    }
    // boss: charges through the crowd to its head, then walks to the squad in `dur` seconds
    if (!B.active && this.bossNext < CFG.BOSS.length && this.t >= CFG.BOSS[this.bossNext].t) {
      var bd = CFG.BOSS[this.bossNext];
      B.active = true; B.idx = this.bossNext++; B.hp = B.max = Math.round(Math.max(bd.hp, CFG.BOSS_K * bd.dur * this.dps())); B.y = 1; B.x = 0.5; B.out = false; B.t0 = this.t;
      B.speed = CFG.BOSS_CHARGE; B.final = this.bossNext >= CFG.BOSS.length;
      this.ev(EV.BOSSIN, 0.5, 1, B.idx);
    }
    if (B.active) {
      var bdef = CFG.BOSS[B.idx];
      B.x = 0.5 + bdef.sway * Math.sin((this.t - B.t0) * 0.7);
      if (!B.out) {
        var head = 2;
        for (c = 0; c < C; c++) if (Math.abs(CFG.HORDE_X0 + (c + 0.5) * CW - B.x) < CFG.BOSS_HW && this.front[c] < head) head = this.front[c];
        if (B.y <= head - 0.02 || B.y < 0.4) { B.out = true; B.speed = Math.max(0.02, (B.y - CFG.CONTACT_Y) / bdef.dur); }
      }
      B.y -= B.speed * dt;
      if (B.hp <= 0) {
        B.active = false; B.hp = 0; this.ev(EV.BOSSDOWN, B.x, B.y, B.idx);
        for (c = 0; c < C; c++) this.front[c] = Math.min(1, this.front[c] + CFG.BOSS_PUSH);
        if (B.final) { this.finish('win', 'boss'); return; }
      } else if (B.y <= CFG.CONTACT_Y) { this.bossLeft = Math.ceil(B.hp); this.finish('lose', 'boss'); return; }
    }
  };

  /* ---------------- bots (also used by ?autoplay=) ---------------- */
  var BOTS = {
    smart:      { react: 0.1, lo: 0.2, hi: 0.27, noise: 0, idle: 0, speed: 2.0, treasure: true, farm: true, trTime: 7 },
    mediocre:   { react: 0.4, lo: 0.24, hi: 0.33, noise: 0.035, idle: 0.9, speed: 1.4, treasure: true, farm: true, trTime: 7 },
    camper:     { react: 0.15, lo: 0.2, hi: 0.27, noise: 0, idle: 0, speed: 2.0, treasure: true, farm: true, trTime: 7, campTo: 50 },
    notreasure: { react: 0.1, lo: 0.2, hi: 0.27, noise: 0, idle: 0, speed: 2.0, treasure: false, farm: true },
    horde:      { react: 0.1, lo: 2, hi: 3, noise: 0, idle: 0, speed: 2.0, treasure: false, farm: false },
    farm:       { react: 0.1, lo: -1, hi: -1, noise: 0, idle: 0, speed: 2.0, treasure: false, farm: true, only: true }
  };
  Sim.prototype.botGoal = function (P) {
    var b = this.bot, B = this.boss, C = CFG.COLS, c, k, best = 0, bs = 9;
    if (P.only || (P.campTo && !b.camped && this.squad < P.campTo)) return CFG.FARM_X;
    b.camped = true;
    for (c = 0; c < C; c++) {
      var s = this.front[c] + 0.25 * Math.abs(CFG.HORDE_X0 + (c + 0.5) * CW - this.sx);
      if (s < bs) { bs = s; best = c; }
    }
    var sweep = CFG.HORDE_X0 + (best + 0.5) * CW, danger = Math.min(this.minFront, this.sprNear - 0.08);
    if (b.mode === 'grow' && danger < P.lo) b.mode = 'hold';
    else if (b.mode === 'hold' && danger > P.hi) b.mode = 'grow';
    if (this.sprNear < Math.max(P.lo + 0.12, 0.42)) { // a sprinter is coming: shoot it
      var sy = 9, sxp = sweep;
      for (k = 0; k < CFG.SPR_N; k++) if (this.spOn[k] && this.spY[k] < sy) { sy = this.spY[k]; sxp = this.spX[k]; }
      if (this.minFront > 0.2 || sy < this.minFront + 0.1) return sxp;
    }
    if (B.active && B.out) {
      var eta = (B.y - CFG.CONTACT_Y) / B.speed, need = B.hp / this.dps();
      if (!(this.minFront < 0.2 && need < eta - 3)) {
        if (need > eta - 6 || B.y < 0.45 || b.mode === 'hold' || !P.farm) return B.x;
      }
    }
    if (b.mode === 'hold') return sweep;
    if (P.treasure && this.goldLeft > 0) return CFG.TREAS_X;
    if (P.treasure && this.trHp > 0 && this.trHp / this.dps() < P.trTime && danger > P.hi) return CFG.TREAS_X;
    if (P.farm && this.squad < CFG.SQUAD_MAX) return CFG.FARM_X;
    return sweep;
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
  /* Headless run. Returns a summary. */
  function run(kind, seed) {
    var s = new Sim(seed), maxSquad = 1, guard = 0, belt = 0, tre = 0, lastZone = 1, switches = 0;
    while (!s.result && guard++ < 60 * 400) {
      s.botStep(kind); s.step(); s.evN = 0;
      if (s.squad > maxSquad) maxSquad = s.squad;
      var z = s.sx < CFG.FARM_EDGE ? 0 : s.sx > CFG.TREAS_EDGE ? 2 : 1;
      if (z === 0) belt++; else if (z === 2) tre++;
      if (z !== lastZone) { switches++; lastZone = z; }
    }
    return { result: s.result || 'timeout', reason: s.reason, t: s.t, squad: s.squad, maxSquad: maxSquad, gifts: s.heroLv, bossLeft: s.bossLeft, bossIdx: s.boss.idx,
      stars: s.stars, beltShare: belt / guard, treShare: tre / guard, switches: switches };
  }

  var api = { CFG: CFG, EV: EV, Sim: Sim, BOTS: BOTS, run: run, CW: CW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BridgeSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
