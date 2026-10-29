import { describe, expect, it } from 'vitest';
import { isValidCpf, isValidEmail, passwordIssues } from '../src/utils/validators';

describe('isValidCpf', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejeita dígito verificador errado, tamanho errado e sequências repetidas', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('1234')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('valida o formato', () => {
    expect(isValidEmail('renan@exemplo.com')).toBe(true);
    expect(isValidEmail('renan@exemplo')).toBe(false);
    expect(isValidEmail('sem arroba.com')).toBe(false);
  });
});

describe('passwordIssues', () => {
  it('aceita senha forte', () => {
    expect(passwordIssues('Senha@123')).toEqual([]);
  });

  it('lista o que falta numa senha fraca', () => {
    const issues = passwordIssues('abc');
    expect(issues).toContain('ter ao menos 8 caracteres');
    expect(issues).toContain('ter uma letra maiúscula');
    expect(issues).toContain('ter um número');
    expect(issues).toContain('ter um caractere especial');
  });
});
