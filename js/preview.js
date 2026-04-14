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
        
        ${q.anulada ? `
        <div style="background: #fee2e2; border: 2px solid #ef4444; color: #b91c1c; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: center; font-weight: 700; font-size: 1rem;">
            <div style="text-transform: uppercase; font-size: 1.2rem; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:5px;">
                <i data-lucide="info" style="width:24px; height:24px;"></i> COTIZACIÓN ANULADA
            </div>
            <div style="font-size: 0.85rem; font-weight: 500;">
                Anulada por: <span style="font-weight: 800;">${q.anuladaPor || 'Sistema'}</span> el <span style="font-weight: 800;">${window.app.formatFullDate(q.anuladaFecha)}</span>
            </div>
            <div style="margin-top: 5px; font-style: italic; font-size: 0.85rem; background: rgba(255,255,255,0.5); padding: 5px; border-radius: 6px;">
                Motivo: "${q.anuladaMotivo || 'No especificado'}"
            </div>
        </div>
        ` : ''}

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

        <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; border-bottom: 2px solid #22c55e; padding-bottom: 0.8rem; width: 100%;">
            <div style="flex:1;">
                <p style="margin:0 0 5px; color:#64748b; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Cliente</p>
                <h2 style="margin:0; font-size:1.15rem; color: #1e293b; line-height:1.2; font-weight:800;">${q.customerName}</h2>
                <div style="margin-top:6px; font-size:0.85rem; color:#334155; line-height:1.5;">
                    <p style="margin:0;"><b>Código de Cliente:</b> ${q.customerCode || '---'}</p>
                    <p style="margin:0;"><b>RTN:</b> ${q.rtn || 'C/F'}</p>
                    <p style="margin:0;"><b>Dirección:</b> ${q.address || 'Honduras'}</p>
                    <p style="margin:0;"><b>Teléfono:</b> ${q.phones || 'N/A'}</p>
                    ${q.email ? `<p style="margin:0;"><b>Correo:</b> ${q.email}</p>` : ''}
                </div>
            </div>
            <div style="text-align: right; line-height: 1.6; font-size: 0.85rem; min-width: 180px; padding-top: 15px;">
                <div style="display:flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid #f1f5f9;">
                    <strong style="color:#64748b; text-transform:uppercase; font-size: 0.65rem;">Vendedor:</strong>
                    <span>${q.seller || 'General'}</span>
                </div>
                <div style="display:flex; justify-content: space-between; gap: 10px;">
                    <strong style="color:#64748b; text-transform:uppercase; font-size: 0.65rem;">Vence:</strong>
                    <span>${window.app.formatDisplayDate(q.dueDate)}</span>
                </div>
                <div style="display:flex; justify-content: space-between; gap: 10px;">
                    <strong style="color:#64748b; text-transform:uppercase; font-size: 0.65rem;">Moneda:</strong>
                    <span>${q.currency === 'USD' ? 'Dólares (USD)' : 'Lempiras (LPS)'}</span>
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
                        <td style="padding: 6px 8px; text-align:right;">${q.currency === 'USD' ? '$ ' : 'L. '}${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style="padding: 6px 8px; text-align:right; font-weight: 700; white-space: nowrap;">${q.currency === 'USD' ? '$ ' : 'L. '}${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
                    <p style="font-size: 0.8rem; color: #1e293b; margin: 0;"><strong>Condición:</strong> ${q.paymentCondition === 'Credito' ? 'Crédito ' + (q.plazo || 0) + ' días' : 'Contado'}</p>
                    <p style="font-size: 0.7rem; color: #64748b; margin-top: 3px;">Precios sujetos a cambio sin previo aviso.</p>
                </div>
            </div>

            <div style="width: 250px;">
                <div style="display:flex; justify-content:space-between; padding: 4px 0; font-size: 0.85rem; color: #475569;">
                    <span>Subtotal</span>
                    <span>${q.currency === 'USD' ? '$ ' : 'L. '}${(Number(q.total || 0) / 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 4px 0; font-size: 0.85rem; color: #475569;">
                    <span>ISV 15%</span>
                    <span>${q.currency === 'USD' ? '$ ' : 'L. '}${(Number(q.total || 0) - (Number(q.total || 0) / 1.15)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-top: 2px solid #22c55e; margin-top: 3px; font-size: 1.1rem;">
                    <strong style="color: #1e293b;">TOTAL</strong>
                    <strong style="color: #22c55e;">${q.currency === 'USD' ? '$ ' : 'L. '}${Number(q.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div style="margin-top: 10px; font-size: 0.75rem; color: #475569; font-weight: 600; text-align: right; text-transform: uppercase;">
                    ${window.app.numberToWords(q.total, q.currency)}
                </div>
            </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 0.8rem; margin-top: auto; margin-bottom: 0px; width: 100%;">
            <div style="display:flex; justify-content:center; gap: 30px; font-size: 0.7rem; color: #64748b; font-weight: 500;">
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="phone" style="width:12px;"></i> PBX: (504) 2544-0212</div>
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="globe" style="width:12px;"></i> www.chipssa.net</div>
                <div style="display:flex; align-items:center; gap: 5px;"><i data-lucide="mail" style="width:12px;"></i> ventas@chipssa.net</div>
            </div>
            <div style="text-align: center; margin-top: 5px; font-size: 0.65rem; color: #94a3b8;">
                Página 1 de 1
            </div>
        </div>
    </div>
`;
