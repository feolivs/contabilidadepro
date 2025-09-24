'use client'

import { useEffect, createContext, useContext, useState } from 'react'
import { resourcePreloader } from '@/lib/preloader'

interface ServiceWorkerContextType {
  isSupported: boolean
  isInstalled: boolean
  isUpdateAvailable: boolean
  updateServiceWorker: () => void
  cacheStats: {
    size: number
    hitRate: number
  }
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(null)

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [cacheStats, setCacheStats] = useState({ size: 0, hitRate: 0 })

  useEffect(() => {
    // TEMPORARIAMENTE DESABILITADO - Service Worker causando bloqueio
    console.log('🔧 Service Worker desabilitado temporariamente para debug')

    // Desregistrar qualquer Service Worker existente
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister()
          console.log('🗑️ Service Worker desregistrado')
        })
      })
    }

    return

    // Verificar suporte ao Service Worker
    const supported = 'serviceWorker' in navigator
    setIsSupported(supported)

    if (!supported) {
      console.warn('⚠️ Service Worker não suportado neste browser')
      return
    }

    // Inicializar Service Worker de forma assíncrona
    initializeServiceWorker()

    // Adiar preload para não bloquear inicialização
    const startPreloadAfterInteraction = () => {
      let hasInteracted = false

      const handleFirstInteraction = () => {
        if (hasInteracted) return
        hasInteracted = true

        // Remover listeners
        document.removeEventListener('click', handleFirstInteraction)
        document.removeEventListener('scroll', handleFirstInteraction)
        document.removeEventListener('keydown', handleFirstInteraction)

        // Iniciar preload usando requestIdleCallback para não bloquear UI
        requestIdleCallback(() => {
          resourcePreloader.initServiceWorker()
          resourcePreloader.preloadCriticalAssets()
        })

        // Preload inteligente com delay adicional
        setTimeout(() => {
          requestIdleCallback(() => {
            resourcePreloader.intelligentPreload()
          })
        }, 2000)
      }

      // Adicionar listeners para primeira interação
      document.addEventListener('click', handleFirstInteraction, { passive: true })
      document.addEventListener('scroll', handleFirstInteraction, { passive: true })
      document.addEventListener('keydown', handleFirstInteraction, { passive: true })

      // Fallback: iniciar após 5 segundos mesmo sem interação
      setTimeout(() => {
        if (!hasInteracted) {
          handleFirstInteraction()
        }
      }, 5000)
    }

    startPreloadAfterInteraction()

    // Monitorar cache stats com intervalo maior
    const statsInterval = setInterval(updateCacheStats, 60000) // A cada 1 minuto

    return () => {
      clearInterval(statsInterval)
    }
  }, [])

  const initializeServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        // Verificar se já existe um SW registrado
        const registration = await navigator.serviceWorker.getRegistration()

        if (registration) {
          setIsInstalled(true)
          console.log('✅ Service Worker já instalado')

          // Verificar updates
          registration.addEventListener('updatefound', () => {
            setIsUpdateAvailable(true)
            console.log('🔄 Update disponível para o Service Worker')
          })

          // Verificar se há update pendente
          if (registration.waiting) {
            setIsUpdateAvailable(true)
          }
        } else {
          console.log('🔧 Nenhum Service Worker encontrado')
        }

        // Escutar mudanças no estado do SW
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service Worker controller mudou')
          setIsInstalled(true)
          setIsUpdateAvailable(false)
        })
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Service Worker:', error)
    }
  }

  const updateServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration && registration.waiting) {
        // Enviar mensagem para o SW waiting ativar
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })

        // Recarregar a página após o update
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar Service Worker:', error)
    }
  }

  const updateCacheStats = () => {
    try {
      // Estimar stats do cache do SW
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          setCacheStats(prev => ({
            ...prev,
            size: cacheNames.length
          }))
        })
      }

      // Stats do cache em memória
      const preloaderStats = resourcePreloader.getStats()
      setCacheStats(prev => ({
        size: prev.size + preloaderStats.preloadedAssets,
        hitRate: preloaderStats.cacheStats.validItems / Math.max(preloaderStats.cacheStats.size, 1) * 100
      }))
    } catch (error) {
      console.warn('⚠️ Erro ao obter stats do cache:', error)
    }
  }

  const contextValue: ServiceWorkerContextType = {
    isSupported,
    isInstalled,
    isUpdateAvailable,
    updateServiceWorker,
    cacheStats
  }

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}

      {/* Notificação de update disponível */}
      {isUpdateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="font-medium">Nova versão disponível!</div>
              <div className="text-sm opacity-90">Clique para atualizar o sistema</div>
            </div>
            <button
              onClick={updateServiceWorker}
              className="bg-white/20 px-3 py-1 rounded text-sm hover:bg-white/30 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {/* Indicador de cache ativo (apenas em dev) */}
      {process.env.NODE_ENV === 'development' && isInstalled && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs z-40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            SW Ativo
          </div>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  )
}

export function useServiceWorker() {
  const context = useContext(ServiceWorkerContext)

  if (!context) {
    throw new Error('useServiceWorker deve ser usado dentro do ServiceWorkerProvider')
  }

  return context
}