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

const ApprovalsScreen = lazy(() => import('./screens/Approvals').then((m) => ({ default: m.ApprovalsScreen })));
const BotsScreen = lazy(() => import('./screens/Bots').then((m) => ({ default: m.BotsScreen })));
const PlannerScreen = lazy(() => import('./screens/Planner').then((m) => ({ default: m.PlannerScreen })));
const StudioScreen = lazy(() => import('./screens/Studio').then((m) => ({ default: m.StudioScreen })));
const ConnectionsScreen = lazy(() => import('./screens/Connections').then((m) => ({ default: m.ConnectionsScreen })));
const CustomersScreen = lazy(() => import('./screens/Customers').then((m) => ({ default: m.CustomersScreen })));
const LeadsScreen = lazy(() => import('./screens/Leads').then((m) => ({ default: m.LeadsScreen })));
const SkillsScreen = lazy(() => import('./screens/Skills').then((m) => ({ default: m.SkillsScreen })));
const SettingsScreen = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsScreen })));
const PortfolioScreen = lazy(() => import('./screens/Portfolio').then((m) => ({ default: m.PortfolioScreen })));
const SystemScreen = lazy(() => import('./screens/System').then((m) => ({ default: m.SystemScreen })));
const QueueScreen = lazy(() => import('./screens/Queue').then((m) => ({ default: m.QueueScreen })));
const ReportsScreen = lazy(() => import('./screens/Reports').then((m) => ({ default: m.ReportsScreen })));
const GrowthScreen = lazy(() => import('./screens/Growth').then((m) => ({ default: m.GrowthScreen })));
const ClientsScreen = lazy(() => import('./screens/Clients').then((m) => ({ default: m.ClientsScreen })));
const VideoStudioScreen = lazy(() => import('./screens/VideoStudio').then((m) => ({ default: m.VideoStudioScreen })));
import { PoolsScreen } from './screens/Pools';

function Screens() {
  const { state } = useRouter();
  switch (state.route) {
    case 'approvals': return <ApprovalsScreen />;
    case 'bots': return <BotsScreen />;
    case 'planner': return <PlannerScreen />;
    case 'studio': return <StudioScreen />;
    case 'connections': return <ConnectionsScreen />;
    case 'construction': return <CustomersScreen module="construction" />;
    case 'rental': return <CustomersScreen module="rental" />;
    case 'leads': return <LeadsScreen />;
    case 'skills': return <SkillsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'reports': return <ReportsScreen />;
    case 'growth': return <GrowthScreen />;
    case 'clients': return <ClientsScreen />;
    case 'portfolio': return <PortfolioScreen />;
    case 'queue': return <QueueScreen />;
    case 'videos': return <PoolsScreen />;
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
