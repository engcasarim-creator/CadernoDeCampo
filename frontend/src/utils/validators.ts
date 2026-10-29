const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(digits: number[], length: number): number {
  const sum = digits.slice(0, length).reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  return checkDigit(digits, 9) === digits[9] && checkDigit(digits, 10) === digits[10];
}

/** Máscara 000.000.000-00 aplicada enquanto o usuário digita. */
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join('.');
  return d.length > 9 ? `${parts}-${d.slice(9)}` : parts;
}

/** Requisitos de senha NÃO atendidos (lista vazia = senha forte). Mesmas regras do back-end. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('ter ao menos 8 caracteres');
  if (!/[a-z]/.test(password)) issues.push('ter uma letra minúscula');
  if (!/[A-Z]/.test(password)) issues.push('ter uma letra maiúscula');
  if (!/\d/.test(password)) issues.push('ter um número');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('ter um caractere especial');
  return issues;
}
