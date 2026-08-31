import { useEffect, useState } from 'react';
import portalApi from '../../api/portalClient';
import PortalLayout from './PortalLayout';

const ESTADO_BADGE = {
  PENDIENTE: 'badge-pendiente',
  ATENDIDA: 'badge-procesado',
  RECHAZADA: 'badge-rechazado',
};

const NOMBRES_TIPO = { correccion: 'Correccion de factura', nueva_factura: 'Solicitud de factura nueva' };

export default function PortalSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  function cargar() {
    setCargando(true);
    portalApi.get('/solicitudes').then((res) => setSolicitudes(res.data.solicitudes)).finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  async function enviarSolicitud(e) {
    e.preventDefault();
    setError(''); setExito('');
    if (!mensaje.trim()) {
      setError('Escribe una descripcion de lo que necesitas.');
      return;
    }
    setEnviando(true);
    try {
      await portalApi.post('/solicitudes', { tipo: 'nueva_factura', mensaje });
      setExito('Solicitud enviada. Te avisaremos cuando sea atendida.');
      setMensaje('');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">Peticiones</span>
          <h1>Mis solicitudes</h1>
        </div>
      </div>

      <div className="panel mb-16">
        <strong>Solicitar una factura nueva</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
          Si necesitas que te emitan un comprobante por una compra o servicio, describelo aqui.
        </p>
        <form onSubmit={enviarSolicitud}>
          {error && <div className="login-error">{error}</div>}
          {exito && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{exito}</div>}
          <div className="field">
            <label>Descripcion</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Ej. Necesito factura por el servicio de consultoria de julio, monto aproximado $200."
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'inherit' }}
            />
          </div>
          <button className="btn btn-gold" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>

      <div className="panel">
        <strong>Historial de solicitudes</strong>
        <div className="mt-24">
          {cargando ? (
            <div className="muted">Cargando...</div>
          ) : solicitudes.length === 0 ? (
            <div className="empty-state"><div className="icon">📨</div>No has enviado ninguna solicitud aun.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Mensaje</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {NOMBRES_TIPO[s.tipo] || s.tipo}
                      {s.dte_numero_control && <div className="mono" style={{ fontSize: 11 }}>{s.dte_numero_control}</div>}
                    </td>
                    <td style={{ maxWidth: 260 }}>{s.mensaje}</td>
                    <td>{s.creado_en?.slice(0, 10)}</td>
                    <td><span className={`badge ${ESTADO_BADGE[s.estado]}`}>{s.estado}</span></td>
                    <td className="muted">{s.respuesta_admin || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
