const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://selnwgpyjctpjzdrfrey.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k"
);

(async () => {
  console.log("=== Corrigindo caminhos dos documentos ===");
  
  // Buscar todos os documentos que têm arquivo_path sem o prefixo documentos/
  const { data: documentos, error: fetchError } = await supabase
    .from('documentos')
    .select('id, arquivo_nome, arquivo_path')
    .not('arquivo_path', 'like', 'documentos/documentos/%');
    
  if (fetchError) {
    console.error('Erro ao buscar documentos:', fetchError);
    return;
  }
  
  console.log(`Encontrados ${documentos.length} documentos para corrigir:`);
  
  for (const doc of documentos) {
    console.log(`\n--- Processando: ${doc.arquivo_nome} ---`);
    console.log(`Caminho atual: ${doc.arquivo_path}`);
    
    // Extrair apenas o nome do arquivo do caminho atual
    const fileName = doc.arquivo_path.split('/').pop();
    console.log(`Nome do arquivo: ${fileName}`);
    
    // Verificar se o arquivo existe em documentos/documentos/
    const { data: files, error: listError } = await supabase.storage
      .from('documentos')
      .list('documentos', { 
        limit: 1000,
        search: fileName 
      });
      
    if (listError) {
      console.error(`Erro ao listar arquivos: ${listError.message}`);
      continue;
    }
    
    const foundFile = files.find(f => f.name === fileName);
    
    if (foundFile) {
      const newPath = `documentos/${fileName}`;
      console.log(`✅ Arquivo encontrado! Atualizando para: ${newPath}`);
      
      // Atualizar o caminho no banco
      const { error: updateError } = await supabase
        .from('documentos')
        .update({ arquivo_path: newPath })
        .eq('id', doc.id);
        
      if (updateError) {
        console.error(`❌ Erro ao atualizar: ${updateError.message}`);
      } else {
        console.log(`✅ Caminho atualizado com sucesso!`);
      }
    } else {
      console.log(`❌ Arquivo não encontrado em documentos/documentos/`);
    }
  }
  
  console.log("\n=== Verificação final ===");
  
  // Verificar documentos atualizados
  const { data: updatedDocs, error: finalError } = await supabase
    .from('documentos')
    .select('arquivo_nome, arquivo_path')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (finalError) {
    console.error('Erro na verificação final:', finalError);
  } else {
    console.log('Documentos atualizados:');
    updatedDocs.forEach(doc => {
      console.log(`- ${doc.arquivo_nome}: ${doc.arquivo_path}`);
    });
  }
})();
