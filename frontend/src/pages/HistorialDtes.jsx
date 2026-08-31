import { useEffect, useState } from 'react';
import api, { API_BASE } from '../api/client';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';

const NOMBRES_TIPO_DTE = { '01': 'Factura', '03': 'CCF', '05': 'Nota de Credito', '06': 'Nota de Debito' };

export default function HistorialDtes() {
  const { usuario } = useAuth();
  const puedeAnular = usuario?.rol !== 'contador';
  const [dtes, setDtes] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', desde: '', hasta: '' });
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    const params = {};
    if (filtros.estado) params.estado = filtros.estado;
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;
    api.get('/dtes', { params })
      .then((res) => setDtes(res.data.dtes))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  async function anular(id) {
    const motivo = window.prompt('Motivo de anulacion:');
    if (motivo === null) return;
    await api.post(`/dtes/${id}/anular`, { motivo });
    cargar();
  }

  function descargarReporte() {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    window.open(`${API_BASE}/reportes/ventas/excel?${params.toString()}`, '_blank');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Documentos emitidos</span>
          <h1>Historial de DTEs</h1>
        </div>
        <button className="btn btn-outline" onClick={descargarReporte}>Descargar Excel</button>
      </div>

      <div className="panel mb-16">
        <div className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label>Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="">Todos</option>
              <option value="PROCESADO">Procesado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="CONTINGENCIA">Contingencia</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>
          <div className="field">
            <label>Desde</label>
            <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '0 0 auto' }}>
            <button className="btn btn-primary" onClick={cargar}>Filtrar</button>
          </div>
        </div>
      </div>

      <div className="panel">
        {cargando ? (
          <div className="muted">Cargando...</div>
        ) : dtes.length === 0 ? (
          <div className="empty-state"><div className="icon">🧾</div>No hay documentos con estos filtros.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Numero de control</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dtes.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.numero_control}</td>
                  <td>{NOMBRES_TIPO_DTE[d.tipo_dte] || d.tipo_dte}</td>
                  <td>{d.cliente_nombre || 'Consumidor Final'}</td>
                  <td>{d.fecha_emision}</td>
                  <td className="text-right">${d.monto_total.toFixed(2)}</td>
                  <td><EstadoBadge estado={d.estado} /></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <a className="btn btn-sm btn-outline" href={`${API_BASE}/dtes/${d.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                    <a className="btn btn-sm btn-outline" href={`${API_BASE}/dtes/${d.id}/excel`} target="_blank" rel="noreferrer">Excel</a>
                    {puedeAnular && d.estado !== 'ANULADO' && (
                      <button className="btn btn-sm btn-danger-outline" onClick={() => anular(d.id)}>Anular</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
