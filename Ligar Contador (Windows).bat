@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "EXE=%LOCALAPPDATA%\CentralDeLivrinhos\CentralDeLivrinhos.exe"
if exist "%EXE%" (
    start "" "%EXE%"
    exit /b 0
)

call "%~dp0Instalar Central de Livrinhos (Windows).bat"
