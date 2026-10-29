import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { DataTable, type TableColumn } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SelectField, type SelectOption } from '../components/ui/SelectField';
import type { ResourceConfig } from '../config/types';
import type { Page, ResourceRecord } from '../types';

const PAGE_SIZE = 10;

interface FilterBarProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange(value: string): void;
}

/** Filtro por registro "pai" (ex.: ver só os talhões de uma propriedade). */
function FilterBar({ label, options, value, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <SelectField
        label={`Filtrar por ${label.toLowerCase()}`}
        name="filtro"
        placeholder="Todos"
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Listagem paginada genérica. Cadastro/edição ficam em outra tela (ResourceFormPage). */
export function ResourceListPage<T extends ResourceRecord>({ config }: { config: ResourceConfig<T> }) {
  const location = useLocation() as { state: { mensagem?: string } | null };
  const [page, setPage] = useState(1);
  const [filtro, setFiltro] = useState('');
  const [resultado, setResultado] = useState<Page<T> | null>(null);
  const [opcoesPai, setOpcoesPai] = useState<SelectOption[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(location.state?.mensagem ?? null);

  // Ao trocar de recurso (ex.: de Talhões para Safras) volta ao estado inicial.
  useEffect(() => {
    setPage(1);
    setFiltro('');
    setResultado(null);
    setMensagem(location.state?.mensagem ?? null);
  }, [config, location.state]);

  useEffect(() => {
    if (!config.filter) {
      setOpcoesPai([]);
      return;
    }
    config.filter
      .loadOptions()
      .then(setOpcoesPai)
      .catch(() => setOpcoesPai([]));
  }, [config]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const filter = config.filter && filtro ? { param: config.filter.param, value: filtro } : undefined;
      const dados = await config.api.list({ page, limit: PAGE_SIZE, filter });
      // Se apagou o último item da última página, volta uma página.
      if (dados.data.length === 0 && page > 1) setPage(page - 1);
      else setResultado(dados);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar a listagem.');
    } finally {
      setCarregando(false);
    }
  }, [config, page, filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const nomesPai = useMemo(() => new Map(opcoesPai.map((opcao) => [opcao.value, opcao.label])), [opcoesPai]);

  const Extra = config.extra;

  const colunas: TableColumn<T>[] = config.columns.map((coluna) => ({
    header: coluna.header,
    render: (item) => {
      const paiId = config.parentOf?.(item);
      const nomePai = paiId === undefined ? '' : (nomesPai.get(String(paiId)) ?? `#${paiId}`);
      return coluna.render(item, nomePai);
    },
  }));

  async function handleDelete(item: T) {
    if (!window.confirm(`Excluir este registro de ${config.singular.toLowerCase()}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErro(null);
    try {
      await config.api.remove(item.id);
      setMensagem(`${config.singular} excluído(a) com sucesso.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível excluir o registro.');
    }
  }

  return (
    <>
      <PageHeader
        title={config.plural}
        actions={
          <Link to={`/${config.path}/novo`} className="btn btn-primary">
            + {config.novo}
          </Link>
        }
      />
      {mensagem && <Alert type="success">{mensagem}</Alert>}
      {erro && <Alert>{erro}</Alert>}
      {Extra && <Extra />}
      {config.filter && (
        <FilterBar
          label={config.filter.label}
          options={opcoesPai}
          value={filtro}
          onChange={(valor) => {
            setFiltro(valor);
            setPage(1);
          }}
        />
      )}
      {carregando && !resultado ? (
        <p className="loading">Carregando…</p>
      ) : (
        resultado && (
          <>
            <DataTable
              columns={colunas}
              rows={resultado.data}
              emptyMessage={`Nenhum(a) ${config.singular.toLowerCase()} cadastrado(a) ainda.`}
              renderActions={(item) => (
                <div className="row-actions">
                  <Link to={`/${config.path}/${item.id}/editar`} className="btn btn-secondary">
                    Editar
                  </Link>
                  <Button variant="danger" onClick={() => void handleDelete(item)}>
                    Excluir
                  </Button>
                </div>
              )}
            />
            <Pagination
              page={resultado.page}
              totalPages={resultado.totalPages}
              total={resultado.total}
              onChange={setPage}
            />
          </>
        )
      )}
    </>
  );
}
