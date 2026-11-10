export { EmailDesativado } from './EmailDesativado';
export { NodemailerEmailSender } from './NodemailerEmailSender';
export type { Email, EmailSender, ResultadoDoEmail, SmtpConfig } from './EmailSender';

import type { EmailSender, SmtpConfig } from './EmailSender';
import { EmailDesativado } from './EmailDesativado';
import { NodemailerEmailSender } from './NodemailerEmailSender';

/** SMTP configurado → envia de verdade; senão, e-mail desativado (o resto do sistema segue normal). */
export function criarEmailSender(smtp: SmtpConfig | null): EmailSender {
  return smtp === null ? new EmailDesativado() : new NodemailerEmailSender(smtp);
}
