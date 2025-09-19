// 🔐 MFA SETUP WIZARD
// Componente para configuração inicial do MFA
// Integrado ao sistema ContabilidadePRO

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Download
} from 'lucide-react'
import { useMFA } from '@/hooks/use-mfa'
import { toast } from 'react-hot-toast'

// Schema de validação
const verificationSchema = z.object({
  code: z.string()
    .min(6, 'Código deve ter 6 dígitos')
    .max(6, 'Código deve ter 6 dígitos')
    .regex(/^\d+$/, 'Código deve conter apenas números')
})

type VerificationForm = z.infer<typeof verificationSchema>

interface MFASetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

type SetupStep = 'choose-method' | 'setup-totp' | 'verify-code' | 'backup-codes' | 'complete'

export function MFASetupWizard({ isOpen, onClose, onComplete }: MFASetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('choose-method')
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [factorId, setFactorId] = useState<string>('')

  const { enrollMFA, verifyMFA, generateBackupCodes } = useMFA()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema)
  })

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleChooseMethod = async (method: 'totp' | 'sms') => {
    try {
      const result = await enrollMFA.mutateAsync({
        factor_type: method
      })

      setEnrollmentData(result)
      setFactorId(result.factor_id)
      setCurrentStep('setup-totp')
    } catch (error) {
      console.error('Erro ao configurar MFA:', error)
    }
  }

  const handleVerifyCode = async (data: VerificationForm) => {
    try {
      await verifyMFA.mutateAsync({
        factor_id: factorId,
        code: data.code
      })

      setCurrentStep('backup-codes')
      
      // Gerar códigos de backup automaticamente
      const backupResult = await generateBackupCodes.mutateAsync()
      setBackupCodes(backupResult.backup_codes)
    } catch (error) {
      console.error('Erro ao verificar código:', error)
    }
  }

  const handleComplete = () => {
    setCurrentStep('complete')
    setTimeout(() => {
      onComplete?.()
      onClose()
      resetWizard()
    }, 2000)
  }

  const resetWizard = () => {
    setCurrentStep('choose-method')
    setEnrollmentData(null)
    setBackupCodes([])
    setFactorId('')
    reset()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência!')
  }

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contabilidadepro-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // =====================================================
  // RENDER STEPS
  // =====================================================

  const renderChooseMethod = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Escolha o método de autenticação</h3>
        <p className="text-sm text-gray-600 mt-2">
          Selecione como você deseja receber os códigos de verificação
        </p>
      </div>

      <div className="grid gap-4">
        <Card 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleChooseMethod('totp')}
        >
          <CardContent className="flex items-center p-4">
            <Smartphone className="h-8 w-8 text-green-600 mr-4" />
            <div className="flex-1">
              <h4 className="font-medium">Aplicativo Autenticador</h4>
              <p className="text-sm text-gray-600">
                Google Authenticator, Authy, ou similar
              </p>
            </div>
            <Badge variant="secondary">Recomendado</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderSetupTOTP = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Configure seu aplicativo</h3>
        <p className="text-sm text-gray-600 mt-2">
          Escaneie o QR Code ou digite o código manualmente
        </p>
      </div>

      {enrollmentData?.qr_code && (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <QRCodeSVG 
              value={enrollmentData.qr_code} 
              size={200}
              level="M"
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Ou digite este código manualmente:
            </p>
            <div className="flex items-center justify-center space-x-2">
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                {enrollmentData.secret}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(enrollmentData.secret)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Instruções:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
              <li>Abra seu aplicativo autenticador</li>
              <li>Escaneie o QR Code ou digite o código</li>
              <li>Digite o código de 6 dígitos gerado</li>
            </ol>
          </div>
        </div>
      </div>

      <Button 
        onClick={() => setCurrentStep('verify-code')}
        className="w-full"
      >
        Continuar para verificação
      </Button>
    </div>
  )

  const renderVerifyCode = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Verificar código</h3>
        <p className="text-sm text-gray-600 mt-2">
          Digite o código de 6 dígitos do seu aplicativo
        </p>
      </div>

      <form onSubmit={handleSubmit(handleVerifyCode)} className="space-y-4">
        <div>
          <Label htmlFor="code">Código de verificação</Label>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            maxLength={6}
            className="text-center text-lg font-mono"
            {...register('code')}
            autoComplete="one-time-code"
          />
          {errors.code && (
            <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={verifyMFA.isPending}
        >
          {verifyMFA.isPending ? 'Verificando...' : 'Verificar código'}
        </Button>
      </form>
    </div>
  )

  const renderBackupCodes = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Códigos de backup</h3>
        <p className="text-sm text-gray-600 mt-2">
          Guarde estes códigos em local seguro. Você pode usá-los se perder acesso ao seu dispositivo.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-white p-2 rounded border text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={downloadBackupCodes}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar códigos
        </Button>
        <Button
          variant="outline"
          onClick={() => copyToClipboard(backupCodes.join('\n'))}
          className="flex-1"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copiar todos
        </Button>
      </div>

      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-900">Importante:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-red-800">
              <li>Cada código só pode ser usado uma vez</li>
              <li>Guarde-os em local seguro e offline</li>
              <li>Não compartilhe estes códigos com ninguém</li>
            </ul>
          </div>
        </div>
      </div>

      <Button onClick={handleComplete} className="w-full">
        Finalizar configuração
      </Button>
    </div>
  )

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-green-900">
          MFA configurado com sucesso!
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          Sua conta agora está protegida com autenticação de dois fatores.
        </p>
      </div>
    </div>
  )

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de segurança à sua conta
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 'choose-method' && renderChooseMethod()}
          {currentStep === 'setup-totp' && renderSetupTOTP()}
          {currentStep === 'verify-code' && renderVerifyCode()}
          {currentStep === 'backup-codes' && renderBackupCodes()}
          {currentStep === 'complete' && renderComplete()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
