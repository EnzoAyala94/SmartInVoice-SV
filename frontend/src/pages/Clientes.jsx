import { useEffect, useState } from 'react';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { DEPARTAMENTOS, municipiosDeDepartamento } from '../data/geografiaSV';

const VACIO = {
  tipoDocumento: '13', numeroDocumento: '', nrc: '', nombre: '', codigoActividad: '',
  descActividad: '', departamento: '', municipio: '', complementoDireccion: '',
  telefono: '', correo: '', tipoContribuyente: 'consumidor',
};

// Convierte un registro de cliente (snake_case, tal como viene de la API)
// al formato del formulario (camelCase).
function clienteAFormulario(c) {
  return {
    tipoDocumento: c.tipo_documento || '13',
    numeroDocumento: c.numero_documento || '',
    nrc: c.nrc || '',
    nombre: c.nombre || '',
    codigoActividad: c.codigo_actividad || '',
    descActividad: c.desc_actividad || '',
    departamento: c.departamento || '',
    municipio: c.municipio || '',
    complementoDireccion: c.complemento_direccion || '',
    telefono: c.telefono || '',
    correo: c.correo || '',
    tipoContribuyente: c.tipo_contribuyente || 'consumidor',
  };
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = creando, id = editando
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(true);

  const [clientePortal, setClientePortal] = useState(null); // cliente al que se le va a habilitar el portal
  const [passwordPortal, setPasswordPortal] = useState('');
  const [errorPortal, setErrorPortal] = useState('');

  function cargar() {
    setCargando(true);
    api.get('/clientes', { params: q ? { q } : {} })
      .then((res) => setClientes(res.data.clientes))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  function campo(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError('');
    setExito('');
    setMostrarForm(true);
  }

  function abrirEdicion(cliente) {
    setEditandoId(cliente.id);
    setForm(clienteAFormulario(cliente));
    setError('');
    setExito('');
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setEditandoId(null);
    setForm(VACIO);
  }

  async function guardar(e) {
    e.preventDefault();
    setError(''); setExito('');
    try {
      if (editandoId) {
        await api.put(`/clientes/${editandoId}`, form);
        setExito('Cliente actualizado correctamente.');
      } else {
        await api.post('/clientes', form);
        setExito('Cliente creado correctamente.');
      }
      cerrarForm();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el cliente.');
    }
  }

  async function eliminar(id) {
    if (!window.confirm('Eliminar este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    cargar();
  }

  function abrirModalPortal(cliente) {
    if (!cliente.correo) {
      window.alert('Este cliente necesita un correo registrado antes de habilitar su portal. Editalo primero.');
      return;
    }
    setClientePortal(cliente);
    setPasswordPortal('');
    setErrorPortal('');
  }

  async function desactivarPortalCliente(cliente) {
    if (!window.confirm(`Desactivar el acceso al portal de ${cliente.nombre}?`)) return;
    await api.post(`/clientes/${cliente.id}/portal-desactivar`);
    cargar();
  }

  function cerrarPortal() {
    setClientePortal(null);
    setPasswordPortal('');
    setErrorPortal('');
  }

  async function confirmarPortal(e) {
    e.preventDefault();
    setErrorPortal('');
    try {
      const { data } = await api.post(`/clientes/${clientePortal.id}/portal-acceso`, { password: passwordPortal });
      const accion = clientePortal.portal_activo ? 'Contrasena restablecida' : 'Portal habilitado';
      if (data.correoEnviado && data.correoModo === 'real') {
        setExito(`${accion} para ${clientePortal.nombre}. Se envio un correo a ${clientePortal.correo} con sus credenciales.`);
      } else if (data.correoModo === 'simulacion') {
        setExito(`${accion} para ${clientePortal.nombre}. (Modo simulacion: revisa la consola del servidor para ver el correo, o comparte la contrasena manualmente).`);
      } else {
        setExito(`${accion} para ${clientePortal.nombre}, pero no se pudo enviar el correo automatico. Comparte la contrasena manualmente.`);
      }
      cerrarPortal();
      cargar();
    } catch (err) {
      setErrorPortal(err.response?.data?.error || 'Error al habilitar el portal.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Receptores</span>
          <h1>Clientes</h1>
        </div>
        <button className="btn btn-gold" onClick={() => (mostrarForm ? cerrarForm() : abrirNuevo())}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {exito && !mostrarForm && (
        <div className="panel mb-16" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none' }}>{exito}</div>
      )}

      {mostrarForm && (
        <form className="panel mb-16" onSubmit={guardar}>
          <div className="flex-between mb-16">
            <strong>{editandoId ? 'Editar cliente' : 'Nuevo cliente'}</strong>
          </div>
          {error && <div className="login-error">{error}</div>}
          <div className="field-row">
            <div className="field">
              <label>Tipo de documento</label>
              <select value={form.tipoDocumento} onChange={(e) => campo('tipoDocumento', e.target.value)}>
                <option value="13">DUI</option>
                <option value="36">NIT</option>
                <option value="37">Pasaporte</option>
                <option value="03">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Numero de documento</label>
              <input value={form.numeroDocumento} onChange={(e) => campo('numeroDocumento', e.target.value)} required />
            </div>
            <div className="field">
              <label>NRC (si aplica)</label>
              <input value={form.nrc} onChange={(e) => campo('nrc', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Nombre completo / Razon social</label>
            <input value={form.nombre} onChange={(e) => campo('nombre', e.target.value)} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Telefono</label>
              <input value={form.telefono} onChange={(e) => campo('telefono', e.target.value)} />
            </div>
            <div className="field">
              <label>Correo</label>
              <input type="email" value={form.correo} onChange={(e) => campo('correo', e.target.value)} />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipoContribuyente} onChange={(e) => campo('tipoContribuyente', e.target.value)}>
                <option value="consumidor">Consumidor Final</option>
                <option value="contribuyente">Contribuyente (requiere NRC para CCF)</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Departamento</label>
              <select
                value={form.departamento}
                onChange={(e) => { campo('departamento', e.target.value); campo('municipio', ''); }}
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
                value={form.municipio}
                onChange={(e) => campo('municipio', e.target.value)}
                disabled={!form.departamento}
              >
                <option value="">
                  {form.departamento ? 'Selecciona un municipio...' : 'Elige primero un departamento'}
                </option>
                {municipiosDeDepartamento(form.departamento).map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Direccion (complemento)</label>
              <input value={form.complementoDireccion} onChange={(e) => campo('complementoDireccion', e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary">{editandoId ? 'Guardar cambios' : 'Guardar cliente'}</button>
        </form>
      )}

      <div className="panel mb-16">
        <div style={{ display: 'flex', gap: 10 }}>
          <input placeholder="Buscar por nombre o documento..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 6 }} />
          <button className="btn btn-outline" onClick={cargar}>Buscar</button>
        </div>
      </div>

      <div className="panel">
        {cargando ? (
          <div className="muted">Cargando...</div>
        ) : clientes.length === 0 ? (
          <div className="empty-state"><div className="icon">👤</div>No hay clientes registrados aun.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>NRC</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Portal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td className="mono">{c.numero_documento}</td>
                  <td>{c.nrc || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.tipo_contribuyente}</td>
                  <td className="muted">{c.correo || c.telefono || '—'}</td>
                  <td>
                    <span className={`badge ${c.portal_activo ? 'badge-procesado' : 'badge-anulado'}`}>
                      {c.portal_activo ? 'Activo' : 'Sin acceso'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEdicion(c)}>Editar</button>
                    <button className="btn btn-sm btn-outline" onClick={() => abrirModalPortal(c)}>
                      {c.portal_activo ? 'Restablecer contrasena' : 'Habilitar portal'}
                    </button>
                    {c.portal_activo && (
                      <button className="btn btn-sm btn-outline" onClick={() => desactivarPortalCliente(c)}>
                        Desactivar portal
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger-outline" onClick={() => eliminar(c.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {clientePortal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(16,25,43,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={cerrarPortal}
        >
          <form
            className="panel"
            style={{ width: 400, background: 'var(--paper)' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmarPortal}
          >
            <strong>{clientePortal.portal_activo ? 'Restablecer contrasena del portal' : 'Habilitar Portal del Cliente'}</strong>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
              Para: {clientePortal.nombre} ({clientePortal.correo})
            </p>
            {errorPortal && <div className="login-error">{errorPortal}</div>}
            <div className="field">
              <label>Contrasena de acceso</label>
              <PasswordInput value={passwordPortal} onChange={(e) => setPasswordPortal(e.target.value)} required minLength={6} autoFocus />
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 16 }}>
              Comparte esta contrasena junto con el correo y el enlace <span className="mono">/portal/login</span> con tu cliente.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-gold" style={{ flex: 1, justifyContent: 'center' }}>
                Habilitar portal
              </button>
              <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cerrarPortal}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
