# AGENTS.md — Caderno de Campo Digital

Instruções para agentes de IA (Claude Code, Copilot, Cursor, etc.) que trabalhem neste repositório.
Leia este arquivo inteiro antes de alterar qualquer coisa.

## 1. Contexto do projeto

Aplicação web para **produtores rurais** registrarem propriedades, talhões, safras e atividades de campo
(plantio, aplicação de insumos e colheita), substituindo o caderno de papel e as anotações no WhatsApp.

| Camada      | Tecnologia                                              | Pasta       |
|-------------|---------------------------------------------------------|-------------|
| API         | Node 20, Express, TypeScript, mysql2, JWT, bcryptjs     | `backend/`  |
| Interface   | React 18, Vite, React Router, TypeScript                | `frontend/` |
| Banco       | MySQL 8.4 (script em `db/init.sql`)                     | `db/`       |
| Proxy       | Nginx (única porta publicada: 80)                       | `nginx/`    |
| Orquestração| Docker Compose (4 serviços, 2 redes, 1 volume nomeado)  | raiz        |

Comandos úteis:

```bash
docker compose up --build        # sobe tudo em http://localhost
cd backend  && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run build
```

## 2. Convenções de código (obrigatórias)

- **TypeScript estrito. Proibido `any`** (use `unknown` + validação). Sem JavaScript solto.
- **Encapsulamento:** campos de entidades são privados (`#campo`); só crie `get`/`set` quando houver
  validação ou regra de negócio. Nada de atributos públicos "por conveniência".
- **Camadas do back-end** (cada classe tem uma única responsabilidade):
  `controllers/` (HTTP) → `services/` (regras) → `repositories/` (SQL) → `entities/` (domínio).
  Services dependem de **interfaces** em `contracts/`, nunca de classes concretas.
- **Erros:** lance os erros de `backend/src/errors` (`ValidationError`, `NotFoundError`, ...). Nunca `throw new Error`
  para erro de negócio, nunca devolva stack trace ao cliente.
- **Nomes:** classes `PascalCase`, variáveis/funções `camelCase`, tabelas e colunas `snake_case`, rotas em português
  e no plural (`/api/propriedades`).
- **Front-end:** componentes genéricos em `components/`, telas em `pages/`, uma responsabilidade por componente;
  trechos exclusivos de uma página ficam em funções separadas no mesmo arquivo.
- Mensagens ao usuário em **português do Brasil**, claras e sem jargão técnico.

## 3. Skills dos agentes

Cada skill tem um arquivo detalhado em `.claude/skills/<nome>/SKILL.md`. Use a skill quando o pedido se encaixar.

### Skill 1 — `criar-crud`
**Quando usar:** o usuário pede um novo recurso (ex.: "adicione Insumos" ou "crie o CRUD de Máquinas").
**Resumo:** criar a tabela em `db/init.sql` → entidade com campos privados → repositório (estende `BaseRepository`)
→ service (estende `CrudService`) → registrar no `container.ts` e no `app.ts` → configuração em
`frontend/src/config/resources.ts` e rotas em `App.tsx` → testes. Toda rota nasce autenticada e paginada.

### Skill 2 — `escrever-testes`
**Quando usar:** ao criar ou alterar regra de negócio, validação ou rota.
**Resumo:** testes com Vitest em `backend/tests/`; services com dublês em memória (sem MySQL);
rotas via HTTP com `InMemoryRepository`; cobrir caso feliz, validação, 401/403/404 e isolamento entre usuários.

### Skill 3 — `revisar-seguranca`
**Quando usar:** antes de finalizar qualquer mudança em autenticação, rotas, SQL, Docker ou variáveis de ambiente.
**Resumo:** checklist — rota autenticada? dado filtrado pelo usuário dono? SQL parametrizado? senha com bcrypt e
nunca devolvida? segredo fora do código? só o Nginx exposto? mensagens de erro sem vazar detalhes?

## 4. Guardrails (limites do agente)

O agente **NÃO deve**:

1. **Ler, imprimir, copiar, resumir ou pedir** o conteúdo de `.env` (ou `.env.local`, `.env.production`, chaves `*.pem`/`*.key`).
   Para saber quais variáveis existem, leia **somente** `.env.example`.
2. Colocar senha, token, segredo JWT ou credencial em código, logs, testes, README, commits ou mensagens de erro.
3. Executar comandos que imprimem o ambiente (`printenv`, `env`, `docker compose config`, `docker inspect` com variáveis).
4. Executar ações destrutivas ou irreversíveis sem pedido explícito do usuário: `rm -rf`, `docker compose down -v`,
   `docker volume rm`, `DROP`/`TRUNCATE`, `git push --force`, `git reset --hard`.
5. Publicar portas além do Nginx no `docker-compose.yml` (MySQL, backend e frontend ficam só na rede interna).
6. Desativar, contornar ou enfraquecer autenticação, validação de CPF/senha, ou permitir alterar o e-mail do usuário.
7. Instalar dependências novas sem justificar a necessidade, nem baixar e executar scripts de origem desconhecida.
8. Alterar arquivos fora do escopo do pedido (refatorações "de brinde") ou reescrever o histórico do Git.

O agente **DEVE**:

- Propor o plano antes de mudanças grandes e perguntar quando o pedido for ambíguo.
- Rodar `npm run typecheck` e `npm test` antes de dizer que terminou, e informar o que não pôde verificar.
- Manter o `.env` fora do Git (já está no `.gitignore`) e registrar novas variáveis **apenas** em `.env.example`.
- Citar arquivos e linhas ao explicar uma mudança.

## 5. Proteção de arquivos sensíveis

| Arquivo / padrão                          | Regra                                               |
|-------------------------------------------|-----------------------------------------------------|
| `.env`, `.env.local`, `.env.production`   | Nunca ler, mostrar ou editar                        |
| `.env.example`                            | Pode ler e editar (só valores de exemplo, sem segredos reais) |
| `*.pem`, `*.key`, `secrets/`              | Nunca ler                                           |
| `db/init.sql`                             | Pode ler; não colocar dados reais de usuários       |

A regra não depende só deste texto: ela é **imposta pela configuração** em `.claude/settings.json`
(bloqueios `deny` de leitura/edição e dos comandos que imprimem o ambiente). Se uma tarefa parecer exigir o `.env`,
**pare e peça ao usuário** que ajuste o valor manualmente.
