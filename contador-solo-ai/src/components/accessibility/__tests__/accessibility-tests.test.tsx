/**
 * Testes de Acessibilidade - Suite de Testes
 * Validação automatizada dos componentes de acessibilidade
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

import { AccessibilityPanel } from '../accessibility-panel'
import { SkipLinks } from '../skip-links'
import { KeyboardShortcutsModal } from '../keyboard-shortcuts-modal'
import { AccessibleButton } from '../../design-system/accessible-button'
import { AccessibleInput } from '../../design-system/accessible-form'
import { accessibilityTester } from '../../../lib/accessibility/accessibility-testing'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// =====================================================
// SETUP E HELPERS
// =====================================================

const renderWithAccessibility = (component: React.ReactElement) => {
  const result = render(component)
  return {
    ...result,
    runAxeTest: async () => {
      const results = await axe(result.container)
      expect(results).toHaveNoViolations()
      return results
    }
  }
}

// Mock do useAccessibility hook
jest.mock('../../../lib/accessibility/accessibility-manager', () => ({
  useAccessibility: () => ({
    settings: {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
      announcements: true,
      skipLinks: true
    },
    updateSettings: jest.fn(),
    announce: jest.fn(),
    manageFocus: jest.fn(),
    restoreFocus: jest.fn(),
    registerShortcut: jest.fn(),
    unregisterShortcut: jest.fn(),
    isScreenReaderActive: false
  }),
  accessibilityManager: {
    getSettings: () => ({
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
      announcements: true,
      skipLinks: true
    }),
    getShortcuts: () => []
  }
}))

// =====================================================
// TESTES DO PAINEL DE ACESSIBILIDADE
// =====================================================

describe('AccessibilityPanel', () => {
  it('deve renderizar sem violações de acessibilidade', async () => {
    const { runAxeTest } = renderWithAccessibility(
      <AccessibilityPanel onClose={() => {}} />
    )
    await runAxeTest()
  })

  it('deve ter estrutura ARIA correta', () => {
    render(<AccessibilityPanel onClose={() => {}} />)
    
    // Verificar título principal
    expect(screen.getByRole('heading', { name: /configurações de acessibilidade/i })).toBeInTheDocument()
    
    // Verificar tabs
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    
    // Verificar switches
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)
    
    switches.forEach(switchElement => {
      expect(switchElement).toHaveAccessibleName()
    })
  })

  it('deve suportar navegação por teclado', async () => {
    const user = userEvent.setup()
    render(<AccessibilityPanel onClose={() => {}} />)
    
    // Navegar pelas tabs
    const firstTab = screen.getAllByRole('tab')[0]
    await user.tab()
    expect(firstTab).toHaveFocus()
    
    // Navegar para próxima tab
    await user.keyboard('{ArrowRight}')
    const secondTab = screen.getAllByRole('tab')[1]
    expect(secondTab).toHaveFocus()
  })

  it('deve anunciar mudanças para screen readers', async () => {
    const user = userEvent.setup()
    render(<AccessibilityPanel onClose={() => {}} />)
    
    // Encontrar um switch e ativá-lo
    const highContrastSwitch = screen.getByRole('switch', { name: /alto contraste/i })
    await user.click(highContrastSwitch)
    
    // Verificar se há elementos com aria-live
    const liveRegions = screen.getAllByRole('status')
    expect(liveRegions.length).toBeGreaterThan(0)
  })
})

// =====================================================
// TESTES DOS SKIP LINKS
// =====================================================

describe('SkipLinks', () => {
  beforeEach(() => {
    // Criar elementos de destino
    document.body.innerHTML = `
      <div id="main-content">Conteúdo principal</div>
      <div id="main-navigation">Navegação</div>
      <div id="search-input">Busca</div>
    `
  })

  it('deve renderizar sem violações de acessibilidade', async () => {
    const { runAxeTest } = renderWithAccessibility(<SkipLinks />)
    await runAxeTest()
  })

  it('deve ter links com labels apropriados', () => {
    render(<SkipLinks />)
    
    expect(screen.getByRole('link', { name: /pular para conteúdo principal/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pular para navegação/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pular para busca/i })).toBeInTheDocument()
  })

  it('deve focar elementos de destino ao clicar', async () => {
    const user = userEvent.setup()
    render(<SkipLinks />)
    
    const mainContentLink = screen.getByRole('link', { name: /pular para conteúdo principal/i })
    await user.click(mainContentLink)
    
    const mainContent = document.getElementById('main-content')
    expect(mainContent).toHaveFocus()
  })

  it('deve suportar navegação por teclado', async () => {
    const user = userEvent.setup()
    render(<SkipLinks />)
    
    // Focar primeiro link
    await user.tab()
    const firstLink = screen.getByRole('link', { name: /pular para conteúdo principal/i })
    expect(firstLink).toHaveFocus()
    
    // Navegar com setas
    await user.keyboard('{ArrowDown}')
    const secondLink = screen.getByRole('link', { name: /pular para navegação/i })
    expect(secondLink).toHaveFocus()
  })
})

// =====================================================
// TESTES DO MODAL DE ATALHOS
// =====================================================

describe('KeyboardShortcutsModal', () => {
  it('deve renderizar sem violações de acessibilidade', async () => {
    const { runAxeTest } = renderWithAccessibility(
      <KeyboardShortcutsModal open={true} onOpenChange={() => {}} />
    )
    await runAxeTest()
  })

  it('deve ter estrutura de modal correta', () => {
    render(<KeyboardShortcutsModal open={true} onOpenChange={() => {}} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /atalhos de teclado/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('deve filtrar atalhos baseado na busca', async () => {
    const user = userEvent.setup()
    render(<KeyboardShortcutsModal open={true} onOpenChange={() => {}} />)
    
    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'navegação')
    
    // Verificar se apenas atalhos de navegação são mostrados
    await waitFor(() => {
      const shortcuts = screen.getAllByText(/navegação/i)
      expect(shortcuts.length).toBeGreaterThan(0)
    })
  })

  it('deve permitir copiar atalhos', async () => {
    const user = userEvent.setup()
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    })
    
    render(<KeyboardShortcutsModal open={true} onOpenChange={() => {}} />)
    
    const copyButtons = screen.getAllByLabelText(/copiar atalho/i)
    if (copyButtons.length > 0 && copyButtons[0]) {
      await user.click(copyButtons[0])
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    }
  })
})

// =====================================================
// TESTES DOS COMPONENTES ACESSÍVEIS
// =====================================================

describe('AccessibleButton', () => {
  it('deve renderizar sem violações de acessibilidade', async () => {
    const { runAxeTest } = renderWithAccessibility(
      <AccessibleButton>Clique aqui</AccessibleButton>
    )
    await runAxeTest()
  })

  it('deve ter estados de loading acessíveis', async () => {
    render(
      <AccessibleButton loading={true} loadingText="Carregando...">
        Salvar
      </AccessibleButton>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Carregando...')
  })

  it('deve suportar confirmação de ação', async () => {
    const user = userEvent.setup()
    const mockOnClick = jest.fn()
    
    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true)
    
    render(
      <AccessibleButton 
        onClick={mockOnClick}
        confirmAction={true}
        confirmMessage="Tem certeza?"
      >
        Deletar
      </AccessibleButton>
    )
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(window.confirm).toHaveBeenCalledWith('Tem certeza?')
    expect(mockOnClick).toHaveBeenCalled()
  })
})

describe('AccessibleInput', () => {
  it('deve renderizar sem violações de acessibilidade', async () => {
    const { runAxeTest } = renderWithAccessibility(
      <AccessibleInput 
        label="Nome"
        placeholder="Digite seu nome"
      />
    )
    await runAxeTest()
  })

  it('deve associar label corretamente', () => {
    render(
      <AccessibleInput 
        label="Email"
        required={true}
      />
    )
    
    const input = screen.getByRole('textbox', { name: /email/i })
    expect(input).toBeRequired()
    expect(input).toHaveAccessibleName()
  })

  it('deve mostrar mensagens de erro acessíveis', () => {
    render(
      <AccessibleInput 
        label="Senha"
        error="Senha muito fraca"
      />
    )
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Senha muito fraca')
  })

  it('deve suportar toggle de senha', async () => {
    const user = userEvent.setup()
    render(
      <AccessibleInput 
        type="password"
        label="Senha"
        showPasswordToggle={true}
      />
    )
    
    const input = screen.getByLabelText(/senha/i)
    expect(input).toHaveAttribute('type', 'password')
    
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i })
    await user.click(toggleButton)
    
    expect(input).toHaveAttribute('type', 'text')
  })
})

// =====================================================
// TESTES DO SISTEMA DE TESTES DE ACESSIBILIDADE
// =====================================================

describe('AccessibilityTester', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <img src="test.jpg" alt="Imagem de teste" />
        <img src="decorative.jpg" role="presentation" />
        <img src="missing-alt.jpg" />
        <button>Botão teste</button>
        <input type="text" id="test-input" />
        <label for="test-input">Campo teste</label>
      </div>
    `
  })

  it('deve detectar imagens sem alt text', async () => {
    const report = await accessibilityTester.runTests(document.body)
    
    const imageTests = report.results.filter(r => r.rule === 'images-alt-text')
    expect(imageTests.length).toBeGreaterThan(0)
    
    const failedImageTest = imageTests.find(r => r.status === 'fail')
    expect(failedImageTest).toBeDefined()
    expect(failedImageTest?.message).toContain('sem texto alternativo')
  })

  it('deve validar labels de formulário', async () => {
    const report = await accessibilityTester.runTests(document.body)
    
    const formTests = report.results.filter(r => r.rule === 'form-labels')
    expect(formTests.length).toBeGreaterThan(0)
    
    const passedFormTest = formTests.find(r => r.status === 'pass')
    expect(passedFormTest).toBeDefined()
  })

  it('deve gerar relatório com estatísticas corretas', async () => {
    const report = await accessibilityTester.runTests(document.body)
    
    expect(report.totalTests).toBeGreaterThan(0)
    expect(report.passed + report.failed + report.warnings + report.incomplete).toBe(report.totalTests)
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)
  })

  it('deve permitir adicionar testes customizados', async () => {
    const customTest = {
      id: 'custom-test',
      name: 'Teste customizado',
      description: 'Teste personalizado',
      level: 'AA' as const,
      category: 'perceivable' as const,
      test: () => [{
        id: 'custom-1',
        rule: 'custom-test',
        level: 'AA' as const,
        category: 'perceivable' as const,
        status: 'pass' as const,
        message: 'Teste customizado passou',
        impact: 'minor' as const
      }]
    }
    
    accessibilityTester.addCustomTest(customTest)
    const report = await accessibilityTester.runTests(document.body)
    
    const customResults = report.results.filter(r => r.rule === 'custom-test')
    expect(customResults.length).toBeGreaterThan(0)
  })
})
