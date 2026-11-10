import { Outlet } from 'react-router-dom';
import { ContagensProvider } from '../../context/ContagensContext';
import { Navbar } from './Navbar';

/** Estrutura das telas logadas: barra de navegação + conteúdo da rota. */
export function AppLayout() {
  return (
    <ContagensProvider>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </ContagensProvider>
  );
}
