/**
 * Proceso: Dashboard
 * Descripción: Renderiza las estadísticas globales, gráficos y últimas operaciones.
 */
window.Views = window.Views || {};

window.Views.dashboard = (d) => {
    const qCount = (d.filteredQuotes || []).length;
    const pCount = (d.productos || []).length;
    const cCount = (d.clientes || []).length;
    const revenueText = (d.revenueValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const f = d.activeFilters || {};
    
    const recentRows = (d.recentQuotes || []).map(q => {
        const status = window.app.getStatus(q);
        return `
        <tr>
            <td>#${q.number}</td>
            <td>${q.customerName}</td>
            <td>${q.seller || 'General'}</td>
            <td>${window.app.formatDisplayDate(q.date)}</td>
            <td>${window.app.formatDisplayDate(q.dueDate)}</td>
            <td><span class="badge" style="background:${status.color}">${status.label}</span></td>
            <td class="text-right row-total">L. ${q.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-center">
                <div style="display:flex; gap:5px; justify-content:center;">
                    <button class="btn btn-secondary btn-sm" onclick="window.app.previewQuote('${q.id}')">Ver</button>
                    <button class="btn btn-sm ${q.facturada ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.toggleFacturado('${q.id}')" title="Marcar como Facturada"><i data-lucide="${q.facturada ? 'check-square' : 'file-check'}"></i></button>
                </div>
            </td>
        </tr>`}).join('');

    const sellerOptions = (d.vendedores || []).map(s => `<option value="${s.name}" ${f.seller === s.name ? 'selected' : ''}>${s.name}</option>`).join('');

    return `
    <div class="flex-between mb-4 card glass" style="padding: 10px 20px; flex-wrap: wrap;">
        <div style="display:flex; align-items:center; gap: 10px;">
            <i data-lucide="filter" style="width:16px; color:var(--primary-color)"></i>
            <span style="font-weight:600; font-size:0.9rem;">Filtros Globales:</span>
        </div>
        <div style="display:flex; gap:10px; flex-wrap: wrap;">
            <select id="dash-filter-status" class="btn btn-secondary btn-sm" onchange="app.filterDashboard(document.getElementById('dash-filter-q').value, this.value, document.getElementById('dash-filter-seller').value)">
                <option value="">Estado: Todos</option>
                <option value="Activa" ${f.status === 'Activa' ? 'selected' : ''}>Activa</option>
                <option value="Facturada" ${f.status === 'Facturada' ? 'selected' : ''}>Facturada</option>
                <option value="Vencida" ${f.status === 'Vencida' ? 'selected' : ''}>Vencida</option>
                <option value="Por vencer" ${f.status === 'Por vencer' ? 'selected' : ''}>Por vencer</option>
            </select>
            <select id="dash-filter-seller" class="btn btn-secondary btn-sm" onchange="app.filterDashboard(document.getElementById('dash-filter-q').value, document.getElementById('dash-filter-status').value, this.value)">
                <option value="">Vendedor: Todos</option>
                ${sellerOptions}
            </select>
            <input type="text" id="dash-filter-q" placeholder="Buscar cliente o No..." class="btn btn-secondary btn-sm" value="${f.query || ''}" 
                   oninput="app.filterDashboard(this.value, document.getElementById('dash-filter-status').value, document.getElementById('dash-filter-seller').value)"
                   style="width: 220px; text-align: left; cursor: text;">
        </div>
    </div>

    <div class="stats-grid">
        <div class="card stat-card">
            <div class="stat-value">${pCount}</div>
            <div class="stat-label">Productos</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">Actualizado: ${window.app.formatFullDate(d.lastProductImport)}</div>
        </div>
        <div class="card stat-card">
            <div class="stat-value">${cCount}</div>
            <div class="stat-label">Clientes</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">Actualizado: ${window.app.formatFullDate(d.lastCustomerImport)}</div>
        </div>
        <div class="card stat-card">
            <div class="stat-value">${(d.vendedores || []).length}</div>
            <div class="stat-label">Vendedores</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">Actualizado: ${window.app.formatFullDate(d.lastSellerImport)}</div>
        </div>
        <div class="card stat-card">
            <div class="stat-value">L. ${revenueText}</div>
            <div class="stat-label">Valor Filtrado</div>
        </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card glass">
            <h3 style="margin-bottom:1rem;">Volumen y Valor Mensual (${new Date().getFullYear()})</h3>
            <div style="height: 300px; width: 100%;"><canvas id="quotesMonthChart"></canvas></div>
        </div>
        <div class="card glass">
            <h3 style="margin-bottom:1rem;">Cotizaciones por Estado (Valor)</h3>
            <div style="height: 300px; width: 100%;"><canvas id="statusChart"></canvas></div>
        </div>
    </div>

    <div class="card glass">
        <div class="flex-between mb-4"><h3>Últimas Operaciones</h3></div>
        <table>
            <thead><tr><th>No.</th><th>Cliente</th><th>Vendedor</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th><th class="text-right">Total</th><th class="text-center">Acción</th></tr></thead>
            <tbody>${recentRows || '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay cotizaciones coincidentes</td></tr>'}</tbody>
        </table>
    </div>`;
};
