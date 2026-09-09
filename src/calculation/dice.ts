import type { Distribution } from './types';
export function assertInteger(value: number, name: string, minimum = -Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(name + ' must be a safe integer >= ' + minimum);
}
export function getDiceRolled(netAdvantage: number, perLevel = 2): number {
  assertInteger(netAdvantage, 'Net advantage'); assertInteger(perLevel, 'Dice per level', 1);
  const count = 1 + perLevel * Math.abs(netAdvantage);
  assertInteger(count, 'Dice rolled', 1);
  return count;
}
// a^n - b^n, evaluated without catastrophic cancellation when a and b are close.
function powerDifference(a: number, b: number, n: number) {
  if (b === 0) return a ** n;
  return Math.exp(n * Math.log(a)) * -Math.expm1(n * Math.log(b / a));
}
export function getKeptDieDistribution(die: number, netAdvantage: number, perLevel = 2): Distribution {
  assertInteger(die, 'Die', 2);
  const n = getDiceRolled(netAdvantage, perLevel);
  return Array.from({ length: die }, (_, i) => {
    const face = i + 1;
    return { face, probability: netAdvantage < 0
      ? powerDifference((die - face + 1) / die, (die - face) / die, n)
      : powerDifference(face / die, (face - 1) / die, n) };
  });
}
export function validateDistribution(distribution: Distribution, die: number) {
  const faces = new Set<number>();
  let sum = 0;
  for (const { face, probability } of distribution) {
    assertInteger(face, 'Face', 1);
    if (face > die || faces.has(face) || !Number.isFinite(probability) || probability < 0 || probability > 1)
      throw new RangeError('Invalid distribution');
    faces.add(face); sum += probability;
  }
  if (Math.abs(sum - 1) > 1e-10) throw new RangeError('Distribution must sum to 1');
}
