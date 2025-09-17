'use client'

import { useFormState } from 'react-dom'
import { useEffect, useState } from 'react'
import { calcularDASAction } from '@/lib/actions/calculo-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Calculator, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface CalculoDASFormProps {
  empresaId?: string
}

const initialState = {
  success: false,
  data: undefined,
  error: undefined
}

export function CalculoDASForm({ empresaId = '' }: CalculoDASFormProps) {
  const [state, formAction] = useFormState(calcularDASAction, initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [competencia, setCompetencia] = useState('')
  const [anexo, setAnexo] = useState('')

  // Gerar competência padrão (mês atual)
  useEffect(() => {
    const hoje = new Date()
    const competenciaAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`
    setCompetencia(competenciaAtual)
  }, [])

  // Tratar resultado da Server Action
  useEffect(() => {
    if (state.success && state.data) {
      toast.success('Cálculo DAS realizado com sucesso!')
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cálculo DAS - Simples Nacional
          </CardTitle>
          <CardDescription>
            Calcule o DAS (Documento de Arrecadação do Simples Nacional) com base no faturamento e anexo da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {/* Competência */}
            <div className="space-y-2">
              <Label htmlFor="competencia">Competência *</Label>
              <Input
                id="competencia"
                name="competencia"
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Faturamento Bruto */}
            <div className="space-y-2">
              <Label htmlFor="faturamento_bruto">Faturamento Bruto do Mês (R$) *</Label>
              <Input
                id="faturamento_bruto"
                name="faturamento_bruto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Faturamento 12 Meses */}
            <div className="space-y-2">
              <Label htmlFor="faturamento_12_meses">Faturamento dos Últimos 12 Meses (R$) *</Label>
              <Input
                id="faturamento_12_meses"
                name="faturamento_12_meses"
                type="number"
                step="0.01"
                min="0"
                max="4800000"
                placeholder="0,00"
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Limite máximo: R$ 4.800.000,00 (Simples Nacional)
              </p>
            </div>

            {/* Anexo do Simples Nacional */}
            <div className="space-y-2">
              <Label htmlFor="anexo_simples">Anexo do Simples Nacional *</Label>
              <Select 
                name="anexo_simples" 
                value={anexo} 
                onValueChange={setAnexo}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o anexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">Anexo I - Comércio</SelectItem>
                  <SelectItem value="II">Anexo II - Indústria</SelectItem>
                  <SelectItem value="III">Anexo III - Serviços e Locação</SelectItem>
                  <SelectItem value="IV">Anexo IV - Serviços</SelectItem>
                  <SelectItem value="V">Anexo V - Serviços</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Botão de Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !anexo}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular DAS
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado do Cálculo */}
      {state.success && state.data && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Cálculo Realizado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valores Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Valor do DAS</p>
                <p className="text-2xl font-bold text-green-600">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {state.data.detalhamento.irpj && (
                  <div className="flex justify-between">
                    <Badge variant="outline">IRPJ</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.irpj)}</span>
                  </div>
                )}
                {state.data.detalhamento.csll && (
                  <div className="flex justify-between">
                    <Badge variant="outline">CSLL</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.csll)}</span>
                  </div>
                )}
                {state.data.detalhamento.pis && (
                  <div className="flex justify-between">
                    <Badge variant="outline">PIS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.pis)}</span>
                  </div>
                )}
                {state.data.detalhamento.cofins && (
                  <div className="flex justify-between">
                    <Badge variant="outline">COFINS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.cofins)}</span>
                  </div>
                )}
                {state.data.detalhamento.cpp && (
                  <div className="flex justify-between">
                    <Badge variant="outline">CPP</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.cpp)}</span>
                  </div>
                )}
                {state.data.detalhamento.icms && (
                  <div className="flex justify-between">
                    <Badge variant="outline">ICMS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.icms)}</span>
                  </div>
                )}
                {state.data.detalhamento.iss && (
                  <div className="flex justify-between">
                    <Badge variant="outline">ISS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.iss)}</span>
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
