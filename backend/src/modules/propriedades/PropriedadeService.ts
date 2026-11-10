import type { AreaPorPropriedade } from './AreaPorPropriedade';
import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import { Propriedade } from './Propriedade';
import { ConflictError, ValidationError } from '../../shared/errors';
import { BodyReader } from '../../shared/utils/BodyReader';
import { caixaEmVolta, distanciaMetros } from '../../shared/utils/geo';
import { normalizarCar, normalizarCcir } from './identificadores';
import type { PropriedadeRegistrada, RegistroDePropriedades } from './RegistroDePropriedades';
import { formatNumber, round2 } from '../../shared/utils/numbers';
import { CrudService } from '../../shared/crud/CrudService';

/**
 * Dois centroides mais próximos que isso são tratados como a MESMA propriedade (50 m).
 * Vizinhos de verdade ficam bem mais longe: um imóvel de 1 ha já tem 100 m de lado.
 */
export const RAIO_DE_DUPLICIDADE_M = 50;

const MSG_OUTRO_USUARIO = 'Uma propriedade só pode estar cadastrada por um usuário, e esta já está vinculada a outro. Se ela é sua, abra um pedido de contestação com os seus documentos.';

export class PropriedadeService extends CrudService<Propriedade> {
  protected readonly nomeRecurso = 'Propriedade';

  constructor(
    repository: ScopedRepository<Propriedade>,
    private readonly areas: AreaPorPropriedade,
    private readonly registro: RegistroDePropriedades,
  ) {
    super(repository);
  }

  protected build(userId: number, raw: unknown, id: number | null): Propriedade {
    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 120);
    const municipio = reader.string('municipio', 120);
    const uf = reader.string('uf', 2).toUpperCase();
    const areaHa = reader.number('areaHa', { min: 0, exclusive: true });
    // Centroide: base do mapa da tela inicial.
    const latitude = reader.number('latitude', { min: -90, max: 90 });
    const longitude = reader.number('longitude', { min: -180, max: 180 });
    // Identificação oficial do imóvel: obrigatória e usada para impedir cadastro duplicado.
    const car = normalizarCar(reader.string('car', 60));
    const ccir = normalizarCcir(reader.string('ccir', 30));
    reader.finish();
    return new Propriedade({ usuarioId: userId, nome, municipio, uf, areaHa, latitude, longitude, car, ccir }, id);
  }

  protected override async assertBusinessRules(userId: number, propriedade: Propriedade): Promise<void> {
    await this.assertSemDuplicidade(userId, propriedade);
    await this.assertAreaSuficiente(propriedade);
  }

  /**
   * Uma propriedade só pode ter UM responsável. Confere CAR, CCIR e proximidade do centroide contra TODAS as
   * propriedades (inclusive de outros usuários). Se o conflito é com outro usuário a resposta é genérica:
   * nunca revela nome, propriedade ou dados de quem já cadastrou.
   */
  private async assertSemDuplicidade(userId: number, propriedade: Propriedade): Promise<void> {
    const { car, ccir, latitude, longitude } = propriedade.toProps();
    const erros: Record<string, string> = {};
    const mesmo = (outra: PropriedadeRegistrada | null): outra is PropriedadeRegistrada =>
      outra !== null && outra.id !== propriedade.id;

    if (car !== null) {
      const outra = await this.registro.buscarPorCar(car);
      if (mesmo(outra)) erros.car = this.mensagemDeConflito('CAR', outra, userId);
    }
    if (ccir !== null) {
      const outra = await this.registro.buscarPorCcir(ccir);
      if (mesmo(outra)) erros.ccir = this.mensagemDeConflito('CCIR', outra, userId);
    }
    if (latitude !== null && longitude !== null) {
      const centro = { latitude, longitude };
      const candidatas = await this.registro.buscarNaCaixa(caixaEmVolta(centro, RAIO_DE_DUPLICIDADE_M));
      const vizinha = candidatas
        .filter((c): c is PropriedadeRegistrada & { latitude: number; longitude: number } =>
          mesmo(c) && c.latitude !== null && c.longitude !== null,
        )
        .map((c) => ({ c, metros: distanciaMetros(centro, { latitude: c.latitude, longitude: c.longitude }) }))
        .filter(({ metros }) => metros <= RAIO_DE_DUPLICIDADE_M)
        .sort((a, b) => a.metros - b.metros)[0];
      if (vizinha) {
        erros.latitude =
          vizinha.c.usuarioId === userId
            ? `Este centroide está a ${Math.round(vizinha.metros)} m da sua propriedade "${vizinha.c.nome}". Confira se não é a mesma.`
            : MSG_OUTRO_USUARIO;
      }
    }

    // Sinal para o front oferecer "este imóvel é meu" (abrir pedido de contestação). Não revela nada do outro dono.
    if (Object.values(erros).includes(MSG_OUTRO_USUARIO)) {
      erros.contestavel = 'Se este imóvel é seu, abra um pedido de contestação com os documentos em PDF.';
    }
    if (Object.keys(erros).length > 0) {
      throw new ConflictError('Esta propriedade já está cadastrada', erros);
    }
  }

  private mensagemDeConflito(rotulo: string, outra: PropriedadeRegistrada, userId: number): string {
    return outra.usuarioId === userId ? `Você já cadastrou este ${rotulo} na propriedade "${outra.nome}".` : MSG_OUTRO_USUARIO;
  }

  /** Ao editar, a nova área não pode ficar menor do que a soma dos talhões já cadastrados. */
  private async assertAreaSuficiente(propriedade: Propriedade): Promise<void> {
    if (propriedade.id === null) return; // propriedade nova ainda não tem talhões
    const usada = round2(await this.areas.somaAreas(propriedade.id, null));
    const { areaHa } = propriedade.toProps();

    if (round2(areaHa) < usada) {
      throw new ValidationError('A área da propriedade é menor que a soma dos seus talhões', {
        areaHa:
          `Os talhões desta propriedade já somam ${formatNumber(usada)} ha. ` +
          `A área da propriedade não pode ser menor que isso (você informou ${formatNumber(areaHa)} ha).`,
      });
    }
  }
}
