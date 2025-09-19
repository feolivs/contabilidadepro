/**
 * Utilitários para geração de metadata dinâmica
 * Otimização Next.js: generateMetadata para SEO melhorado
 */

import type { Metadata } from 'next'
import { cachedEmpresaData } from '@/lib/server-cache'

// ============================================
// METADATA BASE
// ============================================

export const baseMetadata: Metadata = {
  title: {
    template: '%s | ContabilidadePRO',
    default: 'ContabilidadePRO - Sistema de Inteligência Contábil'
  },
  description: 'Sistema inteligente para contadores autônomos com IA integrada para automatizar cálculos fiscais, gestão de clientes e compliance tributário brasileiro.',
  keywords: [
    'contabilidade',
    'contador',
    'DAS',
    'IRPJ',
    'Simples Nacional',
    'cálculos fiscais',
    'inteligência artificial',
    'automação contábil',
    'compliance tributário',
    'gestão empresarial'
  ],
  authors: [{ name: 'ContabilidadePRO Team' }],
  creator: 'ContabilidadePRO',
  publisher: 'ContabilidadePRO',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://contabilidadepro.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'ContabilidadePRO',
    title: 'ContabilidadePRO - Sistema de Inteligência Contábil',
    description: 'Sistema inteligente para contadores autônomos com IA integrada',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ContabilidadePRO - Sistema de Inteligência Contábil',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContabilidadePRO - Sistema de Inteligência Contábil',
    description: 'Sistema inteligente para contadores autônomos com IA integrada',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// ============================================
// METADATA GENERATORS
// ============================================

/**
 * Gera metadata para página de empresa específica
 */
export async function generateEmpresaMetadata(empresaId: string): Promise<Metadata> {
  try {
    const empresas = await cachedEmpresaData(empresaId)
    const empresa = empresas.find(e => e.id === empresaId)
    
    if (!empresa) {
      return {
        title: 'Empresa não encontrada',
        description: 'A empresa solicitada não foi encontrada no sistema.',
        robots: { index: false, follow: false }
      }
    }

    const title = `${empresa.nome} - Gestão Contábil`
    const description = `Gestão contábil completa para ${empresa.nome} (${empresa.cnpj}) - ${empresa.regime_tributario}. Cálculos fiscais, compliance e automação contábil.`

    return {
      title,
      description,
      keywords: [
        empresa.nome,
        empresa.cnpj,
        empresa.regime_tributario,
        'gestão contábil',
        'cálculos fiscais',
        'compliance tributário'
      ],
      openGraph: {
        title,
        description,
        type: 'profile',
        url: `/clientes/${empresaId}`,
      },
      twitter: {
        title,
        description,
      },
      alternates: {
        canonical: `/clientes/${empresaId}`,
      },
    }
  } catch (error) {

    return {
      title: 'Erro ao carregar empresa',
      description: 'Ocorreu um erro ao carregar os dados da empresa.',
      robots: { index: false, follow: false }
    }
  }
}

/**
 * Gera metadata para página de cálculos de uma empresa
 */
export async function generateCalculosMetadata(empresaId: string): Promise<Metadata> {
  try {
    const empresas = await cachedEmpresaData(empresaId)
    const empresa = empresas.find(e => e.id === empresaId)
    
    if (!empresa) {
      return {
        title: 'Cálculos - Empresa não encontrada',
        robots: { index: false, follow: false }
      }
    }

    const title = `Cálculos Fiscais - ${empresa.nome}`
    const description = `Histórico completo de cálculos fiscais para ${empresa.nome}. DAS, IRPJ, CSLL e outros tributos com automação inteligente.`

    return {
      title,
      description,
      keywords: [
        'cálculos fiscais',
        empresa.nome,
        'DAS',
        'IRPJ',
        'CSLL',
        empresa.regime_tributario,
        'automação tributária'
      ],
      openGraph: {
        title,
        description,
        url: `/clientes/${empresaId}/calculos`,
      },
      alternates: {
        canonical: `/clientes/${empresaId}/calculos`,
      },
    }
  } catch (error) {

    return {
      title: 'Cálculos Fiscais',
      description: 'Gestão de cálculos fiscais automatizada.',
    }
  }
}

/**
 * Gera metadata para páginas de dashboard
 */
export function generateDashboardMetadata(section?: string): Metadata {
  const sections = {
    overview: {
      title: 'Dashboard - Visão Geral',
      description: 'Visão geral completa do seu escritório contábil. Métricas, estatísticas e insights em tempo real.'
    },
    clientes: {
      title: 'Dashboard - Clientes',
      description: 'Gestão completa de clientes e empresas. Cadastro, documentos e histórico contábil.'
    },
    calculos: {
      title: 'Dashboard - Cálculos Fiscais',
      description: 'Central de cálculos fiscais automatizados. DAS, IRPJ, CSLL e compliance tributário.'
    },
    documentos: {
      title: 'Dashboard - Documentos',
      description: 'Gestão inteligente de documentos fiscais. Upload, processamento e organização automatizada.'
    },
    relatorios: {
      title: 'Dashboard - Relatórios',
      description: 'Relatórios gerenciais e fiscais personalizados. Analytics e insights para tomada de decisão.'
    },
    assistente: {
      title: 'Dashboard - Assistente IA',
      description: 'Assistente de inteligência artificial para consultoria contábil. Respostas precisas e atualizadas.'
    }
  }

  const sectionData = section ? sections[section as keyof typeof sections] : sections.overview

  return {
    title: sectionData?.title || 'Dashboard',
    description: sectionData?.description || 'Dashboard do sistema contábil.',
    keywords: [
      'dashboard contábil',
      'gestão empresarial',
      'métricas fiscais',
      'automação contábil',
      'inteligência artificial'
    ],
    openGraph: {
      title: sectionData?.title || 'Dashboard',
      description: sectionData?.description || 'Dashboard do sistema contábil.',
      url: section ? `/dashboard/${section}` : '/dashboard',
    },
    alternates: {
      canonical: section ? `/dashboard/${section}` : '/dashboard',
    },
  }
}

/**
 * Gera metadata para páginas de erro
 */
export function generateErrorMetadata(errorType?: string): Metadata {
  const errorTypes = {
    '404': {
      title: 'Página não encontrada',
      description: 'A página que você está procurando não existe ou foi movida.'
    },
    '500': {
      title: 'Erro interno do servidor',
      description: 'Ocorreu um erro interno. Nossa equipe foi notificada e está trabalhando na solução.'
    },
    'auth': {
      title: 'Erro de autenticação',
      description: 'Sua sessão expirou. Faça login novamente para continuar.'
    },
    'calculation': {
      title: 'Erro no cálculo fiscal',
      description: 'Ocorreu um erro durante o processamento do cálculo. Verifique os dados informados.'
    }
  }

  const errorData = errorType ? errorTypes[errorType as keyof typeof errorTypes] : errorTypes['500']

  return {
    title: errorData?.title || 'Erro',
    description: errorData?.description || 'Ocorreu um erro inesperado.',
    robots: { index: false, follow: false },
    openGraph: {
      title: errorData?.title || 'Erro',
      description: errorData?.description || 'Ocorreu um erro inesperado.',
    },
  }
}

/**
 * Gera metadata para páginas de loading
 */
export function generateLoadingMetadata(section: string): Metadata {
  return {
    title: `Carregando ${section}...`,
    description: `Carregando dados de ${section}. Aguarde um momento.`,
    robots: { index: false, follow: false },
  }
}
