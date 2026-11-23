// Headless strategy table: node bridge/tests/sim.js [seeds] [assert] [json overrides]
var S = require('../sim.js');
var N = +process.argv[2] || 200;
if (process.argv[4]) { var o = JSON.parse(process.argv[4]); Object.keys(o).forEach(function (k) { var m = k.match(/^B_([a-z]+)_(\w+)$/); if (m) S.BOTS[m[1]][m[2]] = o[k]; else S.CFG[k] = o[k]; }); }
var kinds = ['smart', 'mediocre', 'camper', 'notreasure', 'horde', 'farm'], table = {};
console.log('strategy     win%   avgT  squadEnd(win) maxSq gifts belt% tre% switches  lose: horde / boss1 boss2 boss3 boss4  bossHpLeft');
kinds.forEach(function (k) {
  var w = 0, t = 0, sq = 0, mx = 0, g = 0, be = 0, tr = 0, sw = 0, lh = 0, lb = [0, 0, 0, 0], left = 0, nb = 0, st = 0;
  for (var i = 1; i <= N; i++) {
    var r = S.run(k, i * 7919);
    t += r.t; mx += r.maxSquad; g += r.gifts; be += r.beltShare; tr += r.treShare; sw += r.switches;
    if (r.result === 'win') { w++; sq += r.squad; st += r.stars; } else if (r.reason === 'horde') lh++; else { lb[r.bossIdx]++; left += r.bossLeft; nb++; }
  }
  table[k] = w / N;
  var p = function (s, n) { return (s + '                ').slice(0, n); };
  console.log(p(k, 12) + p((100 * w / N).toFixed(0) + '%', 7) + p((t / N).toFixed(0), 6) + p(w ? (sq / w).toFixed(0) + ' (' + (st / w).toFixed(1) + '*)' : '-', 14) + p((mx / N).toFixed(0), 6) +
    p((g / N).toFixed(1), 6) + p((100 * be / N).toFixed(0), 6) + p((100 * tr / N).toFixed(0), 5) + p((sw / N).toFixed(0), 10) + p('      ' + lh + ' / ' + lb.join(' '), 30) + (nb ? (left / nb).toFixed(0) : '-'));
});
if (process.argv[3] === 'assert') {
  var ok = table.smart >= 0.9 && table.horde === 0 && table.farm === 0 && table.mediocre >= 0.3 && table.mediocre <= 0.7 && table.notreasure <= 0.2 && table.camper <= 0.3;
  console.log(ok ? 'BALANCE OK' : 'BALANCE FAIL'); process.exit(ok ? 0 : 1);
}
