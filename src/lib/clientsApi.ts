import type { Client, ClientStatus } from '../types'
import { isSupabaseConfigured, supabase } from './supabase'

const BUSINESS_KEY = 'voltazap-business-id'

export type DbClientRow = {
  id: string
  business_id: string
  nome: string
  whatsapp: string
  ultimo_pedido: string
  frequencia_media: number
  produto_favorito: string
  valor_medio: number
  quantidade_pedidos: number
  status: ClientStatus
  avatar_color: string
}

function setStoredBusinessId(id: string) {
  try {
    localStorage.setItem(BUSINESS_KEY, id)
  } catch (error) {
    console.error('voltazap-business-id persist failed', error)
  }
}

export function clearStoredBusinessId() {
  try {
    localStorage.removeItem(BUSINESS_KEY)
  } catch {
    /* ignore */
  }
}

export function clientFromRow(row: DbClientRow): Client {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    ultimoPedido: row.ultimo_pedido,
    frequenciaMedia: Number(row.frequencia_media) || 0,
    produtoFavorito: row.produto_favorito,
    valorMedio: Number(row.valor_medio) || 0,
    quantidadePedidos: Number(row.quantidade_pedidos) || 0,
    status: row.status,
    avatarColor: row.avatar_color,
  }
}

export function clientToRow(client: Client, businessId: string): DbClientRow {
  return {
    id: client.id,
    business_id: businessId,
    nome: client.nome,
    whatsapp: client.whatsapp,
    ultimo_pedido: client.ultimoPedido,
    frequencia_media: client.frequenciaMedia,
    produto_favorito: client.produtoFavorito,
    valor_medio: client.valorMedio,
    quantidade_pedidos: client.quantidadePedidos,
    status: client.status,
    avatar_color: client.avatarColor,
  }
}

/** Garante um business do usuário logado e devolve o id. */
export async function ensureBusinessId(meta?: {
  name?: string
  segment?: string
  whatsapp?: string
}): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: owned, error: ownedError } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (ownedError) {
    console.error('supabase ensureBusiness lookup failed', ownedError)
    return null
  }
  if (owned?.id) {
    setStoredBusinessId(owned.id)
    return owned.id
  }

  const fromMeta = {
    name:
      meta?.name?.trim() ||
      (typeof user.user_metadata?.negocio === 'string' && user.user_metadata.negocio) ||
      'Meu negócio',
    segment: meta?.segment || 'Pizzaria',
    whatsapp:
      meta?.whatsapp ||
      (typeof user.user_metadata?.whatsapp === 'string' && user.user_metadata.whatsapp) ||
      '',
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name: fromMeta.name,
      segment: fromMeta.segment,
      whatsapp: fromMeta.whatsapp,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('supabase ensureBusiness failed', error)
    return null
  }

  setStoredBusinessId(data.id)
  return data.id
}

export async function fetchClientsForBusiness(businessId: string): Promise<Client[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('supabase fetchClients failed', error)
    return null
  }
  return (data as DbClientRow[]).map(clientFromRow)
}

export async function upsertClientRemote(client: Client, businessId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('clients').upsert(clientToRow(client, businessId), {
    onConflict: 'id',
  })
  if (error) {
    console.error('supabase upsertClient failed', error)
    return false
  }
  return true
}

export async function upsertClientsRemote(clients: Client[], businessId: string): Promise<boolean> {
  if (!supabase || clients.length === 0) return false
  const rows = clients.map((c) => clientToRow(c, businessId))
  const { error } = await supabase.from('clients').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('supabase upsertClients failed', error)
    return false
  }
  return true
}
