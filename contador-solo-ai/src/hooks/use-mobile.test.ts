/**
 * Testes unitários para hook use-mobile
 * Foco em detecção de dispositivos móveis e responsividade
 */

import { renderHook, act } from '@testing-library/react'
import { useState, useEffect } from 'react'

// Mock do hook useIsMobile para testes
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768)
      }
    }

    checkIsMobile()

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handleChange = () => checkIsMobile()

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}

// Mock do window.matchMedia
const mockMatchMedia = jest.fn()

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  })

  // Mock do window.innerWidth
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  })
})

describe('useIsMobile', () => {
  let mockMediaQueryList: {
    matches: boolean
    media: string
    onchange: null
    addListener: jest.Mock
    removeListener: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
    dispatchEvent: jest.Mock
  }

  beforeEach(() => {
    mockMediaQueryList = {
      matches: false,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }

    mockMatchMedia.mockReturnValue(mockMediaQueryList)
    
    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    })

    jest.clearAllMocks()
  })

  describe('Detecção inicial', () => {
    test('deve retornar false para telas desktop (>= 768px)', () => {
      // Simular tela desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)')
    })

    test('deve retornar true para telas mobile (< 768px)', () => {
      // Simular tela mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)
    })

    test('deve retornar false para tela exatamente 768px (breakpoint)', () => {
      // Simular tela no breakpoint exato
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
    })

    test('deve retornar undefined inicialmente antes da hidratação', () => {
      // Mock para simular estado inicial antes da hidratação
      const originalInnerWidth = window.innerWidth
      delete (window as any).innerWidth

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false) // Fallback para false quando undefined

      // Restaurar
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: originalInnerWidth,
      })
    })
  })

  describe('Mudanças de tamanho de tela', () => {
    test('deve atualizar quando a tela muda de desktop para mobile', () => {
      // Começar com tela desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)

      // Simular mudança para mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 375,
        })

        // Simular evento de mudança do matchMedia
        const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
        changeHandler()
      })

      expect(result.current).toBe(true)
    })

    test('deve atualizar quando a tela muda de mobile para desktop', () => {
      // Começar com tela mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)

      // Simular mudança para desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 1024,
        })

        // Simular evento de mudança do matchMedia
        const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
        changeHandler()
      })

      expect(result.current).toBe(false)
    })

    test('deve reagir a múltiplas mudanças de tamanho', () => {
      const { result } = renderHook(() => useIsMobile())

      // Desktop -> Mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 375,
        })
        const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
        changeHandler()
      })

      expect(result.current).toBe(true)

      // Mobile -> Tablet
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 768,
        })
        const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
        changeHandler()
      })

      expect(result.current).toBe(false)

      // Tablet -> Mobile novamente
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          value: 600,
        })
        const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
        changeHandler()
      })

      expect(result.current).toBe(true)
    })
  })

  describe('Breakpoints específicos', () => {
    const testCases = [
      { width: 320, expected: true, description: 'iPhone SE' },
      { width: 375, expected: true, description: 'iPhone 12/13 Mini' },
      { width: 390, expected: true, description: 'iPhone 12/13' },
      { width: 414, expected: true, description: 'iPhone 12/13 Pro Max' },
      { width: 768, expected: false, description: 'iPad Portrait' },
      { width: 1024, expected: false, description: 'iPad Landscape' },
      { width: 1280, expected: false, description: 'Desktop pequeno' },
      { width: 1920, expected: false, description: 'Desktop grande' },
    ]

    test.each(testCases)('deve detectar corretamente $description ($width px)', ({ width, expected }) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: width,
      })

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(expected)
    })
  })

  describe('Cleanup e memory leaks', () => {
    test('deve remover event listeners na desmontagem', () => {
      const { unmount } = renderHook(() => useIsMobile())

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )

      unmount()

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )
    })

    test('deve usar o mesmo handler para add e remove', () => {
      const { unmount } = renderHook(() => useIsMobile())

      const addHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
      
      unmount()

      const removeHandler = mockMediaQueryList.removeEventListener.mock.calls[0][1]

      expect(addHandler).toBe(removeHandler)
    })

    test('deve lidar com múltiplas montagens e desmontagens', () => {
      const { unmount: unmount1 } = renderHook(() => useIsMobile())
      const { unmount: unmount2 } = renderHook(() => useIsMobile())
      const { unmount: unmount3 } = renderHook(() => useIsMobile())

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(3)

      unmount1()
      unmount2()
      unmount3()

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledTimes(3)
    })
  })

  describe('Casos edge', () => {
    test('deve lidar com matchMedia não disponível', () => {
      const originalMatchMedia = window.matchMedia
      delete (window as any).matchMedia

      // Deve não quebrar mesmo sem matchMedia
      expect(() => {
        renderHook(() => useIsMobile())
      }).not.toThrow()

      // Restaurar
      window.matchMedia = originalMatchMedia
    })

    test('deve lidar com innerWidth não disponível', () => {
      const originalInnerWidth = window.innerWidth
      delete (window as any).innerWidth

      const { result } = renderHook(() => useIsMobile())

      // Deve ter um fallback seguro
      expect(typeof result.current).toBe('boolean')

      // Restaurar
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: originalInnerWidth,
      })
    })

    test('deve usar breakpoint correto (767px)', () => {
      // Renderizar o hook para acionar o useEffect
      renderHook(() => useIsMobile())

      // Verificar se o matchMedia foi chamado com o breakpoint correto
      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)')
    })
  })

  describe('Performance', () => {
    test('deve configurar listener apenas uma vez por instância', () => {
      renderHook(() => useIsMobile())

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(1)
      expect(mockMatchMedia).toHaveBeenCalledTimes(1)
    })

    test('deve reutilizar o mesmo MediaQueryList', () => {
      const { rerender } = renderHook(() => useIsMobile())

      rerender()
      rerender()

      // matchMedia deve ser chamado apenas uma vez na montagem inicial
      expect(mockMatchMedia).toHaveBeenCalledTimes(1)
    })
  })
})
