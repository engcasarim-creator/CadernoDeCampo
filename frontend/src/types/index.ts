export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
}

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

export type TipoAtividade = 'PLANTIO' | 'APLICACAO' | 'COLHEITA';

export interface Atividade extends ResourceRecord {
  safraId: number;
  tipo: TipoAtividade;
  data: string;
  descricao: string;
  detalhes: Record<string, string | number | null>;
  custoTotal: number;
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
