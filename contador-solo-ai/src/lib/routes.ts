/**
 * Sistema de Roteamento Centralizado - ContabilidadePRO
 * Centraliza todas as rotas da aplicação com validação e metadata
 */

// =====================================================
// DEFINIÇÃO DE ROTAS
// =====================================================

export const APP_ROUTES = {
  // Principais
  HOME: '/',
  DASHBOARD: '/dashboard',
  DASHBOARD_OPTIMIZED: '/dashboard-optimized',

  // Gestão
  CLIENTES: '/clientes', // Deprecated - usar EMPRESAS_CLIENTES
  EMPRESAS_CLIENTES: '/empresas-clientes',
  EMPRESA: (id: string) => `/empresa/${id}`,
  DOCUMENTOS: '/documentos',
  DOCUMENTOS_OCR: '/documentos-ocr',

  // Operações
  CALCULOS: '/calculos',
  PRAZOS: '/prazos',
  RELATORIOS: '/relatorios',

  // Sistema
  ASSISTENTE: '/assistente',
  CONFIGURACOES: '/configuracoes',
  SEGURANCA: '/seguranca',

  // Auth
  LOGIN: '/login',
  PERFIL: '/perfil'
} as const

// =====================================================
// TIPOS TYPESCRIPT
// =====================================================

export type StaticRoute = string
export type DynamicRoute = (id: string) => string
export type AppRoute = StaticRoute | DynamicRoute

export interface RouteMetadata {
  title: string
  description: string
  requiresAuth: boolean
  permissions?: string[]
  icon?: string
  badge?: string
  isNew?: boolean
  category?: 'principal' | 'gestao' | 'operacoes' | 'sistema'
}

// =====================================================
// METADATA DAS ROTAS
// =====================================================

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  [APP_ROUTES.HOME]: {
    title: 'Início',
    description: 'Página inicial do sistema',
    requiresAuth: false,
    category: 'principal'
  },
  [APP_ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    description: 'Visão geral do sistema contábil',
    requiresAuth: true,
    permissions: ['read:dashboard'],
    icon: 'LayoutDashboard',
    category: 'principal'
  },

  [APP_ROUTES.ASSISTENTE]: {
    title: 'Assistente IA',
    description: 'Assistente inteligente para contabilidade',
    requiresAuth: true,
    permissions: ['read:assistente'],
    icon: 'Bot',
    badge: 'NOVO',
    isNew: true,
    category: 'principal'
  },
  [APP_ROUTES.CLIENTES]: {
    title: 'Clientes',
    description: 'Gestão de clientes e empresas',
    requiresAuth: true,
    permissions: ['read:clientes'],
    icon: 'Users',
    category: 'gestao'
  },
  [APP_ROUTES.DOCUMENTOS]: {
    title: 'Documentos',
    description: 'Gestão e processamento de documentos',
    requiresAuth: true,
    permissions: ['read:documentos'],
    icon: 'FileText',
    category: 'gestao'
  },
  [APP_ROUTES.CALCULOS]: {
    title: 'Cálculos Fiscais',
    description: 'Cálculos de impostos e tributos',
    requiresAuth: true,
    permissions: ['read:calculos'],
    icon: 'Calculator',
    badge: 'PRO',
    category: 'operacoes'
  },

  [APP_ROUTES.PRAZOS]: {
    title: 'Prazos Fiscais',
    description: 'Calendário de obrigações fiscais',
    requiresAuth: true,
    permissions: ['read:prazos'],
    icon: 'Calendar',
    category: 'operacoes'
  },
  [APP_ROUTES.RELATORIOS]: {
    title: 'Relatórios',
    description: 'Relatórios contábeis e fiscais',
    requiresAuth: true,
    permissions: ['read:relatorios'],
    icon: 'FileBarChart',
    category: 'operacoes'
  },

  [APP_ROUTES.CONFIGURACOES]: {
    title: 'Configurações',
    description: 'Configurações do sistema',
    requiresAuth: true,
    permissions: ['read:configuracoes'],
    icon: 'Settings',
    category: 'sistema'
  },
  [APP_ROUTES.SEGURANCA]: {
    title: 'Segurança',
    description: 'Configurações de segurança',
    requiresAuth: true,
    permissions: ['read:seguranca'],
    icon: 'Shield',
    category: 'sistema'
  },
  [APP_ROUTES.DASHBOARD_OPTIMIZED]: {
    title: 'Dashboard Otimizado',
    description: 'Versão otimizada do dashboard principal',
    requiresAuth: true,
    permissions: ['read:dashboard'],
    icon: 'LayoutDashboard',
    category: 'principal'
  },
  [APP_ROUTES.DOCUMENTOS_OCR]: {
    title: 'Processamento OCR',
    description: 'Interface de processamento OCR de documentos',
    requiresAuth: true,
    permissions: ['read:documentos', 'write:documentos'],
    icon: 'FileText',
    category: 'gestao'
  },

  [APP_ROUTES.LOGIN]: {
    title: 'Login',
    description: 'Página de autenticação do sistema',
    requiresAuth: false,
    category: 'sistema'
  },
  [APP_ROUTES.PERFIL]: {
    title: 'Perfil',
    description: 'Configurações do perfil do usuário',
    requiresAuth: true,
    permissions: ['read:perfil'],
    icon: 'User',
    category: 'sistema'
  }
}

// =====================================================
// UTILITÁRIOS DE VALIDAÇÃO
// =====================================================

/**
 * Valida se uma rota existe no sistema
 */
export const validateRoute = (path: string): boolean => {
  const staticRoutes = Object.values(APP_ROUTES).filter(
    (route): route is string => typeof route === 'string'
  )

  // Verificar rotas estáticas
  if (staticRoutes.includes(path as any)) {
    return true
  }
  
  // Verificar rotas dinâmicas (empresa/[id])
  const dynamicPatterns = [
    /^\/empresa\/[a-zA-Z0-9-]+$/,
    /^\/clientes\/[a-zA-Z0-9-]+$/,
    /^\/calculos\/[a-zA-Z0-9-]+$/
  ]
  
  return dynamicPatterns.some(pattern => pattern.test(path))
}

/**
 * Obtém metadata de uma rota
 */
export const getRouteMetadata = (path: string): RouteMetadata | null => {
  return ROUTE_METADATA[path] || null
}

/**
 * Verifica se usuário tem permissão para acessar rota
 */
export const hasRoutePermission = (
  path: string, 
  userPermissions: string[]
): boolean => {
  const metadata = getRouteMetadata(path)
  
  if (!metadata) return false
  if (!metadata.requiresAuth) return true
  if (!metadata.permissions) return true
  
  return metadata.permissions.some(permission => 
    userPermissions.includes(permission)
  )
}

/**
 * Gera breadcrumbs para uma rota
 */
export const generateBreadcrumbs = (path: string): Array<{title: string, href: string}> => {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs: Array<{title: string, href: string}> = [{ title: 'Contador Solo AI', href: APP_ROUTES.HOME }]

  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`
    const metadata = getRouteMetadata(currentPath)

    if (metadata) {
      breadcrumbs.push({
        title: metadata.title,
        href: currentPath
      })
    }
  }

  return breadcrumbs
}

/**
 * Agrupa rotas por categoria para navegação
 */
export const getRoutesByCategory = (): Record<string, RouteMetadata[]> => {
  const categories: Record<string, RouteMetadata[]> = {
    principal: [],
    gestao: [],
    operacoes: [],
    sistema: []
  }
  
  Object.entries(ROUTE_METADATA).forEach(([path, metadata]) => {
    if (metadata.category && categories[metadata.category]) {
      categories[metadata.category].push({ ...metadata, title: metadata.title })
    }
  })
  
  return categories
}

// =====================================================
// CONSTANTES ÚTEIS
// =====================================================

export const PROTECTED_ROUTES = Object.entries(ROUTE_METADATA)
  .filter(([_, metadata]) => metadata.requiresAuth)
  .map(([path]) => path)

export const PUBLIC_ROUTES = Object.entries(ROUTE_METADATA)
  .filter(([_, metadata]) => !metadata.requiresAuth)
  .map(([path]) => path)

export const NEW_FEATURES = Object.entries(ROUTE_METADATA)
  .filter(([_, metadata]) => metadata.isNew)
  .map(([path]) => path)
