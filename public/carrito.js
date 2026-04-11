/**
 * carrito.js — lógica de carrito cliente
 * Usá addToCart(codigo, nombre) desde cualquier página
 * El carrito persiste en localStorage bajo 'bgm_cart'
 */

const CART_KEY  = 'bgm_cart';
const WA_NUMBER = '5493415317707';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateBadges(cart);
}

// Actualiza TODOS los badges visibles (nav + float)
function updateBadges(cart) {
  var count = Object.values(cart).reduce(function(s, i) { return s + i.cantidad; }, 0);

  // Badge nav
  var nav = document.getElementById('nav-carrito-count');
  if (nav) {
    nav.textContent = count > 0 ? count : '';
    nav.classList.toggle('visible', count > 0);
  }

  // Badge flotante
  var flt = document.getElementById('cart-float-count');
  if (flt) flt.textContent = count > 0 ? count : '';

  // Botón flotante — solo visible si hay items
  var cf = document.getElementById('cartFloat');
  if (cf) cf.classList.toggle('cart-float--activo', count > 0);
}

function addToCart(codigo, nombre) {
  var cart = getCart();
  if (cart[codigo]) {
    cart[codigo].cantidad++;
  } else {
    cart[codigo] = { codigo: codigo, nombre: nombre, cantidad: 1 };
  }
  saveCart(cart);
  animateBadge();
  showNotif(nombre, 'success');
}

// Pulso en el badge del nav al agregar
function animateBadge() {
  var badge = document.getElementById('nav-carrito-count');
  if (!badge) return;
  badge.classList.remove('badge-pulse');
  // reflow para reiniciar la animación
  void badge.offsetWidth;
  badge.classList.add('badge-pulse');
  setTimeout(function() { badge.classList.remove('badge-pulse'); }, 500);
}

// Notificación tipo toast profesional
function showNotif(nombre, type) {
  var container = document.getElementById('notifContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifContainer';
    document.body.appendChild(container);
  }

  var n = document.createElement('div');
  n.className = 'notification ' + (type || 'info');

  var icono = type === 'success' ? iconoCheck() : type === 'warning' ? '⚠' : type === 'error' ? '✕' : 'ℹ';
  var texto = type === 'success'
    ? '<strong>Agregado al pedido</strong><br><span class="notif-nombre">' +
      nombre.substring(0, 45) + (nombre.length > 45 ? '…' : '') + '</span>'
    : nombre;

  n.innerHTML = '<span class="notif-icon">' + icono + '</span><span class="notif-text">' + texto + '</span>';
  container.appendChild(n);

  // Barra de progreso
  var bar = document.createElement('div');
  bar.className = 'notif-bar';
  n.appendChild(bar);

  setTimeout(function() {
    n.classList.add('hide');
    setTimeout(function() { n.remove(); }, 400);
  }, 2800);
}

function iconoCheck() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
}

// Delegar clicks en botones de carrito
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.btn-carrito-mini, .prod-card-btn-carrito');
  if (btn) {
    var codigo = btn.dataset.codigo;
    var nombre = btn.dataset.nombre;
    addToCart(codigo, nombre);
    // Micro-feedback en el botón
    btn.classList.add('btn-added');
    setTimeout(function() { btn.classList.remove('btn-added'); }, 600);
  }
});

// Inicializar badges al cargar
(function() {
  updateBadges(getCart());
})();
