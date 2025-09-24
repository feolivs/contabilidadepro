import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Logs detalhados para debugging
  const isDev = process.env.NODE_ENV === 'development'
  const pathname = request.nextUrl.pathname

  if (isDev) {
    console.log(`🔒 Middleware: ${pathname}`)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Criar cliente Supabase para verificação de autenticação
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: { path?: string; domain?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' | boolean }) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Verificar autenticação do usuário
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (isDev && userError) {
    console.log(`🚨 Auth Error: ${userError.message}`)
  }

  if (isDev) {
    console.log(`👤 User: ${user ? user.email : 'Not authenticated'}`)
  }

  // Rotas protegidas
  const protectedRoutes = ['/dashboard', '/clientes', '/documentos', '/relatorios', '/assistente', '/seguranca', '/calculos', '/prazos', '/empresas']
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Rotas que requerem MFA (operações sensíveis) - para implementação futura
  const mfaRequiredRoutes = ['/calculos', '/seguranca']
  const requiresMFA = mfaRequiredRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isDev) {
    console.log(`🛡️ Protected route: ${isProtectedRoute}`)
    console.log(`🔐 MFA required: ${requiresMFA}`)
  }

  // Página inicial - redirecionamento server-side otimizado
  if (pathname === '/') {
    if (user) {
      if (isDev) console.log('🏠 Redirecting authenticated user to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      if (isDev) console.log('🏠 Redirecting unauthenticated user to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirecionar para login se não autenticado em rota protegida
  if (isProtectedRoute && !user) {
    if (isDev) console.log(`🚫 Redirecting to login: ${pathname}`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirecionar para dashboard se já autenticado e tentando acessar login
  if (user && pathname === '/login') {
    if (isDev) console.log('✅ Redirecting authenticated user from login to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // TODO: Implementar verificação MFA para rotas sensíveis
  // if (requiresMFA && user && !mfaVerified) {
  //   return NextResponse.redirect(new URL('/mfa-verify', request.url))
  // }

  if (isDev) {
    console.log(`✅ Access granted: ${pathname}`)
  }

  return response
}

export const config = {
  matcher: [
    // ETAPA 2: Middleware básico - excluir assets estáticos e APIs
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
