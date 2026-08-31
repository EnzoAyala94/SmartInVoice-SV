import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const ESTADO_BADGE = {
  PENDIENTE: 'badge-pendiente',
  ATENDIDA: 'badge-procesado',
  RECHAZADA: 'badge-rechazado',
};

const NOMBRES_TIPO = { correccion: 'Correccion de factura', nueva_factura: 'Solicitud de factura nueva' };

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [cargando, setCargando] = useState(true);

  const [solicitudActiva, setSolicitudActiva] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');

  function cargar() {
    setCargando(true);
    api.get('/solicitudes', { params: filtroEstado ? { estado: filtroEstado } : {} })
      .then((res) => setSolicitudes(res.data.solicitudes))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [filtroEstado]);

  function abrirRespuesta(s) {
    setSolicitudActiva(s);
    setRespuesta('');
    setError('');
  }

  async function responder(estado) {
    setError('');
    try {
      await api.put(`/solicitudes/${solicitudActiva.id}`, { estado, respuestaAdmin: respuesta });
      setSolicitudActiva(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar la solicitud.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Peticiones de clientes</span>
          <h1>Solicitudes</h1>
        </div>
      </div>

      <div className="panel mb-16">
        <div className="field" style={{ maxWidth: 260, marginBottom: 0 }}>
          <label>Filtrar por estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="PENDIENTE">Pendientes</option>
            <option value="ATENDIDA">Atendidas</option>
            <option value="RECHAZADA">Rechazadas</option>
            <option value="">Todas</option>
          </select>
        </div>
      </div>

      <div className="panel">
        {cargando ? (
          <div className="muted">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="empty-state"><div className="icon">📨</div>No hay solicitudes con este filtro.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Mensaje</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>{s.cliente_nombre}<div className="muted" style={{ fontSize: 11 }}>{s.cliente_correo}</div></td>
                  <td>
                    {NOMBRES_TIPO[s.tipo] || s.tipo}
                    {s.dte_numero_control && <div className="mono" style={{ fontSize: 11 }}>{s.dte_numero_control}</div>}
                  </td>
                  <td style={{ maxWidth: 260 }}>{s.mensaje}</td>
                  <td>{s.creado_en?.slice(0, 10)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[s.estado]}`}>{s.estado}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {s.estado === 'PENDIENTE' ? (
                      <button className="btn btn-sm btn-outline" onClick={() => abrirRespuesta(s)}>Responder</button>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>{s.respuesta_admin || '—'}</span>
                    )}
                    {s.tipo === 'correccion' && (
                      <Link className="btn btn-sm btn-outline" to="/emitir">Emitir Nota</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {solicitudActiva && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(16,25,43,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={() => setSolicitudActiva(null)}
        >
          <div className="panel" style={{ width: 420, background: 'var(--paper)' }} onClick={(e) => e.stopPropagation()}>
            <strong>Responder solicitud</strong>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
              De: {solicitudActiva.cliente_nombre} — {NOMBRES_TIPO[solicitudActiva.tipo]}
            </p>
            <p style={{ fontSize: 13, background: '#f4f6fa', padding: 10, borderRadius: 6, marginBottom: 14 }}>
              {solicitudActiva.mensaje}
            </p>
            {error && <div className="login-error">{error}</div>}
            <div className="field">
              <label>Tu respuesta (opcional)</label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => responder('ATENDIDA')}>
                Marcar como atendida
              </button>
              <button className="btn btn-danger-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => responder('RECHAZADA')}>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
