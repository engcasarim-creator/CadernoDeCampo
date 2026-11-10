import { Router, type RequestHandler } from 'express';
import type { EmailSender } from '../../shared/email';
import type { ArmazenamentoDeArquivos } from '../../shared/storage';
import type { AdministracaoDePropriedades, RegistroDePropriedades } from '../propriedades';
import type { UsuarioRepository } from '../usuarios';
import { ContestacaoAdminController, ContestacaoController } from './ContestacaoController';
import { ContestacaoAdminService } from './ContestacaoAdminService';
import type { ContestacaoRepository } from './ContestacaoRepository';
import { ContestacaoService } from './ContestacaoService';
import type { Notificador } from './Notificador';
import { receberPdfs } from './uploadDePdfs';

export {
  Contestacao,
  type ContestacaoProps,
  type DecisaoDeContestacao,
  type StatusDeContestacao,
  type StatusDoEmail,
} from './Contestacao';
export type { ContestacaoRepository, NovaContestacao, NovoArquivo } from './ContestacaoRepository';
export type { Notificador } from './Notificador';
export { MySqlContestacaoRepository } from './MySqlContestacaoRepository';

export interface ContestacoesDeps {
  repository: ContestacaoRepository;
  /** Portas de outros módulos (só leitura global, e a troca de responsável feita pelo admin). */
  registro: RegistroDePropriedades;
  propriedadesAdmin: AdministracaoDePropriedades;
  usuarios: Pick<UsuarioRepository, 'findById'>;
  notificador: Notificador;
  email: EmailSender;
  arquivos: ArmazenamentoDeArquivos;
  authenticate: RequestHandler;
  adminOnly: RequestHandler[];
}

/** Fatia vertical "contestações": o dono real abre um pedido com PDFs; o administrador decide e avisa. */
export function createContestacoesModule(deps: ContestacoesDeps): Router {
  const { repository, registro, propriedadesAdmin, usuarios, notificador, email, arquivos, authenticate, adminOnly } = deps;
  const usuario = new ContestacaoController(new ContestacaoService(repository, registro, arquivos));
  const admin = new ContestacaoAdminController(
    new ContestacaoAdminService(repository, propriedadesAdmin, usuarios, arquivos, notificador, email),
  );

  const router = Router();
  router.post('/api/contestacoes', authenticate, receberPdfs, usuario.abrir);
  router.get('/api/contestacoes', authenticate, usuario.listar);
  router.get('/api/contestacoes/:id', authenticate, usuario.obter);
  router.get('/api/contestacoes/:id/arquivos/:arquivoId', authenticate, usuario.arquivo);

  router.get('/api/admin/contestacoes', ...adminOnly, admin.listar);
  router.get('/api/admin/contestacoes/:id', ...adminOnly, admin.obter);
  router.get('/api/admin/contestacoes/:id/arquivos/:arquivoId', ...adminOnly, admin.arquivo);
  router.put('/api/admin/contestacoes/:id/decisao', ...adminOnly, admin.decidir);
  return router;
}
