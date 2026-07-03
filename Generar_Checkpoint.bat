@echo off
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "dt=%%I"
set "year=%dt:~0,4%"
set "month=%dt:~4,2%"
set "day=%dt:~6,2%"
set "hour=%dt:~8,2%"
set "min=%dt:~10,2%"
set "sec=%dt:~12,2%"
set "timestamp=%year%-%month%-%day%_%hour%-%min%-%sec%"
set "timestamp=%timestamp: =0%"
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
