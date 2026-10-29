import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

/** Estrutura das telas logadas: barra de navegação + conteúdo da rota. */
export function AppLayout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
