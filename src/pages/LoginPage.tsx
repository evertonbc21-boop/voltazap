import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, user, loading, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && configured && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.')
      return
    }
    setBusy(true)
    setError('')
    const { error: authError } = await signIn(email, password)
    setBusy(false)
    if (authError) {
      setError(authError)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center px-2 sm:mb-10">
          <img
            src="/voltazap-logo-full.png"
            alt="VoltaZap — Seus clientes sempre com vontade de voltar"
            className="h-auto w-full max-w-[220px] object-contain sm:max-w-[260px]"
          />
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
            />
          </label>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
          {!configured ? (
            <p className="mt-3 text-sm text-amber-600">
              Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !configured}
            className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-brand hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
