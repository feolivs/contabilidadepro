/**
 * Página de Demonstração das Extensões Supabase - ContabilidadePRO
 * Showcase das novas funcionalidades implementadas
 */

import React from 'react'
import { Metadata } from 'next'
import { SearchDemo } from '@/components/search/SearchDemo'
import { QueueMonitor } from '@/components/queue/QueueMonitor'
import { WorkerDashboard } from '@/components/workers/WorkerDashboard'
import { 
  Database, 
  Search, 
  Zap, 
  Shield, 
  Activity,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Demonstração de Extensões | ContabilidadePRO',
  description: 'Explore as novas funcionalidades avançadas do ContabilidadePRO com extensões PostgreSQL'
}

const FEATURES = [
  {
    icon: Search,
    title: 'Busca Avançada Inteligente',
    description: 'Busca com suporte a acentos, similaridade e correção automática usando unaccent, pg_trgm e fuzzystrmatch',
    benefits: [
      'Encontra resultados mesmo com erros de digitação',
      'Ignora acentos automaticamente',
      'Busca por similaridade de texto',
      'Sugestões inteligentes em tempo real'
    ],
    color: 'blue'
  },
  {
    icon: Activity,
    title: 'Processamento Assíncrono',
    description: 'Sistema de filas PGMQ para processamento em background de cálculos fiscais e documentos',
    benefits: [
      'Cálculos fiscais não bloqueiam a interface',
      'Processamento de documentos OCR em background',
      'Notificações automáticas por email',
      'Monitoramento em tempo real'
    ],
    color: 'green'
  },
  {
    icon: Shield,
    title: 'Criptografia Avançada',
    description: 'Proteção de dados sensíveis usando pgsodium com criptografia moderna',
    benefits: [
      'Dados financeiros criptografados',
      'CNPJ/CPF protegidos',
      'Chaves de API seguras',
      'Conformidade com LGPD'
    ],
    color: 'purple'
  },
  {
    icon: CheckCircle,
    title: 'Validação JSON Schema',
    description: 'Validação automática de documentos fiscais usando pg_jsonschema',
    benefits: [
      'NFe validada automaticamente',
      'Dados DAS verificados',
      'Estrutura de documentos garantida',
      'Prevenção de erros fiscais'
    ],
    color: 'orange'
  }
]

const EXTENSIONS_USED = [
  { name: 'unaccent', description: 'Remove acentos para busca normalizada', version: '1.1' },
  { name: 'fuzzystrmatch', description: 'Busca aproximada com algoritmos avançados', version: '1.2' },
  { name: 'pg_trgm', description: 'Similaridade de texto usando trigramas', version: '1.6' },
  { name: 'ltree', description: 'Estruturas hierárquicas (plano de contas)', version: '1.3' },
  { name: 'hstore', description: 'Armazenamento chave-valor flexível', version: '1.8' },
  { name: 'pgmq', description: 'Sistema de filas PostgreSQL', version: '1.4.4' },
  { name: 'pgsodium', description: 'Criptografia moderna', version: '3.1.8' },
  { name: 'pg_jsonschema', description: 'Validação de esquemas JSON', version: '0.3.3' },
  { name: 'pgjwt', description: 'JWT nativo no PostgreSQL', version: '0.2.0' },
  { name: 'pgaudit', description: 'Auditoria avançada', version: '17.0' }
]

export default function ExtensoesDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Extensões PostgreSQL
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubra como as extensões PostgreSQL revolucionam o ContabilidadePRO 
              com funcionalidades avançadas de busca, processamento e segurança.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Funcionalidades Principais */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Funcionalidades Implementadas
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {FEATURES.map((feature, index) => {
              const IconComponent = feature.icon
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600 border-blue-200',
                green: 'bg-green-50 text-green-600 border-green-200',
                purple: 'bg-purple-50 text-purple-600 border-purple-200',
                orange: 'bg-orange-50 text-orange-600 border-orange-200'
              }[feature.color]

              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg border-2 mb-4 ${colorClasses}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* Demonstração de Busca */}
        <section>
          <SearchDemo />
        </section>

        {/* Monitor de Filas */}
        <section>
          <QueueMonitor />
        </section>

        {/* Dashboard de Workers */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Dashboard de Workers
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Monitoramento e controle dos workers de processamento em background
            </p>
          </div>
          <WorkerDashboard />
        </section>

        {/* Extensões Utilizadas */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Extensões PostgreSQL Ativadas
          </h2>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {EXTENSIONS_USED.length} Extensões Ativas
              </h3>
              <p className="text-sm text-gray-600">
                Extensões PostgreSQL que potencializam o ContabilidadePRO
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {EXTENSIONS_USED.map((extension, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {extension.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {extension.description}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    v{extension.version}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefícios Técnicos */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Benefícios Técnicos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Performance</h3>
              <p className="text-sm text-gray-600">
                Índices otimizados e processamento assíncrono para máxima velocidade
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Segurança</h3>
              <p className="text-sm text-gray-600">
                Criptografia nativa e auditoria completa para proteção total dos dados
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Escalabilidade</h3>
              <p className="text-sm text-gray-600">
                Arquitetura preparada para crescimento com filas e processamento distribuído
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">
            Pronto para Experimentar?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Todas essas funcionalidades estão disponíveis agora no ContabilidadePRO. 
            Experimente a busca avançada e o processamento assíncrono em ação.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Voltar ao Dashboard
            </button>
            <button className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center space-x-2">
              <span>Explorar Mais</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
