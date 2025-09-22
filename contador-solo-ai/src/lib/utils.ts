import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatar valor como moeda brasileira
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
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
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return ''
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Validar CNPJ
 */
export function validateCNPJ(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false
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

/**
 * Validar CPF
 */
export function validateCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false
  const cleaned = cpf.replace(/\D/g, '')

  if (cleaned.length !== 11) return false

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false

  // Calcular primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i] || '0') * (10 - i)
  }

  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(cleaned[9] || '0') !== firstDigit) return false

  // Calcular segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i] || '0') * (11 - i)
  }

  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return parseInt(cleaned[10] || '0') === secondDigit
}

/**
 * Formatar CPF
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return ''
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
