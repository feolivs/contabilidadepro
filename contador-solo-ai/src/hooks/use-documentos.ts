'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import {
  Documento,
  DocumentoUpload,
  DocumentoStats,
  DocumentoFilter,
  TipoDocumento,
  StatusProcessamento
} from '@/types/documento'



// Hook para buscar documentos com filtros
export function useDocumentos(filter?: DocumentoFilter) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documentos', filter],
    queryFn: async (): Promise<Documento[]> => {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filter?.empresaId) {
        query = query.eq('empresa_id', filter.empresaId)
      }

      if (filter?.tipoDocumento) {
        query = query.eq('tipo_documento', filter.tipoDocumento)
      }

      if (filter?.statusProcessamento) {
        query = query.eq('status_processamento', filter.statusProcessamento)
      }

      if (filter?.searchTerm) {
        query = query.or(`arquivo_nome.ilike.%${filter.searchTerm}%,numero_documento.ilike.%${filter.searchTerm}%`)
      }

      if (filter?.dataInicio) {
        query = query.gte('created_at', filter.dataInicio)
      }

      if (filter?.dataFim) {
        query = query.lte('created_at', filter.dataFim)
      }

      const { data, error } = await query

      if (error) {

        throw new Error('Erro ao carregar documentos')
      }

      return data || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  })
}

// Hook para estatísticas de documentos
export function useDocumentosStats() {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documentos-stats'],
    queryFn: async (): Promise<DocumentoStats> => {
      const { data, error } = await supabase
        .from('documentos')
        .select('status_processamento')

      if (error) {

        throw new Error('Erro ao carregar estatísticas')
      }

      const stats = {
        total: data?.length || 0,
        processados: data?.filter(d => d.status_processamento === 'processado').length || 0,
        pendentes: data?.filter(d => d.status_processamento === 'pendente').length || 0,
        processando: data?.filter(d => d.status_processamento === 'processando').length || 0,
        erros: data?.filter(d => d.status_processamento === 'erro').length || 0,
        rejeitados: data?.filter(d => d.status_processamento === 'rejeitado').length || 0,
      }

      return stats
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Hook para upload de documento
export function useUploadDocumento() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (data: DocumentoUpload): Promise<Documento> => {
      const { arquivo, ...documentoData } = data

      // 1. Upload do arquivo para o Storage
      const fileExt = arquivo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName // Não incluir 'documentos/' pois já estamos no bucket 'documentos'

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, arquivo, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`)
      }

      // 2. Salvar metadados no banco (sem URL pública, será gerada dinamicamente)
      const insertData = {
        empresa_id: documentoData.empresa_id,
        tipo_documento: documentoData.tipo_documento,
        arquivo_nome: arquivo.name,
        arquivo_tipo: arquivo.type,
        arquivo_tamanho: arquivo.size,
        arquivo_url: '', // Será gerada dinamicamente quando necessário
        arquivo_path: filePath,
        status_processamento: 'processando' as StatusProcessamento,
        numero_documento: documentoData.numero_documento || null,
        serie: documentoData.serie || null,
        data_emissao: documentoData.data_emissao ? new Date(documentoData.data_emissao).toISOString().split('T')[0] : null,
        valor_total: documentoData.valor_total || null,
        observacoes: documentoData.observacoes || null
      }

      console.log('Inserting document data:', insertData)

      const { data: documento, error: dbError } = await supabase
        .from('documentos')
        .insert(insertData)
        .select('*')
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        console.error('Insert data was:', insertData)
        // Tentar limpar o arquivo do storage em caso de erro
        await supabase.storage.from('documentos').remove([filePath])
        throw new Error(`Erro ao salvar documento no banco de dados: ${dbError.message}`)
      }

      // Buscar dados da empresa separadamente
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, nome, cnpj')
        .eq('id', documento.empresa_id)
        .single()

      // Adicionar dados da empresa ao documento
      const documentoCompleto = {
        ...documento,
        empresa: empresa
      }

      // 4. Processar documento com IA usando Edge Function unificada
      try {
        console.log('Chamando document-processor-unified com:', {
          documentId: documento.id,
          filePath: filePath,
          fileName: arquivo.name,
          fileType: arquivo.type,
          empresaId: data.empresa_id
        })

        // Processar documento com OCR usando document-processor-unified
        const { data: processData, error: processError } = await supabase.functions.invoke('document-processor-unified', {
          body: {
            action: 'process_ocr',
            documentId: documento.id,
            filePath: filePath,
            fileName: arquivo.name,
            options: {
              language: 'por',
              quality: 'high',
              extractionMode: 'complete',
              enableAI: true,
              extractTables: true,
              enableCache: true,
              documentType: data.tipo_documento
            }
          }
        })

        console.log('Resposta do processamento unificado:', { processData, processError })

        if (processError) {
          console.error('Erro no processamento unificado:', processError)
          // Atualizar status para erro
          await supabase
            .from('documentos')
            .update({
              status_processamento: 'erro',
              observacoes: `Erro no processamento: ${processError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', documento.id)
        } else if (processData && processData.success) {
          // Processar resultado do processamento unificado
          const unifiedResult = processData.data

          // Atualizar documento com dados extraídos universais
          const updateData: any = {
            status_processamento: 'processado',
            dados_extraidos: {
              // Manter compatibilidade com estrutura antiga
              confidence: unifiedResult.confidence_score,
              extraction_method: 'unified_processor',
              extraction_confidence: unifiedResult.confidence_score,

              // Novos dados universais
              raw_text: unifiedResult.raw_text,
              document_type: unifiedResult.document_type,
              entities: unifiedResult.entities,
              financial_data: unifiedResult.financial_data,
              dates: unifiedResult.dates,
              contacts: unifiedResult.contacts,
              additional_fields: unifiedResult.additional_fields,
              relationships: unifiedResult.relationships,
              insights: unifiedResult.insights,

              // Dados específicos extraídos para compatibilidade
              numero_documento: unifiedResult.entities?.find(e => e.type === 'other' && e.context.includes('número'))?.value,
              valor_total: unifiedResult.financial_data?.find(f => f.type === 'total')?.value,
              data_emissao: unifiedResult.dates?.find(d => d.type === 'emission')?.date,
              empresa_emitente: unifiedResult.entities?.find(e => e.type === 'company')?.value,
              cnpj_emitente: unifiedResult.entities?.find(e => e.value.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/))?.value
            },
            data_processamento: new Date().toISOString(),
            observacoes: `Processamento unificado - Confiança: ${Math.round(unifiedResult.confidence_score * 100)}% - ${unifiedResult.entities?.length || 0} entidades encontradas`,
            updated_at: new Date().toISOString()
          }

          // Extrair campos específicos para compatibilidade com tabela
          if (unifiedResult.financial_data?.length > 0) {
            const maiorValor = Math.max(...unifiedResult.financial_data.map(f => f.value))
            updateData.valor_total = maiorValor
            console.log('Valor total detectado:', maiorValor)
          }

          if (updateData.dados_extraidos.numero_documento) {
            updateData.numero_documento = updateData.dados_extraidos.numero_documento
            console.log('Número do documento detectado:', updateData.dados_extraidos.numero_documento)
          }

          await supabase
            .from('documentos')
            .update(updateData)
            .eq('id', documento.id)

          console.log('Documento atualizado com dados do OCR:', updateData)
        } else {
          // OCR falhou mas não deu erro
          await supabase
            .from('documentos')
            .update({
              status_processamento: 'erro',
              observacoes: 'Falha no processamento OCR - nenhum dado extraído',
              updated_at: new Date().toISOString()
            })
            .eq('id', documento.id)
        }
      } catch (processError) {
        console.error('Processing error:', processError)
        // Não falhar o upload, apenas logar o erro
      }

      return documentoCompleto
    },
    onSuccess: (documento) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success(`Documento "${documento.arquivo_nome}" enviado com sucesso!`)
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao fazer upload do documento')
    }
  })
}

// Hook para download de documento
export function useDownloadDocumento() {
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (documento: Documento): Promise<void> => {
      if (!documento.arquivo_path) {
        throw new Error('Caminho do arquivo não encontrado')
      }

      const { data, error } = await supabase.storage
        .from('documentos')
        .download(documento.arquivo_path)

      if (error) {

        throw new Error('Erro ao fazer download do arquivo')
      }

      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = documento.arquivo_nome
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: (_, documento) => {
      toast.success(`Download de "${documento.arquivo_nome}" iniciado`)
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao fazer download')
    }
  })
}

// Hook para excluir documento
export function useDeleteDocumento() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (documentoId: string): Promise<void> => {
      // Primeiro, buscar o documento para obter o caminho do arquivo
      const { data: documento, error: fetchError } = await supabase
        .from('documentos')
        .select('arquivo_path, arquivo_nome')
        .eq('id', documentoId)
        .single()

      if (fetchError) {

        throw new Error('Documento não encontrado')
      }

      // Excluir do banco de dados
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documentoId)

      if (dbError) {

        throw new Error('Erro ao excluir documento')
      }

      // Excluir arquivo do storage (se existir)
      if (documento.arquivo_path) {
        const { error: storageError } = await supabase.storage
          .from('documentos')
          .remove([documento.arquivo_path])

        if (storageError) {

          // Não falhar a operação se apenas o storage falhar
        }
      }
    },
    onSuccess: (_, documentoId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success('Documento excluído com sucesso!')
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao excluir documento')
    }
  })
}

// Hook para buscar documento por ID
export function useDocumento(id: string) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documento', id],
    queryFn: async (): Promise<Documento> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .eq('id', id)
        .single()

      if (error) {

        throw new Error('Documento não encontrado')
      }

      return data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Hook para atualizar status de processamento
export function useUpdateDocumentoStatus() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      dadosExtraidos 
    }: { 
      id: string
      status: StatusProcessamento
      dadosExtraidos?: any 
    }): Promise<Documento> => {
      const updateData: any = {
        status_processamento: status,
        updated_at: new Date().toISOString()
      }

      if (dadosExtraidos) {
        updateData.dados_extraidos = dadosExtraidos
        updateData.data_processamento = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('documentos')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .single()

      if (error) {

        throw new Error('Erro ao atualizar status do documento')
      }

      return data
    },
    onSuccess: (documento) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documento', documento.id] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success('Status do documento atualizado!')
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao atualizar status')
    }
  })
}
