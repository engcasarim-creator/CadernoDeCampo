/** Leitura centralizada das variáveis de ambiente. Falha cedo se algo obrigatório faltar. */

export interface Env {
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
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

export function loadEnv(): Env {
  return {
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
  };
}
