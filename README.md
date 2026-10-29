# Caderno de Campo Digital

Aplicação web para **produtores rurais** registrarem **propriedades, talhões, safras e atividades de campo**
(plantio, aplicação de insumos e colheita), no lugar do caderno de papel e das anotações no WhatsApp.

Projeto da disciplina **Tech Academy 4 (ADS)** — Node.js + React + TypeScript + Docker.

## Como executar

Pré-requisito: Docker com Docker Compose.

```bash
cp .env.example .env        # troque as senhas e o JWT_SECRET
docker compose up --build   # sobe tudo
```

Abra **http://localhost** (única porta publicada). Crie uma conta em "Criar conta" e faça login.

- Parar mantendo os dados: `docker compose down`
- Apagar também o banco (volume): `docker compose down -v`

> O arquivo `.env` não vai para o Git (está no `.gitignore`). Se o repositório for entregue em `.zip`,
> copie `.env.example` para `.env` antes de subir.

## Arquitetura

```
        Internet
           │  :80 (única porta publicada)
      ┌────▼────┐   rede_publica + rede_interna
      │  nginx  │
      └──┬────┬─┘
   /api  │    │  /
 ┌───────▼┐  ┌▼─────────┐        rede_interna (internal: true)
 │backend │  │ frontend │        sem acesso externo
 │Express │  │ React +  │
 │  :3000 │  │ nginx:80 │
 └───┬────┘  └──────────┘
     │ 3306
 ┌───▼────┐
 │ mysql  │── volume nomeado mysql_data (dados persistem)
 └────────┘
```

| Serviço  | Imagem / build            | Papel                                            |
|----------|---------------------------|--------------------------------------------------|
| nginx    | `nginx:1.27-alpine`       | Proxy reverso: `/api` → backend, `/` → frontend  |
| frontend | build multi-stage (Vite)  | SPA React servida como arquivos estáticos        |
| backend  | build multi-stage (tsc)   | API REST (Express + TypeScript + JWT)            |
| mysql    | `mysql:8.4`               | Banco; `db/init.sql` cria as tabelas na 1ª subida|

Isolamento: `rede_interna` é `internal: true`; só o nginx participa também da `rede_publica`.
MySQL, backend e frontend não publicam nenhuma porta.

## Modelo de dados

`Propriedade 1─N Talhão 1─N Safra 1─N Atividade`, todas pertencentes a um usuário (cada usuário só enxerga os seus dados).
`Atividade` é abstrata, com `Plantio`, `Aplicacao` e `Colheita` sobrescrevendo `calcularCusto()` e `contribuirPara()` (polimorfismo).

Regras de negócio: a soma das áreas dos talhões não pode ultrapassar a área da propriedade (e a propriedade não pode ser reduzida abaixo dessa soma). O gráfico de Atividades compara semente plantada × colhido (1 saca = 60 kg) e o custo de plantio × colheita.

## Endpoints principais

| Método | Rota                                  | Auth | Descrição                          |
|--------|---------------------------------------|------|------------------------------------|
| POST   | `/api/auth/register`                  | não  | Cadastro (nome, e-mail, senha, CPF)|
| POST   | `/api/auth/login`                     | não  | Login → JWT                        |
| GET    | `/api/usuarios/me`                    | sim  | Usuário logado                     |
| PUT    | `/api/usuarios/:id`                   | sim  | Edita o próprio perfil (e-mail fixo)|
| CRUD   | `/api/propriedades`, `/talhoes`, `/safras`, `/atividades` | sim | Paginado: `?page=1&limit=10` |
| GET    | `/api/safras/:id/comparativo`         | sim  | Plantio × colheita da safra (quantidade e custo) |
| GET    | `/api/health`                         | não  | Healthcheck do Docker              |

## Estrutura do código

```
backend/src
  controllers/   HTTP (recebe a requisição, devolve a resposta)
  services/      regras de negócio (uma responsabilidade por classe)
  repositories/  acesso ao MySQL (BaseRepository genérico)
  entities/      domínio: campos privados, getters/setters com validação, herança e polimorfismo
  contracts/     interfaces (services dependem delas, não de classes concretas)
  errors/        exceções customizadas (ValidationError, NotFoundError, ...)
frontend/src
  components/    componentes genéricos e reutilizáveis (ui/, forms/, layout/)
  pages/         telas (Login, Cadastro, Perfil, listagens e formulários dos CRUDs)
  config/        configuração declarativa dos 4 CRUDs
  context/       AuthContext (usuário global)
```

## Qualidade

```bash
cd backend  && npm run typecheck && npm test    # 25 testes (Vitest), sem precisar de MySQL
cd frontend && npm run typecheck && npm run build
```

## Agentes de IA

Veja [`AGENTS.md`](AGENTS.md): 3 skills (`.claude/skills/`), guardrails e proteção do `.env`
(aplicada por `.claude/settings.json`).

## Documentos

- [`docs/RUBRICA.md`](docs/RUBRICA.md) — onde cada item da rubrica é atendido no código
- [`docs/ROTEIRO-VIDEO.md`](docs/ROTEIRO-VIDEO.md) — roteiro do vídeo de demonstração (até 10 min)
