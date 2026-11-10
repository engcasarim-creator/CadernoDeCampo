import type { TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, name, error, hint, required, maxLength, value, ...rest }: TextAreaFieldProps) {
  const id = `field-${name}`;
  const usados = typeof value === 'string' ? value.length : 0;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea id={id} name={name} rows={4} maxLength={maxLength} value={value} aria-invalid={Boolean(error)} {...rest} />
      {error ? (
        <small className="field-error" role="alert">
          {error}
        </small>
      ) : (
        <small className="field-hint">
          {hint}
          {maxLength !== undefined && ` ${usados}/${maxLength}`}
        </small>
      )}
    </div>
  );
}
