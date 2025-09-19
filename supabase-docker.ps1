# Supabase Docker Manager - ContabilidadePRO
# Script PowerShell para gerenciar Supabase com Docker
# Uso: .\supabase-docker.ps1 [comando]

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "reset", "health", "help", "")]
    [string]$Command = "help"
)

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        Write-ColorOutput "Docker nao esta rodando. Por favor, inicie o Docker Desktop." $Red
        return $false
    }
}

function Test-EnvFile {
    if (-not (Test-Path ".env.docker")) {
        Write-ColorOutput "Arquivo .env.docker nao encontrado!" $Red
        Write-ColorOutput "Execute 'supabase init' primeiro ou crie o arquivo .env.docker" $Yellow
        return $false
    }
    return $true
}

function Start-Supabase {
    Write-ColorOutput "`nIniciando Supabase com Docker..." $Blue
    Write-ColorOutput "============================================" $Cyan
    
    if (-not (Test-DockerRunning)) { return }
    if (-not (Test-EnvFile)) { return }
    
    # Cria .env se nao existir
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.docker" ".env"
        Write-ColorOutput "Arquivo .env criado a partir do .env.docker" $Yellow
    }
    
    Write-ColorOutput "`nBaixando/atualizando imagens Docker..." $Blue
    docker-compose --env-file .env.docker pull
    
    Write-ColorOutput "`nIniciando containers..." $Blue
    $result = docker-compose --env-file .env.docker up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "`nSupabase iniciado com sucesso!" $Green
        Write-ColorOutput "`nURLs disponiveis:" $Cyan
        Write-ColorOutput "   Studio:    http://localhost:3000" $White
        Write-ColorOutput "   API:       http://localhost:8000" $White
        Write-ColorOutput "   Database:  postgresql://postgres:your-password@localhost:5432/postgres" $White
        Write-ColorOutput "`nCredenciais padrao:" $Yellow
        Write-ColorOutput "   Studio: supabase / this_password_is_insecure_and_should_be_updated" $White
        Write-ColorOutput "   DB: postgres / your-super-secret-and-long-postgres-password" $White
        Write-ColorOutput "`nPara ver o status: .\supabase-docker.ps1 status" $Blue
        Write-ColorOutput "Para ver os logs: .\supabase-docker.ps1 logs" $Blue
    }
    else {
        Write-ColorOutput "`nErro ao iniciar Supabase" $Red
        Write-ColorOutput "Execute '.\supabase-docker.ps1 logs' para ver detalhes" $Yellow
    }
}

function Stop-Supabase {
    Write-ColorOutput "`nParando Supabase..." $Blue
    Write-ColorOutput "============================================" $Cyan
    
    if (-not (Test-DockerRunning)) { return }
    
    $result = docker-compose --env-file .env.docker down
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "`nSupabase parado com sucesso!" $Green
    }
    else {
        Write-ColorOutput "`nErro ao parar Supabase" $Red
    }
}

function Restart-Supabase {
    Write-ColorOutput "`nReiniciando Supabase..." $Blue
    Write-ColorOutput "============================================" $Cyan
    
    Stop-Supabase
    Start-Sleep -Seconds 3
    Start-Supabase
}

function Show-Status {
    Write-ColorOutput "`nStatus dos servicos Supabase:" $Blue
    Write-ColorOutput "============================================" $Cyan
    
    if (-not (Test-DockerRunning)) { return }
    
    docker-compose --env-file .env.docker ps
}

function Show-Logs {
    Write-ColorOutput "`nLogs dos servicos Supabase:" $Blue
    Write-ColorOutput "Pressione Ctrl+C para sair dos logs" $Yellow
    Write-ColorOutput "============================================" $Cyan
    
    if (-not (Test-DockerRunning)) { return }
    
    docker-compose --env-file .env.docker logs -f
}

function Reset-Supabase {
    Write-ColorOutput "`nATENCAO: Isso ira remover TODOS os dados!" $Red
    Write-ColorOutput "============================================" $Cyan
    
    $confirmation = Read-Host "Digite 'CONFIRMAR' para continuar"
    
    if ($confirmation -ne "CONFIRMAR") {
        Write-ColorOutput "`nOperacao cancelada." $Yellow
        return
    }
    
    if (-not (Test-DockerRunning)) { return }
    
    Write-ColorOutput "`nRemovendo containers e volumes..." $Blue
    
    docker-compose --env-file .env.docker down -v --remove-orphans
    docker system prune -f
    
    Write-ColorOutput "`nReset completo realizado!" $Green
    Write-ColorOutput "Para iniciar novamente: .\supabase-docker.ps1 start" $Blue
}

function Test-Health {
    Write-ColorOutput "`nVerificando saude dos servicos..." $Blue
    Write-ColorOutput "============================================" $Cyan
    
    if (-not (Test-DockerRunning)) { return }
    
    Write-ColorOutput "`nContainers em execucao:" $Blue
    docker-compose --env-file .env.docker ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    
    Write-ColorOutput "`nTestando conectividade dos servicos:" $Blue
    
    # Teste do Studio
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput "Studio (http://localhost:3000) - OK" $Green
    }
    catch {
        Write-ColorOutput "Studio (http://localhost:3000) - ERRO" $Red
    }
    
    # Teste da API
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000" -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput "API Gateway (http://localhost:8000) - OK" $Green
    }
    catch {
        Write-ColorOutput "API Gateway (http://localhost:8000) - ERRO" $Red
    }
    
    # Teste do Database
    try {
        $result = docker exec supabase-db pg_isready -U postgres -h localhost 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "PostgreSQL Database - OK" $Green
        } else {
            Write-ColorOutput "PostgreSQL Database - ERRO" $Red
        }
    }
    catch {
        Write-ColorOutput "PostgreSQL Database - ERRO" $Red
    }
}

function Show-Help {
    Write-ColorOutput "`n=== Supabase Docker Manager - ContabilidadePRO ===" $Cyan
    Write-ColorOutput "============================================" $Cyan
    Write-ColorOutput "`nComandos disponiveis:" $Blue
    Write-ColorOutput "   start    - Inicia todos os servicos do Supabase" $White
    Write-ColorOutput "   stop     - Para todos os servicos do Supabase" $White
    Write-ColorOutput "   restart  - Reinicia todos os servicos" $White
    Write-ColorOutput "   status   - Mostra o status dos servicos" $White
    Write-ColorOutput "   logs     - Mostra os logs dos servicos" $White
    Write-ColorOutput "   health   - Verifica a saude dos servicos" $White
    Write-ColorOutput "   reset    - Para e remove todos os containers e volumes" $White
    Write-ColorOutput "   help     - Mostra esta ajuda" $White
    Write-ColorOutput "`nExemplos:" $Yellow
    Write-ColorOutput "   .\supabase-docker.ps1 start" $White
    Write-ColorOutput "   .\supabase-docker.ps1 logs" $White
    Write-ColorOutput "   .\supabase-docker.ps1 health" $White
    Write-ColorOutput "`nURLs dos servicos (apos iniciar):" $Blue
    Write-ColorOutput "   Studio:    http://localhost:3000" $White
    Write-ColorOutput "   API:       http://localhost:8000" $White
    Write-ColorOutput "   Database:  postgresql://postgres:your-password@localhost:5432/postgres" $White
    Write-ColorOutput "`nCredenciais padrao:" $Yellow
    Write-ColorOutput "   Studio: supabase / this_password_is_insecure_and_should_be_updated" $White
    Write-ColorOutput "   DB: postgres / your-super-secret-and-long-postgres-password" $White
}

# Execucao principal
switch ($Command) {
    "start" { Start-Supabase }
    "stop" { Stop-Supabase }
    "restart" { Restart-Supabase }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "reset" { Reset-Supabase }
    "health" { Test-Health }
    "help" { Show-Help }
    default { Show-Help }
}

Write-ColorOutput ""
