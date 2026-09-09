import type { AttackMode, AttackResult } from '../calculation';
import { Value } from './fields';
interface Row { label:string; mode:AttackMode; a:AttackResult; b:AttackResult }
function Metrics({ r, best, bestCrit }: { r:AttackResult; best:boolean; bestCrit:boolean }) {
  return <><td className={best?'best':''}><Value value={r.expectedDamage}/>{best&&<span className="best-label">MAX EV</span>}</td>
    <td className={r.missProbability>=.25?'danger':''}><Value value={r.missProbability} percent/></td>
    <td className={bestCrit?'crit-best':''}><Value value={r.initialCritProbability} percent/></td>
    <td><Value value={r.expectedCrits}/></td><td><Value value={r.expectedImpacts}/></td>
    <td className={r.state.exposure>0?'exposure':''}>{r.state.exposure}</td></>;
}
export function ComparisonTable({ rows, names, selected, onSelect }: { rows:Row[]; names:[string,string]; selected:string; onSelect:(mode:AttackMode)=>void }) {
  const best=(side:'a'|'b')=>Math.max(...rows.map(r=>r[side].expectedDamage??-Infinity));
  const crit=(side:'a'|'b')=>Math.max(...rows.map(r=>r[side].initialCritProbability));
  return <div className="table-scroll"><table className="comparison-table"><thead><tr><th rowSpan={2}>Attack mode</th><th rowSpan={2}>Av. net<br/>A / B</th>
    <th rowSpan={2}>Mod. effectif<br/>A / B</th><th className="group-a" colSpan={6}>A · {names[0]}</th><th className="group-b" colSpan={6}>B · {names[1]}</th></tr>
    <tr>{[0,1].map(i=>['Dégâts EV','Miss %','Crit initial %','Crits moy.','Impacts réussis','Exposition'].map((title,j)=><th key={i+'-'+j}>{title}</th>))}</tr></thead>
    <tbody>{rows.map(row=><tr key={row.label} className={row.label===selected?'selected-row':''}><th><button className="row-button" aria-pressed={row.label===selected} onClick={()=>onSelect(row.mode)}>{row.label}</button></th>
      <td>{row.a.state.netAdvantage} / {row.b.state.netAdvantage}</td><td><Value value={row.a.state.effectiveModifier} digits={2}/> / <Value value={row.b.state.effectiveModifier} digits={2}/></td>
      <Metrics r={row.a} best={row.a.expectedDamage===best('a')} bestCrit={row.a.initialCritProbability>0&&row.a.initialCritProbability===crit('a')}/>
      <Metrics r={row.b} best={row.b.expectedDamage===best('b')} bestCrit={row.b.initialCritProbability>0&&row.b.initialCritProbability===crit('b')}/></tr>)}</tbody></table></div>;
}
