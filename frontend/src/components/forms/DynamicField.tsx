import type { FieldConfig } from '../../config/types';
import { SelectField, type SelectOption } from '../ui/SelectField';
import { TextField } from '../ui/TextField';

interface DynamicFieldProps {
  field: FieldConfig;
  value: string;
  error?: string;
  /** Opções carregadas da API para campos de relacionamento. */
  loadedOptions?: SelectOption[];
  onChange(name: string, value: string): void;
}

/** Renderiza o componente certo para cada tipo de campo definido na configuração do recurso. */
export function DynamicField({ field, value, error, loadedOptions, onChange }: DynamicFieldProps) {
  if (field.type === 'select') {
    return (
      <SelectField
        label={field.label}
        name={field.name}
        value={value}
        required={field.required}
        error={error}
        options={field.options ?? loadedOptions ?? []}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  }

  return (
    <TextField
      label={field.label}
      name={field.name}
      type={field.type}
      value={value}
      required={field.required}
      maxLength={field.maxLength}
      step={field.type === 'number' ? 'any' : undefined}
      hint={field.hint}
      error={error}
      onChange={(event) => onChange(field.name, event.target.value)}
    />
  );
}
