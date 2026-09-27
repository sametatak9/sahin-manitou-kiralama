import { StrictMode, Suspense, lazy, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicWebsiteView } from './components/views/PublicWebsiteView';
import './index.css';

// embay-panel.vercel.app, /panel, localhost veya AI Studio önizleme ortamında Operasyon Merkezi çalışır.
// Yalnızca açıkça vitrin istendiğinde (?view=website) veya embay-yapi.com alan adlarında vitrin açılır.
function checkIsPanel(): boolean {
  if (typeof window === 'undefined') return true;
  const { hostname, pathname, search, hash } = window.location;
  if (search.includes('view=website')) return false;
  if (hostname === 'embay-yapi.com' || hostname === 'www.embay-yapi.com' || hostname === 'sahinmanitou.com') {
    return pathname.startsWith('/panel') || hash.startsWith('#/panel') || hash === '#panel';
  }
  // embay-panel.vercel.app, preview domainleri, localhost ve AI Studio çalışma ortamında varsayılan: Operasyon Merkezi
  return true;
}

const isPanelHost = checkIsPanel();

// Yönetim paneli arama motorlarında görünmesin (herkese açık site görünür)
if (isPanelHost) {
  const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m);
}

const PanelApp = lazy(() => import('./App.tsx'));

function Root() {
  const [isPanel, setIsPanel] = useState(checkIsPanel);

  useEffect(() => {
    const handler = () => setIsPanel(checkIsPanel());
    window.addEventListener('popstate', handler);
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('hashchange', handler);
    };
  }, []);

  if (!isPanel) return <PublicWebsiteView />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 text-slate-600 flex items-center justify-center text-sm">Panel yükleniyor…</div>}>
      <PanelApp />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
