- **code-1 — MAJOR — Debug and test hooks ship live, and a cheated Endless score reaches the Playables leaderboard.**
  - **Problem:** `window.__game` is always exposed. The debug URL params (`god`, `autoplay`, `speed`, `seed`, `squad`) work in any session. `EC.settle` calls `PP.platform.sendScore` with no check for debug, god or autoplay.
  - **Evidence:** `t13_playables_mock.js` stubs `ytgame` and loads `?endless=1&god=1&autoplay=1&speed=8`. With `PP.noPersist` true, the platform still received `scores:[{"value":1822}]`. `t12_shop.js` shows `__game.give()` and `__game.resetSave()` writing to the real save in a normal session. The relevant code is `economy.js:19`, `debug.js:114-163` and `namespace.js:29-33`.
  - **Fix:** In the Playables build, strip `debug/` and `__game`, or gate them behind a build flag. Only call `sendScore` when `!PP.debugSession && !G.god && !G.autoplay && PP.loop.speed === 1`.

- **code-2 — MAJOR — A second finger hijacks steering, and the first finger stays dead after it lifts.**
  - **Problem:** `input.js:11-21` tracks a single `I.id` and overwrites it on every `pointerdown`. A resting thumb or a second finger steals control. When that finger lifts, `I.down` goes false while the first finger is still dragging.
  - **Evidence:** `t5b_pointers.js` sends pointerdown 1 then pointerdown 2, then moves pointer 1 by 100 px. The squad stays at x=180 and `I.id` is 2. After pointer 2 lifts, pointer 1 moves again and the squad still doesn't move (`down:false`).
  - **Fix:** Ignore `pointerdown` while `I.down` is true, so the first finger keeps control. Or keep a map of active pointers and fall back to a remaining one in `up()`.

- **code-3 — MINOR — The Level 30 ending can be lost permanently by pausing during the 1.2 s result delay.**
  - **Problem:** `GM.pause()` is allowed while `screen==='play'`, including after the run has finished. `GM.pending` is `{name:'ending'}` for 1.2 s. If the player pauses and then quits to the map or restarts, `GM.goto('map')` or `begin()` sets `pending=null`. The ending is skipped, but `EC.settle` has already set `ended=1` and consumed `firstClear` (`main.js:195`, `economy.js:27`).
  - **Evidence:** `t18_ending_skip.js` in a normal session: unlock 30, `forceWin`, pause, click `btn-pause-map`. The screen is `map` and `ended:1`. A second clear of L30 gives `pending.name:'win'`, not `'ending'`. Nothing in the UI replays the ending (only the debug `?screen=ending` does). `t3_state.js` (A1) also shows the pause screen opening over a finished level.
  - **Fix:** Refuse `GM.pause()` and `autoPause` when `PP.G.over` is true, or let the result screen take over immediately. Alternatively, only mark `ended` when the ending completes, and add a replay entry in Settings.

- **code-4 — MINOR — The Rainbow Beam damages the off-screen Donut boss and is blocked by it.**
  - **Problem:** `SH.beamTick` (`projectiles.js:189-194`) takes `bossY` whenever `BS.on` and `|BS.x - x| < half + rx`. There is no `BS.st !== 'away'` check and no y-position check. A boss that is rolling past the squad, or off-screen below it, still absorbs the beam and takes full beam DPS. Enemies in front of the squad are skipped.
  - **Evidence:** `t4_beam.js` on L18 with `weapon=beam` and the boss in state `away` at y=H+100, x=squad.x. Over 30 steps the boss lost 16.6 HP. The control, with the boss 200 px away, lost 0.
  - **Fix:** Skip the boss in `beamTick` unless `BS.y < G.sy` (or `BS.targetable()`) and `BS.st` isn't `away`, `return` or `enter`.

- **code-5 — MINOR — Drag input made behind the card overlay is replayed after a card is chosen.**
  - **Problem:** `setPointerCapture` keeps `pointermove` flowing while the card overlay covers the canvas, and `I.dx` keeps accumulating. `GM.chooseCard` does not call `PP.input.reset()` (only `pause` and `resume` do). The first `SQ.update` after the choice applies the whole `dx` at once.
  - **Evidence:** `t16_cards_dx.js` puts the thumb down, shows the cards, then slides it 120 px behind the overlay and lifts it. `I.dx` is 120. After `chooseCard(0)` the squad moves from x=180 to x=300.
  - **Fix:** Call `PP.input.reset()`, or `I.dx=0`, in `GM.chooseCard` and `GM.onCards`. Also zero `dx` while `G.cards` is set.

- **code-6 — MINOR — Holding P or Esc flickers between pause and resume.**
  - **Problem:** `input.js:62-70` does not ignore `e.repeat`. Each auto-repeat keydown toggles pause.
  - **Evidence:** `t15_keyrepeat.js` fires one keydown plus 6 repeat keydowns. The screen goes `pause > play > pause > play > pause > play > pause`.
  - **Fix:** Add `if (e.repeat) return;` for the esc, p and enter actions.

- **code-7 — MINOR — A boss kill after the squad hits 0 overwrites `lost` and records a win with 0 pompoms.**
  - **Problem:** `RUN.fail` sets `G.state='lost'`, but shots already in flight keep updating. `BS.damage` then calls `RUN.bossDefeated`, which sets `state='bossdown'`, and `RUN.finish(true)` reports a win (`runner.js:101-104, 169-170`). No `lost` guard is applied.
  - **Evidence:** `t9_lost_boss.js` on L6 sets boss HP to 5 and calls `SQ.hurt(9999)` with 29 shots in the air. The final result is `win:true`, `endSquad:0`, `stars:1`, `progress:1`, with no bridge.
  - **Fix:** In `bossDefeated`, `if (G.state === 'lost') return;`. Or in `BS.damage`, ignore hits once `G.state === 'lost'`. Pick one rule on purpose: either a mercy win with bridge and squad shown, or a loss.

- **Not verified (no finding):**
  - Real audio playback.
  - Firefox, iOS and bfcache restores. In theory a `pagehide` followed by a restore with no `visibilitychange` would leave `GM.hidden` true. I couldn't reproduce this.
  - The real Playables SDK. I tested only a mock `ytgame`.

- **Checked and clean:**
  - Save and migration handled 11 corrupt, old and extreme saves.
  - localStorage throwing in three modes, and a throwing SDK.
  - Debug sessions never touch the real save.
  - 1,500 fuzz steps with no throws or UI/state mismatches.
  - Restart after a boss fight is deterministic on L6, 12, 18, 24 and 30.
  - 180 level restarts showed no leaks.
  - Endless over 25 sim-minutes at squad 999 gave no NaN.
  - Resize storms and 20× CPU throttle were fine.
  - EN and FR dictionaries match.

**Verdict:** Solid and robust, with no blockers. Fix code-1 and code-2 before Playables submission, and fix code-3 so the ending isn't lost; the rest is polish.

The repro scripts are in `review/code/` (`t1_save.js` through `t18_ending_skip.js`).