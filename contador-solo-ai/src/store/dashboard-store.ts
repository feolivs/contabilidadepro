import { create } from 'zustand'

interface DashboardMetrics {
  totalClientes: number
  documentosPendentes: number
  prazosFiscais: number
  receita: number
}

interface DashboardState {
  metrics: DashboardMetrics | null
  isLoading: boolean
  selectedPeriod: string
  setMetrics: (metrics: DashboardMetrics) => void
  setLoading: (loading: boolean) => void
  setSelectedPeriod: (period: string) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  isLoading: false,
  selectedPeriod: 'month',
  setMetrics: (metrics) => set({ metrics, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
}))
