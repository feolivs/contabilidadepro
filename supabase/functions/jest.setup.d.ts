/**
 * Type definitions for Edge Functions tests
 */

/// <reference types="jest" />

declare global {
  namespace jest {
    interface SpyInstance<T = any, Y extends any[] = any[]> {
      mockClear(): this
      mockReset(): this
      mockRestore(): void
      mockImplementation(fn: (...args: Y) => T): this
      mockImplementationOnce(fn: (...args: Y) => T): this
      mockReturnValue(value: T): this
      mockReturnValueOnce(value: T): this
      mockResolvedValue(value: jest.ResolvedValue<T>): this
      mockResolvedValueOnce(value: jest.ResolvedValue<T>): this
      mockRejectedValue(value: jest.RejectedValue<T>): this
      mockRejectedValueOnce(value: jest.RejectedValue<T>): this
    }

    type ResolvedValue<T> = T extends Promise<infer U> ? U : T
    type RejectedValue<T> = any
  }

  var Deno: {
    env: {
      get: jest.MockedFunction<(key: string) => string | undefined>
    }
  }

  var performance: {
    now: jest.MockedFunction<() => number>
    memory: {
      usedJSHeapSize: number
    }
  }

  var fetch: jest.MockedFunction<typeof fetch>

  function mockHttpResponse(data: any, status?: number, headers?: Record<string, string>): Promise<Response>
  function mockHttpError(status?: number, message?: string): Promise<Response>
  function waitFor(ms: number): Promise<void>
  function debugLog(message: string, ...args: any[]): void
}

export {}