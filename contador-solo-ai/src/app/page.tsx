'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'
import { Bot } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isLoading, setUser, setLoading } = useAuthStore()
  const supabase = useSupabase()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (_error) {

        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, setUser, setLoading, supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 animate-pulse">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contador Solo AI</h1>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return null
}
