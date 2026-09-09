import { getExpectedDamage } from './expectedDamage';
import { DICE, type WeaponConfig } from './types';
export function generateBalanceSweep(weapons: readonly WeaponConfig[]): string {
  const columns = ['weaponType','die','modifier','initialAdvantage','engagement','netAdvantage','tier',
    'perfection','imbuement','flat','onHit','critModel','expectedDamage','missProbability',
    'initialCritProbability','expectedCrits','expectedImpacts','exposure','recursive','reprocCanMiss',
    'reprocRollMode','originalCritExplodes','clampSuccessfulDamage','finesseIgnoresExposure','status'];
  const rows = [columns.join(',')];
  for (const base of weapons) for (const weaponDie of DICE) for (let modifier = 0; modifier <= 6; modifier++)
    for (let initialAdvantage = -3; initialAdvantage <= 5; initialAdvantage++)
      for (let engagement = 0; engagement <= 6; engagement++) for (let tier = 0; tier <= 3; tier++) {
        const w = { ...base, weaponDie, attributeModifier: modifier, initialAdvantage, tier };
        const r = getExpectedDamage(w, { kind: 'engagement', engagement });
        rows.push([w.type,weaponDie,modifier,initialAdvantage,engagement,r.state.netAdvantage,tier,
          w.perfection,w.imbuement,w.flat,w.onHit,w.rules.critModel,r.expectedDamage ?? 'DIVERGENT',
          r.missProbability,r.initialCritProbability,r.expectedCrits ?? '',r.expectedImpacts ?? '',
          r.state.exposure,w.rules.reproc.recursive,w.rules.reproc.canMiss,w.rules.reproc.rollMode,
          w.rules.originalCritExplodes,w.rules.clampSuccessfulDamage,w.rules.finesseIgnoresExposure,r.status].join(','));
      }
  return rows.join('\n');
}
