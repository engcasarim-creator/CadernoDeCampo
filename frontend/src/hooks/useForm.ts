import { useCallback, useState } from 'react';
import type { FieldErrors, FormValues } from '../types';

/** Estado de formulário reutilizado por todas as telas (valores + erros por campo). */
export function useForm<V extends FormValues>(initial: V) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = useCallback((name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  return { values, setValues, errors, setErrors, setField };
}
