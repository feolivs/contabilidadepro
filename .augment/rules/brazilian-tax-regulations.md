---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Brazilian Tax Regulations Guide

## Overview
This comprehensive guide covers Brazilian tax regulations, calculation methodologies, and compliance requirements essential for the ContabilidadePRO AI system to provide accurate accounting assistance.

## Tax Regime Classifications

### 1. MEI (Microempreendedor Individual)
**Revenue Limit**: R$ 81.000,00 annually (2025)
**Eligibility**: Individual entrepreneurs with specific activities

#### MEI Tax Obligations
```typescript
interface MEIObligations {
  monthlyPayment: {
    fixedAmount: {
      comercio: 'R$ 66,60'; // INSS + ICMS
      servicos: 'R$ 70,60'; // INSS + ISS
      comercioServicos: 'R$ 71,60'; // INSS + ICMS + ISS
    };
    dueDate: '20th of following month';
    paymentMethod: 'DAS-MEI via gov.br or banking apps';
  };
  
  annualDeclaration: {
    name: 'DASN-SIMEI';
    dueDate: 'May 31st';
    requirement: 'declare annual revenue';
    penalty: 'R$ 50,00 for late filing';
  };
  
  exemptions: {
    federalTaxes: ['IRPJ', 'PIS', 'COFINS', 'IPI', 'CSLL'];
    conditions: 'revenue within limit and compliant activities';
  };
  
  monthlyReport: {
    name: 'Relatório Mensal das Receitas Brutas';
    requirement: 'record all revenue by customer type';
    retention: 'minimum 5 years';
  };
}
```

### 2. Simples Nacional
**Revenue Limit**: R$ 4.800.000,00 annually (2025)
**Sublimits**: 
- General: R$ 4.800.000,00
- Export: additional R$ 4.800.000,00

#### Simples Nacional Annexes & Tax Rates

##### Annex I - Commerce
```typescript
interface AnexoIRates {
  faixas: [
    { receita: 'até R$ 180.000,00', aliquota: '4,00%', deducao: 'R$ 0,00' },
    { receita: 'de R$ 180.000,01 a R$ 360.000,00', aliquota: '7,30%', deducao: 'R$ 5.940,00' },
    { receita: 'de R$ 360.000,01 a R$ 720.000,00', aliquota: '9,50%', deducao: 'R$ 13.860,00' },
    { receita: 'de R$ 720.000,01 a R$ 1.800.000,00', aliquota: '10,70%', deducao: 'R$ 22.500,00' },
    { receita: 'de R$ 1.800.000,01 a R$ 3.600.000,00', aliquota: '14,30%', deducao: 'R$ 87.300,00' },
    { receita: 'de R$ 3.600.000,01 a R$ 4.800.000,00', aliquota: '19,00%', deducao: 'R$ 378.000,00' }
  ];
  
  impostos: ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'CPP', 'ICMS'];
}
```

##### Annex II - Industry
```typescript
interface AnexoIIRates {
  faixas: [
    { receita: 'até R$ 180.000,00', aliquota: '4,50%', deducao: 'R$ 0,00' },
    { receita: 'de R$ 180.000,01 a R$ 360.000,00', aliquota: '7,80%', deducao: 'R$ 5.940,00' },
    { receita: 'de R$ 360.000,01 a R$ 720.000,00', aliquota: '10,00%', deducao: 'R$ 13.860,00' },
    { receita: 'de R$ 720.000,01 a R$ 1.800.000,00', aliquota: '11,20%', deducao: 'R$ 22.500,00' },
    { receita: 'de R$ 1.800.000,01 a R$ 3.600.000,00', aliquota: '14,70%', deducao: 'R$ 85.500,00' },
    { receita: 'de R$ 3.600.000,01 a R$ 4.800.000,00', aliquota: '30,00%', deducao: 'R$ 720.000,00' }
  ];
  
  impostos: ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'CPP', 'IPI', 'ICMS'];
}
```

##### Annex III - Services with Labor Factor
```typescript
interface AnexoIIIRates {
  faixas: [
    { receita: 'até R$ 180.000,00', aliquota: '6,00%', deducao: 'R$ 0,00' },
    { receita: 'de R$ 180.000,01 a R$ 360.000,00', aliquota: '11,20%', deducao: 'R$ 9.360,00' },
    { receita: 'de R$ 360.000,01 a R$ 720.000,00', aliquota: '13,50%', deducao: 'R$ 17.640,00' },
    { receita: 'de R$ 720.000,01 a R$ 1.800.000,00', aliquota: '16,00%', deducao: 'R$ 35.640,00' },
    { receita: 'de R$ 1.800.000,01 a R$ 3.600.000,00', aliquota: '21,00%', deducao: 'R$ 125.640,00' },
    { receita: 'de R$ 3.600.000,01 a R$ 4.800.000,00', aliquota: '33,00%', deducao: 'R$ 648.000,00' }
  ];
  
  impostos: ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'CPP', 'ISS'];
  fatorR: 'aplicável quando (massa salarial + encargos) / receita bruta ≥ 28%';
}
```

##### Annex IV - Services without Labor Factor
```typescript
interface AnexoIVRates {
  faixas: [
    { receita: 'até R$ 180.000,00', aliquota: '4,50%', deducao: 'R$ 0,00' },
    { receita: 'de R$ 180.000,01 a R$ 360.000,00', aliquota: '9,00%', deducao: 'R$ 8.100,00' },
    { receita: 'de R$ 360.000,01 a R$ 720.000,00', aliquota: '10,20%', deducao: 'R$ 12.420,00' },
    { receita: 'de R$ 720.000,01 a R$ 1.800.000,00', aliquota: '14,00%', deducao: 'R$ 39.780,00' },
    { receita: 'de R$ 1.800.000,01 a R$ 3.600.000,00', aliquota: '22,00%', deducao: 'R$ 183.780,00' },
    { receita: 'de R$ 3.600.000,01 a R$ 4.800.000,00', aliquota: '33,00%', deducao: 'R$ 828.000,00' }
  ];
  
  impostos: ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'ISS'];
}
```

##### Annex V - Professional Services
```typescript
interface AnexoVRates {
  faixas: [
    { receita: 'até R$ 180.000,00', aliquota: '15,50%', deducao: 'R$ 0,00' },
    { receita: 'de R$ 180.000,01 a R$ 360.000,00', aliquota: '18,00%', deducao: 'R$ 4.500,00' },
    { receita: 'de R$ 360.000,01 a R$ 720.000,00', aliquota: '19,50%', deducao: 'R$ 9.900,00' },
    { receita: 'de R$ 720.000,01 a R$ 1.800.000,00', aliquota: '20,50%', deducao: 'R$ 17.100,00' },
    { receita: 'de R$ 1.800.000,01 a R$ 3.600.000,00', aliquota: '23,00%', deducao: 'R$ 62.100,00' },
    { receita: 'de R$ 3.600.000,01 a R$ 4.800.000,00', aliquota: '30,50%', deducao: 'R$ 540.000,00' }
  ];
  
  impostos: ['IRPJ', 'CSLL', 'PIS', 'COFINS', 'CPP', 'ISS'];
  restrictions: 'applies to specific professional services listed in law';
}
```

#### DAS Calculation Formula
```typescript
function calculateDAS(
  receitaBruta12Meses: number,
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V',
  fatorR?: number
): DASCalculation {
  const tabela = getTabelaSimples(anexo);
  const faixa = findFaixaReceita(receitaBruta12Meses, tabela);
  
  let aliquotaEfetiva = (receitaBruta12Meses * faixa.aliquota - faixa.deducao) / receitaBruta12Meses;
  
  // Apply Fator R for Annex III if applicable
  if (anexo === 'III' && fatorR && fatorR < 0.28) {
    // Use Annex V rates instead
    const tabelaV = getTabelaSimples('V');
    const faixaV = findFaixaReceita(receitaBruta12Meses, tabelaV);
    aliquotaEfetiva = (receitaBruta12Meses * faixaV.aliquota - faixaV.deducao) / receitaBruta12Meses;
  }
  
  const receitaMensal = getReceitaMensalCalculation();
  const valorDAS = receitaMensal * aliquotaEfetiva;
  
  return {
    aliquotaEfetiva,
    valorDAS,
    receitaMensal,
    faixaAplicada: faixa,
    vencimento: getDataVencimentoDAS()
  };
}
```

### 3. Lucro Presumido
**Revenue Limit**: Up to R$ 78.000.000,00 annually
**Tax Base**: Presumed profit percentages

#### Lucro Presumido Tax Rates
```typescript
interface LucroPresumidoRates {
  IRPJ: {
    rate: '15%';
    additionalRate: '10% on profit exceeding R$ 20.000,00 monthly';
    presumedProfitRate: {
      comercio: '8%',
      industria: '8%',
      servicos: '32%',
      transportes: '16%',
      construcao: '8%'
    };
  };
  
  CSLL: {
    rate: '9%';
    presumedProfitRate: {
      comercio: '12%',
      industria: '12%',
      servicos: '32%',
      transportes: '12%',
      construcao: '12%'
    };
  };
  
  PIS: {
    rate: '0,65%';
    baseCalculation: 'gross_revenue';
    regime: 'cumulativo';
  };
  
  COFINS: {
    rate: '3,00%';
    baseCalculation: 'gross_revenue';
    regime: 'cumulativo';
  };
}
```

#### Quarterly Calculation Example
```typescript
function calculateLucroPresumido(
  receitaTrimestral: number,
  atividade: string
): LucroPresumidoCalculation {
  const rates = getLucroPresumidoRates(atividade);
  
  // IRPJ Calculation
  const lucroPresumidoIRPJ = receitaTrimestral * rates.IRPJ.presumedProfitRate;
  const irpjBase = Math.min(lucroPresumidoIRPJ, 60000); // R$ 20k monthly * 3 months
  const irpjNormal = irpjBase * 0.15;
  const irpjAdicional = Math.max(lucroPresumidoIRPJ - 60000, 0) * 0.10;
  const totalIRPJ = irpjNormal + irpjAdicional;
  
  // CSLL Calculation
  const lucroPresumidoCSLL = receitaTrimestral * rates.CSLL.presumedProfitRate;
  const totalCSLL = lucroPresumidoCSLL * 0.09;
  
  // PIS/COFINS Calculation (monthly)
  const totalPIS = receitaTrimestral * 0.0065;
  const totalCOFINS = receitaTrimestral * 0.03;
  
  return {
    IRPJ: totalIRPJ,
    CSLL: totalCSLL,
    PIS: totalPIS,
    COFINS: totalCOFINS,
    total: totalIRPJ + totalCSLL + totalPIS + totalCOFINS,
    vencimentos: getVencimentosLucroPresumido()
  };
}
```

### 4. Lucro Real
**No Revenue Limit**: Mandatory for companies with revenue > R$ 78 million
**Tax Base**: Actual profit with adjustments

#### Lucro Real Characteristics
```typescript
interface LucroRealObligations {
  bookkeeping: {
    required: 'complete_accounting_records';
    method: 'double_entry_bookkeeping';
    books: ['diario', 'razao', 'inventario', 'lalur'];
  };
  
  taxCalculation: {
    IRPJ: {
      rate: '15%';
      additionalRate: '10% on profit exceeding R$ 20.000,00 monthly';
      baseCalculation: 'accounting_profit_with_adjustments';
    };
    
    CSLL: {
      rate: '9%'; // Most activities
      rateFinancial: '20%'; // Financial institutions
      baseCalculation: 'accounting_profit_with_adjustments';
    };
    
    PIS: {
      rate: '1,65%';
      regime: 'nao_cumulativo';
      credits: 'allowed_on_inputs';
    };
    
    COFINS: {
      rate: '7,60%';
      regime: 'nao_cumulativo';
      credits: 'allowed_on_inputs';
    };
  };
  
  obligations: {
    ECF: 'annual_income_tax_return';
    EFDContribuicoes: 'monthly_pis_cofins_return';
    SPEDFiscal: 'monthly_icms_ipi_return';
    DCTF: 'monthly_federal_tax_return';
  };
}
```

## State and Municipal Taxes

### ICMS (State VAT)
```typescript
interface ICMSRules {
  responsibility: 'state_government';
  applies: ['goods_circulation', 'transport_services', 'communication_services'];
  
  rates: {
    internal: 'varies_by_state_7%_to_25%';
    interstate: {
      'north_northeast_center_west': '7%',
      'south_southeast': '12%'
    };
    imported: 'state_internal_rate';
  };
  
  regimes: {
    realPayment: 'lucro_real_companies';
    estimation: 'simples_nacional_companies';
    substitution: 'specific_products_and_chains';
  };
  
  obligations: {
    GIA: 'monthly_state_return';
    SPEDFiscal: 'monthly_digital_bookkeeping';
    NFe: 'electronic_invoice_mandatory';
  };
}
```

### ISS (Municipal Service Tax)
```typescript
interface ISSRules {
  responsibility: 'municipal_government';
  applies: ['services_listed_in_law'];
  
  rates: {
    minimum: '2%';
    maximum: '5%';
    varies: 'by_municipality_and_service_type';
  };
  
  collection: {
    location: 'where_service_is_provided';
    exceptions: ['construction', 'surveillance', 'cleaning'];
  };
  
  obligations: {
    monthly: 'iss_return_varies_by_municipality';
    electronic: 'nfse_electronic_service_invoice';
  };
}
```

## Federal Tax Deadlines 2025

### Monthly Obligations
```typescript
interface MonthlyDeadlines {
  FGTS: {
    dueDate: '7th_working_day';
    description: 'employment_compensation_fund';
    applies: 'companies_with_employees';
  };
  
  GPS: {
    dueDate: '20th_of_following_month';
    description: 'social_security_payment';
    applies: 'companies_with_employees_or_partners';
  };
  
  DCTF: {
    dueDate: '15th_working_day';
    description: 'federal_tax_return';
    applies: 'lucro_real_and_presumido_companies';
  };
  
  simpleslNacional: {
    dueDate: '20th_of_following_month';
    description: 'unified_tax_payment_das';
    applies: 'simples_nacional_companies';
  };
}
```

### Quarterly Obligations
```typescript
interface QuarterlyDeadlines {
  IRPJ_CSLL: {
    dueDate: 'last_working_day_of_following_month';
    periods: ['31/01', '30/04', '31/07', '31/10'];
    applies: 'lucro_presumido_companies';
  };
  
  defeso: {
    dueDate: 'varies_by_activity';
    description: 'seasonal_unemployment_insurance';
    applies: 'specific_seasonal_activities';
  };
}
```

### Annual Obligations
```typescript
interface AnnualDeadlines2025 {
  ECF: {
    dueDate: '2025-07-31';
    description: 'corporate_income_tax_return';
    applies: 'all_legal_entities';
  };
  
  RAIS: {
    dueDate: '2025-03-31';
    description: 'annual_social_information_report';
    applies: 'companies_with_employees';
  };
  
  DIRF: {
    dueDate: '2025-02-28';
    description: 'withholding_tax_return';
    applies: 'companies_that_withhold_taxes';
  };
  
  DASN_SIMEI: {
    dueDate: '2025-05-31';
    description: 'mei_annual_declaration';
    applies: 'mei_entrepreneurs';
  };
  
  defis: {
    dueDate: '2025-03-31';
    description: 'simples_nacional_annual_return';
    applies: 'simples_nacional_companies';
  };
}
```

## Calculation Functions for AI Implementation

### Universal DAS Calculator
```typescript
function calculateTaxes(
  empresaData: EmpresaData,
  periodo: string,
  tipoCalculo: TaxType
): TaxCalculationResult {
  
  switch (empresaData.regimeTributario) {
    case 'MEI':
      return calculateMEI(empresaData, periodo);
      
    case 'Simples Nacional':
      return calculateSimplesNacional(
        empresaData, 
        periodo, 
        empresaData.anexoSimples
      );
      
    case 'Lucro Presumido':
      return calculateLucroPresumido(
        empresaData, 
        periodo, 
        tipoCalculo
      );
      
    case 'Lucro Real':
      return calculateLucroReal(
        empresaData, 
        periodo, 
        tipoCalculo
      );
      
    default:
      throw new Error('Regime tributário não reconhecido');
  }
}
```

### Deadline Calculator
```typescript
function getNextDeadlines(
  empresaData: EmpresaData,
  currentDate: Date = new Date()
): FiscalDeadline[] {
  const deadlines: FiscalDeadline[] = [];
  
  // Add regime-specific deadlines
  if (empresaData.regimeTributario === 'MEI') {
    deadlines.push(getMEIDeadlines(currentDate));
  } else if (empresaData.regimeTributario === 'Simples Nacional') {
    deadlines.push(getSimplesDeadlines(currentDate));
  } else {
    deadlines.push(getLucroDeadlines(currentDate, empresaData.regimeTributario));
  }
  
  // Add employee-related deadlines if applicable
  if (empresaData.temFuncionarios) {
    deadlines.push(getEmployeeDeadlines(currentDate));
  }
  
  // Add state/municipal deadlines
  deadlines.push(getStateDeadlines(currentDate, empresaData.uf));
  deadlines.push(getMunicipalDeadlines(currentDate, empresaData.municipio));
  
  return deadlines
    .filter(deadline => deadline.dataVencimento >= currentDate)
    .sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime())
    .slice(0, 10); // Next 10 deadlines
}
```

## Compliance Validation Rules

### CNPJ Validation
```typescript
function validateCNPJ(cnpj: string): ValidationResult {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  if (cleanCNPJ.length !== 14) {
    return { valid: false, error: 'CNPJ deve ter 14 dígitos' };
  }
  
  // Check calculation digits
  const digits = cleanCNPJ.split('').map(Number);
  const firstDigit = calculateCNPJDigit(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const secondDigit = calculateCNPJDigit(digits.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  
  if (digits[12] !== firstDigit || digits[13] !== secondDigit) {
    return { valid: false, error: 'CNPJ inválido - dígitos verificadores incorretos' };
  }
  
  return { valid: true };
}
```

### Tax Rate Validation
```typescript
function validateTaxRates(
  regimeTributario: string,
  atividade: string,
  receita12Meses: number
): ValidationResult {
  
  // Check revenue limits
  const limits = getRevenueLimits();
  
  if (regimeTributario === 'MEI' && receita12Meses > limits.MEI) {
    return {
      valid: false,
      error: 'Receita excede limite do MEI',
      suggestion: 'Migrar para Simples Nacional'
    };
  }
  
  if (regimeTributario === 'Simples Nacional' && receita12Meses > limits.SimplesNacional) {
    return {
      valid: false,
      error: 'Receita excede limite do Simples Nacional',
      suggestion: 'Migrar para Lucro Presumido ou Real'
    };
  }
  
  // Validate activity compatibility
  const allowedActivities = getAllowedActivities(regimeTributario);
  if (!allowedActivities.includes(atividade)) {
    return {
      valid: false,
      error: 'Atividade não permitida no regime tributário',
      suggestion: 'Verificar CNAE e regime adequado'
    };
  }
  
  return { valid: true };
}
```

## Recent Regulatory Changes (2025)

### Key Updates
```typescript
interface RegulatoryUpdates2025 {
  meiLimit: {
    previous: 'R$ 81.000,00',
    current: 'R$ 81.000,00',
    effective: '2025-01-01',
    note: 'limit_maintained_for_2025'
  };
  
  simplesNacional: {
    changes: [
      'new_annex_iii_calculation_methodology',
      'updated_presumed_profit_rates',
      'enhanced_fator_r_rules'
    ];
    effective: '2025-01-01'
  };
  
  digitalObligations: {
    pix: 'mandatory_reporting_for_transactions_above_R$5000',
    nfe: 'new_validation_rules_for_xml_structure',
    sped: 'enhanced_cross_validation_requirements'
  };
  
  penalties: {
    inflation_adjustment: '4.62%_increase_in_fines',
    new_deadlines: 'stricter_enforcement_mechanisms'
  };
}
```

---

*This guide serves as the authoritative reference for Brazilian tax regulations within the ContabilidadePRO system. All AI agents must reference this document for accurate tax calculations and compliance advice.*

**Regulatory Version**: 2025.1  
**Last Updated**: January 2025  
**Next Review**: April 2025  
**Legal Disclaimer**: This guide is for informational purposes. Always consult current legislation and qualified professionals for specific cases.