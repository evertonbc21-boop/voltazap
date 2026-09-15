interface Slice {
  value: number
  color: string
}

interface DonutChartProps {
  slices: Slice[]
  size?: number
  thickness?: number
  centerTitle: string
  centerSubtitle: string
}

export function DonutChart({
  slices,
  size = 176,
  thickness = 22,
  centerTitle,
  centerSubtitle,
}: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference
          const dash = `${length} ${circumference - length}`
          const current = offset
          offset += length
          return (
            <circle
              key={slice.color}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-current}
              strokeLinecap="butt"
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="text-2xl font-bold text-slate-800">{centerTitle}</strong>
        <span className="text-xs text-slate-400">{centerSubtitle}</span>
      </div>
    </div>
  )
}
