import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import type { TipoPersonalizadoRepository } from '../tipos-atividade';
import { TIPOS_ATIVIDADE, type Atividade } from './Atividade';
import { AtividadeFactory } from './AtividadeFactory';
import type { Safra } from '../safras';
import { NotFoundError, ValidationError } from '../../shared/errors';
import { BodyReader } from '../../shared/utils/BodyReader';
import { CrudService } from '../../shared/crud/CrudService';

export class AtividadeService extends CrudService<Atividade> {
  protected readonly nomeRecurso = 'Atividade';
  protected override readonly filtros = { safraId: 'safra_id' };

  constructor(
    repository: ScopedRepository<Atividade>,
    private readonly safras: ScopedRepository<Safra>,
    private readonly tipos: Pick<TipoPersonalizadoRepository, 'findById'>,
  ) {
    super(repository);
  }

  protected async build(_userId: number, raw: unknown, id: number | null): Promise<Atividade> {
    const reader = new BodyReader(raw);
    const safraId = reader.integer('safraId');
    const tipo = reader.oneOf('tipo', TIPOS_ATIVIDADE);
    // `tipoId` só é exigido (e lido) nas atividades de tipo PERSONALIZADA.
    const tipoId = tipo === 'PERSONALIZADA' ? reader.integer('tipoId') : null;
    const data = reader.date('data');
    const descricao = reader.string('descricao', 255);
    const detalhes = reader.raw('detalhes');
    reader.finish();

    const base = { safraId, data, descricao };
    if (tipoId !== null) {
      const definicao = await this.tipos.findById(tipoId);
      if (!definicao) throw new ValidationError('Tipo de atividade inexistente', { tipoId: 'Tipo de atividade inexistente' });
      return AtividadeFactory.criar(tipo, base, detalhes, id, definicao);
    }
    // A fábrica escolhe a subclasse (Plantio/Aplicacao/Colheita) e valida os detalhes do tipo.
    return AtividadeFactory.criar(tipo, base, detalhes, id);
  }

  protected override async assertParents(userId: number, atividade: Atividade): Promise<void> {
    const { safraId } = atividade.toProps();
    if (!(await this.safras.findById(userId, safraId))) {
      throw new NotFoundError('Safra não encontrada', { safraId: 'Safra inexistente' });
    }
  }
}
