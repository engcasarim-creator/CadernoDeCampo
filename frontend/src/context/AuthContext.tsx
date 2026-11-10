import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler, tokenStorage } from '../api/client';
import type { Usuario } from '../types';

interface AuthContextValue {
  /** Usuário logado (disponível em qualquer tela) ou null. */
  usuario: Usuario | null;
  /** true enquanto verifica se o token salvo ainda é válido. */
  carregando: boolean;
  login(email: string, senha: string): Promise<void>;
  logout(): void;
  atualizarUsuario(usuario: Usuario): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(() => tokenStorage.get() !== null);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUsuario(null);
  }, []);

  // Ao abrir o app com um token salvo, busca o usuário para restaurar a sessão.
  useEffect(() => {
    if (tokenStorage.get() === null) return;
    authApi
      .me()
      .then(setUsuario)
      .catch(() => tokenStorage.clear())
      .finally(() => setCarregando(false));
  }, []);

  // Token expirado em qualquer chamada -> volta para o login.
  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await authApi.login(email, senha);
    tokenStorage.set(resposta.token);
    setUsuario(resposta.usuario);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ usuario, carregando, login, logout, atualizarUsuario: setUsuario }),
    [usuario, carregando, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return context;
}
