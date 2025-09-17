/**
 * 🤖 ENGINE DE CONCILIAÇÃO BANCÁRIA INTELIGENTE - ContábilPRO ERP
 * 
 * Sistema avançado de matching com:
 * - Algoritmo de correspondência por valor, data e histórico
 * - Score de confiança (0-100%)
 * - Aprendizado progressivo
 * - Regras customizáveis por empresa
 * - Matching manual para casos complexos
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }
    const { action, empresa_id, conta_bancaria_id, confidence_threshold = 0.7, date_range_days = 30, auto_approve_threshold = 0.9 } = await req.json();
    if (!action || !empresa_id) {
      throw new Error('Parâmetros obrigatórios: action, empresa_id');
    }
    console.log('[RECONCILIATION_ENGINE] Iniciando:', {
      action,
      empresa_id,
      conta_bancaria_id,
      confidence_threshold
    });
    const startTime = Date.now();
    let result;
    switch(action){
      case 'auto_match':
        result = await executeAutoMatching(supabase, empresa_id, conta_bancaria_id, confidence_threshold, date_range_days, auto_approve_threshold);
        break;
      case 'manual_match':
        const { bank_transaction_id, accounting_entry_id } = await req.json();
        result = await executeManualMatch(supabase, bank_transaction_id, accounting_entry_id, user.id);
        break;
      case 'get_suggestions':
        const { transaction_id } = await req.json();
        result = await getSuggestionsForTransaction(supabase, transaction_id, empresa_id);
        break;
      case 'create_rule':
        const { rule_data } = await req.json();
        result = await createMatchingRule(supabase, rule_data, empresa_id);
        break;
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
    const processingTime = Date.now() - startTime;
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result,
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
    console.error('[RECONCILIATION_ENGINE_ERROR]', error);
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
// FUNÇÕES DE MATCHING
// =====================================================
/**
 * Executar matching automático
 */ async function executeAutoMatching(supabase, empresaId, contaBancariaId, confidenceThreshold = 0.7, dateRangeDays = 30, autoApproveThreshold = 0.9) {
  // 1. Buscar transações bancárias não conciliadas
  const bankTransactions = await getBankTransactions(supabase, empresaId, contaBancariaId, dateRangeDays);
  // 2. Buscar lançamentos contábeis não conciliados
  const accountingEntries = await getAccountingEntries(supabase, empresaId, dateRangeDays);
  // 3. Carregar regras de matching da empresa
  const matchingRules = await getMatchingRules(supabase, empresaId);
  // 4. Executar algoritmo de matching
  const matches = [];
  for (const bankTx of bankTransactions){
    const suggestions = await findMatchesForTransaction(bankTx, accountingEntries, matchingRules);
    // Filtrar por threshold de confiança
    const validMatches = suggestions.filter((match)=>match.confidence_score >= confidenceThreshold);
    if (validMatches.length > 0) {
      // Pegar o melhor match
      const bestMatch = validMatches[0];
      matches.push(bestMatch);
      // Auto-aprovar se confiança for alta
      if (bestMatch.confidence_score >= autoApproveThreshold) {
        await approveMatch(supabase, bestMatch);
      }
    }
  }
  // 5. Calcular estatísticas
  const stats = calculateMatchingStats(matches, bankTransactions.length);
  return {
    ...stats,
    matches,
    processing_time_ms: 0
  };
}
/**
 * Buscar transações bancárias não conciliadas
 */ async function getBankTransactions(supabase, empresaId, contaBancariaId, dateRangeDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
  let query = supabase.from('extrato_bancario_transacoes').select('*').eq('empresa_id', empresaId).eq('status', 'pendente').gte('data_transacao', cutoffDate.toISOString().split('T')[0]);
  if (contaBancariaId) {
    query = query.eq('conta_bancaria_id', contaBancariaId);
  }
  const { data, error } = await query.order('data_transacao', {
    ascending: false
  });
  if (error) {
    throw new Error(`Erro ao buscar transações bancárias: ${error.message}`);
  }
  return data || [];
}
/**
 * Buscar lançamentos contábeis não conciliados
 */ async function getAccountingEntries(supabase, empresaId, dateRangeDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
  const { data, error } = await supabase.from('lancamentos_contabeis').select(`
      *,
      partidas:partidas_contabeis(*)
    `).eq('empresa_id', empresaId).eq('status', 'aprovado').is('conciliacao_bancaria_id', null).gte('data_lancamento', cutoffDate.toISOString().split('T')[0]).order('data_lancamento', {
    ascending: false
  });
  if (error) {
    throw new Error(`Erro ao buscar lançamentos contábeis: ${error.message}`);
  }
  return data || [];
}
/**
 * Buscar regras de matching da empresa
 */ async function getMatchingRules(supabase, empresaId) {
  const { data, error } = await supabase.from('conciliacao_matching_rules').select('*').eq('empresa_id', empresaId).eq('active', true).order('priority', {
    ascending: false
  });
  if (error) {
    console.warn('Erro ao buscar regras de matching:', error);
    return [];
  }
  return data || [];
}
/**
 * Encontrar matches para uma transação bancária
 */ async function findMatchesForTransaction(bankTransaction, accountingEntries, rules) {
  const matches = [];
  for (const entry of accountingEntries){
    const match = calculateMatchScore(bankTransaction, entry, rules);
    if (match.confidence_score > 0) {
      matches.push({
        bank_transaction_id: bankTransaction.id,
        accounting_entry_id: entry.id,
        confidence_score: match.confidence_score,
        match_reasons: match.reasons,
        suggested_actions: match.actions,
        rule_applied: match.rule_applied
      });
    }
  }
  // Ordenar por score de confiança (maior primeiro)
  return matches.sort((a, b)=>b.confidence_score - a.confidence_score);
}
/**
 * Calcular score de matching entre transação bancária e lançamento contábil
 */ function calculateMatchScore(bankTransaction, accountingEntry, rules) {
  let score = 0;
  const reasons = [];
  let actions = {
    approve_automatically: false
  };
  let ruleApplied;
  // 1. Comparação de valor (peso: 40%)
  const valorScore = calculateValueMatch(Math.abs(bankTransaction.valor), getTotalValue(accountingEntry));
  score += valorScore * 0.4;
  if (valorScore > 0.8) {
    reasons.push(`Valor compatível (${valorScore.toFixed(0)}%)`);
  }
  // 2. Comparação de data (peso: 30%)
  const dataScore = calculateDateMatch(bankTransaction.data_transacao, accountingEntry.data_lancamento);
  score += dataScore * 0.3;
  if (dataScore > 0.7) {
    reasons.push(`Data próxima (${dataScore.toFixed(0)}%)`);
  }
  // 3. Comparação de descrição/histórico (peso: 20%)
  const descricaoScore = calculateDescriptionMatch(bankTransaction.descricao || bankTransaction.memo || '', accountingEntry.historico || '');
  score += descricaoScore * 0.2;
  if (descricaoScore > 0.5) {
    reasons.push(`Descrição similar (${descricaoScore.toFixed(0)}%)`);
  }
  // 4. Aplicar regras customizadas (peso: 10%)
  const ruleResult = applyCustomRules(bankTransaction, accountingEntry, rules);
  score += ruleResult.score * 0.1;
  if (ruleResult.rule) {
    reasons.push(`Regra aplicada: ${ruleResult.rule.name}`);
    actions = ruleResult.rule.actions;
    ruleApplied = ruleResult.rule.id;
  }
  // Normalizar score para 0-1
  score = Math.min(score, 1);
  return {
    confidence_score: Math.round(score * 100),
    reasons,
    actions,
    rule_applied: ruleApplied
  };
}
/**
 * Calcular compatibilidade de valor
 */ function calculateValueMatch(valor1, valor2) {
  if (valor1 === 0 || valor2 === 0) return 0;
  const diferenca = Math.abs(valor1 - valor2);
  const percentualDiferenca = diferenca / Math.max(valor1, valor2);
  // Score inversamente proporcional à diferença
  return Math.max(0, 1 - percentualDiferenca * 2);
}
/**
 * Calcular compatibilidade de data
 */ function calculateDateMatch(data1, data2) {
  const date1 = new Date(data1);
  const date2 = new Date(data2);
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Score baseado na proximidade das datas
  if (diffDays === 0) return 1.0;
  if (diffDays === 1) return 0.9;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 15) return 0.4;
  if (diffDays <= 30) return 0.2;
  return 0;
}
/**
 * Calcular compatibilidade de descrição
 */ function calculateDescriptionMatch(desc1, desc2) {
  if (!desc1 || !desc2) return 0;
  const words1 = desc1.toLowerCase().split(/\s+/).filter((w)=>w.length > 2);
  const words2 = desc2.toLowerCase().split(/\s+/).filter((w)=>w.length > 2);
  if (words1.length === 0 || words2.length === 0) return 0;
  const commonWords = words1.filter((word)=>words2.includes(word));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  return similarity;
}
/**
 * Aplicar regras customizadas
 */ function applyCustomRules(bankTransaction, accountingEntry, rules) {
  for (const rule of rules){
    if (matchesRule(bankTransaction, accountingEntry, rule)) {
      return {
        score: 1,
        rule
      };
    }
  }
  return {
    score: 0
  };
}
/**
 * Verificar se transação atende a regra
 */ function matchesRule(bankTransaction, accountingEntry, rule) {
  const conditions = rule.conditions;
  // Verificar tolerância de valor
  const valorMatch = calculateValueMatch(Math.abs(bankTransaction.valor), getTotalValue(accountingEntry));
  if (valorMatch < 1 - conditions.valor_tolerance / 100) {
    return false;
  }
  // Verificar tolerância de data
  const date1 = new Date(bankTransaction.data_transacao);
  const date2 = new Date(accountingEntry.data_lancamento);
  const diffDays = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > conditions.data_tolerance) {
    return false;
  }
  // Verificar keywords na descrição
  if (conditions.descricao_keywords.length > 0) {
    const description = (bankTransaction.descricao || bankTransaction.memo || '').toLowerCase();
    const hasKeyword = conditions.descricao_keywords.some((keyword)=>description.includes(keyword.toLowerCase()));
    if (!hasKeyword) {
      return false;
    }
  }
  return true;
}
/**
 * Obter valor total do lançamento contábil
 */ function getTotalValue(accountingEntry) {
  if (accountingEntry.partidas && accountingEntry.partidas.length > 0) {
    return accountingEntry.partidas.reduce((total, partida)=>{
      return total + (partida.valor_debito || partida.valor_credito || 0);
    }, 0) / 2; // Dividir por 2 porque débito + crédito = valor duplicado
  }
  return accountingEntry.valor || 0;
}
/**
 * Aprovar match automaticamente
 */ async function approveMatch(supabase, match) {
  try {
    // Atualizar status da transação bancária
    await supabase.from('extrato_bancario_transacoes').update({
      status: 'conciliado',
      confidence_score: match.confidence_score,
      match_reason: match.match_reasons.join(', '),
      conciliado_em: new Date().toISOString()
    }).eq('id', match.bank_transaction_id);
    // Atualizar lançamento contábil
    await supabase.from('lancamentos_contabeis').update({
      conciliacao_bancaria_id: match.bank_transaction_id,
      conciliado_em: new Date().toISOString()
    }).eq('id', match.accounting_entry_id);
    console.log(`[AUTO_APPROVED] Match aprovado automaticamente: ${match.bank_transaction_id}`);
  } catch (error) {
    console.error('[APPROVE_MATCH_ERROR]', error);
  }
}
/**
 * Calcular estatísticas de matching
 */ function calculateMatchingStats(matches, totalTransactions) {
  const highConfidence = matches.filter((m)=>m.confidence_score >= 90).length;
  const mediumConfidence = matches.filter((m)=>m.confidence_score >= 70 && m.confidence_score < 90).length;
  const lowConfidence = matches.filter((m)=>m.confidence_score >= 50 && m.confidence_score < 70).length;
  return {
    total_bank_transactions: totalTransactions,
    total_accounting_entries: 0,
    matches_found: matches.length,
    high_confidence_matches: highConfidence,
    medium_confidence_matches: mediumConfidence,
    low_confidence_matches: lowConfidence,
    unmatched_transactions: totalTransactions - matches.length
  };
}
/**
 * Executar match manual
 */ async function executeManualMatch(supabase, bankTransactionId, accountingEntryId, userId) {
  try {
    // Atualizar transação bancária
    await supabase.from('extrato_bancario_transacoes').update({
      status: 'conciliado',
      confidence_score: 100,
      match_reason: 'Conciliação manual',
      conciliado_em: new Date().toISOString(),
      conciliado_por: userId
    }).eq('id', bankTransactionId);
    // Atualizar lançamento contábil
    await supabase.from('lancamentos_contabeis').update({
      conciliacao_bancaria_id: bankTransactionId,
      conciliado_em: new Date().toISOString()
    }).eq('id', accountingEntryId);
    return {
      success: true,
      message: 'Conciliação manual realizada com sucesso'
    };
  } catch (error) {
    console.error('[MANUAL_MATCH_ERROR]', error);
    throw new Error(`Erro na conciliação manual: ${error.message}`);
  }
}
/**
 * Obter sugestões para uma transação específica
 */ async function getSuggestionsForTransaction(supabase, transactionId, empresaId) {
  // Buscar a transação
  const { data: transaction, error: txError } = await supabase.from('extrato_bancario_transacoes').select('*').eq('id', transactionId).single();
  if (txError || !transaction) {
    throw new Error('Transação não encontrada');
  }
  // Buscar lançamentos contábeis candidatos
  const accountingEntries = await getAccountingEntries(supabase, empresaId, 60); // 60 dias
  const rules = await getMatchingRules(supabase, empresaId);
  // Encontrar matches
  const suggestions = await findMatchesForTransaction(transaction, accountingEntries, rules);
  return {
    suggestions: suggestions.slice(0, 10)
  }; // Top 10 sugestões
}
/**
 * Criar regra de matching
 */ async function createMatchingRule(supabase, ruleData, empresaId) {
  const { data, error } = await supabase.from('conciliacao_matching_rules').insert({
    ...ruleData,
    empresa_id: empresaId
  }).select().single();
  if (error) {
    throw new Error(`Erro ao criar regra: ${error.message}`);
  }
  return {
    rule: data
  };
}
