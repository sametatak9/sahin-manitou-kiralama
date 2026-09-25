// Video Havuzu: telefondan video yükle → havuza kaydolur → uygulama/format seç → düzenle (kırp, kapak, ses) → kaydet →
// istenirse Yayın Kuyruğu'na tarih/saat ile gönder. Her kayıt veritabanına tarihli yazılır (media_library).
import { useEffect, useRef, useState } from 'react';
import { Archive, CalendarClock, Image as ImageIcon, Scissors, Send, Share2, Upload, VolumeX, Save } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, fmtDateTime, istanbulToIso } from '../lib/format';
import { grabFrame, recorderFormat, TARGETS, trimVideo, uploadBlob, uploadMedia, videoMeta } from '../lib/media';
import type { OpsStatus } from '../lib/types';
import { useSession } from '../session';
import { shareToPhone } from '../lib/share';
import { Button, cx, Field, Modal, Notice, Panel, Pill, SavedStamp, StateView } from '../ui';

export interface MediaItem {
  id: string; kind: 'video' | 'image'; title: string; url: string; original_url: string | null; cover_url: string | null;
  mime: string | null; size_bytes: number | null; duration_sec: number | null; width: number | null; height: number | null;
  targets: string[]; caption: string | null; hashtags: string[]; edit: { trim_start?: number; trim_end?: number; muted?: boolean; cover_time?: number };
  notes: string | null; status: 'pool' | 'queued' | 'published' | 'archived'; draft_ids: string[]; queued_at: string | null; created_at: string; updated_at: string;
}
const STATUS: Record<MediaItem['status'], { label: string; tone: 'idle' | 'info' | 'go' | 'wait' }> = {
  pool: { label: 'HAVUZDA', tone: 'idle' }, queued: { label: 'KUYRUKTA', tone: 'info' }, published: { label: 'PAYLAŞILDI', tone: 'go' }, archived: { label: 'ARŞİV', tone: 'wait' },
};
const fmtSec = (s?: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const fmtMb = (b?: number | null) => (b ? `${(b / 1048576).toFixed(1)} MB` : '');

export function VideoPool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const items = useQuery(async () => {
    let q = db().from('media_library').select('*').eq('kind', 'video').order('created_at', { ascending: false }).limit(100);
    q = showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
    return unwrap(await q) as MediaItem[];
  }, [] as MediaItem[], [showArchived], ['media_library']);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setMsg(null);
    const files = [...list].filter((f) => f.type.startsWith('video/')).slice(0, 10);
    if (!files.length) { setMsg({ tone: 'error', text: 'Yalnızca video dosyası seçin (mp4 / mov).' }); return; }
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        setBusy(`Yükleniyor ${i + 1}/${files.length}: ${f.name}`);
        const local = URL.createObjectURL(f);
        const meta = await videoMeta(local);
        const url = await uploadMedia(f);
        let cover: string | null = null;
        try { cover = (await uploadBlob(await grabFrame(local, Math.min(1, meta.duration / 2)), 'jpg', 'image/jpeg')).url; } catch { /* kapak alınamazsa boş kalır */ }
        URL.revokeObjectURL(local);
        const vertical = meta.height > meta.width;
        unwrap(await db().from('media_library').insert({
          kind: 'video', title: f.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Video', url, original_url: url, cover_url: cover,
          mime: f.type || 'video/mp4', size_bytes: f.size, duration_sec: meta.duration ? Math.round(meta.duration * 100) / 100 : null, width: meta.width || null, height: meta.height || null,
          targets: vertical ? ['ig_reel', 'yt_short'] : ['fb_post', 'yt_video'], hashtags: ['#şahinmanitou', '#manitou', '#inşaat'],
        }).select('id'));
        ok++;
      } catch (e) { setMsg({ tone: 'error', text: `${f.name}: ${errorText(e)}` }); }
    }
    setBusy(null);
    if (ok) setMsg({ tone: 'ok', text: `${ok} video havuza kaydedildi. Üzerine dokunup uygulama seçebilir, düzenleyebilir ve Yayın Kuyruğu’na gönderebilirsiniz.` });
    if (fileRef.current) fileRef.current.value = '';
    items.reload();
  };

  return (
    <div className="space-y-4">
      <Panel title="Video yükle">
        <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" loading={Boolean(busy)} onClick={() => fileRef.current?.click()} icon={<Upload className="w-4 h-4" />}>Telefondan video seç</Button>
          <span className="text-xs text-ink-400">{busy ?? 'mp4 / mov · dosya başına en fazla 50 MB · aynı anda 10 video'}</span>
        </div>
        <p className="text-[11px] text-ink-400 mt-2">Seçtiğiniz video önce havuza kaydedilir (hiçbir yerde paylaşılmaz). Sonra uygulamayı seçip düzenleyebilir, istediğiniz gün ve saatte paylaşılması için kuyruğa gönderebilirsiniz.</p>
      </Panel>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Notice>}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-100">{showArchived ? 'Arşivlenen videolar' : `Havuzdaki videolar (${items.data.length})`}</h3>
        <button type="button" onClick={() => setShowArchived((v) => !v)} className="text-xs font-semibold text-brand-green underline">{showArchived ? 'Havuza dön' : 'Arşivi göster'}</button>
      </div>
      {items.error ? <StateView kind="error" message={items.error} compact /> : items.loading && !items.data.length ? <StateView kind="loading" compact /> : !items.data.length ? (
        <StateView kind="empty" title="Veri bulunamadı" message={showArchived ? 'Arşivde video yok.' : 'Havuzda henüz video yok. Yukarıdaki “Telefondan video seç” ile ilk videonuzu yükleyin.'} compact />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.data.map((m) => (
            <button key={m.id} type="button" onClick={() => setOpen(m)} className="text-left rounded-2xl bg-white ring-1 ring-ink-700 overflow-hidden hover:ring-brand-green/60 transition">
              <div className="relative aspect-[9/16] max-h-64 w-full bg-ink-900">
                {m.cover_url ? <img src={m.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <video src={`${m.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">{fmtSec(m.duration_sec)}</span>
                {(m.edit?.trim_start != null || m.edit?.muted) && <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">düzenlendi</span>}
              </div>
              <div className="p-2 space-y-1">
                <div className="text-xs font-semibold text-ink-100 line-clamp-2">{m.title}</div>
                <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
                <div className="flex flex-wrap gap-1">{m.targets.map((t) => <span key={t} className="text-[9px] rounded bg-ink-800 px-1 py-0.5 text-ink-300">{TARGETS.find((x) => x.key === t)?.label ?? t}</span>)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && <VideoEditor item={open} onClose={() => setOpen(null)} onSaved={(m) => { setOpen(m); items.reload(); }} onGone={() => { setOpen(null); items.reload(); }} />}
    </div>
  );
}

function VideoEditor({ item, onClose, onSaved, onGone }: { item: MediaItem; onClose: () => void; onSaved: (m: MediaItem) => void; onGone: () => void }) {
  const session = useSession();
  const admin = session.role === 'admin';
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const vref = useRef<HTMLVideoElement>(null);
  const dur = item.duration_sec ?? 0;
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption ?? '');
  const [hashtags, setHashtags] = useState(item.hashtags.join(' '));
  const [targets, setTargets] = useState<string[]>(item.targets);
  const [start, setStart] = useState(item.edit?.trim_start ?? 0);
  const [end, setEnd] = useState(item.edit?.trim_end ?? dur);
  const [muted, setMuted] = useState(Boolean(item.edit?.muted));
  const [date, setDate] = useState(dayKey(new Date(Date.now() + 86400_000)));
  const [time, setTime] = useState('10:00');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(item.updated_at);
  const fmt = recorderFormat();
  const trimChanged = dur > 0 && (Math.abs(start - (item.edit?.trim_start ?? 0)) > 0.05 || Math.abs(end - (item.edit?.trim_end ?? dur)) > 0.05 || muted !== Boolean(item.edit?.muted));
  const cutLen = Math.max(0, end - start);
  const conn = (p: string) => status.data?.connectors.find((c) => c.key === p)?.status === 'connected';

  // Önizleme yalnızca seçilen aralıkta oynar
  useEffect(() => {
    const v = vref.current; if (!v) return;
    const onTime = () => { if (v.currentTime > end || v.currentTime < start - 0.2) { v.currentTime = start; if (v.currentTime > end) v.pause(); } };
    v.addEventListener('timeupdate', onTime); return () => v.removeEventListener('timeupdate', onTime);
  }, [start, end]);
  useEffect(() => { if (vref.current) vref.current.muted = muted; }, [muted]);

  const tagList = () => hashtags.split(/\s+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)).slice(0, 30);
  const warnings = TARGETS.filter((t) => targets.includes(t.key) && t.maxSec && cutLen > t.maxSec).map((t) => `${t.label} en fazla ${fmtSec(t.maxSec)} olabilir (şu an ${fmtSec(cutLen)}) — kırpın.`);

  /** Kaydet: bilgiler + (değiştiyse) gerçek kırpılmış kopya. Orijinal dosya hep saklanır. */
  const save = async (): Promise<MediaItem | null> => {
    setErr(null);
    try {
      if (!title.trim()) throw new Error('Başlık boş olamaz');
      let url = item.url; let size = item.size_bytes; let mime = item.mime; let duration = item.duration_sec;
      if (trimChanged) {
        const full = start <= 0.05 && end >= dur - 0.05 && !muted;
        if (full) { url = item.original_url ?? item.url; }
        else {
          setBusy('Kırpılıyor 0%');
          const out = await trimVideo(item.original_url ?? item.url, start, end, muted, (p) => setBusy(`Kırpılıyor ${Math.round(p * 100)}%`));
          setBusy('Kırpılmış video yükleniyor');
          url = (await uploadBlob(out.blob, out.ext, out.contentType)).url; size = out.blob.size; mime = out.contentType; duration = Math.round(cutLen * 100) / 100;
        }
      }
      setBusy('Kaydediliyor');
      const row = unwrap(await db().from('media_library').update({
        title: title.trim().slice(0, 120), caption: caption.trim() || null, hashtags: tagList(), targets, url, size_bytes: size, mime, duration_sec: duration,
        edit: { trim_start: start, trim_end: end, muted, cover_time: item.edit?.cover_time ?? null },
      }).eq('id', item.id).select('*').single()) as MediaItem;
      setSavedAt(row.updated_at); onSaved(row); return row;
    } catch (e) { setErr(errorText(e)); return null; } finally { setBusy(null); }
  };

  const setCover = async () => {
    const v = vref.current; if (!v) return;
    setErr(null); setBusy('Kapak kaydediliyor');
    try {
      const at = v.currentTime;
      const { url } = await uploadBlob(await grabFrame(item.original_url ?? item.url, at), 'jpg', 'image/jpeg');
      const row = unwrap(await db().from('media_library').update({ cover_url: url, edit: { ...item.edit, cover_time: at } }).eq('id', item.id).select('*').single()) as MediaItem;
      setSavedAt(row.updated_at); onSaved(row);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };

  const toQueue = async () => {
    setErr(null);
    const chosen = TARGETS.filter((t) => targets.includes(t.key));
    if (!chosen.length) { setErr('En az bir uygulama seçin.'); return; }
    if (!caption.trim()) { setErr('Açıklama yazın (paylaşımda görünecek metin).'); return; }
    if (warnings.length) { setErr(warnings.join(' ')); return; }
    const when = istanbulToIso(date, time);
    if (new Date(when).getTime() < Date.now() - 60_000) { setErr('Geçmiş bir saat seçilemez.'); return; }
    const saved = await save(); if (!saved) return;
    setBusy('Kuyruğa ekleniyor');
    try {
      const now = new Date().toISOString();
      const rows = chosen.map((t) => ({
        title: saved.title, body: saved.caption, caption: saved.caption, headline: saved.title, hashtags: saved.hashtags,
        networks: [t.platform], platform_targets: [t.platform], primary_platform: t.platform, format: t.format, post_type: t.format,
        media_urls: [saved.url], video_url: saved.url, scheduled_at: when, content_pillar: 'video_havuzu',
        workflow_status: admin ? 'scheduled' : 'pending_approval', status: admin ? 'planlandi' : 'onay_bekliyor',
        ...(admin ? { approved_by: session.userId, approved_at: now } : {}),
      }));
      const ins = unwrap(await db().from('social_drafts').insert(rows).select('id')) as Array<{ id: string }>;
      const row = unwrap(await db().from('media_library').update({ status: 'queued', queued_at: now, draft_ids: [...saved.draft_ids, ...ins.map((r) => r.id)] }).eq('id', item.id).select('*').single()) as MediaItem;
      onSaved(row);
      setErr(null);
      alert(`${rows.length} paylaşım ${fmtDateTime(when)} için Yayın Kuyruğu’na eklendi${admin ? '' : ' (yönetici onayı bekliyor)'}. Hesap bağlı değilse bağlanınca gönderilir.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };

  const archive = async () => {
    if (!window.confirm('Video arşive kaldırılsın mı? (Silinmez; arşivden geri getirilebilir.)')) return;
    try { unwrap(await db().from('media_library').update({ archived_at: new Date().toISOString(), status: 'archived' }).eq('id', item.id)); onGone(); } catch (e) { setErr(errorText(e)); }
  };
  const restore = async () => {
    try { unwrap(await db().from('media_library').update({ archived_at: null, status: item.draft_ids.length ? 'queued' : 'pool' }).eq('id', item.id)); onGone(); } catch (e) { setErr(errorText(e)); }
  };

  return (
    <Modal open onClose={onClose} wide title={<span className="inline-flex items-center gap-2">Video düzenle <Pill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Pill></span>}
      footer={<div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <SavedStamp at={savedAt} />
        <div className="flex flex-wrap gap-2">
          {item.status === 'archived' ? <Button variant="ghost" onClick={restore}>Arşivden geri al</Button> : <Button variant="ghost" onClick={archive} icon={<Archive className="w-4 h-4" />}>Arşive kaldır</Button>}
          <Button variant="subtle" loading={busy != null && !busy.startsWith('Kuyru')} onClick={save} icon={<Save className="w-4 h-4" />}>Kaydet</Button>
        </div>
      </div>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <video ref={vref} src={item.original_url ?? item.url} controls playsInline preload="metadata" className="w-full max-h-[60vh] rounded-xl bg-ink-900" onLoadedMetadata={(e) => { if (!dur) setEnd((e.target as HTMLVideoElement).duration); }} />
          <div className="text-[11px] text-ink-400">{fmtSec(item.duration_sec)} · {item.width && item.height ? `${item.width}×${item.height} ${item.height > item.width ? '(dikey)' : '(yatay)'}` : ''} {fmtMb(item.size_bytes)} · Yüklendi: {fmtDateTime(item.created_at)}</div>

          <Panel title={<span className="inline-flex items-center gap-2"><Scissors className="w-4 h-4" />Düzenleme</span>}>
            {dur > 0 ? (<div className="space-y-3">
              <Field label={`Başlangıç: ${fmtSec(start)}`}><input type="range" min={0} max={dur} step={0.1} value={start} onChange={(e) => { const v = Math.min(Number(e.target.value), end - 1); setStart(v); if (vref.current) vref.current.currentTime = v; }} className="w-full" /></Field>
              <Field label={`Bitiş: ${fmtSec(end)}`}><input type="range" min={0} max={dur} step={0.1} value={end} onChange={(e) => { const v = Math.max(Number(e.target.value), start + 1); setEnd(v); if (vref.current) vref.current.currentTime = Math.max(start, v - 2); }} className="w-full" /></Field>
              <div className="text-xs text-ink-300">Paylaşılacak süre: <b>{fmtSec(cutLen)}</b></div>
              <label className="flex items-center gap-2 text-sm text-ink-200"><input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} /><VolumeX className="w-4 h-4" />Sesi kaldır</label>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={setCover} loading={busy === 'Kapak kaydediliyor'} icon={<ImageIcon className="w-4 h-4" />}>Şu anki kareyi kapak yap</Button>
              </div>
              {trimChanged && <Notice tone="info">Kaydet’e bastığınızda seçtiğiniz bölüm gerçek bir yeni video dosyası olarak oluşturulur ({fmtSec(cutLen)} sürer — video o süre boyunca işlenir, ekranı kapatmayın). Orijinal dosya silinmez.</Notice>}
              {!fmt && <Notice tone="warn">Bu tarayıcı kırpmayı desteklemiyor; Chrome kullanın. Diğer bilgiler yine kaydedilir.</Notice>}
              {fmt?.ext === 'webm' && trimChanged && <Notice tone="warn">Bu tarayıcı kırpılmış videoyu WebM olarak üretir: YouTube kabul eder, Instagram kabul etmez. Instagram için kırpmadan paylaşın veya Chrome’un güncel sürümünü kullanın.</Notice>}
            </div>) : <p className="text-xs text-ink-400">Video süresi okunamadı; kırpma kullanılamıyor.</p>}
          </Panel>
        </div>

        <div className="space-y-3">
          <Field label="Başlık"><input className="ops-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
          <Field label="Açıklama (paylaşımda görünür)"><textarea className="ops-input w-full min-h-[90px]" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ör. 18 metre Manitou ile Güngören şantiyesinde malzeme taşıma. Teklif: 0531 436 29 04" /></Field>
          <Field label="Etiketler"><input className="ops-input w-full" value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></Field>
          <Field label="Hangi uygulamalarda paylaşılacak?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TARGETS.filter((t) => t.needsVideo || t.key !== 'ig_post').map((t) => (
                <label key={t.key} className={cx('flex items-center gap-2 rounded-lg ring-1 px-2 py-1.5 text-xs', targets.includes(t.key) ? 'ring-brand-green bg-emerald-50' : 'ring-ink-700')}>
                  <input type="checkbox" checked={targets.includes(t.key)} onChange={(e) => setTargets((cur) => (e.target.checked ? [...cur, t.key] : cur.filter((x) => x !== t.key)))} />
                  <span className="flex-1 text-ink-100">{t.label}</span>
                  <span className={cx('text-[10px]', conn(t.platform) ? 'text-emerald-700' : 'text-amber-700')}>{conn(t.platform) ? 'bağlı' : 'bağlı değil'}</span>
                </label>
              ))}
            </div>
          </Field>
          {warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
          <Panel title={<span className="inline-flex items-center gap-2"><CalendarClock className="w-4 h-4" />Yayın Kuyruğu’na gönder</span>}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Gün"><input type="date" className="ops-input w-full" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Saat"><input type="time" className="ops-input w-full" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            </div>
            <Button variant="primary" className="mt-2 w-full" loading={busy === 'Kuyruğa ekleniyor'} onClick={toQueue} icon={<Send className="w-4 h-4" />}>Kaydet ve kuyruğa gönder</Button>
            <p className="text-[11px] text-ink-400 mt-1.5">Seçilen her uygulama için ayrı paylaşım oluşur. Hesap bağlı değilse paylaşım sırada bekler, bağlanınca gönderilir.{item.draft_ids.length ? ` Bu video daha önce ${item.draft_ids.length} kez kuyruğa eklendi.` : ''}</p>
          </Panel>
          <Button variant="subtle" className="w-full" onClick={async () => {
            setErr(null);
            try {
              const r = await shareToPhone({ title, caption, hashtags: tagList(), video_url: item.url });
              if (r === 'copied') setErr('Bu tarayıcı dosya paylaşımını desteklemiyor; açıklama kopyalandı. Videoyu “İndir” ile kaydedip uygulamada paylaşabilirsiniz.');
              if (r === 'shared' && window.confirm('Paylaşımı tamamladınız mı? “Tamam” derseniz aktivite günlüğüne “elle paylaşıldı” olarak yazılır.')) {
                const platform = TARGETS.find((t) => targets.includes(t.key))?.platform ?? 'instagram';
                await db().from('connector_activity').insert({ connector_key: platform, action: 'manual_share', status: 'ok', ref_type: 'media_library', ref_id: item.id, summary: `Telefondan elle paylaşıldı (video): “${title.slice(0, 80)}”` });
                const row = unwrap(await db().from('media_library').update({ status: 'published' }).eq('id', item.id).select('*').single()) as MediaItem;
                onSaved(row);
              }
            } catch (e) { setErr(errorText(e)); }
          }} icon={<Share2 className="w-4 h-4" />}>Telefondan paylaş (hesap bağlamadan)</Button>
          <p className="text-[11px] text-ink-400 -mt-1">Telefonun paylaşım menüsü açılır: Instagram, Facebook, YouTube veya WhatsApp’ı seçin. Açıklama otomatik kopyalanır, uygulamada “yapıştır” deyin.</p>
          {busy && <Notice tone="info">{busy}…</Notice>}
          {err && <Notice tone="error">{err}</Notice>}
        </div>
      </div>
    </Modal>
  );
}
