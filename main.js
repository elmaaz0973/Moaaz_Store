/* ============================================
   MOAAZ STORE - main.js
   Backend: Google Sheets via Apps Script
   ============================================ */

/* ضع رابط Apps Script بتاعك هنا (نفس الرابط لكل العمليات: login + products) */
const API = "https://script.google.com/macros/s/AKfycbyo3iXSLXb81XlZaavJQ-tubFPH2JK605-UPUIIw0tHB3RwcZBRdqLPcFq-ONOL73iOcg/exec";

/* ============ Elements ============ */
const title = document.getElementById('title');
const price = document.getElementById('price');
const taxes = document.getElementById('taxes');
const ads = document.getElementById('ads');
const discount = document.getElementById('discount');
const total = document.getElementById('total');
const count = document.getElementById('count');
const category = document.getElementById('category');
const submitBtn = document.getElementById('submit');
const cancelEditBtn = document.getElementById('cancelEdit');
const formTitle = document.getElementById('formTitle');

let mood = 'create';
let editId = null;
let dataPro = [];
let searchMood = 'title';

/* ============ Toast ============ */
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => { t.className = 'toast'; }, 2800);
}

/* ============ Login ============ */
const loginScreen = document.getElementById('loginScreen');
const app = document.getElementById('app');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const rememberEl = document.getElementById('remember');
const errorBox = document.getElementById('errorBox');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');

function showApp(user) {
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    document.getElementById('userNameLabel').textContent = (user && (user.name || user.username)) || '';
    loadProducts();
}

function showLogin() {
    app.style.display = 'none';
    loginScreen.style.display = 'flex';
}

(function checkAuth() {
    const session = localStorage.getItem('storeUser') || sessionStorage.getItem('storeUser');
    if (session) {
        try { showApp(JSON.parse(session)); }
        catch (e) { showLogin(); }
    } else {
        showLogin();
    }
})();

(function fillRemembered() {
    const saved = localStorage.getItem('rememberedStoreUser');
    if (saved) {
        usernameEl.value = saved;
        rememberEl.checked = true;
    }
})();

function togglePassword() {
    const isPass = passwordEl.type === 'password';
    passwordEl.type = isPass ? 'text' : 'password';
    document.getElementById('togglePass').textContent = isPass ? '🙈' : '👁️';
}

function hideError() { errorBox.style.display = 'none'; }
function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
}

[usernameEl, passwordEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    el.addEventListener('input', hideError);
});

function setLoginLoading(state) {
    loginBtn.disabled = state;
    loginSpinner.style.display = state ? 'inline-block' : 'none';
    loginBtnText.textContent = state ? 'Checking...' : 'Sign In';
}

async function login() {
    hideError();
    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) {
        showError('Please enter username and password');
        return;
    }
    if (API.includes('PASTE_YOUR')) {
        showError('Apps Script URL is not set yet. Add it in main.js');
        return;
    }

    setLoginLoading(true);
    try {
        const res = await fetch(API, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username, password })
        });
        const data = await res.json();

        if (data && data.success) {
            const userInfo = {
                username: data.username || username,
                name: data.name || username,
                role: data.role || '',
                loggedAt: new Date().toISOString()
            };
            if (rememberEl.checked) {
                localStorage.setItem('rememberedStoreUser', username);
                localStorage.setItem('storeUser', JSON.stringify(userInfo));
            } else {
                localStorage.removeItem('rememberedStoreUser');
                sessionStorage.setItem('storeUser', JSON.stringify(userInfo));
            }
            loginBtnText.textContent = 'Welcome ✓';
            setTimeout(() => { setLoginLoading(false); showApp(userInfo); }, 350);
        } else {
            setLoginLoading(false);
            showError(data.message || 'Invalid username or password');
        }
    } catch (err) {
        setLoginLoading(false);
        showError('Connection error. Please check your internet and try again.');
    }
}

function logout() {
    localStorage.removeItem('storeUser');
    sessionStorage.removeItem('storeUser');
    usernameEl.value = '';
    passwordEl.value = '';
    showLogin();
}

/* ============ Total Calculation ============ */
function getTotal() {
    if (price.value !== '') {
        const result = (+price.value + +taxes.value + +ads.value) - +discount.value;
        total.textContent = result;
        total.classList.toggle('zero', result <= 0);
    } else {
        total.textContent = '0';
        total.classList.add('zero');
    }
}

/* ============ Create / Update ============ */
async function submitForm() {
    if (title.value.trim() === '' || price.value === '') {
        showToast('Please enter at least product name and price', 'error');
        return;
    }

    const product = {
        title: title.value.trim().toLowerCase(),
        price: +price.value || 0,
        taxes: +taxes.value || 0,
        ads: +ads.value || 0,
        discount: +discount.value || 0,
        total: +total.textContent || 0,
        count: +count.value || 1,
        category: category.value.trim().toLowerCase()
    };

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';

    try {
        if (mood === 'create') {
            await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'add', ...product }) });
            showToast('Product added successfully');
        } else {
            await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'update', id: editId, ...product }) });
            showToast('Product updated successfully');
            cancelEditMode();
        }
        clearData();
        await loadProducts();
    } catch (err) {
        showToast('Something went wrong while saving', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = mood === 'create' ? 'Create Product' : originalText;
    }
}

function clearData() {
    title.value = '';
    price.value = '';
    taxes.value = '';
    ads.value = '';
    discount.value = '';
    total.textContent = '0';
    total.classList.add('zero');
    count.value = '';
    category.value = '';
}

function cancelEditMode() {
    mood = 'create';
    editId = null;
    submitBtn.textContent = 'Create Product';
    formTitle.textContent = '➕ Add New Product';
    cancelEditBtn.style.display = 'none';
    count.style.display = 'block';
    clearData();
}

/* ============ Load from Google Sheet ============ */
async function loadProducts() {
    const loadingRow = document.getElementById('loadingRow');
    loadingRow.style.display = 'block';
    try {
        const res = await fetch(API);
        const data = await res.json();
        dataPro = Array.isArray(data) ? data : [];
        renderTable(dataPro);
        updateStats();
    } catch (err) {
        showToast('Failed to load products from Google Sheet', 'error');
    } finally {
        loadingRow.style.display = 'none';
    }
}

/* ============ Render ============ */
function renderTable(list) {
    const tbody = document.getElementById('tbody');
    const emptyState = document.getElementById('emptyState');

    if (!list.length) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tbody.innerHTML = list.map((p, i) => row(p, i)).join('');
    }

    const deleteAllBox = document.getElementById('deleteAll');
    deleteAllBox.innerHTML = dataPro.length > 0
        ? `<button class="delete-all-btn" onclick="deleteAll()">🗑️ Delete All (${dataPro.length})</button>`
        : '';
}

function row(p, i) {
    return `
    <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(p.title)}</td>
        <td>${p.category ? `<span class="cat-badge">${escapeHtml(p.category)}</span>` : '-'}</td>
        <td>${p.count || 1}</td>
        <td>${p.price}</td>
        <td><strong>${p.total}</strong></td>
        <td>
            <div class="row-actions">
                <button class="edit-btn" onclick="updateData('${p.id}')" title="Edit">✏️</button>
                <button class="del-btn" onclick="deleteData('${p.id}')" title="Delete">🗑️</button>
            </div>
        </td>
    </tr>`;
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/* ============ Stats ============ */
function updateStats() {
    document.getElementById('statCount').textContent = dataPro.length;
    const totalValue = dataPro.reduce((sum, p) => sum + (+p.total || 0), 0);
    document.getElementById('statValue').textContent = totalValue;
    const categories = new Set(dataPro.map(p => p.category).filter(Boolean));
    document.getElementById('statCategories').textContent = categories.size;
}

/* ============ Delete ============ */
async function deleteData(id) {
    if (!confirm('Delete this product?')) return;
    try {
        await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });
        showToast('Product deleted');
        await loadProducts();
    } catch (err) {
        showToast('Failed to delete product', 'error');
    }
}

async function deleteAll() {
    if (!confirm('Delete ALL products? This cannot be undone.')) return;
    try {
        await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'deleteAll' }) });
        showToast('All products deleted');
        await loadProducts();
    } catch (err) {
        showToast('Failed to delete all products', 'error');
    }
}

/* ============ Update (edit mode) ============ */
function updateData(id) {
    const p = dataPro.find(x => String(x.id) === String(id));
    if (!p) return;

    title.value = p.title;
    price.value = p.price;
    taxes.value = p.taxes || '';
    ads.value = p.ads || '';
    discount.value = p.discount || '';
    category.value = p.category;
    count.value = p.count || '';

    getTotal();
    mood = 'update';
    editId = id;
    submitBtn.textContent = 'Update Product';
    formTitle.textContent = '✏️ Edit Product';
    cancelEditBtn.style.display = 'block';
    count.style.display = 'none';

    window.scroll({ top: 0, behavior: 'smooth' });
}

/* ============ Search ============ */
function getSearchMood(mode) {
    searchMood = mode;
    document.getElementById('modeTitle').classList.toggle('active', mode === 'title');
    document.getElementById('modeCategory').classList.toggle('active', mode === 'category');
    searchData(document.getElementById('search').value);
}

function searchData(value) {
    const term = value.toLowerCase().trim();
    if (!term) { renderTable(dataPro); return; }
    const filtered = dataPro.filter(p => {
        const field = searchMood === 'title' ? p.title : p.category;
        return (field || '').toLowerCase().includes(term);
    });
    renderTable(filtered);
}

/* ============ Dark Mode ============ */
function toggleMode() {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    document.getElementById('modeBtn').textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('storeMode', isLight ? 'light' : 'dark');
}

if (localStorage.getItem('storeMode') === 'light') {
    document.body.classList.add('light');
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('modeBtn').textContent = '☀️';
    });
}

getTotal();
