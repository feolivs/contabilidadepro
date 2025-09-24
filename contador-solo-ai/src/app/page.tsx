'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// PÁGINA INICIAL COM REDIRECIONAMENTO AUTOMÁTICO
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionamento imediato para o dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <h1 style={{
          fontSize: '24px',
          color: '#111827',
          marginBottom: '8px',
          fontWeight: 'bold'
        }}>
          🚀 ContabilidadePRO
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Redirecionando para o dashboard...
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
