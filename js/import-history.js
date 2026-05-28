/**
 * Proceso: Historial de Cargas
 * Descripción: Muestra un registro de auditoría de todas las importaciones de Excel realizadas.
 */
window.Views = window.Views || {};

window.Views['import-history'] = (historial = []) => {
    const rows = (historial || []).sort((a, b) => b.id - a.id).map(h => {
        return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;">
            <td style="padding: 15px; font-weight: 600; color: var(--text-main);">${h.fechaHora}</td>
            <td style="padding: 15px; font-weight: 700; color: var(--primary-color);">${h.usuario}</td>
            <td style="padding: 15px;">
                <span class="badge" style="background: ${h.tipoImportacion === 'Inventario' ? '#dbeafe' : h.tipoImportacion === 'Clientes' ? '#fef3c7' : '#f3e8ff'}; color: ${h.tipoImportacion === 'Inventario' ? '#1e40af' : h.tipoImportacion === 'Clientes' ? '#92400e' : '#6b21a8'}; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; display: inline-block;">
                    ${h.tipoImportacion}
                </span>
            </td>
            <td style="padding: 15px; text-align: right; font-weight: 700; color: var(--text-main);">${h.cantidad} registros</td>
            <td style="padding: 15px; color: var(--text-muted); font-size: 0.85rem;" title="${h.archivo}">${h.archivo}</td>
            <td style="padding: 15px; color: var(--text-muted); font-size: 0.85rem;" title="${h.detalles}">${h.detalles}</td>
        </tr>`;
    }).join('');

    return `
    <div class="card glass animate-slide-up">
        <div class="flex-between mb-4">
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 10px;">
                <i data-lucide="file-clock" style="color: var(--primary-color); width: 24px; height: 24px;"></i> Historial de Cargas desde Excel
            </h2>
            <span class="badge" style="background: var(--primary-color); padding: 6px 14px; font-weight: 700;">Total Cargas: ${historial.length}</span>
        </div>
        <div style="overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-color);">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--card-bg); border-bottom: 1px solid var(--border-color);">
                    <tr>
                        <th style="padding: 15px; text-align: left; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">FECHA / HORA</th>
                        <th style="padding: 15px; text-align: left; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">USUARIO</th>
                        <th style="padding: 15px; text-align: left; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">TIPO IMPORTACIÓN</th>
                        <th style="padding: 15px; text-align: right; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">REGISTROS PROCESADOS</th>
                        <th style="padding: 15px; text-align: left; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">ARCHIVO FUENTE</th>
                        <th style="padding: 15px; text-align: left; font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">DETALLES / NOTAS</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted); font-weight: 600;">No se registran importaciones de datos en el historial.</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;
};
