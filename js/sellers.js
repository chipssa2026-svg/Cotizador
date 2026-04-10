/**
 * Proceso: Vendedores
 * Descripción: Gestión y visualización de la lista de vendedores autorizados.
 */
window.Views = window.Views || {};

window.Views.sellers = (s, query = '') => {
    const rows = (s || []).filter(x => !query || x.name.toLowerCase().includes(query.toLowerCase()) || x.id.toLowerCase().includes(query.toLowerCase())).map(x => `
        <tr>
            <td>${x.id}</td>
            <td>${x.name}</td>
        </tr>`).join('');
    return `
    <div class="card glass">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin:0;">
                    <i data-lucide="file-up"></i> Importar de Excel
                    <input type="file" style="display:none" accept=".xlsx, .xls" onchange="app.importSellersFromExcel(event)">
                </label>
                <span class="badge" style="background:var(--primary-color)">Total Vendedores: ${s.length}</span>
            </div>
            <div class="search-bar" style="width: 300px; margin: 0; position: relative;">
                <i data-lucide="search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width:16px; color: var(--text-muted);"></i>
                <input type="text" placeholder="Buscar vendedor..." oninput="app.render('sellers', null, this.value)" 
                       style="width: 100%; padding: 10px 15px 10px 40px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main);">
            </div>
        </div>
        <table>
            <thead><tr><th>CODIGO</th><th>Nombre</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="2" style="text-align:center; padding:20px;">No hay vendedores registrados</td></tr>'}</tbody>
        </table>
    </div>
`;
};
