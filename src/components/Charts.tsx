import { getExpectedDamage, type AttackResult, type WeaponConfig } from '../calculation';
import { Value } from './fields';
interface Point { x: number; a: number | null; b: number | null }
export function DamageChart({ points, names, xLabel, selected, onSelect }: { points: Point[]; names: [string,string]; xLabel: string; selected?: number; onSelect?: (x:number)=>void }) {
  const values = points.flatMap(p=>[p.a,p.b]).filter((v): v is number=>v!==null && Number.isFinite(v));
  const low = Math.min(0,...values), high = Math.max(1,...values), pad = (high-low)*.12;
  const min = low < 0 ? low-pad : 0, max = high+pad;
  const width=800,height=280,left=58,right=24,top=20,bottom=45;
  const x=(value:number)=>left+(value-points[0].x)/Math.max(1,points[points.length-1].x-points[0].x)*(width-left-right);
  const y=(value:number)=>height-bottom-(value-min)/(max-min)*(height-top-bottom);
  return <div className="chart"><div className="chart-legend"><span className="legend-a">{names[0]}</span><span className="legend-b">{names[1]}</span><span className="muted">Espérance de dégâts</span></div>
    <svg viewBox={'0 0 '+width+' '+height} role="img" aria-label={'Espérance de dégâts selon '+xLabel}>
      {Array.from({length:5},(_,i)=>min+(max-min)*i/4).map(v=><g key={v}><line className="gridline" x1={left} x2={width-right} y1={y(v)} y2={y(v)}/><text x={left-12} y={y(v)+4} textAnchor="end">{v.toFixed(1)}</text></g>)}
      {selected!==undefined&&<line className="selected-line" x1={x(selected)} x2={x(selected)} y1={top} y2={height-bottom}/>}
      {(['a','b'] as const).map(key=><g className={'curve-'+key} key={key}>
        <path d={points.reduce((path,p,i)=>p[key]===null ? path : path + (i===0||points[i-1][key]===null?' M':' L')+x(p.x)+','+y(p[key]!), '')}/>
        {points.filter(p=>p[key]!==null).map(p=><circle key={p.x} cx={x(p.x)} cy={y(p[key]!)} r={selected===p.x?6:4}
          role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined}
          aria-label={names[key==='a'?0:1]+', '+xLabel+' '+p.x+', dégâts '+p[key]}
          onClick={()=>onSelect?.(p.x)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onSelect?.(p.x);}}>
          <title>{names[key==='a'?0:1]} · {xLabel} {p.x} · {p[key]}</title></circle>)}
      </g>)}
      {points.filter((_,i)=>points.length<=16||i%Math.ceil(points.length/12)===0||i===points.length-1).map(p=><text key={p.x} x={x(p.x)} y={height-bottom+22} textAnchor="middle">{p.x}</text>)}
      <text x={width/2} y={height-4} textAnchor="middle">{xLabel}</text>
    </svg>
    {values.length<points.length*2&&<p className="warning">Les configurations non finies sont omises du tracé.</p>}
  </div>;
}
export function Heatmap({ weapon, maximum }: { weapon: WeaponConfig; maximum:number }) {
  const advantages=Array.from({length:9},(_,i)=>i-3), engagements=Array.from({length:Math.min(maximum,12)+1},(_,i)=>i);
  const rows=engagements.map(engagement=>advantages.map(initialAdvantage=>getExpectedDamage({...weapon,initialAdvantage},{kind:'engagement',engagement})));
  const finite=rows.flat().map(r=>r.expectedDamage).filter((x):x is number=>x!==null), min=Math.min(...finite), max=Math.max(...finite);
  const style=(r:AttackResult)=>({ backgroundColor: r.expectedDamage===null?'transparent':'rgba(74, 191, 184,'+(0.08+0.42*(r.expectedDamage-min)/Math.max(1e-9,max-min))+')' });
  return <div className="table-scroll"><table className="heatmap"><caption>{weapon.name} · dégâts moyens · colonnes = Avantage initial · lignes = Engagement (0–{Math.min(maximum,12)})</caption>
    <thead><tr><th>E / Av.</th>{advantages.map(a=><th key={a}>{a>0?'+':''}{a}</th>)}</tr></thead>
    <tbody>{rows.map((row,e)=><tr key={e}><th>{e}</th>{row.map((r,i)=><td key={i} style={style(r)}><Value value={r.expectedDamage}/></td>)}</tr>)}</tbody></table></div>;
}
