import { getDiceRolled, type AttackResult, type WeaponConfig } from '../calculation';
import { Value } from './fields';
export function DamageDetails({ w, result: r, side }: { w:WeaponConfig; result:AttackResult; side:'A'|'B' }) {
  const full=w.rules.critModel==='full-impact-reproc';
  const breakdown=r.breakdown;
  return <section className={'detail-card side-'+side.toLowerCase()} aria-label={'Détails Weapon '+side}>
    <div className="detail-title"><span className="side-badge">{side}</span><h3>{w.name}</h3></div>
    {r.status==='divergent'?<p className="warning" role="status">{r.reason}</p>:<>
      <div className="detail-total"><Value value={r.expectedDamage} digits={4}/><span>dégâts / attaque</span></div>
      <dl className="breakdown">{breakdown&&Object.entries(breakdown).map(([key,value])=><div key={key}><dt>{({
        weaponDice:'Dés d’arme',attributeModifier:'Modificateur',tier:'Tier',perfection:'Perfection',imbuement:'Imprégnation',
        flat:'Bonus fixe',onHit:'On Hit',clampAdjustment:'Ajustement du plancher'
      } as Record<string,string>)[key]}</dt><dd><Value value={value} digits={4}/></dd></div>)}</dl>
      <dl className="stats-list">
        <div><dt>P(miss initial)</dt><dd><Value value={r.missProbability} percent digits={4}/></dd></div>
        <div><dt>P(crit initial)</dt><dd><Value value={r.initialCritProbability} percent digits={4}/></dd></div>
        <div><dt>P(au moins un reproc)</dt><dd><Value value={r.probabilityAtLeastOneReproc} percent digits={4}/></dd></div>
        <div><dt>Critiques déclencheurs moyens</dt><dd><Value value={r.expectedCrits} digits={4}/></dd></div>
        <div><dt>Impacts réussis moyens</dt><dd><Value value={r.expectedImpacts} digits={4}/></dd></div>
        <div><dt>Dont impacts reproc réussis</dt><dd><Value value={r.expectedReprocImpacts} digits={4}/></dd></div>
        <div><dt>Tentatives d’impact (miss inclus)</dt><dd><Value value={r.expectedImpactAttempts} digits={4}/></dd></div>
        <div><dt>Dont tentatives reproc</dt><dd><Value value={r.expectedReprocAttempts} digits={4}/></dd></div>
      </dl>
    </>}
    <details className="probability"><summary>Probability Details</summary>
      <dl className="stats-list"><div><dt>Dé / avantage net</dt><dd>d{w.weaponDie} / {r.state.netAdvantage}</dd></div>
        <div><dt>Dés lancés / garde</dt><dd>{getDiceRolled(r.state.netAdvantage,w.rules.advantageDicePerLevel)} / {r.state.netAdvantage<0?'Lowest':'Highest'}</dd></div>
        <div><dt>Modificateur effectif</dt><dd><Value value={r.state.effectiveModifier} digits={4}/></dd></div>
        <div><dt>Exposition</dt><dd>{r.state.exposure}</dd></div>
      </dl>
      <table className="probability-table"><thead><tr><th>Face</th><th>Initial</th><th>{full?'Reproc':'Dé critique'}</th></tr></thead><tbody>{r.initialDistribution.map(x=><tr key={x.face}>
        <th>{x.face}</th><td><Value value={x.probability} percent digits={4}/></td>
        <td><Value value={r.reprocDistribution.find(y=>y.face===x.face)?.probability??0} percent digits={4}/></td></tr>)}</tbody></table>
      <dl className="stats-list"><div><dt>État secondaire</dt><dd>{full&&w.rules.reproc.rollMode==='repeatOriginalState'?'Même avantage net':'Dé simple'}</dd></div>
        <div><dt>P(miss secondaire)</dt><dd><Value value={r.reprocMissProbability} percent digits={4}/></dd></div>
        <div><dt>P(max secondaire éligible)</dt><dd><Value value={r.reprocCritProbability} percent digits={4}/></dd></div>
        <div><dt>Longueur de chaîne si déclenchée</dt><dd><Value value={r.expectedReprocChainLength} digits={4}/></dd></div>
      </dl><p className="muted">Le maximum d’un dé n’est pas un critique en mode Precise. Un maximum secondaire ne prolonge la chaîne que si la récursion est active.</p>
      <details><summary>JSON — pleine précision</summary><pre>{JSON.stringify(r,null,2)}</pre></details>
    </details>
  </section>;
}
