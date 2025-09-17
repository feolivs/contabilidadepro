import { createClient } from '@/lib/supabase'

// Cache para URLs assinadas
interface CachedUrl {
  url: string
  expiresAt: number
}

const urlCache = new Map<string, CachedUrl>()

/**
 * Gera uma URL assinada para um arquivo no storage do Supabase
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo no bucket
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @returns URL assinada ou null em caso de erro
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const cacheKey = `${bucket}/${path}`
    const now = Date.now()

    // Verificar cache primeiro
    const cached = urlCache.get(cacheKey)
    if (cached && cached.expiresAt > now + 300000) { // 5 min de margem
      console.log(`URL em cache para ${cacheKey}`)
      return cached.url
    }

    const supabase = createClient()

    // Primeiro verificar se o arquivo existe
    const exists = await fileExists(bucket, path)
    if (!exists) {
      console.warn(`Arquivo não encontrado: ${bucket}/${path}`)
      return null
    }

    console.log(`Gerando nova URL assinada para ${cacheKey}`)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error(`Erro ao criar URL assinada para ${bucket}/${path}:`, error)
      return null
    }

    const signedUrl = data?.signedUrl
    if (signedUrl) {
      // Cache a URL com tempo de expiração
      urlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: now + (expiresIn * 1000) // Convert to milliseconds
      })
    }

    return signedUrl || null
  } catch (error) {
    console.error(`Erro inesperado ao criar URL assinada:`, error)
    return null
  }
}

/**
 * Gera uma URL assinada especificamente para documentos
 * @param documentPath - Caminho do documento
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @returns URL assinada ou null em caso de erro
 */
export async function createDocumentSignedUrl(
  documentPath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return createSignedUrl('documentos', documentPath, expiresIn)
}

/**
 * Verifica se um arquivo existe no storage
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo
 * @returns true se o arquivo existe, false caso contrário
 */
export async function fileExists(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      })

    if (error) {
      console.error(`Erro ao verificar existência do arquivo ${bucket}/${path}:`, error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error(`Erro inesperado ao verificar arquivo:`, error)
    return false
  }
}

/**
 * Remove um arquivo do storage
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo
 * @returns true se removido com sucesso, false caso contrário
 */
export async function removeFile(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error(`Erro ao remover arquivo ${bucket}/${path}:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Erro inesperado ao remover arquivo:`, error)
    return false
  }
}

/**
 * Faz upload de um arquivo para o storage
 * @param bucket - Nome do bucket
 * @param path - Caminho onde salvar o arquivo
 * @param file - Arquivo a ser enviado
 * @param options - Opções adicionais de upload
 * @returns Caminho do arquivo ou null em caso de erro
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options: {
    cacheControl?: string
    upsert?: boolean
  } = {}
): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false
      })

    if (error) {
      console.error(`Erro ao fazer upload para ${bucket}/${path}:`, error)
      return null
    }

    return path
  } catch (error) {
    console.error(`Erro inesperado no upload:`, error)
    return null
  }
}
