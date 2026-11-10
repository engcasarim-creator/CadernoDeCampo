import type { Pool, RowDataPacket } from 'mysql2/promise';

/**
 * Migrações do banco.
 *
 * O `db/init.sql` só roda quando o volume do MySQL é criado pela primeira vez, então
 * qualquer mudança de esquema posterior precisa vir daqui. A API aplica as migrações
 * pendentes ao iniciar, uma única vez cada (controle na tabela `schema_migrations`),
 * sem apagar nenhum dado. Regra: UMA instrução DDL por migração (o MySQL não desfaz DDL).
 */
export interface Migration {
  id: number;
  descricao: string;
  sql: string;
  params?: unknown[];
}

const CAMPOS_TRATORISTA = [
  { chave: 'horas_de_tratorista', rotulo: 'Horas de tratorista', tipo: 'NUMERO', unidade: 'h', entraNoCusto: true },
  { chave: 'valor_por_hora', rotulo: 'Valor por hora', tipo: 'NUMERO', unidade: 'R$/h', entraNoCusto: true },
];

export const MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    descricao: 'usuarios: papel (USUARIO/ADMIN)',
    sql: "ALTER TABLE usuarios ADD COLUMN papel ENUM('USUARIO','ADMIN') NOT NULL DEFAULT 'USUARIO' AFTER cpf",
  },
  {
    id: 2,
    descricao: 'propriedades: latitude e longitude do centroide',
    sql: 'ALTER TABLE propriedades ADD COLUMN latitude DECIMAL(9,6) NULL AFTER area_ha, ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude',
  },
  {
    id: 3,
    descricao: 'tipos_atividade: tipos personalizados criados pelo administrador',
    sql: `CREATE TABLE IF NOT EXISTS tipos_atividade (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      nome       VARCHAR(80)  NOT NULL,
      campos     JSON         NOT NULL,
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_tipos_atividade_nome (nome)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    id: 4,
    descricao: "atividades: novo tipo 'PERSONALIZADA'",
    sql: "ALTER TABLE atividades MODIFY tipo ENUM('PLANTIO','APLICACAO','COLHEITA','PERSONALIZADA') NOT NULL",
  },
  {
    id: 5,
    descricao: 'atividades: tipo_id (liga a atividade ao tipo personalizado)',
    sql: `ALTER TABLE atividades
      ADD COLUMN tipo_id INT UNSIGNED NULL AFTER tipo,
      ADD KEY idx_atividades_tipo (tipo_id),
      ADD CONSTRAINT fk_atividades_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_atividade (id) ON DELETE RESTRICT`,
  },
  {
    id: 6,
    descricao: 'tipos_atividade: exemplo "Tratorista" (horas x valor por hora)',
    sql: 'INSERT IGNORE INTO tipos_atividade (nome, campos) VALUES (?, ?)',
    params: ['Tratorista', JSON.stringify(CAMPOS_TRATORISTA)],
  },
  {
    id: 7,
    descricao: 'propriedades: CAR (Cadastro Ambiental Rural)',
    sql: 'ALTER TABLE propriedades ADD COLUMN car VARCHAR(50) NULL AFTER longitude',
  },
  {
    id: 8,
    descricao: 'propriedades: CCIR (código do imóvel rural, INCRA)',
    sql: 'ALTER TABLE propriedades ADD COLUMN ccir VARCHAR(20) NULL AFTER car',
  },
  {
    id: 9,
    descricao: 'propriedades: um CAR só pode existir uma vez (vários NULL de propriedades antigas são aceitos)',
    sql: 'ALTER TABLE propriedades ADD CONSTRAINT uq_propriedades_car UNIQUE (car)',
  },
  {
    id: 10,
    descricao: 'propriedades: um CCIR só pode existir uma vez',
    sql: 'ALTER TABLE propriedades ADD CONSTRAINT uq_propriedades_ccir UNIQUE (ccir)',
  },
  {
    id: 11,
    descricao: 'propriedades: índice do centroide (busca de propriedades vizinhas)',
    sql: 'ALTER TABLE propriedades ADD KEY idx_propriedades_centroide (latitude, longitude)',
  },
  {
    id: 12,
    descricao: 'transferencias_propriedade: histórico (auditoria) das trocas de responsável feitas pelo administrador',
    sql: `CREATE TABLE IF NOT EXISTS transferencias_propriedade (
      id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
      propriedade_id   INT UNSIGNED NOT NULL,
      propriedade_nome VARCHAR(120) NOT NULL,
      propriedade_car  VARCHAR(50)  NULL,
      de_usuario_id    INT UNSIGNED NOT NULL,
      para_usuario_id  INT UNSIGNED NOT NULL,
      realizada_por    INT UNSIGNED NOT NULL,
      motivo           VARCHAR(255) NOT NULL,
      created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_transferencias_propriedade (propriedade_id),
      CONSTRAINT fk_transf_de   FOREIGN KEY (de_usuario_id)   REFERENCES usuarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_transf_para FOREIGN KEY (para_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_transf_admin FOREIGN KEY (realizada_por)  REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    id: 13,
    descricao: 'contestacoes: pedidos do dono real para assumir uma propriedade cadastrada por outra pessoa',
    sql: `CREATE TABLE IF NOT EXISTS contestacoes (
      id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
      solicitante_id INT UNSIGNED NOT NULL,
      propriedade_id INT UNSIGNED NULL,
      car            VARCHAR(50)  NOT NULL,
      ccir           VARCHAR(30)  NULL,
      justificativa  TEXT         NOT NULL,
      status         ENUM('EM_ANALISE','DEFERIDA','INDEFERIDA') NOT NULL DEFAULT 'EM_ANALISE',
      decisao        VARCHAR(300) NULL,
      decidida_por   INT UNSIGNED NULL,
      decidida_em    TIMESTAMP    NULL,
      email_status   ENUM('PENDENTE','ENVIADO','FALHOU','NAO_CONFIGURADO') NULL,
      created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_contestacoes_solicitante (solicitante_id),
      KEY idx_contestacoes_status (status, id),
      KEY idx_contestacoes_propriedade (propriedade_id),
      CONSTRAINT fk_contestacoes_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT fk_contestacoes_propriedade FOREIGN KEY (propriedade_id) REFERENCES propriedades (id) ON DELETE SET NULL,
      CONSTRAINT fk_contestacoes_decidida_por FOREIGN KEY (decidida_por) REFERENCES usuarios (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    id: 14,
    descricao: 'contestacao_arquivos: PDFs de prova anexados ao pedido (o arquivo fica no armazenamento, aqui só os dados)',
    sql: `CREATE TABLE IF NOT EXISTS contestacao_arquivos (
      id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
      contestacao_id INT UNSIGNED NOT NULL,
      nome_original  VARCHAR(150) NOT NULL,
      chave          VARCHAR(100) NOT NULL,
      tamanho        INT UNSIGNED NOT NULL,
      created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_contestacao_arquivos_chave (chave),
      KEY idx_contestacao_arquivos_contestacao (contestacao_id),
      CONSTRAINT fk_contestacao_arquivos_contestacao FOREIGN KEY (contestacao_id) REFERENCES contestacoes (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    id: 15,
    descricao: 'notificacoes: avisos dentro do sistema, por usuário',
    sql: `CREATE TABLE IF NOT EXISTS notificacoes (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id INT UNSIGNED NOT NULL,
      titulo     VARCHAR(120) NOT NULL,
      mensagem   VARCHAR(500) NOT NULL,
      lida       TINYINT(1)   NOT NULL DEFAULT 0,
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notificacoes_usuario (usuario_id, lida, id),
      CONSTRAINT fk_notificacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

/** Erros do MySQL que significam "esta mudança já existe": a migração conta como aplicada. */
const JA_APLICADO = new Set(['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR', 'ER_FK_DUP_NAME']);

function codigoDoErro(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
}

/** Aplica as migrações pendentes, em ordem. Devolve quantas foram aplicadas agora. */
export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[] = MIGRATIONS,
  log: (mensagem: string) => void = console.log,
): Promise<number> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id          INT UNSIGNED NOT NULL,
    descricao   VARCHAR(200) NOT NULL,
    aplicada_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM schema_migrations');
  const aplicadas = new Set(rows.map((row) => Number(row.id)));

  let novas = 0;
  for (const migration of [...migrations].sort((a, b) => a.id - b.id)) {
    if (aplicadas.has(migration.id)) continue;
    try {
      await pool.query(migration.sql, migration.params);
      novas += 1;
      log(`Migração ${migration.id} aplicada: ${migration.descricao}`);
    } catch (error) {
      const codigo = codigoDoErro(error);
      if (codigo === null || !JA_APLICADO.has(codigo)) throw error;
      log(`Migração ${migration.id} já estava refletida no banco (${codigo}); registrando.`);
    }
    await pool.query('INSERT INTO schema_migrations (id, descricao) VALUES (?, ?)', [migration.id, migration.descricao]);
  }
  return novas;
}
