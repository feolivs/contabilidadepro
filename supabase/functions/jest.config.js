/**
 * 🧪 JEST CONFIG - Edge Functions
 * Configuração para testes das Edge Functions Supabase
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Paths
  rootDir: '.',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // TypeScript
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        allowImportingTsExtensions: true,
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],

  // Coverage
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '_shared/**/*.ts',
    '*/index.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test timeout (Edge Functions podem demorar)
  testTimeout: 30000,

  // Globals para TypeScript (deprecated approach, kept for compatibility)
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        allowImportingTsExtensions: true,
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }
  },

  // Mock de módulos externos
  moduleNameMapper: {
    // JSR imports para Supabase
    '^jsr:@supabase/supabase-js@2$': '<rootDir>/__mocks__/supabase.js',
    '^jsr:@supabase/functions-js/edge-runtime\.d\.ts$': '<rootDir>/__mocks__/edge-runtime.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
    '^https://deno\\.land/std@0\\.168\\.0/http/server\\.ts$': '<rootDir>/__mocks__/deno-server.js',
    '^https://esm\\.sh/@supabase/supabase-js@2$': '<rootDir>/__mocks__/supabase.js'
  },

  // Verbose para debugging
  verbose: true,

  // Detectar testes abertos (desabilitado temporariamente devido a memory leaks em development)
  detectOpenHandles: false,
  detectLeaks: false,

  // Paralelização
  maxWorkers: '50%',

  // Reporter personalizado
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-reports',
      outputName: 'edge-functions-test-results.xml'
    }]
  ]
}