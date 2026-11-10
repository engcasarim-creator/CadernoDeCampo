import type { CaixaGeografica } from '../../shared/utils/geo';

/**
 * O mínimo que se sabe de uma propriedade de QUALQUER usuário para detectar duplicidade.
 * Não inclui dados pessoais do dono: só o id dele, para saber se é o próprio usuário.
 */
export interface PropriedadeRegistrada {
  id: number;
  usuarioId: number;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Consulta GLOBAL (todos os usuários) usada apenas para impedir que a mesma propriedade seja cadastrada
 * por duas pessoas. É a única exceção à regra "todo acesso é filtrado pelo usuário dono"; por isso fica
 * numa porta própria, pequena e só de leitura, e o service nunca devolve esses dados ao cliente.
 */
export interface RegistroDePropriedades {
  buscarPorCar(car: string): Promise<PropriedadeRegistrada | null>;
  buscarPorCcir(ccir: string): Promise<PropriedadeRegistrada | null>;
  /** Propriedades cujo centroide cai dentro do retângulo (pré-filtro; a distância exata o service confere). */
  buscarNaCaixa(caixa: CaixaGeografica): Promise<PropriedadeRegistrada[]>;
}
