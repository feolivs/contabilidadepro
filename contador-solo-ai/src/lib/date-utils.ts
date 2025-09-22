/**
 * Utilitários de data otimizados para o projeto ContabilidadePRO
 * Importações específicas para reduzir bundle size
 */

// Importações específicas do date-fns para tree-shaking
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma data no padrão brasileiro
 */
export const formatDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

/**
 * Formata uma data com horário no padrão brasileiro
 */
export const formatDateTime = (date: Date | string) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

/**
 * Formata distância temporal relativa (ex: "há 2 horas")
 */
export const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, {
    locale: ptBR,
    addSuffix: true
  })
}

/**
 * Calcula diferença em dias entre duas datas
 */
export const daysBetween = (startDate: Date | string, endDate: Date | string) => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  return differenceInDays(end, start)
}

/**
 * Verifica se uma data está vencida
 */
export const isOverdue = (date: Date | string) => {
  return daysBetween(date, new Date()) < 0
}

/**
 * Formata data para ISO string (útil para APIs)
 */
export const toISODate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString()
}

/**
 * Formata data para input type="date"
 */
export const formatForInput = (date: Date | string) => {
  return formatDate(date, 'yyyy-MM-dd')
}