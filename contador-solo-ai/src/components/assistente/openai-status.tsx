'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Bot,
  Key,
  Zap
} from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from '@/store/auth-store'

interface OpenAIStatus {
  configured: boolean
  working: boolean
  error?: string
  lastTest?: Date
  model?: string
  responseTime?: number
}

export function OpenAIStatus() {
  const [status, setStatus] = useState<OpenAIStatus>({
    configured: false,
    working: false
  })
  const [testing, setTesting] = useState(false)
  const supabase = useSupabase()
  const { user } = useAuthStore()

  // Testar OpenAI
  const testOpenAI = async () => {
    setTesting(true)
    try {
      const startTime = Date.now()

      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: 'Teste de conectividade - responda apenas "OK"',
          user_id: user?.id || 'test-user',
          timestamp: new Date().toISOString()
        }
      })

      const responseTime = Date.now() - startTime

      if (error) {
        setStatus({
          configured: false,
          working: false,
          error: error.message,
          lastTest: new Date(),
          responseTime
        })
        return
      }

      if (data?.success && data?.resposta) {
        setStatus({
          configured: true,
          working: true,
          lastTest: new Date(),
          model: data.model || 'gpt-4o-mini',
          responseTime
        })
      } else {
        setStatus({
          configured: true,
          working: false,
          error: 'Resposta inválida da IA',
          lastTest: new Date(),
          responseTime
        })
      }
    } catch (error) {
      setStatus({
        configured: false,
        working: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        lastTest: new Date()
      })
    } finally {
      setTesting(false)
    }
  }

  // Testar na inicialização
  useEffect(() => {
    testOpenAI()
  }, [])

  const getStatusIcon = () => {
    if (testing) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (status.working) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.configured) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = () => {
    if (testing) return 'Testando...'
    if (status.working) return 'Funcionando'
    if (status.configured) return 'Configurado mas com erro'
    return 'Não configurado'
  }

  const getStatusColor = () => {
    if (testing) return 'secondary'
    if (status.working) return 'default'
    if (status.configured) return 'secondary'
    return 'destructive'
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Status OpenAI</CardTitle>
          </div>
          <Badge variant={getStatusColor() as any} className="flex items-center space-x-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>
        <CardDescription>
          Status da integração com OpenAI para funcionalidades de IA
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span>Configuração:</span>
            <Badge variant={status.configured ? 'default' : 'destructive'} className="text-xs">
              {status.configured ? 'OK' : 'Faltando'}
            </Badge>
          </div>

          {status.working && (
            <>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Modelo:</span>
                <Badge variant="outline" className="text-xs">
                  {status.model || 'N/A'}
                </Badge>
              </div>

              {status.responseTime && (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span>Tempo resposta:</span>
                  <Badge variant="outline" className="text-xs">
                    {status.responseTime}ms
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Alert */}
        {status.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {status.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Help */}
        {!status.configured && (
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>Como configurar:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">platform.openai.com</a></li>
                <li>Configure no arquivo <code>.env.local</code>: <code>OPENAI_API_KEY=sk-...</code></li>
                <li>Configure nos secrets do Supabase: <code>supabase secrets set OPENAI_API_KEY=sk-...</code></li>
                <li>Reinicie o servidor de desenvolvimento</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Test Button */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {status.lastTest && (
              <>Último teste: {status.lastTest.toLocaleTimeString('pt-BR')}</>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testOpenAI}
            disabled={testing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${testing ? 'animate-spin' : ''}`} />
            <span>Testar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
