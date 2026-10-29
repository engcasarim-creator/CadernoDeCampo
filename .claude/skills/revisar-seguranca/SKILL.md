---
name: revisar-seguranca
description: Revisa mudanças de autenticação, rotas, SQL, Docker e variáveis de ambiente contra um checklist de segurança do projeto. Use antes de concluir qualquer alteração sensível ou quando o usuário pedir uma revisão de segurança.
---

# Skill: revisar-seguranca

Revise **somente o diff/arquivos relevantes**. Nunca abra `.env` — para variáveis, use `.env.example`.
Entregue um relatório com: ✅ ok, ⚠️ atenção, ❌ problema — sempre com arquivo e linha.

## Checklist

### Autenticação e autorização
- [ ] Toda rota de CRUD passa por `authenticate` (`createCrudRouter` já aplica; confira rotas novas em `app.ts`).
- [ ] O `userId` vem do **token** (`requireAuth(req)`), nunca do corpo ou da URL.
- [ ] Consultas filtram pelo usuário dono (`ownerColumn`); outro usuário recebe `404`, não os dados.
- [ ] `PUT /usuarios/:id` só aceita o próprio usuário (`403`) e **nunca** altera o e-mail.
- [ ] Login devolve a mesma mensagem para "usuário não existe" e "senha errada".

### Dados e SQL
- [ ] Valores sempre parametrizados (`?`); nomes de tabela/coluna só vêm do código.
- [ ] Senha só com bcrypt; `senhaHash` nunca aparece em `toJSON()`, logs ou respostas.
- [ ] Toda entrada passa por `BodyReader` / validações (CPF, e-mail, força da senha, números, datas).
- [ ] Tamanhos máximos definidos (strings, corpo JSON).

### Segredos e configuração
- [ ] Nenhum segredo no código, testes, README ou logs; `.env` no `.gitignore`.
- [ ] Novas variáveis documentadas **só** em `.env.example` e usadas com `${VAR:?mensagem}` no compose.
- [ ] `JWT_SECRET` longo e aleatório; expiração do token definida.

### Docker e rede
- [ ] Apenas o `nginx` tem `ports:`; MySQL, backend e frontend só na `rede_interna` (`internal: true`).
- [ ] Containers de aplicação rodam sem root (`USER node`); imagens com versão fixa.
- [ ] Volume nomeado para o MySQL; nenhuma credencial em `Dockerfile`.

### Respostas de erro
- [ ] `errorHandler` devolve mensagem genérica no `500` (sem stack trace, sem SQL).
- [ ] Cabeçalhos de segurança ativos (`helmet`).

## Saída esperada
Lista de achados priorizada + sugestão de correção objetiva. Não faça correções fora do escopo sem pedir.
