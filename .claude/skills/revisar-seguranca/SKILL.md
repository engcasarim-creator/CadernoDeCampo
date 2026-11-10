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

### Unicidade e vazamento entre usuários
- [ ] Todo identificador que pertence a UM dono (CAR, CCIR, centroide da propriedade) é checado contra **todos** os usuários, pela
      porta `RegistroDePropriedades`, e também tem índice `UNIQUE` no banco (a checagem do service sozinha tem corrida).
- [ ] Conflito com OUTRO usuário responde `409` com mensagem genérica: sem nome, e-mail, id ou propriedade de quem cadastrou.
- [ ] Consultas globais ficam em porta pequena e só de leitura; nunca expostas em rota nem devolvidas ao cliente.
- [ ] Ações do administrador que mudam dono/permissão (transferência de propriedade) gravam histórico de auditoria na MESMA transação e exigem motivo.
- [ ] Novos identificadores são normalizados (maiúsculas, sem pontuação) antes de comparar e de gravar.

### Upload de arquivos e e-mail
- [ ] Upload só em rota autenticada (o `authenticate` vem ANTES do multer); limites de tamanho, quantidade e campos definidos.
- [ ] O tipo é conferido pelo CONTEÚDO (ex.: `%PDF-`), não só por extensão/MIME; o nome enviado nunca vira caminho em disco
      (chave gerada pelo servidor, validada no armazenamento).
- [ ] Download só para o dono do arquivo ou ADMIN; para outro usuário responde `404`; resposta com `nosniff`, sem cache e CSP restritivo.
- [ ] Se gravar no banco falhar, os arquivos já salvos são removidos (sem órfãos).
- [ ] O e-mail nunca lança (falha vira status registrado), não leva senha/segredo e não é o único canal do aviso.
- [ ] Credenciais SMTP só em variáveis de ambiente (`.env.example` documenta, nunca o valor real).

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
- [ ] Apenas o `nginx` tem `ports:`; MySQL, backend e frontend só na `rede_interna` (`internal: true`); a `rede_saida` do backend é só
      para conexões de saída (SMTP) e nenhum serviço publica porta nela.
- [ ] Containers de aplicação rodam sem root (`USER node`); imagens com versão fixa.
- [ ] Volume nomeado para o MySQL; nenhuma credencial em `Dockerfile`.

### Respostas de erro
- [ ] `errorHandler` devolve mensagem genérica no `500` (sem stack trace, sem SQL).
- [ ] Cabeçalhos de segurança ativos (`helmet`).

## Saída esperada
Lista de achados priorizada + sugestão de correção objetiva. Não faça correções fora do escopo sem pedir.
