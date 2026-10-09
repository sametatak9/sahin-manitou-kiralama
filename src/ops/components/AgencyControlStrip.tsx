import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Cpu, Gauge, Sparkles, WalletCards, Zap } from 'lucide-react';
import { useRouter } from '../session';
import { useClient } from '../client';
import { db, unwrap, useQuery } from '../lib/hooks';
import { AGENCY_MODEL_FALLBACKS, getPreferredModel, setPreferredModel } from '../lib/agency';
import { cx } from '../ui';

interface ModelRow { model_key: string; display_name: string; provider: string; description: string; active: boolean; sort_order: number }
interface Overview {
  workspace?: { name?: string; plan_code?: string; default_model_key?: string; currency?: string };
  wallet?: { balance_credits?: number | string; reserved_credits?: number | string; available_credits?: number | string; status?: string; currency?: string };
  models_active?: number;
  budget?: { today_usd?: number | string; month_usd?: number | string; daily_usd?: number | string; monthly_usd?: number | string };
}

const EMPTY: Overview = { workspace: {}, wallet: {}, budget: {}, models_active: 0 };

function money(value: number | string | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

function credits(value: number | string | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '—';
}

export function AgencyControlStrip() {
  const { go } = useRouter();
  const { client } = useClient();
  const [selectedModel, setSelectedModel] = useState(() => getPreferredModel());
  const overview = useQuery(async () => unwrap(await db().rpc('agency_workspace_overview', { p_workspace_id: null })) as Overview, EMPTY, [], ['agency_workspaces', 'agency_wallets', 'ai_usage']);
  const models = useQuery(async () => {
    try {
      return unwrap(await db().from('ai_model_catalog').select('model_key,display_name,provider,description,active,sort_order').eq('active', true).order('sort_order')) as ModelRow[];
    } catch {
      return [] as ModelRow[];
    }
  }, [] as ModelRow[], [], ['ai_model_catalog']);

  useEffect(() => {
    const preferred = getPreferredModel(overview.data.workspace?.default_model_key ?? 'gpt-5-mini');
    if (!window.localStorage.getItem('embay.agency.preferred-model')) setSelectedModel(preferred);
  }, [overview.data.workspace?.default_model_key]);

  const options = useMemo(() => {
    const rows = models.data.length ? models.data.map((m) => ({ id: m.model_key, label: m.display_name, note: m.provider })) : AGENCY_MODEL_FALLBACKS.map((m) => ({ id: m.id, label: m.label, note: m.note }));
    return rows.some((m) => m.id === selectedModel) ? rows : [{ id: selectedModel, label: selectedModel, note: 'Kayıtlı tercih' }, ...rows];
  }, [models.data, selectedModel]);

  const wallet = overview.data.wallet ?? {};
  const budget = overview.data.budget ?? {};
  const walletReady = wallet.status === 'active' && Number(wallet.available_credits ?? 0) > 0;

  const changeModel = (model: string) => {
    setSelectedModel(model);
    setPreferredModel(model);
  };

  return (
    <section className="agency-control-strip" aria-label="Ajans kontrol şeridi">
      <div className="agency-control-glow" />
      <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="agency-eyebrow"><Sparkles className="h-3.5 w-3.5" />AGENCY CONTROL</span>
            <span className="agency-status-dot" />
            <span className="text-[11px] text-slate-500">{client?.name ?? overview.data.workspace?.name ?? 'EMBAY Agency'} çalışma alanı</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-display text-base font-bold text-slate-950">Ajans kumanda merkezi</h2>
            <span className="text-[11px] text-slate-500">Botlar, içerik ve müşteri akışları tek görünümde.</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:items-center">
          <div className="agency-metric" title="Kredi yükleme sağlayıcısı henüz bağlanmadıysa bakiye 0 görünür.">
            <WalletCards className="h-4 w-4 text-indigo-500" />
            <div><div className="agency-metric-label">AI kredisi</div><div className="agency-metric-value">{credits(wallet.available_credits)} <span>{wallet.currency ?? 'TRY'}</span></div></div>
          </div>
          <div className="agency-metric">
            <Gauge className="h-4 w-4 text-cyan-600" />
            <div><div className="agency-metric-label">Bugün kullanım</div><div className="agency-metric-value">{money(budget.today_usd)}</div></div>
          </div>
          <div className="agency-model-select">
            <Cpu className="h-4 w-4 shrink-0 text-violet-600" />
            <label className="min-w-0"><span className="agency-metric-label">Varsayılan model</span><select aria-label="Ajans varsayılan AI modeli" value={selectedModel} onChange={(e) => changeModel(e.target.value)}>{options.map((m) => <option key={m.id} value={m.id}>{m.label} · {m.note}</option>)}</select></label>
          </div>
          <button type="button" className="agency-holo-btn" onClick={() => go('settings', null, { tab: 'ai' })}>
            <Zap className="h-4 w-4" />
            <span>{walletReady ? 'Bakiye yönet' : 'AI ayarlarını aç'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className={cx('relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]', overview.error ? 'text-amber-700' : 'text-slate-500')}>
        <span>{overview.error ? 'Agency Foundation migration bekleniyor; mevcut panel çalışmaya devam ediyor.' : `${overview.data.models_active ?? models.data.length} model katalogda · günlük limit ${money(budget.daily_usd)}`}</span>
        <span className="hidden sm:inline">·</span>
        <span>Seçim bu tarayıcıda saklanır; görevler yeni varsayılanı kullanır.</span>
      </div>
    </section>
  );
}
