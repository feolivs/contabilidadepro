/**
 * Connection Pool Otimizado para Edge Functions
 * ContábilPro ERP - Fase 2: Otimização de Performance
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Configurações por ambiente
const POOL_CONFIGS = {
  production: {
    maxConnections: 20,
    idleTimeoutMs: 30000,
    _connectionTimeoutMs: 10000,
    retryAttempts: 3,
    retryDelayMs: 1000
  },
  development: {
    maxConnections: 10,
    idleTimeoutMs: 15000,
    _connectionTimeoutMs: 5000,
    retryAttempts: 2,
    retryDelayMs: 500
  },
  test: {
    maxConnections: 5,
    idleTimeoutMs: 5000,
    _connectionTimeoutMs: 3000,
    retryAttempts: 1,
    retryDelayMs: 100
  }
};
// Pool de conexões global
class ConnectionPool {
  static instance;
  connections = new Map();
  connectionTimestamps = new Map();
  config;
  cleanupInterval;
  constructor(){
    const env = Deno.env.get('ENVIRONMENT') || 'production';
    this.config = POOL_CONFIGS[env] || POOL_CONFIGS.production;
    // Iniciar limpeza automática de conexões idle
    this.startCleanupTimer();
    console.log(`[CONNECTION_POOL] Inicializado para ambiente: ${env}`, this.config);
  }
  static getInstance() {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }
  /**
   * Obter conexão otimizada do pool
   */ async getConnection(context = 'default') {
    const connectionKey = `${context}_${this.getConnectionHash()}`;
    // Verificar se já existe uma conexão válida
    const existingConnection = this.connections.get(connectionKey);
    if (existingConnection && this.isConnectionValid(connectionKey)) {
      this.updateConnectionTimestamp(connectionKey);
      return existingConnection;
    }
    // Verificar limite de conexões
    if (this.connections.size >= this.config.maxConnections) {
      await this.cleanupIdleConnections();
      // Se ainda estiver no limite, reutilizar conexão mais antiga
      if (this.connections.size >= this.config.maxConnections) {
        const oldestKey = this.getOldestConnection();
        if (oldestKey) {
          const connection = this.connections.get(oldestKey);
          this.updateConnectionTimestamp(oldestKey);
          return connection;
        }
      }
    }
    // Criar nova conexão
    const connection = await this.createOptimizedConnection();
    this.connections.set(connectionKey, connection);
    this.updateConnectionTimestamp(connectionKey);
    console.log(`[CONNECTION_POOL] Nova conexão criada: ${connectionKey} (total: ${this.connections.size})`);
    return connection;
  }
  /**
   * Criar conexão otimizada com configurações de performance
   */ async createOptimizedConnection() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    }
    const startTime = Date.now();
    try {
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          _persistSession: false,
          _autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
            'User-Agent': 'ContabilPro-EdgeFunction/1.0'
          }
        },
        realtime: {
          params: {
            _eventsPerSecond: 10
          }
        }
      });
      // Testar conexão com query simples
      const { error: error1 } = await client.from('empresas').select('id').limit(1);
      if (error1) {
        throw new Error(`Falha no teste de conexão: ${error1.message}`);
      }
      const connectionTime = Date.now() - startTime;
      console.log(`[CONNECTION_POOL] Conexão criada em ${connectionTime}ms`);
      return client;
    } catch (_error) {
      const connectionTime = Date.now() - startTime;
      console.error(`[CONNECTION_POOL] Erro ao criar conexão após ${connectionTime}ms:`, error);
      throw error;
    }
  }
  /**
   * Verificar se conexão ainda é válida
   */ isConnectionValid(connectionKey) {
    const timestamp = this.connectionTimestamps.get(connectionKey);
    if (!timestamp) return false;
    const age = Date.now() - timestamp;
    return age < this.config.idleTimeoutMs;
  }
  /**
   * Atualizar timestamp da conexão
   */ updateConnectionTimestamp(connectionKey) {
    this.connectionTimestamps.set(connectionKey, Date.now());
  }
  /**
   * Obter hash para distribuir conexões
   */ getConnectionHash() {
    // Usar timestamp para distribuir conexões ao longo do tempo
    const now = Date.now();
    const bucket = Math.floor(now / 10000) % this.config.maxConnections; // Bucket de 10 segundos
    return bucket.toString();
  }
  /**
   * Obter conexão mais antiga
   */ getOldestConnection() {
    let oldestKey = null;
    let oldestTimestamp = Date.now();
    for (const [key, timestamp] of this.connectionTimestamps.entries()){
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }
    return oldestKey;
  }
  /**
   * Limpar conexões idle
   */ async cleanupIdleConnections() {
    const now = Date.now();
    const keysToRemove = [];
    for (const [key, timestamp] of this.connectionTimestamps.entries()){
      if (now - timestamp > this.config.idleTimeoutMs) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove){
      this.connections.delete(key);
      this.connectionTimestamps.delete(key);
    }
    if (keysToRemove.length > 0) {
      console.log(`[CONNECTION_POOL] Limpeza: ${keysToRemove.length} conexões idle removidas`);
    }
  }
  /**
   * Iniciar timer de limpeza automática
   */ startCleanupTimer() {
    // Limpar conexões idle a cada 30 segundos
    this.cleanupInterval = setInterval(()=>{
      this.cleanupIdleConnections();
    }, 30000);
  }
  /**
   * Obter estatísticas do pool
   */ getStats() {
    const now = Date.now();
    let activeConnections = 0;
    let idleConnections = 0;
    for (const timestamp of this.connectionTimestamps.values()){
      if (now - timestamp < 5000) {
        // Ativa se usada nos últimos 5 segundos
        activeConnections++;
      } else {
        idleConnections++;
      }
    }
    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections,
      config: this.config
    };
  }
  /**
   * Fechar todas as conexões (para cleanup)
   */ async closeAll() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
    this.connectionTimestamps.clear();
    console.log('[CONNECTION_POOL] Todas as conexões foram fechadas');
  }
}
// Instância singleton do pool
const connectionPool = ConnectionPool.getInstance();
/**
 * Função principal para obter conexão otimizada
 */ export async function getOptimizedConnection(context) {
  return connectionPool.getConnection(context);
}
/**
 * Função para obter estatísticas do pool
 */ export function getConnectionPoolStats() {
  return connectionPool.getStats();
}
/**
 * Middleware para injetar conexão otimizada
 */ export function withOptimizedConnection(fn) {
  return async (...args)=>{
    const client = await getOptimizedConnection();
    return fn(client, ...args);
  };
}
/**
 * Decorator para functions que usam conexão otimizada
 */ export function optimizedConnection(context) {
  return function(_target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args) {
      const client = await getOptimizedConnection(context || propertyKey);
      return originalMethod.call(this, client, ...args);
    };
    return descriptor;
  };
}
/**
 * Função para executar query com retry automático
 */ export async function executeWithRetry(operation, context, maxRetries) {
  const config = connectionPool.getStats().config;
  const retries = maxRetries || config.retryAttempts;
  for(let attempt = 1; attempt <= retries; attempt++){
    try {
      const client = await getOptimizedConnection(context);
      return await operation(client);
    } catch (_error) {
      console.error(`[CONNECTION_RETRY] Tentativa ${attempt}/${retries} falhou:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Aguardar antes da próxima tentativa
      await new Promise((resolve)=>setTimeout(resolve, config.retryDelayMs * attempt));
    }
  }
  throw new Error('Todas as tentativas de conexão falharam');
}
/**
 * Função para cleanup em caso de shutdown
 */ export async function cleanup() {
  await connectionPool.closeAll();
}
// Registrar cleanup no shutdown
if (typeof addEventListener !== 'undefined') {
  addEventListener('beforeunload', cleanup);
}
// Export do pool para casos especiais
export { connectionPool };
