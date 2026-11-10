import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { contestacoesAdminApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { DataTable } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SelectField } from '../components/ui/SelectField';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ContestacaoResumoAdmin, Page, StatusContestacao } from '../types';
import { formatarDataHora, ROTULO_STATUS } from '../utils/contestacao';

const OPCOES = (Object.keys(ROTULO_STATUS) as StatusContestacao[]).map((valor) => ({ value: valor, label: ROTULO_STATUS[valor] }));

/** Administrador: fila de pedidos de contestação (os em análise primeiro, do mais antigo ao mais novo). */
export function ContestacoesAdminPage() {
  const [status, setStatus] = useState<StatusContestacao | ''>('EM_ANALISE');
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Page<ContestacaoResumoAdmin> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setErro(null);
    contestacoesAdminApi
      .listar({ page, limit: 10, status })
      .then((dados) => ativo && setResultado(dados))
      .catch((error: unknown) => ativo && setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar os pedidos.'));
    return () => {
      ativo = false;
    };
  }, [page, status]);

  return (
    <>
      <PageHeader title="Contestações (administração)" subtitle="Pedidos de donos reais que querem assumir uma propriedade já cadastrada. Leia os PDFs e decida." />
      {erro && <Alert>{erro}</Alert>}
      <div className="search-bar">
        <SelectField
          label="Situação"
          name="status"
          options={OPCOES}
          placeholder="Todas"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as StatusContestacao | '');
          }}
        />
      </div>
      {resultado === null ? (
        !erro && <p className="loading">Carregando…</p>
      ) : (
        <>
          <DataTable
            columns={[
              { header: 'Pedido', render: (c) => `#${c.id} — ${formatarDataHora(c.criadaEm)}` },
              { header: 'Solicitante', render: (c) => c.solicitante ?? '—' },
              { header: 'CAR informado', render: (c) => c.car },
              { header: 'PDFs', render: (c) => c.arquivos.length },
              { header: 'Situação', render: (c) => <StatusBadge status={c.status} /> },
            ]}
            rows={resultado.data}
            emptyMessage="Nenhum pedido nesta situação."
            renderActions={(c) => (
              <Link to={`/admin/contestacoes/${c.id}`} className="btn btn-secondary">
                {c.status === 'EM_ANALISE' ? 'Analisar' : 'Ver'}
              </Link>
            )}
          />
          <Pagination page={resultado.page} totalPages={resultado.totalPages} total={resultado.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
