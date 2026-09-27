// Reels Montaj Stüdyosu: havuzdan sahne seç (video/fotoğraf) → şablon (inşaat aşamaları, manitou iş başında…) → dikey tanıtım videosu.
// Üretilen video Video Havuzu'na kaydolur (kaynak: montaj); İçerik Fabrikası Reels için önce montajları kullanır.
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clapperboard, X } from 'lucide-react';
import { errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { recorderFormat, uploadBlob } from '../lib/media';
import { MONTAGE_TEMPLATES, renderMontage, type MontageClip } from '../lib/montage';
import { Button, cx, Field, Modal, Notice, StateView } from '../ui';

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
  const pool = useQuery(async () => unwrap(await db().from('media_library').select('id,kind,url,cover_url,title,duration_sec,edit').eq('kind', tab).is('archived_at', null)
    .neq('source', 'montage').order('created_at', { ascending: false }).limit(150)) as PoolItem[], [] as PoolItem[], [tab]);
  const brands = useQuery(async () => unwrap(await db().from('brand_kits').select('name,phone,website')) as Array<{ name: string; phone: string | null; website: string | null }>, [], []);
  const kit = brands.data.find((b) => b.name === tpl.brand) ?? brands.data[0];
  const fmt = useMemo(() => recorderFormat(), []);
  const total = scenes.reduce((s, c) => s + c.seconds, 0) + 3;

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

  // Tek montaj üret + havuza kaydet (elle seçim ve otomatik Shorts ortak kullanır)
  const produce = async (t: typeof tpl, ttl: string, ctaText: string, list: Scene[], note = '') => {
    const clips: MontageClip[] = list.map((s) => ({ url: s.url, kind: s.kind, label: s.label.trim() || 'Sahne', seconds: s.seconds }));
    const dur = list.reduce((x, c) => x + c.seconds, 0) + 3;
    const out = await renderMontage(clips, { brand: t.brand, title: ttl.trim() || t.title, phone: kit?.phone ?? '0531 436 29 04', website: kit?.website ?? '', cta: ctaText.trim() || t.cta, emblem: t.emblem, hook: t.hook },
      (p, n) => setBusy({ p, note: `${note}${n}` }));
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
  // Otomatik Shorts: 3 şablon × havuzdan rastgele 4 video (3'er sn) → açılış merak sorusu + adım yazıları + kapanış kartı
  const autoShorts = async () => {
    setErr(null); setResult(null);
    try {
      const vids = unwrap(await db().from('media_library').select('id,url,cover_url,edit').eq('kind', 'video').is('archived_at', null).neq('source', 'montage').limit(200)) as Array<{ id: string; url: string; cover_url: string | null; edit: { codec?: string } | null }>;
      const ok = vids.filter((v) => v.edit?.codec !== 'hevc');
      if (ok.length < 4) throw new Error('Havuzda en az 4 video gerekli');
      const keys = ['asamalar', 'villa', 'santiye'];
      let last = '';
      for (const [n, k] of keys.entries()) {
        const t = MONTAGE_TEMPLATES.find((x) => x.key === k)!;
        const pick = [...ok].sort(() => Math.random() - 0.5).slice(0, 4);
        const list: Scene[] = pick.map((v, i) => ({ id: v.id, url: v.url, kind: 'video', thumb: v.cover_url ?? v.url, label: t.labels[i] ?? `Sahne ${i + 1}`, seconds: 3 }));
        last = await produce(t, t.title, t.cta, list, `Shorts ${n + 1}/3 · `);
      }
      setResult(last); onDone();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  };

  return (
    <Modal open wide onClose={busy ? () => undefined : onClose} title={<span className="inline-flex items-center gap-2"><Clapperboard className="w-4 h-4 text-brand-green" />Reels montajı</span>}
      footer={<>
        <span className="flex-1 text-xs text-ink-400">{scenes.length ? `${scenes.length} sahne · yaklaşık ${Math.round(total)} sn` : 'Havuzdan 2–6 sahne seçin'}</span>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={onClose}>Kapat</Button>
        <Button variant="subtle" loading={Boolean(busy)} disabled={!fmt} onClick={autoShorts} icon={<Clapperboard className="w-4 h-4" />}>Otomatik 3 Shorts</Button>
        <Button variant="primary" loading={Boolean(busy)} disabled={scenes.length < 2 || !fmt} onClick={make} icon={<Clapperboard className="w-4 h-4" />}>Videoyu oluştur</Button>
      </>}>
      <div className="space-y-3">
        {!fmt && <Notice tone="warn">Bu tarayıcı video üretmeyi desteklemiyor. Bilgisayarda veya Android’de Chrome ile açın.</Notice>}
        {fmt?.ext === 'webm' && <Notice tone="warn">Bu tarayıcı videoyu WebM üretir (YouTube kabul eder, Instagram etmez). Instagram için güncel Chrome kullanın.</Notice>}
        <div className="flex flex-wrap gap-1.5">{MONTAGE_TEMPLATES.map((t) => (
          <button key={t.key} onClick={() => pickTemplate(t.key)} className={cx('rounded-full px-3 py-1.5 text-xs font-semibold ring-1', tplKey === t.key ? 'bg-brand-green text-white ring-brand-green' : 'ring-ink-700 text-ink-300')}>{t.name}</button>))}</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Başlık (üst şerit ve kapanış kartı)"><input className="ops-input w-full" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Alt şerit yazısı"><input className="ops-input w-full" value={cta} maxLength={34} onChange={(e) => setCta(e.target.value)} /></Field>
        </div>

        {scenes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-ink-200">Sahne sırası (her sahnenin üstünde bu yazı çıkar)</div>
            {scenes.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl ring-1 ring-ink-700 p-1.5">
                <img src={s.thumb} alt="" className="w-10 h-14 object-cover rounded-md bg-ink-900" />
                <span className="text-xs font-bold text-ink-400 w-4">{i + 1}</span>
                <input className="ops-input flex-1 !py-1" value={s.label} maxLength={24} onChange={(e) => patch(i, { label: e.target.value })} />
                <select className="ops-input !w-auto !py-1" value={s.seconds} onChange={(e) => patch(i, { seconds: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} sn</option>)}</select>
                <button onClick={() => move(i, -1)} className="p-1 text-ink-400"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} className="p-1 text-ink-400"><ArrowDown className="w-4 h-4" /></button>
                <button onClick={() => setScenes((cur) => cur.filter((x) => x.id !== s.id))} className="p-1 text-ink-400"><X className="w-4 h-4" /></button>
              </div>))}
          </div>
        )}

        <div className="flex gap-1.5">{([['video', 'Videolar'], ['image', 'Fotoğraflar']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', tab === k ? 'bg-ink-750 text-ink-100 ring-1 ring-brand-green' : 'bg-ink-800 text-ink-300')}>{l}</button>)}</div>
        {pool.loading && !pool.data.length ? <StateView kind="loading" compact /> : !pool.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Havuzda bu türde içerik yok." compact /> : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-[38vh] overflow-y-auto">
            {pool.data.map((m) => { const n = scenes.findIndex((s) => s.id === m.id); return (
              <button key={m.id} onClick={() => toggle(m)} className={cx('relative rounded-lg overflow-hidden ring-2 bg-ink-900', n >= 0 ? 'ring-brand-green' : 'ring-transparent')}>
                <img src={m.cover_url ?? m.url} alt="" loading="lazy" className="w-full aspect-[9/16] object-cover" />
                {n >= 0 && <span className="absolute right-1 top-1 rounded-full bg-brand-green text-white text-[10px] font-bold px-1.5">{n + 1}</span>}
                {m.edit?.codec === 'hevc' && <span className="absolute left-1 top-1 rounded bg-amber-500 text-white text-[8px] font-bold px-1">iPhone</span>}
              </button>); })}
          </div>)}

        {busy && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><div className="h-full bg-brand-green transition-all" style={{ width: `${Math.round(busy.p * 100)}%` }} /></div>
            <div className="text-xs text-ink-300">{busy.note} — video gerçek sürede işlenir; ekranı kapatmayın, sekmeyi değiştirmeyin.</div>
          </div>
        )}
        {err && <Notice tone="error">{err}</Notice>}
        {result && (<div className="space-y-2"><Notice tone="ok">Montaj hazır ve Video Havuzu’na kaydedildi. Üzerine dokunup açıklama ekleyebilir, Yayın Kuyruğu’na gönderebilirsiniz.</Notice>
          <video src={result} controls playsInline className="w-full max-h-[50vh] rounded-xl bg-ink-900" /></div>)}
      </div>
    </Modal>
  );
}
