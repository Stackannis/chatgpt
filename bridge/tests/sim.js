// Headless strategy table: node bridge/tests/sim.js [seeds]
var S = require('../sim.js');
var N = +process.argv[2] || 200;
if (process.argv[4]) { // tuning overrides: JSON of CFG keys, B_<bot>_<key> for bot params
  var o = JSON.parse(process.argv[4]);
  Object.keys(o).forEach(function (k) { var m = k.match(/^B_([a-z]+)_(\w+)$/); if (m) S.BOTS[m[1]][m[2]] = o[k]; else S.CFG[k] = o[k]; });
}
var kinds =['smart', 'mediocre', 'notreasure', 'horde', 'farm', 'greedy', 'treasurefirst'];
var table = {};
console.log('strategy       win%   avgT  squadEnd(win) maxSquad breakT  lose:boss1/boss2/horde  avgBossHpLeft');
kinds.forEach(function (k) {
  var w = 0, t = 0, sq = 0, mx = 0, br = 0, brN = 0, l1 = 0, l2 = 0, lh = 0, left = 0, st = 0;
  for (var i = 1; i <= N; i++) {
    var r = S.run(k, i * 7919);
    t += r.t; mx += r.maxSquad;
    if (r.breakT >= 0) { br += r.breakT; brN++; }
    if (r.result === 'win') { w++; sq += r.squad; st += r.stars; }
    else if (r.reason === 'horde') lh++;
    else { if (r.bossIdx === 0) l1++; else l2++; left += r.bossLeft; }
  }
  table[k] = w / N;
  console.log((k + '              ').slice(0, 14) + (' ' + (100 * w / N).toFixed(0)).slice(-4) + '%  ' + (t / N).toFixed(1) + '   ' +
    (w ? (sq / w).toFixed(0) + ' (' + (st / w).toFixed(1) + '*)' : '-') + '        ' + (mx / N).toFixed(0) + '      ' + (brN ? (br / brN).toFixed(0) + 's/' + brN : '-') +
    '     ' + l1 + '/' + l2 + '/' + lh + '      ' + ((l1 + l2) ? (left / (l1 + l2)).toFixed(0) : '-'));
});
if (process.argv[3] === 'assert') {
  var ok = table.smart >= 0.9 && table.horde === 0 && table.farm === 0 && table.mediocre >= 0.3 && table.mediocre <= 0.7 && table.notreasure <= 0.5;
  console.log(ok ? 'BALANCE OK' : 'BALANCE FAIL'); process.exit(ok ? 0 : 1);
}
