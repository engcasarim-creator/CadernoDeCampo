import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Só deixa passar administradores (a API também confere; isto evita telas que dariam 403). */
export function AdminRoute() {
  const { usuario } = useAuth();
  if (usuario?.papel !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
