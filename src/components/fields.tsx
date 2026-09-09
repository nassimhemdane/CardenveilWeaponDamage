import { useEffect, useId, useState, type ReactNode } from 'react';
export function NumericField({ label, value, onChange, integer = false, min = -1_000_000, max = 1_000_000 }:
  { label: string; value: number; onChange: (value: number) => void; integer?: boolean; min?: number; max?: number }) {
  const id = useId(), [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const numeric = Number(draft), valid = draft.trim() !== '' && Number.isFinite(numeric) && numeric >= min && numeric <= max && (!integer || Number.isInteger(numeric));
  return <label className="field" htmlFor={id}><span>{label}</span>
    <input id={id} type="number" step={integer ? 1 : 'any'} min={min} max={max} value={draft} aria-invalid={!valid}
      onChange={e => { const s = e.target.value, v = Number(s); setDraft(s);
        if (s !== '' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v))) onChange(v); }}
      onBlur={() => { if (!valid) setDraft(String(value)); }}/>
    {!valid && <small className="warning">Valeur invalide : calcul précédent conservé.</small>}
  </label>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (x: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/><span>{label}</span></label>;
}
export function SelectField({ label, value, onChange, children }: { label: string; value: string | number; onChange: (x:string)=>void; children: ReactNode }) {
  const id = useId(); return <label className="field" htmlFor={id}><span>{label}</span><select id={id} value={value} onChange={e=>onChange(e.target.value)}>{children}</select></label>;
}
export function Value({ value, digits = 2, percent = false }: { value: number | null; digits?: number; percent?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span title="Espérance non finie">—</span>;
  return <span title={String(value)}>{(percent ? value*100 : value).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}{percent ? ' %' : ''}</span>;
}
