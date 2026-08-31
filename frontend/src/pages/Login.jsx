import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@miempresa.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/', { replace: true });
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
        <span className="sub">Facturar, sin complicaciones</span>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label>Correo electronico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Contrasena</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          ¿Eres cliente y quieres ver tus facturas? <a href="/portal/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Ingresa a tu portal</a>
        </p>
      </form>
      <Footer />
    </div>
  );
}
