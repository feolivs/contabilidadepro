'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Shield,
  Award
} from 'lucide-react'

/**
 * Tipos de nível de compliance
 */
type ComplianceNivel = 'baixo' | 'medio' | 'alto' | 'excelente'

/**
 * Props do componente ComplianceScoreCard
 */
export interface ComplianceScoreCardProps {
  score: number
  nivel: ComplianceNivel
  loading?: boolean
  previousScore?: number
  className?: string
  showTrend?: boolean
  showDetails?: boolean
}

/**
 * Componente para exibir o score de compliance da empresa
 */
export function ComplianceScoreCard({ 
  score, 
  nivel,
  loading = false,
  previousScore,
  className = '',
  showTrend = true,
  showDetails = true
}: ComplianceScoreCardProps) {

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Configurações por nível
  const nivelConfig = {
    baixo: {
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: AlertTriangle,
      label: 'Baixo',
      description: 'Necessita atenção urgente'
    },
    medio: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: Shield,
      label: 'Médio',
      description: 'Pode ser melhorado'
    },
    alto: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      icon: Target,
      label: 'Alto',
      description: 'Bom desempenho'
    },
    excelente: {
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: Award,
      label: 'Excelente',
      description: 'Parabéns!'
    }
  }

  const config = nivelConfig[nivel]
  const Icon = config.icon

  // Calcular tendência
  const trend = previousScore ? score - previousScore : 0
  const trendPercentage = previousScore ? ((trend / previousScore) * 100) : 0

  // Formatação do score
  const formatScore = (value: number) => {
    return Math.round(value)
  }

  return (
    <Card className={`${config.borderColor} ${config.bgColor} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Score de Compliance
            </p>
            
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${config.color}`}>
                {formatScore(score)}
              </p>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>

            {/* Badge do Nível */}
            <Badge 
              variant="outline" 
              className={`${config.color} ${config.borderColor} bg-transparent`}
            >
              {config.label}
            </Badge>

            {/* Tendência */}
            {showTrend && previousScore && trend !== 0 && (
              <div className="flex items-center gap-1 text-xs">
                {trend > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      +{formatScore(Math.abs(trend))} ({Math.abs(trendPercentage).toFixed(1)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">
                      -{formatScore(Math.abs(trend))} ({Math.abs(trendPercentage).toFixed(1)}%)
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">vs anterior</span>
              </div>
            )}

            {/* Descrição */}
            {showDetails && (
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            )}
          </div>

          {/* Ícone */}
          <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mt-4 space-y-2">
          <Progress 
            value={score} 
            className="h-2"
            // Customizar cor da barra baseada no nível
            style={{
              '--progress-background': nivel === 'baixo' ? '#ef4444' :
                                     nivel === 'medio' ? '#eab308' :
                                     nivel === 'alto' ? '#3b82f6' : '#10b981'
            } as React.CSSProperties}
          />
          
          {/* Indicadores de Faixas */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-red-600">25</span>
            <span className="text-yellow-600">50</span>
            <span className="text-blue-600">75</span>
            <span className="text-green-600">100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Componente compacto para uso em listas ou dashboards menores
 */
export function ComplianceScoreCompact({ 
  score, 
  nivel,
  loading = false,
  size = 'sm'
}: {
  score: number
  nivel: ComplianceNivel
  loading?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className={`h-${size === 'xs' ? '6' : size === 'sm' ? '8' : '10'} w-${size === 'xs' ? '6' : size === 'sm' ? '8' : '10'} rounded-full`} />
        <div className="space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-2 w-12" />
        </div>
      </div>
    )
  }

  const nivelConfig = {
    baixo: { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle },
    medio: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Shield },
    alto: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Target },
    excelente: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Award }
  }

  const config = nivelConfig[nivel]
  const Icon = config.icon

  const sizeClasses = {
    xs: { container: 'h-6 w-6', icon: 'h-3 w-3', text: 'text-xs' },
    sm: { container: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-sm' },
    md: { container: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-base' }
  }

  const sizeClass = sizeClasses[size]

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass.container} rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`${sizeClass.icon} ${config.color}`} />
      </div>
      <div>
        <p className={`font-bold ${config.color} ${sizeClass.text}`}>
          {Math.round(score)}
        </p>
        <p className="text-xs text-muted-foreground">
          {config.color.includes('red') ? 'Baixo' :
           config.color.includes('yellow') ? 'Médio' :
           config.color.includes('blue') ? 'Alto' : 'Excelente'}
        </p>
      </div>
    </div>
  )
}

/**
 * Componente de score com detalhes expandidos
 */
export function ComplianceScoreDetailed({ 
  score, 
  nivel,
  fatores = [],
  loading = false
}: {
  score: number
  nivel: ComplianceNivel
  fatores?: Array<{
    fator: string
    peso: number
    valor: number
    status: 'ok' | 'atencao' | 'critico'
  }>
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Header com Score */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Score de Compliance</h3>
            <p className="text-sm text-muted-foreground">
              Análise detalhada dos fatores de compliance
            </p>
          </div>
          <ComplianceScoreCompact score={score} nivel={nivel} size="md" />
        </div>

        {/* Fatores Detalhados */}
        {fatores.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Fatores Analisados</h4>
            <div className="space-y-3">
              {fatores.map((fator, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fator.fator}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{fator.valor.toFixed(1)}%</span>
                      <Badge 
                        variant={
                          fator.status === 'ok' ? 'default' :
                          fator.status === 'atencao' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {fator.status === 'ok' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {fator.status === 'ok' ? 'OK' :
                         fator.status === 'atencao' ? 'Atenção' : 'Crítico'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={fator.valor} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-12">
                      {(fator.peso * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
