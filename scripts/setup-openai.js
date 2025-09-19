#!/usr/bin/env node

/**
 * 🔧 SCRIPT DE CONFIGURAÇÃO OPENAI
 * ContabilidadePRO - Configuração automática da OpenAI API Key
 * 
 * Este script:
 * 1. Verifica se a chave OpenAI está configurada localmente
 * 2. Testa a conectividade com a API OpenAI
 * 3. Configura os secrets no Supabase
 * 4. Testa as Edge Functions
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n${colors.bold}${colors.blue}[${step}]${colors.reset} ${message}`)
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`)
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`)
}

function logWarning(message) {
  log(`${colors.yellow}⚠️ ${message}${colors.reset}`)
}

// Verificar se arquivo .env.local existe
function checkEnvFile() {
  const envPath = path.join(process.cwd(), 'contador-solo-ai', '.env.local')
  
  if (!fs.existsSync(envPath)) {
    logError('.env.local não encontrado')
    log('Crie o arquivo contador-solo-ai/.env.local com suas configurações')
    return false
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  if (!envContent.includes('OPENAI_API_KEY=sk-')) {
    logError('OPENAI_API_KEY não configurada no .env.local')
    log('Adicione: OPENAI_API_KEY=sk-sua-chave-aqui')
    return false
  }
  
  logSuccess('.env.local configurado corretamente')
  return true
}

// Testar conectividade OpenAI
async function testOpenAI() {
  try {
    // Carregar variáveis de ambiente
    require('dotenv').config({ path: path.join(process.cwd(), 'contador-solo-ai', '.env.local') })
    
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Chave OpenAI inválida')
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    const models = data.data?.filter(m => m.id.includes('gpt')) || []
    
    logSuccess(`OpenAI conectado - ${models.length} modelos disponíveis`)
    return true
  } catch (error) {
    logError(`Erro ao testar OpenAI: ${error.message}`)
    return false
  }
}

// Configurar secrets no Supabase
function setupSupabaseSecrets() {
  try {
    // Verificar se Supabase CLI está instalado
    execSync('supabase --version', { stdio: 'ignore' })
  } catch (error) {
    logError('Supabase CLI não instalado')
    log('Instale com: npm install -g supabase')
    return false
  }

  try {
    // Carregar chave do .env.local
    require('dotenv').config({ path: path.join(process.cwd(), 'contador-solo-ai', '.env.local') })
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não encontrada')
    }

    // Configurar secret
    execSync(`supabase secrets set OPENAI_API_KEY="${apiKey}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    })

    logSuccess('Secret OPENAI_API_KEY configurado no Supabase')
    return true
  } catch (error) {
    logError(`Erro ao configurar secrets: ${error.message}`)
    return false
  }
}

// Testar Edge Function
async function testEdgeFunction() {
  try {
    // Carregar configurações
    require('dotenv').config({ path: path.join(process.cwd(), 'contador-solo-ai', '.env.local') })
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configurações Supabase não encontradas')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/assistente-contabil-ia`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pergunta: 'Teste de conectividade - responda apenas "OK"',
        user_id: 'test-setup-script',
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    if (data.success && data.resposta) {
      logSuccess(`Edge Function funcionando - Resposta: "${data.resposta.substring(0, 50)}..."`)
      return true
    } else {
      throw new Error(`Resposta inválida: ${JSON.stringify(data)}`)
    }
  } catch (error) {
    logError(`Erro ao testar Edge Function: ${error.message}`)
    return false
  }
}

// Função principal
async function main() {
  log(`${colors.bold}${colors.blue}🔧 CONFIGURAÇÃO OPENAI - ContabilidadePRO${colors.reset}`)
  log('Este script irá configurar a integração OpenAI de forma segura\n')

  let success = true

  // Passo 1: Verificar .env.local
  logStep('1/4', 'Verificando configuração local...')
  if (!checkEnvFile()) {
    success = false
  }

  // Passo 2: Testar OpenAI
  logStep('2/4', 'Testando conectividade OpenAI...')
  if (success && !(await testOpenAI())) {
    success = false
  }

  // Passo 3: Configurar Supabase Secrets
  logStep('3/4', 'Configurando secrets no Supabase...')
  if (success && !setupSupabaseSecrets()) {
    success = false
  }

  // Passo 4: Testar Edge Function
  logStep('4/4', 'Testando Edge Function...')
  if (success) {
    // Aguardar um pouco para os secrets propagarem
    log('Aguardando propagação dos secrets...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    if (!(await testEdgeFunction())) {
      logWarning('Edge Function falhou - pode precisar de alguns minutos para propagar')
    }
  }

  // Resultado final
  log('\n' + '='.repeat(50))
  if (success) {
    logSuccess('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!')
    log('\nPróximos passos:')
    log('1. Reinicie o servidor de desenvolvimento: npm run dev')
    log('2. Teste o assistente IA na interface')
    log('3. Monitore os logs para verificar funcionamento')
  } else {
    logError('❌ CONFIGURAÇÃO FALHOU')
    log('\nVerifique os erros acima e tente novamente')
    log('Documentação: https://platform.openai.com/docs')
  }
  log('='.repeat(50))
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    logError(`Erro fatal: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { main }
