'use client'

import { useFormState } from 'react-dom'
import { useEffect, useState } from 'react'
import { calcularMEIAction } from '@/lib/actions/calculo-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Calculator, CheckCircle, AlertCircle, Store, Briefcase, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface CalculoMEIFormProps {
  empresaId?: string
}

const initialState = {
  success: false,
  data: undefined,
  error: undefined
}

// Valores MEI 2025 atualizados
const MEI_VALUES_2025 = {
  comercio: 66.60,        // INSS + ICMS
  servicos: 70.60,        // INSS + ISS
  comercio_servicos: 71.60 // INSS + ICMS + ISS
}

const MEI_LIMITE_ANUAL = 81000 // R$ 81.000,00 para 2025

export function CalculoMEIForm({ empresaId = '' }: CalculoMEIFormProps) {
  const [state, formAction] = useFormState(calcularMEIAction, initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [competencia, setCompetencia] = useState('')
  const [atividade, setAtividade] = useState('')
  const [receitaBruta, setReceitaBruta] = useState('')

  // Gerar competência padrão (mês atual)
  useEffect(() => {
    const hoje = new Date()
    const competenciaAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`
    setCompetencia(competenciaAtual)
  }, [])

  // Tratar resultado da Server Action
  useEffect(() => {
    if (state.success && state.data) {
      toast.success('Cálculo MEI realizado com sucesso!')
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

  // Verificar se está próximo do limite
  const receitaNumeric = parseFloat(receitaBruta.replace(',', '.')) || 0
  const percentualLimite = (receitaNumeric * 12) / MEI_LIMITE_ANUAL * 100
  const proximoLimite = percentualLimite > 80

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cálculo MEI - Microempreendedor Individual
          </CardTitle>
          <CardDescription>
            Calcule a DAS-MEI mensal com base na atividade e receita bruta
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

            {/* Atividade MEI */}
            <div className="space-y-2">
              <Label htmlFor="atividade">Atividade Principal *</Label>
              <Select
                name="atividade"
                value={atividade}
                onValueChange={setAtividade}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a atividade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercio">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Comércio - R$ {MEI_VALUES_2025.comercio.toFixed(2)}
                    </div>
                  </SelectItem>
                  <SelectItem value="servicos">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Serviços - R$ {MEI_VALUES_2025.servicos.toFixed(2)}
                    </div>
                  </SelectItem>
                  <SelectItem value="comercio_servicos">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Comércio e Serviços - R$ {MEI_VALUES_2025.comercio_servicos.toFixed(2)}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Valores incluem INSS, ICMS e/ou ISS conforme atividade
              </p>
            </div>

            {/* Receita Bruta Mensal */}
            <div className="space-y-2">
              <Label htmlFor="receita_bruta">Receita Bruta do Mês (R$) *</Label>
              <Input
                id="receita_bruta"
                name="receita_bruta"
                type="number"
                step="0.01"
                min="0"
                max="6750"
                placeholder="0,00"
                value={receitaBruta}
                onChange={(e) => setReceitaBruta(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Limite mensal: R$ 6.750,00 (R$ 81.000,00 ÷ 12 meses)
              </p>
            </div>

            {/* Alerta de Limite */}
            {proximoLimite && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <strong>Atenção!</strong> Receita projetada anual: {formatCurrency(receitaNumeric * 12)}
                  ({percentualLimite.toFixed(1)}% do limite MEI).
                  {percentualLimite > 100 && (
                    <span className="block mt-1 font-medium">
                      Limite MEI excedido! Considere migrar para outro regime tributário.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Informações sobre MEI */}
            <div className="rounded-lg border bg-blue-50 p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Informações MEI</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Limite anual: {formatCurrency(MEI_LIMITE_ANUAL)}</li>
                <li>• Pagamento mensal fixo independente da receita</li>
                <li>• Vencimento todo dia 20 do mês seguinte</li>
                <li>• Inclui INSS, ICMS e/ou ISS conforme atividade</li>
              </ul>
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
                  Calcular DAS-MEI
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
              Cálculo MEI Realizado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valor Principal */}
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Valor da DAS-MEI</p>
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(state.data.valor_mensal)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Valor fixo mensal independente da receita
              </p>
            </div>

            <Separator />

            {/* Composição do Valor */}
            <div className="space-y-3">
              <h4 className="font-medium">Composição do Valor</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                  <Badge variant="outline">INSS</Badge>
                  <span className="font-medium">{formatCurrency(state.data.detalhamento.inss)}</span>
                </div>
                {state.data.detalhamento.icms > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <Badge variant="outline">ICMS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.icms)}</span>
                  </div>
                )}
                {state.data.detalhamento.iss > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <Badge variant="outline">ISS</Badge>
                    <span className="font-medium">{formatCurrency(state.data.detalhamento.iss)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Informações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Data de Vencimento</p>
                <p className="font-semibold">
                  {new Date(state.data.data_vencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Tipo de Atividade</p>
                <p className="font-semibold capitalize">{state.data.atividade.replace('_', ' e ')}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Receita Informada</p>
                <p className="font-semibold">{formatCurrency(state.data.receita_bruta)}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Limite Utilizado</p>
                <p className="font-semibold">
                  {((state.data.receita_bruta * 12) / MEI_LIMITE_ANUAL * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Benefícios MEI */}
            <div className="rounded-lg border bg-green-100 p-4">
              <h4 className="font-medium text-green-900 mb-2">✅ Benefícios Inclusos</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Aposentadoria por idade ou invalidez</li>
                <li>• Auxílio-doença e salário-maternidade</li>
                <li>• Pensão por morte para família</li>
                <li>• Registro no CNPJ</li>
                <li>• Emissão de nota fiscal</li>
              </ul>
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