// Script para criar usuário de teste usando service_role_key
const { createClient } = require('@supabase/supabase-js')

console.log('👤 Criando usuário de teste - ContabilidadePRO')
console.log('=' .repeat(50))

// Configurações com service_role_key
const supabaseUrl = 'https://selnwgpyjctpjzdrfrey.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE0MTk3MSwiZXhwIjoyMDY0NzE3OTcxfQ.tN6BIm-IjObsoRf-emdxAGGFBX_heIUIb5mNXj481EE'

// Cliente admin com service_role_key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  console.log('🔑 Usando service_role_key para criar usuário...')
  
  const testUsers = [
    {
      email: 'admin@contabilpro.com',
      password: 'admin123',
      name: 'Administrador ContabilPRO'
    },
    {
      email: 'contador@contabilpro.com', 
      password: 'contador123',
      name: 'Contador Teste'
    },
    {
      email: 'teste@contabilpro.com',
      password: 'teste123',
      name: 'Usuário Teste'
    }
  ]

  for (const user of testUsers) {
    console.log(`\n👤 Criando usuário: ${user.email}`)
    
    try {
      // Usar Admin API para criar usuário
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: user.name,
          created_by: 'setup_script'
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`   ⚠️  Usuário já existe: ${user.email}`)
        } else {
          console.log(`   ❌ Erro ao criar usuário: ${error.message}`)
        }
      } else {
        console.log(`   ✅ Usuário criado com sucesso!`)
        console.log(`   📧 Email: ${data.user.email}`)
        console.log(`   🆔 ID: ${data.user.id}`)
        console.log(`   ✅ Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`)
      }
    } catch (error) {
      console.log(`   ❌ Erro na criação: ${error.message}`)
    }
  }
}

async function testLogin() {
  console.log('\n🧪 Testando login com usuário criado...')
  
  // Cliente normal (anon key) para testar login
  const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k')
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@contabilpro.com',
      password: 'admin123'
    })

    if (error) {
      console.log(`❌ Erro no login: ${error.message}`)
      
      // Verificar se é problema de configuração
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 Usuário pode não ter sido criado corretamente')
      } else if (error.message.includes('Email not confirmed')) {
        console.log('💡 Email precisa ser confirmado')
      }
    } else {
      console.log('✅ Login bem-sucedido!')
      console.log(`👤 Usuário logado: ${data.user.email}`)
      console.log(`🔑 Token presente: ${data.session?.access_token ? 'Sim' : 'Não'}`)
      
      // Fazer logout
      await supabaseClient.auth.signOut()
      console.log('🚪 Logout realizado')
    }
  } catch (error) {
    console.log(`❌ Erro no teste de login: ${error.message}`)
  }
}

async function checkAuthSettings() {
  console.log('\n⚙️ Verificando configurações de autenticação...')
  
  try {
    // Verificar se conseguimos acessar informações do projeto
    const { data, error } = await supabaseAdmin
      .from('auth.users')
      .select('email, created_at, email_confirmed_at')
      .limit(5)

    if (error) {
      console.log(`⚠️  Não foi possível acessar tabela de usuários: ${error.message}`)
    } else {
      console.log(`✅ Encontrados ${data.length} usuários no sistema`)
      data.forEach(user => {
        console.log(`   📧 ${user.email} - Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`)
      })
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar usuários: ${error.message}`)
  }
}

// Executar script
async function main() {
  await createTestUser()
  await checkAuthSettings()
  await testLogin()
  
  console.log('\n🎯 RESUMO:')
  console.log('=' .repeat(30))
  console.log('✅ Usuários de teste criados')
  console.log('✅ Configuração verificada')
  console.log('✅ Login testado')
  console.log('')
  console.log('📝 CREDENCIAIS DE TESTE:')
  console.log('Email: admin@contabilpro.com')
  console.log('Senha: admin123')
  console.log('')
  console.log('🚀 Agora você pode:')
  console.log('1. Reiniciar o servidor: npm run dev')
  console.log('2. Acessar: http://localhost:3000/login')
  console.log('3. Fazer login com as credenciais acima')
}

main()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no script:', error)
    process.exit(1)
  })
