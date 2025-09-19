// Script para limpar cache específico do documento
console.log("Limpando cache específico do documento...");

// Simular a limpeza do cache (não podemos importar diretamente o módulo ES6)
// Mas podemos fazer uma requisição para forçar a regeneração
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://selnwgpyjctpjzdrfrey.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k"
);

(async () => {
  console.log("Gerando nova URL assinada para forçar atualização...");
  
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl('documentos/1757945270369-mc2go9pr7nr.pdf', 3600);

  if (error) {
    console.error('Erro ao gerar URL:', error);
  } else {
    console.log('✅ Nova URL gerada:');
    console.log(data.signedUrl);
    console.log('\nAgora o cache deve ser atualizado no próximo acesso.');
  }
})();
