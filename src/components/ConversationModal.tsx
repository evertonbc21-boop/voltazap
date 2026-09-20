import { useEffect, useMemo, useState } from 'react'
import { Send, X } from 'lucide-react'
import { Avatar } from './ui/Avatar'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { useSettings } from '../context/SettingsContext'
import { openWhatsAppChat } from '../lib/whatsapp'
import { sendWhatsAppCloudText } from '../services/whatsappCloud'

interface ConversationModalProps {
  clientId: string | null
  onClose: () => void
}

export function ConversationModal({ clientId, onClose }: ConversationModalProps) {
  const { getClient } = useClients()
  const { settings } = useSettings()
  const { getConversation, recordOutboundMessage } = useMessages()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  const client = clientId ? getClient(clientId) : undefined
  const thread = useMemo(
    () => (clientId ? getConversation(clientId) : []),
    [clientId, getConversation],
  )

  useEffect(() => {
    setDraft('')
    setHint('')
  }, [clientId])

  if (!clientId || !client) return null
  const activeClient = client

  async function handleSend() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setHint('')

    const result = await sendWhatsAppCloudText({ to: activeClient.whatsapp, text })
    if (result.ok) {
      recordOutboundMessage({
        clientId: activeClient.id,
        clientName: activeClient.nome,
        text,
        fromPhone: result.to,
        waMessageId: result.waMessageId,
        source: 'whatsapp_cloud',
      })
      setDraft('')
      setHint('Mensagem enviada.')
      setBusy(false)
      return
    }

    if (result.fallbackSuggested || result.error === 'whatsapp_not_configured') {
      const opened = openWhatsAppChat(activeClient.whatsapp, text)
      if (opened) {
        recordOutboundMessage({
          clientId: activeClient.id,
          clientName: activeClient.nome,
          text,
          source: 'manual',
        })
        setDraft('')
        setHint('Abriu o WhatsApp para concluir o envio.')
      } else {
        setHint(result.detail || 'Não foi possível enviar. Verifique o telefone.')
      }
      setBusy(false)
      return
    }

    setHint(result.detail || result.error || 'Falha ao enviar.')
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#008069] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Avatar name={activeClient.nome} color={activeClient.avatarColor} />
            <div>
              <p className="text-sm font-semibold">{activeClient.nome}</p>
              <p className="text-[11px] text-white/80">WhatsApp · {activeClient.whatsapp}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="wa-pattern max-h-[420px] min-h-[280px] space-y-2 overflow-y-auto p-4">
          {thread.length === 0 ? (
            <p className="rounded-xl bg-white/80 px-3 py-2 text-center text-sm text-slate-500">
              Nenhuma mensagem ainda. Envie a primeira pelo campo abaixo.
            </p>
          ) : (
            thread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'business' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow ${
                    msg.from === 'business' ? 'rounded-tr-sm bg-[#d9fdd3]' : 'rounded-tl-sm bg-white'
                  }`}
                >
                  <p className="mb-0.5 text-[10px] font-semibold text-slate-400">
                    {msg.from === 'business' ? settings.companyName || 'Você' : activeClient.nome}
                  </p>
                  <p className="whitespace-pre-wrap text-slate-800">{msg.text}</p>
                  <p className="mt-1 text-right text-[10px] text-slate-400">{msg.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          {hint ? <p className="mb-2 text-xs text-slate-500">{hint}</p> : null}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder={`Mensagem para ${activeClient.nome}…`}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void handleSend()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white hover:bg-[#006e5a] disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            {settings.companyName}
          </p>
        </div>
      </div>
    </div>
  )
}
