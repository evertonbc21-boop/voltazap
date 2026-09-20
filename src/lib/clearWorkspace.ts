const LAST_USER_KEY = 'voltazap-last-user-id'
const DEMO_CLEANUP_KEY = 'voltazap-cleared-demo-v1'

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

/** Remove uma vez o CRM demo antigo do navegador (clientes/mensagens seed). */
export function runDemoCleanupOnce() {
  try {
    if (localStorage.getItem(DEMO_CLEANUP_KEY)) return
    localStorage.removeItem('voltazap-clients')
    localStorage.removeItem('voltazap-replies')
    localStorage.removeItem('voltazap-last-campaign')
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
