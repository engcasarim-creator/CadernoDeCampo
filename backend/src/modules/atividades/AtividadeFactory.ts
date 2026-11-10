import type { Atividade, AtividadeBase, TipoAtividade } from './Atividade';
import type { TipoPersonalizado } from '../tipos-atividade';
import { Aplicacao } from './Aplicacao';
import { AtividadePersonalizada } from './AtividadePersonalizada';
import { Colheita } from './Colheita';
import { Plantio } from './Plantio';

type Construtor = (base: AtividadeBase, detalhes: unknown, id: number | null) => Atividade;

/**
 * Registro de tipos (Aberto/Fechado): para criar um novo tipo de atividade
 * (ex.: IRRIGACAO) basta criar a subclasse e acrescentar UMA linha aqui,
 * sem alterar services, controllers ou repositórios.
 */
const REGISTRO: Record<Exclude<TipoAtividade, 'PERSONALIZADA'>, Construtor> = {
  PLANTIO: (base, detalhes, id) => new Plantio(base, Plantio.lerDetalhes(detalhes), id),
  APLICACAO: (base, detalhes, id) => new Aplicacao(base, Aplicacao.lerDetalhes(detalhes), id),
  COLHEITA: (base, detalhes, id) => new Colheita(base, Colheita.lerDetalhes(detalhes), id),
};

export class AtividadeFactory {
  /**
   * Tipos fixos vêm do registro acima. O tipo PERSONALIZADA depende da definição criada
   * pelo administrador (campos e fórmula de custo), que precisa ser informada.
   */
  static criar(
    tipo: TipoAtividade,
    base: AtividadeBase,
    detalhes: unknown,
    id: number | null = null,
    definicao: TipoPersonalizado | null = null,
  ): Atividade {
    if (tipo === 'PERSONALIZADA') {
      if (definicao === null) throw new Error('Atividade PERSONALIZADA exige a definição do tipo');
      return new AtividadePersonalizada(base, definicao, detalhes, id);
    }
    return REGISTRO[tipo](base, detalhes, id);
  }
}
