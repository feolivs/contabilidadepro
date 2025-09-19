'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Building2, Calendar, DollarSign, Percent, FileText } from 'lucide-react';
import { useEmpresas } from '@/hooks/use-empresas';
import { useCalcularDAS, useCalcularIRPJ, useCalcularMEI } from '@/hooks/use-calculos';
import type { TipoCalculo, AnexoSimples } from '@/types/calculo';

const novoCalculoSchema = z.object({
  tipo_calculo: z.enum(['DAS', 'IRPJ', 'MEI', 'CSLL', 'PIS', 'COFINS', 'ICMS', 'ISS', 'CPP', 'IPI']),
  empresa_id: z.string().min(1, 'Selecione uma empresa'),
  competencia: z.string().min(1, 'Informe a competência'),
  faturamento_bruto: z.string().min(1, 'Informe o faturamento bruto'),
  faturamento_12_meses: z.string().optional(),
  anexo_simples: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
  atividade_mei: z.enum(['comercio', 'servicos', 'comercio_servicos']).optional(),
  deducoes: z.string().optional(),
  atividade_principal: z.string().optional(),
  observacoes: z.string().optional(),
});

type NovoCalculoForm = z.infer<typeof novoCalculoSchema>;

interface NovoCalculoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoCalculoModal({ open, onOpenChange }: NovoCalculoModalProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoCalculo | ''>('');
  
  const { data: empresas = [] } = useEmpresas();
  const calcularDAS = useCalcularDAS();
  const calcularIRPJ = useCalcularIRPJ();
  const calcularMEI = useCalcularMEI();

  const form = useForm<NovoCalculoForm>({
    resolver: zodResolver(novoCalculoSchema),
    defaultValues: {
      tipo_calculo: 'DAS',
      empresa_id: '',
      competencia: '',
      faturamento_bruto: '',
      faturamento_12_meses: '',
      deducoes: '0',
      observacoes: '',
    },
  });

  const onSubmit = async (data: NovoCalculoForm) => {
    try {
      const faturamentoBruto = parseFloat(data.faturamento_bruto.replace(/[^\d,]/g, '').replace(',', '.'));
      const faturamento12Meses = data.faturamento_12_meses 
        ? parseFloat(data.faturamento_12_meses.replace(/[^\d,]/g, '').replace(',', '.'))
        : faturamentoBruto * 12;
      const deducoes = data.deducoes 
        ? parseFloat(data.deducoes.replace(/[^\d,]/g, '').replace(',', '.'))
        : 0;

      if (data.tipo_calculo === 'DAS') {
        if (!data.anexo_simples) {
          form.setError('anexo_simples', { message: 'Selecione o anexo do Simples Nacional' });
          return;
        }

        await calcularDAS.mutateAsync({
          empresa_id: data.empresa_id,
          competencia: data.competencia,
          faturamento_bruto: faturamentoBruto,
          faturamento_12_meses: faturamento12Meses,
          anexo_simples: data.anexo_simples,
          deducoes,
        });
      } else if (data.tipo_calculo === 'MEI') {
        if (!data.atividade_mei) {
          form.setError('atividade_mei', { message: 'Selecione a atividade do MEI' });
          return;
        }

        await calcularMEI.mutateAsync({
          empresa_id: data.empresa_id,
          competencia: data.competencia,
          atividade_mei: data.atividade_mei,
          receita_bruta_mensal: faturamentoBruto,
        });
      } else if (data.tipo_calculo === 'IRPJ') {
        await calcularIRPJ.mutateAsync({
          empresa_id: data.empresa_id,
          competencia: data.competencia,
          receita_bruta: faturamentoBruto,
          atividade_principal: data.atividade_principal || '',
          deducoes,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {

    }
  };

  const formatarMoeda = (valor: string) => {
    const numero = valor.replace(/[^\d]/g, '');
    const valorFormatado = (parseInt(numero) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return valorFormatado === '0,00' ? '' : `R$ ${valorFormatado}`;
  };

  const handleTipoChange = (tipo: TipoCalculo) => {
    setTipoSelecionado(tipo);
    form.setValue('tipo_calculo', tipo);

    // Limpar campos específicos quando mudar o tipo
    form.setValue('anexo_simples', undefined);
    form.setValue('atividade_principal', '');
    form.setValue('atividade_mei', undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Novo Cálculo Fiscal
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Cálculo */}
            <FormField
              control={form.control}
              name="tipo_calculo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tipo de Cálculo
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => handleTipoChange(value as TipoCalculo)} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de cálculo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAS">DAS - Simples Nacional</SelectItem>
                      <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                      <SelectItem value="IRPJ">IRPJ - Lucro Presumido</SelectItem>
                      <SelectItem value="CSLL">CSLL - Lucro Presumido</SelectItem>
                      <SelectItem value="PIS">PIS</SelectItem>
                      <SelectItem value="COFINS">COFINS</SelectItem>
                      <SelectItem value="ICMS">ICMS</SelectItem>
                      <SelectItem value="ISS">ISS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Empresa */}
            <FormField
              control={form.control}
              name="empresa_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Empresa
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome} - {empresa.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Competência */}
              <FormField
                control={form.control}
                name="competencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Competência
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="month"
                        placeholder="2025-01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Faturamento Bruto */}
              <FormField
                control={form.control}
                name="faturamento_bruto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {tipoSelecionado === 'DAS' ? 'Faturamento do Mês' :
                       tipoSelecionado === 'MEI' ? 'Receita Bruta Mensal' : 'Receita Bruta'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        value={field.value ? formatarMoeda(field.value) : ''}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^\d]/g, '');
                          field.onChange(valor);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos específicos para DAS */}
            {tipoSelecionado === 'DAS' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900">Dados do Simples Nacional</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="faturamento_12_meses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faturamento 12 Meses</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            value={field.value ? formatarMoeda(field.value) : ''}
                            onChange={(e) => {
                              const valor = e.target.value.replace(/[^\d]/g, '');
                              field.onChange(valor);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="anexo_simples"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anexo do Simples</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o anexo" />
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
              </div>
            )}

            {/* Campos específicos para MEI */}
            {tipoSelecionado === 'MEI' && (
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-medium text-orange-900">Dados do MEI</h3>

                <FormField
                  control={form.control}
                  name="atividade_mei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividade do MEI</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a atividade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="comercio">Comércio - R$ 66,60</SelectItem>
                          <SelectItem value="servicos">Serviços - R$ 70,60</SelectItem>
                          <SelectItem value="comercio_servicos">Comércio e Serviços - R$ 71,60</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded">
                  <strong>Limite MEI 2025:</strong> R$ 81.000,00 anuais (R$ 6.750,00 mensais)
                </div>
              </div>
            )}

            {/* Campos específicos para IRPJ */}
            {tipoSelecionado === 'IRPJ' && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900">Dados do Lucro Presumido</h3>

                <FormField
                  control={form.control}
                  name="atividade_principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividade Principal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Prestação de serviços de consultoria"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Deduções */}
            <FormField
              control={form.control}
              name="deducoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Deduções (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R$ 0,00"
                      value={field.value ? formatarMoeda(field.value) : ''}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/[^\d]/g, '');
                        field.onChange(valor);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o cálculo..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={calcularDAS.isPending || calcularIRPJ.isPending || calcularMEI.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {calcularDAS.isPending || calcularIRPJ.isPending || calcularMEI.isPending ? (
                  <>
                    <Calculator className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
