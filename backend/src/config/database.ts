import { createPool, type Pool } from 'mysql2/promise';
import type { Env } from './env';

export function createDatabasePool(db: Env['db']): Pool {
  return createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    // DATE/TIMESTAMP chegam como string ('2026-10-23'), sem surpresas de fuso horário.
    dateStrings: true,
  });
}
