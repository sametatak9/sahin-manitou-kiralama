// Google Drive medya kaynağı: "Bağlantıya sahip herkes" paylaşılan klasörün linki kaydedilir; sunucu fotoğraf/videoları havuza alır
// (her sabah 06:00'da otomatik, istenirse "Şimdi eşitle"). Anahtar gerekmez, silme yok. Fotoğraf havuzu da burada görünür.
import { useState } from 'react';
import { Archive, Download, ExternalLink, FolderSync, HardDrive, RefreshCw } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { db, unwrap, useQuery } from '../lib/hooks';
import { useSession } from '../session';
import { Button, Notice, StateView } from '../ui';

interface SyncResult { found?: number; imported?: number; already?: number; skipped?: number; pending?: number; folders?: number; errors?: string[]; large?: string[]; running?: boolean; error?: string }
interface Source { id: string; folder_id: string; url: string; title: string | null; enabled: boolean; last_synced_at: string | null; last_result: SyncResult | null }
interface Photo { id: string; title: string; url: string; cover_url: string | null; pillar: string | null; source: string; original_url: string | null; created_at: string }

function resultText(r: SyncResult | null) {
  if (!r) return 'Henüz eşitlenmedi.';
  if (r.error) return `Hata: ${r.error}`;
  if (r.running) return 'Eşitleniyor… (dosya sayısına göre birkaç dakika sürebilir)';
  const parts = [`${r.found ?? 0} dosya bulundu`, `${r.imported ?? 0} yeni eklendi`, `${r.already ?? 0} zaten havuzda`];
  if (r.pending) parts.push(`${r.pending} sırada (birkaç dakika içinde otomatik devam eder)`);
  if (r.skipped) parts.push(`${r.skipped} desteklenmeyen dosya`);
  return parts.join(' · ');
}

export function DriveSources() {
  const session = useSession();
  const isAdmin = session.role === 'admin';
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const q = useQuery(async () => unwrap(await db().from('drive_sources').select('*').is('archived_at', null).order('created_at')) as Source[], [] as Source[], [], ['drive_sources']);
  const sync = async (body: { url?: string; id?: string }) => {
    setBusy(body.id ?? 'new'); setMsg(null);
    try { await callOps('drive_sync', body); setMsg({ tone: 'ok', text: 'Eşitleme başladı. Fotoğraf ve videolar birkaç dakika içinde havuzlara düşer; bu sayfayı yenileyerek izleyebilirsiniz.' }); setUrl(''); q.reload(); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const archive = async (s: Source) => { await db().from('drive_sources').update({ enabled: false, archived_at: new Date().toISOString() }).eq('id', s.id); q.reload(); };

  return (
    <div className="space-y-3">
      <div className="ops-panel p-4 space-y-3">
        <div className="font-display text-base font-semibold text-ink-100 inline-flex items-center gap-2"><HardDrive className="w-5 h-5 text-brand-green" />Google Drive klasörleri</div>
        <p className="text-xs text-ink-400">Drive’da klasörü <b>Paylaş → Bağlantıya sahip herkes (Görüntüleyici)</b> yapın ve linki buraya yapıştırın. Fotoğraflar Fotoğraf havuzuna, videolar Video havuzuna eklenir; İçerik Fabrikası banner arka planı ve Reels için bunları kullanır. Her sabah 06:00’da yeni dosyalar otomatik alınır. 50 MB üstü videolar depo sınırı nedeniyle alınmaz (listede gösterilir).</p>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="ops-input flex-1" placeholder="https://drive.google.com/drive/folders/…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button variant="primary" loading={busy === 'new'} disabled={!url.includes('drive.google.com')} onClick={() => sync({ url })} icon={<FolderSync className="w-4 h-4" />}>Ekle ve eşitle</Button>
          </div>
        )}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {q.loading && !q.data.length ? <StateView kind="loading" compact /> : q.error ? <StateView kind="error" message={q.error} compact /> : !q.data.length ? (
          <StateView kind="empty" title="Veri bulunamadı" message="Henüz Drive klasörü eklenmedi." compact />
        ) : q.data.map((s) => (
          <div key={s.id} className="rounded-xl ring-1 ring-ink-700 p-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-ink-100 inline-flex items-center gap-1 hover:underline">{s.title || 'Drive klasörü'}<ExternalLink className="w-3 h-3" /></a>
              <span className="text-[10px] font-mono text-ink-500">{s.last_synced_at ? `son eşitleme ${fmtDateTime(s.last_synced_at)}` : 'eşitlenmedi'}</span>
              <span className="flex-1" />
              {isAdmin && <Button variant="subtle" loading={busy === s.id} onClick={() => sync({ id: s.id })} icon={<RefreshCw className="w-4 h-4" />}>Şimdi eşitle</Button>}
              {isAdmin && <Button variant="ghost" onClick={() => archive(s)} icon={<Archive className="w-4 h-4" />}>Kaldır</Button>}
            </div>
            <div className="text-xs text-ink-300">{resultText(s.last_result)}</div>
            {!!s.last_result?.large?.length && <div className="text-[11px] text-amber-500">50 MB üstü (sıkıştırıp tekrar yükleyin): {s.last_result.large.join(', ')}</div>}
            {!!s.last_result?.errors?.length && <div className="text-[11px] text-rose-500">Alınamayan: {s.last_result.errors.slice(0, 5).join(' · ')}</div>}
          </div>
        ))}
      </div>
      <PhotoPool />
    </div>
  );
}

export function PhotoPool() {
  const q = useQuery(async () => unwrap(await db().from('media_library').select('id,title,url,cover_url,pillar,source,original_url,created_at').eq('kind', 'image').is('archived_at', null).order('created_at', { ascending: false }).limit(300)) as Photo[], [] as Photo[], [], ['media_library']);
  const archive = async (p: Photo) => { await db().from('media_library').update({ archived_at: new Date().toISOString(), status: 'archived' }).eq('id', p.id); q.reload(); };
  return (
    <div className="ops-panel p-4 space-y-2">
      <div className="font-display text-base font-semibold text-ink-100">Fotoğraf havuzu <span className="text-xs text-ink-500 font-mono">({q.data.length})</span></div>
      <p className="text-xs text-ink-400">İçerik Fabrikası banner’larda bu fotoğrafları arka plan olarak kullanır. Uygun olmayanı arşive kaldırın.</p>
      {q.loading && !q.data.length ? <StateView kind="loading" compact /> : !q.data.length ? <StateView kind="empty" title="Veri bulunamadı" message="Drive klasörü eşitlenince fotoğraflar burada görünür." compact /> : (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
          {q.data.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden bg-ink-900">
              <img src={p.cover_url ?? p.url} alt={p.title} loading="lazy" className="w-full aspect-square object-cover" />
              <div className="absolute left-0 right-0 bottom-0 bg-black/55 text-white text-[10px] px-1 truncate">{p.title}</div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <a href={p.url} target="_blank" rel="noreferrer" download className="rounded bg-black/60 p-1 text-white" title="İndir"><Download className="w-3.5 h-3.5" /></a>
                <button onClick={() => archive(p)} className="rounded bg-black/60 p-1 text-white" title="Arşive kaldır"><Archive className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
