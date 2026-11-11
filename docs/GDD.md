# POMPOM PARADE: Game Design and Implementation Document (v1.0)

Audience: the implementing agent. This document is the spec. Where it gives a number, use that number. Every balance value is a starting point that the **balance harness** (§9) must confirm. Units: **u** = logical pixel in the 360-wide game space, **s** = seconds, **L** = level number.

---

## 1. Concept

**Title:** *Pompom Parade* (same title in FR and EN).

**Pitch:** A marching band of fluffy pompom critters goes up a candy road, blowing bubbles and sprinkles at the grumpy Grumblies who stole the colours of Pompom Valley. Every Grumbly that gets popped turns into sparkles and floats home giggling, cheered up again.

**Cast (original):**
- **Pompoms**: round balls of fluff with tiny feet, dot eyes and blush. Four species appear in the squad, assigned at random: bunny (pink #FFD6E5, long ears), chick (yellow #FFE98A, tuft), kitten (peach #FFC79E, pointy ears) and mouse (mint #C8F5DC, round ears).
- **Pip**: the squad leader. A cream bunny-pompom with a pink scarf who is always in front at the centre.
- **Grumblies**: mischievous, frowny, cute blobs and critters (§3.4). They are never hurt. They get **bopped → "POP!" → sparkles + a tiny smiling ghost-face that floats up**.
- **Queen Grumblina**: the final boss. She is a lonely jelly queen who joins the parade in the ending.

**Tone:** cheerful, bouncy, bloodless, with no weapons that look like real guns. All "weapons" are toys and treats. The UI and store text must stay neutral (a family-friendly general audience, *not* labelled "for kids").

---

## 2. Core loop and controls

**Run loop:** the road scrolls downward automatically while the squad marches "up" the screen. The player only steers left/right. The squad auto-fires straight up. Gates change squad size or power. Grumblies and hazards remove pompoms. **Squad count is your health: 0 pompoms means the level is failed.** At the end of a normal level the squad passes the Finish Arch and its pompoms turn into bonus Buttons. Boss levels (every 6th level) end with a boss fight.

**Meta loop:** earn Buttons (soft currency) → buy permanent upgrades and weapon levels in the Workshop → unlock levels, worlds and weapons → collect stars → Endless mode after L30.

**Controls**
- **Touch / mouse (primary):** relative drag. While the pointer is down, `targetX += dx_logical × sensitivity` (default 1.0; settings offer 0.8 / 1.0 / 1.3). The finger can be anywhere on screen, so the hero is never covered. The squad moves toward targetX at up to 900 u/s, and the result is clamped to the road `[42, 318]`.
- **Keyboard:** ←/→ or A/D give a velocity of 300 u/s with 2400 u/s² acceleration and deceleration. Enter/Space activate the focused button. Esc or P opens pause in gameplay. Esc closes any open modal. **Do not call preventDefault on Esc.** In card choices, ←/→ selects and Enter confirms.
- No other input exists in gameplay. Firing is always automatic.

---

## 3. Systems

### 3.1 Screen and space
- Logical width is always **360 u**. Logical height `H = clamp(360 × viewportH / viewportW, 600, 780)`. Anything beyond that is letterboxed or pillarboxed with a pre-rendered world-themed pattern, not plain black.
- The road spans x 30–330 (300 u wide). The side margins hold decorations. For telegraphs, the road is divided into **4 lanes of 75 u** with centres 67.5, 142.5, 217.5 and 292.5.
- The squad centre sits at `y = H − 110`. Enemies spawn at y = −40. **Safe top margin:** HUD elements go at y ≥ 48 because of the YouTube overlay.

### 3.2 Squad
| Stat | Value |
|---|---|
| Start squad | 3 + Buddy Start upgrade (max +6) |
| Squad cap | 999 (counter); **visible pompoms capped at 30**. Above 30, a "×N" badge appears over Pip |
| Formation | Pip at the centre, then hex rings at 15 u spacing. Pompom sprite radius 9 u. Each pompom bobs at 4 Hz with random phase and lerps to its slot at 12/s |
| Visual radius | `10 + 4.5·√Nvis` |
| **Hitbox** (all collisions except pickups) | circle at the squad centre, `R = min(36, 10 + 2.5·√Nvis)` |
| Pickup radius | visual radius + 12 u (× Magnet bonus) |
| Gate choice | decided by the **squad centre x** only |
| Losing pompoms | they tumble away dizzy (spin + fall + "boing") and are never shown hurt. Squad shrinks with a squash 1.15/0.85 |
| Invulnerability | 0.6 s after any **hazard** contact (not after enemy contact) |

**Firing model (keeps projectile counts bounded):** every volley, `E = min(N, Ecap)` emitters (the front-most visible pompoms) each fire. Per-projectile damage is `baseDmg × weaponLvMult × powerMult × runDmgMult × N / E`. Total DPS therefore scales linearly with N while projectile count stays capped. Emitter x gets ±4 u jitter.
- `weaponLvMult = 1 + 0.10 × (weaponLv − 1)`
- `powerMult = 1 + 0.06 × PowerLv`
- `fireRate = weaponRate × (1 + 0.04 × QuickPawsLv) × runRateMult`, capped at 3× weaponRate.

### 3.3 Weapons (7, one equipped per run)
Baseline DPS per pompom at Lv1 is about 24. Later weapons carry a small tier bonus (the "Eff." column) so that unlocks feel like progress, and each has a distinct role.

| # | Name (EN / FR) | Unlock | Ecap | Projectile | Dmg | Rate/s | Speed u/s | Behaviour | Eff. | Lv3 perk / Lv5 perk |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bubble Wand / Baguette à bulles | start | 10 | wobbly bubble r5 | 8 | 3.0 | 520 | straight, generalist | 1.00 | bubbles +25% size / every 5th bubble splits in 2 on hit |
| 2 | Sprinkle Shaker / Saupoudreuse | clear L3 | 5 | 3 sprinkles at −12°/0/+12°, r3 | 3.5 each | 3.0 | 600 | spread, good vs. swarms and sides | 1.05 | 5-way (dmg/each ×0.7) / sprinkles pierce 1 |
| 3 | Gumball Cannon / Canon à gommes | clear L6 | 6 | gumball r8 | 30 | 0.9 | 400 | pierces 2 extra targets, 14 u knockback, ×2 vs. shells and crates | 1.10 | pierce +1 / bounces once off road edges |
| 4 | Star Wand / Baguette étoile | clear L10 | 8 | star r5 (spins) | 9.5 | 2.8 | 420 | homing (turn 6 rad/s, nearest target in a 70° cone) | 1.10 | turn +50% / chains to a 2nd target at 50% |
| 5 | Boomerang Cookie / Biscuit boomerang | clear L14 | 4 | cookie r9 | 15 | 1.25 | 380 out / 380 back | flies 260 u up and returns, pierces everything, hits each target once per leg | 1.15 | range +25% / 2 cookies per throw at 60% dmg |
| 6 | Confetti Popper / Lance-confettis | clear L18 | 5 | confetti ball r6 | 16 + splash 10 | 1.5 | 450 | splash radius 36 u on impact | 1.20 | splash r 46 / leaves a 1 s confetti cloud (20%/s) |
| 7 | Rainbow Beam / Rayon arc-en-ciel | clear L24 | 1 beam | beam width `8 + 0.6·√N·4` u, max 40 | DPS = 24 × N × mults | 10 ticks/s | instant | continuous column from the squad to the top; hits the first 2 targets | 1.25 | width +30% / pierces all |

- **Weapon upgrades:** Lv1→5. Cost to reach Lv k (k=2..5) = `150 × 1.8^(k−2) × (1 + 0.15 × index)`, where index is 0..6. For the Wand that is 150 / 270 / 486 / 875.
- **Preview:** one level before a weapon unlocks, a Gift Box (§3.5) in that level contains it as a free trial.
- Each weapon has its own shot SFX, colour (Wand cyan, Shaker rainbow, Gumball pink, Star gold, Cookie brown, Confetti multi, Beam rainbow gradient strip, pre-rendered) and pop particle.

### 3.4 Grumblies (enemies)
`HP = baseHP × hpMult(L) × ramp(t)`, with `ramp(t) = 0.6 + 0.8 × t/T` (T = run length, so ramp goes 0.6→1.4 and averages 1.0). Speed is **relative to the road**: screen speed = scroll + own speed. On contact with the squad hitbox, the enemy removes `bump` pompoms and pops.

| Enemy (EN / FR) | Intro | baseHP | Own speed | Bump | Radius | Behaviour / telegraph | Drops |
|---|---|---|---|---|---|---|---|
| Jellybob / Gelibob | L1 | 24 | +20 | 1 | 14 | walks straight, jiggles | 25%: 1 Button |
| Dustbun / Poussinou | L3 | 12 | +75 | 1 | 11 | zigzag ±40 u at 1.4 Hz | 20%: 1 |
| Bouncy Bean / Haricot sauteur | L5 | 40 | +25 | 2 | 13 | every 1.3 s hops one lane toward the squad; 0.3 s squash telegraph | 30%: 1 |
| Twinjelly / Gelijumeaux | L8 | 50 | +15 | 2 | 18 | on pop splits into 2 minis (baseHP 14, r10, bump 1, ±30 u diverge) | 40%: 1 |
| Grumpcloud / Nuage grognon | L9 | 70 | parks at y=150 for 6 s, then +40 | 2 | 20 | every 1.8 s turns dark (0.4 s telegraph) and drops a **raindrop** aimed at the squad's current x (200 u/s, HP 1, shootable, −1 pompom) | 50%: 1 |
| Shellsnail / Escargot-bonbon | L14 | 40 + shell 100 | +12 | 3 | 20 | shell HP is used up first ("tink" sparkles); Gumball ×2, Beam ×1.5 vs. shell | 60%: 2 |
| Donut Dasher / Donut fonceur | L15 | 45 | +30, stops at y=170 | 3 | 16 | stops, its lane flashes with a striped stripe for 0.8 s, then dashes at +420 | 50%: 2 |
| **Elite** modifier (crown) | L19 | ×3 HP | ×0.9 | ×2 | ×1.4 | any type, gold crown, more sparkles | 5 Buttons |

Enemy projectiles are **always magenta #FF3FA4 with a white core** and appear nowhere else.

### 3.5 Obstacles and destructibles
| Object | Intro | Type | Values |
|---|---|---|---|
| Cookie Crate | L2 | destructible, blocks shots | HP 40 × hpMult × ramp; contact −2 and breaks; drops 3 Buttons (+20% chance of a random pickup) |
| Lollipop Spinner | L4 | indestructible hazard | 110 u bar spinning at 0.4 rev/s, centred on a lane; contact −3 |
| Gift Box | L10 | destructible | HP 60 × hpMult; opening gives a weapon for the rest of the level (the next locked weapon if the player is one level from its unlock, else a random unlocked weapon different from the equipped one). Icon visible on the box |
| Rolling Gumball | L11 | indestructible hazard | r 26, rolls down a lane at +160; 1.0 s warning arrow at the top of the lane; contact −4 |
| Button Jar | L11 | destructible | HP 80 × hpMult; 10 Buttons |
| Syrup Puddle | L16 | zone | 120×80 u; lateral speed ×0.45 inside |
| Candy-cane Fence | L20 | indestructible hazard | spans the road with one 110 u gap (gap marked by sparkles); contact −3 |
| Ice Patch | L21 | zone | 300×100 u; steering response ×0.4 (drift) |

All indestructible hazards use red/white candy stripes. Only hazards use that pattern. **Hazard contact cost** is `max(listed, round(0.08 × squadMid(L)))` so hazards stay relevant later.

### 3.6 Pickups
| Pickup | Intro | Effect |
|---|---|---|
| Button / Button Stack | L1 / L2 | +1 / +5 Buttons |
| Buddy Heart | L3 | +max(3, round(0.1 × squadMid(L))) pompoms |
| Shield Bubble | L7 | absorbs the next contact event (enemy, hazard or projectile); holds 1 extra (2 max) |
| Frenzy Candy | L8 | fire rate ×2 for 5 s |
| Magnet | L11 | for 8 s, pickups within 160 u fly to the squad |

### 3.7 Gates
Gates are candy arches spanning the road. Two gates are 140 u wide with a 20 u pillar between them. Three gates are 92 u each. The value is drawn **large** on a coloured panel (digit atlas, §6).

| Type | Colour | Effect | Intro |
|---|---|---|---|
| Add `+n` | sky blue #3DB6FF | squad += n | L1 |
| Multiply `×2`, `×3` | violet #9B6BFF | squad ×= m (cap 999) | ×2 L2, ×3 L13 |
| Subtract `−n` | coral #FF5A6E | squad −= n (min 1) | L4 |
| Divide `÷2` | coral | squad = floor(squad/2) (min 1) | L13 |
| Power `+20% POP` / `+15% SPEED` | gold #FFC531 + icon | runDmgMult += 0.2 (cap 2.0) / runRateMult += 0.15 (cap 1.75) | L7 |
| Grow gate | coral→blue as value crosses 0, with a fill ring | starts at `v0 = −round(A/2)`; **absorbs projectiles**; +1 per `10 × hpMult(L)` damage; max `round(1.5·A)` | L7 |
| Moving gate (modifier) | any | the whole row slides ±40 u at 0.5 Hz | L25 |

**Value band:** `A(L) = Math.round(3 + 0.55·L)`, giving 4 at L1, 9 at L10 and 20 at L30. A level beat may give explicit values or `auto`. `auto` = A × (0.75–1.25, seeded) rounded. Subtract uses `round(0.5·A … 1.0·A)`.

**Row templates by band:**
- L1–3, obvious: `[+A | +1]`, `[+A | +round(A/2)]`, `[×2 | +2]`.
- L4–12, trade-offs: `[+A | ×2]` (the better one depends on the current squad), `[+A | −n]` (trap), `[POP | +A]`, `[grow | +round(0.6A)]`.
- L13+, three-gate rows: `[×2 | +1.5A | −A]`, `[×3 | ÷2 | +A]`, `[POP | SPEED | +A]`, `[grow | grow | −n]`.

**Fairness rules (validator-enforced, §9):**
1. Every row has ≥ 1 gate with a non-negative effect.
2. No gate ever reduces the squad below 1, so gates alone can never fail a run.
3. L4–12: ≤ 1 negative gate per row. L13+: ≤ 2 of 3.
4. ≤ 2 ×3 gates per level, and ×3 is always paired with a negative or ÷2 gate.
5. No enemy, hazard or obstacle in the 160 u band before a gate row, and no gate row within 1.5 s after a hazard that requires dodging.
6. The best gate's side is seeded-random, but never the same side more than 3 rows in a row.
7. Rows are visible on screen ≥ 3 s before the squad reaches them (true at all listed scroll speeds).
8. Once one gate in a row is passed, the others fade (no double dipping).

**Feedback:** passing a gate triggers a big `+8!` pop text, an arch flash, sound (good = arpeggio, bad = droop) and new pompoms springing out of the arch.

### 3.8 In-run upgrades
1. **Power gates** (§3.7).
2. **Sparkle Meter (from L5):** a bar under the progress bar fills with the HP of popped Grumblies. It triggers at 35% and 70% of the level's total Grumbly HP, so at most 2 per level. In Endless it triggers every 45 s. On trigger, the simulation **pauses** and two big wordless icon cards (140×180 u) appear. There is no timer. Card pool: *Pop Power* +25% dmg; *Quick Paws* +20% rate; *Buddy Burst* +max(3, 25% of squad); *Pierce* +1 (not offered with Beam or Boomerang); *Big Shots* +35% projectile radius; *Bubble Shield* +1 shield; *Lucky* +50% Buttons this run. No duplicate card within one offer.
3. Pickups and Gift Boxes.

### 3.9 Bosses (L6, 12, 18, 24, 30)
At the end of the run-in a "BOSS!" banner shows for 1.5 s. Scroll slows to 25 u/s and the boss enters to y ≈ 130. A HP bar sits at the top (y 52) with a boss portrait. There is no timer. The boss absorbs any shot reaching its ellipse hitbox. **Boss hit cost** = `max(1, round(f × squadMid(L)))`. Between phases the boss is invulnerable for 1.5 s ("huff" star burst) and **all enemy projectiles are cleared**. On defeat: giant confetti pop, 0.3× slow-mo for 0.8 s, then win.

`BossHP = round(1.4·squadMid × 24 × M × Ttarget × 0.85, −2)`, where Ttarget = 25 / 30 / 35 / 40 / 50 s. Values are in §4.

| Boss | Pattern |
|---|---|
| **Big Wobble** (L6), giant lavender jelly | Sways along a sine path x = 180 ± 100 with a 5 s period. **Wobble Slam** every 4 s: 0.6 s squash telegraph, then 3 mini Jellybobs (0.6× HP) drop at spread x. **Jelly Ripple** every 8 s: a horizontal jiggle band (24 u tall) descends at 150 u/s with one 120 u gap. The gap sparkles 1 s before launch. f = 0.25. **Phase 2 (<50%):** slam every 3 s with 4 minis, gap 100 u. |
| **Sir Shellwhirl** (L12), giant snail | Cycle: **Open** 4 s (takes full damage, eyes out); **Spin** 2 s (in its shell, ×0.1 damage, "tink"). While spinning it fires a 5-way fan of jam blobs (30° spacing, 170 u/s, f = 0.05 each) and leaves 2 Syrup Puddles that scroll down. **Phase 2 (<50%):** open 3 s, spin 2.5 s, 7-way fan. |
| **Grand Donut** (L18), frosted donut | Rolls along the top at 140 u/s, bouncing between the edges. **Sprinkle Fan** every 3 s: 7 bullets over a 70° arc aimed at the squad, 210 u/s, f = 0.04 each. **Big Roll** every 9 s: the squad's current lane flashes with striped arrows for 1.0 s, the donut rolls down that lane at 520 u/s (f = 0.30), then re-enters from the top 1.2 s later. **Phase 2 (<40%):** two Big Rolls 0.5 s apart in different lanes, never all 4 lanes. |
| **Thunderpuff** (L24), grumpy snow cloud | Hovers at centre with a ±60 u drift. **Snow Lanes** every 5 s: 2 of 4 lanes shimmer for 1.2 s, then snow falls for 1.5 s. Inside, 1 tick per 0.25 s at f = 0.03. ≥ 1 safe lane is adjacent to the squad's lane. **Hail Puff** every 6 s: 3 aimed snowballs (shootable, HP 30 × hpMult, 180 u/s, f = 0.08). At 75/50/25% HP: spawns 2 Grumpclouds at the sides. |
| **Queen Grumblina** (L30), jelly queen with a crown and cape | **P1 (100–66%):** Wobble Slam (5 minis) + Jelly Ripple. **P2 (66–33%):** 4 Candy Orbs orbit at radius 80 (0.5 rev/s) and block shots (each 4% of boss HP; they respawn 10 s after all are popped), plus a 9-way Sprinkle Fan every 3 s. **P3 (<33%):** Snow Lanes, and she drops Donut Dashers into flagged lanes every 4 s. All cycles run ×1.25 faster. **Ending:** she sniffles, Pip gives her a flower, she smiles and joins the parade. Then "THE END", and Endless is unlocked. |

### 3.10 Permanent upgrades (Workshop, Buttons only; no real money, no ads)
| Upgrade (EN / FR) | Per level | Max | Cost of level k+1 (k = current level) |
|---|---|---|---|
| Pop Power / Force pop | +6% dmg | 15 | `60 × 1.45^k` |
| Quick Paws / Pattes rapides | +4% fire rate | 12 | `80 × 1.5^k` |
| Buddy Start / Copains au départ | +1 starting pompom | 6 | `100 × 1.8^k` |
| Bubble Shield / Bouclier bulle | +1 shield charge at start | 3 | `300 × 2.5^k` |
| Lucky Buttons / Boutons chanceux | +10% Buttons | 5 | `150 × 1.6^k` |
| Magnet Paws / Pattes aimantées | +25% pickup radius | 4 | `80 × 1.6^k` |

**Rewards:**
- **Win:** `20 + 6L` + `floor(endSquad / 2)` (Finish Arch "Bonus Bridge", where pompoms hop across and drop Buttons) + Buttons collected in the run + **10 per newly earned star**. Lucky Buttons multiplies everything except the star bonus.
- **Fail:** keep **all collected Buttons** + `floor((20 + 6L) × 0.5 × progress)`. Best progress % is saved and shown on the map.
- **Helping Hand:** after 2 consecutive fails on a level, the next attempt starts with +3 pompoms. After 4 fails it is +6. Shown as a wordless glove icon. Resets on win.
- Expected first-clear income across L1–30 is about 5,500–6,500 Buttons. Total sinks are well above 20,000, so upgrades stay meaningful in Endless.

---

## 4. Progression

### 4.1 Worlds
| World | Levels | Palette (road / sides / accent) | Theme decor |
|---|---|---|---|
| 1 Marshmallow Meadow / Prairie Guimauve | 1–6 | #FFE3EC / #7FD98A / #FF7AA8 | marshmallow tiles, flowers #FFF6A8 |
| 2 Lemonade Lagoon / Lagon Limonade | 7–12 | #FFF1B8 / #6FD6E8 / #FFC93C | sand, water with foam #FFFFFF, lemon slices |
| 3 Cocoa Canyon / Canyon Cacao | 13–18 | #F2C38B / #8A5A44 / #FF9E5E | chocolate cliffs #6B3F2E, sprinkles |
| 4 Frosty Sundae Peaks / Pics Sundae | 19–24 | #EAF6FF / #B9E4FF / #7FC8FF | ice-cream mountains, lavender #C9B8FF |
| 5 Starlight Candy Castle / Château Étoilé | 25–30 | #7A6BC9 / #2E2A5C / #FF8AD8 | night, twinkling stars #FFE27A, castle towers |

### 4.2 Difficulty curve (authoritative table)

Formulas:
- `squadMid = 5 + 1.6(L−1)`, `peak = 1.4 × mid`
- `M = 1 + 0.045(L−1)`, which assumes the greedy economy profile (perm + weapon tier/level)
- `ExpDPS = mid × 24 × M`
- `Enemies/10s = 5 + 0.45(L−1)`
- `Pressure P = 0.125 + 0.012(L−1)`, ×0.88 on the first level of each world (relief). P is the HP of Grumblies arriving per second divided by ExpDPS.
- `hpMult = P × ExpDPS / (3 × density)`, with an average baseHP of 30.
- Run length = `60 + 1.5(L−1)` s. Boss levels use a run-in of `35 + 2w` s plus the boss fight.
- Scroll = `80 + 1.5(L−1)` u/s.
- Stars: ★ = clear; ★★ = end squad ≥ `round(0.8·mid)`; ★★★ = end squad ≥ `round(1.15·mid)` (squad at boss defeat on boss levels).

| L | New element(s) | Run s | Scroll | hpMult | En./10s | Squad mid/peak | Exp. DPS | P | Boss HP | ★★/★★★ |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jellybob, +gates, drag tutorial | 60 | 80 | 1.00 | 5.0 | 5/7 | 120 | .13 | – | 4/6 |
| 2 | Crates, Buttons, ×2 gate | 62 | 82 | 1.39 | 5.5 | 7/9 | 166 | .14 | – | 5/8 |
| 3 | Dustbun, Buddy Heart (unlock Shaker) | 63 | 83 | 1.81 | 5.9 | 8/11 | 215 | .15 | – | 7/9 |
| 4 | Red gates, Lollipop Spinner | 65 | 85 | 2.26 | 6.4 | 10/14 | 267 | .16 | – | 8/11 |
| 5 | Bouncy Bean, Sparkle Meter cards | 66 | 86 | 2.74 | 6.8 | 11/16 | 323 | .17 | – | 9/13 |
| 6 | **BOSS Big Wobble** (unlock Gumball) | 37+boss | 88 | 3.25 | 7.3 | 13/18 | 382 | .19 | 11,400 | 10/15 |
| 7 | Grow & Power gates, Shield Bubble | 69 | 89 | 3.33 | 7.7 | 15/20 | 445 | .17 | – | 12/17 |
| 8 | Twinjelly, Frenzy Candy | 71 | 91 | 4.37 | 8.2 | 16/23 | 511 | .21 | – | 13/19 |
| 9 | Grumpcloud (ranged) | 72 | 92 | 4.98 | 8.6 | 18/25 | 581 | .22 | – | 14/20 |
| 10 | Gift Box (unlock Star Wand) | 74 | 94 | 5.61 | 9.1 | 19/27 | 654 | .23 | – | 16/22 |
| 11 | Rolling Gumball, Magnet, Button Jar | 75 | 95 | 6.28 | 9.5 | 21/29 | 731 | .25 | – | 17/24 |
| 12 | **BOSS Sir Shellwhirl** | 39+boss | 97 | 6.98 | 10.0 | 23/32 | 811 | .26 | 29,000 | 18/26 |
| 13 | 3-gate rows, ×3, ÷2 | 78 | 98 | 6.79 | 10.4 | 24/34 | 894 | .24 | – | 19/28 |
| 14 | Shellsnail (unlock Boomerang) | 80 | 100 | 8.47 | 10.9 | 26/36 | 981 | .28 | – | 21/30 |
| 15 | Donut Dasher | 81 | 101 | 9.26 | 11.3 | 27/38 | 1072 | .29 | – | 22/32 |
| 16 | Syrup Puddles | 83 | 103 | 10.1 | 11.8 | 29/41 | 1166 | .31 | – | 23/33 |
| 17 | Gauntlet: W1–3 mix | 84 | 104 | 10.9 | 12.2 | 31/43 | 1263 | .32 | – | 24/35 |
| 18 | **BOSS Grand Donut** (unlock Confetti) | 41+boss | 106 | 11.8 | 12.7 | 32/45 | 1364 | .33 | 56,800 | 26/37 |
| 19 | Elite Grumblies | 87 | 107 | 11.2 | 13.1 | 34/47 | 1468 | .30 | – | 27/39 |
| 20 | Candy-cane Fences | 89 | 109 | 13.7 | 13.6 | 35/50 | 1576 | .35 | – | 28/41 |
| 21 | Ice Patches | 90 | 110 | 14.7 | 14.0 | 37/52 | 1687 | .37 | – | 30/43 |
| 22 | Swarm streams + Elites | 92 | 112 | 15.7 | 14.5 | 39/54 | 1802 | .38 | – | 31/44 |
| 23 | Hard mix | 93 | 113 | 16.7 | 14.9 | 40/56 | 1920 | .39 | – | 32/46 |
| 24 | **BOSS Thunderpuff** (unlock Beam) | 43+boss | 115 | 17.8 | 15.4 | 42/59 | 2042 | .40 | 97,200 | 33/48 |
| 25 | Moving gates | 96 | 116 | 16.6 | 15.8 | 43/61 | 2167 | .36 | – | 35/50 |
| 26 | Elite Grumpclouds + Fences | 98 | 118 | 20.0 | 16.3 | 45/63 | 2295 | .43 | – | 36/52 |
| 27 | Twinjelly swarms + Dashers | 99 | 119 | 21.2 | 16.7 | 47/65 | 2427 | .44 | – | 37/54 |
| 28 | 3-gate trap gauntlet | 101 | 121 | 22.4 | 17.2 | 48/67 | 2562 | .45 | – | 39/55 |
| 29 | Grand Parade (everything) | 102 | 122 | 23.6 | 17.6 | 50/70 | 2701 | .46 | – | 40/57 |
| 30 | **FINAL BOSS Queen Grumblina** | 45+boss | 124 | 24.8 | 18.1 | 51/72 | 2844 | .47 | 169,200 | 41/59 |

**Target first-attempt win rates** (for the "average-good" bot and real players): L1–5 ≥ 90%; normal levels 65–80%; bosses 55–65%; first level of a world ≥ 80% (relief).

**Retune procedure:** the balance harness measures the real greedy-profile M. If it deviates from the table by more than 15%, scale hpMult for that level proportionally. Do not change costs. Boss HP follows the same correction.

### 4.3 Level authoring
Levels are **hand-authored timelines** in `js/data/levels.js`:
```js
{ id: 8, world: 2, seed: 808, length: 71, scroll: 91, intro: 'twinjelly',
  beats: [ [2,'wave',{p:'line',e:'jelly',n:4}], [9,'gates',{t:'pair',g:['+auto','x2']}],
           [13,'wave',{p:'v',e:'twin',n:3}], [16,'obj',{o:'crate',x:142}], ... ,
           [66,'wave',{p:'stream',e:'dust',n:10}], [71,'finish'] ] }
```
- **Wave patterns:** `line` (n across the road), `column` (n in one lane, 40 u apart), `v`, `wall` (a full row with one gap), `zigzag`, `cluster` (circle of n), `sides` (two outer lanes), `stream` (n spaced 0.3 s at random x), `pincer`.
- **Rhythm per level:** 0–3 s calm (lone weak enemies) → repeating blocks of (wave 6–10 s → 2 s breather → gate row) → one mid-level "event" (new element showcase) → final 10 s crescendo wave → Finish Arch.
- **Gate rows:** about one every 11–14 s, so 4–8 per level.
- **Intro rule:** the level that introduces an element shows it **alone first** with an easy instance and a 1-line hint (§5). It then becomes a regular part of the mix 2–3 levels later.
- **Count rule:** total enemies ≈ `density × length / 10` (±10%). The validator checks this.

### 4.4 Unlocks and endgame
- **Levels:** strictly sequential. Clearing L unlocks L+1. Any cleared level is replayable.
- **Weapons:** unlock on clearing L3, L6, L10, L14, L18 and L24 (see the table). This is a free unlock with a "New weapon!" card. Upgrades are bought with Buttons.
- **Endless "Parade Marathon"** (unlocks after L30): procedural, using the same pattern library and a seeded RNG.
  - Level-equivalent `Le = 12 + t/20`, continuous.
  - For L > 30: `hpMult = 24.8 × 1.08^(L−30)`; density +0.45 per Le, capped at 26.
  - A gate row every 11 s.
  - A mini-boss (a random boss 1–4 at 40% of its formula HP) every 100 s.
  - **Score = metres travelled** (`distance / 10`). The best score is saved and is the only value sent to `sendScore`.
  - Buttons are earned as normal.
- **End of content** is made explicit: after the final boss, the ending plays, the map shows a "THE END ★ Endless unlocked" banner, and the total stars appear on the map header (out of 90).

---

## 5. UX and screens
All menus are **DOM overlays** (HTML/CSS) on top of the canvas: crisp text, easy i18n, and easy for Playwright. Every interactive element gets `data-testid`. Gameplay and the HUD are drawn on the canvas. Buttons are ≥ 48 CSS px tall with rounded "candy" styling (CSS gradients and borders only). Font stack: `ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`. No web fonts.

| Screen | Content |
|---|---|
| **Boot / splash** | Canvas-drawn logo (bouncing Pip + title) and a progress bar while sprites pre-render. Call `firstFrameReady` here and `gameReady` when the main menu is interactive. Target < 1.5 s. |
| **Main menu** | Big **PLAY** button (starts the next uncleared level directly), Map, Workshop (with a "!" badge if anything is affordable), Settings, Endless (lock icon + "L30" until unlocked). Animated parade in the background. |
| **Level map** | Vertical winding path through the 5 world backdrops. Each node shows its number, 0–3 stars and best %. Locked nodes are grey with a lock; the current node bounces; boss nodes are larger with the boss face. Weapon unlocks appear as a weapon icon next to their node. Tapping a node opens a **level card**: stars, star thresholds, a weapon carousel (equip), and PLAY. |
| **HUD** (canvas) | Top row at y ≥ 48: pause button (44×44 u, top-left), **progress bar** with gate and boss icons and the Pip head moving, Buttons counter (top-right). Under it: the Sparkle Meter. Squad counter badge above Pip with **two star ticks** that light up live when the squad passes ★★/★★★ par. Boss HP bar replaces the progress bar during the fight. |
| **Pause** | Resume, Restart, Map, toggles (music / SFX / vibration). Esc = resume. |
| **Card choice** | 2 cards with an icon, a short name and a big number (e.g. "+25%"). |
| **Win** | Stars pop one by one with sound, Buttons count up (each part labelled with an icon: level, bridge, collected, stars), a "New weapon!" or "New world!" card when relevant, a progress strip to the next weapon unlock. Buttons: **Next** (primary), Replay, Workshop. |
| **Lose** | "So close!" / "Presque !". Progress % vs. best, Buttons kept count-up, one **hint icon**: an upgrade arrow to the Workshop if an upgrade is affordable, otherwise a "pick blue gates" pictogram. Helping Hand glove if active. **Retry** (primary), Workshop, Map. |
| **Workshop** | Tabs: Weapons / Upgrades. Weapon card: animated icon, 3 stat bars (Power, Speed, Special), level pips, Upgrade (cost) and Equip. Locked weapons show a silhouette + "Level 10". Upgrade rows: icon, level pips, effect "+6% → +12%", cost. Unaffordable costs are greyed out. Purchases trigger a sparkle + SFX. |
| **Settings** | Music on/off, Sound effects on/off, Vibration on/off (hidden if `navigator.vibrate` is missing), Screen shake full/reduced, Control sensitivity (3 steps), Language Auto/English/Français (**hidden inside Playables**, where the platform language is used), Reset progress (two-step confirm), credits line. **There is no master mute button** (Playables rule): music and SFX are separate toggles. |
| **Ending** | 6 canvas-drawn panels, auto-advancing every 2.5 s or on tap, then credits. Endless is unlocked. |

**Tutorial (L1 + intros, almost wordless):**
- **L1 start:** a ghost hand swipes left/right with the hint "Drag to move" / "Glisse pour bouger". No enemies spawn until the squad has moved ≥ 60 u in total.
- **First gate row:** simulation slows to 0.5× for 1.5 s and a pulsing arrow points at the larger number.
- **L2:** first crate pulses with a "shoot" sparkle.
- **L4:** the red gate shakes and shows a frown icon.
- **L5:** a hand points at the cards.
- **First Grumpcloud raindrop:** a dashed line is shown to its landing x.
- Each hint shows only once (stored in the save).

**i18n:**
- Dictionaries live in `js/data/lang_en.js` and `lang_fr.js` (flat keys like `menu.play`, `hint.drag`, `shop.upgrade.power.name`, `result.win.title`).
- Auto-detect: `platform.getLanguage()` starts with "fr" → FR, else EN.
- Override with the settings toggle (standalone only) or `?lang=`.
- Every UI string goes through `t(key, params)`. Numbers use the locale's formatting. No text is baked into sprites except digits and symbols (in an atlas). FR strings may be about 30% longer, so layouts must wrap or auto-shrink.

---

## 6. Art direction
- **Style:** flat, rounded shapes, a 2.5 u dark plum outline (#4A3B52) on all characters and props, soft one-tone shading (a lighter top-left blob and a darker bottom crescent), big eyes and blush. Top-down road with front-facing "sticker" sprites. No perspective.
- **Readability:** heroes are warm cream and pastel. Grumblies are cool/purple-ish with frowny brows (Jellybob #9B7BFF translucent, Dustbun #9A9AB0 fuzz, Bean #6CCB7A, Twinjelly #4FD1C5, Grumpcloud #8E9AC9, Shellsnail #E07AC0 shell, Dasher #FF9E5E glaze, Elite + gold #FFD23F crown). Player projectiles are bright with white outlines. Enemy projectiles are magenta (§3.4). Hazards are red/white stripes. Gate colours are as in §3.7. The road is always the lightest tone so the foreground pops.
- **Procedural sprite cache:** at boot, and again on DPR or scale change, every sprite is drawn once to an offscreen canvas at `size × renderScale`. This covers Pompom species × 2 bob frames, each enemy × (normal, hit-white flash, squash), gates, digit/symbol atlas (3 sizes), icons, boss parts, road tile per world (360×256 u, tiled), side decor strips and particles. Per frame, draw **only with `drawImage`**. No shadowBlur, no filters, no per-frame gradients and no per-frame `fillText` (use the atlas; DOM menus are exempt).
- **Juice (all pooled, all capped):**
  - Hit: 60 ms white flash + 1 u knockback jiggle.
  - Pop: squash 1.3/0.7 → vanish, 6–10 sparkles and stars, a "POP!" sprite on 1 in 4 pops, and the floating smiley ghost.
  - Damage numbers: only on bosses, crates and jars, aggregated every 0.2 s.
  - Gate burst text.
  - Pompom spring-in.
  - Screen shake: boss slam 6 u and hazard hit 3 u, decaying over 0.25 s. Disabled when "reduced".
  - Coin magnet trail.
  - Boss defeat confetti (60 particles).
  - Vibration (if enabled): 15 ms on pompom loss (rate-limited to 4/s), 40 ms on boss hit, `[30,40,30]` on win.

**Performance budget (hard caps):** 30 visible pompoms, 70 enemies, 240 projectiles (player and enemy), 220 particles (high) / 90 (low), 24 floating texts, ≤ 450 `drawImage` per frame, JS heap < 80 MB, no allocations in the steady-state loop.

---

## 7. Audio (WebAudio only, no files)
- The AudioContext is created and resumed on the first pointerdown/keydown.
- Graph: `master → (musicGain 0.22, sfxGain 0.5)`, with a DynamicsCompressor on master.
- Each sound is rate-limited (shot ≤ 12/s total, pop ≤ 16/s), and at most 24 voices play at once.

| SFX | Recipe |
|---|---|
| shot (per weapon) | Wand: sine 880→1320 Hz, 40 ms. Shaker: 3 quick triangle ticks. Gumball: sine 220→110 + click. Star: two sine pings a 5th apart. Cookie: square whoosh with a lowpass sweep. Confetti: noise burst through a bandpass. Beam: a looping saw pad, lowpassed, while active |
| pop | noise 30 ms through a bandpass at 2 kHz, plus sine 600→200 over 80 ms, random pitch ±10% |
| gate good / bad | triangle arpeggio C5-E5-G5 (3×60 ms) / square 400→200, 200 ms |
| pompom lost | sine 300→150 "boing" with 8 Hz vibrato |
| button | sine 1320 then 1760, 2×50 ms |
| boss slam / roar | 60 Hz sine thump + noise / a cute "hmph" (formant-ish saw with a vowel bandpass) |
| card, UI click | soft triangle blips |
| win / lose | 5-note major jingle / 3-note descending "wah-wah" on triangle |

- **Generative music:** a 16-step sequencer with a 100 ms look-ahead scheduler. Each world has its own key and tempo (W1 C major 110 bpm, W2 F 116, W3 G 104, W4 D 112, W5 A minor-ish 120).
  - Progression I–V–vi–IV over 4 bars.
  - Triangle bass on roots.
  - Square arpeggio at 0.06 gain with a 2.4 kHz lowpass.
  - Sine pad on chords.
  - Kick (sine 120→40) and noise hat.
  - The boss track runs +12 bpm with a minor IV.
  - The melody is generated from a seeded random walk over chord tones, repeating every 8 bars.
- **Mute handling:** effective gain = `platformAudioEnabled && !paused ? setting : 0`. On pause, call `ctx.suspend()`. If platform audio is disabled at boot, do not start the music scheduler.

---

## 8. Technical architecture
- **Stack:** vanilla JS (ES2017), **classic `<script>` tags** in fixed order sharing one global `window.PP` namespace.
  - Trade-off: ES modules are blocked under `file://` by CORS, so they are not used. No `fetch`/XHR either: all data is JS files.
  - No build step, no dependencies, no network calls, no external fonts.
  - Must run by double-clicking `index.html` (file://) and from any static host. Use relative paths only, and file names limited to `[a-z0-9_.-]`.
- **Files:**
```
index.html  css/style.css
js/core/  namespace.js util.js(rng mulberry32, math, Pool) platform.js storage.js i18n.js
          input.js audio.js renderer.js loop.js quality.js
js/data/  lang_en.js lang_fr.js worlds.js weapons.js enemies.js upgrades.js balance.js levels.js patterns.js
js/gfx/   sprites.js(procedural painters + cache) atlas.js particles.js fx.js background.js
js/game/  squad.js projectiles.js enemies.js gates.js obstacles.js pickups.js bosses.js
          collision.js(uniform grid 60 u) runner.js(level timeline) endless.js cards.js economy.js save.js
js/ui/    ui.js screens/*.js hud.js tutorial.js
js/debug/ debug.js autoplay.js balance.js validator.js
js/main.js
README.md (how to run, URL params, test API)
```
- **index.html:**
  - `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">`
  - CSS: `touch-action:none`, `overscroll-behavior:none`, `user-select:none`; the context menu is suppressed.
  - A commented placeholder `<!-- PLAYABLES SDK HERE -->` is the **first** script.
- **Loop:** `requestAnimationFrame`, fixed simulation step `dt = 1/60`, accumulator, frame delta clamped to 0.1 s, ≤ 5 steps per frame (×speed in debug). Rendering happens once per frame, without interpolation. At 30 fps the simulation runs 2 steps per frame, so gameplay speed is identical. All gameplay randomness goes through the seeded RNG; `Math.random` is only for cosmetics. The same seed and inputs give the same result.
- **Pools:** preallocated pools for projectiles, enemies, particles, texts and pickups. Use flags plus swap-remove, never splice in the loop, and no closures created per frame.
- **Rendering:** a single canvas. `renderScale = cssScale × min(devicePixelRatio, dprCap)`, with `dprCap` 2 (high), 1.5 (mid) or 1 (low). The canvas backing store is sized to the letterboxed CSS rect. All drawing uses `setTransform` in logical units.
  - On `resize`/`orientationchange`, debounce 100 ms, recompute H and scale, re-cache sprites if renderScale changed, and **keep all state**.
  - Desktop and landscape show a centred portrait column with themed pillarbox.
- **Quality scaler:** rolling average of frame time over 90 frames.
  - If it stays > 20 ms, step down: particles ×0.5 → DPR 1.5 → DPR 1 → no side-decor animation.
  - If it stays < 12 ms for 5 s, step back up one level.
  - At most 2 changes per minute.
  - `?quality=low|mid|high` forces a level.
- **Pause:** the game pauses on `platform.onPause` and on blur of the game area. This stops the simulation, input, audio (suspend) and rendering, then shows the pause screen. It does not auto-resume. On `onResume`, the pause screen stays and the player taps Resume.
- **Save:** the storage abstraction is `PP.save.load()` (async) / `PP.save.write()` (debounced 500 ms, async) over the platform adapter. The JSON is versioned and expected to stay under 4 KB:
  `{v:1, unlocked, levels:{"1":{s:3,best:1,pct:100}}, buttons, upg:{power,rate,buddy,shield,luck,magnet}, weapons:{wand:{own:1,lv:1},...}, equipped, settings:{music,sfx,vib,shake,sens,lang}, hints:{...}, endlessBest, fails:{"7":2}, stats:{pops,plays}}`
  - `migrate(obj)` fills defaults and tolerates unknown or old versions. Corrupt data → reset to defaults; never crash.
  - Save on level end, purchase, settings change, card or hint completion, and onPause.
  - **Never save before the first load has resolved** (queue writes).
  - If localStorage throws (e.g. under file:// in some browsers), fall back to in-memory storage.
- **Platform adapter** (`PP.platform`, the only file that may reference `ytgame`):

| Adapter hook | Standalone web | YouTube Playables SDK |
|---|---|---|
| `isPlayables` | false | `typeof ytgame!=='undefined' && ytgame.IN_PLAYABLES_ENV` |
| `firstFrameReady()` | no-op | `ytgame.game.firstFrameReady()` (splash visible) |
| `gameReady()` | no-op | `ytgame.game.gameReady()` (main menu interactive) |
| `loadData()` → Promise<string> | `localStorage.getItem('pompomParade.v1')` | `ytgame.game.loadData()` |
| `saveData(str)` → Promise | `localStorage.setItem(...)` | `ytgame.game.saveData(str)` (no localStorage for progress) |
| `getLanguage()` | `navigator.language` | `ytgame.system.getLanguage()` |
| `isAudioEnabled()` / `onAudioEnabledChange(cb)` | true / no-op | `ytgame.system.isAudioEnabled()` / `ytgame.system.onAudioEnabledChange(cb)` |
| `onPause(cb)` / `onResume(cb)` | `visibilitychange` + `pagehide` / `visibilitychange` visible | `ytgame.system.onPause(cb)` / `ytgame.system.onResume(cb)` (**do not** use the Page Visibility API there) |
| `sendScore(n)` | no-op | `ytgame.engagement.sendScore({value:n})`, Endless best only, the same value as saved |
| `logError/logWarning(msg)` | console | `ytgame.health.logError()` / `logWarning()` |

  Also hook `window.onerror` to `logError`. There is no exit button, no external links, no share prompts and no ads.
- **Size:** target < 600 KB total uncompressed, no file > 150 KB, < 60 files. That is far under the Playables limits (initial bundle < 15 MiB, files < 30 MiB). Time to interactive < 2 s on 4G.

---

## 9. Debug and test hooks

**URL parameters** (combinable). Any debug parameter puts the session in **no-persist mode** (in-memory save) unless `&save=1` is set.

| Param | Effect |
|---|---|
| `level=N` | skip menus and start level N immediately (temporarily unlocked) |
| `endless=1` | start Endless |
| `autoplay=1` | bot plays (steering + card picks) |
| `god=1` | squad never drops below 1 and never fails |
| `speed=K` | simulation speed 0.25–8 (multiple fixed steps per frame) |
| `seed=S` | override the RNG seed |
| `squad=N`, `weapon=id`, `wlv=1..5` | starting squad / weapon / weapon level |
| `upg=power:5,rate:3,...` or `profile=expected` | upgrade levels, or the greedy economy profile for that level |
| `unlockall=1`, `buttons=N` | unlock all levels and weapons; set Buttons |
| `lang=fr|en`, `mute=1`, `quality=…`, `fps=1` (overlay: fps, entities, quality), `hitbox=1` | display and test helpers |
| `tutorial=0`, `reset=1` | skip hints; wipe the save on load |
| `screen=map|shop|settings|win|lose|ending` | open a screen directly (for UI screenshots) |
| `balance=1` | run the balance harness (below) and print a report |
| `validate=1` | run the level validator and print its report |

**`window.__game` API:**
- `version`
- `ready` (bool)
- `getState()` returns:
  `{screen, mode, level, world, t, runLength, progress, squad, squadPeak, stars, buttonsRun, buttonsTotal, enemies:{alive, popped}, projectiles, particles, boss:{hp,maxHp,phase}|null, weapon, cardsPending, paused, speed, god, autoplay, seed, fps, quality, lastResult:{win,stars,progress,buttons}}`
- `startLevel(n, opts)`, `startEndless(opts)`, `goto(screen)`
- `setSpeed(k)`, `setGod(b)`, `setAutoplay(b)`, `setSquad(n)`
- `pause()`, `resume()`, `step(frames)` (deterministic advance while paused)
- `skip(seconds)` (fast-simulates without rendering)
- `chooseCard(i)`, `forceWin()`, `forceLose()`
- `give({buttons, unlock:'all'|n, weapons:'all'})`
- `getSave()`, `resetSave()`
- `events`: a ring buffer of the last 200 `{t, type, data}`
- `on(type, cb)`, with event types `boot, ready, levelStart, gatePassed, cardOffered, cardChosen, bossStart, bossPhase, pompomLost, levelWin, levelFail, purchase, save`
- `validateLevels()` → report
- `runBalance(opts)` → Promise<report>

**Autoplay bot ("average-good"):**
- Reaction delay 0.25 s.
- Path choice: every 0.1 s it samples x every 15 u and scores each over the next 1.2 s. Danger (hazards, telegraphed lanes, enemy projectiles, enemies with bump > their remaining time-to-kill) is weighted −100. The HP-density column is weighted +1.
- Gate rows within 260 u override the path choice. The bot picks the gate with the best resulting value (squad after the gate; a power gate counts as +20% of squad).
- Cards: it prefers dmg/rate, then Buddy.

**Balance harness:** runs L1–30 headless at maximum speed with the bot, using `profile=expected`. The profile simulates the economy: rewards with an average of 2 stars, spent greedily on the cheapest of Power / Quick Paws / equipped weapon level / Buddy Start, with Shield and Lucky ×1 after L10, and the newest weapon equipped. Output per level: win, end squad, star count, time, real M versus the table. It also runs a "no upgrades, Wand" pass. **Targets:**
- (a) expected profile wins all 30 levels, reaching ★★ on ≥ 60% of them;
- (b) the no-upgrade pass clears L1–10 and fails ≥ 3 levels in L19–30;
- (c) with `god=1`, no level runs outside 60–120 s total.

**Validator:** checks every gate fairness rule in §3.7, enemy counts against the density, the intro order, sizes and seeds, and that every beat references existing ids.

---

## 10. Implementation order

1. **Skeleton:** index.html, CSS, namespace, loop, renderer (scaling, letterbox, DPR cap), input (pointer/keyboard), `?fps=1` overlay.
2. **Platform adapter, storage, save schema and migration, i18n** (EN/FR dictionaries started).
3. **Procedural sprite cache**, world palettes, scrolling road and decor for 5 worlds, digit atlas.
4. **Squad:** formation, movement, hitbox, emitter firing model, projectile pool, Bubble Wand.
5. **Enemies:** all 7 types plus the Elite modifier, collision grid, hit flash, pop FX, Button drops, pickups.
6. **Gates:** all types including grow and moving; obstacles and hazards; validator.
7. **Level runner:** beats timeline, finish arch with Bonus Bridge, win/lose, stars, rewards, Helping Hand. Canvas HUD.
8. **Weapons:** the other 6, weapon levels and perks, Gift Box, Sparkle Meter and cards.
9. **Bosses:** all 5 with telegraphs, phases and the ending sequence.
10. **DOM screens:** menu, map, level card, Workshop, settings, pause, win/lose, tutorial hints.
11. **Debug:** URL params, `window.__game`, autoplay bot, balance harness.
12. **Levels:** author all 30 levels per §4.2/§4.3. Run the validator and balance harness, then retune. Build Endless.
13. **Audio:** SFX, generative music, mute and pause rules.
14. **Juice and performance pass:** quality scaler, caps, allocation audit, low-end test (CPU throttle ×4 in Chrome DevTools).
15. **Polish:** FR text fit, README (run, test, URL params, adapter notes), final acceptance run.

---

## 11. Acceptance checklist (critics)

**Run and platform**
- [ ] Runs by opening `index.html` via file:// in Chrome and Firefox, and from a static server, with no console errors and **zero network requests** beyond local files.
- [ ] No dependencies, no build step, classic scripts, relative paths, total < 600 KB.
- [ ] Portrait phone fills the screen. Desktop and landscape show a centred letterboxed column with a themed border. Live resize and rotation keep game state.
- [ ] Touch drag, mouse drag and keyboard (arrows, A/D, Esc, Enter) all work. Esc is not preventDefault-ed. Page does not scroll or zoom.

**Gameplay systems**
- [ ] Auto-fire. Squad count acts as health. The visible pompom cap of 30 and the ×N badge work.
- [ ] All 7 weapons feel and look different and unlock at the listed levels. Upgrades Lv1–5 work.
- [ ] 7 enemy types plus Elite, all obstacles, pickups and gate types, each introduced at its listed level.
- [ ] Fairness rules pass the validator for all 30 levels.
- [ ] 5 bosses with distinct patterns, telegraphs ≥ 0.6 s, phase transitions and HP bars. The final ending plays and Endless unlocks.
- [ ] 30 levels across 5 visually distinct worlds. Normal levels last 60–120 s.
- [ ] Endless runs ≥ 10 min with the bot and `god=1` without slowdown or leaks. Its best score is saved.

**Progression and balance**
- [ ] Stars use the table thresholds and are visible live in the HUD.
- [ ] Failing still grants Buttons and records best %. Helping Hand triggers after 2 fails.
- [ ] Workshop costs and effects match §3.10. No real money, no ads, no timers or energy.
- [ ] Balance harness targets (a), (b) and (c) are met. A report is pasted into README.

**UX and presentation**
- [ ] Tutorial hints appear once, are almost wordless, and are FR/EN.
- [ ] Auto-detected language. All strings localised, with no overflow in FR.
- [ ] Settings: music, SFX, vibration, shake, sensitivity, language (standalone), reset. No master mute button.
- [ ] Audio starts only after a gesture, respects the toggles and platform mute, and stops on pause.

**Performance**
- [ ] 60 fps on a mid laptop with 4× CPU throttle in the busiest level (L29) at quality auto. Stays ≥ 30 fps and gameplay speed is identical at 30 fps.
- [ ] All caps from §6 hold, and no per-frame `fillText`/shadowBlur appears in gameplay.

**Integration and tooling**
- [ ] Pause works via the button, Esc, visibility (standalone) and the adapter `onPause`. Saves on pause.
- [ ] `PP.platform` is the only code touching `ytgame`, and the mapping matches §8. Save is under 4 KB, migration-safe, and never written before load.
- [ ] Every URL parameter in §9 works. `__game.getState()` reflects reality. `?level=12&autoplay=1&speed=8` reaches `levelWin` or `levelFail` and emits events. `data-testid` is set on all DOM buttons.
- [ ] Theme stays cute everywhere: nothing dies, no blood, no realistic guns, original names and art only.
