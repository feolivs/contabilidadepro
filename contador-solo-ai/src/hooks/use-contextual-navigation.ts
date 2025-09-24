'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { 
  Calculator, 
  FileText, 
  Users, 
  BarChart3, 
  Calendar,
  Home,
  Bot,

  Building2,
  CreditCard,
  TrendingUp,
  Plus,
  Download,
  Settings,
  FileSpreadsheet,
  Receipt,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface QuickAction {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  description?: string
}

interface ContextualData {
  pageTitle: string
  pageDescription: string
  quickActions: QuickAction[]
  relatedPages: Array<{
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
  stats?: Array<{
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
    variant?: 'success' | 'warning' | 'error' | 'info'
  }>
}

// =====================================================
// DADOS CONTEXTUAIS POR ROTA
// =====================================================

const contextualDataMap: Record<string, ContextualData> = {
  '/dashboard': {
    pageTitle: 'Dashboard',
    pageDescription: 'Visão geral do sistema contábil',
    quickActions: [
      {
        id: 'novo-das',
        label: 'Novo DAS',
        href: '/calculos/das/novo',
        icon: Plus,
        variant: 'default',
        description: 'Calcular novo DAS'
      },
      {
        id: 'processar-nfe',
        label: 'Processar NFe',
        href: '/documentos-ocr',
        icon: FileSpreadsheet,
        variant: 'secondary',
        description: 'Processar nota fiscal'
      },
      {
        id: 'relatorio-mensal',
        label: 'Relatório Mensal',
        href: '/relatorios/mensal',
        icon: BarChart3,
        variant: 'outline',
        description: 'Gerar relatório do mês'
      }
    ],
    relatedPages: [
      { label: 'Assistente IA', href: '/assistente', icon: Bot },
      { label: 'Prazos Fiscais', href: '/prazos', icon: Calendar },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart3 }
    ],
    stats: [
      { label: 'Empresas Ativas', value: 12, trend: 'up', variant: 'success' },
      { label: 'Vencimentos Próximos', value: 3, trend: 'neutral', variant: 'warning' },
      { label: 'Documentos Pendentes', value: 5, trend: 'down', variant: 'info' },
      { label: 'Faturamento Mensal', value: 'R$ 45.280', trend: 'up', variant: 'success' }
    ]
  },

  '/calculos': {
    pageTitle: 'Cálculos Fiscais',
    pageDescription: 'Gestão de cálculos de impostos e tributos',
    quickActions: [
      {
        id: 'calcular-das',
        label: 'Calcular DAS',
        href: '/calculos/das',
        icon: Calculator,
        variant: 'default',
        description: 'Simples Nacional'
      },
      {
        id: 'calcular-icms',
        label: 'Calcular ICMS',
        href: '/calculos/icms',
        icon: CreditCard,
        variant: 'secondary',
        description: 'Imposto sobre circulação'
      },
      {
        id: 'historico-calculos',
        label: 'Histórico',
        href: '/calculos/historico',
        icon: Clock,
        variant: 'outline',
        description: 'Ver cálculos anteriores'
      }
    ],
    relatedPages: [
      { label: 'Prazos Fiscais', href: '/prazos', icon: Calendar },
      { label: 'Documentos', href: '/documentos', icon: FileText },
      { label: 'Empresas', href: '/empresa', icon: Building2 }
    ],
    stats: [
      { label: 'Cálculos este mês', value: 28, trend: 'up', variant: 'success' },
      { label: 'DAS pendentes', value: 5, trend: 'neutral', variant: 'warning' },
      { label: 'Valor total apurado', value: 'R$ 12.450', trend: 'up', variant: 'info' }
    ]
  },

  '/calculos/das': {
    pageTitle: 'DAS - Simples Nacional',
    pageDescription: 'Cálculo do Documento de Arrecadação do Simples Nacional',
    quickActions: [
      {
        id: 'novo-das',
        label: 'Novo Cálculo',
        href: '/calculos/das/novo',
        icon: Plus,
        variant: 'default',
        description: 'Iniciar novo cálculo DAS'
      },
      {
        id: 'importar-receitas',
        label: 'Importar Receitas',
        href: '/documentos',
        icon: FileSpreadsheet,
        variant: 'secondary',
        description: 'Importar dados de receita'
      },
      {
        id: 'gerar-guia',
        label: 'Gerar Guia',
        href: '/calculos/das/guia',
        icon: Download,
        variant: 'outline',
        description: 'Baixar guia de pagamento'
      }
    ],
    relatedPages: [
      { label: 'Cálculos ICMS', href: '/calculos/icms', icon: CreditCard },
      { label: 'Prazos DAS', href: '/prazos?filter=das', icon: Calendar },
      { label: 'Histórico DAS', href: '/calculos/das/historico', icon: Clock }
    ],
    stats: [
      { label: 'DAS calculados', value: 15, trend: 'up', variant: 'success' },
      { label: 'Valor médio', value: 'R$ 1.250', trend: 'neutral', variant: 'info' },
      { label: 'Próximo vencimento', value: '15/01', trend: 'neutral', variant: 'warning' }
    ]
  },

  '/documentos': {
    pageTitle: 'Gestão de Documentos',
    pageDescription: 'Controle e processamento de documentos fiscais',
    quickActions: [
      {
        id: 'upload-documento',
        label: 'Upload Documento',
        href: '/upload',
        icon: Upload,
        variant: 'default',
        description: 'Enviar novo documento'
      },
      {
        id: 'processar-ocr',
        label: 'Processar OCR',
        href: '/documentos-ocr',
        icon: FileSpreadsheet,
        variant: 'secondary',
        description: 'Extrair dados automaticamente'
      },
      {
        id: 'exportar-dados',
        label: 'Exportar Dados',
        href: '/documentos/export',
        icon: Download,
        variant: 'outline',
        description: 'Baixar dados processados'
      }
    ],
    relatedPages: [
      { label: 'Upload', href: '/upload', icon: Upload },
      { label: 'OCR', href: '/documentos-ocr', icon: FileSpreadsheet },
      { label: 'Cálculos', href: '/calculos', icon: Calculator }
    ],
    stats: [
      { label: 'Documentos processados', value: 142, trend: 'up', variant: 'success' },
      { label: 'Pendentes OCR', value: 8, trend: 'down', variant: 'warning' },
      { label: 'Taxa de sucesso', value: '98%', trend: 'up', variant: 'success' }
    ]
  },

  '/clientes': {
    pageTitle: 'Gestão de Clientes',
    pageDescription: 'Controle de clientes e empresas',
    quickActions: [
      {
        id: 'novo-cliente',
        label: 'Novo Cliente',
        href: '/clientes/novo',
        icon: Plus,
        variant: 'default',
        description: 'Cadastrar novo cliente'
      },
      {
        id: 'importar-clientes',
        label: 'Importar Dados',
        href: '/clientes/importar',
        icon: Upload,
        variant: 'secondary',
        description: 'Importar lista de clientes'
      },
      {
        id: 'relatorio-clientes',
        label: 'Relatório',
        href: '/relatorios/clientes',
        icon: BarChart3,
        variant: 'outline',
        description: 'Relatório de clientes'
      }
    ],
    relatedPages: [
      { label: 'Empresas', href: '/empresa', icon: Building2 },
      { label: 'Cálculos', href: '/calculos', icon: Calculator },
      { label: 'Documentos', href: '/documentos', icon: FileText }
    ],
    stats: [
      { label: 'Total de clientes', value: 45, trend: 'up', variant: 'success' },
      { label: 'Ativos este mês', value: 38, trend: 'up', variant: 'info' },
      { label: 'Novos este mês', value: 3, trend: 'up', variant: 'success' }
    ]
  },

  '/relatorios': {
    pageTitle: 'Relatórios Gerenciais',
    pageDescription: 'Análises e relatórios do sistema',
    quickActions: [
      {
        id: 'relatorio-mensal',
        label: 'Relatório Mensal',
        href: '/relatorios/mensal',
        icon: BarChart3,
        variant: 'default',
        description: 'Relatório do mês atual'
      },

      {
        id: 'exportar-relatorio',
        label: 'Exportar',
        href: '/relatorios/export',
        icon: Download,
        variant: 'outline',
        description: 'Baixar relatórios'
      }
    ],
    relatedPages: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Cálculos', href: '/calculos', icon: Calculator }
    ],
    stats: [
      { label: 'Relatórios gerados', value: 23, trend: 'up', variant: 'success' },
      { label: 'Downloads este mês', value: 67, trend: 'up', variant: 'info' },
      { label: 'Tempo médio', value: '2.3s', trend: 'down', variant: 'success' }
    ]
  },

  '/assistente': {
    pageTitle: 'Assistente IA',
    pageDescription: 'Assistente inteligente para contabilidade',
    quickActions: [
      {
        id: 'nova-consulta',
        label: 'Nova Consulta',
        href: '/assistente?new=true',
        icon: Plus,
        variant: 'default',
        description: 'Fazer nova pergunta'
      },
      {
        id: 'historico-chat',
        label: 'Histórico',
        href: '/assistente/historico',
        icon: Clock,
        variant: 'secondary',
        description: 'Ver conversas anteriores'
      },
      {
        id: 'configurar-ia',
        label: 'Configurações',
        href: '/assistente/config',
        icon: Settings,
        variant: 'outline',
        description: 'Configurar assistente'
      }
    ],
    relatedPages: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
      { label: 'Cálculos', href: '/calculos', icon: Calculator }
    ],
    stats: [
      { label: 'Consultas hoje', value: 12, trend: 'up', variant: 'success' },
      { label: 'Precisão média', value: '94%', trend: 'up', variant: 'success' },
      { label: 'Tempo resposta', value: '1.2s', trend: 'down', variant: 'info' }
    ]
  }
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useContextualNavigation = () => {
  const pathname = usePathname()

  const contextualData = useMemo(() => {
    // Busca dados específicos da rota atual
    let data = contextualDataMap[pathname]
    
    // Se não encontrar dados específicos, tenta rotas pai
    if (!data) {
      const pathSegments = pathname.split('/').filter(Boolean)
      for (let i = pathSegments.length - 1; i > 0; i--) {
        const parentPath = '/' + pathSegments.slice(0, i).join('/')
        if (contextualDataMap[parentPath]) {
          data = contextualDataMap[parentPath]
          break
        }
      }
    }
    
    // Fallback para dados padrão
    if (!data) {
      data = {
        pageTitle: 'ContabilidadePRO',
        pageDescription: 'Sistema de gestão contábil',
        quickActions: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            href: '/dashboard',
            icon: Home,
            variant: 'default',
            description: 'Ir para dashboard'
          }
        ],
        relatedPages: [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'Cálculos', href: '/calculos', icon: Calculator },
          { label: 'Documentos', href: '/documentos', icon: FileText }
        ]
      }
    }
    
    return data
  }, [pathname])

  return {
    ...contextualData,
    currentPath: pathname,
    isHomePage: pathname === '/dashboard',
    isCalculationPage: pathname.startsWith('/calculos'),
    isDocumentPage: pathname.startsWith('/documentos'),
    isClientPage: pathname.startsWith('/clientes'),
    isReportPage: pathname.startsWith('/relatorios'),
    isAssistantPage: pathname.startsWith('/assistente')
  }
}

// =====================================================
// HOOK PARA AÇÕES RÁPIDAS GLOBAIS
// =====================================================

export const useGlobalQuickActions = () => {
  const globalActions: QuickAction[] = [
    {
      id: 'novo-das',
      label: 'Novo DAS',
      href: '/calculos/das/novo',
      icon: Calculator,
      variant: 'default',
      description: 'Calcular DAS rapidamente'
    },
    {
      id: 'upload-documento',
      label: 'Upload',
      href: '/upload',
      icon: Upload,
      variant: 'secondary',
      description: 'Enviar documento'
    },
    {
      id: 'assistente-ia',
      label: 'Assistente IA',
      href: '/assistente',
      icon: Bot,
      variant: 'outline',
      description: 'Consultar IA'
    }
  ]

  return globalActions
}

export default useContextualNavigation
