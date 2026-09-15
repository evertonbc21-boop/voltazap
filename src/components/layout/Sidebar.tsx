import { NavLink } from 'react-router-dom'
import {
  BarChart3,
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

const nav = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/campanhas', label: 'Campanhas', icon: Send },
  { to: '/resultados', label: 'Resultados', icon: BarChart3 },
  { to: '/mensagens', label: 'Mensagens', icon: MessageCircle },
  { to: '/relatorios', label: 'Relatórios', icon: LayoutDashboard },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const usage = Math.round((BUSINESS.clientsUsed / BUSINESS.clientsLimit) * 100)

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
        <div className="flex items-start justify-between px-5 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-xl">🍕</div>
            <div>
              <h1 className="text-lg font-bold leading-none text-white">VoltaZap</h1>
              <p className="mt-1 max-w-[160px] text-[11px] leading-snug text-slate-400">
                {BUSINESS.slogan}
              </p>
            </div>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-lg">🍕</div>
              <div>
                <p className="text-sm font-semibold text-white">{BUSINESS.company}</p>
                <p className="text-xs text-slate-400">{BUSINESS.plan}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                <span>
                  {BUSINESS.clientsUsed} de {BUSINESS.clientsLimit.toLocaleString('pt-BR')} clientes
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${usage}%` }} />
              </div>
            </div>
          </div>

          <button className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            <HelpCircle size={18} />
            <span className="text-left">
              Precisa de ajuda?
              <span className="block text-[11px] text-slate-500">Fale com nosso suporte</span>
            </span>
          </button>
          <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
