import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, ImagePlus, Loader2, PenTool, Save, Send, Sparkles, Wand2 } from 'lucide-react';
import { callOps, errorCode, errorText } from '../lib/api';
import { db, unwrap, useQuery } from '../lib/hooks';
import { dayKey, istanbulToIso, PUBLISHABLE_PLATFORMS, platformMeta, timeOf } from '../lib/format';
import type { BrandKit, Design, DesignLayers, Draft, OpsStatus, Template } from '../lib/types';
import { useRouter, useSession } from '../session';
import { Button, cx, Field, Notice, Panel, Pill, PlatformBadge, StateView } from '../ui';
import { DesignCanvas, FORMATS, svgToPng, toDataUrl, VARIANTS } from '../components/DesignCanvas';
import { PostPreview } from '../components/PostPreview';

const STEPS = ['Brief', 'İçerik', 'Tasarım', 'Önizleme', 'Onay & Zamanlama'] as const;
const NETWORKS = ['instagram', 'facebook', 'tiktok', 'youtube', 'google_business', 'linkedin', 'x', 'sahibinden', 'armut'];
const TONES = ['Kurumsal ve güven veren', 'Samimi ve yerel', 'Teknik ve bilgilendirici', 'Kampanya / aciliyet', 'Esprili şantiye dili'];
const OBJECTIVES = ['Teklif talebi (lead)', 'Marka bilinirliği', 'Saha/proje gösterimi', 'Kentsel dönüşüm bilgilendirme', 'Özel gün / topluluk'];

interface Brief { platform: string; format: string; topic: string; objective: string; audience: string; tone: string; cta: string; date: string; time: string; brandKitId: string }
interface Content { title: string; headline: string; caption: string; hashtags: string; cta: string; image_idea: string; design_brief: string; ai_generation_id?: string }

export function StudioScreen() {
  const { state, go } = useRouter();
  const session = useSession();
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(state.id ?? null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief>({ platform: 'instagram', format: 'instagram_post', topic: '', objective: OBJECTIVES[0], audience: 'Avrupa Yakası müteahhitleri ve şantiye şefleri', tone: TONES[0], cta: '', date: dayKey(new Date(Date.now() + 86400_000)), time: '10:00', brandKitId: '' });
  const [content, setContent] = useState<Content>({ title: '', headline: '', caption: '', hashtags: '', cta: '', image_idea: '', design_brief: '' });
  const [layers, setLayers] = useState<DesignLayers>({ variant: 'hero', headline: '', subtitle: '', cta: '', image_url: null, show_logo: true, show_phone: true });
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [canva, setCanva] = useState<{ editUrl: string | null; designId: string | null }>({ editUrl: null, designId: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const [aiBlocked, setAiBlocked] = useState(false);
  const [designPrompt, setDesignPrompt] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const refs = useQuery(async () => {
    const [kits, tpls] = await Promise.all([db().from('brand_kits').select('*').order('is_default', { ascending: false }), db().from('design_templates').select('*').eq('active', true)]);
    return { kits: unwrap(kits) as BrandKit[], templates: unwrap(tpls) as Template[] };
  }, { kits: [] as BrandKit[], templates: [] as Template[] }, []);
  const status = useQuery<OpsStatus | null>(() => callOps<OpsStatus>('status'), null, []);
  const brand = refs.data.kits.find((k) => k.id === brief.brandKitId) ?? refs.data.kits[0] ?? null;
  const template = refs.data.templates.find((t) => t.format_key === brief.format) ?? { width: 1080, height: 1080, id: '', format_key: brief.format } as Template;

  // Var olan taslağı aç
  useEffect(() => {
    if (!state.id) return;
    (async () => {
      const d = (await db().from('social_drafts').select('*').eq('id', state.id).maybeSingle()).data as Draft | null;
      if (!d) return;
      setDraftId(d.id);
      setBrief((b) => ({ ...b, platform: d.primary_platform || d.platform_targets[0] || 'instagram', topic: d.title, objective: d.objective || b.objective, audience: d.audience || b.audience, tone: d.tone || b.tone,
        date: d.scheduled_at ? dayKey(d.scheduled_at) : b.date, time: d.scheduled_at ? timeOf(d.scheduled_at) : b.time }));
      setContent({ title: d.title, headline: d.headline || '', caption: d.caption || d.body, hashtags: (d.hashtags || []).join(' '), cta: d.cta || '', image_idea: d.image_brief || '', design_brief: d.design_brief || '' });
      if (d.design_id) {
        const des = (await db().from('designs').select('*').eq('id', d.design_id).maybeSingle()).data as Design | null;
        if (des) { setDesignId(des.id); setLayers({ ...layers, ...des.layers }); setExportUrl(des.export_url); setCanva({ editUrl: des.canva_edit_url, designId: des.canva_design_id }); setBrief((b) => ({ ...b, format: des.format_key })); }
      } else if (d.media_urls?.[0]) setExportUrl(d.media_urls[0]);
      setStep(1);
    })();
  }, [state.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Görselleri data URL'e çevir (PNG dışa aktarımı için)
  const [imageData, setImageData] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);
  useEffect(() => { if (!layers.image_url) { setImageData(null); return; } toDataUrl(layers.image_url).then(setImageData).catch(() => setImageData(layers.image_url)); }, [layers.image_url]);
  useEffect(() => { if (!brand?.logo_url) { setLogoData(null); return; } toDataUrl(brand.logo_url).then(setLogoData).catch(() => setLogoData(null)); }, [brand?.logo_url]);

  const hashtags = useMemo(() => content.hashtags.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)), [content.hashtags]);
  const connector = status.data?.connectors.find((c) => c.key === brief.platform);
  const canvaStatus = status.data?.connectors.find((c) => c.key === 'canva');

  const generate = async () => {
    setBusy('ai'); setMsg(null);
    try {
      const out = await callOps<Record<string, unknown>>('generate_post', { input: { platform: brief.platform, topic: brief.topic, objective: brief.objective, audience: brief.audience, tone: brief.tone, cta: brief.cta } });
      const c: Content = { title: String(out.title ?? brief.topic), headline: String(out.headline ?? ''), caption: String(out.caption ?? ''), hashtags: ((out.hashtags as string[]) || []).join(' '), cta: String(out.cta ?? brief.cta), image_idea: String(out.image_idea ?? ''), design_brief: String(out.design_brief ?? ''), ai_generation_id: out.ai_generation_id as string | undefined };
      setContent(c); setLayers((l) => ({ ...l, headline: c.headline || c.title, subtitle: c.caption.split(/[.!?]\s/)[0]?.slice(0, 120) || '', cta: c.cta }));
      setMsg({ tone: 'ok', text: 'AI içerik üretti ve ai_generations kaydına yazıldı. Düzenleyip devam edin.' }); setStep(1);
    } catch (e) {
      if (errorCode(e) === 'CONFIGURATION_REQUIRED') { setAiBlocked(true); setMsg({ tone: 'warn', text: `${errorText(e)} — içeriği elle yazabilirsiniz.` }); }
      else setMsg({ tone: 'error', text: errorText(e) });
    } finally { setBusy(null); }
  };

  const suggestDesign = async () => {
    setBusy('design-ai'); setMsg(null);
    try {
      const s = await callOps<Record<string, string>>('design_suggestion', { prompt: designPrompt || `${content.headline || brief.topic} — ${brief.objective}`, format: brief.format });
      setLayers((l) => ({ ...l, variant: (s.layout as DesignLayers['variant']) || l.variant, headline: s.headline || l.headline, subtitle: s.subtitle || l.subtitle, cta: s.cta || l.cta }));
      setMsg({ tone: 'ok', text: `AI önerisi uygulandı · görsel fikri: ${s.image_idea ?? '-'} · yerleşim: ${s.image_placement ?? '-'}` });
    } catch (e) { setMsg({ tone: errorCode(e) === 'CONFIGURATION_REQUIRED' ? 'warn' : 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  const uploadImage = async (file: File) => {
    setBusy('upload'); setMsg(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error } = await db().storage.from('design-exports').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setLayers((l) => ({ ...l, image_url: db().storage.from('design-exports').getPublicUrl(path).data.publicUrl }));
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  const saveDraft = async (): Promise<string> => {
    const scheduled = brief.date ? istanbulToIso(brief.date, brief.time) : null;
    const payload = {
      title: (content.title || brief.topic || 'Yeni gönderi').slice(0, 200), body: `${content.caption}${hashtags.length ? `\n\n${hashtags.join(' ')}` : ''}` || '(boş)', caption: content.caption, headline: content.headline || null,
      hashtags, cta: content.cta || null, audience: brief.audience, objective: brief.objective, tone: brief.tone, image_brief: content.image_idea || null, design_brief: content.design_brief || null,
      platform_targets: [brief.platform], networks: NETWORKS.includes(brief.platform) ? [brief.platform] : [], primary_platform: brief.platform, format: brief.format, scheduled_at: scheduled,
      brand_kit_id: brand?.id ?? null, design_id: designId, media_urls: exportUrl ? [exportUrl] : [], ai_generation_id: content.ai_generation_id ?? null, brand: 'İkisi', archive_status: 'active',
    };
    if (draftId) { const { error } = await db().from('social_drafts').update(payload).eq('id', draftId); if (error) throw error; return draftId; }
    const { data, error } = await db().from('social_drafts').insert({ ...payload, status: 'taslak', workflow_status: 'draft', kvkk_basis: 'Panel içi taslak; yayın öncesi insan onayı gerekir.' }).select('id').single();
    if (error) throw error;
    setDraftId(data.id);
    if (designId) await db().from('designs').update({ content_id: data.id }).eq('id', designId);
    return data.id;
  };

  const ensureDesign = async (): Promise<string> => {
    const row = { content_id: draftId, template_id: template.id || null, brand_kit_id: brand?.id ?? null, name: (layers.headline || content.title || 'Tasarım').slice(0, 80), format_key: brief.format, width: template.width, height: template.height, layers };
    if (designId) { const { error } = await db().from('designs').update(row).eq('id', designId); if (error) throw error; return designId; }
    const { data, error } = await db().from('designs').insert({ ...row, provider: 'embay_studio' }).select('id').single();
    if (error) throw error;
    setDesignId(data.id);
    return data.id;
  };

  const exportPng = async () => {
    if (!svgRef.current) return;
    setBusy('export'); setMsg(null);
    try {
      const id = await ensureDesign();
      const blob = await svgToPng(svgRef.current, template.width, template.height);
      const path = `studio/${id}-${Date.now()}.png`;
      const { error } = await db().storage.from('design-exports').upload(path, blob, { contentType: 'image/png' });
      if (error) throw error;
      const url = db().storage.from('design-exports').getPublicUrl(path).data.publicUrl;
      await db().from('designs').update({ export_url: url, export_path: path, thumbnail_url: url, status: 'exported' }).eq('id', id);
      if (draftId) await db().from('social_drafts').update({ media_urls: [url], design_id: id }).eq('id', draftId);
      setExportUrl(url);
      setMsg({ tone: 'ok', text: `PNG (${template.width}×${template.height}) Supabase Storage’a yüklendi — Instagram API bu herkese açık URL’i kullanır.` });
    } catch (e) {
      setMsg({ tone: 'error', text: /tainted|security|SVG/i.test(errorText(e)) ? 'Görsel başka bir alan adından geldiği için dışa aktarılamadı. Görseli “Görsel yükle” ile yükleyin.' : errorText(e) });
    } finally { setBusy(null); }
  };

  const canvaCreate = async () => {
    setBusy('canva'); setMsg(null);
    try {
      const id = await ensureDesign();
      const r = await callOps<{ id: string; editUrl: string }>('canva_create_design', { design_id: id });
      setCanva({ editUrl: r.editUrl, designId: r.id });
      setMsg({ tone: 'ok', text: 'Tasarım Canva hesabınızda oluşturuldu. Düzenledikten sonra “Canva’dan içe al” ile PNG’yi geri alın.' });
    } catch (e) { setMsg({ tone: errorCode(e) === 'OAUTH_REQUIRED' ? 'warn' : 'error', text: errorText(e) }); } finally { setBusy(null); }
  };
  const canvaImport = async () => {
    if (!designId) return;
    setBusy('canva-export'); setMsg(null);
    try { const r = await callOps<{ export_url: string }>('canva_export', { design_id: designId }); setExportUrl(r.export_url); setMsg({ tone: 'ok', text: 'Canva tasarımı PNG olarak içe alındı.' }); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  const submit = async () => {
    setBusy('submit'); setMsg(null);
    try {
      if (!content.caption.trim()) throw new Error('Gönderi metni boş olamaz.');
      const id = await saveDraft();
      if (designId) await db().from('designs').update({ content_id: id }).eq('id', designId);
      const scheduled = brief.date ? istanbulToIso(brief.date, brief.time) : null;
      const { data, error } = await db().from('approval_requests').insert({
        entity_type: 'content', entity_id: id, title: content.title || brief.topic, summary: `${platformMeta(brief.platform).name} · ${brief.date} ${brief.time} · ${brief.objective}`,
        platform: brief.platform, status: 'pending_approval', scheduled_for: scheduled, payload: { content_id: id, platform: brief.platform, source: 'studio' },
      }).select('id').single();
      if (error) throw error;
      await db().from('social_drafts').update({ workflow_status: 'pending_approval', status: 'onay_bekliyor', approval_request_id: data.id }).eq('id', id);
      setMsg({ tone: 'ok', text: 'Onay kuyruğuna gönderildi. Onaylanınca zamanı gelen içerik bağlı hesapta resmi API ile yayınlanır.' });
      go('approvals', data.id);
    } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); }
  };

  const saveOnly = async () => { setBusy('save'); setMsg(null); try { await saveDraft(); setMsg({ tone: 'ok', text: 'Taslak kaydedildi (DRAFT).' }); } catch (e) { setMsg({ tone: 'error', text: errorText(e) }); } finally { setBusy(null); } };

  const previewPlatform = brief.format === 'instagram_story' ? 'instagram_story' : brief.platform;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-100">Gönderi Üretim Merkezi</h2>
          <p className="text-xs text-ink-400">DRAFT → DESIGN → PREVIEW → APPROVAL → SCHEDULE → PUBLISH · Yayın yalnızca onay ve gerçek hesap bağlantısıyla yapılır.</p>
        </div>
        <div className="flex gap-2"><Button variant="ghost" loading={busy === 'save'} onClick={saveOnly} icon={<Save className="w-4 h-4" />}>Taslak kaydet</Button></div>
      </div>

      {/* Adım çubuğu */}
      <ol className="grid grid-cols-5 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s}><button onClick={() => setStep(i)} className={cx('w-full rounded-xl px-2 py-2 text-left ring-1 transition', i === step ? 'bg-ink-750 ring-brand-green/60' : i < step ? 'bg-ink-850 ring-ink-700' : 'bg-ink-900/60 ring-ink-800')}>
            <span className={cx('block text-[10px] font-mono', i <= step ? 'text-brand-green' : 'text-ink-500')}>{String(i + 1).padStart(2, '0')}</span>
            <span className="block text-[11px] sm:text-xs font-semibold text-ink-200 truncate">{s}</span>
          </button></li>
        ))}
      </ol>
      {msg && <Notice tone={msg.tone === 'ok' ? 'ok' : msg.tone === 'warn' ? 'warn' : 'error'}>{msg.text}</Notice>}

      {step === 0 && (
        <Panel kicker="01 · Brief" title="Ne paylaşmak istiyoruz?">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform">
              <div className="flex flex-wrap gap-1.5">
                {PUBLISHABLE_PLATFORMS.map((p) => (
                  <button key={p} onClick={() => setBrief({ ...brief, platform: p, format: FORMATS.find((f) => f.platform === p)?.key ?? brief.format })}
                    className={cx('flex items-center gap-1.5 rounded-xl px-2 py-1.5 ring-1 text-[11px] font-semibold', brief.platform === p ? 'bg-ink-750 ring-brand-green text-ink-100' : 'ring-ink-700 text-ink-400 hover:text-ink-200')}>
                    <PlatformBadge platform={p} />{platformMeta(p).name}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Format"><select className="ops-input" value={brief.format} onChange={(e) => setBrief({ ...brief, format: e.target.value })}>{FORMATS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></Field>
            <Field label="Konu" className="md:col-span-2"><input className="ops-input" value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} placeholder="Örn: Avrupa Yakası şantiyeleri için operatörlü Manitou kiralama" /></Field>
            <Field label="Amaç"><select className="ops-input" value={brief.objective} onChange={(e) => setBrief({ ...brief, objective: e.target.value })}>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Ton"><select className="ops-input" value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>{TONES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Hedef kitle"><input className="ops-input" value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></Field>
            <Field label="CTA"><input className="ops-input" value={brief.cta} onChange={(e) => setBrief({ ...brief, cta: e.target.value })} placeholder={brand?.default_cta ?? 'Hemen arayın'} /></Field>
            <Field label="Yayın tarihi"><input type="date" className="ops-input" value={brief.date} onChange={(e) => setBrief({ ...brief, date: e.target.value })} /></Field>
            <Field label="Saat (İstanbul)"><input type="time" className="ops-input" value={brief.time} onChange={(e) => setBrief({ ...brief, time: e.target.value })} /></Field>
            <Field label="Marka kiti"><select className="ops-input" value={brand?.id ?? ''} onChange={(e) => setBrief({ ...brief, brandKitId: e.target.value })}>{refs.data.kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></Field>
            <div className="flex items-end">
              {connector && <Pill tone={connector.status === 'connected' ? 'go' : connector.status === 'manual_only' ? 'info' : 'wait'}>{platformMeta(brief.platform).name}: {connector.status === 'connected' ? 'BAĞLI' : connector.status === 'manual_only' ? 'MANUEL YAYIN' : 'BAĞLI DEĞİL — onaydan sonra yayın beklemede kalır'}</Pill>}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={() => setStep(1)} icon={<PenTool className="w-4 h-4" />}>Elle yaz</Button>
            <Button variant="primary" loading={busy === 'ai'} disabled={!brief.topic.trim() || aiBlocked} onClick={generate} icon={<Sparkles className="w-4 h-4" />}>AI ile üret</Button>
          </div>
          {aiBlocked && <div className="mt-3"><StateView compact kind="config" message="AI sağlayıcı anahtarı (ANTHROPIC_API_KEY) Supabase Edge Function Secrets’a eklenince bu buton çalışır." action={<Button variant="ghost" onClick={() => go('settings')}>AI ayarları</Button>} /></div>}
        </Panel>
      )}

      {step === 1 && (
        <Panel kicker="02 · İçerik" title="Metin, hashtag ve CTA">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Başlık (iç kayıt)"><input className="ops-input" value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} /></Field>
            <Field label="Görsel başlığı (headline)"><input className="ops-input" value={content.headline} onChange={(e) => setContent({ ...content, headline: e.target.value })} /></Field>
            <Field label="Caption" className="lg:col-span-2" hint={`${content.caption.length} karakter${brief.platform === 'x' ? ' · X için 280 sınırı' : ''}`}><textarea className="ops-input min-h-[160px]" value={content.caption} onChange={(e) => setContent({ ...content, caption: e.target.value })} /></Field>
            <Field label="Hashtag’ler" hint={`${hashtags.length} etiket`}><input className="ops-input" value={content.hashtags} onChange={(e) => setContent({ ...content, hashtags: e.target.value })} placeholder="#manitou #güngören #şantiye" /></Field>
            <Field label="CTA"><input className="ops-input" value={content.cta} onChange={(e) => setContent({ ...content, cta: e.target.value })} /></Field>
            <Field label="Görsel fikri"><textarea className="ops-input min-h-[80px]" value={content.image_idea} onChange={(e) => setContent({ ...content, image_idea: e.target.value })} /></Field>
            <Field label="Tasarım brief’i"><textarea className="ops-input min-h-[80px]" value={content.design_brief} onChange={(e) => setContent({ ...content, design_brief: e.target.value })} /></Field>
          </div>
          <StepNav onPrev={() => setStep(0)} onNext={() => { setLayers((l) => ({ ...l, headline: l.headline || content.headline || content.title, cta: l.cta || content.cta })); setStep(2); }} />
        </Panel>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
          <Panel kicker="03 · Embay Design Studio" title="Tasarım katmanları">
            <div className="space-y-3">
              <Field label="Format"><select className="ops-input" value={brief.format} onChange={(e) => setBrief({ ...brief, format: e.target.value })}>{FORMATS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></Field>
              <div>
                <span className="block text-[11px] font-semibold text-ink-300 mb-1.5">Şablon</span>
                <div className="grid grid-cols-3 gap-1.5">{VARIANTS.map((v) => <button key={v.key} onClick={() => setLayers({ ...layers, variant: v.key })} className={cx('rounded-lg py-1.5 text-[11px] font-semibold ring-1', layers.variant === v.key ? 'bg-ink-750 ring-brand-green text-ink-100' : 'ring-ink-700 text-ink-400')}>{v.label}</button>)}</div>
              </div>
              <Field label="Başlık"><input className="ops-input" value={layers.headline} onChange={(e) => setLayers({ ...layers, headline: e.target.value })} /></Field>
              <Field label="Alt başlık"><input className="ops-input" value={layers.subtitle} onChange={(e) => setLayers({ ...layers, subtitle: e.target.value })} /></Field>
              <Field label="CTA"><input className="ops-input" value={layers.cta} onChange={(e) => setLayers({ ...layers, cta: e.target.value })} /></Field>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl ring-1 ring-ink-600 px-3 py-2 text-xs font-semibold text-ink-200 hover:bg-ink-800">
                  {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Görsel yükle
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
                {layers.image_url && <Button variant="subtle" onClick={() => setLayers({ ...layers, image_url: null })}>Görseli kaldır</Button>}
              </div>
              <div className="flex gap-4 text-xs text-ink-300">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={layers.show_logo} onChange={(e) => setLayers({ ...layers, show_logo: e.target.checked })} /> Logo</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={layers.show_phone} onChange={(e) => setLayers({ ...layers, show_phone: e.target.checked })} /> Telefon</label>
              </div>
              <div className="rounded-xl bg-ink-900 ring-1 ring-ink-700 p-3 space-y-2">
                <div className="text-[11px] font-semibold text-ink-300 flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5 text-brand-green" /> AI tasarım önerisi</div>
                <input className="ops-input" value={designPrompt} onChange={(e) => setDesignPrompt(e.target.value)} placeholder="Manitou kiralama için Avrupa Yakası şantiye odaklı kurumsal gönderi" />
                <Button variant="subtle" className="w-full" loading={busy === 'design-ai'} onClick={suggestDesign}>Yerleşim + başlık öner</Button>
              </div>
              <div className="rounded-xl bg-ink-900 ring-1 ring-ink-700 p-3 space-y-2">
                <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-ink-300">Canva Connect</span>{canvaStatus && <Pill tone={canvaStatus.status === 'connected' ? 'go' : 'wait'}>{canvaStatus.status === 'connected' ? 'BAĞLI' : 'CANVA BAĞLA'}</Pill>}</div>
                {canvaStatus?.status === 'connected' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="subtle" loading={busy === 'canva'} onClick={canvaCreate}>Canva’da oluştur</Button>
                    {canva.editUrl && <a href={canva.editUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl ring-1 ring-ink-600 px-3 py-2 text-xs text-ink-200"><ExternalLink className="w-3.5 h-3.5" /> Canva’da düzenle</a>}
                    {canva.designId && <Button variant="subtle" loading={busy === 'canva-export'} onClick={canvaImport}>Canva’dan içe al</Button>}
                  </div>
                ) : <p className="text-[11px] text-ink-400">Canva hesabı bağlı değil. Platform Duvarı’ndan “Canva bağla” ile OAuth yapın; bağlanınca tasarım Canva’da açılıp PNG geri alınabilir.</p>}
              </div>
            </div>
          </Panel>
          <Panel kicker={`${template.width}×${template.height} · ${FORMATS.find((f) => f.key === brief.format)?.label ?? ''}`} title="Canlı tasarım" action={<Button variant="primary" loading={busy === 'export'} onClick={exportPng} icon={<Download className="w-4 h-4" />}>PNG dışa aktar</Button>}>
            <div className="mx-auto" style={{ maxWidth: template.height > template.width ? 360 : 640 }}>
              <div className="rounded-xl overflow-hidden ring-1 ring-ink-700 shadow-2xl">
                <DesignCanvas ref={svgRef} width={template.width} height={template.height} layers={layers} brand={brand} imageHref={imageData} logoHref={logoData} />
              </div>
            </div>
            {exportUrl && <p className="mt-3 text-[11px] text-emerald-700 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Son dışa aktarım: <a className="underline truncate" href={exportUrl} target="_blank" rel="noreferrer">{exportUrl.split('/').pop()}</a></p>}
            <StepNav onPrev={() => setStep(1)} onNext={() => setStep(3)} />
          </Panel>
        </div>
      )}

      {step === 3 && (
        <Panel kicker="04 · Önizleme" title={`${platformMeta(brief.platform).name} görünümü`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PostPreview platform={previewPlatform} caption={content.caption} hashtags={hashtags} imageUrl={exportUrl} headline={content.headline} />
            <div className="space-y-3 text-sm">
              {!exportUrl && <Notice tone="warn">Henüz PNG dışa aktarılmadı. Instagram yayını için görsel zorunludur.</Notice>}
              {brief.platform === 'x' && content.caption.length + hashtags.join(' ').length > 280 && <Notice tone="warn">X için metin 280 karakteri aşıyor.</Notice>}
              {connector && connector.status !== 'connected' && <Notice tone="info">{platformMeta(brief.platform).name} {connector.status === 'manual_only' ? 'için resmi API yok: onaydan sonra içerik manuel paylaşılır.' : 'hesabı bağlı değil: onaylanan içerik, hesap bağlanana kadar “zamanlandı” durumunda bekler; sahte yayın yapılmaz.'}</Notice>}
              <div className="rounded-xl bg-ink-900 ring-1 ring-ink-700 p-3 text-xs text-ink-300 space-y-1">
                <div><b className="text-ink-100">Plan:</b> {brief.date} {brief.time} (İstanbul)</div>
                <div><b className="text-ink-100">Amaç:</b> {brief.objective}</div>
                <div><b className="text-ink-100">Kitle:</b> {brief.audience}</div>
              </div>
            </div>
          </div>
          <StepNav onPrev={() => setStep(2)} onNext={() => setStep(4)} />
        </Panel>
      )}

      {step === 4 && (
        <Panel kicker="05 · Onay & Zamanlama" title="İnsan onayına gönder">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Yayın tarihi"><input type="date" className="ops-input" value={brief.date} onChange={(e) => setBrief({ ...brief, date: e.target.value })} /></Field>
            <Field label="Saat (İstanbul)"><input type="time" className="ops-input" value={brief.time} onChange={(e) => setBrief({ ...brief, time: e.target.value })} /></Field>
            <div className="flex items-end"><Pill tone="wait">ONAY → ZAMANLAMA → YAYIN</Pill></div>
          </div>
          <p className="text-xs text-ink-400 mt-3">Gönderildiğinde içerik PENDING_APPROVAL olur. {session.role === 'admin' ? 'Yönetici olarak onay ekranından onaylayabilirsiniz.' : 'Yönetici onayı gerekir.'} Onaylanan içerik zamanı gelince bağlı hesapta resmi API ile yayınlanır; sonuç (external post id, URL, hata) kayda yazılır.</p>
          <div className="flex flex-wrap justify-between gap-2 mt-5">
            <Button variant="ghost" onClick={() => setStep(3)} icon={<ArrowLeft className="w-4 h-4" />}>Geri</Button>
            <Button variant="primary" loading={busy === 'submit'} onClick={submit} icon={<Send className="w-4 h-4" />}>Onaya gönder</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function StepNav({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between gap-2 mt-5">
      <Button variant="ghost" onClick={onPrev} icon={<ArrowLeft className="w-4 h-4" />}>Geri</Button>
      <Button variant="primary" onClick={onNext}>İleri <ArrowRight className="w-4 h-4" /></Button>
    </div>
  );
}
