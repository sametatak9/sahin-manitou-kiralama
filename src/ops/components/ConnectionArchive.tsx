import { useState } from 'react';
import { Archive, Check, Copy, History, Wrench } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import { Panel, Pill, StateView } from '../ui';

interface AccountRow { id: string; platform: string; connector_key: string | null; account_name: string | null; external_account_name: string | null; handle: string | null; profile_url: string | null; connection_status: string | null; last_verified_at: string | null; created_at: string; updated_at: string }
interface AuditRow { id: number; at: string; action: string; entity_type: string; summary: string | null }

const ACTION: Record<string, string> = { connect: 'Bağlandı', disconnect: 'Çıkış yapıldı', connect_failed: 'Bağlantı hatası', set_app_credential: 'Giriş bilgisi kaydedildi', clear_app_credential: 'Giriş bilgisi silindi' };

function CopyRow({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="rounded-lg bg-ink-950 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <code className="text-[12px] text-ink-100 break-all">{value}</code>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => undefined); }}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg ring-1 ring-ink-700 bg-white px-2 py-1 text-[11px] font-semibold text-ink-200">
          {ok ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{ok ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </div>
  );
}

/** Meta / Google / Canva geliştirici ayarlarına aynen yazılması gereken değerler. "URL Yüklenemedi" hatasının çözümü. */
export function DeveloperSetupValues({ redirectUri }: { redirectUri: string }) {
  const host = (() => { try { return new URL(redirectUri).hostname; } catch { return ''; } })();
  const panel = 'https://embay-panel.vercel.app';
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Wrench className="w-4 h-4" />Uygulama ayarlarına yazılacak adresler</span>}>
      <p className="text-xs text-ink-400 mb-3">Facebook’ta <b>“URL Yüklenemedi — bu bağlantının domaini uygulamanın domainlerinde yer almıyor”</b> hatası, bu adreslerin geliştirici hesabındaki uygulama ayarlarına girilmemesinden kaynaklanır. Aşağıdakileri kopyalayıp ilgili alanlara yapıştırın, kaydedin ve “Hesabımla bağla”ya tekrar dokunun.</p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-ink-100">Meta (Instagram + Facebook) — developers.facebook.com</div>
          <CopyRow label="Uygulama Ayarları → Temel → Uygulama Alan Adları" value={host} />
          <CopyRow label="Temel → + Platform ekle → Web sitesi → Site URL’si" value={panel} />
          <CopyRow label="Facebook Girişi → Ayarlar → Geçerli OAuth Yönlendirme URI’leri" value={redirectUri} />
          <p className="text-[11px] text-ink-400">Facebook Girişi ürünü ekli değilse: Panel → Ürün ekle → “Facebook Girişi” → Kur. “İstemci OAuth girişi” ve “Web OAuth girişi” açık olmalı.</p>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-ink-100">Google (YouTube) — console.cloud.google.com</div>
          <CopyRow label="API’ler → Kimlik bilgileri → OAuth istemcisi → Yetkili yönlendirme URI’leri" value={redirectUri} />
          <CopyRow label="Yetkili JavaScript kaynakları" value={panel} />
          <p className="text-[11px] text-ink-400">“YouTube Data API v3” etkin olmalı; izin ekranı “Test” modundaysa kanal sahibinin e-postası test kullanıcısı olarak eklenmeli.</p>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-ink-100">Canva — canva.com/developers</div>
          <CopyRow label="Authentication → Authorized redirects" value={redirectUri} />
        </div>
      </div>
    </Panel>
  );
}

/** Bağlanmış ve çıkış yapılmış tüm hesaplar + giriş bilgisi/bağlantı geçmişi. Gizli anahtar/token gösterilmez. */
export function ConnectionArchive() {
  const acc = useQuery(async () => unwrap(await db().from('social_accounts')
    .select('id,platform,connector_key,account_name,external_account_name,handle,profile_url,connection_status,last_verified_at,created_at,updated_at')
    .not('connector_key', 'is', null).order('updated_at', { ascending: false }).limit(100)) as AccountRow[], [] as AccountRow[], []);
  const log = useQuery(async () => unwrap(await db().from('audit_log').select('id,at,action,entity_type,summary')
    .in('action', Object.keys(ACTION)).order('at', { ascending: false }).limit(50)) as AuditRow[], [] as AuditRow[], []);
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Archive className="w-4 h-4" />Bağlantı arşivi</span>}>
      <p className="text-xs text-ink-400 mb-3">Bugüne kadar bağlanan hesaplar ve girilen uygulama bilgileri burada listelenir. Güvenlik gereği şifre, gizli anahtar ve token değerleri gösterilmez; yalnızca ne zaman kaydedildiği görünür.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-ink-100 mb-2">Hesaplar</div>
          {acc.loading && !acc.data.length ? <StateView kind="loading" compact /> : acc.error ? <StateView kind="error" title="Hesaplar okunamadı" compact /> : !acc.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Henüz bağlanmış bir hesap yok." compact /> : (
            <ul className="space-y-1.5">
              {acc.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px]">
                  <span className="min-w-0 truncate text-ink-200"><b>{a.connector_key}</b> · {a.external_account_name ?? a.account_name ?? a.handle ?? '—'}
                    <span className="text-ink-500"> · ilk: {fmtDateTime(a.created_at)} · son: {fmtDateTime(a.last_verified_at ?? a.updated_at)}</span></span>
                  <Pill tone={a.connection_status === 'connected' ? 'go' : 'idle'}>{a.connection_status === 'connected' ? 'Bağlı' : 'Çıkış yapıldı'}</Pill>
                </li>
              ))}
            </ul>)}
        </div>
        <div>
          <div className="text-xs font-semibold text-ink-100 mb-2 inline-flex items-center gap-1"><History className="w-3.5 h-3.5" />Geçmiş</div>
          {log.loading && !log.data.length ? <StateView kind="loading" compact /> : log.error ? <StateView kind="error" title="Geçmiş okunamadı" compact /> : !log.data.length ? <StateView kind="empty" title="Veri bulunamadı" compact /> : (
            <ul className="space-y-1.5">
              {log.data.map((l) => (
                <li key={l.id} className="rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px]">
                  <span className={l.action === 'connect_failed' ? 'text-rose-700 font-semibold' : 'text-ink-100 font-semibold'}>{ACTION[l.action] ?? l.action}</span>
                  <span className="text-ink-500"> · {fmtDateTime(l.at)}</span>
                  {l.summary && <div className="text-ink-300 break-words">{l.summary}</div>}
                </li>
              ))}
            </ul>)}
        </div>
      </div>
    </Panel>
  );
}
