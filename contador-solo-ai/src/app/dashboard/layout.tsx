// Layout simples que apenas renderiza o children
// Os parallel routes foram removidos em favor da nova dashboard

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return children
}
