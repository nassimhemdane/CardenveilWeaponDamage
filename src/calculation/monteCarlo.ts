import { getAttackState, getFixedImpactBonus } from './attack';
import { getDiceRolled, assertInteger } from './dice';
import type { AttackMode, WeaponConfig } from './types';
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6d2b79f5; let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function roll(die: number, advantage: number, perLevel: number, random: () => number) {
  const count = getDiceRolled(advantage, perLevel);
  let kept = advantage < 0 ? die : 1;
  for (let i = 0; i < count; i++) {
    const value = 1 + Math.floor(random() * die);
    kept = advantage < 0 ? Math.min(kept, value) : Math.max(kept, value);
  }
  return kept;
}
export interface MonteCarloResult { samples: number; mean: number; standardError: number; confidence95: [number, number] }
export function simulateAttacks(w: WeaponConfig, mode: AttackMode, samples = 1_000_000, seed = 20260908): MonteCarloResult {
  assertInteger(samples, 'Samples', 2);
  const state = getAttackState(w, mode), random = seededRandom(seed), d = w.weaponDie;
  const bonus = getFixedImpactBonus(w, state.effectiveModifier);
  const clamp = (x: number) => w.rules.clampSuccessfulDamage ? Math.max(0, x) : x;
  let mean = 0, m2 = 0;
  for (let i = 1; i <= samples; i++) {
    const first = roll(d, state.netAdvantage, w.rules.advantageDicePerLevel, random);
    let damage = 0;
    if (!(w.rules.missOnOne && first === 1)) {
      damage = first + bonus;
      if (w.rules.critModel === 'full-impact-reproc') {
        damage = clamp(damage);
        let crit = state.canCrit && first === d;
        while (crit) {
          const face = roll(d, w.rules.reproc.rollMode === 'singleDie' ? 0 : state.netAdvantage,
            w.rules.advantageDicePerLevel, random);
          if (!(w.rules.reproc.canMiss && face === 1)) damage += clamp(face + bonus);
          crit = w.rules.reproc.recursive && face === d;
        }
      } else {
        if (state.canCrit && first === d) {
          let more = true;
          while (more) {
            const face = roll(d, 0, w.rules.advantageDicePerLevel, random);
            damage += face;
            if (w.rules.critModel === 'finesse-extra-die-plus-modifier') damage += state.effectiveModifier;
            more = w.rules.critModel === 'original-extra-die' && w.rules.originalCritExplodes && face === d;
          }
        }
        damage = clamp(damage);
      }
    }
    const delta = damage - mean; mean += delta / i; m2 += delta * (damage - mean);
  }
  const standardError = Math.sqrt(m2 / (samples - 1) / samples);
  return { samples, mean, standardError, confidence95: [mean - 1.96 * standardError, mean + 1.96 * standardError] };
}
