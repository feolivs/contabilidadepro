// Service Worker para ContabilidadePRO
// Cache estratégico para performance e funcionamento offline

const CACHE_NAME = 'contador-solo-v1.2.0'
const STATIC_CACHE = 'static-v1.2.0'
const DYNAMIC_CACHE = 'dynamic-v1.2.0'
const API_CACHE = 'api-v1.2.0'

// Assets essenciais para cache (estratégia Cache First)
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
]

// Assets opcionais que podem falhar sem quebrar o SW
const OPTIONAL_ASSETS = [
  '/next.svg',
  '/vercel.svg',
  '/file.svg',
  '/globe.svg',
  '/window.svg'
]

// Rotas da aplicação para cache (estratégia Network First)
const APP_ROUTES = [
  '/dashboard',
  '/assistente',
  '/clientes',
  '/documentos',
  '/calculos',
  '/relatorios',
  '/configuracoes'
]

// APIs para cache (estratégia Stale While Revalidate)
const API_PATTERNS = [
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  /^\/api\/empresas/,
  /^\/api\/users/,
  /^\/api\/documentos/
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...')

  event.waitUntil(
    Promise.all([
      // Cache de assets essenciais
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('📦 Cacheando assets essenciais')
        try {
          await cache.addAll(STATIC_ASSETS)
        } catch (error) {
          console.warn('⚠️ Falha ao cachear alguns assets essenciais:', error)
        }

        // Cachear assets opcionais individualmente
        console.log('📦 Cacheando assets opcionais')
        for (const asset of OPTIONAL_ASSETS) {
          try {
            await cache.add(asset)
          } catch (error) {
            console.warn(`⚠️ Falha ao cachear ${asset}:`, error.message)
          }
        }
      }),

      // Pre-cache de rotas principais (individual para evitar falha total)
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        console.log('🗂️ Preparando cache dinâmico')
        for (const route of APP_ROUTES) {
          try {
            await cache.add(route)
          } catch (error) {
            console.warn(`⚠️ Falha ao cachear rota ${route}:`, error.message)
          }
        }
      })
    ]).then(() => {
      console.log('✅ Service Worker instalado com sucesso')
      // Forçar ativação imediata
      return self.skipWaiting()
    }).catch((error) => {
      console.error('❌ Erro na instalação do Service Worker:', error)
      // Continuar mesmo com erros
      return self.skipWaiting()
    })
  )
})

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...')

  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),

      // Tomar controle de todas as abas
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker ativado')
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return
  }

  // Ignorar requisições do browser extension/chrome
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return
  }

  event.respondWith(
    handleRequest(request)
  )
})

async function handleRequest(request) {
  const url = new URL(request.url)

  try {
    // 1. Assets estáticos - Cache First
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE)
    }

    // 2. APIs - Stale While Revalidate
    if (isApiRequest(url)) {
      return await staleWhileRevalidate(request, API_CACHE)
    }

    // 3. Rotas da aplicação - Network First com fallback
    if (isAppRoute(url)) {
      return await networkFirstWithFallback(request, DYNAMIC_CACHE)
    }

    // 4. Outros recursos - Network First
    return await networkFirst(request, DYNAMIC_CACHE)

  } catch (error) {
    console.error('❌ Service Worker error:', error)

    // Fallback para página offline se disponível
    if (url.pathname.startsWith('/') && !url.pathname.includes('.')) {
      return await getOfflinePage()
    }

    return new Response('Offline', { status: 503 })
  }
}

// Estratégia Cache First - para assets estáticos
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  const response = await fetch(request)

  if (response.ok) {
    cache.put(request, response.clone())
  }

  return response
}

// Estratégia Network First - para rotas da aplicação
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)

    if (response.ok) {
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    const cached = await cache.match(request)

    if (cached) {
      return cached
    }

    throw error
  }
}

// Network First com fallback offline
async function networkFirstWithFallback(request, cacheName) {
  try {
    return await networkFirst(request, cacheName)
  } catch (error) {
    // Se for uma rota da aplicação, retornar a página principal cacheada
    const cache = await caches.open(DYNAMIC_CACHE)
    const fallback = await cache.match('/')

    if (fallback) {
      return fallback
    }

    return await getOfflinePage()
  }
}

// Estratégia Stale While Revalidate - para APIs
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Fazer fetch em background para atualizar cache
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => {
    // Ignorar erros de rede silenciosamente
  })

  // Retornar cache se disponível, senão aguardar fetch
  if (cached) {
    // Não awaitar o fetchPromise para retornar cache imediatamente
    fetchPromise
    return cached
  }

  return await fetchPromise
}

// Verificadores de tipo de requisição
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.woff', '.woff2']
  const path = url.pathname.toLowerCase()

  return staticExtensions.some(ext => path.endsWith(ext)) ||
         STATIC_ASSETS.some(asset => path === asset)
}

function isApiRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url.href)) ||
         url.pathname.startsWith('/api/') ||
         url.hostname.includes('supabase.co')
}

function isAppRoute(url) {
  return APP_ROUTES.some(route => url.pathname.startsWith(route)) ||
         (url.pathname === '/' || !url.pathname.includes('.'))
}

// Página offline fallback
async function getOfflinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - ContabilidadePRO</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 500px;
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { margin: 0 0 1rem 0; font-size: 2rem; }
        p { margin: 0 0 2rem 0; opacity: 0.9; line-height: 1.6; }
        button {
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        button:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📊</div>
        <h1>Você está offline</h1>
        <p>Não foi possível conectar com o ContabilidadePRO. Verifique sua conexão com a internet e tente novamente.</p>
        <button onclick="window.location.reload()">Tentar Novamente</button>
      </div>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  })
}

// Background Sync para ações offline
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag)

  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  try {
    // Implementar sincronização de dados offline
    console.log('📡 Sincronizando dados offline...')

    // Verificar se há dados na IndexedDB para sincronizar
    // Implementar lógica específica aqui

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
  }
}

// Notificações push (se implementado no futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()

    event.waitUntil(
      self.registration.showNotification(data.title || 'ContabilidadePRO', {
        body: data.body || 'Nova notificação',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'contador-notification',
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Abrir'
          },
          {
            action: 'close',
            title: 'Fechar'
          }
        ]
      })
    )
  }
})

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

console.log('🎯 Service Worker ContabilidadePRO carregado!')