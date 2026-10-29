import { describe, expect, it } from 'vitest';
import type { Atividade } from '../src/entities/atividades/Atividade';
import { AtividadeFactory } from '../src/entities/atividades/AtividadeFactory';
import { ResumoComparativo } from '../src/entities/atividades/ResumoComparativo';
import { ValidationError } from '../src/errors';

const base = { safraId: 1, data: '2026-10-23', descricao: 'Atividade de teste' };

describe('Atividade (polimorfismo)', () => {
  it('cada tipo calcula o custo do seu jeito', () => {
    const atividades: Atividade[] = [
      AtividadeFactory.criar('PLANTIO', base, { sementeKg: 100, precoPorKg: 12.5 }),
      AtividadeFactory.criar('APLICACAO', base, { produto: 'Glifosato', doseHa: 2, areaHa: 10, precoPorUnidade: 30 }),
      AtividadeFactory.criar('COLHEITA', base, { sacas: 500, custoPorSaca: 4 }),
    ];
    expect(atividades.map((a) => a.calcularCusto())).toEqual([1250, 600, 2000]);
    expect(atividades.map((a) => a.tipo)).toEqual(['PLANTIO', 'APLICACAO', 'COLHEITA']);
  });

  it('cada tipo decide como entra no comparativo (aplicação não participa)', () => {
    const resumo = new ResumoComparativo(1, 'Soja', '2026/2027');
    [
      AtividadeFactory.criar('PLANTIO', base, { sementeKg: 100, precoPorKg: 10 }),
      AtividadeFactory.criar('APLICACAO', base, { produto: 'X', doseHa: 1, areaHa: 10, precoPorUnidade: 99 }),
      AtividadeFactory.criar('COLHEITA', base, { sacas: 10, custoPorSaca: 5 }),
    ].forEach((atividade) => atividade.contribuirPara(resumo));

    expect(resumo.toJSON()).toMatchObject({
      plantio: { atividades: 1, sementeKg: 100, custo: 1000 },
      colheita: { atividades: 1, sacas: 10, kg: 600, custo: 50 },
      diferenca: { quantidadeKg: 500, custo: -950 },
      relacaoColhidoPlantado: 6,
    });
  });

  it('serializa o custo total e os detalhes na API', () => {
    const json = AtividadeFactory.criar('COLHEITA', base, { sacas: 10, custoPorSaca: 2.5 }).toJSON();
    expect(json).toMatchObject({ tipo: 'COLHEITA', custoTotal: 25, detalhes: { sacas: 10, custoPorSaca: 2.5 } });
  });

  it('rejeita detalhes inválidos com erro por campo', () => {
    try {
      AtividadeFactory.criar('APLICACAO', base, { doseHa: -1 });
      expect.unreachable('deveria lançar ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const details = (error as ValidationError).details ?? {};
      expect(Object.keys(details)).toEqual(
        expect.arrayContaining(['detalhes.produto', 'detalhes.doseHa', 'detalhes.areaHa']),
      );
    }
  });

  it('exige descrição', () => {
    expect(() => AtividadeFactory.criar('COLHEITA', { ...base, descricao: ' ' }, { sacas: 1, custoPorSaca: 1 })).toThrow(
      ValidationError,
    );
  });
});
