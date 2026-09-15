import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: Date
  onChange: (date: Date) => void
}

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const WEEKDAYS_FULL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function formatLongDate(date: Date) {
  const text = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatCompactDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildCells(month: Date) {
  const first = startOfMonth(month)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(startOfMonth(value))
  const rootRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  useEffect(() => {
    setMonth(startOfMonth(value))
  }, [value])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm sm:w-auto sm:max-w-[280px] lg:max-w-none"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate sm:hidden">{formatCompactDate(value)}</span>
        <span className="hidden min-w-0 flex-1 truncate sm:inline lg:hidden">
          {value.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        <span className="hidden min-w-0 lg:inline">{formatLongDate(value)}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-4 z-50 w-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:w-[304px] sm:max-w-[min(304px,calc(100vw-2rem))]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-50"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-slate-800">{monthLabel}</p>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-50"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
              {WEEKDAYS_FULL.map((day, i) => (
                <span key={`${day}-${i}`} className="py-1">
                  <span className="sm:hidden">{WEEKDAYS[i]}</span>
                  <span className="hidden sm:inline">{day}</span>
                </span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {buildCells(month).map((cell, index) => {
                if (!cell) return <span key={`empty-${index}`} className="min-w-0" />
                const selected = sameDay(cell, value)
                const isToday = sameDay(cell, today)
                return (
                  <button
                    key={`${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`}
                    type="button"
                    onClick={() => {
                      onChange(cell)
                      setOpen(false)
                    }}
                    className={`min-w-0 rounded-lg py-2 text-sm sm:h-9 sm:py-0 ${
                      selected
                        ? 'bg-brand font-semibold text-white'
                        : isToday
                          ? 'font-semibold text-brand hover:bg-rose-50'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cell.getDate()}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={() => {
                onChange(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
                setOpen(false)
              }}
            >
              Ir para hoje
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
