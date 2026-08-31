import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import Footer from '../../components/Footer';
import PasswordInput from '../../components/PasswordInput';

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesion.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src="/logo-nombre.svg" alt="Smart Invoice" className="brand-lockup" />
        <span className="sub">Portal del Cliente · Tus facturas, siempre a la mano</span>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label>Correo electronico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Contrasena</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Si aun no tienes acceso, solicitalo a la empresa que te factura.
        </p>
      </form>
      <Footer />
    </div>
  );
}
