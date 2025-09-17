'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/hooks/use-supabase'
import { 
  BarChart3, 
  Clock, 
  MessageSquare, 
  Zap,
  TrendingUp,
  Calculator,
  FileText,
  Calendar,
  CheckCircle,
  Lightbulb
} from 'lucide-react'

interface EstatisticasIA {
  totalConversas: number
  totalTokens: number
  tempoMedioResposta: number
  tiposConsulta: Record<string, number>
  conversasHoje: number
  conversasUltimos7Dias: number
  modeloMaisUsado: string
}

export function EstatisticasIA() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasIA | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true)
      
      // Buscar estatísticas gerais
      const { data: conversas, error } = await supabase
        .from('conversas_ia')
        .select('tipo_consulta, tokens_usados, tempo_resposta, modelo_usado, created_at')

      if (error) throw error

      if (!conversas || conversas.length === 0) {
        setEstatisticas({
          totalConversas: 0,
          totalTokens: 0,
          tempoMedioResposta: 0,
          tiposConsulta: {},
          conversasHoje: 0,
          conversasUltimos7Dias: 0,
          modeloMaisUsado: 'N/A'
        })
        return
      }

      // Calcular estatísticas
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const totalConversas = conversas.length
      const totalTokens = conversas.reduce((sum, c) => sum + (c.tokens_usados || 0), 0)
      const tempoMedioResposta = conversas.reduce((sum, c) => sum + (c.tempo_resposta || 0), 0) / totalConversas

      // Contar por tipo de consulta
      const tiposConsulta: Record<string, number> = {}
      conversas.forEach(c => {
        tiposConsulta[c.tipo_consulta] = (tiposConsulta[c.tipo_consulta] || 0) + 1
      })

      // Conversas de hoje
      const conversasHoje = conversas.filter(c => 
        new Date(c.created_at) >= hoje
      ).length

      // Conversas dos últimos 7 dias
      const conversasUltimos7Dias = conversas.filter(c => 
        new Date(c.created_at) >= seteDiasAtras
      ).length

      // Modelo mais usado
      const modelos: Record<string, number> = {}
      conversas.forEach(c => {
        modelos[c.modelo_usado] = (modelos[c.modelo_usado] || 0) + 1
      })
      const modeloMaisUsado = Object.entries(modelos).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      setEstatisticas({
        totalConversas,
        totalTokens,
        tempoMedioResposta,
        tiposConsulta,
        conversasHoje,
        conversasUltimos7Dias,
        modeloMaisUsado
      })

    } catch (err) {

    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarEstatisticas()
  }, [carregarEstatisticas])

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

  const formatarTempo = (milissegundos: number) => {
    if (milissegundos < 1000) return `${Math.round(milissegundos)}ms`
    return `${(milissegundos / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!estatisticas) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.totalConversas}</div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.conversasHoje} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Média: {Math.round(estatisticas.totalTokens / (estatisticas.totalConversas || 1))} por conversa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarTempo(estatisticas.tempoMedioResposta)}</div>
            <p className="text-xs text-muted-foreground">
              Por resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 7 Dias</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.conversasUltimos7Dias}</div>
            <p className="text-xs text-muted-foreground">
              Modelo: {estatisticas.modeloMaisUsado}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por tipo de consulta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição por Tipo de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(estatisticas.tiposConsulta)
              .sort(([,a], [,b]) => b - a)
              .map(([tipo, quantidade]) => {
                const porcentagem = ((quantidade / estatisticas.totalConversas) * 100).toFixed(1)
                return (
                  <div key={tipo} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(tipo)}
                      <span className="text-sm font-medium">{getTipoLabel(tipo)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{quantidade}</Badge>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {porcentagem}%
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
