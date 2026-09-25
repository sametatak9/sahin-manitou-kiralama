// İÇERİK HAVUZLARI: Banner (şablonlu — düzenle/yeniden çiz/kopyala/sil) · Gönderi metni şablonları · (Video havuzu ayrı bileşen).
// Silme = arşive kaldırma (archived_at): veri kaybı yok. Gönderi planlarken PoolPicker ile havuzdan seçilir.
import { useState } from 'react';
import { Archive, Copy, Download, FileText, ImagePlus, Pencil, Plus, RefreshCw, Save } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { db, unwrap, useQuery } from '../lib/hooks';
import { Button, cx, Field, Modal, Notice, PlatformBadge, StateView } from '../ui';

export interface BannerItem {
  id: string; kind: 'banner'; title: string; url: string; width: number | null; height: number | null; platform: string | null; pillar: string | null;
  source: string; caption: string | null; hashtags: string[]; use_count: number; status: string; created_at: string; updated_at: string;
  template: { headline?: string; subtitle?: string; badge?: string; cta?: string; brand?: string; width?: number; height?: number; photo_url?: string | null } | null;
}
export interface PostTemplate { id: string; title: string; platform: string | null; brand: string | null; pillar: string | null; headline: string | null; caption: string; hashtags: string[]; cta: string | null; notes: string | null; source: string; use_count: number; created_at: string; updated_at: string }

const PLATFORMS = [['instagram', 'Instagram (1080×1350)'], ['tiktok', 'TikTok (1080×1920)'], ['youtube', 'YouTube (1080×1920)'], ['facebook', 'Facebook (1080×1350)'], ['x', 'X (1600×900)']] as const;
const BRANDS = ['Embay Yapı', 'Şahin Manitou', 'İkisi'];

// ── Banner havuzu ────────────────────────────────────────────────────────────
export function BannerPool() {
  const [edit, setEdit] = useState<BannerItem | 'new' | null>(null);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery(async () => unwrap(await db().from('media_library').select('*').eq('kind', 'banner').is('archived_at', null).order('updated_at', { ascending: false }).limit(300)) as BannerItem[], [] as BannerItem[], [], ['media_library']);
  const rows = q.data.filter((b) => filter === 'all' || b.platform === filter);
  const archive = async (b: BannerItem) => {
    if (!confirm(`“${b.title}” havuzdan kaldırılsın mı? (Arşive taşınır, geri alınabilir)`)) return;
    setBusy(b.id); try { unwrap(await db().from('media_library').update({ archived_at: new Date().toISOString(), status: 'archived' }).eq('id', b.id).select('id')); setMsg({ tone: 'ok', text: 'Banner arşive kaldırıldı.' }); q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const duplicate = async (b: BannerItem) => {
    setBusy(b.id); try { await callOps('banner_render', { platform: b.platform, title: `${b.title} (kopya)`, template: b.template ?? { headline: b.title } }); setMsg({ tone: 'ok', text: 'Kopya oluşturuldu.' }); q.reload(); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {[['all', `Tümü (${q.data.length})`], ...PLATFORMS.map(([k]) => [k, k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)])].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx('rounded-full px-3 py-1 text-[11px] font-semibold ring-1', filter === k ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}>{l}</button>))}
        <span className="flex-1" />
        <Button variant="primary" onClick={() => setEdit('new')} icon={<Plus className="w-4 h-4" />}>Yeni banner</Button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {q.loading && !q.data.length ? <StateView kind="loading" /> : q.error ? <StateView kind="error" title="Banner havuzu okunamadı" message={q.error} /> : !rows.length ? (
        <StateView kind="empty" title="Veri bulunamadı" message="İçerik Fabrikası her sabah banner üretir; “Yeni banner” ile kendiniz de oluşturabilirsiniz." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((b) => (
            <div key={b.id} className="ops-panel overflow-hidden flex flex-col">
              <a href={b.url} target="_blank" rel="noreferrer" className="block bg-ink-900"><img src={b.url} alt={b.title} loading="lazy" className="w-full aspect-[4/5] object-contain" /></a>
              <div className="p-2.5 space-y-1 flex-1">
                <div className="flex items-center gap-1.5">{b.platform && <PlatformBadge platform={b.platform} />}<span className="text-xs font-semibold text-ink-100 line-clamp-1">{b.title}</span></div>
                <div className="text-[10px] text-ink-500">{b.width}×{b.height} · {b.pillar ?? '—'} · {b.source === 'factory' ? 'Fabrika' : 'Elle'} · {b.use_count} kez kullanıldı</div>
                <div className="text-[10px] text-ink-500">{fmtDateTime(b.updated_at)}</div>
              </div>
              <div className="flex flex-wrap gap-1 p-2 pt-0">
                <Button variant="subtle" onClick={() => setEdit(b)} icon={<Pencil className="w-3.5 h-3.5" />}>Düzenle</Button>
                <Button variant="ghost" loading={busy === b.id} onClick={() => duplicate(b)} icon={<Copy className="w-3.5 h-3.5" />}>Kopyala</Button>
                <a href={b.url} download className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-300 ring-1 ring-ink-700"><Download className="w-3.5 h-3.5" />İndir</a>
                <Button variant="ghost" loading={busy === b.id} onClick={() => archive(b)} icon={<Archive className="w-3.5 h-3.5" />}>Sil</Button>
              </div>
            </div>))}
        </div>
      )}
      {edit && <BannerEditor item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={(t) => { setEdit(null); setMsg({ tone: 'ok', text: t }); q.reload(); }} />}
    </div>
  );
}

function BannerEditor({ item, onClose, onSaved }: { item: BannerItem | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const t = item?.template ?? {};
  const [f, setF] = useState({ title: item?.title ?? '', platform: item?.platform ?? 'instagram', brand: t.brand ?? 'Embay Yapı', badge: t.badge ?? 'KAMPANYA', headline: t.headline ?? item?.title ?? '', subtitle: t.subtitle ?? '', cta: t.cta ?? 'Hemen arayın', photo_url: t.photo_url ?? '', caption: item?.caption ?? '', hashtags: (item?.hashtags ?? []).join(' ') });
  const [preview, setPreview] = useState(item?.url ?? '');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const photos = useQuery(async () => unwrap(await db().from('media_library').select('id,url,title').eq('kind', 'image').is('archived_at', null).order('created_at', { ascending: false }).limit(40)) as Array<{ id: string; url: string; title: string }>, [], []);
  const render = async () => {
    setBusy(true); setErr(null);
    try {
      const sized = item && item.platform === f.platform ? { width: item.width ?? undefined, height: item.height ?? undefined } : {};
      const out = await callOps<BannerItem>('banner_render', { id: item?.id ?? null, platform: f.platform, title: f.title || f.headline,
        template: { headline: f.headline.trim(), subtitle: f.subtitle.trim(), badge: f.badge.trim().toLocaleUpperCase('tr-TR'), cta: f.cta.trim(), brand: f.brand, photo_url: f.photo_url || null, ...sized } });
      const tags = f.hashtags.split(/\s+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`));
      await db().from('media_library').update({ caption: f.caption.trim() || null, hashtags: tags }).eq('id', out.id);
      setPreview(`${out.url}?v=${Date.now()}`);
      onSaved(item ? 'Banner güncellendi ve yeniden çizildi.' : 'Yeni banner havuza eklendi.');
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={item ? `Banner düzenle · ${item.title}` : 'Yeni banner'} footer={<><Button variant="ghost" onClick={onClose}>Kapat</Button><Button variant="primary" loading={busy} onClick={render} icon={item ? <RefreshCw className="w-4 h-4" /> : <Save className="w-4 h-4" />}>{item ? 'Kaydet ve yeniden çiz' : 'Oluştur ve havuza ekle'}</Button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Platform / ölçü"><select className="ops-input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{PLATFORMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Marka"><select className="ops-input" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
          </div>
          <Field label="Rozet (üst etiket)"><input className="ops-input" maxLength={24} value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} /></Field>
          <Field label="Büyük başlık" hint="En fazla 5-6 kelime"><input className="ops-input" maxLength={60} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></Field>
          <Field label="Alt yazı"><textarea className="ops-input min-h-[60px]" maxLength={140} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
          <Field label="Alt bant çağrısı (CTA)"><input className="ops-input" maxLength={40} value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} /></Field>
          <Field label="Arka plan fotoğrafı (isteğe bağlı)">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button type="button" onClick={() => setF({ ...f, photo_url: '' })} className={cx('shrink-0 w-14 h-14 rounded-lg ring-1 text-[10px]', !f.photo_url ? 'ring-brand-green bg-ink-750' : 'ring-ink-700')}>Yok</button>
              {photos.data.map((p) => <button key={p.id} type="button" onClick={() => setF({ ...f, photo_url: p.url })} className={cx('shrink-0 w-14 h-14 rounded-lg overflow-hidden ring-2', f.photo_url === p.url ? 'ring-brand-green' : 'ring-transparent')}><img src={p.url} alt="" className="w-full h-full object-cover" /></button>)}
            </div>
            {!photos.data.length && <div className="text-[11px] text-ink-500 inline-flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" />Havuzda fotoğraf yok — Yayın Kuyruğu’ndan görsel yükleyince burada seçilebilir.</div>}
          </Field>
          <Field label="Paylaşım açıklaması (isteğe bağlı)"><textarea className="ops-input min-h-[60px]" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></Field>
          <Field label="Hashtag’ler"><input className="ops-input" value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></Field>
        </div>
        <div className="rounded-xl bg-ink-900 ring-1 ring-ink-700 flex items-center justify-center p-2 min-h-[260px]">
          {preview ? <img src={preview} alt="Önizleme" className="max-h-[70vh] w-auto object-contain" /> : <span className="text-xs text-ink-500">Oluşturunca önizleme burada görünür</span>}
        </div>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}

// ── Gönderi metni havuzu ─────────────────────────────────────────────────────
export function PostPool() {
  const [edit, setEdit] = useState<PostTemplate | 'new' | null>(null);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const q = useQuery(async () => unwrap(await db().from('post_templates').select('*').is('archived_at', null).order('updated_at', { ascending: false }).limit(300)) as PostTemplate[], [] as PostTemplate[], [], ['post_templates']);
  const rows = q.data.filter((p) => filter === 'all' || p.platform === filter);
  const archive = async (p: PostTemplate) => { if (!confirm(`“${p.title}” şablonu kaldırılsın mı? (Arşive taşınır)`)) return; await db().from('post_templates').update({ archived_at: new Date().toISOString() }).eq('id', p.id); setMsg({ tone: 'ok', text: 'Şablon arşive kaldırıldı.' }); q.reload(); };
  const duplicate = async (p: PostTemplate) => { await db().from('post_templates').insert({ title: `${p.title} (kopya)`, platform: p.platform, brand: p.brand, pillar: p.pillar, headline: p.headline, caption: p.caption, hashtags: p.hashtags, cta: p.cta, source: 'manual' }); setMsg({ tone: 'ok', text: 'Kopya oluşturuldu.' }); q.reload(); };
  const copyText = (p: PostTemplate) => { navigator.clipboard?.writeText(`${p.caption}\n\n${p.hashtags.join(' ')}`); setMsg({ tone: 'ok', text: 'Metin kopyalandı.' }); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {[['all', `Tümü (${q.data.length})`], ...PLATFORMS.map(([k]) => [k, k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)])].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx('rounded-full px-3 py-1 text-[11px] font-semibold ring-1', filter === k ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400')}>{l}</button>))}
        <span className="flex-1" />
        <Button variant="primary" onClick={() => setEdit('new')} icon={<Plus className="w-4 h-4" />}>Yeni metin şablonu</Button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {q.loading && !q.data.length ? <StateView kind="loading" /> : !rows.length ? <StateView kind="empty" title="Veri bulunamadı" message="Fabrikanın yazdığı metinler ve sizin şablonlarınız burada toplanır." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((p) => (
            <div key={p.id} className="ops-panel p-3 space-y-1.5 flex flex-col">
              <div className="flex items-center gap-1.5">{p.platform && <PlatformBadge platform={p.platform} />}<span className="text-sm font-semibold text-ink-100 line-clamp-1">{p.title}</span></div>
              <div className="text-[10px] text-ink-500">{p.pillar ?? '—'} · {p.brand ?? '—'} · {p.source === 'factory' ? 'Fabrika' : 'Elle'} · {p.use_count} kez kullanıldı</div>
              <p className="text-xs text-ink-300 line-clamp-4 whitespace-pre-line flex-1">{p.caption}</p>
              <div className="text-[11px] text-brand-green line-clamp-1">{p.hashtags.join(' ')}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                <Button variant="subtle" onClick={() => setEdit(p)} icon={<Pencil className="w-3.5 h-3.5" />}>Düzenle</Button>
                <Button variant="ghost" onClick={() => duplicate(p)} icon={<Copy className="w-3.5 h-3.5" />}>Kopyala</Button>
                <Button variant="ghost" onClick={() => copyText(p)} icon={<FileText className="w-3.5 h-3.5" />}>Metni kopyala</Button>
                <Button variant="ghost" onClick={() => archive(p)} icon={<Archive className="w-3.5 h-3.5" />}>Sil</Button>
              </div>
            </div>))}
        </div>
      )}
      {edit && <PostEditor item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={(t) => { setEdit(null); setMsg({ tone: 'ok', text: t }); q.reload(); }} />}
    </div>
  );
}

function PostEditor({ item, onClose, onSaved }: { item: PostTemplate | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [f, setF] = useState({ title: item?.title ?? '', platform: item?.platform ?? 'instagram', brand: item?.brand ?? 'Embay Yapı', pillar: item?.pillar ?? '', headline: item?.headline ?? '', caption: item?.caption ?? '', hashtags: (item?.hashtags ?? []).join(' '), cta: item?.cta ?? '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (!f.title.trim() || !f.caption.trim()) throw new Error('Başlık ve metin gerekli');
      const row = { title: f.title.trim().slice(0, 200), platform: f.platform, brand: f.brand, pillar: f.pillar.trim() || null, headline: f.headline.trim() || null, caption: f.caption.trim(),
        hashtags: f.hashtags.split(/\s+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)).slice(0, 30), cta: f.cta.trim() || null };
      if (item) unwrap(await db().from('post_templates').update(row).eq('id', item.id).select('id')); else unwrap(await db().from('post_templates').insert({ ...row, source: 'manual' }).select('id'));
      onSaved(item ? 'Şablon güncellendi.' : 'Şablon havuza eklendi.');
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const limit = f.platform === 'x' ? 260 : f.platform === 'tiktok' ? 150 : 2200;
  return (
    <Modal open wide onClose={onClose} title={item ? `Metin düzenle · ${item.title}` : 'Yeni metin şablonu'} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Şablon adı"><input className="ops-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Platform"><select className="ops-input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{PLATFORMS.map(([k, l]) => <option key={k} value={k}>{l.split(' (')[0]}</option>)}</select></Field>
        <Field label="Marka"><select className="ops-input" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Konu"><input className="ops-input" placeholder="Ör: KİRALIK MANİTOU" value={f.pillar} onChange={(e) => setF({ ...f, pillar: e.target.value })} /></Field>
        <Field label="Başlık (isteğe bağlı)" className="sm:col-span-2"><input className="ops-input" value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></Field>
        <Field label={`Metin (${f.caption.length}/${limit})`} className="sm:col-span-2"><textarea className={cx('ops-input min-h-[140px]', f.caption.length > limit && 'ring-rose-500')} value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></Field>
        <Field label="Hashtag’ler" className="sm:col-span-2"><input className="ops-input" value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></Field>
        <Field label="Çağrı (CTA)" className="sm:col-span-2"><input className="ops-input" value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} /></Field>
      </div>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
    </Modal>
  );
}

// ── Gönderi planlarken havuzdan seçim ────────────────────────────────────────
export interface PickedPoolMedia { id: string; url: string; video: boolean; title: string }
export function PoolPicker({ mode, onClose, onPickMedia, onPickText }: { mode: 'media' | 'text'; onClose: () => void; onPickMedia?: (items: PickedPoolMedia[]) => void; onPickText?: (t: PostTemplate) => void }) {
  const [tab, setTab] = useState<'banner' | 'video' | 'image'>('banner');
  const [sel, setSel] = useState<PickedPoolMedia[]>([]);
  const media = useQuery(async () => unwrap(await db().from('media_library').select('id,kind,url,title,cover_url').eq('kind', tab).is('archived_at', null).order('updated_at', { ascending: false }).limit(120)) as Array<{ id: string; kind: string; url: string; title: string; cover_url: string | null }>, [], [tab]);
  const texts = useQuery(async () => (mode === 'text' ? unwrap(await db().from('post_templates').select('*').is('archived_at', null).order('updated_at', { ascending: false }).limit(200)) as PostTemplate[] : []), [] as PostTemplate[], [mode]);
  const toggle = (m: { id: string; url: string; kind: string; title: string }) => setSel((cur) => (cur.some((x) => x.id === m.id) ? cur.filter((x) => x.id !== m.id) : [...cur, { id: m.id, url: m.url, video: m.kind === 'video', title: m.title }]));
  const useText = async (t: PostTemplate) => { onPickText?.(t); await db().from('post_templates').update({ use_count: t.use_count + 1, last_used_at: new Date().toISOString() }).eq('id', t.id); onClose(); };
  const done = async () => { onPickMedia?.(sel); for (const s of sel) await db().from('media_library').update({ last_used_at: new Date().toISOString() }).eq('id', s.id); onClose(); };
  return (
    <Modal open wide onClose={onClose} title={mode === 'text' ? 'Metin havuzundan seç' : 'Havuzdan görsel / video seç'}
      footer={mode === 'media' ? <><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button variant="primary" disabled={!sel.length} onClick={done}>{sel.length ? `${sel.length} öğeyi ekle` : 'Seçin'}</Button></> : <Button variant="ghost" onClick={onClose}>Kapat</Button>}>
      {mode === 'text' ? (
        texts.loading ? <StateView kind="loading" compact /> : !texts.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Havuzlar → Gönderi metinleri’nden şablon ekleyin." compact /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {texts.data.map((t) => (
              <button key={t.id} onClick={() => useText(t)} className="text-left rounded-xl ring-1 ring-ink-700 p-2.5 hover:bg-ink-800">
                <div className="flex items-center gap-1.5">{t.platform && <PlatformBadge platform={t.platform} />}<span className="text-xs font-semibold text-ink-100 line-clamp-1">{t.title}</span></div>
                <p className="text-[11px] text-ink-300 line-clamp-3 mt-1">{t.caption}</p>
              </button>))}
          </div>)
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1.5">{([['banner', 'Banner'], ['video', 'Video'], ['image', 'Fotoğraf']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', tab === k ? 'bg-brand-green text-white' : 'bg-ink-800 text-ink-300')}>{l}</button>)}</div>
          {media.loading ? <StateView kind="loading" compact /> : !media.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Bu havuz boş." compact /> : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto">
              {media.data.map((m) => { const on = sel.some((x) => x.id === m.id); return (
                <button key={m.id} onClick={() => toggle(m)} className={cx('relative rounded-lg overflow-hidden ring-2 bg-ink-900', on ? 'ring-brand-green' : 'ring-transparent')}>
                  {m.kind === 'video' ? <video src={m.url} className="w-full aspect-[4/5] object-cover" muted playsInline preload="metadata" /> : <img src={m.cover_url ?? m.url} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />}
                  {on && <span className="absolute right-1 top-1 rounded-full bg-brand-green text-white text-[10px] font-bold px-1.5">✓</span>}
                  <span className="absolute left-0 right-0 bottom-0 bg-black/55 text-white text-[10px] px-1 truncate">{m.title}</span>
                </button>); })}
            </div>)}
        </div>
      )}
    </Modal>
  );
}
