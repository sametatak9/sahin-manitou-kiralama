import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicWebsiteView } from './components/views/PublicWebsiteView';
import './index.css';

// embay-panel.vercel.app (veya /panel) → giriş korumalı Operasyon Merkezi; diğer alan adları → kurumsal vitrin.
const isPanelHost = window.location.hostname === 'embay-panel.vercel.app'
  || window.location.hostname.startsWith('embay-panel-')
  || window.location.pathname.startsWith('/panel');

// Yönetim paneli arama motorlarında görünmesin (herkese açık site görünür)
if (isPanelHost) {
  const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m);
}

const PanelApp = lazy(() => import('./App.tsx'));

function Root() {
  if (!isPanelHost) return <PublicWebsiteView />;
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
