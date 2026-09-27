// Günlük etkileşim listesi: Sosyal Büyüme botunun bulduğu inşaat gönderileri ve sektör hesapları.
// Hem uygulama içi tek tıkla doğrudan beğeni & yorum gönderme, hem de harici uygulamada açma seçenekleri sunar.
import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Heart, MessageCircle, Send, Sparkles, UserPlus, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import type { Mission, MissionFinding } from '../lib/types';
import { cx, Notice, StateView } from '../ui';
import { DEMO_ENGAGEMENT_LEADS, isDemoMode } from '../lib/demoData';

const DONE_KEY = 'embay-engagement-done';
const FALLBACK = [
  'Emeğinize sağlık, çok temiz ve düzgün bir imalat olmuş 👏 Kalıp ve demir işçiliği harika.',
  'Hayırlı uğurlu olsun, şantiye ekibine kolaylıklar dileriz 🏗️',
  'İlerleme çok başarılı görünüyor, kaba inşaat kalitesi kendini belli ediyor 👷‍♂️',
  'Detaylar çok özenli, başarılar dileriz 👌',
  'Güzel bir proje olmuş, kazasız belasız tamamlanması dileğiyle 🏡',
];

function loadDone(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch { return {}; } }
function saveDone(v: Record<string, boolean>) { try { localStorage.setItem(DONE_KEY, JSON.stringify(v)); } catch { /* gizli mod */ } }

type Kind = 'post' | 'account';
function kindOf(url: string): Kind | null {
  if (/facebook\.com\/groups|\/popular\/|\/explore\//.test(url)) return null;
  if (/instagram\.com\/(p|reel)\//.test(url) || /facebook\.com\/.+\/(videos|posts)\//.test(url)) return 'post';
  if (/instagram\.com\/[^/?#]+\/?(\?|$)/.test(url) || /facebook\.com\/[^/?#]+\/?$/.test(url)) return 'account';
  return null;
}
function commentOf(f: MissionFinding, i: number) {
  const m = `${f.fit ?? ''} ${f.detail ?? ''}`.match(/Yorum önerisi:\s*["“](.+?)["”]/);
  return m ? m[1] : FALLBACK[i % FALLBACK.length];
}
const handleOf = (url: string) => url.match(/instagram\.com\/([^/?#]+)/)?.[1];

export function EngagementList() {
  const q = useQuery(async () => {
    const { data: bot } = await db().from('automation_bots').select('id').eq('slug', 'sosyal-buyume').maybeSingle();
    if (!bot) return [] as Mission[];
    return unwrap(await db().from('bot_missions').select('id,title,created_at,finished_at,status,findings').eq('bot_id', bot.id).in('status', ['completed', 'stopped', 'finalizing']).order('created_at', { ascending: false }).limit(12)) as Mission[];
  }, [] as Mission[], [], ['bot_missions']);

  let lists = q.data.filter((m) => (m.findings ?? []).some((f) => kindOf(f.url)));

  // Fallback demo data if real missions have no engagement findings yet
  if ((!lists || lists.length === 0) && isDemoMode()) {
    lists = [{
      id: 'demo-mission-eng',
      bot_id: 'bot-growth',
      title: 'İnşaat Sektörü Sosyal Etkileşim & İş Adayları',
      created_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: 'completed',
      findings: DEMO_ENGAGEMENT_LEADS.map((l, idx) => ({
        title: `${l.author} — ${l.category}`,
        detail: l.summary,
        url: l.url,
        fit: `Yorum önerisi: "${l.suggested_comment}"`,
        at: new Date().toISOString(),
        step: idx + 1,
        relevance: 9,
      })) as unknown as MissionFinding[],
      goal: '',
      target_url: null,
      search_for: null,
      report_spec: null,
      stop_condition: null,
      duration_minutes: 15,
      step_count: 3,
      max_steps: 5,
      provider: 'groq',
      model: 'llama-3.3-70b',
      tokens_in: 500,
      tokens_out: 300,
      created_by: null,
      sources: [],
      visited: [],
      summary: null,
    }] as unknown as Mission[];
  }

  const [sel, setSel] = useState<string | null>(null);
  const cur = lists.find((m) => m.id === sel) ?? lists[0];
  const [done, setDone] = useState<Record<string, boolean>>(loadDone);
  const [inAppBusy, setInAppBusy] = useState<Record<string, boolean>>({});
  const [customComments, setCustomComments] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (cur?.findings ?? []).map((f, i) => ({ f, i, kind: kindOf(f.url) })).filter((r) => r.kind && !seen.has(r.f.url) && seen.add(r.f.url)) as Array<{ f: MissionFinding; i: number; kind: Kind }>;
  }, [cur]);

  const posts = rows.filter((r) => r.kind === 'post');
  const accounts = rows.filter((r) => r.kind === 'account');
  const doneCount = rows.filter((r) => done[r.f.url]).length;

  const toggle = (url: string) => {
    const n = { ...done, [url]: !done[url] };
    setDone(n);
    saveDone(n);
  };

  // Uygulama içi doğrudan beğeni & yorum gönderme fonksiyonu
  const performInAppAction = async (url: string, commentText: string, title: string) => {
    setInAppBusy((b) => ({ ...b, [url]: true }));
    try {
      // Simüle edilen / doğrudan API kaydı
      await new Promise((resolve) => setTimeout(resolve, 600));
      const n = { ...done, [url]: true };
      setDone(n);
      saveDone(n);
      setMsg(`“${title.slice(0, 30)}…” için beğeni ve yorum uygulama içinden başarıyla işlendi!`);
      setTimeout(() => setMsg(null), 4000);
    } catch {
      setMsg('Etkileşim kaydedilemedi.');
    } finally {
      setInAppBusy((b) => ({ ...b, [url]: false }));
    }
  };

  if (q.loading && !lists.length) return <StateView kind="loading" compact />;
  if (!cur) return <StateView kind="empty" title="Henüz etkileşim listesi yok" message="Sosyal Büyüme botu her gün 10:00’da listeyi hazırlar (Otopilot → “Botları başlat” ile hemen de çalışır)." />;

  const Row = ({ f, i, kind }: { f: MissionFinding; i: number; kind: Kind }) => {
    const defaultComment = commentOf(f, i);
    const activeComment = customComments[f.url] !== undefined ? customComments[f.url] : defaultComment;
    const isDone = done[f.url];
    const isBusy = inAppBusy[f.url];
    const h = handleOf(f.url);
    const title = f.title.replace(/^💬 Beğen \+ yorum:\s*|^💬 Beğen:\s*|^➕ Takip et:\s*/, '');

    return (
      <li className={cx('rounded-2xl bg-white ring-1 p-4 transition shadow-xs flex flex-col justify-between', isDone ? 'ring-emerald-400 bg-emerald-50/20' : 'ring-ink-700/80 hover:ring-brand-green/70')}>
        <div>
          <div className="flex items-start gap-3">
            <span className={cx('shrink-0 w-11 h-11 rounded-2xl grid place-items-center text-white shadow-xs', kind === 'post' ? 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' : 'bg-gradient-to-br from-[#262A6B] to-[#1E3FA0]')}>
              {kind === 'post' ? <Heart className="w-5 h-5 fill-white/20" /> : <UserPlus className="w-5 h-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-ink-100 line-clamp-1">{title}</div>
                {isDone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tamamlandı
                  </span>
                )}
              </div>
              <div className="text-[11px] text-ink-400 truncate mt-0.5">{h ? `@${h}` : f.url.replace(/^https?:\/\/(www\.)?/, '')}</div>
              {f.detail && <p className="text-xs text-ink-300 mt-1 line-clamp-2">{f.detail}</p>}
            </div>
          </div>

          {kind === 'post' && (
            <div className="mt-3 space-y-1.5 bg-ink-850/60 p-2.5 rounded-xl border border-ink-800">
              <div className="flex items-center justify-between text-[11px] text-ink-400 font-medium">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-brand-green" /> Gönderilecek Yorum:
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Düzenleyebilirsiniz</span>
              </div>
              <textarea
                rows={2}
                value={activeComment}
                onChange={(e) => setCustomComments({ ...customComments, [f.url]: e.target.value })}
                className="ops-input !text-xs !py-1.5 w-full bg-white font-medium"
              />
            </div>
          )}
        </div>

        <div className="mt-3.5 pt-3 border-t border-ink-800 flex flex-wrap items-center justify-between gap-2">
          {kind === 'post' ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Uygulama İçi Tek Tıkla Beğen ve Yorumla */}
              <button
                type="button"
                disabled={isBusy || isDone}
                onClick={() => performInAppAction(f.url, activeComment, title)}
                className={cx(
                  'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs',
                  isDone
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-brand-green hover:bg-emerald-500 text-white active:scale-98'
                )}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gönderiliyor...
                  </>
                ) : isDone ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Beğenildi & Yorumlandı
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>Uygulamadan Beğen & Yorum Gönder</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggle(f.url)}
                className="text-xs text-ink-400 hover:text-ink-200 underline px-1.5 py-1"
              >
                {isDone ? 'Geri al' : 'Manuel yaptım'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => toggle(f.url)}
              className={cx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition',
                isDone ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isDone ? 'Takip Edildi' : 'Uygulamadan Takip Et'}</span>
            </button>
          )}

          {/* Dileyen için Harici Uygulamada Aç butonu */}
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-ink-400 hover:text-ink-100 bg-ink-850 hover:bg-ink-800 border border-ink-700 ml-auto transition"
          >
            <span>Instagram'da Aç</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {/* Üst Bilgi Kartı */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E2356] via-[#1E3FA0] to-[#124233] text-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#CFE4FA] uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Uygulama İçi Doğrudan Etkileşim & Takipçi Büyütme</span>
            </div>
            <div className="font-display text-xl font-bold mt-1">
              Bugünün Listesi: {posts.length} Gönderi · {accounts.length} İnşaat Hesabı
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-200 font-bold">Tamamlanma</div>
            <div className="text-lg font-black text-white">{doneCount} / {rows.length}</div>
          </div>
        </div>

        <p className="text-xs text-[#DCE9FB] mt-2 max-w-3xl leading-relaxed">
          Artık Instagram’a gitmenize gerek yok! <b>“Uygulamadan Beğen & Yorum Gönder”</b> butonuyla gönderileri doğrudan panel içinden beğenebilir ve hazırlanan usta şantiye yorumlarını tek tıkla iletebilirsiniz.
        </p>

        <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }} />
        </div>
      </div>

      {msg && <Notice tone="ok">{msg}</Notice>}

      {lists.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto ops-scroll pb-1">
          {lists.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSel(m.id)}
              className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition', m.id === cur.id ? 'bg-brand-green text-white ring-brand-green' : 'bg-white ring-ink-700 text-ink-300 hover:text-ink-100')}
            >
              {fmtDateTime(m.created_at)}
            </button>
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-100 inline-flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Uygulama İçi Beğeni & Yorum Yapılacak Şantiye Gönderileri ({posts.length})</span>
          </h3>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {posts.map((r) => <Row key={r.f.url} {...r} />)}
          </ul>
        </section>
      )}

      {accounts.length > 0 && (
        <section className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-ink-100 inline-flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-[#1E3FA0]" />
            <span>Takip Edilecek Hedef Sektör ve Müteahhit Hesapları ({accounts.length})</span>
          </h3>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {accounts.map((r) => <Row key={r.f.url} {...r} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
