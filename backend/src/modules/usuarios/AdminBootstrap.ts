import type { AdminSeed } from '../../config/env';
import type { PasswordHasher } from '../../shared/security/PasswordHasher';
import type { UsuarioRepository } from './UsuarioRepository';
import { Usuario } from './Usuario';
import { isValidCpf, normalizeCpf, passwordIssues } from '../../shared/utils/validators';

/**
 * Garante que exista um administrador, conforme as variáveis ADMIN_* (opcionais):
 *  - se o e-mail já está cadastrado, o usuário é promovido a ADMIN (os demais dados não mudam);
 *  - se não está, cria o usuário (exige CPF válido e senha forte).
 * Configuração inválida NÃO derruba a API: registra o motivo e segue sem criar o admin.
 */
export async function garantirAdministrador(
  usuarios: UsuarioRepository,
  hasher: PasswordHasher,
  seed: AdminSeed,
  log: (mensagem: string) => void = console.warn,
): Promise<void> {
  const existente = await usuarios.findByEmail(seed.email);
  if (existente) {
    if (!existente.ehAdministrador) {
      await usuarios.update(existente.comPapel('ADMIN'));
      console.log(`Usuário ${seed.email} promovido a administrador.`);
    }
    return;
  }

  const problemas: string[] = [];
  if (!isValidCpf(seed.cpf)) problemas.push('ADMIN_CPF inválido');
  const falhasSenha = passwordIssues(seed.senha);
  if (falhasSenha.length > 0) problemas.push(`ADMIN_SENHA fraca (deve ${falhasSenha.join(', ')})`);
  if (problemas.length > 0) {
    log(`Administrador ${seed.email} NÃO foi criado: ${problemas.join('; ')}.`);
    return;
  }

  const senhaHash = await hasher.hash(seed.senha);
  await usuarios.create(
    new Usuario({ nome: seed.nome, email: seed.email, senhaHash, cpf: normalizeCpf(seed.cpf), papel: 'ADMIN' }),
  );
  console.log(`Administrador ${seed.email} criado.`);
}
