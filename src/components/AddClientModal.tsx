import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { PRODUCTS } from '../data/mock'
import type { Client, ClientStatus } from '../types'
import { useClients } from '../context/ClientsContext'

interface AddClientModalProps {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

const emptyForm = {
  nome: '',
  whatsapp: '',
  ultimoPedido: toInputDate(new Date()),
  frequenciaMedia: '14',
  produtoFavorito: PRODUCTS[0] as string,
  valorMedio: '60',
  quantidadePedidos: '1',
  status: 'proxima_compra' as ClientStatus,
}

export function AddClientModal({ open, onClose, onAdded }: AddClientModalProps) {
  const { addClient } = useClients()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  if (!open) return null

  function close() {
    setForm(emptyForm)
    setError('')
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const nome = form.nome.trim()
    const digits = form.whatsapp.replace(/\D/g, '')
    if (!nome) {
      setError('Informe o nome do cliente.')
      return
    }
    if (digits.length < 10) {
      setError('Informe um WhatsApp válido com DDD.')
      return
    }

    const payload: Omit<Client, 'id' | 'avatarColor'> = {
      nome,
      whatsapp: formatPhone(form.whatsapp),
      ultimoPedido: fromInputDate(form.ultimoPedido),
      frequenciaMedia: Math.max(1, Number(form.frequenciaMedia) || 14),
      produtoFavorito: form.produtoFavorito,
      valorMedio: Math.max(0, Number(form.valorMedio.replace(',', '.')) || 0),
      quantidadePedidos: Math.max(1, Number(form.quantidadePedidos) || 1),
      status: form.status,
    }

    addClient(payload)
    onAdded?.()
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Adicionar cliente</h3>
            <p className="mt-1 text-sm text-slate-500">Cadastre quem já comprou na Pizzaria do Guto.</p>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-600">
            Nome
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              placeholder="Ex: Everton"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-slate-600">
            WhatsApp
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              placeholder="(11) 98765-4321"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Último pedido
            <input
              type="date"
              value={form.ultimoPedido}
              onChange={(e) => setForm({ ...form, ultimoPedido: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Frequência média (dias)
            <input
              type="number"
              min={1}
              value={form.frequenciaMedia}
              onChange={(e) => setForm({ ...form, frequenciaMedia: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-slate-600">
            Produto favorito
            <select
              value={form.produtoFavorito}
              onChange={(e) => setForm({ ...form, produtoFavorito: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            >
              {PRODUCTS.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Valor médio
            <input
              inputMode="decimal"
              value={form.valorMedio}
              onChange={(e) => setForm({ ...form, valorMedio: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              placeholder="68"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Quantidade de pedidos
            <input
              type="number"
              min={1}
              value={form.quantidadePedidos}
              onChange={(e) => setForm({ ...form, quantidadePedidos: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-slate-600">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            >
              <option value="normal">Normal</option>
              <option value="proxima_compra">Próxima compra</option>
              <option value="atrasado">Atrasado</option>
              <option value="muito_tempo">Muito tempo sem comprar</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Salvar cliente
          </button>
        </div>
      </form>
    </div>
  )
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function toInputDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromInputDate(value: string) {
  if (!value) return toBr(new Date())
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

function toBr(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}
