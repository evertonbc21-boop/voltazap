import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    setError('')
    const { error: updateError } = await updatePassword(password)
    setBusy(false)
    if (updateError) {
      setError(updateError)
      return
    }
    setDone(true)
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

        {done ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h1 className="text-lg font-bold text-slate-800">Senha redefinida! 🎉</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sua senha foi atualizada com sucesso. Use a nova senha para entrar.
            </p>
            <Link
              to="/login"
              className="mt-5 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
          >
            <h1 className="text-lg font-bold text-slate-800">Redefinir senha</h1>
            <p className="mt-1 text-sm text-slate-500">
              Escolha uma nova senha para a sua conta. Abra esta página pelo link enviado ao seu
              e-mail.
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Nova senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Confirmar senha</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              />
            </label>

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            {!configured ? (
              <p className="mt-3 text-sm text-amber-600">
                Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar a redefinição.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !configured}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? 'Salvando…' : 'Salvar nova senha'}
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-brand hover:underline">
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
