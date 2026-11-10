import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminRoute } from './components/layout/AdminRoute';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import {
  atividadesConfig,
  propriedadesConfig,
  safrasConfig,
  talhoesConfig,
  tiposAdminConfig,
  usuariosAdminConfig,
} from './config/resources';
import type { ResourceConfig } from './config/types';
import { AuthProvider } from './context/AuthContext';
import { ContestacaoAdminDetalhePage } from './pages/ContestacaoAdminDetalhePage';
import { ContestacaoNovaPage } from './pages/ContestacaoNovaPage';
import { ContestacoesAdminPage } from './pages/ContestacoesAdminPage';
import { MinhasContestacoesPage } from './pages/MinhasContestacoesPage';
import { NotificacoesPage } from './pages/NotificacoesPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ResourceFormPage } from './pages/ResourceFormPage';
import { PropriedadeAdminDetalhePage } from './pages/PropriedadeAdminDetalhePage';
import { PropriedadesAdminPage } from './pages/PropriedadesAdminPage';
import { ResourceListPage } from './pages/ResourceListPage';
import { TipoAtividadeFormPage } from './pages/TipoAtividadeFormPage';
import type { ResourceRecord } from './types';

/** Gera as 3 rotas de um CRUD: listagem, cadastro e edição (telas separadas). */
function resourceRoutes<T extends ResourceRecord>(config: ResourceConfig<T>) {
  return (
    <>
      <Route path={config.path} element={<ResourceListPage config={config} />} />
      <Route path={`${config.path}/novo`} element={<ResourceFormPage key={config.path} config={config} />} />
      <Route path={`${config.path}/:id/editar`} element={<ResourceFormPage key={config.path} config={config} />} />
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
              <Route path="contestacoes" element={<MinhasContestacoesPage />} />
              <Route path="contestacoes/nova" element={<ContestacaoNovaPage />} />
              <Route path="notificacoes" element={<NotificacoesPage />} />

              {/* Área de administração */}
              <Route element={<AdminRoute />}>
                <Route path={usuariosAdminConfig.path} element={<ResourceListPage config={usuariosAdminConfig} />} />
                <Route path={`${usuariosAdminConfig.path}/:id/editar`} element={<ResourceFormPage config={usuariosAdminConfig} />} />
                <Route path="admin/propriedades" element={<PropriedadesAdminPage />} />
                <Route path="admin/propriedades/:id" element={<PropriedadeAdminDetalhePage />} />
                <Route path="admin/contestacoes" element={<ContestacoesAdminPage />} />
                <Route path="admin/contestacoes/:id" element={<ContestacaoAdminDetalhePage />} />
                <Route path={tiposAdminConfig.path} element={<ResourceListPage config={tiposAdminConfig} />} />
                <Route path={`${tiposAdminConfig.path}/novo`} element={<TipoAtividadeFormPage />} />
                <Route path={`${tiposAdminConfig.path}/:id/editar`} element={<TipoAtividadeFormPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
