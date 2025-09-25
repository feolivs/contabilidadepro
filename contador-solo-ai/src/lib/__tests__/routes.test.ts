/**
 * Testes para Sistema de Roteamento - ContabilidadePRO
 */

import {
  APP_ROUTES,
  validateRoute,
  getRouteMetadata,
  hasRoutePermission,
  generateBreadcrumbs,
  getRoutesByCategory,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  NEW_FEATURES
} from '../routes'

describe('Sistema de Rotas', () => {
  describe('APP_ROUTES', () => {
    test('deve conter todas as rotas principais', () => {
      expect(APP_ROUTES.HOME).toBe('/')
      expect(APP_ROUTES.DASHBOARD).toBe('/dashboard')
      expect(APP_ROUTES.CLIENTES).toBe('/clientes')
      expect(APP_ROUTES.ASSISTENTE).toBe('/assistente')
    })

    test('deve gerar rotas dinâmicas corretamente', () => {
      expect(APP_ROUTES.EMPRESA('123')).toBe('/empresa/123')
      expect(APP_ROUTES.EMPRESA('abc-def')).toBe('/empresa/abc-def')
    })

    test('deve redirecionar upload para documentos', () => {

    })
  })

  describe('validateRoute', () => {
    test('deve validar rotas estáticas existentes', () => {
      expect(validateRoute('/dashboard')).toBe(true)
      expect(validateRoute('/clientes')).toBe(true)
      expect(validateRoute('/assistente')).toBe(true)
      expect(validateRoute('/calculos')).toBe(true)
    })

    test('deve validar rotas dinâmicas', () => {
      expect(validateRoute('/empresa/123')).toBe(true)
      expect(validateRoute('/empresa/abc-def-456')).toBe(true)
      expect(validateRoute('/clientes/user-123')).toBe(true)
    })

    test('deve rejeitar rotas inexistentes', () => {
      expect(validateRoute('/rota-inexistente')).toBe(false)
      expect(validateRoute('/admin/users')).toBe(false)
      expect(validateRoute('')).toBe(false)
    })

    test('deve rejeitar rotas dinâmicas malformadas', () => {
      expect(validateRoute('/empresa/')).toBe(false)
      expect(validateRoute('/empresa/123/edit')).toBe(false)
    })
  })

  describe('getRouteMetadata', () => {
    test('deve retornar metadata para rotas existentes', () => {
      const dashboardMeta = getRouteMetadata('/dashboard')
      
      expect(dashboardMeta).toBeDefined()
      expect(dashboardMeta?.title).toBe('Dashboard')
      expect(dashboardMeta?.requiresAuth).toBe(true)
      expect(dashboardMeta?.permissions).toContain('read:dashboard')
    })

    test('deve retornar null para rotas inexistentes', () => {
      expect(getRouteMetadata('/rota-inexistente')).toBeNull()
    })

    test('deve incluir informações de badge para rotas novas', () => {
      const assistenteMeta = getRouteMetadata('/assistente')
      
      expect(assistenteMeta?.badge).toBe('NOVO')
      expect(assistenteMeta?.isNew).toBe(true)
    })
  })

  describe('hasRoutePermission', () => {
    const userPermissions = ['read:dashboard', 'read:clientes', 'write:calculos']

    test('deve permitir acesso para rotas públicas', () => {
      expect(hasRoutePermission('/', [])).toBe(true)
    })

    test('deve permitir acesso quando usuário tem permissão', () => {
      expect(hasRoutePermission('/dashboard', userPermissions)).toBe(true)
      expect(hasRoutePermission('/clientes', userPermissions)).toBe(true)
    })

    test('deve negar acesso quando usuário não tem permissão', () => {
      expect(hasRoutePermission('/calculos', ['read:dashboard'])).toBe(false)
    })

    test('deve retornar false para rotas inexistentes', () => {
      expect(hasRoutePermission('/inexistente', userPermissions)).toBe(false)
    })
  })

  describe('generateBreadcrumbs', () => {
    test('deve gerar breadcrumbs para rota simples', () => {
      const breadcrumbs = generateBreadcrumbs('/dashboard')
      
      expect(breadcrumbs).toHaveLength(2)
      expect(breadcrumbs[0]).toEqual({
        title: 'Contador Solo AI',
        href: '/'
      })
      expect(breadcrumbs[1]).toEqual({
        title: 'Dashboard',
        href: '/dashboard'
      })
    })

    test('deve gerar breadcrumbs para rotas aninhadas', () => {
      const breadcrumbs = generateBreadcrumbs('/clientes')

      expect(breadcrumbs).toHaveLength(2)
      expect(breadcrumbs[1]?.title).toBe('Clientes')
    })

    test('deve incluir apenas rotas válidas nos breadcrumbs', () => {
      const breadcrumbs = generateBreadcrumbs('/rota/inexistente')

      expect(breadcrumbs).toHaveLength(1) // Apenas home
      expect(breadcrumbs[0]?.title).toBe('Contador Solo AI')
    })
  })

  describe('getRoutesByCategory', () => {
    test('deve agrupar rotas por categoria', () => {
      const categories = getRoutesByCategory()
      
      expect(categories).toHaveProperty('principal')
      expect(categories).toHaveProperty('gestao')
      expect(categories).toHaveProperty('operacoes')
      expect(categories).toHaveProperty('sistema')
    })

    test('deve incluir rotas corretas em cada categoria', () => {
      const categories = getRoutesByCategory()

      const principalTitles = categories.principal?.map(r => r.title) || []
      expect(principalTitles).toContain('Dashboard')
      expect(principalTitles).toContain('Assistente IA')

      const gestaoTitles = categories.gestao?.map(r => r.title) || []
      expect(gestaoTitles).toContain('Clientes')
      expect(gestaoTitles).toContain('Documentos')
    })
  })

  describe('Constantes de Rotas', () => {
    test('PROTECTED_ROUTES deve conter rotas que requerem autenticação', () => {
      expect(PROTECTED_ROUTES).toContain('/dashboard')
      expect(PROTECTED_ROUTES).toContain('/clientes')
      expect(PROTECTED_ROUTES).not.toContain('/')
    })

    test('PUBLIC_ROUTES deve conter rotas públicas', () => {
      expect(PUBLIC_ROUTES).toContain('/')
      expect(PUBLIC_ROUTES).not.toContain('/dashboard')
    })

    test('NEW_FEATURES deve conter apenas rotas marcadas como novas', () => {
      expect(NEW_FEATURES).toContain('/assistente')
      expect(NEW_FEATURES).not.toContain('/dashboard')
      expect(NEW_FEATURES).not.toContain('/clientes')
    })
  })

  describe('Integridade dos Dados', () => {
    test('todas as rotas estáticas devem ter metadata', () => {
      const staticRoutes = Object.values(APP_ROUTES).filter(
        (route): route is string => typeof route === 'string'
      )

      staticRoutes.forEach(route => {
        const metadata = getRouteMetadata(route as any)
        expect(metadata).toBeDefined()
        expect(metadata?.title).toBeDefined()
        expect(metadata?.description).toBeDefined()
      })
    })

    test('rotas com permissões devem requerer autenticação', () => {
      Object.entries(getRouteMetadata).forEach(([path, metadata]) => {
        if (metadata && metadata.permissions && metadata.permissions.length > 0) {
          expect(metadata.requiresAuth).toBe(true)
        }
      })
    })

    test('rotas novas devem ter badge NOVO', () => {
      NEW_FEATURES.forEach(route => {
        const metadata = getRouteMetadata(route)
        expect(metadata?.isNew).toBe(true)
        expect(metadata?.badge).toBe('NOVO')
      })
    })
  })
})
