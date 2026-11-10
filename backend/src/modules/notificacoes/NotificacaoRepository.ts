import type { PagedResult, PageRequest } from '../../shared/types';
import type { NovaNotificacao, Notificacao } from './Notificacao';

export interface NotificacaoRepository {
  criar(notificacao: NovaNotificacao): Promise<void>;
  /** Só as notificações do usuário, da mais nova para a mais antiga. */
  listar(usuarioId: number, request: PageRequest): Promise<PagedResult<Notificacao>>;
  contarNaoLidas(usuarioId: number): Promise<number>;
  /** false se a notificação não existe OU não é deste usuário (os dois casos são tratados como "não encontrada"). */
  marcarLida(id: number, usuarioId: number): Promise<boolean>;
  marcarTodasLidas(usuarioId: number): Promise<void>;
}
