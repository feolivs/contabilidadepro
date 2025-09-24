/**
 * 🔄 SCRIPT DE MIGRAÇÃO PARA TABELA UNIFICADA - ContabilidadePRO
 * Migra dados da tabela 'documentos' para 'documentos_unified' com estrutura universal
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://selnwgpyjctpjzdrfrey.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE0MTk3MSwiZXhwIjoyMDY0NzE3OTcxfQ.tN6BIm-IjObsoRf-emdxAGGFBX_heIUIb5mNXj481EE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * 🏷️ MAPEAR CATEGORIA baseado no tipo_documento
 */
function mapCategoria(tipoDocumento) {
  const mapping = {
    'NFe': 'fiscal',
    'NFCe': 'fiscal',
    'CTe': 'fiscal',
    'MDFe': 'fiscal',
    'NFSe': 'fiscal',
    'DAS': 'fiscal',
    'DARF': 'fiscal',
    'GPS': 'fiscal',
    'GRU': 'fiscal',
    'Balanço': 'contabil',
    'DRE': 'contabil',
    'Balancete': 'contabil',
    'Extrato': 'bancario',
    'Boleto': 'bancario',
    'Contrato': 'societario',
    'Procuração': 'societario',
    'Ata': 'societario',
    'Recibo': 'fiscal',
    'Pró-labore': 'fiscal'
  }

  return mapping[tipoDocumento] || 'fiscal'
}

/**
 * 📋 MAPEAR TIPO_DOCUMENTO para formato padronizado
 */
function mapTipoDocumento(tipoDocumento) {
  const mapping = {
    'NFe': 'nota_fiscal_eletronica',
    'NFCe': 'nota_fiscal_consumidor',
    'DAS': 'das_simples_nacional',
    'Cartão CNPJ': 'cartao_cnpj',
    'Outro': 'documento_generico',
    'Pró-labore': 'pro_labore'
  }

  return mapping[tipoDocumento] || tipoDocumento.toLowerCase().replace(/\s+/g, '_')
}

/**
 * 📊 CONSTRUIR DADOS EXTRAÍDOS UNIVERSAIS
 */
function buildUniversalData(dadosExtraidos, tipoDocumento) {
  const baseData = dadosExtraidos || {}

  return {
    ...baseData,
    raw_text: baseData.descricao || baseData.raw_text || '',
    document_type: mapTipoDocumento(tipoDocumento),
    confidence_score: baseData.confidence || 0.8,
    entities: baseData.entities || [],
    financial_data: baseData.financial_data || [],
    dates: baseData.dates || [],
    contacts: baseData.contacts || [],
    additional_fields: baseData,
    relationships: baseData.relationships || [],
    insights: baseData.insights || [`Documento migrado do sistema legado - Tipo: ${tipoDocumento}`]
  }
}

/**
 * 🔢 CALCULAR CONFIANÇA baseada nos dados existentes
 */
function calculateConfidence(documento) {
  if (documento.dados_extraidos?.confidence) {
    return documento.dados_extraidos.confidence
  }

  if (documento.ocr_confidence) {
    return documento.ocr_confidence
  }

  if (documento.status_processamento === 'processado') {
    return 0.8
  }

  if (documento.dados_extraidos) {
    return 0.6
  }

  return 0.3
}

/**
 * 🚀 MIGRAR DOCUMENTOS
 */
async function migrateDocuments() {
  console.log('🚀 Iniciando migração para tabela unificada...')

  try {
    // 1. Buscar documentos da tabela original
    console.log('📋 Buscando documentos da tabela original...')
    const { data: documentos, error: fetchError } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Erro ao buscar documentos: ${fetchError.message}`)
    }

    console.log(`📊 Encontrados ${documentos.length} documentos para migrar`)

    let migratedCount = 0
    let errorCount = 0
    let skippedCount = 0

    // 2. Processar cada documento
    for (const doc of documentos) {
      try {
        console.log(`\n📄 Processando: ${doc.arquivo_nome} (${doc.tipo_documento})`)

        // Verificar se já foi migrado
        const { data: existing } = await supabase
          .from('documentos_unified')
          .select('id')
          .eq('id', doc.id)
          .single()

        if (existing) {
          console.log('  ⏭️ Já migrado, atualizando...')

          // Atualizar documento existente
          const { error: updateError } = await supabase
            .from('documentos_unified')
            .update({
              categoria: mapCategoria(doc.tipo_documento),
              tipo_documento: mapTipoDocumento(doc.tipo_documento),
              dados_extraidos: buildUniversalData(doc.dados_extraidos, doc.tipo_documento),
              confianca_extracao: calculateConfidence(doc),
              metodo_processamento: doc.ocr_method || 'legacy_migration',
              ano_fiscal: doc.data_emissao ? new Date(doc.data_emissao).getFullYear() : new Date(doc.created_at).getFullYear(),
              mes_fiscal: doc.data_emissao ? new Date(doc.data_emissao).getMonth() + 1 : new Date(doc.created_at).getMonth() + 1,
              competencia_fiscal: doc.data_emissao || new Date(doc.created_at).toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', doc.id)

          if (updateError) {
            console.log(`  ❌ Erro na atualização: ${updateError.message}`)
            errorCount++
          } else {
            console.log('  ✅ Atualizado com sucesso')
            migratedCount++
          }

        } else {
          console.log('  📤 Inserindo novo documento...')

          // Inserir novo documento
          const { error: insertError } = await supabase
            .from('documentos_unified')
            .insert({
              id: doc.id,
              empresa_id: doc.empresa_id,
              user_id: null, // Será NULL por enquanto
              categoria: mapCategoria(doc.tipo_documento),
              tipo_documento: mapTipoDocumento(doc.tipo_documento),
              arquivo_nome: doc.arquivo_nome,
              arquivo_tamanho: doc.arquivo_tamanho,
              arquivo_tipo: doc.arquivo_tipo,
              arquivo_url: doc.arquivo_url,
              arquivo_path: doc.arquivo_path,
              numero_documento: doc.numero_documento,
              serie: doc.serie,
              status_processamento: doc.status_processamento,
              data_processamento: doc.data_processamento,
              metodo_processamento: doc.ocr_method || 'legacy_migration',
              dados_extraidos: buildUniversalData(doc.dados_extraidos, doc.tipo_documento),
              confianca_extracao: calculateConfidence(doc),
              data_documento: doc.data_emissao,
              ano_fiscal: doc.data_emissao ? new Date(doc.data_emissao).getFullYear() : new Date(doc.created_at).getFullYear(),
              mes_fiscal: doc.data_emissao ? new Date(doc.data_emissao).getMonth() + 1 : new Date(doc.created_at).getMonth() + 1,
              competencia_fiscal: doc.data_emissao || new Date(doc.created_at).toISOString().split('T')[0],
              observacoes: doc.observacoes,
              created_at: doc.created_at,
              updated_at: doc.updated_at,
              created_by: doc.empresa_id,
              updated_by: doc.empresa_id
            })

          if (insertError) {
            console.log(`  ❌ Erro na inserção: ${insertError.message}`)
            errorCount++
          } else {
            console.log('  ✅ Inserido com sucesso')
            migratedCount++
          }
        }

      } catch (error) {
        console.log(`  ❌ Erro no processamento: ${error.message}`)
        errorCount++
      }
    }

    // 3. Relatório final
    console.log('\n' + '='.repeat(80))
    console.log('📊 RELATÓRIO FINAL DA MIGRAÇÃO')
    console.log('='.repeat(80))
    console.log(`✅ Documentos migrados: ${migratedCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    console.log(`⏭️ Ignorados: ${skippedCount}`)
    console.log(`📋 Total processado: ${documentos.length}`)

    // 4. Verificar resultado
    const { data: unifiedCount } = await supabase
      .from('documentos_unified')
      .select('id', { count: 'exact', head: true })

    console.log(`\n📊 Total na tabela unificada: ${unifiedCount?.length || 'N/A'}`)

    if (migratedCount > 0) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!')

      // Mostrar estatísticas
      await showMigrationStats()
    }

  } catch (error) {
    console.error('❌ Erro na migração:', error.message)
    process.exit(1)
  }
}

/**
 * 📊 MOSTRAR ESTATÍSTICAS DA MIGRAÇÃO
 */
async function showMigrationStats() {
  console.log('\n📊 ESTATÍSTICAS DA TABELA UNIFICADA:')

  // Por categoria
  const { data: byCategory } = await supabase
    .from('documentos_unified')
    .select('categoria')

  const categoryStats = {}
  byCategory?.forEach(doc => {
    categoryStats[doc.categoria] = (categoryStats[doc.categoria] || 0) + 1
  })

  console.log('\n🏷️ Por categoria:')
  Object.entries(categoryStats).forEach(([categoria, count]) => {
    console.log(`  - ${categoria}: ${count} documentos`)
  })

  // Por tipo
  const { data: byType } = await supabase
    .from('documentos_unified')
    .select('tipo_documento')

  const typeStats = {}
  byType?.forEach(doc => {
    typeStats[doc.tipo_documento] = (typeStats[doc.tipo_documento] || 0) + 1
  })

  console.log('\n📋 Por tipo de documento:')
  Object.entries(typeStats).forEach(([tipo, count]) => {
    console.log(`  - ${tipo}: ${count} documentos`)
  })

  // Por status
  const { data: byStatus } = await supabase
    .from('documentos_unified')
    .select('status_processamento')

  const statusStats = {}
  byStatus?.forEach(doc => {
    statusStats[doc.status_processamento] = (statusStats[doc.status_processamento] || 0) + 1
  })

  console.log('\n⚙️ Por status:')
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count} documentos`)
  })
}

// Executar migração
if (require.main === module) {
  migrateDocuments().catch(console.error)
}

module.exports = { migrateDocuments }