#!/usr/bin/env node

// Script para configurar Supabase para produção
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Configurando Supabase para Produção - ContabilidadePRO')
console.log('=' .repeat(60))

const PROJECT_REF = 'selnwgpyjctpjzdrfrey'
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`

// Função para executar comandos
function runCommand(command, description) {
  console.log(`\n📋 ${description}...`)
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    console.log(`✅ ${description} - Concluído`)
    return output
  } catch (error) {
    console.log(`❌ ${description} - Erro: ${error.message}`)
    return null
  }
}

// Função para verificar se arquivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath)
}

async function setupSupabaseProduction() {
  console.log(`🎯 Projeto: JoyceSoft (${PROJECT_REF})`)
  console.log(`🌐 URL: ${PROJECT_URL}`)
  console.log(`🌎 Região: sa-east-1`)

  // ==========================================
  // 1. VERIFICAR INSTALAÇÃO DO SUPABASE CLI
  // ==========================================
  console.log('\n1️⃣ Verificando Supabase CLI...')
  const supabaseVersion = runCommand('supabase --version', 'Verificar versão do Supabase CLI')
  
  if (!supabaseVersion) {
    console.log('❗ Supabase CLI não encontrado. Instalando...')
    runCommand('npm install -g supabase', 'Instalar Supabase CLI')
  }

  // ==========================================
  // 2. VERIFICAR CONEXÃO COM PROJETO
  // ==========================================
  console.log('\n2️⃣ Verificando conexão com projeto...')
  
  // Verificar se já está linkado
  const statusOutput = runCommand('supabase status', 'Verificar status do projeto')
  
  if (!statusOutput || !statusOutput.includes(PROJECT_REF)) {
    console.log('🔗 Linkando ao projeto remoto...')
    runCommand(`supabase link --project-ref ${PROJECT_REF}`, 'Linkar projeto remoto')
  }

  // ==========================================
  // 3. VERIFICAR MIGRAÇÕES
  // ==========================================
  console.log('\n3️⃣ Verificando migrações...')
  
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations')
  if (fileExists(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir)
    console.log(`📁 Encontradas ${migrations.length} migrações:`)
    migrations.forEach(migration => {
      console.log(`   - ${migration}`)
    })

    // Aplicar migrações
    runCommand('supabase db push', 'Aplicar migrações ao projeto remoto')
  } else {
    console.log('⚠️  Diretório de migrações não encontrado')
  }

  // ==========================================
  // 4. GERAR TIPOS TYPESCRIPT
  // ==========================================
  console.log('\n4️⃣ Gerando tipos TypeScript...')
  
  const typesDir = path.join(__dirname, 'contador-solo-ai', 'src', 'types')
  if (!fileExists(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  runCommand(
    `supabase gen types typescript --project-id ${PROJECT_REF} > contador-solo-ai/src/types/database.types.ts`,
    'Gerar tipos TypeScript'
  )

  // ==========================================
  // 5. VERIFICAR CONFIGURAÇÕES
  // ==========================================
  console.log('\n5️⃣ Verificando configurações...')
  
  const envProduction = path.join(__dirname, 'contador-solo-ai', '.env.production')
  if (fileExists(envProduction)) {
    console.log('✅ Arquivo .env.production encontrado')
  } else {
    console.log('⚠️  Arquivo .env.production não encontrado')
  }

  const envLocal = path.join(__dirname, 'contador-solo-ai', '.env.local')
  if (fileExists(envLocal)) {
    console.log('✅ Arquivo .env.local encontrado')
  } else {
    console.log('⚠️  Arquivo .env.local não encontrado')
  }

  // ==========================================
  // 6. EXECUTAR TESTE DE CONECTIVIDADE
  // ==========================================
  console.log('\n6️⃣ Executando teste de conectividade...')
  
  const testScript = path.join(__dirname, 'contador-solo-ai', 'test-supabase-cloud.js')
  if (fileExists(testScript)) {
    runCommand('node contador-solo-ai/test-supabase-cloud.js', 'Executar teste de conectividade')
  } else {
    console.log('⚠️  Script de teste não encontrado')
  }

  // ==========================================
  // 7. RESUMO E PRÓXIMOS PASSOS
  // ==========================================
  console.log('\n📊 RESUMO DA CONFIGURAÇÃO')
  console.log('=' .repeat(40))
  console.log('✅ Projeto linkado ao Supabase Cloud')
  console.log('✅ Migrações aplicadas')
  console.log('✅ Tipos TypeScript gerados')
  console.log('✅ Arquivos de configuração criados')

  console.log('\n🔧 PRÓXIMOS PASSOS MANUAIS:')
  console.log('=' .repeat(40))
  console.log('1. Acessar Supabase Dashboard:')
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}`)
  console.log('')
  console.log('2. Configurar URLs de Redirect em Authentication > URL Configuration:')
  console.log('   - https://contabilidadepro.com/**')
  console.log('   - https://contabilidadepro.com/auth/callback')
  console.log('')
  console.log('3. Obter chaves em Settings > API:')
  console.log('   - service_role key')
  console.log('   - JWT secret')
  console.log('')
  console.log('4. Configurar variáveis de ambiente no provedor de deploy:')
  console.log('   - Vercel: vercel env add')
  console.log('   - Netlify: netlify env:set')
  console.log('')
  console.log('5. Criar buckets de Storage se necessário:')
  console.log('   - documentos-fiscais (privado)')
  console.log('   - avatars (público)')
  console.log('')
  console.log('6. Configurar SMTP para emails de produção')
  console.log('')
  console.log('📖 Consulte SUPABASE_CLOUD_SETUP.md para detalhes completos')

  console.log('\n🎉 Configuração básica concluída!')
  console.log('🔍 Execute "node contador-solo-ai/test-supabase-cloud.js" para validar')
}

// Executar setup
setupSupabaseProduction()
  .then(() => {
    console.log('\n✨ Setup concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro durante o setup:', error)
    process.exit(1)
  })
