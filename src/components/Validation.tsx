import { useEffect, useRef, useState } from 'react';
import type { AttackMode, WeaponConfig, MonteCarloResult } from '../calculation';
import type { WorkerRequest } from '../workers/calculation.worker';
import { Value } from './fields';
type Simulation = MonteCarloResult & { name:string; exact:number };
export function Validation({ a,b,mode }: { a:WeaponConfig;b:WeaponConfig;mode:AttackMode }) {
  const worker=useRef<Worker|null>(null), [busy,setBusy]=useState(false), [results,setResults]=useState<Simulation[]|null>(null),[error,setError]=useState('');
  useEffect(()=>{worker.current?.terminate();setBusy(false);setResults(null);setError('');return()=>worker.current?.terminate();},[a,b,mode]);
  function run() {
    setBusy(true);setResults(null);setError('');
    const instance=new Worker(new URL('../workers/calculation.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=(event:MessageEvent<{kind:string;results?:Simulation[];message?:string}>)=>{
      setBusy(false);if(event.data.kind==='error')setError(event.data.message??'Erreur de simulation');else setResults(event.data.results??null);instance.terminate();
    };
    instance.onerror=()=>{setBusy(false);setError('Le worker de simulation a rencontré une erreur.');instance.terminate();};
    instance.postMessage({kind:'monteCarlo',weapons:[a,b],mode,samples:1_000_000} satisfies WorkerRequest);
  }
  return <section className="panel validation"><div className="section-heading"><div><span className="eyebrow">VÉRIFICATION INDÉPENDANTE</span><h2>Monte Carlo</h2></div>
    <button className="primary" disabled={busy} onClick={run}>{busy?'Simulation en cours…':'Validate with Monte Carlo'}</button></div>
    <p className="muted">1 000 000 attaques par arme, pour le mode sélectionné. Simulation dans un worker ; le résultat principal reste analytique.</p>
    {busy&&<button onClick={()=>{worker.current?.terminate();setBusy(false);}}>Annuler</button>}
    {error&&<p role="alert" className="warning">{error}</p>}
    {results&&<div className="table-scroll" role="status"><table><thead><tr><th>Arme</th><th>Exact EV</th><th>Monte Carlo EV</th><th>Écart</th><th>Erreur standard</th><th>Écart / erreur std.</th></tr></thead>
      <tbody>{results.map((r,i)=><tr key={i}><th>{r.name}</th><td><Value value={r.exact} digits={4}/></td><td><Value value={r.mean} digits={4}/></td>
        <td><Value value={r.mean-r.exact} digits={4}/></td><td><Value value={r.standardError} digits={4}/></td>
        <td><Value value={r.standardError?((r.mean-r.exact)/r.standardError):0} digits={4}/></td></tr>)}</tbody></table>
      <p className="muted">Un intervalle à 95 % vaut moyenne ± 1,96 × erreur standard. Une différence aléatoire n’indique pas à elle seule une erreur du moteur.</p></div>}
  </section>;
}
export function downloadFile(name:string,content:string,type='text/csv;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function BalanceSweep({ a,b }: { a:WeaponConfig;b:WeaponConfig }) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),worker=useRef<Worker|null>(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  function run() {
    setBusy(true);setMessage('');const instance=new Worker(new URL('../workers/calculation.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=(event:MessageEvent<{kind:string;csv?:string;message?:string}>)=>{
      setBusy(false);instance.terminate();
      if(event.data.csv){downloadFile('cardenveil-balance-sweep.csv',event.data.csv);setMessage('17 640 configurations exportées. Les règles des deux panneaux au lancement sont conservées.');}
      else setMessage(event.data.message??'Échec de l’export.');
    };
    instance.onerror=()=>{setBusy(false);setMessage('Impossible de terminer l’export.');instance.terminate();};
    instance.postMessage({kind:'sweep',weapons:[a,b]} satisfies WorkerRequest);
  }
  return <section className="panel sweep"><div><span className="eyebrow">BALANCE SWEEP</span><h2>Explorer toutes les combinaisons</h2>
    <p className="muted">2 armes × 5 dés × modificateurs 0–6 × avantages −3 à +5 × engagements 0–6 × tiers 0–3.<br/>Les autres bonus et règles proviennent des panneaux A et B.</p></div>
    <button onClick={run} disabled={busy}>{busy?'Calcul du sweep…':'Exporter 17 640 lignes CSV ↗'}</button>{message&&<p role="status">{message}</p>}</section>;
}
