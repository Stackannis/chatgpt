# FIX PLAN — Round 1 (binding)

This plan overrides the GDD wherever they conflict. Update `docs/GDD.md` to match it.

**Balance tool:** port the human models from `review/gameplay/lib.js` (`good`, `avg`, `lazy`, `sloppy`, plus `bot`) into `js/debug/balance.js`. The command `?balance=1&models=good,avg,lazy&H=600,780&runs=24` must print a win% / stars / progress table. **All tuning is judged with these models, never with the perfect bot.** Paste the final tables into the README.

**Expected profile:** the expected profile (`EC.expectedProfile`) must model the new rules below: shared Toy Level, auto-equip, new costs. It must also add income from 0.5 failed attempts per level.

## Balance and difficulty

**gameplay-1, gameplay-2, gameplay-6: FIX.**

1. **Smooth curve.** Delete the per-level `TUNE` array. Replace it with a smooth global factor `g(L)`: piecewise-linear with at most 4 knots (L1, L12, L20, L30). Individual levels may get a correction of at most ±8%. `BOSS_TUNE` becomes one factor per world.
2. **Monotonicity, measured by wave HP per second (`review/gameplay/curve.js`):**
   - Each normal level must be ≥ 1.00× and ≤ 1.20× the previous normal level.
   - The first level of each world (L7, 13, 19, 25) is the exception: 0.85–0.95× of L−2.
3. **Forgiveness for imperfect steering.**
   - Hazards collide against a smaller squad hitbox, `Rh = min(24, 8 + 2·√Nvis)`, and hazard shapes collide at 85% of their visual size.
   - Minimum telegraph is 1.0 s in W1–W2 and 0.8 s afterwards. This includes the Donut Dasher, which goes from 0.8 to 1.0 s in W3 only.
   - Hazard cost becomes `max(listed, round(0.05·mid))`.
   - Boss hit costs are multiplied by world: W1 ×0.6, W2 ×0.75, W3+ ×1.
4. **No free ride early** (applies from L4).
   - Every level has at least 1 centre-blocking hazard (one covering x 150–210) per 15 s.
   - At least 40% of gate rows contain a trap gate.
   - From L7, at least 1 wave per level enters through the side lanes only.
5. **Target win-rate bands.** These apply to the expected profile, 24 seeds per cell, at **both H = 600 and H = 780**.

| | good, normal levels | good, boss | avg, normal levels | avg, boss |
|---|---|---|---|---|
| W1 (L1–6) | 95–100% | 85–95% | 85–100% | 65–85% |
| W2 (L7–12) | 88–98% | 75–90% | 70–88% | 50–70% |
| W3 (L13–18) | 82–94% | 65–85% | 60–80% | 40–60% |
| W4 (L19–24) | 78–92% | 60–80% | 55–75% | 35–55% |
| W5 (L25–30) | 72–90% | 55–75% (L30) | 50–70% | 30–50% (L30) |

   - **Lazy model:** may win L1–3. It must stay ≤ 50% on average over L4–12, ≤ 30% on L6 and L12, and ≤ 15% from L13.
   - **Bot:** ≥ 95% on every level. This is a sanity check that every level is possible.
   - **Shape of the curve:** for the good and avg models, normal levels may never be more than 10 percentage points *easier* than an earlier normal level in the same world. Each boss win% must be ≤ the lower of its two neighbours. The level after a boss must be ≥ the boss's win% + 10 points.
   - **Campaign check (`campaign.js`, fresh save, greedy spending, Helping Hand on):**
     - good finishes L30 in ≤ 55 attempts;
     - avg finishes L30 in ≤ 110 attempts;
     - no single level needs more than 8 attempts (good) or 15 attempts (avg).

**gameplay-8: FIX.** Gameplay must be identical for every screen height.
- Use a fixed design frame: squad y `sy = min(H − 110, 530)`, and offset `oy = sy − 530`.
- Every gameplay y-coordinate is `designY + oy`. That covers the spawn line (−40), Grumpcloud park height, Dasher stop height, boss anchor, and so on.
- On screens taller than 640, the space below the squad is road-only "thumb space".
- Acceptance: the H=600 and H=780 win% differ by ≤ 10 points per cell.

## Weapons

**gameplay-3: FIX.**
- **Shared Toy Level.** Replace per-weapon levels with one Toy Level (1–5) that applies to every weapon.
  - Cost to reach k is `150·1.8^(k−2)`, with no weapon-tier factor.
  - Lv3 and Lv5 perks apply to whichever weapon is equipped.
  - Save migration: Toy Level = highest owned weapon level.
- **New `eff` values:** Wand 1.00, Shaker 1.06, Gumball 1.12, Star 0.92, Cookie 1.24, Confetti 1.32, Beam 1.40.
- **Star Wand:** it stays the "easy aim" weapon but pays for it in damage and power.
  - 70° cone becomes 50°.
  - Turn rate 6 becomes 4.5 rad/s.
  - Homing never targets bosses' weak states.
  - It deals ×0.5 damage to shells and crates.
- **Roles are shown with an icon on the weapon card:**
  - Shaker: swarms.
  - Gumball: shells, crates and bosses (×1.5 boss damage).
  - Cookie: columns, pierces all.
  - Confetti: clusters, Twinjelly.
  - Beam: bosses and Elites.
- **Acceptance (`weapons_cmp.js`, good model, same Toy Level):** each weapon unlocked by world w must have a win% ≥ Star − 5 points on that world's levels. The newest unlocked weapon must be the best or within 5 points of the best on its world's levels.

**gameplay-4: FIX.**
- Auto-equip a weapon when it is unlocked.
- The result card shows "Equipped!" with a secondary button, "Keep [old weapon]".

## Economy and failure

**gameplay-5: FIX.**
- **Fail reward:** collected Buttons + `floor(winBase(L)·(0.15 + 0.6·progress))`, times luck.
- **Cheaper first steps:**
  - Power `40·1.30^k`
  - Quick Paws `50·1.35^k`
  - Buddy Start `80·1.6^k`
  - Shield and Lucky unchanged.
- **Helping Hand by consecutive fails:**
  - ≥2: +`max(3, round(0.1·mid))` pompoms.
  - ≥3: + 1 Shield charge.
  - ≥4: +15% damage, pompom bonus becomes `round(0.2·mid)`.
  - ≥6: +30% damage.
- **Boss levels after 3 fails:** offer "Go to boss" in the level card. It starts the boss fight with `round(mid)` + Helping Hand pompoms and earns no run-in Buttons. The glove icon shows its tier pips.

**gameplay-9: FIX.**
- **Lose title by progress:** <40% "Keep going!", 40–80% "Nice try!", >80% "So close!" (with FR equivalents).
- **Hint by cause:** track pompoms lost by source.
  1. Helping Hand tier just rose → glove.
  2. Otherwise, an upgrade is affordable → upgrade arrow.
  3. Otherwise, the hint names the biggest loss source: boss → dodge-telegraph pictogram; hazard → striped-hazard pictogram; enemy → "pop them early" pictogram; gates ≥ 30% of losses → blue-gates pictogram.

## Endless

**gameplay-7: FIX.**
- **Start:** `Le = 10`, squad `round(mid(10)) + buddy`, first gate row at t = 4 s.
- **Escalation:**
  - `Le = 10 + t/15`, so the curve rises faster.
  - From Le 20 to 40 the share of stingy gate rows rises 0 → 60%.
  - Elites rise 0 → 35%.
  - Hazard spacing shrinks from 15 s to 7 s.
  - A mini-boss every 90 s, with HP going from 50% to 100% of the formula over time.
- **Targets (24 runs):**
  - good: median survival 4–7 min;
  - avg: median 2–4 min;
  - bot: dies before 15 min in ≥ 80% of runs.

## Mobile and UX

**mobile-1: FIX, layout (no rotate overlay).** Playables forbids locking orientation and requires every aspect ratio to work.
- The gameplay canvas stays a portrait column at full height.
- DOM menus and overlays use the whole viewport, not the column: in landscape they become a two-column layout.
- The pause button and HUD counters move into the side bars when the column is narrower than 300 CSS px.
- Dragging works anywhere on screen, including the side bars.
- Show a one-time, dismissible toast: "Best in portrait".
- Acceptance at 640×360, 844×390 and 915×412: every tap target ≥ 44 CSS px, text ≥ 11 CSS px, nothing clipped.

**mobile-2: FIX.** Panels become scroll containers (`max-height:100%`, `overflow:auto`), and the pause screen uses two columns in landscape.

**mobile-3: FIX.** Quality scaler:
- Rolling window of 60 frames.
- Above 30 ms, step down two levels at once.
- At most 4 downward changes per minute; upward changes stay at the current rate.
- Cap DPR at 1.5 when the backing store is larger than 1.2 MP.

**mobile-4: FIX.** Hide tutorial hints while paused or while cards are shown. Overlay titles start below the HUD (y ≥ 110 u).

**mobile-6: FIX.** Minimum font size 11 CSS px, and the pause icon is drawn at 44 px or more.

**mobile-7: FIX.** Pad the HUD and DOM UI with `env(safe-area-inset-*)`.

**mobile-8: FIX.**
- All player projectiles get a 1.5 u rim in #4A3B52 at 60% opacity.
- Cookie colour #C98A4A becomes #8A4F1F, with a light icing dot.
- Bubbles become #2FC8F0.

## Debug, security and code

**code-1 and mobile-5: FIX.**
1. **`PP.cheated` flag.** It is true when any debug URL parameter is present, or god, autoplay, speed ≠ 1, or any squad, weapon or upgrade override is in use, or any mutating `__game` method has been called (give, forceWin, setGod, setSquad, resetSave, …). Calling a mutating method switches the session to no-persist mode on the spot.
2. **`sendScore` and the saved `endlessBest`** update only when `!PP.cheated`. The check lives in `platform.sendScore` and in `EC.settle`.
3. **`js/build_flags.js`** sets `PP.BUILD = 'web'`. Debug scripts are no longer static tags. A loader injects them only when `PP.BUILD !== 'playables'` and the game is not `IN_PLAYABLES_ENV`.
   - In Playables, URL parameters are ignored and `window.__game` does not exist.
   - Add `tools/package_playables.js` (Node, no dependencies). It copies the game to `dist/playables/` without `js/debug/` and `review/`, and sets `PP.BUILD = 'playables'`.
   - Standalone web keeps `__game` for Playwright.

**code-2: FIX.**
- The first finger owns steering, and extra `pointerdown` events are ignored for steering.
- Keep a map of active pointers. When the owner lifts, the oldest remaining pointer takes over with a fresh baseline, so the squad does not jump.

**code-3: FIX.**
- `pause` and `autoPause` do nothing once `G.over` is set. The result or ending screen appears immediately (or the 1.2 s delay cannot be interrupted).
- `sv.ended` is set only when the ending finishes or is skipped.
- Add a "Replay ending" button in Settings once `ended = 1`.

**code-4: FIX.** The beam hits the boss only when the boss is targetable: not in an `away`, `return` or `enter` state, and with `BS.y < G.sy`. Enemies in front of the squad are hit first.

**code-5: FIX.** Call `input.reset()` in `onCards` and in `chooseCard`. Ignore `dx` while `G.cards` is set.

**code-6: FIX.** Ignore `e.repeat` for P, Esc and Enter.

**code-7: FIX.** A loss is final. Once `G.state === 'lost'`, boss and enemy damage are ignored and `bossDefeated` returns immediately.

## WONTFIX

None. Every finding is fixed.

## Order and acceptance

1. Code fixes code-1 to code-7.
2. gameplay-8 (fixed design frame).
3. Weapons, economy and Helping Hand.
4. Port the human models and rewrite the expected profile.
5. Retune the curve and level hazards against the bands.
6. Endless.
7. Mobile and UX fixes.
8. Playables package.

**Acceptance for this round:**
- Every band above is met at H = 600 and H = 780.
- `curve.js` shows a monotonic curve.
- Every `review/code` test passes (t5b, t9, t13, t15, t16, t18 now pass).
- Landscape screenshots meet the mobile-1 criteria.
- The README holds the new balance tables.
