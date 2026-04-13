/**
 * Proceso: Historial
 * Descripción: Listado detallado de todas las cotizaciones con filtros avanzados de búsqueda y fechas.
 */
window.Views = window.Views || {};

window.Views.history = (q, f = {}, sellers = []) => {
    const rows = (q || []).sort((a, b) => b.id - a.id).map(x => {
        const status = window.app.getStatus(x);
        return `
        <tr>
            <td>#${x.number}</td>
            <td>${x.customerName}</td>
            <td>${x.seller || 'General'}</td>
            <td>${window.app.formatDisplayDate(x.date)}</td>
            <td>${window.app.formatDisplayDate(x.dueDate)}</td>
            <td><span class="badge" style="background:${status.color}">${status.label}</span></td>
            <td class="text-right row-total">${x.currency === 'USD' ? '$ ' : 'L. '}${(x.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">
                <div style="display:flex; gap:5px; justify-content:center;">
                    <button class="btn btn-secondary btn-sm" onclick="window.app.previewQuote('${x.id || ''}')">Ver</button>
                    ${['ADMINISTRADOR', 'GERENCIA', 'ASISTENTE DE GERENCIA', 'FACTURACION'].includes((window.app.data.currentUser.Rol || '').toUpperCase()) ? `
                    <button class="btn btn-sm ${x.facturada ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.toggleFacturado('${x.getSyncId ? x.getSyncId() : x.id}')" title="Marcar como Facturada">
                        <i data-lucide="${x.facturada ? 'check-square' : 'file-check'}" style="width:14px;"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`}).join('');

    return `
    <div class="card glass">
        <div style="margin-bottom: 2rem; display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end;">
            <div style="flex:1; min-width: 250px;">
                <label style="font-size: 0.8rem; color: var(--text-muted); display:block; margin-bottom: 5px;">Buscar Cliente o No. Cotización</label>
                <div class="search-bar" style="width: 100%; margin: 0; position: relative;">
                    <i data-lucide="search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width:14px; color: var(--text-secondary);"></i>
                    <input type="text" id="hist-filter-q" placeholder="Escriba..." value="${f.query || ''}" 
                           style="width: 100%; padding: 8px 15px 8px 35px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card);"
                           oninput="app.filterHistory(this.value, document.getElementById('hist-filter-status').value, document.getElementById('hist-filter-seller').value, document.getElementById('hist-filter-start').value, document.getElementById('hist-filter-end').value)">
                </div>
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display:block; margin-bottom: 5px;">Estado</label>
                <select id="hist-filter-status" class="btn btn-secondary btn-sm" onchange="app.filterHistory(document.getElementById('hist-filter-q').value, this.value, document.getElementById('hist-filter-seller').value, document.getElementById('hist-filter-start').value, document.getElementById('hist-filter-end').value)">
                    <option value="">Todos</option>
                    <option value="Activa" ${f.status === 'Activa' ? 'selected' : ''}>Activa</option>
                    <option value="Facturada" ${f.status === 'Facturada' ? 'selected' : ''}>Facturada</option>
                    <option value="Vencida" ${f.status === 'Vencida' ? 'selected' : ''}>Vencida</option>
                    <option value="Por vencer" ${f.status === 'Por vencer' ? 'selected' : ''}>Por vencer</option>
                </select>
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display:block; margin-bottom: 5px;">Vendedor</label>
                <select id="hist-filter-seller" class="btn btn-secondary btn-sm" onchange="app.filterHistory(document.getElementById('hist-filter-q').value, document.getElementById('hist-filter-status').value, this.value, document.getElementById('hist-filter-start').value, document.getElementById('hist-filter-end').value)">
                    <option value="">Todos</option>
                    ${(sellers || []).map(s => `<option value="${s.name}" ${f.seller === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display:block; margin-bottom: 5px;">Desde</label>
                <input type="date" id="hist-filter-start" class="btn btn-secondary btn-sm" value="${f.start || ''}" 
                       onchange="app.filterHistory(document.getElementById('hist-filter-q').value, document.getElementById('hist-filter-status').value, document.getElementById('hist-filter-seller').value, this.value, document.getElementById('hist-filter-end').value)">
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display:block; margin-bottom: 5px;">Hasta</label>
                <input type="date" id="hist-filter-end" class="btn btn-secondary btn-sm" value="${f.end || ''}" 
                       onchange="app.filterHistory(document.getElementById('hist-filter-q').value, document.getElementById('hist-filter-status').value, document.getElementById('hist-filter-seller').value, document.getElementById('hist-filter-start').value, this.value)">
            </div>
            <div style="margin-left: auto;">
                <button class="btn btn-secondary btn-sm" onclick="app.exportHistoryToExcel()" style="height: 38px;">
                    <i data-lucide="download"></i> Excel
                </button>
            </div>
        </div>
        <table>
            <thead><tr><th>No.</th><th>Cliente</th><th>Vendedor</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th><th class="text-right">Total</th><th class="text-center">Acción</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay registros</td></tr>'}</tbody>
        </table>
    </div>`;
};
