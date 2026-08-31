import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmitirDte from './pages/EmitirDte';
import HistorialDtes from './pages/HistorialDtes';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Usuarios from './pages/Usuarios';
import Solicitudes from './pages/Solicitudes';
import ReporteIVA from './pages/ReporteIVA';
import Incidencias from './pages/Incidencias';
import PortalLogin from './pages/portal/PortalLogin';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalPerfil from './pages/portal/PortalPerfil';
import PortalSolicitudes from './pages/portal/PortalSolicitudes';
import PortalPagoExitoso from './pages/portal/PortalPagoExitoso';

function RutaPrivada({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RutaPrivadaPortal({ children }) {
  const { cliente } = usePortalAuth();
  if (!cliente) return <Navigate to="/portal/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route
        path="/portal"
        element={
          <RutaPrivadaPortal>
            <PortalDashboard />
          </RutaPrivadaPortal>
        }
      />
      <Route
        path="/portal/perfil"
        element={
          <RutaPrivadaPortal>
            <PortalPerfil />
          </RutaPrivadaPortal>
        }
      />
      <Route
        path="/portal/solicitudes"
        element={
          <RutaPrivadaPortal>
            <PortalSolicitudes />
          </RutaPrivadaPortal>
        }
      />
      <Route
        path="/portal/pago-exitoso"
        element={
          <RutaPrivadaPortal>
            <PortalPagoExitoso />
          </RutaPrivadaPortal>
        }
      />
      <Route
        path="/*"
        element={
          <RutaPrivada>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/emitir" element={<EmitirDte />} />
                <Route path="/historial" element={<HistorialDtes />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/productos" element={<Productos />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/solicitudes" element={<Solicitudes />} />
                <Route path="/incidencias" element={<Incidencias />} />
                <Route path="/reporte-iva" element={<ReporteIVA />} />
              </Routes>
            </Layout>
          </RutaPrivada>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortalAuthProvider>
        <AppRoutes />
      </PortalAuthProvider>
    </AuthProvider>
  );
}
