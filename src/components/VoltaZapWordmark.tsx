interface VoltaZapWordmarkProps {
  /** `onDark` = sidebar (Volta branco). `onLight` = dashboard (Volta azul-marinho). */
  variant?: 'onDark' | 'onLight'
  className?: string
  markClassName?: string
  textClassName?: string
}

export function VoltaZapWordmark({
  variant = 'onLight',
  className = '',
  markClassName = 'h-8 w-8',
  textClassName = 'text-[1.35rem]',
}: VoltaZapWordmarkProps) {
  const voltaColor = variant === 'onDark' ? 'text-white' : 'text-[#0B1B3A]'

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label="VoltaZap">
      <img
        src="/voltazap-icon.png"
        alt=""
        aria-hidden
        className={`shrink-0 rounded-[22%] object-cover ${markClassName}`}
      />
      <span className={`font-extrabold tracking-tight leading-none ${textClassName}`} aria-hidden>
        <span className={voltaColor}>Volta</span>
        <span className="text-brand">Zap</span>
      </span>
    </div>
  )
}
