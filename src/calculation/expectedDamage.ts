import { getAttackState, getFixedImpactBonus } from './attack';
import { getKeptDieDistribution, validateDistribution, assertInteger } from './dice';
import { expectation, getMissProbability, getCritProbability, getExpectedChainLength } from './probability';
import { getExpectedCritBonus, getClampedExplodingTotal } from './crit';
import type { AttackMode, AttackResult, DamageBreakdown, Distribution, DistributionOverrides, EngagementRow, WeaponConfig } from './types';
const emptyBreakdown = (): DamageBreakdown => ({ weaponDice: 0, attributeModifier: 0, tier: 0,
  perfection: 0, imbuement: 0, flat: 0, onHit: 0, clampAdjustment: 0 });
const sumBreakdown = (b: DamageBreakdown) => Object.values(b).reduce((a, v) => a + v, 0);
export function getExpectedBaseImpact(w: WeaponConfig, modifier: number, distribution: Distribution, canMiss: boolean): DamageBreakdown {
  const b = emptyBreakdown();
  for (const { face, probability: p } of distribution) {
    if (canMiss && face === 1) continue;
    b.weaponDice += p * face; b.attributeModifier += p * modifier;
    b.tier += p * w.tier; b.perfection += p * w.perfection;
    b.imbuement += p * w.imbuement; b.flat += p * w.flat; b.onHit += p * w.onHit;
    if (w.rules.clampSuccessfulDamage) b.clampAdjustment += p * Math.max(0, -(face + getFixedImpactBonus(w, modifier)));
  }
  return b;
}
export function getExpectedDamage(w: WeaponConfig, mode: AttackMode, overrides: DistributionOverrides = {}): AttackResult {
  const state = getAttackState(w, mode);
  const initial = overrides.initial ?? getKeptDieDistribution(w.weaponDie, state.netAdvantage, w.rules.advantageDicePerLevel);
  const secondary = overrides.reproc ?? getKeptDieDistribution(w.weaponDie,
    w.rules.reproc.rollMode === 'singleDie' ? 0 : state.netAdvantage, w.rules.advantageDicePerLevel);
  validateDistribution(initial, w.weaponDie); validateDistribution(secondary, w.weaponDie);
  const miss = getMissProbability(initial, w.rules.missOnOne);
  const p = getCritProbability(initial, w.weaponDie, state.canCrit);
  const full = w.rules.critModel === 'full-impact-reproc';
  const secondaryMiss = full ? getMissProbability(secondary, w.rules.reproc.canMiss) : 0;
  const q = full ? getCritProbability(secondary, w.weaponDie, state.canCrit) : state.canCrit ? 1 / w.weaponDie : 0;
  const recursive = full ? w.rules.reproc.recursive
    : w.rules.critModel === 'original-extra-die' && w.rules.originalCritExplodes;
  const length = getExpectedChainLength(q, recursive);
  const common = { state, initialDistribution: initial,
    reprocDistribution: full ? secondary : getKeptDieDistribution(w.weaponDie, 0),
    missProbability: miss, initialCritProbability: p,
    reprocMissProbability: secondaryMiss, reprocCritProbability: q,
    probabilityAtLeastOneReproc: full ? p : 0 };
  const divergent = (reason: string): AttackResult => ({ ...common, status: 'divergent', reason,
    expectedDamage: null, breakdown: null, expectedCrits: null, expectedImpacts: null,
    expectedReprocImpacts: null, expectedImpactAttempts: null, expectedReprocAttempts: null,
    expectedReprocChainLength: null });
  // A guaranteed secondary crit is only reachable when the initial attack can trigger it.
  if (p > 0 && length === null) return divergent('Expected damage diverges: non-terminating critical chain');
  const extraAttempts = p === 0 ? 0 : p * (length ?? 0);
  let b = getExpectedBaseImpact(w, state.effectiveModifier, initial, w.rules.missOnOne);
  if (full) {
    const extra = getExpectedBaseImpact(w, state.effectiveModifier, secondary, w.rules.reproc.canMiss);
    for (const key of Object.keys(b) as (keyof DamageBreakdown)[]) b[key] += extraAttempts * extra[key];
  } else if (p > 0) {
    const model = w.rules.critModel;
    if (model === 'full-impact-reproc') throw new Error('Unreachable model');
    const extraMean = getExpectedCritBonus(w.weaponDie, model, state.effectiveModifier, recursive);
    const extraMod = model === 'finesse-extra-die-plus-modifier' ? state.effectiveModifier : 0;
    b.weaponDice += p * (extraMean - extraMod);
    b.attributeModifier += p * extraMod;
    if (w.rules.clampSuccessfulDamage) {
      const offset = w.weaponDie + getFixedImpactBonus(w, state.effectiveModifier);
      const clampedTotal = recursive ? getClampedExplodingTotal(offset, w.weaponDie)
        : expectation(getKeptDieDistribution(w.weaponDie, 0), face => Math.max(0, offset + face + extraMod));
      // Replace the initial-only correction on the critical branch with a whole-attack correction.
      b.clampAdjustment += p * (clampedTotal - (offset + extraMean) - Math.max(0, -offset));
    }
  }
  // Suppress only roundoff in the correction; never clamp a modifier or raw damage component.
  if (Math.abs(b.clampAdjustment) < 1e-12) b.clampAdjustment = 0;
  const damage = sumBreakdown(b);
  if (!Number.isFinite(damage) || Object.values(b).some(v => !Number.isFinite(v)))
    return divergent('Numerical range exceeded; reduce the magnitude of the parameters');
  return { ...common, status: 'finite', breakdown: b, expectedDamage: damage,
    expectedCrits: p + (recursive ? extraAttempts * q : 0),
    expectedImpacts: 1 - miss + (full ? extraAttempts * (1 - secondaryMiss) : 0),
    expectedReprocImpacts: full ? extraAttempts * (1 - secondaryMiss) : 0,
    expectedImpactAttempts: 1 + (full ? extraAttempts : 0),
    expectedReprocAttempts: full ? extraAttempts : 0,
    expectedReprocChainLength: p === 0 ? 0 : length };
}
export const getExpectedImpacts = (w: WeaponConfig, mode: AttackMode) => getExpectedDamage(w, mode).expectedImpacts;
export function generateEngagementTable(w: WeaponConfig, maximum = 5): EngagementRow[] {
  assertInteger(maximum, 'Maximum engagement', 0);
  const modes: AttackMode[] = [{ kind: 'precise' }, ...Array.from({ length: maximum + 1 },
    (_, engagement): AttackMode => ({ kind: 'engagement', engagement }))];
  return modes.map(mode => ({ mode, label: mode.kind === 'precise' ? 'Precise' : 'Engagement ' + mode.engagement,
    result: getExpectedDamage(w, mode) }));
}
export function compareWeapons(a: WeaponConfig, b: WeaponConfig, maximum = 5) {
  const left = generateEngagementTable(a, maximum), right = generateEngagementTable(b, maximum);
  return left.map((row, i) => ({ label: row.label, mode: row.mode, a: row.result, b: right[i].result }));
}
export function findOptimalEngagement(w: WeaponConfig, maximum: number): EngagementRow {
  const rows = generateEngagementTable(w, maximum).slice(1).filter(x => x.result.status === 'finite');
  if (!rows.length) throw new RangeError('No finite engagement in range');
  return rows.reduce((best, row) => (row.result.expectedDamage ?? -Infinity) > (best.result.expectedDamage ?? -Infinity) ? row : best);
}
