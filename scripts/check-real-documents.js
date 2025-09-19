// Script para verificar documentos reais na tabela
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://selnwgpyjctpjzdrfrey.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k"
);

(async () => {
  console.log("🔍 Verificando documentos reais na tabela...\n");

  try {
    // Buscar todos os documentos
    const { data: documentos, error } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Erro ao buscar documentos:", error);
      return;
    }

    console.log(`📋 Total de documentos: ${documentos?.length || 0}`);
    
    if (documentos && documentos.length > 0) {
      console.log("\n📄 LISTA DE DOCUMENTOS:");
      
      documentos.forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc.arquivo_nome}`);
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - Tipo: ${doc.tipo_documento}`);
        console.log(`   - Status: ${doc.status_processamento}`);
        console.log(`   - Arquivo Path: ${doc.arquivo_path}`);
        console.log(`   - Data: ${new Date(doc.created_at).toLocaleString('pt-BR')}`);
        
        // Verificar se é um documento real (não exemplo)
        const isReal = !doc.arquivo_nome.includes('exemplo') && 
                       !doc.arquivo_nome.includes('NFe_12345') &&
                       doc.arquivo_path && 
                       doc.arquivo_path.includes('documentos/');
        
        console.log(`   - É documento real: ${isReal ? '✅ SIM' : '❌ NÃO (exemplo)'}`);
        
        if (doc.dados_extraidos) {
          console.log(`   - Tem dados extraídos: ✅ SIM`);
        }
      });

      // Buscar especificamente por "Pro Labore"
      console.log("\n🔍 Buscando especificamente por 'Pro Labore'...");
      
      const { data: proLabore, error: errorProLabore } = await supabase
        .from('documentos')
        .select('*')
        .ilike('arquivo_nome', '%pro labore%');

      if (errorProLabore) {
        console.error("❌ Erro na busca Pro Labore:", errorProLabore);
      } else if (proLabore && proLabore.length > 0) {
        console.log(`✅ Encontrados ${proLabore.length} documento(s) Pro Labore:`);
        proLabore.forEach(doc => {
          console.log(`   - ${doc.arquivo_nome} (${doc.id})`);
        });
      } else {
        console.log("❌ Nenhum documento Pro Labore encontrado");
      }

    } else {
      console.log("❌ Nenhum documento encontrado na tabela");
    }

  } catch (error) {
    console.error("❌ Erro geral:", error);
  }
})();
