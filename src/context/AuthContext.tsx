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
import { prepareWorkspaceForUser, runDemoCleanupOnce } from '../lib/clearWorkspace'
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
    runDemoCleanupOnce()
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { error: mapAuthError(error.message) }
    if (data.user) {
      // Mesma conta: mantém dados. Outra conta: zera o workspace local.
      prepareWorkspaceForUser(data.user.id)
    }
    return { error: null }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta?: { nome?: string; negocio?: string; whatsapp?: string },
    ) => {
      if (!supabase) return { error: 'Supabase não configurado.', needsEmailConfirmation: false }
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
      if (data.user) prepareWorkspaceForUser(data.user.id, { forceEmpty: true })
      const needsEmailConfirmation = Boolean(data.user) && !data.session
      return { error: null, needsEmailConfirmation }
    },
    [],
  )

  const signOut = useCallback(async () => {
    // Não apaga CRM: ao voltar com a mesma conta os dados permanecem
    if (supabase) await supabase.auth.signOut()
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
