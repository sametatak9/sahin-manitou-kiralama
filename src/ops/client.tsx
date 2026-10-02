// AJANS MODELİ: panel birden çok işletmeye (müşteri) hizmet verir. Seçili müşteri tüm ekranlarda ortaktır ve tarayıcıda hatırlanır.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db, unwrap, useQuery } from './lib/hooks';

export interface AgencyClient {
  id: string; slug: string; name: string; sector: string | null; region: string | null; services: string[] | null; status: string;
  growth_tags: string[] | null; audience: string | null; content_pillars: string[] | null; color: string | null; logo_url: string | null;
  brand_kit_id: string | null; notes: string | null;
}
export const SECTORS: Record<string, string> = {
  insaat: 'İnşaat & yapı', makine_kiralama: 'Makine kiralama', emlak: 'Emlak', mobilya: 'Mobilya & dekorasyon', restoran: 'Restoran & kafe',
  guzellik: 'Güzellik & bakım', saglik: 'Sağlık & klinik', egitim: 'Eğitim & kurs', otomotiv: 'Otomotiv', perakende: 'Mağaza & e-ticaret', diger: 'Diğer',
};

const KEY = 'ops-client';
interface Ctx { clients: AgencyClient[]; client: AgencyClient | null; setClientId: (id: string) => void; loading: boolean; reload: () => Promise<void> }
const ClientContext = createContext<Ctx>({ clients: [], client: null, setClientId: () => undefined, loading: true, reload: async () => undefined });

export function ClientProvider({ children }: { children: ReactNode }) {
  const q = useQuery(async () => unwrap(await db().from('agency_clients').select('*').is('archived_at', null).order('created_at')) as AgencyClient[], [] as AgencyClient[], [], ['agency_clients']);
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const active = q.data.filter((c) => c.status !== 'archived');
  const client = useMemo(() => active.find((c) => c.id === id) ?? active.find((c) => c.slug === 'embay-yapi') ?? active[0] ?? null, [active, id]);
  useEffect(() => { if (client && client.id !== id) setId(client.id); }, [client, id]);
  const setClientId = (v: string) => { setId(v); try { localStorage.setItem(KEY, v); } catch { /* gizli pencere */ } };
  return <ClientContext.Provider value={{ clients: active, client, setClientId, loading: q.loading, reload: q.reload }}>{children}</ClientContext.Provider>;
}
export function useClient() { return useContext(ClientContext); }

export function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR'); }

/** Kenar çubuğu / üst bar için müşteri seçici */
export function ClientSwitcher({ compact = false }: { compact?: boolean }) {
  const { clients, client, setClientId } = useClient();
  if (!client) return null;
  return (
    <label className={compact ? 'relative inline-flex items-center gap-2 rounded-full bg-ink-850 ring-1 ring-ink-700 pl-1 pr-2 py-1 max-w-[52vw]' : 'relative flex items-center gap-2.5 rounded-2xl bg-ink-850 ring-1 ring-ink-700 p-2 hover:ring-brand-green/50 transition cursor-pointer'}>
      <span className={compact ? 'w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0' : 'w-9 h-9 rounded-xl grid place-items-center text-xs font-bold text-white shrink-0'} style={{ background: client.color || '#1E3FA0' }}>{initials(client.name)}</span>
      <span className="min-w-0 flex-1">
        {!compact && <span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-ink-500">Müşteri</span>}
        <span className={compact ? 'block text-[12px] font-semibold text-ink-100 truncate' : 'block text-[13px] font-semibold text-ink-100 truncate'}>{client.name}</span>
      </span>
      <span className="text-ink-400 text-xs">▾</span>
      <select aria-label="Müşteri seç" className="absolute inset-0 opacity-0 cursor-pointer" value={client.id} onChange={(e) => setClientId(e.target.value)}>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.sector ? ` — ${SECTORS[c.sector] ?? c.sector}` : ''}</option>)}
      </select>
    </label>
  );
}
