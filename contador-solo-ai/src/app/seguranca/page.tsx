// 🔐 PÁGINA DE SEGURANÇA
// Página principal para configurações de segurança
// Integrada ao sistema ContabilidadePRO

import { Metadata } from 'next'
import { SecuritySettings } from '@/components/security/security-settings'
import { MainLayout } from '@/components/layout/main-layout'

export const metadata: Metadata = {
  title: 'Configurações de Segurança | ContabilidadePRO',
  description: 'Gerencie a segurança da sua conta com autenticação de dois fatores e monitoramento de atividades',
}

export default function SecurityPage() {
  return (
    <MainLayout>
      <SecuritySettings />
    </MainLayout>
  )
}
