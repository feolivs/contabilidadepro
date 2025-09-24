'use client'

import { ServiceWorkerProvider } from '@/providers/service-worker-provider'

interface LazyProvidersProps {
  children: React.ReactNode
}

export function LazyProviders({ children }: LazyProvidersProps) {
  return (
    <ServiceWorkerProvider>
      {children}
    </ServiceWorkerProvider>
  )
}

export function useLazyProvidersStatus() {
  return { isLoaded: true }
}
