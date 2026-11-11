/* Pompom Parade - level runner: beat timeline, fixed-step simulation, state machine, world draw order.
 * The simulation never touches the DOM, so it can be fast-forwarded headless (skip / balance harness).
 *
 * Fixed design frame (FIX_PLAN_R1 gameplay-8): gameplay is identical on every screen height. The squad
 * stands at sy = min(H - 110, 530) and every gameplay y-coordinate is designY + oy with oy = sy - 530
 * (spawn line, park heights, boss anchor ...). The design frame ends at G.bot = sy + 110; on screens taller
 * than 640 everything below it is road-only "thumb space" (see veil()). */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, B = PP.bal, D = PP.data;
  var G = PP.G = { on: false, over: false, mode: 'level', L: 1, t: 0, tl: 0, dist: 0, scroll: 80, H: 640, sy: 530, oy: 0, bot: 640, state: 'run', tick: 0, cards: null, result: null };
  var RUN = PP.run = {};
  var BOSS_OF = { 6: 1, 12: 2, 18: 3, 24: 4, 30: 5 };
  var TRAVEL = 590;      // design distance from the spawn line to just past the squad (530 + 60)

  function meterTotal(def, hpMult) {
    var tot = 0;
    for (var i = 0; i < def.beats.length; i++) {
      var b = def.beats[i];
      if (b[1] !== 'wave') continue;
      var p = b[2], n = PP.patterns.count(p.p, p.n);
      tot += (n + (p.el || 0) * 2) * D.enemyHpUnits(p.e) * hpMult * B.ramp(b[0], def.length);
    }
    return tot;
  }
  function frame(H) {
    // The simulation always runs in design coordinates (squad line 530, frame 0..640): that makes a run
    // bit-identical on every screen. The plan's offset oy = min(H - 110, 530) - 530 is applied when drawing
    // (G.viewY), so on screen the squad stands at min(H - 110, 530) and every y is designY + oy.
    if (G.mode === 'demo') { G.sy = H - 300; G.oy = 0; G.bot = H; G.viewY = 0; }
    else { G.sy = 530; G.oy = 0; G.bot = 640; G.viewY = Math.min(H - 110, 530) - 530; }
    G.screenSy = G.sy + G.viewY;
    G.H = H;
  }
  /* live resize / rotation: only the view offset changes (the menu demo also moves its squad line) */
  RUN.reframe = function (H) {
    if (!G.on) { G.H = H; return; }
    var sy0 = G.sy, oy0 = G.oy, i, a, n;
    frame(H);
    var d = G.sy - sy0, dw = G.oy - oy0;       // both 0 outside the menu demo: the simulation never moves
    if (d) { for (i = 0; i < PP.squad.mem.length; i++) PP.squad.mem[i].y += d; }
    if (!dw) return;
    a = PP.enemies.pool.items; n = PP.enemies.pool.n; for (i = 0; i < n; i++) a[i].y += dw;
    a = PP.shots.pool.items; n = PP.shots.pool.n; for (i = 0; i < n; i++) { a[i].y += dw; a[i].y0 += dw; }
    a = PP.shots.clouds; for (i = 0; i < a.length; i++) a[i].y += dw;
    PP.shots.beamHitY += dw;
    a = PP.eshots.pool.items; n = PP.eshots.pool.n; for (i = 0; i < n; i++) a[i].y += dw;
    a = PP.pickups.pool.items; n = PP.pickups.pool.n; for (i = 0; i < n; i++) a[i].y += dw;
    a = PP.gates.rows; for (i = 0; i < a.length; i++) a[i].y += dw;
    a = PP.obst.list; for (i = 0; i < a.length; i++) a[i].y += dw;
    var BS = PP.boss; BS.y += dw; BS.rip[0].y += dw; BS.rip[1].y += dw; BS.clone.y += dw;
    if (G.archY !== null) G.archY += dw;
  };

  /* o: {level | endless | demo, seed, squad, weapon, wlv, god, autoplay, tutorial, prof, world, H, toBoss} */
  RUN.start = function (o) {
    o = o || {};
    var prof = o.prof || PP.save.data, L = o.level || 1, def = null;
    G.mode = o.endless ? 'endless' : (o.demo ? 'demo' : 'level');
    if (G.mode === 'level') { def = D.levels[L]; if (!def) { L = 1; def = D.levels[1]; } }
    if (G.mode === 'endless') L = PP.endless.LE0;
    if (G.mode === 'demo') L = o.level || 1;
    G.on = true; G.over = false; G.result = null; G.def = def; G.L = L; G.levelId = G.mode === 'level' ? L : 0;
    G.world = o.world || (G.mode === 'endless' ? 1 + (((o.seed || 0) >>> 0) % 5) : B.world(L));
    G.seed = o.seed !== undefined && o.seed !== null ? (o.seed >>> 0) : (def ? def.seed : ((Math.random() * 1e9) >>> 0));
    G.rng = U.rng(G.seed);
    frame(o.H || (PP.R && PP.R.ready ? PP.R.H : 640));
    G.t = 0; G.tl = 0; G.dist = 0; G.tick = 0; G.bi = 0;
    G.scrollBase = def ? def.scroll : B.scroll(L); G.scroll = G.scrollBase;
    G.len = def ? def.length : 1e9;
    G.hpMult = B.hpMult(L); G.mid = B.mid(L); G.A = B.A(L);
    G.isBoss = G.mode === 'level' && !!BOSS_OF[L];
    G.state = 'run'; G.stateT = 0; G.slow = 1; G.slowT = 0; G.archY = null; G.bridgeN = 0;
    G.buttonsRun = 0; G.popped = 0; G.lostTotal = 0; G.rowsSpawned = 0; G.giftWeapon = null;
    G.lostBy = { enemy: 0, hazard: 0, shot: 0, boss: 0, gate: 0 };
    G.meter = 0; G.meterIdx = 0; G.meterTotal = def ? meterTotal(def, G.hpMult) : 0; G.cards = null; G.cardSel = 0; G.cardT = 0;
    G.god = !!o.god; G.autoplay = !!o.autoplay; G.prof = prof; G.progress = 0;
    // anything that makes the run easier than a real one marks it (no leaderboard score, no record)
    G.cheat = !!(o.god || o.autoplay || o.squad || o.weapon || o.wlv || o.prof || (o.seed !== undefined && o.seed !== null));
    G.star2 = B.star2(L); G.star3 = B.star3(L);
    G.tutorial = o.tutorial !== false && G.mode === 'level' && !G.autoplay;
    G.hold = G.tutorial && L === 1 && !prof.hints.drag;
    G.sens = (PP.save.data && PP.save.data.settings.sens) || 1;
    G.banner = 0; G.bossType = 0; G.helping = 0; G.helpTier = 0; G.toBoss = false; G.bumpK = 1;
    var squad = 3 + (prof.upg.buddy || 0), help = null;
    if (G.mode === 'level') {
      help = PP.econ.helping(L, prof); G.helping = help.pom; G.helpTier = help.tier; squad += help.pom;
      // "Go to boss" (boss levels, after 3 fails): skip the run-in, start the fight with a mid squad
      if (o.toBoss && G.isBoss) { G.toBoss = true; squad = Math.round(G.mid) + help.pom; }
    }
    if (G.mode === 'endless') squad = Math.round(B.mid(PP.endless.LE0)) + (prof.upg.buddy || 0);
    if (G.mode === 'demo') squad = 12;
    if (o.squad) squad = o.squad;
    G.squadPeak = squad;
    PP.enemies.clear(); PP.shots.clear(); PP.eshots.clear(); PP.gates.clear(); PP.obst.clear(); PP.pickups.clear(); PP.boss.clear();
    if (!PP.headless) PP.fx.reset();
    var wid = o.weapon || prof.equipped || 'wand';
    PP.squad.reset({ prof: prof, squad: squad, weapon: wid, wlv: o.wlv || prof.toy || 1, shield: help ? help.shield : 0, helpDmg: help ? help.dmg : 1 });
    if (G.mode === 'endless') PP.endless.start();
    if (G.toBoss) {
      // jump straight to the boss beat: no gates, no Buttons from the run-in, Sparkle Meter off
      G.tl = G.len; G.bi = def.beats.length; G.meterIdx = 99;
      for (var i = 0; i < def.beats.length; i++) if (def.beats[i][1] === 'boss') { G.bi = i; break; }
    }
    if (PP.bot) PP.bot.reset();
    if (!PP.headless) { PP.bg.setWorld(G.world); if (PP.tut) PP.tut.onStart(); }
    PP.events.emit('levelStart', { mode: G.mode, level: G.levelId, seed: G.seed, squad: squad, weapon: PP.squad.weapon.id, helping: G.helpTier, toBoss: G.toBoss });
  };
  RUN.stop = function () { G.on = false; PP.audio.beam(false); };

  function giftWeapon() {
    var L = Math.round(G.L), prof = G.prof, w = D.weaponUnlockedAt(L), cur = PP.squad.weapon.id;
    if (w && !prof.weapons[w.id].own && w.id !== cur) return w.id;
    var list = [];
    for (var i = 0; i < D.weapons.length; i++) { var id = D.weapons[i].id; if (prof.weapons[id] && prof.weapons[id].own && id !== cur) list.push(id); }
    if (!list.length) return cur === 'shaker' ? 'wand' : 'shaker';
    return G.rng.pick(list);
  }
  RUN.exec = function (b) {
    var kind = b[1], p = b[2] || {}, EN = PP.enemies, PT = PP.patterns, i, top = G.oy - 40;
    if (kind === 'wave') {
      var def = D.enemies[p.e]; if (!def) return;
      var n = PT.place(p.p, p.n, p, G.rng, G.scrollBase + def.speed);
      for (i = 0; i < n; i++) EN.spawn(p.e, PT.X[i], top - PT.DY[i], i < (p.el || 0));
    } else if (kind === 'gates') {
      var row = PP.gates.spawnRow(p);
      if (row && PP.tut && !PP.headless) PP.tut.onGateRow(row);
    } else if (kind === 'obj') {
      var o = p.o, x = p.x !== undefined ? p.x : (p.lane !== undefined ? U.laneX(p.lane) : 180);
      if (o === 'crate' || o === 'jar' || o === 'gift') {
        var e = EN.spawn(o, x, top, false);
        if (e && o === 'gift') { e.gift = giftWeapon(); e.giftSpr = PP.spr['i_w_' + e.gift]; }
        if (e && PP.tut && !PP.headless) PP.tut.onObject(o, e);
      } else if (o === 'fence') PP.obst.spawn('fence', p.gap !== undefined ? p.gap : 180);
      else PP.obst.spawn(o, x);
    } else if (kind === 'pick') PP.pickups.spawn(p.k, p.x !== undefined ? p.x : 180, G.oy - 30, false);
    else if (kind === 'hint') { if (PP.tut && !PP.headless) PP.tut.show(p.k); }
    else if (kind === 'boss') RUN.bossIntro(p.b || BOSS_OF[G.levelId] || 1, B.bossHp(G.levelId), false);
    else if (kind === 'finish') G.archY = G.oy - 70;
  };
  RUN.bossIntro = function (type, hp, mini) {
    G.state = 'bossintro'; G.stateT = 1.5; G.banner = 1.5; G.bossType = type; G.bossHp = hp; G.bossMini = !!mini;
    PP.audio.sfx('warn');
    if (PP.game && !PP.headless) PP.game.onBossIntro(type);
  };
  RUN.bossDefeated = function () {
    if (G.state === 'lost' || G.over) return;      // a loss is final: no win with 0 pompoms
    G.state = 'bossdown'; G.slow = 0.3; G.slowT = 0.8; G.stateT = 0.5;
    PP.enemies.popAll(); PP.eshots.clear();
    if (!PP.headless) { PP.fx.confetti(PP.boss.x, PP.boss.y, 60, 420); PP.fx.shake(6); PP.audio.sfx('bossdown'); PP.fx.vibrate([30, 40, 30]); }
  };
  RUN.fail = function () {
    if (G.god || G.state === 'lost' || G.over) return;
    if (G.state === 'bossdown' || G.state === 'bridge') return;   // and a win is final too
    G.state = 'lost'; G.stateT = 1.0;
    PP.audio.beam(false);
  };
  function stars(n) { return n >= G.star3 ? 3 : (n >= G.star2 ? 2 : 1); }
  RUN.liveStars = function () { return stars(PP.squad.n); };
  RUN.finish = function (win) {
    if (G.over) return;
    G.over = true;
    var SQ = PP.squad;
    PP.audio.beam(false);
    var res = {
      mode: G.mode, level: G.levelId, win: !!win, stars: win ? stars(SQ.n) : 0, progress: win ? 1 : Math.min(0.99, G.progress),
      endSquad: SQ.n, squadPeak: G.squadPeak, buttons: G.buttonsRun, time: Math.round(G.t * 10) / 10, popped: G.popped,
      lucky: SQ.lucky, score: Math.floor(G.dist / 10), lost: G.lostTotal, weapon: SQ.weapon.id, giftWeapon: G.giftWeapon,
      lostBy: { enemy: G.lostBy.enemy, hazard: G.lostBy.hazard, shot: G.lostBy.shot, boss: G.lostBy.boss, gate: G.lostBy.gate },
      helping: G.helpTier, toBoss: G.toBoss, cheat: !!(G.cheat || G.god || G.autoplay || (PP.loop && PP.loop.speed !== 1))
    };
    G.result = res;
    PP.events.emit(win ? 'levelWin' : 'levelFail', res);
    if (PP.game && !PP.headless) PP.game.onRunEnd(res);
  };

  RUN.step = function (dt0) {
    if (!G.on || G.over || G.cards) return;
    var SQ = PP.squad, dt = dt0, st;
    G.tick++;
    if (G.slowT > 0) { G.slowT -= dt0; dt = dt0 * G.slow; if (G.slowT <= 0) G.slow = 1; }
    G.t += dt;
    if (G.hold) { if (SQ.moved >= 60) { G.hold = false; if (PP.tut) PP.tut.done('drag'); } }
    else if (G.state === 'run') {
      G.tl += dt;
      if (G.def) { var beats = G.def.beats; while (G.bi < beats.length && beats[G.bi][0] <= G.tl) RUN.exec(beats[G.bi++]); }
      else if (G.mode === 'endless') PP.endless.update(dt);
    }
    st = G.state;
    G.scroll = U.approach(G.scroll, (st === 'boss' || st === 'bossintro' || st === 'bossdown') ? 25 : G.scrollBase, 140 * dt);
    G.dist += G.scroll * dt;
    if (G.autoplay && PP.bot) PP.bot.update(dt);
    PP.obst.update(dt);
    SQ.update(dt);
    PP.grid.build();
    PP.shots.update(dt);
    PP.enemies.update(dt);
    PP.eshots.update(dt);
    PP.gates.update(dt);
    PP.pickups.update(dt);
    PP.boss.update(dt);
    PP.cards.check(dt);
    if (G.banner > 0) G.banner -= dt;

    st = G.state;
    if (st === 'run') {
      if (G.archY !== null) {
        G.archY += G.scroll * dt;
        if (G.archY >= G.sy - 10) { G.state = 'bridge'; G.stateT = 2.2; G.bridgeN = 0; G.bridgeT = 0; PP.enemies.popAll(); PP.eshots.clear(); PP.audio.sfx('cheer'); }
      }
    } else if (st === 'bossintro') {
      G.stateT -= dt;
      if (G.stateT <= 0) { G.state = 'boss'; PP.boss.start(G.bossType, G.bossHp, G.bossMini); }
    } else if (st === 'bossdown') {
      if (G.slowT <= 0) {
        G.stateT -= dt;
        if (G.stateT <= 0) {
          PP.boss.clear();
          if (G.mode === 'endless') { G.state = 'run'; PP.endless.bossDone(); } else RUN.finish(true);
        }
      }
    } else if (st === 'bridge') {
      G.stateT -= dt;
      if (!PP.headless) {       // Bonus Bridge: pompoms hop across and drop Buttons (cosmetic)
        G.bridgeT -= dt;
        var shown = SQ.nvis;
        if (G.bridgeT <= 0 && G.bridgeN < shown) {
          G.bridgeT = Math.min(0.12, 1.6 / shown);
          var m = SQ.mem[shown - 1 - G.bridgeN];   // Pip hops last
          PP.particles.spawn(m.s0, m.x, m.y, (180 - m.x) * 1.2, -330, 300, 0.7, 1, 0.7, 0, 0);
          PP.particles.spawn(PP.spr.k_button, m.x, m.y - 10, (Math.random() - 0.5) * 120, -200, 500, 0.6, 1, 1, 0, 0);
          PP.audio.sfx('button');
          G.bridgeN++; SQ.hideN = G.bridgeN;
        }
      }
      if (G.stateT <= 0) RUN.finish(true);
    } else if (st === 'lost') {
      G.stateT -= dt;
      if (G.stateT <= 0) RUN.finish(false);
    }
    // progress 0..1
    if (G.mode === 'level') {
      if (G.isBoss) G.progress = 0.6 * Math.min(1, G.tl / G.len) + (PP.boss.on ? 0.4 * (1 - PP.boss.hp / PP.boss.maxHp) : (st === 'bossdown' ? 0.4 : 0));
      else G.progress = Math.min(1, G.tl / (G.len + TRAVEL / G.scrollBase));
    }
  };
  RUN.TRAVEL = TRAVEL;

  /* thumb space: on screens taller than the design frame the road below it is repainted over whatever
   * scrolled past the squad (soft edge), so that part of the screen is road only */
  function veil() {
    var R = PP.R, ctx = R.ctx, y0 = G.bot, Hh = R.H, i;
    if (G.mode === 'demo' || G.viewY || Hh <= y0 + 1) return;
    for (i = 0; i < 4; i++) {
      var a = y0 + i * 12, b = i === 3 ? Hh + 4 : a + 12;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, a, 360, b - a); ctx.clip();
      ctx.globalAlpha = i === 3 ? 1 : 0.3 + 0.25 * i;
      PP.bg.draw(G.dist);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* world rendering (drawImage only). HUD is drawn by PP.hud afterwards. */
  /* world -> screen: shift the canvas by the view offset while world things are drawn */
  RUN.view = function (on) {
    var R = PP.R, k = R.rs, vy = G.viewY || 0;
    if (!vy) return;
    R.shy += on ? vy : -vy;
    R.ctx.setTransform(k, 0, 0, k, k * R.shx, k * R.shy);
  };
  RUN.draw = function () {
    var R = PP.R, spr = PP.spr;
    R.begin();
    PP.bg.draw(G.dist);
    RUN.view(true);
    PP.obst.drawUnder();
    if (G.archY !== null) R.draw(spr.g_finish, 180, G.archY);
    PP.gates.draw();
    PP.pickups.draw();
    PP.obst.draw();
    PP.enemies.draw();
    PP.boss.draw();
    PP.squad.draw();
    PP.shots.draw();
    PP.eshots.draw();
    veil();
    PP.particles.draw();
    RUN.view(false);
    PP.bg.drawAmbient();
    RUN.view(true);
    PP.particles.drawTexts();
    RUN.view(false);
  };
})();
