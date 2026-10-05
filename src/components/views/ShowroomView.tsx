import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Home, Menu, MessageCircle, Phone, Ruler, BedDouble, Layers, Send, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/** EMBAY Showroom — ev / villa modelleri vitrini (/evler, /ev/<slug>). Yalnızca panelde "yayında" işaretlenen modeller görünür.
 *  Fiyat, m², oda bilgisi panelden girilir; boş olan alan sitede gösterilmez (uydurma yok). Teklif formu KVKK onayıyla lead_inbox'a yazar. */

interface Room { label: string; count?: number | null; m2?: number | null }
interface Model {
  id: string; slug: string; code: string | null; title: string; subtitle: string | null; system: string; floors: number | null; area_m2: number | null;
  rooms: string | null; room_breakdown: Room[] | null; price: number | null; price_note: string | null; delivery: string; delivery_days: number | null;
  location: string | null; is_real_project: boolean; includes: string[]; excludes: string[]; description: string | null; cover_url: string | null;
  gallery: string[]; plan_url: string | null; video_url: string | null; featured: boolean;
}

const PHONE = '0531 436 29 04';
const PHONE_CLEAN = '05314362904';
const LOGO = '/reels/kit/embay_logo_beyaz.png';
const SYSTEM: Record<string, string> = { celik: 'Çelik yapı', hafif_celik: 'Hafif çelik', betonarme: 'Betonarme', prefabrik: 'Prefabrik', diger: 'Diğer' };
const DELIVERY: Record<string, string> = { anahtar_teslim: 'Anahtar teslim', ileri_kaba: 'İleri kaba', kaba: 'Kaba inşaat' };
const tl = (n: number) => `${n.toLocaleString('tr-TR')}₺`;
const m2 = (n: number) => `${Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²`;
const wa = (text: string) => `https://wa.me/90${PHONE_CLEAN}?text=${encodeURIComponent(text)}`;

function go(path: string) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0 }); }
function usePath() {
  const [p, setP] = useState(window.location.pathname + window.location.search);
  useEffect(() => { const f = () => setP(window.location.pathname + window.location.search); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  return p;
}
/** Menü hedefi: katalog sayfasındaki bir bölüm (#id); başka sayfadaysak önce kataloğa döner. */
function navTo(path: string, anchor?: string) {
  const here = window.location.pathname + window.location.search;
  if (here !== path) go(path);
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), here !== path ? 350 : 0);
  else if (here === path) window.scrollTo({ top: 0, behavior: 'smooth' });
}
const MENU: Array<{ label: string; path: string; anchor?: string }> = [
  { label: 'Anasayfa', path: '/evler' },
  { label: 'Ev Modellerimiz', path: '/evler', anchor: 'modeller' },
  { label: 'Teslim Ettiklerimiz', path: '/evler?f=teslim', anchor: 'modeller' },
  { label: 'Neden Embay Yapı', path: '/evler', anchor: 'kurumsal' },
  { label: 'Sık Sorulan Sorular', path: '/evler', anchor: 'sss' },
  { label: 'İletişim', path: '/evler', anchor: 'iletisim' },
];

export const ShowroomView: React.FC = () => {
  const path = usePath();
  const [models, setModels] = useState<Model[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    document.title = 'Ev Modellerimiz | Embay Yapı';
    if (!supabase) { setModels([]); return; }
    supabase.from('showroom_models').select('*').eq('status', 'published').order('featured', { ascending: false }).order('sort').order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setErr('Modeller yüklenemedi.'); setModels((data as Model[]) ?? []); });
  }, []);
  const pathname = path.split('?')[0];
  const slug = pathname.startsWith('/ev/') ? decodeURIComponent(pathname.slice(4)).replace(/\/$/, '') : null;
  const filter = (new URLSearchParams(path.split('?')[1] ?? '').get('f') as Filter | null) ?? 'all';
  const model = slug && models ? models.find((m) => m.slug === slug) ?? null : null;

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-[#14213D]" style={{ fontFamily: 'Montserrat, "Plus Jakarta Sans", system-ui, sans-serif' }}>
      <Header />
      {slug ? (models === null ? <Loading /> : model ? <Detail m={model} /> : <NotFound />) : <Catalog key={filter} initial={filter} models={models} err={err} />}
      <Footer />
      <a href={wa('Merhaba, ev modelleriniz hakkında bilgi almak istiyorum.')} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 hover:brightness-105">
        <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
};

function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const pick = (i: (typeof MENU)[number]) => { setOpen(false); navTo(i.path, i.anchor); };
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#16428F] to-[#1E5BC6] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <button onClick={() => navTo('/evler')} className="flex items-center gap-2" aria-label="Embay Yapı ana sayfa">
          <img src={LOGO} alt="Embay Yapı" className="h-11 w-auto" />
        </button>
        <nav className="hidden items-center gap-1 text-[13px] font-medium lg:flex">
          {MENU.slice(1).map((i) => <button key={i.label} onClick={() => pick(i)} className="rounded-full px-3 py-1.5 hover:bg-white/10">{i.label}</button>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={`tel:${PHONE_CLEAN}`} className="hidden items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#16428F] sm:flex">
            <Phone className="h-4 w-4" /> {PHONE}
          </a>
          <button onClick={() => setOpen(true)} aria-label="Menüyü aç" className="rounded-full p-2 hover:bg-white/10 lg:hidden"><Menu className="h-6 w-6" /></button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white text-[#14213D] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="rounded-2xl bg-gradient-to-r from-[#16428F] to-[#1E5BC6] px-3 py-2"><img src={LOGO} alt="Embay Yapı" className="h-10 w-auto" /></div>
              <button onClick={() => setOpen(false)} aria-label="Menüyü kapat" className="rounded-full border border-slate-200 p-2.5"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 space-y-2.5 overflow-y-auto px-5 py-5">
              {MENU.map((i) => (
                <button key={i.label} onClick={() => pick(i)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-5 py-4 text-left text-[17px] font-medium hover:border-[#1E5BC6] hover:bg-[#F4F7FC]">
                  {i.label} <ArrowRight className="h-5 w-5" />
                </button>
              ))}
            </nav>
            <div className="space-y-2.5 border-t border-slate-100 px-5 py-5">
              <a href={`tel:${PHONE_CLEAN}`} className="flex items-center justify-center gap-2 rounded-full bg-[#1E5BC6] py-4 text-base font-semibold text-white"><Phone className="h-5 w-5" /> Hemen Ara</a>
              <button onClick={() => { setOpen(false); navTo('/evler', 'teklif'); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#14213D] py-4 text-base font-semibold text-white"><Send className="h-5 w-5" /> Teklif Al</button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

function Hero({ count }: { count: number }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#1E5BC6] via-[#4C8FE0] to-[#F4F7FC] text-white">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 text-center sm:pt-16">
        <p className="text-sm font-light tracking-wide text-white/90 sm:text-base">Embay Yapı · Çatalca, İstanbul</p>
        <h1 className="mt-2 text-3xl font-light leading-tight sm:text-5xl">Hayalinizdeki eve <span className="font-extrabold">anahtar teslim</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-light text-white/90 sm:text-base">Teslim ettiğimiz projeleri ve ev modellerimizi inceleyin; metrekare ve teslim tipini yazın, size özel teklifinizi hazırlayalım.</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="#modeller" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#16428F] shadow-lg shadow-black/10">{count ? `${count} modeli incele` : 'Modelleri incele'}</a>
          <a href="#teklif" className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Teklif al</a>
        </div>
      </div>
    </section>
  );
}

type Filter = 'all' | 'tek' | 'cift' | 'teslim';
function Catalog({ models, err, initial }: { models: Model[] | null; err: string; initial: Filter }) {
  const [f, setF] = useState<Filter>(initial);
  const list = useMemo(() => (models ?? []).filter((m) => f === 'all' || (f === 'tek' && m.floors === 1) || (f === 'cift' && (m.floors ?? 0) >= 2) || (f === 'teslim' && m.is_real_project)), [models, f]);
  const has = (k: Filter) => (models ?? []).some((m) => (k === 'tek' && m.floors === 1) || (k === 'cift' && (m.floors ?? 0) >= 2) || (k === 'teslim' && m.is_real_project));
  const chips: Array<[Filter, string]> = [['all', 'Tümü'], ['tek', 'Tek katlı'], ['cift', 'Çift katlı'], ['teslim', 'Teslim ettiklerimiz']];
  return (
    <>
      <Hero count={models?.length ?? 0} />
      <section id="modeller" className="relative z-10 mx-auto -mt-10 max-w-6xl scroll-mt-24 px-4">
        <div className="mb-5 flex flex-wrap gap-2">
          {chips.filter(([k]) => k === 'all' || has(k)).map(([k, l]) => (
            <button key={k} onClick={() => setF(k)} className={`rounded-full px-4 py-2 text-[13px] font-semibold shadow-sm ${f === k ? 'bg-[#16428F] text-white' : 'bg-white text-[#16428F] hover:bg-blue-50'}`}>{l}</button>
          ))}
        </div>
        {models === null ? <Loading /> : err ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">{err} Lütfen arayın: {PHONE}</p>
          : list.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <Home className="mx-auto h-10 w-10 text-[#1E5BC6]" />
              <p className="mt-3 text-lg font-semibold">Ev modellerimiz çok yakında burada</p>
              <p className="mt-1 text-sm font-light text-slate-500">Şimdiden projenizi konuşalım: metrekare ve teslim tipini yazın, teklifinizi hazırlayalım.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => <Card key={m.id} m={m} />)}
            </div>
          )}
      </section>
      <Why />
      <Faq />
      <LeadForm />
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FC] px-2.5 py-1 text-[12px] font-semibold text-[#16428F]">{children}</span>;
}
function PriceLine({ m, big = false }: { m: Model; big?: boolean }) {
  if (m.price) return <p className={big ? 'text-3xl font-extrabold text-[#16428F]' : 'text-xl font-extrabold text-[#16428F]'}>{tl(m.price)}<span className="ml-1 text-xs font-medium text-slate-500">{m.price_note ? `· ${m.price_note}` : '· başlangıç fiyatı'}</span></p>;
  return <p className={big ? 'text-lg font-semibold text-[#16428F]' : 'text-sm font-semibold text-[#16428F]'}>{m.price_note || 'Fiyat için teklif alın'}</p>;
}

function Card({ m }: { m: Model }) {
  const img = m.cover_url || m.gallery[0];
  return (
    <button onClick={() => go(`/ev/${m.slug}`)} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white text-left align-top shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {img && <img src={img} alt={m.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        {m.is_real_project && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#16428F] shadow">✓ Teslim ettik{m.location ? ` · ${m.location}` : ''}</span>}
        {m.code && <span className="absolute right-3 top-3 rounded-full bg-[#14213D]/80 px-2.5 py-1 text-[11px] font-semibold text-white">{m.code}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold leading-snug">{m.title}</h3>
          {m.subtitle && <p className="mt-0.5 text-[13px] font-light text-slate-500">{m.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.area_m2 && <Badge><Ruler className="h-3.5 w-3.5" />{m2(m.area_m2)}</Badge>}
          {m.rooms && <Badge><BedDouble className="h-3.5 w-3.5" />{m.rooms}</Badge>}
          {m.floors && <Badge><Layers className="h-3.5 w-3.5" />{m.floors === 1 ? 'Tek kat' : `${m.floors} kat`}</Badge>}
          {m.system !== 'diger' && <Badge>{SYSTEM[m.system] ?? m.system}</Badge>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <PriceLine m={m} />
          <span className="flex items-center text-[13px] font-semibold text-[#1E5BC6]">Detaylar <ChevronRight className="h-4 w-4" /></span>
        </div>
      </div>
    </button>
  );
}

function Detail({ m }: { m: Model }) {
  const imgs = [m.cover_url, ...m.gallery].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => { document.title = `${m.title} | Embay Yapı`; }, [m.title]);
  const rooms = (m.room_breakdown ?? []).filter((r) => r.label);
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <button onClick={() => go('/evler')} className="flex items-center gap-1 text-[13px] font-semibold text-[#1E5BC6]"><ArrowLeft className="h-4 w-4" /> Tüm modeller</button>
      </div>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-200 shadow-sm">
            {imgs[i] && <img src={imgs[i]} alt={m.title} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setZoom(true)} />}
            {imgs.length > 1 && (<>
              <button aria-label="Önceki" onClick={() => setI((i - 1 + imgs.length) % imgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronLeft className="h-5 w-5" /></button>
              <button aria-label="Sonraki" onClick={() => setI((i + 1) % imgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronRight className="h-5 w-5" /></button>
              <span className="absolute bottom-3 right-3 rounded-full bg-[#14213D]/80 px-2.5 py-1 text-xs font-semibold text-white">{i + 1}/{imgs.length}</span>
            </>)}
          </div>
          {imgs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {imgs.map((s, k) => <button key={s} onClick={() => setI(k)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ${k === i ? 'ring-[#1E5BC6]' : 'ring-transparent opacity-80'}`}><img src={s} alt="" className="h-full w-full object-cover" loading="lazy" /></button>)}
            </div>
          )}
          {m.video_url && <video src={m.video_url} controls playsInline className="mt-4 w-full rounded-3xl bg-black" />}
        </div>
        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            {m.is_real_project && <p className="mb-2 text-[12px] font-bold text-[#1E5BC6]">✓ Teslim ettiğimiz proje{m.location ? ` · ${m.location}` : ''}</p>}
            <h1 className="text-2xl font-bold leading-tight">{m.title}</h1>
            {m.code && <p className="mt-1 text-[13px] text-slate-500">Model kodu: {m.code}</p>}
            {m.subtitle && <p className="mt-2 text-sm font-light text-slate-600">{m.subtitle}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {m.area_m2 && <Circle k="Yapı boyutu" v={m2(m.area_m2)} />}
              {m.rooms && <Circle k="Oda sayısı" v={m.rooms} />}
              {m.floors && <Circle k="Kat" v={m.floors === 1 ? 'Tek kat' : `${m.floors} kat`} />}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4"><PriceLine m={m} big /></div>
            <ul className="mt-3 space-y-1.5 text-[13px] text-slate-600">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#1E5BC6]" />{[m.system !== 'diger' && SYSTEM[m.system], DELIVERY[m.delivery] ?? m.delivery].filter(Boolean).join(' · ')}</li>
              {m.delivery_days && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#1E5BC6]" />Tahmini teslim: {m.delivery_days} gün</li>}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href="#teklif" className="rounded-full bg-[#16428F] px-4 py-3 text-center text-sm font-semibold text-white">Teklif al</a>
              <a href={wa(`Merhaba, ${m.title}${m.code ? ` (${m.code})` : ''} hakkında bilgi almak istiyorum.`)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-4 py-3 text-center text-sm font-semibold text-white">WhatsApp</a>
            </div>
          </div>
          {rooms.length > 0 && (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <h2 className="text-base font-bold">Oda dağılımı</h2>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {rooms.map((r, k) => <li key={k} className="flex justify-between py-2"><span>{r.count ? `${r.count} ` : ''}{r.label}</span>{r.m2 ? <span className="font-semibold">{m2(r.m2)}</span> : <span />}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-6 md:grid-cols-2">
        {m.description && <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:col-span-2"><h2 className="text-base font-bold">Proje hakkında</h2><p className="mt-2 whitespace-pre-line text-sm font-light leading-relaxed text-slate-700">{m.description}</p></div>}
        {(m.includes.length > 0 || m.excludes.length > 0) && (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:col-span-2">
            <h2 className="text-base font-bold">Fiyata neler dahil?</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {m.includes.length > 0 && <ul className="space-y-1.5 text-sm">{m.includes.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{x}</li>)}</ul>}
              {m.excludes.length > 0 && <ul className="space-y-1.5 text-sm text-slate-600">{m.excludes.map((x) => <li key={x} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />{x}</li>)}</ul>}
            </div>
          </div>
        )}
        {m.plan_url && <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:col-span-2"><h2 className="text-base font-bold">Kat planı</h2><img src={m.plan_url} alt={`${m.title} kat planı`} className="mt-3 w-full rounded-2xl" loading="lazy" /></div>}
      </section>
      <LeadForm model={m} />
      {zoom && imgs[i] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <img src={imgs[i]} alt={m.title} className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </>
  );
}

function Circle({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-[#EAF1FC] px-2 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{k}</p>
      <p className="mt-0.5 text-[15px] font-bold text-[#16428F]">{v}</p>
    </div>
  );
}

function Why() {
  const items = [
    ['Anahtar teslim', 'Projeden teslime kadar tek muhatap: Embay Yapı.'],
    ['Gerçek projeler', 'Sitedeki "Teslim ettik" etiketli evler bizim tamamladığımız projelerdir.'],
    ['Size özel teklif', 'Metrekare, kat ve teslim tipine göre net teklif hazırlarız.'],
  ];
  return (
    <section id="kurumsal" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
      <h2 className="mb-5 text-2xl font-light">Neden <span className="font-bold">Embay Yapı?</span></h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(([t, d]) => (
          <div key={t} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <Check className="h-6 w-6 rounded-full bg-[#EAF1FC] p-1 text-[#1E5BC6]" />
            <h3 className="mt-3 font-bold">{t}</h3>
            <p className="mt-1 text-sm font-light text-slate-600">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeadForm({ model }: { model?: Model }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [area, setArea] = useState(''); const [note, setNote] = useState('');
  const [kvkk, setKvkk] = useState(false); const [ticari, setTicari] = useState(false);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const d = phone.replace(/\D/g, '');
    if (name.trim().length < 2 || d.length < 10 || d.length > 13) { setMsg({ ok: false, t: 'Lütfen ad soyad ve geçerli bir telefon girin.' }); return; }
    if (!kvkk) { setMsg({ ok: false, t: 'Devam etmek için KVKK aydınlatma metnini onaylayın.' }); return; }
    if (!supabase) { setMsg({ ok: false, t: `Form şu an kullanılamıyor. Lütfen arayın: ${PHONE}` }); return; }
    setBusy(true);
    const text = [model && `Model: ${model.title}${model.code ? ` (${model.code})` : ''}`, area && `İstenen m²/teslim: ${area}`, note].filter(Boolean).join(' · ');
    const { error } = await supabase.from('lead_inbox').insert({
      full_name: name.trim().slice(0, 120), phone: phone.trim(), demand: 'konut_insaati', note: text.slice(0, 1000), model_slug: model?.slug ?? null,
      kvkk_aydinlatma_onay: true, aydinlatma_version: 'showroom-2026-10', ticari_ileti_izni: ticari, izin_kanallari: ticari ? ['arama', 'whatsapp'] : [],
      consent_source: 'web_form', page_url: window.location.href.slice(0, 300), user_agent: navigator.userAgent.slice(0, 300),
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, t: `Talebiniz gönderilemedi. Lütfen arayın: ${PHONE}` }); return; }
    setMsg({ ok: true, t: 'Teşekkürler! Talebinizi aldık, en kısa sürede sizi arayacağız.' });
    setName(''); setPhone(''); setArea(''); setNote(''); setKvkk(false); setTicari(false);
  };
  const inp = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1E5BC6]';
  return (
    <section id="teklif" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 pt-4">
      <div className="rounded-3xl bg-gradient-to-br from-[#16428F] to-[#1E5BC6] p-6 text-white shadow-lg sm:p-8">
        <h2 className="text-2xl font-light">Projenize uygun evi <span className="font-bold">birlikte belirleyelim</span></h2>
        <p className="mt-1 text-sm font-light text-white/85">{model ? `${model.title} için teklif isteyin.` : 'Metrekare ve teslim tipini yazın, size özel teklifinizi hazırlayalım.'}</p>
        <form onSubmit={submit} className="mt-5 grid gap-3 text-[#14213D] sm:grid-cols-2">
          <input className={inp} placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inp} placeholder="Telefon" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={`${inp} sm:col-span-2`} placeholder="İstediğiniz m² ve teslim tipi (ör. 120 m², anahtar teslim)" value={area} onChange={(e) => setArea(e.target.value)} />
          <textarea className={`${inp} sm:col-span-2`} rows={3} placeholder="Notunuz (arsa ilçesi, kat sayısı vb.)" value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="flex gap-2 text-[12px] text-white/90 sm:col-span-2"><input type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} className="mt-0.5" />
            Kişisel verilerimin teklif hazırlanması amacıyla işlenmesine ilişkin KVKK aydınlatma metnini okudum.</label>
          <label className="flex gap-2 text-[12px] text-white/90 sm:col-span-2"><input type="checkbox" checked={ticari} onChange={(e) => setTicari(e.target.checked)} className="mt-0.5" />
            Kampanya ve bilgilendirmeler için telefon / WhatsApp ile aranmayı kabul ediyorum (isteğe bağlı).</label>
          {msg && <p className={`rounded-xl px-4 py-2.5 text-sm sm:col-span-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{msg.t}</p>}
          <button disabled={busy} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#16428F] disabled:opacity-60 sm:col-span-2">{busy ? 'Gönderiliyor…' : 'Teklif iste'}</button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="iletisim" className="bg-[#14213D] text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row">
        <img src={LOGO} alt="Embay Yapı" className="h-12 w-auto" />
        <div className="text-center font-light text-white/80 sm:text-right">
          <a href={`tel:${PHONE_CLEAN}`} className="font-semibold text-white">{PHONE}</a>
          <p>embayyapi.com.tr · @embayyapi</p>
        </div>
      </div>
    </footer>
  );
}

const FAQ: Array<[string, string]> = [
  ['Teklif almak için ne gerekiyor?', 'Arsanızın bulunduğu ilçe, istediğiniz yaklaşık metrekare, kat sayısı ve teslim tipi (anahtar teslim / ileri kaba) yeterli. Formu doldurun ya da bizi arayın; size özel teklifi hazırlayalım.'],
  ['Fiyata neler dahil?', 'Her modelin sayfasında fiyata dahil olan ve olmayan kalemler ayrıca yazılıdır. Arsa ve zemin koşulları projeden projeye değiştiği için kesin kapsam teklifte netleşir.'],
  ['Hazır modeller dışında kendi projemi yaptırabilir miyim?', 'Evet. Modellerimiz fikir vermesi içindir; arsanıza ve ihtiyacınıza göre planı birlikte şekillendiririz.'],
  ['"Teslim ettik" etiketi ne anlama geliyor?', 'Bu etiketli evler Embay Yapı olarak tamamlayıp teslim ettiğimiz gerçek projelerdir; fotoğraflar sahadan çekilmiştir.'],
  ['Hangi bölgelerde çalışıyorsunuz?', 'Arsanızın ilçesini formda belirtin; bölgenizde hizmet verip veremeyeceğimizi hemen bildirelim.'],
];
function Faq() {
  const [o, setO] = useState<number | null>(0);
  return (
    <section id="sss" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-12">
      <h2 className="mb-5 text-2xl font-light">Sık sorulan <span className="font-bold">sorular</span></h2>
      <div className="space-y-2.5">
        {FAQ.map(([q, a], k) => (
          <div key={q} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <button onClick={() => setO(o === k ? null : k)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-semibold">
              {q}<ChevronDown className={`h-5 w-5 shrink-0 transition ${o === k ? 'rotate-180' : ''}`} />
            </button>
            {o === k && <p className="px-5 pb-5 text-sm font-light leading-relaxed text-slate-600">{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Loading() { return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">Yükleniyor…</div>; }
function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-lg font-semibold">Bu model şu an yayında değil.</p>
      <button onClick={() => go('/evler')} className="mt-4 rounded-full bg-[#16428F] px-5 py-2.5 text-sm font-semibold text-white">Tüm modeller</button>
    </div>
  );
}
