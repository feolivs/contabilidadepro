'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  MapPin,
  Building2,
  DollarSign,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { EmpresaFilters, RegimeTributario } from '@/types/empresa-unified.types'

interface AdvancedFiltersProps {
  filters: EmpresaFilters
  onFiltersChange: (filters: EmpresaFilters) => void
  onClearFilters: () => void
}

const REGIMES_TRIBUTARIOS: RegimeTributario[] = [
  'MEI',
  'Simples Nacional', 
  'Lucro Presumido',
  'Lucro Real'
]

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const ATIVIDADES_PRINCIPAIS = [
  'Comércio Varejista',
  'Comércio Atacadista', 
  'Prestação de Serviços',
  'Indústria',
  'Construção Civil',
  'Tecnologia',
  'Consultoria',
  'Alimentação',
  'Saúde',
  'Educação',
  'Transporte',
  'Outros'
]

export function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<EmpresaFilters>(filters)

  const updateTempFilter = (key: keyof EmpresaFilters, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
    setIsOpen(false)
  }

  const resetFilters = () => {
    const emptyFilters: EmpresaFilters = {
      regime: 'all',
      status: 'all',
      atividade: 'all',
      periodo: 'all'
    }
    setTempFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onClearFilters()
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.regime !== 'all') count++
    if (filters.status !== 'all') count++
    if (filters.atividade !== 'all') count++
    if (filters.uf) count++
    if (filters.cidade) count++
    if (filters.dataInicio || filters.dataFim) count++
    if (filters.faixaReceita?.min || filters.faixaReceita?.max) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Configure filtros detalhados para encontrar empresas específicas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Regime Tributário */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Regime Tributário
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {REGIMES_TRIBUTARIOS.map((regime) => (
                <div key={regime} className="flex items-center space-x-2">
                  <Checkbox
                    id={regime}
                    checked={tempFilters.regime === regime}
                    onCheckedChange={(checked) => {
                      updateTempFilter('regime', checked ? regime : 'all')
                    }}
                  />
                  <Label htmlFor={regime} className="text-sm">
                    {regime}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status da Empresa</Label>
            <Select 
              value={tempFilters.status || 'all'} 
              onValueChange={(value) => updateTempFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="inativa">Inativas</SelectItem>
                <SelectItem value="suspensa">Suspensas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Localização */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="uf" className="text-xs text-muted-foreground">
                  Estado (UF)
                </Label>
                <Select 
                  value={tempFilters.uf || ''} 
                  onValueChange={(value) => updateTempFilter('uf', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {ESTADOS_BRASIL.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cidade" className="text-xs text-muted-foreground">
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  placeholder="Nome da cidade"
                  value={tempFilters.cidade || ''}
                  onChange={(e) => updateTempFilter('cidade', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Atividade Principal */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Atividade Principal</Label>
            <Select 
              value={tempFilters.atividade || 'all'} 
              onValueChange={(value) => updateTempFilter('atividade', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a atividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Atividades</SelectItem>
                {ATIVIDADES_PRINCIPAIS.map((atividade) => (
                  <SelectItem key={atividade} value={atividade}>
                    {atividade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Período de Cadastro */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Período de Cadastro
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempFilters.dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempFilters.dataInicio ? (
                        format(tempFilters.dataInicio, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecionar"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempFilters.dataInicio}
                      onSelect={(date) => updateTempFilter('dataInicio', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tempFilters.dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tempFilters.dataFim ? (
                        format(tempFilters.dataFim, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecionar"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempFilters.dataFim}
                      onSelect={(date) => updateTempFilter('dataFim', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Faixa de Receita */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Faixa de Receita Anual
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Mínimo (R$)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={tempFilters.faixaReceita?.min || ''}
                  onChange={(e) => updateTempFilter('faixaReceita', {
                    ...tempFilters.faixaReceita,
                    min: e.target.value ? Number(e.target.value) : undefined
                  })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Máximo (R$)</Label>
                <Input
                  type="number"
                  placeholder="Sem limite"
                  value={tempFilters.faixaReceita?.max || ''}
                  onChange={(e) => updateTempFilter('faixaReceita', {
                    ...tempFilters.faixaReceita,
                    max: e.target.value ? Number(e.target.value) : undefined
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <Button onClick={resetFilters} variant="outline" className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Limpar Tudo
          </Button>
          <Button onClick={applyFilters} className="flex-1">
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
