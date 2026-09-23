import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface OpsSession {
  userId: string;
  email: string;
  role: 'admin' | 'staff';
  displayName: string;
}

export const SessionContext = createContext<OpsSession | null>(null);
export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('OpsSession yok');
  return s;
}

export type Route =
  | 'home' | 'approvals' | 'bots' | 'planner' | 'studio' | 'connections'
  | 'construction' | 'rental' | 'leads' | 'skills' | 'settings' | 'reports' | 'portfolio' | 'queue' | 'system';

export interface RouteState { route: Route; id?: string | null; params: URLSearchParams }

function read(): RouteState {
  const params = new URLSearchParams(window.location.search);
  return { route: (params.get('ops') as Route) || 'home', id: params.get('id'), params };
}

const RouterContext = createContext<{ state: RouteState; go: (route: Route, id?: string | null, extra?: Record<string, string>) => void }>({
  state: { route: 'home', params: new URLSearchParams() }, go: () => undefined,
});

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RouteState>(read);
  useEffect(() => {
    const onPop = () => setState(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((route: Route, id?: string | null, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ ops: route, ...(id ? { id } : {}), ...extra });
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setState(read());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return <RouterContext.Provider value={{ state, go }}>{children}</RouterContext.Provider>;
}
export function useRouter() { return useContext(RouterContext); }
