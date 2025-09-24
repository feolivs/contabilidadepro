import type { AuthError } from '@supabase/supabase-js'

export interface AuthErrorInfo {
  code: string
  message: string
  userMessage: string
  retry: boolean
  redirectTo?: string
}

export function handleAuthError(error: AuthError | Error | any): AuthErrorInfo {
  // Se é um AuthError do Supabase
  if (error?.message && typeof error.message === 'string') {
    const message = error.message.toLowerCase()

    // Credenciais inválidas
    if (message.includes('invalid login credentials') ||
        message.includes('email not confirmed') ||
        message.includes('invalid email or password')) {
      return {
        code: 'INVALID_CREDENTIALS',
        message: error.message,
        userMessage: 'Email ou senha incorretos. Verifique suas credenciais.',
        retry: false
      }
    }

    // Email não confirmado
    if (message.includes('email not confirmed')) {
      return {
        code: 'EMAIL_NOT_CONFIRMED',
        message: error.message,
        userMessage: 'Email não confirmado. Verifique sua caixa de entrada.',
        retry: false,
        redirectTo: '/confirm-email'
      }
    }

    // Muitas tentativas
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return {
        code: 'RATE_LIMIT',
        message: error.message,
        userMessage: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retry: true
      }
    }

    // Usuário já existe
    if (message.includes('user already registered')) {
      return {
        code: 'USER_EXISTS',
        message: error.message,
        userMessage: 'Este email já está registrado. Tente fazer login.',
        retry: false,
        redirectTo: '/login'
      }
    }

    // Senha muito fraca
    if (message.includes('password') && message.includes('weak')) {
      return {
        code: 'WEAK_PASSWORD',
        message: error.message,
        userMessage: 'Senha muito fraca. Use pelo menos 8 caracteres com letras e números.',
        retry: false
      }
    }

    // Email inválido
    if (message.includes('invalid email')) {
      return {
        code: 'INVALID_EMAIL',
        message: error.message,
        userMessage: 'Email inválido. Verifique o formato do email.',
        retry: false
      }
    }

    // Token inválido ou expirado
    if (message.includes('invalid token') ||
        message.includes('token expired') ||
        message.includes('jwt')) {
      return {
        code: 'INVALID_TOKEN',
        message: error.message,
        userMessage: 'Sessão expirada. Faça login novamente.',
        retry: false,
        redirectTo: '/login'
      }
    }

    // OTP inválido
    if (message.includes('invalid otp') || message.includes('otp expired')) {
      return {
        code: 'INVALID_OTP',
        message: error.message,
        userMessage: 'Código de verificação inválido ou expirado.',
        retry: false
      }
    }

    // Erro de rede
    if (message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
        retry: true
      }
    }

    // Provedor OAuth não configurado
    if (message.includes('provider') && message.includes('not enabled')) {
      return {
        code: 'PROVIDER_DISABLED',
        message: error.message,
        userMessage: 'Método de login não disponível no momento.',
        retry: false
      }
    }

    // Signup desabilitado
    if (message.includes('signup') && message.includes('disabled')) {
      return {
        code: 'SIGNUP_DISABLED',
        message: error.message,
        userMessage: 'Registro de novos usuários temporariamente desabilitado.',
        retry: false
      }
    }
  }

  // Erro genérico
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'Erro desconhecido',
    userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
    retry: true
  }
}

export function isRetryableError(error: AuthError | Error | any): boolean {
  const errorInfo = handleAuthError(error)
  return errorInfo.retry
}

export function shouldRedirect(error: AuthError | Error | any): string | null {
  const errorInfo = handleAuthError(error)
  return errorInfo.redirectTo || null
}

export function getUserFriendlyMessage(error: AuthError | Error | any): string {
  const errorInfo = handleAuthError(error)
  return errorInfo.userMessage
}

// Hook para usar com react-query
export function createAuthErrorHandler(onRedirect?: (path: string) => void) {
  return (error: AuthError | Error | any) => {
    const errorInfo = handleAuthError(error)

    // Log do erro para debugging
    console.error(`Auth Error [${errorInfo.code}]:`, errorInfo.message)

    // Redirecionar se necessário
    if (errorInfo.redirectTo && onRedirect) {
      onRedirect(errorInfo.redirectTo)
    }

    return errorInfo
  }
}