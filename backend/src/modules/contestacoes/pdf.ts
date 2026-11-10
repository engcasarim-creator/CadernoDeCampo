import { ValidationError } from '../../shared/errors';

export const MAX_ARQUIVOS = 5;
export const MAX_BYTES_POR_ARQUIVO = 5 * 1024 * 1024;

/** Todo PDF começa com "%PDF-". Conferir o conteúdo evita aceitar outro tipo de arquivo só com a extensão trocada. */
export function pareceUmPdf(conteudo: Buffer): boolean {
  return conteudo.length > 5 && conteudo.subarray(0, 5).toString('latin1') === '%PDF-';
}

/**
 * O nome vem do navegador (codificado em latin1 pelo multer): reconverte para UTF-8, tira caminho e
 * caracteres de controle e limita o tamanho. É só um rótulo; o arquivo é guardado com um nome gerado.
 */
export function nomeSeguro(nomeBruto: string): string {
  const utf8 = Buffer.from(nomeBruto, 'latin1').toString('utf8');
  const semCaminho = utf8.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const limpo = semCaminho.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (limpo === '' ? 'documento.pdf' : limpo).slice(0, 150);
}

export function validarPdfs(arquivos: readonly Express.Multer.File[]): void {
  if (arquivos.length === 0) {
    throw new ValidationError('Anexe ao menos um PDF', { arquivos: 'Envie pelo menos um documento em PDF' });
  }
  const invalido = arquivos.find((a) => !pareceUmPdf(a.buffer));
  if (invalido) {
    throw new ValidationError('Arquivo inválido', {
      arquivos: `"${nomeSeguro(invalido.originalname)}" não é um PDF válido`,
    });
  }
}
