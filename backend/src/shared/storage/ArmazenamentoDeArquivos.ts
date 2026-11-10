/**
 * Porta de armazenamento de arquivos. A `chave` é SEMPRE gerada pelo servidor (nunca vem do usuário),
 * o que impede qualquer tentativa de sair da pasta de uploads.
 */
export interface ArmazenamentoDeArquivos {
  salvar(chave: string, conteudo: Buffer): Promise<void>;
  /** Falha se o arquivo não existir. */
  ler(chave: string): Promise<Buffer>;
  /** Não falha se o arquivo já não existir (usado para limpar após erro). */
  remover(chave: string): Promise<void>;
}
