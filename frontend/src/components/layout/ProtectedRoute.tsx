import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Só deixa passar quem está logado; os demais vão para /login. */
export function ProtectedRoute() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="loading">Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}
