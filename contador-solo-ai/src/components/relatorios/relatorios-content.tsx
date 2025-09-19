'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RelatorioData {
  id: string
  tipo_calculo: string
  competencia: string
  valor_total: number
  status: string
  data_vencimento: string
  created_at: string
  empresa: {
    nome: string
    cnpj: string
    regime_tributario: string
  }
}

interface RelatoriosContentProps {
  relatoriosIniciais: RelatorioData[]
}

export function RelatoriosContent({ relatoriosIniciais }: RelatoriosContentProps) {
  const [relatorios] = useState(relatoriosIniciais)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cálculos</CardTitle>
          <CardDescription>
            Últimos cálculos fiscais realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {relatorios.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum cálculo encontrado
              </p>
            ) : (
              relatorios.map((relatorio) => (
                <div
                  key={relatorio.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {relatorio.tipo_calculo} - {relatorio.empresa.nome}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {relatorio.competencia} • {formatDate(relatorio.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(relatorio.valor_total)}
                    </div>
                    <div className={`text-sm ${
                      relatorio.status === 'pago'
                        ? 'text-green-600'
                        : relatorio.status === 'pendente'
                        ? 'text-yellow-600'
                        : 'text-gray-600'
                    }`}>
                      {relatorio.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}