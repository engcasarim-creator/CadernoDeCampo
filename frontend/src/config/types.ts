import type { ComponentType, ReactNode } from 'react';
import type { Payload, ResourceApi } from '../api/resources';
import type { SelectOption } from '../components/ui/SelectField';
import type { FormValues, ResourceRecord } from '../types';

export type FieldType = 'text' | 'number' | 'date' | 'select';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  /** Número: valor mínimo aceito (inclusive). */
  min?: number;
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
  /** Painel opcional exibido acima da listagem (ex.: gráfico comparativo das atividades). */
  extra?: ComponentType;
  /** Como descobrir o id do registro pai de um item (para mostrar o nome na tabela). */
  parentOf?(item: T): number;
  /** API -> valores do formulário (tudo string). */
  toValues(item: T): FormValues;
  /** Formulário -> corpo da requisição. */
  toPayload(values: FormValues): Payload;
}
