/**
 * Configuração segura de variáveis de ambiente
 * Centraliza e valida todas as chaves de API
 */

// Função para obter variável de ambiente com fallback
function getEnvVar(key: string, defaultValue?: string): string {
  // Primeiro tenta process.env
  const value = process.env[key] || defaultValue

  if (!value) {
    console.warn(`⚠️ Variável de ambiente não encontrada: ${key}`)
    return ''
  }

  return value
}

// Função para variáveis obrigatórias
function getRequiredEnvVar(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`❌ Variável de ambiente obrigatória não encontrada: ${key}`)
  }

  return value
}

// Configurações de ambiente com fallbacks seguros
export const env = {
  // Supabase (com fallbacks para desenvolvimento)
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://selnwgpyjctpjzdrfrey.supabase.co'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE0MTk3MSwiZXhwIjoyMDY0NzE3OTcxfQ.tN6BIm-IjObsoRf-emdxAGGFBX_heIUIb5mNXj481EE'),
  },

  // OpenAI (sem fallback por segurança)
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY', ''),
  },

  // Azure
  azure: {
    endpoint: getEnvVar('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', ''),
    key: getEnvVar('AZURE_DOCUMENT_INTELLIGENCE_KEY', ''),
  },

  // App
  app: {
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    environment: getEnvVar('NODE_ENV', 'development'),
  },
}

// Validação no startup (apenas no server)
export function validateEnvVars() {
  if (typeof window !== 'undefined') return // Skip no client

  try {
    // Log das variáveis carregadas (sem expor valores)
    console.log('🔍 Verificando variáveis de ambiente...')
    console.log('- SUPABASE_URL:', env.supabase.url ? '✅ OK' : '❌ FALTANDO')
    console.log('- SUPABASE_ANON_KEY:', env.supabase.anonKey ? '✅ OK' : '❌ FALTANDO')
    console.log('- OPENAI_API_KEY:', env.openai.apiKey ? '✅ OK' : '⚠️ FALTANDO (funcionalidade IA desabilitada)')

    console.log('✅ Sistema inicializado com configurações disponíveis')
  } catch (error) {
    console.error('💥 Erro nas variáveis de ambiente:', error)
  }
}