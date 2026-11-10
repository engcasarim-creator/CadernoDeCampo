import {
  atividadesApi,
  propriedadesApi,
  safrasApi,
  talhoesApi,
  tiposAdminApi,
  tiposDisponiveisApi,
  usuariosAdminApi,
  type ResourceApi,
} from '../api/resources';
import { ComparativoSafraPanel } from '../components/charts/ComparativoSafraPanel';
import type { SelectOption } from '../components/ui/SelectField';
import type {
  Atividade,
  Papel,
  Propriedade,
  ResourceRecord,
  Safra,
  StatusSafra,
  Talhao,
  TipoAtividade,
  TipoPersonalizado,
  Usuario,
} from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import type { FieldConfig, FilterConfig, ResourceConfig } from './types';

/** Carrega até 100 registros de um recurso para usar como opções de <select>. */
function optionsFrom<T extends ResourceRecord>(api: ResourceApi<T>, labelOf: (item: T) => string) {
  return async (): Promise<SelectOption[]> => {
    const page = await api.list({ page: 1, limit: 100 });
    return page.data.map((item) => ({ value: String(item.id), label: labelOf(item) }));
  };
}

function formatCoordenadas(latitude: number | null, longitude: number | null): string {
  return latitude === null || longitude === null ? 'Não informado' : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

const text = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/* ----------------------------- Propriedades ----------------------------- */

export const propriedadesConfig: ResourceConfig<Propriedade> = {
  path: 'propriedades',
  singular: 'Propriedade',
  plural: 'Propriedades',
  novo: 'Nova propriedade',
  api: propriedadesApi,
  // O servidor sinaliza (detalhes.contestavel) que o CAR/CCIR/centroide é de outro usuário: dá a saída "é meu".
  acaoDeConflito: (values, detalhes) =>
    detalhes.contestavel === undefined
      ? null
      : {
          to: '/contestacoes/nova',
          label: 'Este imóvel é meu: abrir pedido de contestação',
          state: { car: values.car?.trim() ?? '', ccir: values.ccir?.trim() ?? '' },
        },
  columns: [
    { header: 'Nome', render: (item) => item.nome },
    { header: 'Município/UF', render: (item) => `${item.municipio}/${item.uf}` },
    { header: 'Área (ha)', render: (item) => formatNumber(item.areaHa) },
    { header: 'CAR', render: (item) => item.car ?? 'Não informado' },
    { header: 'CCIR', render: (item) => item.ccir ?? 'Não informado' },
    { header: 'Centroide', render: (item) => formatCoordenadas(item.latitude, item.longitude) },
  ],
  fields: [
    { name: 'nome', label: 'Nome da propriedade', type: 'text', required: true, maxLength: 120 },
    { name: 'municipio', label: 'Município', type: 'text', required: true, maxLength: 120 },
    { name: 'uf', label: 'UF', type: 'text', required: true, maxLength: 2, hint: 'Ex.: PR' },
    { name: 'areaHa', label: 'Área total (ha)', type: 'number', required: true, positive: true },
    {
      name: 'latitude',
      label: 'Latitude do centroide',
      type: 'number',
      required: true,
      min: -90,
      max: 90,
      hint: 'Graus decimais. Ex.: -24.512345. No Google Maps, clique com o botão direito no centro da propriedade e copie as coordenadas.',
    },
    {
      name: 'longitude',
      label: 'Longitude do centroide',
      type: 'number',
      required: true,
      min: -180,
      max: 180,
      hint: 'Graus decimais. Ex.: -50.412345. Uma propriedade só pode ter um responsável: um ponto a menos de 50 m de outra propriedade já cadastrada é recusado.',
    },
    {
      name: 'car',
      label: 'CAR (Cadastro Ambiental Rural)',
      type: 'text',
      required: true,
      maxLength: 60,
      hint: 'Número do recibo de inscrição no SICAR. Ex.: PR-4127106-A1B2.C3D4.E5F6.7890.A1B2.C3D4.E5F6.7890 (o estado precisa ser o da propriedade).',
    },
    {
      name: 'ccir',
      label: 'CCIR (código do imóvel rural)',
      type: 'text',
      required: true,
      maxLength: 30,
      hint: 'Os 13 dígitos do código do imóvel rural no CCIR do INCRA. Ex.: 950.123.456.789-0',
    },
  ],
  toValues: (item) => ({
    nome: item.nome,
    municipio: item.municipio,
    uf: item.uf,
    areaHa: String(item.areaHa),
    latitude: item.latitude === null ? '' : String(item.latitude),
    longitude: item.longitude === null ? '' : String(item.longitude),
    car: item.car ?? '',
    ccir: item.ccir ?? '',
  }),
  toPayload: (values) => ({
    nome: values.nome.trim(),
    municipio: values.municipio.trim(),
    uf: values.uf.trim().toUpperCase(),
    areaHa: Number(values.areaHa),
    latitude: Number(values.latitude.replace(',', '.')),
    longitude: Number(values.longitude.replace(',', '.')),
    car: values.car.trim(),
    ccir: values.ccir.trim(),
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

/** Tipos que já vêm com o sistema (os criados pelo administrador entram por `loadExtraFields`). */
type TipoPadrao = Exclude<TipoAtividade, 'PERSONALIZADA'>;

const TIPO_LABEL: Record<TipoPadrao, string> = {
  PLANTIO: 'Plantio',
  APLICACAO: 'Aplicação',
  COLHEITA: 'Colheita',
};

/** Valor do <select> de tipo para um tipo criado pelo administrador: "custom:<id>". */
const PREFIXO_TIPO_CUSTOM = 'custom:';
/** Os campos de um tipo criado pelo administrador se chamam "c<id>_<chave>" no formulário. */
const CAMPO_CUSTOM = /^c(\d+)_(.+)$/;

async function carregarOpcoesDeTipo(): Promise<SelectOption[]> {
  const padrao = (Object.keys(TIPO_LABEL) as TipoPadrao[]).map((value) => ({ value, label: TIPO_LABEL[value] }));
  try {
    const personalizados = await tiposDisponiveisApi.listar();
    return [...padrao, ...personalizados.map((tipo) => ({ value: `${PREFIXO_TIPO_CUSTOM}${tipo.id}`, label: tipo.nome }))];
  } catch {
    return padrao;
  }
}

/** Transforma cada tipo criado pelo administrador em campos que aparecem quando o tipo é escolhido. */
async function carregarCamposPersonalizados(): Promise<FieldConfig[]> {
  const tipos = await tiposDisponiveisApi.listar();
  return tipos.flatMap((tipo) =>
    tipo.campos.map(
      (campo): FieldConfig => ({
        name: `c${tipo.id}_${campo.chave}`,
        label: campo.unidade ? `${campo.rotulo} (${campo.unidade})` : campo.rotulo,
        type: campo.tipo === 'NUMERO' ? 'number' : 'text',
        required: campo.tipo === 'NUMERO',
        min: campo.tipo === 'NUMERO' ? 0 : undefined,
        maxLength: campo.tipo === 'TEXTO' ? 120 : undefined,
        showWhen: (values) => values.tipo === `${PREFIXO_TIPO_CUSTOM}${tipo.id}`,
      }),
    ),
  );
}

/** Detalhes da atividade PERSONALIZADA: pega só os campos "c<id>_*" do tipo escolhido, sem o prefixo. */
function detalhesPersonalizados(values: Record<string, string>, tipoId: number, fields: FieldConfig[]) {
  const detalhes: Record<string, unknown> = {};
  for (const field of fields) {
    const partes = CAMPO_CUSTOM.exec(field.name);
    if (!partes || Number(partes[1]) !== tipoId) continue;
    const valor = values[field.name] ?? '';
    if (field.type === 'number') detalhes[partes[2]] = Number(valor);
    else if (valor.trim() !== '') detalhes[partes[2]] = valor.trim();
  }
  return detalhes;
}

const safraFilter: FilterConfig = {
  param: 'safraId',
  label: 'Safra',
  loadOptions: optionsFrom(safrasApi, (s) => `${s.cultura} ${s.anoAgricola}`),
};

const quando =
  (tipo: TipoPadrao) =>
  (values: Record<string, string>): boolean =>
    values.tipo === tipo;

const camposAtividade: FieldConfig[] = [
  { name: 'safraId', label: 'Safra', type: 'select', required: true, loadOptions: safraFilter.loadOptions },
  {
    name: 'tipo',
    label: 'Tipo de atividade',
    type: 'select',
    required: true,
    loadOptions: carregarOpcoesDeTipo,
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
    { header: 'Tipo', render: (item) => (item.tipo === 'PERSONALIZADA' ? (item.tipoNome ?? 'Personalizada') : TIPO_LABEL[item.tipo]) },
    { header: 'Descrição', render: (item) => item.descricao },
    { header: 'Safra', render: (_item, parentName) => parentName },
    { header: 'Custo total', render: (item) => formatCurrency(item.custoTotal) },
  ],
  fields: camposAtividade,
  loadExtraFields: carregarCamposPersonalizados,
  // Erros "detalhes.horas" viram o campo "c<id>_horas" quando o tipo escolhido é um tipo do administrador.
  errorField: (key, values) => {
    const campo = key.replace('detalhes.', '');
    return key.startsWith('detalhes.') && values.tipo?.startsWith(PREFIXO_TIPO_CUSTOM)
      ? `c${values.tipo.slice(PREFIXO_TIPO_CUSTOM.length)}_${campo}`
      : campo;
  },
  toValues: (item) => {
    const personalizada = item.tipo === 'PERSONALIZADA' && item.tipoId !== undefined;
    const values: Record<string, string> = {
      safraId: String(item.safraId),
      tipo: personalizada ? `${PREFIXO_TIPO_CUSTOM}${item.tipoId}` : item.tipo,
      data: item.data,
      descricao: item.descricao,
    };
    for (const [chave, valor] of Object.entries(item.detalhes)) {
      values[personalizada ? `c${item.tipoId}_${chave}` : chave] = valor === null ? '' : String(valor);
    }
    return values;
  },
  toPayload: (values, fields) => {
    const base = { safraId: Number(values.safraId), data: values.data, descricao: values.descricao.trim() };
    if (values.tipo.startsWith(PREFIXO_TIPO_CUSTOM)) {
      const tipoId = Number(values.tipo.slice(PREFIXO_TIPO_CUSTOM.length));
      return { ...base, tipo: 'PERSONALIZADA', tipoId, detalhes: detalhesPersonalizados(values, tipoId, fields) };
    }
    return { ...base, tipo: values.tipo, detalhes: detalhesParaPayload(values) };
  },
};

/* ------------------- Administração: usuários e tipos de atividade ------------------- */

const PAPEL_LABEL: Record<Papel, string> = { USUARIO: 'Usuário', ADMIN: 'Administrador' };

/** O administrador consulta e edita usuários; não cria nem exclui (o cadastro é feito pelo próprio usuário). */
export const usuariosAdminConfig: ResourceConfig<Usuario> = {
  path: 'admin/usuarios',
  singular: 'Usuário',
  plural: 'Usuários',
  novo: 'Novo usuário',
  api: usuariosAdminApi,
  permitirCriar: false,
  permitirExcluir: false,
  columns: [
    { header: 'Nome', render: (item) => item.nome },
    { header: 'E-mail', render: (item) => item.email },
    { header: 'CPF', render: (item) => formatCpf(item.cpf) },
    { header: 'Perfil', render: (item) => PAPEL_LABEL[item.papel] },
  ],
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, maxLength: 120 },
    { name: 'email', label: 'E-mail', type: 'text', readOnly: true, hint: 'O e-mail identifica o usuário e não pode ser alterado.' },
    { name: 'cpf', label: 'CPF', type: 'text', required: true, maxLength: 14, hint: 'Somente números ou no formato 000.000.000-00' },
    {
      name: 'papel',
      label: 'Perfil de acesso',
      type: 'select',
      required: true,
      options: (Object.keys(PAPEL_LABEL) as Papel[]).map((value) => ({ value, label: PAPEL_LABEL[value] })),
    },
    {
      name: 'senha',
      label: 'Nova senha',
      type: 'password',
      minLength: 8,
      maxLength: 72,
      hint: 'Opcional. Deixe em branco para manter a senha atual. Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.',
    },
  ],
  toValues: (item) => ({ nome: item.nome, email: item.email, cpf: item.cpf, papel: item.papel, senha: '' }),
  toPayload: (values) => ({
    nome: values.nome.trim(),
    email: values.email,
    cpf: values.cpf.trim(),
    papel: values.papel,
    ...(values.senha === '' ? {} : { senha: values.senha }),
  }),
};

function formatCpf(cpf: string): string {
  return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
}

/**
 * Listagem dos tipos criados pelo administrador. O cadastro/edição usa uma tela própria
 * (TipoAtividadeFormPage), pois cada tipo tem uma lista de campos; por isso `fields` fica vazio.
 */
export const tiposAdminConfig: ResourceConfig<TipoPersonalizado> = {
  path: 'admin/tipos-atividade',
  singular: 'Tipo de atividade',
  plural: 'Tipos de atividade',
  novo: 'Novo tipo de atividade',
  api: tiposAdminApi,
  columns: [
    { header: 'Nome', render: (item) => item.nome },
    {
      header: 'Campos',
      render: (item) => item.campos.map((campo) => (campo.unidade ? `${campo.rotulo} (${campo.unidade})` : campo.rotulo)).join(', '),
    },
  ],
  fields: [],
  toValues: () => ({}),
  toPayload: () => ({}),
};
