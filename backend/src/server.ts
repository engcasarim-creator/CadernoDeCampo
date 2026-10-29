import { createApp } from './app';
import { createDatabasePool } from './config/database';
import { loadEnv } from './config/env';
import { createContainer } from './container';

const env = loadEnv();
const pool = createDatabasePool(env.db);
const app = createApp(createContainer(env, pool));

const server = app.listen(env.port, () => {
  console.log(`API do Caderno de Campo ouvindo na porta ${env.port}`);
});

function shutdown(): void {
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
