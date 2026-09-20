const LAST_USER_KEY = 'voltazap-last-user-id'

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

export function rememberWorkspaceUser(userId: string) {
  try {
    localStorage.setItem(LAST_USER_KEY, userId)
  } catch {
    /* ignore */
  }
}

/**
 * Só zera o workspace no primeiro cadastro (forceEmpty) ou ao trocar de conta.
 * Mesmo usuário saindo e voltando: dados locais permanecem.
 */
export function prepareWorkspaceForUser(userId: string, options?: { forceEmpty?: boolean }) {
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_USER_KEY)
  } catch {
    last = null
  }

  if (options?.forceEmpty || (last != null && last !== userId)) {
    clearLocalWorkspaceData({ includeSettings: true, includePlan: true })
  }

  rememberWorkspaceUser(userId)
}
