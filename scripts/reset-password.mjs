// Reseta (redefine) a senha de um usuário existente no Supabase do VoltaZap.
//
// Uso:
//   node scripts/reset-password.mjs <email> [nova-senha]
//
// Variáveis de ambiente (coloque num .env.local ou exporte no shell):
//   SUPABASE_URL                 (ou VITE_SUPABASE_URL)  — obrigatória
//   SUPABASE_SERVICE_ROLE_KEY    — obrigatória (resetar a senha de outra conta exige admin)
//
// Se não passar a nova senha, usa o padrão: teste123456

import { createClient } from '@supabase/supabase-js'

const [, , emailArg, senhaArg] = process.argv

const email = (emailArg || '').trim().toLowerCase()
const newPassword = senhaArg || 'teste123456'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email) {
  console.error('Uso: node scripts/reset-password.mjs <email> [nova-senha]')
  process.exit(1)
}
if (!url) {
  console.error('Erro: defina SUPABASE_URL (ou VITE_SUPABASE_URL).')
  process.exit(1)
}
if (!serviceRoleKey) {
  console.error('Erro: defina SUPABASE_SERVICE_ROLE_KEY (necessária para resetar a senha).')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(targetEmail) {
  const perPage = 1000
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const match = data.users.find((u) => (u.email || '').toLowerCase() === targetEmail)
    if (match) return match
    if (data.users.length < perPage) return null
  }
  return null
}

async function main() {
  const user = await findUserByEmail(email)
  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail: ${email}`)
    process.exit(1)
  }
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (error) {
    console.error('Falha ao resetar a senha:', error.message)
    process.exit(1)
  }
  console.log('Senha resetada com sucesso.')
  console.log('  id:    ', user.id)
  console.log('  e-mail:', email)
  console.log('  senha: ', newPassword)
}

main().catch((err) => {
  console.error('Erro inesperado:', err?.message || err)
  process.exit(1)
})
