const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://selnwgpyjctpjzdrfrey.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k'
)

async function fixDocumentPaths() {
  console.log('🔧 CORRIGINDO CAMINHOS DOS DOCUMENTOS')
  console.log('=====================================')

  try {
    // 1. Buscar todos os documentos
    const { data: documentos, error: fetchError } = await supabase
      .from('documentos')
      .select('id, arquivo_nome, arquivo_path, arquivo_url')

    if (fetchError) {
      throw new Error(`Erro ao buscar documentos: ${fetchError.message}`)
    }

    console.log(`📋 Encontrados ${documentos.length} documentos`)

    let corrected = 0
    let skipped = 0

    for (const doc of documentos) {
      console.log(`\n📄 Processando: ${doc.arquivo_nome}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Path atual: ${doc.arquivo_path}`)
      console.log(`   URL atual: ${doc.arquivo_url}`)

      // Verificar se o arquivo_path precisa ser corrigido
      let newPath = doc.arquivo_path
      let needsUpdate = false

      // Caso 1: arquivo_path com prefixo 'documentos/' desnecessário
      if (doc.arquivo_path && doc.arquivo_path.startsWith('documentos/')) {
        newPath = doc.arquivo_path.replace('documentos/', '')
        needsUpdate = true
        console.log(`   ✏️  Corrigindo path: ${doc.arquivo_path} → ${newPath}`)
      }

      // Caso 2: arquivo_url apontando para 'documentos/documentos/'
      let newUrl = doc.arquivo_url
      if (doc.arquivo_url && doc.arquivo_url.includes('/documentos/documentos/')) {
        newUrl = doc.arquivo_url.replace('/documentos/documentos/', '/documentos/')
        needsUpdate = true
        console.log(`   ✏️  Corrigindo URL: ${doc.arquivo_url} → ${newUrl}`)
      }

      if (needsUpdate) {
        // Verificar se o arquivo existe no storage (primeiro na pasta documentos/, depois na raiz)
        let fileExists = false
        let actualPath = newPath

        // Tentar encontrar na pasta documentos/ primeiro
        const { data: listDataDocs, error: listErrorDocs } = await supabase.storage
          .from('documentos')
          .list('documentos', { search: newPath.split('/').pop() })

        if (!listErrorDocs && listDataDocs && listDataDocs.length > 0) {
          fileExists = true
          actualPath = `documentos/${newPath}`
          console.log(`   📁 Arquivo encontrado em: documentos/${newPath}`)
        } else {
          // Tentar na raiz
          const { data: listDataRoot, error: listErrorRoot } = await supabase.storage
            .from('documentos')
            .list('', { search: newPath.split('/').pop() })

          if (!listErrorRoot && listDataRoot && listDataRoot.length > 0) {
            fileExists = true
            actualPath = newPath
            console.log(`   📁 Arquivo encontrado na raiz: ${newPath}`)
          }
        }
        console.log(`   📁 Arquivo existe no storage: ${fileExists ? 'SIM' : 'NÃO'}`)

        if (fileExists) {
          // Atualizar o documento no banco com o caminho correto
          const { error: updateError } = await supabase
            .from('documentos')
            .update({
              arquivo_path: actualPath,
              arquivo_url: newUrl
            })
            .eq('id', doc.id)

          if (updateError) {
            console.log(`   ❌ Erro ao atualizar: ${updateError.message}`)
          } else {
            console.log(`   ✅ Documento atualizado com sucesso`)
            corrected++
          }
        } else {
          console.log(`   ⚠️  Arquivo não encontrado no storage, pulando...`)
          skipped++
        }
      } else {
        console.log(`   ✅ Documento já está correto`)
        skipped++
      }
    }

    console.log('\n📊 RESUMO DA CORREÇÃO')
    console.log('=====================')
    console.log(`✅ Documentos corrigidos: ${corrected}`)
    console.log(`⏭️  Documentos pulados: ${skipped}`)
    console.log(`📋 Total processados: ${documentos.length}`)

  } catch (error) {
    console.error('❌ Erro na correção:', error.message)
  }
}

fixDocumentPaths()
