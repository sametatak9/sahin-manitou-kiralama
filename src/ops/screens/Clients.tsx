// AJANS MÜŞTERİLERİ: panelin hizmet verdiği işletmeler. Her işletmenin marka bilgisi, hedef kitlesi, büyüme etiketleri ve
// bağlı sosyal hesapları burada. Yeni işletme eklemek = yeni müşteri; botlar seçili müşterinin bilgileriyle çalışır.
import { useMemo, useState } from 'react';
import { Building2, Check, Pencil, Plus, PlugZap, TrendingUp, Users } from 'lucide-react';
import { db, unwrap, useQuery } from '../lib/hooks';
import { initials, SECTORS, useClient, type AgencyClient } from '../client';
import { useRouter } from '../session';
import { Button, cx, Field, Modal, Notice, PlatformBadge, StateView } from '../ui';

interface Acc { id: string; platform: string; connector_key: string | null; account_name: string | null; external_account_name: string | null; handle: string | null; connection_status: string | null; client_id: string | null }
interface Kit { id: string; phone: string | null; phone2: string | null; slogan: string | null; website: string | null; instagram: string | null; default_cta: string | null }
interface Snap { client_id: string; platform: string; followers: number | null; day: string }

const COLORS = ['#0F1A33', '#1E3FA0', '#0F766E', '#7C2D12', '#6D28D9', '#BE123C', '#15803D', '#334155'];
const slugify = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const tagList = (s: string) => [...new Set(s.split(/[\s,\n]+/).map((x) => x.replace(/^#/, '').trim().toLocaleLowerCase('tr-TR')).filter((x) => x.length >= 3))].slice(0, 28);

interface Form { name: string; sector: string; region: string; services: string; audience: string; tags: string; pillars: string; phone: string; phone2: string; slogan: string; website: string; color: string }
const EMPTY: Form = { name: '', sector: 'insaat', region: '', services: '', audience: '', tags: '', pillars: '', phone: '', phone2: '', slogan: '', website: '', color: COLORS[1] };

export function ClientsScreen() {
  const { clients, client: selected, setClientId, reload } = useClient();
  const { go } = useRouter();
  const accs = useQuery(async () => unwrap(await db().from('social_accounts').select('id,platform,connector_key,account_name,external_account_name,handle,connection_status,client_id').order('created_at')) as Acc[], [] as Acc[], [], ['social_accounts']);
  const kits = useQuery(async () => unwrap(await db().from('brand_kits').select('id,phone,phone2,slogan,website,instagram,default_cta')) as Kit[], [] as Kit[], []);
  const snaps = useQuery(async () => unwrap(await db().from('growth_snapshots').select('client_id,platform,followers,day').order('day', { ascending: false }).limit(200)) as Snap[], [] as Snap[], [], ['growth_snapshots']);
  const [edit, setEdit] = useState<AgencyClient | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const latest = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of snaps.data) { const k = `${s.client_id}:${s.platform}`; if (!m.has(k) && s.followers != null) m.set(k, s.followers); }
    return m;
  }, [snaps.data]);

  const open = (c: AgencyClient | 'new') => {
    setMsg(null); setEdit(c);
    if (c === 'new') { setForm(EMPTY); return; }
    const k = kits.data.find((x) => x.id === c.brand_kit_id);
    setForm({ name: c.name, sector: c.sector ?? 'diger', region: c.region ?? '', services: (c.services ?? []).join(', '), audience: c.audience ?? '', tags: (c.growth_tags ?? []).map((t) => `#${t}`).join(' '),
      pillars: (c.content_pillars ?? []).join(', '), phone: k?.phone ?? '', phone2: k?.phone2 ?? '', slogan: k?.slogan ?? '', website: k?.website ?? '', color: c.color ?? COLORS[1] });
  };
  const save = async () => {
    if (form.name.trim().length < 2) { setMsg({ tone: 'error', text: 'İşletme adı gerekli.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const kitRow = { name: form.name.trim(), company_name: form.name.trim(), phone: form.phone.trim() || null, phone2: form.phone2.trim() || null, slogan: form.slogan.trim() || null, website: form.website.trim() || null, primary_color: form.color };
      const row = { name: form.name.trim(), sector: form.sector, region: form.region.trim() || null, services: list(form.services), audience: form.audience.trim() || null,
        growth_tags: tagList(form.tags), content_pillars: list(form.pillars), color: form.color };
      if (edit === 'new') {
        const kit = unwrap(await db().from('brand_kits').insert({ ...kitRow, is_default: false }).select('id').single()) as { id: string };
        const c = unwrap(await db().from('agency_clients').insert({ ...row, slug: `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`, status: 'active', brand_kit_id: kit.id }).select('id').single()) as { id: string };
        await db().from('brand_kits').update({ client_id: c.id }).eq('id', kit.id);
        await reload(); setClientId(c.id);
      } else if (edit) {
        unwrap(await db().from('agency_clients').update(row).eq('id', edit.id).select('id'));
        if (edit.brand_kit_id) unwrap(await db().from('brand_kits').update(kitRow).eq('id', edit.brand_kit_id).select('id'));
        else { const kit = unwrap(await db().from('brand_kits').insert({ ...kitRow, is_default: false, client_id: edit.id }).select('id').single()) as { id: string }; await db().from('agency_clients').update({ brand_kit_id: kit.id }).eq('id', edit.id); }
        await reload();
      }
      await kits.reload(); setEdit(null); setMsg({ tone: 'ok', text: 'Kaydedildi.' });
    } catch (e) { setMsg({ tone: 'error', text: (e as Error).message }); } finally { setBusy(false); }
  };
  const assign = async (a: Acc, clientId: string) => {
    const { error } = await db().from('social_accounts').update({ client_id: clientId || null }).eq('id', a.id);
    if (error) setMsg({ tone: 'error', text: error.message }); else await accs.reload();
  };
  const setStatus = async (c: AgencyClient, status: 'active' | 'paused') => { await db().from('agency_clients').update({ status }).eq('id', c.id); await reload(); };

  const connected = accs.data.filter((a) => a.connection_status === 'connected');

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-[#0F1A33] via-[#1B2B55] to-[#0F1A33] text-white p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#E2C98F]">REKLAM AJANSI · MÜŞTERİ PORTFÖYÜ</div>
          <h2 className="font-display text-xl font-semibold mt-0.5">{clients.length} işletme · {connected.length} bağlı hesap</h2>
          <p className="text-[12px] text-[#C8D1E3] mt-1 max-w-2xl">Her işletme bir müşteri. Botlar (içerik, büyüme radarı, yorum yanıtı) seçili müşterinin marka bilgisi, hedef kitlesi ve etiketleriyle çalışır. Yeni işletme ekleyin, Instagram/Facebook hesabını bağlayıp aşağıdan o işletmeye atayın.</p>
        </div>
        <button type="button" onClick={() => open('new')} className="inline-flex items-center gap-1.5 rounded-full bg-[#C9A45C] text-[#0A1226] px-4 py-2 text-[13px] font-bold"><Plus className="w-4 h-4" />Yeni işletme ekle</button>
      </section>

      {msg && !edit && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {!clients.length ? <StateView kind="empty" title="Henüz müşteri yok" message="“Yeni işletme ekle” ile başlayın." /> : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clients.map((c) => {
            const mine = accs.data.filter((a) => a.client_id === c.id && a.connection_status === 'connected');
            const ig = latest.get(`${c.id}:instagram`); const fb = latest.get(`${c.id}:facebook`);
            const isSel = selected?.id === c.id;
            return (
              <li key={c.id} className={cx('rounded-2xl bg-white ring-1 p-4 shadow-sm flex flex-col', isSel ? 'ring-brand-green ring-2' : 'ring-ink-700/70')}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center text-sm font-bold text-white shrink-0" style={{ background: c.color || '#1E3FA0' }}>{initials(c.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="font-semibold text-ink-100 truncate">{c.name}</span>{c.status !== 'active' && <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">DURAKLATILDI</span>}</div>
                    <div className="text-[11px] text-ink-400">{SECTORS[c.sector ?? ''] ?? c.sector ?? '—'}{c.region ? ` · ${c.region}` : ''}</div>
                  </div>
                  <button type="button" onClick={() => open(c)} title="Düzenle" className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-900"><Pencil className="w-4 h-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-ink-900 py-1.5"><div className="text-[15px] font-bold tabular-nums text-ink-100">{ig != null ? ig.toLocaleString('tr-TR') : '—'}</div><div className="text-[10px] text-ink-400">IG takipçi</div></div>
                  <div className="rounded-xl bg-ink-900 py-1.5"><div className="text-[15px] font-bold tabular-nums text-ink-100">{fb != null ? fb.toLocaleString('tr-TR') : '—'}</div><div className="text-[10px] text-ink-400">FB takipçi</div></div>
                  <div className="rounded-xl bg-ink-900 py-1.5"><div className="text-[15px] font-bold tabular-nums text-ink-100">{(c.growth_tags ?? []).length}</div><div className="text-[10px] text-ink-400">etiket</div></div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1">{mine.length ? mine.map((a) => <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800"><PlatformBadge platform={a.connector_key ?? a.platform} />{a.external_account_name ?? a.account_name ?? a.handle}</span>)
                  : <span className="text-[11px] text-amber-700">Bağlı sosyal hesap yok — botlar bu işletme için yayın/tarama yapamaz.</span>}</div>
                {c.audience && <p className="mt-2 text-[11px] text-ink-300 line-clamp-2"><Users className="inline w-3 h-3 mr-1" />{c.audience}</p>}
                <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                  {isSel ? <span className="ops-chip !bg-brand-green !text-white !ring-transparent"><Check className="w-3.5 h-3.5" />Seçili müşteri</span>
                    : <button type="button" onClick={() => setClientId(c.id)} className="ops-chip">Bu müşteriye geç</button>}
                  <button type="button" onClick={() => { setClientId(c.id); go('growth'); }} className="ops-chip"><TrendingUp className="w-3.5 h-3.5" />Büyüme</button>
                  <button type="button" onClick={() => setStatus(c, c.status === 'active' ? 'paused' : 'active')} className="ops-chip">{c.status === 'active' ? 'Duraklat' : 'Etkinleştir'}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hesap → müşteri ataması */}
      <section className="rounded-2xl bg-white ring-1 ring-ink-700/70 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <PlugZap className="w-4 h-4 text-brand-green" /><h3 className="font-semibold text-ink-100 text-[14px]">Sosyal hesaplar hangi işletmenin?</h3>
          <button type="button" onClick={() => go('connections')} className="ops-chip ml-auto">Yeni hesap bağla</button>
        </div>
        <p className="text-[11px] text-ink-400 mb-3">Yeni bir işletmenin Instagram/Facebook hesabını “Uygulamalar” ekranından bağlayın, sonra burada o işletmeyi seçin. Botlar yalnızca işletmenin kendi hesabıyla çalışır.</p>
        {!accs.data.length ? <StateView kind="empty" compact title="Hesap yok" /> : (
          <ul className="divide-y divide-ink-800">
            {accs.data.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap items-center gap-2">
                <PlatformBadge platform={a.connector_key ?? a.platform} />
                <span className="text-[13px] text-ink-100 flex-1 min-w-[140px] truncate">{a.external_account_name ?? a.account_name ?? a.handle ?? a.platform}</span>
                <span className={cx('text-[10px] font-bold rounded-full px-2 py-0.5', a.connection_status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-900 text-ink-400')}>{a.connection_status === 'connected' ? 'BAĞLI' : 'bağlı değil'}</span>
                <select className="ops-input !py-1 text-[12px] w-48" value={a.client_id ?? ''} onChange={(e) => assign(a, e.target.value)}>
                  <option value="">— işletme seçin —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={<span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4" />{edit === 'new' ? 'Yeni işletme (müşteri)' : 'İşletmeyi düzenle'}</span>}
        footer={<div className="flex gap-2 justify-end"><Button onClick={() => setEdit(null)}>Vazgeç</Button><Button variant="primary" loading={busy} onClick={save}>Kaydet</Button></div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {msg && edit && <div className="sm:col-span-2"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
          <Field label="İşletme adı"><input className="ops-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ör. Yıldız Mobilya" /></Field>
          <Field label="Sektör"><select className="ops-input w-full" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>{Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Bölge"><input className="ops-input w-full" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="ör. Çatalca / İstanbul" /></Field>
          <Field label="Hizmetler" hint="virgülle ayırın"><input className="ops-input w-full" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="villa, tadilat, çelik yapı" /></Field>
          <Field label="Hedef kitle" className="sm:col-span-2" hint="Kimi bulmak istiyoruz? Botun radar puanlaması ve içerik dili buna göre."><textarea className="ops-input w-full" rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="ör. Arsası olup bahçeli ev yaptırmak isteyen aileler" /></Field>
          <Field label="Büyüme etiketleri" className="sm:col-span-2" hint="Hedef kitlenin kullandığı etiketler (en fazla 28; Instagram haftada 30 farklı etiket aramaya izin verir)"><textarea className="ops-input w-full font-mono text-[12px]" rows={2} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="#müstakilev #bahçeliev #evyaptırmak" /></Field>
          <Field label="İçerik temaları" className="sm:col-span-2" hint="virgülle ayırın"><input className="ops-input w-full" value={form.pillars} onChange={(e) => setForm({ ...form, pillars: e.target.value })} placeholder="biten proje, önce/sonra, ipucu, kampanya" /></Field>
          <Field label="Telefon"><input className="ops-input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="2. telefon"><input className="ops-input w-full" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} /></Field>
          <Field label="Slogan"><input className="ops-input w-full" value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></Field>
          <Field label="Web sitesi"><input className="ops-input w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <Field label="Marka rengi" className="sm:col-span-2"><div className="flex gap-2">{COLORS.map((col) => <button key={col} type="button" onClick={() => setForm({ ...form, color: col })} className={cx('w-8 h-8 rounded-xl ring-2', form.color === col ? 'ring-brand-green' : 'ring-transparent')} style={{ background: col }} aria-label={col} />)}</div></Field>
        </div>
      </Modal>
    </div>
  );
}
