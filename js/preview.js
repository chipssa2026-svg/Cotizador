/**
 * Proceso: Vista Previa
 * Descripción: Generación del documento final de cotización con formato de impresión, logo y términos legales.
 */
window.Views = window.Views || {};

window.Views.preview = (q) => `
    <div class="no-print mb-4" style="display:flex; gap:1rem;">
        <button class="btn btn-secondary" onclick="window.app.render(window.app.lastMainView || 'dashboard')">Volver</button> 
        <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Imprimir</button>
    </div>
    <div class="print-area card glass" style="width: 100%; margin: auto; background: white !important; color: black !important; font-family: 'Inter', sans-serif; position: relative; box-sizing: border-box;">
        
        <div style="display:flex; align-items:flex-start; justify-content: space-between; margin-bottom: 0.8rem; margin-top: -0.5rem; width: 100%;">
            <div style="display:flex; align-items:center; gap: 1.5rem;">
                <img src="Logo.png" style="width: 110px; height: auto;" alt="Logo Chips" onerror="this.src='https://placehold.co/110x45?text=Chips+S.A.'">
                <div style="line-height: 1.2;">
                    <h2 style="margin:0; font-weight: 700; font-size: 1.3rem;">Chips, S.A.</h2>
                    <p style="margin:0; font-size: 0.7rem; color: #444;">Col. El Prado, 10 Ave, 17 Calle, Circunvalacion No. 55</p>
                    <p style="margin:0; font-size: 0.7rem; color: #444;">San Pedro Sula, Cortes, Honduras</p>
                    <p style="margin:0; font-size: 0.7rem; color: #444; font-weight: 600;">RTN: 05019999176400</p>
                </div>
            </div>
            <div style="text-align: right;">
                <h1 style="color: #22c55e; font-size: 1.8rem; margin: 0; padding-bottom: 0.1rem; letter-spacing: -0.5px;">Cotización #${q.number}</h1>
                <p style="margin:0; font-size: 0.8rem; color: #64748b; font-weight: 600;">Fecha: ${window.app.formatDisplayDate(q.date)}</p>
            </div>
        </div>

        <div style="display:flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.2rem; border-bottom: 2px solid #22c55e; padding-bottom: 0.8rem; width: 100%;">
            <div style="line-height: 1.4;">
                <label style="color:#64748b; font-size:0.6rem; text-transform:uppercase; font-weight: 700;">Cliente:</label>
                <p style="margin:0; font-size: 1.1rem; font-weight: 700; color: #1e293b;">${q.customerName}</p>
                <p style="margin:0; font-size: 0.8rem; color: #334155;">${q.address || ''}</p>
                <p style="margin:0; font-size: 0.8rem; color: #334155;">RTN: ${q.rtn || 'N/A'}</p>
            </div>
            <div style="text-align: right; line-height: 1.3; font-size: 0.8rem; min-width: 150px;">
                <div style="display:flex; justify-content: space-between; gap: 10px;">
                    <strong style="color:#64748b; text-transform:uppercase; font-size: 0.65rem;">Vendedor:</strong>
                    <span>${q.seller || 'General'}</span>
                </div>
                <div style="display:flex; justify-content: space-between; gap: 10px;">
                    <strong style="color:#64748b; text-transform:uppercase; font-size: 0.65rem;">Vence:</strong>
                    <span>${window.app.formatDisplayDate(q.dueDate)}</span>
                </div>
            </div>
        </div>

        <table style="width:100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8rem;">
            <thead>
                <tr style="border-bottom: 2px solid #1e293b; color: #1e293b;">
                    <th style="padding: 10px 8px; text-align:left; width: 15%;">CÓDIGO</th>
                    <th style="padding: 10px 8px; text-align:left;">DESCRIPCIÓN</th>
                    <th style="padding: 10px 8px; text-align:right; width: 10%;">CANT.</th>
                    <th style="padding: 10px 8px; text-align:right; width: 14%;">PRECIO</th>
                    <th style="padding: 10px 8px; text-align:right; width: 18%;">IMPORTE</th>
                </tr>
            </thead>
            <tbody>
                ${(q.items || []).map(i => {
                    const qty = Number(i.qty || 0);
                    const price = Number(i.price || 0);
                    const rowTotal = Number(i.total || (qty * price));
                    return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 500;">${i.code || ''}</td>
                        <td style="padding: 6px 8px;">${i.description || 'Sin descripción'}</td>
                        <td style="padding: 6px 8px; text-align:right;">${qty.toFixed(2)}</td>
                        <td style="padding: 6px 8px; text-align:right;">L. ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style="padding: 6px 8px; text-align:right; font-weight: 700; white-space: nowrap;">L. ${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>

        <div style="display:flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <div style="flex: 1; padding-right: 2rem;">
                ${q.notes ? `
                <div style="padding: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 1rem;">
                    <strong style="color:#64748b; font-size: 0.6rem; text-transform:uppercase; display:block; margin-bottom: 0.2rem;">Notas:</strong>
                    <p style="margin:0; font-size: 0.75rem; color: #475569; line-height: 1.3; white-space: pre-wrap;">${q.notes}</p>
                </div>
                ` : '<div style="height: 5px;"></div>'}
                
                <div>
                    <p style="font-size: 0.8rem; color: #1e293b; margin: 0;"><strong>Condición:</strong> Contado / 30 días</p>
                    <p style="font-size: 0.7rem; color: #64748b; margin-top: 3px;">Precios sujetos a cambio sin previo aviso.</p>
                </div>
            </div>

            <div style="width: 250px;">
                <div style="display:flex; justify-content:space-between; padding: 4px 0; font-size: 0.85rem; color: #475569;">
                    <span>Subtotal</span>
                    <span>L. ${(Number(q.total || 0) / 1.15).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 4px 0; font-size: 0.85rem; color: #475569;">
                    <span>ISV 15%</span>
                    <span>L. ${(Number(q.total || 0) - (Number(q.total || 0) / 1.15)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-top: 2px solid #22c55e; margin-top: 3px; font-size: 1.1rem;">
                    <strong style="color: #1e293b;">TOTAL</strong>
                    <strong style="color: #22c55e;">L. ${Number(q.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
            </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 0.8rem; margin-top: auto; margin-bottom: 0px; width: 100%;">
            <div style="display:flex; justify-content:center; gap: 30px; font-size: 0.7rem; color: #64748b; font-weight: 500;">
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="phone" style="width:12px;"></i> PBX: (504) 2556-9781</div>
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="globe" style="width:12px;"></i> www.chipssa.net</div>
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="mail" style="width:12px;"></i> ventas@chipssa.net</div>
            </div>
            <div style="text-align: center; margin-top: 5px; font-size: 0.65rem; color: #94a3b8;">
                Cotización genera por sistema CotizadorPRO - Página 1 de 1
            </div>
        </div>
    </div>
`;
