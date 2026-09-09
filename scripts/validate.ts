import { mkdirSync, writeFileSync } from 'node:fs';
import { defaultWeapon, compareWeapons, getExpectedDamage, simulateAttacks, type WeaponConfig, type AttackMode } from '../src/calculation/index';
const a = defaultWeapon('Finesse'), b = defaultWeapon('Strength');
const example = compareWeapons(a, b, 5).map(row => ({ mode: row.label,
  finesse: row.a.expectedDamage, strength: row.b.expectedDamage,
  finesseMiss: row.a.missProbability, strengthMiss: row.b.missProbability,
  finesseImpacts: row.a.expectedImpacts, strengthImpacts: row.b.expectedImpacts }));
console.table(example);
const cases: { name: string; w: WeaponConfig; mode: AttackMode }[] = [
  { name: 'Finesse default E0', w: a, mode: { kind: 'engagement', engagement: 0 } },
  { name: 'Finesse default E2', w: a, mode: { kind: 'engagement', engagement: 2 } },
  { name: 'Strength default E1', w: b, mode: { kind: 'engagement', engagement: 1 } },
  { name: 'Finesse precise', w: a, mode: { kind: 'precise' } },
  { name: 'Negative advantage / modifier, raw', w: { ...a, attributeModifier: -3, initialAdvantage: -2,
    rules: { ...a.rules, clampSuccessfulDamage: false } }, mode: { kind: 'engagement', engagement: 1 } },
  { name: 'Repeat state, On Hit +3', w: { ...a, onHit: 3, rules: { ...a.rules,
    reproc: { recursive: true, canMiss: false, rollMode: 'repeatOriginalState' } } }, mode: { kind: 'engagement', engagement: 0 } },
  { name: 'Exploding original, negative clamped', w: { ...b, attributeModifier: -10, tier: 0,
    perfection: 0, imbuement: 0, rules: { ...b.rules, originalCritExplodes: true } }, mode: { kind: 'engagement', engagement: 1 } },
  { name: 'Modifier crit, negative clamped', w: { ...a, attributeModifier: -3, tier: 0,
    perfection: 0, imbuement: 0, rules: { ...a.rules, critModel: 'finesse-extra-die-plus-modifier' } }, mode: { kind: 'engagement', engagement: 0 } },
];
const validation = cases.map(({ name, w, mode }, index) => {
  const exact = getExpectedDamage(w, mode).expectedDamage!;
  const mc = simulateAttacks(w, mode, 1_000_000, 6100 + index);
  const difference = mc.mean - exact;
  return { name, exact, monteCarlo: mc.mean, difference, standardError: mc.standardError,
    zScore: mc.standardError === 0 ? 0 : difference / mc.standardError,
    passed: Math.abs(difference) <= 5 * mc.standardError + 1e-10 };
});
console.table(validation);
mkdirSync('reports', { recursive: true });
writeFileSync('reports/validation.json', JSON.stringify({ samplesPerCase: 1_000_000, example, validation }, null, 2));
if (validation.some(x => !x.passed)) process.exitCode = 1;
