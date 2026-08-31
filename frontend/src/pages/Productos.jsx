import { useEffect, useState } from 'react';
import api from '../api/client';

const VACIO = { codigo: '', descripcion: '', precioUnitario: '', gravado: true, tipoItem: 1 };

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    api.get('/productos').then((res) => setProductos(res.data.productos)).finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  function campo(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/productos', {
        ...form,
        precioUnitario: Number(form.precioUnitario),
        tipoItem: Number(form.tipoItem),
      });
      setForm(VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el producto.');
    }
  }

  async function eliminar(id) {
    if (!window.confirm('Desactivar este producto?')) return;
    await api.delete(`/productos/${id}`);
    cargar();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Catalogo</span>
          <h1>Productos y servicios</h1>
        </div>
        <button className="btn btn-gold" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {mostrarForm && (
        <form className="panel mb-16" onSubmit={guardar}>
          {error && <div className="login-error">{error}</div>}
          <div className="field-row">
            <div className="field">
              <label>Codigo interno</label>
              <input value={form.codigo} onChange={(e) => campo('codigo', e.target.value)} required />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Descripcion</label>
              <input value={form.descripcion} onChange={(e) => campo('descripcion', e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Precio unitario (USD)</label>
              <input type="number" min="0" step="0.01" value={form.precioUnitario} onChange={(e) => campo('precioUnitario', e.target.value)} required />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipoItem} onChange={(e) => campo('tipoItem', e.target.value)}>
                <option value={1}>Bien</option>
                <option value={2}>Servicio</option>
              </select>
            </div>
            <div className="field">
              <label>IVA</label>
              <select value={form.gravado ? '1' : '0'} onChange={(e) => campo('gravado', e.target.value === '1')}>
                <option value="1">Gravado</option>
                <option value="0">Exento</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Guardar producto</button>
        </form>
      )}

      <div className="panel">
        {cargando ? (
          <div className="muted">Cargando...</div>
        ) : productos.length === 0 ? (
          <div className="empty-state"><div className="icon">📦</div>No hay productos en el catalogo aun.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Descripcion</th>
                <th>Tipo</th>
                <th className="text-right">Precio</th>
                <th>IVA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.codigo}</td>
                  <td>{p.descripcion}</td>
                  <td>{p.tipo_item === 2 ? 'Servicio' : 'Bien'}</td>
                  <td className="text-right">${p.precio_unitario.toFixed(2)}</td>
                  <td>{p.gravado ? 'Gravado' : 'Exento'}</td>
                  <td><button className="btn btn-sm btn-danger-outline" onClick={() => eliminar(p.id)}>Desactivar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
