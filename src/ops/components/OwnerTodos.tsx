// "SİZİN YAPACAKLARINIZ": botun yapamadığı (Meta kuralı / ödeme / kişisel hesap) ama takipçi ve müşteri getiren işler.
// İlk iki madde gerçek veriden otomatik işaretlenir; diğerleri yöneticinin işaretlediği kontrol listesi (owner_checklist).
import { useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, ExternalLink, ListChecks } from 'lucide-react';
import { db, useQuery } from '../lib/hooks';
import { dayKey } from '../lib/format';
import { useRouter, useSession } from '../session';
import { cx } from '../ui';

interface Todo { key: string; title: string; why: string; steps?: string[]; link?: { label: string; href?: string; route?: Parameters<ReturnType<typeof useRouter>['go']>[0] }; auto?: boolean }

const MANUAL: Todo[] = [
  { key: 'ads_account', title: 'Reklam ödemesini hazırlayın (500 TL)', why: 'Öne Çıkar için Instagram’ın profesyonel hesap + Facebook sayfası bağlantısı ve kart gerekir. Ödeme sizde kalmalı.',
    steps: ['Instagram → Profil → ☰ → Reklam araçları (veya business.facebook.com)', 'Para birimi TL, saat dilimi İstanbul', 'Ödeme yöntemi (kart) ekleyin', 'Toplam bütçe: 500 TL (300 takipçi + 200 mesaj)'], link: { label: 'Meta İşletme Paketi', href: 'https://business.facebook.com/' } },
  { key: 'ads_campaign', title: '1. reklam (takipçi): 13 Önce·Sonra Reels’i öne çıkar — 6 gün × 50 TL = 300 TL', why: 'Instagram uygulamasından “Öne Çıkar” ile; hedef profil ziyareti. Gönderi 4 Ekim 20:00’de yayınlanınca 5 Ekim sabahı başlatın.',
    steps: ['Instagram’da 13 · Önce·Sonra Reels’ini açın → “Öne Çıkar”', 'Hedef: “Daha fazla profil ziyareti”', 'Kitle: “Kendin oluştur” → Konum: Çatalca + 60 km (Silivri, Büyükçekmece, Arnavutköy, Tekirdağ dahil) · Yaş 30–60 · İlgi: Ev, Gayrimenkul, İç tasarım, Yapı/İnşaat', 'Bütçe: günlük 50 TL · Süre: 6 gün', 'Müzik yüzünden reddedilirse bana yazın; müziksiz/telifsiz sürümünü hazırlarım'] },
  { key: 'ads_messages', title: '2. reklam (müşteri): mesaj reklamı — 4 gün × 50 TL = 200 TL', why: 'Fiyat isteyenler doğrudan DM/WhatsApp’tan yazar. 1. reklam bittikten sonra (11 Ekim) başlatın; gelen her mesaja aynı gün dönün.',
    steps: ['Önce·Sonra kaydırmalı gönderisini (5 Ekim 16:30) açın → “Öne Çıkar”', 'Hedef: “Daha fazla mesaj” (Instagram Direct veya WhatsApp)', 'Aynı kitle', 'Hazır karşılama: “Merhaba! Arsanızın yeri ve düşündüğünüz m² nedir? Ücretsiz ön teklif hazırlayalım.”', 'Bütçe: günlük 50 TL · Süre: 4 gün'] },
  { key: 'ads_day7', title: '3. gün ve sonunda kontrol: sonuçları bana yazın', why: 'Öne Çıkar ekranındaki “Profil ziyareti”, “Takip” ve “Mesaj” sayılarını ve harcanan tutarı yazın. Kişi başı maliyete bakıp devam / değişiklik kararını birlikte veririz.' },
  { key: 'collab', title: 'Bir ev sahibi veya mimarla ortak (Collab) gönderi', why: 'Gönderi onların takipçilerine de görünür — en ucuz büyüme yolu.',
    steps: ['Reels’i paylaşırken “Kişileri etiketle → Ortak çalışan davet et”', 'Bitmiş evin sahibi veya projenin mimarı kabul edince iki hesapta birden yayınlanır'] },
  { key: 'fb_invite', title: 'Facebook: gönderiyi beğenenleri sayfaya davet edin (haftada 1)', why: 'Sayfada 12 takipçi var; beğenen ama takip etmeyenleri tek tıkla davet edebilirsiniz.',
    steps: ['Facebook sayfası → bir gönderinin beğenileri', 'Kişilerin yanındaki “Davet et” düğmesi'] },
];

export function OwnerTodos() {
  const { go } = useRouter();
  const session = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery(async () => {
    const today = `${dayKey(new Date())}T00:00:00+03:00`;
    const [inbox, radar, check, models] = await Promise.all([
      db().from('social_inbox').select('reply_source').eq('replied', false).like('reply_source', 'kuyruk%').limit(200),
      db().from('audience_radar').select('id', { count: 'exact', head: true }).gte('done_at', today),
      db().from('owner_checklist').select('key,done_at'),
      db().from('showroom_models').select('id', { count: 'exact', head: true }).eq('status', 'draft').is('archived_at', null),
    ]);
    const perm = (inbox.data ?? []).filter((r: { reply_source: string | null }) => /permission|izni|izin/i.test(r.reply_source ?? '')).length;
    return { perm, radarDone: radar.count ?? 0, modelDrafts: models.count ?? 0, done: new Map(((check.data ?? []) as Array<{ key: string; done_at: string | null }>).map((r) => [r.key, r.done_at])) };
  }, { perm: 0, radarDone: 0, modelDrafts: 0, done: new Map<string, string | null>() }, [], ['owner_checklist', 'audience_radar', 'social_inbox']);
  const d = q.data;
  const toggle = async (key: string) => {
    const was = d.done.get(key);
    await db().from('owner_checklist').upsert({ key, done_at: was ? null : new Date().toISOString(), done_by: session.userId, updated_at: new Date().toISOString() });
    q.reload();
  };
  const auto: Array<Todo & { ok: boolean; badge?: string }> = [
    { key: 'fb', auto: true, ok: d.perm === 0, title: d.perm ? `Facebook’u yeniden bağlayın — ${d.perm} yorum cevabı bekliyor` : 'Facebook / Instagram izinleri tamam',
      why: 'Yorum cevapları, gönderi erişimi ve istatistikler bu izinle çalışır.', steps: ['Uygulamalar → Facebook → Yeniden bağla', 'Açılan Meta ekranında TÜM izinleri onaylayın (yorumlar, istatistikler, mesajlar)'], link: { label: 'Uygulamalar', route: 'connections' } },
    { key: 'radar', auto: true, ok: d.radarDone >= 5, badge: `${Math.min(5, d.radarDone)}/5`, title: 'Bugünün 5 etkileşim kartı (5 dakika)',
      why: 'Ev yaptıran gerçek kişilerin gönderisine hazır yorumu bırakın; profilinize gelenler takipçi ve müşteri olur. Sabah 09:00’da Telegram’a da gelir.', link: { label: 'Büyüme Merkezi', route: 'growth' } },
    { key: 'showroom', auto: true, ok: d.modelDrafts === 0, title: d.modelDrafts ? `${d.modelDrafts} ev modeli onayınızı bekliyor — sitede görünmüyor` : 'Ev vitrininde onay bekleyen model yok',
      why: 'Editör Bot model yazısını hazırladı; siz okuyup yayınlayana kadar /evler sayfasında görünmez. Fiyat eklemek isteğe bağlıdır.', link: { label: 'Ev Vitrini', route: 'showroom' } },
  ];
  const items: Array<Todo & { ok: boolean; badge?: string }> = [...auto, ...MANUAL.map((m) => ({ ...m, ok: Boolean(d.done.get(m.key)) }))];
  const left = items.filter((i) => !i.ok).length;
  return (
    <section className="ops-panel p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-5 h-5 text-[#1E3FA0]" />
        <h3 className="font-display text-base font-semibold text-ink-100">Sizin yapacaklarınız</h3>
        <span className={cx('ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold', left ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{left ? `${left} iş` : 'hepsi tamam'}</span>
      </div>
      <p className="text-[12px] text-ink-400 mb-3">Botun yapamadığı (Meta kuralı, ödeme, kişisel hesap) ama takipçi ve müşteri getiren işler.</p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key} className={cx('rounded-xl ring-1 ring-ink-700/60', it.ok ? 'bg-emerald-50/50' : 'bg-white')}>
            <div className="flex items-center gap-2 px-3 py-2">
              {it.auto ? (it.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <Circle className="w-5 h-5 text-amber-500 shrink-0" />)
                : <button type="button" onClick={() => toggle(it.key)} title={it.ok ? 'Geri al' : 'Yaptım'}>{it.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-ink-400 hover:text-[#1E3FA0]" />}</button>}
              <button type="button" onClick={() => setOpen(open === it.key ? null : it.key)} className={cx('flex-1 text-left text-[13px] font-medium', it.ok ? 'text-ink-400 line-through' : 'text-ink-100')}>{it.title}</button>
              {it.badge && <span className="text-[11px] font-mono text-ink-400">{it.badge}</span>}
              <ChevronDown className={cx('w-4 h-4 text-ink-400 transition', open === it.key && 'rotate-180')} />
            </div>
            {open === it.key && (
              <div className="px-10 pb-3 text-[12px] text-ink-300 space-y-1.5">
                <p>{it.why}</p>
                {it.steps && <ol className="list-decimal pl-4 space-y-0.5">{it.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
                {it.link && (it.link.href
                  ? <a href={it.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1E3FA0] font-semibold"><ExternalLink className="w-3.5 h-3.5" />{it.link.label}</a>
                  : <button type="button" onClick={() => it.link?.route && go(it.link.route)} className="text-[#1E3FA0] font-semibold">{it.link.label} →</button>)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
