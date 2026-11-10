import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useContagens } from '../../context/ContagensContext';
import { Button } from '../ui/Button';

const LINKS = [
  { to: '/', label: 'Início', end: true },
  { to: '/propriedades', label: 'Propriedades', end: false },
  { to: '/talhoes', label: 'Talhões', end: false },
  { to: '/safras', label: 'Safras', end: false },
  { to: '/atividades', label: 'Atividades', end: false },
  { to: '/contestacoes', label: 'Contestações', end: false },
];

/** Só aparecem para administradores. */
const LINKS_ADMIN = [
  { to: '/admin/usuarios', label: 'Usuários', end: false },
  { to: '/admin/propriedades', label: 'Propriedades (admin)', end: false },
  { to: '/admin/contestacoes', label: 'Contestações (admin)', end: false },
  { to: '/admin/tipos-atividade', label: 'Tipos de atividade', end: false },
];

export function Navbar() {
  const { usuario, logout } = useAuth();
  const { naoLidas, pendentes } = useContagens();
  const links = usuario?.papel === 'ADMIN' ? [...LINKS, ...LINKS_ADMIN] : LINKS;

  return (
    <nav className="navbar">
      <span className="brand">🌱 Caderno de Campo</span>
      <ul className="nav-links">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {link.label}
              {link.to === '/admin/contestacoes' && pendentes > 0 && (
                <span className="contador" aria-label={`${pendentes} pedidos aguardando decisão`}>
                  {pendentes}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="nav-user">
        <NavLink to="/notificacoes" className="sino" aria-label={`Avisos: ${naoLidas} não lidos`}>
          🔔
          {naoLidas > 0 && <span className="contador">{naoLidas}</span>}
        </NavLink>
        <NavLink to="/perfil">{usuario?.nome}</NavLink>
        <Button variant="secondary" onClick={logout}>
          Sair
        </Button>
      </div>
    </nav>
  );
}
