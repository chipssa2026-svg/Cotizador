@echo off
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"') do set "timestamp=%%i"
set backupDir=_backups\%timestamp%

if not exist _backups mkdir _backups
mkdir %backupDir%

:: Copiar archivos base
copy app.js %backupDir% >nul
copy index.html %backupDir% >nul
copy style.css %backupDir% >nul
copy Logo.png %backupDir% >nul
copy KNOWLEDGE_BASE.md %backupDir% >nul

:: Copiar scripts de utilidad y ejecutables
copy *.js %backupDir% >nul
copy *.bat %backupDir% >nul

:: Copiar carpetas
xcopy /s /i /y js %backupDir%\js >nul

echo ============================================
echo Checkpoint completo creado en: %backupDir%
echo Archivos respaldados: JS, HTML, CSS, MD, BAT
echo ============================================
pause
