'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSupabase } from '@/hooks/use-supabase'
import { 
  History, 
  Clock, 
  MessageSquare, 
  TrendingUp,
  Calculator,
  FileText,
  Calendar,
  AlertTriangle,
  Lightbulb,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversa {
  id: string
  pergunta: string
  resposta: string
  tipo_consulta: string
  modelo_usado: string
  tokens_usados: number
  tempo_resposta: number
  created_at: string
}

interface HistoricoConversasProps {
  onSelectConversa?: (conversa: Conversa) => void
}

export function HistoricoConversas({ onSelectConversa }: HistoricoConversasProps) {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()

  const carregarHistorico = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('conversas_ia')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setConversas(data || [])
    } catch (err) {

      setError('Erro ao carregar histórico de conversas')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'calculo_fiscal':
        return <Calculator className="h-4 w-4 text-blue-500" />
      case 'analise_financeira':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'prazos_obrigacoes':
        return <Calendar className="h-4 w-4 text-red-500" />
      case 'classificacao_contabil':
        return <FileText className="h-4 w-4 text-purple-500" />
      case 'conformidade_fiscal':
        return <CheckCircle className="h-4 w-4 text-orange-500" />
      case 'otimizacao_tributaria':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'calculo_fiscal': 'Cálculo Fiscal',
      'analise_financeira': 'Análise Financeira',
      'prazos_obrigacoes': 'Prazos e Obrigações',
      'classificacao_contabil': 'Classificação Contábil',
      'conformidade_fiscal': 'Conformidade Fiscal',
      'otimizacao_tributaria': 'Otimização Tributária',
      'consulta_geral': 'Consulta Geral'
    }
    return labels[tipo] || 'Outros'
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'calculo_fiscal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'analise_financeira':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'prazos_obrigacoes':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'classificacao_contabil':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'conformidade_fiscal':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'otimizacao_tributaria':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const formatarTempo = (milissegundos: number) => {
    if (milissegundos < 1000) return `${milissegundos}ms`
    return `${(milissegundos / 1000).toFixed(1)}s`
  }

  const truncarTexto = (texto: string, limite: number = 100) => {
    if (texto.length <= limite) return texto
    return texto.substring(0, limite) + '...'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Conversas
          <Badge variant="secondary">{conversas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {conversas.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-5 w-5 mr-2" />
              Nenhuma conversa encontrada
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {conversas.map((conversa) => (
                <div
                  key={conversa.id}
                  className={cn(
                    "p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer",
                    onSelectConversa && "hover:shadow-sm"
                  )}
                  onClick={() => onSelectConversa?.(conversa)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(conversa.tipo_consulta)}
                      <Badge className={getTipoColor(conversa.tipo_consulta)}>
                        {getTipoLabel(conversa.tipo_consulta)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatarTempo(conversa.tempo_resposta)}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {truncarTexto(conversa.pergunta)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {truncarTexto(conversa.resposta, 150)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(conversa.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {conversa.modelo_usado}
                      </Badge>
                      {conversa.tokens_usados > 0 && (
                        <span>{conversa.tokens_usados} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {conversas.length > 0 && (
          <div className="p-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={carregarHistorico}
            >
              Atualizar Histórico
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
