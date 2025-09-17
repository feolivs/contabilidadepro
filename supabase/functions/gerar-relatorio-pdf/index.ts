import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// Importar jsPDF melhorado
import jsPDF from 'https://esm.sh/jspdf@2.5.1';
// Importar schemas de validação Zod
import { GerarRelatorioPdfSchema, validarSchema, sanitizarEntrada } from '../_shared/schemas.ts';
// Importar serviço de cache
import { CacheService } from '../_shared/cache-service.ts';
// Importar sistema de monitoramento
import { MonitoringService } from '../_shared/monitoring.ts';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Inicializar monitoramento
    const monitoring = new MonitoringService(supabase, 'gerar-relatorio-pdf');
    // Obter e sanitizar dados de entrada
    const dadosBrutos = await req.json();
    const dadosSanitizados = sanitizarEntrada(dadosBrutos);
    // Validar dados com Zod
    const validacao = validarSchema(GerarRelatorioPdfSchema, dadosSanitizados, 'gerar-relatorio-pdf');
    if (!validacao.sucesso) {
      console.error('[VALIDACAO_FALHOU]', validacao.erros);
      return new Response(JSON.stringify({
        success: false,
        error: 'Dados de entrada inválidos',
        detalhes: validacao.erros
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const request = validacao.dados;
    console.log(`[GERAR_RELATORIO] Iniciando geração: ${request.template_id}`);
    // Iniciar monitoramento
    await monitoring.startFunction(request.user_id, {
      template_id: request.template_id,
      filtros: request.filtros,
      enviar_email: request.enviar_email,
      destinatarios_count: request.destinatarios?.length || 0
    });
    // Inicializar serviço de cache
    const cacheService = new CacheService(supabase);
    // Verificar se existe cache válido
    const cacheEntry = await cacheService.verificarCache(request.user_id, request.template_id, request.filtros, request.opcoes);
    if (cacheEntry) {
      console.log(`[CACHE_HIT] Retornando relatório do cache`);
      // Log do cache hit
      await monitoring.logCacheEvent(true, request.user_id, {
        template_id: request.template_id,
        cache_key: cacheEntry.metadata.chave,
        cache_age_hours: Math.round((Date.now() - new Date(cacheEntry.metadata.criado_em).getTime()) / (1000 * 60 * 60))
      });
      // Se deve enviar email, fazer isso em background
      if (request.enviar_email && request.destinatarios?.length) {
        // Enviar email em background (não aguardar)
        enviarEmailBackground(supabase, request, cacheEntry.url_download).catch((error)=>console.error('[EMAIL_BACKGROUND_ERROR]', error));
      }
      return new Response(JSON.stringify({
        success: true,
        data: {
          template_id: request.template_id,
          arquivo_nome: `relatorio_cache_${Date.now()}.pdf`,
          download_url: cacheEntry.url_download,
          storage_path: `cache/${request.user_id}/${cacheEntry.metadata.chave}.pdf`,
          email_enviado: request.enviar_email || false,
          cache_hit: true,
          cache_metadata: {
            criado_em: cacheEntry.metadata.criado_em,
            acessos: cacheEntry.metadata.acessos + 1
          }
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // 1. Buscar template do relatório
    const { data: template, error: templateError } = await supabase.from('templates_relatorio').select('*').eq('id', request.template_id).eq('user_id', request.user_id).single();
    if (templateError || !template) {
      console.error('[TEMPLATE_ERROR]', templateError);
      await monitoring.logError(new Error(`Template não encontrado: ${templateError?.message || 'Template não existe'}`), request.user_id, {
        template_id: request.template_id,
        error_type: 'template_not_found'
      });
      throw new Error(`Template não encontrado: ${templateError?.message || 'Template não existe'}`);
    }
    // Log cache miss (gerando novo relatório)
    await monitoring.logCacheEvent(false, request.user_id, {
      template_id: request.template_id,
      template_nome: template.nome,
      template_tipo: template.tipo
    });
    // 2. Coletar dados para o relatório
    const dados = await coletarDadosRelatorio(supabase, request);
    // 3. Gerar HTML do relatório
    const htmlRelatorio = await gerarHtmlRelatorio(template, dados, supabase, request.user_id);
    // 4. Converter HTML para PDF usando jsPDF melhorado
    const pdfBuffer = await gerarPdfMelhorado(htmlRelatorio, template, request);
    // Log geração de PDF
    await monitoring.logPdfEvent(true, pdfBuffer.length, request.user_id, {
      template_id: request.template_id,
      template_nome: template.nome,
      html_size_chars: htmlRelatorio.length
    });
    // 5. Salvar PDF no storage
    const nomeArquivoLimpo = template.nome.replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .toLowerCase(); // Converte para minúsculas
    const nomeArquivo = `relatorio_${nomeArquivoLimpo}_${new Date().toISOString().split('T')[0]}.pdf`;
    const caminhoStorage = `${request.user_id}/relatorios/${Date.now()}_${nomeArquivo}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('portal-cliente-docs').upload(caminhoStorage, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    });
    if (uploadError) {
      throw new Error(`Erro ao salvar PDF: ${uploadError.message}`);
    }
    // 6. Gerar URL assinada para download
    const { data: urlData, error: urlError } = await supabase.storage.from('portal-cliente-docs').createSignedUrl(caminhoStorage, 3600 * 24); // 24 horas
    if (urlError) {
      throw new Error(`Erro ao gerar URL: ${urlError.message}`);
    }
    // 6.5. Salvar no cache para futuras consultas
    try {
      const cacheSalvo = await cacheService.salvarCache(request.user_id, request.template_id, request.filtros, pdfBuffer, template.tipo, request.opcoes);
      if (cacheSalvo) {
        console.log(`[CACHE_SAVED] Relatório salvo no cache para futuras consultas`);
      }
    } catch (cacheError) {
      console.warn('[CACHE_SAVE_WARNING]', cacheError);
    // Não falhar a operação se o cache falhar
    }
    // 7. Enviar por email se solicitado
    let emailEnviado = false;
    if (request.enviar_email && request.destinatarios?.length) {
      try {
        await enviarRelatorioPorEmail(supabase, request.user_id, template, urlData.signedUrl, request.destinatarios, dados);
        emailEnviado = true;
      } catch (emailError) {
        console.warn('[EMAIL_WARNING]', emailError);
      // Não falhar a geração se o email falhar
      }
    }
    // 8. Log de auditoria
    await supabase.from('auditoria_portal').insert({
      cliente_id: null,
      user_id: request.user_id,
      acao: 'gerar_relatorio',
      recurso: template.id,
      detalhes: {
        template_nome: template.nome,
        tipo: template.tipo,
        filtros: request.filtros,
        email_enviado: emailEnviado,
        destinatarios_count: request.destinatarios?.length || 0
      },
      sucesso: true
    });
    console.log(`[GERAR_RELATORIO] Concluído: ${request.template_id}`);
    // Finalizar monitoramento
    await monitoring.endFunction(request.user_id, {
      template_id: request.template_id,
      arquivo_nome: nomeArquivo,
      pdf_size_bytes: pdfBuffer.length,
      email_enviado: emailEnviado,
      cache_saved: true
    });
    return new Response(JSON.stringify({
      success: true,
      data: {
        template_id: request.template_id,
        arquivo_nome: nomeArquivo,
        download_url: urlData.signedUrl,
        storage_path: caminhoStorage,
        email_enviado: emailEnviado,
        dados_resumo: {
          documentos_count: dados.documentos.length,
          clientes_count: dados.clientes.length,
          periodo: dados.periodo
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
    console.error('[GERAR_RELATORIO_ERROR]', error);
    console.error('[ERROR_STACK]', error.stack);
    // Log do erro no monitoramento
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const monitoring = new MonitoringService(supabase, 'gerar-relatorio-pdf');
      await monitoring.logError(error, undefined, {
        function_stage: 'unknown',
        error_type: error.constructor.name
      });
    } catch (monitoringError) {
      console.error('[MONITORING_ERROR]', monitoringError);
    }
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error.stack || 'Stack trace não disponível'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// Função para coletar dados do relatório
async function coletarDadosRelatorio(supabase, request) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  const dataInicio = request.filtros?.data_inicio || inicioMes.toISOString();
  const dataFim = request.filtros?.data_fim || fimMes.toISOString();
  // Buscar documentos
  let queryDocumentos = supabase.from('documentos_portal').select(`
      *,
      portal_clientes!inner(nome, email, empresa_id)
    `).gte('created_at', dataInicio).lte('created_at', dataFim);
  if (request.filtros?.cliente_ids?.length) {
    queryDocumentos = queryDocumentos.in('cliente_id', request.filtros.cliente_ids);
  }
  if (request.filtros?.tipos_documento?.length) {
    queryDocumentos = queryDocumentos.in('tipo_documento', request.filtros.tipos_documento);
  }
  const { data: documentos, error: docError } = await queryDocumentos;
  if (docError) {
    throw new Error(`Erro ao buscar documentos: ${docError.message}`);
  }
  // Buscar clientes únicos
  const clienteIds = [
    ...new Set(documentos?.map((d)=>d.cliente_id) || [])
  ];
  const { data: clientes, error: clienteError } = await supabase.from('portal_clientes').select('*').in('id', clienteIds);
  if (clienteError) {
    throw new Error(`Erro ao buscar clientes: ${clienteError.message}`);
  }
  // Calcular métricas
  const metricas = {
    total_documentos: documentos?.length || 0,
    documentos_processados: documentos?.filter((d)=>d.status_processamento === 'concluido').length || 0,
    documentos_pendentes: documentos?.filter((d)=>d.status_processamento === 'pendente').length || 0,
    documentos_erro: documentos?.filter((d)=>d.status_processamento === 'erro').length || 0,
    total_clientes: clientes?.length || 0,
    tipos_documento: documentos?.reduce((acc, doc)=>{
      acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1;
      return acc;
    }, {}) || {}
  };
  return {
    documentos: documentos || [],
    clientes: clientes || [],
    metricas,
    periodo: {
      inicio: dataInicio,
      fim: dataFim
    }
  };
}
// Função para gerar HTML do relatório
async function gerarHtmlRelatorio(template, dados, supabase, userId) {
  // Buscar configurações visuais do usuário
  const { data: configVisuais } = await supabase.from('configuracoes_visuais').select('*').eq('user_id', userId).single();
  const cores = {
    primaria: configVisuais?.cor_primaria || '#3B82F6',
    secundaria: configVisuais?.cor_secundaria || '#64748B',
    accent: configVisuais?.cor_accent || '#10B981',
    texto: configVisuais?.cor_texto || '#1F2937'
  };
  const estrutura = template.estrutura_json;
  const estilo = template.configuracoes_estilo;
  // Gerar CSS otimizado para Puppeteer
  const css = `
    <style>
      @page {
        size: A4;
        margin: 20mm 15mm 25mm 15mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: ${estilo.fonte || 'Arial'}, sans-serif;
        font-size: ${estilo.tamanho_fonte || 12}px;
        color: ${cores.texto};
        line-height: 1.4;
        margin: 0;
        padding: 20px;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
        print-color-adjust: exact;
      }

      .cabecalho {
        border-bottom: 2px solid ${cores.primaria};
        padding-bottom: 20px;
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .titulo {
        color: ${cores.primaria};
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        text-align: center;
      }

      .periodo {
        color: ${cores.secundaria};
        font-size: 14px;
        text-align: center;
        margin-bottom: 10px;
      }

      .secao {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .secao-titulo {
        color: ${cores.primaria};
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        border-bottom: 1px solid ${cores.primaria};
        padding-bottom: 5px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid ${estilo.cores?.bordas || '#E5E7EB'};
        padding: 8px;
        text-align: left;
        page-break-inside: avoid;
      }

      th {
        background-color: ${cores.primaria};
        color: white;
        font-weight: bold;
        page-break-after: avoid;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      .page-break {
        page-break-before: always;
      }

      .page-break-after {
        page-break-after: always;
      }

      .avoid-break {
        page-break-inside: avoid;
      }

      .rodape {
        border-top: 1px solid ${cores.secundaria};
        padding-top: 20px;
        margin-top: 40px;
        text-align: center;
        color: ${cores.secundaria};
        font-size: 10px;
        page-break-inside: avoid;
      }

      .metricas {
        display: flex;
        justify-content: space-around;
        margin: 20px 0;
        page-break-inside: avoid;
      }

      .metrica {
        text-align: center;
        padding: 15px;
        border: 1px solid ${cores.secundaria};
        border-radius: 5px;
        flex: 1;
        margin: 0 5px;
      }

      .metrica-valor {
        font-size: 24px;
        font-weight: bold;
        color: ${cores.primaria};
        display: block;
      }

      .metrica-label {
        font-size: 12px;
        color: ${cores.secundaria};
        display: block;
        margin-top: 5px;
      }

      .grafico-container {
        page-break-inside: avoid;
        margin: 20px 0;
        text-align: center;
      }

      .no-print {
        display: none !important;
      }
    </style>
  `;
  // Gerar cabeçalho
  let cabecalho = '';
  if (estrutura.cabecalho?.mostrar_logo && configVisuais?.logo_url) {
    cabecalho += `<img src="${configVisuais.logo_url}" alt="Logo" style="height: 60px; margin-bottom: 20px;">`;
  }
  cabecalho += `
    <div class="cabecalho">
      <div class="titulo">${estrutura.cabecalho?.titulo || template.nome}</div>
      ${estrutura.cabecalho?.periodo ? `<div class="periodo">Período: ${new Date(dados.periodo.inicio).toLocaleDateString('pt-BR')} a ${new Date(dados.periodo.fim).toLocaleDateString('pt-BR')}</div>` : ''}
    </div>
  `;
  // Gerar métricas
  const metricas = `
    <div class="metricas">
      <div class="metrica">
        <div class="metrica-valor">${dados.metricas.total_documentos}</div>
        <div class="metrica-label">Total de Documentos</div>
      </div>
      <div class="metrica">
        <div class="metrica-valor">${dados.metricas.documentos_processados}</div>
        <div class="metrica-label">Processados</div>
      </div>
      <div class="metrica">
        <div class="metrica-valor">${dados.metricas.documentos_pendentes}</div>
        <div class="metrica-label">Pendentes</div>
      </div>
      <div class="metrica">
        <div class="metrica-valor">${dados.metricas.total_clientes}</div>
        <div class="metrica-label">Clientes</div>
      </div>
    </div>
  `;
  // Gerar seções
  let secoes = '';
  for (const secao of estrutura.secoes || []){
    secoes += `<div class="secao">`;
    secoes += `<div class="secao-titulo">${secao.titulo}</div>`;
    if (secao.tipo === 'tabela' && secao.dados === 'documentos') {
      secoes += gerarTabelaDocumentos(dados.documentos, secao.colunas);
    } else if (secao.tipo === 'tabela' && secao.dados === 'clientes') {
      secoes += gerarTabelaClientes(dados.clientes, secao.colunas);
    }
    secoes += `</div>`;
  }
  // Gerar rodapé
  const rodape = `
    <div class="rodape">
      ${estrutura.rodape?.mostrar_assinatura ? `<p>Relatório gerado automaticamente pelo ${configVisuais?.titulo_portal || 'Portal do Cliente'}</p>` : ''}
      ${estrutura.rodape?.texto_personalizado ? `<p>${estrutura.rodape.texto_personalizado}</p>` : ''}
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${template.nome}</title>
      ${css}
    </head>
    <body>
      ${cabecalho}
      ${metricas}
      ${secoes}
      ${rodape}
    </body>
    </html>
  `;
}
// Função para gerar tabela de documentos
function gerarTabelaDocumentos(documentos, colunas) {
  if (!documentos.length) {
    return '<p>Nenhum documento encontrado no período.</p>';
  }
  const cabecalhos = colunas.map((col)=>{
    const labels = {
      nome: 'Nome do Arquivo',
      tipo: 'Tipo',
      data: 'Data',
      status: 'Status',
      cliente: 'Cliente',
      tamanho: 'Tamanho'
    };
    return labels[col] || col;
  }).join('');
  const linhas = documentos.map((doc)=>{
    return colunas.map((col)=>{
      switch(col){
        case 'nome':
          return `<td>${doc.nome_arquivo}</td>`;
        case 'tipo':
          return `<td>${doc.tipo_documento}</td>`;
        case 'data':
          return `<td>${new Date(doc.created_at).toLocaleDateString('pt-BR')}</td>`;
        case 'status':
          return `<td>${doc.status_processamento}</td>`;
        case 'cliente':
          return `<td>${doc.portal_clientes?.nome || 'N/A'}</td>`;
        case 'tamanho':
          return `<td>${(doc.tamanho / 1024).toFixed(1)} KB</td>`;
        default:
          return `<td>${doc[col] || 'N/A'}</td>`;
      }
    }).join('');
  }).join('');
  return `
    <table>
      <thead>
        <tr>${cabecalhos}</tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}
// Função para gerar tabela de clientes
function gerarTabelaClientes(clientes, colunas) {
  if (!clientes.length) {
    return '<p>Nenhum cliente encontrado.</p>';
  }
  const cabecalhos = colunas.map((col)=>{
    const labels = {
      nome: 'Nome',
      email: 'Email',
      telefone: 'Telefone',
      ultimo_acesso: 'Último Acesso',
      documentos_count: 'Documentos'
    };
    return `<th>${labels[col] || col}</th>`;
  }).join('');
  const linhas = clientes.map((cliente)=>{
    return `<tr>${colunas.map((col)=>{
      switch(col){
        case 'nome':
          return `<td>${cliente.nome}</td>`;
        case 'email':
          return `<td>${cliente.email}</td>`;
        case 'telefone':
          return `<td>${cliente.telefone || 'N/A'}</td>`;
        case 'ultimo_acesso':
          return `<td>${cliente.ultimo_acesso ? new Date(cliente.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca'}</td>`;
        default:
          return `<td>${cliente[col] || 'N/A'}</td>`;
      }
    }).join('')}</tr>`;
  }).join('');
  return `
    <table>
      <thead>
        <tr>${cabecalhos}</tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}
// Função melhorada para gerar PDF com jsPDF
async function gerarPdfMelhorado(html, template, request) {
  try {
    const pdf = new jsPDF({
      orientation: request.opcoes?.orientacao === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: request.opcoes?.formato || 'a4',
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });
    // Configurações da página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    // Extrair conteúdo estruturado do HTML
    const content = extrairConteudoEstruturado(html);
    let yPosition = margin;
    // Adicionar cabeçalho com logo (se disponível)
    if (template.configuracoes_estilo?.mostrar_logo) {
      yPosition += 15; // Espaço para logo
    }
    // Adicionar título
    if (content.titulo) {
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246); // Cor primária
      const tituloLines = pdf.splitTextToSize(content.titulo, contentWidth);
      for (const line of tituloLines){
        pdf.text(line, pageWidth / 2, yPosition, {
          align: 'center'
        });
        yPosition += 8;
      }
      yPosition += 5;
    }
    // Adicionar período/subtítulo
    if (content.periodo) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139); // Cor secundária
      pdf.text(content.periodo, pageWidth / 2, yPosition, {
        align: 'center'
      });
      yPosition += 15;
    }
    // Adicionar linha separadora
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    // Adicionar métricas (se existirem)
    if (content.metricas && content.metricas.length > 0) {
      yPosition = adicionarMetricasAoPdf(pdf, content.metricas, margin, yPosition, contentWidth);
      yPosition += 10;
    }
    // Adicionar seções
    for (const secao of content.secoes){
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin + 10;
      }
      // Título da seção
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text(secao.titulo, margin, yPosition);
      yPosition += 8;
      // Linha sob o título
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, margin + 60, yPosition);
      yPosition += 8;
      // Conteúdo da seção
      if (secao.tipo === 'tabela' && secao.dados) {
        yPosition = adicionarTabelaAoPdf(pdf, secao.dados, margin, yPosition, contentWidth, pageHeight);
      } else if (secao.conteudo) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
        const linhas = pdf.splitTextToSize(secao.conteudo, contentWidth);
        for (const linha of linhas){
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin + 10;
          }
          pdf.text(linha, margin, yPosition);
          yPosition += 5;
        }
      }
      yPosition += 10; // Espaço entre seções
    }
    // Adicionar marca d'água se especificada
    if (request.opcoes?.marca_dagua) {
      adicionarMarcaDagua(pdf, request.opcoes.marca_dagua);
    }
    // Adicionar rodapé em todas as páginas
    adicionarRodapeCompleto(pdf, template);
    // Converter para Uint8Array
    const pdfOutput = pdf.output('arraybuffer');
    return new Uint8Array(pdfOutput);
  } catch (error) {
    console.error('[PDF_MELHORADO_ERROR]', error);
    throw new Error(`Erro na geração do PDF: ${error.message}`);
  }
}
// Função para extrair conteúdo estruturado do HTML
function extrairConteudoEstruturado(html) {
  const content = {
    titulo: '',
    periodo: '',
    metricas: [],
    secoes: []
  };
  // Extrair título
  const tituloMatch = html.match(/<div class="titulo"[^>]*>(.*?)<\/div>/i) || html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (tituloMatch) {
    content.titulo = tituloMatch[1].replace(/<[^>]+>/g, '').trim();
  }
  // Extrair período
  const periodoMatch = html.match(/<div class="periodo"[^>]*>(.*?)<\/div>/i);
  if (periodoMatch) {
    content.periodo = periodoMatch[1].replace(/<[^>]+>/g, '').trim();
  }
  // Extrair métricas
  const metricasMatch = html.match(/<div class="metricas"[^>]*>(.*?)<\/div>/is);
  if (metricasMatch) {
    const metricaMatches = metricasMatch[1].matchAll(/<div class="metrica"[^>]*>(.*?)<\/div>/gis);
    for (const metricaMatch of metricaMatches){
      const valorMatch = metricaMatch[1].match(/<div class="metrica-valor"[^>]*>(.*?)<\/div>/i);
      const labelMatch = metricaMatch[1].match(/<div class="metrica-label"[^>]*>(.*?)<\/div>/i);
      if (valorMatch && labelMatch) {
        content.metricas.push({
          valor: valorMatch[1].replace(/<[^>]+>/g, '').trim(),
          label: labelMatch[1].replace(/<[^>]+>/g, '').trim()
        });
      }
    }
  }
  // Extrair seções
  const secaoMatches = html.matchAll(/<div class="secao"[^>]*>(.*?)<\/div>/gis);
  for (const secaoMatch of secaoMatches){
    const secaoHtml = secaoMatch[1];
    const tituloSecaoMatch = secaoHtml.match(/<div class="secao-titulo"[^>]*>(.*?)<\/div>/i);
    const tituloSecao = tituloSecaoMatch ? tituloSecaoMatch[1].replace(/<[^>]+>/g, '').trim() : 'Seção';
    // Verificar se é uma tabela
    if (secaoHtml.includes('<table')) {
      const dadosTabela = extrairDadosTabela(secaoHtml);
      content.secoes.push({
        titulo: tituloSecao,
        tipo: 'tabela',
        dados: dadosTabela
      });
    } else {
      const conteudoSecao = secaoHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      content.secoes.push({
        titulo: tituloSecao,
        tipo: 'texto',
        conteudo: conteudoSecao
      });
    }
  }
  return content;
}
// Função para extrair dados de tabela
function extrairDadosTabela(html) {
  const linhas = [];
  const linhaMatches = html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis);
  for (const linhaMatch of linhaMatches){
    const linha = [];
    const celulaMatches = linhaMatch[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis);
    for (const celulaMatch of celulaMatches){
      linha.push(celulaMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (linha.length > 0) {
      linhas.push(linha);
    }
  }
  return {
    linhas
  };
}
// Função para adicionar métricas ao PDF
function adicionarMetricasAoPdf(pdf, metricas, x, y, width) {
  const numMetricas = metricas.length;
  const metricaWidth = width / numMetricas;
  const currentY = y;
  for(let i = 0; i < numMetricas; i++){
    const metrica = metricas[i];
    const metricaX = x + i * metricaWidth;
    // Desenhar borda da métrica
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.rect(metricaX + 5, currentY, metricaWidth - 10, 20);
    // Valor da métrica
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(metrica.valor, metricaX + metricaWidth / 2, currentY + 8, {
      align: 'center'
    });
    // Label da métrica
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(metrica.label, metricaX + metricaWidth / 2, currentY + 15, {
      align: 'center'
    });
  }
  return currentY + 25;
}
// Função para adicionar tabela ao PDF
function adicionarTabelaAoPdf(pdf, dados, x, y, width, pageHeight) {
  if (!dados.linhas || dados.linhas.length === 0) return y;
  const alturaLinha = 8;
  const paddingCelula = 2;
  let currentY = y;
  // Calcular largura das colunas
  const numCols = dados.linhas[0].length;
  const larguraColuna = width / numCols;
  // Adicionar cabeçalho se existir
  if (dados.linhas.length > 0) {
    pdf.setFillColor(59, 130, 246);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    for(let i = 0; i < dados.linhas[0].length; i++){
      pdf.rect(x + i * larguraColuna, currentY, larguraColuna, alturaLinha, 'F');
      pdf.text(dados.linhas[0][i], x + i * larguraColuna + paddingCelula, currentY + alturaLinha - paddingCelula);
    }
    currentY += alturaLinha;
  }
  // Adicionar linhas de dados
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  for(let linhaIndex = 1; linhaIndex < dados.linhas.length; linhaIndex++){
    const linha = dados.linhas[linhaIndex];
    // Verificar se precisa de nova página
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = 30;
    }
    for(let colIndex = 0; colIndex < linha.length; colIndex++){
      // Desenhar borda da célula
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.rect(x + colIndex * larguraColuna, currentY, larguraColuna, alturaLinha);
      // Adicionar texto da célula
      pdf.text(linha[colIndex], x + colIndex * larguraColuna + paddingCelula, currentY + alturaLinha - paddingCelula);
    }
    currentY += alturaLinha;
  }
  return currentY + 5;
}
// Função para adicionar marca d'água
function adicionarMarcaDagua(pdf, texto) {
  const totalPaginas = pdf.getNumberOfPages();
  for(let i = 1; i <= totalPaginas; i++){
    pdf.setPage(i);
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.text(texto, pageWidth / 2, pageHeight / 2, {
      angle: -45,
      align: 'center'
    });
  }
}
// Função para adicionar rodapé completo
function adicionarRodapeCompleto(pdf, template) {
  const totalPaginas = pdf.getNumberOfPages();
  for(let i = 1; i <= totalPaginas; i++){
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Linha separadora
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    // Informações do rodapé
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const textoEsquerda = 'ContábilPro ERP - Sistema de Gestão Contábil';
    const textoCentro = `Gerado em: ${dataGeracao}`;
    const textoDireita = `Página ${i} de ${totalPaginas}`;
    pdf.text(textoEsquerda, 20, pageHeight - 10);
    pdf.text(textoCentro, pageWidth / 2, pageHeight - 10, {
      align: 'center'
    });
    pdf.text(textoDireita, pageWidth - 20, pageHeight - 10, {
      align: 'right'
    });
  }
}
// Função para gerar template de cabeçalho
function gerarCabecalhoTemplate(template) {
  return `
    <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 15mm; padding: 5mm 0; border-bottom: 1px solid #ccc;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzAwN2JmZiIvPgo8dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DUDwvdGV4dD4KPHN2Zz4K" alt="Logo" style="height: 20px;">
        </div>
        <div style="flex: 2; text-align: center;">
          <strong>ContábilPro ERP</strong><br>
          <span>${template.nome}</span>
        </div>
        <div style="flex: 1; text-align: right;">
          <span>Data: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  `;
}
// Função para gerar template de rodapé
function gerarRodapeTemplate(template) {
  return `
    <div style="font-size: 9px; text-align: center; width: 100%; margin: 0 15mm; padding: 5mm 0; border-top: 1px solid #ccc;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <span>ContábilPro ERP - Sistema de Gestão Contábil</span>
        </div>
        <div style="flex: 1; text-align: center;">
          <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
        </div>
        <div style="flex: 1; text-align: right;">
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      </div>
    </div>
  `;
}
// Função para enviar email em background (cache hit)
async function enviarEmailBackground(supabase, request, downloadUrl) {
  try {
    const { error } = await supabase.functions.invoke('enviar-email', {
      body: {
        destinatarios: request.destinatarios,
        assunto: `Relatório ${request.template_id} - ContábilPro`,
        corpo_html: `
          <h2>Seu relatório está pronto!</h2>
          <p>O relatório solicitado foi gerado com sucesso.</p>
          <p><a href="${downloadUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Baixar Relatório</a></p>
          <p><small>Este link expira em 24 horas.</small></p>
        `,
        remetente_nome: 'ContábilPro',
        remetente_email: 'relatorios@contabilpro.com'
      }
    });
    if (error) {
      console.error('[EMAIL_BACKGROUND_ERROR]', error);
    } else {
      console.log('[EMAIL_BACKGROUND_SUCCESS] Email enviado com sucesso');
    }
  } catch (error) {
    console.error('[EMAIL_BACKGROUND_EXCEPTION]', error);
  }
}
// Função para enviar relatório por email
async function enviarRelatorioPorEmail(supabase, userId, template, downloadUrl, destinatarios, dados) {
  // Buscar template de email para relatórios
  const { data: templateEmail } = await supabase.from('templates_email').select('*').eq('user_id', userId).eq('tipo', 'relatorio_mensal').eq('ativo', true).single();
  const assunto = templateEmail?.assunto || `Relatório: ${template.nome}`;
  const corpo = templateEmail?.corpo_html || `
    <p>Olá,</p>
    <p>Segue em anexo o relatório <strong>${template.nome}</strong> referente ao período de ${new Date(dados.periodo.inicio).toLocaleDateString('pt-BR')} a ${new Date(dados.periodo.fim).toLocaleDateString('pt-BR')}.</p>
    <p><a href="${downloadUrl}">Clique aqui para baixar o relatório</a></p>
    <p>Resumo:</p>
    <ul>
      <li>Total de documentos: ${dados.metricas.total_documentos}</li>
      <li>Documentos processados: ${dados.metricas.documentos_processados}</li>
      <li>Clientes ativos: ${dados.metricas.total_clientes}</li>
    </ul>
    <p>Atenciosamente,<br>Equipe ContábilPro</p>
  `;
  // Chamar Edge Function de envio de email
  const { error } = await supabase.functions.invoke('enviar-email', {
    body: {
      destinatarios,
      assunto,
      corpo_html: corpo,
      remetente_nome: templateEmail?.remetente_nome || 'ContábilPro',
      remetente_email: templateEmail?.remetente_email || 'noreply@contabilpro.com'
    }
  });
  if (error) {
    throw new Error(`Erro ao enviar email: ${error.message}`);
  }
}
