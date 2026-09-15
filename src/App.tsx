import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ClientsProvider } from './context/ClientsContext'
import { PlanProvider } from './context/PlanContext'
import { SettingsProvider } from './context/SettingsContext'
import { DashboardPage } from './pages/DashboardPage'
import { ClientsPage } from './pages/ClientsPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { ResultsPage } from './pages/ResultsPage'
import { MessagesPage } from './pages/MessagesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { PlansPage } from './pages/PlansPage'

export default function App() {
  return (
    <ClientsProvider>
      <PlanProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/campanhas" element={<CampaignsPage />} />
                <Route path="/resultados" element={<ResultsPage />} />
                <Route path="/mensagens" element={<MessagesPage />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/planos" element={<PlansPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </PlanProvider>
    </ClientsProvider>
  )
}
