// EDİTLİ VİDEOLAR: Claude'un kurguladığı (Marvel tarzı) Reels'ler tek yerde — izle, açıklamayı gör, ne zaman paylaşılacağını gör, istersen hemen yayınla.
import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clapperboard, Copy, Play, Send } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { callOps } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { cx, Notice, PlatformBadge, StateView } from '../ui';

interface Vid { id: string; title: string | null; url: string; cover_url: string | null; caption: string | null; hashtags: string[] | null; source: string; created_at: string }
interface Dr { id: string; video_url: string | null; primary_platform: string | null; scheduled_at: string | null; workflow_status: string | null; published_at?: string | null; error: string | null }

export function EditedVideosScreen() {
  const vids = useQuery(async () => unwrap(await db().from('media_library').select('id,title,url,cover_url,caption,hashtags,source,created_at')
    .eq('kind', 'video').eq('source', 'marvel').is('archived_at', null).order('created_at', { ascending: false }).limit(60)) as Vid[], [] as Vid[], [], ['media_library']);
  const urls = vids.data.map((v) => v.url);
  const drafts = useQuery(async () => (urls.length ? unwrap(await db().from('social_drafts').select('id,video_url,primary_platform,scheduled_at,workflow_status,error')
    .in('video_url', urls).is('archived_at', null)) as Dr[] : []), [] as Dr[], [urls.join('|')], ['social_drafts']);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const byUrl = useMemo(() => { const m = new Map<string, Dr[]>(); for (const d of drafts.data) { const k = d.video_url ?? ''; m.set(k, [...(m.get(k) ?? []), d]); } return m; }, [drafts.data]);

  const publishNow = async (v: Vid) => {
    const ds = (byUrl.get(v.url) ?? []).filter((d) => d.workflow_status !== 'published');
    if (!ds.length) { setMsg({ tone: 'error', text: 'Bu video için zamanlanmış paylaşım yok.' }); return; }
    setBusy(v.id); setMsg(null);
    const done: string[] = []; const errs: string[] = [];
    for (const d of ds) {
      try { await callOps('publish_content', { content_id: d.id, platform: d.primary_platform }); done.push(d.primary_platform ?? ''); }
      catch (e) { errs.push(`${d.primary_platform}: ${(e as Error).message}`); }
    }
    setMsg(errs.length ? { tone: 'error', text: `${done.length ? `Yayınlandı: ${done.join(', ')}. ` : ''}Hata: ${errs.join(' · ')}` } : { tone: 'ok', text: `Yayınlandı: ${done.join(', ')} 🎉` });
    setBusy(null); await drafts.reload();
  };

  if (vids.loading && !vids.data.length) return <StateView kind="loading" />;
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-[#141A4F] via-[#1E2470] to-[#2E3192] text-white p-4 sm:p-5">
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#8FC1F0]">EDİTLİ VİDEOLAR · GERÇEK ÇEKİM KURGU</div>
        <h2 className="font-display text-xl font-semibold mt-0.5 inline-flex items-center gap-2"><Clapperboard className="w-5 h-5" />{vids.data.length} hazır Reels</h2>
        <p className="text-[12px] text-[#D6E4F7] mt-1 max-w-2xl">Gerçek proje videolarımızdan kurgulandı: ilk saniyede dikkat çeken başlık, ritme oturan kesmeler, whip-pan / zoom / glitch geçişleri, ses efektleri ve lacivert Embay kapanış kartı (DM çağrısı + telefon). Her videonun Instagram + Facebook paylaşım saati aşağıda.</p>
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!vids.data.length ? <StateView kind="empty" title="Henüz editli video yok" /> : (
        <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {vids.data.map((v) => {
            const ds = (byUrl.get(v.url) ?? []).sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
            const pub = ds.some((d) => d.workflow_status === 'published');
            const next = ds.find((d) => d.workflow_status !== 'published');
            return (
              <li key={v.id} className="rounded-2xl overflow-hidden bg-white ring-1 ring-ink-700/70 shadow-sm flex flex-col">
                <div className="relative aspect-[9/16] bg-black">
                  {open === v.id
                    ? <video src={v.url} poster={v.cover_url ?? undefined} controls autoPlay playsInline className="w-full h-full object-cover" />
                    : (
                      <button type="button" onClick={() => setOpen(v.id)} className="absolute inset-0 group">
                        {v.cover_url && <img src={v.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        <span className="absolute inset-0 grid place-items-center"><span className="w-14 h-14 rounded-full bg-white/90 grid place-items-center group-hover:scale-110 transition"><Play className="w-6 h-6 text-[#E22028] ml-1" /></span></span>
                      </button>
                    )}
                  <span className={cx('absolute top-2 left-2 rounded-full text-[10px] font-bold px-2 py-0.5', pub ? 'bg-emerald-600 text-white' : 'bg-[#E22028] text-white')}>{pub ? 'YAYINDA' : 'HAZIR'}</span>
                </div>
                <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                  <div className="text-[13px] font-semibold text-ink-100 line-clamp-1">{v.title}</div>
                  {ds.length ? (
                    <ul className="space-y-0.5">
                      {ds.map((d) => (
                        <li key={d.id} className="flex items-center gap-1.5 text-[11px] text-ink-300">
                          <PlatformBadge platform={d.primary_platform} />
                          {d.workflow_status === 'published' ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3 h-3" />yayınlandı</span>
                            : <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" />{d.scheduled_at ? fmtDateTime(d.scheduled_at) : 'zamanlanmadı'}</span>}
                          {d.error && <span className="text-rose-600 truncate" title={d.error}>· hata</span>}
                        </li>
                      ))}
                    </ul>
                  ) : <div className="text-[11px] text-ink-400">Takvime eklenmedi</div>}
                  <div className="mt-auto pt-1.5 flex flex-wrap gap-1.5">
                    {next && <button type="button" disabled={busy === v.id} onClick={() => publishNow(v)} className="ops-chip !bg-[#E22028] !text-white !ring-transparent"><Send className="w-3.5 h-3.5" />{busy === v.id ? 'Yayınlanıyor…' : 'Şimdi yayınla'}</button>}
                    {v.caption && <button type="button" onClick={() => navigator.clipboard?.writeText(`${v.caption}\n\n${(v.hashtags ?? []).join(' ')}`).catch(() => undefined)} className="ops-chip"><Copy className="w-3.5 h-3.5" />Açıklama</button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
