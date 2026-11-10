import type { EmailSender, ResultadoDoEmail } from './EmailSender';

/** Usado quando o SMTP não foi configurado: o sistema funciona e registra que o e-mail não saiu. */
export class EmailDesativado implements EmailSender {
  async enviar(): Promise<ResultadoDoEmail> {
    return 'NAO_CONFIGURADO';
  }
}
