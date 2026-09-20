const STORAGE_PREFIX = 'voltazap-onboarding-v1'

export type OnboardingStep = 1 | 2 | 3

interface OnboardingState {
  done: boolean
  step: OnboardingStep
}

function storageKey(userId: string | null | undefined) {
  return `${STORAGE_PREFIX}:${userId || 'local'}`
}

export function loadOnboarding(userId: string | null | undefined): OnboardingState {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { done: false, step: 1 }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return {
      done: Boolean(parsed.done),
      step: parsed.step === 2 || parsed.step === 3 ? parsed.step : 1,
    }
  } catch {
    return { done: false, step: 1 }
  }
}

export function saveOnboarding(userId: string | null | undefined, state: OnboardingState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function markOnboardingDone(userId: string | null | undefined) {
  saveOnboarding(userId, { done: true, step: 3 })
}

export function trialDaysLeft(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt || Number.isNaN(trialEndsAt.getTime())) return null
  const ms = trialEndsAt.getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}
