import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
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
import { MessagesProvider } from './context/MessagesContext'
import { CampaignProvider } from './context/CampaignContext'
import { LoginPage } from './pages/LoginPage'

function PublicSignupLayout() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex justify-center">
          <Link to="/login">
            <img
              src="/voltazap-logo-full.png"
              alt="VoltaZap"
              className="h-auto w-full max-w-[200px] object-contain"
            />
          </Link>
        </div>
        <PlansPage />
        <p className="mt-8 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PlanProvider>
          <ClientsProvider>
            <MessagesProvider>
              <CampaignProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/cadastro" element={<PublicSignupLayout />} />
                    <Route element={<RequireAuth />}>
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
                    </Route>
                  </Routes>
                </BrowserRouter>
              </CampaignProvider>
            </MessagesProvider>
          </ClientsProvider>
        </PlanProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
