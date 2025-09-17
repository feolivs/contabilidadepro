'use client'

import { useEffect } from 'react'
import { Calculator, AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CalculosErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CalculosError({ error, reset }: CalculosErrorProps) {
  useEffect(() => {

  }, [error])

  // Detectar tipos específicos de erro de cálculo
  const getCalculationErrorType = (error: Error) => {
    const message = error.message.toLowerCase()
    
    if (message.includes('das') || message.includes('simples nacional')) {
      return {
        type: 'das',
        title: 'Erro no Cálculo DAS',
        description: 'Problema no cálculo do DAS - Simples Nacional. Verifique os dados da empresa e o período de apuração.',
        suggestions: [
          'Verifique se o CNPJ está correto',
          'Confirme o regime tributário da empresa',
          'Valide a receita bruta informada',
          'Verifique se o período está dentro do prazo'
        ]
      }
    }
    
    if (message.includes('irpj') || message.includes('lucro presumido')) {
      return {
        type: 'irpj',
        title: 'Erro no Cálculo IRPJ',
        description: 'Problema no cálculo do IRPJ - Lucro Presumido. Verifique os percentuais de presunção.',
        suggestions: [
          'Confirme a atividade principal da empresa',
          'Verifique os percentuais de presunção aplicáveis',
          'Valide a receita trimestral',
          'Confirme as alíquotas vigentes'
        ]
      }
    }
    
    if (message.includes('folha') || message.includes('inss')) {
      return {
        type: 'folha',
        title: 'Erro no Cálculo da Folha',
        description: 'Problema no cálculo da folha de pagamento. Verifique os dados dos funcionários.',
        suggestions: [
          'Confirme os salários informados',
          'Verifique as alíquotas do INSS',
          'Valide os descontos aplicados',
          'Confirme os dados dos dependentes'
        ]
      }
    }
    
    return {
      type: 'generic',
      title: 'Erro no Cálculo Fiscal',
      description: 'Ocorreu um erro durante o processamento do cálculo fiscal.',
      suggestions: [
        'Verifique todos os dados informados',
        'Confirme se os valores estão corretos',
        'Tente novamente em alguns instantes',
        'Entre em contato com o suporte se persistir'
      ]
    }
  }

  const errorInfo = getCalculationErrorType(error)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Card principal do erro */}
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Calculator className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Sugestões de solução */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Possíveis soluções:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {errorInfo.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Detalhes técnicos (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Detalhes técnicos do erro
                </summary>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words bg-white p-3 rounded border">
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}
            
            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={reset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Cálculo Novamente
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/calculos'}
                className="flex-1"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Voltar aos Cálculos
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/documentos'}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Documentos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações de suporte */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <h3 className="font-medium text-blue-900 mb-2">Precisa de Ajuda Especializada?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Nossa equipe de contadores está disponível para auxiliar com cálculos complexos.
            </p>
            <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Falar com Contador
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
