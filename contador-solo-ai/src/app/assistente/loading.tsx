import { Bot, Sparkles, MessageCircle, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AssistenteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="h-8 w-8 text-blue-600" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <Skeleton className="h-7 w-44 mb-1" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas do assistente */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: MessageCircle, label: 'Conversas Hoje', color: 'text-blue-600' },
            { icon: Brain, label: 'Consultas Processadas', color: 'text-purple-600' },
            { icon: Sparkles, label: 'Sugestões Geradas', color: 'text-yellow-600' },
            { icon: Bot, label: 'Tempo de Resposta', color: 'text-green-600' }
          ].map((item, index) => (
            <Card key={index} className="animate-pulse bg-white/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className={`h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interface de chat */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com histórico */}
          <div className="lg:col-span-1">
            <Card className="bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="p-3 rounded-lg hover:bg-white/50 animate-pulse">
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Área principal do chat */}
          <div className="lg:col-span-3">
            <Card className="bg-white/60 backdrop-blur-sm h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardHeader>

              {/* Área de mensagens */}
              <CardContent className="flex-1 p-6 space-y-4 overflow-hidden">
                {/* Mensagem do assistente */}
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>

                {/* Mensagem do usuário */}
                <div className="flex items-start space-x-3 justify-end">
                  <div className="flex-1 space-y-2 text-right">
                    <Skeleton className="h-4 w-2/3 ml-auto" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                </div>

                {/* Mensagem do assistente com typing indicator */}
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Input de mensagem */}
              <div className="border-t p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <Skeleton className="h-10 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Sugestões rápidas */}
        <Card className="bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-white/50 cursor-pointer animate-pulse">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading indicator específico para IA */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Inicializando IA...</span>
        </div>
      </div>
    </div>
  )
}
