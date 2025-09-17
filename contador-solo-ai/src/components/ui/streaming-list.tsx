'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface StreamingListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemsPerPage?: number
  searchTerm?: string
  filterFn?: (item: T, searchTerm: string) => boolean
  sortFn?: (a: T, b: T) => number
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  className?: string
  title?: string
  showStats?: boolean
}

export function StreamingList<T>({
  data,
  renderItem,
  itemsPerPage = 20,
  searchTerm = '',
  filterFn,
  sortFn,
  loadingComponent,
  emptyComponent,
  className,
  title,
  showStats = true
}: StreamingListProps<T>) {
  const [visibleItems, setVisibleItems] = useState(itemsPerPage)
  const [isLoading, setIsLoading] = useState(false)

  // Filtrar e ordenar dados
  const processedData = useMemo(() => {
    let filtered = data

    // Aplicar filtro de busca
    if (searchTerm && filterFn) {
      filtered = data.filter(item => filterFn(item, searchTerm))
    }

    // Aplicar ordenação
    if (sortFn) {
      filtered = [...filtered].sort(sortFn)
    }

    return filtered
  }, [data, searchTerm, filterFn, sortFn])

  // Itens visíveis
  const visibleData = useMemo(() => {
    return processedData.slice(0, visibleItems)
  }, [processedData, visibleItems])

  const hasMore = visibleItems < processedData.length
  const totalItems = processedData.length

  const loadMore = async () => {
    setIsLoading(true)
    
    // Simular delay para streaming
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setVisibleItems(prev => Math.min(prev + itemsPerPage, processedData.length))
    setIsLoading(false)
  }

  const showLess = () => {
    setVisibleItems(itemsPerPage)
  }

  // Reset quando os dados mudam
  useEffect(() => {
    setVisibleItems(itemsPerPage)
  }, [data, searchTerm, itemsPerPage])

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {emptyComponent || (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {showStats && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {visibleItems} de {totalItems}
                </Badge>
                {searchTerm && (
                  <Badge variant="secondary">
                    Filtrado
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-2">
        {/* Lista de itens */}
        <Suspense fallback={loadingComponent || <StreamingListSkeleton />}>
          <div className="space-y-2">
            {visibleData.map((item, index) => (
              <div key={index} className="animate-in fade-in-0 slide-in-from-left-1">
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </Suspense>

        {/* Loading para mais itens */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Carregando mais itens...
            </span>
          </div>
        )}

        {/* Controles de paginação */}
        {(hasMore || visibleItems > itemsPerPage) && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            {hasMore && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Carregar mais ({processedData.length - visibleItems} restantes)
              </Button>
            )}
            
            {visibleItems > itemsPerPage && (
              <Button
                variant="ghost"
                onClick={showLess}
                className="flex items-center gap-2"
              >
                <ChevronUp className="h-4 w-4" />
                Mostrar menos
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente de loading para streaming
export function StreamingListSkeleton({ 
  items = 5,
  showHeader = true 
}: { 
  items?: number
  showHeader?: boolean 
}) {
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook para streaming de dados
export function useStreamingData<T>(
  data: T[],
  options: {
    itemsPerPage?: number
    searchTerm?: string
    filterFn?: (item: T, searchTerm: string) => boolean
    sortFn?: (a: T, b: T) => number
  } = {}
) {
  const {
    itemsPerPage = 20,
    searchTerm = '',
    filterFn,
    sortFn
  } = options

  const [visibleItems, setVisibleItems] = useState(itemsPerPage)
  const [isLoading, setIsLoading] = useState(false)

  // Processar dados
  const processedData = useMemo(() => {
    let filtered = data

    if (searchTerm && filterFn) {
      filtered = data.filter(item => filterFn(item, searchTerm))
    }

    if (sortFn) {
      filtered = [...filtered].sort(sortFn)
    }

    return filtered
  }, [data, searchTerm, filterFn, sortFn])

  const visibleData = useMemo(() => {
    return processedData.slice(0, visibleItems)
  }, [processedData, visibleItems])

  const hasMore = visibleItems < processedData.length

  const loadMore = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    setVisibleItems(prev => Math.min(prev + itemsPerPage, processedData.length))
    setIsLoading(false)
  }

  const reset = useCallback(() => {
    setVisibleItems(itemsPerPage)
  }, [itemsPerPage])

  // Reset quando dados mudam
  useEffect(() => {
    reset()
  }, [data, searchTerm, itemsPerPage, reset])

  return {
    visibleData,
    totalItems: processedData.length,
    visibleItems,
    hasMore,
    isLoading,
    loadMore,
    reset
  }
}

// Componente para listas virtualizadas (para datasets muito grandes)
interface VirtualizedListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  overscan?: number
  className?: string
}

export function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    data.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = data.slice(startIndex, endIndex + 1)
  const totalHeight = data.length * itemHeight
  const offsetY = startIndex * itemHeight

  return (
    <div
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
