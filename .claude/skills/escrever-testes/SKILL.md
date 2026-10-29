---
name: escrever-testes
description: Escreve testes automatizados (Vitest) para regras de negócio, validações e rotas da API do Caderno de Campo. Use ao criar ou alterar services, entidades, validações ou rotas.
---

# Skill: escrever-testes

Os testes ficam em `backend/tests/` e rodam com `cd backend && npm test`. **Nenhum teste usa MySQL.**

## Que tipo de teste escrever

| O que testar                    | Como                                                                                         |
|---------------------------------|----------------------------------------------------------------------------------------------|
| Função pura (CPF, senha, e-mail)| Teste unitário direto — veja `validators.test.ts`                                            |
| Entidade / polimorfismo         | Instancie pela fábrica e verifique `calcularCusto()`, `toJSON()` e os erros — `atividade.test.ts` |
| Service                         | Dublês em memória que implementam os **contratos** (`UsuarioRepository`, `PasswordHasher`...) — `authService.test.ts` |
| Rota HTTP                       | `createApp` + `InMemoryRepository` + `fetch` — `api.test.ts`                                  |

## Checklist de cenários (cubra os que se aplicam)
1. Caminho feliz.
2. Campo obrigatório ausente e valor inválido → `400` com `details` por campo.
3. Sem token / token falso → `401`.
4. Usuário tentando acessar ou editar dado de **outro** usuário → `404` (recurso) ou `403` (perfil).
5. Registro inexistente em `PUT`/`DELETE` → `404`.
6. Paginação (`page`, `limit`, `total`, `totalPages`) e parâmetros inválidos.
7. Relacionamento: pai inexistente ou de outro usuário → `404`.

## Regras
- Sem `any` nos testes (use `unknown`, interfaces pequenas ou `toMatchObject`).
- Nunca coloque segredos reais: use valores fictícios (`'segredo-de-teste'`). Não leia `.env`.
- Nomeie os testes em português descrevendo o comportamento ("rejeita CPF inválido").
- Termine rodando `npm run typecheck && npm test` e informe o resultado.
