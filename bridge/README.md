# Pompom Bridge (single-stage prototype)

One stage (about two minutes) of a cute "bridge defense" crowd shooter. Open `index.html` (works from `file://`), drag left/right.

- Blue belt (left): about three tiles per second, each worth +1 (then +2, +3, +4 as gifts are opened). The squad does not shoot while it stands there.
- Centre: the Grumbly horde marches on the squad and shots push it back. A column that arrives bonks the squad (lose 1 or 2%) and bounces back.
  Sprinters dash out of the horde, four "rush" moments speed it up, and four bosses come at 18 s, 48 s, 82 s and 116 s.
- Gift (right): three gifts in a row (220, 800, 2400). Each opens a hero level (more fire, better belt) and a run of +5 / +10 / +25 tiles.

Files: `sim.js` (deterministic rules, bots, every balance number in `CFG`), `game.js` (canvas rendering, input, audio, UI).
Display is decoupled from the numbers: at most 40 pompoms, 16 shots per second and a few dozen front-row Grumblies are drawn
individually (the far horde is one image per row); power is carried by damage per shot.

Debug: `?autoplay=smart|mediocre|camper|notreasure|horde|farm`, `?speed=N`, `?seed=N`, `?mute=1`, `?lang=fr|en`, and `window.__bridge.state`.

Tests: `node tests/sim.js 200 assert` (strategy win-rate table) and `node tests/smoke.js` (Playwright UI checks + screenshots).
