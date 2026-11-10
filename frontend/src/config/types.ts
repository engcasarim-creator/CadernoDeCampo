import type { ComponentType, ReactNode } from 'react';
import type { Payload, ResourceApi } from '../api/resources';
import type { SelectOption } from '../components/ui/SelectField';
import type { FormValues, ResourceRecord } from '../types';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'password';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  /** Número: valor mínimo aceito (inclusive). */
  min?: number;
  /** Número: valor máximo aceito (inclusive). */
  max?: number;
  /** Campo exibido mas não editável (ex.: e-mail). */
  readOnly?: boolean;
  /** Texto: tamanho mínimo quando preenchido. */
  minLength?: number;
  /** Número: precisa ser maior que zero. */
  positive?: boolean;
  /** Opções fixas (type "select"). */
  options?: SelectOption[];
  /** Opções vindas da API (relacionamento com outro recurso). */
  loadOptions?(): Promise<SelectOption[]>;
  /** Campo só aparece (e só é validado) quando a função devolver true. */
  showWhen?(values: FormValues): boolean;
  hint?: string;
}

export interface ColumnConfig<T> {
  header: string;
  /** `parentName` é o nome do registro "pai" (ex.: o talhão de uma safra), quando existe. */
  render(item: T, parentName: string): ReactNode;
}

export interface FilterConfig {
  /** Parâmetro da query string aceito pela API (ex.: propriedadeId). */
  param: string;
  label: string;
  loadOptions(): Promise<SelectOption[]>;
}

export interface ResourceConfig<T extends ResourceRecord> {
  /** Segmento da URL do front, ex.: "propriedades". */
  path: string;
  singular: string;
  plural: string;
  /** Artigo para as mensagens ("a" ou "o"), ex.: "Nova propriedade" / "Novo talhão". */
  novo: string;
  api: ResourceApi<T>;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  /** Filtro/relacionamento com o recurso pai. */
  filter?: FilterConfig;
  /** false esconde o botão de cadastro (ex.: usuários só são editados pelo administrador). */
  permitirCriar?: boolean;
  /** false esconde o botão de exclusão. */
  permitirExcluir?: boolean;
  /** Campos extras vindos da API (ex.: os campos dos tipos de atividade criados pelo administrador). */
  loadExtraFields?(): Promise<FieldConfig[]>;
  /** Traduz a chave de um erro da API para o nome do campo no formulário. */
  errorField?(key: string, values: FormValues): string;
  /** Link extra mostrado quando o servidor recusa o cadastro por conflito (409) e indica que há saída (ex.: abrir contestação). */
  acaoDeConflito?(values: FormValues, detalhes: Record<string, string>): { to: string; label: string; state?: unknown } | null;
  /** Painel opcional exibido acima da listagem (ex.: gráfico comparativo das atividades). */
  extra?: ComponentType;
  /** Como descobrir o id do registro pai de um item (para mostrar o nome na tabela). */
  parentOf?(item: T): number;
  /** API -> valores do formulário (tudo string). */
  toValues(item: T): FormValues;
  /** Formulário -> corpo da requisição. */
  toPayload(values: FormValues, fields: FieldConfig[]): Payload;
}
