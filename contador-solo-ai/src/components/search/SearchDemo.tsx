'use client'

/**
 * Demonstração de Busca Avançada - ContabilidadePRO
 * Showcase das funcionalidades de busca com extensões PostgreSQL
 */

import React, { useState } from 'react'
import { Search, Zap, Target, Type, Hash } from 'lucide-react'
import { AdvancedSearchBox } from './AdvancedSearchBox'
import { useAdvancedSearch } from '@/hooks/use-advanced-search'
import { cn } from '@/lib/utils'

export interface SearchDemoProps {
  className?: string
}

const SEARCH_EXAMPLES = {
  empresas: [
    { query: 'José Silva', description: 'Busca exata por nome' },
    { query: 'jose silva', description: 'Busca sem acentos (unaccent)' },
    { query: 'Silva Comercio', description: 'Busca por similaridade' },
    { query: '12.345.678/0001-90', description: 'Busca por CNPJ' }
  ],
  clientes: [
    { query: 'Maria Santos', description: 'Nome completo' },
    { query: 'maria', description: 'Nome parcial' },
    { query: 'Santos & Cia', description: 'Razão social' },
    { query: 'Consultoria', description: 'Por atividade' }
  ],
  documentos: [
    { query: 'NFe 2025', description: 'Tipo e ano' },
    { query: 'Receita Federal', description: 'Por órgão' },
    { query: 'ICMS', description: 'Por imposto' },
    { query: 'Janeiro', description: 'Por período' }
  ]
}

const MATCH_TYPE_INFO = {
  exact: {
    icon: Target,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Correspondência Exata',
    description: 'Encontrou exatamente o que você procurou'
  },
  unaccent: {
    icon: Type,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Busca sem Acentos',
    description: 'Ignorou acentos e encontrou resultados similares'
  },
  trigram: {
    icon: Hash,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Similaridade (Trigram)',
    description: 'Encontrou por similaridade de texto'
  },
  fuzzy: {
    icon: Zap,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Busca Aproximada',
    description: 'Encontrou mesmo com pequenas diferenças'
  }
}

export function SearchDemo({ className }: SearchDemoProps) {
  const [selectedType, setSelectedType] = useState<'empresas' | 'clientes' | 'documentos'>('empresas')
  const [selectedResult, setSelectedResult] = useState<any>(null)

  const {
    query,
    setQuery,
    results,
    isLoading,
    hasResults,
    suggestions
  } = useAdvancedSearch(selectedType, {
    limit: 15,
    threshold: 0.2
  })

  const handleExampleClick = (example: { query: string; description: string }) => {
    setQuery(example.query)
  }

  const handleResultSelect = (result: any) => {
    setSelectedResult(result)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Busca Avançada Inteligente
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Experimente nossa busca avançada que utiliza extensões PostgreSQL para encontrar 
          resultados mesmo com erros de digitação, acentos ou termos similares.
        </p>
      </div>

      {/* Seletor de Tipo */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          {Object.keys(SEARCH_EXAMPLES).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                selectedType === type
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Caixa de Busca */}
      <div className="max-w-2xl mx-auto">
        <AdvancedSearchBox
          searchType={selectedType}
          placeholder={`Buscar ${selectedType}...`}
          onResultSelect={handleResultSelect}
          showFilters={true}
          autoFocus={true}
        />
      </div>

      {/* Exemplos de Busca */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold mb-3">Exemplos para testar:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SEARCH_EXAMPLES[selectedType].map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900">"{example.query}"</div>
              <div className="text-sm text-gray-600">{example.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {hasResults && (
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">
            Resultados ({results.length} encontrados)
          </h3>
          
          <div className="space-y-3">
            {results.map((result, index) => {
              const matchInfo = MATCH_TYPE_INFO[result.match_type as keyof typeof MATCH_TYPE_INFO]
              const IconComponent = matchInfo.icon

              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleResultSelect(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {result.data.nome || result.data.title || 'Sem nome'}
                        </h4>
                        <div className={cn('flex items-center space-x-1 px-2 py-1 rounded-full text-xs', matchInfo.bg)}>
                          <IconComponent className={cn('h-3 w-3', matchInfo.color)} />
                          <span className={matchInfo.color}>{matchInfo.title}</span>
                        </div>
                      </div>
                      
                      {result.data.cnpj && (
                        <div className="text-sm text-gray-600 mb-1">
                          CNPJ: {result.data.cnpj}
                        </div>
                      )}
                      
                      {result.data.descricao && (
                        <div className="text-sm text-gray-700">
                          {result.data.descricao}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        {matchInfo.description}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {Math.round(result.score * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Relevância
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sugestões */}
      {suggestions.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Sugestões:</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuery(suggestion)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultado Selecionado */}
      {selectedResult && (
        <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Resultado Selecionado:</h3>
          <pre className="text-sm text-blue-800 overflow-x-auto">
            {JSON.stringify(selectedResult, null, 2)}
          </pre>
          <button
            onClick={() => setSelectedResult(null)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Informações Técnicas */}
      <div className="max-w-4xl mx-auto bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Como Funciona a Busca Avançada</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Extensões PostgreSQL Utilizadas:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>unaccent:</strong> Remove acentos para busca normalizada</li>
              <li>• <strong>pg_trgm:</strong> Busca por similaridade usando trigramas</li>
              <li>• <strong>fuzzystrmatch:</strong> Busca aproximada com Levenshtein</li>
              <li>• <strong>btree_gin:</strong> Índices otimizados para performance</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Tipos de Correspondência:</h4>
            <div className="space-y-2">
              {Object.entries(MATCH_TYPE_INFO).map(([key, info]) => {
                const IconComponent = info.icon
                return (
                  <div key={key} className="flex items-center space-x-2">
                    <IconComponent className={cn('h-4 w-4', info.color)} />
                    <span className="text-sm font-medium">{info.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
