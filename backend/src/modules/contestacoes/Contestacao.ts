import type { ResultadoDoEmail } from '../../shared/email';

export const STATUS_DE_CONTESTACAO = ['EM_ANALISE', 'DEFERIDA', 'INDEFERIDA'] as const;
export type StatusDeContestacao = (typeof STATUS_DE_CONTESTACAO)[number];
export type DecisaoDeContestacao = Exclude<StatusDeContestacao, 'EM_ANALISE'>;

/** Situação do e-mail da decisão. PENDENTE = decisão tomada, envio ainda não concluído. */
export type StatusDoEmail = ResultadoDoEmail | 'PENDENTE';

export interface ArquivoDeContestacao {
  id: number;
  nomeOriginal: string;
  /** Nome do arquivo no armazenamento. Interno: nunca vai para a resposta da API. */
  chave: string;
  tamanho: number;
  enviadoEm: string;
}

export interface ContestacaoProps {
  solicitanteId: number;
  /** null quando a propriedade contestada foi excluída depois do pedido. */
  propriedadeId: number | null;
  /** CAR/CCIR como o solicitante informou (normalizados). */
  car: string;
  ccir: string | null;
  justificativa: string;
  status: StatusDeContestacao;
  /** Motivo curto escrito pelo administrador ao decidir. */
  decisao: string | null;
  decididaPor: number | null;
  decididaEm: string | null;
  emailStatus: StatusDoEmail | null;
  criadaEm: string;
  arquivos: ArquivoDeContestacao[];
}

/**
 * Pedido do "dono real" para assumir uma propriedade cadastrada por outra pessoa.
 * Guarda as regras do próprio pedido: quem pode vê-lo e se ainda pode ser decidido.
 */
export class Contestacao {
  constructor(
    private readonly props: ContestacaoProps,
    readonly id: number,
  ) {}

  get solicitanteId(): number {
    return this.props.solicitanteId;
  }
  get propriedadeId(): number | null {
    return this.props.propriedadeId;
  }
  get car(): string {
    return this.props.car;
  }
  get ccir(): string | null {
    return this.props.ccir;
  }
  get status(): StatusDeContestacao {
    return this.props.status;
  }
  get decisao(): string | null {
    return this.props.decisao;
  }
  get arquivos(): readonly ArquivoDeContestacao[] {
    return this.props.arquivos;
  }

  estaEmAnalise(): boolean {
    return this.props.status === 'EM_ANALISE';
  }

  pertenceA(usuarioId: number): boolean {
    return this.props.solicitanteId === usuarioId;
  }

  arquivo(arquivoId: number): ArquivoDeContestacao | null {
    return this.props.arquivos.find((a) => a.id === arquivoId) ?? null;
  }

  /** Visão pública (solicitante e admin): sem chave de armazenamento e sem referência à propriedade alheia. */
  toJSON() {
    const { solicitanteId: _s, propriedadeId: _p, decididaPor: _d, arquivos, ...resto } = this.props;
    return {
      id: this.id,
      ...resto,
      arquivos: arquivos.map(({ chave: _chave, ...publico }) => publico),
    };
  }
}
