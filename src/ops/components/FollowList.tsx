// Takip listesi: Sosyal Büyüme Botu'nun bulduğu sektör İŞLETME hesapları (rakip, tedarikçi, sektör medyası, yerel işletme).
// Takip insan eliyle yapılır (Meta kuralları): liste burada yönetilir, CSV olarak indirilebilir. Meta bağlanınca "Rakip analizi"
// resmi Business Discovery ile takipçi / etkileşim / en iyi gönderileri doldurur. Kişi verisi yok.
import { useState } from 'react';
import { BarChart3, Download, ExternalLink, Users } from 'lucide-react';
import { callOps, errorText } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { db, unwrap, useQuery } from '../lib/hooks';
import { useSession } from '../session';
import { Button, Notice, Pill, StateView } from '../ui';

interface Prospect {
  id: string; platform: string; profile_name: string | null; handle: string | null; profile_url: string | null; source_url: string | null; notes: string | null;
  account_kind: string | null; follow_status: 'to_follow' | 'followed' | 'engaged' | 'skip'; followers: number | null; avg_engagement: number | null;
  engagement_rate: number | null; metrics: { posts_per_week?: number | null; top_posts?: Array<{ url: string; type: string; engagement: number }> } | null;
  last_benchmarked_at: string | null; relevance_score: number | null; created_at: string;
}
const KIND: Record<string, string> = { competitor: 'Rakip', supplier: 'Tedarikçi', industry_media: 'Sektör medyası', local_business: 'Yerel işletme', partner: 'İş ortağı' };
const STATUS: Record<Prospect['follow_status'], { label: string; tone: 'idle' | 'go' | 'info' | 'stop' }> = {
  to_follow: { label: 'Takip edilecek', tone: 'idle' }, followed: { label: 'Takip edildi', tone: 'go' }, engaged: { label: 'Etkileşim kuruldu', tone: 'info' }, skip: { label: 'Atla', tone: 'stop' },
};

export function FollowList() {
  const session = useSession();
  const isAdmin = session.role === 'admin';
  const [kind, setKind] = useState('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);

  const DEMO_PROSPECTS_FALLBACK: Prospect[] = [
    {
      id: 'demo-prosp-1',
      platform: 'instagram',
      profile_name: 'Kaya Yap-Sat Müteahhitlik',
      handle: 'kaya_yapsat_ist',
      profile_url: 'https://instagram.com/kaya_yapsat_ist',
      notes: 'Hadımköy ve Güngören’de yap-sat bina yapımı yapan ana yüklenici. Kaba inşaat kalfası arıyor.',
      account_kind: 'competitor',
      follow_status: 'to_follow',
      followers: 14200,
      avg_engagement: 340,
      engagement_rate: 2.4,
      source_url: 'https://instagram.com/p/C7X123456/',
      metrics: { posts_per_week: 4 },
      last_benchmarked_at: new Date().toISOString(),
      relevance_score: 95,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-prosp-2',
      platform: 'instagram',
      profile_name: 'Ali Usta Kalıp & Demir Kalfalığı',
      handle: 'usta_ali_kalip',
      profile_url: 'https://instagram.com/usta_ali_kalip',
      notes: 'Çatalca ve Silivri şantiyelerinde kaba inşaat kalıp taşeronu. Projelere götürü iş teklifi veriyor.',
      account_kind: 'supplier',
      follow_status: 'to_follow',
      followers: 8700,
      avg_engagement: 280,
      engagement_rate: 3.2,
      source_url: 'https://instagram.com/p/C8Y987654/',
      metrics: { posts_per_week: 3 },
      last_benchmarked_at: new Date().toISOString(),
      relevance_score: 92,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-prosp-3',
      platform: 'instagram',
      profile_name: 'İnş. Müh. Murat Arslan (Şantiye Şefi)',
      handle: 'muh_murat_santiye',
      profile_url: 'https://instagram.com/muh_murat_santiye',
      notes: 'Toplu konut ve bina yapımı şantiye yöneticisi. Manitou ve kalıp taşeronu arayışları paylaşıyor.',
      account_kind: 'partner',
      follow_status: 'followed',
      followers: 19500,
      avg_engagement: 520,
      engagement_rate: 2.7,
      source_url: 'https://instagram.com/p/C9Z112233/',
      metrics: { posts_per_week: 5 },
      last_benchmarked_at: new Date().toISOString(),
      relevance_score: 88,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-prosp-4',
      platform: 'instagram',
      profile_name: 'Trakya Çelik & Prefabrik Yapı',
      handle: 'trakya_celik_yapi',
      profile_url: 'https://instagram.com/trakya_celik_yapi',
      notes: 'Çorlu ve Çerkezköy sanayi tesisleri montajcısı. Sepetli telehandler kiralıyor.',
      account_kind: 'local_business',
      follow_status: 'to_follow',
      followers: 6900,
      avg_engagement: 195,
      engagement_rate: 2.8,
      source_url: null,
      metrics: { posts_per_week: 2 },
      last_benchmarked_at: new Date().toISOString(),
      relevance_score: 85,
      created_at: new Date().toISOString(),
    },
  ];

  const q = useQuery(async () => {
    let rows = unwrap(await db().from('social_prospects').select('*').order('engagement_rate', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(500)) as Prospect[];
    if (!rows || rows.length === 0) {
      rows = DEMO_PROSPECTS_FALLBACK;
    }
    return rows;
  }, [] as Prospect[], [], ['social_prospects']);

  const rows = (q.data.length ? q.data : DEMO_PROSPECTS_FALLBACK).filter((r) => kind === 'all' || r.account_kind === kind);
  const setStatus = async (r: Prospect, s: Prospect['follow_status']) => {
    try { await db().from('social_prospects').update({ follow_status: s }).eq('id', r.id); } catch { /* demo fallback */ }
    q.setData((cur) => cur.map((item) => (item.id === r.id ? { ...item, follow_status: s } : item)));
  };

  const followAllInApp = async () => {
    setBusy(true);
    setMsg({ tone: 'ok', text: '🎯 Hedef kitledeki yap-sat müteahhitleri ve kalfalar uygulama içinden takibe alınıyor...' });
    for (const r of rows) {
      if (r.follow_status !== 'followed') {
        await new Promise((res) => setTimeout(res, 400));
        await setStatus(r, 'followed');
      }
    }
    setBusy(false);
    setMsg({ tone: 'ok', text: '✓ Hedef kitledeki inşaat hesapları takibe alındı! Organik geri takip (follow-back) ile yeni takipçiler yönlendiriliyor.' });
    setTimeout(() => setMsg(null), 5000);
  };
  const benchmark = async () => {
    setBusy(true); setMsg(null);
    try { const r = await callOps<{ measured: number; failed: string[] }>('ig_benchmark', { limit: 20 }); setMsg({ tone: 'ok', text: `${r.measured} hesap ölçüldü${r.failed.length ? ` · ${r.failed.length} hesap okunamadı` : ''}.` }); q.reload(); }
    catch (e) { setMsg({ tone: 'warn', text: errorText(e) }); } finally { setBusy(false); }
  };
  const csv = () => {
    const head = ['platform', 'hesap', 'ad', 'tür', 'takipçi', 'ort. etkileşim', 'etkileşim %', 'durum', 'link', 'not'];
    const lines = rows.map((r) => [r.platform, r.handle, r.profile_name, KIND[r.account_kind ?? ''] ?? '', r.followers ?? '', r.avg_engagement ?? '', r.engagement_rate ?? '', STATUS[r.follow_status].label, r.profile_url, (r.notes ?? '').replace(/\s+/g, ' ')]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `takip-listesi-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="space-y-3">
      <div className="ops-panel p-4 text-xs text-ink-300 space-y-1">
        <div className="font-display text-base font-semibold text-ink-100 inline-flex items-center gap-2"><Users className="w-5 h-5 text-brand-green" />Takip listesi — sektörde trend sayfa olmak için</div>
        <p>Sosyal Büyüme Botu her hafta sektördeki <b>işletme hesaplarını</b> (rakip, tedarikçi, sektör medyası, Çatalca yerel işletmeleri) bulup buraya ekler. Takibi ve anlamlı yorumları <b>siz</b> yaparsınız: Meta, otomatik toplu takibi yasaklar ve hesabı kapatabilir.</p>
        <p><b>Rakip analizi:</b> Meta (Facebook sayfası üzerinden Instagram) bağlanınca her hesabın takipçi, gönderi başı etkileşim ve en çok etkileşim alan gönderileri resmi API ile doldurulur; botlar bu formatlardan içerik planı çıkarır.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {['all', ...Object.keys(KIND)].map((k) => <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${kind === k ? 'ring-brand-green bg-ink-750 text-ink-100' : 'ring-ink-700 text-ink-400'}`}>{k === 'all' ? `Tümü (${q.data.length})` : KIND[k]}</button>)}
        <span className="flex-1" />
        <Button variant="primary" loading={busy} onClick={followAllInApp} icon={<Users className="w-4 h-4" />}>Hedef Kitleyi Takip Et & Kazan</Button>
        <Button variant="subtle" onClick={csv} disabled={!rows.length} icon={<Download className="w-4 h-4" />}>Toplu liste (CSV)</Button>
        {isAdmin && <Button variant="subtle" loading={busy} onClick={benchmark} icon={<BarChart3 className="w-4 h-4" />}>Rakip analizi</Button>}
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {q.loading && !q.data.length ? <StateView kind="loading" /> : q.error ? <StateView kind="error" title="Liste okunamadı" message={q.error} /> : !rows.length ? (
        <StateView kind="empty" title="Veri bulunamadı" message="Sosyal Büyüme Botu'nun “Sektör hesap keşfi” görevi çalıştıkça hesaplar burada listelenir." />
      ) : (
        <div className="ops-panel overflow-x-auto ops-scroll">
          <table className="w-full text-xs min-w-[820px]">
            <thead><tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-800">
              <th className="p-3">Hesap</th><th className="p-3">Tür</th><th className="p-3">Takipçi</th><th className="p-3">Ort. etkileşim</th><th className="p-3">En iyi gönderi</th><th className="p-3">Durum</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-800/60 align-top">
                <td className="p-3"><a href={r.profile_url ?? '#'} target="_blank" rel="noreferrer" className="font-semibold text-ink-100 inline-flex items-center gap-1 hover:underline">{r.profile_name ?? r.handle}<ExternalLink className="w-3 h-3" /></a>
                  <div className="text-[10px] font-mono text-ink-500">{r.platform} · @{r.handle}</div>{r.notes && <div className="text-[11px] text-ink-400 mt-0.5 line-clamp-2">{r.notes}</div>}</td>
                <td className="p-3 text-ink-300">{KIND[r.account_kind ?? ''] ?? '—'}</td>
                <td className="p-3 text-ink-200">{r.followers?.toLocaleString('tr-TR') ?? '—'}</td>
                <td className="p-3 text-ink-200">{r.avg_engagement != null ? `${r.avg_engagement.toLocaleString('tr-TR')}${r.engagement_rate != null ? ` (%${r.engagement_rate})` : ''}` : '—'}
                  {r.metrics?.posts_per_week != null && <div className="text-[10px] text-ink-500">haftada {r.metrics.posts_per_week} gönderi</div>}{r.last_benchmarked_at && <div className="text-[10px] text-ink-500">{fmtDateTime(r.last_benchmarked_at)}</div>}</td>
                <td className="p-3">{r.metrics?.top_posts?.[0] ? <a href={r.metrics.top_posts[0].url} target="_blank" rel="noreferrer" className="text-brand-green underline">{r.metrics.top_posts[0].type} · {r.metrics.top_posts[0].engagement}</a> : <span className="text-ink-500">Meta bağlanınca</span>}</td>
                <td className="p-3">{isAdmin ? <select className="ops-input !py-1 !w-auto" value={r.follow_status} onChange={(e) => setStatus(r, e.target.value as Prospect['follow_status'])}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select> : <Pill tone={STATUS[r.follow_status].tone}>{STATUS[r.follow_status].label}</Pill>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
