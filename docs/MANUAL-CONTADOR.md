# 📖 Manual do Usuário - ContabilidadePRO para Contadores

## 🎯 Bem-vindo ao ContabilidadePRO

O **ContabilidadePRO** é uma plataforma de inteligência fiscal autônoma que revoluciona a prática contábil brasileira através de automação avançada e insights contextuais alimentados por IA.

### **O que você pode fazer:**
- 🧠 **Análise Inteligente**: Insights contextuais sobre situação fiscal de clientes
- 🤖 **Automação Fiscal**: Cálculos automáticos de DAS, IRPJ, CSLL
- 📄 **Processamento OCR**: Digitalização automática de 50+ tipos de documentos
- 🏛️ **Integração Governamental**: Consultas diretas à Receita Federal, SEFAZ, eSocial
- 📊 **Dashboard Personalizado**: Visão consolidada de todos os clientes
- 🔮 **Análise Preditiva**: Projeções e alertas de compliance

---

## 🚀 Primeiros Passos

### **1. Fazendo Login**
1. Acesse [app.contabilidadepro.com](https://app.contabilidadepro.com)
2. Digite seu email e senha
3. Aguarde o carregamento do dashboard

### **2. Configurando seu Perfil**
1. Clique no avatar no canto superior direito
2. Selecione **"Configurações"**
3. Complete as informações:
   - **Nome completo**
   - **CRC (Conselho Regional de Contabilidade)**
   - **Especialização** (Simples Nacional, Lucro Real, etc.)
   - **Região de atuação**

### **3. Adicionando sua Primeira Empresa**
1. No dashboard, clique em **"+ Nova Empresa"**
2. Preencha os dados básicos:
   ```
   CNPJ: [14 dígitos apenas números]
   Razão Social: [Nome oficial da empresa]
   Nome Fantasia: [Nome comercial]
   Regime Tributário: [Simples Nacional, Lucro Presumido, Lucro Real]
   ```
3. Clique em **"Validar CNPJ"** para verificação automática
4. Complete as informações adicionais se necessário
5. Salve a empresa

---

## 🏠 Navegando pelo Dashboard

### **Visão Geral**
O dashboard principal oferece uma visão consolidada de todos os seus clientes:

```
┌─────────────────────────────────────────────────────────┐
│ 📊 RESUMO GERAL                                        │
├─────────────────────────────────────────────────────────┤
│ Total de Empresas: 45    │ DAS em Dia: 42             │
│ Alertas Pendentes: 3     │ Faturamento Total: R$ 2.1M │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🚨 ALERTAS CRÍTICOS                                    │
├─────────────────────────────────────────────────────────┤
│ • Empresa ABC - DAS vence em 2 dias                    │
│ • Empresa XYZ - DEFIS pendente                         │
│ • Empresa 123 - Situação irregular na Receita         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📈 EMPRESAS                                            │
├─────────────────────────────────────────────────────────┤
│ [Lista filterable de todas as empresas]                │
└─────────────────────────────────────────────────────────┘
```

### **Filtros Inteligentes**
Use os filtros para encontrar rapidamente empresas:
- **Por regime tributário**: Simples Nacional, Lucro Presumido, Lucro Real
- **Por situação**: Regular, Irregular, Pendente
- **Por vencimentos**: Próximos 7 dias, 15 dias, 30 dias
- **Por setor**: Comércio, Serviços, Indústria

---

## 💼 Gerenciando Empresas

### **Visualização Detalhada da Empresa**

Ao clicar em uma empresa, você acessa o painel completo:

#### **1. Aba "Visão Geral"**
```
┌─────────────────────────────────────────────────────────┐
│ 🏢 DADOS DA EMPRESA                                    │
├─────────────────────────────────────────────────────────┤
│ CNPJ: 12.345.678/0001-95                              │
│ Regime: Simples Nacional                               │
│ Situação: ATIVA                                        │
│ Última atualização: 15/09/2024 14:30                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💡 INSIGHTS INTELIGENTES                               │
├─────────────────────────────────────────────────────────┤
│ • Empresa está próxima do limite do Simples Nacional   │
│ • Considere reavaliar enquadramento tributário         │
│ • DAS calculado automaticamente: R$ 3.450,00          │
└─────────────────────────────────────────────────────────┘
```

#### **2. Aba "Fiscal"**
- **Última apuração DAS**
- **Histórico de pagamentos**
- **Obrigações pendentes**
- **Projeções para próximos meses**

#### **3. Aba "Documentos"**
- **Upload e processamento OCR**
- **Classificação automática**
- **Histórico de documentos**

#### **4. Aba "Relatórios"**
- **Demonstrativos fiscais**
- **Análises comparativas**
- **Exportação para Excel/PDF**

### **Usando o Assistente de IA**

O assistente está sempre disponível no canto inferior direito:

#### **Perguntas Comuns:**
```
💬 "Qual o valor do DAS da Empresa XYZ para janeiro?"
🤖 O DAS da Empresa XYZ para janeiro/2024 é R$ 2.347,89,
   com vencimento em 20/02/2024. Calculado automaticamente
   baseado no faturamento de R$ 156.789,00.

💬 "Existe alguma pendência fiscal urgente?"
🤖 Identifiquei 2 pendências urgentes:
   1. Empresa ABC - DAS vence em 2 dias (R$ 1.234,56)
   2. Empresa DEF - DEFIS não entregue (prazo: 31/03)

   Deseja que eu prepare os documentos automaticamente?
```

#### **Comandos Úteis:**
- `"Calcular DAS de [empresa] para [mês]"`
- `"Verificar situação fiscal de [empresa]"`
- `"Gerar relatório mensal de [empresa]"`
- `"Consultar CNPJ [número]"`
- `"Alertas para próxima semana"`

---

## 🧮 Cálculos Automáticos

### **DAS - Documento de Arrecadação do Simples Nacional**

#### **Processo Automatizado:**
1. **Coleta de Dados**: Sistema coleta receitas automaticamente
2. **Validação**: Verifica enquadramento no Simples Nacional
3. **Cálculo**: Aplica tabelas atualizadas automaticamente
4. **Geração**: Cria guia DAS pronta para pagamento
5. **Notificação**: Alerta sobre vencimentos

#### **Como Usar:**
1. Acesse a empresa desejada
2. Clique em **"Fiscal"** → **"Calcular DAS"**
3. Selecione o período de apuração
4. Clique em **"Calcular Automaticamente"**
5. Revise os valores calculados
6. Clique em **"Gerar Guia DAS"**

#### **Validações Automáticas:**
- ✅ Verificação de enquadramento no Simples Nacional
- ✅ Validação de limites de faturamento
- ✅ Conferência de alíquotas por atividade
- ✅ Cálculo de juros e multas se em atraso
- ✅ Verificação de débitos anteriores

### **Outros Tributos**

#### **IRPJ/CSLL (Lucro Presumido/Real):**
```
1. Sistema coleta receitas e despesas
2. Aplica percentuais de presunção (se aplicável)
3. Calcula base de cálculo
4. Determina alíquotas aplicáveis
5. Gera DARF para pagamento
```

#### **Tributos Estaduais/Municipais:**
- **ICMS**: Cálculo baseado em NFes processadas
- **ISS**: Determinação por atividade e município
- **Taxas**: Identificação automática por localização

---

## 📄 Processamento de Documentos

### **Upload e OCR Automático**

#### **Tipos de Documentos Suportados:**
| Tipo | Descrição | Processamento |
|------|-----------|---------------|
| 📄 **NFe** | Nota Fiscal Eletrônica | Extração de valores, ICMS, IPI |
| 🚚 **CTe** | Conhecimento de Transporte | Valores de frete, ICMS transporte |
| 💰 **DAS** | Documento de Arrecadação | Valores pagos, competências |
| 🏛️ **DARF** | Documento de Receita Federal | Tributos federais pagos |
| 📊 **SPED** | Sistema Público Digital | Importação automática de dados |
| 👥 **eSocial** | Eventos trabalhistas | Folha de pagamento, tributos |

#### **Como Processar Documentos:**
1. **Upload**:
   - Arraste e solte arquivos na área de upload
   - Ou clique em **"Selecionar Arquivos"**
   - Formatos: PDF, JPG, PNG (até 10MB cada)

2. **Processamento Automático**:
   ```
   🔄 Analisando documento...
   🧠 Identificando tipo: NFe
   📊 Extraindo dados fiscais...
   ✅ Processamento concluído!

   Dados extraídos:
   • Valor total: R$ 1.234,56
   • ICMS: R$ 148,15
   • Data de emissão: 15/09/2024
   • Fornecedor: Empresa ABC Ltda
   ```

3. **Validação e Conferência**:
   - Sistema destaca campos que precisam de revisão
   - Você pode editar informações extraídas
   - Confirme os dados antes de salvar

#### **Classificação Inteligente:**
O sistema automaticamente:
- 🏷️ **Categoriza** o documento por tipo
- 📊 **Extrai** valores fiscais relevantes
- 🔗 **Vincula** à empresa correta
- 📅 **Organiza** por período de competência
- ⚠️ **Identifica** possíveis inconsistências

---

## 🏛️ Consultas Governamentais

### **Receita Federal**

#### **Consulta de CNPJ:**
1. Digite o CNPJ na busca ou clique em empresa
2. Clique em **"Validar na Receita Federal"**
3. Sistema consulta automaticamente:
   ```
   🔄 Consultando Receita Federal...
   ✅ Dados atualizados!

   Situação: ATIVA
   Data de abertura: 15/01/2020
   Regime tributário: Simples Nacional
   Atividade principal: Comércio varejista
   Última atualização: 10/09/2024
   ```

#### **Verificação de Regularidade:**
- **CPF do responsável**
- **Certidões negativas**
- **Débitos em aberto**
- **Situação no Simples Nacional**

### **SEFAZ Estadual**

#### **Consultas Disponíveis:**
- **Situação cadastral estadual**
- **Regime de ICMS**
- **Débitos estaduais**
- **Certidões de regularidade**

### **eSocial**

#### **Verificações Automáticas:**
- **Eventos pendentes**
- **Folha de pagamento atualizada**
- **Tributos trabalhistas em dia**
- **Certificado digital válido**

---

## 📊 Relatórios e Análises

### **Relatórios Padrão**

#### **1. Relatório Mensal por Empresa**
```
📈 RELATÓRIO FISCAL - SETEMBRO/2024
Empresa: ABC Comércio Ltda
CNPJ: 12.345.678/0001-95

TRIBUTOS CALCULADOS:
• DAS Simples Nacional: R$ 3.450,00
• Vencimento: 20/10/2024
• Status: Pendente

DOCUMENTOS PROCESSADOS:
• 45 NFes de entrada (R$ 89.567,00)
• 78 NFes de saída (R$ 156.789,00)
• 12 CTes (R$ 5.678,00)

ALERTAS:
⚠️ Aproximando do limite do Simples Nacional
💡 Considere planejamento tributário

PRÓXIMAS OBRIGAÇÕES:
• DEFIS 2024 - Prazo: 31/03/2025
• Renovação certificado - Prazo: 15/11/2024
```

#### **2. Dashboard Consolidado**
- **Resumo de todos os clientes**
- **Total de tributos por período**
- **Empresas com alertas**
- **Performance mensal**

#### **3. Análise Comparativa**
- **Benchmarking por setor**
- **Evolução trimestral**
- **Comparação com médias do mercado**

### **Relatórios Personalizados**

#### **Criando Relatórios Customizados:**
1. Acesse **"Relatórios"** → **"Novo Relatório"**
2. Selecione empresas e período
3. Escolha dados a incluir:
   - Tributos calculados
   - Documentos processados
   - Alertas e pendências
   - Projeções futuras
4. Configure formato (PDF, Excel, Word)
5. Salve como template para reuso

#### **Agendamento Automático:**
- **Frequência**: Semanal, mensal, trimestral
- **Destinatários**: Email automático
- **Horário**: Configurável
- **Formato**: PDF ou Excel

---

## 🔔 Sistema de Alertas

### **Tipos de Alertas**

#### **🚨 Críticos (Ação Imediata)**
- DAS vencendo em 24h
- Empresa com situação irregular
- Limite do Simples Nacional ultrapassado
- Certificado digital vencido

#### **⚠️ Importantes (Ação em 7 dias)**
- DAS vencendo na próxima semana
- Obrigações acessórias pendentes
- Documentos não processados
- Anomalias fiscais detectadas

#### **💡 Informativos (Acompanhamento)**
- Mudanças na legislação
- Oportunidades de otimização
- Dicas de compliance
- Atualizações do sistema

### **Configurando Alertas**

#### **Personalização por Cliente:**
1. Acesse empresa → **"Configurações"** → **"Alertas"**
2. Configure preferências:
   ```
   📅 DAS:
   ☑️ Alertar 15 dias antes do vencimento
   ☑️ Alertar 7 dias antes do vencimento
   ☑️ Alertar 1 dia antes do vencimento

   📊 Faturamento:
   ☑️ Alertar ao atingir 80% do limite Simples
   ☑️ Alertar mudanças significativas na receita

   📄 Documentos:
   ☑️ Alertar documentos não processados (48h)
   ☑️ Alertar inconsistências detectadas
   ```

#### **Canais de Notificação:**
- 📧 **Email**: Resumos diários/semanais
- 📱 **Push**: Alertas críticos imediatos
- 💬 **In-app**: Notificações no sistema
- 📞 **SMS**: Apenas emergências (opcional)

---

## 🔧 Configurações Avançadas

### **Preferências do Sistema**

#### **Interface:**
```
🎨 Tema: [Claro | Escuro | Auto]
📊 Dashboard padrão: [Resumo | Lista de empresas | Alertas]
📋 Itens por página: [10 | 25 | 50 | 100]
🔔 Som de notificações: [Ativado | Desativado]
```

#### **Cálculos Fiscais:**
```
🧮 Modo de cálculo DAS: [Automático | Manual | Híbrido]
📅 Dia padrão de vencimento: [20 | Último dia útil]
💰 Arredondamento: [Centavos | Real mais próximo]
📊 Incluir projeções: [Sim | Não]
```

#### **Integrações:**
```
🏛️ APIs governamentais: [Todas ativas]
📄 OCR automático: [Ativado]
🤖 Assistente IA: [Ativado]
☁️ Backup automático: [Diário]
```

### **Gestão de Usuários** (Para escritórios)

#### **Níveis de Acesso:**
- **👨‍💼 Sócio**: Acesso total, todas as empresas
- **👨‍💻 Contador Senior**: Empresas designadas, relatórios
- **👩‍💻 Contador Junior**: Empresas limitadas, sem configurações
- **📋 Assistente**: Apenas visualização e upload de documentos

#### **Auditoria e Logs:**
- **Histórico de ações** por usuário
- **Log de cálculos** realizados
- **Rastro de alterações** em dados
- **Relatório de acesso** por período

---

## 🆘 Solução de Problemas

### **Problemas Comuns**

#### **❓ "DAS não está calculando corretamente"**
**Verificações:**
1. Confirme que todas as receitas estão lançadas
2. Verifique se a empresa está no Simples Nacional
3. Confira se não ultrapassou o limite anual
4. Valide as alíquotas aplicadas

**Solução:**
- Acesse **"Fiscal"** → **"Recalcular DAS"**
- Confirme dados de receita manualmente
- Use **"Assistente IA"** para diagnóstico

#### **❓ "OCR não reconheceu o documento"**
**Possíveis causas:**
- Qualidade da imagem baixa
- Documento danificado ou ilegível
- Formato não suportado
- Arquivo muito grande

**Solução:**
1. Escaneie em alta qualidade (300dpi+)
2. Garanta boa iluminação
3. Use formato PDF quando possível
4. Redimensione se necessário
5. Tente upload manual dos dados

#### **❓ "Consulta na Receita Federal falhou"**
**Verificações:**
- CNPJ está correto (apenas números)
- Conexão com internet estável
- APIs governamentais funcionando

**Solução:**
- Aguarde alguns minutos e tente novamente
- Verifique status das APIs em **"Configurações"** → **"Status do Sistema"**
- Use consulta manual no site da Receita Federal se necessário

### **Códigos de Erro Comuns**

| Código | Descrição | Solução |
|--------|-----------|---------|
| **E001** | CNPJ inválido | Verifique formatação (apenas números) |
| **E002** | Empresa não encontrada | Confirme CNPJ na Receita Federal |
| **E003** | API governamental indisponível | Tente novamente em alguns minutos |
| **E004** | Documento não processável | Verifique qualidade da imagem |
| **E005** | Limite de upload excedido | Arquivo muito grande (máx 10MB) |

### **Contato com Suporte**

#### **Canais Disponíveis:**
- 💬 **Chat**: Disponível 24/7 (canto inferior direito)
- 📧 **Email**: suporte@contabilidadepro.com
- 📞 **Telefone**: (11) 4000-0000 (horário comercial)
- 🎫 **Ticket**: Sistema interno de suporte

#### **Informações para Suporte:**
Sempre informe:
1. **Seu email de login**
2. **CNPJ da empresa (se aplicável)**
3. **Descrição detalhada do problema**
4. **Passos para reproduzir**
5. **Screenshots (se possível)**

---

## 📚 Glossário Técnico

### **Termos Fiscais**
- **DAS**: Documento de Arrecadação do Simples Nacional
- **DARF**: Documento de Arrecadação de Receitas Federais
- **DEFIS**: Declaração de Informações Socioeconômicas e Fiscais
- **ICMS**: Imposto sobre Circulação de Mercadorias e Serviços
- **ISS**: Imposto sobre Serviços de Qualquer Natureza
- **IRPJ**: Imposto de Renda Pessoa Jurídica
- **CSLL**: Contribuição Social sobre o Lucro Líquido

### **Termos Técnicos**
- **OCR**: Optical Character Recognition (Reconhecimento Óptico de Caracteres)
- **API**: Application Programming Interface (Interface de Programação)
- **IA**: Inteligência Artificial
- **ML**: Machine Learning (Aprendizado de Máquina)
- **Cache**: Armazenamento temporário para acesso rápido
- **SLA**: Service Level Agreement (Acordo de Nível de Serviço)

### **Regimes Tributários**
- **Simples Nacional**: Regime simplificado para micro e pequenas empresas
- **Lucro Presumido**: Tributação baseada em presunção de lucro
- **Lucro Real**: Tributação baseada no lucro efetivo
- **MEI**: Microempreendedor Individual

---

## 🎓 Dicas de Melhores Práticas

### **Organização do Trabalho**

#### **Rotina Diária Recomendada:**
```
🌅 MANHÃ (9:00-12:00):
• Verificar alertas críticos
• Processar documentos recebidos
• Atualizar cálculos pendentes
• Responder consultas de clientes

🌞 TARDE (14:00-17:00):
• Fazer consultas governamentais
• Gerar relatórios mensais
• Analisar insights de IA
• Planejamento tributário

🌙 FINAL DO DIA:
• Revisar pendências
• Agendar tarefas para amanhã
• Backup de dados importantes
• Verificar status geral
```

#### **Organização Mensal:**
- **Semana 1**: Processamento de documentos do mês anterior
- **Semana 2**: Cálculos de DAS e tributos
- **Semana 3**: Relatórios e análises para clientes
- **Semana 4**: Planejamento e projeções

### **Produtividade**

#### **Atalhos de Teclado:**
- **Ctrl + N**: Nova empresa
- **Ctrl + F**: Buscar empresa
- **Ctrl + D**: Calcular DAS
- **Ctrl + U**: Upload de documento
- **Ctrl + R**: Atualizar dados
- **F1**: Ajuda contextual

#### **Automações Recomendadas:**
1. **Agendamento de relatórios** mensais para clientes
2. **Alertas automáticos** para vencimentos
3. **Backup diário** dos dados
4. **Monitoramento** de APIs governamentais
5. **Processamento noturno** de documentos em lote

### **Compliance e Segurança**

#### **Boas Práticas:**
- ✅ **Mantenha senhas seguras** e atualizadas
- ✅ **Use autenticação de dois fatores**
- ✅ **Faça logout** ao final do expediente
- ✅ **Verifique dados** antes de confirmar cálculos
- ✅ **Mantenha backup** de documentos importantes
- ✅ **Atualize informações** regularmente

#### **Auditoria e Rastro:**
- **Todos os cálculos** são logados automaticamente
- **Alterações** ficam registradas por usuário
- **Documentos** têm hash de integridade
- **Relatórios** podem ser regenerados historicamente

---

## 🔄 Atualizações e Novidades

### **Como Acompanhar**
- 📧 **Newsletter**: Assinatura automática para novidades
- 📱 **In-app**: Notificações de novas funcionalidades
- 🌐 **Blog**: [blog.contabilidadepro.com](https://blog.contabilidadepro.com)
- 🎥 **Webinars**: Treinamentos mensais gratuitos

### **Roadmap 2024-2025**
#### **Q4 2024:**
- 🤖 **IA Generativa**: Criação automática de relatórios personalizados
- 📱 **App Mobile**: Aplicativo para acompanhamento em tempo real
- 🔗 **Integrações ERP**: Conectores para SAP, TOTVS, Oracle

#### **Q1 2025:**
- 🌐 **API Pública**: Integração com sistemas terceiros
- 📊 **Business Intelligence**: Dashboards avançados com ML
- 🏦 **Open Banking**: Integração com bancos para automação

#### **Q2 2025:**
- 🤝 **Colaboração**: Ferramenta de trabalho em equipe
- 🎯 **Personalização**: Interface adaptável por usuário
- 🌍 **Multi-idioma**: Suporte para outras línguas

---

## 📞 Suporte e Comunidade

### **Recursos de Aprendizado**
- 📖 **Base de Conhecimento**: [help.contabilidadepro.com](https://help.contabilidadepro.com)
- 🎥 **Vídeo Tutoriais**: Canal YouTube oficial
- 📚 **Documentação**: Guias técnicos detalhados
- 🎓 **Certificação**: Programa de certificação oficial

### **Comunidade**
- 💬 **Discord**: Comunidade de contadores usuários
- 📘 **LinkedIn**: Grupo oficial no LinkedIn
- 📧 **Forum**: Discussões técnicas e dúvidas
- 🤝 **Meetups**: Encontros regionais de usuários

### **Feedback e Sugestões**
- 💡 **Portal de Ideias**: Vote em novas funcionalidades
- 📝 **Pesquisas**: Participe de pesquisas de UX
- 🐛 **Bug Reports**: Reporte problemas encontrados
- ⭐ **Avaliações**: Avalie funcionalidades utilizadas

---

**🏆 ContabilidadePRO** - *Transformando a contabilidade brasileira através de inteligência artificial autônoma* 🧠⚡🇧🇷

**Manual atualizado em**: 16 de setembro de 2024
**Versão do sistema**: 4.0.0
**Próxima atualização prevista**: Dezembro de 2024