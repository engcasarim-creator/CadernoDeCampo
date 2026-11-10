import { Router, type RequestHandler } from 'express';
import { CrudController } from '../../shared/crud/CrudController';
import { createCrudRouter } from '../../shared/crud/createCrudRouter';
import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import type { AreaPorPropriedade } from './AreaPorPropriedade';
import type { UsuarioRepository } from '../usuarios';
import type { AdministracaoDePropriedades } from './AdministracaoDePropriedades';
import { PropriedadeAdminController } from './PropriedadeAdminController';
import { PropriedadeAdminService } from './PropriedadeAdminService';
import type { RegistroDePropriedades } from './RegistroDePropriedades';
import type { Propriedade } from './Propriedade';
import { PropriedadeService } from './PropriedadeService';

export type { AreaPorPropriedade } from './AreaPorPropriedade';
export { Propriedade, type PropriedadeProps } from './Propriedade';
export type { PropriedadeRegistrada, RegistroDePropriedades } from './RegistroDePropriedades';
export {
  formatarCar,
  formatarCcir,
  normalizarCar,
  normalizarCcir,
  problemaNoCar,
  problemaNoCcir,
} from './identificadores';
export { PropriedadeRepository } from './PropriedadeRepository';
export { MySqlAdministracaoDePropriedades } from './MySqlAdministracaoDePropriedades';
export type {
  AdministracaoDePropriedades,
  NovaTransferencia,
  PropriedadeComResponsavel,
  Responsavel,
  Transferencia,
} from './AdministracaoDePropriedades';

export interface PropriedadesDeps {
  repository: ScopedRepository<Propriedade>;
  /** Porta implementada pelo módulo de talhões (área já alocada). */
  areas: AreaPorPropriedade;
  /** Consulta global (todos os usuários) usada só para impedir propriedade duplicada. */
  registro: RegistroDePropriedades;
  authenticate: RequestHandler;
  /** Visão de administrador (todas as propriedades, troca de responsável). */
  admin: AdministracaoDePropriedades;
  /** Para conferir o usuário de destino de uma transferência. */
  usuarios: Pick<UsuarioRepository, 'findById'>;
  /** Guardas da área de administração (login + papel ADMIN). */
  adminOnly: RequestHandler[];
}

/** Fatia vertical "propriedades": expõe só o router; tudo o mais fica interno ao módulo. */
export function createPropriedadesModule({
  repository,
  areas,
  registro,
  authenticate,
  admin,
  usuarios,
  adminOnly,
}: PropriedadesDeps): Router {
  const router = Router();
  // Administração: vem ANTES do CRUD, que também usa "/api/propriedades/...", mas em outro prefixo.
  const adminController = new PropriedadeAdminController(new PropriedadeAdminService(admin, usuarios));
  router.get('/api/admin/propriedades', ...adminOnly, adminController.listar);
  router.get('/api/admin/propriedades/:id', ...adminOnly, adminController.obter);
  router.post('/api/admin/propriedades/:id/transferencia', ...adminOnly, adminController.transferir);
  router.use('/api/propriedades', createCrudRouter(new CrudController(new PropriedadeService(repository, areas, registro)), authenticate));
  return router;
}
