import type { Router } from 'express';
import type { ScopedRepository } from '../shared/crud/ScopedRepository';
import { createAuthenticate } from '../shared/security/authenticate';
import type { PasswordHasher } from '../shared/security/PasswordHasher';
import type { TokenService } from '../shared/security/TokenService';
import type { EmailSender } from '../shared/email';
import type { ArmazenamentoDeArquivos } from '../shared/storage';
import { createAtividadesModule, type Atividade } from './atividades';
import { createAutenticacaoModule } from './autenticacao';
import { createContestacoesModule, type ContestacaoRepository } from './contestacoes';
import { createNotificacoesModule, type NotificacaoRepository, NotificacaoService } from './notificacoes';
import {
  createPropriedadesModule,
  type AdministracaoDePropriedades,
  type AreaPorPropriedade,
  type Propriedade,
  type RegistroDePropriedades,
} from './propriedades';
import { createSafrasModule, type Safra } from './safras';
import { createTalhoesModule, type Talhao } from './talhoes';
import { createTiposAtividadeModule, type TipoPersonalizadoRepository, type UsoDeTipo } from './tipos-atividade';
import { createRequireAdmin, createUsuariosModule, type UsuarioRepository } from './usuarios';

/** Tudo o que os módulos precisam de fora: repositórios (MySQL em produção, memória nos testes) e segurança. */
export interface ModulosDeps {
  hasher: PasswordHasher;
  tokens: TokenService;
  usuarios: UsuarioRepository;
  propriedades: ScopedRepository<Propriedade> & RegistroDePropriedades;
  propriedadesAdmin: AdministracaoDePropriedades;
  talhoes: ScopedRepository<Talhao> & AreaPorPropriedade;
  safras: ScopedRepository<Safra>;
  atividades: ScopedRepository<Atividade> & UsoDeTipo;
  tipos: TipoPersonalizadoRepository;
  contestacoes: ContestacaoRepository;
  notificacoes: NotificacaoRepository;
  email: EmailSender;
  /** Onde ficam os PDFs enviados nas contestações. */
  arquivos: ArmazenamentoDeArquivos;
}

/**
 * Liga os módulos (fatias verticais). Cada módulo devolve o próprio router, com as suas URLs;
 * o `app.ts` só monta a lista, sem conhecer rotas de domínio.
 */
export function createModulos(deps: ModulosDeps): Router[] {
  const authenticate = createAuthenticate(deps.tokens);
  /** Área de administração: precisa estar logado E ser ADMIN. */
  const adminOnly = [authenticate, createRequireAdmin(deps.usuarios)];
  // Um só serviço de notificações: o módulo expõe as rotas e as contestações o usam para avisar o usuário.
  const notificacoes = new NotificacaoService(deps.notificacoes);

  return [
    createAutenticacaoModule({ usuarios: deps.usuarios, hasher: deps.hasher, tokens: deps.tokens }),
    createUsuariosModule({ repository: deps.usuarios, hasher: deps.hasher, authenticate, adminOnly }),
    createTiposAtividadeModule({ repository: deps.tipos, uso: deps.atividades, authenticate, adminOnly }),
    createPropriedadesModule({
      repository: deps.propriedades,
      areas: deps.talhoes,
      registro: deps.propriedades,
      authenticate,
      admin: deps.propriedadesAdmin,
      usuarios: deps.usuarios,
      adminOnly,
    }),
    createTalhoesModule({ repository: deps.talhoes, propriedades: deps.propriedades, authenticate }),
    createSafrasModule({ repository: deps.safras, talhoes: deps.talhoes, authenticate }),
    createAtividadesModule({ repository: deps.atividades, safras: deps.safras, tipos: deps.tipos, authenticate }),
    createNotificacoesModule({ service: notificacoes, authenticate }),
    createContestacoesModule({
      repository: deps.contestacoes,
      registro: deps.propriedades,
      propriedadesAdmin: deps.propriedadesAdmin,
      usuarios: deps.usuarios,
      notificador: notificacoes,
      email: deps.email,
      arquivos: deps.arquivos,
      authenticate,
      adminOnly,
    }),
  ];
}
