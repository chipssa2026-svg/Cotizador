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

copy app.js %backupDir%
copy index.html %backupDir%
copy style.css %backupDir%
copy Logo.png %backupDir%
xcopy /s /i /y js %backupDir%\js

echo ============================================
echo Checkpoint creado exitosamente en: %backupDir%
echo ============================================
pause
