import type { PagedResult, PageRequest } from '../../shared/types';
import type { Usuario } from './Usuario';

export interface UsuarioRepository {
  findById(id: number): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  findByCpf(cpf: string): Promise<Usuario | null>;
  /** Listagem paginada de todos os usuários (uso exclusivo da área de administração). */
  findPage(request: PageRequest): Promise<PagedResult<Usuario>>;
  create(usuario: Usuario): Promise<Usuario>;
  update(usuario: Usuario): Promise<Usuario>;
}
