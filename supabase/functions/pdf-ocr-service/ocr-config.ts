// OCR Configuration and Provider Management

export interface OCRProviderConfig {
  name: string
  enabled: boolean
  priority: number
  costPerRequest: number // in USD
  maxFileSize: number // in bytes
  supportedFormats: string[]
  rateLimit: {
    requestsPerMinute: number
    requestsPerDay: number
  }
  qualityScore: number // 1-10 scale
}

// OCR Provider Configurations
export const OCR_PROVIDERS: Record<string, OCRProviderConfig> = {
  'openai-vision': {
    name: 'OpenAI Vision API',
    enabled: true,
    priority: 1,
    costPerRequest: 0.00255, // $2.55 per 1000 requests (gpt-4o-mini)
    maxFileSize: 20 * 1024 * 1024, // 20MB
    supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'],
    rateLimit: {
      requestsPerMinute: 500,
      requestsPerDay: 50000
    },
    qualityScore: 9
  },

  'google-vision': {
    name: 'Google Vision API',
    enabled: true,
    priority: 2,
    costPerRequest: 0.0015, // $1.50 per 1000 requests
    maxFileSize: 20 * 1024 * 1024, // 20MB
    supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
    rateLimit: {
      requestsPerMinute: 600,
      requestsPerDay: 100000
    },
    qualityScore: 8
  },

  'tesseract': {
    name: 'Tesseract OCR',
    enabled: true,
    priority: 3,
    costPerRequest: 0, // Free
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'bmp'],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 10000
    },
    qualityScore: 6
  }
}

// Quality thresholds for different use cases
export const QUALITY_THRESHOLDS = {
  financial_documents: 0.9,
  legal_documents: 0.95,
  general_documents: 0.8,
  receipts: 0.85,
  invoices: 0.9
}

// Cost optimization settings
export const COST_OPTIMIZATION = {
  // Use cheaper provider for documents with good text extraction
  preferNativeTextExtraction: true,
  
  // Fallback chain based on cost and quality
  fallbackChain: ['openai-vision', 'google-vision', 'tesseract'],
  
  // Maximum cost per document (in USD)
  maxCostPerDocument: 0.01,
  
  // Use high-quality providers only for important documents
  highQualityProviders: ['google-vision'],
  
  // Budget limits
  dailyBudgetLimit: 50.0, // $50 per day
  monthlyBudgetLimit: 1000.0 // $1000 per month
}

// Document type detection patterns
export const DOCUMENT_PATTERNS = {
  invoice: {
    patterns: [
      /nota\s+fiscal/i,
      /invoice/i,
      /fatura/i,
      /n[fº°]\s*\d+/i
    ],
    requiredQuality: 0.9,
    preferredProvider: 'google-vision'
  },
  
  receipt: {
    patterns: [
      /cupom\s+fiscal/i,
      /recibo/i,
      /comprovante/i,
      /ecf/i
    ],
    requiredQuality: 0.85,
    preferredProvider: 'openai-vision'
  },
  
  contract: {
    patterns: [
      /contrato/i,
      /acordo/i,
      /termo/i,
      /clausula/i
    ],
    requiredQuality: 0.95,
    preferredProvider: 'google-vision'
  },
  
  financial_statement: {
    patterns: [
      /balanco/i,
      /demonstra[cç][aã]o/i,
      /dre/i,
      /resultado/i
    ],
    requiredQuality: 0.95,
    preferredProvider: 'google-vision'
  },
  
  general: {
    patterns: [],
    requiredQuality: 0.8,
    preferredProvider: 'openai-vision'
  }
}

// Get optimal provider for document
export function getOptimalProvider(
  documentType: string = 'general',
  fileSize: number,
  qualityRequirement: number = 0.8
): string {
  const docConfig = DOCUMENT_PATTERNS[documentType] || DOCUMENT_PATTERNS.general
  
  // Check if preferred provider can handle the file
  const preferredProvider = OCR_PROVIDERS[docConfig.preferredProvider]
  
  if (preferredProvider && 
      preferredProvider.enabled && 
      fileSize <= preferredProvider.maxFileSize &&
      preferredProvider.qualityScore >= qualityRequirement * 10) {
    return docConfig.preferredProvider
  }
  
  // Find best alternative
  const availableProviders = Object.entries(OCR_PROVIDERS)
    .filter(([_, config]) => 
      config.enabled && 
      fileSize <= config.maxFileSize &&
      config.qualityScore >= qualityRequirement * 10
    )
    .sort((a, b) => {
      // Sort by priority (lower number = higher priority)
      if (a[1].priority !== b[1].priority) {
        return a[1].priority - b[1].priority
      }
      // Then by quality score (higher is better)
      return b[1].qualityScore - a[1].qualityScore
    })
  
  return availableProviders.length > 0 ? availableProviders[0][0] : 'tesseract'
}

// Detect document type from filename and content
export function detectDocumentType(fileName: string, content?: string): string {
  const lowerFileName = fileName.toLowerCase()
  
  // Check filename patterns first
  for (const [type, config] of Object.entries(DOCUMENT_PATTERNS)) {
    if (type === 'general') continue
    
    for (const pattern of config.patterns) {
      if (pattern.test(lowerFileName)) {
        return type
      }
    }
  }
  
  // Check content patterns if available
  if (content) {
    for (const [type, config] of Object.entries(DOCUMENT_PATTERNS)) {
      if (type === 'general') continue
      
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          return type
        }
      }
    }
  }
  
  return 'general'
}

// Calculate processing cost
export function calculateProcessingCost(
  provider: string,
  pages: number = 1
): number {
  const config = OCR_PROVIDERS[provider]
  if (!config) return 0
  
  return config.costPerRequest * pages
}

// Check if within budget limits
export function isWithinBudget(
  estimatedCost: number,
  currentDailyCost: number = 0,
  currentMonthlyCost: number = 0
): boolean {
  return (
    estimatedCost <= COST_OPTIMIZATION.maxCostPerDocument &&
    (currentDailyCost + estimatedCost) <= COST_OPTIMIZATION.dailyBudgetLimit &&
    (currentMonthlyCost + estimatedCost) <= COST_OPTIMIZATION.monthlyBudgetLimit
  )
}

// Get processing strategy
export function getProcessingStrategy(
  fileName: string,
  fileSize: number,
  content?: string
): {
  documentType: string
  provider: string
  qualityRequirement: number
  estimatedCost: number
  fallbackProviders: string[]
} {
  const documentType = detectDocumentType(fileName, content)
  const docConfig = DOCUMENT_PATTERNS[documentType]
  
  const provider = getOptimalProvider(
    documentType,
    fileSize,
    docConfig.requiredQuality
  )
  
  const estimatedCost = calculateProcessingCost(provider)
  
  // Get fallback providers
  const fallbackProviders = COST_OPTIMIZATION.fallbackChain
    .filter(p => p !== provider && OCR_PROVIDERS[p].enabled)
  
  return {
    documentType,
    provider,
    qualityRequirement: docConfig.requiredQuality,
    estimatedCost,
    fallbackProviders
  }
}
