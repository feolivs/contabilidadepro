// Database connection pool management
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface PoolStats {
  activeConnections: number
  totalConnections: number
  availableConnections: number
  lastActivity: Date
}

class ConnectionPool {
  private static instance: ConnectionPool
  private connections: Map<string, any> = new Map()
  private stats: PoolStats = {
    activeConnections: 0,
    totalConnections: 0,
    availableConnections: 0,
    lastActivity: new Date()
  }

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool()
    }
    return ConnectionPool.instance
  }

  getConnection(key = 'default') {
    if (!this.connections.has(key)) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      
      const client = createClient(supabaseUrl, supabaseKey)
      this.connections.set(key, client)
      this.stats.totalConnections++
    }

    this.stats.activeConnections++
    this.stats.lastActivity = new Date()
    
    return this.connections.get(key)
  }

  releaseConnection(key = 'default') {
    if (this.connections.has(key)) {
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1)
    }
  }

  getStats(): PoolStats {
    this.stats.availableConnections = this.stats.totalConnections - this.stats.activeConnections
    return { ...this.stats }
  }

  clearPool() {
    this.connections.clear()
    this.stats = {
      activeConnections: 0,
      totalConnections: 0,
      availableConnections: 0,
      lastActivity: new Date()
    }
  }
}

const pool = ConnectionPool.getInstance()

export function getOptimizedConnection(key = 'default') {
  return pool.getConnection(key)
}

export function releaseConnection(key = 'default') {
  pool.releaseConnection(key)
}

export function getPoolStats(): PoolStats {
  return pool.getStats()
}

export function clearConnectionPool() {
  pool.clearPool()
}
