// Reels Montaj Stüdyosu: havuzdan sahne seç (video/fotoğraf) → şablon (inşaat aşamaları, manitou iş başında…) → dikey tanıtım videosu.
// Üretilen video Video Havuzu'na kaydolur (kaynak: montaj); İçerik Fabrikası Reels için önce montajları kullanır.
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Clapperboard, ExternalLink, Music, Play, Square, Volume2, X } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { recorderFormat, uploadBlob } from '../lib/media';
import { MONTAGE_TEMPLATES, renderMontage, type MontageClip } from '../lib/montage';
import { Button, cx, Field, Modal, Notice, StateView } from '../ui';
import { DEMO_AUDIO_TRACKS, DEMO_VIDEOS, isDemoMode } from '../lib/demoData';

interface PoolItem { id: string; kind: 'video' | 'image'; url: string; cover_url: string | null; title: string; duration_sec: number | null; edit: { codec?: string } | null }
interface Scene { id: string; url: string; kind: 'video' | 'image'; thumb: string; label: string; seconds: number }

export function MontageStudio({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tplKey, setTplKey] = useState(MONTAGE_TEMPLATES[0].key);
  const tpl = MONTAGE_TEMPLATES.find((t) => t.key === tplKey)!;
  const [title, setTitle] = useState(tpl.title);
  const [cta, setCta] = useState(tpl.cta);
  const [tab, setTab] = useState<'video' | 'image'>('video');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [busy, setBusy] = useState<{ p: number; note: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Müzik seçimi & ses kontrolü
  const [musicTrack, setMusicTrack] = useState<string>(DEMO_AUDIO_TRACKS[0].src);
  const [musicVolume, setMusicVolume] = useState<number>(0.7);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const pool = useQuery(async () => {
    let items = unwrap(await db().from('media_library').select('id,kind,url,cover_url,title,duration_sec,edit').eq('kind', tab).is('archived_at', null)
      .neq('source', 'montage').order('created_at', { ascending: false }).limit(150)) as PoolItem[];
    if ((!items || items.length === 0) && tab === 'video' && isDemoMode()) {
      items = DEMO_VIDEOS.map((v) => ({
        id: v.id,
        kind: 'video',
        url: v.url,
        cover_url: v.cover_url,
        title: v.title,
        duration_sec: v.duration_sec,
        edit: null,
      }));
    }
    return items;
  }, [] as PoolItem[], [tab]);

  const brands = useQuery(async () => unwrap(await db().from('brand_kits').select('name,phone,website')) as Array<{ name: string; phone: string | null; website: string | null }>, [], []);
  const kit = brands.data.find((b) => b.name === tpl.brand) ?? brands.data[0];
  const fmt = useMemo(() => recorderFormat(), []);
  const total = scenes.reduce((s, c) => s + c.seconds, 0) + 3;

  const toggleAudioPreview = () => {
    if (!musicTrack) return;
    if (isPlayingAudio && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(musicTrack);
      } else {
        audioPreviewRef.current.src = musicTrack;
      }
      audioPreviewRef.current.volume = musicVolume;
      audioPreviewRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const pickTemplate = (k: string) => {
    const t = MONTAGE_TEMPLATES.find((x) => x.key === k)!;
    setTplKey(k); setTitle(t.title); setCta(t.cta);
    setScenes((cur) => cur.map((s, i) => ({ ...s, label: t.labels[i] ?? s.label })));
  };
  const toggle = (m: PoolItem) => setScenes((cur) => {
    if (cur.some((s) => s.id === m.id)) return cur.filter((s) => s.id !== m.id);
    if (cur.length >= 6) return cur;
    return [...cur, { id: m.id, url: m.url, kind: m.kind, thumb: m.cover_url ?? m.url, label: tpl.labels[cur.length] ?? `Sahne ${cur.length + 1}`, seconds: m.kind === 'image' ? 3 : Math.min(4, Math.max(2, Math.floor(m.duration_sec ?? 4))) }];
  });
  const move = (i: number, d: number) => setScenes((cur) => { const n = [...cur]; const j = i + d; if (j < 0 || j >= n.length) return cur; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const patch = (i: number, p: Partial<Scene>) => setScenes((cur) => cur.map((s, k) => (k === i ? { ...s, ...p } : s)));

  // Tek montaj üret + havuza kaydet (arkada fon müziği ile birlikte)
  const produce = async (t: typeof tpl, ttl: string, ctaText: string, list: Scene[], note = '') => {
    const clips: MontageClip[] = list.map((s) => ({ url: s.url, kind: s.kind, label: s.label.trim() || 'Sahne', seconds: s.seconds }));
    const dur = list.reduce((x, c) => x + c.seconds, 0) + 3;
    const out = await renderMontage(
      clips,
      {
        brand: t.brand,
        title: ttl.trim() || t.title,
        phone: kit?.phone ?? '0531 436 29 04',
        website: kit?.website ?? '',
        cta: ctaText.trim() || t.cta,
        emblem: t.emblem,
        hook: t.hook,
        musicUrl: musicTrack || undefined,
        musicVolume,
      },
      (p, n) => setBusy({ p, note: `${note}${n}` })
    );
    setBusy({ p: 1, note: `${note}Havuza kaydediliyor…` });
    const up = await uploadBlob(out.blob, out.ext, out.contentType);
    const cov = await uploadBlob(out.cover, 'jpg', 'image/jpeg').catch(() => null);
    const tags = t.key === 'manitou' ? ['#manitou', '#manitoukiralama', '#şantiye', '#istanbul', '#embayyapı', '#shorts'] : ['#inşaat', '#villa', '#çatalca', '#istanbul', '#embayyapı', '#shorts'];
    unwrap(await db().from('media_library').insert({
      kind: 'video', title: `${t.hook}`.slice(0, 120), url: up.url, original_url: up.url, storage_path: up.path, cover_url: cov?.url ?? null, mime: out.contentType,
      size_bytes: out.blob.size, duration_sec: dur, width: 1080, height: 1920, targets: ['ig_reel', 'yt_short', 'fb_post'], source: 'montage', pillar: t.key, status: 'pool',
      caption: `${t.hook} ${ttl}. ${ctaText}. ☎ ${kit?.phone ?? '0531 436 29 04'} · ${kit?.website ?? 'www.embayyapi.com.tr'}`, hashtags: tags,
      edit: { codec: out.ext === 'mp4' ? 'h264' : 'vp9', montage: { template: t.key, hook: t.hook, scenes: list.map((s) => ({ id: s.id, label: s.label, seconds: s.seconds })) } },
    }).select('id'));
    return up.url;
  };
  const make = async () => {
    setErr(null); setResult(null);
    try { setResult(await produce(tpl, title, cta, scenes)); onDone(); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };
  // Otomatik Shorts: 3 şablon × havuzdan rastgele 4 video
  const autoShorts = async () => {
    setErr(null); setResult(null);
    try {
      const vids = unwrap(await db().from('media_library').select('id,url,cover_url,edit').eq('kind', 'video').is('archived_at', null).neq('source', 'montage').limit(200)) as Array<{ id: string; url: string; cover_url: string | null; edit: { codec?: string } | null }>;
      const ok = vids.filter((v) => v.edit?.codec !== 'hevc');
      const poolVideos = ok.length >= 4 ? ok : DEMO_VIDEOS;
      const keys = ['asamalar', 'villa', 'santiye'];
      let last = '';
      for (const [n, k] of keys.entries()) {
        const t = MONTAGE_TEMPLATES.find((x) => x.key === k)!;
        const pick = [...poolVideos].sort(() => Math.random() - 0.5).slice(0, 4);
        const list: Scene[] = pick.map((v, i) => ({ id: v.id, url: v.url, kind: 'video', thumb: v.cover_url ?? v.url, label: t.labels[i] ?? `Sahne ${i + 1}`, seconds: 3 }));
        last = await produce(t, t.title, t.cta, list, `Shorts ${n + 1}/3 · `);
      }
      setResult(last); onDone();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };

  return (
    <Modal open wide onClose={busy ? () => undefined : onClose} title={<span className="inline-flex items-center gap-2"><Clapperboard className="w-5 h-5 text-brand-green" /><span>Reels Montaj & Video Birleştirme Stüdyosu</span></span>}
      footer={<>
        <span className="flex-1 text-xs text-ink-400 font-semibold">{scenes.length ? `${scenes.length} sahne · yaklaşık ${Math.round(total)} sn` : 'Havuzdan 2–6 sahne seçin'}</span>
        <a href="https://www.canva.com/create/instagram-reels/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">
          <ExternalLink className="w-3.5 h-3.5" /> Canva’da Video Yap
        </a>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={onClose}>Kapat</Button>
        <Button variant="subtle" loading={Boolean(busy)} disabled={!fmt} onClick={autoShorts} icon={<Clapperboard className="w-4 h-4" />}>Otomatik 3 Shorts</Button>
        <Button variant="primary" loading={Boolean(busy)} disabled={scenes.length < 2 || !fmt} onClick={make} icon={<Clapperboard className="w-4 h-4" />}>Videoları Birleştir & Üret</Button>
      </>}>
      <div className="space-y-4">
        {!fmt && <Notice tone="warn">Bu tarayıcı video üretmeyi desteklemiyor. Bilgisayarda veya Android’de Chrome ile açın.</Notice>}
        {fmt?.ext === 'webm' && <Notice tone="warn">Bu tarayıcı videoyu WebM üretir (YouTube kabul eder, Instagram etmez). Instagram için güncel Chrome kullanın.</Notice>}
        
        <div className="flex flex-wrap gap-1.5">{MONTAGE_TEMPLATES.map((t) => (
          <button key={t.key} onClick={() => pickTemplate(t.key)} className={cx('rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition', tplKey === t.key ? 'bg-brand-green text-white ring-brand-green shadow-sm' : 'ring-ink-700 text-ink-300 hover:bg-ink-800')}>{t.name}</button>))}</div>
        
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Başlık (üst şerit ve kapanış kartı)"><input className="ops-input w-full font-semibold" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Alt şerit yazısı (CTA)"><input className="ops-input w-full" value={cta} maxLength={34} onChange={(e) => setCta(e.target.value)} /></Field>
        </div>

        {/* Fon Müziği Seçimi & Ses Ayarı */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-brand-green" /> Arka Plan Fon Müziği
            </span>
            <button
              type="button"
              onClick={toggleAudioPreview}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs"
            >
              {isPlayingAudio ? <><Square className="w-3 h-3 fill-emerald-700" /> Müziği Durdur</> : <><Play className="w-3 h-3 fill-emerald-700" /> Müziği Dinle</>}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <select
              className="ops-input text-xs font-semibold"
              value={musicTrack}
              onChange={(e) => setMusicTrack(e.target.value)}
            >
              {DEMO_AUDIO_TRACKS.map((track) => (
                <option key={track.id} value={track.src}>{track.name} ({track.mood})</option>
              ))}
              <option value="">Fon Müziği Ekleme (Sessiz / Orijinal)</option>
            </select>
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <Volume2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="w-16">Ses: %{Math.round(musicVolume * 100)}</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {scenes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-ink-100 flex items-center justify-between">
              <span>Seçilen Sahne Sırası (Sürükleyin veya Sıralayın)</span>
              <span className="text-[11px] font-mono text-brand-green font-semibold">{scenes.length} sahne seçili</span>
            </div>
            {scenes.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl border border-ink-700 bg-white p-2 shadow-xs">
                <img src={s.thumb} alt="" className="w-12 h-14 object-cover rounded-lg bg-ink-900 shrink-0" />
                <span className="text-xs font-bold text-brand-green w-5">{i + 1}</span>
                <input className="ops-input flex-1 !py-1 text-xs font-semibold" value={s.label} maxLength={24} onChange={(e) => patch(i, { label: e.target.value })} />
                <select className="ops-input !w-auto !py-1 text-xs" value={s.seconds} onChange={(e) => patch(i, { seconds: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} sn</option>)}</select>
                <button onClick={() => move(i, -1)} className="p-1 text-ink-400 hover:text-ink-100"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} className="p-1 text-ink-400 hover:text-ink-100"><ArrowDown className="w-4 h-4" /></button>
                <button onClick={() => setScenes((cur) => cur.filter((x) => x.id !== s.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X className="w-4 h-4" /></button>
              </div>))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1.5">
              {([['video', 'Video Klipleri'], ['image', 'Fotoğraflar']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={cx('rounded-xl px-3 py-1.5 text-xs font-semibold transition', tab === k ? 'bg-ink-750 text-ink-100 ring-1 ring-brand-green' : 'bg-ink-800 text-ink-300 hover:bg-ink-700')}>{l}</button>
              ))}
            </div>
            <span className="text-[11px] text-ink-400">Dokunarak kurguya ekleyin veya çıkarın</span>
          </div>

          {pool.loading && !pool.data.length ? <StateView kind="loading" compact /> : !pool.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Havuzda bu türde içerik yok." compact /> : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[34vh] overflow-y-auto p-1 border border-ink-800 rounded-xl bg-ink-950/20">
              {pool.data.map((m) => {
                const n = scenes.findIndex((s) => s.id === m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m)} className={cx('relative rounded-xl overflow-hidden ring-2 bg-ink-900 transition hover:scale-98', n >= 0 ? 'ring-brand-green shadow-md' : 'ring-transparent opacity-85 hover:opacity-100')}>
                    <img src={m.cover_url ?? m.url} alt="" loading="lazy" className="w-full aspect-[9/16] object-cover" />
                    {n >= 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-green text-white text-xs font-bold w-6 h-6 flex items-center justify-center shadow-md">{n + 1}</span>}
                    {m.duration_sec && <span className="absolute bottom-1 right-1 rounded bg-black/70 text-white text-[9px] font-mono px-1">{Math.round(m.duration_sec)}s</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {busy && (
          <div className="space-y-1.5 p-3 rounded-xl bg-ink-850 border border-brand-green/40">
            <div className="h-2.5 rounded-full bg-ink-700 overflow-hidden"><div className="h-full bg-brand-green transition-all" style={{ width: `${Math.round(busy.p * 100)}%` }} /></div>
            <div className="text-xs text-ink-200 font-semibold">{busy.note} — video arka planda kare kare işlenip fon müziğiyle miksleniyor...</div>
          </div>
        )}
        {err && <Notice tone="error">{err}</Notice>}
        {result && (
          <div className="space-y-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <Notice tone="ok">Birleştirilmiş Reels videosu başarıyla üretildi ve Video Havuzu'na kaydedildi!</Notice>
            <video src={result} controls playsInline className="w-full max-h-[45vh] rounded-xl bg-black shadow-lg" />
          </div>
        )}
      </div>
    </Modal>
  );
}
