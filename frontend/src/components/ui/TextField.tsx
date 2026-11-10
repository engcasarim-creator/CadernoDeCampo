import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, name, error, hint, required, ...rest }: TextFieldProps) {
  const id = `field-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input id={id} name={name} aria-invalid={Boolean(error)} {...rest} />
      {error ? (
        <small className="field-error" role="alert">
          {error}
        </small>
      ) : (
        hint && <small className="field-hint">{hint}</small>
      )}
    </div>
  );
}
