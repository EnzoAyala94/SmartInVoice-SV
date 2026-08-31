import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_BASE } from '../api/client';
import EstadoBadge from '../components/EstadoBadge';

const ESTADOS_INCIDENCIA = ['RECHAZADO', 'PENDIENTE', 'CONTINGENCIA'];

export default function Incidencias() {
  const [conteos, setConteos] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    Promise.all([
      api.get('/reportes/dashboard'),
      api.get('/dtes', { params: { estado: ESTADOS_INCIDENCIA.join(','), limit: 100 } }),
    ]).then(([resDashboard, resDtes]) => {
      const mapa = {};
      resDashboard.data.totalesPorEstado.forEach((t) => { mapa[t.estado] = t; });
      setConteos(mapa);
      setDocumentos(resDtes.data.dtes);
    }).finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Requieren atencion</span>
          <h1>Incidencias</h1>
        </div>
      </div>

      <div className="card-grid">
        {ESTADOS_INCIDENCIA.map((estado) => (
          <div className="stat-card" key={estado}>
            <div className="label">{estado}</div>
            <div className="value" style={{ fontSize: 26 }}>{conteos[estado]?.cantidad || 0}</div>
            <div className="sub">${(conteos[estado]?.total || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <strong>Documentos que necesitan revision</strong>
        <div className="mt-24">
          {cargando ? (
            <div className="muted">Cargando...</div>
          ) : documentos.length === 0 ? (
            <div className="empty-state"><div className="icon">✅</div>No hay incidencias pendientes. Todo en orden.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Numero de control</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.numero_control}</td>
                    <td>{d.cliente_nombre || 'Consumidor Final'}</td>
                    <td>{d.fecha_emision}</td>
                    <td className="text-right">${d.monto_total.toFixed(2)}</td>
                    <td><EstadoBadge estado={d.estado} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <a className="btn btn-sm btn-outline" href={`${API_BASE}/dtes/${d.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                      <Link className="btn btn-sm btn-outline" to="/historial">Ver en historial</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
