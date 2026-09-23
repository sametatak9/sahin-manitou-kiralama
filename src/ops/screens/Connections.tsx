import { useState } from 'react';
import { BookOpen, Cpu, KeyRound, ShieldCheck, ExternalLink, LayoutGrid, Link2, Loader2, PlugZap, Radar, RefreshCw, Send, Unplug } from 'lucide-react';
import { AppDetail } from '../components/AppDetail';
import { db, unwrap } from '../lib/hooks';
import { callOps, errorText } from '../lib/api';
import { useQuery } from '../lib/hooks';
import { connectionLabel, connectionTone, fmtDateTime, relTime } from '../lib/format';
import type { Bot, ConnectorStatus, OpsStatus } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, ErrorState, Notice, Panel, Pill, PlatformBadge, StateView } from '../ui';

const CATEGORY: Record<string, { title: string; kicker: string }> = {
  social: { title: 'Sosyal medya', kicker: 'SocialConnector' },
  listing: { title: 'İlan platformları', kicker: 'ListingConnector' },
  search: { title: 'Arama & yerel', kicker: 'SearchConnector' },
  communication: { title: 'İletişim', kicker: 'CommunicationConnector' },
  design: { title: 'Tasarım', kicker: 'DesignConnector' },
};
const OAUTH_PROVIDER: Record<string, string> = { instagram: 'meta', facebook: 'meta', canva: 'canva', youtube: 'google' };

export function ConnectionsScreen() {
  const { state, go } = useRouter();
  const session = useSession();
  const q = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const bots = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(() => {
    const p = state.params;
    if (p.get('connected')) return { tone: 'ok', text: `${p.get('connected') === 'meta' ? `Meta bağlantısı tamamlandı (${p.get('pages')} sayfa)` : p.get('connected') === 'youtube' ? 'YouTube kanalı bağlandı' : 'Canva bağlantısı tamamlandı'} — hesap bilgisi API’den doğrulandı.` };
    if (p.get('oauth_error')) return { tone: 'error', text: `OAuth hatası: ${p.get('oauth_error')}` };
    return null;
  });

  const connect = async (c: ConnectorStatus) => {
    setBusy(c.key); setMsg(null);
    try { const r = await callOps<{ url: string }>('oauth_start', { provider: OAUTH_PROVIDER[c.key] ?? c.key }); window.location.href = r.url; }
    catch (e) { setMsg({ tone: 'warn', text: errorText(e) }); setBusy(null); }
  };
  const disconnect = async (accountId: string) => {
    setBusy(accountId); try { await callOps('disconnect', { account_id: accountId }); await q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const testTelegram = async () => { setBusy('tg'); try { await callOps('test_telegram'); setMsg({ tone: 'ok', text: 'Telegram API test mesajını kabul etti.' }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); } };

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const data = q.data;
  const groups = Object.keys(CATEGORY).map((k) => ({ key: k, items: data?.connectors.filter((c) => c.category === k) ?? [] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Uygulamalar</h2>
          <p className="text-xs text-ink-400">Bir uygulamaya tıklayın: hangi botlar görevli, ne yapıyorlar, hesabın durumu ve botların o uygulama hakkında bulduğu bilgiler. Giriş yalnızca uygulamanın resmi (OAuth) ekranıyla yapılır; şifre panelde tutulmaz.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => go('system', null, { tab: 'credentials' })} icon={<KeyRound className="w-4 h-4" />}>Giriş bilgileri</Button>
          <Button variant="ghost" onClick={() => go('system')} icon={<ShieldCheck className="w-4 h-4" />}>Sistem kontrolü</Button>
          <Button variant="ghost" onClick={q.reload} icon={q.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}>Yenile</Button>
        </div>
      </div>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Panel kicker="AI Provider Layer" title="AI sağlayıcıları" action={<Cpu className="w-5 h-5 text-ink-500" />}>
            <div className="space-y-1.5">{(['anthropic', 'openai', 'gemini'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between text-xs"><span className="text-ink-200 capitalize">{k}{k === 'anthropic' && <span className="text-ink-500"> · varsayılan</span>}</span><Pill tone={data.ai[k] ? 'go' : 'wait'}>{data.ai[k] ? 'ANAHTAR TANIMLI' : 'API KEY REQUIRED'}</Pill></div>
            ))}</div>
          </Panel>
          <Panel kicker="Scheduler" title="Worker" action={<Radar className="w-5 h-5 text-ink-500" />}>
            <div className="text-xs text-ink-300 space-y-1"><div>pg_cron → <span className="font-mono">ops/worker</span> · her dakika</div><div>Son bot koşusu: <b className="text-ink-100">{data.worker_last_seen ? `${relTime(data.worker_last_seen)} (${fmtDateTime(data.worker_last_seen)})` : 'henüz yok'}</b></div><div className="text-ink-500">Kilit: SKIP LOCKED + lease · retry · dead letter</div></div>
          </Panel>
          <Panel kicker="OAuth" title="Yönlendirme adresi" action={<Link2 className="w-5 h-5 text-ink-500" />}>
            <p className="text-[11px] text-ink-400 mb-1.5">Meta ve Canva geliştirici uygulamalarında “Redirect URI” olarak bunu girin:</p>
            <code className="block text-[10px] font-mono text-emerald-700 bg-ink-950 rounded-lg p-2 break-all">{data.redirect_uri}</code>
          </Panel>
        </div>
      )}

      {q.loading && !data ? <StateView kind="loading" /> : groups.map((g) => g.items.length > 0 && (
        <Panel key={g.key} kicker={CATEGORY[g.key].kicker} title={CATEGORY[g.key].title}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {g.items.map((c) => {
              const connectedAcc = c.accounts.filter((a) => a.connection_status === 'connected');
              const canOauth = c.authType === 'oauth' && c.implemented && Boolean(OAUTH_PROVIDER[c.key]);
              return (
                <div key={c.key} className="rounded-2xl bg-white ring-1 ring-ink-700 p-4 flex flex-col gap-3 hover:ring-brand-green/50 transition">
                  <button type="button" onClick={() => setDetail(c.key)} className="flex items-start gap-3 text-left">
                    <PlatformBadge platform={c.key} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-100 truncate">{c.name}</span><Pill tone={connectionTone(c.status)}>{connectionLabel(c.status)}</Pill></div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.capabilities.publish && <span className="text-[9px] font-mono rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">PUBLISH</span>}
                        {c.capabilities.metrics && <span className="text-[9px] font-mono rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">METRICS</span>}
                        {c.capabilities.messaging && <span className="text-[9px] font-mono rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">MESSAGING</span>}
                        {c.capabilities.design && <span className="text-[9px] font-mono rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">DESIGN</span>}
                        {!c.implemented && c.officialApi && <span className="text-[9px] font-mono rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700">ENTEGRASYON BEKLİYOR</span>}
                      </div>
                    </div>
                  </button>
                  <p className="text-[11px] text-ink-400 leading-relaxed">{c.note}</p>
                  {c.missing_env.length > 0 && <div className="text-[10px] font-mono text-amber-700">Eksik secret: {c.missing_env.join(', ')}</div>}
                  {connectedAcc.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px]">
                      <span className="text-ink-200 truncate">✓ {a.external_account_name ?? a.platform}<span className="text-ink-500"> · doğrulandı {relTime(a.last_verified_at)}</span></span>
                      {session.role === 'admin' && <button onClick={() => disconnect(a.id)} className="text-ink-500 hover:text-rose-700" title="Bağlantıyı kes">{busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}</button>}
                    </div>
                  ))}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {canOauth && session.role === 'admin' && <Button variant={c.status === 'connected' ? 'subtle' : 'primary'} loading={busy === c.key} disabled={c.missing_env.length > 0} onClick={() => connect(c)} icon={<PlugZap className="w-4 h-4" />}>{c.status === 'connected' ? 'Yeniden bağla' : c.key === 'canva' ? 'Canva bağla' : 'Meta ile bağla'}</Button>}
                    {c.key === 'telegram' && c.status === 'connected' && session.role === 'admin' && <Button variant="subtle" loading={busy === 'tg'} onClick={testTelegram} icon={<Send className="w-4 h-4" />}>Test mesajı</Button>}
                    <Button variant="subtle" onClick={() => setDetail(c.key)} icon={<LayoutGrid className="w-4 h-4" />}>Uygulama merkezi</Button>
                    <a href={c.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl ring-1 ring-ink-700 px-3 py-2 text-xs text-ink-300 hover:bg-ink-800"><BookOpen className="w-3.5 h-3.5" /> Resmi doküman <ExternalLink className="w-3 h-3" /></a>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
      {detail && data && (() => { const c = data.connectors.find((x) => x.key === detail)!; return (
        <AppDetail c={c} allBots={bots.data} onClose={() => setDetail(null)} busy={busy === c.key}
          canConnect={c.authType === 'oauth' && c.implemented && Boolean(OAUTH_PROVIDER[c.key]) && session.role === 'admin'} onConnect={() => connect(c)} />); })()}
      <Notice tone="info">Uygulama anahtarları “Giriş bilgileri” ekranında bir kez girilir ve Supabase Vault’ta şifreli saklanır; tarayıcıya geri gönderilmez. Hesap bağlantısı resmi OAuth ile yapılır, oturum token’ları da Vault’ta durur ve sistem tarafından yenilenir.</Notice>
    </div>
  );
}
