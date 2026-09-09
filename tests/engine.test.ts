import test from 'node:test';
import assert from 'node:assert/strict';
import { DICE, defaultWeapon, getKeptDieDistribution, getDiceRolled, getExpectedDamage, getExpectedChainLength,
  getEffectiveModifier, getNetAdvantage, getExposure, getMissProbability, getCritProbability,
  generateEngagementTable, findOptimalEngagement, compareWeapons, simulateAttacks, generateBalanceSweep,
  type WeaponConfig, type AttackMode, type CritModel } from '../src/calculation/index';
const close = (a: number | null, b: number, tolerance = 1e-10) => { assert.notEqual(a, null); assert.ok(Math.abs(a! - b) < tolerance, a + ' != ' + b); };
const mode = (engagement = 0): AttackMode => ({ kind: 'engagement', engagement });
const clean = (model: CritModel = 'full-impact-reproc'): WeaponConfig => {
  const w = defaultWeapon('Finesse'); return { ...w, initialAdvantage: 0, attributeModifier: 0, tier: 0, perfection: 0,
    imbuement: 0, rules: { ...w.rules, critModel: model } };
};
for (const d of DICE) for (let a = -5; a <= 5; a++) {
  test('distribution sums to one: d' + d + ', advantage ' + a, () => {
    const p = getKeptDieDistribution(d, a);
    close(p.reduce((sum, x) => sum + x.probability, 0), 1);
    assert.ok(p.every(x => x.probability >= 0 && x.probability <= 1));
  });
}
for (const a of [0, 1, -1, 2, -2]) {
  test('d6 distribution matches independent enumeration, advantage ' + a, () => {
    const n = 1 + 2 * Math.abs(a), counts = Array<number>(7).fill(0);
    function walk(depth: number, kept: number) {
      if (depth === n) { counts[kept]++; return; }
      for (let f = 1; f <= 6; f++) walk(depth + 1, a < 0 ? Math.min(kept, f) : Math.max(kept, f));
    }
    walk(0, a < 0 ? 6 : 1);
    getKeptDieDistribution(6, a).forEach(x => close(x.probability, counts[x.face] / 6 ** n));
  });
}
test('normal d6 is uniform; miss and crit are 1/6', () => {
  const d = getKeptDieDistribution(6, 0);
  d.forEach(x => close(x.probability, 1/6)); close(getMissProbability(d), 1/6); close(getCritProbability(d, 6), 1/6);
});
test('miss on kept 1 cancels all damage and crits', () => {
  const w = { ...clean(), attributeModifier: 10, tier: 5, perfection: 4, imbuement: 3, flat: 2, onHit: 8 };
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 1, probability: 1 }] });
  close(r.expectedDamage, 0); close(r.expectedImpacts, 0); close(r.expectedCrits, 0);
  assert.ok(Object.values(r.breakdown!).every(x => x === 0));
});
test('precise: +1 advantage, zero modifier, crit, exposure and reproc', () => {
  for (const type of ['Strength','Finesse'] as const) {
    const w = defaultWeapon(type), r = getExpectedDamage(w, { kind: 'precise' });
    close(r.state.effectiveModifier, 0); close(r.state.netAdvantage, 3);
    close(r.initialCritProbability, 0); close(r.expectedCrits, 0); close(r.state.exposure, 0);
    close(r.expectedReprocImpacts, 0); close(r.probabilityAtLeastOneReproc, 0);
  }
});
test('engagement multiplies +4 by three', () => close(getEffectiveModifier(defaultWeapon('Finesse'), mode(2)), 12));
for (const [e, net] of [[1,1],[2,0],[3,-1]]) {
  test('initial +2, engagement ' + e + ' gives net ' + net, () => close(getNetAdvantage(defaultWeapon('Finesse'), mode(e)), net));
}
test('negative initial advantage -2 and E1 rolls seven lowest dice', () => {
  const w = { ...clean(), initialAdvantage: -2 }, r = getExpectedDamage(w, mode(1));
  close(r.state.netAdvantage, -3); close(getDiceRolled(r.state.netAdvantage), 7);
  close(r.missProbability, 1 - (5/6) ** 7);
});
test('no gameplay cap on engagement', () => close(getExpectedDamage(clean(), mode(1000)).state.effectiveModifier, 0));
test('Force exposure equals engagement', () => close(getExposure(defaultWeapon('Strength'), mode(3)), 3));
test('Finesse exposure can be enabled or ignored', () => {
  const w = clean(); close(getExposure(w, mode(3)), 0);
  w.rules.finesseIgnoresExposure = false; close(getExposure(w, mode(3)), 3);
});
test('Original only adds a die: hand calculation 47/12', () => close(getExpectedDamage(clean('original-extra-die'), mode()).expectedDamage, 47/12));
test('Original with +4 modifier: hand calculation 7.25', () => {
  const w = { ...clean('original-extra-die'), attributeModifier: 4 };
  close(getExpectedDamage(w, mode()).expectedDamage, 7.25);
});
test('Finesse modifier crit adds FULL engaged modifier but not fixed bonuses', () => {
  const w = { ...clean('finesse-extra-die-plus-modifier'), attributeModifier: 4, initialAdvantage: 1, tier: 2 };
  const r = getExpectedDamage(w, mode(1));
  close(r.breakdown!.attributeModifier, 8); close(r.breakdown!.tier, 2 * 5/6);
  close(r.expectedDamage, 20/6 + 10 * 5/6 + (3.5 + 8)/6);
});
for (const key of ['tier','perfection','imbuement','flat','onHit'] as const) {
  test('full reproc reapplies ' + key + ' on each successful impact', () => {
    const w = { ...clean(), [key]: 2 }, r = getExpectedDamage(w, mode());
    close(r.breakdown![key], 2); close(r.expectedDamage, 6); close(r.expectedImpacts, 1);
  });
}
test('full reproc uses same engaged modifier', () => {
  const w = { ...clean(), attributeModifier: 4, initialAdvantage: 2 };
  const r = getExpectedDamage(w, mode(2));
  close(r.breakdown!.attributeModifier, 12); close(r.expectedDamage, 16);
});
test('recursive full expectation: hand calculation 4 damage and 1 successful impact', () => {
  const r = getExpectedDamage(clean(), mode());
  close(r.expectedDamage, 4); close(r.expectedCrits, 1/5); close(r.expectedImpactAttempts, 1.2);
  close(r.expectedReprocAttempts, .2); close(r.expectedReprocImpacts, 1/6);
});
test('secondary 1 can miss without cancelling prior impacts', () => {
  const w = { ...clean(), tier: 2 };
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 6, probability: 1 }], reproc: [{ face: 1, probability: 1 }] });
  close(r.expectedDamage, 8); close(r.expectedImpacts, 1); close(r.expectedImpactAttempts, 2);
});
test('secondary 1 cannot miss: counts full impact', () => {
  const w = { ...clean(), tier: 2 }; w.rules.reproc.canMiss = false;
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 6, probability: 1 }], reproc: [{ face: 1, probability: 1 }] });
  close(r.expectedDamage, 11); close(r.expectedImpacts, 2);
});
test('initial and secondary distributions differ in single die mode', () => {
  const w = defaultWeapon('Finesse'), r = getExpectedDamage(w, mode());
  close(r.initialCritProbability, 1 - (5/6) ** 5); close(r.reprocCritProbability, 1/6);
  close(r.expectedReprocAttempts, (1 - (5/6) ** 5) / (5/6));
});
test('repeat original state uses cancelled net advantage', () => {
  const w = defaultWeapon('Finesse'); w.rules.reproc.rollMode = 'repeatOriginalState';
  const r = getExpectedDamage(w, mode(1));
  close(r.reprocCritProbability, 1 - (5/6) ** 3);
  close(r.expectedDamage, (r.breakdown!.weaponDice + r.breakdown!.attributeModifier + r.breakdown!.tier + r.breakdown!.perfection + r.breakdown!.imbuement));
});
test('nonrecursive full adds only one reproc attempt', () => {
  const w = clean(); w.rules.reproc.recursive = false;
  const r = getExpectedDamage(w, mode()); close(r.expectedReprocAttempts, 1/6);
  close(r.expectedDamage, 20/6 * (1 + 1/6)); close(r.expectedCrits, 1/6);
});
test('zero secondary crit means one impact in a triggered chain, not one in entire attack', () => {
  close(getExpectedChainLength(0), 1);
  const r = getExpectedDamage(clean(), mode(), { initial: [{ face: 6, probability: 1 }], reproc: [{ face: 2, probability: 1 }] });
  close(r.expectedReprocAttempts, 1); close(r.expectedImpacts, 2); close(r.expectedDamage, 8);
});
test('no initial crit means exactly one successful impact when hit is guaranteed', () => {
  const r = getExpectedDamage(clean(), mode(), { initial: [{ face: 2, probability: 1 }], reproc: [{ face: 2, probability: 1 }] });
  close(r.expectedImpacts, 1); close(r.expectedReprocAttempts, 0);
});
test('guaranteed secondary crit reports divergence without Infinity or NaN', () => {
  const r = getExpectedDamage(clean(), mode(), { reproc: [{ face: 6, probability: 1 }] });
  assert.equal(r.status, 'divergent'); assert.equal(r.expectedDamage, null);
  assert.match(r.reason!, /diverges/); assert.ok(!JSON.stringify(r).includes('Infinity'));
});
test('unreachable infinite chain is finite', () => {
  const r = getExpectedDamage(clean(), mode(), { initial: [{ face: 2, probability: 1 }], reproc: [{ face: 6, probability: 1 }] });
  assert.equal(r.status, 'finite'); close(r.expectedDamage, 2);
});
test('nonrecursive guaranteed secondary max is finite', () => {
  const w = clean(); w.rules.reproc.recursive = false;
  const r = getExpectedDamage(w, mode(), { reproc: [{ face: 6, probability: 1 }] });
  assert.equal(r.status, 'finite');
});
test('Original recursive explosion does not reapply any fixed bonus', () => {
  const w = { ...clean('original-extra-die'), tier: 3 }; w.rules.originalCritExplodes = true;
  const r = getExpectedDamage(w, mode()); close(r.expectedDamage, 20/6 + 2.5 + .7);
  close(r.breakdown!.tier, 2.5); close(r.expectedImpacts, 5/6);
});
test('negative modifier stays negative and is engaged in raw reproc mode', () => {
  const w = { ...clean(), attributeModifier: -3, initialAdvantage: 1 }; w.rules.clampSuccessfulDamage = false;
  const r = getExpectedDamage(w, mode(1)); close(r.state.effectiveModifier, -6);
  close(r.breakdown!.attributeModifier, -6); close(r.expectedDamage, -2);
});
test('clamp correction preserves signed breakdown and sum', () => {
  const w = { ...clean(), attributeModifier: -3 }, r = getExpectedDamage(w, mode());
  close(r.expectedDamage, 1.2); close(r.breakdown!.attributeModifier, -3);
  close(Object.values(r.breakdown!).reduce((s,x) => s+x, 0), r.expectedDamage!);
});
test('original clamp is AFTER bonus: negative initial impact may be rescued by crit', () => {
  const w = { ...clean('original-extra-die'), attributeModifier: -8 };
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 6, probability: 1 }] });
  close(r.expectedDamage, (0+0+1+2+3+4)/6);
});
test('negative modifier crit clamp applies to entire attack', () => {
  const w = { ...clean('finesse-extra-die-plus-modifier'), attributeModifier: -4 };
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 6, probability: 1 }] });
  close(r.expectedDamage, (0+0+1+2+3+4)/6);
});
test('exploding original clamp matches independently enumerated geometric tail', () => {
  const w = { ...clean('original-extra-die'), attributeModifier: -20 }; w.rules.originalCritExplodes = true;
  const r = getExpectedDamage(w, mode(), { initial: [{ face: 6, probability: 1 }] });
  let expected = 0;
  for (let k = 0; k < 100; k++) for (let f = 1; f < 6; f++) expected += Math.max(0, -14 + k*6 + f) / 6 ** (k+1);
  close(r.expectedDamage, expected);
});
test('crit models are independently selectable for either weapon type', () => {
  for (const model of ['original-extra-die','finesse-extra-die-plus-modifier','full-impact-reproc'] as const) {
    const w = clean(model), force = { ...w, type: 'Strength' as const };
    close(getExpectedDamage(w, mode()).expectedDamage, getExpectedDamage(force, mode()).expectedDamage!);
  }
});
test('all components sum to total across models, clamp and negative modifiers', () => {
  for (const critModel of ['original-extra-die','finesse-extra-die-plus-modifier','full-impact-reproc'] as const)
    for (const clamp of [true,false]) for (const modifier of [-10,-3,0,4]) for (const engagement of [0,2,4]) {
      const w = { ...clean(critModel), attributeModifier: modifier, onHit: 3 }; w.rules.clampSuccessfulDamage = clamp;
      const r = getExpectedDamage(w, mode(engagement));
      close(r.expectedDamage, Object.values(r.breakdown!).reduce((a,b) => a+b, 0));
      if (clamp) assert.ok(r.expectedDamage! >= -1e-10);
    }
});
test('default example recomputed against independent closed formulas', () => {
  const a = defaultWeapon('Finesse'), b = defaultWeapon('Strength');
  for (const row of compareWeapons(a,b,3)) for (const [w,r] of [[a,row.a],[b,row.b]] as const) {
    const e = row.mode.kind === 'precise' ? 0 : row.mode.engagement;
    const precise = row.mode.kind === 'precise', net = precise ? 3 : 2-e, n = 1+2*Math.abs(net), d=w.weaponDie;
    const pmf = (f:number) => net < 0 ? ((d-f+1)/d)**n - ((d-f)/d)**n : (f/d)**n - ((f-1)/d)**n;
    const bonus = 4 + (precise ? 0 : 4*(e+1));
    let expected = 0; for (let f=2;f<=d;f++) expected += pmf(f)*(f+bonus);
    if (!precise) expected += pmf(d)*(w.type === 'Finesse' ? 4+bonus : (d+1)/2);
    close(r.expectedDamage, expected);
  }
});
test('comparison, optimal engagement and table include precise separately', () => {
  const w = defaultWeapon('Finesse'), rows = generateEngagementTable(w,5);
  assert.equal(rows.length,7); assert.equal(rows[0].label,'Precise');
  const best = findOptimalEngagement(w,5);
  close(best.result.expectedDamage, Math.max(...rows.slice(1).map(x=>x.result.expectedDamage!)));
});
test('invalid inputs are rejected', () => {
  assert.throws(()=>getKeptDieDistribution(6,1.5)); assert.throws(()=>getExpectedChainLength(1.1));
  assert.throws(()=>getExpectedDamage(clean(),mode(-1)));
  assert.throws(()=>getExpectedDamage({...clean(),onHit:NaN},mode()));
  assert.throws(()=>getExpectedDamage(clean(),mode(),{reproc:[{face:2,probability:.5}]}));
});
test('seeded independent Monte Carlo agrees within five standard errors', () => {
  for (const critModel of ['original-extra-die','finesse-extra-die-plus-modifier','full-impact-reproc'] as const) {
    const w = defaultWeapon('Finesse'); w.rules.critModel = critModel;
    const exact = getExpectedDamage(w,mode(1)).expectedDamage!, mc = simulateAttacks(w,mode(1),100_000,555);
    assert.ok(Math.abs(mc.mean-exact) < 5*mc.standardError);
  }
});
test('balance sweep exports all requested combinations and rules', () => {
  const csv = generateBalanceSweep([clean()]);
  assert.equal(csv.split('\n').length, 5*7*9*7*4+1);
  assert.ok(csv.startsWith('weaponType,die,modifier'));
  assert.ok(csv.includes('reprocCanMiss'));
});
