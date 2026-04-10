# Script de Respaldo para CotizadorPRO
# Este script crea una copia de seguridad de todo el proyecto en la carpeta _backups

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "_backups\$timestamp"

if (!(Test-Path "_backups")) {
    New-Item -ItemType Directory -Path "_backups"
}

New-Item -ItemType Directory -Path $backupDir

Copy-Item -Path "app.js", "index.html", "style.css", "Logo.png" -Destination $backupDir

Write-Host "Checkpoint creado exitosamente en: $backupDir" -ForegroundColor Green
Write-Host "Para revertir un cambio, simplemente copie los archivos de la carpeta del respaldo de regreso a la carpeta principal." -ForegroundColor Yellow
