/** Leitura centralizada das variáveis de ambiente. Falha cedo se algo obrigatório faltar. */
import type { SmtpConfig } from '../shared/email';

/** Administrador inicial (opcional): criado, ou promovido se o e-mail já existir, ao iniciar a API. */
export interface AdminSeed {
  readonly email: string;
  readonly nome: string;
  readonly cpf: string;
  /** Só é necessária quando o usuário ainda não existe. */
  readonly senha: string;
}

export interface Env {
  /** Pasta onde ficam os PDFs enviados (no Docker, um volume). */
  readonly uploadsDir: string;
  /** null = e-mail desativado (as contestações funcionam; só o e-mail não sai). */
  readonly smtp: SmtpConfig | null;
  readonly port: number;
  readonly db: {
    readonly host: string;
    readonly port: number;
    readonly name: string;
    readonly user: string;
    readonly password: string;
  };
  readonly jwt: {
    readonly secret: string;
    readonly expiresIn: string;
  };
  readonly admin: AdminSeed | null;
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

function optional(name: string): string {
  return (process.env[name] ?? '').trim();
}

function loadSmtp(): SmtpConfig | null {
  const host = optional('SMTP_HOST');
  if (host === '') return null;
  const user = optional('SMTP_USER');
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: optional('SMTP_SECURE').toLowerCase() === 'true',
    user,
    password: process.env.SMTP_PASSWORD ?? '',
    from: optional('SMTP_FROM') || (user === '' ? 'Caderno de Campo <nao-responda@localhost>' : user),
  };
}

function loadAdminSeed(): AdminSeed | null {
  const email = optional('ADMIN_EMAIL').toLowerCase();
  if (email === '') return null;
  return {
    email,
    nome: optional('ADMIN_NOME') || 'Administrador',
    cpf: optional('ADMIN_CPF'),
    senha: process.env.ADMIN_SENHA ?? '',
  };
}

export function loadEnv(): Env {
  return {
    uploadsDir: optional('UPLOADS_DIR') || './uploads',
    smtp: loadSmtp(),
    port: Number(process.env.PORT ?? 3000),
    db: {
      host: required('DB_HOST'),
      port: Number(process.env.DB_PORT ?? 3306),
      name: required('DB_NAME'),
      user: required('DB_USER'),
      password: required('DB_PASSWORD'),
    },
    jwt: {
      secret: required('JWT_SECRET'),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
    },
    admin: loadAdminSeed(),
  };
}
