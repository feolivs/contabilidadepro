# 🚀 Instalação do Supabase com Docker - ContabilidadePRO

Este guia te ajudará a instalar e configurar o Supabase localmente usando Docker para desenvolvimento do ContabilidadePRO.

## 📋 Pré-requisitos

### 1. Docker Desktop
- **Windows**: Baixe e instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Requisitos mínimos**: 4GB RAM, Windows 10/11
- **Verifique a instalação**:
  ```powershell
  docker --version
  docker-compose --version
  ```

### 2. Portas Necessárias
Certifique-se de que estas portas estão livres:
- **3000**: Supabase Studio (Interface Web)
- **5432**: PostgreSQL Database
- **8000**: API Gateway (Kong)
- **8443**: HTTPS Gateway
- **54324**: Inbucket (Email de teste)

## 🔧 Instalação Passo a Passo

### Passo 1: Verificar Arquivos
Certifique-se de que você tem estes arquivos na raiz do projeto:
- ✅ `docker-compose.yml`
- ✅ `.env.docker`
- ✅ `supabase-docker.bat`
- ✅ `supabase-docker.ps1`

### Passo 2: Iniciar o Supabase

#### Opção A: PowerShell (Recomendado)
```powershell
# Dar permissão de execução (primeira vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Iniciar Supabase
.\supabase-docker.ps1 start
```

#### Opção B: Batch (CMD)
```cmd
supabase-docker.bat start
```

#### Opção C: Docker Compose Direto
```bash
docker-compose --env-file .env.docker up -d
```

### Passo 3: Verificar Instalação
```powershell
# Verificar status dos containers
.\supabase-docker.ps1 status

# Verificar saúde dos serviços
.\supabase-docker.ps1 health
```

## 🌐 Acessando os Serviços

Após a instalação bem-sucedida, você terá acesso a:

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **🎛️ Supabase Studio** | http://localhost:3001 | Interface para gerenciar banco de dados |
| **🔌 API Gateway** | http://localhost:8080 | Endpoint principal da API |
| **🗄️ PostgreSQL** | `localhost:5432` | Banco de dados direto |
| **📧 Inbucket** | http://localhost:54324 | Servidor de email para testes |

### 🔑 Credenciais Padrão

**Supabase Studio:**
- Usuário: `supabase`
- Senha: `this_password_is_insecure_and_should_be_updated`

**PostgreSQL:**
- Usuário: `postgres`
- Senha: `your-super-secret-and-long-postgres-password`
- Database: `postgres`

## ⚙️ Configuração do Projeto Next.js

### 1. Configurar Variáveis de Ambiente
No arquivo `contador-solo-ai/.env.local`, configure:

```env
# === SUPABASE LOCAL (Docker) ===
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Service Role Key (para Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Database URL
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres

# Functions URL
SUPABASE_FUNCTIONS_URL=http://127.0.0.1:8000/functions/v1

# === COMENTAR CONFIGURAÇÕES DA CLOUD ===
# NEXT_PUBLIC_SUPABASE_URL=https://selnwgpyjctpjzdrfrey.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Executar Migrações (se necessário)
```bash
cd contador-solo-ai
npx supabase db push --local
```

## 🛠️ Comandos Úteis

### PowerShell Script
```powershell
# Iniciar todos os serviços
.\supabase-docker.ps1 start

# Parar todos os serviços
.\supabase-docker.ps1 stop

# Reiniciar todos os serviços
.\supabase-docker.ps1 restart

# Ver status dos containers
.\supabase-docker.ps1 status

# Ver logs em tempo real
.\supabase-docker.ps1 logs

# Verificar saúde dos serviços
.\supabase-docker.ps1 health

# Reset completo (CUIDADO: Remove todos os dados!)
.\supabase-docker.ps1 reset

# Ajuda
.\supabase-docker.ps1 help
```

### Docker Compose Direto
```bash
# Ver status
docker-compose --env-file .env.docker ps

# Ver logs
docker-compose --env-file .env.docker logs -f

# Parar tudo
docker-compose --env-file .env.docker down

# Reset completo
docker-compose --env-file .env.docker down -v --remove-orphans
```

## 🔍 Troubleshooting

### Problema: "Porta já em uso"
```powershell
# Verificar qual processo está usando a porta
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :8000

# Parar processo específico (substitua PID)
taskkill /PID [número_do_pid] /F
```

### Problema: "Docker não está rodando"
1. Abra o Docker Desktop
2. Aguarde até aparecer "Docker Desktop is running"
3. Tente novamente

### Problema: "Containers não iniciam"
```powershell
# Ver logs detalhados
.\supabase-docker.ps1 logs

# Limpar cache do Docker
docker system prune -f

# Reset completo
.\supabase-docker.ps1 reset
```

### Problema: "Não consegue acessar Studio"
1. Verifique se o container está rodando:
   ```powershell
   .\supabase-docker.ps1 status
   ```
2. Verifique se a porta 3000 está livre
3. Tente acessar: http://127.0.0.1:3000

### Problema: "Edge Functions não funcionam"
1. Verifique se as funções estão em `supabase/functions/`
2. Verifique logs do container:
   ```powershell
   docker-compose --env-file .env.docker logs -f functions
   ```

## 📊 Monitoramento

### Ver Recursos Utilizados
```powershell
# Ver uso de CPU/RAM dos containers
docker stats

# Ver volumes criados
docker volume ls

# Ver redes criadas
docker network ls
```

### Backup dos Dados
```bash
# Fazer backup
docker exec supabase-db pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i supabase-db psql -U postgres -d postgres < backup_20250917.sql
```

## ⚠️ Importante para Produção

**NÃO USE** esta configuração em produção! Para produção:

1. Use Supabase Cloud ou configure servidor dedicado
2. Altere TODAS as senhas e chaves secretas
3. Configure SSL/TLS adequadamente
4. Configure backup automático
5. Configure monitoramento adequado

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. ✅ Acesse o Studio: http://localhost:3000
2. ✅ Configure as tabelas necessárias
3. ✅ Teste as Edge Functions
4. ✅ Configure o projeto Next.js
5. ✅ Execute os testes

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

**💡 Dica**: Use `.\supabase-docker.ps1 health` regularmente para verificar se todos os serviços estão funcionando corretamente!
