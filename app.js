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
    lastCurrency: 'LPS', // Rastro para conversiones instantáneas
    searchTimeout: null,

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
    scriptUrl: 'https://script.google.com/macros/s/AKfycbwSlP8zTNoaQYBP6U182q9rw3mi03YpmDjjDZgKe8cw4zJ-WI6zk2Ck2CambCJntmH-ug/exec',

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
        } catch (e) { console.error(e); }
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
                const k = keys.find(key => words.some(w => key.toLowerCase().includes(w.toLowerCase())));
                return k ? q[k] : '';
            };

            // Recuperar detalle (Sistema de Doble Seguridad: Columna or Piggybacking)
            let items = [];
            let notes = get(['notas', 'notes', 'observa']) || '';
            const detailStr = get(['detalle', 'items', 'itemsjson', 'detalle_json']);

            if (detailStr && String(detailStr).length > 2) {
                try {
                    items = typeof detailStr === 'string' ? JSON.parse(detailStr) : detailStr;
                } catch (e) { }
            }

            // Si la columna Detalle falló, intentamos recuperar del "Plan B" en Notas
            if (items.length === 0) {
                if (notes.includes(" ITEMS:")) {
                    const parts = notes.split(" ITEMS:");
                    notes = parts[0];
                    try { items = JSON.parse(parts[1]); } catch (e) { }
                } else if (notes.includes(" [DETALLE:")) {
                    const parts = notes.split(" [DETALLE:");
                    notes = parts[0];
                    try { items = JSON.parse(parts[1].replace("]", "")); } catch (e) { }
                } else if (notes.includes(" @@")) {
                    const parts = notes.split(" @@");
                    notes = parts[0];
                    try { items = JSON.parse(decodeURIComponent(escape(window.atob(parts[1])))); } catch (e) { }
                }
            }

            return {
                id: q.id || get(['id']) || Date.now() + Math.random(),
                number: String(get(['numero', 'number', 'cotizacion', 'folio']) || '').trim(),
                customerName: String(get(['Cliente', 'cliente', 'customer', 'razon']) || 'Cliente Desconocido').trim(),
                customerCode: get(['IdCliente', 'id_cliente', 'CodigoCliente', 'codigocliente']) || '',
                rtn: this.formatRTN(get(['RTN', 'rtn', 'fiscal', 'id_fiscal'])),
                address: get(['Direccion', 'direccion', 'address', 'ubicacion']) || '',
                phones: get(['Telefono', 'telefono', 'phone', 'telefonos', 'celular']) || '',
                date: get(['date', 'fecha']) || new Date().toISOString(),
                dueDate: get(['due', 'vence', 'vencimiento']) || '',
                total: parseFloat(get(['total', 'monto', 'valor', 'suma'])) || 0,
                seller: get(['seller', 'vendedor', 'vende']) || 'General',
                facturada: String(get(['facturada', 'factura', 'ok'])).toUpperCase() === 'SI',
                anulada: String(get(['Anulada', 'anulada'])).toUpperCase() === 'SI',
                anuladaMotivo: get(['AnuladaMotivo', 'anulada_motivo', 'motivo_anula']) || '',
                anuladaPor: get(['AnuladaPor', 'anulada_por', 'usuario_anula']) || '',
                anuladaFecha: get(['AnuladaFecha', 'anulada_fecha', 'fecha_anula']) || '',
                paymentCondition: get(['condicion', 'pago', 'payment']) || 'Contado',
                plazo: parseInt(get(['plazo', 'dias', 'days'])) || 0,
                email: get(['correo', 'email', 'email_cliente']) || '',
                currency: get(['moneda', 'currency']) || 'LPS',
                exchangeRate: parseFloat(get(['tasa', 'rate', 'cambio'])) || 1,
                tipo: get(['tipo', 'type']) || 'Nacional',
                subtotal: parseFloat(get(['subtotal', 'sub'])) || 0,
                isv: parseFloat(get(['isv', 'impuesto'])) || 0,
                notes: notes,
                items: items
            };
        });

        this.data.clientes = (data.clientes || data.customers || []).map(c => {
            return {
                id: clean(c, ['Cliente', 'cliente', 'Codigo', 'codigo']), // Prioridad absoluta al campo cliente de tu hoja
                razonSocial: getVal(c, ['razon', 'social', 'nombre']),
                nombreComercial: getVal(c, ['comercial', 'nombre']),
                rtn: this.formatRTN(getVal(c, ['RTN', 'rtn', 'fiscal', 'id_fiscal', 'RTN_CLIENTE'])),
                address: getVal(c, ['direccion', 'address']),
                phones: getVal(c, ['telefono', 'phone']),
                email: getVal(c, ['correo', 'email', 'mail'])
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

    async saveDB(tableKey = null) {
        const payload = {};

        // Si specificKey es nulo, enviamos todo (legacy). Si no, solo la tabla necesaria.
        if (tableKey === 'products' || !tableKey) {
            payload.products = this.data.productos.map(p => ({ "Producto": p.code, "Descripcion": p.description, "ExistenciaActual": p.stock, "PrecioMayorista": p.price }));
        }

        if (tableKey === 'customers' || !tableKey) {
            payload.customers = this.data.clientes.map(c => ({
                "Cliente": c.id,
                "RazonSocial": c.razonSocial,
                "NombreComercial": c.nombreComercial,
                "RTN": c.rtn,
                "Direccion": c.address,
                "Telefonos": c.phones,
                "Correo": c.email || ""
            }));
        }

        if (tableKey === 'sellers' || !tableKey) {
            payload.sellers = this.data.vendedores.map(v => ({ "Codigo": v.id, "Nombre": v.name }));
        }

        if (tableKey === 'quotes' || !tableKey) {
            payload.quotes = this.data.cotizaciones.map(q => ({
                "ID": q.id,
                "Numero": q.number,
                "Cliente": q.customerName,
                "CodigoCliente": q.customerCode || "",
                "RTN": q.rtn || "",
                "Vendedor": q.seller || "",
                "Fecha": q.date,
                "Vencimiento": q.dueDate || "",
                "Total": q.total,
                "Subtotal": q.subtotal || 0,
                "ISV": q.isv || 0,
                "Anulada": q.anulada ? "SI" : "NO",
                "AnuladaMotivo": q.anuladaMotivo || "",
                "AnuladaPor": q.anuladaPor || "",
                "AnuladaFecha": q.anuladaFecha || "",
                "Condicion": q.paymentCondition || "Contado",
                "Plazo": q.plazo || 0,
                "Notas": q.notes || "",
                "Detalle": JSON.stringify(q.items || []),
                "Direccion": q.address || "",
                "Telefono": q.phones || "",
                "Correo": q.email || "",
                "Moneda": q.currency || "LPS",
                "TasaCambio": q.exchangeRate || 1,
                "Tipo": q.tipo || "Nacional"
            }));
        }

        // Configuración y otros siempre se envían para mantener consistencia
        payload.users = this.data.usuarios.map(u => ({
            "Usuario": u.Usuario || u.user,
            "Clave": u.Clave || u.pass,
            "Nombre": u.Nombre || u.name,
            "Rol": u.Rol || u.role,
            "CodigoVendedor": u.CodigoVendedor || u.sellerCode || ""
        }));

        payload.config = {
            "nextNumber": this.data.config.nextNumber,
            "lastProductImport": this.data.lastProductImport,
            "lastCustomerImport": this.data.lastCustomerImport,
            "lastSellerImport": this.data.lastSellerImport
        };

        try {
            return fetch(this.scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error enviando a DB:', error);
            this.notify('Error al sincronizar con la nube', 'error');
        }
    },





    // --- Importaciones Masivas (Desde Excel con SheetJS) ---
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

    async importCustomersFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
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
                    rtn: this.formatRTN(get(['idtributario', 'rtn', 'fiscal', 'nrc'])),
                    address: get(['direccion', 'address', 'ubicacion']),
                    phones: get(['telefonos', 'telefono', 'phone', 'celular']),
                    email: get(['correo', 'email', 'mail'])
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
                    revenueLPS: q.filter(x => x.currency === 'LPS').reduce((a, b) => a + (b.total || 0), 0),
                    revenueUSD: q.filter(x => x.currency === 'USD').reduce((a, b) => a + (b.total || 0), 0),
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
            else if (view === 'preview') { dataForView = previewData; this.currentPreviewQuote = previewData; }
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
        window.scrollTo(0, 0);
    },

    // --- LÓGICA DE PROCESOS (ACCIONES) ---

    newUser() {
        console.log("🆕 Abriendo formulario de Nuevo Usuario...");
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:30px; border-radius:24px; width:450px; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <h3 class="mb-4" style="color:var(--text-main);">Nuevo Registro de Usuario</h3>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Usuario (ID)</label><input type="text" id="m-user" placeholder="ejm: marvin.m" style="width:100%;"></div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Nombre Completo</label><input type="text" id="m-name" placeholder="Nombre completo" style="width:100%;"></div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Rol del Sistema</label>
                        <select id="m-role" style="width:100%;">
                            <option value="Administrador">Administrador</option>
                            <option value="Gerencia">Gerencia</option>
                            <option value="Asistente de Gerencia">Asistente de Gerencia</option>
                            <option value="Vendedor">Vendedor</option>
                            <option value="Facturacion">Facturación</option>
                        </select>
                    </div>
                        <div id="seller-field" style="display:none;">
                        <label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Vincular con Vendedor (Nube)</label>
                        <select id="m-seller-code" style="width:100%;">
                            <option value="">-- Seleccione un vendedor --</option>
                            ${this.data.vendedores.map(v => `<option value="${v.id}">${v.id} - ${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Contraseña</label><input type="password" id="m-pass" placeholder="••••••••" style="width:100%;"></div>
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
        if (!u.Usuario || !u.Nombre || !u.Clave) return this.notify('Faltan campos', 'error');
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

        if (!u) {
            console.warn("⚠️ Usuario no encontrado en memoria:", id);
            return;
        }

        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:30px; border-radius:24px; width:450px; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <h3 class="mb-4" style="color:var(--text-main);">Modificar Usuario</h3>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Usuario (ID)</label><input type="text" id="m-user" value="${u.Usuario || u.user}" disabled style="width:100%; background:var(--bg-color); color:var(--text-muted);"></div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Nombre Completo</label><input type="text" id="m-name" value="${u.Nombre || u.name}" style="width:100%;"></div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Rol del Sistema</label>
                        <select id="m-role" style="width:100%;">
                            <option value="Administrador" ${u.Rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
                            <option value="Gerencia" ${u.Rol === 'Gerencia' ? 'selected' : ''}>Gerencia</option>
                            <option value="Asistente de Gerencia" ${u.Rol === 'Asistente de Gerencia' ? 'selected' : ''}>Asistente de Gerencia</option>
                            <option value="Vendedor" ${u.Rol === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
                            <option value="Facturacion" ${u.Rol === 'Facturacion' ? 'selected' : ''}>Facturación</option>
                        </select>
                    </div>
                    <div id="seller-field" style="display:${u.Rol === 'Vendedor' ? 'block' : 'none'};">
                        <label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Vincular con Vendedor (Nube)</label>
                        <select id="m-seller-code" style="width:100%;">
                            <option value="">-- Seleccione un vendedor --</option>
                            ${this.data.vendedores.map(v => `<option value="${v.id}" ${(u.CodigoVendedor || u.sellerCode) === v.id ? 'selected' : ''}>${v.id} - ${v.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:block; margin-bottom:5px;">Contraseña</label><input type="password" id="m-pass" value="${u.Clave || u.pass}" style="width:100%;"></div>
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
        if (u) {
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
            <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:35px; border-radius:24px; width:400px; text-align:center; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
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
                    <button class="btn btn-outline" style="width:100%; border: 1px solid var(--border-color); color:#ef4444; display:flex; justify-content:center; align-items:center;" onclick="window.app.logout()">
                        <i data-lucide="log-out" style="margin-right:8px; width:16px;"></i> Cerrar Sesión
                    </button>
                    <button class="btn btn-primary" style="margin-top:10px; width:100%; display:flex; justify-content:center; align-items:center;" onclick="document.getElementById('modal-container').classList.add('hidden')">
                        Cerrar
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
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px; text-align:left;">
                    <div>
                        <label style="color:var(--text-muted); font-size:0.8rem; font-weight:600; display:block; margin-bottom:5px;">Contraseña Actual</label>
                        <input type="password" id="old-p-input" placeholder="••••••••" style="width:100%;">
                    </div>
                    <div>
                        <label style="color:var(--text-muted); font-size:0.8rem; font-weight:600; display:block; margin-bottom:5px;">Nueva Contraseña</label>
                        <input type="password" id="new-p-input" placeholder="Min. 4 caracteres" style="width:100%;">
                    </div>
                </div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-secondary" onclick="window.app.openProfileModal()">Volver</button>
                    <button class="btn btn-primary" onclick="window.app.executePasswordChange()">Guardar Cambios</button>
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
    formatRTN(val) {
        if (!val) return 'C/F';
        let s = String(val).trim().toUpperCase();
        if (s === 'C/F' || s === 'CF') return 'C/F';

        let digits = s.replace(/\D/g, ''); // Quitar cualquier cosa que no sea número
        if (!digits) return 'C/F';

        // Rellenar con ceros a la izquierda hasta los 14 caracteres requeridos
        return digits.padStart(14, '0');
    },

    getLocalDate(date = new Date()) { return date.toISOString().split('T')[0]; },
    getAppTimestamp() {
        const d = new Date();
        const date = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        return `${date} ${time}`;
    },
    formatDisplayDate(d) { if (!d) return ''; const p = d.split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; },
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
        if (q.anulada) return { label: 'Anulada', color: '#94a3b8' }; // Gris para anuladas
        if (q.facturada) return { label: 'Facturada', color: '#3b82f6' };
        if (!q.dueDate) return { label: 'Activa', color: '#22c55e' };

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(q.dueDate + 'T23:59:59');

        if (due < now) return { label: 'Vencida', color: '#ef4444' };

        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) return { label: 'Por vencer', color: '#f59e0b' };

        return { label: 'Activa', color: '#22c55e' };
    },
    notify(msg, type = 'success') {
        const c = document.getElementById('notification-container');
        if (!c) return;
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
                document.getElementById('quote-rtn').value = this.formatRTN(customer.rtn || '');
                document.getElementById('quote-address').value = customer.address || '';
                const emailInput = document.getElementById('quote-email');
                if (emailInput) emailInput.value = customer.email || '';
            }
        }
    },
    onProductSelect(i) {
        const p = this.data.productos.find(x => String(x.code) === i.value.split(' - ')[0]);
        if (p) {
            const tr = i.closest('tr');
            let price = p.price;
            const currency = document.getElementById('quote-currency') ? document.getElementById('quote-currency').value : 'LPS';
            const rate = this.parseNum(document.getElementById('quote-exchange-rate') ? document.getElementById('quote-exchange-rate').value : 0) || 1;

            if (currency === 'USD') {
                price = price / rate;
            }

            tr.querySelector('.price-input').value = price.toFixed(2);
            this.calculateTotals();
        }
    },
    addQuoteItem(itemData = null) {
        const body = document.getElementById('quote-items-body');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" list="products-datalist" class="prod-input" value="${itemData ? (itemData.code + ' - ' + itemData.description) : ''}" placeholder="Producto..." onchange="app.onProductSelect(this)"></td>
            <td><input type="number" class="qty-input" value="${itemData ? Math.round(itemData.qty) : 1}" min="1" step="1" oninput="app.calculateTotals()"></td>
            <td><input type="number" class="price-input" value="${itemData ? itemData.price : 0}" step="0.01" oninput="app.calculateTotals()"></td>
            <td class="text-right row-total" style="padding-right:1.5rem;">L. 0.00</td>
            <td><button class="btn-icon text-error-color" onclick="this.closest('tr').remove(); app.calculateTotals();"><i data-lucide="trash-2" style="width:16px;"></i></button></td>
        `;
        body.appendChild(tr); lucide.createIcons();
    },
    calculateTotals() {
        let subtotal = 0;
        const currency = document.getElementById('quote-currency') ? document.getElementById('quote-currency').value : 'LPS';
        const symbol = currency === 'USD' ? '$ ' : 'L. ';
        const tipo = document.getElementById('quote-tipo') ? document.getElementById('quote-tipo').value : 'Nacional';

        document.querySelectorAll('#quote-items-body tr').forEach(tr => {
            const qty = this.parseNum(tr.querySelector('.qty-input').value);
            const price = this.parseNum(tr.querySelector('.price-input').value);
            const total = qty * price; subtotal += total;
            tr.querySelector('.row-total').innerText = symbol + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });
        const isv = tipo === 'Nacional' ? subtotal * 0.15 : 0;
        const isvLabel = document.getElementById('isv-label');
        if (isvLabel) isvLabel.innerText = tipo === 'Nacional' ? 'ISV (15%):' : 'ISV (Exento):';
        document.getElementById('sub-total').innerText = symbol + subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('isv-total').innerText = symbol + isv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('total-val').innerText = symbol + (subtotal + isv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    initCharts(quotes) {
        const ctxMonth = document.getElementById('quotesMonthChart');
        const ctxStatus = document.getElementById('statusChart');
        if (!ctxMonth || !ctxStatus) return;
        if (window.myChart1) window.myChart1.destroy();
        if (window.myChart2) window.myChart2.destroy();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyCount = new Array(12).fill(0);
        const monthlyLPS = new Array(12).fill(0);
        const monthlyUSD = new Array(12).fill(0);
        quotes.forEach(q => {
            const m = new Date(this.parseDate(q.date)).getMonth();
            if (m >= 0) {
                monthlyCount[m]++;
                if (q.currency === 'USD') monthlyUSD[m] += (q.total || 0);
                else monthlyLPS[m] += (q.total || 0);
            }
        });
        window.myChart1 = new Chart(ctxMonth, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Cant. Cotizaciones', data: monthlyCount, backgroundColor: 'rgba(59, 130, 246, 0.5)', yAxisID: 'y', order: 2 },
                    { label: 'Valor LPS', data: monthlyLPS, type: 'line', borderColor: '#22c55e', tension: 0.4, fill: false, yAxisID: 'y1', order: 1 },
                    { label: 'Valor USD', data: monthlyUSD, type: 'line', borderColor: '#3b82f6', tension: 0.4, fill: false, yAxisID: 'y1', order: 1 }
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
        const statusData = { 'Activa': 0, 'Facturada': 0, 'Vencida': 0, 'Por vencer': 0, 'Anulada': 0 };
        quotes.forEach(q => { const s = this.getStatus(q).label; if (statusData.hasOwnProperty(s)) statusData[s] += (q.total || 0); });

        window.myChart2 = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#94a3b8']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });

        // --- Gráfica de Vendedores ---
        const ctxSeller = document.getElementById('sellerPerformanceChart');
        if (ctxSeller) {
            if (window.myChart3) window.myChart3.destroy();

            const sellerData = {};
            quotes.forEach(q => {
                const s = q.seller || 'General';
                if (!sellerData[s]) sellerData[s] = { count: 0, value: 0 };
                sellerData[s].count++;

                // Consolidar valor en LPS para comparación justa (si es USD, convertir con su tasa)
                if (q.currency === 'USD') {
                    sellerData[s].value += (q.total * (q.exchangeRate || 1));
                } else {
                    sellerData[s].value += q.total;
                }
            });

            const labels = Object.keys(sellerData);
            const counts = labels.map(l => sellerData[l].count);
            const values = labels.map(l => sellerData[l].value);

            window.myChart3 = new Chart(ctxSeller, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Cant. Cotizaciones', data: counts, backgroundColor: 'rgba(59, 130, 246, 0.6)', yAxisID: 'y' },
                        { label: 'Valor Consolidado (LPS)', data: values, backgroundColor: 'rgba(34, 197, 94, 0.6)', yAxisID: 'y1' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'Cantidad' } },
                        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Monto Total (LPS)' } }
                    }
                }
            });
        }

        // --- Gráfica de Productos (Top 10) ---
        const ctxProd = document.getElementById('productPerformanceChart');
        if (ctxProd) {
            if (window.myChart4) window.myChart4.destroy();

            const productData = {};
            quotes.forEach(q => {
                const items = q.items || [];
                items.forEach(item => {
                    const desc = item.description || item.code || 'Desconocido';
                    if (!productData[desc]) productData[desc] = { qty: 0, value: 0 };
                    productData[desc].qty += (item.qty || 0);

                    // Valor proporcional del item en LPS
                    let itemVal = (item.qty * item.price);
                    if (q.currency === 'USD') itemVal *= (q.exchangeRate || 1);
                    productData[desc].value += itemVal;
                });
            });

            // Ordenar por valor y tomar los 10 mejores
            const topProducts = Object.entries(productData)
                .sort((a, b) => b[1].value - a[1].value)
                .slice(0, 10);

            const labels = topProducts.map(x => x[0].length > 30 ? x[0].substring(0, 27) + '...' : x[0]);
            const qtys = topProducts.map(x => x[1].qty);
            const values = topProducts.map(x => x[1].value);

            window.myChart4 = new Chart(ctxProd, {
                type: 'bar', // Horizontal se activa con indexAxis
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Unidades Cotizadas', data: qtys, backgroundColor: 'rgba(245, 158, 11, 0.6)', xAxisID: 'x' },
                        { label: 'Valor Total (LPS)', data: values, backgroundColor: 'rgba(16, 185, 129, 0.6)', xAxisID: 'x1' }
                    ]
                },
                options: {
                    indexAxis: 'y', // Barra horizontal
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { type: 'linear', position: 'top', title: { display: true, text: 'Unidades' } },
                        x1: { type: 'linear', position: 'bottom', grid: { drawOnChartArea: false }, title: { display: true, text: 'Monto Consolidado (LPS)' } }
                    }
                }
            });
        }
    },

    toggleFacturado(id) {
        const q = this.data.cotizaciones.find(x => String(x.id) === String(id));
        if (q) {
            if (q.anulada) return this.notify('No se puede marcar como facturada una cotización anulada', 'error');
            q.facturada = !q.facturada;
            this.saveDB();
            this.render(this.currentView);
            this.notify(`Cotización #${q.number} marcada como ${q.facturada ? 'Facturada' : 'Pendiente'}`);
        }
    },

    toggleAnular(id) {
        const q = this.data.cotizaciones.find(x => String(x.id) === String(id));
        if (!q || q.anulada) return;

        // Caso: Anular con Auditoría
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
                <div class="modal glass animate-slide-up" style="background:var(--card-bg); padding:35px; border-radius:24px; width:450px; border: 1px solid var(--border-color);">
                    <div style="width:60px; height:60px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                        <i data-lucide="alert-triangle" style="width:30px; height:30px;"></i>
                    </div>
                    <h3 style="margin-bottom:10px; color:var(--text-main);">Anular Cotización #${q.number}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">Por seguridad, ingresa el motivo de la anulación:</p>
                    
                    <textarea id="void-reason" placeholder="Ej: Error en precios, cliente desistió, etc..." 
                        style="width:100%; height:100px; padding:12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); margin-bottom:20px; font-family:inherit; resize:none;"></textarea>
                    
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancelar</button>
                        <button class="btn btn-primary" style="background:#ef4444; border:none;" id="btn-confirm-void">Confirmar Anulación</button>
                    </div>
                </div>
            `;
        modal.classList.remove('hidden');
        lucide.createIcons();

        document.getElementById('void-reason').focus();

        document.getElementById('btn-confirm-void').onclick = () => {
            const reason = document.getElementById('void-reason').value.trim();
            if (reason.length < 5) {
                return this.notify('Por favor, ingresa un motivo más detallado', 'error');
            }

            // Registro de Auditoría
            q.anulada = true;
            q.facturada = false;
            q.anuladaMotivo = reason;
            q.anuladaPor = this.data.currentUser.Nombre || this.data.currentUser.name;
            q.anuladaFecha = this.getAppTimestamp();

            this.saveDB();
            document.getElementById('modal-container').classList.add('hidden');
            this.render(this.currentView);
            this.notify(`Cotización #${q.number} ANULADA con éxito`);
        };
    },

    togglePlazoField(val) {
        const container = document.getElementById('plazo-container');
        if (container) {
            container.style.display = val === 'Credito' ? 'block' : 'none';
        }
    },

    toggleCurrencyField(val) {
        const container = document.getElementById('exchange-rate-container');
        if (container) {
            container.style.display = val === 'USD' ? 'block' : 'none';
        }

        // Si regresamos a Lempiras, forzamos el precio de base de datos
        if (val === 'LPS') {
            document.querySelectorAll('#quote-items-body tr').forEach(tr => {
                const prodInput = tr.querySelector('.prod-input');
                const priceInput = tr.querySelector('.price-input');
                const code = prodInput.value.split(' - ')[0];
                const p = this.data.productos.find(x => String(x.code) === String(code));
                if (p) priceInput.value = p.price.toFixed(2);
            });
            this.lastCurrency = 'LPS';
            this.calculateTotals();
        } else {
            // Si pasamos a USD, intentamos recuperar la última tasa utilizada en el historial
            const rateInput = document.getElementById('quote-exchange-rate');
            if (rateInput && (!rateInput.value || rateInput.value === "1")) {
                const lastUSDQuote = [...this.data.cotizaciones].reverse().find(q => q.currency === 'USD' && q.exchangeRate > 1);
                if (lastUSDQuote) {
                    rateInput.value = lastUSDQuote.exchangeRate;
                } else {
                    rateInput.value = ""; // Limpiar si no hay historial para obligar ingreso
                }
            }
            this.updatePricesByRate();
            this.lastCurrency = 'USD';
        }
    },

    updatePricesByRate() {
        const rate = this.parseNum(document.getElementById('quote-exchange-rate').value);
        const currency = document.getElementById('quote-currency').value;

        if (currency === 'USD') {
            document.querySelectorAll('#quote-items-body tr').forEach(tr => {
                const prodInput = tr.querySelector('.prod-input');
                const priceInput = tr.querySelector('.price-input');
                const code = prodInput.value.split(' - ')[0];
                const p = this.data.productos.find(x => String(x.code) === String(code));
                if (p) {
                    if (rate > 0) {
                        priceInput.value = (p.price / rate).toFixed(2);
                    } else {
                        priceInput.value = "0.00";
                    }
                }
            });
        }
        this.calculateTotals();
    },

    numberToWords(num, currency = 'LPS') {
        if (!num || num === 0) return `CERO ${currency === 'USD' ? 'DÓLARES' : 'LEMPIRAS'} CON 00/100`;

        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const tens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const tens2 = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const convertGroup = (n) => {
            let output = '';
            if (n === 100) return 'CIEN ';
            if (n > 100) {
                output += hundreds[Math.floor(n / 100)] + ' ';
                n %= 100;
            }
            if (n >= 20) {
                let d = Math.floor(n / 10);
                let u = n % 10;
                if (d === 2 && u > 0) output += 'VEINTI' + units[u];
                else {
                    output += tens2[d];
                    if (u > 0) output += ' Y ' + units[u];
                }
            } else if (n >= 10) {
                output += tens[n - 10];
            } else if (n > 0) {
                output += units[n];
            }
            return output + ' ';
        };

        let intPart = Math.floor(num);
        let decPart = Math.round((num - intPart) * 100);
        let result = '';

        if (intPart >= 1000000) {
            let millions = Math.floor(intPart / 1000000);
            result += (millions === 1 ? 'UN MILLON ' : convertGroup(millions) + 'MILLONES ');
            intPart %= 1000000;
        }
        if (intPart >= 1000) {
            let thousands = Math.floor(intPart / 1000);
            result += (thousands === 1 ? 'MIL ' : convertGroup(thousands) + 'MIL ');
            intPart %= 1000;
        }
        if (intPart > 0 || result === '') {
            result += convertGroup(intPart);
        }

        const label = currency === 'USD' ? 'DÓLARES' : 'LEMPIRAS';
        return `SON: ${result.trim()} ${label} CON ${decPart.toString().padStart(2, '0')}/100`;
    },

    saveFinalQuote() {
        const customer = document.getElementById('quote-customer').value;
        const rtn = this.formatRTN(document.getElementById('quote-rtn').value);
        const address = document.getElementById('quote-address').value;
        const email = document.getElementById('quote-email').value;
        const seller = document.getElementById('quote-vendedor').value;
        const dueDate = document.getElementById('quote-due-date').value;
        const paymentCondition = document.getElementById('quote-payment-condition').value;
        const currency = document.getElementById('quote-currency').value;
        const tipo = document.getElementById('quote-tipo') ? document.getElementById('quote-tipo').value : 'Nacional';
        const exchangeRate = currency === 'LPS' ? 1 : (parseFloat(document.getElementById('quote-exchange-rate').value) || 1);
        const plazo = parseInt(document.getElementById('quote-plazo').value) || 0;
        const notes = document.getElementById('quote-notes').value;

        if (!customer) return this.notify('Seleccione un cliente', 'error');
        if (!seller) return this.notify('Seleccione un vendedor', 'error');
        if (currency === 'USD' && exchangeRate <= 0) return this.notify('Ingrese una tasa de cambio válida para dólares', 'error');

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
        const isv = tipo === 'Nacional' ? subtotal * 0.15 : 0;
        const total = subtotal + isv;

        // Búsqueda robusta del cliente para no perder código ni teléfono
        const customerClean = customer.trim().toLowerCase();
        const clientObj = this.data.clientes.find(c =>
            (c.razonSocial || '').toLowerCase().trim() === customerClean ||
            (c.nombreComercial || '').toLowerCase().trim() === customerClean
        );

        const customerCode = clientObj ? clientObj.id : '';
        const phones = clientObj ? clientObj.phones : '';

        const q = {
            id: Date.now(),
            number: String(this.data.config.nextNumber++),
            customerName: customer,
            customerCode,
            rtn,
            address,
            phones,
            email,
            seller,
            date: this.getLocalDate(),
            dueDate,
            items,
            total: parseFloat(total.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            isv: parseFloat(isv.toFixed(2)),
            notes,
            paymentCondition,
            plazo,
            currency,
            exchangeRate,
            tipo,
            facturada: false
        };

        this.data.cotizaciones.unshift(q);
        this.saveDB();
        this.render('preview', q);
        this.notify(`Cotización #${q.number} guardada correctamente`);
    },

    previewQuote(id) {
        const q = this.data.cotizaciones.find(x => String(x.id) === String(id));
        if (q && q.customerCode) {
            // Sincronización dinámica: Usar el código para traer el RTN más reciente del catálogo
            const client = this.data.clientes.find(c => String(c.id) === String(q.customerCode));
            if (client) {
                q.rtn = client.rtn || q.rtn;
                q.address = client.address || q.address;
                q.phones = client.phones || q.phones;
            }
        }
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
        const emailField = document.getElementById('quote-email');
        if (emailField) emailField.value = quote.email || '';
        document.getElementById('quote-notes').value = quote.notes || '';

        const currSelect = document.getElementById('quote-currency');
        if (currSelect) {
            currSelect.value = quote.currency || 'LPS';
            this.toggleCurrencyField(currSelect.value);
        }
        const rateInput = document.getElementById('quote-exchange-rate');
        if (rateInput) rateInput.value = quote.exchangeRate || '';

        const tipoSelect = document.getElementById('quote-tipo');
        if (tipoSelect) tipoSelect.value = quote.tipo || 'Nacional';

        const condSelect = document.getElementById('quote-payment-condition');
        if (condSelect) {
            condSelect.value = quote.paymentCondition || 'Contado';
            this.togglePlazoField(condSelect.value);
        }
        const plazoInput = document.getElementById('quote-plazo');
        if (plazoInput) plazoInput.value = quote.plazo || 0;

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
    },

    filterDashboard(query, status, seller, from, to) {
        // Limpiar el timeout anterior para evitar renders excesivos mientras se escribe
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(() => {
            let q = [...this.data.cotizaciones];

            // Filtro por rol (Seguridad)
            const role = (this.data.currentUser.Rol || this.data.currentUser.role || '').toUpperCase();
            if (role === 'VENDEDOR') {
                const sellerCode = this.data.currentUser.CodigoVendedor || this.data.currentUser.sellerCode;
                const sellerObj = this.data.vendedores.find(v => String(v.id) === String(sellerCode));
                if (sellerObj) q = q.filter(x => x.seller === sellerObj.name);
            }

            // Filtro por Vendedor (Selector)
            if (seller) q = q.filter(x => x.seller === seller);

            // Filtro por Estado
            if (status) {
                q = q.filter(x => {
                    const s = this.getStatus(x).label;
                    return s === status;
                });
            }

            // Filtro por Rango de Fechas
            if (from || to) {
                q = q.filter(x => {
                    const qDate = x.date; // Formato YYYY-MM-DD
                    if (from && qDate < from) return false;
                    if (to && qDate > to) return false;
                    return true;
                });
            }

            // Filtro por Texto (Nombre o Numero)
            if (query) {
                const low = query.toLowerCase();
                q = q.filter(x =>
                    String(x.number).includes(low) ||
                    (x.customerName || '').toLowerCase().includes(low)
                );
            }

            const dataForView = {
                filteredQuotes: q,
                recentQuotes: q.slice(0, 10),
                productos: this.data.productos,
                clientes: this.data.clientes,
                vendedores: this.data.vendedores,
                revenueLPS: q.filter(x => x.currency === 'LPS').reduce((a, b) => a + (b.total || 0), 0),
                revenueUSD: q.filter(x => x.currency === 'USD').reduce((a, b) => a + (b.total || 0), 0),
                lastProductImport: this.data.lastProductImport,
                lastCustomerImport: this.data.lastCustomerImport,
                lastSellerImport: this.data.lastSellerImport,
                activeFilters: { query, status, seller, from, to }
            };

            const area = document.getElementById('content-area');
            if (area && window.Views.dashboard) {
                area.innerHTML = window.Views.dashboard(dataForView);
                this.initCharts(q);

                // RESTAURAR FOCO Y POSICIÓN DEL CURSOR
                const searchInput = document.getElementById('dash-filter-q');
                if (searchInput && query) {
                    searchInput.focus();
                    searchInput.setSelectionRange(query.length, query.length);
                }
            }
        }, 400); // 400ms de espera para sentir fluidez al escribir
    },

    searchCustomers(val) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(() => {
            const query = val.toLowerCase();
            const filtered = this.data.clientes.filter(c =>
                (c.razonSocial || '').toLowerCase().includes(query) ||
                (c.nombreComercial || '').toLowerCase().includes(query) ||
                (c.rtn || '').toLowerCase().includes(query) ||
                String(c.id).includes(query)
            );

            const area = document.getElementById('content-area');
            if (area && window.Views.customers) {
                area.innerHTML = window.Views.customers(filtered, val);
                lucide.createIcons();

                // RESTAURAR FOCO
                const input = document.getElementById('customer-search');
                if (input) {
                    input.focus();
                    input.setSelectionRange(val.length, val.length);
                }
            }
        }, 300);
    },

    searchInventory(val) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(() => {
            const query = val.toLowerCase().trim();
            const filtered = this.data.productos.filter(p =>
                (p.code || '').toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query)
            );

            const area = document.getElementById('content-area');
            if (area && window.Views.inventory) {
                area.innerHTML = window.Views.inventory(filtered, val);
                lucide.createIcons();

                // RESTAURAR FOCO Y POSICIÓN AL FINAL
                const input = document.getElementById('inventory-search');
                if (input) {
                    input.focus();
                    input.setSelectionRange(val.length, val.length);
                }
            }
        }, 300);
    },

    searchSellers(val) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(() => {
            const query = val.toLowerCase().trim();
            const filtered = this.data.vendedores.filter(v =>
                (v.name || '').toLowerCase().includes(query) ||
                String(v.id).toLowerCase().includes(query)
            );

            const area = document.getElementById('content-area');
            if (area && window.Views.sellers) {
                area.innerHTML = window.Views.sellers(this.data.vendedores, val);
                lucide.createIcons();

                // RESTAURAR FOCO Y POSICIÓN
                const input = document.getElementById('seller-search');
                if (input) {
                    input.focus();
                    input.setSelectionRange(val.length, val.length);
                }
            }
        }, 300);
    },

    async importFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            // Filtrar productos válidos (soporta Producto, Codigo, Item)
            this.data.productos = rows.filter(r => r.Producto || r.PRODUCTO || r.Codigo || r.CODIGO || r.Item).map(r => ({
                code: String(r.Producto || r.PRODUCTO || r.Codigo || r.CODIGO || r.Item || '').trim(),
                description: String(r.Descripcion || r.DESCRIPCION || r.Nombre || r.NOMBRE || r.Description || '').trim(),
                stock: parseInt(r.ExistenciaActual || r.EXISTENCIA || r.Stock || r.STOCK || r.CANTIDAD || 0) || 0,
                price: parseFloat(r.PrecioMayorista || r.PRECIO || r.Precio || r.PRICE || 0) || 0
            }));

            this.data.lastProductImport = this.getAppTimestamp();
            await this.saveDB('products'); // Sincronización ligera
            this.render('inventory');
            this.notify(`¡${this.data.productos.length} productos importados con éxito!`);
        };
        reader.readAsArrayBuffer(file);
    },

    async importCustomersFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            // Helper local: busca el valor de un campo buscando coincidencia parcial en el nombre de columna
            const getVal = (obj, words) => {
                const k = Object.keys(obj).find(key =>
                    words.some(w => key.toLowerCase().includes(w.toLowerCase()))
                );
                return k ? obj[k] : '';
            };

            this.data.clientes = rows.map(r => ({
                id: this.cleanCode(String(getVal(r, ['cliente', 'codigo', 'id']) || '').replace(/^0+/, '') || '0'),
                razonSocial: getVal(r, ['razonsocial', 'razon', 'social', 'nombre']),
                nombreComercial: getVal(r, ['nombrecomercial', 'comercial', 'fantasia']),
                rtn: this.formatRTN(getVal(r, ['idtributario', 'rtn', 'fiscal', 'nrc', 'tributario'])),
                address: getVal(r, ['direccion', 'address', 'ubicacion']),
                phones: getVal(r, ['telefonos', 'telefono', 'phone', 'celular']),
                email: getVal(r, ['correo', 'email', 'mail'])
            })).filter(c => c.id !== '0' || c.razonSocial); // Descartar solo filas completamente vacías

            this.data.lastCustomerImport = this.getAppTimestamp();
            await this.saveDB('customers');
            this.render('customers');
            this.notify(`¡${this.data.clientes.length} clientes importados con éxito!`);
        };
        reader.readAsArrayBuffer(file);
    },

    async importSellersFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            this.data.vendedores = rows.filter(r => r.Codigo || r.Nombre).map(r => ({
                id: String(r.Codigo || r.CODE || '').trim(),
                name: String(r.Nombre || r.NAME || '').trim()
            }));

            this.data.lastSellerImport = this.getAppTimestamp();
            await this.saveDB('sellers'); // Sincronización ligera
            this.render('sellers');
            this.notify(`¡${this.data.vendedores.length} vendedores registrados!`);
        };
        reader.readAsArrayBuffer(file);
    },

    exportHistoryToExcel() {
        const query = document.getElementById('hist-filter-q').value;
        const status = document.getElementById('hist-filter-status').value;
        const seller = document.getElementById('hist-filter-seller').value;
        const from = document.getElementById('hist-filter-start').value;
        const to = document.getElementById('hist-filter-end').value;

        let q = [...this.data.cotizaciones];

        if (query) {
            const low = query.toLowerCase();
            q = q.filter(x =>
                String(x.number).includes(low) ||
                (x.customerName || '').toLowerCase().includes(low)
            );
        }
        if (status) {
            q = q.filter(x => this.getStatus(x).label === status);
        }
        if (seller) {
            q = q.filter(x => x.seller === seller);
        }
        if (from || to) {
            q = q.filter(x => {
                const qDate = x.date;
                if (from && qDate < from) return false;
                if (to && qDate > to) return false;
                return true;
            });
        }

        if (q.length === 0) return this.notify('No hay datos para exportar', 'error');

        // Formatear datos para el Excel
        const exportData = q.map(x => {
            const s = this.getStatus(x);
            return {
                "No. Cotización": x.number,
                "Cliente": x.customerName,
                "RTN": x.rtn || 'C/F',
                "Vendedor": x.seller || 'General',
                "Fecha": this.formatDisplayDate(x.date),
                "Vencimiento": this.formatDisplayDate(x.dueDate),
                "Estado": s.label,
                "Moneda": x.currency || 'LPS',
                "Tasa": x.exchangeRate || 1,
                "Subtotal": x.subtotal || 0,
                "ISV": x.isv || 0,
                "Total": x.total || 0,
                "Facturada": x.facturada ? 'SI' : 'NO',
                "Anulada": x.anulada ? 'SI' : 'NO',
                "Motivo Anulación": x.anuladaMotivo || '',
                "Notas": x.notes || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

        // Generar nombre de archivo
        const d = new Date();
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        XLSX.writeFile(workbook, `Historial_Cotizaciones_${dateStr}.xlsx`);
        this.notify('Excel generado correctamente');
    },

    filterHistory(query, status, seller, from, to) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(() => {
            let q = [...this.data.cotizaciones];

            if (query) {
                const low = query.toLowerCase();
                q = q.filter(x =>
                    String(x.number).includes(low) ||
                    (x.customerName || '').toLowerCase().includes(low)
                );
            }

            if (status) {
                q = q.filter(x => this.getStatus(x).label === status);
            }

            if (seller) {
                q = q.filter(x => x.seller === seller);
            }

            if (from || to) {
                q = q.filter(x => {
                    const qDate = x.date;
                    if (from && qDate < from) return false;
                    if (to && qDate > to) return false;
                    return true;
                });
            }

            const area = document.getElementById('content-area');
            if (area && window.Views.history) {
                const filters = { query, status, seller, start: from, end: to };
                area.innerHTML = window.Views.history(q, filters, this.data.vendedores);
                lucide.createIcons();

                const input = document.getElementById('hist-filter-q');
                if (input && query) {
                    input.focus();
                    input.setSelectionRange(query.length, query.length);
                }
            }
        }, 300);
    },

    exportQuoteToExcel() {
        const q = this.currentPreviewQuote;
        if (!q) return this.notify('No hay cotización activa', 'error');

        const sym = q.currency === 'USD' ? 'USD' : 'LPS';

        // Hoja combinada: encabezado + detalle
        const rows = [
            ['CHIPS, S.A. — COTIZACIÓN'],
            [],
            ['No. Cotización', `#${q.number}`],
            ['Fecha', this.formatDisplayDate(q.date)],
            ['Vencimiento', this.formatDisplayDate(q.dueDate)],
            ['Cliente', q.customerName],
            ['RTN', q.rtn || 'C/F'],
            ['Dirección', q.address || ''],
            ['Teléfono', q.phones || ''],
            ['Correo', q.email || ''],
            ['Vendedor', q.seller || 'General'],
            ['Condición', q.paymentCondition === 'Credito' ? `Crédito ${q.plazo || 0} días` : 'Contado'],
            ['Moneda', sym],
            ['Tipo', q.tipo || 'Nacional'],
            ['Notas', q.notes || ''],
            [],
            ['CÓDIGO', 'DESCRIPCIÓN', 'CANTIDAD', `PRECIO (${sym})`, `TOTAL (${sym})`],
            ...(q.items || []).map(i => [
                i.code || '',
                i.description || '',
                Math.round(i.qty || 0),
                Number(i.price || 0),
                Number(i.total || 0)
            ]),
            [],
            ['', '', '', 'SUBTOTAL', Number(q.subtotal || 0)],
            ['', '', '', (q.tipo === 'Extranjera' ? 'ISV (Exento)' : 'ISV 15%'), Number(q.isv || 0)],
            ['', '', '', 'TOTAL', Number(q.total || 0)]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        // Anchos de columna
        ws['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cotización');
        const fname = `Cotizacion_${q.number}_${(q.customerName || '').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fname);
        this.notify('Cotización exportada a Excel');
    },

    async uploadQuoteToDrive() {
        const q = this.currentPreviewQuote;
        if (!q) return this.notify('No hay cotizacion activa', 'error');

        if (typeof window.jspdf === 'undefined') {
            return this.notify('jsPDF no cargado. Recarga la pagina.', 'error');
        }

        this.notify('Generando PDF...');

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const sym = q.currency === 'USD' ? '$' : 'L.';
            const symSp = q.currency === 'USD' ? '$ ' : 'L. ';
            const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const W = 210;
            const mg = 12;
            let y = 6;

            // ── LOGO CHIPS EN BASE64 ─────────────────────────────────────────
            const LOGO_CHIPS_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAArwAAADaCAYAAABEiJEtAAAACXBIWXMAAC4jAAAuIwF4pT92AAAGoWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTAzLTE0VDE2OjA2OjA1LTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0wNC0xMVQxMTo1OTozMC0wNjowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMy0wNC0xMVQxMTo1OTozMC0wNjowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTNkZDlhZTQtNGIyYy04MjQ1LWI4NzctMGU2YThlYzZmOTI1IiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6M2IwNDJmZGUtNjEyMi00NzRiLTg1ZDYtOGQ1YTQ5Yzk2ZTllIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YmMwNTFkODAtMGNkYS1kNTQ0LWEwZDgtNjdlMTJiMWY0MDY1Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpiYzA1MWQ4MC0wY2RhLWQ1NDQtYTBkOC02N2UxMmIxZjQwNjUiIHN0RXZ0OndoZW49IjIwMjMtMDMtMTRUMTY6MDY6MDUtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZTlhYzFhNGMtMWZkOC01ZDQxLTk0NGUtYmMxMTQ3MTNhMmM5IiBzdEV2dDp3aGVuPSIyMDIzLTAzLTIyVDE4OjAwOjUzLTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjUzZGQ5YWU0LTRiMmMtODI0NS1iODc3LTBlNmE4ZWM2ZjkyNSIgc3RFdnQ6d2hlbj0iMjAyMy0wNC0xMVQxMTo1OTozMC0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pj57VXIAAIfCSURBVHic7J1lnBPXGoefmdgmWXfBXYoWa9FSKrTUS93d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';
            pdf.addImage(LOGO_CHIPS_B64, 'PNG', mg, y, 28, 11);
            const txtX = mg + 31;
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(30, 41, 59);
            pdf.text('Chips, S.A.', txtX, y + 4);
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(68, 68, 68);
            pdf.text('Col. El Prado, 10 Ave, 17 Calle, Circunvalacion No. 55', txtX, y + 8);
            pdf.text('San Pedro Sula, Cortes, Honduras', txtX, y + 11.5);
            pdf.setFont('helvetica', 'bold'); pdf.text('RTN: 05019999176400', txtX, y + 15);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(34, 197, 94);
            pdf.text('Cotizacion #' + q.number, W - mg, y + 8, { align: 'right' });
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
            pdf.text('Fecha: ' + this.formatDisplayDate(q.date), W - mg, y + 15, { align: 'right' });

            // ── SECCIÓN CLIENTE ───────────────────────────────────────────────
            y = 24;
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
            pdf.text('CLIENTE', mg, y);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(30, 41, 59);
            pdf.text((q.customerName || '').substring(0, 55), mg, y + 6);
            pdf.setFontSize(7.5); pdf.setTextColor(51, 65, 85);
            const infoY = y + 11;
            pdf.setFont('helvetica', 'bold'); pdf.text('Codigo de Cliente: ', mg, infoY);
            pdf.setFont('helvetica', 'normal'); pdf.text(String(q.customerCode || '---'), mg + 28, infoY);
            pdf.setFont('helvetica', 'bold'); pdf.text('RTN: ', mg, infoY + 4.5);
            pdf.setFont('helvetica', 'normal'); pdf.text(q.rtn || 'C/F', mg + 10, infoY + 4.5);
            pdf.setFont('helvetica', 'bold'); pdf.text('Direccion: ', mg, infoY + 9);
            pdf.setFont('helvetica', 'normal'); pdf.text((q.address || 'Honduras').substring(0, 65), mg + 18, infoY + 9);
            pdf.setFont('helvetica', 'bold'); pdf.text('Telefono: ', mg, infoY + 13.5);
            pdf.setFont('helvetica', 'normal'); pdf.text(q.phones || 'N/A', mg + 16, infoY + 13.5);
            const rightX = 138;
            const kvRows = [
                ['VENDEDOR:', q.seller || 'General'],
                ['EMITE:', this.formatDisplayDate(q.dueDate)],
                ['MONEDA:', q.currency === 'USD' ? 'Dolares (USD)' : 'Lempiras (LPS)'],
                ['TIPO:', q.tipo || 'Nacional'],
            ];
            kvRows.forEach(([label, val], i) => {
                const ry = infoY + 1 + (i * 4.5);
                pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
                pdf.text(label, rightX, ry);
                pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59);
                pdf.text(String(val), W - mg, ry, { align: 'right' });
            });
            // Línea separadora verde
            y = infoY + 19;
            pdf.setDrawColor(34, 197, 94); pdf.setLineWidth(0.6);
            pdf.line(mg, y, W - mg, y);
            pdf.setLineWidth(0.2); pdf.setDrawColor(241, 245, 249);

            // ── TABLA ITEMS ──────────────────────────────────────────────────
            y += 5;
            const colCode = mg, colDesc = mg + 22, colQty = 143, colPrc = 163, colImp = W - mg;
            const rowH = 7;
            pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(0.4);
            pdf.line(mg, y + 8, W - mg, y + 8);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(30, 41, 59);
            pdf.text('CODIGO',      colCode,  y + 5.5);
            pdf.text('DESCRIPCION', colDesc,  y + 5.5);
            pdf.text('CANT.',       colQty,   y + 5.5, { align: 'right' });
            pdf.text('PRECIO',      colPrc,   y + 5.5, { align: 'right' });
            pdf.text('IMPORTE',     colImp,   y + 5.5, { align: 'right' });
            y += 9; pdf.setLineWidth(0.2);
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
            (q.items || []).forEach((item, i) => {
                if (y > 255) { pdf.addPage(); y = 15; }
                if (i % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(mg, y - 1, W - 2 * mg, rowH, 'F'); }
                pdf.setDrawColor(241, 245, 249); pdf.line(mg, y + rowH - 1, W - mg, y + rowH - 1);
                pdf.setTextColor(30, 41, 59);
                const qty   = Number(item.qty   || 0);
                const price = Number(item.price || 0);
                const total = Number(item.total || qty * price);
                pdf.setFont('helvetica', 'bold');
                pdf.text(String(item.code || '').substring(0, 9),         colCode, y + 5);
                pdf.setFont('helvetica', 'normal');
                pdf.text(String(item.description || '').substring(0, 58), colDesc, y + 5);
                pdf.text(Math.round(qty).toLocaleString('en-US'),         colQty,  y + 5, { align: 'right' });
                pdf.text(symSp + fmt(price),                              colPrc,  y + 5, { align: 'right' });
                pdf.setFont('helvetica', 'bold');
                pdf.text(symSp + fmt(total),                              colImp,  y + 5, { align: 'right' });
                pdf.setFont('helvetica', 'normal');
                y += rowH;
            });

            // ── SECCIÓN INFERIOR ─────────────────────────────────────────────
            y += 5;
            const bottomY = y;
            const totX = 138;
            if (q.notes) {
                pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
                const noteLines = pdf.splitTextToSize(q.notes, 110);
                pdf.text(noteLines, mg, bottomY);
            }
            const condY = q.notes ? bottomY + 5 : bottomY;
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(30, 41, 59);
            pdf.text('Condicion: ', mg, condY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(q.paymentCondition === 'Credito' ? 'Credito ' + (q.plazo || 0) + ' dias' : 'Contado', mg + 20, condY);
            pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
            pdf.text('Precios sujetos a cambio sin previo aviso.', mg, condY + 4.5);
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105);
            pdf.text('Subtotal', totX, bottomY + 4);
            pdf.setTextColor(30, 41, 59);
            pdf.text(symSp + fmt(q.subtotal), W - mg, bottomY + 4, { align: 'right' });
            if ((q.tipo || 'Nacional') === 'Nacional') {
                pdf.setTextColor(71, 85, 105); pdf.text('ISV 15%', totX, bottomY + 10);
                pdf.setTextColor(30, 41, 59); pdf.text(symSp + fmt(q.isv), W - mg, bottomY + 10, { align: 'right' });
            } else {
                pdf.setTextColor(71, 85, 105); pdf.setFont('helvetica', 'italic'); pdf.text('ISV', totX, bottomY + 10);
                pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59); pdf.text('Exento', W - mg, bottomY + 10, { align: 'right' });
            }
            const tlY = bottomY + 13;
            pdf.setDrawColor(34, 197, 94); pdf.setLineWidth(0.6);
            pdf.line(totX, tlY, W - mg, tlY); pdf.setLineWidth(0.2);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(30, 41, 59);
            pdf.text('TOTAL', totX, tlY + 8);
            pdf.setTextColor(34, 197, 94);
            pdf.text(symSp + fmt(q.total), W - mg, tlY + 8, { align: 'right' });
            const words = this.numberToWords(q.total, q.currency);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(71, 85, 105);
            pdf.text(pdf.splitTextToSize('SON: ' + words, 75), W - mg, tlY + 14, { align: 'right' });

            // ── FOOTER ───────────────────────────────────────────────────────
            const footerY = 282;
            pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3);
            pdf.line(mg, footerY, W - mg, footerY);
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
            pdf.text('PBX: (504) 2544-0212', mg + 20,  footerY + 5, { align: 'center' });
            pdf.text('www.chipssa.net',       mg + 93,  footerY + 5, { align: 'center' });
            pdf.text('ventas@chipssa.net',    mg + 166, footerY + 5, { align: 'center' });
            pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
            pdf.text('Pagina 1 de 1', W / 2, footerY + 9, { align: 'center' });


            // ── SUBIR A DRIVE ─────────────────────────────────────────────────
            const base64PDF = pdf.output('datauristring').split(',')[1];
            const fileName = 'Cotizacion_' + q.number + '_' + (q.customerName || '').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';

            this.notify('Subiendo PDF a Google Drive...');

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'uploadPDF', fileName, base64: base64PDF })
            });

            const rawText = await response.text();

            // Diagnóstico: el Apps Script devolvió "OK" → el bloque uploadPDF no está aplicado
            if (rawText.trim() === 'OK') {
                throw new Error('El Apps Script no tiene el bloque uploadPDF. Verifica que pegaste el codigo nuevo y redespliegaste con Nueva Version.');
            }
            // Diagnóstico: respuesta HTML → error interno de Apps Script
            if (rawText.trim().startsWith('<')) {
                throw new Error('El Apps Script devolvio un error HTML. Revisa los logs en Google Apps Script.');
            }

            let result;
            try { result = JSON.parse(rawText); } catch (e) {
                throw new Error('Respuesta invalida del servidor: ' + rawText.substring(0, 80));
            }

            if (result.error) throw new Error('Apps Script: ' + result.error);
            if (!result.driveUrl) throw new Error('No se recibio URL de Google Drive');


            // ── COPIAR LINK AL PORTAPAPELES ───────────────────────────────────
            const driveUrl = result.driveUrl;
            let copied = false;

            // Método 1: execCommand (funciona en file:// y HTTPS)
            try {
                const ta = document.createElement('textarea');
                ta.value = driveUrl;
                ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (e) { copied = false; }

            // Método 2: clipboard API (funciona en HTTPS/GitHub Pages)
            if (!copied) {
                try {
                    await navigator.clipboard.writeText(driveUrl);
                    copied = true;
                } catch (e) { copied = false; }
            }

            if (copied) {
                this.notify('✅ PDF en Drive. Enlace copiado — pégalo en WhatsApp.');
            } else {
                // Fallback: modal con el link para copiar manualmente
                const mc = document.getElementById('modal-container');
                mc.innerHTML = `
                    <div class="modal glass" style="background:var(--card-bg);padding:30px;border-radius:20px;width:480px;border:1px solid var(--border-color);">
                        <h3 style="margin:0 0 12px;color:var(--text-primary);">📎 Enlace del PDF en Drive</h3>
                        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">Selecciona y copia el enlace para compartirlo en WhatsApp:</p>
                        <input id="drive-url-input" type="text" value="${driveUrl}" readonly
                            onclick="this.select()"
                            style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.8rem;box-sizing:border-box;margin-bottom:14px;">
                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button onclick="document.getElementById('modal-container').classList.add('hidden')"
                                style="padding:8px 18px;border-radius:10px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);cursor:pointer;">Cerrar</button>
                            <button onclick="document.getElementById('drive-url-input').select();document.execCommand('copy');window.app.notify('Enlace copiado.');document.getElementById('modal-container').classList.add('hidden');"
                                style="padding:8px 18px;border-radius:10px;border:none;background:#25D366;color:white;font-weight:600;cursor:pointer;">Copiar</button>
                        </div>
                    </div>`;
                mc.classList.remove('hidden');
            }

        } catch (err) {
            console.error('Error al generar PDF:', err);
            this.notify('Error: ' + (err.message || 'No se pudo generar el PDF'), 'error');
        }
    }
};

