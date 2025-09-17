/**
 * Serviço de Cache Inteligente para Relatórios
 * ContábilPro ERP - Fase 2
 */ import { createHash } from 'https://deno.land/std@0.208.0/crypto/mod.ts';
// Configurações do cache
export const CACHE_CONFIG = {
  TTL_DEFAULT: 24 * 60 * 60 * 1000,
  TTL_RELATORIO_RAPIDO: 1 * 60 * 60 * 1000,
  TTL_RELATORIO_LENTO: 7 * 24 * 60 * 60 * 1000,
  MAX_CACHE_SIZE: 100 * 1024 * 1024,
  BUCKET_CACHE: 'relatorios-cache',
  BUCKET_METADATA: 'cache-metadata'
};
export class CacheService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  /**
   * Gera chave única para cache baseada nos parâmetros do relatório
   */ gerarChaveCache(userId, templateId, filtros, opcoes) {
    const dadosParaHash = {
      user_id: userId,
      template_id: templateId,
      filtros: this.normalizarFiltros(filtros),
      opcoes: opcoes || {}
    };
    const hashInput = JSON.stringify(dadosParaHash, Object.keys(dadosParaHash).sort());
    const hash = createHash('sha256').update(hashInput).toString('hex');
    return `${userId}_${templateId}_${hash.substring(0, 16)}`;
  }
  /**
   * Normaliza filtros para garantir consistência no cache
   */ normalizarFiltros(filtros) {
    const normalizado = {
      ...filtros
    };
    // Ordenar arrays para consistência
    if (normalizado.tags) {
      normalizado.tags = [
        ...normalizado.tags
      ].sort();
    }
    // Remover propriedades undefined/null
    Object.keys(normalizado).forEach((key)=>{
      if (normalizado[key] === undefined || normalizado[key] === null) {
        delete normalizado[key];
      }
    });
    return normalizado;
  }
  /**
   * Calcula TTL baseado no tipo de relatório
   */ calcularTTL(tipoRelatorio, complexidade = 'media') {
    const baseMap = {
      diario: CACHE_CONFIG.TTL_RELATORIO_RAPIDO,
      semanal: CACHE_CONFIG.TTL_RELATORIO_RAPIDO * 2,
      mensal: CACHE_CONFIG.TTL_DEFAULT,
      anual: CACHE_CONFIG.TTL_RELATORIO_LENTO,
      personalizado: CACHE_CONFIG.TTL_DEFAULT
    };
    const multiplicadores = {
      baixa: 0.5,
      media: 1.0,
      alta: 2.0
    };
    const ttlBase = baseMap[tipoRelatorio] || CACHE_CONFIG.TTL_DEFAULT;
    return Math.floor(ttlBase * multiplicadores[complexidade]);
  }
  /**
   * Verifica se existe cache válido para o relatório
   */ async verificarCache(userId, templateId, filtros, opcoes) {
    try {
      const chave = this.gerarChaveCache(userId, templateId, filtros, opcoes);
      // Buscar metadata do cache
      const { data: metadata, error: metadataError } = await this.supabase.from('cache_relatorios').select('*').eq('chave', chave).eq('user_id', userId).single();
      if (metadataError || !metadata) {
        console.log(`[CACHE_MISS] Chave: ${chave}`);
        return null;
      }
      // Verificar se não expirou
      const agora = new Date();
      const expiraEm = new Date(metadata.expira_em);
      if (agora > expiraEm) {
        console.log(`[CACHE_EXPIRED] Chave: ${chave}`);
        await this.removerCache(chave, userId);
        return null;
      }
      // Atualizar estatísticas de acesso
      await this.atualizarEstatisticasAcesso(chave, userId);
      // Gerar URL de download
      const { data: urlData } = await this.supabase.storage.from(CACHE_CONFIG.BUCKET_CACHE).createSignedUrl(`${userId}/${chave}.pdf`, 3600); // 1 hora
      console.log(`[CACHE_HIT] Chave: ${chave}, Acessos: ${metadata.acessos + 1}`);
      return {
        metadata: metadata,
        url_download: urlData?.signedUrl
      };
    } catch (error) {
      console.error('[CACHE_VERIFICAR_ERROR]', error);
      return null;
    }
  }
  /**
   * Salva relatório no cache
   */ async salvarCache(userId, templateId, filtros, dadosPdf, tipoRelatorio, opcoes) {
    try {
      const chave = this.gerarChaveCache(userId, templateId, filtros, opcoes);
      const agora = new Date();
      const ttl = this.calcularTTL(tipoRelatorio);
      const expiraEm = new Date(agora.getTime() + ttl);
      // Verificar limite de cache do usuário
      const podeArmazenar = await this.verificarLimiteCache(userId, dadosPdf.length);
      if (!podeArmazenar) {
        console.warn(`[CACHE_LIMITE_EXCEDIDO] User: ${userId}`);
        await this.limparCacheAntigo(userId);
      }
      // Salvar arquivo no storage
      const caminhoArquivo = `${userId}/${chave}.pdf`;
      const { error: uploadError } = await this.supabase.storage.from(CACHE_CONFIG.BUCKET_CACHE).upload(caminhoArquivo, dadosPdf, {
        cacheControl: '3600',
        upsert: true
      });
      if (uploadError) {
        console.error('[CACHE_UPLOAD_ERROR]', uploadError);
        return false;
      }
      // Buscar versão do template
      const { data: template } = await this.supabase.from('templates_relatorio').select('versao').eq('id', templateId).single();
      // Salvar metadata
      const metadata = {
        chave,
        user_id: userId,
        template_id: templateId,
        filtros_hash: createHash('sha256').update(JSON.stringify(this.normalizarFiltros(filtros))).toString('hex'),
        criado_em: agora.toISOString(),
        expira_em: expiraEm.toISOString(),
        tamanho_bytes: dadosPdf.length,
        acessos: 0,
        ultimo_acesso: agora.toISOString(),
        tipo_relatorio: tipoRelatorio,
        versao_template: template?.versao || 1
      };
      const { error: metadataError } = await this.supabase.from('cache_relatorios').upsert(metadata);
      if (metadataError) {
        console.error('[CACHE_METADATA_ERROR]', metadataError);
        return false;
      }
      console.log(`[CACHE_SAVED] Chave: ${chave}, Tamanho: ${dadosPdf.length} bytes, TTL: ${ttl}ms`);
      return true;
    } catch (error) {
      console.error('[CACHE_SALVAR_ERROR]', error);
      return false;
    }
  }
  /**
   * Atualiza estatísticas de acesso ao cache
   */ async atualizarEstatisticasAcesso(chave, userId) {
    try {
      await this.supabase.from('cache_relatorios').update({
        acessos: this.supabase.sql`acessos + 1`,
        ultimo_acesso: new Date().toISOString()
      }).eq('chave', chave).eq('user_id', userId);
    } catch (error) {
      console.error('[CACHE_ESTATISTICAS_ERROR]', error);
    }
  }
  /**
   * Verifica se o usuário pode armazenar mais dados no cache
   */ async verificarLimiteCache(userId, novoTamanho) {
    try {
      const { data: estatisticas } = await this.supabase.from('cache_relatorios').select('tamanho_bytes').eq('user_id', userId);
      if (!estatisticas) return true;
      const tamanhoAtual = estatisticas.reduce((total, item)=>total + item.tamanho_bytes, 0);
      return tamanhoAtual + novoTamanho <= CACHE_CONFIG.MAX_CACHE_SIZE;
    } catch (error) {
      console.error('[CACHE_LIMITE_ERROR]', error);
      return true; // Em caso de erro, permitir cache
    }
  }
  /**
   * Remove entradas antigas do cache quando limite é excedido
   */ async limparCacheAntigo(userId) {
    try {
      // Buscar entradas mais antigas (LRU)
      const { data: entradasAntigas } = await this.supabase.from('cache_relatorios').select('chave, tamanho_bytes').eq('user_id', userId).order('ultimo_acesso', {
        ascending: true
      }).limit(10);
      if (!entradasAntigas?.length) return;
      // Remover 25% das entradas mais antigas
      const quantidadeRemover = Math.ceil(entradasAntigas.length * 0.25);
      const paraRemover = entradasAntigas.slice(0, quantidadeRemover);
      for (const entrada of paraRemover){
        await this.removerCache(entrada.chave, userId);
      }
      console.log(`[CACHE_LIMPEZA] Removidas ${quantidadeRemover} entradas antigas para user ${userId}`);
    } catch (error) {
      console.error('[CACHE_LIMPEZA_ERROR]', error);
    }
  }
  /**
   * Remove entrada específica do cache
   */ async removerCache(chave, userId) {
    try {
      // Remover arquivo do storage
      await this.supabase.storage.from(CACHE_CONFIG.BUCKET_CACHE).remove([
        `${userId}/${chave}.pdf`
      ]);
      // Remover metadata
      await this.supabase.from('cache_relatorios').delete().eq('chave', chave).eq('user_id', userId);
      console.log(`[CACHE_REMOVED] Chave: ${chave}`);
    } catch (error) {
      console.error('[CACHE_REMOVER_ERROR]', error);
    }
  }
  /**
   * Invalida cache quando template é atualizado
   */ async invalidarCacheTemplate(templateId) {
    try {
      const { data: entradas } = await this.supabase.from('cache_relatorios').select('chave, user_id').eq('template_id', templateId);
      if (!entradas?.length) return;
      for (const entrada of entradas){
        await this.removerCache(entrada.chave, entrada.user_id);
      }
      console.log(`[CACHE_INVALIDATED] Template: ${templateId}, Entradas: ${entradas.length}`);
    } catch (error) {
      console.error('[CACHE_INVALIDAR_ERROR]', error);
    }
  }
  /**
   * Obtém estatísticas do cache para um usuário
   */ async obterEstatisticasCache(userId) {
    try {
      const { data: estatisticas } = await this.supabase.from('cache_relatorios').select('*').eq('user_id', userId);
      if (!estatisticas?.length) {
        return {
          total_entradas: 0,
          tamanho_total: 0,
          hit_rate: 0,
          entradas_expiradas: 0
        };
      }
      const agora = new Date();
      const expiradas = estatisticas.filter((e)=>new Date(e.expira_em) < agora).length;
      const tamanhoTotal = estatisticas.reduce((total, e)=>total + e.tamanho_bytes, 0);
      const totalAcessos = estatisticas.reduce((total, e)=>total + e.acessos, 0);
      return {
        total_entradas: estatisticas.length,
        tamanho_total: tamanhoTotal,
        tamanho_formatado: this.formatarTamanho(tamanhoTotal),
        hit_rate: totalAcessos > 0 ? (totalAcessos / estatisticas.length).toFixed(2) : 0,
        entradas_expiradas: expiradas,
        utilizacao_limite: (tamanhoTotal / CACHE_CONFIG.MAX_CACHE_SIZE * 100).toFixed(1)
      };
    } catch (error) {
      console.error('[CACHE_ESTATISTICAS_ERROR]', error);
      return null;
    }
  }
  /**
   * Formata tamanho em bytes para formato legível
   */ formatarTamanho(bytes) {
    const unidades = [
      'B',
      'KB',
      'MB',
      'GB'
    ];
    let tamanho = bytes;
    let unidadeIndex = 0;
    while(tamanho >= 1024 && unidadeIndex < unidades.length - 1){
      tamanho /= 1024;
      unidadeIndex++;
    }
    return `${tamanho.toFixed(1)} ${unidades[unidadeIndex]}`;
  }
}
