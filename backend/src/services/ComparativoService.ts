import type { ScopedRepository } from '../contracts/repositories';
import type { Atividade } from '../entities/atividades/Atividade';
import { ResumoComparativo } from '../entities/atividades/ResumoComparativo';
import type { Safra } from '../entities/Safra';
import { NotFoundError } from '../errors';

const TAMANHO_LOTE = 100;

/** Monta o comparativo plantio × colheita de uma safra (uma única responsabilidade: agregar). */
export class ComparativoService {
  constructor(
    private readonly atividades: ScopedRepository<Atividade>,
    private readonly safras: ScopedRepository<Safra>,
  ) {}

  async porSafra(userId: number, safraId: number): Promise<ResumoComparativo> {
    const safra = await this.safras.findById(userId, safraId);
    if (!safra) throw new NotFoundError('Safra não encontrada');

    const { cultura, anoAgricola } = safra.toProps();
    const resumo = new ResumoComparativo(safraId, cultura, anoAgricola);
    const filtro = { column: 'safra_id', value: safraId };

    // Percorre todas as páginas: o comparativo não pode ficar incompleto por causa da paginação.
    let lidas = 0;
    for (let page = 1; ; page += 1) {
      const lote = await this.atividades.findPage(userId, { page, limit: TAMANHO_LOTE }, filtro);
      lote.items.forEach((atividade) => atividade.contribuirPara(resumo));
      lidas += lote.items.length;
      if (lote.items.length === 0 || lidas >= lote.total) break;
    }
    return resumo;
  }
}
