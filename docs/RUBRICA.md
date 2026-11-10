# Rubrica × código

Onde cada critério é atendido. Use como guia para a correção e para o vídeo.

## Back-end com IA generativa

| Critério | Onde |
|---|---|
| Login por e-mail/senha, senha criptografada, regex de e-mail, JWT, só usuário existente | `modules/autenticacao/AuthService.ts`, `shared/security/BcryptPasswordHasher.ts`, `shared/security/JwtTokenService.ts`, `shared/utils/validators.ts` |
| Cadastro: nome, e-mail, senha, CPF; valida CPF, força da senha e e-mail | `modules/autenticacao/AuthService.ts` + `shared/utils/BodyReader.ts` |
| Edição: rota autenticada, só o próprio usuário (403), campos obrigatórios, CPF/senha validados, e-mail imutável | `modules/usuarios/UserService.ts` (`atualizar`), rota `PUT /api/usuarios/:id` em `modules/usuarios/index.ts` |
| 4 CRUDs (Propriedades, Talhões, Safras, Atividades), autenticados, paginados, 404 em recurso inexistente, relacionamentos; regra de área do talhão (`assertBusinessRules`) | `shared/crud/` (`CrudService`, `CrudController`, `createCrudRouter`, `BaseRepository`) + um módulo por recurso em `modules/` |
| AGENTS.md, 3 skills, guardrails, proteção do `.env` | `AGENTS.md`, `.claude/skills/*`, `.claude/settings.json` |

## Front-end

| Critério | Onde |
|---|---|
| Login: validação de e-mail, token no `localStorage`, erros amigáveis, redirecionamento | `pages/LoginPage.tsx`, `api/client.ts`, `context/AuthContext.tsx` |
| Cadastro: campos obrigatórios, confirmação de senha, CPF, e-mail, redireciona ao login | `pages/RegisterPage.tsx`, `utils/formValidation.ts` |
| Edição: contexto global do usuário, CPF, senha, confirmação, e-mail bloqueado | `pages/ProfilePage.tsx`, `context/AuthContext.tsx` |
| 4 CRUDs: paginação, validação, listagem e cadastro/edição em telas separadas | `pages/ResourceListPage.tsx`, `pages/ResourceFormPage.tsx`, `config/resources.ts`, rotas em `App.tsx` |
| Componentização: genéricos reutilizáveis, telas compostas, pastas separadas | `components/ui`, `components/forms`, `components/layout`, `pages/` |

## DevOps

| Critério | Onde |
|---|---|
| `docker-compose.yml` organizado (serviços, volumes, redes, variáveis) | `docker-compose.yml` |
| Integração: backend↔MySQL, frontend↔backend, Nginx como proxy | `nginx/nginx.conf`, variáveis `DB_*` no compose |
| Persistência no MySQL | volume nomeado `mysql_data` |
| Nginx como proxy reverso | `nginx/nginx.conf` (`/api` → backend, `/` → frontend) |
| Isolamento: só o Nginx exposto | só o `nginx` tem `ports`; `rede_interna` é `internal: true` (a `rede_saida` do backend só permite conexões de saída, para o SMTP) |
| Persistência dos PDFs enviados | volume nomeado `uploads_data` em `/app/uploads`; limite de 30 MB só em `/api/contestacoes` no Nginx |

## Tech Forge (TypeScript e POO)

| Critério | Onde |
|---|---|
| Encapsulamento (`private`/`#campo`, construtores) | `modules/*/<Entidade>.ts` e `shared/utils/BodyReader.ts` (`#campos`) |
| Acesso controlado: getters só do que precisa ser exposto; sem setters públicos — alterações passam por métodos que revalidam (ex.: `Usuario.comPerfilAtualizado`) | `modules/usuarios/Usuario.ts`, `modules/propriedades/Propriedade.ts`, `modules/talhoes/Talhao.ts`, `modules/safras/Safra.ts` |
| Área de administrador (papéis ADMIN/USUARIO, `requireAdmin` consultando o banco), tipos de atividade criados em tempo de execução (`TipoPersonalizado` + `AtividadePersonalizada`, sem alterar o código — OCP) e migrações automáticas | `modules/usuarios/requireAdmin.ts`, `modules/usuarios/AdminUsuarioService.ts`, `modules/tipos-atividade/TipoPersonalizadoService.ts`, `database/migrations.ts`, `tests/admin.test.ts`; front: `pages/TipoAtividadeFormPage.tsx` |
| Segurança do cadastro: propriedade com um único responsável (CAR + CCIR + centroide a ≥ 50 m), índices `UNIQUE`, resposta que não vaza o outro dono | `modules/propriedades/` (`identificadores.ts`, `PropriedadeService`, `RegistroDePropriedades`), `shared/utils/geo.ts`, migrações 7–11, `tests/propriedadeUnica.test.ts` |
| Resolução de disputa de propriedade pelo administrador: busca global, transferência atômica com histórico de auditoria (transação + `UPDATE ... AND usuario_id = ?` contra corrida) | `modules/propriedades/` (`PropriedadeAdminService`, `MySqlAdministracaoDePropriedades`), migração 12, `tests/adminPropriedades.test.ts`; front: `pages/PropriedadesAdminPage.tsx`, `PropriedadeAdminDetalhePage.tsx` |
| Contestação de propriedade: upload de PDFs (validação por conteúdo, limites, chaves geradas), decisão do administrador com reserva atômica (`UPDATE ... WHERE status='EM_ANALISE'`) e compensação, aviso no sistema + e-mail por portas (`EmailSender`, `ArmazenamentoDeArquivos`, `Notificador`: DIP) | `modules/contestacoes/`, `modules/notificacoes/`, `shared/email/`, `shared/storage/`, migrações 13–15, `tests/contestacao.test.ts`, `tests/infraestrutura.test.ts`; front: `pages/ContestacaoNovaPage.tsx`, `MinhasContestacoesPage.tsx`, `ContestacoesAdminPage.tsx`, `ContestacaoAdminDetalhePage.tsx`, `NotificacoesPage.tsx` |
| Herança, classe abstrata, polimorfismo | `shared/crud/Entity.ts`; `modules/atividades/` (`Atividade` → `Plantio`, `Aplicacao`, `Colheita`) |
| Interfaces, type aliases, sem `any`, Generics | interfaces por módulo (`AreaPorPropriedade`, `UsuarioRepository`, ...), `shared/types/`, `BaseRepository<T>`, `CrudService<T>`, `CrudController<T>` |
| SOLID: S (uma responsabilidade por classe), O (novos tipos de atividade via `AtividadeFactory`), L (subclasses de `Atividade` intercambiáveis) | `modules/*/` (um módulo por domínio), `modules/atividades/AtividadeFactory.ts`, `tests/atividade.test.ts` |
| Exceções customizadas e organização em pastas | `shared/errors/index.ts`; arquitetura por funcionalidade: `modules/<dominio>/` (vertical slices) + `shared/`, com `tests/architecture.test.ts` impondo as fronteiras |

## Itens de evolução do projeto

- **Conexão com a persona:** produtor rural que hoje usa caderno/WhatsApp (ver o início do README).
- **TypeScript sem JS injetado:** back e front em TS estrito; `npm run typecheck` nos dois.
