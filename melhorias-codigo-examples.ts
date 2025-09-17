// ❌ ANTES: Uso de 'any'
interface DocumentoProcessamento {
  dados_extraidos?: any;
  metadata?: any;
}

const processarDocumento = (data: any) => {
  return data.resultado?.valor || 0;
};

// ✅ DEPOIS: Tipos específicos
interface DadosExtraidos {
  valores_monetarios?: ValorMonetario[];
  datas_vencimento?: Date[];
  informacoes_empresa?: InfoEmpresa;
  prazos_fiscais?: PrazoFiscal[];
}

interface DocumentoProcessamento {
  dados_extraidos?: DadosExtraidos;
  metadata?: DocumentoMetadata;
}

interface DocumentoMetadata {
  tamanho_arquivo: number;
  tipo_mime: string;
  data_upload: Date;
  usuario_id: string;
}

const processarDocumento = (data: DocumentoProcessamento): number => {
  return data.dados_extraidos?.valores_monetarios?.[0]?.valor || 0;
};

// ❌ ANTES: Context data como any
{Boolean((contextData.empresa as any)?.calculos_recentes?.length > 0) && (
  <div>
    {(contextData.empresa as any).calculos_recentes.length}
  </div>
)}

// ✅ DEPOIS: Interface tipada
interface EmpresaContextData {
  id: string;
  nome: string;
  cnpj: string;
  calculos_recentes: CalculoRecente[];
  documentos_pendentes: DocumentoPendente[];
  prazos_proximos: PrazoFiscal[];
}

interface ContextData {
  empresa?: EmpresaContextData;
  usuario?: UsuarioContextData;
  sistema?: SistemaContextData;
}

{contextData.empresa?.calculos_recentes && contextData.empresa.calculos_recentes.length > 0 && (
  <div>
    {contextData.empresa.calculos_recentes.length}
  </div>
)}

// ❌ ANTES: Dependências faltantes
const ComponenteProblematico = () => {
  const [dados, setDados] = useState([]);

  const carregarDados = useCallback(async () => {
    const resultado = await api.buscarDados();
    setDados(resultado);
  }, []);

  useEffect(() => {
    carregarDados(); // Missing dependency: 'carregarDados'
  }, []);

  return <div>{dados.length}</div>;
};

// ✅ DEPOIS: Dependências corretas
const ComponenteCorrigido = () => {
  const [dados, setDados] = useState([]);

  const carregarDados = useCallback(async () => {
    const resultado = await api.buscarDados();
    setDados(resultado);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]); // Dependency included

  return <div>{dados.length}</div>;
};

// ❌ ANTES: Imports e variáveis não utilizadas
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Delete, Calendar } from 'lucide-react'; // Plus, Edit não utilizados
import { toast } from 'sonner'; // toast não utilizado

const MeuComponente = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false); // loading não utilizado
  const [error, setError] = useState(null); // error não utilizado

  const handleDelete = (id: string) => {
    // Função não utilizada
  };

  return (
    <div>
      <Calendar className="h-4 w-4" />
      <Delete className="h-4 w-4" />
    </div>
  );
};

// ✅ DEPOIS: Apenas imports e variáveis necessárias
import { useState } from 'react';
import { Calendar, Delete } from 'lucide-react';

const MeuComponente = () => {
  const [dados, setDados] = useState([]);

  return (
    <div>
      <Calendar className="h-4 w-4" />
      <Delete className="h-4 w-4" />
    </div>
  );
};

// ❌ ANTES: Console statements
const processarDocumento = async (arquivo: File) => {
  console.log('Iniciando processamento:', arquivo.name);

  try {
    const resultado = await ocrService.processar(arquivo);
    console.log('Resultado OCR:', resultado);
    return resultado;
  } catch (error) {
    console.error('Erro no processamento:', error);
    throw error;
  }
};

// ✅ DEPOIS: Logging estruturado
import { logger } from '@/lib/logger';

const processarDocumento = async (arquivo: File) => {
  logger.info('Iniciando processamento de documento', {
    nomeArquivo: arquivo.name,
    tamanho: arquivo.size,
    tipo: arquivo.type,
    timestamp: new Date().toISOString()
  });

  try {
    const resultado = await ocrService.processar(arquivo);
    logger.info('Processamento OCR concluído', {
      nomeArquivo: arquivo.name,
      confianca: resultado.confidence,
      tempoProcessamento: resultado.processingTime,
      prazosDetectados: resultado.prazosDetectados?.length || 0
    });
    return resultado;
  } catch (error) {
    logger.error('Erro no processamento de documento', {
      nomeArquivo: arquivo.name,
      erro: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// ❌ ANTES: Tag img nativa
<img
  src={documento.preview_url}
  className="w-full h-32 object-cover rounded"
/>

// ✅ DEPOIS: Next.js Image otimizada
import Image from 'next/image';

<Image
  src={documento.preview_url}
  alt={`Preview do documento ${documento.nome}`}
  width={300}
  height={128}
  className="w-full h-32 object-cover rounded"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  priority={false}
/>
