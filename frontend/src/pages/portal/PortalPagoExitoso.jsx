import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import portalApi from '../../api/portalClient';
import PortalLayout from './PortalLayout';

export default function PortalPagoExitoso() {
  const [searchParams] = useSearchParams();
  const dteId = searchParams.get('dteId');
  const sessionId = searchParams.get('session_id');

  const [estado, setEstado] = useState('verificando'); // verificando | pagado | no_pagado | error

  useEffect(() => {
    if (!dteId) { setEstado('error'); return; }
    portalApi.post(`/facturas/${dteId}/confirmar-pago`, { sessionId })
      .then((res) => setEstado(res.data.pagado ? 'pagado' : 'no_pagado'))
      .catch(() => setEstado('error'));
  }, [dteId, sessionId]);

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <span className="eyebrow">Pago</span>
          <h1>Confirmacion de pago</h1>
        </div>
      </div>

      <div className="panel" style={{ textAlign: 'center', padding: 48 }}>
        {estado === 'verificando' && <div className="muted">Verificando tu pago...</div>}

        {estado === 'pagado' && (
          <>
            <div className="sello" style={{ margin: '0 auto 20px' }}>Pago Confirmado</div>
            <h2 style={{ margin: '0 0 8px' }}>¡Tu pago fue registrado correctamente!</h2>
            <p className="muted">Ya puedes ver el estado actualizado en tus facturas.</p>
          </>
        )}

        {estado === 'no_pagado' && (
          <>
            <h2 style={{ margin: '0 0 8px', color: 'var(--danger)' }}>El pago no se completo</h2>
            <p className="muted">Si crees que esto es un error, intenta de nuevo o contacta a quien te factura.</p>
          </>
        )}

        {estado === 'error' && (
          <>
            <h2 style={{ margin: '0 0 8px', color: 'var(--danger)' }}>No pudimos verificar el pago</h2>
            <p className="muted">Intenta de nuevo desde tus facturas.</p>
          </>
        )}

        <Link className="btn btn-primary mt-24" to="/portal">Volver a mis facturas</Link>
      </div>
    </PortalLayout>
  );
}
