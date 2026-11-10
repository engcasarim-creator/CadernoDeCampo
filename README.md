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

**Administrador:** preencha `ADMIN_EMAIL`, `ADMIN_CPF` (válido) e `ADMIN_SENHA` (forte) no `.env`. Ao subir, a API cria esse usuário
(ou promove-o, se o e-mail já existir). Ele passa a ver **Usuários** e **Tipos de atividade** no menu.

**Mapa da tela inicial:** informe `GOOGLE_MAPS_API_KEY` no `.env` (chave da *Maps JavaScript API*) e rode `docker compose up --build`
de novo (a chave entra no build do front). A chave fica visível no navegador, então **restrinja-a por "Referenciadores HTTP"** no
Google Cloud. Sem chave, o painel mostra a lista de propriedades com links para o Google Maps.

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
MySQL, backend e frontend não publicam nenhuma porta. O backend também entra na `rede_saida` (só conexões de saída) para enviar
e-mail por SMTP. Os PDFs das contestações ficam no volume nomeado `uploads_data` (`/app/uploads`).

## Modelo de dados

`Propriedade 1─N Talhão 1─N Safra 1─N Atividade`, todas pertencentes a um usuário (cada usuário só enxerga os seus dados).
`Atividade` é abstrata, com `Plantio`, `Aplicacao` e `Colheita` sobrescrevendo `calcularCusto()` e `contribuirPara()` (polimorfismo).

**Administração:** usuários têm papel `USUARIO` ou `ADMIN`. O administrador lista e edita usuários (nome, CPF, perfil, nova senha;
o e-mail continua imutável; não pode rebaixar a si mesmo) e cadastra **tipos de atividade** com campos próprios. Exemplo já incluído
(migração 6): **Tratorista** = *horas de tratorista* × *valor por hora*; o custo da atividade é o produto dos campos marcados como
"entra no custo". Um tipo em uso não pode ser excluído nem ter seus campos alterados. Toda propriedade tem **latitude/longitude do
centroide**, usadas no mapa da tela inicial (propriedades antigas sem coordenadas precisam ser editadas).

**Uma propriedade, um responsável:** o cadastro exige **CAR** e **CCIR** e recusa (409) a propriedade que já exista em qualquer
conta, por três critérios: mesmo CAR, mesmo CCIR ou **centroide a menos de 50 m** de outra propriedade (distância de Haversine).
Os dois números têm índice `UNIQUE` no banco (vale mesmo com duas requisições simultâneas). Se o conflito é com outro usuário, a
resposta é genérica e **nunca revela quem cadastrou**. O sistema confere só o **formato** (CAR: `UF-IBGE-32 hexadecimais`, com a UF
igual à da propriedade e o código do município coerente; CCIR: 13 dígitos), **não consulta o SICAR/INCRA**: não prova que o número
é mesmo de quem o digitou. Propriedades antigas ficam sem CAR/CCIR até serem editadas.

**Quando alguém cadastra a propriedade de outra pessoa:** o dono real é barrado (409) e o formulário oferece **"Este imóvel é meu:
abrir pedido de contestação"** (veja o fluxo abaixo). Em **Propriedades (admin)** o administrador vê todas as propriedades com o responsável, localiza a disputada pelo CAR/CCIR (a busca aceita
o número colado com pontuação) e a **transfere** para o usuário correto, informando o motivo (mínimo de 10 caracteres). Talhões, safras e
atividades acompanham a propriedade. A troca e o registro no histórico (quem transferiu, de quem, para quem, quando, por quê) acontecem
na mesma transação do banco, e o histórico aparece no detalhe da propriedade.

**Contestação (o dono real prova que a terra é dele):** em **Contestações → Novo pedido** o usuário informa o CAR (e o CCIR), explica
por que o imóvel é dele e anexa de 1 a 5 **PDFs** (até 5 MB cada). O sistema localiza a propriedade pelo CAR/CCIR, mas **nunca mostra
quem a cadastrou**. Os PDFs ficam guardados no volume `uploads_data` (nome gerado pelo servidor; o nome original é só um rótulo). Em
**Contestações (admin)** o administrador vê a fila (com contador no menu), **abre os PDFs**, confere o responsável atual e **defere ou
indefere** com um motivo curto (10 a 300 caracteres). Ao decidir, o solicitante é avisado **no sistema** (sino 🔔 com contador, tela
Avisos) e **por e-mail**, sempre com o motivo. Deferir **transfere a propriedade** (com talhões, safras e atividades, e o registro no
histórico de transferências); indeferir não muda nada. Cada pedido só é decidido uma vez (duas decisões simultâneas: uma passa, a outra
recebe 409) e, se a transferência falhar, o pedido volta para "em análise". O e-mail é opcional (variáveis `SMTP_*` do `.env.example`):
sem SMTP ou com o servidor fora do ar, a decisão vale mesmo assim e o pedido mostra "e-mail não enviado".

**Migrações:** mudanças de esquema depois do `db/init.sql` ficam em `backend/src/database/migrations.ts` e rodam sozinhas ao iniciar a
API (uma vez cada, sem apagar dados).

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
| GET    | `/api/tipos-atividade`                | sim  | Tipos criados pelo administrador   |
| GET/PUT| `/api/admin/usuarios[/:id]`           | ADMIN| Lista e edita usuários             |
| GET    | `/api/admin/propriedades[/:id]`       | ADMIN| Todas as propriedades + responsável + histórico |
| POST   | `/api/admin/propriedades/:id/transferencia` | ADMIN | Troca o responsável (com motivo) |
| POST   | `/api/contestacoes`                   | sim  | Abre o pedido (multipart: `car`, `ccir`, `justificativa`, `arquivos` PDF) |
| GET    | `/api/contestacoes[/:id]`, `/:id/arquivos/:arquivoId` | sim | Só os pedidos e PDFs do próprio usuário |
| GET    | `/api/admin/contestacoes[/:id]`, `/:id/arquivos/:arquivoId` | ADMIN | Fila (`?status=`), detalhe e leitura dos PDFs |
| PUT    | `/api/admin/contestacoes/:id/decisao` | ADMIN| Defere/indefere com motivo; avisa no sistema e por e-mail |
| GET/PUT| `/api/notificacoes`, `/:id/lida`, `/lidas` | sim | Avisos do usuário (sino) |
| CRUD   | `/api/admin/tipos-atividade`          | ADMIN| Tipos de atividade personalizados  |
| GET    | `/api/health`                         | não  | Healthcheck do Docker              |

## Estrutura do código

O back-end é organizado **por funcionalidade (feature-based / vertical slices)**: a pasta já diz o que o sistema faz
(*screaming architecture*), e cada domínio carrega as suas próprias camadas.

```
backend/src
  server.ts, app.ts, container.ts   ponto de entrada e composition root (único que conhece MySQL, bcrypt, JWT)
  modules/                          UM DIRETÓRIO POR DOMÍNIO (fatia vertical)
    autenticacao/   cadastro e login
    usuarios/       perfil, área de administração de usuários, papéis, administrador inicial
    propriedades/   propriedade rural (+ centroide)
    talhoes/        talhões e regra de área
    safras/         safras
    atividades/     atividades (Plantio, Aplicacao, Colheita, Personalizada), fábrica e comparativo
    tipos-atividade/ tipos criados pelo administrador (ex.: Tratorista)
    contestacoes/   pedido do dono real com PDFs, decisão do administrador (deferir/indeferir) e aviso
    notificacoes/   avisos dentro do sistema (sino)
    index.ts        liga os módulos (createModulos)
  shared/           núcleo reutilizável, sem regra de domínio
    crud/ (CrudService, CrudController, BaseRepository, Entity), security/, errors/, http/, utils/, types/,
    email/ (porta EmailSender + SMTP/desativado), storage/ (porta de arquivos + disco local)
  config/, database/                variáveis de ambiente, pool e migrações
```

Dentro de cada módulo ficam juntos entidade, repositório, service, controller e as rotas (`index.ts`, a única porta de entrada).
Regras impostas por `backend/tests/architecture.test.ts`: `shared/` não importa módulos; um módulo usa outro **só pelo `index.ts`**;
não há ciclos (ordem: propriedades ← talhoes ← safras ← atividades → tipos-atividade; autenticacao → usuarios;
contestacoes → propriedades → usuarios; notificacoes não depende de ninguém: a contestação usa a porta `Notificador`). Quando um módulo
precisa de algo de outro, a interface fica com quem **consome** e quem fornece a implementa (ex.: `AreaPorPropriedade`, `UsoDeTipo`).

```
frontend/src
  components/    componentes genéricos e reutilizáveis (ui/, forms/, layout/)
  pages/         telas (Login, Cadastro, Perfil, listagens e formulários dos CRUDs)
  config/        configuração declarativa dos 4 CRUDs
  context/       AuthContext (usuário global)
```

## Qualidade

```bash
cd backend  && npm run typecheck && npm test    # 90 testes (Vitest), sem precisar de MySQL; o e-mail é testado com um servidor SMTP local de verdade
cd frontend && npm run typecheck && npm run build
```

## Agentes de IA

Veja [`AGENTS.md`](AGENTS.md): 3 skills (`.claude/skills/`), guardrails e proteção do `.env`
(aplicada por `.claude/settings.json`).

## Documentos

- [`docs/RUBRICA.md`](docs/RUBRICA.md) — onde cada item da rubrica é atendido no código
- [`docs/ROTEIRO-VIDEO.md`](docs/ROTEIRO-VIDEO.md) — roteiro do vídeo de demonstração (até 10 min)
