/**
 * VisualDeliver - Management and Delivery System for Visual Products
 * Single Page Application logic supporting Local Storage and optional Supabase integration.
 */

// Helper to create clean SVG data URLs for sample visual deliverables
function createSampleSvgDataUrl(title, subtitle, bgColor1, bgColor2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor1}" />
        <stop offset="100%" stop-color="${bgColor2}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity="0.3" />
      </filter>
    </defs>
    <rect width="800" height="500" fill="url(#grad)" />
    <circle cx="650" cy="120" r="180" fill="rgba(255,255,255,0.1)" />
    <circle cx="150" cy="400" r="120" fill="rgba(255,255,255,0.08)" />
    <rect x="80" y="80" width="640" height="340" rx="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" stroke-width="2" filter="url(#shadow)" />
    <text x="400" y="220" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="400" y="270" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="18" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle">${subtitle}</text>
    <path d="M360 310 L440 310 M400 290 L400 330" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// =============================================================================
// GLOBAL STATE & INITIAL SEED DATA
// =============================================================================

const STORAGE_KEY = 'visual_deliverables_data_v2';
const SUPABASE_CONFIG_KEY = 'visual_deliver_sb_config';

let appState = {
  deliverables: [],
  currentFilter: 'all', // 'all', 'a-tiempo', 'proximo', 'vencido'
  searchQuery: '',
  activeTab: 'empresa', // 'empresa', 'cliente', 'ayuda'
  activeHelpTab: 'empresa',
  activeClientDeliverableId: null,
  clientAuthenticated: false,
  selectedImageDataUrl: null,
  supabaseClient: null
};

// Initial realistic seed data for out-of-the-box demo functionality
const initialSeedDeliverables = [
  {
    id: 'entregable-101',
    cliente: 'Inmobiliaria Horizon',
    nombre_producto: 'Render 3D Rascacielos Torre Central',
    descripcion_leve: 'Visualización fotorrealista de exterior en alta resolución (4K) con iluminación de atardecer y detalles de fachada en vidrio.',
    fecha_limite: getRelativeDateStr(5), // 5 days in future -> "A tiempo"
    imagen_url: createSampleSvgDataUrl('Render 3D Rascacielos', 'Inmobiliaria Horizon • 4K Resolution', '#1e1b4b', '#4338ca'),
    password_hash: '', // populated on init
    password_plain: 'Horizon2025!', // displayed in enterprise view for sharing
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 'entregable-102',
    cliente: 'Estudio Creativo Lumina',
    nombre_producto: 'Branding & Fotografía de Producto',
    descripcion_leve: 'Set de 10 fotografías publicitarias de alta resolución para campaña de lanzamiento de línea cosmética.',
    fecha_limite: getRelativeDateStr(2), // 2 days in future -> "Próximo a vencer"
    imagen_url: createSampleSvgDataUrl('Branding Cosmético', 'Estudio Creativo Lumina • Publicidad 2025', '#065f46', '#059669'),
    password_hash: '',
    password_plain: 'LuminaPass99',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: 'entregable-103',
    cliente: 'Arquitectura & Diseño Studio',
    nombre_producto: 'Plano Visual & Recorrido Interior',
    descripcion_leve: 'Planos diagramados y renders de interiores para apartamento residencial de lujo.',
    fecha_limite: getRelativeDateStr(-3), // 3 days in past -> "Vencido"
    imagen_url: createSampleSvgDataUrl('Plano Visual Interior', 'Arquitectura & Diseño Studio • Penthouse Lux', '#831843', '#be185d'),
    password_hash: '',
    password_plain: 'DesignPass123',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
  }
];

// Helper to generate ISO date string relative to today
function getRelativeDateStr(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// =============================================================================
// STORAGE & SUPABASE PERSISTENCE
// =============================================================================

async function initAppState() {
  // Load Supabase Config if exists
  const sbConfigRaw = localStorage.getItem(SUPABASE_CONFIG_KEY);
  if (sbConfigRaw) {
    try {
      const sbConfig = JSON.parse(sbConfigRaw);
      if (sbConfig.url && sbConfig.key) {
        initSupabase(sbConfig.url, sbConfig.key);
      }
    } catch (err) {
      console.warn('Error parsing Supabase config:', err);
    }
  }

  // Load Deliverables from LocalStorage
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      appState.deliverables = JSON.parse(savedData);
    } catch (err) {
      console.error('Error reading localStorage deliverables:', err);
      appState.deliverables = [];
    }
  }

  // If empty, initialize with seed data and generate password hashes
  if (!appState.deliverables || appState.deliverables.length === 0) {
    for (let item of initialSeedDeliverables) {
      item.password_hash = await hashPassword(item.password_plain);
    }
    appState.deliverables = initialSeedDeliverables;
    saveDeliverablesToStorage();
  }

  // Sync password hashes if missing
  for (let item of appState.deliverables) {
    if (!item.password_hash && item.password_plain) {
      item.password_hash = await hashPassword(item.password_plain);
    }
  }

  // Handle URL Hash navigation
  handleUrlRouting();
  window.addEventListener('hashchange', handleUrlRouting);

  // Initial UI Render
  renderEnterpriseView();
  populateClientDemoSelect();
  updateSupabaseStatusUI();

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

function saveDeliverablesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.deliverables));
}

function initSupabase(url, key) {
  if (window.supabase) {
    appState.supabaseClient = window.supabase.createClient(url, key);
    return true;
  }
  return false;
}

function updateSupabaseStatusUI() {
  const dot = document.getElementById('supabase-status-dot');
  const text = document.getElementById('supabase-status-text');

  if (appState.supabaseClient) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    text.textContent = 'Supabase Cloud';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
    text.textContent = 'Local Storage';
  }
}

// =============================================================================
// SECURITY & PASSWORD HASHING
// =============================================================================

/**
 * Generates a cryptographically secure random alphanumeric password (10 chars)
 */
function generateSecurePassword(length = 10) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

/**
 * Computes SHA-256 hash of plain text password using Web Crypto API
 */
async function hashPassword(plainText) {
  if (!plainText) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// ENTERPRISE ADMIN MODULE (SECCIÓN 1)
// =============================================================================

function calculateDeadlineStatus(deadlineStr) {
  if (!deadlineStr) return { status: 'a-tiempo', label: '🟢 A tiempo', class: 'status-a-tiempo' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineStr + 'T00:00:00');
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'vencido', label: '🔴 Vencido', class: 'status-vencido', days: diffDays };
  } else if (diffDays <= 3) {
    return { status: 'proximo', label: '🟡 Próximo a vencer', class: 'status-proximo', days: diffDays };
  } else {
    return { status: 'a-tiempo', label: '🟢 A tiempo', class: 'status-a-tiempo', days: diffDays };
  }
}

function renderEnterpriseView() {
  const grid = document.getElementById('deliverables-grid');
  const emptyState = document.getElementById('empty-state');

  // Filter deliverables
  let filtered = [...appState.deliverables];

  // Apply Filter Tab
  if (appState.currentFilter !== 'all') {
    filtered = filtered.filter(item => {
      const { status } = calculateDeadlineStatus(item.fecha_limite);
      return status === appState.currentFilter;
    });
  }

  // Apply Search
  if (appState.searchQuery.trim()) {
    const q = appState.searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.cliente.toLowerCase().includes(q) ||
      item.nombre_producto.toLowerCase().includes(q) ||
      item.descripcion_leve.toLowerCase().includes(q)
    );
  }

  // Sort Chronologically Descending (newest first)
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Update Counters
  updateCounters();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Render Cards
  grid.innerHTML = filtered.map(item => {
    const deadlineInfo = calculateDeadlineStatus(item.fecha_limite);
    const formattedDate = formatDateSpanish(item.fecha_limite);

    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
        <div>
          <!-- Card Thumbnail Header -->
          <div class="relative h-48 bg-slate-900 overflow-hidden cursor-pointer" onclick="openLightbox('${escapeHtml(item.imagen_url)}', '${escapeHtml(item.nombre_producto)}')">
            <img src="${escapeHtml(item.imagen_url)}" alt="${escapeHtml(item.nombre_producto)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80"></div>

            <div class="absolute top-3 left-3">
              <span class="${deadlineInfo.class} status-badge shadow-sm">
                ${deadlineInfo.label}
              </span>
            </div>

            <div class="absolute bottom-3 left-3 right-3 text-white">
              <span class="text-[11px] font-semibold text-blue-300 uppercase tracking-wider block">${escapeHtml(item.cliente)}</span>
              <h3 class="font-bold text-base line-clamp-1 leading-snug">${escapeHtml(item.nombre_producto)}</h3>
            </div>
          </div>

          <!-- Card Body -->
          <div class="p-5 space-y-4">
            <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              ${escapeHtml(item.descripcion_leve || 'Sin descripción detallada.')}
            </p>

            <div class="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div class="flex items-center justify-between text-slate-600">
                <span class="font-medium text-slate-500">Fecha Límite:</span>
                <span class="font-bold text-slate-800">${formattedDate}</span>
              </div>

              <!-- Password display box -->
              <div class="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <span class="text-[11px] font-semibold text-slate-500">Clave Cliente:</span>
                <div class="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-xs">
                  <span>${escapeHtml(item.password_plain || '******')}</span>
                  <button onclick="copyToClipboard('${escapeHtml(item.password_plain)}', 'Clave copiada al portapapeles')" title="Copiar clave" class="text-slate-400 hover:text-blue-600 p-1">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="copyClientLink('${item.id}')" class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm">
            <i data-lucide="link" class="w-3.5 h-3.5"></i>
            Copiar Enlace
          </button>

          <button onclick="openEditModal('${item.id}')" title="Editar" class="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>

          <button onclick="deleteDeliverable('${item.id}')" title="Eliminar" class="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl border border-slate-200 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateCounters() {
  const all = appState.deliverables.length;
  let aTiempo = 0;
  let proximo = 0;
  let vencido = 0;

  appState.deliverables.forEach(item => {
    const { status } = calculateDeadlineStatus(item.fecha_limite);
    if (status === 'a-tiempo') aTiempo++;
    if (status === 'proximo') proximo++;
    if (status === 'vencido') vencido++;
  });

  document.getElementById('count-all').textContent = all;
  document.getElementById('count-a-tiempo').textContent = aTiempo;
  document.getElementById('count-proximo').textContent = proximo;
  document.getElementById('count-vencido').textContent = vencido;
}

function filterDeliverables(filterType) {
  appState.currentFilter = filterType;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.className = 'filter-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border border-slate-200 text-slate-600 hover:bg-slate-100';
  });

  const activeBtn = document.getElementById(`filter-${filterType}`);
  if (activeBtn) {
    activeBtn.className = 'filter-btn active px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all border';
  }

  renderEnterpriseView();
}

function searchDeliverables(query) {
  appState.searchQuery = query;
  renderEnterpriseView();
}

// Modal Form Handlers
function openCreateModal() {
  document.getElementById('modal-title').textContent = 'Nuevo Entregable';
  document.getElementById('entregable-id').value = '';
  document.getElementById('input-cliente').value = '';
  document.getElementById('input-producto').value = '';
  document.getElementById('input-descripcion').value = '';
  document.getElementById('input-fecha-limite').value = getRelativeDateStr(7);

  // Generate random password
  generateNewPassword();

  // Reset Image Dropzone
  appState.selectedImageDataUrl = null;
  document.getElementById('dropzone-prompt').classList.remove('hidden');
  document.getElementById('dropzone-preview-container').classList.add('hidden');
  document.getElementById('dropzone-preview').src = '';

  openModal('modal-entregable');
}

function openEditModal(id) {
  const item = appState.deliverables.find(d => d.id === id);
  if (!item) return;

  document.getElementById('modal-title').textContent = 'Editar Entregable';
  document.getElementById('entregable-id').value = item.id;
  document.getElementById('input-cliente').value = item.cliente;
  document.getElementById('input-producto').value = item.nombre_producto;
  document.getElementById('input-descripcion').value = item.descripcion_leve || '';
  document.getElementById('input-fecha-limite').value = item.fecha_limite;
  document.getElementById('input-password').value = item.password_plain || '';

  // Image Preview
  appState.selectedImageDataUrl = item.imagen_url;
  document.getElementById('dropzone-prompt').classList.add('hidden');
  document.getElementById('dropzone-preview-container').classList.remove('hidden');
  document.getElementById('dropzone-preview').src = item.imagen_url;

  openModal('modal-entregable');
}

function generateNewPassword() {
  const pass = generateSecurePassword(10);
  document.getElementById('input-password').value = pass;
}

function copyPasswordToClipboard() {
  const pass = document.getElementById('input-password').value;
  copyToClipboard(pass, 'Clave copiada al portapapeles');
}

async function saveDeliverable(event) {
  event.preventDefault();

  const id = document.getElementById('entregable-id').value;
  const cliente = document.getElementById('input-cliente').value.trim();
  const producto = document.getElementById('input-producto').value.trim();
  const descripcion = document.getElementById('input-descripcion').value.trim();
  const fechaLimite = document.getElementById('input-fecha-limite').value;
  const passwordPlain = document.getElementById('input-password').value.trim();

  if (!appState.selectedImageDataUrl) {
    showToast('Por favor sube o arrastra una imagen para el entregable.', 'error');
    return;
  }

  const passwordHash = await hashPassword(passwordPlain);

  if (id) {
    // Edit existing
    const index = appState.deliverables.findIndex(d => d.id === id);
    if (index !== -1) {
      appState.deliverables[index] = {
        ...appState.deliverables[index],
        cliente,
        nombre_producto: producto,
        descripcion_leve: descripcion,
        fecha_limite: fechaLimite,
        imagen_url: appState.selectedImageDataUrl,
        password_plain: passwordPlain,
        password_hash: passwordHash
      };
      showToast('Entregable actualizado con éxito.', 'success');
    }
  } else {
    // Create new
    const newDeliverable = {
      id: 'entregable-' + Date.now(),
      cliente,
      nombre_producto: producto,
      descripcion_leve: descripcion,
      fecha_limite: fechaLimite,
      imagen_url: appState.selectedImageDataUrl,
      password_plain: passwordPlain,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    appState.deliverables.unshift(newDeliverable);
    showToast('Nuevo entregable creado correctamente.', 'success');
  }

  saveDeliverablesToStorage();
  renderEnterpriseView();
  populateClientDemoSelect();
  closeModal('modal-entregable');
}

function deleteDeliverable(id) {
  if (confirm('¿Estás seguro de que deseas eliminar este entregable? Esta acción no se puede deshacer.')) {
    appState.deliverables = appState.deliverables.filter(d => d.id !== id);
    saveDeliverablesToStorage();
    renderEnterpriseView();
    populateClientDemoSelect();
    showToast('Entregable eliminado.', 'info');
  }
}

function copyClientLink(id) {
  const fullUrl = `${window.location.origin}${window.location.pathname}#cliente/${id}`;
  copyToClipboard(fullUrl, 'Enlace único de cliente copiado al portapapeles');
}

// Drag and Drop & File Select Handlers
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processImageFile(file);
  }
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Solo se permiten archivos de imagen.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    appState.selectedImageDataUrl = e.target.result;
    document.getElementById('dropzone-prompt').classList.add('hidden');
    document.getElementById('dropzone-preview-container').classList.remove('hidden');
    document.getElementById('dropzone-preview').src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage(event) {
  event.stopPropagation();
  appState.selectedImageDataUrl = null;
  document.getElementById('file-input').value = '';
  document.getElementById('dropzone-prompt').classList.remove('hidden');
  document.getElementById('dropzone-preview-container').classList.add('hidden');
  document.getElementById('dropzone-preview').src = '';
}

// Attach Drag & Drop Listeners
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        processImageFile(files[0]);
      }
    });
  }

  // Initialize App
  initAppState();
});

// =============================================================================
// CLIENT PORTAL MODULE (SECCIÓN 2)
// =============================================================================

function populateClientDemoSelect() {
  const select = document.getElementById('client-demo-select');
  if (!select) return;

  if (appState.deliverables.length === 0) {
    select.innerHTML = '<option value="">No hay entregables disponibles</option>';
    return;
  }

  select.innerHTML = appState.deliverables.map(item => `
    <option value="${item.id}" ${appState.activeClientDeliverableId === item.id ? 'selected' : ''}>
      ${escapeHtml(item.cliente)} - ${escapeHtml(item.nombre_producto)}
    </option>
  `).join('');
}

function selectClientDemo(deliverableId) {
  if (!deliverableId) return;
  window.location.hash = `cliente/${deliverableId}`;
}

function handleUrlRouting() {
  const hash = window.location.hash;

  if (hash.startsWith('#cliente/')) {
    const deliverableId = hash.replace('#cliente/', '');
    appState.activeClientDeliverableId = deliverableId;
    appState.clientAuthenticated = false; // Reset lock on URL change
    switchTab('cliente');
    renderClientPortalView();
  } else if (hash === '#ayuda') {
    switchTab('ayuda');
  } else {
    switchTab('empresa');
  }
}

function renderClientPortalView() {
  const lockScreen = document.getElementById('client-lock-screen');
  const unlockedPortal = document.getElementById('client-unlocked-portal');
  const lockSubtitle = document.getElementById('client-lock-subtitle');

  // Find active item
  let item = appState.deliverables.find(d => d.id === appState.activeClientDeliverableId);
  if (!item && appState.deliverables.length > 0) {
    item = appState.deliverables[0];
    appState.activeClientDeliverableId = item.id;
  }

  if (!item) {
    lockSubtitle.textContent = 'No se encontró ningún entregable con la clave especificada.';
    return;
  }

  lockSubtitle.textContent = `Ingresa la clave para desbloquear el entregable de ${item.cliente}.`;

  if (!appState.clientAuthenticated) {
    lockScreen.classList.remove('hidden');
    unlockedPortal.classList.add('hidden');
    document.getElementById('client-password-input').value = '';
    document.getElementById('lock-error-msg').classList.add('hidden');
  } else {
    lockScreen.classList.add('hidden');
    unlockedPortal.classList.remove('hidden');

    // Populate Unlocked View Details
    document.getElementById('client-view-name').textContent = item.cliente;
    document.getElementById('client-view-product').textContent = item.nombre_producto;
    document.getElementById('client-view-description').textContent = item.descripcion_leve || 'Sin descripción adicional.';
    document.getElementById('client-view-deadline').textContent = formatDateSpanish(item.fecha_limite);
    document.getElementById('client-view-id').textContent = `ID: #${item.id}`;
    document.getElementById('client-view-image').src = item.imagen_url;

    // Status Badge
    const deadlineInfo = calculateDeadlineStatus(item.fecha_limite);
    const statusBadge = document.getElementById('client-view-status');
    statusBadge.className = `status-badge ${deadlineInfo.class}`;
    statusBadge.textContent = deadlineInfo.label;
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

async function handleClientAuth(event) {
  event.preventDefault();
  const inputPass = document.getElementById('client-password-input').value.trim();
  const errorMsg = document.getElementById('lock-error-msg');

  const item = appState.deliverables.find(d => d.id === appState.activeClientDeliverableId);
  if (!item) {
    showToast('Entregable no encontrado.', 'error');
    return;
  }

  const inputHash = await hashPassword(inputPass);

  // Compare hashes securely
  if (inputHash === item.password_hash || inputPass === item.password_plain) {
    appState.clientAuthenticated = true;
    errorMsg.classList.add('hidden');
    renderClientPortalView();
    showToast('Acceso verificado correctamente.', 'success');
  } else {
    errorMsg.classList.remove('hidden');
    showToast('Clave de acceso incorrecta.', 'error');
  }
}

function lockClientPortal() {
  appState.clientAuthenticated = false;
  renderClientPortalView();
  showToast('Sesión de cliente cerrada.', 'info');
}

// Download Actions
function downloadClientImage() {
  const item = appState.deliverables.find(d => d.id === appState.activeClientDeliverableId);
  if (!item) return;

  const a = document.createElement('a');
  a.href = item.imagen_url;
  a.download = `${slugify(item.cliente)}_${slugify(item.nombre_producto)}_entregable.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Descargando imagen en alta resolución...', 'success');
}

function downloadClientPDF() {
  const item = appState.deliverables.find(d => d.id === appState.activeClientDeliverableId);
  if (!item) return;

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Cargando librería PDF, por favor intenta en unos segundos.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // PDF Styling Setup
  const deadlineInfo = calculateDeadlineStatus(item.fecha_limite);

  // Corporate Header
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('VisualDeliver', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE FORMAL DE ENTREGABLE VISUAL', 15, 26);

  // Date of generation
  const todayStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(8);
  doc.text(`Fecha de Emisión: ${todayStr}`, 150, 26);

  // Deliverable Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 45, 180, 50, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 45, 180, 50, 3, 3, 'D');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(item.cliente, 50, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTO:', 20, 63);
  doc.setFont('helvetica', 'normal');
  doc.text(item.nombre_producto, 50, 63);

  doc.setFont('helvetica', 'bold');
  doc.text('FECHA LÍMITE:', 20, 71);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDateSpanish(item.fecha_limite)} (${deadlineInfo.label})`, 50, 71);

  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPCIÓN:', 20, 79);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(item.descripcion_leve || 'Sin descripción.', 130);
  doc.text(splitDesc, 50, 79);

  // Image Section Heading
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('MUESTRA VISUAL EN ALTA RESOLUCIÓN', 15, 106);

  // Embed Image into PDF
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = item.imagen_url;

  img.onload = function() {
    try {
      doc.addImage(img, 'PNG', 15, 112, 180, 120, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not add image as PNG', e);
    }

    // PDF Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento generado mediante la plataforma VisualDeliver. Todos los derechos reservados.', 15, 280);

    doc.save(`Reporte_Entregable_${slugify(item.cliente)}_${slugify(item.nombre_producto)}.pdf`);
    showToast('Reporte PDF generado y descargado correctamente.', 'success');
  };

  img.onerror = function() {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento generado mediante la plataforma VisualDeliver. Todos los derechos reservados.', 15, 280);
    doc.save(`Reporte_Entregable_${slugify(item.cliente)}_${slugify(item.nombre_producto)}.pdf`);
    showToast('Reporte PDF generado.', 'success');
  };
}

// =============================================================================
// HELP CENTER & FAQ MODULE (SECCIÓN 3)
// =============================================================================

function switchHelpTab(tabName) {
  appState.activeHelpTab = tabName;

  document.querySelectorAll('.help-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.className = 'help-tab-btn pb-4 text-sm font-bold border-b-2 transition text-slate-500 hover:text-slate-800 border-transparent';
  });

  const activeBtn = document.getElementById(`help-tab-${tabName}`);
  if (activeBtn) {
    activeBtn.className = 'help-tab-btn active pb-4 text-sm font-bold border-b-2 transition';
  }

  document.querySelectorAll('.help-content').forEach(content => {
    content.classList.add('hidden');
  });

  const activeContent = document.getElementById(`help-content-${tabName}`);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }
}

function toggleFaq(buttonEl) {
  const answer = buttonEl.nextElementSibling;
  const icon = buttonEl.querySelector('i');

  if (answer.classList.contains('hidden')) {
    answer.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    answer.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

// =============================================================================
// NAVIGATION & MODAL HELPERS
// =============================================================================

function switchTab(tabName) {
  appState.activeTab = tabName;

  // Update Header Tabs UI
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeNav = document.getElementById(`nav-tab-${tabName}`);
  if (activeNav) activeNav.classList.add('active');

  // Update Section Views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.add('hidden');
  });

  const activeView = document.getElementById(`view-${tabName}`);
  if (activeView) activeView.classList.remove('hidden');

  if (tabName === 'empresa') {
    renderEnterpriseView();
  } else if (tabName === 'cliente') {
    renderClientPortalView();
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('hidden');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal-open');
  }
}

function openLightbox(imgSrc, caption) {
  document.getElementById('lightbox-img').src = imgSrc;
  document.getElementById('lightbox-caption').textContent = caption || '';
  openModal('modal-lightbox');
}

function openSupabaseModal() {
  const sbConfigRaw = localStorage.getItem(SUPABASE_CONFIG_KEY);
  if (sbConfigRaw) {
    try {
      const cfg = JSON.parse(sbConfigRaw);
      document.getElementById('sb-url').value = cfg.url || '';
      document.getElementById('sb-key').value = cfg.key || '';
    } catch(e) {}
  }
  openModal('modal-supabase');
}

function saveSupabaseConfig(event) {
  event.preventDefault();
  const url = document.getElementById('sb-url').value.trim();
  const key = document.getElementById('sb-key').value.trim();

  if (url && key) {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
    initSupabase(url, key);
    showToast('Configuración de Supabase guardada correctamente.', 'success');
  } else {
    clearSupabaseConfig();
  }

  updateSupabaseStatusUI();
  closeModal('modal-supabase');
}

function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
  appState.supabaseClient = null;
  document.getElementById('sb-url').value = '';
  document.getElementById('sb-key').value = '';
  updateSupabaseStatusUI();
  showToast('Desconectado de Supabase. Modo LocalStorage activo.', 'info');
  closeModal('modal-supabase');
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) lucide.createIcons();
}

// =============================================================================
// TOAST NOTIFICATIONS & UTILS
// =============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');

  let bgClass = 'bg-slate-900 text-white';
  let iconName = 'info';

  if (type === 'success') {
    bgClass = 'bg-emerald-600 text-white';
    iconName = 'check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-red-600 text-white';
    iconName = 'alert-triangle';
  }

  toast.className = `toast flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  if (window.lucide) {
    lucide.createIcons();
  }

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copiado al portapapeles', 'success');
  }).catch(err => {
    showToast('Error al copiar al portapapeles', 'error');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateSpanish(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '_');
}
