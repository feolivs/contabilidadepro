'use client';

import React, { useState } from 'react';

interface CalculoRapido {
  valor: number;
  aliquota_nominal: number;
  aliquota_efetiva: number;
  valor_deducao: number;
  faixa?: string;
}

interface ResultadoCalculo {
  valor_imposto?: number;
  aliquota_nominal?: number;
  aliquota_efetiva?: number;
  valor_deducao?: number;
  faixa?: string;
  detalhes?: any;
  // Compatibilidade com DASCalculationResult
  [key: string]: any;
}
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCalculoDASAutomatico, useValidarParametrosCalculo, useCalculoRapido } from '@/hooks/use-calculo-automatico';
import { useEmpresas } from '@/hooks/use-empresas';
import { Calculator, Zap, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const calculoSchema = z.object({
  empresa_id: z.string().min(1, 'Empresa é obrigatória'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  faturamento_bruto: z.number().min(0.01, 'Faturamento deve ser maior que zero'),
  faturamento_12_meses: z.number().min(0.01, 'Faturamento 12 meses deve ser maior que zero'),
  anexo: z.enum(['I', 'II', 'III', 'IV', 'V'], {
    message: 'Anexo é obrigatório',
  }),
  deducoes: z.number().min(0, 'Deduções não podem ser negativas').optional(),
});

type CalculoFormData = z.infer<typeof calculoSchema>;

interface CalculoAutomaticoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId?: string;
}

export function CalculoAutomaticoModal({
  open,
  onOpenChange,
  empresaId
}: CalculoAutomaticoModalProps) {
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [calculoRapido, setCalculoRapido] = useState<CalculoRapido | null>(null);

  const { data: empresas } = useEmpresas();
  const calculoDAS = useCalculoDASAutomatico();
  const { validarDAS } = useValidarParametrosCalculo();
  const { calcularDASRapido } = useCalculoRapido();

  const form = useForm<CalculoFormData>({
    resolver: zodResolver(calculoSchema),
    defaultValues: {
      empresa_id: empresaId || '',
      competencia: new Date().toISOString().substring(0, 7),
      faturamento_bruto: 0,
      faturamento_12_meses: 0,
      anexo: 'I',
      deducoes: 0,
    },
  });

  const watchedValues = form.watch();

  // Cálculo rápido em tempo real
  React.useEffect(() => {
    if (watchedValues.faturamento_bruto > 0 && watchedValues.faturamento_12_meses > 0) {
      const resultadoRapido = calcularDASRapido(
        watchedValues.faturamento_bruto,
        watchedValues.anexo,
        watchedValues.faturamento_12_meses
      );
      setCalculoRapido(resultadoRapido);
    } else {
      setCalculoRapido(null);
    }
  }, [watchedValues.faturamento_bruto, watchedValues.faturamento_12_meses, watchedValues.anexo, calcularDASRapido]);

  const onSubmit = async (data: CalculoFormData) => {
    // Validar dados
    const validacao = validarDAS(data);
    if (!validacao.valido) {
      validacao.erros.forEach(erro => toast.error(erro));
      return;
    }

    try {
      const resultado = await calculoDAS.mutateAsync(data);
      setResultado(resultado);
      toast.success('Cálculo realizado com sucesso!');
    } catch (error) {

    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(4)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calculator className="h-5 w-5" />
            Cálculo Automático DAS
          </DialogTitle>
          <DialogDescription className="text-sm">
            Calcule automaticamente o DAS com base nas tabelas oficiais do Simples Nacional
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
            {/* Formulário */}
            <div className="overflow-y-auto pr-1 lg:pr-2">
              <div className="space-y-3 sm:space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="empresa_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {empresas?.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="competencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competência</FormLabel>
                        <FormControl>
                          <Input
                            type="month"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="anexo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anexo Simples</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I">Anexo I - Comércio</SelectItem>
                            <SelectItem value="II">Anexo II - Indústria</SelectItem>
                            <SelectItem value="III">Anexo III - Serviços</SelectItem>
                            <SelectItem value="IV">Anexo IV - Serviços</SelectItem>
                            <SelectItem value="V">Anexo V - Serviços</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="faturamento_bruto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faturamento Bruto Mensal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="faturamento_12_meses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faturamento Últimos 12 Meses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deducoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deduções (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={calculoDAS.isPending}
                >
                  {calculoDAS.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Calcular DAS
                    </>
                  )}
                </Button>
              </form>
            </Form>
              </div>
            </div>

            {/* Resultados */}
            <div className="overflow-y-auto pl-1 lg:pl-2">
              <div className="space-y-3 sm:space-y-4">
                {/* Cálculo Rápido */}
                {calculoRapido && (
                  <Card className="h-fit">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        Prévia do Cálculo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valor DAS:</span>
                        <span className="font-medium text-green-600">{formatCurrency(calculoRapido.valor)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Alíquota Nominal:</span>
                        <span className="font-medium">{formatPercentage(calculoRapido.aliquota_nominal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Alíquota Efetiva:</span>
                        <span className="font-medium text-blue-600">{formatPercentage(calculoRapido.aliquota_efetiva)}</span>
                      </div>
                      <Badge variant="outline" className="w-fit mt-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Cálculo aproximado
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Resultado Final */}
                {resultado && (
                  <Card className="h-fit">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Resultado Final
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-green-600">
                            {formatCurrency(resultado.valor_das)}
                          </div>
                          <div className="text-xs text-green-600">Valor DAS</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-blue-600">
                            {formatPercentage(resultado.aliquota_efetiva || 0)}
                          </div>
                          <div className="text-xs text-blue-600">Alíquota Efetiva</div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Breakdown dos Impostos:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                          {Object.entries(resultado.breakdown).map(([imposto, valor]) => (
                            <div key={imposto} className="flex justify-between py-1">
                              <span className="text-muted-foreground">{imposto.toUpperCase()}:</span>
                              <span className="font-medium">{formatCurrency(valor as number)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Data de Vencimento:</span>
                          <span className="font-medium text-sm">
                            {new Date(resultado.data_vencimento).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground">Código de Barras:</span>
                          <span className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                            {resultado.codigo_barras}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Implementar geração de PDF
                          toast.info('Funcionalidade de PDF será implementada em breve');
                        }}
                      >
                        Gerar Guia PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
