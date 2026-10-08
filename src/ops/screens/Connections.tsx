// UYGULAMALAR: sade görünüm. Üstte kullandığımız 4 uygulama (tek satır, tek ana düğme), altta isteğe bağlılar ve gelişmiş ayarlar katlanır.
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, KeyRound, LayoutGrid, Link2, Loader2, MoreHorizontal, PlugZap, RefreshCw, Send, Smartphone, Unplug } from 'lucide-react';
import { AppDetail } from '../components/AppDetail';
import { ConnectionArchive, DeveloperSetupValues } from '../components/ConnectionArchive';
import { appUrl, openApp } from '../lib/appLinks';
import { db, unwrap, useQuery } from '../lib/hooks';
import { callOps, errorText } from '../lib/api';
import { connectionLabel, connectionTone, relTime } from '../lib/format';
import type { Bot, ConnectorStatus, OpsStatus } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, ErrorState, Notice, Pill, PlatformBadge, StateView } from '../ui';

const OAUTH_PROVIDER: Record<string, string> = { instagram: 'instagram', facebook: 'meta', canva: 'canva', youtube: 'google' };
// Her gün kullandıklarımız (sırasıyla) ve ne işe yaradıkları — tek cümle
const MAIN: Record<string, string> = {
  instagram: 'Reels, banner ve kaydırmalı gönderiler saatinde paylaşılır; yorumlar ve istatistikler okunur.',
  facebook: 'Aynı gönderiler Facebook sayfasına da gider; yorum cevapları buradan çalışır.',
  telegram: 'Sabah özeti, yeni fiyat soranlar ve hata uyarıları telefonunuza gelir.',
  canva: 'Banner tasarımlarını Canva’da açıp düzenleyebilirsiniz.',
};
// Meta'nın vermesi gereken izinler (sistem kontrolü social_accounts.scopes'a yazar)
const META_NEED: Record<string, string> = {
  instagram_manage_comments: 'Instagram yorumları', pages_read_user_engagement: 'Facebook yorumları', instagram_manage_insights: 'Instagram istatistikleri',
  pages_manage_engagement: 'Facebook yorumlarına yanıt', pages_read_engagement: 'Facebook sayfa verileri', instagram_content_publish: 'Instagram paylaşımı', pages_manage_posts: 'Facebook paylaşımı',
};

type Msg = { tone: 'ok' | 'error' | 'warn'; text: string };

export function ConnectionsScreen() {
  const { state, go } = useRouter();
  const session = useSession();
  const admin = session.role === 'admin';
  const q = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const bots = useQuery(async () => unwrap(await db().from('automation_bots').select('*').order('name')) as Bot[], [] as Bot[], []);
  const scopes = useQuery(async () => {
    const rows = unwrap(await db().from('social_accounts').select('scopes').eq('connector_key', 'facebook').eq('connection_status', 'connected')) as Array<{ scopes: string[] | null }>;
    return Array.from(new Set(rows.flatMap((r) => r.scopes ?? [])));
  }, [] as string[], []);
  const [detail, setDetail] = useState<string | null>(null);
  const [more, setMore] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(() => {
    const p = state.params;
    if (p.get('connected') === 'meta' && p.get('ig') === '0') return { tone: 'warn', text: `Facebook sayfanız bağlandı (${p.get('pages')} sayfa) ama Instagram gelmedi. Instagram satırındaki ⋯ → “Facebook sayfası üzerinden” ile bağlayın. Instagram profesyonel hesap olmalı ve Facebook sayfasına bağlı olmalı.` };
    if (p.get('connected') === 'instagram') return { tone: 'ok', text: `Instagram @${p.get('ig_user')} bağlandı.` };
    if (p.get('connected')) return { tone: 'ok', text: `${p.get('connected') === 'meta' ? `Facebook (${p.get('pages')} sayfa) ve Instagram (${p.get('ig')} hesap) bağlandı` : p.get('connected') === 'youtube' ? 'YouTube kanalı bağlandı' : 'Canva bağlandı'}. Paylaşımlar saatinde gönderilecek.` };
    if (p.get('oauth_error')) return { tone: 'error', text: `Bağlantı tamamlanamadı: ${p.get('oauth_error')}. Tekrar deneyebilirsiniz.` };
    return null;
  });

  const missingEnvText = (c: ConnectorStatus) => c.key === 'instagram'
    ? 'Instagram ile giriş için önce Instagram uygulama kimliği ve gizli anahtarı girilmeli. Sistem → Giriş bilgileri → Instagram bölümünde adım adım anlatılıyor.'
    : c.key === 'youtube' ? 'YouTube için Google Cloud “OAuth istemci kimliği” ve “gizli anahtar” gerekir. Sistem → Giriş bilgileri → Google bölümünde anlatılıyor.'
      : `${c.name} için önce ${c.key === 'canva' ? 'Canva' : 'Meta (Facebook geliştirici)'} uygulama bilgileri girilmeli. Sistem → Giriş bilgileri ekranında anlatılıyor.`;

  const connect = async (c: ConnectorStatus, switchAccount = false, provider?: string) => {
    if (c.missing_env.length && !provider) { window.scrollTo({ top: 0, behavior: 'smooth' }); setMsg({ tone: 'warn', text: missingEnvText(c) }); return; }
    setBusy(c.key); setMsg(null);
    // return_to: giriş sonrası tam bu panel adresine dönülür (oturum burada)
    try { const r = await callOps<{ url: string }>('oauth_start', { provider: provider ?? OAUTH_PROVIDER[c.key] ?? c.key, return_to: `${window.location.origin}${window.location.pathname}`, switch_account: switchAccount, with_instagram: c.key === 'instagram' || provider === 'meta' }); window.location.href = r.url; }
    catch (e) { setMsg({ tone: 'warn', text: errorText(e) }); setBusy(null); }
  };
  const disconnect = async (accountId: string) => {
    setBusy(accountId);
    try { const r = await callOps<{ bots_waiting: boolean }>('disconnect', { account_id: accountId }); setMsg({ tone: 'ok', text: `Çıkış yapıldı.${r.bots_waiting ? ' Bu uygulamanın paylaşımları yeniden bağlanana kadar bekler.' : ''}` }); await q.reload(); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const testTelegram = async () => { setBusy('tg'); try { await callOps('test_telegram'); setMsg({ tone: 'ok', text: 'Telegram’a test mesajı gönderildi — telefonunuza bakın.' }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); } };

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const data = q.data;
  const all = data?.connectors ?? [];
  const main = Object.keys(MAIN).map((k) => all.find((c) => c.key === k)).filter((c): c is ConnectorStatus => Boolean(c));
  const others = all.filter((c) => !MAIN[c.key]);
  const missingMeta = scopes.data.length ? Object.keys(META_NEED).filter((s) => !scopes.data.includes(s)) : [];
  const problem = (c: ConnectorStatus) => c.status !== 'connected' || (['facebook', 'instagram'].includes(c.key) && missingMeta.length > 0);
  const okCount = main.filter((c) => !problem(c)).length;

  const Row = ({ c, small = false }: { c: ConnectorStatus; small?: boolean }) => {
    const connected = c.status === 'connected';
    const acc = c.accounts.filter((a) => a.connection_status === 'connected');
    const canOauth = c.authType === 'oauth' && c.implemented && Boolean(OAUTH_PROVIDER[c.key]) && admin;
    const metaWarn = ['facebook', 'instagram'].includes(c.key) && connected && missingMeta.length > 0;
    const open = more === c.key;
    return (
      <li className={cx('rounded-2xl bg-white ring-1', metaWarn || (!connected && !small) ? 'ring-amber-300' : 'ring-ink-700/60')}>
        <div className={cx('flex items-center gap-3', small ? 'px-3 py-2' : 'p-3 sm:p-4')}>
          <PlatformBadge platform={c.key} size={small ? 'sm' : 'md'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx('font-semibold text-ink-100', small ? 'text-[13px]' : 'text-[15px]')}>{c.name}</span>
              {connected && !metaWarn ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Bağlı</span>
                : metaWarn ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />İzin eksik</span>
                  : <Pill tone={connectionTone(c.status)}>{connectionLabel(c.status)}</Pill>}
            </div>
            {!small && <div className="text-[12px] text-ink-400 truncate">{acc.length ? `${acc.map((a) => a.external_account_name ?? a.platform).join(', ')}${acc[0]?.last_verified_at ? ` · kontrol ${relTime(acc[0].last_verified_at)}` : ''}` : MAIN[c.key] ?? c.note}</div>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tek ana düğme: bağlı değilse “Bağla”, izin eksikse “İzinleri ver”, bağlıysa “Aç” */}
            {canOauth && (!connected || metaWarn) && <Button variant="primary" loading={busy === c.key} onClick={() => (metaWarn ? connect(c, false, 'meta') : connect(c))} icon={<PlugZap className="w-4 h-4" />}>{metaWarn ? 'İzinleri ver' : c.key === 'instagram' ? 'Instagram ile bağla' : 'Bağla'}</Button>}
            {!canOauth && !connected && c.missing_env.length > 0 && c.implemented && admin && <Button variant="primary" onClick={() => go('system', null, { tab: 'credentials' })} icon={<KeyRound className="w-4 h-4" />}>Bilgileri gir</Button>}
            {connected && !metaWarn && appUrl(c.key) && <Button variant="subtle" onClick={() => openApp(c.key)} icon={<Smartphone className="w-4 h-4" />}>{small ? '' : 'Aç'}</Button>}
            <button type="button" onClick={() => setMore(open ? null : c.key)} title="Diğer işlemler" className="rounded-lg p-2 text-ink-400 hover:bg-ink-900"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
        {metaWarn && !open && <p className="px-4 pb-3 -mt-1 text-[12px] text-amber-800">Meta şu izinleri vermemiş: <b>{missingMeta.map((s) => META_NEED[s]).join(', ')}</b>. “İzinleri ver” → açılan ekranda tüm kutuları onaylayın.</p>}
        {open && (
          <div className="border-t border-ink-800 px-4 py-3 space-y-2 text-[12px] text-ink-300">
            {MAIN[c.key] && <p>{MAIN[c.key]}</p>}
            {c.key === 'instagram' && !connected && <p className="text-ink-400">Instagram yalnızca <b>profesyonel hesap</b> ile otomatik paylaşıma izin verir (Ayarlar → Hesap türü → Profesyonel hesaba geç, ücretsiz).</p>}
            {c.accounts.find((a) => a.last_error) && <p className="text-rose-700">Son hata: {c.accounts.find((a) => a.last_error)?.last_error}</p>}
            <div className="flex flex-wrap gap-2">
              {canOauth && connected && <Button variant="subtle" loading={busy === c.key} onClick={() => connect(c)} icon={<RefreshCw className="w-4 h-4" />}>Yeniden bağla</Button>}
              {c.key === 'instagram' && !connected && admin && <Button variant="subtle" loading={busy === c.key} onClick={() => connect(c, false, 'meta')} icon={<Link2 className="w-4 h-4" />}>Facebook sayfası üzerinden</Button>}
              {canOauth && connected && <Button variant="subtle" onClick={() => { if (window.confirm(`${c.name} için başka bir hesap seçilsin mi? Seçmediğiniz eski hesap arşive “çıkış yapıldı” olarak düşer.`)) connect(c, true); }} icon={<RefreshCw className="w-4 h-4" />}>Hesap değiştir</Button>}
              {c.key === 'telegram' && connected && admin && <Button variant="subtle" loading={busy === 'tg'} onClick={testTelegram} icon={<Send className="w-4 h-4" />}>Test mesajı</Button>}
              {appUrl(c.key) && <Button variant="subtle" onClick={() => openApp(c.key)} icon={<Smartphone className="w-4 h-4" />}>Uygulamayı aç</Button>}
              <Button variant="subtle" onClick={() => setDetail(c.key)} icon={<LayoutGrid className="w-4 h-4" />}>Botlar & geçmiş</Button>
              {admin && acc.map((a) => (
                <Button key={a.id} variant="ghost" loading={busy === a.id} className="!text-rose-700" icon={<Unplug className="w-4 h-4" />}
                  onClick={() => { if (window.confirm(`${a.external_account_name ?? c.name} hesabından çıkış yapılsın mı? Botlar bu hesabı kullanamaz.`)) disconnect(a.id); }}>Çıkış yap{acc.length > 1 ? ` (${a.external_account_name})` : ''}</Button>
              ))}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Uygulamalar</h2>
          <p className="text-xs text-ink-400">Bir kez bağlarsınız, botlar kendisi kullanır.</p>
        </div>
        <Button variant="ghost" onClick={() => { q.reload(); scopes.reload(); }} icon={q.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}>Yenile</Button>
      </div>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice>}

      {q.loading && !data ? <StateView kind="loading" /> : (
        <>
          <div className={cx('rounded-2xl px-4 py-3 text-[13px] font-semibold flex items-center gap-2', okCount === main.length ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>
            {okCount === main.length ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {okCount === main.length ? 'Kullandığımız tüm uygulamalar bağlı ve çalışıyor.' : `${main.length - okCount} uygulamada yapılacak bir şey var — sarı çerçeveli satıra bakın.`}
          </div>
          <ul className="space-y-2">{main.map((c) => <Row key={c.key} c={c} />)}</ul>

          {others.length > 0 && (
            <details className="group rounded-2xl ring-1 ring-ink-700/60 bg-white/60">
              <summary className="cursor-pointer list-none flex items-center gap-2 px-4 py-3 text-[13px] font-semibold text-ink-200">
                <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />Diğer uygulamalar (isteğe bağlı)
                <span className="ml-auto text-[11px] font-normal text-ink-400">{others.filter((c) => c.status === 'connected').length}/{others.length} bağlı</span>
              </summary>
              <ul className="space-y-1.5 px-3 pb-3">{others.map((c) => <Row key={c.key} c={c} small />)}</ul>
            </details>
          )}

          {admin && (
            <details className="group rounded-2xl ring-1 ring-ink-700/60 bg-white/60">
              <summary className="cursor-pointer list-none flex items-center gap-2 px-4 py-3 text-[13px] font-semibold text-ink-200">
                <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />Gelişmiş: giriş bilgileri, geliştirici ayarları, bağlantı geçmişi
              </summary>
              <div className="space-y-3 px-3 pb-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="subtle" onClick={() => go('system', null, { tab: 'credentials' })} icon={<KeyRound className="w-4 h-4" />}>Giriş bilgileri</Button>
                  <Button variant="subtle" onClick={() => go('system', null, { tab: 'keys' })} icon={<KeyRound className="w-4 h-4" />}>Kayıtlı anahtarlar</Button>
                </div>
                {data?.redirect_uri && <DeveloperSetupValues redirectUri={data.redirect_uri} />}
                <ConnectionArchive />
              </div>
            </details>
          )}
        </>
      )}
      {detail && data && (() => { const c = data.connectors.find((x) => x.key === detail)!; return (
        <AppDetail c={c} allBots={bots.data} onClose={() => setDetail(null)} busy={busy === c.key}
          canConnect={c.authType === 'oauth' && c.implemented && Boolean(OAUTH_PROVIDER[c.key]) && admin} onConnect={() => connect(c)} />); })()}
    </div>
  );
}
