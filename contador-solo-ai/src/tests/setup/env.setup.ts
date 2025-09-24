/**
 * Setup de variáveis de ambiente para testes
 */

// Configurar variáveis de ambiente para testes
// NODE_ENV é read-only, não pode ser alterado diretamente
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key'

// OpenAI
process.env.OPENAI_API_KEY = 'sk-test-openai-key-for-testing'

// Cache
process.env.CACHE_MAX_SIZE = '100'
process.env.CACHE_DEFAULT_TTL = '300000'
process.env.CACHE_CLEANUP_INTERVAL = '60000'

// Logging
process.env.LOG_LEVEL = 'error' // Reduzir logs durante testes

// Features flags para testes
process.env.ENABLE_CACHE = 'true'
process.env.ENABLE_AI_INSIGHTS = 'true'
process.env.ENABLE_PERFORMANCE_MONITORING = 'true'
process.env.ENABLE_DEBUG_MODE = 'false'

// Configurações específicas de teste
process.env.TEST_TIMEOUT = '30000'
process.env.TEST_RETRY_COUNT = '2'
process.env.TEST_PARALLEL_WORKERS = '2'

console.log('🔧 Variáveis de ambiente configuradas para testes E2E')
