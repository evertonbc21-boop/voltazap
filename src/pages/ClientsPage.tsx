import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, MoreHorizontal, Plus, Search, Send, Upload, Users } from 'lucide-react'
import { formatCurrency, getDefaultMessage } from '../data/mock'
import type { ClientStatus } from '../types'
import { ClientCell } from '../components/ui/Avatar'
import { ClientStatusBadge } from '../components/ui/StatusBadge'
import { AddClientModal } from '../components/AddClientModal'
import { EmptyState } from '../components/EmptyState'
import { RegisterReplyModal } from '../components/RegisterReplyModal'
import { useClients } from '../context/ClientsContext'
import { useSettings } from '../context/SettingsContext'
import { sendClientWhatsApp } from '../lib/whatsapp'

const PAGE_SIZE = 10

export function ClientsPage() {
  const { clients, statusCounts, addClient } = useClients()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'todos' | ClientStatus>('todos')
  const [sort, setSort] = useState('ultimo')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [importHint, setImportHint] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerClientId, setRegisterClientId] = useState<string | null>(null)

  const summaryCards = [
    { key: 'normal' as const, label: 'Clientes normais', hint: '(não contactar)', value: statusCounts.normal, icon: '👥', className: 'bg-emerald-50 border-emerald-100' },
    { key: 'proxima_compra' as const, label: 'Próxima compra', hint: '(contactar em breve)', value: statusCounts.proxima_compra, icon: '⏱️', className: 'bg-amber-50 border-amber-100' },
    { key: 'atrasado' as const, label: 'Compra atrasada', hint: '(contactar agora)', value: statusCounts.atrasado, icon: '⚠️', className: 'bg-rose-50 border-rose-100' },
    { key: 'muito_tempo' as const, label: 'Inativos', hint: '(campanha especial)', value: statusCounts.muito_tempo, icon: '😴', className: 'bg-slate-100 border-slate-200' },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = clients.filter((c) => {
      const matchesQuery =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.whatsapp.includes(q) ||
        c.produtoFavorito.toLowerCase().includes(q)
      const matchesStatus = status === 'todos' || c.status === status
      return matchesQuery && matchesStatus
    })
    if (sort === 'nome') list = [...list].sort((a, b) => a.nome.localeCompare(b.nome))
    if (sort === 'valor') list = [...list].sort((a, b) => b.valorMedio - a.valorMedio)
    return list
  }, [clients, query, status, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)

  const allOnPage = slice.length > 0 && slice.every((c) => selected.includes(c.id))

  async function handleCsvImport(file: File | null) {
    if (!file) return
    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) {
      setImportHint('CSV vazio. Use cabeçalho: nome,whatsapp,produto')
      return
    }

    const header = lines[0].toLowerCase()
    const hasHeader = header.includes('nome') || header.includes('whatsapp')
    const rows = hasHeader ? lines.slice(1) : lines
    let imported = 0

    for (const row of rows) {
      const parts = row.split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ''))
      const nome = parts[0]
      const whatsapp = parts[1]
      const produto = parts[2] || 'Pedido favorito'
      if (!nome || !whatsapp || whatsapp.replace(/\D/g, '').length < 10) continue
      addClient({
        nome,
        whatsapp,
        ultimoPedido: new Date().toLocaleDateString('pt-BR'),
        frequenciaMedia: 14,
        produtoFavorito: produto,
        valorMedio: 50,
        quantidadePedidos: 1,
        status: 'proxima_compra',
      })
      imported += 1
    }

    setPage(1)
    setImportHint(
      imported > 0
        ? `${imported} cliente(s) importado(s) com sucesso.`
        : 'Nenhuma linha válida. Formato: nome,whatsapp,produto',
    )
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Clientes</h2>
          <p className="mt-1 text-slate-500">Gerencie seus clientes e veja quem está pronto para voltar a pedir.</p>
          {clients.length > 0 ? (
            <p className="mt-2 max-w-2xl text-sm text-amber-700">
              Para a mensagem chegar no WhatsApp de verdade, use o <strong>número real</strong> do cliente (com DDD).
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleCsvImport(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand hover:text-brand"
          >
            <Upload size={16} />
            Importar planilha (CSV)
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus size={16} />
            Adicionar cliente
          </button>
        </div>
      </header>

      {importHint ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{importHint}</p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, telefone ou produto..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-10 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status)
                setPage(1)
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm text-slate-600"
            >
              <option value="todos">Todos os status</option>
              <option value="normal">Normal</option>
              <option value="proxima_compra">Próxima compra</option>
              <option value="atrasado">Compra atrasada</option>
              <option value="muito_tempo">Inativos</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm text-slate-600"
            >
              <option value="ultimo">Ordenar por</option>
              <option value="nome">Nome</option>
              <option value="valor">Valor médio</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => {
              setStatus(card.key)
              setPage(1)
            }}
            className={`rounded-2xl border p-4 text-left ${card.className} ${status === card.key ? 'ring-2 ring-brand/30' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{card.icon}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm font-medium text-slate-700">{card.label}</p>
                <p className="text-xs text-slate-500">{card.hint}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {clients.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users size={28} />}
              title="Nenhum cliente cadastrado"
              description="Adicione manualmente ou importe um CSV com colunas: nome, whatsapp, produto."
              actionLabel="Adicionar cliente"
              onAction={() => setAddOpen(true)}
            />
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
              >
                <Upload size={14} />
                Ou importar planilha (CSV)
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={(e) => {
                      if (e.target.checked) setSelected([...new Set([...selected, ...slice.map((c) => c.id)])])
                      else setSelected(selected.filter((id) => !slice.some((c) => c.id === id)))
                    }}
                  />
                </th>
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">WhatsApp</th>
                <th className="px-3 py-3 font-medium">Último pedido ↓</th>
                <th className="px-3 py-3 font-medium">Frequência média</th>
                <th className="px-3 py-3 font-medium">Produto favorito</th>
                <th className="px-3 py-3 font-medium">Valor médio</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((client) => (
                <tr key={client.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(client.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? [...selected, client.id] : selected.filter((id) => id !== client.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ClientCell client={client} />
                  </td>
                  <td className="px-3 py-3 text-slate-500">{client.whatsapp}</td>
                  <td className="px-3 py-3 text-slate-600">{client.ultimoPedido}</td>
                  <td className="px-3 py-3 text-slate-600">{client.frequenciaMedia} dias</td>
                  <td className="px-3 py-3 text-slate-600">{client.produtoFavorito.replace(' com ', ' + ')}</td>
                  <td className="px-3 py-3 text-slate-700">{formatCurrency(client.valorMedio)}</td>
                  <td className="px-3 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          sendClientWhatsApp(client, getDefaultMessage(settings.segment), settings.segment)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-brand"
                      >
                        <Send size={14} />
                        Enviar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
                        aria-label="Mais ações"
                        aria-expanded={menuOpenId === client.id}
                        onClick={() => setMenuOpenId((id) => (id === client.id ? null : client.id))}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpenId === client.id ? (
                        <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => {
                              setMenuOpenId(null)
                              navigate(`/campanhas?clientId=${client.id}`)
                            }}
                          >
                            Criar campanha
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => {
                              setMenuOpenId(null)
                              setRegisterClientId(client.id)
                              setRegisterOpen(true)
                            }}
                          >
                            Registrar resposta
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => {
                              void navigator.clipboard.writeText(client.whatsapp)
                              setMenuOpenId(null)
                              setImportHint(`WhatsApp de ${client.nome} copiado.`)
                            }}
                          >
                            Copiar WhatsApp
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Mostrando {from} a {to} de {filtered.length} clientes
          </p>
          <Pagination page={current} total={totalPages} onChange={setPage} />
        </div>
        </>
        )}
      </section>
      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => setPage(1)}
      />
      <RegisterReplyModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        preselectedClientId={registerClientId}
      />
    </div>
  )
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const items = Array.from({ length: Math.min(total, 10) }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
      >
        ‹
      </button>
      {items.map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`h-8 min-w-8 rounded-lg px-2 text-sm ${page === n ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          {n}
        </button>
      ))}
      {total > 10 ? <span className="px-1 text-slate-400">…</span> : null}
      <button
        type="button"
        disabled={page === total}
        onClick={() => onChange(page + 1)}
        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
      >
        ›
      </button>
    </div>
  )
}
