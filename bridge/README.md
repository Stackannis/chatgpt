# Pompom Bridge (single-stage prototype)

One stage of a cute "bridge defense" crowd shooter. Open `index.html` (works from `file://`), drag left/right.

- Blue belt (left): +1 pompom per tile, but the squad stops shooting while it stands there.
- Centre: the Grumbly horde marches on the squad; shots push it back. Two bosses (32 s and 68 s).
- Gift (right): shoot its counter to 0 for the hero (x1.8 fire) and six +5 tiles.

Files: `sim.js` (deterministic rules, bots, all balance numbers in `CFG`), `game.js` (canvas rendering, input, audio, UI).

Debug: `?autoplay=smart|mediocre|horde|farm|greedy|notreasure|treasurefirst`, `?speed=N`, `?seed=N`, `?mute=1`, `?lang=fr|en`,
and `window.__bridge.state`.

Tests: `node tests/sim.js 200 assert` (strategy win-rate table) and `node tests/smoke.js` (Playwright UI checks + screenshots).
