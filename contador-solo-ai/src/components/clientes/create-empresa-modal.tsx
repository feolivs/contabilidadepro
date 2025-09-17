'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, Search } from 'lucide-react'
import { useCreateEmpresa } from '@/hooks/use-empresas'

// Schema de validação
const empresaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  nome_fantasia: z.string().optional(),
  cnpj: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true // CNPJ é opcional
      const cleanCNPJ = val.replace(/[^\d]/g, '')
      return cleanCNPJ.length === 11 || cleanCNPJ.length === 14 // CPF ou CNPJ
    }, 'CNPJ/CPF inválido'),
  regime_tributario: z.enum(['simples', 'lucro_presumido', 'lucro_real', 'mei']),
  atividade_principal: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})

type EmpresaFormData = z.infer<typeof empresaSchema>

interface CreateEmpresaModalProps {
  onSuccess?: () => void
}

export function CreateEmpresaModal({ onSuccess }: CreateEmpresaModalProps) {
  const [open, setOpen] = useState(false)
  const [consultingCNPJ, setConsultingCNPJ] = useState(false)
  const createEmpresa = useCreateEmpresa()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      regime_tributario: 'simples'
    }
  })

  const cnpjValue = watch('cnpj')

  // Função para consultar CNPJ na Receita Federal
  const consultarCNPJ = async () => {
    if (!cnpjValue || cnpjValue.replace(/[^\d]/g, '').length < 14) {
      toast.error('Digite um CNPJ válido (14 dígitos)')
      return
    }

    setConsultingCNPJ(true)
    try {
      const cleanCNPJ = cnpjValue.replace(/[^\d]/g, '')
      
      // Simular consulta à API da Receita Federal
      // Em produção, usar uma API real como ReceitaWS
      const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.status !== 'ERROR') {
          setValue('nome', data.nome || '')
          setValue('nome_fantasia', data.fantasia || '')
          setValue('atividade_principal', data.atividade_principal?.text || '')
          
          toast.success('Dados do CNPJ carregados com sucesso!')
        } else {
          toast.error('CNPJ não encontrado')
        }
      } else {
        toast.error('Erro ao consultar CNPJ')
      }
    } catch (error) {

      toast.error('Erro ao consultar CNPJ')
    } finally {
      setConsultingCNPJ(false)
    }
  }

  // Função para formatar CNPJ
  const formatCNPJ = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '')
    return cleanValue
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      // Limpar CNPJ para salvar apenas números (se fornecido)
      const cleanCNPJ = data.cnpj ? data.cnpj.replace(/[^\d]/g, '') : undefined

      await createEmpresa.mutateAsync({
        nome: data.nome,
        nome_fantasia: data.nome_fantasia || undefined,
        cnpj: cleanCNPJ,
        regime_tributario: data.regime_tributario,
        atividade_principal: data.atividade_principal || undefined,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        endereco: data.endereco || undefined,
        ativa: true,
        status: 'ativa'
      })

      reset()
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </ModalTrigger>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Nova Empresa</ModalTitle>
          <ModalDescription>
            Cadastre uma nova empresa cliente. Preencha os dados abaixo.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CNPJ com consulta */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ/CPF</Label>
            <div className="flex gap-2">
              <Input
                id="cnpj"
                {...register('cnpj')}
                placeholder="00.000.000/0000-00"
                onChange={(e) => {
                  const formatted = formatCNPJ(e.target.value)
                  setValue('cnpj', formatted)
                }}
                className={errors.cnpj ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={consultarCNPJ}
                disabled={consultingCNPJ}
              >
                {consultingCNPJ ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.cnpj && (
              <p className="text-sm text-red-500">{errors.cnpj.message}</p>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Razão Social *</Label>
            <Input
              id="nome"
              {...register('nome')}
              placeholder="Nome da empresa"
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && (
              <p className="text-sm text-red-500">{errors.nome.message}</p>
            )}
          </div>

          {/* Nome Fantasia */}
          <div className="space-y-2">
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              {...register('nome_fantasia')}
              placeholder="Nome fantasia (opcional)"
            />
          </div>

          {/* Regime Tributário */}
          <div className="space-y-2">
            <Label htmlFor="regime_tributario">Regime Tributário *</Label>
            <select
              id="regime_tributario"
              {...register('regime_tributario')}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="simples">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
              <option value="mei">MEI</option>
            </select>
          </div>

          {/* Atividade Principal */}
          <div className="space-y-2">
            <Label htmlFor="atividade_principal">Atividade Principal</Label>
            <Input
              id="atividade_principal"
              {...register('atividade_principal')}
              placeholder="Descrição da atividade principal"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="email@empresa.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              {...register('telefone')}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Textarea
              id="endereco"
              {...register('endereco')}
              placeholder="Endereço completo da empresa"
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createEmpresa.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createEmpresa.isPending}>
              {createEmpresa.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Empresa'
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
