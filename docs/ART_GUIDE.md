# SUNFOX — art bible & asset contract

**Game**: *SUNFOX*, an original 16-bit style platformer (think first-party SNES / Mega Drive, 1991-94:
Super Mario World, Sonic 1-3, Yoshi's Island, DKC, Ristar, Rocket Knight). **No existing IP** — everything original.

**Hero**: *Kit*, a young fox — warm orange fur, cream muzzle/belly/tail-tip, dark "socks", big expressive
eyes, large bushy tail, a teal scarf that trails behind him. Cheerful, cocky, readable at a glance.

**Level 1**: *Emerald Coast* — sunny tropical island morning: rolling grassy hills over rich red-brown
earth, palm trees, flowers, mossy ancient stone ruins/totems, waterfalls, sparkling sea on the horizon.

Native resolution **384x216**, 16px tiles, integer upscaling, 60 fps.

## The quality bar (non-negotiable)

The user's words: *"du bon pixel art de ce niveau-là, pas de concession"*. Programmer art, flat blobs,
placeholder-looking shapes or "AI-ish" noise are failures. Concretely:

- **Deliberate pixels.** Every pixel placed on purpose. No stray/orphan pixels, no jaggies on curves
  (clean 1-2-3 pixel stepping), no accidental banding, no pillow shading, no blurry gradients, no random noise.
- **Light from the upper-left**, consistently. Form shading with 3-5 step ramps per material, hue-shifted
  (shadows toward purple/blue, highlights toward yellow). Strong value contrast between ramps steps.
- **Coloured outlines.** Sprites (characters, items, interactive objects) get a full dark outline using
  `G.PAL.ink` or a very dark shade of the local colour ("selout": lighter outline where the light hits).
  Background layers get NO outlines and lower contrast/saturation so gameplay elements pop.
- **Readable silhouettes** and big clear shapes first, detail second. Squint test must pass at 1x.
- **Clusters, not dots**: shade in chunky clusters. Dithering only where a 16-bit artist would (skies,
  large rocks, soft transitions) and then as clean ordered/checker patterns.
- **Rich palette, 16-bit saturation.** Use `G.PAL` ramps (see `src/lib.js`) as the base so all modules
  cohere; you may add a few extra colours per asset when needed (e.g. atmospheric background tints).
  Around 10-16 colours per sprite, like a real 16-bit palette line.
- **Animation**: real key poses with squash & stretch, overlapping action (tail, scarf, ears), not a
  1-pixel wobble. Frames must be consistent in volume and stay aligned (no jitter of the body's base).
- Everything must tile/loop **seamlessly** where stated.

## How assets are authored

Assets are code: each module is a classic script `src/art/<name>.js` that calls

```js
G.defineArt('<name>', G => { ...; return { /* canvases */ }; });
```

Helpers (see `src/lib.js`): `G.px(rows, pal)` builds a canvas from rows of palette characters
(`'.'`/`' '` transparent, rows must be equal length, throws on mistakes), `G.cv(w,h)` new canvas (`.ctx`),
`G.flipH(c)`, `G.copy(c,w,h,ox,oy)`, `G.PAL`. You may also draw procedurally with `ctx.fillRect`
(integer coords, no anti-aliasing: never use arcs/strokes/gradients/`drawImage` scaling that produce
blended pixels) or compose sprites from parts. The result just has to be crisp, intentional pixel art.
Scripts run in the browser via plain `<script>` tags (no modules, no imports, no external files/images).
Only touch your own module file.

### LOOK at your work — mandatory loop

```
node tools/sheet.js <name>          # -> shots/sheet-<name>.png   (auto zoom)
node tools/sheet.js <name> 8        # force 8x zoom (file gets -8x suffix)
node tools/sheet.js <name> 8 '' jump,fall   # only the assets whose path contains 'jump' or 'fall' (cheap, sharp close-ups;
                                            # use 'demo' for the terrain / bg in-engine composites)
```

Then open the PNG with the Read tool and critique it honestly against the bar above, as a harsh
16-bit art director would. Iterate many times (expect 6-15 render/inspect rounds). The sheet shows every
canvas in your module (arrays = animation frames side by side), on sky-blue, on dark green at 2x and at 1x.
`terrain` and `bg` sheets also show an in-engine composite. Fix any error the tool prints.

See your work **inside the real game** too (the engine and the level exist):

```
node tools/shot.js play <worldX> 50 <tag>   # -> shots/play-<tag>.png, hero teleported to worldX (3x zoom)
node tools/shot.js title                    # -> shots/title.png (title screen with the logo)
node tools/contract.js                      # checks names / frame counts / sizes of every module
```

Always pass your own module name in `<tag>` (e.g. `bg-a`, `bg-b`) so parallel workers do not overwrite each
other's screenshots. Useful places (worldX): 480 start hills + prize blocks + first enemy · 1040 first
plateau, floating island, spiky enemy · 2000 high road islands + flying enemy · 2500 cliff top before a
waterfall pit · 3600 stair cliffs · 3900 ruins plateau · 4100 the big slide · 4400 goal gate.

## Asset contract (exact names, sizes, alignment — the engine depends on these)

All character/object frames face **right** unless stated; engine flips. "Bottom-aligned" = the thing
stands on the bottom row of the canvas. Arrays are animation frames.

### `terrain` — `src/art/terrain.js` → `G.art.terrain`
The engine (`src/terrain_render.js`) builds terrain from textures, so slopes work for free:
- `dirt`: 64x64, seamless in both directions. Main earth body (rich red-brown soil with chunky rock/strata
  pattern — think Green Hill's checker or SMW's diagonal-hatched dirt; a strong, stylised, readable pattern).
- `dirtDeep`: 64x64 seamless. Darker, calmer, lower-contrast variant used deep inside the ground (engine
  dithers between the two by depth).
- `grass`: 64 wide x 24 tall, seamless horizontally, transparent where empty. **Row 8 is the collision
  surface**: rows 0-7 = blades/tufts poking above the ground line (keep mostly transparent, uneven
  silhouette), rows 8-23 = thick lush grass mat with an irregular lower fringe hanging over the dirt and a
  dark shadow line under the fringe. Drawn column-by-column following the surface height, so it gets sheared
  along slopes — design so it still looks good sheared (see the demo).
- `grassEndL`, `grassEndR`: 8x24, same row alignment. Rounded grass overhang drawn at ledge ends
  (engine draws `grassEndL` at x = ledgeX-4, i.e. 4px hanging outside the ledge, 4px covering it).
- `wallL`, `wallR`: 8 wide x 64 tall, seamless vertically, alpha. Edge treatment for exposed vertical faces.
  `wallL` covers the first 8px of a wall whose air is on the LEFT (lit side: highlight rim + outline at x=0);
  `wallR` covers the last 8px of a wall with air on the RIGHT (shadow side, outline at x=7).
- `under`: 64x8, seamless horizontally, alpha: dark underside for exposed bottoms (outline at row 7).
- `platform`: `{l, m, r}` 16x16 each. One-way jump-through platform (wooden planks / log bridge look),
  walking surface = row 0 of the tile, visual thickness ~8-10px, rest transparent. `m` tiles seamlessly.
- `moving`: 48x16 moving platform (floating carved stone slab with moss, surface = row 0).
- `block`: 4 frames 16x16 — prize block (original design, e.g. golden sun-emblem block), animated glint.
- `blockUsed`: 16x16 — emptied block.
- `spring`: 3 frames 16x24 bottom-aligned: `[idle, compressed, extended]`.
- `spikes`: 16x16 bottom-aligned, pointing up (seamless when repeated horizontally).
- `checkpoint`: `{off:[1 frame], on:[4 frames]}` 16x32 bottom-aligned (e.g. sun-stone lantern post that lights up).
- `goal`: 4 frames 32x48 bottom-aligned — end-of-level ancient sun gate/totem with animated glow.
- `sign`: 16x16 bottom-aligned wooden arrow sign pointing right.

### `decor` — `src/art/decor.js` → `G.art.decor` (non-interactive scenery, bottom-aligned unless noted)
Slightly lower contrast than gameplay objects; thin or no ink outline (use dark local colours).
- `palm`: ~64x96 tall palm tree; `tree`: ~56x72 broadleaf/tropical tree; `bush1` 32x16; `bush2` 48x24;
  `fern` 24x16; `flowerA`: 2 frames 16x16 (swaying); `flowerB`: 2 frames 16x24 (tall sunflower-ish);
  `tuft` 16x8; `rock1` 16x12; `rock2` 32x24 (mossy boulder); `mushroom` 16x16;
  `totem` 24x48 (weathered ancient fox/sun totem, mossy); `pillar` 16x48 (broken ruin column);
  `ruinBlock` 32x32 (carved ruin block with vines); `vine` 16x32 (top-aligned, hangs from ledges);
- `waterfall`: 4 frames 32x32, seamless vertically AND loops in time (engine tiles it vertically);
  `waterfallTop`: 4 frames 32x16 (lip where the water pours over); `splash`: 4 frames 48x16 (foam at the base);
- `water`: `{surface: 4 frames 32x8 (animated wave crest, alpha, seamless horizontally),
  body: 32x32 seamless (deep water fill, opaque)}`.

### `bg` — `src/art/bg.js` → `G.art.bg` (parallax backdrop)
- `sky`: 384x216 opaque (16-bit style banded/dithered gradient, bright tropical morning).
- `layers`: array ordered far → near of `{img, y, speed, auto?}`:
  `img` canvas whose width is seamless horizontally (suggest 384-768 wide), `y` = top position on screen in px
  when the camera is at the bottom of the level, `speed` = parallax factor 0..1 (far ≈ 0.05, near ≈ 0.5),
  `auto` = optional constant drift in px/s (clouds). The engine draws
  `x = -(camX*speed + auto*t) mod width`, `y = L.y + cameraRaisedBy*speed*0.5` (the level is 2 screens tall,
  so layers slide DOWN up to ~110*speed px when the player climbs). Therefore every non-cloud layer must be
  opaque from its silhouette down to its bottom edge and extend to at least screen row 216 even when shifted
  (i.e. `y + img.height >= 216`; taller is fine).
  Wanted (5-7 layers): big sculpted cumulus clouds (slow drift), distant hazy islands/mountains, a sea band
  with horizon glitter, mid rolling hills / cliffs with waterfalls, nearer palm/jungle silhouettes.
  Atmospheric perspective: far = pale, bluish, low contrast; near = more saturated/darker. No outlines.
  The bottom ~1/3 of the screen is usually covered by foreground terrain; the top 2/3 is the showcase.
  Keep overall bg contrast clearly below gameplay sprites.
  Optional line-scroll: give a layer `raster: k` (k > 1, e.g. 2.5) and the engine draws it in 2px strips whose
  scroll speed grows from `speed` (top row) to `speed*k` (bottom row) — the Mega Drive trick that gives a sea
  fake perspective. Only use it on layers that still look right when their rows slide against each other
  (water, glitter, flat plains), never on layers with vertical structure (islands, trees, clouds).

### `player` — `src/art/player.js` → `G.art.player`
All frames **32x32**, facing right, feet on the bottom row, body centred on x≈16. Hitbox is 12x24.
- `idle`: 4 frames (breathing, ear/tail motion, blink on one frame) · `run`: 8 frames (full run cycle,
  scarf + tail streaming) · `jump`: 2 frames (rising, stretched) · `fall`: 2 frames (falling, limbs up) ·
  `skid`: 1 (braking, leaning back) · `hurt`: 1 (knocked back) · `duck`: 1 (crouch) ·
  `win`: 2 frames (victory pose facing camera) · `icon`: 16x16 head for the HUD lives counter.

### `enemies` — `src/art/enemies.js` → `G.art.enemies` (all facing LEFT, bottom-aligned, 24x24 frames)
Original, charming, clearly hostile-but-cute designs fitting an island-ruins theme:
- `walker`: `{walk: 4 frames, squash: 1 frame}` — stompable ground critter (body ≈ 18x14 at the bottom).
- `spiker`: `{walk: 4 frames}` — spiky-backed, clearly NOT stompable (spikes read instantly).
- `flyer`: `{fly: 4 frames}` — winged patroller (wing flap cycle), body centred in the frame.

### `items` — `src/art/items.js` → `G.art.items`
- `gem`: 6 frames 16x16 (spinning golden sun-shard collectible, centred) · `bigCoin`: 6 frames 24x24
  (large spinning star medallion, 3 hidden per level) · `heart`: 2 frames 16x16 (pulse) ·
  `sparkle`: 4 frames 16x16 (collect twinkle) · `dust`: 4 frames 16x16 (run/land dust puff) ·
  `poof`: 5 frames 24x24 (enemy defeated burst) · `splash`: 5 frames 32x24 bottom-aligned (water splash)
- `hud`: `{heart: 16x16 full, heartEmpty: 16x16, gem: 16x16 icon, coinOn: 16x16, coinOff: 16x16}`
- `font`: object mapping character → canvas, 8px tall glyphs (width 8, may be narrower for I/1/punctuation)
  for `0-9 A-Z` and `! ? : . , - ' x + /` — chunky 16-bit HUD font: white/yellow face with a 1px dark
  outline/drop shadow baked in. Space is handled by the engine (advance 6).
- `logo`: ~220x72 title logo "SUNFOX" — bold, bevelled, outlined, 16-bit title-screen quality.

### Audio — `src/audio.js` → `G.audio` (WebAudio synthesis only, no files)
`init()` (call on first user gesture; idempotent), `music(name)` with `'title' | 'level' | 'clear' | 'gameover'`
(switches/loops; `'clear'`/`'gameover'` are one-shot jingles), `stopMusic()`, `sfx(name)` with
`jump, land, gem, bigcoin, stomp, hurt, die, spring, block, checkpoint, heart, splash, select, pause`,
`setMuted(bool)`, `muted` flag. Must never throw if called before `init()`.
