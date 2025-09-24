/**
 * Exemplo de Uso dos Componentes Simplificados
 * Demonstra como usar as versões simplificadas dos componentes
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// =====================================================
// IMPORTS DOS COMPONENTES SIMPLIFICADOS
// =====================================================

import { 
  AccessibilityProvider, 
  useAccessibility, 
  useGlobalShortcuts,
  useKeyboardNavigation 
} from '@/lib/accessibility/simple-accessibility'

import { 
  SimpleAnalyticsProvider, 
  useSimpleAnalytics,
  useWebVitals 
} from '@/lib/analytics/simple-analytics'

import { SimpleFeedbackWidget } from '@/components/feedback/simple-feedback'

// =====================================================
// COMPONENTE DE EXEMPLO
// =====================================================

function ExampleComponent() {
  const { settings, updateSettings, announce } = useAccessibility()
  const { track, trackClick } = useSimpleAnalytics()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Usar navegação por teclado
  useKeyboardNavigation(containerRef as React.RefObject<HTMLElement>)
  
  // Usar atalhos globais
  useGlobalShortcuts()
  
  // Usar Web Vitals
  useWebVitals()

  const handleSettingChange = (setting: keyof typeof settings) => {
    const newValue = !settings[setting]
    updateSettings({ [setting]: newValue })
    announce(`${setting} ${newValue ? 'ativado' : 'desativado'}`)
    
    // Track a mudança
    track({
      name: 'accessibility_setting_changed',
      properties: { setting, value: newValue }
    })
  }

  const handleButtonClick = (buttonName: string) => {
    trackClick(buttonName, { page: 'example' })
    announce(`Botão ${buttonName} clicado`)
  }

  return (
    <div ref={containerRef} className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo de Componentes Simplificados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Configurações de Acessibilidade */}
          <div>
            <h3 className="font-semibold mb-3">Configurações de Acessibilidade</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(settings).map(([key, value]) => (
                <Button
                  key={key}
                  variant={value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange(key as keyof typeof settings)}
                  className="justify-start"
                >
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  {value && <Badge variant="secondary" className="ml-2">ON</Badge>}
                </Button>
              ))}
            </div>
          </div>

          {/* Botões de Exemplo */}
          <div>
            <h3 className="font-semibold mb-3">Botões com Analytics</h3>
            <div className="flex gap-2">
              <Button onClick={() => handleButtonClick('primary')}>
                Botão Primário
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleButtonClick('secondary')}
              >
                Botão Secundário
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleButtonClick('danger')}
              >
                Botão Perigoso
              </Button>
            </div>
          </div>

          {/* Informações do Sistema */}
          <div>
            <h3 className="font-semibold mb-3">Informações do Sistema</h3>
            <div className="text-sm space-y-1">
              <p><strong>Alto Contraste:</strong> {settings.highContrast ? 'Ativo' : 'Inativo'}</p>
              <p><strong>Movimento Reduzido:</strong> {settings.reducedMotion ? 'Ativo' : 'Inativo'}</p>
              <p><strong>Texto Grande:</strong> {settings.largeText ? 'Ativo' : 'Inativo'}</p>
              <p><strong>Navegação por Teclado:</strong> {settings.keyboardNavigation ? 'Ativa' : 'Inativa'}</p>
            </div>
          </div>

          {/* Atalhos Disponíveis */}
          <div>
            <h3 className="font-semibold mb-3">Atalhos Disponíveis</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><kbd className="px-2 py-1 bg-muted rounded">Alt + H</kbd> Conteúdo principal</div>
              <div><kbd className="px-2 py-1 bg-muted rounded">Alt + N</kbd> Navegação</div>
              <div><kbd className="px-2 py-1 bg-muted rounded">Alt + S</kbd> Busca</div>
              <div><kbd className="px-2 py-1 bg-muted rounded">Shift + ?</kbd> Mostrar atalhos</div>
              <div><kbd className="px-2 py-1 bg-muted rounded">Escape</kbd> Fechar modal</div>
              <div><kbd className="px-2 py-1 bg-muted rounded">↑↓</kbd> Navegar lista</div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Widget de Feedback */}
      <SimpleFeedbackWidget position="bottom-right" />
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL COM PROVIDERS
// =====================================================

export function SimplifiedUsageExample() {
  return (
    <SimpleAnalyticsProvider>
      <AccessibilityProvider>
        <div className="min-h-screen bg-background">
          
          {/* Skip Links (mantidos do sistema original) */}
          <div className="sr-only focus-within:not-sr-only">
            <a 
              href="#main-content" 
              className="fixed top-4 left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
            >
              Pular para conteúdo principal
            </a>
          </div>

          {/* Conteúdo Principal */}
          <main id="main-content" tabIndex={-1}>
            <ExampleComponent />
          </main>

        </div>
      </AccessibilityProvider>
    </SimpleAnalyticsProvider>
  )
}

// =====================================================
// EXEMPLO DE TESTE SIMPLIFICADO
// =====================================================

/*
// Em um arquivo de teste:

import { renderWithAccessibility, testAccessibility } from '@/lib/accessibility/simple-testing'
import { SimplifiedUsageExample } from './simplified-usage-example'

describe('SimplifiedUsageExample', () => {
  it('should be accessible', async () => {
    const { testA11y } = renderWithAccessibility(<SimplifiedUsageExample />)
    await testA11y()
  })

  it('should track analytics events', () => {
    const { getByText } = renderWithAccessibility(<SimplifiedUsageExample />)
    const button = getByText('Botão Primário')
    
    fireEvent.click(button)
    
    // Verificar se evento foi trackado
    const events = getStoredEvents()
    expect(events).toContainEqual(
      expect.objectContaining({
        name: 'click',
        properties: expect.objectContaining({
          element: 'primary'
        })
      })
    )
  })

  it('should announce accessibility changes', () => {
    const announceSpy = jest.spyOn(document, 'getElementById')
    const { getByText } = renderWithAccessibility(<SimplifiedUsageExample />)
    
    fireEvent.click(getByText('high contrast'))
    
    expect(announceSpy).toHaveBeenCalledWith('accessibility-announcer')
  })
})
*/

// =====================================================
// EXEMPLO DE INTEGRAÇÃO COM VERCEL ANALYTICS
// =====================================================

/*
// Em _app.tsx ou layout.tsx:

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SimpleAnalyticsProvider>
          <AccessibilityProvider>
            {children}
            <Analytics />
            <SpeedInsights />
          </AccessibilityProvider>
        </SimpleAnalyticsProvider>
      </body>
    </html>
  )
}
*/
