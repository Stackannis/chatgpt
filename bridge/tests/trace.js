// node bridge/tests/trace.js <bot> <seed> : prints a timeline of one headless run
var S = require('../sim.js');
var kind = process.argv[2] || 'smart', s = new S.Sim(+process.argv[3] || 7919), n = 0;
var lane = { f: 0, h: 0, t: 0 };
while (!s.result && n++ < 12000) {
  s.botStep(kind); s.step(); s.evN = 0;
  if (s.sx < 0.2) lane.f++; else if (s.sx > 0.78) lane.t++; else lane.h++;
  if (n % 240 === 0) console.log('t=' + s.t.toFixed(0) + ' squad=' + s.squad + ' x=' + s.sx.toFixed(2) + ' front=' + s.minFront.toFixed(2) +
    ' tr=' + Math.ceil(s.trHp) + ' boss=' + (s.boss.active ? Math.ceil(s.boss.hp) + '@' + s.boss.y.toFixed(2) : '-') + ' mode=' + s.bot.mode +
    ' lanes f/h/t=' + (lane.f / 60).toFixed(0) + '/' + (lane.h / 60).toFixed(0) + '/' + (lane.t / 60).toFixed(0));
}
console.log(s.result, s.reason, 't=' + s.t.toFixed(1), 'squad=' + s.squad, 'bossLeft=' + s.bossLeft);
