import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { SPECIALIZED_PROMPTS } from '../_shared/specialized-prompts.ts';
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Parse request
    const { empresa_id, competencia, faturamento_12_meses, faturamento_mes, anexo = 'I' } = await req.json();
    console.log('[CALCULATE_DAS] 🧮 Iniciando cálculo de DAS:', {
      empresa_id,
      competencia,
      faturamento_12_meses,
      faturamento_mes,
      anexo
    });
    // Validate required fields
    if (!empresa_id || !competencia || !faturamento_12_meses || !faturamento_mes) {
      throw new Error('Campos obrigatórios: empresa_id, competencia, faturamento_12_meses, faturamento_mes');
    }
    // 1. Buscar dados da empresa
    const { data: empresa, error: empresaError } = await supabase.from('empresas').select('*').eq('id', empresa_id).single();
    if (empresaError || !empresa) {
      throw new Error('Empresa não encontrada');
    }
    // Verificar se está no Simples Nacional
    if (empresa.regime_tributario !== 'simples' && empresa.regime_tributario !== 'simples_nacional') {
      throw new Error('DAS aplicável apenas para empresas do Simples Nacional');
    }
    // 2. Validação inteligente com IA
    const validationResult = await validateDASDataWithAI({
      empresa,
      faturamento_12_meses,
      faturamento_mes,
      anexo,
      competencia
    });
    console.log('[CALCULATE_DAS] 🤖 Validação IA:', validationResult);
    // 3. Calcular DAS usando tabelas oficiais 2024
    const resultado = await calcularDAS(empresa, competencia, {
      faturamento_12_meses,
      faturamento_mes,
      anexo
    });
    // 4. Enriquecer resultado com validações IA
    const resultadoEnriquecido = {
      ...resultado,
      ai_validation: validationResult,
      warnings: validationResult.warnings || [],
      suggestions: validationResult.suggestions || [],
      anomalies: validationResult.anomalies || []
    };
    console.log('[CALCULATE_DAS] ✅ Cálculo concluído:', resultadoEnriquecido);
    // 5. Salvar resultado no histórico de cálculos
    const { error: insertError } = await supabase.from('fiscal_calculations').insert({
      empresa_id,
      tipo_calculo: 'das',
      competencia,
      dados_entrada: {
        faturamento_12_meses,
        faturamento_mes,
        anexo
      },
      resultado_calculo: resultadoEnriquecido,
      created_at: new Date().toISOString()
    });
    if (insertError) {
      console.warn('[CALCULATE_DAS] Erro ao salvar histórico:', insertError);
    // Não falhar por erro de histórico
    }
    // 4. Registrar auditoria
    await supabase.from('system_logs').insert({
      level: 'info',
      message: 'DAS calculado com sucesso',
      metadata: {
        empresa_id,
        competencia,
        valor_das: resultado.valor_das,
        anexo: resultado.anexo
      },
      created_at: new Date().toISOString()
    });
    console.log('[CALCULATE_DAS] ✅ DAS calculado com sucesso');
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...resultadoEnriquecido,
        empresa: {
          id: empresa.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          regime_tributario: empresa.regime_tributario
        },
        instrucoes: {
          titulo: 'Como gerar a guia DAS oficial',
          passos: [
            '1. Acesse o site oficial PGDAS-D da Receita Federal',
            '2. Faça login com seu certificado digital',
            '3. Selecione a competência: ' + competencia,
            '4. Informe o faturamento: R$ ' + faturamento_mes.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            }),
            '5. O sistema calculará automaticamente o valor: R$ ' + resultadoEnriquecido.valor_das.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            }),
            '6. Gere e imprima a guia para pagamento'
          ],
          link_oficial: resultadoEnriquecido.pgdas_url
        },
        ai_insights: {
          validation_performed: !!validationResult.confidence,
          warnings_count: validationResult.warnings?.length || 0,
          suggestions_count: validationResult.suggestions?.length || 0,
          anomalies_count: validationResult.anomalies?.length || 0
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[CALCULATE_DAS] ❌ Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// =====================================================
// TABELAS OFICIAIS SIMPLES NACIONAL 2024
// =====================================================
const TABELAS_SIMPLES_2024 = {
  'I': [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.0,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 7.3,
      deducao: 5940
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 9.5,
      deducao: 13860
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 10.7,
      deducao: 22500
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 14.3,
      deducao: 87300
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 19.0,
      deducao: 378000
    }
  ],
  'II': [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 7.8,
      deducao: 5940
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 10.0,
      deducao: 13860
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 11.2,
      deducao: 22500
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 14.7,
      deducao: 85500
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 30.0,
      deducao: 720000
    }
  ],
  'III': [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 6.0,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 11.2,
      deducao: 9360
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 13.5,
      deducao: 17640
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 16.0,
      deducao: 35640
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 21.0,
      deducao: 125640
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 33.0,
      deducao: 648000
    }
  ],
  'IV': [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 9.0,
      deducao: 8100
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 10.2,
      deducao: 12420
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 14.0,
      deducao: 39780
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 22.0,
      deducao: 183780
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 33.0,
      deducao: 828000
    }
  ],
  'V': [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 15.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 18.0,
      deducao: 4500
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 19.5,
      deducao: 9900
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 20.5,
      deducao: 17100
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 23.0,
      deducao: 62100
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 30.5,
      deducao: 540000
    }
  ]
};
/**
 * Calcula DAS usando tabelas oficiais do Simples Nacional 2024
 */ async function calcularDAS(empresa, competencia, dados) {
  const { faturamento_12_meses, faturamento_mes, anexo } = dados;
  // Buscar tabela do anexo
  const tabela = TABELAS_SIMPLES_2024[anexo];
  if (!tabela) {
    throw new Error(`Anexo ${anexo} inválido`);
  }
  // Encontrar faixa baseada no faturamento dos últimos 12 meses
  const faixa = tabela.find((f)=>faturamento_12_meses <= f.ate);
  if (!faixa) {
    throw new Error('Faturamento excede limite do Simples Nacional (R$ 4.800.000)');
  }
  // Calcular alíquota efetiva
  const aliquotaEfetiva = faturamento_12_meses > 0 ? (faturamento_12_meses * faixa.aliquota / 100 - faixa.deducao) / faturamento_12_meses * 100 : faixa.aliquota;
  // Calcular valor do DAS
  const valorDAS = faturamento_mes * (aliquotaEfetiva / 100);
  // Data de vencimento (dia 20 do mês seguinte)
  const [ano, mes] = competencia.split('-').map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const vencimento = `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-20`;
  return {
    empresa_id: empresa.id,
    competencia,
    anexo,
    faixa: faixa.faixa,
    faturamento_12_meses,
    faturamento_mes,
    aliquota_nominal: faixa.aliquota,
    aliquota_efetiva: Math.round(aliquotaEfetiva * 100) / 100,
    deducao: faixa.deducao,
    valor_das: Math.round(valorDAS * 100) / 100,
    vencimento,
    pgdas_url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgdas.app/Identificacao'
  };
}
/**
 * Validação inteligente dos dados de DAS com IA
 */ async function validateDASDataWithAI(data) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.warn('[VALIDATE_DAS] OpenAI API Key não configurada, pulando validação IA');
    return {
      valid: true,
      warnings: [],
      suggestions: []
    };
  }
  const validationPrompt = `${SPECIALIZED_PROMPTS.DATA_VALIDATION}

DADOS PARA VALIDAÇÃO DE DAS:
- Empresa: ${data.empresa.nome} (${data.empresa.cnpj})
- CNAE: ${data.empresa.atividade_principal || 'Não informado'}
- Regime: ${data.empresa.regime_tributario}
- Faturamento 12 meses: R$ ${data.faturamento_12_meses.toLocaleString('pt-BR')}
- Faturamento mês: R$ ${data.faturamento_mes.toLocaleString('pt-BR')}
- Anexo: ${data.anexo}
- Competência: ${data.competencia}

VALIDAÇÕES ESPECÍFICAS PARA DAS:
1. Faturamento dentro dos limites do Simples Nacional (até R$ 4.800.000)
2. Anexo correto para o CNAE informado
3. Proporção entre faturamento mensal e anual coerente
4. Competência válida e não futura
5. Possíveis indicadores de subfaturamento

Retorne JSON com:
{
  "valid": true/false,
  "warnings": ["lista de alertas"],
  "suggestions": ["recomendações"],
  "anomalies": ["possíveis problemas"],
  "confidence": 0.95
}`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: SPECIALIZED_PROMPTS.DAS_CALCULATOR
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });
    if (!response.ok) {
      console.warn('[VALIDATE_DAS] Erro na API OpenAI:', response.statusText);
      return {
        valid: true,
        warnings: [],
        suggestions: []
      };
    }
    const aiData = await response.json();
    const aiResponse = aiData.choices[0]?.message?.content;
    if (!aiResponse) {
      return {
        valid: true,
        warnings: [],
        suggestions: []
      };
    }
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('[VALIDATE_DAS] Erro ao parsear resposta IA:', parseError);
      return {
        valid: true,
        warnings: [],
        suggestions: [],
        raw_response: aiResponse
      };
    }
  } catch (error) {
    console.warn('[VALIDATE_DAS] Erro na validação IA:', error);
    return {
      valid: true,
      warnings: [],
      suggestions: []
    };
  }
} // =====================================================
 // FUNÇÕES REMOVIDAS (usar PGDAS-D oficial):
 // =====================================================
 // - generateDASPDF(): Geração de PDF removida
 // - generateBarCode(): Código de barras removido
 // - generateDocumentNumber(): Número de documento removido
 //
 // INSTRUÇÕES PARA CONTADORAS:
 // 1. Use os valores calculados nesta função
 // 2. Acesse https://www8.receita.fazenda.gov.br/SimplesNacional/
 // 3. Faça login com certificado digital
 // 4. Gere a guia oficial no PGDAS-D
 // =====================================================
