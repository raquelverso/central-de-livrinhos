@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo  =========================================================
echo   Central de Livrinhos - Instalador (Windows)
echo  =========================================================
echo.
echo  Preparando o programinha local e o icone perto do relogio...
echo  (Zero internet, zero IA, zero texto do livro guardado.)
echo.

set "CSC="
if exist "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if "%CSC%"=="" (
    echo  Ops! Nao encontrei o compilador padrao do Windows ^(.NET 4^).
    echo  Se precisar de ajuda, tire um print desta tela e me mande.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0windows\ContarPalavras.cs" (
    echo  Ops! Faltou a subpasta "windows" junto com este instalador.
    echo  Extraia a pasta inteira do ZIP antes de abrir o instalador.
    echo.
    pause
    exit /b 1
)

set "DEST=%LOCALAPPDATA%\CentralDeLivrinhos"
if not exist "%DEST%" mkdir "%DEST%"

taskkill /F /IM CentralDeLivrinhos.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo  1/3 Copiando a pagina da Central de Livrinhos...
copy /Y "%~dp0index.html" "%DEST%\index.html" >nul
copy /Y "%~dp0style.css" "%DEST%\style.css" >nul
copy /Y "%~dp0app.js" "%DEST%\app.js" >nul
copy /Y "%~dp0windows\icone.ico" "%DEST%\icone.ico" >nul
if not exist "%DEST%\index.html" (
    echo  Ops! Nao consegui copiar os arquivos da pagina para "%DEST%".
    echo.
    pause
    exit /b 1
)

echo  2/3 Montando o programinha de contagem (sem precisar de Python)...
"%CSC%" /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 ^
  /win32icon:"%~dp0windows\icone.ico" ^
  /out:"%DEST%\CentralDeLivrinhos.exe" ^
  /r:System.dll ^
  /r:System.Core.dll ^
  /r:System.Drawing.dll ^
  /r:System.Windows.Forms.dll ^
  /r:System.Xml.dll ^
  /r:System.Xml.Linq.dll ^
  /r:System.Web.Extensions.dll ^
  /r:System.IO.Compression.dll ^
  /r:System.IO.Compression.FileSystem.dll ^
  /r:Microsoft.CSharp.dll ^
  "%~dp0windows\ContarPalavras.cs" ^
  "%~dp0windows\ProgramaBandeja.cs"

if errorlevel 1 (
    echo.
    echo  Ops! A montagem no Windows encontrou um problema acima.
    echo  Tire um print desta janela para resolvermos rapidinho.
    echo.
    pause
    exit /b 1
)

echo  3/3 Criando atalho na Area de Trabalho e ligando ao iniciar o Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dest = $env:DEST; $exe = Join-Path $dest 'CentralDeLivrinhos.exe'; " ^
  "$sh = New-Object -ComObject WScript.Shell; " ^
  "$desk = [Environment]::GetFolderPath('Desktop'); " ^
  "$lnk1 = $sh.CreateShortcut((Join-Path $desk 'Central de Livrinhos.lnk')); " ^
  "$lnk1.TargetPath = $exe; $lnk1.WorkingDirectory = $dest; $lnk1.IconLocation = ($exe + ',0'); $lnk1.Description = 'Abrir Central de Livrinhos'; $lnk1.Save(); " ^
  "$start = [Environment]::GetFolderPath('Startup'); " ^
  "$lnk2 = $sh.CreateShortcut((Join-Path $start 'Central de Livrinhos.lnk')); " ^
  "$lnk2.TargetPath = $exe; $lnk2.Arguments = '--silencioso'; $lnk2.WorkingDirectory = $dest; $lnk2.IconLocation = ($exe + ',0'); $lnk2.Description = 'Contador automatico local da Central de Livrinhos'; $lnk2.Save();"

echo.
echo  =========================================================
echo   Pronto! Central de Livrinhos instalada com sucesso!
echo  =========================================================
echo.
echo  - Icone perto do relogio (se nao aparecer, clique na setinha ^)
echo  - Vai ligar sozinho e invisivel sempre que o PC ligar
echo  - Atalho criado na Area de Trabalho: Central de Livrinhos
echo.
echo  Abrindo a Central de Livrinhos agora...
start "" "%DEST%\CentralDeLivrinhos.exe" --boas-vindas
timeout /t 2 /nobreak >nul
