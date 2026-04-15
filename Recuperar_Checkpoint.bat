@echo off
setlocal
title Restaurador de Checkpoints - CotizadorPRO

echo ============================================
echo      RESTAURADOR DE PUNTOS DE INICIO
echo ============================================
echo.
echo Lista de respaldos disponibles:
dir /B /AD "_backups"
echo.
echo ============================================
set /p folder="Ingrese el nombre del punto de inicio a restaurar: "

if not exist "_backups\%folder%" (
    echo [ERROR] La carpeta "_backups\%folder%" no existe.
    pause
    exit /b
)

echo [AVISO] Se va a restaurar TODO el proyecto a la version: %folder%
set /p confirm="¿Esta seguro? (S/N): "

if /I "%confirm%" NEQ "S" exit /b

echo.
echo Restaurando archivos...
copy /Y "_backups\%folder%\*.js" "." >nul
copy /Y "_backups\%folder%\*.html" "." >nul
copy /Y "_backups\%folder%\*.css" "." >nul
copy /Y "_backups\%folder%\*.md" "." >nul
copy /Y "_backups\%folder%\*.png" "." >nul
xcopy /S /Y /E "_backups\%folder%\js\*" "js\" >nul

echo.
echo ============================================
echo    RESTAURACION COMPLETADA EXITOSAMENTE
echo ============================================
pause
