/**
 * 🏦 PARSER OFX MULTI-BANCO - ContábilPRO ERP
 * 
 * Parser robusto para arquivos OFX com suporte a:
 * - OFX 1.0, 2.0, QFX
 * - Múltiplos bancos brasileiros
 * - Validação e normalização
 * - Processamento em background
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// =====================================================
// CONFIGURAÇÕES DOS BANCOS BRASILEIROS
// =====================================================
const BRAZILIAN_BANKS = {
  '001': {
    name: 'Banco do Brasil',
    code: '001'
  },
  '033': {
    name: 'Santander',
    code: '033'
  },
  '104': {
    name: 'Caixa Econômica Federal',
    code: '104'
  },
  '237': {
    name: 'Bradesco',
    code: '237'
  },
  '341': {
    name: 'Itaú',
    code: '341'
  },
  '260': {
    name: 'Nu Pagamentos (Nubank)',
    code: '260'
  },
  '077': {
    name: 'Banco Inter',
    code: '077'
  },
  '212': {
    name: 'Banco Original',
    code: '212'
  },
  '290': {
    name: 'PagSeguro',
    code: '290'
  },
  '323': {
    name: 'Mercado Pago',
    code: '323'
  }
};
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
serve(async (req)=>{
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Verificar usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }
    const { ofx_content, empresa_id, conta_bancaria_id } = await req.json();
    if (!ofx_content || !empresa_id) {
      throw new Error('Parâmetros obrigatórios: ofx_content, empresa_id');
    }
    console.log('[OFX_PARSER] Iniciando parsing para empresa:', empresa_id);
    const startTime = Date.now();
    // Parse do OFX
    const result = await parseOFXContent(ofx_content);
    if (!result.success) {
      throw new Error(result.error || 'Erro no parsing do OFX');
    }
    // Salvar transações no banco
    const savedTransactions = await saveTransactionsToDatabase(supabase, result, empresa_id, conta_bancaria_id, user.id);
    const processingTime = Date.now() - startTime;
    console.log(`[OFX_PARSER] Processamento concluído em ${processingTime}ms`);
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result,
        saved_transactions: savedTransactions.length,
        processing_time_ms: processingTime
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[OFX_PARSER_ERROR]', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
// =====================================================
// FUNÇÕES DE PARSING
// =====================================================
/**
 * Parse principal do conteúdo OFX
 */ async function parseOFXContent(ofxContent) {
  const startTime = Date.now();
  const warnings = [];
  try {
    // Detectar encoding e versão
    const { content, encoding, version } = normalizeOFXContent(ofxContent);
    // Extrair informações da conta
    const account = extractAccountInfo(content, warnings);
    // Extrair transações
    const transactions = extractTransactions(content, warnings);
    // Extrair informações do statement
    const { dtstart, dtend, balamt, dtasof } = extractStatementInfo(content);
    // Identificar banco
    const bankInfo = identifyBank(account.bankid, warnings);
    const statement = {
      account,
      transactions,
      dtstart,
      dtend,
      balamt,
      dtasof
    };
    const processingTime = Date.now() - startTime;
    return {
      success: true,
      statement,
      transactions_count: transactions.length,
      bank_info: {
        bank_id: account.bankid,
        bank_name: bankInfo.name,
        account_id: account.acctid,
        account_type: account.accttype
      },
      parsing_metadata: {
        ofx_version: version,
        encoding,
        parsing_time_ms: processingTime,
        warnings
      }
    };
  } catch (error) {
    console.error('[OFX_PARSE_ERROR]', error);
    return {
      success: false,
      transactions_count: 0,
      bank_info: {
        bank_id: '',
        bank_name: '',
        account_id: '',
        account_type: ''
      },
      parsing_metadata: {
        ofx_version: 'unknown',
        encoding: 'unknown',
        parsing_time_ms: Date.now() - startTime,
        warnings: []
      },
      error: error.message
    };
  }
}
/**
 * Normalizar conteúdo OFX
 */ function normalizeOFXContent(content) {
  // Detectar encoding
  const encodingMatch = content.match(/ENCODING:([^\r\n]+)/i);
  const encoding = encodingMatch ? encodingMatch[1].trim() : 'UTF-8';
  // Detectar versão OFX
  const versionMatch = content.match(/VERSION:([^\r\n]+)/i);
  const version = versionMatch ? versionMatch[1].trim() : '1.0';
  // Normalizar quebras de linha
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Remover header SGML se presente
  const sgmlHeaderEnd = normalizedContent.indexOf('<OFX>');
  if (sgmlHeaderEnd > 0) {
    normalizedContent = normalizedContent.substring(sgmlHeaderEnd);
  }
  // Normalizar tags para uppercase (compatibilidade)
  normalizedContent = normalizedContent.replace(/<([^>]+)>/g, (match, tag)=>{
    return `<${tag.toUpperCase()}>`;
  });
  return {
    content: normalizedContent,
    encoding,
    version
  };
}
/**
 * Extrair informações da conta
 */ function extractAccountInfo(content, warnings) {
  // Buscar seção BANKACCTFROM
  const bankAcctMatch = content.match(/<BANKACCTFROM>(.*?)<\/BANKACCTFROM>/s);
  if (!bankAcctMatch) {
    // Tentar formato alternativo
    const altMatch = content.match(/<ACCTFROM>(.*?)<\/ACCTFROM>/s);
    if (!altMatch) {
      throw new Error('Informações da conta não encontradas no OFX');
    }
  }
  const accountSection = bankAcctMatch ? bankAcctMatch[1] : content;
  // Extrair campos
  const bankidMatch = accountSection.match(/<BANKID>([^<]+)/i);
  const acctidMatch = accountSection.match(/<ACCTID>([^<]+)/i);
  const accttypeMatch = accountSection.match(/<ACCTTYPE>([^<]+)/i);
  if (!bankidMatch || !acctidMatch) {
    throw new Error('BANKID ou ACCTID não encontrados');
  }
  const bankid = bankidMatch[1].trim();
  const acctid = acctidMatch[1].trim();
  const accttype = accttypeMatch?.[1]?.trim() || 'CHECKING';
  // Validar tipo de conta
  const validTypes = [
    'CHECKING',
    'SAVINGS',
    'INVESTMENT',
    'CREDITLINE'
  ];
  if (!validTypes.includes(accttype)) {
    warnings.push(`Tipo de conta desconhecido: ${accttype}, usando CHECKING`);
  }
  return {
    bankid,
    acctid,
    accttype: validTypes.includes(accttype) ? accttype : 'CHECKING'
  };
}
/**
 * Extrair transações
 */ function extractTransactions(content, warnings) {
  const transactions = [];
  // Buscar seção BANKTRANLIST
  const tranListMatch = content.match(/<BANKTRANLIST>(.*?)<\/BANKTRANLIST>/s);
  if (!tranListMatch) {
    warnings.push('Seção BANKTRANLIST não encontrada');
    return transactions;
  }
  // Extrair todas as transações STMTTRN
  const stmtTrnMatches = tranListMatch[1].match(/<STMTTRN>(.*?)<\/STMTTRN>/gs);
  if (!stmtTrnMatches) {
    warnings.push('Nenhuma transação STMTTRN encontrada');
    return transactions;
  }
  for (const stmtTrn of stmtTrnMatches){
    try {
      const transaction = parseTransaction(stmtTrn, warnings);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      warnings.push(`Erro ao processar transação: ${error.message}`);
    }
  }
  return transactions;
}
/**
 * Parse de uma transação individual
 */ function parseTransaction(stmtTrn, warnings) {
  // Campos obrigatórios
  const fitidMatch = stmtTrn.match(/<FITID>([^<]+)/i);
  const trnTypeMatch = stmtTrn.match(/<TRNTYPE>([^<]+)/i);
  const dtpostedMatch = stmtTrn.match(/<DTPOSTED>([^<]+)/i);
  const trnamtMatch = stmtTrn.match(/<TRNAMT>([^<]+)/i);
  if (!fitidMatch || !trnTypeMatch || !dtpostedMatch || !trnamtMatch) {
    warnings.push('Transação com campos obrigatórios faltando');
    return null;
  }
  // Campos opcionais
  const nameMatch = stmtTrn.match(/<NAME>([^<]+)/i);
  const memoMatch = stmtTrn.match(/<MEMO>([^<]+)/i);
  const checknumMatch = stmtTrn.match(/<CHECKNUM>([^<]+)/i);
  const payeeidMatch = stmtTrn.match(/<PAYEEID>([^<]+)/i);
  const refnumMatch = stmtTrn.match(/<REFNUM>([^<]+)/i);
  const fitid = fitidMatch[1].trim();
  const trnType = trnTypeMatch[1].trim();
  const dtposted = dtpostedMatch[1].trim();
  const trnamt = parseFloat(trnamtMatch[1].trim());
  // Determinar tipo (CREDIT/DEBIT)
  let type;
  if (trnamt >= 0) {
    type = 'CREDIT';
  } else {
    type = 'DEBIT';
  }
  // Normalizar data
  const normalizedDate = normalizeOFXDate(dtposted);
  return {
    fitid,
    type,
    dtposted: normalizedDate,
    trnamt: Math.abs(trnamt),
    name: nameMatch?.[1]?.trim(),
    memo: memoMatch?.[1]?.trim(),
    checknum: checknumMatch?.[1]?.trim(),
    payeeid: payeeidMatch?.[1]?.trim(),
    refnum: refnumMatch?.[1]?.trim()
  };
}
/**
 * Extrair informações do statement
 */ function extractStatementInfo(content) {
  const dtstartMatch = content.match(/<DTSTART>([^<]+)/i);
  const dtendMatch = content.match(/<DTEND>([^<]+)/i);
  const balamtMatch = content.match(/<BALAMT>([^<]+)/i);
  const dtasofMatch = content.match(/<DTASOF>([^<]+)/i);
  return {
    dtstart: dtstartMatch ? normalizeOFXDate(dtstartMatch[1].trim()) : '',
    dtend: dtendMatch ? normalizeOFXDate(dtendMatch[1].trim()) : '',
    balamt: balamtMatch ? parseFloat(balamtMatch[1].trim()) : undefined,
    dtasof: dtasofMatch ? normalizeOFXDate(dtasofMatch[1].trim()) : undefined
  };
}
/**
 * Identificar banco pelo código
 */ function identifyBank(bankId, warnings) {
  const bank = BRAZILIAN_BANKS[bankId];
  if (!bank) {
    warnings.push(`Banco não identificado: ${bankId}`);
    return {
      name: `Banco ${bankId}`,
      code: bankId
    };
  }
  return bank;
}
/**
 * Normalizar data OFX para ISO
 */ function normalizeOFXDate(ofxDate) {
  // Formato OFX: YYYYMMDD[HHMMSS[.SSS]][TZ]
  const cleanDate = ofxDate.replace(/[^\d]/g, '');
  if (cleanDate.length >= 8) {
    const year = cleanDate.substring(0, 4);
    const month = cleanDate.substring(4, 6);
    const day = cleanDate.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}
/**
 * Salvar transações no banco de dados
 */ async function saveTransactionsToDatabase(supabase, result, empresaId, contaBancariaId, userId) {
  if (!result.statement) {
    return [];
  }
  const transactions = result.statement.transactions.map((transaction)=>({
      empresa_id: empresaId,
      conta_bancaria_id: contaBancariaId,
      fitid: transaction.fitid,
      tipo_transacao: transaction.type.toLowerCase(),
      data_transacao: transaction.dtposted,
      valor: transaction.type === 'DEBIT' ? -transaction.trnamt : transaction.trnamt,
      descricao: transaction.name || transaction.memo || 'Transação bancária',
      memo: transaction.memo,
      numero_documento: transaction.checknum,
      referencia: transaction.refnum,
      status: 'pendente',
      metadata: {
        bank_info: result.bank_info,
        parsing_metadata: result.parsing_metadata,
        original_transaction: transaction
      },
      created_by: userId
    }));
  const { data, error } = await supabase.from('extrato_bancario_transacoes').upsert(transactions, {
    onConflict: 'fitid,conta_bancaria_id',
    ignoreDuplicates: false
  }).select();
  if (error) {
    console.error('[SAVE_TRANSACTIONS_ERROR]', error);
    throw new Error(`Erro ao salvar transações: ${error.message}`);
  }
  return data || [];
}
