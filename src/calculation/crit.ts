import { getExpectedChainLength } from './probability';
export function getExpectedCritBonus(die: number, model: 'original-extra-die' | 'finesse-extra-die-plus-modifier',
  effectiveModifier: number, explodes: boolean) {
  const mean = (die + 1) / 2;
  return model === 'finesse-extra-die-plus-modifier' ? mean + effectiveModifier : mean * (explodes ? die / (die - 1) : 1);
}
export function getExpectedReprocDamage(impactMean: number, critProbability: number, recursive: boolean): number | null {
  const length = getExpectedChainLength(critProbability, recursive);
  return length === null ? null : impactMean * length;
}
// Exact E[max(0, offset + exploding die)]. All extra dice are uniform and cannot miss.
// Terminal face r < die follows k maxima: P(k,r) = (1/die)^(k+1).
export function getClampedExplodingTotal(offset: number, die: number) {
  const q = 1 / die;
  let total = 0;
  for (let r = 1; r < die; r++) {
    const first = Math.max(0, Math.ceil((-offset - r) / die));
    const probability = q ** (first + 1);
    total += probability * ((offset + r + die * first) / (1 - q) + die * q / (1 - q) ** 2);
  }
  return total;
}
