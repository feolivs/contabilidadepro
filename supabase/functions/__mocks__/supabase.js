/**
 * 🎭 MOCK - Supabase Client
 * Mock do cliente Supabase para testes
 */

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  limit: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null })
  }
}

module.exports = {
  createClient: jest.fn().mockReturnValue(mockSupabaseClient)
}