import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { CorporatePublicSite } from './components/CorporatePublicSite';
import './index.css';

const isPanelHost = window.location.hostname === 'embay-panel.vercel.app'
  || window.location.pathname.startsWith('/panel');

const PanelApp = lazy(() => import('./App.tsx'));

function Root() {
  if (!isPanelHost) return <CorporatePublicSite />;

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">Panel yükleniyor...</div>}>
      <PanelApp />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
