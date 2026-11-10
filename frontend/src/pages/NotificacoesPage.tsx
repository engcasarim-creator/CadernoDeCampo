import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { notificacoesApi } from '../api/resources';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { useContagens } from '../context/ContagensContext';
import type { ListaDeNotificacoes } from '../types';
import { formatarDataHora } from '../utils/contestacao';

/** Avisos do sistema para o usuário (ex.: decisão de um pedido de contestação). */
export function NotificacoesPage() {
  const { atualizar } = useContagens();
  const [page, setPage] = useState(1);
  const [lista, setLista] = useState<ListaDeNotificacoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    notificacoesApi
      .listar(page, 10)
      .then(setLista)
      .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar os avisos.'));
  }, [page]);

  useEffect(carregar, [carregar]);

  async function marcar(id: number) {
    await notificacoesApi.marcarLida(id).catch(() => undefined);
    carregar();
    atualizar();
  }

  async function marcarTodas() {
    await notificacoesApi.marcarTodasLidas().catch(() => undefined);
    carregar();
    atualizar();
  }

  return (
    <>
      <PageHeader
        title="Avisos"
        actions={
          lista && lista.naoLidas > 0 ? (
            <Button variant="secondary" onClick={() => void marcarTodas()}>
              Marcar todos como lidos
            </Button>
          ) : undefined
        }
      />
      {erro && <Alert>{erro}</Alert>}
      {lista === null ? (
        !erro && <p className="loading">Carregando…</p>
      ) : lista.data.length === 0 ? (
        <p className="empty">Você não tem avisos.</p>
      ) : (
        <>
          <ul className="avisos">
            {lista.data.map((n) => (
              <li key={n.id} className={`card aviso${n.lida ? '' : ' nao-lido'}`}>
                <div>
                  <strong>{n.titulo}</strong>
                  <p>{n.mensagem}</p>
                  <small className="muted">{formatarDataHora(n.criadaEm)}</small>
                </div>
                {!n.lida && (
                  <Button variant="secondary" onClick={() => void marcar(n.id)}>
                    Marcar como lido
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={lista.page} totalPages={lista.totalPages} total={lista.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
