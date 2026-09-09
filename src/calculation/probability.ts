import type { Distribution } from './types';
export const getFaceProbability = (d: Distribution, face: number) => d.find(x => x.face === face)?.probability ?? 0;
export const getMissProbability = (d: Distribution, enabled = true) => enabled ? getFaceProbability(d, 1) : 0;
export const getCritProbability = (d: Distribution, die: number, enabled = true) => enabled ? getFaceProbability(d, die) : 0;
export const expectation = (d: Distribution, value: (face: number) => number) =>
  d.reduce((sum, x) => sum + x.probability * value(x.face), 0);
export function getExpectedChainLength(critProbability: number, recursive = true): number | null {
  if (!Number.isFinite(critProbability) || critProbability < 0 || critProbability > 1) throw new RangeError('Invalid crit probability');
  return recursive ? (critProbability === 1 ? null : 1 / (1 - critProbability)) : 1;
}
