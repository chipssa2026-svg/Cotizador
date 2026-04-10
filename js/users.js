/**
 * Proceso: Gestión de Usuarios
 * Descripción: Permite al Administrador gestionar los accesos, roles y claves del sistema.
 */
window.Views = window.Views || {};

window.Views.users = (d) => {
    const list = (d.usuarios || []).map(u => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:15px; font-weight:700; color:#3b82f6;">${u.Usuario || u.user}</td>
            <td style="padding:15px; font-weight:600;">${u.Nombre || u.name}</td>
            <td style="padding:15px;"><span class="badge" style="background:#e2e8f0; color:#475569; padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:800;">${u.Rol || u.role}</span></td>
            <td style="padding:15px;">••••••••</td>
            <td style="padding:15px; text-align:right;">
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="window.app.editUser('${u.Usuario || u.user}')"><i data-lucide="edit-3" style="width:14px;"></i></button>
                    <button class="btn btn-sm btn-outline" style="border:1px solid #fee2e2; color:#ef4444;" onclick="window.app.deleteUser('${u.Usuario || u.user}')"><i data-lucide="trash-2" style="width:14px;"></i></button>
                </div>
            </td>
        </tr>`).join('');

    return `
    <div class="card glass">
        <div class="flex-between mb-4">
            <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main);">Gestión de Usuarios</h2>
            <button class="btn btn-primary" onclick="window.app.newUser()">
                <i data-lucide="user-plus"></i> Nuevo Usuario
            </button>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:var(--bg-color); border-bottom:1px solid var(--border-color);">
                    <tr>
                        <th style="padding:15px; text-align:left; font-size:0.8rem; color:var(--text-muted);">USUARIO</th>
                        <th style="padding:15px; text-align:left; font-size:0.8rem; color:var(--text-muted);">NOMBRE COMPLETO</th>
                        <th style="padding:15px; text-align:left; font-size:0.8rem; color:var(--text-muted);">ROL ASIGNADO</th>
                        <th style="padding:15px; text-align:left; font-size:0.8rem; color:var(--text-muted);">VENDEDOR</th>
                        <th style="padding:15px; text-align:left; font-size:0.8rem; color:var(--text-muted);">CLAVE</th>
                        <th style="padding:15px; text-align:right; font-size:0.8rem; color:var(--text-muted);">ACCIÓN</th>
                    </tr>
                </thead>
                <tbody>
                    ${(d.usuarios || []).map(u => {
                        const seller = (d.vendedores || []).find(v => String(v.id) === String(u.CodigoVendedor || u.sellerCode));
                        const sellerName = seller ? seller.name : (u.CodigoVendedor || u.sellerCode || '-');
                        return `
                        <tr style="border-bottom:1px solid var(--border-color);">
                            <td style="padding:15px; font-weight:700; color:var(--primary-color);">${u.Usuario || u.user}</td>
                            <td style="padding:15px; font-weight:600; color:var(--text-main);">${u.Nombre || u.name}</td>
                            <td style="padding:15px;"><span class="badge" style="background:var(--border-color); color:var(--text-main); padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:800;">${u.Rol || u.role}</span></td>
                            <td style="padding:15px; font-weight:600; color:var(--text-muted);">${sellerName}</td>
                            <td style="padding:15px; color:var(--text-muted);">••••••••</td>
                            <td style="padding:15px; text-align:right;">
                                <div style="display:flex; gap:8px; justify-content:flex-end;">
                                    <button class="btn btn-secondary btn-sm" onclick="window.app.editUser('${u.Usuario || u.user}')"><i data-lucide="edit-3" style="width:14px;"></i></button>
                                    <button class="btn btn-sm btn-outline text-danger" style="border:1px solid var(--border-color);" onclick="window.app.deleteUser('${u.Usuario || u.user}')"><i data-lucide="trash-2" style="width:14px;"></i></button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Cargando usuarios...</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;
};
