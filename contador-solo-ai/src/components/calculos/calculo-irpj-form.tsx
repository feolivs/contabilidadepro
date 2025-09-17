'use client'

import { useFormState } from 'react-dom'
import { useEffect, useState } from 'react'
import { calcularIRPJAction } from '@/lib/actions/calculo-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Calculator, CheckCircle, AlertCircle, TrendingUp, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface CalculoIRPJFormProps {
  empresaId?: string
}

const initialState = {
  success: false,
  data: undefined,
  error: undefined
}

const ATIVIDADES_PRINCIPAIS = [
  { value: 'comercio', label: 'Comércio em Geral', presuncao: '8%' },
  { value: 'industria', label: 'Indústria', presuncao: '8%' },
  { value: 'servicos', label: 'Prestação de Serviços', presuncao: '32%' },
  { value: 'consultoria', label: 'Consultoria', presuncao: '32%' },
  { value: 'advocacia', label: 'Advocacia', presuncao: '32%' },
  { value: 'contabilidade', label: 'Contabilidade', presuncao: '32%' },
  { value: 'engenharia', label: 'Engenharia', presuncao: '32%' },
  { value: 'medicina', label: 'Medicina', presuncao: '32%' },
  { value: 'transporte', label: 'Transporte', presuncao: '16%' },
  { value: 'construcao', label: 'Construção Civil', presuncao: '16%' },
  { value: 'revenda', label: 'Revenda de Combustíveis', presuncao: '1,6%' }
]

export function CalculoIRPJForm({ empresaId = '' }: CalculoIRPJFormProps) {
  const [state, formAction] = useFormState(calcularIRPJAction, initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [competencia, setCompetencia] = useState('')
  const [atividade, setAtividade] = useState('')

  // Gerar competência padrão (trimestre atual)
  useEffect(() => {
    const hoje = new Date()
    const mes = hoje.getMonth() + 1
    const trimestre = Math.ceil(mes / 3)
    const ultimoMesTrimestre = trimestre * 3
    const competenciaAtual = `${hoje.getFullYear()}-${ultimoMesTrimestre.toString().padStart(2, '0')}`
    setCompetencia(competenciaAtual)
  }, [])

  // Tratar resultado da Server Action
  useEffect(() => {
    if (state.success && state.data) {
      toast.success('Cálculo IRPJ/CSLL realizado com sucesso!')
      setIsSubmitting(false)
    } else if (state.error) {
      toast.error(state.error)
      setIsSubmitting(false)
    }
  }, [state])

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    
    // Adicionar empresa_id ao FormData
    formData.append('empresa_id', empresaId)
    
    // Chamar a Server Action
    formAction(formData)
  }

  const atividadeSelecionada = ATIVIDADES_PRINCIPAIS.find(a => a.value === atividade)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cálculo IRPJ/CSLL - Lucro Presumido
          </CardTitle>
          <CardDescription>
            Calcule o IRPJ e CSLL no regime de Lucro Presumido com base na receita bruta e atividade da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {/* Competência */}
            <div className="space-y-2">
              <Label htmlFor="competencia">Competência (Trimestre) *</Label>
              <Input
                id="competencia"
                name="competencia"
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Selecione o último mês do trimestre (03, 06, 09 ou 12)
              </p>
            </div>

            {/* Receita Bruta */}
            <div className="space-y-2">
              <Label htmlFor="receita_bruta">Receita Bruta do Trimestre (R$) *</Label>
              <Input
                id="receita_bruta"
                name="receita_bruta"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Atividade Principal */}
            <div className="space-y-2">
              <Label htmlFor="atividade_principal">Atividade Principal *</Label>
              <Select 
                name="atividade_principal" 
                value={atividade} 
                onValueChange={setAtividade}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a atividade principal" />
                </SelectTrigger>
                <SelectContent>
                  {ATIVIDADES_PRINCIPAIS.map((atividade) => (
                    <SelectItem key={atividade.value} value={atividade.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{atividade.label}</span>
                        <Badge variant="outline" className="ml-2">
                          {atividade.presuncao}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {atividadeSelecionada && (
                <p className="text-sm text-muted-foreground">
                  Percentual de presunção: <strong>{atividadeSelecionada.presuncao}</strong>
                </p>
              )}
            </div>

            {/* Deduções (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="deducoes">Deduções (R$)</Label>
              <Input
                id="deducoes"
                name="deducoes"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Deduções permitidas pela legislação (opcional)
              </p>
            </div>

            {/* Incentivos Fiscais (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="incentivos_fiscais">Incentivos Fiscais (R$)</Label>
              <Input
                id="incentivos_fiscais"
                name="incentivos_fiscais"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Valor de incentivos fiscais aplicáveis (opcional)
              </p>
            </div>

            {/* Botão de Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !atividade}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular IRPJ/CSLL
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado do Cálculo */}
      {state.success && state.data && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="h-5 w-5" />
              Cálculo Realizado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valores Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(state.data.valor_total)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Alíquota Efetiva</p>
                <p className="text-xl font-semibold flex items-center gap-1">
                  {state.data.aliquota_efetiva.toFixed(2)}%
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </p>
              </div>
            </div>

            <Separator />

            {/* Detalhamento dos Impostos */}
            <div className="space-y-3">
              <h4 className="font-medium">Detalhamento dos Impostos</h4>
              <div className="grid grid-cols-2 gap-4">
                {state.data.detalhamento.irpj && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <div>
                      <Badge variant="outline" className="mb-1">IRPJ</Badge>
                      <p className="text-sm text-muted-foreground">Imposto de Renda</p>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(state.data.detalhamento.irpj)}</span>
                  </div>
                )}
                {state.data.detalhamento.csll && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <div>
                      <Badge variant="outline" className="mb-1">CSLL</Badge>
                      <p className="text-sm text-muted-foreground">Contribuição Social</p>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(state.data.detalhamento.csll)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Informações Adicionais */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Data de Vencimento</p>
                <p className="font-semibold">
                  {new Date(state.data.data_vencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Base de Cálculo</p>
                <p className="font-semibold">{formatCurrency(state.data.base_calculo)}</p>
              </div>
            </div>

            {/* Informações Técnicas */}
            <div className="bg-white p-3 rounded-lg border">
              <h5 className="font-medium mb-2">Informações do Cálculo</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Alíquota Nominal:</span>
                  <span className="ml-2 font-medium">{state.data.aliquota_nominal}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Regime:</span>
                  <span className="ml-2 font-medium">Lucro Presumido</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
