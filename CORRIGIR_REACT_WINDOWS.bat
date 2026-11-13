@echo off
setlocal
cd /d "%~dp0"
echo Corrigindo as versoes de React e React DOM para 19.2.6...
call npm install react@19.2.6 react-dom@19.2.6 --save-exact --no-audit --no-fund
if errorlevel 1 (
  echo Falha na instalacao. Confirme a conexao com a internet.
  pause
  exit /b 1
)
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo.
echo Versoes instaladas:
call npm ls react react-dom --depth=0
echo.
echo Iniciando aplicativo...
call npm run dev
endlocal
