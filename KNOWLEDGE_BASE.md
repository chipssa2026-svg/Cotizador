# 🗺️ Base de Conocimientos: Cotizador PRO (Modular)

Este proyecto ha sido reestructurado para ser **indestructible** y fácil de mantener. La lógica central está separada de los diseños visuales.

## 🏗️ Directorio del Proyecto

### 📂 / (Raíz)
*   **`app.js` (CEREBRO)**:  
    👑 El núcleo central. Gestiona la sincronización con Google Sheets, los cálculos de dinero, las importaciones de Excel y el "cambio de pantallas" (Render). No toques este archivo a menos que quieras cambiar el funcionamiento interno.
*   **`index.html`**:  
    🖼️ El marco de la casa. Carga todas las librerías necesarias (XLSX, Chart.js, Lucide) y las piezas del rompecabezas.
*   **`style.css`**:  
    🎨 El traje de gala. Controla colores, fuentes, efectos de cristal (glassmorphism) y modo oscuro.
*   **`Generar_Checkpoint.bat`**:  
    💾 **TU ESCUDO**. Ejecútalo antes de cualquier cambio para crear un respaldo total en la carpeta `_backups/`.

---

### 📂 /js (PIEZAS VISUALES)
En esta carpeta están los diseños de cada pantalla. Si quieres cambiar un botón, un texto o una tabla de una sección específica, busca su archivo aquí:

| Archivo | Proceso que controla |
| :--- | :--- |
| **`dashboard.js`** | 📊 Estadísticas, Gráficos y Últimas Operaciones. |
| **`inventory.js`** | 📦 Lista de productos, Precios y Stock. |
| **`customers.js`** | 👥 Directorio de clientes e Importación. |
| **`new-quote.js`** | 🖋️ Formulario para crear cotizaciones. |
| **`history.js`** | 📜 Todas las cotizaciones pasadas y Filtros. |
| **`preview.js`** | 📄 Formato oficial para Imprimir. |
| **`sellers.js`** | 👥 Lista de vendedores autorizados. |

---

## 🛠️ Instrucciones de Mantenimiento

### 1. ¿Cómo cambiar un diseño?
Si quieres que el Historial tenga más columnas o colores, abre `js/history.js`. Verás código HTML que puedes editar sin miedo a romper el Inventario.

### 2. ¿Cómo añadir una fórmula?
Si necesitas un nuevo cálculo matemático, ve a `app.js` bajo la sección `// --- LÓGICA DE PROCESOS ---`.

### 3. ¿Cómo realizar un respaldo?
Simplemente abre tu carpeta del proyecto y haz doble clic en `Generar_Checkpoint.bat`. Se creará una carpeta con la fecha y hora actual dentro de `_backups/`.

---
**Recuerda**: La aplicación es **Nube-Nativa**. No usa la memoria del navegador. Si los datos cambian en Google Sheets, solo presiona sincronizar y todo se actualizará según estas piezas.
