/* Pompom Parade - permanent Workshop upgrades (GDD 3.10) and in-run cards (GDD 3.8) */
(function () {
  'use strict';
  var PP = window.PP;
  PP.data.upgrades = [
    { id: 'power', max: 15, base: 60, growth: 1.45, per: 6, unit: '%', icon: 'i_up_power' },
    { id: 'rate', max: 12, base: 80, growth: 1.5, per: 4, unit: '%', icon: 'i_up_rate' },
    { id: 'buddy', max: 6, base: 100, growth: 1.8, per: 1, unit: '', icon: 'i_up_buddy' },
    { id: 'shield', max: 3, base: 300, growth: 2.5, per: 1, unit: '', icon: 'i_up_shield' },
    { id: 'luck', max: 5, base: 150, growth: 1.6, per: 10, unit: '%', icon: 'i_up_luck' },
    { id: 'magnet', max: 4, base: 80, growth: 1.6, per: 25, unit: '%', icon: 'i_up_magnet' }
  ];
  var byId = {};
  for (var i = 0; i < PP.data.upgrades.length; i++) byId[PP.data.upgrades[i].id] = PP.data.upgrades[i];
  PP.data.upgradeById = byId;
  /* cost of level k+1 where k = current level */
  PP.data.upgradeCost = function (id, k) { var u = byId[id]; return Math.round(u.base * Math.pow(u.growth, k)); };

  PP.data.cards = [
    { id: 'pop', icon: 'i_card_pop', val: '+25%' },
    { id: 'rate', icon: 'i_card_rate', val: '+20%' },
    { id: 'buddy', icon: 'i_card_buddy', val: '+' },
    { id: 'pierce', icon: 'i_card_pierce', val: '+1' },
    { id: 'big', icon: 'i_card_big', val: '+35%' },
    { id: 'shield', icon: 'i_card_shield', val: '+1' },
    { id: 'lucky', icon: 'i_card_lucky', val: '+50%' }
  ];
})();
