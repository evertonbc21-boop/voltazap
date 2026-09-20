interface Point {
  hour: string
  sent: number
  replies: number
  orders: number
}

export function LineChart({ data }: { data: Point[] }) {
  const width = 640
  const height = 240
  const pad = { top: 16, right: 16, bottom: 32, left: 36 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxY = Math.max(10, ...data.flatMap((d) => [d.sent, d.replies, d.orders]), 1)
  const tickStep = maxY <= 20 ? 5 : maxY <= 50 ? 10 : Math.ceil(maxY / 5)
  const ticks = Array.from({ length: Math.floor(maxY / tickStep) + 1 }, (_, i) => i * tickStep)
  const lastIndex = Math.max(data.length - 1, 1)

  const x = (i: number) => pad.left + (i / lastIndex) * innerW
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH

  const path = (key: keyof Omit<Point, 'hour'>) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#eef2f7" />
          <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="10">
            {t}
          </text>
        </g>
      ))}
      <path d={path('sent')} fill="none" stroke="#22c55e" strokeWidth="2.5" />
      <path d={path('replies')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      <path d={path('orders')} fill="none" stroke="#ef4444" strokeWidth="2.5" />
      {data.map((d, i) => (
        <g key={d.hour}>
          {i === data.length - 1 ? (
            <>
              <circle cx={x(i)} cy={y(d.sent)} r="4" fill="#22c55e" />
              <circle cx={x(i)} cy={y(d.replies)} r="4" fill="#3b82f6" />
              <circle cx={x(i)} cy={y(d.orders)} r="4" fill="#ef4444" />
            </>
          ) : null}
          <text x={x(i)} y={height - 10} textAnchor="middle" className="fill-slate-400" fontSize="10">
            {d.hour.replace(':00', 'h').replace(/^0/, '')}
          </text>
        </g>
      ))}
    </svg>
  )
}
