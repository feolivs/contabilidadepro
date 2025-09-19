'use client'

import { apiOptimizer } from './api-optimizer'
import { performanceCache } from './performance-cache'

class ResourcePreloader {
  private preloadedAssets = new Set<string>()
  private priorityQueue: Array<{ url: string; priority: 'high' | 'medium' | 'low' }> = []

  // Preload de imagens críticas
  preloadImage(src: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedAssets.has(src)) {
        resolve()
        return
      }

      const img = new Image()
      img.onload = () => {
        this.preloadedAssets.add(src)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }

  // Preload de assets críticos com prioridade
  async preloadCriticalAssets() {
    const criticalAssets = [
      // SVGs do sistema
      { url: '/next.svg', priority: 'high' as const },
      { url: '/vercel.svg', priority: 'medium' as const },

      // Fontes críticas já estão no layout, mas podemos preload outras
      // CSS chunks críticos serão carregados automaticamente pelo Next.js
    ]

    const highPriority = criticalAssets.filter(asset => asset.priority === 'high')
    const mediumPriority = criticalAssets.filter(asset => asset.priority === 'medium')

    // Carregar assets de alta prioridade primeiro
    await Promise.allSettled(
      highPriority.map(asset => this.preloadImage(asset.url, asset.priority))
    )

    // Em seguida, assets de prioridade média
    setTimeout(() => {
      Promise.allSettled(
        mediumPriority.map(asset => this.preloadImage(asset.url, asset.priority))
      )
    }, 100)
  }

  // Preload de dados críticos da API
  async preloadCriticalData(userId?: string) {
    if (!userId) return

    const criticalEndpoints = [
      {
        key: `user:${userId}:profile`,
        fn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
        priority: 'high' as const
      },
      {
        key: `user:${userId}:companies`,
        fn: () => fetch(`/api/empresas?user_id=${userId}&limit=10`).then(r => r.json()),
        priority: 'medium' as const
      }
    ]

    // Usar o API optimizer para fazer preload inteligente
    await Promise.allSettled(
      criticalEndpoints.map(({ key, fn, priority }) =>
        apiOptimizer.optimizedRequest(key, fn, {
          cache: true,
          cacheTTL: priority === 'high' ? 30 * 60 * 1000 : 10 * 60 * 1000
        })
      )
    )
  }

  // Preload baseado na rota atual
  async preloadRouteAssets(route: string) {
    const routeAssets: Record<string, string[]> = {
      '/dashboard': [
        // Assets específicos do dashboard
      ],
      '/documentos': [
        // Assets para visualização de documentos
      ],
      '/calculos': [
        // Assets para cálculos
      ]
    }

    const assets = routeAssets[route] || []
    if (assets.length === 0) return

    await Promise.allSettled(
      assets.map(asset => this.preloadImage(asset, 'low'))
    )
  }

  // Preload inteligente baseado no comportamento do usuário
  intelligentPreload() {
    // Preload quando o usuário hoverar sobre links
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement

      if (link && link.href && !link.href.includes('#')) {
        // Preload da rota quando o usuário hoverar sobre um link
        this.prefetchRoute(link.href)
      }
    }, { passive: true })

    // Preload quando o usuário estiver idle
    this.preloadOnIdle()
  }

  private prefetchRoute(href: string) {
    try {
      const url = new URL(href)
      if (url.origin === window.location.origin) {
        // Usar Next.js prefetch se disponível
        if ('prefetch' in document.createElement('link')) {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = href
          document.head.appendChild(link)
        }
      }
    } catch (error) {
      // Ignorar URLs inválidas
    }
  }

  private preloadOnIdle() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload de recursos de baixa prioridade quando o browser estiver idle
        this.preloadLowPriorityResources()
      }, { timeout: 5000 })
    } else {
      // Fallback para browsers sem requestIdleCallback
      setTimeout(() => {
        this.preloadLowPriorityResources()
      }, 2000)
    }
  }

  private async preloadLowPriorityResources() {
    // Preload de componentes lazy que provavelmente serão usados
    const lazyComponents = [
      () => import('@/components/lazy/lazy-pdf-viewer'),
      () => import('@/components/lazy/lazy-charts'),
      () => import('@/components/lazy/lazy-ai-components')
    ]

    // Carregar um por vez para não sobrecarregar
    for (const component of lazyComponents) {
      try {
        await component()
        // Pequeno delay entre cada componente
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.warn('Failed to preload component:', error)
      }
    }
  }

  // Service Worker para cache avançado
  async initServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
    if ('serviceWorker' in navigator) {
      try {
        // Registrar sempre, não apenas em production
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('🎯 ServiceWorker registrado:', registration.scope)

        // Verificar se há updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            console.log('🔄 Nova versão do SW encontrada')

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✨ Nova versão instalada')
                this.notifyUpdate()
              }
            })
          }
        })

        // Escutar mensagens do SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('📨 Mensagem do SW:', event.data)

          if (event.data.type === 'CACHE_UPDATED') {
            this.notifyDataUpdate()
          }
        })

        // Verificar se já há um SW controlando a página
        if (registration.active && !navigator.serviceWorker.controller) {
          console.log('🔄 Recarregando para ativar SW')
          window.location.reload()
        }

        // Background sync se suportado
        if ('sync' in window.ServiceWorkerRegistration.prototype) {
          console.log('✅ Background Sync suportado')
        }

        return registration
      } catch (error) {
        console.warn('❌ ServiceWorker falhou:', error)
        return undefined
      }
    } else {
      console.warn('⚠️ ServiceWorker não suportado')
      return undefined
    }
  }

  private notifyUpdate() {
    // Implementar notificação de atualização para o usuário
    console.log('✨ Nova versão disponível!')

    // Criar notificação visual
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm'
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <div class="flex-1">
          <div class="font-medium">Nova versão disponível!</div>
          <div class="text-sm opacity-90">Clique para atualizar</div>
        </div>
        <button onclick="window.location.reload()" class="bg-white/20 px-3 py-1 rounded text-sm hover:bg-white/30">
          Atualizar
        </button>
      </div>
    `

    document.body.appendChild(notification)

    // Auto-remover após 10 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 10000)
  }

  private notifyDataUpdate() {
    console.log('📊 Dados atualizados pelo cache')
  }

  // Limpeza de recursos
  cleanup() {
    this.preloadedAssets.clear()
    this.priorityQueue = []
  }

  // Estatísticas
  getStats() {
    return {
      preloadedAssets: this.preloadedAssets.size,
      queueSize: this.priorityQueue.length,
      cacheStats: performanceCache.getStats()
    }
  }
}

export const resourcePreloader = new ResourcePreloader()

// Hook para usar o preloader
export function useResourcePreloader() {
  return {
    preloadImage: resourcePreloader.preloadImage.bind(resourcePreloader),
    preloadCriticalData: resourcePreloader.preloadCriticalData.bind(resourcePreloader),
    preloadRouteAssets: resourcePreloader.preloadRouteAssets.bind(resourcePreloader),
    getStats: resourcePreloader.getStats.bind(resourcePreloader)
  }
}