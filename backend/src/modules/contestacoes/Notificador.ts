/** Porta usada para avisar o usuário dentro do sistema (implementada pelo módulo de notificações). */
export interface Notificador {
  notificar(usuarioId: number, titulo: string, mensagem: string): Promise<void>;
}
