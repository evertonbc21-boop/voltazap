import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  CreditCard,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Send,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { BUSINESS } from '../../data/mock'
import { getSegmentEmoji } from '../../data/messageTemplates'
import { useAuth } from '../../context/AuthContext'
import { useClients } from '../../context/ClientsContext'
import { usePlan } from '../../context/PlanContext'
import { useSettings } from '../../context/SettingsContext'
import { VoltaZapWordmark } from '../VoltaZapWordmark'

const nav = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/campanhas', label: 'Campanhas', icon: Send },
  { to: '/resultados', label: 'Resultados', icon: BarChart3 },
  { to: '/mensagens', label: 'Mensagens', icon: MessageCircle },
  { to: '/relatorios', label: 'Relatórios', icon: LayoutDashboard },
  { to: '/planos', label: 'Planos', icon: CreditCard },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { clients } = useClients()
  const { plan } = usePlan()
  const { settings } = useSettings()
  const { signOut } = useAuth()
  const used = Math.min(plan.clientsLimit, clients.length)
  const usage = Math.round((used / plan.clientsLimit) * 100)
  const segmentEmoji = getSegmentEmoji(settings.segment)

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col overflow-y-auto bg-[#0b1220] text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-4">
          <div className="min-w-0">
            <VoltaZapWordmark
              variant="onDark"
              markClassName="h-9 w-9"
              textClassName="text-[1.4rem]"
            />
            <p className="mt-2 max-w-[200px] text-[12px] leading-snug text-slate-300">
              {BUSINESS.slogan}
            </p>
          </div>
          <button className="rounded-lg p-1 text-slate-400 lg:hidden" onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 pb-5">
          <div className="rounded-2xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-lg">
                {segmentEmoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{settings.companyName || 'Seu negócio'}</p>
                <p className="text-xs text-slate-400">
                  {settings.segment} · Plano {plan.name}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                <span>
                  {used.toLocaleString('pt-BR')} de {plan.clientsLimit.toLocaleString('pt-BR')} clientes
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${usage}%` }} />
              </div>
            </div>
          </div>
          <NavLink
            to="/planos"
            onClick={onClose}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/5 px-2 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Ver planos
          </NavLink>

          <button
            type="button"
            onClick={() => {
              window.open(
                'https://wa.me/5511999999999?text=' +
                  encodeURIComponent('Olá! Preciso de ajuda com o VoltaZap.'),
                '_blank',
                'noopener,noreferrer',
              )
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <HelpCircle size={18} />
            <span className="text-left">
              Precisa de ajuda?
              <span className="block text-[11px] text-slate-500">Fale com nosso suporte</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm('Sair da conta e limpar dados locais deste navegador?')
              if (!ok) return
              void signOut().then(() => {
                window.location.href = '/login'
              })
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
