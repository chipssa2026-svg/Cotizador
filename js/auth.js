/**
 * Proceso: Autenticación
 * Descripción: Maneja la vista de inicio de sesión y la seguridad de entrada.
 */
window.Views = window.Views || {};

window.Views.login = () => {
    return `
    <div class="login-screen">
        <div class="card glass animate-slide-up" style="width:100%; max-width:420px; padding:45px; border-radius:32px; background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="text-align:center; margin-bottom:40px;">
                <div style="display:inline-block; padding:15px; background: rgba(34, 197, 94, 0.1); border-radius:20px; margin-bottom:20px;">
                    <img src="Logo.png" alt="Logo" style="max-height: 60px; filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.3));">
                </div>
                <h1 style="color:white; font-family:'Outfit'; font-size:2.2rem; margin:0; letter-spacing:-1px; font-weight:800;">Cotizador<span style="color:#22c55e">PRO</span></h1>
            </div>
            
            <div id="login-error" class="hidden" style="margin-bottom:20px; padding:12px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:12px; color:#fca5a5; font-size:0.85rem; text-align:center; display:flex; align-items:center; gap:8px; justify-content:center;">
                <i data-lucide="alert-circle" style="width:16px;"></i>
                <span>Credenciales incorrectas</span>
            </div>

            <form id="login-form" onsubmit="window.app.handleLogin(event)" style="display:flex; flex-direction:column; gap:24px;">
                <div class="form-group-login">
                    <label style="display:block; color:rgba(255,255,255,0.7); font-size:0.75rem; margin-bottom:10px; letter-spacing:1.5px; font-weight:700; text-transform:uppercase;">Usuario</label>
                    <div style="position:relative;">
                        <i data-lucide="user" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); width:18px; color:rgba(255,255,255,0.4);"></i>
                        <input type="text" id="login-user" required placeholder="Ingrese su usuario" 
                            style="width:100%; padding:16px 16px 16px 48px; border-radius:16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; outline:none; font-size:1rem; transition:all 0.3s;">
                    </div>
                </div>
                
                <div class="form-group-login">
                    <label style="display:block; color:rgba(255,255,255,0.7); font-size:0.75rem; margin-bottom:10px; letter-spacing:1.5px; font-weight:700; text-transform:uppercase;">Contraseña</label>
                    <div style="position:relative;">
                        <i data-lucide="lock" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); width:18px; color:rgba(255,255,255,0.4);"></i>
                        <input type="password" id="login-pass" required placeholder="••••••••" 
                            style="width:100%; padding:16px 16px 16px 48px; border-radius:16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; outline:none; font-size:1rem; transition:all 0.3s;">
                    </div>
                </div>
                
                <div style="margin-top:10px;">
                    <button type="submit" id="login-btn" class="btn btn-primary" 
                        style="width:100%; padding:18px; font-weight:800; font-size:1.1rem; background:#22c55e; border:none; border-radius:16px; color:white; cursor:pointer; box-shadow: 0 10px 25px -5px rgba(34,197,94,0.4); transition:all 0.3s; display:flex; justify-content:center; align-items:center; gap:10px;">
                        <span>INICIAR SESIÓN</span>
                        <i data-lucide="arrow-right" style="width:20px;"></i>
                    </button>
                </div>
            </form>
            
        </div>
    </div>`;
};
