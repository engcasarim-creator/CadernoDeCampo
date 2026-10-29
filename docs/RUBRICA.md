# Rubrica × código

Onde cada critério é atendido. Use como guia para a correção e para o vídeo.

## Back-end com IA generativa

| Critério | Onde |
|---|---|
| Login por e-mail/senha, senha criptografada, regex de e-mail, JWT, só usuário existente | `services/AuthService.ts`, `security/BcryptPasswordHasher.ts`, `security/JwtTokenService.ts`, `utils/validators.ts` |
| Cadastro: nome, e-mail, senha, CPF; valida CPF, força da senha e e-mail | `services/AuthService.ts` + `utils/BodyReader.ts` |
| Edição: rota autenticada, só o próprio usuário (403), campos obrigatórios, CPF/senha validados, e-mail imutável | `services/UserService.ts` (`atualizar`), rota `PUT /api/usuarios/:id` em `app.ts` |
| 4 CRUDs (Propriedades, Talhões, Safras, Atividades), autenticados, paginados, 404 em recurso inexistente, relacionamentos; regra de área do talhão (`assertBusinessRules`) | `services/CrudService.ts`, `controllers/CrudController.ts`, `routes/createCrudRouter.ts`, `repositories/BaseRepository.ts` |
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
| Isolamento: só o Nginx exposto | só o `nginx` tem `ports`; `rede_interna` é `internal: true` |

## Tech Forge (TypeScript e POO)

| Critério | Onde |
|---|---|
| Encapsulamento (`private`/`#campo`, construtores) | `entities/*` e `utils/BodyReader.ts` (`#campos`) |
| Acesso controlado: getters só do que precisa ser exposto; sem setters públicos — alterações passam por métodos que revalidam (ex.: `Usuario.comPerfilAtualizado`) | `entities/Usuario.ts`, `Propriedade.ts`, `Talhao.ts`, `Safra.ts` |
| Herança, classe abstrata, polimorfismo | `entities/Entity.ts`; `entities/atividades/` (`Atividade` → `Plantio`, `Aplicacao`, `Colheita`) |
| Interfaces, type aliases, sem `any`, Generics | `contracts/`, `types/`, `BaseRepository<T>`, `CrudService<T>`, `CrudController<T>` |
| SOLID: S (uma responsabilidade por classe), O (novos tipos de atividade via `AtividadeFactory`), L (subclasses de `Atividade` intercambiáveis) | `services/`, `entities/atividades/AtividadeFactory.ts`, `tests/atividade.test.ts` |
| Exceções customizadas e organização em pastas | `errors/index.ts`; pastas `entities/`, `services/`, `repositories/` |

## Itens de evolução do projeto

- **Conexão com a persona:** produtor rural que hoje usa caderno/WhatsApp (ver o início do README).
- **TypeScript sem JS injetado:** back e front em TS estrito; `npm run typecheck` nos dois.
