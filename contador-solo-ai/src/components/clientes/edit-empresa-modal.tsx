'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Edit } from 'lucide-react'
import { useUpdateEmpresa } from '@/hooks/use-empresas'

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
  status: z.enum(['ativa', 'inativa', 'suspensa']),
})

type EmpresaFormData = z.infer<typeof empresaSchema>

interface Empresa {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario?: string
  atividade_principal?: string
  status?: string
  email?: string
  telefone?: string
  endereco?: string
}

interface EditEmpresaModalProps {
  empresa: Empresa
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditEmpresaModal({ 
  empresa, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditEmpresaModalProps) {
  const updateEmpresa = useUpdateEmpresa()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
  })

  // Carregar dados da empresa quando o modal abrir
  useEffect(() => {
    if (open && empresa) {
      setValue('nome', empresa.nome || '')
      setValue('nome_fantasia', empresa.nome_fantasia || '')
      setValue('cnpj', formatCNPJ(empresa.cnpj || ''))
      setValue('regime_tributario', (empresa.regime_tributario as any) || 'simples')
      setValue('atividade_principal', empresa.atividade_principal || '')
      setValue('email', empresa.email || '')
      setValue('telefone', empresa.telefone || '')
      setValue('endereco', empresa.endereco || '')
      setValue('status', (empresa.status as any) || 'ativa')
    }
  }, [open, empresa, setValue])

  // Função para formatar CNPJ
  const formatCNPJ = (value: string) => {
    if (!value) return ''
    const cleanValue = value.replace(/[^\d]/g, '')
    return cleanValue
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const onSubmit = async (data: EmpresaFormData) => {
    if (!empresa) return

    try {
      // Limpar CNPJ para salvar apenas números (se fornecido)
      const cleanCNPJ = data.cnpj ? data.cnpj.replace(/[^\d]/g, '') : undefined

      await updateEmpresa.mutateAsync({
        id: empresa.id,
        nome: data.nome,
        nome_fantasia: data.nome_fantasia || undefined,
        cnpj: cleanCNPJ,
        regime_tributario: data.regime_tributario,
        atividade_principal: data.atividade_principal || undefined,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        endereco: data.endereco || undefined,
        status: data.status,
        ativa: data.status === 'ativa'
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Editar Empresa</ModalTitle>
          <ModalDescription>
            Edite os dados da empresa {empresa?.nome}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ/CPF</Label>
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

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="suspensa">Suspensa</option>
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

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="suspensa">Suspensa</option>
            </select>
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
              onClick={() => onOpenChange(false)}
              disabled={updateEmpresa.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateEmpresa.isPending}>
              {updateEmpresa.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
