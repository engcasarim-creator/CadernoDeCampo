---
name: criar-crud
description: Cria um novo recurso CRUD completo (banco, back-end, front-end e testes) seguindo o padrão do projeto. Use quando o usuário pedir uma nova entidade/recurso, por exemplo "adicione o CRUD de Insumos".
---

# Skill: criar-crud

Siga **exatamente** esta ordem. Use `Propriedade`/`Talhao` como modelos de referência.

## Antes de começar
- Descubra com o usuário: nome do recurso (singular/plural), campos (tipo, obrigatório?), e **de quem ele depende** (recurso "pai").
- Leia `AGENTS.md` (convenções e guardrails). Nunca leia `.env`.

## Passos

1. **Banco** — acrescente a tabela em `db/init.sql` (`snake_case`, FK com `ON DELETE CASCADE` para o pai).
   Lembre: o usuário dono é descoberto por JOIN até `propriedades.usuario_id`.
2. **Entidade** — `backend/src/entities/<Nome>.ts`: estende `Entity<Props>`, campos `#privados`, validação de
   invariantes no construtor (lançando `ValidationError`), `toProps()` e `toJSON()`. Getters só com regra de negócio.
3. **Repositório** — `backend/src/repositories/<Nome>Repository.ts`: estende `BaseRepository`; informe `table`, `alias`,
   `joins`, `ownerColumn`, `fromRow` e `toColumns`. Não escreva SQL de CRUD de novo.
4. **Service** — `backend/src/services/<Nome>Service.ts`: estende `CrudService`; implemente `build()` com `BodyReader`
   e, se houver pai, `assertParents()` (404 se o pai não existir ou for de outro usuário). Declare `filtros` se
   a listagem puder ser filtrada pelo pai.
5. **Ligação** — registre repositório, service e `CrudController` em `backend/src/container.ts` e a rota em
   `backend/src/app.ts` com `createCrudRouter(controller, authenticate)` (**toda rota autenticada e paginada**).
6. **Front-end** — acrescente o tipo em `frontend/src/types/index.ts`, o cliente com `createResourceApi<T>()` em
   `frontend/src/api/resources.ts`, a configuração (campos, colunas, `toValues`, `toPayload`) em
   `frontend/src/config/resources.ts`, as rotas via `resourceRoutes()` em `App.tsx` e o link no `Navbar.tsx`.
7. **Testes** — aplique a skill `escrever-testes`.
8. **Conferência** — `npm run typecheck` e `npm test` no back-end; `npm run build` no front-end.

## Não faça
- Não use `any`, não exponha campos públicos, não pule a autenticação, não filtre pelo usuário só no front-end.
