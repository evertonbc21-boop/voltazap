import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { clearLocalWorkspaceData } from '../lib/clearWorkspace'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    meta?: { nome?: string; negocio?: string; whatsapp?: string },
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase não configurado.' }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { error: mapAuthError(error.message) }
    // Evita misturar CRM/demo de outra conta no mesmo navegador
    clearLocalWorkspaceData({ includeSettings: true, includePlan: true })
    return { error: null }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta?: { nome?: string; negocio?: string; whatsapp?: string },
    ) => {
      if (!supabase) return { error: 'Supabase não configurado.', needsEmailConfirmation: false }
      clearLocalWorkspaceData({ includeSettings: true, includePlan: true })
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: meta?.nome?.trim() || '',
            negocio: meta?.negocio?.trim() || '',
            whatsapp: meta?.whatsapp || '',
          },
        },
      })
      if (error) return { error: mapAuthError(error.message), needsEmailConfirmation: false }
      const needsEmailConfirmation = Boolean(data.user) && !data.session
      return { error: null, needsEmailConfirmation }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    clearLocalWorkspaceData({ includeSettings: true, includePlan: true })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function mapAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (lower.includes('user already registered')) return 'Este e-mail já está cadastrado. Faça login.'
  if (lower.includes('password')) return 'Senha inválida. Use pelo menos 6 caracteres.'
  if (lower.includes('email')) return 'Informe um e-mail válido.'
  return message
}
