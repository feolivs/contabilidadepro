const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://selnwgpyjctpjzdrfrey.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k'
)

async function testClearCacheAndRegenerate() {
  console.log('🧪 TESTE LIMPEZA DE CACHE E REGENERAÇÃO DE URL')
  console.log('===============================================')

  try {
    // Testar o caminho correto que foi atualizado no banco
    const correctPath = 'documentos/1757945270369-mc2go9pr7nr.pdf'
    
    console.log(`📁 Testando caminho correto: ${correctPath}`)

    // Gerar URL assinada com o caminho correto
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documentos')
      .createSignedUrl(correctPath, 3600)

    if (signedError) {
      throw new Error(`Erro ao gerar URL: ${signedError.message}`)
    }

    console.log('✅ URL assinada gerada com sucesso!')
    console.log('🔗 URL:', signedData.signedUrl)

    // Testar acesso à URL
    console.log('🧪 Testando acesso à URL...')
    const response = await fetch(signedData.signedUrl)
    console.log('📊 Status da resposta:', response.status)
    console.log('📄 Content-Type:', response.headers.get('content-type'))
    console.log('📏 Content-Length:', response.headers.get('content-length'))

    if (response.ok) {
      console.log('✅ URL acessível com sucesso!')
      console.log('📝 Tipo de conteúdo:', response.headers.get('content-type'))
      
      // Para PDFs, não vamos ler o conteúdo completo
      if (response.headers.get('content-type')?.includes('pdf')) {
        console.log('📄 Arquivo PDF confirmado!')
      }
    } else {
      console.log('❌ Erro ao acessar URL:', response.status, response.statusText)
      const errorText = await response.text()
      console.log('📄 Resposta de erro:', errorText.substring(0, 200))
    }

    console.log('\n🎯 TESTE CONCLUÍDO!')
    console.log('💡 Para usar no frontend, o caminho correto é:', correctPath)

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

testClearCacheAndRegenerate()
