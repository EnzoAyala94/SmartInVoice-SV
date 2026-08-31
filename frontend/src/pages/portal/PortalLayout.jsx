import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';

export default function PortalLayout({ children }) {
  const { cliente, logout } = usePortalAuth();
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
          <span className="sub">Portal del Cliente</span>
        </div>
      </div>

      <div className={`sidebar-overlay${menuAbierto ? ' visible' : ''}`} onClick={cerrarMenu} />

      <aside className={`sidebar${menuAbierto ? ' abierto' : ''}`}>
        <button className="sidebar-close-btn" onClick={cerrarMenu} aria-label="Cerrar menu">✕</button>
        <div className="sidebar-brand">
          <span className="mark"><img src="/logo.svg" alt="" className="brand-icon" />Smart Invoice</span>
          <span className="sub">Portal del Cliente</span>
        </div>
        <nav>
          <NavLink to="/portal" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={cerrarMenu}>
            Mis facturas
          </NavLink>
          <NavLink to="/portal/solicitudes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={cerrarMenu}>
            Mis solicitudes
          </NavLink>
          <NavLink to="/portal/perfil" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={cerrarMenu}>
            Mi perfil
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8 }}>{cliente?.nombre}</div>
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
