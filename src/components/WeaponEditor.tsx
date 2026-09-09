import { useState } from 'react';
import { DICE, type AttackRules, type CritModel, type WeaponConfig, type WeaponDie, type WeaponType } from '../calculation';
import { NumericField, SelectField, Toggle } from './fields';
import type { Preset } from '../presets';
export function WeaponEditor({ side, weapon: w, onChange, presets, onSave, onDelete }:
  { side: 'A' | 'B'; weapon: WeaponConfig; onChange: (w: WeaponConfig)=>void; presets: Preset[];
    onSave: (name:string,w:WeaponConfig)=>void; onDelete: (id:string)=>void }) {
  const [presetName,setPresetName] = useState(''), [selected,setSelected] = useState('');
  const set = <K extends keyof WeaponConfig>(key: K, value: WeaponConfig[K]) => onChange({ ...w, [key]: value });
  const rule = <K extends keyof AttackRules>(key: K, value: AttackRules[K]) => set('rules', { ...w.rules, [key]: value });
  return <section className={'panel weapon-editor side-'+side.toLowerCase()} aria-label={'Weapon '+side}>
    <div className="panel-heading"><div className="weapon-title"><span className="side-badge">{side}</span><div><span className="eyebrow">WEAPON {side}</span>
      <input className="name-input" aria-label="Nom de l’arme" value={w.name} maxLength={80} onChange={e=>set('name',e.target.value)}/></div></div>
      <span className="die-badge">d{w.weaponDie}</span></div>
    <div className="field-grid">
      <SelectField label="Type d’arme" value={w.type} onChange={v=>set('type',v as WeaponType)}><option value="Finesse">Finesse / Agilité</option><option value="Strength">Force</option></SelectField>
      <SelectField label="Dé d’arme" value={w.weaponDie} onChange={v=>set('weaponDie',Number(v) as WeaponDie)}>{DICE.map(d=><option key={d} value={d}>d{d}</option>)}</SelectField>
      <NumericField label="Modificateur" value={w.attributeModifier} onChange={v=>set('attributeModifier',v)}/>
      <NumericField label="Avantage initial" value={w.initialAdvantage} integer min={-20} max={20} onChange={v=>set('initialAdvantage',v)}/>
    </div>
    <div className="section-label">BONUS PAR IMPACT</div>
    <div className="field-grid bonuses">{(['tier','perfection','imbuement','flat','onHit'] as const).map((key,i)=>
      <NumericField key={key} label={['Tier','Perfection','Imprégnation (moy.)','Bonus fixe','On Hit (moy.)'][i]} value={w[key]} onChange={v=>set(key,v)}/>)}</div>
    <div className="section-label">MODÈLE DE CRITIQUE</div>
    <SelectField label="Critical Model" value={w.rules.critModel} onChange={v=>rule('critModel',v as CritModel)}>
      <option value="original-extra-die">Original Crit</option><option value="finesse-extra-die-plus-modifier">Finesse Crit + Modifier</option><option value="full-impact-reproc">Full Impact Reproc</option>
    </SelectField>
    <div className="rule-options">
    {w.rules.critModel === 'full-impact-reproc' ? <>
      <div className="toggles-row"><Toggle label="Reproc récursif" checked={w.rules.reproc.recursive} onChange={v=>rule('reproc',{...w.rules.reproc,recursive:v})}/>
      <Toggle label="Reproc : 1 peut rater" checked={w.rules.reproc.canMiss} onChange={v=>rule('reproc',{...w.rules.reproc,canMiss:v})}/></div>
      <SelectField label="État du lancer de reproc" value={w.rules.reproc.rollMode} onChange={v=>rule('reproc',{...w.rules.reproc,rollMode:v as 'singleDie'|'repeatOriginalState'})}>
        <option value="singleDie">Single die — un seul dé</option><option value="repeatOriginalState">Repeat original roll state — avantage net</option>
      </SelectField></> : w.rules.critModel === 'original-extra-die'
      ? <Toggle label="Original Crit Explodes" checked={w.rules.originalCritExplodes} onChange={v=>rule('originalCritExplodes',v)}/>
      : <p className="muted">Un dé simple + le modificateur engagé. Un seul bonus critique, sans reproc des bonus fixes.</p>}
    </div>
    <div className="toggles-stack">
      <Toggle label="Les armes Finesse ignorent l’Exposition" checked={w.rules.finesseIgnoresExposure} onChange={v=>rule('finesseIgnoresExposure',v)}/>
      <Toggle label="Clamp successful damage to 0 minimum" checked={w.rules.clampSuccessfulDamage} onChange={v=>rule('clampSuccessfulDamage',v)}/>
    </div>
    <details className="preset-details"><summary>Presets locaux <span>{presets.length}</span></summary>
      <div className="preset-save"><input aria-label="Nom du preset" placeholder="Nom du preset" maxLength={80} value={presetName} onChange={e=>setPresetName(e.target.value)}/>
        <button disabled={!presetName.trim()} onClick={()=>{onSave(presetName.trim(),w);setPresetName('');}}>Sauvegarder</button></div>
      <div className="preset-save"><select aria-label="Preset sauvegardé" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choisir un preset…</option>{presets.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
        <button disabled={!presets.some(p=>p.id===selected)} onClick={()=>{const p=presets.find(p=>p.id===selected);if(p)onChange(structuredClone(p.weapon));}}>Charger</button>
        <button className="quiet" disabled={!selected} onClick={()=>{onDelete(selected);setSelected('');}}>Supprimer</button></div>
    </details>
  </section>;
}
