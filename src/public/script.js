// ─── STATE & SESSION MANAGEMENT ─────────────────────────────────────────────
let activeToken = localStorage.getItem('cart_session_token') || '';
let activeTenantName = '';

// ─── BOOTSTRAP ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Initialize parts of page
  initParticles();
  initScrollAnimations();
  initTenantSelect();
  bindForms();
  initHeroStats();

  // Load cart initially if token exists
  if (activeToken) {
    loadCartAndCheckout();
  }
});

// ─── PARTICLE CANVAS BACKGROUND ──────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = (canvas.width = window.innerWidth);
    height = (canvas.height = window.innerHeight);
  });

  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      dx: Math.random() * 0.4 - 0.2,
      dy: Math.random() * 0.4 - 0.2,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.dx;
      p.y += p.dy;

      // Wrap around bounds
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// ─── SCROLL & SECTION NAVIGATION ─────────────────────────────────────────────
function initScrollAnimations() {
  // Intersection Observer for scroll entrance animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Change Header style on scroll
  const header = document.getElementById('mainHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Active navigation state on scroll
    const scrollPos = window.scrollY + 100;
    document.querySelectorAll('section').forEach((section) => {
      const id = section.getAttribute('id');
      if (!id) return;
      const top = section.offsetTop;
      const height = section.offsetHeight;

      if (scrollPos >= top && scrollPos < top + height) {
        document.querySelectorAll('.nav-link').forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    mainNav.classList.toggle('active');
    if (mainNav.classList.contains('active')) {
      mainNav.style.display = 'flex';
      mainNav.style.flexDirection = 'column';
      mainNav.style.position = 'absolute';
      mainNav.style.top = '100%';
      mainNav.style.left = '0';
      mainNav.style.width = '100%';
      mainNav.style.background = 'rgba(3, 7, 18, 0.95)';
      mainNav.style.padding = '20px';
      mainNav.style.borderBottom = '1px solid var(--border)';
    } else {
      mainNav.style.display = '';
    }
  });

  // Smooth scroll links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        // Close mobile menu if open
        mobileMenuBtn.classList.remove('active');
        mainNav.classList.remove('active');
        mainNav.style.display = '';

        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: 'smooth',
        });
      }
    });
  });
}

// ─── HERO STATS COUNTER ──────────────────────────────────────────────────────
function initHeroStats() {
  const statElements = document.querySelectorAll('.metric-value');

  statElements.forEach((el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    let count = 0;
    const duration = 1500; // ms
    const increment = Math.max(1, Math.ceil(target / (duration / 16)));

    const timer = setInterval(() => {
      count += increment;
      if (count >= target) {
        count = target;
        clearInterval(timer);
      }
      el.innerText = count.toLocaleString();
    }, 16);
  });
}

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove toast after 4s
  setTimeout(() => {
    toast.style.animation = 'toast-slide-in 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// ─── UNIVERSAL API CALLS ─────────────────────────────────────────────────────
async function api(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (activeToken) headers['x-session-token'] = activeToken;
  if (options.body) headers['Content-Type'] = 'application/json';

  const method = options.method || 'GET';

  let body;
  try {
    const res = await fetch(endpoint, { ...options, headers });
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    renderInspector({
      request: {
        method,
        endpoint,
        headers,
        payload: options.body ? JSON.parse(options.body) : null,
      },
      response: { status: res.status, statusText: res.statusText, body },
    });

    return { ok: res.ok, status: res.status, data: body };
  } catch (err) {
    renderInspector({
      request: { method, endpoint, headers },
      connectionError: err.message,
    });
    throw err;
  }
}

// ─── TENANT DROPDOWN MANAGER ─────────────────────────────────────────────────
function initTenantSelect() {
  const sel = document.getElementById('tenantSelect');
  let tenants = [];
  try {
    tenants = JSON.parse(localStorage.getItem('cart_tenants') || '[]');
  } catch {}

  sel.innerHTML = '<option value="" disabled selected>Select user...</option>';
  tenants.forEach((t) => {
    const o = document.createElement('option');
    o.value = t.token;
    o.innerText = `${t.username} (${t.email})`;
    sel.appendChild(o);
  });

  if (activeToken) {
    sel.value = activeToken;
    verifyTenant(activeToken, tenants);
  }

  sel.addEventListener('change', (e) => {
    activeToken = e.target.value;
    localStorage.setItem('cart_session_token', activeToken);
    const t = tenants.find((x) => x.token === activeToken);
    if (t) {
      activeTenantName = t.username;
      showTokenDisplay(activeToken);
      showToast(`Switched active tenant to ${t.username}`, 'success');
    }
    loadCartAndCheckout();
  });
}

async function verifyTenant(token, tenants = []) {
  try {
    const { ok, data } = await api('/api/users/me');
    if (ok) {
      activeTenantName = data.data.username;
      showTokenDisplay(token);
      updateApiDocsWithUserData({
        username: data.data.username,
        email: data.data.email,
        userId: data.data.userId,
        sessionToken: token,
      });
      loadCartAndCheckout();
    } else {
      clearSession();
    }
  } catch {
    showToast('Failed to reach API server. Is it running on port 5000?', 'error');
  }
}

/**
 * Updates the API Documentation code blocks in the Auth tab
 * to reflect the currently authenticated user's real data.
 */
function updateApiDocsWithUserData(user) {
  if (!user || !user.username) return;

  // Show the live session banner
  const banner = document.getElementById('apiLiveSessionBanner');
  const bannerUsername = document.getElementById('apiLiveUsername');
  if (banner && bannerUsername) {
    bannerUsername.innerText = user.username;
    banner.style.display = 'flex';
  }

  // Update POST /api/users/register — Request Body example
  const regReqEl = document.getElementById('docsRegisterRequest');
  if (regReqEl) {
    regReqEl.innerText = JSON.stringify({ username: user.username, email: user.email }, null, 2);
  }

  // Update POST /api/users/register — Response example
  const regResEl = document.getElementById('docsRegisterResponse');
  if (regResEl) {
    const tokenDisplay = user.sessionToken
      ? user.sessionToken.substring(0, 8) + '-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      : 'd4e21a78-xxxx-...';
    const userIdDisplay = user.userId
      ? user.userId.toString().substring(0, 8) + '...'
      : '64a27f6...';
    regResEl.innerText = JSON.stringify({
      success: true,
      data: {
        userId: userIdDisplay,
        username: user.username,
        email: user.email,
        sessionToken: tokenDisplay,
      },
    }, null, 2);
  }

  // Update GET /api/users/me — Headers example (show real token)
  const meHeaderEl = document.getElementById('docsMeTokenHeader');
  if (meHeaderEl) {
    const tokenDisplay = user.sessionToken
      ? user.sessionToken.substring(0, 8) + '-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      : '<your-token-here>';
    meHeaderEl.innerText = `x-session-token: ${tokenDisplay}`;
  }

  // Update GET /api/users/me — Response example
  const meResEl = document.getElementById('docsMeResponse');
  if (meResEl) {
    const userIdDisplay = user.userId
      ? user.userId.toString().substring(0, 8) + '...'
      : '...';
    meResEl.innerText = JSON.stringify({
      success: true,
      data: {
        userId: userIdDisplay,
        username: user.username,
        email: user.email,
      },
    }, null, 2);
  }
}

function showTokenDisplay(token) {
  const d = document.getElementById('tokenDisplay');
  document.getElementById('tokenValue').innerText = token.substring(0, 8) + '...';
  document.getElementById('tokenDisplay').title = token;
  d.style.display = 'flex';
}

function clearSession() {
  activeToken = '';
  activeTenantName = '';
  localStorage.removeItem('cart_session_token');
  document.getElementById('tenantSelect').value = '';
  document.getElementById('tokenDisplay').style.display = 'none';
  resetUI();
}

// ─── USER ONBOARDING & FORMS ─────────────────────────────────────────────────
function bindForms() {
  // Onboard / Register user
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const btn = document.getElementById('regBtn');

    btn.disabled = true;
    btn.innerHTML = `
      <svg class="btn-spinner" width="14" height="14" viewBox="0 0 50 50" style="animation: spin 1s linear infinite; margin-right: 8px;">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="80, 200" stroke-linecap="round"></circle>
      </svg>Onboarding...`;

    try {
      const { ok, data } = await api('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email }),
      });

      if (ok) {
        const tenant = {
          username: data.data.username,
          email: data.data.email,
          token: data.data.sessionToken,
          userId: data.data.userId,
        };

        let tenants = JSON.parse(localStorage.getItem('cart_tenants') || '[]');
        if (!tenants.some((t) => t.token === tenant.token)) {
          tenants.push(tenant);
        }
        localStorage.setItem('cart_tenants', JSON.stringify(tenants));

        activeToken = tenant.token;
        localStorage.setItem('cart_session_token', activeToken);
        activeTenantName = tenant.username;

        e.target.reset();
        initTenantSelect();

        document.getElementById('tenantSelect').value = activeToken;
        showTokenDisplay(activeToken);

        // Update API docs to reflect this user's real data
        updateApiDocsWithUserData({
          username: tenant.username,
          email: tenant.email,
          userId: tenant.userId,
          sessionToken: tenant.token,
        });

        showToast(`Tenant onboarded: ${tenant.username}`, 'success');
        loadCartAndCheckout();
      } else {
        if (data.details && data.details.length) {
          const detailMsgs = data.details.map((d) => `${d.field}: ${d.message}`).join(', ');
          showToast(detailMsgs, 'error');
        } else {
          showToast(data.error || 'Onboarding failed', 'error');
        }
      }
    } catch (err) {
      showToast('Network error during onboarding.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" stroke-width="2"/><line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="2"/></svg>
        Onboard User`;
    }
  });

  // Custom Item Form
  document.getElementById('customItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('customItemError');
    errEl.style.display = 'none';

    if (!activeToken) {
      showToast('Please onboard or select an active user first.', 'error');
      return;
    }

    const payload = {
      productId: document.getElementById('custPid').value.trim(),
      name: document.getElementById('custName').value.trim(),
      category: document.getElementById('custCategory').value.trim().toLowerCase(),
      price: parseFloat(document.getElementById('custPrice').value),
      quantity: parseInt(document.getElementById('custQty').value),
    };

    try {
      const { ok, data } = await api('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (ok) {
        e.target.reset();
        document.getElementById('custQty').value = 1;
        loadCartAndCheckout();
        showToast(`Added custom item: ${payload.name}`, 'success');
      } else {
        if (data.details && data.details.length) {
          errEl.innerText = '⚠️ ' + data.details.map((d) => `${d.field}: ${d.message}`).join(' · ');
          errEl.style.display = 'block';
        } else {
          errEl.innerText = '⚠️ ' + (data.error || 'Failed to add custom item');
          errEl.style.display = 'block';
        }
      }
    } catch {
      showToast('Network error while adding custom item.', 'error');
    }
  });
}

// ─── CATALOG QUICK-ADD ───────────────────────────────────────────────────────
async function quickAddItem(pid, name, category, price) {
  if (!activeToken) {
    showToast('Please register or select a tenant first.', 'error');
    // Scroll smoothly to registration
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Visual click effect on the catalog card
  const itemCard = document.getElementById(`cat-${pid.replace('p_', '')}`);
  if (itemCard) {
    itemCard.style.transform = 'scale(0.96) translateY(2px)';
    setTimeout(() => (itemCard.style.transform = ''), 100);
  }

  const { ok, data } = await api('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId: pid, name, category, price, quantity: 1 }),
  });

  if (ok) {
    loadCartAndCheckout();
    showToast(`Added to cart: ${name}`, 'success');
  } else {
    showToast(data.error || 'Could not add item to cart', 'error');
  }
}

// ─── QUANTITY CONTROL & DELETIONS ────────────────────────────────────────────
async function modifyQuantity(pid, current, delta) {
  const newQty = current + delta;
  if (newQty < 1) {
    removeItem(pid);
    return;
  }

  const { ok } = await api(`/api/cart/items/${pid}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity: newQty }),
  });

  if (ok) {
    loadCartAndCheckout();
  }
}

async function removeItem(pid) {
  const { ok } = await api(`/api/cart/items/${pid}`, {
    method: 'DELETE',
  });

  if (ok) {
    loadCartAndCheckout();
    showToast('Item removed from cart', 'success');
  }
}

async function clearCart() {
  if (!activeToken) {
    showToast('No active tenant selected.', 'error');
    return;
  }

  const { ok, data } = await api('/api/cart', {
    method: 'DELETE',
  });

  if (ok) {
    loadCartAndCheckout();
    showToast('Cart cleared successfully.', 'success');
  } else {
    showToast((data && data.error) ? data.error : 'Failed to clear cart. Please try again.', 'error');
  }
}

// ─── LOAD & CALCULATE DISCOUNTS ──────────────────────────────────────────────
async function loadCartAndCheckout() {
  if (!activeToken) {
    resetUI();
    return;
  }

  try {
    // Get raw cart items (internal loading, doesn't need to overwrite main inspector log)
    const cartRes = await fetch('/api/cart', {
      headers: { 'x-session-token': activeToken },
    });
    const cartData = await cartRes.json();

    // Call checkout summary (via API inspector-wrapped helper)
    const { ok, data } = await api('/api/checkout/summary');

    renderCart(cartData.data?.items || []);
    if (ok && data.data) {
      renderPromoSummary(data.data);
    } else {
      renderPromoSummary(null);
    }
  } catch (err) {
    showToast('Failed to fetch updated cart details.', 'error');
    resetUI();
  }
}

// ─── RENDERING VIEWS ─────────────────────────────────────────────────────────
function renderCart(items) {
  const el = document.getElementById('cartItemsList');
  document.getElementById('cartItemCount').innerText = items.length;

  if (!items.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <p>Active cart is empty.<br>Choose items from catalog to start calculations.</p>
      </div>`;
    return;
  }

  el.innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span class="item-cat">${item.category} · ₹${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} each</span>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn" onclick="modifyQuantity('${item.productId}', ${item.quantity}, -1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="modifyQuantity('${item.productId}', ${item.quantity}, 1)">+</button>
        </div>
        <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <button class="btn-remove" onclick="removeItem('${item.productId}')" title="Remove">🗑️</button>
      </div>`;
    el.appendChild(row);
  });
}

function renderPromoSummary(summary) {
  if (!summary) {
    resetPromo();
    return;
  }

  const sub = summary.subtotal || 0;
  const tier = summary.appliedDiscounts?.tier || { name: 'None', percentage: 0, amount: 0 };
  const div = summary.appliedDiscounts?.diversity || { name: 'None', percentage: 0, amount: 0 };
  const total = summary.totalDiscount || 0;
  const final = summary.finalTotal || 0;

  document.getElementById('summarySubtotal').innerText = fmt(sub);

  document.getElementById('tierDiscountLabel').innerText = tier.name;
  document.getElementById('tierDiscountPct').innerText = `${tier.percentage}%`;
  document.getElementById('tierDiscountAmount').innerText = `−${fmt(tier.amount)}`;

  document.getElementById('diversityDiscountLabel').innerText = div.name;
  document.getElementById('diversityDiscountPct').innerText = `${div.percentage}%`;
  document.getElementById('diversityDiscountAmount').innerText = `−${fmt(div.amount)}`;

  document.getElementById('totalSavings').innerText = fmt(total);
  document.getElementById('summaryTotal').innerText = fmt(final);

  // Update applied formula text box
  document.getElementById('formulaDisplay').innerText = `subtotal = ${fmt(sub)} | discount = ${fmt(total)} (${tier.percentage + div.percentage}%) | final = ${fmt(final)}`;

  // Display top tier banner badge
  const badge = document.getElementById('activeTierBadge');
  if (tier.percentage > 0 || div.percentage > 0) {
    badge.style.display = 'flex';
    const tierNameStr = tier.name !== 'None' && tier.name !== 'No discount tier applied' ? tier.name : '';
    const divNameStr = div.percentage > 0 ? ' + Category Diversity Reward' : '';
    badge.innerHTML = `
      <span class="badge-dot" style="background: var(--warning)"></span>
      <span>🎯 <strong>${tierNameStr}${divNameStr}</strong> (${tier.percentage + div.percentage}% total discount applied)</span>
    `;
  } else {
    badge.style.display = 'none';
  }
}

function fmt(num) {
  return '₹' + (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── API INSPECTOR RENDERING ─────────────────────────────────────────────────
function renderInspector(envelope) {
  document.getElementById('inspectorPlaceholder').style.display = 'none';
  document.getElementById('inspectorRequest').style.display = 'block';
  document.getElementById('inspectorResponse').style.display = 'block';

  const rawToggle = document.getElementById('rawToggle');
  if (rawToggle) rawToggle.style.display = 'block';

  const req = envelope.request || {};
  const res = envelope.response || {};

  // Method badge class mapping
  const methodEl = document.getElementById('reqMethod');
  methodEl.innerText = req.method || 'GET';
  methodEl.className = `inspector-badge method-${(req.method || 'GET').toLowerCase()}`;

  // Endpoint path & status badge
  document.getElementById('reqEndpoint').innerText = req.endpoint || '';
  const statusEl = document.getElementById('resStatus');
  const code = res.status || 0;
  statusEl.innerText = code ? `${code} ${res.statusText || ''}` : envelope.connectionError ? 'CONN_ERR' : '';
  statusEl.className = `inspector-status ${code >= 400 ? 'status-4xx' : 'status-2xx'}`;

  // Headers list
  const headersEl = document.getElementById('reqHeaders');
  headersEl.innerHTML = '';
  Object.entries(req.headers || {}).forEach(([k, v]) => {
    headersEl.appendChild(makeRow(k, v));
  });

  // Payload body list
  const payloadBlock = document.getElementById('reqPayloadBlock');
  const payloadEl = document.getElementById('reqPayload');
  payloadEl.innerHTML = '';
  if (req.payload && typeof req.payload === 'object') {
    payloadBlock.style.display = 'block';
    renderObj(req.payload, payloadEl, 0);
  } else {
    payloadBlock.style.display = 'none';
  }

  // Response body JSON breakdown
  const responseBodyEl = document.getElementById('resBody');
  responseBodyEl.innerHTML = '';
  const body = res.body;
  if (body && typeof body === 'object') {
    renderObj(body, responseBodyEl, 0);
  } else if (body) {
    responseBodyEl.appendChild(makeRow('body', body));
  } else if (envelope.connectionError) {
    responseBodyEl.appendChild(makeRow('error', envelope.connectionError));
  }

  // Full Raw JSON display
  const jsonViewer = document.getElementById('jsonViewer');
  if (jsonViewer) {
    jsonViewer.innerText = JSON.stringify(envelope, null, 2);
  }
}

function makeRow(key, val) {
  const row = document.createElement('div');
  row.className = 'inspector-row';

  const keySpan = document.createElement('span');
  keySpan.className = 'inspector-key';
  keySpan.innerText = key + ':';

  const valSpan = document.createElement('span');
  let typeClass = 'val-string';
  let formattedText = '';

  if (val === null || val === undefined) {
    typeClass = 'val-null';
    formattedText = 'null';
  } else if (typeof val === 'number') {
    typeClass = 'val-number';
    formattedText = val.toString();
  } else if (typeof val === 'boolean') {
    typeClass = 'val-bool';
    formattedText = val.toString();
  } else if (typeof val === 'object') {
    formattedText = JSON.stringify(val);
  } else {
    formattedText = `"${val}"`;
  }

  valSpan.className = `inspector-val ${typeClass}`;
  valSpan.innerText = formattedText;

  row.append(keySpan, valSpan);
  return row;
}

function renderObj(obj, container, depth) {
  if (depth > 2) {
    container.appendChild(makeRow('...', JSON.stringify(obj)));
    return;
  }

  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && depth < 2) {
      const wrap = document.createElement('div');
      wrap.style.cssText = `margin-top: 4px; padding-left: ${depth * 12}px;`;

      const title = document.createElement('div');
      title.style.cssText = 'font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 2px;';
      title.innerText = k;

      wrap.appendChild(title);
      renderObj(v, wrap, depth + 1);
      container.appendChild(wrap);
    } else {
      const row = makeRow(k, Array.isArray(v) ? `[${v.length} items]` : v);
      row.style.paddingLeft = `${depth * 12}px`;
      container.appendChild(row);
    }
  });
}

function toggleInspector() {
  const body = document.getElementById('inspectorBody');
  const btn = document.getElementById('toggleJsonBtn');

  if (body.style.display === 'none') {
    body.style.display = 'block';
    btn.setAttribute('title', 'Minimize');
  } else {
    body.style.display = 'none';
    btn.setAttribute('title', 'Expand');
  }
}

// ─── API DOCUMENTATION TABS ──────────────────────────────────────────────────
function switchTab(tabName, el) {
  // Toggle active tab buttons
  document.querySelectorAll('.api-tab').forEach((b) => b.classList.remove('active'));
  el.classList.add('active');

  // Toggle active content divs
  document.querySelectorAll('.api-tab-content').forEach((c) => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ─── UI CLEANUP HELPERS ──────────────────────────────────────────────────────
function resetUI() {
  document.getElementById('cartItemsList').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🛒</div>
      <p>No tenant selected or cart is empty.<br>Register a user and click items above.</p>
    </div>`;
  document.getElementById('cartItemCount').innerText = '0';
  resetPromo();

  // Hide inspector sections and reset values
  document.getElementById('inspectorPlaceholder').style.display = 'block';
  document.getElementById('inspectorRequest').style.display = 'none';
  document.getElementById('inspectorResponse').style.display = 'none';

  const rawToggle = document.getElementById('rawToggle');
  if (rawToggle) rawToggle.style.display = 'none';
}

function resetPromo() {
  document.getElementById('summarySubtotal').innerText = '₹0.00';
  document.getElementById('tierDiscountLabel').innerText = 'Tier Discount';
  document.getElementById('tierDiscountPct').innerText = '0%';
  document.getElementById('tierDiscountAmount').innerText = '−₹0.00';
  document.getElementById('diversityDiscountLabel').innerText = 'Diversity Bonus';
  document.getElementById('diversityDiscountPct').innerText = '0%';
  document.getElementById('diversityDiscountAmount').innerText = '−₹0.00';
  document.getElementById('totalSavings').innerText = '₹0.00';
  document.getElementById('summaryTotal').innerText = '₹0.00';
  document.getElementById('activeTierBadge').style.display = 'none';
  document.getElementById('formulaDisplay').innerText = 'subtotal = ₹0.00 | discount = ₹0.00 | final = ₹0.00';
}
