// Bağlantı & Sistem: (1) Sistem kontrolü — motorlar, AI, depo ve uygulamalar gerçekten çalışıyor mu?
// (2) Giriş bilgileri — uygulamaların (Meta, Google/YouTube, WhatsApp, e-posta…) anahtarları bir kez girilir, Vault'ta şifreli saklanır.
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, KeyRound, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime, relTime } from '../lib/format';
import type { OpsStatus } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, ErrorState, Notice, Panel, Pill, StateView, Tabs } from '../ui';

interface Check { key: string; group: string; label: string; state: 'ok' | 'warn' | 'fail'; detail: string; fix?: string }
interface CheckResult { checked_at: string; summary: { ok: number; warn: number; fail: number }; checks: Check[]; redirect_uri: string }

interface CredField { name: string; label: string; secret: boolean; placeholder?: string }
interface CredGroup { id: string; title: string; apps: string; why: string; fields: CredField[]; steps: string[]; link: { href: string; label: string }; redirect?: boolean }
const GROUPS: CredGroup[] = [
  { id: 'meta', title: 'Meta (Instagram + Facebook)', apps: 'Instagram gönderi/Reels/hikâye, Facebook sayfası', why: 'Botların resmi Meta API ile paylaşım yapabilmesi için.',
    fields: [{ name: 'META_APP_ID', label: 'Uygulama kimliği (App ID)', secret: false, placeholder: '1234567890' }, { name: 'META_APP_SECRET', label: 'Uygulama gizli anahtarı (App Secret)', secret: true }],
    steps: ['developers.facebook.com → “Uygulama oluştur” → tür: İşletme.', 'Ürün ekle: “Facebook Girişi (İşletme)” ve “Instagram Graph API”.', 'Ayarlar → Temel: App ID ve App Secret’ı buraya yapıştırın.', 'Facebook Girişi → Ayarlar → “Geçerli OAuth yönlendirme URI’leri” alanına aşağıdaki adresi ekleyin.', 'Instagram hesabı İşletme/İçerik üreticisi olmalı ve Facebook sayfasına bağlı olmalı.'],
    link: { href: 'https://developers.facebook.com/apps/', label: 'Meta geliştirici paneli' }, redirect: true },
  { id: 'google', title: 'Google (YouTube)', apps: 'YouTube Shorts / video yükleme', why: 'Videoların resmi YouTube Data API ile yüklenmesi için. Dikkat: Gemini API anahtarı burada GEÇMEZ; burası Google Cloud’daki “OAuth istemci kimliği”dir.',
    fields: [{ name: 'GOOGLE_CLIENT_ID', label: 'OAuth istemci kimliği', secret: false, placeholder: '…apps.googleusercontent.com' }, { name: 'GOOGLE_CLIENT_SECRET', label: 'OAuth istemci gizli anahtarı', secret: true }],
    steps: ['console.cloud.google.com → yeni proje.', 'API’ler → “YouTube Data API v3” etkinleştir.', 'OAuth izin ekranı → Harici → kendi Gmail adresinizi test kullanıcısı olarak ekleyin.', 'Kimlik bilgileri → OAuth istemci kimliği → Web uygulaması → yönlendirme URI’si olarak aşağıdaki adresi ekleyin.', 'İstemci kimliği ve gizli anahtarı buraya yapıştırın.'],
    link: { href: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud kimlik bilgileri' }, redirect: true },
  { id: 'whatsapp', title: 'WhatsApp Business (Cloud API)', apps: 'Onaylı mesajların otomatik gönderimi', why: 'Tanımlanmazsa “WhatsApp’ta aç” butonu ile tek dokunuşla sizin WhatsApp’ınızdan gönderilir.',
    fields: [{ name: 'WHATSAPP_TOKEN', label: 'Kalıcı erişim anahtarı', secret: true }, { name: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Telefon numarası kimliği', secret: false }],
    steps: ['Meta uygulamanıza “WhatsApp” ürününü ekleyin.', 'WhatsApp → API kurulumu: Telefon numarası kimliğini kopyalayın.', 'İşletme ayarları → Sistem kullanıcıları → kalıcı anahtar oluşturun (whatsapp_business_messaging izni).'],
    link: { href: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started', label: 'WhatsApp Cloud API kurulumu' } },
  { id: 'email', title: 'E-posta (Resend)', apps: 'Rapor ve teklif e-postaları', why: 'Onaylanan e-postaların sizin alan adınızdan gönderilmesi için.',
    fields: [{ name: 'RESEND_API_KEY', label: 'Resend API anahtarı', secret: true, placeholder: 're_…' }, { name: 'EMAIL_FROM', label: 'Gönderen adres', secret: false, placeholder: 'Embay <info@alanadiniz.com>' }],
    steps: ['resend.com → hesap açın → alan adınızı doğrulayın.', 'API Keys → yeni anahtar → buraya yapıştırın.'], link: { href: 'https://resend.com/api-keys', label: 'Resend API anahtarları' } },
  { id: 'telegram', title: 'Telegram (yönetici bildirimi)', apps: 'Gün sonu raporu ve uyarılar telefonunuza', why: 'Botların size anlık bildirim göndermesi için.',
    fields: [{ name: 'TELEGRAM_BOT_TOKEN', label: 'Bot anahtarı', secret: true }, { name: 'TELEGRAM_CHAT_ID', label: 'Sohbet kimliği', secret: false }],
    steps: ['Telegram’da @BotFather → /newbot → verilen anahtarı yapıştırın.', 'Botunuza bir mesaj atın; @userinfobot ile kendi sohbet kimliğinizi öğrenin.'], link: { href: 'https://t.me/BotFather', label: '@BotFather' } },
  { id: 'canva', title: 'Canva', apps: 'Tasarımları Canva’da açma / içe alma', why: 'Opsiyonel.',
    fields: [{ name: 'CANVA_CLIENT_ID', label: 'Client ID', secret: false }, { name: 'CANVA_CLIENT_SECRET', label: 'Client secret', secret: true }],
    steps: ['canva.com/developers → Integration oluştur → yönlendirme adresi olarak aşağıdaki adresi ekleyin.'], link: { href: 'https://www.canva.com/developers/integrations', label: 'Canva geliştirici' }, redirect: true },
];

function StateIcon({ s }: { s: Check['state'] }) {
  return s === 'ok' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : s === 'warn' ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
}

function SystemCheckPanel() {
  const { go } = useRouter();
  const q = useQuery<CheckResult | null>(() => callOps<CheckResult>('system_check'), null, []);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const groups = q.data ? [...new Set(q.data.checks.map((c) => c.group))] : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {q.data && <>
          <Pill tone="go">{q.data.summary.ok} ÇALIŞIYOR</Pill>
          {q.data.summary.warn > 0 && <Pill tone="wait">{q.data.summary.warn} EKSİK</Pill>}
          {q.data.summary.fail > 0 && <Pill tone="stop">{q.data.summary.fail} HATA</Pill>}
          <span className="text-[11px] text-ink-500">{relTime(q.data.checked_at)} kontrol edildi</span>
        </>}
        <div className="flex-1" />
        <Button variant="ghost" loading={q.loading} onClick={q.reload} icon={<RefreshCw className="w-4 h-4" />}>Yeniden kontrol et</Button>
      </div>
      {q.loading && !q.data ? <StateView kind="loading" title="Sistem kontrol ediliyor…" message="Motorlar, AI anahtarı (canlı doğrulama), depo ve uygulama bağlantıları test ediliyor." compact /> : groups.map((g) => (
        <Panel key={g} title={g}>
          <ul className="divide-y divide-ink-800">
            {q.data!.checks.filter((c) => c.group === g).map((c) => (
              <li key={c.key} className="py-2.5 flex items-start gap-2.5">
                <StateIcon s={c.state} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-100">{c.label}</div>
                  <div className="text-xs text-ink-400">{c.detail}</div>
                </div>
                {c.fix && <button type="button" className="text-[11px] font-semibold text-brand-green underline shrink-0"
                  onClick={() => (c.fix!.startsWith('Ayarlar') ? go('settings', null, { tab: 'ai' }) : c.fix!.includes('Giriş bilgileri') ? go('system', null, { tab: 'credentials' }) : c.fix!.startsWith('Bot') ? go('bots') : go('connections'))}>{c.fix}</button>}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

function CredentialsPanel() {
  const session = useSession();
  const admin = session.role === 'admin';
  const saved = useQuery(async () => unwrap(await db().from('app_credentials').select('name,last4,updated_at')) as Array<{ name: string; last4: string; updated_at: string }>, [], [], ['app_credentials']);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const missing = new Set(status.data?.connectors.flatMap((c) => c.missing_env) ?? []);
  const redirect = status.data?.redirect_uri ?? '';

  const saveGroup = async (g: CredGroup) => {
    setBusy(g.id); setMsg(null);
    try {
      const entries = g.fields.filter((f) => (vals[f.name] ?? '').trim());
      if (!entries.length) throw new Error('Kaydedilecek değer yok');
      for (const f of entries) unwrap(await db().rpc('set_app_credential', { p_name: f.name, p_value: vals[f.name].trim() }));
      await callOps('reload_secrets');
      setVals((v) => { const n = { ...v }; entries.forEach((f) => delete n[f.name]); return n; });
      setMsg({ tone: 'ok', text: `${g.title}: ${entries.length} bilgi şifreli olarak kaydedildi. Artık Uygulamalar sekmesinden “Bağla” diyebilirsiniz.` });
      saved.reload(); status.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const clear = async (name: string) => {
    setBusy(name); setMsg(null);
    try { unwrap(await db().rpc('clear_app_credential', { p_name: name })); await callOps('reload_secrets'); saved.reload(); status.reload(); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <Notice tone="info">
        <span className="inline-flex items-start gap-1.5"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /><span>Her uygulama için bilgileri <b>bir kez</b> girersiniz; Supabase Vault’ta şifreli saklanır, tarayıcıya geri gönderilmez. Sonra Uygulamalar sekmesinden hesabınızla bir kez giriş yaparsınız (resmi OAuth); oturum yenilemesini sistem kendisi yapar. Şifreniz programda tutulmaz.</span></span>
      </Notice>
      {redirect && (
        <div className="rounded-xl ring-1 ring-ink-700 bg-ink-900/60 p-3">
          <div className="text-[10px] font-mono text-ink-500">YÖNLENDİRME (REDIRECT) ADRESİ — Meta, Google ve Canva ayarlarına eklenecek</div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-ink-100 break-all flex-1">{redirect}</code>
            <Button variant="ghost" icon={<Copy className="w-4 h-4" />} onClick={() => { navigator.clipboard?.writeText(redirect); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Kopyalandı' : 'Kopyala'}</Button>
          </div>
        </div>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!admin && <Notice tone="warn">Giriş bilgilerini yalnızca yönetici girebilir.</Notice>}
      {GROUPS.map((g) => {
        const rows = g.fields.map((f) => ({ f, row: saved.data.find((r) => r.name === f.name), inEnv: !saved.data.some((r) => r.name === f.name) && status.data != null && !missing.has(f.name) }));
        const complete = rows.every((r) => r.row || r.inEnv);
        return (
          <Panel key={g.id} title={<span className="inline-flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand-green" />{g.title}</span>}
            action={<Pill tone={complete ? 'go' : 'wait'}>{complete ? 'TAMAM' : 'EKSİK'}</Pill>}>
            <div className="space-y-3">
              <div className="text-xs text-ink-400"><b className="text-ink-200">{g.apps}.</b> {g.why}</div>
              <details className="rounded-xl bg-ink-900/50 ring-1 ring-ink-800 px-3 py-2">
                <summary className="text-xs font-semibold text-ink-200 cursor-pointer">Nereden alınır? ({g.steps.length} adım)</summary>
                <ol className="list-decimal pl-5 mt-2 space-y-1 text-xs text-ink-300">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <a href={g.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-green underline"><ExternalLink className="w-3.5 h-3.5" />{g.link.label}</a>
                {g.redirect && redirect && <div className="text-[11px] text-ink-400 mt-1">Yönlendirme adresi: <code className="break-all">{redirect}</code></div>}
              </details>
              {rows.map(({ f, row, inEnv }) => (
                <div key={f.name}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-ink-200" htmlFor={f.name}>{f.label}</label>
                    <span className="text-[10px] font-mono text-ink-500">
                      {row ? <>kayıtlı …{row.last4} · {fmtDateTime(row.updated_at)}</> : inEnv ? 'Supabase ayarlarında tanımlı' : 'tanımlı değil'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <input id={f.name} className="ops-input font-mono text-xs" type={f.secret ? 'password' : 'text'} autoComplete="off" disabled={!admin}
                      placeholder={row ? 'Değiştirmek için yeni değeri yapıştırın' : f.placeholder ?? 'Yapıştırın'} value={vals[f.name] ?? ''} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
                    {row && admin && <Button variant="ghost" loading={busy === f.name} onClick={() => clear(f.name)} icon={<Trash2 className="w-4 h-4" />} aria-label="Kaldır" />}
                  </div>
                </div>
              ))}
              {admin && <div className="flex justify-end"><Button variant="primary" loading={busy === g.id} disabled={!g.fields.some((f) => (vals[f.name] ?? '').trim())} onClick={() => saveGroup(g)}>Kaydet</Button></div>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export function SystemScreen() {
  const { state, go } = useRouter();
  const tab = (state.params.get('tab') === 'credentials' ? 'credentials' : 'check') as 'check' | 'credentials';
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-100">Bağlantı & Sistem Kontrolü</h1>
        <p className="text-sm text-ink-400">Botlar, yapay zekâ ve uygulama bağlantıları gerçekten çalışıyor mu — tek ekranda. Uygulama giriş bilgileri burada bir kez girilir ve kalıcı saklanır.</p>
      </div>
      <Tabs value={tab} onChange={(t) => go('system', null, t === 'credentials' ? { tab: 'credentials' } : {})}
        items={[{ id: 'check', label: 'Sistem kontrolü' }, { id: 'credentials', label: 'Giriş bilgileri' }]} className={cx('')} />
      {tab === 'check' ? <SystemCheckPanel /> : <CredentialsPanel />}
    </div>
  );
}
