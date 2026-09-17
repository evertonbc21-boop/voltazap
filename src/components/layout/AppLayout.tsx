import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useSettings } from '../../context/SettingsContext'
import { useWhatsAppInboundSync } from '../../hooks/useWhatsAppInboundSync'

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { settings } = useSettings()
  useWhatsAppInboundSync(true)

  useEffect(() => {
    document.title = `VoltaZap · ${settings.companyName}`
  }, [settings.companyName])

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <img
            src="/voltazap-icon.png"
            alt="VoltaZap"
            className="h-8 w-8 rounded-[9px] object-cover shadow-sm"
          />
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
