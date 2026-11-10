import type { PagedResult, PageRequest } from '../../shared/types';
import type { Contestacao, DecisaoDeContestacao, StatusDeContestacao, StatusDoEmail } from './Contestacao';

export interface NovaContestacao {
  solicitanteId: number;
  propriedadeId: number;
  car: string;
  ccir: string | null;
  justificativa: string;
}

export interface NovoArquivo {
  nomeOriginal: string;
  chave: string;
  tamanho: number;
}

/** Porta de persistência das contestações (MySQL em produção, memória nos testes). */
export interface ContestacaoRepository {
  /** Grava o pedido e os arquivos juntos (ou tudo, ou nada). */
  criar(nova: NovaContestacao, arquivos: NovoArquivo[]): Promise<Contestacao>;
  buscarPorId(id: number): Promise<Contestacao | null>;
  /** Pedido em análise do mesmo solicitante para a mesma propriedade (evita pedidos repetidos). */
  buscarEmAnalise(solicitanteId: number, propriedadeId: number): Promise<Contestacao | null>;
  listarDoSolicitante(solicitanteId: number, request: PageRequest): Promise<PagedResult<Contestacao>>;
  /** Todos os pedidos (só administrador), do mais antigo ao mais novo quando EM_ANALISE (fila), senão do mais novo. */
  listarTodas(request: PageRequest, status: StatusDeContestacao | null): Promise<PagedResult<Contestacao>>;
  /**
   * "Reserva" a decisão: só muda se o pedido AINDA estiver EM_ANALISE. Devolve false se outro administrador
   * decidiu antes (duas decisões simultâneas não passam as duas).
   */
  decidir(id: number, adminId: number, decisao: DecisaoDeContestacao, motivo: string): Promise<boolean>;
  /** Desfaz a reserva quando a ação que dependia da decisão (a transferência) falhou. */
  reabrir(id: number): Promise<void>;
  registrarEmail(id: number, status: StatusDoEmail): Promise<void>;
}
