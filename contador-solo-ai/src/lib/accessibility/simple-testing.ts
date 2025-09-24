/**
 * Testes de Acessibilidade Simplificados
 * Usa jest-axe ao invés de sistema customizado
 */

import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// =====================================================
// CONFIGURAÇÃO PADRÃO DO AXE
// =====================================================

export const defaultAxeConfig = {
  rules: {
    // Regras essenciais WCAG 2.1 AA
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-visible': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-unique': { enabled: true },
    'skip-link': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
}

// =====================================================
// FUNÇÕES DE TESTE SIMPLIFICADAS
// =====================================================

/**
 * Testa acessibilidade de um elemento usando axe-core
 */
export async function testAccessibility(
  element: HTMLElement | Document = document,
  config = defaultAxeConfig
) {
  const results = await axe(element as Element, config)
  expect(results).toHaveNoViolations()
  return results
}

/**
 * Testa acessibilidade com relatório detalhado
 */
export async function testAccessibilityWithReport(
  element: HTMLElement | Document = document,
  config = defaultAxeConfig
) {
  const results = await axe(element as Element, config)
  
  const report = {
    violations: results.violations.length,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inapplicable: results.inapplicable.length,
    score: calculateAccessibilityScore(results),
    details: results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length
    }))
  }

  return { results, report }
}

/**
 * Calcula score de acessibilidade (0-100)
 */
function calculateAccessibilityScore(results: any): number {
  const total = results.violations.length + results.passes.length
  if (total === 0) return 100
  
  const score = (results.passes.length / total) * 100
  return Math.round(score)
}

// =====================================================
// HELPERS PARA TESTES ESPECÍFICOS
// =====================================================

/**
 * Testa se elemento tem foco visível
 */
export function testFocusVisible(element: HTMLElement): boolean {
  element.focus()
  const computedStyle = window.getComputedStyle(element, ':focus')
  
  // Verifica se há outline ou box-shadow visível
  const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px'
  const hasBoxShadow = computedStyle.boxShadow !== 'none'
  
  return hasOutline || hasBoxShadow
}

/**
 * Testa navegação por teclado
 */
export function testKeyboardNavigation(container: HTMLElement): {
  focusableElements: number
  canNavigate: boolean
} {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const elements = Array.from(focusableElements) as HTMLElement[]
  let canNavigate = true
  
  // Testa se todos os elementos são focáveis
  for (const element of elements) {
    element.focus()
    if (document.activeElement !== element) {
      canNavigate = false
      break
    }
  }
  
  return {
    focusableElements: elements.length,
    canNavigate
  }
}

/**
 * Testa contraste de cores (simplificado)
 */
export function testColorContrast(element: HTMLElement): {
  hasGoodContrast: boolean
  ratio?: number
} {
  const style = window.getComputedStyle(element)
  const color = style.color
  const backgroundColor = style.backgroundColor
  
  // Se não conseguir obter as cores, assume que está OK
  if (!color || !backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)') {
    return { hasGoodContrast: true }
  }
  
  // Cálculo simplificado - em produção usar biblioteca específica
  const colorLuminance = getRelativeLuminance(color)
  const bgLuminance = getRelativeLuminance(backgroundColor)
  
  const ratio = colorLuminance > bgLuminance 
    ? (colorLuminance + 0.05) / (bgLuminance + 0.05)
    : (bgLuminance + 0.05) / (colorLuminance + 0.05)
  
  return {
    hasGoodContrast: ratio >= 4.5, // WCAG AA
    ratio
  }
}

/**
 * Calcula luminância relativa (simplificado)
 */
function getRelativeLuminance(color: string): number {
  // Implementação muito simplificada
  // Em produção, usar biblioteca como 'color' ou 'chroma-js'
  const rgb = color.match(/\d+/g)
  if (!rgb) return 0.5
  
  const [r, g, b] = rgb.map(x => {
    const val = parseInt(x) / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// =====================================================
// UTILITÁRIOS PARA TESTES
// =====================================================

/**
 * Renderiza componente com providers necessários para testes
 */
export function renderWithAccessibility(component: React.ReactElement) {
  const { render } = require('@testing-library/react')
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const { AccessibilityProvider } = require('./simple-accessibility')
    return React.createElement(AccessibilityProvider, null, children)
  }
  
  const result = render(component, { wrapper: Wrapper })
  
  return {
    ...result,
    // Helper para testar acessibilidade
    testA11y: async () => testAccessibility(result.container)
  }
}

/**
 * Mock para testes que precisam de DOM APIs
 */
export function setupAccessibilityMocks() {
  // Mock para matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
  
  // Mock para getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
      outline: 'none',
      boxShadow: 'none'
    }))
  })
}

// =====================================================
// EXEMPLO DE USO EM TESTES
// =====================================================

/*
// Em um arquivo de teste:

import { testAccessibility, renderWithAccessibility } from '@/lib/accessibility/simple-testing'
import { MyComponent } from './MyComponent'

describe('MyComponent Accessibility', () => {
  it('should be accessible', async () => {
    const { container, testA11y } = renderWithAccessibility(<MyComponent />)
    await testA11y()
  })
  
  it('should have good color contrast', () => {
    const { container } = renderWithAccessibility(<MyComponent />)
    const button = container.querySelector('button')
    const contrast = testColorContrast(button)
    expect(contrast.hasGoodContrast).toBe(true)
  })
})
*/
