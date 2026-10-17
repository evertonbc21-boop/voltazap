// Cria um usuário de teste no Supabase do VoltaZap.
//
// Uso:
//   node scripts/create-test-user.mjs [email] [senha] [nome] [negocio]
//
// Variáveis de ambiente (coloque num .env.local ou exporte no shell):
//   SUPABASE_URL                 (ou VITE_SUPABASE_URL)  — obrigatória
//   SUPABASE_SERVICE_ROLE_KEY    — recomendada: cria a conta já confirmada
//   SUPABASE_ANON_KEY            (ou VITE_SUPABASE_ANON_KEY) — alternativa (usa signUp;
//                                 pode exigir confirmação de e-mail se ela estiver ativa)
//
// Padrões (se não passar argumentos): teste@voltazap.com / teste123456

import { createClient } from '@supabase/supabase-js'

const [, , emailArg, senhaArg, nomeArg, negocioArg] = process.argv

const email = (emailArg || 'teste@voltazap.com').trim()
const password = senhaArg || 'teste123456'
const nome = nomeArg || 'Usuário Teste'
const negocio = negocioArg || 'Pizzaria Teste'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url) {
  console.error('Erro: defina SUPABASE_URL (ou VITE_SUPABASE_URL).')
  process.exit(1)
}
if (!serviceRoleKey && !anonKey) {
  console.error(
    'Erro: defina SUPABASE_SERVICE_ROLE_KEY (recomendado) ou SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY.',
  )
  process.exit(1)
}

async function main() {
  if (serviceRoleKey) {
    // Caminho admin: cria a conta já com o e-mail confirmado (pronta para login).
    const supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, negocio },
    })
    if (error) {
      console.error('Falha ao criar usuário (admin):', error.message)
      process.exit(1)
    }
    console.log('Usuário de teste criado e confirmado (admin).')
    console.log('  id:    ', data.user?.id)
    console.log('  e-mail:', email)
    console.log('  senha: ', password)
    return
  }

  // Caminho público: usa signUp com a anon key.
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, negocio } },
  })
  if (error) {
    console.error('Falha ao criar usuário (signUp):', error.message)
    process.exit(1)
  }
  const needsConfirmation = Boolean(data.user) && !data.session
  console.log('Usuário de teste criado via signUp.')
  console.log('  id:    ', data.user?.id)
  console.log('  e-mail:', email)
  console.log('  senha: ', password)
  if (needsConfirmation) {
    console.log(
      '\nAtenção: a confirmação de e-mail está ativa. Confirme pelo link enviado ao e-mail,\n' +
        'ou desative em Authentication → Providers → Email ("Confirm email") para o login entrar direto.',
    )
  }
}

main().catch((err) => {
  console.error('Erro inesperado:', err?.message || err)
  process.exit(1)
})
