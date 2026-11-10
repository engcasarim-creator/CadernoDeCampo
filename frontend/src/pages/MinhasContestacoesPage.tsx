import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { contestacoesApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { ListaDeArquivos } from '../components/ui/ListaDeArquivos';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Contestacao, Page } from '../types';
import { formatarDataHora, ROTULO_EMAIL } from '../utils/contestacao';

/** Acompanhamento dos pedidos do próprio usuário: status, decisão do administrador e PDFs enviados. */
export function MinhasContestacoesPage() {
  const mensagem = (useLocation().state as { mensagem?: string } | null)?.mensagem;
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<Page<Contestacao> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    contestacoesApi
      .listar(page, 10)
      .then((dados) => ativo && setResultado(dados))
      .catch((error: unknown) => ativo && setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar os pedidos.'));
    return () => {
      ativo = false;
    };
  }, [page]);

  return (
    <>
      <PageHeader
        title="Minhas contestações"
        subtitle="Pedidos para assumir propriedades cadastradas por outra pessoa."
        actions={
          <Link to="/contestacoes/nova" className="btn btn-primary">
            Novo pedido
          </Link>
        }
      />
      {mensagem && <Alert type="success">{mensagem}</Alert>}
      {erro && <Alert>{erro}</Alert>}
      {resultado === null ? (
        !erro && <p className="loading">Carregando…</p>
      ) : resultado.data.length === 0 ? (
        <p className="empty">Você ainda não abriu nenhum pedido.</p>
      ) : (
        <>
          {resultado.data.map((c) => (
            <article className="card pedido" key={c.id}>
              <header className="pedido-topo">
                <h2>Imóvel {c.car}</h2>
                <StatusBadge status={c.status} />
              </header>
              <p className="muted">Enviado em {formatarDataHora(c.criadaEm)}</p>
              <p>{c.justificativa}</p>
              <ListaDeArquivos arquivos={c.arquivos} baixar={(arquivoId) => contestacoesApi.baixarArquivo(c.id, arquivoId)} />
              {c.decisao !== null && c.decididaEm !== null && (
                <div className={`decisao decisao-${c.status.toLowerCase()}`}>
                  <strong>Decisão em {formatarDataHora(c.decididaEm)}:</strong> {c.decisao}
                  {c.emailStatus && <small className="muted"> — {ROTULO_EMAIL[c.emailStatus]}</small>}
                </div>
              )}
            </article>
          ))}
          <Pagination page={resultado.page} totalPages={resultado.totalPages} total={resultado.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
