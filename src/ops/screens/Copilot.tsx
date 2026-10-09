import { useState } from 'react';
import { ASSISTANT_NAME } from '../brand';
import { Ban, Bot, LockKeyhole, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useClient } from '../client';
import { callOps, errorText } from '../lib/api';
import { cx } from '../ui';

interface CopilotItem { label?: string; value?: string; title?: string; reason?: string; type?: string; detail?: string }
interface CopilotResult {
  mode: 'read_only' | 'blocked_action' | 'needs_source';
  kind: 'answer' | 'clarification';
  answer: string;
  client?: { id: string; name: string };
  facts: CopilotItem[];
  next_steps: CopilotItem[];
  evidence: CopilotItem[];
}
interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; result?: CopilotResult }

const EXAMPLES = [
  'Son bot görevlerinin durumunu ve dikkat etmem gereken riski özetle.',
  'Embay Yapı için bu hafta hangi kararları öncelemeliyiz?',
  'Skill kataloğunda gerçekten salt-okunur olan yetenekler hangileri?',
];

function ResultDetails({ result }: { result: CopilotResult }) {
  const facts = result.facts ?? [];
  const next = result.next_steps ?? [];
  const evidence = result.evidence ?? [];
  if (!facts.length && !next.length && !evidence.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {facts.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{facts.map((item, i) => <div key={`${item.label}-${i}`} className="rounded-xl bg-white/70 ring-1 ring-slate-200 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</div><div className="mt-0.5 text-xs font-semibold text-slate-800">{item.value}</div></div>)}</div>}
      {next.length > 0 && <div className="rounded-xl bg-indigo-50/80 ring-1 ring-indigo-100 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Sıradaki karar desteği</div><ul className="mt-1.5 space-y-1.5">{next.map((item, i) => <li key={`${item.title}-${i}`} className="text-xs text-slate-700"><b>{item.title}</b>{item.reason ? ` — ${item.reason}` : ''}</li>)}</ul></div>}
      {evidence.length > 0 && <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bağlam kanıtı</div><ul className="mt-1.5 space-y-1">{evidence.map((item, i) => <li key={`${item.type}-${i}`} className="text-xs text-slate-600"><span className="font-semibold">{item.type}:</span> {item.detail}</li>)}</ul></div>}
    </div>
  );
}

function ModeBadge({ mode }: { mode: CopilotResult['mode'] }) {
  if (mode === 'blocked_action') return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200"><Ban className="h-3 w-3" />EYLEM ENGELLENDİ</span>;
  if (mode === 'needs_source') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200"><Search className="h-3 w-3" />KAYNAKLI GÖREV GEREKİR</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200"><LockKeyhole className="h-3 w-3" />SALT OKUNUR</span>;
}

export function CopilotScreen() {
  const { client } = useClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (!client) { setError('Önce bir ajans müşterisi seçin.'); return; }
    setInput(''); setError(null); setBusy(true);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((old) => [...old, userMessage]);
    try {
      const result = await callOps<CopilotResult>('copilot_chat', { client_id: client.id, message: text });
      setMessages((old) => [...old, { id: crypto.randomUUID(), role: 'assistant', text: result.answer, result }]);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-[#071225] p-4 text-white ring-1 ring-[#19345d] sm:p-5">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-900/30"><Bot className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">{ASSISTANT_NAME}</span><ModeBadge mode="read_only" /></div>
            <h2 className="mt-1 font-display text-lg font-bold">{client?.name ?? 'Ajans'} için karar desteği</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">Kayıtlı tenant bağlamı, son mission özetleri ve onaylı skill kataloğu üzerinden cevap verir. Web aramaz, tool çalıştırmaz, paylaşım veya kayıt değişikliği yapmaz.</p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><ShieldCheck className="h-3 w-3 text-emerald-300" />Kaynak iddiası yok</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><LockKeyhole className="h-3 w-3 text-cyan-300" />Dış etki yok</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><Sparkles className="h-3 w-3 text-violet-300" />Model fallback audit’i açık</span></div>
      </section>

      {messages.length === 0 && <section className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200"><div className="mb-2 text-xs font-bold text-slate-700">Örnek sorular</div><div className="grid gap-2 sm:grid-cols-3">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => send(example)} className="rounded-xl bg-slate-50 px-3 py-2.5 text-left text-xs text-slate-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:ring-indigo-200">{example}</button>)}</div></section>}

      <section className="space-y-3">
        {messages.map((message) => message.role === 'user' ? (
          <div key={message.id} className="ml-6 rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm text-white shadow-sm sm:ml-24">{message.text}</div>
        ) : (
          <article key={message.id} className="mr-2 rounded-2xl rounded-tl-md bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 sm:mr-16">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Bot className="h-4 w-4 text-indigo-600" />Copilot yanıtı</div>{message.result && <ModeBadge mode={message.result.mode} />}</div>
            <p className="whitespace-pre-wrap leading-6">{message.text}</p>
            {message.result && <ResultDetails result={message.result} />}
          </article>
        ))}
        {busy && <div className="mr-16 rounded-2xl bg-white p-4 text-xs text-slate-500 ring-1 ring-slate-200"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />Tenant bağlamı okunuyor ve salt-okunur yanıt hazırlanıyor…</span></div>}
      </section>

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">{error}</div>}
      <section className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-2xl bg-white/95 p-2.5 shadow-lg ring-1 ring-slate-200 backdrop-blur lg:bottom-4">
        <div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value.slice(0, 4000))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} placeholder="Örn. Son görevlerdeki riskleri kısaca açıkla…" className="min-h-[48px] flex-1 resize-none rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-indigo-300" aria-label="Copilot mesajı" /> <button type="button" onClick={() => void send()} disabled={busy || !input.trim()} className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition', busy || !input.trim() ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700')} aria-label="Copilot’a gönder"><Send className="h-4 w-4" /></button></div>
        <div className="px-1 pt-1 text-[10px] text-slate-400">Enter gönderir · Shift+Enter yeni satır · Dış eylem ve canlı araştırma için kontrollü ekranlar kullanılır.</div>
      </section>
    </div>
  );
}
