/**
 * 🌟 UNIVERSAL DATA VIEWER - ContabilidadePRO
 * Componente para visualização avançada de dados extraídos pela Edge Function unificada
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Building2, 
  Calendar, 
  DollarSign, 
  Mail, 
  Phone, 
  MapPin,
  FileText, 
  Eye, 
  Download,
  BarChart3,
  Lightbulb,
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { Documento } from '@/types/documento'
import { cn } from '@/lib/utils'

// Interfaces para os dados universais
interface ExtractedEntity {
  type: 'person' | 'company' | 'product' | 'service' | 'location' | 'other'
  value: string
  confidence: number
  context: string
  position: { start: number, end: number }
}

interface FinancialData {
  type: 'total' | 'subtotal' | 'tax' | 'discount' | 'fee' | 'other'
  value: number
  currency: string
  description: string
  confidence: number
}

interface ExtractedDate {
  type: 'emission' | 'due' | 'payment' | 'validity' | 'other'
  date: string
  confidence: number
  context: string
}

interface ExtractedContact {
  type: 'email' | 'phone' | 'website' | 'other'
  value: string
  confidence: number
  context: string
}

interface UniversalDocumentData {
  raw_text: string
  document_type: string
  confidence_score: number
  entities: ExtractedEntity[]
  financial_data: FinancialData[]
  dates: ExtractedDate[]
  contacts: ExtractedContact[]
  additional_fields: Record<string, any>
  relationships: any[]
  insights: string[]
}

interface UniversalDataViewerProps {
  documento: Documento
  className?: string
}

// Utilitários para formatação
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR')
  } catch {
    return dateString
  }
}

const getEntityIcon = (type: string) => {
  switch (type) {
    case 'company': return <Building2 className="h-4 w-4" />
    case 'person': return <Users className="h-4 w-4" />
    case 'location': return <MapPin className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getEntityLabel = (type: string) => {
  const labels = {
    company: 'Empresas',
    person: 'Pessoas',
    product: 'Produtos',
    service: 'Serviços',
    location: 'Localizações',
    other: 'Outros'
  }
  return labels[type as keyof typeof labels] || 'Outros'
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.6) return 'text-yellow-600'
  return 'text-red-600'
}

const getConfidenceBadge = (confidence: number) => {
  const percentage = Math.round(confidence * 100)
  if (confidence >= 0.8) return <Badge variant="default">{percentage}%</Badge>
  if (confidence >= 0.6) return <Badge variant="secondary">{percentage}%</Badge>
  return <Badge variant="destructive">{percentage}%</Badge>
}

export function UniversalDataViewer({ documento, className }: UniversalDataViewerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Extrair dados universais dos dados extraídos
  const universalData: UniversalDocumentData | null = documento.dados_extraidos as any

  if (!universalData || !universalData.entities) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este documento ainda não foi processado com a nova engine de extração universal.
              Os dados podem estar em formato legado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Estatísticas gerais
  const stats = {
    totalEntities: universalData.entities?.length || 0,
    highConfidenceEntities: universalData.entities?.filter(e => e.confidence > 0.8).length || 0,
    financialValues: universalData.financial_data?.length || 0,
    datesFound: universalData.dates?.length || 0,
    contactsFound: universalData.contacts?.length || 0,
    overallConfidence: universalData.confidence_score || 0,
    insightsCount: universalData.insights?.length || 0
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Inteligente do Documento
          </CardTitle>
          <CardDescription>
            Dados extraídos automaticamente com IA avançada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalEntities}</div>
              <div className="text-sm text-muted-foreground">Entidades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.financialValues}</div>
              <div className="text-sm text-muted-foreground">Valores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.datesFound}</div>
              <div className="text-sm text-muted-foreground">Datas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.contactsFound}</div>
              <div className="text-sm text-muted-foreground">Contatos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.insightsCount}</div>
              <div className="text-sm text-muted-foreground">Insights</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", getConfidenceColor(stats.overallConfidence))}>
                {Math.round(stats.overallConfidence * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Confiança</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.highConfidenceEntities}</div>
              <div className="text-sm text-muted-foreground">Alta Precisão</div>
            </div>
          </div>
          
          {/* Barra de confiança geral */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Confiança Geral</span>
              <span className={cn("text-sm font-medium", getConfidenceColor(stats.overallConfidence))}>
                {Math.round(stats.overallConfidence * 100)}%
              </span>
            </div>
            <Progress value={stats.overallConfidence * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs com dados detalhados */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="entities">
            Entidades ({stats.totalEntities})
          </TabsTrigger>
          <TabsTrigger value="financial">
            Financeiro ({stats.financialValues})
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Contatos ({stats.contactsFound})
          </TabsTrigger>
          <TabsTrigger value="insights">
            Insights ({stats.insightsCount})
          </TabsTrigger>
          <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewPanel universalData={universalData} />
        </TabsContent>

        <TabsContent value="entities" className="mt-6">
          <EntitiesPanel entities={universalData.entities || []} />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <FinancialPanel financialData={universalData.financial_data || []} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsPanel contacts={universalData.contacts || []} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <InsightsPanel insights={universalData.insights || []} />
        </TabsContent>

        <TabsContent value="raw" className="mt-6">
          <RawDataPanel data={universalData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para visão geral
function OverviewPanel({ universalData }: { universalData: UniversalDocumentData }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tipo</label>
            <p className="font-semibold">{universalData.document_type}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Confiança</label>
            <div className="flex items-center gap-2">
              <Progress value={universalData.confidence_score * 100} className="flex-1 h-2" />
              {getConfidenceBadge(universalData.confidence_score)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo da Extração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Entidades encontradas</span>
            <span className="font-semibold">{universalData.entities?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Dados financeiros</span>
            <span className="font-semibold">{universalData.financial_data?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Datas identificadas</span>
            <span className="font-semibold">{universalData.dates?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Contatos extraídos</span>
            <span className="font-semibold">{universalData.contacts?.length || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para visualização de entidades
function EntitiesPanel({ entities }: { entities: ExtractedEntity[] }) {
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) acc[entity.type] = []
    acc[entity.type].push(entity)
    return acc
  }, {} as Record<string, ExtractedEntity[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntities).map(([type, typeEntities]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getEntityIcon(type)}
              {getEntityLabel(type)} ({typeEntities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {typeEntities.map((entity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{entity.value}</p>
                    <p className="text-sm text-muted-foreground">{entity.context}</p>
                  </div>
                  {getConfidenceBadge(entity.confidence)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {entities.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma entidade foi encontrada neste documento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente para dados financeiros
function FinancialPanel({ financialData }: { financialData: FinancialData[] }) {
  const totalValue = financialData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      {/* Resumo financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-sm text-muted-foreground">Valor total identificado</p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de valores */}
      <Card>
        <CardHeader>
          <CardTitle>Valores Detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {financialData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{formatCurrency(item.value)}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description} • {item.type}
                  </p>
                </div>
                {getConfidenceBadge(item.confidence)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {financialData.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhum dado financeiro foi encontrado neste documento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente para contatos
function ContactsPanel({ contacts }: { contacts: ExtractedContact[] }) {
  const groupedContacts = contacts.reduce((acc, contact) => {
    if (!acc[contact.type]) acc[contact.type] = []
    acc[contact.type].push(contact)
    return acc
  }, {} as Record<string, ExtractedContact[]>)

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'website': return <FileText className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getContactLabel = (type: string) => {
    const labels = {
      email: 'E-mails',
      phone: 'Telefones',
      website: 'Websites',
      other: 'Outros'
    }
    return labels[type as keyof typeof labels] || 'Outros'
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedContacts).map(([type, typeContacts]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getContactIcon(type)}
              {getContactLabel(type)} ({typeContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {typeContacts.map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{contact.value}</p>
                    <p className="text-sm text-muted-foreground">{contact.context}</p>
                  </div>
                  {getConfidenceBadge(contact.confidence)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {contacts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhum contato foi encontrado neste documento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente para insights da IA
function InsightsPanel({ insights }: { insights: string[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Descobertas da Inteligência Artificial
          </CardTitle>
          <CardDescription>
            Insights automáticos baseados na análise do documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index}>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>{insight}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhum insight foi gerado para este documento.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para dados brutos
function RawDataPanel({ data }: { data: UniversalDocumentData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dados Brutos Extraídos
          </CardTitle>
          <CardDescription>
            Visualização completa de todos os dados extraídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
