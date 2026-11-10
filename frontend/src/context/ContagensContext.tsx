import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { contestacoesAdminApi, notificacoesApi } from '../api/resources';
import { useAuth } from './AuthContext';

interface Contagens {
  /** Avisos ainda não lidos do usuário logado. */
  naoLidas: number;
  /** Pedidos de contestação aguardando decisão (só administrador). */
  pendentes: number;
  /** Recarrega agora (ex.: depois de marcar um aviso como lido). */
  atualizar(): void;
}

const ContagensContext = createContext<Contagens | null>(null);
const INTERVALO_MS = 60_000;

/** Mantém atualizados os números do sino e da fila do administrador: ao trocar de tela e a cada minuto. */
export function ContagensProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const local = useLocation();
  const [naoLidas, setNaoLidas] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const [versao, setVersao] = useState(0);
  const ehAdmin = usuario?.papel === 'ADMIN';

  useEffect(() => {
    let ativo = true;
    // Falhas aqui são silenciosas: o número é só um aviso visual, a tela em si mostra erros.
    notificacoesApi
      .listar(1, 1)
      .then((lista) => ativo && setNaoLidas(lista.naoLidas))
      .catch(() => undefined);
    if (ehAdmin) {
      contestacoesAdminApi
        .listar({ page: 1, limit: 1, status: 'EM_ANALISE' })
        .then((lista) => ativo && setPendentes(lista.total))
        .catch(() => undefined);
    }
    return () => {
      ativo = false;
    };
  }, [ehAdmin, local.pathname, versao]);

  useEffect(() => {
    const timer = setInterval(() => setVersao((v) => v + 1), INTERVALO_MS);
    return () => clearInterval(timer);
  }, []);

  const atualizar = useCallback(() => setVersao((v) => v + 1), []);
  const value = useMemo(() => ({ naoLidas, pendentes, atualizar }), [naoLidas, pendentes, atualizar]);
  return <ContagensContext.Provider value={value}>{children}</ContagensContext.Provider>;
}

export function useContagens(): Contagens {
  const context = useContext(ContagensContext);
  if (!context) throw new Error('useContagens deve ser usado dentro de <ContagensProvider>');
  return context;
}
