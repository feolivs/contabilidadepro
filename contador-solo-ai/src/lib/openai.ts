/**
 * 🔒 CONFIGURAÇÃO SEGURA DA OPENAI
 * Helper para usar a API apenas quando a chave estiver disponível
 *
 * SEGURANÇA:
 * - Chave nunca exposta no frontend
 * - Validação rigorosa de configuração
 * - Fallback gracioso quando não configurada
 */

// Lista de chaves inválidas/placeholder
const INVALID_KEYS = [
  'sua_chave_openai_aqui',
  'sk-proj-sua_chave_openai_real_aqui',
  'your-openai-key',
  'sk-your-openai-key',
  ''
]

// Verifica se a chave OpenAI está configurada corretamente
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY

  if (!key) return false
  if (INVALID_KEYS.includes(key)) return false
  if (!key.startsWith('sk-')) return false
  if (key.length < 20) return false

  return true
}

// Obtém a chave OpenAI de forma segura (apenas server-side)
export function getOpenAIKey(): string | null {
  // ⚠️ SEGURANÇA: Nunca executar no cliente
  if (typeof window !== 'undefined') {
    console.error('🚨 ERRO DE SEGURANÇA: getOpenAIKey() chamado no cliente!')
    return null
  }

  const key = process.env.OPENAI_API_KEY

  if (!key || INVALID_KEYS.includes(key)) {
    console.warn('⚠️ Chave OpenAI não configurada - funcionalidades de IA desabilitadas')
    return null
  }

  if (!key.startsWith('sk-')) {
    console.error('❌ Chave OpenAI inválida - deve começar com "sk-"')
    return null
  }

  return key
}

// Configuração para usar nos hooks/componentes (sem expor a chave)
export const openAIConfig = {
  isConfigured: isOpenAIConfigured(),

  // ⚠️ SEGURANÇA: Nunca expor a chave real
  getApiKey: () => {
    if (typeof window !== 'undefined') {
      throw new Error('🚨 ERRO DE SEGURANÇA: Tentativa de acessar chave OpenAI no cliente!')
    }
    return getOpenAIKey()
  },

  // Helper para mostrar mensagem quando não configurado
  getErrorMessage: () => 'Chave OpenAI não configurada. Configure OPENAI_API_KEY no arquivo .env.local para usar funcionalidades de IA.',

  // Status para componentes
  getStatus: () => ({
    configured: isOpenAIConfigured(),
    message: isOpenAIConfigured()
      ? '✅ OpenAI configurado e pronto para uso'
      : '⚠️ OpenAI não configurado - funcionalidades de IA desabilitadas'
  })
}

// Log do status na inicialização (apenas no servidor)
if (typeof window === 'undefined') {
  const status = openAIConfig.getStatus()
  console.log(status.message)

  if (!openAIConfig.isConfigured) {
    console.log('💡 Para habilitar: configure OPENAI_API_KEY no arquivo .env.local')
    console.log('🔗 Obtenha sua chave em: https://platform.openai.com/api-keys')
  }
}