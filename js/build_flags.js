/* Pompom Parade - build flags. tools/package_playables.js rewrites this file with BUILD = 'playables'.
 * 'web'       standalone site: debug URL params + window.__game are available (js/debug is injected).
 * 'playables' YouTube Playables package: no debug code, URL params ignored, no window.__game. */
window.PP.BUILD = 'web';
