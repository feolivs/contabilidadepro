/**
 * Configuração das Extensões PostgreSQL - ContabilidadePRO
 * Centraliza configurações e constantes das extensões ativadas
 */

export const POSTGRES_EXTENSIONS = {
  // Extensões de Busca
  SEARCH: {
    unaccent: {
      name: 'unaccent',
      version: '1.1',
      description: 'Remove acentos para busca normalizada',
      functions: ['unaccent'],
      usage: 'Busca de nomes brasileiros sem acentos'
    },
    fuzzystrmatch: {
      name: 'fuzzystrmatch',
      version: '1.2',
      description: 'Busca aproximada com algoritmos avançados',
      functions: ['levenshtein', 'levenshtein_less_equal', 'soundex', 'metaphone'],
      usage: 'Busca tolerante a erros de digitação'
    },
    pg_trgm: {
      name: 'pg_trgm',
      version: '1.6',
      description: 'Similaridade de texto usando trigramas',
      functions: ['similarity', 'show_trgm', 'word_similarity'],
      operators: ['%', '<%', '%>', '<<%', '%>>'],
      usage: 'Busca por similaridade de texto'
    },
    btree_gin: {
      name: 'btree_gin',
      version: '1.3',
      description: 'Índices GIN para tipos comuns',
      usage: 'Otimização de consultas de busca'
    }
  },

  // Extensões de Estrutura de Dados
  DATA_STRUCTURES: {
    ltree: {
      name: 'ltree',
      version: '1.3',
      description: 'Estruturas hierárquicas',
      functions: ['nlevel', 'index', 'text2ltree', 'ltree2text'],
      operators: ['@>', '<@', '~', '?'],
      usage: 'Plano de contas contábil hierárquico'
    },
    hstore: {
      name: 'hstore',
      version: '1.8',
      description: 'Armazenamento chave-valor flexível',
      functions: ['hstore', 'akeys', 'avals', 'skeys', 'svals'],
      operators: ['->', '?', '?&', '?|', '@>', '<@'],
      usage: 'Metadados flexíveis para documentos'
    },
    citext: {
      name: 'citext',
      version: '1.6',
      description: 'Strings case-insensitive',
      usage: 'Emails e usernames'
    }
  },

  // Extensões de Processamento
  PROCESSING: {
    pgmq: {
      name: 'pgmq',
      version: '1.4.4',
      description: 'Sistema de filas PostgreSQL',
      functions: ['send', 'read', 'delete', 'purge_queue', 'metrics'],
      usage: 'Processamento assíncrono de cálculos fiscais'
    },
    pg_cron: {
      name: 'pg_cron',
      version: '1.6',
      description: 'Agendador de tarefas',
      functions: ['schedule', 'unschedule'],
      usage: 'Automação de tarefas fiscais'
    }
  },

  // Extensões de Rede
  NETWORK: {
    http: {
      name: 'http',
      version: '1.6',
      description: 'Cliente HTTP para PostgreSQL',
      functions: ['http_get', 'http_post', 'http_put', 'http_delete'],
      usage: 'Integração com APIs externas'
    },
    pg_net: {
      name: 'pg_net',
      version: '0.14.0',
      description: 'HTTP assíncrono',
      functions: ['http_get', 'http_post'],
      usage: 'Webhooks e notificações'
    }
  },

  // Extensões de Segurança
  SECURITY: {
    pgsodium: {
      name: 'pgsodium',
      version: '3.1.8',
      description: 'Criptografia moderna',
      functions: [
        'crypto_aead_det_encrypt',
        'crypto_aead_det_decrypt',
        'crypto_pwhash',
        'crypto_pwhash_str_verify',
        'randombytes_buf'
      ],
      usage: 'Proteção de dados sensíveis'
    },
    pgcrypto: {
      name: 'pgcrypto',
      version: '1.3',
      description: 'Funções criptográficas',
      functions: ['pgp_sym_encrypt', 'pgp_sym_decrypt', 'crypt', 'gen_salt'],
      usage: 'Criptografia de dados'
    },
    pgaudit: {
      name: 'pgaudit',
      version: '17.0',
      description: 'Auditoria avançada',
      usage: 'Compliance e auditoria'
    }
  },

  // Extensões de Validação
  VALIDATION: {
    pg_jsonschema: {
      name: 'pg_jsonschema',
      version: '0.3.3',
      description: 'Validação de esquemas JSON',
      functions: ['json_matches_schema'],
      usage: 'Validação de documentos fiscais'
    }
  },

  // Extensões de Autenticação
  AUTH: {
    pgjwt: {
      name: 'pgjwt',
      version: '0.2.0',
      description: 'JWT nativo no PostgreSQL',
      functions: ['sign', 'verify'],
      usage: 'Autenticação JWT nativa'
    }
  },

  // Extensões de Notificação
  NOTIFICATION: {
    tcn: {
      name: 'tcn',
      version: '1.0',
      description: 'Notificações de mudanças',
      usage: 'Triggers de notificação'
    }
  },

  // Extensões de Conectividade
  CONNECTIVITY: {
    dblink: {
      name: 'dblink',
      version: '1.2',
      description: 'Conexões entre bancos',
      functions: ['dblink_connect', 'dblink_exec', 'dblink_disconnect'],
      usage: 'Integração entre bancos'
    },
    postgres_fdw: {
      name: 'postgres_fdw',
      version: '1.1',
      description: 'Foreign Data Wrappers',
      usage: 'Acesso a dados externos'
    }
  },

  // Extensões de Utilidades
  UTILITIES: {
    tablefunc: {
      name: 'tablefunc',
      version: '1.0',
      description: 'Manipulação de tabelas',
      functions: ['crosstab', 'normal_rand'],
      usage: 'Transformação de dados'
    },
    uuid_ossp: {
      name: 'uuid-ossp',
      version: '1.1',
      description: 'Geração de UUIDs',
      functions: ['uuid_generate_v1', 'uuid_generate_v4'],
      usage: 'IDs únicos'
    }
  }
} as const

// Configurações de Filas PGMQ
export const QUEUE_CONFIG = {
  QUEUES: {
    calculo_fiscal: {
      name: 'calculo_fiscal',
      description: 'Cálculos fiscais (DAS, IRPJ, etc.)',
      maxRetries: 3,
      visibilityTimeout: 300, // 5 minutos
      priority: 'high'
    },
    processamento_documentos: {
      name: 'processamento_documentos',
      description: 'OCR e análise de documentos',
      maxRetries: 2,
      visibilityTimeout: 600, // 10 minutos
      priority: 'medium'
    },
    notificacoes: {
      name: 'notificacoes',
      description: 'Emails e alertas',
      maxRetries: 5,
      visibilityTimeout: 60, // 1 minuto
      priority: 'low'
    },
    integracoes_externas: {
      name: 'integracoes_externas',
      description: 'APIs externas e webhooks',
      maxRetries: 3,
      visibilityTimeout: 180, // 3 minutos
      priority: 'medium'
    },
    geracao_relatorios: {
      name: 'geracao_relatorios',
      description: 'Geração de relatórios',
      maxRetries: 2,
      visibilityTimeout: 900, // 15 minutos
      priority: 'low'
    }
  },
  
  DEFAULT_SETTINGS: {
    maxRetries: 3,
    visibilityTimeout: 300,
    batchSize: 10,
    pollInterval: 5000 // 5 segundos
  }
} as const

// Configurações de Busca
export const SEARCH_CONFIG = {
  SIMILARITY_THRESHOLDS: {
    high: 0.8,
    medium: 0.6,
    low: 0.3
  },
  
  LEVENSHTEIN_DISTANCE: {
    max: 3,
    threshold: 0.7
  },
  
  DEFAULT_LIMITS: {
    search: 20,
    suggestions: 5,
    autocomplete: 10
  }
} as const

// Configurações de Criptografia
export const ENCRYPTION_CONFIG = {
  KEY_TYPES: {
    financial_data: 'Dados financeiros',
    documents: 'Documentos (CNPJ/CPF)',
    cache_data: 'Dados de cache',
    api_keys: 'Chaves de API',
    default: 'Chave padrão'
  },
  
  ALGORITHMS: {
    'aead-det': 'Authenticated Encryption with Associated Data (Deterministic)',
    'pgp_sym': 'PGP Symmetric Encryption'
  }
} as const

// Configurações de Validação JSON
export const VALIDATION_CONFIG = {
  SCHEMAS: {
    nfe: 'Nota Fiscal Eletrônica',
    das: 'Documento de Arrecadação do Simples Nacional',
    irpj: 'Imposto de Renda Pessoa Jurídica',
    empresa: 'Dados da Empresa',
    cliente: 'Dados do Cliente'
  }
} as const

// Utilitários para verificar extensões
export const ExtensionUtils = {
  /**
   * Verifica se uma extensão está disponível
   */
  isExtensionAvailable(extensionName: string): boolean {
    const allExtensions = Object.values(POSTGRES_EXTENSIONS).flatMap(category => 
      Object.values(category)
    )
    return allExtensions.some(ext => ext.name === extensionName)
  },

  /**
   * Obtém informações de uma extensão
   */
  getExtensionInfo(extensionName: string) {
    const allExtensions = Object.values(POSTGRES_EXTENSIONS).flatMap(category => 
      Object.values(category)
    )
    return allExtensions.find(ext => ext.name === extensionName)
  },

  /**
   * Lista todas as extensões por categoria
   */
  getExtensionsByCategory(category: keyof typeof POSTGRES_EXTENSIONS) {
    return POSTGRES_EXTENSIONS[category]
  },

  /**
   * Obtém estatísticas das extensões
   */
  getExtensionStats() {
    const categories = Object.keys(POSTGRES_EXTENSIONS)
    const totalExtensions = Object.values(POSTGRES_EXTENSIONS).reduce(
      (total, category) => total + Object.keys(category).length,
      0
    )
    
    return {
      totalExtensions,
      totalCategories: categories.length,
      categories: categories.map(cat => ({
        name: cat,
        count: Object.keys(POSTGRES_EXTENSIONS[cat as keyof typeof POSTGRES_EXTENSIONS]).length
      }))
    }
  }
}
