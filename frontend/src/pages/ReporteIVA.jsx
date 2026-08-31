import { useEffect, useState } from 'react';
import api, { API_BASE } from '../api/client';

function mesActual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReporteIVA() {
  const [mes, setMes] = useState(mesActual());
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  function cargar() {
    setCargando(true);
    setError('');
    api.get('/reportes/iva', { params: { mes } })
      .then((res) => setResumen(res.data.resumen))
      .catch((err) => setError(err.response?.data?.error || 'Error al cargar el resumen.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  function descargarExcel() {
    window.open(`${API_BASE}/reportes/iva/excel?mes=${mes}`, '_blank');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Obligaciones fiscales</span>
          <h1>Resumen para declaracion de IVA</h1>
        </div>
      </div>

      <div className="panel mb-16">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Mes a declarar</label>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={cargar}>Consultar</button>
          <button className="btn btn-outline" onClick={descargarExcel} disabled={!resumen}>Descargar Excel</button>
        </div>
      </div>

      {error && <div className="login-error mb-16">{error}</div>}

      {cargando ? (
        <div className="muted">Cargando...</div>
      ) : resumen && (
        <>
          <div className="card-grid">
            <div className="stat-card">
              <div className="label">Ventas Gravadas</div>
              <div className="value">${resumen.ventasGravadas.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Ventas Exentas</div>
              <div className="value">${resumen.ventasExentas.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Ventas No Sujetas</div>
              <div className="value">${resumen.ventasNoSujetas.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Debito Fiscal (IVA 13%)</div>
              <div className="value gold">${resumen.debitoFiscal.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total de Operaciones</div>
              <div className="value">${resumen.totalOperaciones.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Documentos considerados</div>
              <div className="value" style={{ fontSize: 22 }}>{resumen.cantidadDocumentos}</div>
            </div>
          </div>

          <div className="panel">
            <strong>Documentos por tipo</strong>
            {Object.keys(resumen.documentosPorTipo).length === 0 ? (
              <div className="empty-state"><div className="icon">📄</div>No hay documentos procesados en este mes.</div>
            ) : (
              <table className="data-table mt-24">
                <thead>
                  <tr><th>Tipo de documento</th><th className="text-right">Cantidad</th></tr>
                </thead>
                <tbody>
                  {Object.entries(resumen.documentosPorTipo).map(([tipo, cantidad]) => (
                    <tr key={tipo}><td>{tipo}</td><td className="text-right">{cantidad}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
              Nota: las Notas de Credito ya estan restadas de estos totales, y las Notas de Debito sumadas,
              como corresponde para el calculo fiscal. Solo se incluyen documentos con estado PROCESADO.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
