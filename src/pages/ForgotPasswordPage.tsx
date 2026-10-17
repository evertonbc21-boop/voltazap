import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Informe o e-mail da sua conta.')
      return
    }
    setBusy(true)
    setError('')
    const { error: resetError } = await requestPasswordReset(email)
    setBusy(false)
    if (resetError) {
      setError(resetError)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center px-2 sm:mb-10">
          <Link to="/login">
            <img
              src="/voltazap-logo-full.png"
              alt="VoltaZap — Seus clientes sempre com vontade de voltar"
              className="h-auto w-full max-w-[220px] object-contain sm:max-w-[260px]"
            />
          </Link>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h1 className="text-lg font-bold text-slate-800">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm text-slate-500">
              Se existir uma conta para <strong>{email.trim()}</strong>, enviamos um link para você
              redefinir a sua senha. Confira também a caixa de spam.
            </p>
            <Link
              to="/login"
              className="mt-5 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
          >
            <h1 className="text-lg font-bold text-slate-800">Esqueci minha senha</h1>
            <p className="mt-1 text-sm text-slate-500">
              Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
            </p>

            <label className="mt-4 block">
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

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            {!configured ? (
              <p className="mt-3 text-sm text-amber-600">
                Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o envio do e-mail.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !configured}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              Lembrou a senha?{' '}
              <Link to="/login" className="font-semibold text-brand hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
