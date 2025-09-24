/**
 * 🎭 MOCK - Deno HTTP Server
 * Mock do servidor HTTP do Deno para testes
 */

module.exports = {
  serve: jest.fn().mockImplementation((handler) => {
    return {
      handler,
      close: jest.fn()
    }
  })
}