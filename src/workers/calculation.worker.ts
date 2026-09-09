/// <reference lib="webworker" />
import { getExpectedDamage, getDiceRolled, simulateAttacks, generateBalanceSweep, type WeaponConfig, type AttackMode } from '../calculation';
export type WorkerRequest = { kind: 'monteCarlo'; weapons: WeaponConfig[]; mode: AttackMode; samples: number }
  | { kind: 'sweep'; weapons: WeaponConfig[] };
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const request = event.data;
    if (request.kind === 'sweep') { self.postMessage({ kind: 'sweep', csv: generateBalanceSweep(request.weapons) }); return; }
    const results = request.weapons.map((w,i) => {
      const exact = getExpectedDamage(w, request.mode);
      const cost = request.samples * getDiceRolled(exact.state.netAdvantage,w.rules.advantageDicePerLevel) * (1+(exact.expectedReprocAttempts ?? 0));
      if (exact.status !== 'finite' || cost > 200_000_000) throw new Error('Simulation trop coûteuse pour cette chaîne. Le calcul analytique reste disponible.');
      return { name: w.name, exact: exact.expectedDamage, ...simulateAttacks(w,request.mode,request.samples,12345+i) };
    });
    self.postMessage({ kind: 'monteCarlo', results });
  } catch (error) { self.postMessage({ kind: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
