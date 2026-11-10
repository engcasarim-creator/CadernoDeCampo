/** Aviso mostrado dentro do sistema (sininho). Pertence a UM usuário e só ele o enxerga. */
export interface Notificacao {
  id: number;
  usuarioId: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadaEm: string;
}

export interface NovaNotificacao {
  usuarioId: number;
  titulo: string;
  mensagem: string;
}
