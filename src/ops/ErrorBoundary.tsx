// Ekran çökmesin: bir sayfa hata verirse beyaz ekran yerine açıklama + "Yenile" gösterir.
// Yeni sürüm yayınlandığında eski sürümün dosyaları bulunamazsa sayfa bir kez otomatik yenilenir.
import { Component, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

const isChunkError = (e: unknown) => /dynamically imported module|Loading chunk|Failed to fetch|Importing a module script failed/i.test(String((e as Error)?.message ?? e));

export function reloadOnceForNewVersion() {
  try {
    if (sessionStorage.getItem('ops-reloaded') === '1') return false;
    sessionStorage.setItem('ops-reloaded', '1');
  } catch { /* depolama kapalı */ }
  window.location.reload();
  return true;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { if (isChunkError(error)) reloadOnceForNewVersion(); }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkError(this.state.error);
    return (
      <div className="ops-panel p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <div className="font-display font-semibold text-ink-100">{chunk ? 'Program güncellendi' : 'Bu ekran açılırken bir sorun oluştu'}</div>
        <p className="text-xs text-ink-400 max-w-md mx-auto">{chunk ? 'Yeni sürüm yayınlandı; sayfayı yenileyince devam edersiniz.' : `Hata: ${this.state.error.message.slice(0, 200)}`}</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-brand-green text-white px-3.5 py-2 text-xs font-semibold"><RefreshCw className="w-4 h-4" />Yenile</button>
          <button type="button" onClick={() => { window.location.href = `${window.location.pathname}?ops=home`; }} className="inline-flex items-center gap-2 rounded-xl ring-1 ring-ink-700 px-3.5 py-2 text-xs font-semibold text-ink-200"><Home className="w-4 h-4" />Ana sayfa</button>
        </div>
      </div>
    );
  }
}
