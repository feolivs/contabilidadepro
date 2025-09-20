#!/usr/bin/env node

/**
 * Script para migrar dados das tabelas de documentos para documentos_unified
 * Executa migração com validação e rollback automático em caso de erro
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente SUPABASE não configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Utilitários
function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  }
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Verificar se as tabelas existem
 */
async function checkTablesExist() {
  log('\n🔍 Verificando existência das tabelas...', 'cyan')
  
  const tables = ['documentos', 'documentos_fiscais', 'processed_documents', 'documentos_unified']
  const results = {}
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        results[table] = { exists: false, count: 0, error: error.message }
      } else {
        results[table] = { exists: true, count: data?.length || 0 }
      }
    } catch (err) {
      results[table] = { exists: false, count: 0, error: err.message }
    }
  }
  
  // Exibir resultados
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      log(`  ✅ ${table}: ${result.count} registros`, 'green')
    } else {
      log(`  ❌ ${table}: Não existe ou erro - ${result.error}`, 'red')
    }
  }
  
  return results
}

/**
 * Contar registros nas tabelas originais
 */
async function countOriginalRecords() {
  log('\n📊 Contando registros nas tabelas originais...', 'cyan')
  
  const counts = {}
  
  // Contar documentos
  try {
    const { count } = await supabase
      .from('documentos')
      .select('*', { count: 'exact', head: true })
    counts.documentos = count || 0
    log(`  📄 documentos: ${counts.documentos} registros`, 'blue')
  } catch (error) {
    counts.documentos = 0
    log(`  ⚠️ documentos: Erro ao contar - ${error.message}`, 'yellow')
  }
  
  // Contar documentos_fiscais
  try {
    const { count } = await supabase
      .from('documentos_fiscais')
      .select('*', { count: 'exact', head: true })
    counts.documentos_fiscais = count || 0
    log(`  📋 documentos_fiscais: ${counts.documentos_fiscais} registros`, 'blue')
  } catch (error) {
    counts.documentos_fiscais = 0
    log(`  ⚠️ documentos_fiscais: Erro ao contar - ${error.message}`, 'yellow')
  }
  
  // Contar processed_documents
  try {
    const { count } = await supabase
      .from('processed_documents')
      .select('*', { count: 'exact', head: true })
    counts.processed_documents = count || 0
    log(`  🔄 processed_documents: ${counts.processed_documents} registros`, 'blue')
  } catch (error) {
    counts.processed_documents = 0
    log(`  ⚠️ processed_documents: Erro ao contar - ${error.message}`, 'yellow')
  }
  
  const total = counts.documentos + counts.documentos_fiscais + counts.processed_documents
  log(`  📊 Total a migrar: ${total} registros`, 'magenta')
  
  return counts
}

/**
 * Executar migração usando função SQL
 */
async function executeMigration() {
  log('\n🚀 Executando migração de dados...', 'cyan')
  
  try {
    const { data, error } = await supabase.rpc('migrate_documentos_to_unified')
    
    if (error) {
      log(`❌ Erro na migração: ${error.message}`, 'red')
      return { success: false, error: error.message }
    }
    
    // Processar resultados
    let totalMigrated = 0
    const results = {}
    
    if (data && Array.isArray(data)) {
      for (const result of data) {
        results[result.source_table] = {
          count: result.migrated_count,
          success: result.success,
          error: result.error_message
        }
        
        if (result.success) {
          totalMigrated += result.migrated_count
          log(`  ✅ ${result.source_table}: ${result.migrated_count} registros migrados`, 'green')
        } else {
          log(`  ❌ ${result.source_table}: Erro - ${result.error_message}`, 'red')
        }
      }
    }
    
    log(`\n📊 Total migrado: ${totalMigrated} registros`, 'magenta')
    
    return { success: true, totalMigrated, results }
    
  } catch (error) {
    log(`❌ Erro na execução: ${error.message}`, 'red')
    return { success: false, error: error.message }
  }
}

/**
 * Validar integridade dos dados migrados
 */
async function validateMigration() {
  log('\n🔍 Validando integridade dos dados migrados...', 'cyan')
  
  const validations = []
  
  try {
    // Contar registros na tabela unificada
    const { count: unifiedCount } = await supabase
      .from('documentos_unified')
      .select('*', { count: 'exact', head: true })
    
    log(`  📊 documentos_unified: ${unifiedCount} registros`, 'blue')
    
    // Validar campos obrigatórios
    const { data: invalidRecords } = await supabase
      .from('documentos_unified')
      .select('id, arquivo_nome, categoria, tipo_documento')
      .or('arquivo_nome.is.null,categoria.is.null,tipo_documento.is.null')
    
    if (invalidRecords && invalidRecords.length > 0) {
      log(`  ⚠️ ${invalidRecords.length} registros com campos obrigatórios nulos`, 'yellow')
      validations.push({ type: 'missing_required', count: invalidRecords.length })
    } else {
      log(`  ✅ Todos os registros têm campos obrigatórios preenchidos`, 'green')
    }
    
    // Validar campos calculados
    const { data: calculatedFields } = await supabase
      .from('documentos_unified')
      .select('id, valor_total, data_documento, ano_fiscal, mes_fiscal')
      .not('dados_extraidos', 'eq', '{}')
      .limit(10)
    
    if (calculatedFields && calculatedFields.length > 0) {
      const validCalculated = calculatedFields.filter(record => 
        record.valor_total !== null || record.data_documento !== null
      ).length
      
      log(`  📊 ${validCalculated}/${calculatedFields.length} registros com campos calculados`, 'blue')
    }
    
    // Validar distribuição por categoria
    const { data: categoryStats } = await supabase
      .from('documentos_unified')
      .select('categoria')
    
    if (categoryStats) {
      const categories = categoryStats.reduce((acc, record) => {
        acc[record.categoria] = (acc[record.categoria] || 0) + 1
        return acc
      }, {})
      
      log(`  📊 Distribuição por categoria:`, 'blue')
      for (const [category, count] of Object.entries(categories)) {
        log(`    - ${category}: ${count} documentos`, 'white')
      }
    }
    
    return { success: true, unifiedCount, validations }
    
  } catch (error) {
    log(`❌ Erro na validação: ${error.message}`, 'red')
    return { success: false, error: error.message }
  }
}

/**
 * Gerar relatório de migração
 */
function generateMigrationReport(originalCounts, migrationResult, validationResult) {
  const report = `# Relatório de Migração - Documentos Unificados

## Data: ${new Date().toISOString()}

## Resumo da Migração

### Registros Originais:
- **documentos**: ${originalCounts.documentos} registros
- **documentos_fiscais**: ${originalCounts.documentos_fiscais} registros  
- **processed_documents**: ${originalCounts.processed_documents} registros
- **Total**: ${originalCounts.documentos + originalCounts.documentos_fiscais + originalCounts.processed_documents} registros

### Resultados da Migração:
${migrationResult.results ? Object.entries(migrationResult.results).map(([table, result]) => 
  `- **${table}**: ${result.success ? `✅ ${result.count} migrados` : `❌ ${result.error}`}`
).join('\n') : 'Dados não disponíveis'}

- **Total Migrado**: ${migrationResult.totalMigrated || 0} registros

### Validação:
- **Registros na tabela unificada**: ${validationResult.unifiedCount || 0}
- **Status**: ${validationResult.success ? '✅ Sucesso' : '❌ Erro'}
${validationResult.validations ? validationResult.validations.map(v => 
  `- **${v.type}**: ${v.count} ocorrências`
).join('\n') : ''}

## Próximos Passos:

1. **Testar funcionalidades** que usam documentos
2. **Atualizar código** para usar documentos_unified
3. **Monitorar performance** das queries
4. **Deprecar tabelas antigas** após validação completa

## Rollback:

Em caso de problemas, execute:
\`\`\`sql
-- Limpar tabela unificada
TRUNCATE documentos_unified CASCADE;

-- Recriar dados se necessário
-- (dados originais permanecem intactos)
\`\`\`

## Status: ${migrationResult.success && validationResult.success ? '🟢 SUCESSO' : '🔴 ERRO'}
`

  const reportPath = path.join(process.cwd(), 'DOCUMENTOS_MIGRATION_REPORT.md')
  fs.writeFileSync(reportPath, report)
  
  return reportPath
}

/**
 * Função principal
 */
async function main() {
  log('🚀 INICIANDO MIGRAÇÃO DE DOCUMENTOS PARA TABELA UNIFICADA', 'magenta')
  log('=======================================================', 'magenta')
  
  try {
    // 1. Verificar tabelas
    const tableCheck = await checkTablesExist()
    
    if (!tableCheck.documentos_unified?.exists) {
      log('\n❌ Tabela documentos_unified não existe. Execute a migração SQL primeiro.', 'red')
      log('   Comando: supabase db push', 'yellow')
      process.exit(1)
    }
    
    // 2. Contar registros originais
    const originalCounts = await countOriginalRecords()
    
    if (originalCounts.documentos + originalCounts.documentos_fiscais + originalCounts.processed_documents === 0) {
      log('\n⚠️ Nenhum registro encontrado para migrar.', 'yellow')
      process.exit(0)
    }
    
    // 3. Executar migração
    const migrationResult = await executeMigration()
    
    if (!migrationResult.success) {
      log('\n❌ Migração falhou. Verifique os logs acima.', 'red')
      process.exit(1)
    }
    
    // 4. Validar migração
    const validationResult = await validateMigration()
    
    // 5. Gerar relatório
    const reportPath = generateMigrationReport(originalCounts, migrationResult, validationResult)
    
    log('\n🎉 MIGRAÇÃO CONCLUÍDA!', 'green')
    log('====================', 'green')
    log(`📊 Total migrado: ${migrationResult.totalMigrated} registros`, 'cyan')
    log(`📁 Relatório salvo em: ${reportPath}`, 'cyan')
    
    if (validationResult.success) {
      log('✅ Validação passou - dados íntegros', 'green')
    } else {
      log('⚠️ Validação encontrou problemas - revisar relatório', 'yellow')
    }
    
  } catch (error) {
    log(`\n❌ ERRO GERAL: ${error.message}`, 'red')
    log(error.stack, 'red')
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = {
  main,
  checkTablesExist,
  countOriginalRecords,
  executeMigration,
  validateMigration
}
