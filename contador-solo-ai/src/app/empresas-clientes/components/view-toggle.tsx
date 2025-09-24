'use client'

import { Button } from '@/components/ui/button'
import { Table, Grid3X3, List } from 'lucide-react'
import { ViewMode } from '@/types/empresa-unified.types'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  className?: string
}

export function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  const viewOptions = [
    { value: 'table' as ViewMode, icon: Table, label: 'Tabela' },
    { value: 'grid' as ViewMode, icon: Grid3X3, label: 'Grade' },
    { value: 'list' as ViewMode, icon: List, label: 'Lista' }
  ]

  return (
    <div className={cn("flex items-center border rounded-lg p-1", className)}>
      {viewOptions.map((option) => {
        const Icon = option.icon
        const isActive = viewMode === option.value

        return (
          <Button
            key={option.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange(option.value)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 h-8",
              isActive && "bg-primary text-primary-foreground"
            )}
            aria-label={`Visualização em ${option.label.toLowerCase()}`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
