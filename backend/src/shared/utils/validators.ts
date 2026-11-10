/** Validações puras (sem dependências), reutilizadas por entidades e serviços. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

/** Remove tudo que não for dígito. */
export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function cpfCheckDigit(digits: readonly number[], length: number): number {
  const sum = digits
    .slice(0, length)
    .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Valida CPF (11 dígitos, rejeita sequências repetidas e confere os dígitos verificadores). */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  return cpfCheckDigit(digits, 9) === digits[9] && cpfCheckDigit(digits, 10) === digits[10];
}

/** Retorna a lista de requisitos de senha que NÃO foram atendidos (vazia = senha forte). */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('ter ao menos 8 caracteres');
  if (!/[a-z]/.test(password)) issues.push('ter uma letra minúscula');
  if (!/[A-Z]/.test(password)) issues.push('ter uma letra maiúscula');
  if (!/\d/.test(password)) issues.push('ter um número');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('ter um caractere especial');
  return issues;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
