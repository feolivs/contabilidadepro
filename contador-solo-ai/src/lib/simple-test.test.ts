/**
 * Teste simples para verificar se o Jest está funcionando
 */

describe('Configuração básica do Jest', () => {
  test('deve executar testes básicos', () => {
    expect(1 + 1).toBe(2)
  })

  test('deve lidar com strings', () => {
    expect('ContabilidadePRO').toContain('Contabilidade')
  })

  test('deve lidar com arrays', () => {
    const impostos = ['DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS']
    expect(impostos).toHaveLength(5)
    expect(impostos).toContain('DAS')
  })

  test('deve lidar com objetos', () => {
    const empresa = {
      id: '123',
      razao_social: 'Empresa Teste LTDA',
      regime_tributario: 'Simples Nacional'
    }

    expect(empresa).toHaveProperty('id')
    expect(empresa.regime_tributario).toBe('Simples Nacional')
  })

  test('deve lidar com funções', () => {
    const calcularPercentual = (valor: number, percentual: number) => {
      return (valor * percentual) / 100
    }

    expect(calcularPercentual(1000, 10)).toBe(100)
    expect(calcularPercentual(0, 10)).toBe(0)
  })

  test('deve lidar com promises', async () => {
    const promiseResolvida = Promise.resolve('sucesso')
    await expect(promiseResolvida).resolves.toBe('sucesso')
  })

  test('deve lidar com erros', () => {
    const funcaoComErro = () => {
      throw new Error('Erro de teste')
    }

    expect(funcaoComErro).toThrow('Erro de teste')
  })
})
