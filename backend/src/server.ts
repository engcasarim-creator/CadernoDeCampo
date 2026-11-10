import type { Server } from 'node:http';
import { createApp } from './app';
import { createDatabasePool } from './config/database';
import { loadEnv } from './config/env';
import { createContainer } from './container';

const env = loadEnv();
const pool = createDatabasePool(env.db);
let server: Server | null = null;

async function main(): Promise<void> {
  const container = createContainer(env, pool);
  // Migrações pendentes e administrador inicial antes de aceitar requisições.
  await container.iniciar();
  server = createApp(container).listen(env.port, () => {
    console.log(`API do Caderno de Campo ouvindo na porta ${env.port}`);
  });
}

function shutdown(): void {
  const encerrarPool = (): void => {
    void pool.end().finally(() => process.exit(0));
  };
  if (server) server.close(encerrarPool);
  else encerrarPool();
}

main().catch((error: unknown) => {
  console.error('Falha ao iniciar a API:', error);
  process.exit(1);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
