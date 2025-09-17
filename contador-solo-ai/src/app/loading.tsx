import { Bot, Calculator, FileText, Users } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 animate-pulse">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contador Solo AI</h1>
        <p className="text-gray-600 animate-pulse">Carregando sistema contábil...</p>
        
        {/* Indicadores de progresso */}
        <div className="mt-8 flex justify-center space-x-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center animate-bounce">
              <Calculator className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 mt-2">Cálculos</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '0.1s' }}>
              <FileText className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 mt-2">Documentos</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '0.2s' }}>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 mt-2">Clientes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
