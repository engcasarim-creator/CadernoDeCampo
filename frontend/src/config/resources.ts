import { atividadesApi, propriedadesApi, safrasApi, talhoesApi, type ResourceApi } from '../api/resources';
import { ComparativoSafraPanel } from '../components/charts/ComparativoSafraPanel';
import type { SelectOption } from '../components/ui/SelectField';
import type { Atividade, Propriedade, ResourceRecord, Safra, StatusSafra, Talhao, TipoAtividade } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import type { FieldConfig, FilterConfig, ResourceConfig } from './types';

/** Carrega até 100 registros de um recurso para usar como opções de <select>. */
function optionsFrom<T extends ResourceRecord>(api: ResourceApi<T>, labelOf: (item: T) => string) {
  return async (): Promise<SelectOption[]> => {
    const page = await api.list({ page: 1, limit: 100 });
    return page.data.map((item) => ({ value: String(item.id), label: labelOf(item) }));
  };
}

const text = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/* ----------------------------- Propriedades ----------------------------- */

export const propriedadesConfig: ResourceConfig<Propriedade> = {
  path: 'propriedades',
  singular: 'Propriedade',
  plural: 'Propriedades',
  novo: 'Nova propriedade',
  api: propriedadesApi,
  columns: [
    { header: 'Nome', render: (item) => item.nome },
    { header: 'Município/UF', render: (item) => `${item.municipio}/${item.uf}` },
    { header: 'Área (ha)', render: (item) => formatNumber(item.areaHa) },
  ],
  fields: [
    { name: 'nome', label: 'Nome da propriedade', type: 'text', required: true, maxLength: 120 },
    { name: 'municipio', label: 'Município', type: 'text', required: true, maxLength: 120 },
    { name: 'uf', label: 'UF', type: 'text', required: true, maxLength: 2, hint: 'Ex.: PR' },
    { name: 'areaHa', label: 'Área total (ha)', type: 'number', required: true, positive: true },
  ],
  toValues: (item) => ({
    nome: item.nome,
    municipio: item.municipio,
    uf: item.uf,
    areaHa: String(item.areaHa),
  }),
  toPayload: (values) => ({
    nome: values.nome.trim(),
    municipio: values.municipio.trim(),
    uf: values.uf.trim().toUpperCase(),
    areaHa: Number(values.areaHa),
  }),
};

/* -------------------------------- Talhões ------------------------------- */

const propriedadeFilter: FilterConfig = {
  param: 'propriedadeId',
  label: 'Propriedade',
  loadOptions: optionsFrom(propriedadesApi, (p) => `${p.nome} — ${p.municipio}/${p.uf}`),
};

export const talhoesConfig: ResourceConfig<Talhao> = {
  path: 'talhoes',
  singular: 'Talhão',
  plural: 'Talhões',
  novo: 'Novo talhão',
  api: talhoesApi,
  filter: propriedadeFilter,
  parentOf: (item) => item.propriedadeId,
  columns: [
    { header: 'Nome', render: (item) => item.nome },
    { header: 'Propriedade', render: (_item, parentName) => parentName },
    { header: 'Área (ha)', render: (item) => formatNumber(item.areaHa) },
    { header: 'Solo', render: (item) => item.tipoSolo ?? '—' },
  ],
  fields: [
    {
      name: 'propriedadeId',
      label: 'Propriedade',
      type: 'select',
      required: true,
      loadOptions: propriedadeFilter.loadOptions,
    },
    { name: 'nome', label: 'Nome do talhão', type: 'text', required: true, maxLength: 120 },
    { name: 'areaHa', label: 'Área (ha)', type: 'number', required: true, positive: true },
    { name: 'tipoSolo', label: 'Tipo de solo', type: 'text', maxLength: 60, hint: 'Opcional. Ex.: Latossolo vermelho' },
  ],
  toValues: (item) => ({
    propriedadeId: String(item.propriedadeId),
    nome: item.nome,
    areaHa: String(item.areaHa),
    tipoSolo: item.tipoSolo ?? '',
  }),
  toPayload: (values) => ({
    propriedadeId: Number(values.propriedadeId),
    nome: values.nome.trim(),
    areaHa: Number(values.areaHa),
    tipoSolo: text(values.tipoSolo),
  }),
};

/* --------------------------------- Safras ------------------------------- */

const STATUS_LABEL: Record<StatusSafra, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADA: 'Encerrada',
};

const talhaoFilter: FilterConfig = {
  param: 'talhaoId',
  label: 'Talhão',
  loadOptions: optionsFrom(talhoesApi, (t) => `${t.nome} (${formatNumber(t.areaHa)} ha)`),
};

export const safrasConfig: ResourceConfig<Safra> = {
  path: 'safras',
  singular: 'Safra',
  plural: 'Safras',
  novo: 'Nova safra',
  api: safrasApi,
  filter: talhaoFilter,
  parentOf: (item) => item.talhaoId,
  columns: [
    { header: 'Cultura', render: (item) => item.cultura },
    { header: 'Ano agrícola', render: (item) => item.anoAgricola },
    { header: 'Talhão', render: (_item, parentName) => parentName },
    { header: 'Plantio', render: (item) => formatDate(item.dataPlantio) },
    { header: 'Colheita', render: (item) => formatDate(item.dataColheita) },
    { header: 'Status', render: (item) => STATUS_LABEL[item.status] },
  ],
  fields: [
    { name: 'talhaoId', label: 'Talhão', type: 'select', required: true, loadOptions: talhaoFilter.loadOptions },
    { name: 'cultura', label: 'Cultura', type: 'text', required: true, maxLength: 80, hint: 'Ex.: Soja' },
    { name: 'anoAgricola', label: 'Ano agrícola', type: 'text', required: true, maxLength: 9, hint: 'Formato AAAA/AAAA' },
    { name: 'dataPlantio', label: 'Data de plantio', type: 'date' },
    { name: 'dataColheita', label: 'Data de colheita', type: 'date' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: (Object.keys(STATUS_LABEL) as StatusSafra[]).map((value) => ({ value, label: STATUS_LABEL[value] })),
    },
  ],
  toValues: (item) => ({
    talhaoId: String(item.talhaoId),
    cultura: item.cultura,
    anoAgricola: item.anoAgricola,
    dataPlantio: item.dataPlantio ?? '',
    dataColheita: item.dataColheita ?? '',
    status: item.status,
  }),
  toPayload: (values) => ({
    talhaoId: Number(values.talhaoId),
    cultura: values.cultura.trim(),
    anoAgricola: values.anoAgricola.trim(),
    dataPlantio: text(values.dataPlantio),
    dataColheita: text(values.dataColheita),
    status: values.status,
  }),
};

/* ------------------------------- Atividades ----------------------------- */

const TIPO_LABEL: Record<TipoAtividade, string> = {
  PLANTIO: 'Plantio',
  APLICACAO: 'Aplicação',
  COLHEITA: 'Colheita',
};

const safraFilter: FilterConfig = {
  param: 'safraId',
  label: 'Safra',
  loadOptions: optionsFrom(safrasApi, (s) => `${s.cultura} ${s.anoAgricola}`),
};

const quando =
  (tipo: TipoAtividade) =>
  (values: Record<string, string>): boolean =>
    values.tipo === tipo;

const camposAtividade: FieldConfig[] = [
  { name: 'safraId', label: 'Safra', type: 'select', required: true, loadOptions: safraFilter.loadOptions },
  {
    name: 'tipo',
    label: 'Tipo de atividade',
    type: 'select',
    required: true,
    options: (Object.keys(TIPO_LABEL) as TipoAtividade[]).map((value) => ({ value, label: TIPO_LABEL[value] })),
  },
  { name: 'data', label: 'Data', type: 'date', required: true },
  { name: 'descricao', label: 'Descrição', type: 'text', required: true, maxLength: 255 },
  // Plantio
  { name: 'sementeKg', label: 'Semente (kg)', type: 'number', required: true, positive: true, showWhen: quando('PLANTIO') },
  { name: 'precoPorKg', label: 'Preço por kg (R$)', type: 'number', required: true, min: 0, showWhen: quando('PLANTIO') },
  { name: 'variedade', label: 'Variedade', type: 'text', maxLength: 80, showWhen: quando('PLANTIO') },
  // Aplicação
  { name: 'produto', label: 'Produto', type: 'text', required: true, maxLength: 120, showWhen: quando('APLICACAO') },
  { name: 'doseHa', label: 'Dose por hectare (L ou kg)', type: 'number', required: true, positive: true, showWhen: quando('APLICACAO') },
  { name: 'areaHa', label: 'Área aplicada (ha)', type: 'number', required: true, positive: true, showWhen: quando('APLICACAO') },
  { name: 'precoPorUnidade', label: 'Preço por L/kg (R$)', type: 'number', required: true, min: 0, showWhen: quando('APLICACAO') },
  // Colheita
  { name: 'sacas', label: 'Sacas colhidas', type: 'number', required: true, positive: true, showWhen: quando('COLHEITA') },
  { name: 'custoPorSaca', label: 'Custo por saca (R$)', type: 'number', required: true, min: 0, showWhen: quando('COLHEITA') },
];

function detalhesParaPayload(values: Record<string, string>): Record<string, unknown> {
  switch (values.tipo) {
    case 'PLANTIO':
      return {
        sementeKg: Number(values.sementeKg),
        precoPorKg: Number(values.precoPorKg),
        variedade: text(values.variedade ?? ''),
      };
    case 'APLICACAO':
      return {
        produto: values.produto?.trim(),
        doseHa: Number(values.doseHa),
        areaHa: Number(values.areaHa),
        precoPorUnidade: Number(values.precoPorUnidade),
      };
    case 'COLHEITA':
      return { sacas: Number(values.sacas), custoPorSaca: Number(values.custoPorSaca) };
    default:
      return {};
  }
}

export const atividadesConfig: ResourceConfig<Atividade> = {
  path: 'atividades',
  singular: 'Atividade',
  plural: 'Atividades',
  novo: 'Nova atividade',
  api: atividadesApi,
  extra: ComparativoSafraPanel,
  filter: safraFilter,
  parentOf: (item) => item.safraId,
  columns: [
    { header: 'Data', render: (item) => formatDate(item.data) },
    { header: 'Tipo', render: (item) => TIPO_LABEL[item.tipo] },
    { header: 'Descrição', render: (item) => item.descricao },
    { header: 'Safra', render: (_item, parentName) => parentName },
    { header: 'Custo total', render: (item) => formatCurrency(item.custoTotal) },
  ],
  fields: camposAtividade,
  toValues: (item) => {
    const values: Record<string, string> = {
      safraId: String(item.safraId),
      tipo: item.tipo,
      data: item.data,
      descricao: item.descricao,
    };
    for (const [chave, valor] of Object.entries(item.detalhes)) {
      values[chave] = valor === null ? '' : String(valor);
    }
    return values;
  },
  toPayload: (values) => ({
    safraId: Number(values.safraId),
    tipo: values.tipo,
    data: values.data,
    descricao: values.descricao.trim(),
    detalhes: detalhesParaPayload(values),
  }),
};
