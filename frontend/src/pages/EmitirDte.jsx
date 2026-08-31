import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api/client';

const TIPOS_DTE = [
  { value: '01', label: 'Factura (Consumidor Final)' },
  { value: '03', label: 'Comprobante de Credito Fiscal (CCF)' },
  { value: '05', label: 'Nota de Credito' },
  { value: '06', label: 'Nota de Debito' },
];

const NOMBRES_TIPO_DTE = { '01': 'Factura', '03': 'CCF', '05': 'Nota de Credito', '06': 'Nota de Debito' };

let itemSeq = 0;

export default function EmitirDte() {
  const navigate = useNavigate();
  const [tipoDte, setTipoDte] = useState('01');
  const [condicionOperacion, setCondicionOperacion] = useState(1);
  const [motivo, setMotivo] = useState('');

  const [clienteQuery, setClienteQuery] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [documentosDelCliente, setDocumentosDelCliente] = useState([]);
  const [documentoRelacionadoId, setDocumentoRelacionadoId] = useState('');

  const [items, setItems] = useState([
    { _id: itemSeq++, descripcion: '', cantidad: 1, precioUnitario: '', gravado: true, tipoItem: 1 },
  ]);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const esNotaCreditoODebito = tipoDte === '05' || tipoDte === '06';

  useEffect(() => {
    if (clienteQuery.trim().length < 2) { setClientesSugeridos([]); return; }
    const t = setTimeout(() => {
      api.get('/clientes', { params: { q: clienteQuery } })
        .then((res) => setClientesSugeridos(res.data.clientes))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [clienteQuery]);

  // Cuando se elige un cliente y el tipo de documento es Nota de Credito/Debito,
  // cargamos sus documentos previos (no anulados) para poder referenciarlos.
  useEffect(() => {
    setDocumentoRelacionadoId('');
    if (!clienteSeleccionado || !esNotaCreditoODebito) { setDocumentosDelCliente([]); return; }
    api.get('/dtes', { params: { clienteId: clienteSeleccionado.id, limit: 100 } })
      .then((res) => {
        const validos = res.data.dtes.filter((d) => d.estado !== 'ANULADO');
        setDocumentosDelCliente(validos);
      })
      .catch(() => setDocumentosDelCliente([]));
  }, [clienteSeleccionado, tipoDte]);

  function actualizarItem(id, campo, valor) {
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, [campo]: valor } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { _id: itemSeq++, descripcion: '', cantidad: 1, precioUnitario: '', gravado: true, tipoItem: 1 }]);
  }

  function quitarItem(id) {
    setItems((prev) => prev.filter((it) => it._id !== id));
  }

  const totales = useMemo(() => {
    let gravado = 0, exento = 0;
    items.forEach((it) => {
      const cant = Number(it.cantidad) || 0;
      const precio = Number(it.precioUnitario) || 0;
      const sub = cant * precio;
      if (it.gravado) gravado += sub; else exento += sub;
    });
    const iva = gravado * 0.13;
    return { gravado, exento, iva, total: gravado + exento + iva };
  }, [items]);

  function reiniciarFormulario() {
    setResultado(null);
    setItems([{ _id: itemSeq++, descripcion: '', cantidad: 1, precioUnitario: '', gravado: true, tipoItem: 1 }]);
    setClienteSeleccionado(null);
    setClienteQuery('');
    setDocumentoRelacionadoId('');
    setMotivo('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResultado(null);

    const itemsValidos = items.filter((it) => it.descripcion && Number(it.precioUnitario) > 0);
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un item con descripcion y precio valido.');
      return;
    }
    if (tipoDte === '03' && !clienteSeleccionado) {
      setError('El CCF requiere seleccionar un cliente contribuyente (con NRC).');
      return;
    }
    if (esNotaCreditoODebito) {
      if (!clienteSeleccionado) {
        setError(`Una ${NOMBRES_TIPO_DTE[tipoDte]} requiere seleccionar el cliente del documento original.`);
        return;
      }
      if (!documentoRelacionadoId) {
        setError(`Selecciona el documento que esta ${tipoDte === '05' ? 'corrigiendo/abonando' : 'cargando'}.`);
        return;
      }
    }

    setEnviando(true);
    try {
      const { data } = await api.post('/dtes', {
        tipoDte,
        clienteId: clienteSeleccionado?.id || null,
        condicionOperacion: Number(condicionOperacion),
        documentoRelacionadoId: esNotaCreditoODebito ? Number(documentoRelacionadoId) : undefined,
        motivo: esNotaCreditoODebito ? motivo : undefined,
        items: itemsValidos.map((it) => ({
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad),
          precioUnitario: Number(it.precioUnitario),
          gravado: it.gravado,
          tipoItem: Number(it.tipoItem),
        })),
      });
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al emitir el DTE.');
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    const dte = resultado.dte;
    const aceptado = dte.estado === 'PROCESADO';
    return (
      <div>
        <div className="page-header">
          <div>
            <span className="eyebrow">Resultado</span>
            <h1>{NOMBRES_TIPO_DTE[dte.tipo_dte] || 'DTE'} {aceptado ? 'emitido' : 'generado'}</h1>
          </div>
        </div>
        <div className="panel" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div className={`sello ${aceptado ? '' : 'pendiente'}`}>
            {aceptado ? 'MH · Aceptado' : dte.estado}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 6px' }}><strong>Numero de control:</strong> <span className="mono">{dte.numero_control}</span></p>
            <p style={{ margin: '0 0 6px' }}><strong>Codigo de generacion:</strong> <span className="mono">{dte.codigo_generacion}</span></p>
            <p style={{ margin: '0 0 6px' }}><strong>Sello de recepcion:</strong> <span className="mono">{dte.sello_recepcion || '—'}</span></p>
            {dte.documento_relacionado_codigo && (
              <p style={{ margin: '0 0 6px' }}><strong>Documento relacionado:</strong> <span className="mono">{dte.documento_relacionado_codigo}</span></p>
            )}
            <p style={{ margin: '0 0 6px' }}><strong>Total:</strong> ${dte.monto_total.toFixed(2)}</p>
            <div className="mt-24" style={{ display: 'flex', gap: 10 }}>
              <a className="btn btn-primary" href={`${API_BASE}/dtes/${dte.id}/pdf`} target="_blank" rel="noreferrer">Ver comprobante PDF</a>
              <button className="btn btn-outline" onClick={reiniciarFormulario}>
                Emitir otro
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/historial')}>Ir al historial</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Nuevo documento</span>
          <h1>Emitir DTE</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="panel mb-16">
          <div className="field-row">
            <div className="field">
              <label>Tipo de documento</label>
              <select value={tipoDte} onChange={(e) => setTipoDte(e.target.value)}>
                {TIPOS_DTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Condicion de la operacion</label>
              <select value={condicionOperacion} onChange={(e) => setCondicionOperacion(e.target.value)}>
                <option value={1}>Contado</option>
                <option value={2}>Credito</option>
                <option value={3}>Otro</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ position: 'relative' }}>
            <label>
              Cliente {tipoDte === '01' && <span className="muted">(opcional para consumidor final)</span>}
              {esNotaCreditoODebito && <span className="muted"> (requerido, es el cliente del documento original)</span>}
            </label>
            {clienteSeleccionado ? (
              <div className="flex-between" style={{ border: '1px solid var(--border-strong)', borderRadius: 6, padding: '9px 11px' }}>
                <span>{clienteSeleccionado.nombre} · {clienteSeleccionado.numero_documento}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => { setClienteSeleccionado(null); setClienteQuery(''); }}>Cambiar</button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Buscar por nombre o numero de documento..."
                  value={clienteQuery}
                  onChange={(e) => setClienteQuery(e.target.value)}
                />
                {clientesSugeridos.length > 0 && (
                  <div className="panel" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: 4, padding: 6 }}>
                    {clientesSugeridos.map((c) => (
                      <div
                        key={c.id}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 4 }}
                        onMouseDown={() => { setClienteSeleccionado(c); setClientesSugeridos([]); }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f4f6fa'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {c.nombre} · <span className="muted">{c.numero_documento}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {esNotaCreditoODebito && clienteSeleccionado && (
            <div className="field">
              <label>Documento que esta {tipoDte === '05' ? 'corrigiendo/abonando' : 'cargando'}</label>
              <select value={documentoRelacionadoId} onChange={(e) => setDocumentoRelacionadoId(e.target.value)}>
                <option value="">
                  {documentosDelCliente.length === 0 ? 'Este cliente no tiene documentos disponibles' : 'Selecciona un documento...'}
                </option>
                {documentosDelCliente.map((d) => (
                  <option key={d.id} value={d.id}>
                    {NOMBRES_TIPO_DTE[d.tipo_dte] || d.tipo_dte} · {d.numero_control} · {d.fecha_emision} · ${d.monto_total.toFixed(2)}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 10 }}>
                <label>Motivo</label>
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={tipoDte === '05' ? 'Ej. Devolucion de mercaderia, descuento posterior...' : 'Ej. Cobro adicional, interes moratorio...'}
                />
              </div>
            </div>
          )}
        </div>

        <div className="panel mb-16">
          <div className="flex-between mb-16">
            <strong>Detalle de items</strong>
            <button type="button" className="btn btn-sm btn-outline" onClick={agregarItem}>+ Agregar item</button>
          </div>

          {items.map((it) => (
            <div key={it._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div className="field" style={{ flex: 3, marginBottom: 0 }}>
                <label>Descripcion</label>
                <input value={it.descripcion} onChange={(e) => actualizarItem(it._id, 'descripcion', e.target.value)} placeholder="Ej. Servicio de mantenimiento" />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Cant.</label>
                <input type="number" min="0.01" step="0.01" value={it.cantidad} onChange={(e) => actualizarItem(it._id, 'cantidad', e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Precio unit.</label>
                <input type="number" min="0" step="0.01" value={it.precioUnitario} onChange={(e) => actualizarItem(it._id, 'precioUnitario', e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>IVA</label>
                <select value={it.gravado ? '1' : '0'} onChange={(e) => actualizarItem(it._id, 'gravado', e.target.value === '1')}>
                  <option value="1">Gravado</option>
                  <option value="0">Exento</option>
                </select>
              </div>
              <button type="button" className="btn btn-sm btn-danger-outline" onClick={() => quitarItem(it._id)} disabled={items.length === 1}>Quitar</button>
            </div>
          ))}
        </div>

        {error && <div className="login-error mb-16">{error}</div>}

        <div className="panel" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 260 }}>
            <div className="flex-between" style={{ marginBottom: 6 }}><span className="muted">Gravado</span><span>${totales.gravado.toFixed(2)}</span></div>
            <div className="flex-between" style={{ marginBottom: 6 }}><span className="muted">Exento</span><span>${totales.exento.toFixed(2)}</span></div>
            <div className="flex-between" style={{ marginBottom: 6 }}><span className="muted">IVA (13%)</span><span>${totales.iva.toFixed(2)}</span></div>
            <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, fontWeight: 700 }}>
              <span>Total</span><span>${totales.total.toFixed(2)}</span>
            </div>
            <button className="btn btn-gold mt-24" style={{ width: '100%', justifyContent: 'center' }} disabled={enviando}>
              {enviando ? 'Transmitiendo al MH...' : 'Emitir y transmitir'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
