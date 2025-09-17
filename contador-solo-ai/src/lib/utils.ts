import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatar valor como moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formatar porcentagem
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Formatar data brasileira
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('pt-BR')
}

/**
 * Formatar CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Validar CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')

  if (cleaned.length !== 14) return false

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false

  // Calcular primeiro dígito verificador
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i] || '0') * weight
    weight = weight === 2 ? 9 : weight - 1
  }

  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(cleaned[12] || '0') !== firstDigit) return false

  // Calcular segundo dígito verificador
  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i] || '0') * weight
    weight = weight === 2 ? 9 : weight - 1
  }

  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return parseInt(cleaned[13] || '0') === secondDigit
}
