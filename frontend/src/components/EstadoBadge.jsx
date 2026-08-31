const CLASES = {
  PROCESADO: 'badge-procesado',
  PENDIENTE: 'badge-pendiente',
  RECHAZADO: 'badge-rechazado',
  ANULADO: 'badge-anulado',
  CONTINGENCIA: 'badge-contingencia',
};

export default function EstadoBadge({ estado }) {
  return <span className={`badge ${CLASES[estado] || 'badge-pendiente'}`}>{estado}</span>;
}
