import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  const [cliente, setCliente] = useState(() => {
    const guardado = sessionStorage.getItem('portal_cliente');
    return guardado ? JSON.parse(guardado) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/cliente-login', { email, password });
    setCliente(data.cliente);
    sessionStorage.setItem('portal_cliente', JSON.stringify(data.cliente));
    return data.cliente;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/cliente-logout'); } catch (e) { /* noop */ }
    setCliente(null);
    sessionStorage.removeItem('portal_cliente');
  }, []);

  return (
    <PortalAuthContext.Provider value={{ cliente, login, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  return useContext(PortalAuthContext);
}
