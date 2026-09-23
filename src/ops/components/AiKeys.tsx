// Telefondan AI anahtarı girişi: anahtar bir kez gönderilir, Supabase Vault'ta şifreli saklanır, geri okunamaz.
import { useState } from 'react';
import { CheckCircle2, ExternalLink, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { callMissions, errorText } from '../lib/api';
import { db, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { useSession } from '../session';
import { Button, Notice, Panel, Pill } from '../ui';

interface KeyRow { provider: 'anthropic' | 'gemini' | 'openai' | 'groq'; last4: string; updated_at: string; verified_at: string | null; verify_error: string | null }
const PROVIDERS = [
  { id: 'anthropic' as const, name: 'Anthropic Claude', note: 'Varsayılan. Web araması ve sayfa okuma ile en iyi araştırma.', url: 'https://console.anthropic.com/settings/keys', prefix: 'sk-ant-' },
  { id: 'gemini' as const, name: 'Google Gemini', note: 'ÜCRETSİZ (kart gerekmez, günlük sınırlı). Google arama ile araştırır. Claude çalışmazsa otomatik devreye girer.', url: 'https://aistudio.google.com/app/apikey', prefix: 'AIza' },
  { id: 'groq' as const, name: 'Groq (Llama)', note: 'ÜCRETSİZ yedek (kart gerekmez, e-posta ile üyelik). Web araması yapabilir. Claude ve Gemini çalışmazsa devreye girer.', url: 'https://console.groq.com/keys', prefix: 'gsk_' },
  { id: 'openai' as const, name: 'OpenAI GPT-4o', note: 'Alternatif sağlayıcı (Yedek analitik ve içerik motoru).', url: 'https://platform.openai.com/api-keys', prefix: 'sk-' },
];

export function AiKeysPanel({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const q = useQuery(async () => {
    const [{ data }, env] = await Promise.all([
      db().from('ai_provider_keys').select('provider,last4,updated_at,verified_at,verify_error'),
      callMissions<{ anthropic: boolean; gemini: boolean; openai: boolean; groq?: boolean }>('ai_status').catch(() => null),
    ]);
    return { rows: (data ?? []) as KeyRow[], active: env };
  }, { rows: [] as KeyRow[], active: null as { anthropic: boolean; gemini: boolean; openai: boolean; groq?: boolean } | null }, []);
  const [val, setVal] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const isAdmin = session.role === 'admin';

  const save = async (p: KeyRow['provider']) => {
    setBusy(p); setMsg(null);
    try {
      const { error } = await db().rpc('set_ai_key', { p_provider: p, p_key: (val[p] || '').trim() });
      if (error) throw error;
      setVal((v) => ({ ...v, [p]: '' }));
      try { await callMissions('ai_test', { provider: p }); setMsg({ tone: 'ok', text: 'Anahtar kaydedildi ve sağlayıcı tarafından doğrulandı. Botlar artık bu anahtarı kullanıyor.' }); }
      catch (e) { setMsg({ tone: 'error', text: `Kaydedildi ama doğrulanamadı: ${errorText(e)}` }); }
      await q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const clear = async (p: KeyRow['provider']) => { setBusy(p); await db().rpc('clear_ai_key', { p_provider: p }); setBusy(null); q.reload(); };

  return (
    <Panel kicker="Botların beyni" title={<span className="inline-flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand-green" /> AI anahtarı</span>}>
      {!compact && <p className="text-xs text-ink-400 mb-3">Anahtarı telefondan kopyalayıp buraya yapıştırmanız yeterli. Anahtar Supabase Vault’ta şifreli saklanır, tarayıcıya geri gönderilmez; yalnızca son 4 hanesi görünür.</p>}
      <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-ink-300">
          <b className="text-emerald-700">Otomatik yedekleme (failover):</b> Claude’un kredisi/limiti dolarsa görevler sırayla <b>Gemini</b> ve <b>Groq</b> ile (içerik botlarında <b>OpenAI</b> de) devam eder. Yedek anahtar tanımlı değilse görev “kredi bitti” hatasıyla durur.
        </p>
      </div>
      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const row = q.data.rows.find((r) => r.provider === p.id);
          const active = q.data.active?.[p.id];
          return (
            <div key={p.id} className="rounded-xl ring-1 ring-ink-700 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm text-ink-100 flex-1">{p.name}</span>
                {row ? (row.verified_at ? <Pill tone="go">DOĞRULANDI · …{row.last4}</Pill> : <Pill tone={row.verify_error ? 'stop' : 'wait'}>{row.verify_error ? 'GEÇERSİZ' : 'KAYITLI'} · …{row.last4}</Pill>)
                  : active ? <Pill tone="go">EDGE SECRET TANIMLI</Pill> : <Pill tone="wait">TANIMLI DEĞİL</Pill>}
              </div>
              <div className="text-[11px] text-ink-400">{p.note}{row && ` Son güncelleme: ${fmtDateTime(row.updated_at)}.`}</div>
              {row?.verify_error && <div className="text-[11px] text-rose-700">{row.verify_error}</div>}
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="password" autoComplete="off" className="ops-input font-mono text-xs flex-1" placeholder={`${p.prefix}… yapıştırın`} value={val[p.id] ?? ''} onChange={(e) => setVal((v) => ({ ...v, [p.id]: e.target.value }))} />
                  <Button variant="primary" loading={busy === p.id} disabled={(val[p.id] ?? '').trim().length < 20} onClick={() => save(p.id)} icon={<ShieldCheck className="w-4 h-4" />}>Kaydet ve doğrula</Button>
                  {row && <Button variant="ghost" onClick={() => clear(p.id)} icon={<Trash2 className="w-4 h-4" />}>Kaldır</Button>}
                </div>
              )}
              <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-green"><ExternalLink className="w-3 h-3" /> Anahtar al: {p.url.replace('https://', '')}</a>
            </div>
          );
        })}
        {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.tone === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}{msg.text}</Notice>}
      </div>
    </Panel>
  );
}
