-- Esquema do Caderno de Campo Digital.
-- Executado automaticamente pelo MySQL na primeira inicialização do volume.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(254) NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  cpf         CHAR(11)     NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS propriedades (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  nome        VARCHAR(120) NOT NULL,
  municipio   VARCHAR(120) NOT NULL,
  uf          CHAR(2)      NOT NULL,
  area_ha     DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_propriedades_usuario (usuario_id),
  CONSTRAINT fk_propriedades_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS talhoes (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  propriedade_id INT UNSIGNED NOT NULL,
  nome           VARCHAR(120) NOT NULL,
  area_ha        DECIMAL(12,2) NOT NULL,
  tipo_solo      VARCHAR(60)  NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_talhoes_propriedade (propriedade_id),
  CONSTRAINT fk_talhoes_propriedade FOREIGN KEY (propriedade_id)
    REFERENCES propriedades (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- As duas tabelas abaixo já existem para você implementar os CRUDs 3 e 4
-- seguindo o mesmo padrão de Propriedades/Talhões.

CREATE TABLE IF NOT EXISTS safras (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  talhao_id     INT UNSIGNED NOT NULL,
  cultura       VARCHAR(80)  NOT NULL,
  ano_agricola  VARCHAR(9)   NOT NULL,           -- ex.: 2026/2027
  data_plantio  DATE         NULL,
  data_colheita DATE         NULL,
  status        ENUM('PLANEJADA','EM_ANDAMENTO','ENCERRADA') NOT NULL DEFAULT 'PLANEJADA',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_safras_talhao (talhao_id),
  CONSTRAINT fk_safras_talhao FOREIGN KEY (talhao_id)
    REFERENCES talhoes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS atividades (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  safra_id   INT UNSIGNED NOT NULL,
  tipo       ENUM('PLANTIO','APLICACAO','COLHEITA') NOT NULL,
  data       DATE         NOT NULL,
  descricao  VARCHAR(255) NOT NULL,
  detalhes   JSON         NOT NULL,               -- campos específicos de cada tipo
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_atividades_safra (safra_id),
  CONSTRAINT fk_atividades_safra FOREIGN KEY (safra_id)
    REFERENCES safras (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
