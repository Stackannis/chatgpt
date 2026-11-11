The full findings list went through `ReportFindings`; the highest-severity ones are summarised below, plus what I checked that came out clean. Everything was run in headless Chromium, not on real hardware.

## Findings, most severe first

- **mobile-1 (MAJOR):** Landscape phones get a tiny portrait strip with small touch targets.
  - Evidence: at 640x360 and 844x390 the canvas is only 202 and 234 px wide. Map nodes measure 32x32 and 35x35 px, and the result-screen Workshop/Map buttons are 34–43 px wide. See `js/core/renderer.js:25`.
  - Fix: add a "rotate your device" overlay, or lay the game out wider in landscape. Also stop the 48 px minimum from outgrowing the scaled stage.
- **mobile-2 (MAJOR):** The pause panel overflows in landscape and cannot scroll.
  - Evidence: at 640x360 `pause-vib` sits at y 353–401 inside a 360 px UI, and the Sound effects toggle is also cropped. The pause screen is where the separate Music/SFX toggles live.
  - Fix: make the pause panel a scroll container, or use a compact two-column layout in landscape.
- **mobile-3 (MINOR):** The quality scaler is slow to react (`js/core/quality.js:45`).
  - Evidence: at 412x915 DPR 2.6 with 6x throttle it ran 17–28 fps for about 55 s before reaching 34–46 fps. At 4x on L28 the p95 frame time was 50 ms. The cause is the one-level-at-a-time stepping with at most 2 changes per minute.
  - Caveat: headless Chromium uses software rendering, so absolute numbers are not real-device numbers. The slow convergence is real.
  - Fix: allow a double step when the average frame time is above 30 ms, and cap DPR at 1.5 on canvases above 1.2 MP.
- **mobile-4 (MINOR):** Overlay text collides with the HUD.
  - Evidence: the "Paused" and "Pick one!" titles overlap the progress bar. The L1 "Drag to move" hint stays over the Resume button on the pause screen.
  - Fix: hide the hint when pausing and move the titles below the HUD.
- **mobile-5 (MINOR):** Debug and cheat code ships in the Playables build.
  - Evidence: `js/debug` is 33 KB, with `window.__game` and the `god`/`unlockall`/`buttons` URL params. `sendScore` still fires in debug sessions (`js/game/economy.js:19`), because `noPersist` only stops saving.
  - Fix: exclude `js/debug` from the Playables zip, or add a build flag. Never call `sendScore` in a debug session.
- **mobile-6 (MINOR):** Small touch targets and text at 320 px wide.
  - Evidence: the drawn pause icon is about 41 px, though its hit area is about 50 px. Secondary text such as shop bars and "Record 62 %" falls to 8.9–9.8 px.
  - Fix: set a minimum font size of about 11 CSS px.
- **mobile-7 (MINOR, unverified):** `viewport-fit=cover` is set but no `env(safe-area-inset-*)` is used.
  - Evidence: I could not test on a notched device. Portrait fills the viewport, so notch overlap is possible.
  - Fix: pad the HUD with `env(safe-area-inset-top)` and the left/right insets.
- **mobile-8 (MINOR, plausible):** Some projectiles are faint on their backgrounds.
  - Evidence: tan cookie shots on the caramel road (L15, L18) and pale-blue bubbles on the pale-pink road (L1). They are readable, just weak against the enemies and gates.
  - Fix: add a dark rim or outline to shots.

## Checked and found fine

- **Playables hooks:** the adapter has `firstFrameReady`, `gameReady`, `onPause`/`onResume`, audio-enabled handling, `loadData`/`saveData`, `getLanguage`, `sendScore` and `logError`. I verified these only by reading the code, since the SDK path cannot run offline.
- **Audio:** no AudioContext exists at boot. It runs after the first tap. Music and SFX are separate toggles. The context suspends on pause.
- **Network:** zero external requests, anchors or iframes. The save is 432 bytes.
- **Load and size:** load to ready took 198 ms. The shipped size is about 420 KB.
- **Touch behaviour:** no page scroll or pull-to-refresh, no text selection or context menu on long press, and pinch and double-tap zoom stay at scale 1. Shop and map lists scroll by touch.
- **Lifecycle:** hiding the tab pauses the game and suspends audio. Resuming leaves it on the pause screen with no time jump. Live resize and rotation keep the squad and the run.
- **Memory:** 160 screen shows plus 12 levels grew the heap from 2.5 to 4 MB. The DOM did not grow.
- **Layout:** no overflow or clipping on the menu, map, shop, settings or win/lose screens at 320x568, 360x640, 390x844, 412x915, 768x1024 or desktop, in French and English. The only exceptions are the landscape cases above.
- **Art:** menu, map, shop, all 5 worlds, all 5 bosses, win, lose, cards and ending are cohesive and cute, with no violent imagery. Player, enemies, gates and projectiles read clearly at a glance.

I did not test on a real phone, with the Playables SDK, or in Firefox, and I did not listen to the audio.

**Verdict:** the art and UI quality are Playables-ready in portrait, and I found no blockers. Handle landscape (mobile-1 and mobile-2) and strip the debug code (mobile-5) before submitting.

All my scripts and screenshots are in `review/mobile/`.