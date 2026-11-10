# Roteiro do vídeo (máx. 10 min — alvo: 9 min)

Grave a tela com o sistema já no ar (`docker compose up --build` feito antes) e o VS Code aberto no projeto.

| Tempo | O que mostrar | O que falar |
|---|---|---|
| 0:00–0:40 | Slide ou README | Quem é a persona (produtor rural que anota no caderno/WhatsApp) e o que o sistema resolve |
| 0:40–2:00 | `docker-compose.yml` e `nginx/nginx.conf`; terminal com `docker compose ps` | 4 serviços, só o Nginx publica porta, rede interna, volume do MySQL, proxy `/` e `/api` |
| 2:00–3:00 | Tela de cadastro | CPF inválido, senha fraca, confirmação de senha diferente; cadastro válido → redireciona ao login |
| 3:00–3:40 | Login | E-mail inválido, senha errada (erro amigável); login correto → área logada; mostrar o token no `localStorage` (F12) |
| 3:40–4:20 | Perfil | Dados vindos do contexto; e-mail bloqueado; CPF e senha validados |
| 4:20–6:30 | CRUDs | Criar propriedade → talhão → safra → 3 atividades (plantio, aplicação, colheita) com custo calculado; paginação; editar; excluir. Mostrar o erro ao cadastrar um talhão maior que a área disponível da propriedade |
| 6:30–7:00 | Gráfico em Atividades | Painel "Plantio × Colheita": semente plantada × colhido (kg) e custo do plantio × da colheita |
| 7:00–7:40 | Área do administrador e mapa | Login como admin: Usuários (editar, e-mail travado), Tipos de atividade (Tratorista: 8 h × R$ 80 = R$ 640 numa atividade) e o mapa da tela inicial com as propriedades. Mostre também a regra de segurança: tentar cadastrar o mesmo CAR em outra conta (409) e a transferência pelo admin com histórico |
| 7:40–8:10 | Contestação | Como o dono real pede a terra: cadastro bloqueado → "Este imóvel é meu" → PDFs; o admin abre o PDF, defere/indefere com motivo; o usuário vê o aviso (sino) e o e-mail |
| 8:10–8:30 | Código do back | `entities/atividades` (abstract + polimorfismo), `BaseRepository<T>` (generics), `errors/`, camadas |
| 8:30–9:00 | `AGENTS.md`, `.claude/skills`, `.claude/settings.json` | 3 skills, guardrails, `.env` protegido |
| 9:00–9:40 | `docker compose down` e `up` de novo | Os dados continuam (volume); encerramento |

Dica: deixe uma conta e alguns registros prontos para não perder tempo digitando.
