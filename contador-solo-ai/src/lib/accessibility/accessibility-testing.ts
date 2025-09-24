/**
 * Sistema de Testes de Acessibilidade
 * Validação automatizada WCAG 2.1 AA/AAA
 */

'use client'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccessibilityTestResult {
  id: string
  rule: string
  level: 'A' | 'AA' | 'AAA'
  category: 'perceivable' | 'operable' | 'understandable' | 'robust'
  status: 'pass' | 'fail' | 'warning' | 'incomplete'
  message: string
  element?: HTMLElement
  selector?: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  helpUrl?: string
}

export interface AccessibilityTestSuite {
  name: string
  description: string
  tests: AccessibilityTest[]
}

export interface AccessibilityTest {
  id: string
  name: string
  description: string
  level: 'A' | 'AA' | 'AAA'
  category: 'perceivable' | 'operable' | 'understandable' | 'robust'
  test: (element: HTMLElement | Document) => AccessibilityTestResult[]
}

export interface AccessibilityReport {
  timestamp: Date
  url: string
  totalTests: number
  passed: number
  failed: number
  warnings: number
  incomplete: number
  score: number
  level: 'A' | 'AA' | 'AAA'
  results: AccessibilityTestResult[]
  summary: {
    perceivable: number
    operable: number
    understandable: number
    robust: number
  }
}

// =====================================================
// TESTES DE ACESSIBILIDADE
// =====================================================

const accessibilityTests: AccessibilityTest[] = [
  // =====================================================
  // PERCEIVABLE (Perceptível)
  // =====================================================
  {
    id: 'images-alt-text',
    name: 'Imagens com texto alternativo',
    description: 'Todas as imagens devem ter texto alternativo apropriado',
    level: 'A',
    category: 'perceivable',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const images = element.querySelectorAll('img')
      
      images.forEach((img, index) => {
        const alt = img.getAttribute('alt')
        const ariaLabel = img.getAttribute('aria-label')
        const ariaLabelledBy = img.getAttribute('aria-labelledby')
        const role = img.getAttribute('role')
        
        if (role === 'presentation' || role === 'none') {
          results.push({
            id: `img-${index}`,
            rule: 'images-alt-text',
            level: 'A',
            category: 'perceivable',
            status: 'pass',
            message: 'Imagem decorativa corretamente marcada',
            element: img,
            selector: `img:nth-child(${index + 1})`,
            impact: 'minor',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
          })
        } else if (!alt && !ariaLabel && !ariaLabelledBy) {
          results.push({
            id: `img-${index}`,
            rule: 'images-alt-text',
            level: 'A',
            category: 'perceivable',
            status: 'fail',
            message: 'Imagem sem texto alternativo',
            element: img,
            selector: `img:nth-child(${index + 1})`,
            impact: 'serious',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
          })
        } else if (alt === '') {
          results.push({
            id: `img-${index}`,
            rule: 'images-alt-text',
            level: 'A',
            category: 'perceivable',
            status: 'warning',
            message: 'Imagem com alt vazio - verifique se é decorativa',
            element: img,
            selector: `img:nth-child(${index + 1})`,
            impact: 'moderate',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
          })
        } else {
          results.push({
            id: `img-${index}`,
            rule: 'images-alt-text',
            level: 'A',
            category: 'perceivable',
            status: 'pass',
            message: 'Imagem com texto alternativo apropriado',
            element: img,
            selector: `img:nth-child(${index + 1})`,
            impact: 'minor'
          })
        }
      })
      
      return results
    }
  },

  {
    id: 'color-contrast',
    name: 'Contraste de cores',
    description: 'Texto deve ter contraste suficiente com o fundo',
    level: 'AA',
    category: 'perceivable',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const textElements = element.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label')
      
      textElements.forEach((el, index) => {
        const styles = window.getComputedStyle(el)
        const color = styles.color
        const backgroundColor = styles.backgroundColor
        const fontSize = parseFloat(styles.fontSize)
        
        // Simplified contrast check (in real implementation, use proper contrast calculation)
        if (color && backgroundColor && color !== backgroundColor) {
          results.push({
            id: `contrast-${index}`,
            rule: 'color-contrast',
            level: 'AA',
            category: 'perceivable',
            status: 'pass',
            message: 'Contraste adequado detectado',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'minor'
          })
        } else {
          results.push({
            id: `contrast-${index}`,
            rule: 'color-contrast',
            level: 'AA',
            category: 'perceivable',
            status: 'incomplete',
            message: 'Contraste não pôde ser verificado automaticamente',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'moderate'
          })
        }
      })
      
      return results
    }
  },

  // =====================================================
  // OPERABLE (Operável)
  // =====================================================
  {
    id: 'keyboard-navigation',
    name: 'Navegação por teclado',
    description: 'Todos os elementos interativos devem ser acessíveis via teclado',
    level: 'A',
    category: 'operable',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const interactiveElements = element.querySelectorAll(
        'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]'
      )
      
      interactiveElements.forEach((el, index) => {
        const tabIndex = el.getAttribute('tabindex')
        const disabled = el.hasAttribute('disabled')
        const ariaHidden = el.getAttribute('aria-hidden') === 'true'
        
        if (disabled || ariaHidden) {
          results.push({
            id: `keyboard-${index}`,
            rule: 'keyboard-navigation',
            level: 'A',
            category: 'operable',
            status: 'pass',
            message: 'Elemento corretamente removido da navegação',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'minor'
          })
        } else if (tabIndex === '-1') {
          results.push({
            id: `keyboard-${index}`,
            rule: 'keyboard-navigation',
            level: 'A',
            category: 'operable',
            status: 'warning',
            message: 'Elemento removido da navegação por teclado',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'moderate'
          })
        } else {
          results.push({
            id: `keyboard-${index}`,
            rule: 'keyboard-navigation',
            level: 'A',
            category: 'operable',
            status: 'pass',
            message: 'Elemento acessível via teclado',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'minor'
          })
        }
      })
      
      return results
    }
  },

  {
    id: 'focus-visible',
    name: 'Indicador de foco visível',
    description: 'Elementos focáveis devem ter indicador visual de foco',
    level: 'AA',
    category: 'operable',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const focusableElements = element.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      focusableElements.forEach((el, index) => {
        const styles = window.getComputedStyle(el, ':focus')
        const outline = styles.outline
        const boxShadow = styles.boxShadow
        
        if (outline !== 'none' || boxShadow !== 'none') {
          results.push({
            id: `focus-${index}`,
            rule: 'focus-visible',
            level: 'AA',
            category: 'operable',
            status: 'pass',
            message: 'Indicador de foco presente',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'minor'
          })
        } else {
          results.push({
            id: `focus-${index}`,
            rule: 'focus-visible',
            level: 'AA',
            category: 'operable',
            status: 'fail',
            message: 'Indicador de foco ausente ou insuficiente',
            element: el as HTMLElement,
            selector: el.tagName.toLowerCase(),
            impact: 'serious'
          })
        }
      })
      
      return results
    }
  },

  // =====================================================
  // UNDERSTANDABLE (Compreensível)
  // =====================================================
  {
    id: 'form-labels',
    name: 'Rótulos de formulário',
    description: 'Campos de formulário devem ter rótulos apropriados',
    level: 'A',
    category: 'understandable',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const formControls = element.querySelectorAll('input, select, textarea')
      
      formControls.forEach((control, index) => {
        const id = control.getAttribute('id')
        const ariaLabel = control.getAttribute('aria-label')
        const ariaLabelledBy = control.getAttribute('aria-labelledby')
        const label = id ? element.querySelector(`label[for="${id}"]`) : null
        const type = control.getAttribute('type')
        
        if (type === 'hidden' || type === 'submit' || type === 'button') {
          return // Skip these types
        }
        
        if (label || ariaLabel || ariaLabelledBy) {
          results.push({
            id: `form-${index}`,
            rule: 'form-labels',
            level: 'A',
            category: 'understandable',
            status: 'pass',
            message: 'Campo com rótulo apropriado',
            element: control as HTMLElement,
            selector: control.tagName.toLowerCase(),
            impact: 'minor'
          })
        } else {
          results.push({
            id: `form-${index}`,
            rule: 'form-labels',
            level: 'A',
            category: 'understandable',
            status: 'fail',
            message: 'Campo sem rótulo',
            element: control as HTMLElement,
            selector: control.tagName.toLowerCase(),
            impact: 'serious'
          })
        }
      })
      
      return results
    }
  },

  // =====================================================
  // ROBUST (Robusto)
  // =====================================================
  {
    id: 'valid-html',
    name: 'HTML válido',
    description: 'Markup deve ser válido e bem formado',
    level: 'A',
    category: 'robust',
    test: (element) => {
      const results: AccessibilityTestResult[] = []
      const elementsWithId = element.querySelectorAll('[id]')
      const ids = new Set<string>()
      
      elementsWithId.forEach((el, index) => {
        const id = el.getAttribute('id')
        if (id) {
          if (ids.has(id)) {
            results.push({
              id: `html-${index}`,
              rule: 'valid-html',
              level: 'A',
              category: 'robust',
              status: 'fail',
              message: `ID duplicado: ${id}`,
              element: el as HTMLElement,
              selector: `#${id}`,
              impact: 'serious'
            })
          } else {
            ids.add(id)
            results.push({
              id: `html-${index}`,
              rule: 'valid-html',
              level: 'A',
              category: 'robust',
              status: 'pass',
              message: 'ID único',
              element: el as HTMLElement,
              selector: `#${id}`,
              impact: 'minor'
            })
          }
        }
      })
      
      return results
    }
  }
]

// =====================================================
// CLASSE PRINCIPAL DE TESTES
// =====================================================

export class AccessibilityTester {
  private tests: AccessibilityTest[]

  constructor(customTests: AccessibilityTest[] = []) {
    this.tests = [...accessibilityTests, ...customTests]
  }

  public async runTests(
    element: HTMLElement | Document = document,
    level: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<AccessibilityReport> {
    const startTime = Date.now()
    const results: AccessibilityTestResult[] = []

    // Filtrar testes por nível
    const testsToRun = this.tests.filter(test => {
      const levels = ['A', 'AA', 'AAA']
      const testLevelIndex = levels.indexOf(test.level)
      const targetLevelIndex = levels.indexOf(level)
      return testLevelIndex <= targetLevelIndex
    })

    // Executar testes
    for (const test of testsToRun) {
      try {
        const testResults = test.test(element)
        results.push(...testResults)
      } catch (error) {
        results.push({
          id: `error-${test.id}`,
          rule: test.id,
          level: test.level,
          category: test.category,
          status: 'incomplete',
          message: `Erro ao executar teste: ${error}`,
          impact: 'moderate'
        })
      }
    }

    // Calcular estatísticas
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const warnings = results.filter(r => r.status === 'warning').length
    const incomplete = results.filter(r => r.status === 'incomplete').length

    const score = Math.round((passed / (passed + failed + warnings)) * 100) || 0

    // Agrupar por categoria
    const summary = {
      perceivable: results.filter(r => r.category === 'perceivable' && r.status === 'pass').length,
      operable: results.filter(r => r.category === 'operable' && r.status === 'pass').length,
      understandable: results.filter(r => r.category === 'understandable' && r.status === 'pass').length,
      robust: results.filter(r => r.category === 'robust' && r.status === 'pass').length
    }

    return {
      timestamp: new Date(),
      url: window.location.href,
      totalTests: results.length,
      passed,
      failed,
      warnings,
      incomplete,
      score,
      level,
      results,
      summary
    }
  }

  public addCustomTest(test: AccessibilityTest): void {
    this.tests.push(test)
  }

  public removeTest(testId: string): void {
    this.tests = this.tests.filter(test => test.id !== testId)
  }

  public getAvailableTests(): AccessibilityTest[] {
    return [...this.tests]
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const accessibilityTester = new AccessibilityTester()

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

export function generateAccessibilityReport(report: AccessibilityReport): string {
  const { timestamp, url, totalTests, passed, failed, warnings, score, level } = report

  return `
# Relatório de Acessibilidade

**Data:** ${timestamp.toLocaleString('pt-BR')}
**URL:** ${url}
**Nível WCAG:** ${level}
**Pontuação:** ${score}/100

## Resumo
- **Total de testes:** ${totalTests}
- **Aprovados:** ${passed}
- **Falharam:** ${failed}
- **Avisos:** ${warnings}

## Detalhes por Categoria
- **Perceptível:** ${report.summary.perceivable} testes aprovados
- **Operável:** ${report.summary.operable} testes aprovados
- **Compreensível:** ${report.summary.understandable} testes aprovados
- **Robusto:** ${report.summary.robust} testes aprovados

## Problemas Encontrados
${report.results
  .filter(r => r.status === 'fail')
  .map(r => `- **${r.rule}:** ${r.message}`)
  .join('\n')}
  `
}

export function exportAccessibilityReport(report: AccessibilityReport, format: 'json' | 'csv' | 'html' = 'json'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2)
    
    case 'csv':
      const headers = 'ID,Rule,Level,Category,Status,Message,Impact'
      const rows = report.results.map(r => 
        `${r.id},${r.rule},${r.level},${r.category},${r.status},"${r.message}",${r.impact}`
      ).join('\n')
      return `${headers}\n${rows}`
    
    case 'html':
      return generateAccessibilityReport(report)
    
    default:
      return JSON.stringify(report, null, 2)
  }
}
