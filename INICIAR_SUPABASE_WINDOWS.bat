@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale Node.js 22.13 ou superior.
  pause
  exit /b 1
)
if not exist .env (
  if not exist .env.example (
    echo [ERRO] Arquivo .env.example nao encontrado.
    pause
    exit /b 1
  )
  copy /Y .env.example .env >nul
  echo [OK] Criado .env do ambiente TEMPORARIO. Nao compartilhe chaves secretas aqui.
)
echo Conferindo e sincronizando as dependencias do projeto...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] Falha ao instalar dependencias. Verifique a conexao com a internet.
  pause
  exit /b 1
)
echo.
echo EPSA Gestao Comercial - Supabase de homologacao
echo Abra no navegador o endereco indicado abaixo pelo Vite.
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
call npm run dev
if errorlevel 1 pause
endlocal
