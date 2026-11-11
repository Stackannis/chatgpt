- **gameplay-1 — BLOCKER:** From about L11 the game needs near-perfect steering, so an imperfect player hits several hard walls.
  - **Evidence (simulated players, not real humans):** I wrapped the builder's autoplay bot in a human model with extra reaction delay, a finger-speed cap, steering noise and missed gate picks (`review/gameplay/lib.js`). The bot with random card picks wins 100% on most levels, but a "good" player (+0.15 s delay, 90% right gate) drops sharply (`winrates.js`, 8 runs per cell, expected-profile upgrades).

    | Level | Good player win rate |
    |---|---|
    | L11 | 50% |
    | L15 | 13% |
    | L21 | 0% |
    | L28 | 0% |
    | L30 | 0% |

    An "avg" player (+0.3 s) is at 0–25% on nearly every level from L13 on, and 0% on the L6 boss.
  - **Ablation (`ablate.js`):** the +0.15 s delay alone takes L15 from 100% to 42%. 7 u of steering noise alone takes L11 from 100% to 0%.
  - **Full campaign from a fresh save with greedy spending (`campaign.js`):** the good player needed 100 attempts, including 20 on L27 and 9 on L18 and L30. The avg player failed L20, L27, L28 and L30 after 25 attempts each.
  - **L6 boss trace:** the squad loses 3 pompoms per boss hit every ~8 s while its damage is low, so it can't out-damage the boss with 12 or fewer pompoms.
  - **Caveat:** these are model results. I could not test real thumbs.
  - **Fix:** reduce HP and DPS sensitivity so a player with +0.3 s delay still clears most normal levels, and rebalance with the lagged bot (`good`/`avg` in `review/gameplay/lib.js`), not the perfect one. The README's balance table is effectively the 100% bot.

- **gameplay-2 — MAJOR:** The difficulty curve is jagged rather than rising, because the per-level `TUNE` factors were fitted to the bot.
  - **Evidence:** `js/data/balance.js:12-17` has factors from 0.6 to 2.2. Level wave HP per second (`curve.js`):

    | Levels | Wave HP per second |
    |---|---|
    | L5 → L6 → L7 → L8 | 49 → 53 → 94 → 178 |
    | L12 → L13 | 307 → 610 |
    | L13/14 → L16/17 | 610/623 → 502/453 |
    | L23 → L24 | 1328 → 983 |
    | L26 → L27 | 981 → 2146 |
    | L30 | 2351 |

    L27–29 are nearly as hard as the final boss level, and L25–26 are about half as hard. This matches the L27 wall in gameplay-1.
  - **Fix:** smooth `HP × TUNE` to a monotonic curve. Pull L13/14 and L27–29 down, then retune with the lagged player model.

- **gameplay-3 — MAJOR:** Weapons are badly ordered after Star Wand, so most later unlocks make a player weaker.
  - **Evidence (`weapons_cmp.js`):** with identical upgrades and a good human, Star Lv1 does as well as or better than every later weapon at Lv1.

    | Weapon (Lv1) | L12 | L26 |
    |---|---|---|
    | Star | 75% | 63% |
    | Cookie | 25% | 13% |
    | Confetti | 13% | 13% |
    | Beam (final unlock, `weapons.js:15`) | 0% | 25% |

    Star Lv3–5 beats Beam, Confetti and Cookie at the same level on L12/L16/L26 (L20 is the exception). With a perfect-aim bot, Wand, Shaker, Cookie, Confetti and Beam at Lv1 win only 13–50% on the L12 boss, while Gumball and Star win 100%.
  - **Why:** each weapon levels separately, and Star's homing hides steering errors. The best strategy is to pick Star and never switch, so the L14, L18 and L24 unlocks are traps.
  - **Fix:** carry weapon levels across weapons, or make each new weapon start at the current best level. Give Star a real trade-off. Make the late weapons clearly stronger, or give each a role that fits a specific level.

- **gameplay-4 — MAJOR:** A newly unlocked weapon is never equipped and the player is never told to equip it.
  - **Evidence:** `economy.js:35` only sets `own`. After winning L3 on a fresh save, `getSave().equipped` was still `wand`. `result.js:37` shows an icon and "New weapon!" with no Equip button. Equipping lives in the map level card (`map.js:25-31`) and the Workshop.
  - **Problem:** the builder's "expected" profile assumes the newest weapon is equipped, so the balance report overstates what real players have.
  - **Fix:** auto-equip on unlock, or add an Equip button to the card.

- **gameplay-5 — MAJOR:** The economy gives no way out of a wall, and failing earns almost nothing.
  - **Evidence:** a failed L27 attempt at 50% progress pays about 45 Buttons (`economy.js:40`), while power costs 60×1.45^k (`upgrades.js:6`): level 9 costs 1,172 and the full track totals 34,979 for +6% each. The good player ended L27 with 617 Buttons after 20 tries and upgrades at 8/6/4 (power/rate/buddy), and still had to win through gate luck. The avg player never cleared L20, L27, L28 or L30.
  - **Helping Hand:** it caps at +6 pompoms after 4 fails (`economy.js:8`). That is small against a mid squad of 47 at L27, and it stays at +6 through the remaining 16 attempts.
  - **Retry cost:** each retry replays the full ~75–110 s level with no checkpoint.
  - **Fix:** make failures pay about 30–50% of a win's value. Keep scaling Helping Hand after more fails, for example +10% damage or a starting shield. Add cheaper first steps and an optional "skip run-in to boss" after repeated fails.

- **gameplay-6 — MAJOR:** The first 12 levels are passable almost without playing, and then a cliff arrives at L13.
  - **Evidence:** the "lazy" player stays near x=180 with random gates (`winrates.js`).

    | Levels | Lazy player win rate |
    |---|---|
    | L1–3 | 100% |
    | L7–9 | 100% |
    | L12 boss | 100% |
    | L13 | 25% |
    | L14 | 0% |

    I did not play the real tutorial beyond L1. L1 itself is clear and works: the drag hint, the first-gate slow-mo and arrow, and a 3-star win all behaved as intended in `touch_l1.js`.
  - **Fix:** add genuine dodging and gate decisions in W1–W2, for example higher hazard frequency, and ramp W3 more gently.

- **gameplay-7 — MAJOR:** Endless is trivial for a perfect player and brutal for everyone else.
  - **Evidence (`endless_sim.js`, full L30 profile with Beam):** the bot was still alive at the 15-minute cap with squads of 175–200. Good humans split: two of three runs survived 15 minutes, one died at 72 s. Avg humans died at 17, 21 and 74 s, and lazy players at 44–63 s.
  - **Cause:** Endless starts at Le=12 difficulty with the L1 squad of 3+buddy and no early gate (`endless.js:10-12`). Squad growth then snowballs, because the bot's squad rises 61 → 175+ while hpMult goes 10 → 122.
  - **Fix:** start Endless with a fair squad and early gates. Add real late escalation, such as a stronger gate-stinginess ramp or more enemy variety, instead of relying on HP growth alone.

- **gameplay-8 — MAJOR:** Difficulty depends on phone aspect ratio, and the balance was done only at H=640.
  - **Evidence (`hsens.js`, 10 runs):** the bot's win rate changes with screen height `H`.

    | Level | H=640 | H=780 |
    |---|---|---|
    | L18 | 60% | 100% |
    | L20 | 70% | 100% |

    The good human's L26 went 50% (H=600) → 0% (H=780), measured in `misc.js`, and the same trend shows in `hsens.js`. `runner.js:33` takes `H` from the renderer, and the GDD allows 600–780.
  - **Why it matters:** modern tall phones get H=780.
  - **Fix:** run balance at H=600 and H=780, and normalise the effective look-ahead and reaction time (for example spawn distance in seconds, not pixels).

- **gameplay-9 — MINOR:** The lose-screen hint is generic and sometimes wrong.
  - **Evidence:** `lose_L18.png`: "So close!" shows at 22% progress, and the hint is always "Pick the blue gates", even when the deaths came from enemy contact or the boss (traces in `trace.js`).
  - **Fix:** pick the hint from the cause of death (boss, enemy or hazard, or upgrade affordable), and vary the title by progress.

- **Total time to finish (estimate, not a finding):**
  - **Perfect bot:** about 45 game-minutes with 70–110 s per level.
  - **Good simulated human:** about 132 minutes of play including menus and retries, 57/90 stars.
  - **Avg simulated human:** more than 250 minutes and four levels uncleared.

- **Not verified:** real touch feel on a phone, audio, Firefox, the YouTube Playables SDK path, and the visual feel of each weapon beyond numbers. The human model is my approximation, and the 8–12-run samples carry roughly ±15% noise. The consistent trends are what I'd rely on.

**Verdict:** Charming and well-built, but balanced for a perfect bot, so imperfect players hit hard walls (L6 boss, L13–20, L27–30), and weapon unlocks and upgrades don't help them.