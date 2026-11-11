/* Pompom Parade - Sparkle Meter + in-run upgrade cards (GDD 3.8) */
(function () {
  'use strict';
  var PP = window.PP;
  var CD = PP.cards = {};
  var THRESH = [0.35, 0.70];

  /* called every step: trigger an offer when the meter crosses a threshold (levels) or every 45 s (endless) */
  CD.check = function (dt) {
    var G = PP.G;
    if (G.cards || (G.state !== 'run' && G.state !== 'boss')) return;
    if (G.mode === 'endless') {
      G.cardT += dt;
      if (G.cardT >= 45) { G.cardT = 0; CD.offer(); }
      return;
    }
    if (G.L < 5 || G.meterTotal <= 0 || G.meterIdx >= THRESH.length) return;
    if (G.meter >= THRESH[G.meterIdx] * G.meterTotal) { G.meterIdx++; CD.offer(); }
  };
  CD.meterFrac = function () {
    var G = PP.G;
    if (G.mode === 'endless') return G.cardT / 45;
    return G.meterTotal > 0 ? Math.min(1, G.meter / (THRESH[THRESH.length - 1] * G.meterTotal)) : 0;
  };
  CD.offer = function () {
    var G = PP.G, SQ = PP.squad, all = PP.data.cards, pool = [], i;
    for (i = 0; i < all.length; i++) {
      var id = all[i].id;
      if (id === 'pierce' && (SQ.weapon.id === 'beam' || SQ.weapon.id === 'cookie')) continue;
      if (id === 'big' && SQ.big >= 2) continue;
      if (id === 'lucky' && SQ.lucky > 1) continue;
      pool.push(all[i]);
    }
    var a = G.rng.int(0, pool.length - 1), b = G.rng.int(0, pool.length - 2);
    if (b >= a) b++;                    // no duplicate card within one offer
    G.cards = [pool[a], pool[b]];
    G.cardSel = 0;
    PP.events.emit('cardOffered', { cards: [pool[a].id, pool[b].id] });
    if (PP.game && !PP.headless) PP.game.onCards();
  };
  CD.buddyGain = function () { return Math.max(3, Math.round(PP.squad.n * 0.25)); };
  CD.choose = function (i) {
    var G = PP.G, SQ = PP.squad;
    if (!G.cards) return false;
    var c = G.cards[i === 1 ? 1 : 0];
    switch (c.id) {
      case 'pop': SQ.cardDmg += 0.25; break;
      case 'rate': SQ.cardRate += 0.20; break;
      case 'buddy': SQ.add(CD.buddyGain()); break;
      case 'pierce': SQ.pierce += 1; break;
      case 'big': SQ.big += 1; break;
      case 'shield': SQ.shields = Math.min(5, SQ.shields + 1); break;
      case 'lucky': SQ.lucky = 1.5; break;
    }
    G.cards = null;
    PP.events.emit('cardChosen', { card: c.id });
    return true;
  };
})();
