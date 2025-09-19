import { Metadata } from 'next'
import { Calendar, Upload, List, BarChart3 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// =====================================================
// PÁGINA PRINCIPAL DE PRAZOS FISCAIS (FALLBACK)
// =====================================================

export const metadata: Metadata = {
  title: 'Prazos Fiscais | ContabilidadePRO',
  description: 'Central de gerenciamento de prazos fiscais com upload automático, OCR inteligente e alertas personalizados.',
}

export default function PrazosPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Prazos Fiscais Inteligentes
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Gerencie todas as obrigações fiscais das suas empresas em um só lugar. 
          Upload automático, OCR inteligente e alertas personalizados para nunca mais perder um prazo.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Calendário Visual</CardTitle>
            <CardDescription>
              Visualize todos os prazos em um calendário intuitivo
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Upload Inteligente</CardTitle>
            <CardDescription>
              Arraste documentos e extraia prazos automaticamente
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <List className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Lista Organizada</CardTitle>
            <CardDescription>
              Filtre e organize prazos por empresa, tipo e status
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Estatísticas</CardTitle>
            <CardDescription>
              Acompanhe métricas e performance fiscal
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Como Funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload de Documentos</h3>
            <p className="text-muted-foreground">
              Faça upload de guias, boletos e documentos fiscais. 
              Suportamos PDF, imagens e diversos formatos.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Extração Automática</h3>
            <p className="text-muted-foreground">
              Nossa IA extrai automaticamente datas de vencimento, 
              valores e tipos de obrigação dos documentos.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Alertas Inteligentes</h3>
            <p className="text-muted-foreground">
              Receba notificações personalizadas por email, 
              push ou SMS antes dos vencimentos.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Obligations */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Obrigações Suportadas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            'DAS', 'DCTF', 'ECF', 'SPED', 'DEFIS', 'DIRF',
            'RAIS', 'CAGED', 'GPS', 'FGTS', 'ICMS', 'ISS'
          ].map((obligation) => (
            <div key={obligation} className="bg-card border border-border rounded-lg p-3 text-center">
              <div className="font-semibold text-card-foreground">{obligation}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-4">Pronto para Começar?</h2>
        <p className="text-xl text-muted-foreground mb-6">
          Acesse a versão completa com Parallel Routes otimizadas do Next.js 15
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard">
              Ir para Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/clientes">
              Gerenciar Empresas
            </Link>
          </Button>
        </div>
      </div>

      {/* Technical Note */}
      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Otimizado com Next.js 15
        </h3>
        <p className="text-sm text-muted-foreground">
          Esta página utiliza <strong>Parallel Routes</strong> para carregamento independente de seções, 
          <strong>Intercepting Routes</strong> para modais com URLs próprias, e 
          <strong>Edge Runtime</strong> para processamento ultra-rápido de documentos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Parallel Routes</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Intercepting Routes</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Edge Runtime</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Server Components</span>
        </div>
      </div>
    </div>
  )
}
