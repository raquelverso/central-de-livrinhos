@echo off
chcp 65001 >nul
setlocal

echo.
echo  =========================================================
echo   Central de Livrinhos - Desinstalador (Windows)
echo  =========================================================
echo.
echo  Fechando o contador perto do relogio e removendo o programa...

taskkill /F /IM CentralDeLivrinhos.exe >nul 2>&1
timeout /t 1 /nobreak >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desk = [Environment]::GetFolderPath('Desktop'); " ^
  "$start = [Environment]::GetFolderPath('Startup'); " ^
  "Remove-Item -LiteralPath (Join-Path $desk 'Central de Livrinhos.lnk') -Force -ErrorAction SilentlyContinue; " ^
  "Remove-Item -LiteralPath (Join-Path $start 'Central de Livrinhos.lnk') -Force -ErrorAction SilentlyContinue;"

set "DEST=%LOCALAPPDATA%\CentralDeLivrinhos"
if exist "%DEST%" rmdir /S /Q "%DEST%"

echo.
echo  Pronto! O programinha e os atalhos foram removidos.
echo  Seus arquivos de livros nunca foram tocados, e seu save continua no navegador.
echo.
pause
