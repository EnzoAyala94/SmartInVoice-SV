import { useEffect, useState } from 'react';
import portalApi from '../../api/portalClient';
import PasswordInput from '../../components/PasswordInput';
import PortalLayout from './PortalLayout';
import { DEPARTAMENTOS, municipiosDeDepartamento } from '../../data/geografiaSV';

export default function PortalPerfil() {
  const [cliente, setCliente] = useState(null);
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [complementoDireccion, setComplementoDireccion] = useState('');
  const [errorDatos, setErrorDatos] = useState('');
  const [exitoDatos, setExitoDatos] = useState('');
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [exitoPassword, setExitoPassword] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  useEffect(() => {
    portalApi.get('/perfil').then((res) => {
      setCliente(res.data.cliente);
      setCorreo(res.data.cliente.correo || '');
      setTelefono((res.data.cliente.telefono || '').replace(/^\+?503\s?/, ''));
      setDepartamento(res.data.cliente.departamento || '');
      setMunicipio(res.data.cliente.municipio || '');
      setComplementoDireccion(res.data.cliente.complemento_direccion || '');
    });
  }, []);

  function actualizarTelefono(valor) {
    const soloDigitos = valor.replace(/\D/g, '').slice(0, 8);
    // Solo se acepta si esta vacio o empieza con 6 o 7 (prefijos moviles validos en El Salvador)
    if (soloDigitos === '' || /^[67]/.test(soloDigitos)) {
      setTelefono(soloDigitos);
    }
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setErrorDatos(''); setExitoDatos('');
    setGuardandoDatos(true);
    try {
      const telefonoCompleto = telefono ? `+503 ${telefono}` : '';
      const { data } = await portalApi.put('/perfil', { correo, telefono: telefonoCompleto, departamento, municipio, complementoDireccion });
      setExitoDatos(data.mensaje);
    } catch (err) {
      setErrorDatos(err.response?.data?.error || 'Error al actualizar los datos.');
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarPassword(e) {
    e.preventDefault();
    setErrorPassword(''); setExitoPassword('');

    if (passwordNueva !== passwordConfirmar) {
      setErrorPassword('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    setGuardandoPassword(true);
    try {
      await portalApi.post('/cambiar-password', { passwordActual, passwordNueva });
      setExitoPassword('Contrasena actualizada correctamente.');
      setPasswordActual(''); setPasswordNueva(''); setPasswordConfirmar('');
    } catch (err) {
      setErrorPassword(err.response?.data?.error || 'Error al cambiar la contrasena.');
    } finally {
      setGuardandoPassword(false);
    }
  }

  if (!cliente) {
    return (
      <PortalLayout>
        <div className="muted">Cargando...</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">Tu cuenta</span>
          <h1>Mi perfil</h1>
        </div>
      </div>

      <div className="panel mb-16">
        <strong>Datos de contacto</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
          Nombre registrado: {cliente.nombre} (para corregir tu nombre o documento fiscal, contacta a quien te factura).
        </p>
        <form onSubmit={guardarDatos}>
          {errorDatos && <div className="login-error">{errorDatos}</div>}
          {exitoDatos && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{exitoDatos}</div>}
          <div className="field-row">
            <div className="field">
              <label>Correo electronico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
            <div className="field">
              <label>Telefono</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span style={{
                  display: 'flex', alignItems: 'center', padding: '0 11px',
                  border: '1px solid var(--border-strong)', borderRight: 'none',
                  borderRadius: '6px 0 0 6px', background: '#f4f6fa', color: 'var(--ink-soft)',
                  fontSize: 14, whiteSpace: 'nowrap',
                }}>
                  +503
                </span>
                <input
                  value={telefono}
                  onChange={(e) => actualizarTelefono(e.target.value)}
                  inputMode="numeric"
                  placeholder="7123 4567"
                  style={{ borderRadius: '0 6px 6px 0' }}
                />
              </div>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                8 digitos, debe empezar con 6 o 7 (numero movil).
              </p>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Departamento</label>
              <select
                value={departamento}
                onChange={(e) => { setDepartamento(e.target.value); setMunicipio(''); }}
              >
                <option value="">Selecciona un departamento...</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Municipio</label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                disabled={!departamento}
              >
                <option value="">
                  {departamento ? 'Selecciona un municipio...' : 'Elige primero un departamento'}
                </option>
                {municipiosDeDepartamento(departamento).map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Direccion (complemento)</label>
              <input value={complementoDireccion} onChange={(e) => setComplementoDireccion(e.target.value)} placeholder="Ej. Colonia, calle, numero de casa" />
            </div>
          </div>
          <button className="btn btn-primary" disabled={guardandoDatos}>
            {guardandoDatos ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="panel">
        <strong>Cambiar contrasena</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
          Ingresa tu contrasena actual y la nueva contrasena que quieras usar.
        </p>
        <form onSubmit={guardarPassword}>
          {errorPassword && <div className="login-error">{errorPassword}</div>}
          {exitoPassword && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{exitoPassword}</div>}
          <div className="field">
            <label>Contrasena actual</label>
            <PasswordInput value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Nueva contrasena</label>
              <PasswordInput value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required minLength={6} />
            </div>
            <div className="field">
              <label>Confirmar nueva contrasena</label>
              <PasswordInput value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} required minLength={6} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={guardandoPassword}>
            {guardandoPassword ? 'Guardando...' : 'Cambiar contrasena'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}
