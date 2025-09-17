'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface EdgeFunctionError {
  id: string
  function_name: string
  error_message: string
  error_type: string
  user_id: string
  created_at: string
  metadata: any
}

export function EdgeFunctionMonitor() {
  const [errors, setErrors] = useState<EdgeFunctionError[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createBrowserSupabaseClient()

  const loadRecentErrors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('realtime_notifications')
        .select('*')
        .eq('notification_type', 'edge_function_error')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error loading recent errors:', error)
        return
      }

      const formattedErrors: EdgeFunctionError[] = data.map(item => ({
        id: item.id,
        function_name: item.payload?.function_name || 'unknown',
        error_message: item.message,
        error_type: item.payload?.error_type || 'unknown',
        user_id: item.user_id,
        created_at: item.created_at,
        metadata: item.payload
      }))

      setErrors(formattedErrors)
    } catch (error) {
      console.error('Failed to load recent errors:', error)
    }
  }, [supabase])

  useEffect(() => {
    // Subscribe to real-time notifications about Edge Function errors
    // This now works because we fixed RLS policies!
    const channel = supabase
      .channel('edge-function-errors')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_notifications',
          filter: 'notification_type=eq.edge_function_error'
        },
        (payload) => {
          console.log('🚨 Edge Function Error detected:', payload)

          const errorData = payload.new as any
          const newError: EdgeFunctionError = {
            id: errorData.id,
            function_name: errorData.payload?.function_name || 'unknown',
            error_message: errorData.message,
            error_type: errorData.payload?.error_type || 'unknown',
            user_id: errorData.user_id,
            created_at: errorData.created_at,
            metadata: errorData.payload
          }

          setErrors(prev => [newError, ...prev.slice(0, 9)]) // Keep last 10 errors
        }
      )
      .subscribe((status) => {
        console.log('📡 Edge Function Monitor status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Load recent errors
    loadRecentErrors()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, loadRecentErrors])

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'validation':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'fatal':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getErrorBadgeColor = (errorType: string) => {
    switch (errorType) {
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800'
      case 'validation':
        return 'bg-orange-100 text-orange-800'
      case 'fatal':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Edge Functions Monitor</span>
          {isConnected ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No recent errors detected</p>
            <p className="text-sm">All Edge Functions are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <div
                key={error.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getErrorIcon(error.error_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {error.function_name}
                        </span>
                        <Badge className={getErrorBadgeColor(error.error_type)}>
                          {error.error_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 break-words">
                        {error.error_message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(error.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {error.metadata && Object.keys(error.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      View metadata
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(error.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
