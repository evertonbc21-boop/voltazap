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
