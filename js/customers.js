/**
 * Proceso: Clientes
 * Descripción: Gestión del directorio de clientes e importación desde Excel.
 */
window.Views = window.Views || {};

window.Views.customers = (p = [], query = '') => {
    const rows = (p || []).map(x => `
        <tr>
            <td>${x.id || ''}</td>
            <td style="font-weight: 600;">${x.razonSocial}</td>
            <td>${x.nombreComercial || '---'}</td>
            <td>${x.rtn || 'N/A'}</td>
            <td>${x.sucursal || '---'}</td>
            <td>${x.address || ''}</td>
            <td>${x.phones || ''}</td>
            <td style="font-size: 0.85rem; color: var(--primary-color);">${x.email || '---'}</td>
        </tr>
    `).join('');

    return `
    <div class="card glass">
        <div class="flex-between mb-4">
            <div style="display:flex; align-items:center; gap:1rem;">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer">
                    <i data-lucide="file-up"></i> Importar de Excel
                    <input type="file" style="display:none" accept=".xlsx, .xls" onchange="app.importCustomersFromExcel(event)">
                </label>
                <span class="badge" style="background:var(--primary-color)">Total Clientes: ${p.length}</span>
            </div>
            <div class="search-bar" style="width: 300px; margin: 0; position: relative;">
                <i data-lucide="search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width:16px; color: var(--text-muted);"></i>
                <input type="text" id="customer-search" placeholder="Buscar cliente..." value="${query}" 
                       style="width: 100%; padding: 10px 15px 10px 40px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main);"
                       oninput="app.searchCustomers(this.value)">
            </div>
        </div>
        <table>
            <thead><tr><th>CODIGO</th><th>Razón Social</th><th>Nombre Comercial</th><th>RTN</th><th>SUCURSAL</th><th>Dirección</th><th>Teléfonos</th><th>Correo</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay clientes registrados</td></tr>'}</tbody>
        </table>
    </div>`;
};
