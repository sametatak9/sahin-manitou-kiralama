// VİDEO STÜDYOSU: panelden video kurgulama ve düzeltme.
// • Yeni kurgu: medya havuzundan video/fotoğraf seç → sırala, kırp, alt yazı yaz, merak cümlesi + kapanış + müzik → render.
// • Videoyu düzelt: mevcut videoda baştan/sondan kırp, istenmeyen aralığı kes, sesi kapat, kapanış kartı / müzik ekle.
// Render GitHub Actions'ta yapılır (10–20 dk); bitince burada önizlenir, tek tıkla İçerik Havuzu'na eklenir.
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Clapperboard, Film, Image as ImageIcon, Plus, RotateCcw, Scissors, Send, Trash2, Wand2, X } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { callOps, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Button, cx, Field, Modal, Notice, StateView } from '../ui';

interface Media { id: string; kind: 'video' | 'image' | 'banner'; url: string; cover_url: string | null; title: string; source: string | null; notes: string | null; created_at: string }
interface Job { id: string; kind: 'montage' | 'fix'; title: string; status: string; output_url: string | null; cover_url: string | null; error: string | null; version: number; created_at: string; finished_at: string | null; spec: Record<string, unknown>; caption: string | null; hashtags: string[]; draft_ids: string[]; qc: { sorunlar?: string[]; sure_sn?: number } | null }
interface Clip { url: string; kind: 'video' | 'image'; start: number; dur: number; caption: string; thumb: string | null; title: string }

const MUSIC: Array<[string, string]> = [['house_120_7', 'Sakin house (önerilen)'], ['house_124_3', 'House 124'], ['funk_128_11', 'Funk 128'], ['funk_130_9', 'Funk 130'], ['afro_108_4', 'Afro 108'], ['phonk_125_8', 'Phonk 125'], ['none', 'Müziksiz (Instagram’da şarkı eklenecek)']];
const STATUS: Record<string, [string, string]> = {
  queued: ['Sırada', 'bg-sky-100 text-sky-800'], rendering: ['Hazırlanıyor…', 'bg-amber-100 text-amber-800'], done: ['Hazır', 'bg-emerald-100 text-emerald-800'],
  failed: ['Hata', 'bg-rose-100 text-rose-800'], cancelled: ['İptal', 'bg-slate-100 text-slate-600'],
};
const PUBLIC = /\/storage\/v1\/object\/public\/|embay-panel\.vercel\.app\/|embayyapi\.vercel\.app\//;

function useMedia() {
  return useQuery(async () => (unwrap(await db().from('media_library').select('id,kind,url,cover_url,title,source,notes,created_at')
    .in('kind', ['video', 'image']).is('archived_at', null).order('created_at', { ascending: false }).limit(400)) as Media[]).filter((m) => PUBLIC.test(m.url)), [] as Media[], [], ['media_library']);
}

export function VideoEditorPanel() {
  const jobs = useQuery(async () => unwrap(await db().from('video_edit_jobs').select('*').is('archived_at', null).order('created_at', { ascending: false }).limit(40)) as Job[], [] as Job[], [], ['video_edit_jobs']);
  const [mode, setMode] = useState<null | { kind: 'montage'; from?: Job } | { kind: 'fix'; url?: string; from?: Job }>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ tone: 'ok', text: ok }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); jobs.reload(); }
  };
  const active = jobs.data.filter((j) => ['queued', 'rendering'].includes(j.status)).length;

  return (
    <div className="space-y-4">
      <section className="ops-hero">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="ops-kicker">VİDEO STÜDYOSU</div>
            <h2 className="ops-hero-title">Videoyu panelden kurgula, düzelt, yayına gönder</h2>
            <p className="ops-hero-text">Klipleri seç, sırala, kırp; alt yazı ve merak cümlesi yaz. Hazır bir videoda istenmeyen kısmı kes, sesi kapat ya da kapanış kartı ekle. Her video otomatik kalite kontrolünden geçer.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ops-hero-btn-primary" onClick={() => setMode({ kind: 'montage' })}><Clapperboard className="w-4 h-4" />Yeni kurgu</button>
            <button type="button" className="ops-hero-btn" onClick={() => setMode({ kind: 'fix' })}><Scissors className="w-4 h-4" />Videoyu düzelt</button>
          </div>
        </div>
        {active > 0 && <p className="text-[12px] mt-3 text-white/90">⏳ {active} video hazırlanıyor — 15 dakikada bir işlenir, hazır olunca burada görünür.</p>}
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {jobs.loading && !jobs.data.length ? <StateView kind="loading" compact /> : !jobs.data.length ? (
        <StateView kind="empty" title="Henüz panel kurgusu yok" message="“Yeni kurgu” ile medya havuzundaki video ve fotoğraflardan Reels hazırlayın ya da “Videoyu düzelt” ile hazır bir videoyu kırpın." />
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {jobs.data.map((j) => {
            const [label, cls] = STATUS[j.status] ?? [j.status, 'bg-slate-100'];
            return (
              <li key={j.id} className="ops-card overflow-hidden">
                <div className="relative aspect-[9/16] bg-[#0E1E46]">
                  {j.status === 'done' && j.output_url ? <video src={j.output_url} poster={j.cover_url ?? undefined} controls preload="none" playsInline className="w-full h-full object-cover" />
                    : <div className="absolute inset-0 grid place-items-center text-white/70 text-[12px] p-4 text-center">{j.status === 'failed' ? j.error : j.kind === 'fix' ? 'Düzeltme' : 'Kurgu'} · v{j.version}</div>}
                  <span className={cx('absolute top-2 left-2 rounded-full text-[10px] font-bold px-2 py-0.5', cls)}>{label}</span>
                </div>
                <div className="p-2.5 space-y-2">
                  <div>
                    <div className="text-[12px] font-semibold text-ink-100 line-clamp-2">{j.title} <span className="text-ink-500 font-normal">v{j.version}</span></div>
                    <div className="text-[10px] text-ink-400">{j.kind === 'fix' ? 'Düzeltme' : 'Kurgu'} · {fmtDateTime(j.finished_at || j.created_at)}{j.qc?.sure_sn ? ` · ${j.qc.sure_sn} sn` : ''}</div>
                    {j.qc && <div className={cx('text-[10px] mt-0.5', j.qc.sorunlar?.length ? 'text-amber-700' : 'text-emerald-700')}>{j.qc.sorunlar?.length ? `⚠ ${j.qc.sorunlar.join(' · ')}` : '✓ Kalite kontrolü geçti'}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {j.status === 'done' && (j.draft_ids?.length
                      ? <span className="text-[10px] font-semibold text-emerald-700">✓ İçerik Havuzu’nda</span>
                      : <Button variant="primary" className="!px-2.5 !py-1.5" icon={<Send className="w-3.5 h-3.5" />} loading={busy === j.id} onClick={() => act(j.id, () => callOps('video_edit_pool', { id: j.id }), 'İçerik Havuzu’na eklendi (Instagram + Facebook). Yayın Merkezi → Havuz’dan planlayın.')}>Havuza ekle</Button>)}
                    {j.kind === 'montage' && <Button className="!px-2.5 !py-1.5" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setMode({ kind: 'montage', from: j })}>Yeni sürüm</Button>}
                    {j.status === 'done' && j.output_url && <Button className="!px-2.5 !py-1.5" icon={<Scissors className="w-3.5 h-3.5" />} onClick={() => setMode({ kind: 'fix', url: j.output_url!, from: j })}>Düzelt</Button>}
                    {['queued', 'failed'].includes(j.status) && <Button variant="danger" className="!px-2.5 !py-1.5" icon={<X className="w-3.5 h-3.5" />} loading={busy === j.id} onClick={() => act(j.id, () => callOps('video_edit_cancel', { id: j.id }), 'İptal edildi')}>İptal</Button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {mode?.kind === 'montage' && <MontageModal from={mode.from} onClose={() => setMode(null)} onDone={(t) => { setMode(null); setMsg({ tone: 'ok', text: t }); jobs.reload(); }} />}
      {mode?.kind === 'fix' && <FixModal url={mode.url} from={mode.from} onClose={() => setMode(null)} onDone={(t) => { setMode(null); setMsg({ tone: 'ok', text: t }); jobs.reload(); }} />}
    </div>
  );
}

function MediaPicker({ onPick, only }: { onPick: (m: Media) => void; only?: 'video' | 'image' }) {
  const media = useMedia();
  const [f, setF] = useState<'all' | 'video' | 'image'>(only ?? 'all');
  const [q, setQ] = useState('');
  const list = useMemo(() => media.data.filter((m) => (f === 'all' || m.kind === f) && (!q || `${m.title} ${m.notes ?? ''}`.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')))).slice(0, 120), [media.data, f, q]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {!only && (['all', 'video', 'image'] as const).map((k) => <button key={k} type="button" onClick={() => setF(k)} className={cx('ops-chip', f === k && 'ops-chip-on')}>{k === 'all' ? 'Hepsi' : k === 'video' ? 'Videolar' : 'Fotoğraflar'}</button>)}
        <input className="ops-input !py-1.5 flex-1 min-w-[140px]" placeholder="Ara (ör. Ferhat, villa, şömine)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {media.loading && !media.data.length ? <StateView kind="loading" compact /> : (
        <ul className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-[300px] overflow-y-auto ops-scroll">
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m)} title={m.notes ?? m.title} className="relative block w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#0E1E46] ring-1 ring-ink-700 hover:ring-2 hover:ring-[var(--color-brand-green)]">
                {m.kind === 'image' ? <img src={m.cover_url || m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  : m.cover_url ? <img src={m.cover_url} alt="" loading="lazy" className="w-full h-full object-cover" /> : <video src={`${m.url}#t=1`} preload="metadata" muted className="w-full h-full object-cover" />}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 text-white px-1 py-0.5">{m.kind === 'video' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MontageModal({ from, onClose, onDone }: { from?: Job; onClose: () => void; onDone: (t: string) => void }) {
  const s = (from?.spec ?? {}) as { clips?: Clip[]; hook?: string; end_line?: string; music?: string; grade?: boolean; stabilize?: boolean };
  const [clips, setClips] = useState<Clip[]>((s.clips ?? []).map((c) => ({ ...c, thumb: null, title: '' })));
  const [title, setTitle] = useState(from?.title ?? '');
  const [hook, setHook] = useState(s.hook ?? 'Bu evin içine girelim mi?');
  const [endLine, setEndLine] = useState(s.end_line ?? 'Siz de böyle bir eve');
  const [music, setMusic] = useState(s.music ?? 'house_120_7');
  const [grade, setGrade] = useState(s.grade !== false);
  const [stab, setStab] = useState(s.stabilize !== false);
  const [caption, setCaption] = useState(from?.caption ?? '');
  const [tags, setTags] = useState((from?.hashtags ?? []).join(' '));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const total = clips.reduce((a, c) => a + c.dur, 0) + 4.2;
  const add = (m: Media) => setClips((c) => [...c, { url: m.url, kind: m.kind === 'image' ? 'image' : 'video', start: 0, dur: m.kind === 'image' ? 2.5 : 3.5, caption: '', thumb: m.cover_url || (m.kind === 'image' ? m.url : null), title: m.title }]);
  const upd = (i: number, p: Partial<Clip>) => setClips((c) => c.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setClips((c) => { const n = [...c]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await callOps('video_edit_create', { kind: 'montage', title: title || 'Yeni kurgu', parent_id: from?.id ?? null, caption, hashtags: tags.split(/\s+/).filter(Boolean),
        spec: { clips: clips.map(({ url, kind, start, dur, caption: c }) => ({ url, kind, start, dur, caption: c })), hook, end_line: endLine, music, grade, stabilize: stab } });
      onDone(`“${title || 'Yeni kurgu'}” sıraya alındı — 15–20 dakika içinde Video Stüdyosu’nda hazır olur.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={from ? `Yeni sürüm · ${from.title}` : 'Yeni kurgu'} wide footer={<div className="flex items-center justify-between gap-2 w-full"><span className={cx('text-[12px]', total > 59 ? 'text-rose-600 font-semibold' : 'text-ink-400')}>Toplam ≈ {Math.round(total)} sn (kapanış dahil)</span><Button variant="primary" icon={<Wand2 className="w-4 h-4" />} loading={busy} disabled={clips.length < 2} onClick={submit}>Videoyu hazırla</Button></div>}>
      <div className="space-y-4">
        {err && <Notice tone="error">{err}</Notice>}
        <Field label="1 · Klipleri seçin (tıklayın, sırayla eklenir)"><MediaPicker onPick={add} /></Field>
        <div>
          <div className="text-[11px] font-semibold text-ink-300 mb-1.5">2 · Sıra, süre ve alt yazı ({clips.length} klip)</div>
          {!clips.length ? <p className="text-[12px] text-ink-500">Yukarıdan en az 2 video/fotoğraf seçin.</p> : (
            <ol className="space-y-1.5">
              {clips.map((c, i) => (
                <li key={`${c.url}${i}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-900 ring-1 ring-ink-700 p-2">
                  <span className="w-5 text-center text-[11px] font-bold text-ink-400">{i + 1}</span>
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-[#0E1E46] shrink-0">{c.thumb ? <img src={c.thumb} alt="" className="w-full h-full object-cover" /> : c.kind === 'video' ? <video src={`${c.url}#t=1`} preload="metadata" muted className="w-full h-full object-cover" /> : null}</div>
                  <input className="ops-input !py-1.5 flex-1 min-w-[150px]" placeholder="Alt yazı (ör. Ferah ve aydınlık salon)" maxLength={60} value={c.caption} onChange={(e) => upd(i, { caption: e.target.value })} />
                  {c.kind === 'video' && <label className="text-[10px] text-ink-400">Başla<input type="number" min={0} step={0.5} className="ops-input !py-1 !w-16 ml-1" value={c.start} onChange={(e) => upd(i, { start: Number(e.target.value) })} /></label>}
                  <label className="text-[10px] text-ink-400">Süre<input type="number" min={1} max={12} step={0.5} className="ops-input !py-1 !w-16 ml-1" value={c.dur} onChange={(e) => upd(i, { dur: Number(e.target.value) })} /></label>
                  <div className="flex gap-1">
                    <button type="button" className="ops-chip !p-1" onClick={() => move(i, -1)} aria-label="Yukarı"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" className="ops-chip !p-1" onClick={() => move(i, 1)} aria-label="Aşağı"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" className="ops-chip !p-1 text-rose-600" onClick={() => setClips((x) => x.filter((_, k) => k !== i))} aria-label="Kaldır"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Video adı"><input className="ops-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Bahçeli ev turu" /></Field>
          <Field label="İlk saniye merak cümlesi" hint="Boş bırakılırsa eklenmez"><input className="ops-input" maxLength={60} value={hook} onChange={(e) => setHook(e.target.value)} /></Field>
          <Field label="Kapanış cümlesi" hint="“… sahip olmak istiyorsanız · Bize DM atın · 0531 436 29 04”"><input className="ops-input" maxLength={40} value={endLine} onChange={(e) => setEndLine(e.target.value)} /></Field>
          <Field label="Müzik"><select className="ops-input" value={music} onChange={(e) => setMusic(e.target.value)}>{MUSIC.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        </div>
        <div className="flex flex-wrap gap-3 text-[12px] text-ink-300">
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={stab} onChange={(e) => setStab(e.target.checked)} />Titremeyi azalt</label>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={grade} onChange={(e) => setGrade(e.target.checked)} />Netlik + sıcak ton</label>
        </div>
        <Field label="Paylaşım metni (isteğe bağlı)"><textarea className="ops-input min-h-[90px]" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Havuza eklenince bu metinle paylaşılır" /></Field>
        <Field label="Etiketler" hint="Boşlukla ayırın"><input className="ops-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#embayyapı #anahtarteslim …" /></Field>
      </div>
    </Modal>
  );
}

function FixModal({ url: initial, from, onClose, onDone }: { url?: string; from?: Job; onClose: () => void; onDone: (t: string) => void }) {
  const [url, setUrl] = useState(initial ?? '');
  const ref = useRef<HTMLVideoElement>(null);
  const [trimS, setTrimS] = useState(0); const [trimE, setTrimE] = useState<number | ''>('');
  const [cuts, setCuts] = useState<Array<[number, number]>>([]); const [cutA, setCutA] = useState<number | null>(null);
  const [mute, setMute] = useState(false); const [endCard, setEndCard] = useState(false); const [music, setMusic] = useState('none');
  const [title, setTitle] = useState(from ? `${from.title} (düzeltilmiş)` : 'Düzeltilmiş video');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const now = () => Math.round((ref.current?.currentTime ?? 0) * 10) / 10;
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await callOps('video_edit_create', { kind: 'fix', title, parent_id: from?.id ?? null, caption: from?.caption ?? null, hashtags: from?.hashtags ?? [],
        spec: { url, trim_start: trimS, trim_end: trimE === '' ? null : trimE, cuts, mute, end_card: endCard, music } });
      onDone(`“${title}” düzeltme için sıraya alındı.`);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Videoyu düzelt" wide footer={<Button variant="primary" icon={<Scissors className="w-4 h-4" />} loading={busy} disabled={!url} onClick={submit}>Düzeltmeyi uygula</Button>}>
      <div className="space-y-4">
        {err && <Notice tone="error">{err}</Notice>}
        {!url ? <Field label="Düzeltilecek videoyu seçin"><MediaPicker only="video" onPick={(m) => setUrl(m.url)} /></Field> : (
          <div className="grid md:grid-cols-[260px_1fr] gap-4">
            <div>
              <video ref={ref} src={url} controls playsInline className="w-full aspect-[9/16] rounded-xl bg-black object-contain" />
              {!initial && <button type="button" className="ops-chip mt-2" onClick={() => setUrl('')}>Başka video seç</button>}
            </div>
            <div className="space-y-3 text-[12px]">
              <p className="text-ink-400">Videoyu oynatın, istediğiniz anda durdurup düğmelere basın — o anki saniye yazılır.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setTrimS(now())}>Başlangıç = şu an</Button><span className="font-mono">{trimS.toFixed(1)} sn</span>
                <Button onClick={() => setTrimE(now())}>Bitiş = şu an</Button><span className="font-mono">{trimE === '' ? 'sonuna kadar' : `${Number(trimE).toFixed(1)} sn`}</span>
                {trimE !== '' && <button type="button" className="ops-chip" onClick={() => setTrimE('')}>Bitişi kaldır</button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {cutA === null ? <Button icon={<Scissors className="w-4 h-4" />} onClick={() => setCutA(now())}>Kesilecek kısmın başı = şu an</Button>
                  : <Button variant="warn" icon={<Plus className="w-4 h-4" />} onClick={() => { const b = now(); if (b > cutA) setCuts((c) => [...c, [cutA, b]]); setCutA(null); }}>Kesilecek kısmın sonu = şu an ({cutA.toFixed(1)} sn’den)</Button>}
              </div>
              {cuts.length > 0 && <ul className="flex flex-wrap gap-1.5">{cuts.map(([a, b], i) => <li key={i} className="ops-chip">✂ {a.toFixed(1)}–{b.toFixed(1)} sn<button type="button" onClick={() => setCuts((c) => c.filter((_, k) => k !== i))}><X className="w-3 h-3" /></button></li>)}</ul>}
              <div className="flex flex-wrap gap-3 text-ink-300">
                <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={mute} onChange={(e) => setMute(e.target.checked)} />Sesi kapat</label>
                <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={endCard} onChange={(e) => setEndCard(e.target.checked)} />Sona Embay kapanış kartı ekle</label>
              </div>
              <Field label="Müzik"><select className="ops-input" value={music} onChange={(e) => setMusic(e.target.value)}>{MUSIC.map(([k, l]) => <option key={k} value={k}>{k === 'none' ? 'Değiştirme (orijinal ses / sessiz)' : l}</option>)}</select></Field>
              <Field label="Video adı"><input className="ops-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
