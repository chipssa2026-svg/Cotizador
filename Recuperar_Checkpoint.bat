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
    echo.
    echo [ERROR] La carpeta "_backups\%folder%" no existe.
    echo Verifique el nombre e intente de nuevo.
    pause
    exit /b
)

echo.
echo [AVISO] Se van a sobrescribir los archivos actuales con la version: %folder%
set /p confirm="¿Esta seguro? (S/N): "

if /I "%confirm%" NEQ "S" (
    echo Restauracion cancelada por el usuario.
    pause
    exit /b
)

echo.
echo Restaurando archivos...
copy /Y "_backups\%folder%\app.js" "app.js"
copy /Y "_backups\%folder%\index.html" "index.html"
copy /Y "_backups\%folder%\style.css" "style.css"
xcopy /S /Y "_backups\%folder%\js\*" "js\"

echo.
echo ============================================
echo    RESTAURACION COMPLETADA EXITOSAMENTE
echo ============================================
echo Los archivos han sido revertidos a: %folder%
echo.
pause
