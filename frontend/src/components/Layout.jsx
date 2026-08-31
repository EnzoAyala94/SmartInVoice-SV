import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Panel general', end: true },
  { to: '/emitir', label: 'Emitir DTE' },
  { to: '/historial', label: 'Historial' },
  { to: '/incidencias', label: 'Incidencias' },
  { to: '/reporte-iva', label: 'Reporte IVA' },
  { to: '/solicitudes', label: 'Solicitudes' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos' },
];

const ROLES_LABEL = {
  admin: 'Admin',
  superadmin: 'Super Administrador',
  facturador: 'Facturador',
  contador: 'Contador',
};

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const esAdminInterno = usuario?.rol === 'admin' || usuario?.rol === 'superadmin';
  const nav = esAdminInterno ? [...NAV, { to: '/usuarios', label: 'Usuarios' }] : NAV;
  const [menuAbierto, setMenuAbierto] = useState(false);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menu">
          ☰
        </button>
        <div className="mobile-topbar-brand">
          <span className="mark"><img src="/logo.svg" alt="" className="brand-icon" />Smart Invoice</span>
          <span className="sub">Facturar, sin complicaciones</span>
        </div>
      </div>

      <div className={`sidebar-overlay${menuAbierto ? ' visible' : ''}`} onClick={cerrarMenu} />

      <aside className={`sidebar${menuAbierto ? ' abierto' : ''}`}>
        <button className="sidebar-close-btn" onClick={cerrarMenu} aria-label="Cerrar menu">✕</button>
        <div className="sidebar-brand">
          <span className="mark"><img src="/logo.svg" alt="" className="brand-icon" />Smart Invoice</span>
          <span className="sub">Facturar, sin complicaciones</span>
        </div>
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              onClick={cerrarMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
                    <div style={{ marginBottom: 8 }}>{usuario?.nombre} · <span>{ROLES_LABEL[usuario?.rol] || usuario?.rol}</span></div>
          <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
