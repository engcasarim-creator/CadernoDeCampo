import type { FieldConfig } from '../config/types';
import type { FieldErrors, FormValues } from '../types';

/** Campos que estão visíveis para os valores atuais (respeita `showWhen`). */
export function visibleFields(fields: FieldConfig[], values: FormValues): FieldConfig[] {
  return fields.filter((field) => field.showWhen?.(values) ?? true);
}

/** Valida campos obrigatórios e números. Só valida os campos visíveis. */
export function validateFields(fields: FieldConfig[], values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of visibleFields(fields, values)) {
    const value = (values[field.name] ?? '').trim();
    if (value === '') {
      if (field.required) errors[field.name] = 'Campo obrigatório';
      continue;
    }
    if (field.type === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) errors[field.name] = 'Informe um número válido';
      else if (field.positive && parsed <= 0) errors[field.name] = 'Deve ser maior que zero';
      else if (field.min !== undefined && parsed < field.min) errors[field.name] = `Deve ser no mínimo ${field.min}`;
    }
  }
  return errors;
}
