import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronDown, CreditCard, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../context/PlanContext'
import { useSettings } from '../context/SettingsContext'
import { getSegmentEmoji } from '../data/messageTemplates'

export function AccountMenu() {
  const { plan } = usePlan()
  const { settings } = useSettings()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 224 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  function updatePosition() {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const width = Math.max(rect.width, 224)
    const left = Math.min(rect.right - width, window.innerWidth - width - 8)
    setMenuPos({
      top: rect.bottom + 8,
      left: Math.max(8, left),
      width,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return

    function onResize() {
      updatePosition()
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    // Evita fechar no mesmo clique que abriu
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown)
    }, 0)

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    document.addEventListener('keydown', onEscape)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  function handleLogout() {
    const ok = window.confirm('Sair da conta e limpar dados locais deste navegador?')
    if (!ok) return
    void signOut().then(() => {
      window.location.href = '/login'
    })
  }

  const companyName = settings.companyName || 'Seu negócio'
  const segmentEmoji = getSegmentEmoji(settings.segment)

  return (
    <div className="relative w-full min-w-0 sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="inline-flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-brand"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-base">
          {segmentEmoji}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="block truncate text-sm font-semibold text-slate-800">{companyName}</span>
          <span className="text-xs text-slate-400">
            {settings.segment} · Plano {plan.name}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
              className="fixed z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              <Link
                role="menuitem"
                to="/configuracoes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings size={16} className="text-slate-400" />
                Configurações
              </Link>
              <Link
                role="menuitem"
                to="/planos"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <CreditCard size={16} className="text-slate-400" />
                Gerenciar plano
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
