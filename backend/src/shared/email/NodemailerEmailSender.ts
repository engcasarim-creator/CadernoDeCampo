import { createTransport, type Transporter } from 'nodemailer';
import type { Email, EmailSender, ResultadoDoEmail, SmtpConfig } from './EmailSender';

export class NodemailerEmailSender implements EmailSender {
  readonly #transporter: Transporter;
  readonly #from: string;

  constructor(config: SmtpConfig) {
    this.#from = config.from;
    this.#transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user === '' ? undefined : { user: config.user, pass: config.password },
      // Sem isso um SMTP lento seguraria a resposta da API.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async enviar(email: Email): Promise<ResultadoDoEmail> {
    try {
      await this.#transporter.sendMail({ from: this.#from, to: email.para, subject: email.assunto, text: email.texto });
      return 'ENVIADO';
    } catch (error) {
      // Registra só o motivo técnico (nunca o conteúdo do e-mail nem credenciais).
      console.error('Falha ao enviar e-mail:', error instanceof Error ? error.message : error);
      return 'FALHOU';
    }
  }
}
