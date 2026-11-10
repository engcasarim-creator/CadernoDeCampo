import type { RequestHandler, Response } from 'express';
import { asyncHandler, requireAuth } from '../../shared/utils/asyncHandler';
import { parseId } from '../../shared/utils/pagination';
import type { ContestacaoAdminService } from './ContestacaoAdminService';
import type { ArquivoParaDownload, ContestacaoService } from './ContestacaoService';

/** Entrega o PDF sem deixar o navegador "adivinhar" outro tipo (nosniff) e sem guardar em cache compartilhado. */
function enviarPdf(res: Response, { nome, conteudo }: ArquivoParaDownload): void {
  res
    .status(200)
    .type('application/pdf')
    .set({
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    })
    .send(conteudo);
}

export class ContestacaoController {
  constructor(private readonly service: ContestacaoService) {}

  abrir: RequestHandler = asyncHandler(async (req, res) => {
    const arquivos = Array.isArray(req.files) ? req.files : [];
    res.status(201).json(await this.service.abrir(requireAuth(req).sub, req.body, arquivos));
  });

  listar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.listar(requireAuth(req).sub, req.query));
  });

  obter: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.obter(requireAuth(req).sub, parseId(req.params.id)));
  });

  arquivo: RequestHandler = asyncHandler(async (req, res) => {
    enviarPdf(res, await this.service.baixar(requireAuth(req).sub, parseId(req.params.id), parseId(req.params.arquivoId)));
  });
}

export class ContestacaoAdminController {
  constructor(private readonly service: ContestacaoAdminService) {}

  listar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.listar(req.query));
  });

  obter: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.obter(parseId(req.params.id)));
  });

  arquivo: RequestHandler = asyncHandler(async (req, res) => {
    enviarPdf(res, await this.service.baixar(parseId(req.params.id), parseId(req.params.arquivoId)));
  });

  decidir: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.decidir(requireAuth(req).sub, parseId(req.params.id), req.body));
  });
}
