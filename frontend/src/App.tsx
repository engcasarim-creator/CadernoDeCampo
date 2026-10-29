import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { atividadesConfig, propriedadesConfig, safrasConfig, talhoesConfig } from './config/resources';
import type { ResourceConfig } from './config/types';
import { AuthProvider } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ResourceFormPage } from './pages/ResourceFormPage';
import { ResourceListPage } from './pages/ResourceListPage';
import type { ResourceRecord } from './types';

/** Gera as 3 rotas de um CRUD: listagem, cadastro e edição (telas separadas). */
function resourceRoutes<T extends ResourceRecord>(config: ResourceConfig<T>) {
  return (
    <>
      <Route path={config.path} element={<ResourceListPage config={config} />} />
      <Route path={`${config.path}/novo`} element={<ResourceFormPage config={config} />} />
      <Route path={`${config.path}/:id/editar`} element={<ResourceFormPage config={config} />} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              {resourceRoutes(propriedadesConfig)}
              {resourceRoutes(talhoesConfig)}
              {resourceRoutes(safrasConfig)}
              {resourceRoutes(atividadesConfig)}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
