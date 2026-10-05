import RefSelect from './RefSelect';
import ListInput from './ListInput';
import PermissionPicker from './PermissionPicker';
import PasswordInput from './PasswordInput';
import CustomFieldsEditor from './CustomFieldsEditor';
import SuggestInput from './SuggestInput';
import DenominationsEditor from './DenominationsEditor';
import { humanize } from '../utils/format';

export default function FormField({ field, value, onChange, error, disabled }) {
  const id = `f-${field.name}`;
  const common = { id, disabled, 'aria-invalid': Boolean(error) || undefined };
  let control;

  switch (field.type) {
    case 'lines':
    case 'pairs':
      control = <textarea {...common} className="input" rows={field.rows || 5} value={value ?? ''} placeholder={field.placeholder || (field.type === 'pairs' ? 'Duration: 3 hours\nLocation: Dubai' : 'One item per line')} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'color': {
      const valid = /^#[0-9a-f]{6}$/i.test(value || '');
      control = (
        <div className="color-field">
          <input type="color" aria-label={`${field.label} picker`} value={valid ? value : (field.default || '#000000')} disabled={disabled} onChange={(e) => onChange(e.target.value.toUpperCase())} />
          <input {...common} className="input mono" value={value ?? ''} maxLength={7} placeholder="#E0435A" onChange={(e) => onChange(e.target.value.toUpperCase())} />
          {(field.swatches || []).map((c) => (
            <button key={c} type="button" className={`swatch ${value === c ? 'is-on' : ''}`} style={{ background: c }} title={c} aria-label={`Use ${c}`} disabled={disabled} onClick={() => onChange(c)} />
          ))}
        </div>
      );
      break;
    }
    case 'segmented':
      control = (
        <div className="segmented segmented-inline" role="radiogroup" aria-labelledby={`${id}-label`}>
          {field.options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'is-on' : ''} disabled={disabled} onClick={() => onChange(o)}>
              {field.optionLabel ? field.optionLabel(o) : humanize(o)}
            </button>
          ))}
        </div>
      );
      break;
    case 'textarea':
      control = <textarea {...common} className="input" rows={field.rows || 3} value={value ?? ''} maxLength={field.max} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'select':
      control = (
        <select {...common} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {!field.required && <option value="">—</option>}
          {field.options.map((o) => <option key={o} value={o}>{field.optionLabel ? field.optionLabel(o) : humanize(o)}</option>)}
        </select>
      );
      break;
    case 'checkbox':
      control = (
        <label className="check">
          <input {...common} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {field.checkLabel || field.label}
        </label>
      );
      break;
    case 'number':
    case 'money':
      control = (
        <div className={field.type === 'money' ? 'input-affix' : undefined}>
          {field.type === 'money' && <span className="affix">AED</span>}
          <input {...common} className="input" type="number" inputMode="decimal" step={field.step ?? (field.type === 'money' ? '0.01' : '1')} min={field.min} max={field.maxValue} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
      break;
    case 'date':
    case 'dateEnd':
      control = <input {...common} className="input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'datetime':
      control = <input {...common} className="input" type="datetime-local" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'ref':
    case 'refMulti':
      control = <RefSelect id={id} endpoint={field.endpoint} labelKey={field.labelKey} optionLabel={field.refLabel} params={field.params} multiple={field.type === 'refMulti'} value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'urlList':
      control = <ListInput id={id} isUrl value={value || []} onChange={onChange} disabled={disabled} />;
      break;
    case 'tags':
      control = <ListInput id={id} value={value || []} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
      break;
    case 'permissions':
      control = <PermissionPicker value={value || []} onChange={onChange} disabled={disabled} />;
      break;
    case 'url':
      control = (
        <div className="url-single">
          <input {...common} className="input" type="url" placeholder="https://…" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {value && /^https?:\/\//.test(value) && <img src={value} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
      );
      break;
    case 'denominations':
      control = <DenominationsEditor value={value || []} onChange={onChange} disabled={disabled} currency={field.currency} />;
      break;
    case 'customFields':
      control = <CustomFieldsEditor value={value || []} onChange={onChange} disabled={disabled} />;
      break;
    case 'suggest':
      control = <SuggestInput {...common} field={field} value={value ?? ''} onChange={onChange} />;
      break;
    case 'password':
      control = <PasswordInput {...common} autoComplete="new-password" placeholder={field.placeholder} maxLength={128} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      control = (
        <input
          {...common}
          className="input"
          type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
          autoComplete={field.type === 'password' ? 'new-password' : 'off'}
          placeholder={field.placeholder}
          maxLength={field.max}
          value={value ?? ''}
          onChange={(e) => onChange(field.uppercase ? e.target.value.toUpperCase() : e.target.value)}
        />
      );
  }

  return (
    <div className={`field ${field.wide ? 'field-wide' : ''}`}>
      {field.type !== 'checkbox' && field.label && (
        <label htmlFor={id} id={`${id}-label`} className="field-label">
          {field.label}{field.required && <span className="req" aria-hidden> *</span>}
        </label>
      )}
      {control}
      {field.help && !error && <p className="field-help">{field.help}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
