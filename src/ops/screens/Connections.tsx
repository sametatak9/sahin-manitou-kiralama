import { useState } from 'react';
import { KeyRound, ShieldCheck, Smartphone, ExternalLink, LayoutGrid, Link2, Loader2, PlugZap, Radar, RefreshCw, Send, Unplug } from 'lucide-react';
import { AppDetail } from '../components/AppDetail';
import { appUrl, openApp } from '../lib/appLinks';
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
          <p className="text-xs text-ink-400">Hesabınızı bir kez bağlayın, botlar programın içinden kullansın. İstediğiniz an “Uygulamayı aç” ile uygulamanın kendisine geçin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => go('system', null, { tab: 'credentials' })} icon={<KeyRound className="w-4 h-4" />}>Giriş bilgileri</Button>
          <Button variant="ghost" onClick={() => go('system')} icon={<ShieldCheck className="w-4 h-4" />}>Sistem kontrolü</Button>
          <Button variant="ghost" onClick={q.reload} icon={q.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}>Yenile</Button>
        </div>
      </div>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice>}

      {q.loading && !data ? <StateView kind="loading" /> : groups.map((g) => g.items.length > 0 && (
        <Panel key={g.key} title={CATEGORY[g.key].title}>
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
                        {c.capabilities.publish && <span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">Paylaşım</span>}
                        {c.capabilities.metrics && <span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">İstatistik</span>}
                        {c.capabilities.messaging && <span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">Mesaj</span>}
                        {c.capabilities.design && <span className="text-[10px] rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">Tasarım</span>}
                        {!c.implemented && <span className="text-[10px] rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700">Otomatik bağlantı yok</span>}
                      </div>
                    </div>
                  </button>
                  {c.missing_env.length > 0 && c.implemented && <button type="button" onClick={() => go('system', null, { tab: 'credentials' })} className="text-left text-[11px] text-amber-700 underline">Bağlanmak için giriş bilgileri eksik — tamamla</button>}
                  {connectedAcc.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px]">
                      <span className="text-ink-200 truncate">✓ {a.external_account_name ?? a.platform}<span className="text-ink-500"> · bağlı</span></span>
                      {session.role === 'admin' && <button onClick={() => disconnect(a.id)} className="text-ink-500 hover:text-rose-700" title="Bağlantıyı kes">{busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}</button>}
                    </div>
                  ))}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {canOauth && session.role === 'admin' && <Button variant={c.status === 'connected' ? 'subtle' : 'primary'} loading={busy === c.key} disabled={c.missing_env.length > 0} onClick={() => connect(c)} icon={<PlugZap className="w-4 h-4" />}>{c.status === 'connected' ? 'Yeniden bağla' : 'Hesabımla bağla'}</Button>}
                    {appUrl(c.key) && <Button variant={c.status === 'connected' ? 'primary' : 'subtle'} onClick={() => openApp(c.key)} icon={<Smartphone className="w-4 h-4" />}>Uygulamayı aç</Button>}
                    {c.key === 'telegram' && c.status === 'connected' && session.role === 'admin' && <Button variant="subtle" loading={busy === 'tg'} onClick={testTelegram} icon={<Send className="w-4 h-4" />}>Test mesajı</Button>}
                    <Button variant="subtle" onClick={() => setDetail(c.key)} icon={<LayoutGrid className="w-4 h-4" />}>Botlar & geçmiş</Button>
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
      <Notice tone="info">Her uygulamaya bir kez “Hesabımla bağla” ile giriş yaparsınız; bağlantı kalıcı saklanır ve botlar bu hesabı programın içinden kullanır. “Uygulamayı aç” uygulamanın kendisini açar (telefonda uygulama, bilgisayarda yeni sekme).</Notice>
    </div>
  );
}
