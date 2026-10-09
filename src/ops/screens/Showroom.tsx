// EV VİTRİNİ (Showroom): sitedeki /evler sayfasında sergilenen ev / villa modelleri. Yalnızca ekip ekler ve düzenler.
// Fiyat, m², oda dağılımı boş bırakılırsa sitede o alan hiç gösterilmez (uydurma yok). Silme yok: arşivlenir.
import { useMemo, useState } from 'react';
import { Archive, Eye, ExternalLink, ImagePlus, PenLine, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { useClient } from '../client';
import { Button, cx, Field, Modal, Notice, Pill, StateView } from '../ui';

interface Room { label: string; count?: number | null; m2?: number | null }
interface Model {
  id: string; slug: string; code: string | null; title: string; subtitle: string | null; system: string; floors: number | null; area_m2: number | null;
  rooms: string | null; room_breakdown: Room[]; price: number | null; price_note: string | null; delivery: string; delivery_days: number | null;
  location: string | null; is_real_project: boolean; includes: string[]; excludes: string[]; description: string | null; cover_url: string | null;
  gallery: string[]; plan_url: string | null; video_url: string | null; featured: boolean; sort: number; status: 'draft' | 'published' | 'archived'; updated_at: string;
  ai_note: string | null; ai_written_at: string | null; announced_at: string | null; social_caption: string | null;
}
interface SitePost {
  id: string; slug: string; kind: string; title: string; excerpt: string | null; body: string | null; cover_url: string | null;
  status: 'draft' | 'published' | 'archived'; district: string | null; seo_title: string | null; seo_description: string | null;
  created_at: string; published_at: string | null;
}
interface Media { id: string; url: string; title: string | null }

const SITE = 'https://embayyapi.vercel.app';
const SYSTEMS: Array<[string, string]> = [['celik', 'Çelik yapı'], ['hafif_celik', 'Hafif çelik'], ['betonarme', 'Betonarme'], ['prefabrik', 'Prefabrik'], ['diger', 'Diğer']];
const DELIVERIES: Array<[string, string]> = [['anahtar_teslim', 'Anahtar teslim'], ['ileri_kaba', 'İleri kaba'], ['kaba', 'Kaba inşaat']];
const slugify = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/²/g, '2').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const num = (s: string) => { const n = Number(String(s).replace(/\./g, '').replace(',', '.')); return s.trim() && Number.isFinite(n) && n > 0 ? n : null; };

interface Form {
  title: string; code: string; subtitle: string; system: string; floors: string; area: string; rooms: string; price: string; price_note: string; delivery: string; days: string;
  location: string; real: boolean; featured: boolean; sort: string; description: string; includes: string; excludes: string; breakdown: Room[];
  cover: string; gallery: string[]; plan: string; video: string;
}
const EMPTY: Form = { title: '', code: '', subtitle: '', system: 'celik', floors: '1', area: '', rooms: '', price: '', price_note: '', delivery: 'anahtar_teslim', days: '', location: '', real: false, featured: false,
  sort: '100', description: '', includes: '', excludes: '', breakdown: [], cover: '', gallery: [], plan: '', video: '' };
const toForm = (m: Model): Form => ({ title: m.title, code: m.code ?? '', subtitle: m.subtitle ?? '', system: m.system, floors: m.floors ? String(m.floors) : '', area: m.area_m2 ? String(m.area_m2) : '',
  rooms: m.rooms ?? '', price: m.price ? String(m.price) : '', price_note: m.price_note ?? '', delivery: m.delivery, days: m.delivery_days ? String(m.delivery_days) : '', location: m.location ?? '',
  real: m.is_real_project, featured: m.featured, sort: String(m.sort), description: m.description ?? '', includes: m.includes.join('\n'), excludes: m.excludes.join('\n'),
  breakdown: m.room_breakdown ?? [], cover: m.cover_url ?? '', gallery: m.gallery ?? [], plan: m.plan_url ?? '', video: m.video_url ?? '' });

export function ShowroomScreen() {
  const { client } = useClient();
  const q = useQuery(async () => unwrap(await db().from('showroom_models').select('*').order('status').order('sort').order('created_at', { ascending: false })) as Model[], [] as Model[], [], ['showroom_models']);
  const posts = useQuery(async () => unwrap(await db().from('site_posts').select('id,slug,kind,title,excerpt,body,cover_url,status,district,seo_title,seo_description,created_at,published_at').order('created_at', { ascending: false }).limit(50)) as SitePost[], [] as SitePost[], [], ['site_posts']);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [edit, setEdit] = useState<Model | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [picker, setPicker] = useState<null | 'cover' | 'gallery' | 'plan'>(null);
  const list = useMemo(() => q.data.filter((m) => (tab === 'archived' ? m.status === 'archived' : m.status !== 'archived')), [q.data, tab]);

  const open = (m: Model | 'new') => { setMsg(null); setEdit(m); setForm(m === 'new' ? EMPTY : toForm(m)); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (status?: Model['status']) => {
    if (form.title.trim().length < 3) { setMsg({ tone: 'error', text: 'Başlık gerekli (ör. "120 m² Tek Katlı Villa").' }); return; }
    const target = status ?? (edit !== 'new' && edit ? edit.status : 'draft');
    if (target === 'published' && !form.cover && !form.gallery.length) { setMsg({ tone: 'error', text: 'Yayınlamak için en az bir fotoğraf seçin.' }); return; }
    setBusy(true); setMsg(null);
    const row = {
      title: form.title.trim(), code: form.code.trim() || null, subtitle: form.subtitle.trim() || null, system: form.system, floors: num(form.floors), area_m2: num(form.area),
      rooms: form.rooms.trim() || null, room_breakdown: form.breakdown.filter((r) => r.label.trim()).map((r) => ({ label: r.label.trim(), count: r.count || null, m2: r.m2 || null })),
      price: num(form.price), price_note: form.price_note.trim() || null, delivery: form.delivery, delivery_days: num(form.days), location: form.location.trim() || null,
      is_real_project: form.real, featured: form.featured, sort: Number(form.sort) || 100, description: form.description.trim() || null,
      includes: lines(form.includes), excludes: lines(form.excludes), cover_url: form.cover || form.gallery[0] || null, gallery: form.gallery, plan_url: form.plan || null, video_url: form.video.trim() || null, status: target,
    };
    try {
      if (edit === 'new') {
        const base = slugify(form.code ? `${form.title}-${form.code}` : form.title) || 'model';
        const slug = q.data.some((m) => m.slug === base) ? `${base}-${Math.random().toString(36).slice(2, 5)}` : base;
        unwrap(await db().from('showroom_models').insert({ ...row, slug, client_id: client?.id ?? null }).select('id'));
      } else if (edit) unwrap(await db().from('showroom_models').update(row).eq('id', edit.id).select('id'));
      setMsg({ tone: 'ok', text: target === 'published' ? 'Kaydedildi ve sitede yayında.' : 'Kaydedildi (taslak — sitede görünmez).' });
      await q.reload(); setEdit(null);
    } catch (e) { setMsg({ tone: 'error', text: (e as Error).message }); } finally { setBusy(false); }
  };
  const [writing, setWriting] = useState(false);
  const botWrite = async () => {
    if (edit === 'new' || !edit) { setMsg({ tone: 'error', text: 'Önce "Taslak kaydet" deyin; sonra bot ön yazıyı yazsın.' }); return; }
    setWriting(true); setMsg(null);
    try {
      const r = await callOps<{ subtitle: string; description: string; social_caption: string; hashtags: string[]; applied: boolean }>('showroom_write', { id: edit.id });
      if (r.applied) setForm((f) => ({ ...f, subtitle: r.subtitle, description: r.description }));
      setMsg({ tone: 'ok', text: r.applied ? 'Editör Bot slogan ve ön yazıyı yazdı — okuyup düzenleyebilirsiniz.' : 'Ev yayında olduğu için bot metni değiştirmedi; önerisini aşağıdaki nota bıraktı.' });
      await q.reload();
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setWriting(false); }
  };
  const setStatus = async (m: Model, status: Model['status']) => {
    if (status === 'published' && !m.cover_url && !m.gallery.length) { setMsg({ tone: 'error', text: `"${m.title}" için önce fotoğraf seçin.` }); return; }
    const { error } = await db().from('showroom_models').update({ status }).eq('id', m.id);
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: status === 'published' ? `"${m.title}" sitede yayında.` : status === 'archived' ? `"${m.title}" arşivlendi.` : `"${m.title}" taslağa alındı.` });
    q.reload();
  };
  const setPostStatus = async (post: SitePost, status: SitePost['status']) => {
    if (status === 'published' && (!post.title.trim() || !post.body?.trim())) {
      setMsg({ tone: 'error', text: 'Yazı başlık ve gövde olmadan yayınlanamaz.' }); return;
    }
    const { error } = await db().from('site_posts').update({ status }).eq('id', post.id);
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: status === 'published' ? `"${post.title}" onaylandı ve public sitede yayımlandı.` : `"${post.title}" arşivlendi.` });
    posts.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-100">Ev Vitrini</h1>
          <p className="text-xs text-ink-400">Sitedeki ev modelleri sayfası · yalnızca “Yayında” olanlar görünür · <a className="text-brand-green underline" href={`${SITE}/evler`} target="_blank" rel="noreferrer">siteyi aç</a></p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === 'active' ? 'subtle' : 'ghost'} onClick={() => setTab('active')}>Modeller</Button>
          <Button variant={tab === 'archived' ? 'subtle' : 'ghost'} onClick={() => setTab('archived')}>Arşiv</Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>Yeni model / proje</Button>
        </div>
      </div>
      {msg && !edit && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
      <Notice tone="info">Fiyat, m² ve oda bilgisi boş bırakılırsa sitede o alan gösterilmez; yerine “Fiyat için teklif alın” yazar. Teklif formundan gelenler <b>Müşteri Adayları</b>na düşer.
        <br />🤖 <b>Editör Bot</b>: yazısı eksik taslaklara ön yazı yazar (yalnızca girdiğiniz bilgilerle); bir ev yayına girince Instagram + Facebook paylaşımını <b>Yayın Merkezi → Havuz</b>a koyar ve Telegram’dan haber verir.</Notice>
      {q.loading ? <StateView kind="loading" compact /> : q.error ? <StateView kind="error" message={q.error} /> : list.length === 0 ? (
        <StateView kind="empty" title={tab === 'archived' ? 'Arşiv boş' : 'Henüz model yok'} message={tab === 'archived' ? undefined : 'İlk evinizi ekleyin: başlık, fotoğraflar, m² ve oda bilgisi.'}
          action={tab === 'active' ? <Button variant="primary" onClick={() => open('new')}>Yeni model ekle</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="ops-panel overflow-hidden">
              <div className="relative aspect-[16/10] bg-ink-800">
                {(m.cover_url || m.gallery[0]) && <img src={m.cover_url || m.gallery[0]} alt="" className="h-full w-full object-cover" loading="lazy" />}
                <div className="absolute left-2 top-2 flex gap-1">
                  <Pill tone={m.status === 'published' ? 'go' : m.status === 'archived' ? 'idle' : 'wait'}>{m.status === 'published' ? 'YAYINDA' : m.status === 'archived' ? 'ARŞİV' : 'TASLAK'}</Pill>
                  {m.featured && <Pill tone="info" dot={false}>★ ÖNE ÇIKAN</Pill>}
                </div>
              </div>
              <div className="space-y-2 p-3">
                <div className="font-semibold text-ink-100">{m.title}</div>
                {m.ai_note && <div className="rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] text-sky-700">🤖 {m.ai_note.split('\n')[0].slice(0, 90)}</div>}
                {m.announced_at && <div className="text-[10px] text-ink-400">📣 IG + FB paylaşımı havuza kondu</div>}
                <div className="text-[11px] text-ink-400">{[m.code, m.area_m2 && `${m.area_m2} m²`, m.rooms, m.price ? `${m.price.toLocaleString('tr-TR')}₺` : (m.price_note || 'fiyat: teklif'), m.is_real_project && 'teslim edilen proje'].filter(Boolean).join(' · ')}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Button icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => open(m)}>Düzenle</Button>
                  {m.status !== 'published' && <Button variant="primary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setStatus(m, 'published')}>Yayınla</Button>}
                  {m.status === 'published' && <Button onClick={() => setStatus(m, 'draft')}>Taslağa al</Button>}
                  {m.status === 'published' && <a className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-ink-200 ring-1 ring-ink-600" href={`${SITE}/ev/${m.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Sitede gör</a>}
                  {m.status !== 'archived' ? <Button variant="danger" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => setStatus(m, 'archived')}>Arşivle</Button>
                    : <Button onClick={() => setStatus(m, 'draft')}>Geri al</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="ops-panel space-y-3 p-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ink-100">Site yazıları · taslak ve onay</h2>
          <p className="mt-1 text-[11px] text-ink-400">Editör Bot yazıyı hazırlar; public sitede görünmesi için burada insanın <b>Onayla ve yayınla</b> demesi gerekir. Yeni bot taslakları sitemap ve blog sayfasına girmez.</p>
        </div>
        {posts.loading ? <StateView kind="loading" compact /> : posts.error ? <StateView kind="error" message={posts.error} /> : posts.data.length === 0 ? <StateView kind="empty" title="Henüz site yazısı yok" /> : (
          <div className="space-y-2">
            {posts.data.map((post) => (
              <article key={post.id} className="rounded-2xl bg-ink-900/5 p-3 ring-1 ring-ink-200/60">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone={post.status === 'published' ? 'go' : post.status === 'archived' ? 'idle' : 'wait'}>{post.status === 'published' ? 'YAYINDA' : post.status === 'archived' ? 'ARŞİV' : 'TASLAK'}</Pill>
                      <span className="text-[10px] uppercase tracking-wide text-ink-400">{post.kind}{post.district ? ` · ${post.district}` : ''}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-ink-100">{post.title}</h3>
                    {post.excerpt && <p className="mt-0.5 text-[11px] text-ink-400">{post.excerpt}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {post.status === 'draft' && <Button variant="primary" onClick={() => setPostStatus(post, 'published')}>Onayla ve yayınla</Button>}
                    {post.status !== 'archived' && <Button variant="danger" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => setPostStatus(post, 'archived')}>Arşivle</Button>}
                    {post.status === 'published' && <a className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-ink-200 ring-1 ring-ink-600" href={`${SITE}/blog/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Yazıyı aç</a>}
                  </div>
                </div>
                <details className="mt-2 text-[11px] text-ink-300">
                  <summary className="cursor-pointer font-semibold">İçeriği incele</summary>
                  <div className="mt-2 space-y-2 rounded-xl bg-white/60 p-3">
                    {post.seo_title && <div><b>SEO başlığı:</b> {post.seo_title}</div>}
                    {post.seo_description && <div><b>SEO açıklaması:</b> {post.seo_description}</div>}
                    <div className="whitespace-pre-line leading-relaxed">{post.body || 'İçerik gövdesi boş.'}</div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal open={edit !== null} onClose={() => setEdit(null)} wide title={edit === 'new' ? 'Yeni model / proje' : 'Modeli düzenle'}
        footer={<>
          <Button onClick={() => setEdit(null)}>Vazgeç</Button>
          <Button variant="subtle" loading={busy} onClick={() => save('draft')}>Taslak kaydet</Button>
          <Button variant="primary" loading={busy} onClick={() => save('published')}>Kaydet ve yayınla</Button>
        </>}>
        <div className="space-y-4">
          {msg && edit && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Başlık *" className="sm:col-span-2"><input className="ops-input w-full" placeholder="120 m² Tek Katlı Villa" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Model kodu"><input className="ops-input w-full" placeholder="EY-120" value={form.code} onChange={(e) => set('code', e.target.value)} /></Field>
            <Field label="Kısa slogan" className="sm:col-span-3"><input className="ops-input w-full" placeholder="Bahçeli, ferah, anahtar teslim" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></Field>
            <Field label="Yapı sistemi"><select className="ops-input w-full" value={form.system} onChange={(e) => set('system', e.target.value)}>{SYSTEMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Teslim tipi"><select className="ops-input w-full" value={form.delivery} onChange={(e) => set('delivery', e.target.value)}>{DELIVERIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Kat sayısı"><input className="ops-input w-full" inputMode="numeric" value={form.floors} onChange={(e) => set('floors', e.target.value)} /></Field>
            <Field label="Yapı boyutu (m²)"><input className="ops-input w-full" inputMode="decimal" placeholder="120" value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
            <Field label="Oda sayısı"><input className="ops-input w-full" placeholder="3+1" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} /></Field>
            <Field label="Tahmini teslim (gün)"><input className="ops-input w-full" inputMode="numeric" value={form.days} onChange={(e) => set('days', e.target.value)} /></Field>
            <Field label="Fiyat (₺)" hint="Boş bırakılırsa “Fiyat için teklif alın” yazar"><input className="ops-input w-full" inputMode="numeric" placeholder="1850000" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
            <Field label="Fiyat notu" className="sm:col-span-2" hint="ör. Temel hariç · 5 ay vade farksız"><input className="ops-input w-full" value={form.price_note} onChange={(e) => set('price_note', e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-ink-200">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.real} onChange={(e) => set('real', e.target.checked)} /> Teslim ettiğimiz gerçek proje</label>
            {form.real && <input className="ops-input w-48" placeholder="İlçe (ör. Çatalca)" value={form.location} onChange={(e) => set('location', e.target.value)} />}
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /><Star className="h-3.5 w-3.5" /> Öne çıkar</label>
            <label className="flex items-center gap-2">Sıra <input className="ops-input w-20" inputMode="numeric" value={form.sort} onChange={(e) => set('sort', e.target.value)} /></label>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold text-ink-300">Fotoğraflar (ilki kapak olur)</span>
              <div className="flex gap-1.5"><Button icon={<ImagePlus className="h-3.5 w-3.5" />} onClick={() => setPicker('gallery')}>Havuzdan seç</Button><UploadBtn onDone={(u) => set('gallery', [...form.gallery, u])} /></div></div>
            {form.gallery.length === 0 ? <p className="text-[11px] text-ink-500">Henüz fotoğraf yok.</p> : (
              <div className="flex flex-wrap gap-2">
                {form.gallery.map((u, i) => (
                  <div key={u} className={cx('relative h-20 w-28 overflow-hidden rounded-lg ring-2', (form.cover || form.gallery[0]) === u ? 'ring-brand-green' : 'ring-transparent')}>
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 py-0.5 text-[10px] text-white">
                      <button onClick={() => set('cover', u)}>{(form.cover || form.gallery[0]) === u ? 'Kapak' : 'Kapak yap'}</button>
                      <span className="flex gap-1">{i > 0 && <button onClick={() => { const g = [...form.gallery]; [g[i - 1], g[i]] = [g[i], g[i - 1]]; set('gallery', g); }}>◀</button>}
                        <button aria-label="Çıkar" onClick={() => set('gallery', form.gallery.filter((x) => x !== u))}><Trash2 className="h-3 w-3" /></button></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kat planı görseli"><div className="flex gap-1.5"><input className="ops-input w-full" placeholder="https://…" value={form.plan} onChange={(e) => set('plan', e.target.value)} /><Button onClick={() => setPicker('plan')}>Seç</Button></div></Field>
            <Field label="Video (isteğe bağlı)"><input className="ops-input w-full" placeholder="https://…mp4" value={form.video} onChange={(e) => set('video', e.target.value)} /></Field>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold text-ink-300">Oda dağılımı</span>
              <Button onClick={() => set('breakdown', [...form.breakdown, { label: '', count: null, m2: null }])}>+ Satır</Button></div>
            {form.breakdown.map((r, i) => (
              <div key={i} className="mb-1.5 grid grid-cols-[1fr_70px_90px_32px] gap-1.5">
                <input className="ops-input" placeholder="Yatak odası" value={r.label} onChange={(e) => set('breakdown', form.breakdown.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                <input className="ops-input" placeholder="adet" inputMode="numeric" value={r.count ?? ''} onChange={(e) => set('breakdown', form.breakdown.map((x, k) => (k === i ? { ...x, count: num(e.target.value) } : x)))} />
                <input className="ops-input" placeholder="m²" inputMode="decimal" value={r.m2 ?? ''} onChange={(e) => set('breakdown', form.breakdown.map((x, k) => (k === i ? { ...x, m2: num(e.target.value) } : x)))} />
                <button className="text-ink-400" aria-label="Sil" onClick={() => set('breakdown', form.breakdown.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fiyata dahil olanlar (her satıra bir madde)"><textarea className="ops-input w-full" rows={4} value={form.includes} onChange={(e) => set('includes', e.target.value)} /></Field>
            <Field label="Fiyata dahil olmayanlar"><textarea className="ops-input w-full" rows={4} value={form.excludes} onChange={(e) => set('excludes', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold text-ink-300">Ön yazı (Proje hakkında)</span>
                <Button variant="subtle" loading={writing} icon={<PenLine className="h-3.5 w-3.5" />} onClick={botWrite}>Editör Bot yazsın</Button></div>
              <textarea className="ops-input w-full" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} />
              {edit !== 'new' && edit?.ai_note && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-sky-500/10 px-2.5 py-2 text-[11px] text-sky-700">🤖 {edit.ai_note}</p>}
              {edit !== 'new' && edit?.social_caption && <details className="mt-1.5 text-[11px] text-ink-300"><summary className="cursor-pointer">Instagram / Facebook açıklaması (bot)</summary><p className="mt-1 whitespace-pre-line">{edit.social_caption}</p></details>}
            </div>
          </div>
        </div>
      </Modal>
      <MediaPicker open={picker !== null} multi={picker === 'gallery'} onClose={() => setPicker(null)}
        onPick={(urls) => { if (picker === 'gallery') set('gallery', [...form.gallery, ...urls.filter((u) => !form.gallery.includes(u))]); else if (picker === 'plan') set('plan', urls[0] ?? ''); setPicker(null); }} />
    </div>
  );
}

function UploadBtn({ onDone }: { onDone: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-200 ring-1 ring-ink-600 hover:bg-ink-800', busy && 'opacity-50')}>
      <Upload className="h-3.5 w-3.5" />{busy ? 'Yükleniyor…' : 'Bilgisayardan yükle'}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        if (f.size > 15 * 1024 * 1024) { alert('Dosya 15 MB’dan küçük olmalı.'); return; }
        setBusy(true);
        const path = `showroom/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${(f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const { error } = await db().storage.from('media-uploads').upload(path, f, { contentType: f.type, upsert: false });
        setBusy(false);
        if (error) { alert(`Yüklenemedi: ${error.message}`); return; }
        onDone(db().storage.from('media-uploads').getPublicUrl(path).data.publicUrl);
      }} />
    </label>
  );
}

function MediaPicker({ open, multi, onClose, onPick }: { open: boolean; multi: boolean; onClose: () => void; onPick: (urls: string[]) => void }) {
  const q = useQuery(async () => (open ? unwrap(await db().from('media_library').select('id,url,title').eq('kind', 'image').order('created_at', { ascending: false }).limit(300)) as Media[] : []), [] as Media[], [open]);
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (u: string) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : multi ? [...s, u] : [u]));
  return (
    <Modal open={open} onClose={() => { setSel([]); onClose(); }} wide title="Medya havuzundan fotoğraf seç"
      footer={<><Button onClick={() => { setSel([]); onClose(); }}>Vazgeç</Button><Button variant="primary" disabled={!sel.length} onClick={() => { onPick(sel); setSel([]); }}>{sel.length ? `${sel.length} fotoğrafı ekle` : 'Seçin'}</Button></>}>
      {q.loading ? <StateView kind="loading" compact /> : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {q.data.map((m) => (
            <button key={m.id} onClick={() => toggle(m.url)} className={cx('relative aspect-square overflow-hidden rounded-lg ring-2', sel.includes(m.url) ? 'ring-brand-green' : 'ring-transparent')}>
              <img src={m.url} alt={m.title ?? ''} className="h-full w-full object-cover" loading="lazy" />
              {sel.includes(m.url) && <span className="absolute right-1 top-1 rounded-full bg-brand-green px-1.5 text-[10px] font-bold text-white">{sel.indexOf(m.url) + 1}</span>}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
