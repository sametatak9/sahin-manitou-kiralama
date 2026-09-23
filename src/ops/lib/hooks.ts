import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

/** Basit veri kancası: loading / error / reload + isteğe bağlı realtime tabloları. */
export function useQuery<T>(fetcher: () => Promise<T>, initial: T, deps: unknown[] = [], realtimeTables: string[] = []): QueryState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcherRef.current());
    } catch (e) {
      setError(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); reload(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const tablesKey = realtimeTables.join(',');
  useEffect(() => {
    if (!supabase || !realtimeTables.length) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`ops-${tablesKey}-${Math.random().toString(36).slice(2, 8)}`);
    for (const table of realtimeTables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => { reload(); }, 400);
      });
    }
    channel.subscribe();
    return () => { clearTimeout(timer); supabase?.removeChannel(channel); };
  }, [tablesKey, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, reload, setData };
}

/** Supabase sorgu sonucunu açar; hata varsa fırlatır. */
export function unwrap<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return (res.data ?? ([] as unknown)) as T;
}

export function db() {
  if (!supabase) throw new Error('Supabase bağlantısı yapılandırılmamış');
  return supabase;
}
