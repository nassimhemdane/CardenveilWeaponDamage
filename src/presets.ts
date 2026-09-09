import { getExpectedDamage, type WeaponConfig } from './calculation';
export interface Preset { id: string; name: string; weapon: WeaponConfig }
const key = 'cardenveil.weapon-presets.v1';
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
function isWeapon(x: unknown): x is WeaponConfig {
  if (!object(x) || typeof x.name !== 'string' || !object(x.rules)) return false;
  const r = x.rules;
  if (!object(r.precise) || !object(r.engagement) || !object(r.reproc)) return false;
  for (const k of ['missOnOne','critOnMax','finesseIgnoresExposure','clampSuccessfulDamage','originalCritExplodes'])
    if (typeof r[k] !== 'boolean') return false;
  if (typeof r.precise.canCrit !== 'boolean' || typeof r.reproc.recursive !== 'boolean' || typeof r.reproc.canMiss !== 'boolean') return false;
  try { getExpectedDamage(x as unknown as WeaponConfig, { kind: 'engagement', engagement: 0 }); return true; } catch { return false; }
}
export function readPresets(): Preset[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(data) ? data.filter((x: unknown): x is Preset => object(x)
      && typeof x.id === 'string' && typeof x.name === 'string' && isWeapon(x.weapon)) : [];
  } catch { return []; }
}
export function writePresets(presets: Preset[]) { localStorage.setItem(key, JSON.stringify(presets)); }
