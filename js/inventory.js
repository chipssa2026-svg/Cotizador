/**
 * Proceso: Inventario
 * Descripción: Visualización de productos y stock, importación masiva.
 */
window.Views = window.Views || {};

window.Views.inventory = (p = [], query = '') => {
    const prodRows = (p || []).map(x => `
        <tr>
            <td>${x.code}</td>
            <td>${x.description}</td>
            <td class="text-right">${x.stock}</td>
            <td class="text-right">L. ${x.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('');

    return `
    <div class="card glass">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
                <input type="file" id="xl-input" style="display:none" onchange="app.importFromExcel(event)">
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('xl-input').click()">
                    <i data-lucide="file-up"></i> Importar de Excel
                </button>
                <span class="badge" style="background:var(--primary-color)">Total Productos: ${p.length}</span>
            </div>
            <div class="search-bar" style="width: 300px; margin: 0; position: relative;">
                <i data-lucide="search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width:16px; color: var(--text-muted);"></i>
                <input type="text" id="inventory-search" placeholder="Buscar código o descripción..." value="${query}" 
                       style="width: 100%; padding: 10px 15px 10px 40px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main);"
                       oninput="app.searchInventory(this.value)">
            </div>
        </div>
        <table>
            <thead><tr><th>Código</th><th>Descripción</th><th class="text-right">Existencia</th><th class="text-right">Precio</th></tr></thead>
            <tbody>${prodRows || '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay productos en inventario</td></tr>'}</tbody>
        </table>
    </div>`;
};
