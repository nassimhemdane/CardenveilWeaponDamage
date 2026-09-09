export const DICE = [4, 6, 8, 10, 12] as const;
export type WeaponDie = typeof DICE[number];
export type WeaponType = 'Strength' | 'Finesse';
export type CritModel = 'original-extra-die' | 'finesse-extra-die-plus-modifier' | 'full-impact-reproc';
export type AttackMode = { kind: 'engagement'; engagement: number } | { kind: 'precise' };
export interface AttackRules {
  missOnOne: boolean;
  critOnMax: boolean;
  advantageDicePerLevel: number;
  finesseIgnoresExposure: boolean;
  clampSuccessfulDamage: boolean;
  precise: { advantageBonus: number; attributeMultiplier: number; canCrit: boolean; exposure: number };
  engagement: { disadvantagePerLevel: number; modifierMultiplierBase: number };
  critModel: CritModel;
  originalCritExplodes: boolean;
  reproc: { recursive: boolean; canMiss: boolean; rollMode: 'singleDie' | 'repeatOriginalState' };
}
export interface WeaponConfig {
  name: string; type: WeaponType; weaponDie: WeaponDie; attributeModifier: number;
  initialAdvantage: number; tier: number; perfection: number; imbuement: number;
  flat: number; onHit: number; rules: AttackRules;
}
export interface DieOutcome { face: number; probability: number }
export type Distribution = readonly DieOutcome[];
export interface DistributionOverrides { initial?: Distribution; reproc?: Distribution }
export interface DamageBreakdown {
  weaponDice: number; attributeModifier: number; tier: number; perfection: number;
  imbuement: number; flat: number; onHit: number; clampAdjustment: number;
}
export interface AttackState { netAdvantage: number; effectiveModifier: number; exposure: number; canCrit: boolean }
export interface AttackResult {
  status: 'finite' | 'divergent';
  reason?: string;
  state: AttackState;
  initialDistribution: Distribution; reprocDistribution: Distribution;
  missProbability: number; initialCritProbability: number;
  reprocMissProbability: number; reprocCritProbability: number;
  probabilityAtLeastOneReproc: number;
  expectedCrits: number | null; expectedImpacts: number | null;
  expectedReprocImpacts: number | null; expectedImpactAttempts: number | null;
  expectedReprocAttempts: number | null; expectedReprocChainLength: number | null;
  expectedDamage: number | null; breakdown: DamageBreakdown | null;
}
export interface EngagementRow { mode: AttackMode; label: string; result: AttackResult }
export const defaultRules = (type: WeaponType): AttackRules => ({
  missOnOne: true, critOnMax: true, advantageDicePerLevel: 2,
  finesseIgnoresExposure: true, clampSuccessfulDamage: true,
  precise: { advantageBonus: 1, attributeMultiplier: 0, canCrit: false, exposure: 0 },
  engagement: { disadvantagePerLevel: 1, modifierMultiplierBase: 1 },
  critModel: type === 'Finesse' ? 'full-impact-reproc' : 'original-extra-die',
  originalCritExplodes: false,
  reproc: { recursive: true, canMiss: true, rollMode: 'singleDie' },
});
export const defaultWeapon = (type: WeaponType): WeaponConfig => ({
  name: type === 'Finesse' ? 'Finesse d6' : 'Force d12', type,
  weaponDie: type === 'Finesse' ? 6 : 12, attributeModifier: 4, initialAdvantage: 2,
  tier: 2, perfection: 1, imbuement: 1, flat: 0, onHit: 0, rules: defaultRules(type),
});
