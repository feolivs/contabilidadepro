/**
 * 🔒 VALIDADOR DE CNPJ OFICIAL - Edge Functions
 * ContábilPRO ERP - Validação server-side com algoritmo oficial
 * 
 * Implementa o algoritmo oficial da Receita Federal para validação de CNPJ
 * Usado em todas as Edge Functions que manipulam dados de empresas
 */ /**
 * Valida CNPJ usando algoritmo oficial da Receita Federal
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se válido, false se inválido
 */ export function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  // Remove formatação (pontos, barras, hífens)
  const digits = cnpj.replace(/\D/g, '');
  // Verifica se tem 14 dígitos
  if (digits.length !== 14) return false;
  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(digits)) return false;
  // Algoritmo de validação oficial
  const calcularDigito = (base, pesos)=>{
    let soma = 0;
    for(let i = 0; i < base.length; i++){
      soma += parseInt(base[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  // Pesos para o primeiro dígito verificador
  const pesos1 = [
    5,
    4,
    3,
    2,
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2
  ];
  // Pesos para o segundo dígito verificador  
  const pesos2 = [
    6,
    5,
    4,
    3,
    2,
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2
  ];
  // Calcular primeiro dígito verificador
  const digito1 = calcularDigito(digits.substring(0, 12), pesos1);
  // Calcular segundo dígito verificador
  const digito2 = calcularDigito(digits.substring(0, 12) + digito1, pesos2);
  // Verificar se os dígitos calculados conferem com os informados
  return digits.substring(12) === `${digito1}${digito2}`;
}
/**
 * Limpa CNPJ removendo formatação
 * @param cnpj - CNPJ com ou sem formatação
 * @returns CNPJ apenas com dígitos
 */ export function cleanCNPJ(cnpj) {
  return cnpj.replace(/\D/g, '');
}
/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 * @param cnpj - CNPJ apenas com dígitos
 * @returns CNPJ formatado
 */ export function formatCNPJ(cnpj) {
  const digits = cleanCNPJ(cnpj);
  if (digits.length !== 14) {
    return cnpj; // Retorna original se não tiver 14 dígitos
  }
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
/**
 * Valida e formata CNPJ em uma única operação
 * @param cnpj - CNPJ com ou sem formatação
 * @returns Objeto com validação e formatação
 */ export function validateAndFormatCNPJ(cnpj) {
  if (!cnpj) {
    return {
      valid: false,
      clean: '',
      formatted: '',
      error: 'CNPJ é obrigatório'
    };
  }
  const clean = cleanCNPJ(cnpj);
  if (clean.length !== 14) {
    return {
      valid: false,
      clean,
      formatted: cnpj,
      error: 'CNPJ deve ter 14 dígitos'
    };
  }
  const valid = validateCNPJ(clean);
  return {
    valid,
    clean,
    formatted: formatCNPJ(clean),
    error: valid ? undefined : 'CNPJ inválido'
  };
}
/**
 * CNPJs válidos para testes
 */ export const CNPJ_EXAMPLES = {
  VALID_1: '11.222.333/0001-81',
  VALID_2: '11.444.777/0001-61',
  INVALID_1: '11.111.111/1111-11',
  INVALID_2: '00.000.000/0000-00'
};
/**
 * Middleware para validação de CNPJ em Edge Functions
 * @param cnpj - CNPJ a ser validado
 * @throws Error se CNPJ for inválido
 */ export function validateCNPJMiddleware(cnpj) {
  const result = validateAndFormatCNPJ(cnpj);
  if (!result.valid) {
    throw new Error(result.error || 'CNPJ inválido');
  }
}
