import { DEMO_COMPANY_NAME, DEMO_OWNER_NAME, sanitizeCompanyName, sanitizePersonName } from './businessDisplay'

const LAST_USER_KEY = 'voltazap-last-user-id'
const DEMO_CLEANUP_KEY = 'voltazap-cleared-demo-v4'

/** Limpa dados locais de demo/CRM (não remove a sessão Supabase). */
export function clearLocalWorkspaceData(options?: { includeSettings?: boolean; includePlan?: boolean }) {
  try {
    localStorage.removeItem('voltazap-clients')
    localStorage.removeItem('voltazap-replies')
    localStorage.removeItem('voltazap-last-campaign')
    localStorage.removeItem('voltazap-business-id')
    if (options?.includeSettings !== false) {
      localStorage.removeItem('voltazap-settings')
    }
    if (options?.includePlan !== false) {
      localStorage.removeItem('voltazap-plan')
    }
  } catch {
    /* ignore */
  }
}

function scrubDemoSettings() {
  try {
    const raw = localStorage.getItem('voltazap-settings')
    if (!raw) return
    const parsed = JSON.parse(raw) as { companyName?: string; segment?: string; whatsapp?: string }
    const companyName = sanitizeCompanyName(parsed.companyName)
    if (companyName === (parsed.companyName || '').trim()) return
    localStorage.setItem(
      'voltazap-settings',
      JSON.stringify({
        ...parsed,
        companyName,
      }),
    )
  } catch {
    /* ignore */
  }
}

function scrubDemoPlan() {
  try {
    const raw = localStorage.getItem('voltazap-plan')
    if (!raw) return
    const parsed = JSON.parse(raw) as {
      planId?: string
      account?: { nome?: string; negocio?: string; whatsapp?: string; email?: string } | null
      trialEndsAt?: string | null
    }
    if (!parsed.account) return
    const rawNegocio = (parsed.account.negocio || '').trim().toLowerCase()
    const rawNome = (parsed.account.nome || '').trim().toLowerCase()
    if (rawNegocio === 'saas ito' || rawNome === 'saas ito' || rawNome === 'saas') {
      localStorage.setItem(
        'voltazap-plan',
        JSON.stringify({
          ...parsed,
          account: {
            ...parsed.account,
            nome: 'VoltaZap',
            negocio: 'VoltaZap',
          },
        }),
      )
      return
    }
    const nome = sanitizePersonName(parsed.account.nome)
    const negocio = sanitizeCompanyName(parsed.account.negocio)
    const looksDemo =
      !nome ||
      !negocio ||
      (parsed.account.nome || '').trim().toLowerCase() === DEMO_OWNER_NAME.toLowerCase() ||
      (parsed.account.negocio || '').trim().toLowerCase() === DEMO_COMPANY_NAME.toLowerCase()
    if (!looksDemo && nome && negocio) {
      localStorage.setItem(
        'voltazap-plan',
        JSON.stringify({
          ...parsed,
          account: { ...parsed.account, nome, negocio },
        }),
      )
      return
    }
    localStorage.setItem(
      'voltazap-plan',
      JSON.stringify({
        ...parsed,
        account: null,
      }),
    )
  } catch {
    /* ignore */
  }
}

/** Remove uma vez o CRM/nome demo antigo do navegador. */
export function runDemoCleanupOnce() {
  try {
    if (localStorage.getItem(DEMO_CLEANUP_KEY)) return
    localStorage.removeItem('voltazap-clients')
    localStorage.removeItem('voltazap-replies')
    localStorage.removeItem('voltazap-last-campaign')
    scrubDemoSettings()
    scrubDemoPlan()
    localStorage.setItem(DEMO_CLEANUP_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function rememberWorkspaceUser(userId: string) {
  try {
    localStorage.setItem(LAST_USER_KEY, userId)
  } catch {
    /* ignore */
  }
}

/**
 * Zera o workspace local quando:
 * - forceEmpty (primeiro cadastro)
 * - trocou de conta / ainda não havia last-user
 *
 * Mesmo usuário saindo e voltando (last === userId): mantém os dados.
 */
export function prepareWorkspaceForUser(userId: string, options?: { forceEmpty?: boolean }) {
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_USER_KEY)
  } catch {
    last = null
  }

  if (options?.forceEmpty || last !== userId) {
    clearLocalWorkspaceData({ includeSettings: true, includePlan: true })
  }

  rememberWorkspaceUser(userId)
}
