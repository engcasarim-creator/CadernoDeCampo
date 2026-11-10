import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { ValidationError } from '../../shared/errors';
import { MAX_ARQUIVOS, MAX_BYTES_POR_ARQUIVO } from './pdf';

const upload = multer({
  // Memória: no máximo 5 x 5 MB por pedido; o service confere o conteúdo antes de gravar qualquer coisa em disco.
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_POR_ARQUIVO, files: MAX_ARQUIVOS, fields: 10, fieldSize: 20 * 1024, parts: 20 },
  fileFilter: (_req, file, cb) => {
    const ehPdf = file.mimetype === 'application/pdf' && file.originalname.toLowerCase().endsWith('.pdf');
    if (ehPdf) cb(null, true);
    else cb(new ValidationError('Só são aceitos arquivos PDF', { arquivos: 'Envie apenas arquivos .pdf' }));
  },
});

function traduzir(error: unknown): unknown {
  if (!(error instanceof MulterError)) return error;
  const mensagens: Record<string, string> = {
    LIMIT_FILE_SIZE: `Cada PDF pode ter no máximo ${MAX_BYTES_POR_ARQUIVO / 1024 / 1024} MB`,
    LIMIT_FILE_COUNT: `Envie no máximo ${MAX_ARQUIVOS} arquivos`,
    LIMIT_UNEXPECTED_FILE: `Envie os PDFs no campo "arquivos" (no máximo ${MAX_ARQUIVOS})`,
  };
  return new ValidationError('Envio inválido', { arquivos: mensagens[error.code] ?? 'Não foi possível ler os arquivos enviados' });
}

/** Lê o multipart (campos de texto + até 5 PDFs no campo "arquivos") e converte os erros do multer em 400. */
export const receberPdfs: RequestHandler = (req, res, next) => {
  upload.array('arquivos', MAX_ARQUIVOS)(req, res, (error: unknown) => next(error === undefined ? undefined : traduzir(error)));
};
