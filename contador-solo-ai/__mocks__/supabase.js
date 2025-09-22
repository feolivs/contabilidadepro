// Mock do Supabase para testes
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: '', error: null }),
    geojson: jest.fn().mockResolvedValue({ data: null, error: null }),
    explain: jest.fn().mockResolvedValue({ data: null, error: null }),
    rollback: jest.fn().mockResolvedValue({ data: null, error: null }),
    returns: jest.fn().mockReturnThis(),
  })),
  
  auth: {
    getUser: jest.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    }),
    getSession: jest.fn().mockResolvedValue({ 
      data: { session: { user: { id: 'test-user-id' } } }, 
      error: null 
    }),
    signUp: jest.fn().mockResolvedValue({ data: null, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: null, error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/file.jpg' } 
      }),
      createSignedUrl: jest.fn().mockResolvedValue({ 
        data: { signedUrl: 'https://example.com/signed-url' }, 
        error: null 
      }),
    })),
  },
  
  realtime: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis(),
    })),
  },
  
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
}

const createClient = jest.fn(() => mockSupabaseClient)

module.exports = {
  createClient,
  supabase: mockSupabaseClient,
}
