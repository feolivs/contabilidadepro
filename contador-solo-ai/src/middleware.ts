import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Middleware executado para: ${request.nextUrl.pathname}

  // Middleware reativado após sincronização completa
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  // Rotas protegidas
  const protectedRoutes = ['/dashboard', '/clientes', '/documentos', '/relatorios', '/assistente', '/seguranca']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rotas que requerem MFA (operações sensíveis)
  const mfaRequiredRoutes = ['/calculos', '/novo-calculo', '/seguranca']
  const requiresMFA = mfaRequiredRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirecionar para login se não autenticado
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirecionar para dashboard se já autenticado e tentando acessar login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // TODO: Implementar verificação MFA para rotas sensíveis
  // if (requiresMFA && user && !mfaVerified) {
  //   return NextResponse.redirect(new URL('/mfa-verify', request.url))
  // }

  return response
}

export const config = {
  matcher: [
    // Middleware reativado - protege todas as rotas exceto assets estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
