# Pompom Parade

An original, cute lane-runner / crowd-shooter for phones (portrait, touch) that also plays with mouse and
keyboard. A marching band of fluffy pompom critters blows bubbles and sprinkles at the grumpy Grumblies;
every Grumbly that gets popped turns into sparkles and floats home smiling.

30 levels in 5 worlds, 5 bosses, 7 toy weapons, gates, in-run cards, a Workshop, an Endless mode, EN/FR.
Vanilla HTML5 canvas + JS: **no build step, no dependencies, no network requests, no asset files**
(all graphics and audio are generated in code). 56 files, about 490 KB uncompressed (Playables package:
52 files, about 433 KB).

The full spec is in [`docs/GDD.md`](docs/GDD.md) (v1.1). The round-1 review and its binding fix plan are in
`docs/reviews/` and [`docs/FIX_PLAN_R1.md`](docs/FIX_PLAN_R1.md).

## Run locally

- Double-click `index.html` (works from `file://`), or
- serve the folder with any static server, e.g. `npx serve .` or `python3 -m http.server`.

Controls: drag anywhere on the screen (touch or mouse, side bars included) to steer, or ←/→ / A/D.
Esc or P pauses. Firing is automatic. Works in any orientation: in landscape the game stays a portrait
column and the menus use the whole screen.

## Layout

```
index.html, css/style.css
js/build_flags.js      PP.BUILD = 'web' (the Playables package sets 'playables')
js/core   namespace, util (seeded RNG, pools), platform adapter, storage, i18n, input, audio, renderer, loop, quality,
          debug_loader (injects js/debug only in the web build, outside Playables)
js/data   balance curve, worlds, weapons, enemies, upgrades, patterns, levels (30 timelines), lang_en / lang_fr
js/gfx    procedural sprite painters + cache, digit atlas / icons, particles, fx, backgrounds
js/game   squad, projectiles, enemies, gates, obstacles, pickups, bosses, cards, endless, runner, economy, save
js/ui     DOM screens (menu, map, workshop, settings, pause/cards, results, ending), canvas HUD, tutorial
js/debug  URL params + window.__game, autoplay bot, simulated-human models, balance harness, level validator
tools/gen_levels.js          level authoring tool (per-level specs -> frozen beats in js/data/levels.js)
tools/package_playables.js   builds dist/playables/ (no debug code, BUILD = 'playables')
tests/    Playwright scripts (node tests/<name>.js)
```

## Debug URL parameters (standalone web build only)

Combinable. Any of them marks the session as a debug session: **no leaderboard score, no Endless record**
(`PP.cheated`), and an in-memory save unless `&save=1` is added. Inside YouTube Playables (and in the
Playables package) the query string is ignored completely and none of the debug code exists.

| Param | Effect |
|---|---|
| `level=N` / `endless=1` | start level N / Endless immediately |
| `autoplay=1` (`&model=good\|avg\|sloppy\|lazy`) | the bot steers and picks cards; with `model`, a simulated human does |
| `god=1` | squad never drops below 1 |
| `speed=K` | simulation speed 0.25–8 |
| `seed=S` | override the RNG seed |
| `squad=N`, `weapon=id`, `wlv=1..5` | starting squad / toy (`wand shaker gumball star cookie confetti beam`) / shared Toy Level |
| `upg=power:5,rate:3,…` | upgrade levels (`power rate buddy shield luck magnet`) |
| `profile=expected` | the greedy economy profile a player is expected to have at that level |
| `fails=N` | N consecutive fails on `level` (Helping Hand tiers, "Go to boss") |
| `unlockall=1`, `buttons=N` | unlock all levels and weapons; set Buttons |
| `lang=fr\|en`, `mute=1`, `quality=low\|mid\|high` | language, no audio, force a quality level (not debug parameters) |
| `fps=1`, `hitbox=1` | overlay (fps, frame ms, entities, draw calls, quality); hitboxes (green: enemy contact, yellow: the small hazard hitbox) |
| `tutorial=0`, `reset=1`, `nopause=1` | skip hints; wipe the save on load; do not pause on window blur |
| `screen=map\|shop\|settings\|win\|lose\|ending` (`&cause=boss\|hazard\|enemy\|gate`, `&progress=0..1`) | open a screen directly |
| `validate=1` | run the level validator and print the report |
| `balance=1&models=good,avg,lazy&H=600,780&runs=24` | run the balance harness and print the win% / stars / progress table |

Example: `index.html?level=12&autoplay=1&model=avg&speed=4&profile=expected`

## Test API (`window.__game`, standalone web build only)

`version`, `ready`, `cheated`, `getState()`, `startLevel(n, opts)`, `startEndless(opts)`, `goto(screen)`, `setSpeed(k)`,
`setGod(b)`, `setAutoplay(b)`, `setSquad(n)`, `pause()`, `resume()`, `step(frames)`, `skip(seconds)`,
`chooseCard(i)`, `forceWin()`, `forceLose()`, `give({buttons, unlock, weapons, toy})`, `getSave()`, `resetSave()`,
`events` (last 200), `on(type, cb)`, `validateLevels()`, `runBalance(opts)`, `balanceTable(opts)`, `simLevel(L, opts)`,
`simHuman(L, model, seed, opts)`.
Every **mutating** method (`give`, `forceWin`, `forceLose`, `setGod`, `setAutoplay`, `setSquad`, `setSpeed ≠ 1`, `step`,
`skip`, `resetSave`, starting a locked level) flags the session as cheated and stops persisting on the spot.
Events: `boot ready levelStart gatePassed cardOffered cardChosen bossStart bossPhase pompomLost levelWin levelFail purchase save`.
Every DOM button has a `data-testid`.

## Tests

Playwright with Chromium (`require('playwright')`), each script is standalone:

```
node tests/regress.js       # 59 regression checks for the round-1 findings (code-1..7, gameplay-3/4/5/7/8/9, Playables package)
node tests/e2e.js           # 52 UI checks: touch/mouse/keyboard, pause, win/lose, shop, map, cards, save round trip, FR, resize
node tests/mobile.js        # 99 checks: landscape / portrait layout audit, quality scaler, safe area, side-bar HUD, projectile rims
node tests/autoplay_all.js  # real render loop at 8x over all 30 levels
node tests/balance.js 24 good,avg,lazy 600,780   # balance table with the simulated-human models (see below)
node tests/balance.js 24 bot 600,780             # "every level is possible" check with the perfect bot
node tests/curve.js         # wave HP per second per level, monotonic-curve rules, validator
node tests/campaign.js good,avg 640 25 0,1,2     # full campaigns from a fresh save
node tests/weapons_cmp.js 16                     # toy order: newest toy vs. the others on its world's levels
node tests/endless_sim.js 24                     # Endless survival of good / avg / bot
node tests/weapons.js       # 7 toys x Toy Level 1/3/5 with the bot, determinism, validator, 12 min headless Endless
node tests/endless.js 90    # Endless with bot + god for 10+ game minutes, heap sampling, debug run leaves the record alone
node tests/perf.js 28 "&weapon=shaker&wlv=5&squad=80"   # frame times, also with 4x CPU throttle
node tests/shots.js [filter]  # screenshots of every screen / world / boss / round-1 state into tests/screenshots/
node tests/tune.js boss "1,0.8,0.6"              # sweep a balance factor (boss HP per world, or g) against the models
node tests/trace.js 18 expected 0 avg            # timeline of one run (losses with cause, gates, cards) for a model
node tools/gen_levels.js    # regenerate js/data/levels.js from the level specs and validate it
node tools/package_playables.js [--no-sdk]       # build dist/playables/
```

## Balance (round 1)

Balance is tuned and reported with **simulated-human player models, never with the perfect bot**
(`js/debug/humans.js`, a 1:1 port of the reviewers' `review/gameplay/lib.js`; `review/gameplay/winrates.js`
gives the same numbers cell for cell):

| Model | Reaction on top of the bot's 0.25 s | Steering noise | Best gate picked |
|---|---|---|---|
| `good` | +0.15 s | 12 u | 90 % |
| `avg` | +0.30 s | 20 u | 75 % |
| `sloppy` | +0.50 s | 30 u | 50 % |
| `lazy` | drifts around the centre (180 ± 45 u), never follows the bot | 6 u | random |
| `bot` | none (sanity check only) | 0 | 100 % |

Things to know about these models:

- They pick cards at random and use the **expected profile**: newest toy auto-equipped, shared Toy Level,
  round-1 costs, income of every level plus 0.5 failed attempts per level, greedy spending.
- The model writes its own position into its reaction buffer on the 5 of 6 simulation steps on which the bot
  does not refresh its target. Its effective steering speed is therefore roughly 60 u/s (`good`) and 25 u/s
  (`avg`) instead of the nominal 520 / 420 u/s: `avg` is close to a player who barely steers. The port keeps
  this on purpose (the plan binds tuning to these models), but it is why bosses now have slow, generous
  telegraphs, and it means real players will find the game easier than the `avg` column suggests.

### What changed in the levels

- No per-level retune table any more: enemy toughness is a smooth curve (`1.25 × 1.072^(L−1) × g(L)`, g has 4 knots,
  per-level corrections limited to ±8 % and currently unused), and every level is composed to a **wave-HP-per-second
  budget** that rises 14–18.5 % per normal level and dips to 92 % (of L−2) at each world opener
  (`node tests/curve.js`: monotonic, validator OK). Boss HP has one factor per world.
- Forgiveness: hazards and telegraphed attacks use a small squad hitbox (`min(24, 8 + 2·√N)`) and 85 % shapes, each
  hazard hurts once, telegraphs are ≥ 1.0 s (W1–W2) / 0.8 s, hazard cost is `max(listed, 5 % of mid)`, boss hits cost
  ×0.6 in W1 and ×0.75 in W2.
- No free ride from L4: a centre-blocking hazard at least every 15 s (10 s from W3 and in boss run-ins), ≥ 40 % of
  the gate rows carry a trap, the middle gate of a 3-gate row is never the best one, side-lane waves from L7, and
  every boss asks for a small dodge.
- Gameplay is bit-identical at every screen height (fixed design frame; the two height columns below are equal
  in every cell).

### Win-rate table (expected profile, 24 seeds per cell, screen heights 600 and 780)

`node tests/balance.js 24 good,avg,lazy 600,780`. Cell = win % / average stars / average progress %. `*` = boss level.

```
  L  toy weapon    M   good@600      good@780      avg@600       avg@780       lazy@600      lazy@780
  1   1 wand     1.00  100%/3.0/100  100%/3.0/100  96%/2.7/98    96%/2.7/98    100%/3.0/100  100%/3.0/100
  2   1 wand     1.06  100%/3.0/100  100%/3.0/100  100%/2.9/100  100%/2.9/100  100%/3.0/100  100%/3.0/100
  3   1 wand     1.16  100%/3.0/100  100%/3.0/100  100%/2.9/100  100%/2.9/100  100%/3.0/100  100%/3.0/100
  4   1 shaker   1.30  88%/2.8/93    88%/2.8/93    83%/2.5/93    83%/2.5/93    63%/1.8/81    63%/1.8/81
  5   1 shaker   1.35  96%/3.0/98    96%/3.0/98    92%/2.8/97    92%/2.8/97    79%/1.7/93    79%/1.7/93
  6*  1 shaker   1.42  92%/2.5/99    92%/2.5/99    50%/2.0/92    50%/2.0/92    38%/2.1/82    38%/2.1/82
  7   1 gumball  1.56  100%/2.4/100  100%/2.4/100  96%/1.8/98    96%/1.8/98    83%/2.3/95    83%/2.3/95
  8   1 gumball  1.63  100%/2.3/100  100%/2.3/100  83%/1.7/95    83%/1.7/95    67%/1.2/93    67%/1.2/93
  9   1 gumball  1.69  100%/2.7/100  100%/2.7/100  54%/2.2/87    54%/2.2/87    50%/1.5/72    50%/1.5/72
 10   1 gumball  1.69  83%/2.0/94    83%/2.0/94    50%/1.4/84    50%/1.4/84    21%/1.4/71    21%/1.4/71
 11   1 star     1.39  92%/2.2/97    92%/2.2/97    75%/1.6/91    75%/1.6/91    38%/1.4/74    38%/1.4/74
 12*  1 star     1.45  83%/2.4/93    83%/2.4/93    54%/1.5/81    54%/1.5/81    58%/2.0/85    58%/2.0/85
 13   2 star     1.60  75%/2.4/83    75%/2.4/83    67%/2.1/75    67%/2.1/75    4%/1.0/50     4%/1.0/50
 14   2 star     1.60  88%/2.1/97    88%/2.1/97    75%/1.9/94    75%/1.9/94    0%/0.0/53     0%/0.0/53
 15   2 cookie   2.23  88%/1.8/95    88%/1.8/95    63%/1.9/83    63%/1.9/83    0%/0.0/48     0%/0.0/48
 16   2 cookie   2.32  71%/1.5/89    71%/1.5/89    50%/1.3/82    50%/1.3/82    0%/0.0/46     0%/0.0/46
 17   2 cookie   2.32  83%/1.8/92    83%/1.8/92    54%/1.4/71    54%/1.4/71    17%/1.0/67    17%/1.0/67
 18*  2 cookie   2.40  88%/2.0/96    88%/2.0/96    21%/1.8/67    21%/1.8/67    0%/0.0/42     0%/0.0/42
 19   2 confetti 2.66  83%/1.9/94    83%/1.9/94    79%/1.4/92    79%/1.4/92    0%/0.0/50     0%/0.0/50
 20   3 confetti 2.91  92%/1.9/97    92%/1.9/97    54%/1.5/79    54%/1.5/79    13%/1.0/59    13%/1.0/59
 21   3 confetti 3.00  96%/2.2/99    96%/2.2/99    75%/1.9/95    75%/1.9/95    25%/1.0/71    25%/1.0/71
 22   3 confetti 3.12  83%/1.6/92    83%/1.6/92    71%/1.1/86    71%/1.1/86    0%/0.0/46     0%/0.0/46
 23   3 confetti 3.12  83%/2.0/88    83%/2.0/88    58%/1.5/75    58%/1.5/75    33%/1.0/79    33%/1.0/79
 24*  3 confetti 3.22  83%/2.2/97    83%/2.2/97    38%/1.9/77    38%/1.9/77    0%/0.0/42     0%/0.0/42
 25   3 beam     3.42  100%/2.1/100  100%/2.1/100  63%/1.7/87    63%/1.7/87    4%/1.0/45     4%/1.0/45
 26   3 beam     3.55  88%/1.7/97    88%/1.7/97    71%/1.4/92    71%/1.4/92    8%/1.0/61     8%/1.0/61
 27   4 beam     3.84  92%/2.1/95    92%/2.1/95    67%/1.6/89    67%/1.6/89    13%/1.0/48    13%/1.0/48
 28   4 beam     3.84  67%/2.3/81    67%/2.3/81    46%/1.9/64    46%/1.9/64    4%/1.0/43     4%/1.0/43
 29   4 beam     3.84  92%/1.5/96    92%/1.5/96    54%/1.3/81    54%/1.3/81    17%/1.0/64    17%/1.0/64
 30*  4 beam     3.99  71%/2.2/95    71%/2.2/95    50%/2.0/89    50%/2.0/89    13%/2.0/77    13%/2.0/77
```

World averages against the plan's bands (same at both heights):

| | good, normal | band | good, boss | band | avg, normal | band | avg, boss | band |
|---|---|---|---|---|---|---|---|---|
| W1 | 97 % | 95–100 ✔ | 92 % | 85–95 ✔ | 94 % | 85–100 ✔ | 50 % | 65–85 ✘ |
| W2 | 95 % | 88–98 ✔ | 83 % | 75–90 ✔ | 72 % | 70–88 ✔ | 54 % | 50–70 ✔ |
| W3 | 81 % | 82–94 ✘ (−1) | 88 % | 65–85 ✘ (+3) | 62 % | 60–80 ✔ | 21 % | 40–60 ✘ |
| W4 | 87 % | 78–92 ✔ | 83 % | 60–80 ✘ (+3) | 67 % | 55–75 ✔ | 38 % | 35–55 ✔ |
| W5 | 88 % | 72–90 ✔ | 71 % | 55–75 ✔ | 60 % | 50–70 ✔ | 50 % | 30–50 ✔ |

**Honest status: the bands hold on world average for the normal levels, not cell by cell.** With 24 seeds a
cell has a standard error of 6–10 points, and individual levels still scatter around their world's mean
(for example L10 83 %, L16 71 %, L28 67 % for `good`; L9/L10 50–54 %, L16 50 %, L28 46 % for `avg`). The
checker in `tests/balance.js` counts 46 band / shape misses per screen height:

- `good` (24 misses): 5 normal levels below their band (L4 88 %, L10 83 %, L13 75 %, L16 71 %, L28 67 %) and 7 above
  (L7–L9 100 %, L21 96 %, L25 100 %, L27 92 %, L29 92 %); bosses L18 (88 %) and L24 (83 %) are 3 points above theirs.
  Curve shape, 10 misses: a level more than 10 points easier than an earlier one of its world at L14, L15, L17,
  L21, L29; boss above a neighbour at L12 and L18; level after the boss less than 10 points easier at L7, L13, L19.
- `avg` (15 misses): bosses L6 (50 %) and L18 (21 %) are below their band; normal levels L4, L9, L10, L16, L17, L20,
  L28 are below theirs and L7, L19, L26 above; 3 shape misses (L11, L21, L22 easier than an earlier level by > 10).
- `lazy` (7 misses): L1–3 are won (allowed); the average over L4–12 is 55 % (limit 50), L6 is 38 % and L12 58 %
  (limit 30); from L13 it is ≤ 15 % on 14 of the 18 levels (L17 17 %, L21 25 %, L23 33 %, L29 17 % are above).
- Screen height: 0 cells differ between H = 600 and H = 780 (limit 10 points).
- Why the boss / lazy bands conflict: on a boss, `avg` (≈ 25 u/s) dodges hardly better than `lazy`, so every
  boss setting that lifts `avg` into its band also lifts `lazy` above its limit, and pushes `good` above its own.
  The current boss factors favour the `good` band and the campaign targets.

`bot` (sanity check, `node tests/balance.js 24 bot 600,780`): 100 % on all 30 levels at both heights.

### Campaign, toys, Endless, curve

```
node tests/campaign.js good,avg 640 25 0,1,2   (fresh save, greedy spending, Helping Hand, "Go to boss" when offered)
  good: 33 / 35 / 30 attempts for the 30 levels, worst level 2 / 3 / 1 attempts, about 50-56 min   (targets <= 55, <= 8)
  avg : 46 / 42 / 48 attempts,                   worst level 5 / 3 / 4 attempts, about 67-70 min   (targets <= 110, <= 15)
  (round-1 review, old build: good 100 attempts with 20 on L27; avg stuck on L20, L27, L28 and L30)

node tests/weapons_cmp.js 16   (good, same Toy Level, mean win% on the levels where the toy is the newest)
  W1 L4-6   newest shaker:   wand 92, shaker 96
  W2 L7-10  newest gumball:  wand 89, shaker 96, gumball 95
  W2 L11-12 newest star:     wand 82, shaker 82, gumball 75, star 88
  W3 L15-18 newest cookie:   wand 72, shaker 77, gumball 80, star 82, cookie 81
  W4 L19-24 newest confetti: wand 86, shaker 82, gumball 83, star 90, cookie 85, confetti 87
  W5 L25-30 newest beam:     wand 74, shaker 79, gumball 85, star 83, cookie 82, confetti 82, beam 82
  -> weapon order OK (newest toy best or within 5 points; never more than 5 below Star)

node tests/endless_sim.js 24   (L30 profile + Rainbow Beam)
  good  median 4.6 min    (target 4-7)
  avg   median 2.4 min    (target 2-4)
  bot   dies before 15 min in 100 % of runs, median 13.9 min   (target >= 80 %)

node tests/curve.js
  wave HP/s: 24 28 33 39 47 | 43 50 60 70 83 | 76 87 99 113 129 | 119 140 165 195 230 | 211 250 295 346 410
  ratios 1.14-1.185 per normal level, 0.918-0.921 at world openers -> monotonic, validator OK
```

## YouTube Playables

`js/core/platform.js` is the only file that touches the SDK global (`ytgame`); everything else goes
through `PP.platform`.

1. Build the package: `node tools/package_playables.js`. It writes `dist/playables/` with `index.html`,
   `css/` and `js/` **without `js/debug/`**, sets `PP.BUILD = 'playables'`, replaces the debug loader by a stub,
   inserts `<script src="https://www.youtube.com/game_api/v1"></script>` in the first script slot
   (`--no-sdk` leaves it out for offline checks) and fails if any debug hook is still referenced.
   Zip the contents of that folder.
2. In that build, and whenever `ytgame.IN_PLAYABLES_ENV` is true, URL parameters are ignored, `window.__game`
   does not exist and no debug script is loaded. The adapter switches to `ytgame.game.firstFrameReady()`
   (splash drawn) / `gameReady()` (menu interactive), `loadData()` / `saveData()` instead of localStorage,
   `system.getLanguage()`, `isAudioEnabled()` / `onAudioEnabledChange()`, `onPause()` / `onResume()` (no Page
   Visibility there), `engagement.sendScore()` (Endless best only, never from a cheated session) and
   `health.logError()` / `logWarning()`.
3. The language picker is hidden inside Playables; there is no exit button, external link, ad or share prompt,
   music / SFX are separate toggles (no master mute), orientation is never locked and every aspect ratio is laid
   out (portrait column + full-viewport menus in landscape, safe-area insets respected).
4. Before submitting, run the Playables test suite on the hosted build: the real SDK has not been exercised
   here (no SDK available offline), only a mock of it (`tests/regress.js`) and the standalone path.
