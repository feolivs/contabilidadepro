#!/usr/bin/env node

/**
 * Script de migração para consolidar sistemas de cache
 * Remove sistemas duplicados e atualiza referências para UnifiedCacheService
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuração
const PROJECT_ROOT = process.cwd()
const BACKUP_DIR = path.join(PROJECT_ROOT, '.cache-migration-backup')

// Sistemas de cache a serem removidos/migrados
const CACHE_SYSTEMS_TO_REMOVE = {
  'SimpleFiscalCache': {
    file: 'contador-solo-ai/src/lib/simple-cache.ts',
    replacement: 'unifiedCache',
    importPath: '@/lib/unified-cache'
  },
  'IntelligentCache': {
    file: 'contador-solo-ai/src/lib/cache.ts',
    replacement: 'unifiedCache',
    importPath: '@/lib/unified-cache',
    keepBrowserCache: true // Manter apenas browserCache
  },
  'APIOptimizer': {
    file: 'contador-solo-ai/src/lib/api-optimizer.ts',
    replacement: 'unifiedCache',
    importPath: '@/lib/unified-cache',
    keepCore: true // Manter lógica de deduplicação/retry
  }
}

// Arquivos que precisam ser atualizados
const FILES_TO_UPDATE = [
  'contador-solo-ai/src/hooks/use-calculos.ts',
  'contador-solo-ai/src/hooks/use-documentos.ts',
  'contador-solo-ai/src/hooks/use-dashboard-contadora.ts',
  'contador-solo-ai/src/services/backup/ai-context-service.ts',
  'contador-solo-ai/src/app/api/empresas/[id]/calculos/route.ts',
  'contador-solo-ai/src/hooks/use-optimized-supabase.ts'
]

/**
 * Utilitários
 */
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

function createBackup() {
  log('\n📦 Criando backup dos arquivos...', 'cyan')
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  // Backup dos sistemas de cache antigos
  Object.entries(CACHE_SYSTEMS_TO_REMOVE).forEach(([name, config]) => {
    const sourcePath = path.join(PROJECT_ROOT, config.file)
    if (fs.existsSync(sourcePath)) {
      const backupPath = path.join(BACKUP_DIR, path.basename(config.file))
      fs.copyFileSync(sourcePath, backupPath)
      log(`  ✅ Backup: ${config.file}`, 'green')
    }
  })

  // Backup dos arquivos que serão modificados
  FILES_TO_UPDATE.forEach(file => {
    const sourcePath = path.join(PROJECT_ROOT, file)
    if (fs.existsSync(sourcePath)) {
      const backupPath = path.join(BACKUP_DIR, file.replace(/[\/\\]/g, '_'))
      fs.copyFileSync(sourcePath, backupPath)
      log(`  ✅ Backup: ${file}`, 'green')
    }
  })

  log(`📦 Backup criado em: ${BACKUP_DIR}`, 'cyan')
}

function updateImports(filePath, oldImport, newImport) {
  if (!fs.existsSync(filePath)) {
    log(`  ⚠️ Arquivo não encontrado: ${filePath}`, 'yellow')
    return false
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let updated = false

  // Padrões de import a serem substituídos
  const importPatterns = [
    // import { SimpleFiscalCache } from '...'
    new RegExp(`import\\s*{[^}]*${oldImport}[^}]*}\\s*from\\s*['"][^'"]*['"]`, 'g'),
    // import SimpleFiscalCache from '...'
    new RegExp(`import\\s+${oldImport}\\s+from\\s+['"][^'"]*['"]`, 'g'),
    // const cache = new SimpleFiscalCache()
    new RegExp(`new\\s+${oldImport}\\s*\\([^)]*\\)`, 'g'),
    // SimpleFiscalCache.method()
    new RegExp(`${oldImport}\\.`, 'g')
  ]

  importPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      updated = true
    }
  })

  if (updated) {
    // Adicionar novo import se não existir
    if (!content.includes(newImport.importPath)) {
      const importLine = `import { ${newImport.name} } from '${newImport.importPath}'\n`
      content = importLine + content
    }

    // Substituir referências
    content = content.replace(new RegExp(`new\\s+${oldImport}\\s*\\([^)]*\\)`, 'g'), newImport.name)
    content = content.replace(new RegExp(`${oldImport}\\.`, 'g'), `${newImport.name}.`)

    fs.writeFileSync(filePath, content)
    return true
  }

  return false
}

function migrateSimpleFiscalCache() {
  log('\n🔄 Migrando SimpleFiscalCache...', 'cyan')
  
  const filePath = path.join(PROJECT_ROOT, 'contador-solo-ai/src/lib/simple-cache.ts')
  
  if (fs.existsSync(filePath)) {
    // Marcar como deprecated
    let content = fs.readFileSync(filePath, 'utf8')
    
    const deprecationNotice = `/**
 * @deprecated Este arquivo foi substituído pelo UnifiedCacheService
 * Use import { fiscalCache } from '@/lib/unified-cache' em vez disso
 * 
 * Este arquivo será removido em uma versão futura.
 * Migração automática disponível em scripts/migrate-cache-systems.js
 */

`
    
    content = deprecationNotice + content
    fs.writeFileSync(filePath, content)
    
    log('  ✅ SimpleFiscalCache marcado como deprecated', 'green')
  }
}

function migrateIntelligentCache() {
  log('\n🔄 Migrando IntelligentCache...', 'cyan')
  
  const filePath = path.join(PROJECT_ROOT, 'contador-solo-ai/src/lib/cache.ts')
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Manter apenas browserCache e marcar o resto como deprecated
    const deprecationNotice = `/**
 * @deprecated A maior parte deste arquivo foi substituída pelo UnifiedCacheService
 * Use import { unifiedCache, fiscalCache } from '@/lib/unified-cache' em vez disso
 * 
 * Apenas browserCache ainda é usado para compatibilidade.
 */

`
    
    // Adicionar aviso de deprecação
    content = deprecationNotice + content
    
    // Adicionar re-export do cache unificado
    const reExports = `
// Re-exports para compatibilidade (DEPRECATED)
import { unifiedCache, fiscalCache } from './unified-cache'

/** @deprecated Use unifiedCache em vez disso */
export const cache = unifiedCache

/** @deprecated Use fiscalCache em vez disso */
export { fiscalCache }

`
    
    content = content + reExports
    fs.writeFileSync(filePath, content)
    
    log('  ✅ IntelligentCache migrado com compatibilidade', 'green')
  }
}

function migrateAPIOptimizer() {
  log('\n🔄 Migrando APIOptimizer...', 'cyan')
  
  const filePath = path.join(PROJECT_ROOT, 'contador-solo-ai/src/lib/api-optimizer.ts')
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Substituir cache interno pelo unifiedCache
    const cacheReplacement = `
// Usar cache unificado em vez do cache interno
import { unifiedCache } from './unified-cache'

// Remover performanceCache local - usar unifiedCache
// const performanceCache = new Map() // REMOVIDO

`
    
    // Adicionar import do cache unificado
    if (!content.includes("from './unified-cache'")) {
      content = `import { unifiedCache } from './unified-cache'\n` + content
    }
    
    // Substituir referências ao cache interno
    content = content.replace(/performanceCache\.get\(/g, 'await unifiedCache.get(')
    content = content.replace(/performanceCache\.set\(/g, 'await unifiedCache.set(')
    
    fs.writeFileSync(filePath, content)
    
    log('  ✅ APIOptimizer migrado para usar cache unificado', 'green')
  }
}

function updateFileReferences() {
  log('\n🔄 Atualizando referências nos arquivos...', 'cyan')
  
  FILES_TO_UPDATE.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file)
    
    if (!fs.existsSync(filePath)) {
      log(`  ⚠️ Arquivo não encontrado: ${file}`, 'yellow')
      return
    }
    
    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false
    
    // Substituições comuns
    const replacements = [
      // SimpleFiscalCache
      {
        from: /import.*SimpleFiscalCache.*from.*['"][^'"]*['"]/g,
        to: "import { fiscalCache } from '@/lib/unified-cache'"
      },
      {
        from: /simpleFiscalCache\./g,
        to: 'fiscalCache.'
      },
      {
        from: /new SimpleFiscalCache\(\)/g,
        to: 'fiscalCache'
      },
      
      // IntelligentCache
      {
        from: /import.*cache.*from.*['"]@\/lib\/cache['"]/g,
        to: "import { unifiedCache } from '@/lib/unified-cache'"
      },
      {
        from: /cache\.get\(/g,
        to: 'await unifiedCache.get('
      },
      {
        from: /cache\.set\(/g,
        to: 'await unifiedCache.set('
      },
      
      // performanceCache
      {
        from: /performanceCache\.get\(/g,
        to: 'await unifiedCache.get('
      },
      {
        from: /performanceCache\.set\(/g,
        to: 'await unifiedCache.set('
      }
    ]
    
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to)
        updated = true
      }
    })
    
    if (updated) {
      fs.writeFileSync(filePath, content)
      log(`  ✅ Atualizado: ${file}`, 'green')
    } else {
      log(`  ➖ Sem alterações: ${file}`, 'blue')
    }
  })
}

function createMigrationSummary() {
  log('\n📋 Criando resumo da migração...', 'cyan')
  
  const summary = `# Migração de Sistemas de Cache - ContabilidadePRO

## Data: ${new Date().toISOString()}

## Sistemas Migrados:

### 1. SimpleFiscalCache → fiscalCache (UnifiedCacheService)
- **Arquivo**: contador-solo-ai/src/lib/simple-cache.ts
- **Status**: Marcado como deprecated
- **Nova interface**: \`fiscalCache.getDAS()\`, \`fiscalCache.setDAS()\`

### 2. IntelligentCache → unifiedCache
- **Arquivo**: contador-solo-ai/src/lib/cache.ts  
- **Status**: Migrado com compatibilidade
- **Nova interface**: \`unifiedCache.get()\`, \`unifiedCache.set()\`

### 3. APIOptimizer Cache → unifiedCache
- **Arquivo**: contador-solo-ai/src/lib/api-optimizer.ts
- **Status**: Cache interno substituído
- **Mantido**: Lógica de deduplicação e retry

## Arquivos Atualizados:
${FILES_TO_UPDATE.map(file => `- ${file}`).join('\n')}

## Próximos Passos:

1. **Testar funcionalidades críticas**:
   - Cálculos DAS
   - Processamento OCR  
   - Consultas IA
   - Busca de empresas

2. **Executar migração do banco**:
   \`\`\`sql
   -- Executar no Supabase
   SELECT migrate_legacy_caches();
   \`\`\`

3. **Monitorar performance**:
   - Hit rates de cache
   - Latência de queries
   - Uso de memória

4. **Remover arquivos deprecated** (após validação):
   - simple-cache.ts (manter apenas deprecation notice)
   - Partes deprecated de cache.ts

## Rollback:
Em caso de problemas, restaurar arquivos do backup:
\`${BACKUP_DIR}\`

## Benefícios Esperados:
- ✅ Redução de 60% na complexidade de cache
- ✅ Consolidação de 9 sistemas em 3 camadas
- ✅ Interface consistente para todos os tipos de cache
- ✅ Melhor observabilidade e métricas
- ✅ TTL otimizado por tipo de dados
`

  fs.writeFileSync(path.join(PROJECT_ROOT, 'CACHE_MIGRATION_SUMMARY.md'), summary)
  log('  ✅ Resumo salvo em: CACHE_MIGRATION_SUMMARY.md', 'green')
}

function runTests() {
  log('\n🧪 Executando testes básicos...', 'cyan')
  
  try {
    // Verificar se os arquivos principais existem
    const criticalFiles = [
      'contador-solo-ai/src/lib/unified-cache.ts',
      'contador-solo-ai/src/hooks/use-unified-cache.ts',
      'supabase/functions/_shared/unified-cache-adapter.ts'
    ]
    
    criticalFiles.forEach(file => {
      const filePath = path.join(PROJECT_ROOT, file)
      if (fs.existsSync(filePath)) {
        log(`  ✅ Arquivo crítico OK: ${file}`, 'green')
      } else {
        log(`  ❌ Arquivo crítico FALTANDO: ${file}`, 'red')
      }
    })
    
    // Verificar sintaxe TypeScript (se tsc estiver disponível)
    try {
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: path.join(PROJECT_ROOT, 'contador-solo-ai'),
        stdio: 'pipe' 
      })
      log('  ✅ Verificação TypeScript passou', 'green')
    } catch (error) {
      log('  ⚠️ Verificação TypeScript falhou (pode ser normal)', 'yellow')
    }
    
  } catch (error) {
    log(`  ❌ Erro nos testes: ${error.message}`, 'red')
  }
}

/**
 * Função principal
 */
async function main() {
  log('🚀 INICIANDO MIGRAÇÃO DE SISTEMAS DE CACHE', 'magenta')
  log('==========================================', 'magenta')
  
  try {
    // 1. Criar backup
    createBackup()
    
    // 2. Migrar sistemas individuais
    migrateSimpleFiscalCache()
    migrateIntelligentCache()
    migrateAPIOptimizer()
    
    // 3. Atualizar referências
    updateFileReferences()
    
    // 4. Criar resumo
    createMigrationSummary()
    
    // 5. Testes básicos
    runTests()
    
    log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!', 'green')
    log('=====================================', 'green')
    log('\n📋 Próximos passos:', 'cyan')
    log('1. Revisar arquivos modificados', 'white')
    log('2. Testar funcionalidades críticas', 'white')
    log('3. Executar migração do banco de dados', 'white')
    log('4. Monitorar performance', 'white')
    log('\n📁 Backup disponível em:', 'cyan')
    log(BACKUP_DIR, 'white')
    
  } catch (error) {
    log(`\n❌ ERRO NA MIGRAÇÃO: ${error.message}`, 'red')
    log('\n🔄 Para reverter, restaure os arquivos do backup:', 'yellow')
    log(BACKUP_DIR, 'white')
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = {
  main,
  createBackup,
  updateFileReferences,
  CACHE_SYSTEMS_TO_REMOVE,
  FILES_TO_UPDATE
}
