// SUNFOX engine: fixed-step 60 fps loop, slope-aware platformer physics,
// entities, camera, parallax, HUD and game states.
(function () {
  const G = window.G, T = 16, W = G.W, H = G.H;
  const L = G.level;
  const LW = L.cols * T, LH = L.rows * T;
  const A = G.art;
  const AU = {
    sfx(n) { try { G.audio && G.audio.sfx(n); } catch (e) {} },
    music(n) { try { G.audio && G.audio.music(n); } catch (e) {} },
    stop() { try { G.audio && G.audio.stopMusic(); } catch (e) {} },
    init() { try { G.audio && G.audio.init(); } catch (e) {} },
  };

  // ---------- tuning ----------
  const ACC = 0.13, AIR_ACC = 0.11, FRIC = 0.16, TURN = 0.3, MAXV = 2.45;
  const JUMP = 5.55, G_UP = 0.25, G_DOWN = 0.33, MAXFALL = 6, JUMP_CUT = 2.2;
  const COYOTE = 7, BUFFER = 7, STEP = 9;

  // ---------- input ----------
  const keys = {};
  const touch = { left: false, right: false, down: false, jump: false };
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyX: 'jump', Space: 'jump', KeyK: 'jump',
    Enter: 'start', KeyP: 'start', Escape: 'start', KeyM: 'mute',
  };
  const inp = { left: false, right: false, down: false, jump: false, jumpP: false, startP: false, anyP: false };
  let prevJump = false, startQueued = false, anyQueued = false;
  addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    AU.init();
    keys[k] = true;
    if (k === 'start') startQueued = true;
    if (k === 'mute' && G.audio) G.audio.setMuted(!G.audio.muted);
    if (k !== 'mute') anyQueued = true;
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  function pollInput() {
    let gl = false, gr = false, gd = false, gj = false, gs = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      gl = gl || b(14) || p.axes[0] < -0.4; gr = gr || b(15) || p.axes[0] > 0.4; gd = gd || b(13) || p.axes[1] > 0.6;
      gj = gj || b(0) || b(1) || b(2); gs = gs || b(9);
    }
    if (gs && !pollInput.gs) { startQueued = true; anyQueued = true; }
    if (gj && !pollInput.gj) anyQueued = true;
    pollInput.gs = gs; pollInput.gj = gj;
    inp.left = !!keys.left || touch.left || gl;
    inp.right = !!keys.right || touch.right || gr;
    inp.down = !!keys.down || touch.down || gd;
    inp.jump = !!keys.jump || touch.jump || gj;
    inp.jumpP = inp.jump && !prevJump;
    prevJump = inp.jump;
    inp.startP = startQueued; startQueued = false;
    inp.anyP = anyQueued; anyQueued = false;
  }
  G.touch = touch;
  G.pressStart = () => { AU.init(); startQueued = true; anyQueued = true; };
  G.pressAny = () => { AU.init(); anyQueued = true; };

  // ---------- world queries ----------
  let blocks = new Map();
  const tileCh = (cx, cy) => (cx < 0 || cx >= L.cols ? '#' : cy < 0 || cy >= L.rows ? ' ' : L.grid[cy][cx]);
  function solidPx(px, py) {
    px = Math.floor(px); py = Math.floor(py);
    const cx = px >> 4, cy = py >> 4;
    if (blocks.has(cx + cy * 1000)) return true;
    const h = G.tileH(tileCh(cx, cy), px & 15);
    return h > 0 && (py & 15) >= 16 - h;
  }
  // First surface pixel row at column sx scanning yFrom..yTo. null if none or if we start inside solid.
  function groundAt(sx, yFrom, yTo, prevFeet) {
    sx = Math.floor(sx); yFrom = Math.floor(yFrom); yTo = Math.floor(yTo);
    if (solidPx(sx, yFrom)) return null;
    for (let y = yFrom + 1; y <= yTo; y++) {
      if (solidPx(sx, y)) return y;
      if ((y & 15) === 0 && prevFeet <= y && tileCh(sx >> 4, y >> 4) === '=') return y;
    }
    return null;
  }
  function hitsWall(e, dirn) {
    const px = dirn > 0 ? Math.ceil(e.x) + e.hw - 1 : Math.floor(e.x) - e.hw;
    const y0 = e.y - e.h + 1, y1 = e.y - STEP;
    for (let y = y0; y < y1; y += 6) if (solidPx(px, y)) return true;
    return solidPx(px, y1);
  }
  function moveX(e, dx) {
    if (!dx) return false;
    const dirn = dx > 0 ? 1 : -1;
    e.x += dx;
    if (!hitsWall(e, dirn)) return false;
    e.x = Math.round(e.x);
    let n = 0;
    while (hitsWall(e, dirn) && n++ < 12) e.x -= dirn;
    return true;
  }

  // ---------- state ----------
  let state = 'boot', stateT = 0, time = 0, frame = 0;
  let P, ents, fx, movers, cam, hud, terrain, save, hitstop = 0, shake = 0, paused = false, cardT = 0;
  let lives, gems, coins, clearInfo;
  let trans = null; // {phase:'out'|'in', t, fn}
  const TR = 26;
  function transition(fn) { if (!trans || trans.phase === 'in') trans = { phase: 'out', t: 0, fn }; }

  function buildStatic() {
    terrain = G.buildTerrain(L.grid, A.terrain);
  }
  function resetLevel(full) {
    if (full) { lives = 3; gems = 0; coins = [false, false, false]; save = { x: L.start.x, y: L.start.y, cp: -1 }; }
    blocks = new Map();
    ents = []; fx = []; movers = [];
    let cpi = 0;
    for (const o of L.objects) {
      const e = Object.assign({ t: 0 }, o);
      if (o.type === 'block') {
        e.used = full ? false : !!o._used; e.hits = o.content === 'gems' ? 5 : 1; e.bump = 0;
        if (full) o._used = false;
        blocks.set(o.tx + o.ty * 1000, e);
      } else if (o.type === 'gem') { if (!full && o._got) continue; if (full) o._got = false; }
      else if (o.type === 'coin') { if (coins[o.id]) continue; }
      else if (o.type === 'enemy') {
        e.dir = -1; e.hw = 8; e.h = o.kind === 'flyer' ? 12 : 14;
        if (o.kind === 'flyer') { e.baseY = o.y + 6; e.y = e.baseY; }
        e.dead = 0;
      } else if (o.type === 'mover') { e.cx = o.x; e.cy = o.y; e.dx = 0; e.dy = 0; e.w = 48; movers.push(e); }
      else if (o.type === 'checkpoint') { e.idx = cpi++; e.on = e.idx <= save.cp; }
      else if (o.type === 'spring') { e.anim = 0; }
      e.src = o;
      ents.push(e);
    }
    P = { x: save.x, y: save.y, vx: 0, vy: 0, hw: 6, h: 24, face: 1, onGround: true, coyote: 0, buffer: 0, duck: false, inv: 0, hp: 3,
      lock: 0, dead: 0, runD: 0, idleT: 0, skid: false, ride: null, win: false, landT: 0 };
    cam = { x: 0, y: 0, look: 0 };
    cam.x = clamp(P.x - W / 2, 0, LW - W); cam.y = clamp(P.y - H * 0.64, 0, LH - H);
    hud = { gemPulse: 0, hpFlash: 0 };
    hitstop = 0; shake = 0;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function addFx(frames, x, y, rate, o) {
    if (!frames) return;
    fx.push(Object.assign({ frames: Array.isArray(frames) ? frames : [frames], x, y, t: 0, rate: rate || 4, vx: 0, vy: 0, g: 0 }, o));
  }
  const IT = () => A.items || {};

  // ---------- player ----------
  function hurt(fromX) {
    if (P.inv > 0 || P.dead || P.win) return;
    P.hp--; hud.hpFlash = 30;
    if (P.hp <= 0) return die();
    P.inv = 100; P.lock = 22; P.vy = -3.4; P.vx = (P.x < fromX ? -1 : 1) * 1.8; P.onGround = false; P.ride = null;
    AU.sfx('hurt'); shake = 6;
  }
  function die(drown) {
    if (P.dead) return;
    P.dead = 1; P.hp = 0; P.vx = 0; P.vy = drown ? 1 : -5.2; P.drown = !!drown; P.ride = null;
    AU.stop(); AU.sfx('die');
  }
  function addGem(n) {
    gems += n; hud.gemPulse = 8;
    if (gems >= 100) { gems -= 100; lives++; AU.sfx('heart'); }
  }

  function updatePlayer() {
    if (P.dead) {
      P.dead++;
      if (!P.drown) { P.vy = Math.min(P.vy + 0.25, 6); P.y += P.vy; }
      else { P.vy = Math.min(P.vy + 0.02, 0.6); P.y += P.vy; }
      if (P.dead === 100) transition(() => {
        lives--;
        if (lives <= 0) { state = 'gameover'; stateT = 0; AU.music('gameover'); }
        else { resetLevel(false); AU.music('level'); }
      });
      return;
    }
    if (P.inv > 0) P.inv--;
    if (P.lock > 0) P.lock--;
    if (P.landT > 0) P.landT--;
    const ctl = P.lock === 0 && !P.win;
    const dir = ctl ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
    P.duck = ctl && P.onGround && inp.down && !dir;
    P.h = P.duck ? 15 : 24;
    P.skid = false;
    if (dir) {
      if (P.vx * dir < 0) { P.vx += dir * TURN; if (P.onGround && Math.abs(P.vx) > 1) { P.skid = true; if (frame % 5 === 0) addFx(IT().dust, P.x + P.face * 6, P.y - 8, 4); } }
      else if (Math.abs(P.vx) < MAXV) P.vx = clamp(P.vx + dir * (P.onGround ? ACC : AIR_ACC), -MAXV, MAXV);
      P.face = dir;
    } else if (P.onGround || P.win) {
      const f = P.duck ? FRIC * 0.8 : FRIC;
      P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f;
    } else P.vx *= 0.985;
    // slopes: a little push downhill, a little drag uphill
    let maxv = MAXV;
    if (P.onGround && !P.ride && Math.abs(P.vx) > 0.3) {
      const ga = groundAt(P.x - 4, P.y - 10, P.y + 10, P.y), gb = groundAt(P.x + 4, P.y - 10, P.y + 10, P.y);
      if (ga !== null && gb !== null) {
        const sl = clamp((gb - ga) / 8, -1, 1); // >0 = ground descends to the right
        P.vx += sl * 0.05;
        const along = sl * Math.sign(P.vx);
        maxv = MAXV * (along > 0 ? 1 + 0.32 * along : 1 + 0.14 * along);
      }
    }
    if (Math.abs(P.vx) > maxv) P.vx -= Math.sign(P.vx) * Math.min(0.06, Math.abs(P.vx) - maxv);
    P.vx = clamp(P.vx, -MAXV * 1.35, MAXV * 1.35);

    // riding a moving platform: carried before own movement
    if (P.ride) { moveX(P, P.ride.dx); P.y = P.ride.y; }

    // jump
    if (ctl && inp.jumpP) P.buffer = BUFFER; else if (P.buffer > 0) P.buffer--;
    if (P.onGround) P.coyote = COYOTE; else if (P.coyote > 0) P.coyote--;
    if (ctl && P.buffer > 0 && P.coyote > 0) {
      P.vy = -JUMP - Math.abs(P.vx) * 0.08; P.onGround = false; P.coyote = 0; P.buffer = 0; P.ride = null; P.jumping = true;
      AU.sfx('jump'); addFx(IT().dust, P.x, P.y - 8, 4);
    }
    if (P.jumping && !inp.jump && P.vy < -JUMP_CUT) P.vy = -JUMP_CUT;
    if (P.vy >= 0) P.jumping = false;

    if (moveX(P, P.vx)) P.vx = 0;

    // vertical
    const prevY = P.y, wasGround = P.onGround;
    P.vy = Math.min(P.vy + (P.vy < 0 ? G_UP : G_DOWN), MAXFALL);
    P.y += P.vy;
    if (P.vy < 0) {
      const hy = P.y - P.h;
      for (const sx of [P.x, P.x - P.hw + 1, P.x + P.hw - 1]) {
        if (solidPx(sx, hy)) {
          const b = blocks.get((Math.floor(sx) >> 4) + (Math.floor(hy) >> 4) * 1000);
          P.y = ((Math.floor(hy) >> 4) + 1) * 16 + P.h; P.vy = 0.5; P.jumping = false;
          if (b) bumpBlock(b); else AU.sfx('land');
          break;
        }
      }
    }
    P.onGround = false;
    if (P.vy >= 0) {
      const snap = wasGround ? 6 : 0;
      const yFrom = Math.min(prevY, P.y) - 10, yTo = P.y + snap;
      let gy = groundAt(P.x, yFrom, yTo, prevY);
      if (gy === null) {
        const a = groundAt(P.x - P.hw + 1, yFrom, yTo, prevY), b = groundAt(P.x + P.hw - 1, yFrom, yTo, prevY);
        gy = a === null ? b : b === null ? a : Math.min(a, b);
      }
      if (gy !== null) {
        P.y = gy; P.onGround = true; P.ride = null;
        if (!wasGround) { if (P.vy > 2.5) { addFx(IT().dust, P.x - 5, P.y - 8, 4); addFx(IT().dust, P.x + 5, P.y - 8, 4, { flip: true }); AU.sfx('land'); P.landT = 5; } }
        P.vy = 0;
      }
    }
    // moving platforms
    if (!P.onGround && P.vy >= 0) {
      for (const m of movers) {
        const stick = P.ride === m ? 6 : 0;
        if (Math.abs(P.x - m.x) < m.w / 2 + 3 && prevY <= m.y - m.dy + 1 + stick && P.y >= m.y - stick) {
          if (P.ride !== m && P.vy > 2.5) AU.sfx('land');
          P.y = m.y; P.vy = 0; P.onGround = true; P.ride = m;
          break;
        }
      }
      if (!P.onGround) P.ride = null;
    }
    // anim counters
    if (P.onGround && Math.abs(P.vx) > 0.2) { P.runD += Math.abs(P.vx); P.idleT = 0; } else P.idleT++;
    if (P.onGround && Math.abs(P.vx) > 2.2 && frame % 14 === 0) addFx(IT().dust, P.x - P.face * 8, P.y - 8, 5);

    // hazards
    if (P.y > L.waterY + 14 && !P.win) {
      addFx(IT().splash, P.x - 16, L.waterY - 20, 4); AU.sfx('splash'); die(true);
    }
  }

  function bumpBlock(b) {
    if (b.used) { AU.sfx('land'); return; }
    b.bump = 10; AU.sfx('block');
    const bx = b.tx * T + 8, by = b.ty * T;
    if (b.content === 'heart') {
      b.used = true;
      ents.push({ type: 'heart', x: bx, y: by + 8, rise: 16, t: 0 });
    } else {
      b.hits--; if (b.hits <= 0) b.used = true;
      addGem(1); AU.sfx('gem');
      addFx(IT().gem, bx - 8, by - 16, 3, { vy: -3.2, g: 0.22, life: 26, then: 'sparkle' });
    }
    if (b.used) b.src._used = true;
    // defeat enemies standing on the block
    for (const e of ents) if (e.type === 'enemy' && !e.dead && Math.abs(e.x - bx) < 14 && Math.abs(e.y - by) < 4) killEnemy(e, true);
  }
  function killEnemy(e, pop) {
    e.dead = 1; AU.sfx('stomp');
    if (e.kind !== 'walker' || pop) { e.dead = 100; addFx(IT().poof, e.x - 12, e.y - 22, 4); }
  }

  const overlap = (ax, ay, ahw, ah, bx, by, bhw, bh) => Math.abs(ax - bx) < ahw + bhw && ay > by - bh && ay - ah < by;

  function updateEnts() {
    for (const m of movers) {
      m.t++;
      const a = (m.t / m.period) * Math.PI * 2 + (m.phase || 0);
      const nx = m.cx + Math.round(Math.sin(a) * m.ax), ny = m.cy + Math.round(Math.sin(a) * m.ay);
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    }
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.x !== undefined && (e.x < cam.x - 80 || e.x > cam.x + W + 80) && e.type !== 'mover') continue;
      e.t++;
      switch (e.type) {
        case 'gem':
          if (!P.dead && Math.abs(P.x - e.x) < 11 && Math.abs(P.y - 12 - e.y) < 16) {
            e.src._got = true; ents.splice(i, 1); addGem(1); AU.sfx('gem'); addFx(IT().sparkle, e.x - 8, e.y - 8, 4);
          }
          break;
        case 'coin':
          if (!P.dead && Math.abs(P.x - e.x) < 15 && Math.abs(P.y - 12 - e.y) < 20) {
            coins[e.id] = true; ents.splice(i, 1); AU.sfx('bigcoin');
            for (let k = 0; k < 6; k++) addFx(IT().sparkle, e.x - 8 + Math.cos(k) * 14, e.y - 8 + Math.sin(k) * 14, 5, { delay: k * 3 });
          }
          break;
        case 'heart':
          if (e.rise > 0) { e.rise--; e.y--; }
          else if (!P.dead && Math.abs(P.x - e.x) < 12 && Math.abs(P.y - 12 - e.y) < 16) {
            ents.splice(i, 1); P.hp = Math.min(3, P.hp + 1); AU.sfx('heart'); addFx(IT().sparkle, e.x - 8, e.y - 8, 4);
          }
          break;
        case 'block': if (e.bump > 0) e.bump--; break;
        case 'spring':
          if (e.anim > 0) e.anim--;
          if (!P.dead && P.vy > 0 && Math.abs(P.x - e.x) < 11 && P.y > e.y - 15 && P.y < e.y - 2) {
            P.y = e.y - 12; P.vy = -8.7; P.onGround = false; P.jumping = false; P.ride = null; e.anim = 16;
            AU.sfx('spring'); addFx(IT().dust, P.x, P.y - 4, 4);
          }
          break;
        case 'spikes':
          if (!P.dead && Math.abs(P.x - (e.tx * T + 8)) < 6 + 7 && P.y > e.ty * T + 6 && P.y - P.h < e.ty * T + 16) hurt(P.x - P.face);
          break;
        case 'checkpoint':
          if (!e.on && !P.dead && Math.abs(P.x - e.x) < 10 && Math.abs(P.y - e.y) < 32) {
            e.on = true; save = { x: e.x, y: e.y, cp: e.idx }; AU.sfx('checkpoint');
            for (const o of ents) if (o.type === 'checkpoint' && o.idx < e.idx) o.on = true;
            addFx(IT().sparkle, e.x - 8, e.y - 36, 4);
          }
          break;
        case 'goal':
          if (!P.win && !P.dead && P.x > e.x - 6) {
            P.win = true; e.done = true; state = 'clear'; stateT = 0; AU.music('clear');
            clearInfo = { time: Math.floor(time / 60), gems, coins: coins.filter(Boolean).length };
          }
          break;
        case 'enemy': updateEnemy(e, i); break;
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      if (f.delay > 0) { f.delay--; continue; }
      f.t++; f.x += f.vx; f.y += f.vy; f.vy += f.g;
      const end = f.life || f.frames.length * f.rate;
      if (f.t >= end) { if (f.then) addFx(IT()[f.then], f.x, f.y, 4); fx.splice(i, 1); }
    }
  }

  function updateEnemy(e, i) {
    if (e.dead) { e.dead++; if (e.dead > 28) ents.splice(i, 1); return; }
    if (e.kind === 'flyer') {
      e.x += e.dir * 0.6;
      if (e.x < e.min) e.dir = 1; else if (e.x > e.max) e.dir = -1;
      e.y = e.baseY + Math.round(Math.sin(e.t / 22) * 7);
    } else {
      const sp = e.kind === 'spiker' ? 0.3 : 0.45;
      const ox = e.x;
      const hit = moveX(e, e.dir * sp);
      const gy = groundAt(e.x + e.dir * 5, e.y - 10, e.y + 7, e.y);
      if (hit || gy === null || e.x < e.min || e.x > e.max) { e.x = ox; e.dir = -e.dir; }
      else { const g2 = groundAt(e.x, e.y - 10, e.y + 7, e.y); if (g2 !== null) e.y = g2; }
    }
    if (P.dead || P.win) return;
    if (overlap(P.x, P.y, P.hw, P.h, e.x, e.y, e.hw - 1, e.h)) {
      const stompable = e.kind !== 'spiker';
      if (stompable && P.vy > 0 && P.y - P.vy <= e.y - e.h + 7) {
        killEnemy(e);
        P.y = e.y - e.h; P.vy = inp.jump ? -5.6 : -3.8; P.jumping = inp.jump; P.onGround = false;
        hitstop = 4; shake = 3;
        addFx(IT().sparkle, e.x - 8, e.y - e.h - 6, 3);
      } else hurt(e.x);
    }
  }

  function updateCamera(snapNow) {
    cam.look += (P.face * 26 - cam.look) * 0.04;
    const tx = clamp(P.x + cam.look - W / 2, 0, LW - W);
    cam.x += (tx - cam.x) * (snapNow ? 1 : 0.14);
    let ty = cam.y;
    const anchor = P.y - H * 0.64;
    if (P.onGround) ty = anchor;
    else if (P.y - cam.y < 56) ty = P.y - 56;
    else if (P.y - cam.y > H - 60) ty = P.y - (H - 60);
    ty = clamp(ty, 0, LH - H);
    cam.y += (ty - cam.y) * (snapNow ? 1 : P.onGround ? (Math.abs(ty - cam.y) > 24 ? 0.12 : 0.07) : 0.2);
  }

  // ---------- main update ----------
  function update() {
    pollInput();
    frame++;
    if (trans) {
      trans.t++;
      if (trans.phase === 'out') {
        if (trans.t >= TR + 6) { trans.fn(); trans.phase = 'in'; trans.t = 0; }
        return;
      } else if (trans.t >= TR) trans = null;
    }
    if (state === 'boot') {
      stateT++;
      if (inp.anyP) { AU.init(); AU.sfx('select'); transition(toTitle); }
      return;
    }
    if (state === 'title') {
      stateT++; time++;
      // attract mode: slow pan over the start of the level
      cam.x = 190 - 190 * Math.cos(stateT / 260); cam.y = LH - H;
      P.idleT++;
      updateEnts();
      if (inp.anyP && stateT > 20) { AU.sfx('select'); AU.stop(); transition(startGame); }
      return;
    }
    if (state === 'gameover') {
      stateT++;
      if (inp.anyP && stateT > 90) transition(toTitle);
      return;
    }
    if (inp.startP && state === 'play' && !P.dead) { paused = !paused; AU.sfx('pause'); }
    if (paused) return;
    if (hitstop > 0) { hitstop--; return; }
    if (shake > 0) shake--;
    if (cardT > 0) cardT--;
    if (hud.gemPulse > 0) hud.gemPulse--;
    if (hud.hpFlash > 0) hud.hpFlash--;
    if (state === 'play') time++;
    if (state === 'clear') {
      stateT++;
      if (inp.anyP && stateT > 260) { transition(toTitle); return; }
    }
    updatePlayer();
    updateEnts();
    updateCamera(false);
  }
  function toTitle() { resetLevel(true); state = 'title'; stateT = 0; time = 0; paused = false; AU.music('title'); }
  function startGame() {
    resetLevel(true);
    state = 'play'; stateT = 0; time = 0; paused = false; cardT = 190;
    AU.music('level');
  }

  // ---------- rendering ----------
  const buf = G.cv(W, H), bx = buf.ctx;
  function img(ctx, im, x, y, flip) {
    if (!im) return;
    x = Math.round(x); y = Math.round(y);
    if (flip) { ctx.save(); ctx.translate(x + im.width, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0); ctx.restore(); }
    else ctx.drawImage(im, x, y);
  }
  const frameOf = (arr, t, rate) => (arr ? (Array.isArray(arr) ? arr[Math.floor(t / rate) % arr.length] : arr) : null);

  G.drawBackground = function (ctx, B, camX, camUp, t) {
    if (!B) { ctx.fillStyle = '#5cc8f8'; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(B.sky, 0, 0);
    for (const Ly of B.layers) {
      const w = Ly.img.width;
      let x = -((camX * Ly.speed + (Ly.auto || 0) * t) % w);
      if (x > 0) x -= w;
      const y = Math.round(Ly.y + camUp * Ly.speed * 0.5);
      for (x = Math.floor(x); x < W; x += w) ctx.drawImage(Ly.img, x, y);
    }
  };

  function textW(s, sc) {
    const F = IT().font; let w = 0;
    for (const ch of s) w += ch === ' ' ? 6 : ((F && F[ch] ? F[ch].width : 8));
    return w * (sc || 1);
  }
  function text(ctx, s, x, y, align, sc) {
    s = String(s).toUpperCase(); sc = sc || 1;
    const F = IT().font;
    if (align === 'center') x -= textW(s, sc) / 2; else if (align === 'right') x -= textW(s, sc);
    x = Math.round(x); y = Math.round(y);
    for (let ch of s) {
      if (ch === ' ') { x += 6 * sc; continue; }
      if (ch === 'X' && F && !F.X && F.x) ch = 'x';
      const gph = F && (F[ch] || F[ch.toLowerCase()]);
      if (gph) { ctx.drawImage(gph, x, y, gph.width * sc, gph.height * sc); x += gph.width * sc; }
      else { ctx.fillStyle = '#fff8e8'; ctx.font = 8 * sc + 'px monospace'; ctx.fillText(ch, x, y + 7 * sc); x += 8 * sc; }
    }
  }
  G.text = text;

  function drawDecor(ctx, layer, cx, cy) {
    const Dc = A.decor; if (!Dc) return;
    for (const d of L.decor) {
      if (d.layer !== layer || d.x < cx - 80 || d.x > cx + W + 80) continue;
      const im = frameOf(Dc[d.kind], time + d.x, 28);
      if (!im) continue;
      img(ctx, im, d.x - (im.width >> 1) - cx, (d.hang ? d.y : d.y - im.height + (layer === 'back' ? 2 : 0)) - cy);
    }
  }

  function drawWorld(ctx, cx, cy) {
    const Tn = A.terrain || {}, It = IT(), En = A.enemies || {}, Dc = A.decor || {};
    drawDecor(ctx, 'back', cx, cy);
    terrain.draw(ctx, cx, cy);
    // one-way platforms
    if (Tn.platform) {
      const c0 = Math.floor(cx / T), c1 = c0 + W / T + 1, r0 = Math.max(0, Math.floor(cy / T)), r1 = Math.min(L.rows - 1, r0 + 15);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (tileCh(c, r) !== '=') continue;
        const l = tileCh(c - 1, r) === '=', rr = tileCh(c + 1, r) === '=';
        img(ctx, l && rr ? Tn.platform.m : !l ? Tn.platform.l : Tn.platform.r, c * T - cx, r * T - cy);
        if (!l && !rr) { ctx.drawImage(Tn.platform.l, 0, 0, 8, 16, c * T - cx, r * T - cy, 8, 16); ctx.drawImage(Tn.platform.r, 8, 0, 8, 16, c * T + 8 - cx, r * T - cy, 8, 16); }
      }
    }
    // waterfalls
    if (Dc.waterfall) for (const f of L.falls) {
      if (f.x < cx - 64 || f.x > cx + W + 16) continue;
      const wf = frameOf(Dc.waterfall, time, 6);
      ctx.save(); ctx.beginPath(); ctx.rect(f.x - cx, f.y0 + 6 - cy, 32, f.y1 - f.y0 - 6); ctx.clip();
      for (let y = f.y0; y < f.y1; y += 32) ctx.drawImage(wf, f.x - cx, y - cy);
      ctx.restore();
      img(ctx, frameOf(Dc.waterfallTop, time, 6), f.x - cx, f.y0 - 6 - cy);
    }
    // entities (static objects first)
    for (const e of ents) {
      if (e.x !== undefined && (e.x < cx - 48 || e.x > cx + W + 48)) continue;
      switch (e.type) {
        case 'block': {
          if (e.tx * T < cx - 16 || e.tx * T > cx + W) break;
          const off = e.bump > 0 ? -Math.round(Math.sin((e.bump / 10) * Math.PI) * 5) : 0;
          img(ctx, e.used ? Tn.blockUsed : frameOf(Tn.block, time, 9), e.tx * T - cx, e.ty * T - cy + off);
          break;
        }
        case 'spikes': img(ctx, Tn.spikes, e.tx * T - cx, e.ty * T - cy); break;
        case 'spring': { const s = Tn.spring; if (s) img(ctx, e.anim > 12 ? s[1] : e.anim > 0 ? s[2] : s[0], e.x - 8 - cx, e.y - 24 - cy); break; }
        case 'sign': img(ctx, Tn.sign, e.x - 8 - cx, e.y - 16 - cy); break;
        case 'checkpoint': if (Tn.checkpoint) img(ctx, e.on ? frameOf(Tn.checkpoint.on, time, 7) : Tn.checkpoint.off[0], e.x - 8 - cx, e.y - 32 - cy); break;
        case 'goal': img(ctx, frameOf(Tn.goal, time, e.done ? 4 : 9), e.x - 16 - cx, e.y - 48 - cy); break;
        case 'mover': img(ctx, Tn.moving, e.x - 24 - cx, e.y - cy); break;
      }
    }
    for (const e of ents) {
      if (e.x === undefined || e.x < cx - 48 || e.x > cx + W + 48) continue;
      switch (e.type) {
        case 'gem': img(ctx, frameOf(It.gem, time + e.x * 0.5, 6), e.x - 8 - cx, e.y - 8 - cy + Math.round(Math.sin((time + e.x) / 16) * 1.5)); break;
        case 'coin': img(ctx, frameOf(It.bigCoin, time, 7), e.x - 12 - cx, e.y - 12 - cy + Math.round(Math.sin(time / 20) * 2)); break;
        case 'heart': img(ctx, frameOf(It.heart, time, 20), e.x - 8 - cx, e.y - 8 - cy); break;
        case 'enemy': {
          const set = En[e.kind]; if (!set) break;
          let im;
          if (e.dead) { if (e.dead >= 100) break; im = set.squash ? set.squash[0] : null; }
          else im = frameOf(set.walk || set.fly, e.t, e.kind === 'flyer' ? 5 : 8);
          img(ctx, im, e.x - 12 - cx, e.y - 24 - cy + (e.kind === 'flyer' ? 6 : 1), e.dir > 0);
          break;
        }
      }
    }
    drawPlayer(ctx, cx, cy);
    for (const f of fx) {
      if (f.delay > 0) continue;
      img(ctx, f.frames[Math.min(f.frames.length - 1, Math.floor(f.t / f.rate) % (f.life ? f.frames.length : 999))], f.x - cx, f.y - cy, f.flip);
    }
    // water over everything in the pits
    if (Dc.water) for (const w of L.water) {
      if (w.x1 < cx || w.x0 > cx + W) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(w.x0 - cx, w.y - 4 - cy, w.x1 - w.x0, LH - w.y + 4); ctx.clip();
      ctx.globalAlpha = 0.86;
      for (let y = w.y + 4; y < LH; y += 32) for (let x = w.x0 - (w.x0 % 32); x < w.x1; x += 32) ctx.drawImage(Dc.water.body, x - cx, y - cy);
      ctx.globalAlpha = 1;
      const sf = frameOf(Dc.water.surface, time, 10);
      for (let x = w.x0 - (w.x0 % 32); x < w.x1; x += 32) ctx.drawImage(sf, x - cx, w.y - 4 - cy);
      ctx.restore();
    }
    if (Dc.splash) for (const f of L.falls) {
      if (f.x < cx - 64 || f.x > cx + W + 16) continue;
      img(ctx, frameOf(Dc.splash, time, 6), f.x - 8 - cx, f.y1 - 12 - cy);
    }
    drawDecor(ctx, 'fore', cx, cy);
  }

  function drawPlayer(ctx, cx, cy) {
    const S = A.player;
    if (!S) { ctx.fillStyle = '#f07a1c'; ctx.fillRect(P.x - 6 - cx, P.y - 24 - cy, 12, 24); return; }
    if (P.inv > 0 && !P.dead && (P.inv >> 1) & 1) return;
    let im;
    if (P.dead) im = S.hurt[0];
    else if (P.win && P.onGround && Math.abs(P.vx) < 0.1) im = frameOf(S.win, stateT, 16);
    else if (P.lock > 0) im = S.hurt[0];
    else if (!P.onGround) im = P.vy < 0 ? S.jump[P.vy < -2.4 ? 0 : S.jump.length - 1] : S.fall[P.vy < 3 ? 0 : S.fall.length - 1];
    else if (P.duck || P.landT > 2) im = S.duck[0];
    else if (P.skid) im = S.skid[0];
    else if (Math.abs(P.vx) > 0.2) im = S.run[Math.floor(P.runD / 6.5) % S.run.length];
    else im = S.idle[[0, 1, 2, 1, 0, 1, 2, 3][Math.floor(P.idleT / 11) % 8] % S.idle.length];
    img(ctx, im, P.x - 16 - cx, P.y - 31 - cy, P.face < 0);
  }

  function drawHUD(ctx) {
    const It = IT(), Hd = It.hud || {};
    for (let i = 0; i < 3; i++) {
      const on = i < P.hp;
      const flash = hud.hpFlash > 0 && (hud.hpFlash >> 2) & 1;
      img(ctx, on && !flash ? Hd.heart : Hd.heartEmpty, 6 + i * 15, 5);
    }
    img(ctx, Hd.gem || (It.gem && It.gem[0]), 58, 5 - (hud.gemPulse > 4 ? 1 : 0));
    text(ctx, 'x' + String(gems).padStart(2, '0'), 75, 9);
    for (let i = 0; i < 3; i++) img(ctx, coins[i] ? Hd.coinOn : Hd.coinOff, W / 2 - 26 + i * 18, 5);
    img(ctx, A.player && A.player.icon, W - 46, 5);
    text(ctx, 'x' + lives, W - 28, 9);
  }

  function render() {
    const B = A.bg;
    if (state === 'boot') {
      bx.fillStyle = '#1a1226'; bx.fillRect(0, 0, W, H);
      if (A.player) img(bx, A.player.idle[Math.floor(frame / 12) % A.player.idle.length], W / 2 - 16, 70);
      if ((frame >> 5) & 1) text(bx, isTouch ? 'TAP TO BEGIN' : 'CLICK OR PRESS ANY KEY', W / 2, 116, 'center');
      text(bx, G.rotated ? 'HOLD YOUR PHONE SIDEWAYS' : 'SOUND ON FOR THE FULL 16-BIT EXPERIENCE', W / 2, 190, 'center');
      drawIris();
      return;
    }
    if (state === 'title') {
      const tcx = Math.round(cam.x), tcy = Math.round(cam.y);
      G.drawBackground(bx, B, tcx, 0, time / 60);
      drawWorld(bx, tcx, tcy);
      const lg = IT().logo;
      if (lg) img(bx, lg, (W - lg.width) / 2, 14 + Math.round(Math.sin(frame / 34) * 2));
      else text(bx, 'SUNFOX', W / 2, 40, 'center', 3);
      if ((frame >> 5) & 1) text(bx, isTouch ? 'TAP TO START' : 'PRESS ENTER', W / 2, 100, 'center');
      text(bx, isTouch ? '2026 SUNFOX TEAM' : 'ARROWS: MOVE   Z / SPACE: JUMP', W / 2, H - 12, 'center');
      drawIris();
      return;
    }
    let cx = Math.round(cam.x), cy = Math.round(cam.y);
    if (shake > 0) cy += (shake & 1 ? 1 : -1) * Math.ceil(shake / 3);
    G.drawBackground(bx, B, cx, LH - H - cam.y, time / 60);
    drawWorld(bx, cx, cy);
    drawHUD(bx);
    if (cardT > 0) {
      const t = 190 - cardT;
      const slide = t < 20 ? (20 - t) * 20 : cardT < 20 ? -(20 - cardT) * 20 : 0;
      bx.fillStyle = 'rgba(26,18,38,0.72)';
      bx.fillRect(0 - slide, 78, W, 44);
      bx.fillStyle = '#ffd630'; bx.fillRect(0 - slide, 78, W, 2); bx.fillRect(0 - slide, 120, W, 2);
      text(bx, L.name, W / 2 + slide, 86, 'center', 2);
      text(bx, 'ACT 1', W / 2 - slide, 108, 'center');
    }
    if (paused) {
      bx.fillStyle = 'rgba(26,18,38,0.6)'; bx.fillRect(0, 0, W, H);
      text(bx, 'PAUSE', W / 2, 96, 'center', 2);
    }
    if (state === 'clear') {
      const t = stateT;
      if (t > 60) {
        bx.fillStyle = 'rgba(26,18,38,0.72)'; bx.fillRect(72, 34, W - 144, 126);
        bx.fillStyle = '#ffd630'; bx.fillRect(72, 34, W - 144, 2); bx.fillRect(72, 158, W - 144, 2);
        text(bx, 'LEVEL CLEAR!', W / 2, 44, 'center', 2);
        const mm = Math.floor(clearInfo.time / 60), ss = String(clearInfo.time % 60).padStart(2, '0');
        if (t > 100) { text(bx, 'TIME', 100, 76); text(bx, mm + ':' + ss, W - 100, 76, 'right'); }
        if (t > 140) { text(bx, 'SUN SHARDS', 100, 94); text(bx, 'x' + clearInfo.gems, W - 100, 94, 'right'); }
        if (t > 180) {
          text(bx, 'STAR MEDALS', 100, 112);
          const Hd = IT().hud || {};
          for (let i = 0; i < 3; i++) img(bx, i < clearInfo.coins ? Hd.coinOn : Hd.coinOff, W - 100 - 52 + i * 18, 108);
        }
        if (t > 260 && (frame >> 5) & 1) text(bx, isTouch ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 140, 'center');
      }
    }
    if (state === 'gameover') {
      bx.fillStyle = 'rgba(26,18,38,0.8)'; bx.fillRect(0, 0, W, H);
      text(bx, 'GAME OVER', W / 2, 90, 'center', 2);
      if (stateT > 90 && (frame >> 5) & 1) text(bx, isTouch ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 124, 'center');
    }
    drawIris();
  }

  // Pixel-perfect iris wipe (scanlines, no anti-aliasing), centred on the hero when in play.
  function drawIris() {
    if (!trans) return;
    const k = trans.phase === 'out' ? 1 - Math.min(1, trans.t / TR) : Math.min(1, trans.t / TR);
    let ix = W / 2, iy = H / 2;
    if (state === 'play' || state === 'clear') { ix = clamp(Math.round(P.x - cam.x), 0, W); iy = clamp(Math.round(P.y - 14 - cam.y), 0, H); }
    const r = Math.round(k * k * 460);
    bx.fillStyle = '#1a1226';
    for (let y = 0; y < H; y++) {
      const dy = y - iy;
      if (Math.abs(dy) >= r) { bx.fillRect(0, y, W, 1); continue; }
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      if (ix - half > 0) bx.fillRect(0, y, ix - half, 1);
      if (ix + half < W) bx.fillRect(ix + half, y, W - ix - half, 1);
    }
  }

  // ---------- boot ----------
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  G.isTouch = isTouch;
  let screen, sctx;
  function resize() {
    if (!screen) return;
    const box = screen.parentElement;
    const ww = box.clientWidth || window.innerWidth, wh = box.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    let s = Math.min(ww / W, wh / H);
    // snap to a whole number of device pixels per game pixel when that costs little size
    const sd = s * dpr, si = Math.floor(sd);
    if (si >= 1 && si / sd > 0.86) s = si / dpr;
    screen.style.width = Math.floor(W * s) + 'px';
    screen.style.height = Math.floor(H * s) + 'px';
    screen.classList.toggle('soft', s * dpr < 1);
  }
  G.resize = resize;
  G.unlockAudio = () => AU.init();
  let acc = 0, last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(100, ts - last); last = ts;
    acc += dt;
    let n = 0;
    while (acc >= 1000 / 60 && n++ < 5) { update(); acc -= 1000 / 60; }
    if (n) { render(); sctx.drawImage(buf, 0, 0); }
  }
  G.boot = function (canvas, opts) {
    screen = canvas; screen.width = W; screen.height = H;
    sctx = screen.getContext('2d'); sctx.imageSmoothingEnabled = false;
    buildStatic();
    resetLevel(true);
    if (opts && opts.manual) return;
    resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !paused && !P.dead) paused = true; });
    requestAnimationFrame(t => { last = t; loop(t); });
  };

  // ---------- test / debug hooks ----------
  G.debug = {
    get P() { return P; }, get state() { return state; }, get cam() { return cam; }, get ents() { return ents; },
    get info() { return { state, x: P.x, y: P.y, vx: P.vx, vy: P.vy, hp: P.hp, dead: P.dead, onGround: P.onGround, gems, lives, coins: coins.slice(), time, win: P.win }; },
    start() { startGame(); cardT = 0; trans = null; },
    title() { toTitle(); trans = null; },
    key(k, v) { keys[k] = v; },
    step(n) { for (let i = 0; i < (n || 1); i++) update(); },
    teleport(x, y) { P.x = x; P.y = y === undefined ? L.surf(x / T - 0.5) : y; P.vx = P.vy = 0; updateCamera(true); for (let i = 0; i < 30; i++) updateCamera(true); },
    draw() { render(); sctx.drawImage(buf, 0, 0); },
    solidPx, groundAt,
    // full-level overview strip [x0, x0+w)
    overview(x0, w) {
      const c = G.cv(w, LH);
      // draw in screen-size slices so the culling in drawWorld still works
      for (let ox = 0; ox < w; ox += W) {
        for (let oy = 0; oy < LH; oy += H) {
          const s = G.cv(W, H);
          G.drawBackground(s.ctx, A.bg, x0 + ox, LH - H - oy, 0);
          drawWorld(s.ctx, x0 + ox, oy);
          c.ctx.drawImage(s, ox, oy);
        }
      }
      return c;
    },
  };
})();
