@echo off
setlocal enabledelayedexpansion

REM Script Batch para gerenciar Supabase com Docker
REM Uso: supabase-docker.bat [comando]

set "command=%1"
if "%command%"=="" set "command=help"

goto :%command% 2>nul || goto :help

:start
echo.
echo 🚀 Iniciando Supabase com Docker...
echo.

REM Verifica se Docker está rodando
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando. Por favor, inicie o Docker Desktop.
    goto :end
)

REM Verifica se o arquivo .env.docker existe
if not exist ".env.docker" (
    echo ❌ Arquivo .env.docker não encontrado!
    echo Execute o comando 'supabase init' primeiro ou crie o arquivo .env.docker
    goto :end
)

REM Copia o arquivo .env.docker para .env se não existir
if not exist ".env" (
    copy ".env.docker" ".env" >nul
    echo 📋 Arquivo .env criado a partir do .env.docker
)

docker-compose --env-file .env.docker up -d
if errorlevel 1 (
    echo ❌ Erro ao iniciar Supabase
    goto :end
)

echo.
echo ✅ Supabase iniciado com sucesso!
echo.
echo 🌐 URLs disponíveis:
echo   Studio:    http://localhost:3000
echo   API:       http://localhost:8000
echo   Database:  postgresql://postgres:your-password@localhost:5432/postgres
echo.
echo 📊 Para ver o status: supabase-docker.bat status
echo 📋 Para ver os logs: supabase-docker.bat logs
goto :end

:stop
echo.
echo 🛑 Parando Supabase...
echo.

docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando.
    goto :end
)

docker-compose --env-file .env.docker down
if errorlevel 1 (
    echo ❌ Erro ao parar Supabase
    goto :end
)

echo ✅ Supabase parado com sucesso!
goto :end

:restart
echo.
echo 🔄 Reiniciando Supabase...
echo.
call :stop
timeout /t 3 /nobreak >nul
call :start
goto :end

:status
echo.
echo 📊 Status dos serviços Supabase:
echo.

docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando.
    goto :end
)

docker-compose --env-file .env.docker ps
goto :end

:logs
echo.
echo 📋 Logs dos serviços Supabase:
echo Pressione Ctrl+C para sair dos logs
echo.

docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando.
    goto :end
)

docker-compose --env-file .env.docker logs -f
goto :end

:reset
echo.
echo ⚠️  ATENÇÃO: Isso irá remover TODOS os dados!
set /p "confirmation=Digite 'CONFIRMAR' para continuar: "

if not "%confirmation%"=="CONFIRMAR" (
    echo ❌ Operação cancelada.
    goto :end
)

echo.
echo 🗑️  Removendo containers e volumes...

docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando.
    goto :end
)

docker-compose --env-file .env.docker down -v --remove-orphans
docker system prune -f

echo ✅ Reset completo realizado!
echo Para iniciar novamente: supabase-docker.bat start
goto :end

:help
echo.
echo === Supabase Docker Manager ===
echo.
echo Comandos disponíveis:
echo   start    - Inicia todos os serviços do Supabase
echo   stop     - Para todos os serviços do Supabase
echo   restart  - Reinicia todos os serviços
echo   status   - Mostra o status dos serviços
echo   logs     - Mostra os logs dos serviços
echo   reset    - Para e remove todos os containers e volumes
echo   help     - Mostra esta ajuda
echo.
echo Exemplos:
echo   supabase-docker.bat start
echo   supabase-docker.bat logs
echo   supabase-docker.bat status
echo.
echo URLs dos serviços (após iniciar):
echo   Studio:    http://localhost:3000
echo   API:       http://localhost:8000
echo   Database:  postgresql://postgres:your-password@localhost:5432/postgres
echo   Inbucket:  http://localhost:54324 (emails de teste)
echo.
goto :end

:end
echo.
pause
