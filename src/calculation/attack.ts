import { assertInteger, getDiceRolled } from './dice';
import { DICE, type AttackMode, type WeaponConfig, type AttackState } from './types';
export function validateWeapon(w: WeaponConfig) {
  if (!DICE.includes(w.weaponDie)) throw new RangeError('Unsupported weapon die');
  if (!['Strength', 'Finesse'].includes(w.type)) throw new RangeError('Unsupported weapon type');
  if (!['original-extra-die', 'finesse-extra-die-plus-modifier', 'full-impact-reproc'].includes(w.rules.critModel))
    throw new RangeError('Unsupported critical model');
  if (!['singleDie', 'repeatOriginalState'].includes(w.rules.reproc.rollMode)) throw new RangeError('Unsupported reproc roll');
  for (const v of [w.attributeModifier, w.tier, w.perfection, w.imbuement, w.flat, w.onHit,
    w.rules.precise.attributeMultiplier, w.rules.precise.exposure, w.rules.engagement.modifierMultiplierBase])
    if (!Number.isFinite(v)) throw new RangeError('Numeric inputs must be finite');
  assertInteger(w.initialAdvantage, 'Initial advantage');
  assertInteger(w.rules.precise.advantageBonus, 'Precise advantage');
  assertInteger(w.rules.engagement.disadvantagePerLevel, 'Engagement disadvantage', 0);
  getDiceRolled(0, w.rules.advantageDicePerLevel);
}
export function getEffectiveModifier(w: WeaponConfig, mode: AttackMode) {
  return w.attributeModifier * (mode.kind === 'precise' ? w.rules.precise.attributeMultiplier
    : mode.engagement + w.rules.engagement.modifierMultiplierBase);
}
export function getNetAdvantage(w: WeaponConfig, mode: AttackMode) {
  return w.initialAdvantage + (mode.kind === 'precise' ? w.rules.precise.advantageBonus
    : -mode.engagement * w.rules.engagement.disadvantagePerLevel);
}
export function getExposure(w: WeaponConfig, mode: AttackMode) {
  return mode.kind === 'precise' ? w.rules.precise.exposure
    : w.type === 'Finesse' && w.rules.finesseIgnoresExposure ? 0 : mode.engagement;
}
export function getAttackState(w: WeaponConfig, mode: AttackMode): AttackState {
  validateWeapon(w);
  if (mode.kind === 'engagement') assertInteger(mode.engagement, 'Engagement', 0);
  const netAdvantage = getNetAdvantage(w, mode);
  getDiceRolled(netAdvantage, w.rules.advantageDicePerLevel);
  return { netAdvantage, effectiveModifier: getEffectiveModifier(w, mode), exposure: getExposure(w, mode),
    canCrit: w.rules.critOnMax && (mode.kind !== 'precise' || w.rules.precise.canCrit) };
}
export const getFixedImpactBonus = (w: WeaponConfig, effectiveModifier: number) =>
  effectiveModifier + w.tier + w.perfection + w.imbuement + w.flat + w.onHit;
