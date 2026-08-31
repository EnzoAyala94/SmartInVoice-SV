import { useEffect, useState } from 'react';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';

const VACIO = { nombreCompleto: '', email: '', password: '', rol: 'contador' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(true);

  const [usuarioReset, setUsuarioReset] = useState(null); // usuario al que se le va a restablecer la clave
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [errorReset, setErrorReset] = useState('');

  function cargar() {
    setCargando(true);
    api.get('/usuarios').then((res) => setUsuarios(res.data.usuarios)).finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  function campo(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar(e) {
    e.preventDefault();
    setError(''); setExito('');
    try {
      await api.post('/usuarios', form);
      setExito(`Usuario ${form.email} creado con rol ${form.rol}.`);
      setForm(VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el usuario.');
    }
  }

  async function toggleEstado(u) {
    await api.put(`/usuarios/${u.id}/estado`, { activo: !u.activo });
    cargar();
  }

  async function restablecerPassword(u) {
    setUsuarioReset(u);
    setNuevaPassword('');
    setErrorReset('');
  }

  function cerrarReset() {
    setUsuarioReset(null);
    setNuevaPassword('');
    setErrorReset('');
  }

  async function confirmarReset(e) {
    e.preventDefault();
    setErrorReset('');
    try {
      await api.post(`/usuarios/${usuarioReset.id}/restablecer-password`, { password: nuevaPassword });
      setExito(`Contrasena restablecida para ${usuarioReset.nombre_completo}.`);
      cerrarReset();
    } catch (err) {
      setErrorReset(err.response?.data?.error || 'Error al restablecer la contrasena.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Equipo interno</span>
          <h1>Usuarios del sistema</h1>
        </div>
        <button className="btn btn-gold" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {exito && <div className="panel mb-16" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none' }}>{exito}</div>}

      {mostrarForm && (
        <form className="panel mb-16" onSubmit={guardar}>
          {error && <div className="login-error">{error}</div>}
          <div className="field">
            <label>Nombre completo</label>
            <input value={form.nombreCompleto} onChange={(e) => campo('nombreCompleto', e.target.value)} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Correo electronico</label>
              <input type="email" value={form.email} onChange={(e) => campo('email', e.target.value)} required />
            </div>
            <div className="field">
              <label>Contrasena</label>
              <PasswordInput value={form.password} onChange={(e) => campo('password', e.target.value)} required minLength={6} />
            </div>
            <div className="field">
              <label>Rol</label>
              <select value={form.rol} onChange={(e) => campo('rol', e.target.value)}>
                <option value="contador">Contador (emite, anula y ve reportes)</option>
                <option value="facturador">Facturador (emite y anula)</option>
                <option value="admin">Administrador (acceso total)</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Crear usuario</button>
        </form>
      )}

      <div className="panel">
        {cargando ? (
          <div className="muted">Cargando...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre_completo}</td>
                  <td className="mono">{u.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.rol}</td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge-procesado' : 'badge-anulado'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => restablecerPassword(u)}>
                      Restablecer contrasena
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleEstado(u)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {usuarioReset && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(16,25,43,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={cerrarReset}
        >
          <form
            className="panel"
            style={{ width: 380, background: 'var(--paper)' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmarReset}
          >
            <strong>Restablecer contrasena</strong>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
              Para: {usuarioReset.nombre_completo} ({usuarioReset.email})
            </p>
            {errorReset && <div className="login-error">{errorReset}</div>}
            <div className="field">
              <label>Nueva contrasena</label>
              <PasswordInput value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} required minLength={6} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Guardar
              </button>
              <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cerrarReset}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
