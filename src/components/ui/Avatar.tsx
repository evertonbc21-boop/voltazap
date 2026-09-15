import type { Client } from '../../types'

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

interface AvatarProps {
  name: string
  color: string
  size?: keyof typeof sizeMap
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeMap[size]}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function ClientCell({ client, size = 'md' }: { client: Client; size?: keyof typeof sizeMap }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Avatar name={client.nome} color={client.avatarColor} size={size} />
      <span className="font-medium text-slate-800">{client.nome}</span>
    </span>
  )
}
