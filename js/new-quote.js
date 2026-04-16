/**
 * Proceso: Nueva Cotización
 * Descripción: Formulario interactivo para crear cotizaciones, selección de productos y clientes.
 */
window.Views = window.Views || {};

window.Views['new-quote'] = (d) => {
    const p = d.productos || [];
    const customers = d.clientes || [];
    const sellers = d.vendedores || [];
    const prodList = (p || []).map(x => `<option value="${x.code} - ${x.description}">`).join('');
    
    const branches = [...new Set(customers.map(c => c.sucursal).filter(s => s))].sort();
    const branchOptions = branches.map(b => `<option value="${b}">${b}</option>`).join('');

    // Filtrar clientes por la primera sucursal por defecto para mantener consistencia
    const defaultBranch = branches[0] || '';
    const filteredInitial = defaultBranch ? customers.filter(c => c.sucursal === defaultBranch) : (customers || []);

    const custList = filteredInitial.map(c => {
        const label = `${c.id} | ${c.razonSocial}${c.nombreComercial ? ' | ' + c.nombreComercial : ''}${c.rtn ? ' | ' + c.rtn : ''}`;
        return `<option value="${label}">`;
    }).join('');
    
    const sellerList = (sellers || []).map(s => `<option value="${s.name}">`).join('');
    const quotes = d.cotizaciones || [];
    const quoteList = (quotes || []).sort((a,b) => b.number - a.number).map(q => `<option value="${q.number} | ${q.customerName} - ${window.app.formatDisplayDate(q.date)}">`).join('');

    return `
    <datalist id="products-datalist">${prodList}</datalist>
    <datalist id="customers-datalist">${custList}</datalist>
    <datalist id="sellers-datalist">${sellerList}</datalist>
    <datalist id="quotes-datalist">${quoteList}</datalist>
    
    <div class="no-print mb-4" style="display:flex; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="app.showRecallQuoteModal()" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="search"></i> Llamar Cotización
        </button>
    </div>

    <div class="quote-form-grid">
        <div class="card glass">
            <div class="flex-between mb-4"><h3>Productos</h3><button class="btn btn-secondary btn-sm" onclick="app.addQuoteItem()"> + Fila</button></div>
            <table class="minimal-table">
                <thead><tr><th style="width:45%">Producto</th><th style="width:10%">Cant.</th><th style="width:20%">Precio</th><th class="text-right" style="width:140px; padding-right:1.5rem;">Total</th><th style="width:40px;"></th></tr></thead>
                <tbody id="quote-items-body"></tbody>
            </table>
        </div>
        <div class="card glass">
            <h3>Información de Cotización</h3>
            <div class="customer-inputs mt-3">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;" class="mb-3">
                    <div>
                        <label>Seleccionar Sucursal</label>
                        <select id="quote-branch" onchange="app.filterCustomersByBranch(this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-family:inherit;">
                            ${branchOptions}
                        </select>
                    </div>
                    <div>
                        <label>Cliente</label>
                        <input type="text" id="quote-customer" placeholder="Nombre del cliente..." list="customers-datalist" onchange="app.onCustomerSelect(this)">
                    </div>
                </div>

                <div class="mb-3"><label>RTN / ID</label><input type="text" id="quote-rtn" placeholder="RTN del cliente..."></div>
                <div class="mb-3"><label>Dirección</label><input type="text" id="quote-address" placeholder="Dirección del cliente..."></div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;" class="mb-3">
                    <div><label>Correo Electrónico</label><input type="email" id="quote-email" placeholder="correo@ejemplo.com"></div>
                    <div><label>Teléfono</label><input type="text" id="quote-phone" placeholder="Teléfono..."></div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><label>Vencimiento</label><input type="date" id="quote-due-date" value="${window.app.getLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}"></div>
                    <div><label>Vendedor</label><input type="text" id="quote-vendedor" placeholder="Nombre..." list="sellers-datalist"></div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;" class="mt-3">
                    <div>
                        <label>Condición de Pago</label>
                        <select id="quote-payment-condition" onchange="app.togglePlazoField(this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-family:inherit;">
                            <option value="Contado">Contado</option>
                            <option value="Credito">Crédito</option>
                        </select>
                    </div>
                    <div id="plazo-container" style="display:none;">
                        <label>Plazo (días)</label>
                        <input type="number" id="quote-plazo" placeholder="0" min="0" value="0">
                    </div>
                </div>

                <div class="mt-3">
                    <label>Tipo de Cotización</label>
                    <select id="quote-tipo" onchange="app.calculateTotals()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-family:inherit;">
                        <option value="Nacional">🇭🇳 Nacional (ISV 15%)</option>
                        <option value="Extranjera">🌎 Extranjera (Sin ISV)</option>
                    </select>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;" class="mt-3">
                    <div>
                        <label>Moneda</label>
                        <select id="quote-currency" onchange="app.toggleCurrencyField(this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-family:inherit;">
                            <option value="LPS">Lempiras (L.)</option>
                            <option value="USD">Dólares ($)</option>
                        </select>
                    </div>
                    <div id="exchange-rate-container" style="display:none;">
                        <label>Tasa de Cambio</label>
                        <input type="number" id="quote-exchange-rate" placeholder="0.00" min="0" step="0.01" value="" oninput="app.updatePricesByRate()">
                    </div>
                </div>

                <div class="mt-3">
                    <label style="color:var(--text-main);">Observaciones</label>
                    <textarea id="quote-notes" placeholder="Notas o términos adicionales..." style="width:100%; height:80px; border-radius:8px; padding:10px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-family:inherit; resize:none;"></textarea>
                </div>
            </div>
            <div class="totals-area mt-4 p-3" style="border-radius:10px; background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-main);">
                <div class="flex-between"><span>Subtotal:</span><span id="sub-total">L. 0.00</span></div>
                <div class="flex-between"><span id="isv-label">ISV (15%):</span><span id="isv-total">L. 0.00</span></div>
                <div class="flex-between h4 mt-2"><span>Total:</span><span id="total-val" class="text-primary-color">L. 0.00</span></div>
            </div>
            <button class="btn btn-primary w-100 mt-4 py-3" onclick="app.saveFinalQuote()" style="font-size:1.1rem; font-weight:600;">Guardar y Ver Cotización</button>
        </div>
    </div>
`;
};
