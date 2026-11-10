export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  papel: Papel;
}

export type Papel = 'USUARIO' | 'ADMIN';

export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResourceRecord {
  id: number;
}

export interface Propriedade extends ResourceRecord {
  nome: string;
  municipio: string;
  uf: string;
  areaHa: number;
  /** Centroide da propriedade (base do mapa da tela inicial). Nulo em propriedades antigas. */
  latitude: number | null;
  longitude: number | null;
  /** CAR e CCIR (já formatados pela API). Nulos em propriedades antigas, que precisam ser editadas. */
  car: string | null;
  ccir: string | null;
}

export interface Talhao extends ResourceRecord {
  propriedadeId: number;
  nome: string;
  areaHa: number;
  tipoSolo: string | null;
}

export type StatusSafra = 'PLANEJADA' | 'EM_ANDAMENTO' | 'ENCERRADA';

export interface Safra extends ResourceRecord {
  talhaoId: number;
  cultura: string;
  anoAgricola: string;
  dataPlantio: string | null;
  dataColheita: string | null;
  status: StatusSafra;
}

export type TipoAtividade = 'PLANTIO' | 'APLICACAO' | 'COLHEITA' | 'PERSONALIZADA';

export interface Atividade extends ResourceRecord {
  safraId: number;
  tipo: TipoAtividade;
  data: string;
  descricao: string;
  detalhes: Record<string, string | number | null>;
  custoTotal: number;
  /** Só em atividades PERSONALIZADAS (tipo criado pelo administrador). */
  tipoId?: number;
  tipoNome?: string;
}

/** Quem cadastrou a propriedade (visível só para o administrador). */
export interface Responsavel {
  id: number;
  nome: string;
  email: string;
  cpf: string;
}

export interface PropriedadeAdmin extends Propriedade {
  responsavel: Responsavel;
}

export interface Transferencia {
  id: number;
  de: { id: number; nome: string; email: string };
  para: { id: number; nome: string; email: string };
  realizadaPor: { id: number; nome: string };
  motivo: string;
  realizadaEm: string;
}

export interface PropriedadeAdminDetalhe extends PropriedadeAdmin {
  transferencias: Transferencia[];
}

export type TipoCampo = 'NUMERO' | 'TEXTO';

export interface CampoTipo {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  unidade: string | null;
  entraNoCusto: boolean;
}

/** Tipo de atividade criado pelo administrador (ex.: Tratorista). */
export interface TipoPersonalizado extends ResourceRecord {
  nome: string;
  campos: CampoTipo[];
}

/** Comparativo plantio × colheita de uma safra (GET /safras/:id/comparativo). */
export interface ComparativoSafra {
  safraId: number;
  cultura: string;
  anoAgricola: string;
  /** Peso da saca usado na conversão de sacas para kg. */
  kgPorSaca: number;
  plantio: { atividades: number; sementeKg: number; custo: number };
  colheita: { atividades: number; sacas: number; kg: number; custo: number };
  /** Colheita menos plantio (positivo = a colheita é maior). */
  diferenca: { quantidadeKg: number; custo: number };
  /** kg colhidos para cada kg de semente; null quando não há plantio. */
  relacaoColhidoPlantado: number | null;
}

export type FieldErrors = Record<string, string>;
export type FormValues = Record<string, string>;

/* ------------------------------- Contestações ------------------------------- */

export type StatusContestacao = 'EM_ANALISE' | 'DEFERIDA' | 'INDEFERIDA';
export type StatusEmail = 'PENDENTE' | 'ENVIADO' | 'FALHOU' | 'NAO_CONFIGURADO';

export interface ArquivoContestacao {
  id: number;
  nomeOriginal: string;
  tamanho: number;
  enviadoEm: string;
}

/** Pedido do dono real para assumir uma propriedade (só os dados do próprio pedido). */
export interface Contestacao extends ResourceRecord {
  car: string;
  ccir: string | null;
  justificativa: string;
  status: StatusContestacao;
  decisao: string | null;
  decididaEm: string | null;
  emailStatus: StatusEmail | null;
  criadaEm: string;
  arquivos: ArquivoContestacao[];
}

export interface ContestacaoResumoAdmin extends Contestacao {
  solicitante: string | null;
}

export interface ContestacaoAdminDetalhe {
  contestacao: Contestacao;
  solicitante: { id: number; nome: string; email: string; cpf: string } | null;
  /** Propriedade contestada e o responsável de hoje; null se foi excluída. */
  propriedade: (Propriedade & { responsavel: Responsavel }) | null;
}

export interface Notificacao extends ResourceRecord {
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadaEm: string;
}

export interface ListaDeNotificacoes extends Page<Notificacao> {
  naoLidas: number;
}
