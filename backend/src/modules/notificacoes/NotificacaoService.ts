import { NotFoundError } from '../../shared/errors';
import type { Page } from '../../shared/types';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';
import type { Notificacao } from './Notificacao';
import type { NotificacaoRepository } from './NotificacaoRepository';

export interface ListaDeNotificacoes extends Page<Notificacao> {
  naoLidas: number;
}

export class NotificacaoService {
  constructor(private readonly repository: NotificacaoRepository) {}

  /** Usado por outros módulos (ex.: contestações) para avisar um usuário. */
  async notificar(usuarioId: number, titulo: string, mensagem: string): Promise<void> {
    await this.repository.criar({ usuarioId, titulo: titulo.slice(0, 120), mensagem: mensagem.slice(0, 500) });
  }

  async listar(usuarioId: number, query: Record<string, unknown>): Promise<ListaDeNotificacoes> {
    const request = parsePageRequest(query);
    const resultado = await this.repository.listar(usuarioId, request);
    return { ...buildPage(resultado, request), naoLidas: await this.repository.contarNaoLidas(usuarioId) };
  }

  async marcarLida(usuarioId: number, id: number): Promise<void> {
    if (!(await this.repository.marcarLida(id, usuarioId))) throw new NotFoundError('Notificação não encontrada');
  }

  async marcarTodasLidas(usuarioId: number): Promise<void> {
    await this.repository.marcarTodasLidas(usuarioId);
  }
}
