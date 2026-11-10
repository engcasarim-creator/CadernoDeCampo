export interface Email {
  para: string;
  assunto: string;
  texto: string;
}

/**
 * Resultado do envio. O envio NUNCA lança: e-mail é um aviso extra, e um servidor de e-mail fora do ar
 * não pode desfazer nem travar a operação que o originou.
 */
export type ResultadoDoEmail = 'ENVIADO' | 'FALHOU' | 'NAO_CONFIGURADO';

/** Porta de saída de e-mail (SMTP em produção, fake nos testes). */
export interface EmailSender {
  enviar(email: Email): Promise<ResultadoDoEmail>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = TLS direto (porta 465); false = STARTTLS quando o servidor oferece (587). */
  secure: boolean;
  user: string;
  password: string;
  /** Remetente, ex.: "Caderno de Campo <nao-responda@exemplo.com>". */
  from: string;
}
