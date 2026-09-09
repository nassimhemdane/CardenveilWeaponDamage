import { useMemo, useRef, useState } from 'react';
import { compareWeapons, defaultWeapon, getExpectedDamage, type AttackMode, type WeaponConfig } from './calculation';
import { WeaponEditor } from './components/WeaponEditor';
import { NumericField, Value } from './components/fields';
import { ComparisonTable } from './components/ComparisonTable';
import { DamageChart, Heatmap } from './components/Charts';
import { DamageDetails } from './components/Details';
import { BalanceSweep, Validation, downloadFile } from './components/Validation';
import { readPresets, writePresets, type Preset } from './presets';
const labelFor = (mode:AttackMode) => mode.kind==='precise'?'Precise':'Engagement '+mode.engagement;
export default function App() {
  const [a,setA]=useState(()=>defaultWeapon('Finesse')),[b,setB]=useState(()=>defaultWeapon('Strength'));
  const [maximum,setMaximum]=useState(5),[mode,setMode]=useState<AttackMode>({kind:'engagement',engagement:1});
  const [presets,setPresets]=useState<Preset[]>(readPresets),[notice,setNotice]=useState('');
  const [chartMode,setChartMode]=useState<'engagement'|'advantage'>('engagement'),[heatmapWeapon,setHeatmapWeapon]=useState<'A'|'B'>('A');
  const comparisonRef=useRef<HTMLElement>(null);
  const calculation=useMemo(()=>{
    try { return { rows:compareWeapons(a,b,maximum), error:null }; }
    catch(error){return {rows:[],error:error instanceof Error?error.message:String(error)};}
  },[a,b,maximum]);
  const rows=calculation.rows,selected=rows.find(r=>r.label===labelFor(mode)),names:[string,string]=[a.name,b.name];
  const optimum=(side:'a'|'b')=>rows.filter(r=>r.mode.kind==='engagement'&&r[side].expectedDamage!==null)
    .reduce<typeof rows[number]|undefined>((best,row)=>!best||row[side].expectedDamage!>best[side].expectedDamage!?row:best,undefined);
  const bestA=optimum('a'),bestB=optimum('b');
  const points=useMemo(()=>chartMode==='engagement'?rows.slice(1).map(row=>({x:row.mode.kind==='engagement'?row.mode.engagement:0,a:row.a.expectedDamage,b:row.b.expectedDamage}))
    :Array.from({length:11},(_,i)=>({x:i-5,a:getExpectedDamage({...a,initialAdvantage:i-5},mode).expectedDamage,b:getExpectedDamage({...b,initialAdvantage:i-5},mode).expectedDamage})),[chartMode,rows,a,b,mode]);
  function persist(next:Preset[]) { try {writePresets(next);setPresets(next);setNotice('Presets sauvegardés sur ce navigateur.');}catch{setNotice('Stockage local indisponible ou plein. Le preset n’a pas été sauvegardé.');} }
  function save(name:string,weapon:WeaponConfig){persist([...presets,{id:crypto.randomUUID(),name,weapon:structuredClone(weapon)}]);}
  function exportComparison() {
    const csv=[['mode','weapon','netAdvantage','effectiveModifier','exposure','missProbability','initialCritProbability','expectedCrits','expectedImpacts','expectedDamage'],
      ...rows.flatMap(row=>(['a','b'] as const).map(side=>{const r=row[side];return [row.label,side==='a'?a.name:b.name,r.state.netAdvantage,r.state.effectiveModifier,
        r.state.exposure,r.missProbability,r.initialCritProbability,r.expectedCrits,r.expectedImpacts,r.expectedDamage??'DIVERGENT'];}))]
      .map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
    downloadFile('cardenveil-comparison.csv',csv);
  }
  return <main>
    <header className="masthead"><a className="brand" href="#" aria-label="Cardenveil accueil"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 36 11v18L20 38 4 29V11Z"/><path d="m12 13 16 14m0-14L12 27"/></svg><span>CARDENVEIL<span className="brand-sub">BALANCE LAB</span></span></a>
      <div className="header-status"><span/> Moteur analytique · local</div></header>
    <div className="intro"><div><span className="eyebrow">ARMES · PROBABILITÉS · ÉQUILIBRAGE</span><h1>Weapon Calculator<span>.</span></h1>
      <p>Mesurez ce que vaut chaque choix. Comparez les dégâts, le risque et les chaînes de critiques.</p></div>
      <span className="version">EXACT EV<br/><small>sans simulation principale</small></span></div>
    <div className="weapon-grid">
      <WeaponEditor side="A" weapon={a} onChange={setA} presets={presets} onSave={save} onDelete={id=>persist(presets.filter(p=>p.id!==id))}/>
      <WeaponEditor side="B" weapon={b} onChange={setB} presets={presets} onSave={save} onDelete={id=>persist(presets.filter(p=>p.id!==id))}/>
    </div>
    {notice&&<p className="notice" role="status">{notice}</p>}
    <div className="compare-controls"><div><span className="live-dot"/> Comparaison recalculée à chaque modification</div>
      <NumericField label="Engagement maximum" value={maximum} integer min={0} max={50} onChange={v=>{setMaximum(v);if(mode.kind==='engagement'&&mode.engagement>v)setMode({kind:'engagement',engagement:v});}}/>
      <button className="primary" onClick={()=>comparisonRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>Comparer les armes ↓</button>
      <button className="quiet" onClick={()=>{setA(defaultWeapon('Finesse'));setB(defaultWeapon('Strength'));setMaximum(5);setMode({kind:'engagement',engagement:1});}}>Réinitialiser</button>
    </div>
    {calculation.error&&<p className="warning" role="alert">{calculation.error}</p>}
    <section ref={comparisonRef} className="results-section" aria-label="Résultats">
      <div className="section-heading"><div><span className="eyebrow">01 / COMPARAISON</span><h2>La valeur de l’Engagement</h2></div><button onClick={exportComparison}>Exporter le tableau ↗</button></div>
      <div className="optimal-grid">{([['a',bestA,a],['b',bestB,b]] as const).map(([side,best,w])=><div key={side} className={'optimal-card side-'+side}>
        <div><span className="eyebrow">{side.toUpperCase()} · MEILLEUR EV SUR ENGAGEMENT 0–{maximum}</span><h3>{w.name}</h3>
          <p>{best?.label??'Aucun résultat fini'} · Exposition {best?.[side].state.exposure??'—'}</p></div>
        <div className="optimal-number"><Value value={best?.[side].expectedDamage??null}/><span>dégâts moyens</span></div>
        {best&&<div className="optimal-risk">Miss <Value value={best[side].missProbability} percent/> <span>·</span> Crit <Value value={best[side].initialCritProbability} percent/></div>}
      </div>)}</div>
      <p className="table-note">MAX EV = maximum de chaque arme dans le tableau. Le meilleur EV n’est pas forcément le meilleur choix tactique. Cliquez sur un mode pour l’inspecter.</p>
      <ComparisonTable rows={rows} names={names} selected={labelFor(mode)} onSelect={setMode}/>
      <div className="table-key"><span><i className="key-best"/> Meilleur EV</span><span><i className="key-crit"/> Plus forte chance de critique</span><span><i className="key-danger"/> Miss ≥ 25 %</span><span>Impacts = impacts réussis, miss exclus</span></div>
    </section>
    <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">02 / COURBES</span><h2>Où se situe le point optimal ?</h2></div>
      <div className="segmented" aria-label="Axe du graphique"><button aria-pressed={chartMode==='engagement'} onClick={()=>setChartMode('engagement')}>Engagement</button><button aria-pressed={chartMode==='advantage'} onClick={()=>setChartMode('advantage')}>Avantage initial</button></div></div>
      {points.length>0&&<DamageChart points={points} names={names} xLabel={chartMode==='engagement'?'Engagement':'Avantage initial'}
        selected={chartMode==='engagement'&&mode.kind==='engagement'?mode.engagement:undefined} onSelect={chartMode==='engagement'?e=>setMode({kind:'engagement',engagement:e}):undefined}/>}
      <p className="muted">{chartMode==='engagement'?'Precise est présenté séparément dans le tableau ; il n’appartient pas à l’échelle d’Engagement.':'Mode maintenu pour cette courbe : '+labelFor(mode)+'. Les autres paramètres restent inchangés.'}</p>
      <details><summary>Heatmap · Avantage × Engagement</summary><div className="segmented"><button aria-pressed={heatmapWeapon==='A'} onClick={()=>setHeatmapWeapon('A')}>Weapon A</button><button aria-pressed={heatmapWeapon==='B'} onClick={()=>setHeatmapWeapon('B')}>Weapon B</button></div>
        <Heatmap weapon={heatmapWeapon==='A'?a:b} maximum={maximum}/></details>
    </section>
    {selected&&<section className="results-section"><div className="section-heading"><div><span className="eyebrow">03 / INSPECTION</span><h2>Chaque composante compte</h2></div>
      <label className="inline-select">Mode inspecté<select value={labelFor(mode)} onChange={e=>{const r=rows.find(x=>x.label===e.target.value);if(r)setMode(r.mode);}}>{rows.map(row=><option key={row.label}>{row.label}</option>)}</select></label></div>
      <div className="panel detail-grid"><DamageDetails side="A" w={a} result={selected.a}/><DamageDetails side="B" w={b} result={selected.b}/></div></section>}
    <Validation a={a} b={b} mode={mode}/>
    <BalanceSweep a={a} b={b}/>
    <section className="panel assumptions"><details><summary>Rule assumptions · Conventions et méthode</summary>
      <div className="assumptions-grid"><div><h3>Distribution exacte</h3><p>Maximum de n dés : P(k) = (k/d)ⁿ − ((k−1)/d)ⁿ. Minimum : P(k) = ((d−k+1)/d)ⁿ − ((d−k)/d)ⁿ. Ici n = 1 + 2 × |avantage net|.</p>
        <h3>Récursion analytique</h3><p>Avec p = P(crit initial), q = P(crit secondaire), le nombre moyen de tentatives de reproc vaut p/(1−q). Chaque composante de l’impact secondaire est multipliée par ce facteur. Sans récursion, le facteur est p.</p></div>
      <div><h3>Ce qui est compté</h3><p>Les impacts moyens sont les impacts réussis, y compris ceux bornés à zéro. Les tentatives incluent les miss. Un dé de critique Original ou + Modifier n’est pas un nouvel impact. Les critiques comptés déclenchent un bonus ; un maximum terminal sans récursion ne compte pas comme un nouveau déclenchement.</p>
        <h3>Plancher et bonus moyens</h3><p>Le plancher s’applique séparément à chaque Full Impact. Pour Original et + Modifier, il s’applique à l’attaque après tous les bonus critiques. L’ajustement du plancher est une composante distincte. Imprégnation et On Hit sont traités comme des montants constants égaux aux moyennes saisies ; une moyenne seule ne permet pas de calculer le vrai effet d’un plancher sur une distribution inconnue.</p></div>
      <div><h3>Options de critique</h3><p>Les options de miss et de lancer secondaire concernent Full Impact Reproc. Les dés supplémentaires des deux autres modèles sont simples et ne ratent pas sur 1. Crit + Modifier ajoute un seul dé et le modificateur engagé. Les modèles sont sélectionnables pour les deux types d’arme.</p>
        <h3>Exposition et limites</h3><p>L’Exposition indique un risque défensif, sans changer l’EV offensive. Le moteur accepte tout Engagement entier représentable en JavaScript dont les calculs restent représentables. L’interface limite l’affichage à 50 niveaux et l’Avantage initial à ±20. Les probabilités utilisent des nombres flottants double précision ; une chaîne indiscernable de q = 1 est signalée comme non finie.</p></div></div>
    </details></section>
    <footer><span>CARDENVEIL <b>/</b> BALANCE LAB</span><span>Calculs locaux · Presets dans ce navigateur · Aucun backend</span></footer>
  </main>;
}
