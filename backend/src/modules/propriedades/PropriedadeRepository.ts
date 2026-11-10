import type { RowDataPacket } from 'mysql2/promise';
import { Propriedade, type PropriedadeProps } from './Propriedade';
import { propriedadeDeLinha } from './propriedadeDeLinha';
import { BaseRepository } from '../../shared/crud/BaseRepository';
import { ConflictError } from '../../shared/errors';
import type { CaixaGeografica } from '../../shared/utils/geo';
import type { PropriedadeRegistrada, RegistroDePropriedades } from './RegistroDePropriedades';

/** Índices UNIQUE (migrações 9 e 10): a rede de segurança caso duas requisições passem juntas pela checagem do service. */
const MENSAGEM_POR_INDICE: Readonly<Record<string, [campo: string, mensagem: string]>> = {
  uq_propriedades_car: ['car', 'Este CAR já está vinculado a uma propriedade cadastrada.'],
  uq_propriedades_ccir: ['ccir', 'Este CCIR já está vinculado a uma propriedade cadastrada.'],
};

function conflitoDeUnicidade(error: unknown): ConflictError | null {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ER_DUP_ENTRY') return null;
  const texto = 'sqlMessage' in error && typeof error.sqlMessage === 'string' ? error.sqlMessage : '';
  const indice = Object.keys(MENSAGEM_POR_INDICE).find((nome) => texto.includes(nome));
  if (!indice) return null;
  const [campo, mensagem] = MENSAGEM_POR_INDICE[indice];
  return new ConflictError(mensagem, { [campo]: mensagem });
}

export class PropriedadeRepository
  extends BaseRepository<Propriedade, PropriedadeProps>
  implements RegistroDePropriedades
{
  protected readonly table = 'propriedades';
  protected readonly alias = 'p';
  protected readonly joins = '';
  protected readonly ownerColumn = 'p.usuario_id';

  protected fromRow(row: RowDataPacket): Propriedade {
    return propriedadeDeLinha(row);
  }

  protected toColumns(props: PropriedadeProps): Record<string, unknown> {
    return {
      usuario_id: props.usuarioId,
      nome: props.nome,
      municipio: props.municipio,
      uf: props.uf,
      area_ha: props.areaHa,
      latitude: props.latitude,
      longitude: props.longitude,
      car: props.car,
      ccir: props.ccir,
    };
  }

  override async create(entity: Propriedade): Promise<Propriedade> {
    try {
      return await super.create(entity);
    } catch (error) {
      throw conflitoDeUnicidade(error) ?? error;
    }
  }

  override async update(entity: Propriedade): Promise<Propriedade> {
    try {
      return await super.update(entity);
    } catch (error) {
      throw conflitoDeUnicidade(error) ?? error;
    }
  }

  // ---- RegistroDePropriedades: consultas globais (sem filtro de usuário) só para detectar duplicidade ----

  async buscarPorCar(car: string): Promise<PropriedadeRegistrada | null> {
    return this.buscarUma('car = ?', [car]);
  }

  async buscarPorCcir(ccir: string): Promise<PropriedadeRegistrada | null> {
    return this.buscarUma('ccir = ?', [ccir]);
  }

  async buscarNaCaixa(caixa: CaixaGeografica): Promise<PropriedadeRegistrada[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, usuario_id, nome, latitude, longitude FROM propriedades
       WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
      [caixa.latMin, caixa.latMax, caixa.lngMin, caixa.lngMax],
    );
    return rows.map((row) => this.paraRegistrada(row));
  }

  private async buscarUma(condicao: string, params: string[]): Promise<PropriedadeRegistrada | null> {
    // `condicao` vem sempre do código (nunca do usuário); os valores são parametrizados.
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, usuario_id, nome, latitude, longitude FROM propriedades WHERE ${condicao} LIMIT 1`,
      params,
    );
    return rows[0] ? this.paraRegistrada(rows[0]) : null;
  }

  private paraRegistrada(row: RowDataPacket): PropriedadeRegistrada {
    return {
      id: Number(row.id),
      usuarioId: Number(row.usuario_id),
      nome: String(row.nome),
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
    };
  }
}
