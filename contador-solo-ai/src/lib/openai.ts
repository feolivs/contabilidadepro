/**
 * Configuração segura da OpenAI
 * Helper para usar a API apenas quando a chave estiver disponível
 */

// Verifica se a chave OpenAI está configurada
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_openai_aqui')
}

// Obtém a chave OpenAI de forma segura
export function getOpenAIKey(): string | null {
  const key = process.env.OPENAI_API_KEY

  if (!key || key === 'sua_chave_openai_aqui') {
    console.warn('⚠️ Chave OpenAI não configurada - funcionalidades de IA desabilitadas')
    return null
  }

  return key
}

// Configuração para usar nos hooks/componentes
export const openAIConfig = {
  apiKey: getOpenAIKey(),
  isConfigured: isOpenAIConfigured(),

  // Helper para mostrar mensagem quando não configurado
  getErrorMessage: () => 'Chave OpenAI não configurada. Configure no arquivo .env.local para usar funcionalidades de IA.'
}

// Log do status na inicialização
if (typeof window === 'undefined') { // Apenas no servidor
  if (openAIConfig.isConfigured) {
    console.log('✅ OpenAI configurado e pronto para uso')
  } else {
    console.log('⚠️ OpenAI não configurado - funcionalidades de IA desabilitadas')
    console.log('💡 Para habilitar: configure OPENAI_API_KEY no arquivo .env.local')
  }
}