import { ValidationError, type ErrorDetails } from '../../shared/errors';
import { BodyReader } from '../../shared/utils/BodyReader';
import { Entity } from '../../shared/crud/Entity';

export const TIPOS_CAMPO = ['NUMERO', 'TEXTO'] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export const MAX_CAMPOS = 10;

/** Campo que o usuário preenche ao registrar uma atividade deste tipo. */
export interface CampoTipo {
  /** Identificador técnico gerado a partir do rótulo (ex.: "horas_de_tratorista"). */
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  /** Unidade exibida ao lado do rótulo (ex.: "h", "R$/h"). */
  unidade: string | null;
  /** Só campos numéricos: entra no produto que forma o custo da atividade. */
  entraNoCusto: boolean;
}

export interface TipoPersonalizadoProps {
  nome: string;
  campos: CampoTipo[];
}

export type ValoresAtividade = Record<string, string | number>;

/** Nomes que já são usados pelo corpo de uma atividade: um campo não pode ter a mesma chave. */
const CHAVES_RESERVADAS: ReadonlySet<string> = new Set(['id', 'tipo', 'tipo_id', 'safra_id', 'data', 'descricao', 'detalhes']);

/** "Valor por hora" -> "valor_por_hora" (sem acentos, só letras minúsculas, números e "_"). */
export function gerarChave(rotulo: string): string {
  const base = rotulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/, '');
  return /^[0-9]/.test(base) ? `c_${base}` : base;
}

function validarCampos(campos: readonly CampoTipo[]): void {
  const erros: ErrorDetails = {};
  const vistas = new Set<string>();

  if (campos.length < 1 || campos.length > MAX_CAMPOS) {
    erros.campos = `Informe de 1 a ${MAX_CAMPOS} campos`;
  }
  campos.forEach((campo, indice) => {
    const chave = `campos.${indice}.rotulo`;
    if (campo.rotulo.trim() === '') erros[chave] = 'Campo obrigatório';
    else if (campo.chave === '') erros[chave] = 'Use letras ou números no nome do campo';
    else if (CHAVES_RESERVADAS.has(campo.chave)) erros[chave] = 'Este nome é reservado; escolha outro';
    else if (vistas.has(campo.chave)) erros[chave] = 'Já existe outro campo com este nome';
    vistas.add(campo.chave);
    if (campo.entraNoCusto && campo.tipo !== 'NUMERO') {
      erros[`campos.${indice}.entraNoCusto`] = 'Só campos numéricos entram no custo';
    }
  });
  if (!campos.some((campo) => campo.tipo === 'NUMERO' && campo.entraNoCusto)) {
    erros.campos ??= 'Marque ao menos um campo numérico que entra no cálculo do custo';
  }
  if (Object.keys(erros).length > 0) throw new ValidationError('Dados inválidos', erros);
}

/**
 * Tipo de atividade criado pelo administrador (ex.: "Tratorista": horas x valor por hora).
 * O custo de uma atividade deste tipo é o PRODUTO dos campos numéricos marcados como "entra no custo".
 */
export class TipoPersonalizado extends Entity<TipoPersonalizadoProps> {
  readonly #nome: string;
  readonly #campos: readonly CampoTipo[];

  constructor(props: TipoPersonalizadoProps, id: number | null = null) {
    super(id);
    if (props.nome.trim() === '') throw new ValidationError('Nome é obrigatório', { nome: 'Campo obrigatório' });
    validarCampos(props.campos);
    this.#nome = props.nome.trim();
    this.#campos = props.campos.map((campo) => ({ ...campo }));
  }

  get nome(): string {
    return this.#nome;
  }

  /** Lê e valida o corpo da requisição do administrador (as chaves dos campos são geradas aqui). */
  static doCorpo(raw: unknown, id: number | null = null): TipoPersonalizado {
    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 80);
    const campos = reader.array('campos', { min: 1, max: MAX_CAMPOS }).map((item): CampoTipo => {
      const rotulo = item.string('rotulo', 60);
      return {
        chave: gerarChave(rotulo),
        rotulo,
        tipo: item.oneOf('tipo', TIPOS_CAMPO),
        unidade: item.optionalString('unidade', 20),
        entraNoCusto: item.boolean('entraNoCusto'),
      };
    });
    reader.finish();
    return new TipoPersonalizado({ nome, campos }, id);
  }

  /** Reconstrói o tipo a partir do JSON gravado no banco. */
  static restaurar(id: number, nome: string, camposGravados: unknown): TipoPersonalizado {
    const lista: unknown = typeof camposGravados === 'string' ? JSON.parse(camposGravados) : camposGravados;
    if (!Array.isArray(lista)) throw new Error(`Campos do tipo ${id} inválidos no banco`);
    const campos = lista.map((item: unknown): CampoTipo => {
      if (typeof item !== 'object' || item === null) throw new Error(`Campo inválido no tipo ${id}`);
      const { chave, rotulo, tipo, unidade, entraNoCusto } = item as Record<string, unknown>;
      const tipoCampo = TIPOS_CAMPO.find((candidato) => candidato === tipo);
      if (typeof chave !== 'string' || typeof rotulo !== 'string' || tipoCampo === undefined) {
        throw new Error(`Campo inválido no tipo ${id}`);
      }
      return {
        chave,
        rotulo,
        tipo: tipoCampo,
        unidade: typeof unidade === 'string' ? unidade : null,
        entraNoCusto: entraNoCusto === true,
      };
    });
    return new TipoPersonalizado({ nome, campos }, id);
  }

  /** Valida os valores informados numa atividade deste tipo (erros saem como "detalhes.<chave>"). */
  lerValores(raw: unknown): ValoresAtividade {
    const reader = new BodyReader(raw, 'detalhes.');
    const valores: ValoresAtividade = {};
    for (const campo of this.#campos) {
      if (campo.tipo === 'NUMERO') {
        valores[campo.chave] = reader.number(campo.chave, { min: 0 });
      } else {
        const texto = reader.optionalString(campo.chave, 120);
        if (texto !== null) valores[campo.chave] = texto;
      }
    }
    reader.finish();
    return valores;
  }

  /** Produto dos campos numéricos marcados como "entra no custo". */
  calcularCusto(valores: ValoresAtividade): number {
    return this.#campos
      .filter((campo) => campo.tipo === 'NUMERO' && campo.entraNoCusto)
      .reduce((produto, campo) => {
        const valor = valores[campo.chave];
        return produto * (typeof valor === 'number' ? valor : 0);
      }, 1);
  }

  /** Dois tipos têm a mesma estrutura quando os campos são idênticos (nome à parte). */
  mesmosCamposQue(outro: TipoPersonalizado): boolean {
    return JSON.stringify(this.#campos) === JSON.stringify(outro.toProps().campos);
  }

  toProps(): TipoPersonalizadoProps {
    return { nome: this.#nome, campos: this.#campos.map((campo) => ({ ...campo })) };
  }

  toJSON(): Record<string, unknown> {
    return { id: this.id, nome: this.#nome, campos: this.toProps().campos };
  }
}
