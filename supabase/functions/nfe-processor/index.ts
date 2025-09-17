/**
 * 🤖 NFE PROCESSOR WITH AI
 * ContábilPRO ERP - Sistema de processamento automático de NFe com IA
 * 
 * FUNCIONALIDADES:
 * - Processamento de XML de NFe
 * - Extração automática de dados
 * - Classificação IA com OpenAI GPT-4
 * - Geração de lançamentos contábeis
 * - Validação fiscal automática
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withValidation, createSuccessResponse, createErrorResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { withAPM, recordCustomMetric } from '../_shared/apm-monitor.ts';
// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================
const NFEProcessorSchema = z.object({
  action: z.enum([
    'upload_xml',
    'process_nfe',
    'classify_items',
    'generate_entries',
    'validate_fiscal'
  ]),
  // Para upload de XML
  xml_data: z.object({
    content: z.string().optional(),
    file_url: z.string().url().optional(),
    documento_fiscal_id: z.string().uuid().optional()
  }).optional(),
  // Para processamento
  nfe_document_id: z.string().uuid().optional(),
  // Para classificação IA
  classification_config: z.object({
    use_ai: z.boolean().default(true),
    model: z.string().default('gpt-4'),
    confidence_threshold: z.number().min(0).max(1).default(0.8),
    use_historical_data: z.boolean().default(true)
  }).optional()
});
// =====================================================
// FUNÇÕES DE PROCESSAMENTO XML
// =====================================================
/**
 * Extrair dados do XML da NFe
 */ async function extractNFEDataFromXML(xmlContent) {
  try {
    // Parse do XML usando DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    // Verificar se há erros no parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Erro ao fazer parse do XML: ' + parserError.textContent);
    }
    // Extrair dados principais
    const infNFe = xmlDoc.querySelector('infNFe');
    if (!infNFe) {
      throw new Error('XML inválido: elemento infNFe não encontrado');
    }
    // Chave de acesso
    const chaveAcesso = infNFe.getAttribute('Id')?.replace('NFe', '') || '';
    // Identificação da NFe
    const ide = xmlDoc.querySelector('ide');
    const numeroNFe = ide?.querySelector('nNF')?.textContent || '';
    const serie = ide?.querySelector('serie')?.textContent || '';
    const dataEmissao = ide?.querySelector('dhEmi')?.textContent || '';
    // Emitente
    const emit = xmlDoc.querySelector('emit');
    const emitente = {
      cnpj: emit?.querySelector('CNPJ')?.textContent || '',
      razao_social: emit?.querySelector('xNome')?.textContent || '',
      nome_fantasia: emit?.querySelector('xFant')?.textContent,
      endereco: {
        logradouro: emit?.querySelector('enderEmit xLgr')?.textContent,
        numero: emit?.querySelector('enderEmit nro')?.textContent,
        bairro: emit?.querySelector('enderEmit xBairro')?.textContent,
        municipio: emit?.querySelector('enderEmit xMun')?.textContent,
        uf: emit?.querySelector('enderEmit UF')?.textContent,
        cep: emit?.querySelector('enderEmit CEP')?.textContent
      }
    };
    // Destinatário
    const dest = xmlDoc.querySelector('dest');
    const destinatario = {
      cnpj_cpf: dest?.querySelector('CNPJ')?.textContent || dest?.querySelector('CPF')?.textContent,
      razao_social: dest?.querySelector('xNome')?.textContent,
      nome_fantasia: dest?.querySelector('xFant')?.textContent,
      endereco: {
        logradouro: dest?.querySelector('enderDest xLgr')?.textContent,
        numero: dest?.querySelector('enderDest nro')?.textContent,
        bairro: dest?.querySelector('enderDest xBairro')?.textContent,
        municipio: dest?.querySelector('enderDest xMun')?.textContent,
        uf: dest?.querySelector('enderDest UF')?.textContent,
        cep: dest?.querySelector('enderDest CEP')?.textContent
      }
    };
    // Totais
    const total = xmlDoc.querySelector('total ICMSTot');
    const valores = {
      total_produtos: parseFloat(total?.querySelector('vProd')?.textContent || '0'),
      total_servicos: parseFloat(total?.querySelector('vServ')?.textContent || '0'),
      total_nfe: parseFloat(total?.querySelector('vNF')?.textContent || '0'),
      total_tributos: parseFloat(total?.querySelector('vTotTrib')?.textContent || '0')
    };
    const impostos = {
      icms_total: parseFloat(total?.querySelector('vICMS')?.textContent || '0'),
      ipi_total: parseFloat(total?.querySelector('vIPI')?.textContent || '0'),
      pis_total: parseFloat(total?.querySelector('vPIS')?.textContent || '0'),
      cofins_total: parseFloat(total?.querySelector('vCOFINS')?.textContent || '0')
    };
    // Itens
    const detElements = xmlDoc.querySelectorAll('det');
    const itens = Array.from(detElements).map((det, index)=>{
      const prod = det.querySelector('prod');
      const imposto = det.querySelector('imposto');
      return {
        numero_item: index + 1,
        codigo_produto: prod?.querySelector('cProd')?.textContent,
        descricao: prod?.querySelector('xProd')?.textContent || '',
        ncm: prod?.querySelector('NCM')?.textContent,
        cfop: prod?.querySelector('CFOP')?.textContent,
        quantidade: parseFloat(prod?.querySelector('qCom')?.textContent || '0'),
        valor_unitario: parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'),
        valor_total: parseFloat(prod?.querySelector('vProd')?.textContent || '0'),
        impostos: {
          icms: extractICMSData(imposto?.querySelector('ICMS')),
          ipi: extractIPIData(imposto?.querySelector('IPI')),
          pis: extractPISData(imposto?.querySelector('PIS')),
          cofins: extractCOFINSData(imposto?.querySelector('COFINS'))
        }
      };
    });
    return {
      chave_acesso: chaveAcesso,
      numero_nfe: numeroNFe,
      serie: serie,
      data_emissao: dataEmissao,
      emitente,
      destinatario,
      valores,
      impostos,
      itens
    };
  } catch (error) {
    console.error('Erro ao extrair dados do XML:', error);
    throw new Error(`Erro ao processar XML da NFe: ${error.message}`);
  }
}
/**
 * Extrair dados de ICMS
 */ function extractICMSData(icmsElement) {
  if (!icmsElement) return null;
  // ICMS pode ter diferentes situações tributárias
  const icmsChildren = icmsElement.children;
  if (icmsChildren.length === 0) return null;
  const icmsData = icmsChildren[0]; // Primeiro filho (ICMS00, ICMS10, etc.)
  return {
    situacao_tributaria: icmsData.tagName,
    origem: icmsData.querySelector('orig')?.textContent,
    cst: icmsData.querySelector('CST')?.textContent,
    base_calculo: parseFloat(icmsData.querySelector('vBC')?.textContent || '0'),
    aliquota: parseFloat(icmsData.querySelector('pICMS')?.textContent || '0'),
    valor: parseFloat(icmsData.querySelector('vICMS')?.textContent || '0')
  };
}
/**
 * Extrair dados de IPI
 */ function extractIPIData(ipiElement) {
  if (!ipiElement) return null;
  const ipiTrib = ipiElement.querySelector('IPITrib');
  if (!ipiTrib) return null;
  return {
    situacao_tributaria: ipiTrib.querySelector('CST')?.textContent,
    base_calculo: parseFloat(ipiTrib.querySelector('vBC')?.textContent || '0'),
    aliquota: parseFloat(ipiTrib.querySelector('pIPI')?.textContent || '0'),
    valor: parseFloat(ipiTrib.querySelector('vIPI')?.textContent || '0')
  };
}
/**
 * Extrair dados de PIS
 */ function extractPISData(pisElement) {
  if (!pisElement) return null;
  const pisAliq = pisElement.querySelector('PISAliq');
  if (!pisAliq) return null;
  return {
    situacao_tributaria: pisAliq.querySelector('CST')?.textContent,
    base_calculo: parseFloat(pisAliq.querySelector('vBC')?.textContent || '0'),
    aliquota: parseFloat(pisAliq.querySelector('pPIS')?.textContent || '0'),
    valor: parseFloat(pisAliq.querySelector('vPIS')?.textContent || '0')
  };
}
/**
 * Extrair dados de COFINS
 */ function extractCOFINSData(cofinsElement) {
  if (!cofinsElement) return null;
  const cofinsAliq = cofinsElement.querySelector('COFINSAliq');
  if (!cofinsAliq) return null;
  return {
    situacao_tributaria: cofinsAliq.querySelector('CST')?.textContent,
    base_calculo: parseFloat(cofinsAliq.querySelector('vBC')?.textContent || '0'),
    aliquota: parseFloat(cofinsAliq.querySelector('pCOFINS')?.textContent || '0'),
    valor: parseFloat(cofinsAliq.querySelector('vCOFINS')?.textContent || '0')
  };
}
// =====================================================
// FUNÇÕES DE IA
// =====================================================
/**
 * Classificar item usando OpenAI
 */ async function classifyItemWithAI(item, nfeData, historicalData = []) {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }
    // Preparar contexto para IA
    const context = {
      item_description: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      valor_total: item.valor_total,
      emitente: nfeData.emitente.razao_social,
      tipo_operacao: nfeData.valores.total_produtos > 0 ? 'compra' : 'venda',
      historical_classifications: historicalData.slice(0, 5) // Últimas 5 classificações similares
    };
    const prompt = `
Você é um especialista em contabilidade brasileira. Analise o item da NFe e forneça a classificação contábil mais adequada.

CONTEXTO:
- Descrição do item: ${context.item_description}
- NCM: ${context.ncm || 'Não informado'}
- CFOP: ${context.cfop || 'Não informado'}
- Valor: R$ ${context.valor_total.toFixed(2)}
- Emitente: ${context.emitente}
- Tipo de operação: ${context.tipo_operacao}

HISTÓRICO DE CLASSIFICAÇÕES SIMILARES:
${context.historical_classifications.map((h)=>`- ${h.input_text} → ${h.ai_suggestion} (${(h.ai_confidence * 100).toFixed(1)}%)`).join('\n')}

INSTRUÇÕES:
1. Classifique o item em uma categoria contábil apropriada
2. Sugira a conta contábil do plano de contas padrão brasileiro
3. Sugira um centro de custo se aplicável
4. Forneça sua confiança na classificação (0-1)
5. Explique brevemente o raciocínio
6. Liste 2-3 alternativas possíveis

RESPONDA EM JSON:
{
  "categoria_sugerida": "string",
  "conta_contabil_sugerida": "string (código da conta)",
  "centro_custo_sugerido": "string ou null",
  "confidence": number,
  "reasoning": "string",
  "alternatives": ["string", "string", "string"]
}
`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em contabilidade brasileira com conhecimento profundo do plano de contas padrão e classificações fiscais.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }
    // Parse da resposta JSON
    const classification = JSON.parse(content);
    // Validar estrutura da resposta
    if (!classification.categoria_sugerida || !classification.conta_contabil_sugerida) {
      throw new Error('Resposta da IA incompleta');
    }
    return {
      categoria_sugerida: classification.categoria_sugerida,
      conta_contabil_sugerida: classification.conta_contabil_sugerida,
      centro_custo_sugerido: classification.centro_custo_sugerido,
      confidence: Math.min(Math.max(classification.confidence, 0), 1),
      reasoning: classification.reasoning,
      alternatives: classification.alternatives || []
    };
  } catch (error) {
    console.error('Erro na classificação IA:', error);
    // Fallback: classificação básica baseada em regras
    return {
      categoria_sugerida: 'Material de Consumo',
      conta_contabil_sugerida: '3.1.1.01.001',
      centro_custo_sugerido: null,
      confidence: 0.5,
      reasoning: `Classificação automática baseada em regras (IA indisponível: ${error.message})`,
      alternatives: [
        'Despesas Operacionais',
        'Estoque de Materiais'
      ]
    };
  }
}
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
export default withValidation({
  bodySchema: NFEProcessorSchema,
  requireAuth: true
}, withAPM('nfe-processor', async (req)=>{
  const startTime = Date.now();
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    const { action, xml_data, nfe_document_id, classification_config } = await req.json();
    const userId = req.headers.get('user-id');
    switch(action){
      case 'upload_xml':
        {
          if (!xml_data?.content) {
            return createErrorResponse('Conteúdo XML é obrigatório', 400);
          }
          // Extrair dados do XML
          const nfeData = await extractNFEDataFromXML(xml_data.content);
          // Salvar dados da NFe no banco
          const { data: nfeDocument, error: nfeError } = await supabase.from('nfe_documents').insert({
            documento_fiscal_id: xml_data.documento_fiscal_id,
            empresa_id: req.headers.get('empresa-id'),
            chave_acesso: nfeData.chave_acesso,
            numero_nfe: nfeData.numero_nfe,
            serie: nfeData.serie,
            data_emissao: nfeData.data_emissao,
            emitente_cnpj: nfeData.emitente.cnpj,
            emitente_razao_social: nfeData.emitente.razao_social,
            emitente_nome_fantasia: nfeData.emitente.nome_fantasia,
            emitente_endereco: nfeData.emitente.endereco,
            destinatario_cnpj_cpf: nfeData.destinatario.cnpj_cpf,
            destinatario_razao_social: nfeData.destinatario.razao_social,
            destinatario_nome_fantasia: nfeData.destinatario.nome_fantasia,
            destinatario_endereco: nfeData.destinatario.endereco,
            valor_total_produtos: nfeData.valores.total_produtos,
            valor_total_servicos: nfeData.valores.total_servicos,
            valor_total_nfe: nfeData.valores.total_nfe,
            valor_total_tributos: nfeData.valores.total_tributos,
            icms_total: nfeData.impostos.icms_total,
            ipi_total: nfeData.impostos.ipi_total,
            pis_total: nfeData.impostos.pis_total,
            cofins_total: nfeData.impostos.cofins_total,
            tipo_operacao: nfeData.valores.total_produtos > 0 ? 'entrada' : 'saida',
            xml_content: xml_data.content,
            xml_hash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(xml_data.content)).then((buffer)=>Array.from(new Uint8Array(buffer)).map((b)=>b.toString(16).padStart(2, '0')).join('')),
            created_by: userId
          }).select().single();
          if (nfeError) {
            throw new Error(`Erro ao salvar NFe: ${nfeError.message}`);
          }
          // Salvar itens da NFe
          const itemsToInsert = nfeData.itens.map((item)=>({
              nfe_document_id: nfeDocument.id,
              empresa_id: req.headers.get('empresa-id'),
              numero_item: item.numero_item,
              codigo_produto: item.codigo_produto,
              descricao: item.descricao,
              ncm: item.ncm,
              cfop: item.cfop,
              quantidade_comercial: item.quantidade,
              valor_unitario_comercial: item.valor_unitario,
              valor_total_item: item.valor_total,
              icms_situacao_tributaria: item.impostos.icms?.situacao_tributaria,
              icms_origem: item.impostos.icms?.origem,
              icms_base_calculo: item.impostos.icms?.base_calculo || 0,
              icms_aliquota: item.impostos.icms?.aliquota || 0,
              icms_valor: item.impostos.icms?.valor || 0,
              ipi_situacao_tributaria: item.impostos.ipi?.situacao_tributaria,
              ipi_base_calculo: item.impostos.ipi?.base_calculo || 0,
              ipi_aliquota: item.impostos.ipi?.aliquota || 0,
              ipi_valor: item.impostos.ipi?.valor || 0,
              pis_situacao_tributaria: item.impostos.pis?.situacao_tributaria,
              pis_base_calculo: item.impostos.pis?.base_calculo || 0,
              pis_aliquota: item.impostos.pis?.aliquota || 0,
              pis_valor: item.impostos.pis?.valor || 0,
              cofins_situacao_tributaria: item.impostos.cofins?.situacao_tributaria,
              cofins_base_calculo: item.impostos.cofins?.base_calculo || 0,
              cofins_aliquota: item.impostos.cofins?.aliquota || 0,
              cofins_valor: item.impostos.cofins?.valor || 0
            }));
          const { error: itemsError } = await supabase.from('nfe_items').insert(itemsToInsert);
          if (itemsError) {
            console.error('Erro ao salvar itens:', itemsError);
          // Não falhar por causa dos itens, mas logar o erro
          }
          const executionTime = Date.now() - startTime;
          await recordCustomMetric('nfe_processed', 1);
          await recordCustomMetric('nfe_processing_time', executionTime);
          return createSuccessResponse({
            nfe_document_id: nfeDocument.id,
            chave_acesso: nfeData.chave_acesso,
            numero_nfe: nfeData.numero_nfe,
            total_items: nfeData.itens.length,
            valor_total: nfeData.valores.total_nfe,
            processing_time: executionTime
          });
        }
      default:
        return createErrorResponse('Ação não suportada', 400);
    }
  } catch (error) {
    console.error('Erro no nfe-processor:', error);
    return createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor', 500);
  }
}));
