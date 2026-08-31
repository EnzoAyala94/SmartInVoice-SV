import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import portalApi, { PORTAL_API_BASE } from '../../api/portalClient';
import EstadoBadge from '../../components/EstadoBadge';
import PortalLayout from './PortalLayout';

const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatearMes(mesStr) {
  // mesStr = 'YYYY-MM'
  const [anio, mes] = mesStr.split('-');
  return `${NOMBRES_MES[Number(mes) - 1]} ${anio}`;
}

export default function PortalDashboard() {
  const [resumen, setResumen] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [facturaReporte, setFacturaReporte] = useState(null);
  const [mensajeReporte, setMensajeReporte] = useState('');
  const [errorReporte, setErrorReporte] = useState('');
  const [exitoReporte, setExitoReporte] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  const [pagandoId, setPagandoId] = useState(null);
  const [errorPago, setErrorPago] = useState('');

  useEffect(() => {
    Promise.all([
      portalApi.get('/resumen-mensual'),
      portalApi.get('/meses-disponibles'),
    ]).then(([resResumen, resMeses]) => {
      setResumen(resResumen.data.resumen);
      setMesesDisponibles(resMeses.data.meses);
      if (resMeses.data.meses.length > 0) {
        setMesSeleccionado(resMeses.data.meses[0]); // el mas reciente
      }
    }).finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!mesSeleccionado) { setFacturas([]); return; }
    portalApi.get('/facturas', { params: { mes: mesSeleccionado } })
      .then((res) => setFacturas(res.data.facturas));
  }, [mesSeleccionado]);

  const datosGrafica = useMemo(() => (
    resumen.map((r) => ({ mes: formatearMes(r.mes), total: r.total }))
  ), [resumen]);

  const totalMesSeleccionado = facturas.reduce((a, f) => a + f.monto_total, 0);
  const promedioMensual = resumen.length > 0
    ? resumen.reduce((a, r) => a + r.total, 0) / resumen.length
    : 0;

  function descargarExcel() {
    const params = new URLSearchParams();
    if (mesSeleccionado) params.set('mes', mesSeleccionado);
    window.open(`${PORTAL_API_BASE}/facturas/excel?${params.toString()}`, '_blank');
  }

  function abrirReporte(factura) {
    setFacturaReporte(factura);
    setMensajeReporte('');
    setErrorReporte('');
    setExitoReporte('');
  }

  function cerrarReporte() {
    setFacturaReporte(null);
  }

  async function pagarFactura(factura) {
    setErrorPago('');
    setPagandoId(factura.id);
    try {
      const { data } = await portalApi.post(`/facturas/${factura.id}/pagar`);
      if (data.url) {
        window.location.href = data.url; // redirige a Stripe Checkout
        return;
      }
      if (data.pagado) {
        // modo simulacion: se marco pagada al instante
        portalApi.get('/facturas', { params: { mes: mesSeleccionado } })
          .then((res) => setFacturas(res.data.facturas));
      }
    } catch (err) {
      setErrorPago(err.response?.data?.error || 'Error al iniciar el pago.');
    } finally {
      setPagandoId(null);
    }
  }

  async function enviarReporte(e) {
    e.preventDefault();
    setErrorReporte('');
    if (!mensajeReporte.trim()) {
      setErrorReporte('Describe el problema que encontraste.');
      return;
    }
    setEnviandoReporte(true);
    try {
      await portalApi.post('/solicitudes', { tipo: 'correccion', dteId: facturaReporte.id, mensaje: mensajeReporte });
      setExitoReporte('Reporte enviado. Puedes ver su estado en "Mis solicitudes".');
      setTimeout(cerrarReporte, 1800);
    } catch (err) {
      setErrorReporte(err.response?.data?.error || 'Error al enviar el reporte.');
    } finally {
      setEnviandoReporte(false);
    }
  }

  if (cargando) {
    return (
      <PortalLayout>
        <div className="muted">Cargando tu portal...</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">Bienvenido</span>
          <h1>Tus facturas y pagos</h1>
        </div>
        <button className="btn btn-outline" onClick={descargarExcel} disabled={!mesSeleccionado}>
          Descargar Excel del mes
        </button>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Total del mes seleccionado</div>
          <div className="value">${totalMesSeleccionado.toFixed(2)}</div>
          <div className="sub">{mesSeleccionado ? formatearMes(mesSeleccionado) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Promedio mensual (12 meses)</div>
          <div className="value gold">${promedioMensual.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Documentos este mes</div>
          <div className="value" style={{ fontSize: 22 }}>{facturas.length}</div>
        </div>
      </div>

      <div className="panel mb-16">
        <strong>Historial de pagos mensuales</strong>
        <div style={{ height: 260, marginTop: 16 }}>
          {datosGrafica.length === 0 ? (
            <div className="empty-state"><div className="icon">📊</div>Aun no hay pagos registrados.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde3ec" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#4a5670' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4a5670' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Pagado']} />
                <Bar dataKey="total" fill="#a97c1e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="flex-between mb-16">
          <strong>Facturas por mes</strong>
          <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-strong)' }}>
            {mesesDisponibles.length === 0 && <option value="">Sin facturas aun</option>}
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{formatearMes(m)}</option>
            ))}
          </select>
        </div>

        {errorPago && <div className="login-error mb-16">{errorPago}</div>}
        {facturas.length === 0 ? (
          <div className="empty-state"><div className="icon">🧾</div>No hay facturas en este mes.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Numero de control</th>
                <th>Fecha</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.numero_control}</td>
                  <td>{f.fecha_emision}</td>
                  <td className="text-right">${f.monto_total.toFixed(2)}</td>
                  <td><EstadoBadge estado={f.estado} /></td>
                  <td>
                    {f.pagado ? (
                      <span className="badge badge-procesado">Pagado</span>
                    ) : (
                      <span className="badge badge-anulado">Pendiente</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <a className="btn btn-sm btn-outline" href={`${PORTAL_API_BASE}/facturas/${f.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                    <a className="btn btn-sm btn-outline" href={`${PORTAL_API_BASE}/facturas/${f.id}/excel`} target="_blank" rel="noreferrer">Excel</a>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => abrirReporte(f)}>Reportar</button>
                    {!f.pagado && f.estado === 'PROCESADO' && (
                      <button type="button" className="btn btn-sm btn-gold" onClick={() => pagarFactura(f)} disabled={pagandoId === f.id}>
                        {pagandoId === f.id ? 'Redirigiendo...' : 'Pagar ahora'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {facturaReporte && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(16,25,43,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={cerrarReporte}
        >
          <form
            className="panel"
            style={{ width: 420, background: 'var(--paper)' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={enviarReporte}
          >
            <strong>Reportar un problema</strong>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
              Factura: <span className="mono">{facturaReporte.numero_control}</span>
            </p>
            {errorReporte && <div className="login-error">{errorReporte}</div>}
            {exitoReporte && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{exitoReporte}</div>}
            <div className="field">
              <label>Describe el problema</label>
              <textarea
                value={mensajeReporte}
                onChange={(e) => setMensajeReporte(e.target.value)}
                rows={4}
                placeholder="Ej. El monto no coincide con lo acordado, favor revisar."
                style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={enviandoReporte}>
                {enviandoReporte ? 'Enviando...' : 'Enviar reporte'}
              </button>
              <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cerrarReporte}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalLayout>
  );
}
