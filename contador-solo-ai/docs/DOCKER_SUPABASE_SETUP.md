# Supabase Docker Setup - ContabilidadePRO

Este guia explica como configurar e executar o Supabase localmente usando Docker para o projeto ContabilidadePRO.

## 📋 Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- [Docker Compose](https://docs.docker.com/compose/install/) (geralmente incluído no Docker Desktop)
- Pelo menos 4GB de RAM disponível
- Portas livres: 3000, 5432, 8000, 8443, 4000

## 🚀 Instalação Rápida

### 1. Verificar se o Docker está rodando
```bash
docker --version
docker-compose --version
```

### 2. Configurar variáveis de ambiente
O arquivo `.env.docker` já está configurado com valores padrão seguros para desenvolvimento local.

**⚠️ IMPORTANTE**: Antes de usar em produção, altere as seguintes variáveis no arquivo `.env.docker`:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `DASHBOARD_PASSWORD`

### 3. Iniciar o Supabase

#### Opção A: Usando PowerShell (Recomendado)
```powershell
.\supabase-docker.ps1 start
```

#### Opção B: Usando Batch
```cmd
supabase-docker.bat start
```

#### Opção C: Docker Compose direto
```bash
docker-compose --env-file .env.docker up -d
```

## 🌐 URLs dos Serviços

Após iniciar, os seguintes serviços estarão disponíveis:

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Supabase Studio** | http://localhost:3000 | Interface web para gerenciar o banco |
| **API Gateway** | http://localhost:8000 | Endpoint principal da API |
| **Database** | postgresql://postgres:password@localhost:5432/postgres | Conexão direta ao PostgreSQL |
| **Inbucket** | http://localhost:54324 | Servidor de email para testes |
| **Analytics** | http://localhost:4000 | Logs e métricas |

### Credenciais Padrão
- **Studio**: `supabase` / `this_password_is_insecure_and_should_be_updated`
- **Database**: `postgres` / `your-super-secret-and-long-postgres-password`

## 🛠️ Comandos Disponíveis

### PowerShell Script (`supabase-docker.ps1`)
```powershell
# Iniciar todos os serviços
.\supabase-docker.ps1 start

# Parar todos os serviços
.\supabase-docker.ps1 stop

# Reiniciar todos os serviços
.\supabase-docker.ps1 restart

# Ver status dos serviços
.\supabase-docker.ps1 status

# Ver logs em tempo real
.\supabase-docker.ps1 logs

# Reset completo (remove todos os dados)
.\supabase-docker.ps1 reset

# Ajuda
.\supabase-docker.ps1 help
```

### Batch Script (`supabase-docker.bat`)
```cmd
# Mesmos comandos, mas usando .bat
supabase-docker.bat start
supabase-docker.bat stop
supabase-docker.bat status
# etc...
```

### Docker Compose Direto
```bash
# Iniciar
docker-compose --env-file .env.docker up -d

# Parar
docker-compose --env-file .env.docker down

# Ver logs
docker-compose --env-file .env.docker logs -f

# Ver status
docker-compose --env-file .env.docker ps

# Reset completo
docker-compose --env-file .env.docker down -v --remove-orphans
```

## 🔧 Configuração do Projeto

### 1. Configurar variáveis de ambiente do Next.js

No arquivo `contador-solo-ai/.env.local`, descomente as linhas para usar o Supabase local:

```env
# Comentar as linhas da cloud
# NEXT_PUBLIC_SUPABASE_URL=https://selnwgpyjctpjzdrfrey.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Descomentar as linhas locais
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Outras configurações locais
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres
SUPABASE_FUNCTIONS_URL=http://127.0.0.1:8000/functions/v1
```

### 2. Executar migrações

```bash
# Navegar para a pasta do projeto
cd contador-solo-ai

# Executar migrações (se necessário)
npx supabase db push --local
```

## 📊 Monitoramento

### Ver logs de um serviço específico
```bash
docker-compose --env-file .env.docker logs -f [nome-do-serviço]

# Exemplos:
docker-compose --env-file .env.docker logs -f db
docker-compose --env-file .env.docker logs -f auth
docker-compose --env-file .env.docker logs -f functions
```

### Verificar recursos utilizados
```bash
docker stats
```

### Verificar volumes
```bash
docker volume ls
```

## 🔍 Troubleshooting

### Problema: Porta já em uso
```bash
# Verificar qual processo está usando a porta
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :8000

# Parar o processo ou alterar a porta no .env.docker
```

### Problema: Containers não iniciam
```bash
# Ver logs detalhados
docker-compose --env-file .env.docker logs

# Verificar se há conflitos de rede
docker network ls
docker network prune
```

### Problema: Banco de dados não conecta
1. Verificar se o container `supabase-db` está rodando:
   ```bash
   docker-compose --env-file .env.docker ps
   ```

2. Testar conexão direta:
   ```bash
   docker exec -it supabase-db psql -U postgres -d postgres
   ```

### Problema: Edge Functions não funcionam
1. Verificar se as funções estão na pasta correta: `supabase/functions/`
2. Verificar logs do container functions:
   ```bash
   docker-compose --env-file .env.docker logs -f functions
   ```

## 🔄 Migração de Dados

### Backup dos dados locais
```bash
docker exec supabase-db pg_dump -U postgres postgres > backup_local.sql
```

### Restaurar backup
```bash
docker exec -i supabase-db psql -U postgres -d postgres < backup_local.sql
```

## 🚀 Deploy para Produção

Quando estiver pronto para deploy:

1. **Não use** este setup Docker em produção
2. Use o Supabase Cloud ou configure um servidor dedicado
3. Altere todas as senhas e chaves secretas
4. Configure SSL/TLS adequadamente
5. Configure backup automático

## 📚 Recursos Adicionais

- [Documentação oficial do Supabase](https://supabase.com/docs)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## ❓ Suporte

Se encontrar problemas:

1. Verifique os logs: `.\supabase-docker.ps1 logs`
2. Verifique o status: `.\supabase-docker.ps1 status`
3. Tente um reset: `.\supabase-docker.ps1 reset`
4. Consulte a documentação oficial do Supabase
