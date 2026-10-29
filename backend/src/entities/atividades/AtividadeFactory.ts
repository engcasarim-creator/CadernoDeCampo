import type { Atividade, AtividadeBase, TipoAtividade } from './Atividade';
import { Aplicacao } from './Aplicacao';
import { Colheita } from './Colheita';
import { Plantio } from './Plantio';

type Construtor = (base: AtividadeBase, detalhes: unknown, id: number | null) => Atividade;

/**
 * Registro de tipos (Aberto/Fechado): para criar um novo tipo de atividade
 * (ex.: IRRIGACAO) basta criar a subclasse e acrescentar UMA linha aqui,
 * sem alterar services, controllers ou repositórios.
 */
const REGISTRO: Record<TipoAtividade, Construtor> = {
  PLANTIO: (base, detalhes, id) => new Plantio(base, Plantio.lerDetalhes(detalhes), id),
  APLICACAO: (base, detalhes, id) => new Aplicacao(base, Aplicacao.lerDetalhes(detalhes), id),
  COLHEITA: (base, detalhes, id) => new Colheita(base, Colheita.lerDetalhes(detalhes), id),
};

export class AtividadeFactory {
  static criar(tipo: TipoAtividade, base: AtividadeBase, detalhes: unknown, id: number | null = null): Atividade {
    return REGISTRO[tipo](base, detalhes, id);
  }
}
