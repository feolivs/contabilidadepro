'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase'
import { Camera, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MobileUploadProps {
  empresaId: string
  onUploadComplete?: (documentId: string) => void
  onUploadError?: (error: string) => void
}

interface UploadStatus {
  status: 'idle' | 'compressing' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  documentId?: string
}

/**
 * 📱 UPLOAD OTIMIZADO PARA MOBILE - PHASE 0 FIX
 * Resolve problemas de timeout e uploads lentos
 */
export function MobileUploadOptimized({ empresaId, onUploadComplete, onUploadError }: MobileUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })

  const supabase = createClient()

  /**
   * 🗜️ COMPRESSÃO DE IMAGEM PARA MOBILE
   * Reduz drasticamente o tempo de upload
   */
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Se não for imagem, retornar original
      if (!file.type.startsWith('image/')) {
        resolve(file)
        return
      }

      setUploadStatus(prev => ({
        ...prev,
        status: 'compressing',
        progress: 10,
        message: 'Comprimindo imagem...'
      }))

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // OTIMIZAÇÃO PARA MOBILE: Reduzir resolução se muito grande
        const MAX_WIDTH = 1920
        const MAX_HEIGHT = 1080
        const MAX_SIZE = 1024 * 1024 // 1MB máximo

        let { width, height } = img

        // Redimensionar se necessário
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height)

        // Converter para blob com qualidade otimizada
        let quality = 0.8
        if (file.size > MAX_SIZE) {
          quality = 0.6 // Maior compressão para arquivos grandes
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            console.log(`📱 Compressão: ${Math.round(file.size / 1024)}KB → ${Math.round(compressedFile.size / 1024)}KB`)

            setUploadStatus(prev => ({
              ...prev,
              progress: 25,
              message: `Comprimido: ${Math.round(compressedFile.size / 1024)}KB`
            }))

            resolve(compressedFile)
          } else {
            resolve(file)
          }
        }, 'image/jpeg', quality)
      }

      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }, [])

  /**
   * 🚀 UPLOAD OTIMIZADO COM SUPABASE STORAGE
   * Usa Storage API interno - muito mais rápido
   */
  const uploadToStorage = useCallback(async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    setUploadStatus(prev => ({
      ...prev,
      status: 'uploading',
      progress: 30,
      message: 'Enviando para storage...'
    }))

    // Upload direto para Supabase Storage (interno - super rápido)
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Erro no upload: ${error.message}`)
    }

    // Simular progresso do upload
    setUploadStatus(prev => ({
      ...prev,
      progress: 70,
      message: 'Upload concluído!'
    }))

    return data.path
  }, [supabase])

  /**
   * 📄 CRIAR REGISTRO NO BANCO
   */
  const createDocumentRecord = useCallback(async (fileName: string, storagePath: string): Promise<string> => {
    setUploadStatus(prev => ({
      ...prev,
      progress: 75,
      message: 'Criando registro...'
    }))

    const { data, error } = await supabase
      .from('documentos')
      .insert({
        empresa_id: empresaId,
        arquivo_nome: fileName,
        arquivo_path: storagePath,
        status_processamento: 'pendente',
        tipo_documento: 'UPLOAD_MOBILE',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar registro: ${error.message}`)
    }

    return data.id
  }, [supabase, empresaId])

  /**
   * 🧠 PROCESSAR COM OCR (ASSÍNCRONO)
   */
  const processWithOCR = useCallback(async (documentId: string, storagePath: string, fileName: string) => {
    setUploadStatus(prev => ({
      ...prev,
      status: 'processing',
      progress: 85,
      message: 'Processando documento...'
    }))

    try {
      // Chamar Edge Function otimizada
      const { data, error } = await supabase.functions.invoke('pdf-ocr-service', {
        body: {
          action: 'process_ocr',
          documentId,
          storagePath, // Usar storagePath em vez de filePath
          fileName
        }
      })

      if (error) {
        console.error('Erro no OCR:', error)
        // Não falhar - OCR é processamento secundário
      }

      console.log('OCR processado:', data)
    } catch (error) {
      console.error('Erro no processamento:', error)
      // Não falhar - documento já foi salvo
    }
  }, [supabase])

  /**
   * 📱 PROCESSO PRINCIPAL DE UPLOAD
   */
  const handleUpload = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    try {
      setUploadStatus({
        status: 'compressing',
        progress: 5,
        message: 'Iniciando upload...'
      })

      // 1. Comprimir se for imagem
      const optimizedFile = await compressImage(file)

      // 2. Upload para Storage (interno - rápido)
      const storagePath = await uploadToStorage(optimizedFile)

      // 3. Criar registro no banco
      const documentId = await createDocumentRecord(file.name, storagePath)

      // 4. Sucesso imediato (OCR roda em background)
      setUploadStatus({
        status: 'completed',
        progress: 100,
        message: 'Upload concluído! Processando em background...',
        documentId
      })

      // 5. Processar OCR assíncronamente (não bloquear UI)
      processWithOCR(documentId, storagePath, file.name)

      // Callback de sucesso
      onUploadComplete?.(documentId)

      // Reset após 3 segundos
      setTimeout(() => {
        setUploadStatus({
          status: 'idle',
          progress: 0,
          message: ''
        })
      }, 3000)

    } catch (error) {
      console.error('Erro no upload:', error)

      setUploadStatus({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      })

      onUploadError?.(error instanceof Error ? error.message : 'Erro no upload')

      // Reset após 5 segundos
      setTimeout(() => {
        setUploadStatus({
          status: 'idle',
          progress: 0,
          message: ''
        })
      }, 5000)
    }
  }, [compressImage, uploadToStorage, createDocumentRecord, processWithOCR, onUploadComplete, onUploadError])

  // Configuração do dropzone otimizada para mobile
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploadStatus.status !== 'idle'
  })

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* ÁREA DE UPLOAD OTIMIZADA PARA MOBILE */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploadStatus.status !== 'idle' ? 'pointer-events-none opacity-75' : 'hover:border-blue-400'}
        `}
      >
        <input {...getInputProps()} />

        {uploadStatus.status === 'idle' && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <Camera className="w-8 h-8 text-blue-500" />
              <Upload className="w-8 h-8 text-gray-400" />
              <FileText className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-medium mb-2">
              Enviar Documento
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Foto, PDF ou arquivo de texto
            </p>
            <Button variant="outline" size="sm">
              Escolher Arquivo
            </Button>
          </>
        )}

        {uploadStatus.status !== 'idle' && (
          <div className="space-y-4 w-full">
            <div className="flex justify-center">
              {uploadStatus.status === 'completed' ? (
                <CheckCircle className="w-12 h-12 text-green-500" />
              ) : uploadStatus.status === 'error' ? (
                <AlertCircle className="w-12 h-12 text-red-500" />
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {uploadStatus.message}
              </p>
              {uploadStatus.progress > 0 && (
                <Progress value={uploadStatus.progress} className="w-full" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* STATUS E MENSAGENS */}
      {uploadStatus.status === 'completed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Documento enviado com sucesso! O processamento continuará em segundo plano.
          </AlertDescription>
        </Alert>
      )}

      {uploadStatus.status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {/* INFORMAÇÕES DE OTIMIZAÇÃO */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>✅ Compressão automática para imagens</p>
        <p>✅ Upload otimizado para mobile</p>
        <p>✅ Processamento em segundo plano</p>
        <p>📱 Máximo: 50MB | Tipos: JPG, PNG, PDF, TXT</p>
      </div>
    </div>
  )
}

export default MobileUploadOptimized