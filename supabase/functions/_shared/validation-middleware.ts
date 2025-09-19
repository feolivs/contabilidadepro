// Simple validation utilities
export function validateRequired(data: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field]) {
      return `Campo obrigatório: ${field}`
    }
  }
  return null
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false

  // Basic validation algorithm
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }

  const firstCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(digits[12]) !== firstCheck) return false

  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }

  const secondCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return parseInt(digits[13]) === secondCheck
}