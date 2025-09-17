'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from '@/store/auth-store'
import { Eye, EyeOff, Mail, Lock, Bot } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAuthStore()

  // Usar hook Supabase que gerencia autenticação
  const supabaseClient = useSupabase()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)

    try {

      // Timeout para a requisição
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na requisição')), 10000)
      })

      const authPromise = supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      const { data: authData, error } = await Promise.race([authPromise, timeoutPromise]) as { data: any; error: any }

      if (error) {

        // Mensagens de erro mais específicas
        if (error.message?.includes('Invalid login credentials')) {
          setError('root', { message: 'Email ou senha incorretos' })
        } else if (error.message?.includes('Email not confirmed')) {
          setError('root', { message: 'Email não confirmado. Verifique sua caixa de entrada.' })
        } else if (error.message?.includes('Too many requests')) {
          setError('root', { message: 'Muitas tentativas. Aguarde alguns minutos.' })
        } else {
          setError('root', { message: `Erro de conexão: ${error.message || 'Serviço temporariamente indisponível'}` })
        }
        return
      }

      if (authData?.user) {

        setUser(authData.user)
        router.push('/dashboard')
      } else {
        setError('root', { message: 'Erro inesperado. Tente novamente.' })
      }
    } catch (err: any) {

      if (err.message === 'Timeout na requisição') {
        setError('root', { message: 'Timeout na conexão. Verifique sua internet e tente novamente.' })
      } else if (err.name === 'NetworkError' || err.message?.includes('fetch')) {
        setError('root', { message: 'Erro de rede. Verifique sua conexão com a internet.' })
      } else {
        setError('root', { message: 'Erro interno. Tente novamente em alguns minutos.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError('root', { message: 'Erro ao fazer login com Google' })
      }
    } catch {
      setError('root', { message: 'Erro interno. Tente novamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Função de teste temporária para bypass da autenticação
  const handleTestBypass = () => {

    // Criar um usuário mock para teste
    const mockUser = {
      id: 'test-user-id',
      email: 'teste@contabilpro.com',
      user_metadata: {},
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setUser(mockUser as any)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Contador Solo AI</h1>
          <p className="text-muted-foreground mt-2">
            Seu assistente inteligente para contabilidade
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Entrar na sua conta</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-primary">Teste: teste@contabilpro.com</p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <p className="text-xs text-primary">Teste: contador123</p>
              </div>

              {/* Error Message */}
              {errors.root && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>

              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar com Google
              </Button>

              {/* Botão de Teste Temporário */}
              <Button
                type="button"
                variant="secondary"
                className="w-full mt-2"
                onClick={handleTestBypass}
                disabled={isLoading}
              >
                🧪 Acesso de Teste (Bypass)
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Não tem uma conta?{' '}
                <Button variant="link" className="p-0 h-auto font-normal">
                  Entre em contato
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Demo do Sistema</h3>
          <p className="text-sm text-primary/80">
            Este é um sistema em desenvolvimento. Use suas credenciais do Supabase
            ou faça login com Google para testar as funcionalidades.
          </p>
        </div>
      </div>
    </div>
  )
}
