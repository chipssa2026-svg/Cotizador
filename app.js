/**
 * Chips, S.A. - Cotizador PRO (v2.2.0 - Arquitectura por Procesos)
 * Este archivo actúa como el núcleo central (Cerebro) del sistema.
 */

window.app = {
    data: { 
        productos: [], 
        cotizaciones: [], 
        clientes: [], 
        vendedores: [], 
        usuarios: [],
        config: { nextNumber: 859 },
        lastProductImport: null,
        lastCustomerImport: null,
        lastSellerImport: null,
        currentUser: null
    },
    currentView: 'dashboard',
    lastMainView: 'dashboard',

    async init() {
        console.log("📡 App Initializing...");
        this.setupNavigation();
        this.setupTheme();
        
        // Verificamos si hay una sesión activa para decidir qué mostrar
        const session = localStorage.getItem('sessionUser');
        if (session) {
            try {
                this.data.currentUser = JSON.parse(session);
                document.body.classList.remove('login-mode');
                this.render('dashboard');
            } catch (e) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        // Carga de DB en segundo plano (no interfiere con la UI)
        await this.loadDB(); 
        lucide.createIcons();
    },

    showLogin() {
        this.data.currentUser = null;
        document.body.classList.add('login-mode');
        this.render('login');
    },

    async handleLogin(e) {
        e.preventDefault();
        const userVal = document.getElementById('login-user').value.trim();
        const passVal = document.getElementById('login-pass').value;
        const btn = document.getElementById('login-btn');
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>VALIDANDO...</span><i data-lucide="loader-2" class="animate-spin"></i>`;
            lucide.createIcons();
        }

        // Asegurar que tenemos usuarios cargados
        if (!this.data.usuarios || this.data.usuarios.length === 0) {
            await this.loadDB();
        }

        const user = this.data.usuarios.find(u => 
            String(u.Usuario || u.user || '').toLowerCase() === userVal.toLowerCase()
        );

        if (user) {
            const upass = String(user.Clave || user.pass || '');
            if (upass === passVal) {
                // Login Exitoso
                this.data.currentUser = user;
                localStorage.setItem('sessionUser', JSON.stringify(user));
                
                this.notify(`¡Bienvenido, ${user.Nombre || user.name}!`);
                
                setTimeout(() => {
                    document.body.classList.remove('login-mode');
                    this.render('dashboard');
                    lucide.createIcons();
                }, 500);
                return;
            }
        }

        // Error de Login
        this.notify('Credenciales incorrectas', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>INICIAR SESIÓN</span><i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
        }
    },

    // --- Sincronización con Nube (Google Sheets v4.8) ---
    scriptUrl: 'https://script.google.com/macros/s/AKfycbxXFY_LB-P5meioORPhio_15FInEgnvo1aRJtmK0N_M0dBPAfuXeevANvJ2x7wtoTo5TA/exec',

    async loadDB() {
        try {
            console.log("📡 Sincronizando con la nube (Google Script)...");
            
            // Intento 1: Fetch estándar (Más rápido, funciona en servidores)
            const res = await fetch(`${this.scriptUrl}?t=${Date.now()}`);
            if (res.ok) {
                const text = await res.text();
                if (text) await this.processDataResponse(text);
            } else {
                throw new Error("Fetch falló");
            }
        } catch (e) {
            console.warn("⚠️ Fetch bloqueado por CORS o red. Intentando Modo de Compatibilidad (JSONP)...");
            // Intento 2: JSONP (Infalible para archivos locales file://)
            this.loadJSONP();
        }
    },

    loadJSONP() {
        const script = document.createElement('script');
        script.src = `${this.scriptUrl}?callback=window.app.jsonpCallback&t=${Date.now()}`;
        document.body.appendChild(script);
    },

    async jsonpCallback(data) {
        if (!data) return;
        await this.processDataResponse(JSON.stringify(data));
    },

    async processDataResponse(text) {
        try {
            if (!text) return;
            const data = JSON.parse(text);
            if (data) {
                this.normalizeData(data);
                // Solo renderizar si NO estamos en la pantalla de login para evitar parpadeos
                if (this.currentView !== 'login') {
                    this.render(this.currentView);
                }
            }
        } catch(e) { console.error(e); }
    },

    normalizeData(data) {
        const conf = data.config || {};
        const getVal = (obj, words) => {
            const k = Object.keys(obj).find(key => words.some(w => key.toLowerCase().includes(w)));
            return k ? obj[k] : '';
        };

        const parseNum = (v) => {
            if (v === null || v === undefined || v === '') return 0;
            if (typeof v === 'number') return v;
            const s = String(v).replace(/[^0-9.-]/g, '');
            return parseFloat(s) || 0;
        };

        const cleanCode = (code) => {
            let s = String(code || '').trim();
            if (s && !isNaN(s)) return String(Number(s));
            return s;
        };

        // Productos
        this.data.productos = (data.productos || data.products || []).map(p => ({
            code: cleanCode(getVal(p, ['producto', 'code', 'codigo'])),
            description: String(getVal(p, ['descripcion', 'desc', 'nombre']) || '').trim(),
            stock: parseNum(getVal(p, ['existencia', 'stock', 'actual', 'cantidad'])),
            price: parseNum(getVal(p, ['precio', 'price', 'valor', 'monto']))
        }));

        const clean = (obj, words) => cleanCode(getVal(obj, words));

        // Cotizaciones
        this.data.cotizaciones = (data.cotizaciones || data.quotes || []).map(q => {
            const keys = Object.keys(q);
            const get = (words) => {
                const k = keys.find(key => words.some(w => key.toLowerCase().includes(w)));
                return k ? q[k] : null;
            };
            
            // Recuperar detalle (Sistema de Doble Seguridad: Columna or Piggybacking)
            let items = [];
            let notes = get(['notas', 'notes', 'observa']) || '';
            const detailStr = get(['detalle', 'items', 'itemsjson', 'detalle_json']);
            
            if (detailStr && String(detailStr).length > 2) {
                try { 
                    items = typeof detailStr === 'string' ? JSON.parse(detailStr) : detailStr; 
                } catch(e) {}
            } 
            
            // Si la columna Detalle falló, intentamos recuperar del "Plan B" en Notas
            if (items.length === 0) {
                if (notes.includes(" ITEMS:")) {
                    const parts = notes.split(" ITEMS:");
                    notes = parts[0];
                    try { items = JSON.parse(parts[1]); } catch(e) {}
                } else if (notes.includes(" [DETALLE:")) {
                    const parts = notes.split(" [DETALLE:");
                    notes = parts[0];
                    try { items = JSON.parse(parts[1].replace("]", "")); } catch(e) {}
                } else if (notes.includes(" @@")) {
                    const parts = notes.split(" @@");
                    notes = parts[0];
                    try { items = JSON.parse(decodeURIComponent(escape(window.atob(parts[1])))); } catch(e) {}
                }
            }

            return {
                id: q.id || get(['id']) || Date.now() + Math.random(),
                number: String(get(['numero', 'number', 'cotizacion', 'folio']) || '').trim(),
                customerName: String(get(['customer', 'cliente', 'razon']) || 'Cliente Desconocido').trim(),
                rtn: get(['rtn', 'id', 'fiscal']) || '',
                address: get(['direccion', 'address', 'ubicacion']) || '',
                date: get(['date', 'fecha']) || new Date().toISOString(),
                dueDate: get(['due', 'vence', 'vencimiento']) || '',
                total: parseFloat(get(['total', 'monto', 'valor', 'suma'])) || 0,
                seller: get(['seller', 'vendedor', 'vende']) || 'General',
                facturada: String(get(['facturada', 'factura', 'ok'])).toUpperCase() === 'SI',
                notes: notes,
                items: items
            };
        });

        this.data.clientes = (data.clientes || data.customers || []).map(c => {
            return {
                id: clean(c, ['codigo', 'id', 'cliente', 'cod']),
                razonSocial: getVal(c, ['razon', 'social', 'nombre']),
                nombreComercial: getVal(c, ['comercial', 'nombre']),
                rtn: getVal(c, ['rtn', 'id', 'fiscal']),
                address: getVal(c, ['direccion', 'address']),
                phones: getVal(c, ['telefono', 'phone'])
            };
        });

        this.data.vendedores = (data.vendedores || data.sellers || []).map(s => ({
            id: clean(s, ['codigo', 'id', 'cod']),
            name: getVal(s, ['nombre', 'vendedor', 'name'])
        }));

        this.data.usuarios = data.usuarios || data.users || [];
        this.data.config = data.config || { nextNumber: 859 };
        
        this.data.lastProductImport = conf.lastProductImport || data.lastProductImport || null;
        this.data.lastCustomerImport = conf.lastCustomerImport || data.lastCustomerImport || null;
        this.data.lastSellerImport = conf.lastSellerImport || data.lastSellerImport || null;
    },

    async saveDB() {
        const payload = {
            "products": this.data.productos.map(p => ({ "Producto": p.code, "Descripcion": p.description, "ExistenciaActual": p.stock, "PrecioMayorista": p.price })),
            "customers": this.data.clientes.map(c => ({ 
                "Cliente": c.id, 
                "RazonSocial": c.razonSocial, 
                "NombreComercial": c.nombreComercial,
                "RTN": c.rtn, 
                "Direccion": c.address,
                "Telefonos": c.phones
            })),
            "sellers": this.data.vendedores.map(v => ({ "Codigo": v.id, "Nombre": v.name })),
            "quotes": this.data.cotizaciones.map(q => ({
                "ID": q.id, 
                "Numero": q.number, 
                "Cliente": q.customerName, 
                "RTN": q.rtn || "", 
                "Vendedor": q.seller || "", 
                "Fecha": q.date, 
                "Vencimiento": q.dueDate || "", 
                "Total": q.total, 
                "Facturada": q.facturada ? "SI" : "NO", 
                "Notas": q.notes || "",
                "Detalle": JSON.stringify(q.items || []),
                "Direccion": q.address || ""
            })),
            "config": { "nextNumber": this.data.config.nextNumber }
        };

        try {
            fetch(this.scriptUrl, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify(payload)
            });
            console.log("📡 Sincronización realizada.");
        } catch (e) { console.error(e); }
    },





    // --- Importaciones Masivas (Desde Excel con SheetJS) ---
    async importFromExcel(e) { /* Importar Productos */ 
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            this.data.productos = json.map(p => {
                const k = Object.keys(p);
                const get = (words) => {
                    const found = k.find(key => words.some(w => key.toLowerCase().includes(w)));
                    return found ? p[found] : '';
                };
                return {
                    code: String(get(['producto', 'codigo', 'code', 'cod']) || '').trim(),
                    description: String(get(['descripcion', 'desc', 'nombre']) || '').trim(),
                    stock: parseFloat(get(['existencia', 'stock', 'cantidad', 'balance', 'qty'])) || 0,
                    price: parseFloat(get(['precio', 'valor', 'monto', 'price'])) || 0
                };
            });
            this.data.lastProductImport = this.getAppTimestamp();
            this.saveDB(); this.render('inventory');
        };
        reader.readAsArrayBuffer(file);
    },

    async importCustomersFromExcel(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            this.data.clientes = json.map(c => {
                const k = Object.keys(c);
                const get = (words) => {
                    // Prioridad 1: Coincidencia casi-exacta
                    const perfect = k.find(key => {
                        const lowKey = key.toLowerCase();
                        return words.some(w => lowKey === w);
                    });
                    if (perfect) return c[perfect];
                    
                    // Prioridad 2: Contiene la palabra
                    const found = k.find(key => {
                        const lowKey = key.toLowerCase();
                        return words.some(w => lowKey.includes(w));
                    });
                    return found ? c[found] : '';
                };
                
                return {
                    id: String(get(['cliente', 'codigo', 'id', 'no.']) || '').replace(/^0+/, '') || '0',
                    razonSocial: get(['razonsocial', 'razon', 'social', 'nombre']),
                    nombreComercial: get(['nombrecomercial', 'comercial', 'fantasia']),
                    rtn: get(['idtributario', 'rtn', 'fiscal', 'nrc']),
                    address: get(['direccion', 'address', 'ubicacion']),
                    phones: get(['telefonos', 'telefono', 'phone', 'celular'])
                };
            });
            this.data.lastCustomerImport = this.getAppTimestamp();
            this.saveDB(); 
            this.render('customers');
            this.notify('Clientes importados correctamente', 'success');
        };
        reader.readAsArrayBuffer(file);
    },

    async importSellersFromExcel(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            this.data.vendedores = json.map(s => {
                const k = Object.keys(s);
                const get = (words) => {
                    const found = k.find(key => words.some(w => key.toLowerCase().includes(w)));
                    return found ? s[found] : '';
                };
                return {
                    id: String(get(['codigo', 'id', 'cod']) || '').replace(/^0+/, '') || '0',
                    name: get(['nombre', 'vendedor', 'name'])
                };
            });
            this.data.lastSellerImport = this.getAppTimestamp();
            this.saveDB(); this.render('sellers');
        };
        reader.readAsArrayBuffer(file);
    },

    // --- Motor de Renderizado (Orquestador Modular) ---
    render(view, previewData = null, extraData = null) {
        this.currentView = view;
        if (view !== 'preview') this.lastMainView = view;
        const area = document.getElementById('content-area');
        const title = document.getElementById('view-title');
        
        const titles = { 'login': 'Acceso al Sistema', 'dashboard': 'Dashboard', 'inventory': 'Inventario', 'customers': 'Clientes', 'new-quote': 'Nueva Cotización', 'history': 'Historial', 'preview': 'Vista Previa', 'sellers': 'Vendedores', 'users': 'Usuarios' };
        
        // Seguridad: Verificar permiso antes de renderizar
        if (view !== 'login' && view !== 'preview' && !this.hasAccess(view)) {
            this.notify('No tiene permisos para esta sección', 'error');
            return this.render('dashboard');
        }

        if (title) title.innerText = titles[view] || '';

        this.filterMenuByRole();
        this.updateUserInfo();

        let dataForView = extraData;
        if (!dataForView) {
            if (view === 'dashboard') {
                const role = (this.data.currentUser.Rol || this.data.currentUser.role || '').toUpperCase();
                const sellerCode = this.data.currentUser.CodigoVendedor || this.data.currentUser.sellerCode;
                let q = this.data.cotizaciones;
                
                // Si es Vendedor, filtrar solo sus datos
                if (role === 'VENDEDOR') {
                    const sellerObj = this.data.vendedores.find(v => String(v.id) === String(sellerCode));
                    const sellerName = sellerObj ? sellerObj.name : "";
                    q = q.filter(x => x.seller === sellerName);
                }

                dataForView = { 
                    filteredQuotes: q, 
                    recentQuotes: q.slice(0, 10), 
                    productos: this.data.productos, 
                    clientes: this.data.clientes, 
                    vendedores: this.data.vendedores, 
                    usuarios: this.data.usuarios,
                    revenueValue: q.reduce((a, b) => a + (b.total || 0), 0),
                    lastProductImport: this.data.lastProductImport,
                    lastCustomerImport: this.data.lastCustomerImport,
                    lastSellerImport: this.data.lastSellerImport
                };
            }
            else if (view === 'inventory') dataForView = this.data.productos;
            else if (view === 'customers') dataForView = this.data.clientes;
            else if (view === 'sellers') dataForView = this.data.vendedores;
            else if (view === 'users') dataForView = this.data; // Pasamos todo el objeto data
            else if (view === 'new-quote') {
                dataForView = { 
                    productos: this.data.productos, 
                    clientes: this.data.clientes, 
                    vendedores: this.data.vendedores,
                    cotizaciones: this.data.cotizaciones,
                    currentUser: this.data.currentUser
                };
            }
            else if (view === 'history') {
                const role = (this.data.currentUser.Rol || this.data.currentUser.role || '').toUpperCase();
                const sellerCode = this.data.currentUser.CodigoVendedor || this.data.currentUser.sellerCode;
                let q = this.data.cotizaciones;
                
                if (role === 'VENDEDOR') {
                    const sellerObj = this.data.vendedores.find(v => String(v.id) === String(sellerCode));
                    const sellerName = sellerObj ? sellerObj.name : "";
                    q = q.filter(x => x.seller === sellerName);
                }
                dataForView = q;
            }
            else if (view === 'preview') dataForView = previewData;
        }

        if (window.Views && window.Views[view]) {
            area.innerHTML = window.Views[view](dataForView, extraData || '');
            if (view === 'new-quote') {
                this.addQuoteItem();
                // Si es vendedor, forzar su nombre y deshabilitar campo
                const role = (this.data.currentUser.Rol || this.data.currentUser.role || '').toUpperCase();
                if (role === 'VENDEDOR') {
                    const sellerCode = this.data.currentUser.CodigoVendedor || this.data.currentUser.sellerCode;
                    const sellerObj = this.data.vendedores.find(v => String(v.id) === String(sellerCode));
                    if (sellerObj) {
                        const sellerInput = document.getElementById('quote-vendedor');
                        if (sellerInput) {
                            sellerInput.value = sellerObj.name;
                            sellerInput.disabled = true;
                            sellerInput.style.opacity = "0.7";
                        }
                    }
                }
            }
            if (view === 'dashboard') this.initCharts(dataForView.filteredQuotes);
        }

        lucide.createIcons();
        window.scrollTo(0,0);
    },

    // --- LÓGICA DE PROCESOS (ACCIONES) ---

    newUser() {
        console.log("🆕 Abriendo formulario de Nuevo Usuario...");
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:white; padding:30px; border-radius:24px; width:450px;">
                <h3 class="mb-4">Nuevo Registro de Usuario</h3>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div><label>Usuario (ID)</label><input type="text" id="m-user" placeholder="ejm: marvin.m" style="width:100%;"></div>
                    <div><label>Nombre Completo</label><input type="text" id="m-name" placeholder="Nombre completo" style="width:100%;"></div>
                    <div><label>Rol del Sistema</label>
                        <select id="m-role" style="width:100%;">
                            <option value="Administrador">Administrador</option>
                            <option value="Gerencia">Gerencia</option>
                            <option value="Asistente de Gerencia">Asistente de Gerencia</option>
                            <option value="Vendedor">Vendedor</option>
                            <option value="Facturacion">Facturación</option>
                        </select>
                    </div>
                    <div id="seller-field" style="display:none;">
                        <label>Vincular con Vendedor (Nube)</label>
                        <select id="m-seller-code" style="width:100%;">
                            <option value="">-- Seleccione un vendedor --</option>
                            ${this.data.vendedores.map(v => `<option value="${v.id}">${v.id} - ${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label>Contraseña</label><input type="password" id="m-pass" placeholder="••••••••" style="width:100%;"></div>
                </div>
                <div class="flex-end mt-6" style="gap:10px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.app.saveUser()">Guardar Usuario</button>
                </div>
            </div>
        `;
        // Listener dinámico para el rol
        const roleSel = document.getElementById('m-role');
        const selField = document.getElementById('seller-field');
        roleSel.addEventListener('change', (e) => {
            selField.style.display = e.target.value === 'Vendedor' ? 'block' : 'none';
        });
        // Disparar chequeo inicial
        selField.style.display = roleSel.value === 'Vendedor' ? 'block' : 'none';

        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    saveUser() {
        const u = {
            Usuario: document.getElementById('m-user').value.trim(),
            Nombre: document.getElementById('m-name').value.trim(),
            Rol: document.getElementById('m-role').value,
            Clave: document.getElementById('m-pass').value,
            CodigoVendedor: document.getElementById('m-role').value === 'Vendedor' ? document.getElementById('m-seller-code').value : ""
        };
        if(!u.Usuario || !u.Nombre || !u.Clave) return this.notify('Faltan campos', 'error');
        this.data.usuarios.unshift(u);
        document.getElementById('modal-container').classList.add('hidden');
        this.render('users');
        this.saveDB();
        this.notify('¡Usuario creado con éxito!');
    },

    editUser(id) {
        console.log("✍️ Intentando editar usuario:", id);
        const searchId = String(id || '').trim().toLowerCase();
        const u = this.data.usuarios.find(x => 
            String(x.Usuario || x.user || '').trim().toLowerCase() === searchId
        );
        
        if(!u) {
            console.warn("⚠️ Usuario no encontrado en memoria:", id);
            return;
        }

        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:white; padding:30px; border-radius:24px; width:450px;">
                <h3 class="mb-4">Modificar Usuario</h3>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div><label>Usuario (ID)</label><input type="text" id="m-user" value="${u.Usuario || u.user}" disabled style="width:100%; background:#f1f5f9;"></div>
                    <div><label>Nombre Completo</label><input type="text" id="m-name" value="${u.Nombre || u.name}" style="width:100%;"></div>
                    <div><label>Rol del Sistema</label>
                        <select id="m-role" style="width:100%;">
                            <option value="Administrador" ${u.Rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
                            <option value="Gerencia" ${u.Rol === 'Gerencia' ? 'selected' : ''}>Gerencia</option>
                            <option value="Asistente de Gerencia" ${u.Rol === 'Asistente de Gerencia' ? 'selected' : ''}>Asistente de Gerencia</option>
                            <option value="Vendedor" ${u.Rol === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
                            <option value="Facturacion" ${u.Rol === 'Facturacion' ? 'selected' : ''}>Facturación</option>
                        </select>
                    </div>
                    <div id="seller-field" style="display:${u.Rol === 'Vendedor' ? 'block' : 'none'};">
                        <label>Vincular con Vendedor (Nube)</label>
                        <select id="m-seller-code" style="width:100%;">
                            <option value="">-- Seleccione un vendedor --</option>
                            ${this.data.vendedores.map(v => `<option value="${v.id}" ${(u.CodigoVendedor || u.sellerCode) === v.id ? 'selected' : ''}>${v.id} - ${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label>Contraseña</label><input type="password" id="m-pass" value="${u.Clave || u.pass}" style="width:100%;"></div>
                </div>
                <div class="flex-end mt-6" style="gap:10px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.app.updateUser()">Actualizar Datos</button>
                </div>
            </div>
        `;
        const roleSel = document.getElementById('m-role');
        const selField = document.getElementById('seller-field');
        roleSel.addEventListener('change', (e) => {
            selField.style.display = e.target.value === 'Vendedor' ? 'block' : 'none';
        });
        // Disparar chequeo inicial
        selField.style.display = roleSel.value === 'Vendedor' ? 'block' : 'none';

        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    updateUser() {
        const userId = document.getElementById('m-user').value;
        const u = this.data.usuarios.find(x => (x.Usuario || x.user) === userId);
        if(u) {
            u.Nombre = document.getElementById('m-name').value.trim();
            u.Rol = document.getElementById('m-role').value;
            u.Clave = document.getElementById('m-pass').value;
            u.CodigoVendedor = u.Rol === 'Vendedor' ? document.getElementById('m-seller-code').value : "";
            this.notify('¡Datos actualizados!');
            document.getElementById('modal-container').classList.add('hidden');
            this.render('users');
            this.saveDB();
        }
    },

    deleteUser(id) {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:white; padding:35px; border-radius:24px; width:400px; text-align:center;">
                <div style="width:60px; height:60px; background:#fee2e2; color:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <i data-lucide="alert-triangle" style="width:30px; height:30px;"></i>
                </div>
                <h3 style="margin-bottom:10px;">¿Eliminar Acceso?</h3>
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:25px;">Esta acción no se puede deshacer. El usuario <b>${id}</b> perderá el acceso al sistema de forma permanente.</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">No, Cancelar</button>
                    <button class="btn btn-primary" style="background:#ef4444; border:none;" onclick="window.app.confirmDeleteUser('${id}')">Sí, Eliminar</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    confirmDeleteUser(id) {
        this.data.usuarios = this.data.usuarios.filter(u => (u.Usuario || u.user) !== id);
        document.getElementById('modal-container').classList.add('hidden');
        this.render('users');
        this.saveDB();
        this.notify('Acceso revocado correctamente');
    },

    hasAccess(view) {
        if (!this.data.currentUser) return false;
        const role = (this.data.currentUser.Rol || this.data.currentUser.role || '').toUpperCase();
        const perms = {
            'ADMINISTRADOR': ['dashboard', 'inventory', 'customers', 'sellers', 'new-quote', 'history', 'users'],
            'GERENCIA': ['dashboard', 'inventory', 'customers', 'sellers', 'new-quote', 'history'],
            'ASISTENTE DE GERENCIA': ['dashboard', 'inventory', 'customers', 'sellers', 'new-quote', 'history'],
            'VENDEDOR': ['dashboard', 'inventory', 'customers', 'new-quote', 'history'],
            'FACTURACION': ['dashboard', 'history']
        };
        const allowed = perms[role] || ['dashboard'];
        return allowed.includes(view);
    },

    filterMenuByRole() {
        document.querySelectorAll('.nav-item').forEach(item => {
            const v = item.dataset.view;
            item.style.display = this.hasAccess(v) ? 'flex' : 'none';
        });
    },

    updateUserInfo() {
        if (!this.data.currentUser) return;
        const u = this.data.currentUser;
        document.getElementById('u-name').innerText = u.Nombre || u.name;
        document.getElementById('u-role').innerText = u.Rol || u.role;
        document.getElementById('u-avatar').innerText = (u.Nombre || u.name).charAt(0).toUpperCase();
    },

    openProfileModal() {
        if (!this.data.currentUser) return;
        const u = this.data.currentUser;
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:35px; border-radius:24px; width:400px; text-align:center; border: 1px solid var(--border-color);">
                <div style="width:70px; height:70px; background:var(--primary-color); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; margin:0 auto 20px; font-size:2rem; font-weight:800; box-shadow:var(--shadow-md);">
                    ${(u.Nombre || u.name).charAt(0).toUpperCase()}
                </div>
                <h3 style="margin-bottom:5px; color:var(--text-main);">${u.Nombre || u.name}</h3>
                <p style="color:var(--text-muted); font-weight:600; font-size:0.85rem; margin-bottom:25px;">Rol: ${u.Rol || u.role}</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn btn-secondary" style="width:100%; display:flex; justify-content:center; align-items:center;" onclick="window.app.promptPasswordChange()">
                        <i data-lucide="key" style="margin-right:8px; width:16px;"></i> Cambiar Contraseña
                    </button>
                    <button class="btn btn-outline" style="width:100%; border-color:var(--border-color); color:#ef4444; display:flex; justify-content:center; align-items:center;" onclick="window.app.logout()">
                        <i data-lucide="log-out" style="margin-right:8px; width:16px;"></i> Cerrar Sesión
                    </button>
                    <button class="btn btn-primary" style="margin-top:10px; width:100%; display:flex; justify-content:center; align-items:center;" onclick="document.getElementById('modal-container').classList.add('hidden')">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    promptPasswordChange() {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:35px; border-radius:24px; width:400px; text-align:center; border: 1px solid var(--border-color);">
                <div style="width:60px; height:60px; background:var(--bg-color); color:var(--primary-color); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <i data-lucide="shield-check" style="width:30px; height:30px;"></i>
                </div>
                <h3 style="margin-bottom:20px; color:var(--text-main);">Seguridad de Cuenta</h3>
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                    <input type="password" id="old-p-input" placeholder="Contraseña Actual" class="btn btn-secondary" style="width:100%; text-align:center; cursor:text;">
                    <input type="password" id="new-p-input" placeholder="Nueva Contraseña" class="btn btn-secondary" style="width:100%; text-align:center; cursor:text;">
                </div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.app.executePasswordChange()">Guardar</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    executePasswordChange() {
        const oldPass = document.getElementById('old-p-input').value;
        const newPass = document.getElementById('new-p-input').value;
        const currentPass = this.data.currentUser.Clave || this.data.currentUser.pass;

        if (oldPass !== currentPass) {
            return this.notify('La contraseña actual no es correcta', 'error');
        }

        if (newPass.length < 4) {
            return this.notify('La nueva clave es muy corta', 'error');
        }

        if (newPass) {
            this.data.currentUser.Clave = newPass;
            this.saveDB();
            this.notify('¡Contraseña actualizada correctamente!');
            document.getElementById('modal-container').classList.add('hidden');
        }
    },

    logout() {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:35px; border-radius:24px; width:400px; text-align:center; border: 1px solid var(--border-color);">
                <div style="width:60px; height:60px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <i data-lucide="power" style="width:30px; height:30px;"></i>
                </div>
                <h3 style="margin-bottom:10px; color:var(--text-main);">¿Cerrar Sesión?</h3>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:25px;">¿Estás seguro que deseas salir del sistema CotizadorPRO ahora?</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">No, volver</button>
                    <button class="btn btn-primary" style="background:#ef4444; border:none;" onclick="localStorage.removeItem('sessionUser'); location.reload();">Sí, cerrar sesión</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    async importFromExcel(e) { 
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
            this.data.productos = json.map(p => {
                const k = Object.keys(p);
                const get = (words) => {
                    const found = k.find(key => words.some(w => key.toLowerCase().includes(w)));
                    return found ? p[found] : '';
                };
                return {
                    code: this.cleanCode(get(['producto', 'codigo', 'code', 'cod'])),
                    description: String(get(['descripcion', 'desc', 'nombre']) || '').trim(),
                    stock: this.parseNum(get(['existencia', 'stock', 'cantidad'])),
                    price: this.parseNum(get(['precio', 'valor', 'price']))
                };
            });
            this.data.lastProductImport = this.getAppTimestamp();
            this.saveDB(); this.render('inventory');
        };
        reader.readAsArrayBuffer(file);
    },

    cleanCode(code) {
        let s = String(code || '').trim();
        if (s && !isNaN(s)) return String(Number(s));
        return s;
    },
    parseNum(v) {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/[^0-9.-]/g, '');
        return parseFloat(s) || 0;
    },

    // --- UTILIDADES ---
    getLocalDate(date = new Date()) { return date.toISOString().split('T')[0]; },
    getAppTimestamp() { 
        const d = new Date();
        const date = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        return `${date} ${time}`;
    },
    formatDisplayDate(d) { if(!d) return ''; const p = d.split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; },
    formatFullDate(val) {
        if (!val) return 'Sin fecha';
        if (typeof val === 'string' && val.includes('T')) {
            const d = new Date(val);
            if (isNaN(d.getTime())) return val;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${h}:${m}`;
        }
        return val;
    },
    parseDate(s) { return s ? new Date(s.split('T')[0]).getTime() : 0; },
    getStatus(q) { 
        if (q.facturada) return { label: 'Facturada', color: '#3b82f6' };
        if (!q.dueDate) return { label: 'Activa', color: '#22c55e' };
        
        const now = new Date();
        now.setHours(0,0,0,0);
        const due = new Date(q.dueDate + 'T23:59:59');
        
        if (due < now) return { label: 'Vencida', color: '#ef4444' };
        
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) return { label: 'Por vencer', color: '#f59e0b' };
        
        return { label: 'Activa', color: '#22c55e' }; 
    },
    notify(msg, type = 'success') {
        const c = document.getElementById('notification-container');
        if(!c) return;
        const t = document.createElement('div'); t.className = `toast ${type} show`; t.innerText = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 3000);
    },
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
            const v = btn.dataset.view;
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); this.render(v);
        }));

        const themeBtn = document.querySelector('.theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    },

    setupTheme() {
        const saved = localStorage.getItem('appTheme') || 'light';
        document.body.setAttribute('data-theme', saved);
        this.updateThemeUI(saved);
    },

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('appTheme', next);
        this.updateThemeUI(next);
    },

    updateThemeUI(theme) {
        const icon = document.getElementById('theme-icon');
        const text = document.querySelector('.theme-toggle span');
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        }
        if (text) {
            text.innerText = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
        }
        lucide.createIcons();
    },
    onCustomerSelect(el) {
        const val = el.value;
        if (!val) return;
        const parts = val.split('|').map(s => s.trim());
        if (parts.length >= 2) {
            const id = parts[0];
            const customer = this.data.clientes.find(c => String(c.id) === id);
            if (customer) {
                // Rellenar campos individuales
                document.getElementById('quote-customer').value = customer.razonSocial;
                document.getElementById('quote-rtn').value = customer.rtn || '';
                document.getElementById('quote-address').value = customer.address || '';
            }
        }
    },
    onProductSelect(i) {
        const p = this.data.productos.find(x => String(x.code) === i.value.split(' - ')[0]);
        if(p) { 
            const tr = i.closest('tr');
            tr.querySelector('.price-input').value = p.price; 
            this.calculateTotals(); 
        }
    },
    addQuoteItem(itemData = null) {
        const body = document.getElementById('quote-items-body');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" list="products-datalist" class="prod-input" value="${itemData ? (itemData.code + ' - ' + itemData.description) : ''}" placeholder="Producto..." onchange="app.onProductSelect(this)"></td>
            <td><input type="number" class="qty-input" value="${itemData ? itemData.qty : 1}" min="1" oninput="app.calculateTotals()"></td>
            <td><input type="number" class="price-input" value="${itemData ? itemData.price : 0}" step="0.01" oninput="app.calculateTotals()"></td>
            <td class="text-right row-total" style="padding-right:1.5rem;">L. 0.00</td>
            <td><button class="btn-icon text-error-color" onclick="this.closest('tr').remove(); app.calculateTotals();"><i data-lucide="trash-2" style="width:16px;"></i></button></td>
        `;
        body.appendChild(tr); lucide.createIcons();
    },
    calculateTotals() {
        let subtotal = 0;
        document.querySelectorAll('#quote-items-body tr').forEach(tr => {
            const qty = this.parseNum(tr.querySelector('.qty-input').value);
            const price = this.parseNum(tr.querySelector('.price-input').value);
            const total = qty * price; subtotal += total;
            tr.querySelector('.row-total').innerText = "L. " + total.toLocaleString('en-US', { minimumFractionDigits: 2 });
        });
        const isv = subtotal * 0.15;
        document.getElementById('sub-total').innerText = "L. " + subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('isv-total').innerText = "L. " + isv.toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('total-val').innerText = "L. " + (subtotal + isv).toLocaleString('en-US', { minimumFractionDigits: 2 });
    },
    initCharts(quotes) {
        const ctxMonth = document.getElementById('quotesMonthChart');
        const ctxStatus = document.getElementById('statusChart');
        if (!ctxMonth || !ctxStatus) return;
        if (window.myChart1) window.myChart1.destroy();
        if (window.myChart2) window.myChart2.destroy();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyCount = new Array(12).fill(0);
        const monthlyValue = new Array(12).fill(0);
        quotes.forEach(q => {
            const m = new Date(this.parseDate(q.date)).getMonth();
            if (m >= 0) {
                monthlyCount[m]++;
                monthlyValue[m] += (q.total || 0);
            }
        });
        window.myChart1 = new Chart(ctxMonth, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Cant. Cotizaciones', data: monthlyCount, backgroundColor: 'rgba(59, 130, 246, 0.5)', yAxisID: 'y' },
                    { label: 'Valor Total (L.)', data: monthlyValue, type: 'line', borderColor: '#22c55e', tension: 0.4, fill: false, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Cantidad' } },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Valor (L.)' } }
                }
            }
        });
        const statusData = { 'Activa': 0, 'Facturada': 0, 'Vencida': 0, 'Por vencer': 0 };
        quotes.forEach(q => { const s = this.getStatus(q).label; if(statusData.hasOwnProperty(s)) statusData[s] += (q.total || 0); });

        window.myChart2 = new Chart(ctxStatus, {
            type: 'doughnut',
            data: { 
                labels: Object.keys(statusData), 
                datasets: [{ 
                    data: Object.values(statusData), 
                    backgroundColor: ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b'] 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    },

    toggleFacturado(id) {
        const q = this.data.cotizaciones.find(x => String(x.id) === String(id));
        if (q) {
            q.facturada = !q.facturada;
            this.saveDB();
            this.render(this.currentView);
            this.notify(`Cotización #${q.number} marcada como ${q.facturada ? 'Facturada' : 'Pendiente'}`);
        }
    },

    saveFinalQuote() {
        const customer = document.getElementById('quote-customer').value;
        const rtn = document.getElementById('quote-rtn').value;
        const address = document.getElementById('quote-address').value;
        const seller = document.getElementById('quote-vendedor').value;
        const dueDate = document.getElementById('quote-due-date').value;
        const notes = document.getElementById('quote-notes').value;

        if (!customer) return this.notify('Seleccione un cliente', 'error');

        const items = [];
        document.querySelectorAll('#quote-items-body tr').forEach(tr => {
            const prod = tr.querySelector('.prod-input').value;
            const qty = this.parseNum(tr.querySelector('.qty-input').value);
            const price = this.parseNum(tr.querySelector('.price-input').value);
            if (prod && qty > 0) {
                items.push({
                    code: prod.split(' - ')[0],
                    description: prod.split(' - ').slice(1).join(' - '),
                    qty,
                    price,
                    total: qty * price
                });
            }
        });

        if (items.length === 0) return this.notify('Agregue al menos un producto', 'error');

        const subtotal = items.reduce((a, b) => a + b.total, 0);
        const total = subtotal * 1.15;

        const q = {
            id: Date.now(),
            number: String(this.data.config.nextNumber++),
            customerName: customer,
            rtn,
            address,
            seller,
            date: this.getLocalDate(),
            dueDate,
            items,
            total,
            notes,
            facturada: false
        };

        this.data.cotizaciones.unshift(q);
        this.saveDB();
        this.render('preview', q);
        this.notify(`Cotización #${q.number} guardada correctamente`);
    },

    previewQuote(id) {
        const q = this.data.cotizaciones.find(x => String(x.id) === String(id));
        if (q) this.render('preview', q);
    },

    showRecallQuoteModal() {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--bg-card); padding:35px; border-radius:30px; width:500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: var(--text-main);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0; color:var(--text-main);">Llamar Cotización</h3>
                    <button class="btn-icon" style="color:var(--text-main);" onclick="document.getElementById('modal-container').classList.add('hidden')"><i data-lucide="x"></i></button>
                </div>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:25px;">Busque por número o cliente para importar los datos a esta nueva cotización.</p>
                <div class="mb-4">
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-main);">Buscar en Historial</label>
                    <input type="text" id="recall-search" list="quotes-datalist" placeholder="Ej: 877 o Nombre del cliente..." style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); font-size:1rem;">
                </div>
                <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:30px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.loadQuoteToForm()" style="padding:0 25px;">Cargar Información</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        lucide.createIcons();
        document.getElementById('recall-search').focus();
    },

    loadQuoteToForm() {
        const val = document.getElementById('recall-search').value.trim();
        if (!val) return;
        
        let quote = null;
        if (val.includes('|')) {
            const num = val.split('|')[0].trim();
            quote = this.data.cotizaciones.find(q => String(q.number) === num);
        } else {
            // Búsqueda inteligente: número exacto o parcial en nombre/RTN
            const search = val.toLowerCase();
            quote = this.data.cotizaciones.find(q => 
                String(q.number) === val || 
                (q.customerName || '').toLowerCase().includes(search) ||
                (q.rtn || '').toLowerCase().includes(search)
            );
        }
        
        if (!quote) return this.notify('Cotización no encontrada', 'error');

        document.getElementById('modal-container').classList.add('hidden');

        // Poblar encabezado
        document.getElementById('quote-customer').value = quote.customerName || '';
        document.getElementById('quote-rtn').value = quote.rtn || '';
        document.getElementById('quote-address').value = quote.address || '';
        document.getElementById('quote-notes').value = quote.notes || '';
        
        // El vendedor solo se puebla si no está deshabilitado (rol Vendedor)
        const vInput = document.getElementById('quote-vendedor');
        if (vInput && !vInput.disabled) vInput.value = quote.seller || '';

        // Limpiar y cargar items
        const body = document.getElementById('quote-items-body');
        body.innerHTML = '';

        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => this.addQuoteItem(item));
        } else {
            this.addQuoteItem();
        }

        this.calculateTotals();
        this.notify('Datos importados correctamente');
    }
};
