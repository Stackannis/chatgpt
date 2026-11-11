# Pompom Parade

An original, cute lane-runner / crowd-shooter for phones (portrait, touch) that also plays with mouse and
keyboard. A marching band of fluffy pompom critters blows bubbles and sprinkles at the grumpy Grumblies;
every Grumbly that gets popped turns into sparkles and floats home smiling.

30 levels in 5 worlds, 5 bosses, 7 toy weapons, gates, in-run cards, a Workshop, an Endless mode, EN/FR.
Vanilla HTML5 canvas + JS: **no build step, no dependencies, no network requests, no asset files**
(all graphics and audio are generated in code). 54 files, about 410 KB uncompressed.

The full spec is in [`docs/GDD.md`](docs/GDD.md).

## Run locally

- Double-click `index.html` (works from `file://`), or
- serve the folder with any static server, e.g. `npx serve .` or `python3 -m http.server`.

Controls: drag anywhere (touch or mouse) to steer, or ←/→ / A/D. Esc or P pauses. Firing is automatic.

## Layout

```
index.html, css/style.css
js/core   namespace, util (seeded RNG, pools), platform adapter, storage, i18n, input, audio, renderer, loop, quality
js/data   balance table, worlds, weapons, enemies, upgrades, patterns, levels (30 timelines), lang_en / lang_fr
js/gfx    procedural sprite painters + cache, digit atlas / icons, particles, fx, backgrounds
js/game   squad, projectiles, enemies, gates, obstacles, pickups, bosses, cards, endless, runner, economy, save
js/ui     DOM screens (menu, map, workshop, settings, pause/cards, results, ending), canvas HUD, tutorial
js/debug  URL params + window.__game, autoplay bot, balance harness, level validator
tools/gen_levels.js   dev-only level authoring tool (per-level specs -> frozen beats in js/data/levels.js)
tests/    Playwright scripts (node tests/<name>.js)
```

## Debug URL parameters

Combinable. Any of them switches the session to an in-memory save unless `&save=1` is added.

| Param | Effect |
|---|---|
| `level=N` / `endless=1` | start level N / Endless immediately |
| `autoplay=1` | the bot steers and picks cards |
| `god=1` | squad never drops below 1 |
| `speed=K` | simulation speed 0.25–8 |
| `seed=S` | override the RNG seed |
| `squad=N`, `weapon=id`, `wlv=1..5` | starting squad / weapon (`wand shaker gumball star cookie confetti beam`) / weapon level |
| `upg=power:5,rate:3,…` | upgrade levels (`power rate buddy shield luck magnet`) |
| `profile=expected` | the greedy economy profile a player is expected to have at that level |
| `unlockall=1`, `buttons=N` | unlock all levels and weapons; set Buttons |
| `lang=fr\|en`, `mute=1`, `quality=low\|mid\|high` | language, no audio, force a quality level |
| `fps=1`, `hitbox=1` | overlay (fps, frame ms, entities, draw calls, quality); hitboxes |
| `tutorial=0`, `reset=1`, `nopause=1` | skip hints; wipe the save on load; do not pause on window blur |
| `screen=map\|shop\|settings\|win\|lose\|ending` | open a screen directly |
| `validate=1`, `balance=1` (`&runs=N`) | run the level validator / balance harness and print the report |

Example: `index.html?level=12&autoplay=1&speed=8&profile=expected`

## Test API (`window.__game`)

`version`, `ready`, `getState()`, `startLevel(n, opts)`, `startEndless(opts)`, `goto(screen)`, `setSpeed(k)`,
`setGod(b)`, `setAutoplay(b)`, `setSquad(n)`, `pause()`, `resume()`, `step(frames)`, `skip(seconds)`,
`chooseCard(i)`, `forceWin()`, `forceLose()`, `give({buttons, unlock, weapons})`, `getSave()`, `resetSave()`,
`events` (last 200), `on(type, cb)`, `validateLevels()`, `runBalance(opts)`, `simLevel(L, opts)`.
Events: `boot ready levelStart gatePassed cardOffered cardChosen bossStart bossPhase pompomLost levelWin levelFail purchase save`.
Every DOM button has a `data-testid`.

## Tests

Playwright with Chromium (`require('playwright')`), each script is standalone:

```
node tests/e2e.js           # 51 UI checks: touch/mouse/keyboard, pause, win/lose, shop, map, cards, save round trip, FR, resize
node tests/autoplay_all.js  # real render loop at 8x over all 30 levels
node tests/balance.js 20    # balance harness (headless), 20 seeds per level
node tests/weapons.js       # 7 weapons x Lv1/3/5, determinism, validator, 12 min headless Endless
node tests/endless.js 90    # Endless with bot + god for 10+ game minutes, heap sampling, best score saved
node tests/perf.js 28 "&weapon=shaker&wlv=5&squad=80"   # frame times, also with 4x CPU throttle
node tests/shots.js         # screenshots of every screen / world / boss into tests/screenshots/
node tests/autotune.js      # suggests the per-level hpMult retune factors (js/data/balance.js TUNE)
node tools/gen_levels.js    # regenerate js/data/levels.js from the level specs and validate it
```

## Balance report (bot, 20 seeds per level)

`exp` = expected economy profile (newest weapon equipped), `noupg` = no upgrades + Bubble Wand,
`*` = boss level. Stars/squad/time are for the level's default seed, `rate` is the win rate over 20 seeds.

```
  L  M(real/table) weapon    exp: win stars squad(peak) time  rate | noupg: win prog rate | god time
  1  1.00/1.00     wand    WIN    3    11( 11)   70  100% |       WIN 100% 100% |    70
  2  1.00/1.05     wand    WIN    3    16( 16)   71  100% |       WIN 100% 100% |    71
  3  1.06/1.09     wand    WIN    3    19( 19)   72  100% |       WIN 100% 100% |    72
  4  1.16/1.14   shaker    WIN    3    27( 27)   74  100% |       WIN 100% 100% |    74
  5  1.22/1.18   shaker    WIN    3    27( 27)   75  100% |       WIN 100% 100% |    75
  6* 1.22/1.23   shaker    WIN    3    19( 19)   70  100% |       WIN 100% 100% |    70
  7  1.33/1.27  gumball    WIN    3    28( 28)   78  100% |       WIN 100%  90% |    78
  8  1.40/1.32  gumball    WIN    3    43( 43)   80  100% |       WIN 100% 100% |    80
  9  1.40/1.36  gumball    WIN    3    28( 29)   81  100% |       WIN 100% 100% |    81
 10  1.45/1.41  gumball    WIN    2    21( 21)   83  100% |       WIN 100%  80% |    83
 11  1.45/1.45     star    WIN    3    25( 25)   83  100% |      fail  65%  30% |    83
 12* 1.45/1.50     star    WIN    2    22( 27)   78  100% |       WIN 100%   5% |    78
 13  1.45/1.54     star    WIN    3    48( 48)   86  100% |      fail  72%   5% |    86
 14  1.45/1.59     star    WIN    2    28( 28)   88  100% |      fail  23%   0% |    88
 15  1.60/1.63   cookie    WIN    2    27( 30)   89  100% |      fail  76%   5% |    89
 16  1.76/1.67   cookie    WIN    1    21( 30)   91   95% |      fail  38%   0% |    91
 17  1.76/1.72   cookie    WIN    2    30( 30)   92  100% |       WIN 100%  75% |    92
 18* 1.84/1.77   cookie    WIN    2    26( 35)   84  100% |      fail  73%   0% |    84
 19  1.92/1.81 confetti    WIN    2    38( 38)   95  100% |       WIN 100% 100% |    95
 20  1.99/1.86 confetti    WIN    1    25( 29)   97  100% |      fail  53%  10% |    97
 21  1.99/1.90 confetti    WIN    3    44( 44)   98  100% |      fail  94%  15% |    98
 22  1.99/1.94 confetti    WIN    2    35( 40)  100  100% |       WIN 100% 100% |   100
 23  2.08/1.99 confetti    WIN    3    47( 47)  100  100% |      fail  89%  25% |   100
 24* 2.15/2.04 confetti    WIN    2    44( 52)   86  100% |      fail  86%   0% |    86
 25  2.24/2.08     beam    WIN    2    35( 37)  103  100% |       WIN 100%  95% |   103
 26  2.24/2.13     beam    WIN    2    43( 48)  105  100% |       WIN 100%  90% |   105
 27  2.45/2.17     beam    WIN    2    53( 53)  106  100% |       WIN 100% 100% |   106
 28  2.56/2.22     beam    WIN    3    82( 82)  108  100% |       WIN 100% 100% |   108
 29  2.56/2.26     beam    WIN    1    34( 40)  109  100% |       WIN 100%  60% |   109
 30* 2.56/2.30     beam    WIN    1    35( 59)  110  100% |      fail  75%   0% |   110
targets: (a) expected wins 30/30, >=2 stars on 87% -> OK | (b) no-upgrade clears L1-10: 10, fails in L19-30: 5 -> OK
       | (c) god runs outside 60-120 s: 0 -> OK
```

Known gap: the bot (perfect gate picks, good dodging) almost never wipes on normal levels, so its win
rates sit above the GDD's 65–80 % band; difficulty shows up as lost stars and in the no-upgrade profile.

## Porting to YouTube Playables

`js/core/platform.js` is the only file that touches the SDK global (`ytgame`); everything else goes
through `PP.platform`.

1. In `index.html`, replace the `<!-- PLAYABLES SDK HERE -->` comment (it is already the first script slot)
   with `<script src="https://www.youtube.com/game_api/v1"></script>`.
2. Nothing else has to change: when `ytgame.IN_PLAYABLES_ENV` is true the adapter switches to
   `ytgame.game.firstFrameReady()` (splash drawn) / `gameReady()` (menu interactive),
   `loadData()` / `saveData()` instead of localStorage, `system.getLanguage()`, `isAudioEnabled()` /
   `onAudioEnabledChange()`, `onPause()` / `onResume()` (no Page Visibility there), `engagement.sendScore()`
   (Endless best only) and `health.logError()` / `logWarning()`.
3. The language picker is hidden inside Playables; there is no exit button, external link, ad or share prompt,
   and music / SFX are separate toggles (no master mute).
4. Before submitting, run the Playables test suite on the hosted build: the SDK path has not been exercised
   here (no SDK available offline), only the standalone path.
5. Zip `index.html`, `css/` and `js/` (not `tests/`, `tools/` or `docs/`).
