import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GuiaPDFInput {
  calculoId: string
  tipoGuia: 'DAS' | 'DARF' | 'GPS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { calculoId, tipoGuia }: GuiaPDFInput = await req.json()

    // Buscar dados do cálculo
    const { data: calculo, error: calculoError } = await supabaseClient
      .from('calculos_fiscais')
      .select(`
        *,
        empresas (
          razao_social,
          cnpj,
          endereco,
          cidade,
          estado,
          cep
        )
      `)
      .eq('id', calculoId)
      .single()

    if (calculoError || !calculo) {
      throw new Error('Cálculo não encontrado')
    }

    // Gerar HTML da guia
    const htmlContent = generateGuiaHTML(calculo, tipoGuia)

    // Simular geração de PDF (em produção usaria puppeteer ou similar)
    const pdfBuffer = await generatePDF(htmlContent)

    // Upload do PDF para storage
    const fileName = `guia-${tipoGuia.toLowerCase()}-${calculoId}-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('documentos')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      throw new Error('Erro ao fazer upload do PDF')
    }

    // Atualizar registro do cálculo com link do PDF
    const { error: updateError } = await supabaseClient
      .from('calculos_fiscais')
      .update({ 
        guia_pdf_url: uploadData.path,
        updated_at: new Date().toISOString()
      })
      .eq('id', calculoId)

    if (updateError) {
      console.error('Erro ao atualizar cálculo:', updateError)
    }

    // Gerar URL pública do PDF
    const { data: publicUrl } = supabaseClient.storage
      .from('documentos')
      .getPublicUrl(uploadData.path)

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: publicUrl.publicUrl,
        fileName
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

function generateGuiaHTML(calculo: any, tipoGuia: string): string {
  const empresa = calculo.empresas
  const valor = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(calculo.valor_imposto)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Guia ${tipoGuia} - ${empresa.razao_social}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .empresa-info { margin-bottom: 20px; }
        .calculo-info { margin-bottom: 20px; }
        .valor-destaque { font-size: 24px; font-weight: bold; color: #d32f2f; }
        .codigo-barras { font-family: monospace; font-size: 12px; margin: 20px 0; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GUIA DE RECOLHIMENTO - ${tipoGuia}</h1>
        <p>Documento Auxiliar de Arrecadação</p>
      </div>
      
      <div class="empresa-info">
        <h3>Dados da Empresa</h3>
        <p><strong>Razão Social:</strong> ${empresa.razao_social}</p>
        <p><strong>CNPJ:</strong> ${empresa.cnpj}</p>
        <p><strong>Endereço:</strong> ${empresa.endereco}, ${empresa.cidade}/${empresa.estado} - ${empresa.cep}</p>
      </div>
      
      <div class="calculo-info">
        <h3>Dados do Recolhimento</h3>
        <p><strong>Competência:</strong> ${calculo.competencia}</p>
        <p><strong>Data de Vencimento:</strong> ${new Date(calculo.data_vencimento).toLocaleDateString('pt-BR')}</p>
        <p><strong>Alíquota Efetiva:</strong> ${calculo.aliquota_efetiva}%</p>
        <p class="valor-destaque"><strong>Valor a Recolher:</strong> ${valor}</p>
      </div>
      
      <div class="codigo-barras">
        <p><strong>Código de Barras:</strong></p>
        <p>${calculo.codigo_barras}</p>
      </div>
      
      <div class="footer">
        <p>Documento gerado automaticamente pelo ContabilidadePRO</p>
        <p>Data de Geração: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
  `
}

async function generatePDF(htmlContent: string): Promise<Uint8Array> {
  // Em produção, usaria uma biblioteca como puppeteer
  // Por enquanto, retorna um PDF simulado
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Guia de Pagamento - PDF Simulado) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`

  return new TextEncoder().encode(pdfContent)
}
