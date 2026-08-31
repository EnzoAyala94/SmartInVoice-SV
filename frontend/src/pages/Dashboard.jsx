import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { usuario } = useAuth();
  const puedeEmitir = usuario?.rol !== 'contador';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('No se pudo cargar el panel.'));
  }, []);

  if (error) return <div className="panel">{error}</div>;
  if (!data) return <div className="muted">Cargando panel...</div>;

  const totalProcesado = data.totalesPorEstado.find((t) => t.estado === 'PROCESADO')?.total || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Resumen</span>
          <h1>Panel general</h1>
        </div>
        {puedeEmitir && <Link to="/emitir" className="btn btn-gold">+ Emitir DTE</Link>}
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Ventas de hoy</div>
          <div className="value">${data.ventasHoy.total.toFixed(2)}</div>
          <div className="sub">{data.ventasHoy.cantidad} documento(s)</div>
        </div>
        <div className="stat-card">
          <div className="label">Ventas del mes</div>
          <div className="value gold">${data.ventasMes.total.toFixed(2)}</div>
          <div className="sub">{data.ventasMes.cantidad} documento(s)</div>
        </div>
        <div className="stat-card">
          <div className="label">Total procesado (historico)</div>
          <div className="value">${totalProcesado.toFixed(2)}</div>
        </div>
        {data.totalesPorEstado.map((t) => (
          t.estado !== 'PROCESADO' && (
            <div className="stat-card" key={t.estado}>
              <div className="label">{t.estado}</div>
              <div className="value" style={{ fontSize: 22 }}>{t.cantidad}</div>
              <div className="sub">${t.total.toFixed(2)}</div>
            </div>
          )
        ))}
      </div>

      <div className="panel">
        <div className="flex-between mb-16">
          <strong>Ultimos documentos emitidos</strong>
          <Link to="/historial" style={{ fontSize: 13 }}>Ver historial completo →</Link>
        </div>

        {data.ultimosDtes.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🧾</div>
            {puedeEmitir ? (
              <>Aun no has emitido ningun DTE. <Link to="/emitir">Emitir el primero</Link></>
            ) : (
              'Aun no se ha emitido ningun DTE.'
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Numero de control</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosDtes.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.numero_control}</td>
                  <td>{d.cliente}</td>
                  <td>{d.fecha_emision}</td>
                  <td className="text-right">${d.monto_total.toFixed(2)}</td>
                  <td><EstadoBadge estado={d.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
