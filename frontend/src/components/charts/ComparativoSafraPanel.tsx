import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { comparativoApi, safrasApi } from '../../api/resources';
import type { ComparativoSafra } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';
import { Alert } from '../ui/Alert';
import { SelectField, type SelectOption } from '../ui/SelectField';
import { BarComparison } from './BarComparison';

function quantidadeResumo(dados: ComparativoSafra): string {
  if (dados.relacaoColhidoPlantado === null) return 'Registre um plantio para comparar com a colheita.';
  const diferenca = dados.diferenca.quantidadeKg;
  const sinal = diferenca >= 0 ? '+' : '−';
  return (
    `Foram colhidos ${formatNumber(dados.relacaoColhidoPlantado)} kg para cada 1 kg de semente plantado ` +
    `(diferença de ${sinal}${formatNumber(Math.abs(diferenca))} kg).`
  );
}

function custoResumo(dados: ComparativoSafra): string {
  const diferenca = dados.diferenca.custo;
  if (diferenca === 0) return 'Colher custou o mesmo que plantar.';
  const comparacao = diferenca > 0 ? 'a mais' : 'a menos';
  return `Colher custou ${formatCurrency(Math.abs(diferenca))} ${comparacao} do que plantar.`;
}

function Resultado({ dados }: { dados: ComparativoSafra }) {
  if (dados.plantio.atividades === 0 && dados.colheita.atividades === 0) {
    return <p className="hint-text">Esta safra ainda não tem atividades de plantio ou colheita.</p>;
  }
  return (
    <>
      <div className="comparativo-grid">
        <BarComparison
          title="Quantidade (kg)"
          format={(valor) => `${formatNumber(valor)} kg`}
          summary={quantidadeResumo(dados)}
          bars={[
            { label: 'Semente plantada', value: dados.plantio.sementeKg, tone: 'plantio' },
            { label: 'Colhido', value: dados.colheita.kg, tone: 'colheita' },
          ]}
        />
        <BarComparison
          title="Custo (R$)"
          format={formatCurrency}
          summary={custoResumo(dados)}
          bars={[
            { label: 'Custo do plantio', value: dados.plantio.custo, tone: 'plantio' },
            { label: 'Custo da colheita', value: dados.colheita.custo, tone: 'colheita' },
          ]}
        />
      </div>
      <p className="hint-text">
        Colhido = {formatNumber(dados.colheita.sacas)} sacas × {dados.kgPorSaca} kg por saca. O custo do plantio
        considera as sementes; as aplicações não entram neste comparativo.
      </p>
    </>
  );
}

/** Painel "Plantio × Colheita": escolhe uma safra e compara o plantado com o colhido (quantidade e custo). */
export function ComparativoSafraPanel() {
  const [safras, setSafras] = useState<SelectOption[]>([]);
  const [safraId, setSafraId] = useState('');
  const [dados, setDados] = useState<ComparativoSafra | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    safrasApi
      .list({ page: 1, limit: 100 })
      .then((pagina) => {
        const opcoes = pagina.data.map((safra) => ({ value: String(safra.id), label: `${safra.cultura} ${safra.anoAgricola}` }));
        setSafras(opcoes);
        setSafraId((atual) => atual || opcoes[0]?.value || '');
      })
      .catch(() => setSafras([]));
  }, []);

  useEffect(() => {
    if (!safraId) {
      setDados(null);
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro(null);
    comparativoApi
      .porSafra(Number(safraId))
      .then((resposta) => ativo && setDados(resposta))
      .catch((error: unknown) => {
        if (!ativo) return;
        setDados(null);
        setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar o comparativo.');
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [safraId]);

  return (
    <section className="card comparativo" aria-labelledby="comparativo-titulo">
      <div className="comparativo-header">
        <h2 id="comparativo-titulo">Plantio × Colheita</h2>
        <SelectField
          label="Safra"
          name="safra-comparativo"
          options={safras}
          value={safraId}
          onChange={(event) => setSafraId(event.target.value)}
        />
      </div>
      {safras.length === 0 && <p className="hint-text">Cadastre uma safra para ver o comparativo.</p>}
      {erro && <Alert>{erro}</Alert>}
      {carregando && !dados && <p className="loading">Carregando…</p>}
      {dados && <Resultado dados={dados} />}
    </section>
  );
}
