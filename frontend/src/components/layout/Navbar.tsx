import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

const LINKS = [
  { to: '/', label: 'Início', end: true },
  { to: '/propriedades', label: 'Propriedades', end: false },
  { to: '/talhoes', label: 'Talhões', end: false },
  { to: '/safras', label: 'Safras', end: false },
  { to: '/atividades', label: 'Atividades', end: false },
];

export function Navbar() {
  const { usuario, logout } = useAuth();

  return (
    <nav className="navbar">
      <span className="brand">🌱 Caderno de Campo</span>
      <ul className="nav-links">
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="nav-user">
        <NavLink to="/perfil">{usuario?.nome}</NavLink>
        <Button variant="secondary" onClick={logout}>
          Sair
        </Button>
      </div>
    </nav>
  );
}
