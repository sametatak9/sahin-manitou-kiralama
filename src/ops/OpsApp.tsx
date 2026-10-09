import { lazy, Suspense } from 'react';
import { OpsShell } from './Shell';
import { RouterProvider, SessionContext, useRouter, type OpsSession } from './session';
import { StateView } from './ui';
import { HomeScreen } from './screens/Home';
import { ClientProvider } from './client';
import { ErrorBoundary, reloadOnceForNewVersion } from './ErrorBoundary';

if (typeof window !== 'undefined') window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadOnceForNewVersion(); });
if (typeof window !== 'undefined') setTimeout(() => { try { sessionStorage.removeItem('ops-reloaded'); } catch { /* yok */ } }, 15_000);

function RoutedBoundary() {
  const { state } = useRouter();
  return (
    <ErrorBoundary resetKey={state.route}>
      <Suspense fallback={<StateView kind="loading" />}>
        <Screens />
      </Suspense>
    </ErrorBoundary>
  );
}

const BotsScreen = lazy(() => import('./screens/Bots').then((m) => ({ default: m.BotsScreen })));
const ConnectionsScreen = lazy(() => import('./screens/Connections').then((m) => ({ default: m.ConnectionsScreen })));
const CustomersScreen = lazy(() => import('./screens/Customers').then((m) => ({ default: m.CustomersScreen })));
const LeadsScreen = lazy(() => import('./screens/Leads').then((m) => ({ default: m.LeadsScreen })));
const SkillsScreen = lazy(() => import('./screens/Skills').then((m) => ({ default: m.SkillsScreen })));
const SettingsScreen = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsScreen })));
const PortfolioScreen = lazy(() => import('./screens/Portfolio').then((m) => ({ default: m.PortfolioScreen })));
const SystemScreen = lazy(() => import('./screens/System').then((m) => ({ default: m.SystemScreen })));
const ReportsScreen = lazy(() => import('./screens/Reports').then((m) => ({ default: m.ReportsScreen })));
const GrowthScreen = lazy(() => import('./screens/Growth').then((m) => ({ default: m.GrowthScreen })));
const ClientsScreen = lazy(() => import('./screens/Clients').then((m) => ({ default: m.ClientsScreen })));
const ShowroomScreen = lazy(() => import('./screens/Showroom').then((m) => ({ default: m.ShowroomScreen })));
const ContentHubScreen = lazy(() => import('./screens/ContentHub').then((m) => ({ default: m.ContentHubScreen })));
const CopilotScreen = lazy(() => import('./screens/Copilot').then((m) => ({ default: m.CopilotScreen })));

function Screens() {
  const { state } = useRouter();
  switch (state.route) {
    case 'copilot': return <CopilotScreen />;
    case 'approvals': return <ContentHubScreen initial="plan" queueTab="approval" />;
    case 'bots': return <BotsScreen />;
    case 'planner': return <ContentHubScreen initial="create" />;
    case 'studio': return <ContentHubScreen initial="create" />;
    case 'connections': return <ConnectionsScreen />;
    case 'construction': return <CustomersScreen module="construction" />;
    case 'rental': return <CustomersScreen module="rental" />;
    case 'leads': return <LeadsScreen />;
    case 'skills': return <SkillsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'reports': return <ReportsScreen />;
    case 'growth': return <GrowthScreen />;
    case 'clients': return <ClientsScreen />;
    case 'showroom': return <ShowroomScreen />;
    case 'reels': return <ContentHubScreen initial="video" />;
    case 'portfolio': return <PortfolioScreen />;
    case 'queue': return <ContentHubScreen />;
    case 'videos': return <ContentHubScreen initial="media" />;
    case 'system': return <SystemScreen />;
    default: return <HomeScreen />;
  }
}

export function OpsApp({ session, onLogout }: { session: OpsSession; onLogout: () => void }) {
  return (
    <SessionContext.Provider value={session}>
      <RouterProvider>
        <ClientProvider>
          <OpsShell onLogout={onLogout}>
            <RoutedBoundary />
          </OpsShell>
        </ClientProvider>
      </RouterProvider>
    </SessionContext.Provider>
  );
}
