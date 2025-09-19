// Script para verificar a estrutura da tabela documentos
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://selnwgpyjctpjzdrfrey.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k"
);

(async () => {
  console.log("🔍 Verificando estrutura da tabela documentos...\n");

  try {
    // Buscar um documento para ver as colunas disponíveis
    const { data: documentos, error } = await supabase
      .from('documentos')
      .select('*')
      .limit(1);

    if (error) {
      console.error("❌ Erro ao buscar documentos:", error);
      return;
    }

    if (documentos && documentos.length > 0) {
      console.log("✅ Estrutura da tabela documentos:");
      console.log("📋 Colunas disponíveis:");
      
      const doc = documentos[0];
      Object.keys(doc).forEach(coluna => {
        const valor = doc[coluna];
        const tipo = typeof valor;
        const preview = valor ? String(valor).substring(0, 50) : 'null';
        console.log(`   - ${coluna}: ${tipo} = "${preview}${String(valor).length > 50 ? '...' : ''}"`);
      });

      console.log("\n📄 Documento completo:");
      console.log(JSON.stringify(doc, null, 2));
    } else {
      console.log("❌ Nenhum documento encontrado na tabela");
    }

  } catch (error) {
    console.error("❌ Erro geral:", error);
  }
})();
