/**
 * carrito-page.js — lógica exclusiva de la página /carrito
 * Requiere carrito.js cargado antes
 */

(function() {

function renderCarrito() {
  var cart    = getCart();
  var items   = Object.values(cart);
  var empty   = document.getElementById('cartEmpty');
  var list    = document.getElementById('cartItems');
  var actions = document.getElementById('cartActions');

  if (items.length === 0) {
    empty.style.display  = '';
    list.style.display   = 'none';
    actions.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  list.style.display   = '';
  actions.style.display = '';

  list.innerHTML = items.map(function(item) {
    return '<div class="cart-item">' +
      '<div class="item-info">' +
        '<div class="item-name">' + item.nombre + '</div>' +
        '<div class="item-code">Código: ' + item.codigo + '</div>' +
      '</div>' +
      '<div class="item-quantity">' +
        '<button class="qty-btn" data-action="dec" data-codigo="' + item.codigo + '">−</button>' +
        '<input class="qty-input" type="number" min="1" value="' + item.cantidad + '" data-codigo="' + item.codigo + '">' +
        '<button class="qty-btn" data-action="inc" data-codigo="' + item.codigo + '">+</button>' +
      '</div>' +
      '<button class="item-remove" data-codigo="' + item.codigo + '" aria-label="Eliminar">✕</button>' +
    '</div>';
  }).join('');

  // eventos
  list.querySelectorAll('.qty-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var codigo = btn.dataset.codigo;
      var cart2  = getCart();
      if (btn.dataset.action === 'inc') {
        cart2[codigo].cantidad++;
      } else if (cart2[codigo].cantidad > 1) {
        cart2[codigo].cantidad--;
      } else {
        delete cart2[codigo];
      }
      saveCart(cart2);
      renderCarrito();
    });
  });

  list.querySelectorAll('.qty-input').forEach(function(inp) {
    inp.addEventListener('change', function() {
      var codigo = inp.dataset.codigo;
      var qty    = parseInt(inp.value) || 1;
      var cart2  = getCart();
      if (qty < 1) delete cart2[codigo];
      else cart2[codigo].cantidad = qty;
      saveCart(cart2);
      renderCarrito();
    });
  });

  list.querySelectorAll('.item-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cart2 = getCart();
      delete cart2[btn.dataset.codigo];
      saveCart(cart2);
      renderCarrito();
      showNotif('Producto eliminado', 'warning');
    });
  });
}

// Modal custom para vaciar carrito
function showConfirmModal(onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML =
    '<div class="confirm-modal">' +
      '<div class="confirm-icon">🗑</div>' +
      '<h3 class="confirm-title">¿Vaciar el pedido?</h3>' +
      '<p class="confirm-msg">Se eliminarán todos los productos del pedido. Esta acción no se puede deshacer.</p>' +
      '<div class="confirm-btns">' +
        '<button class="confirm-btn-cancel">Cancelar</button>' +
        '<button class="confirm-btn-ok">Sí, vaciar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // Animación entrada
  requestAnimationFrame(function() { overlay.classList.add('confirm-visible'); });

  function cerrar() {
    overlay.classList.remove('confirm-visible');
    setTimeout(function() { overlay.remove(); }, 250);
  }

  overlay.querySelector('.confirm-btn-cancel').addEventListener('click', cerrar);
  overlay.querySelector('.confirm-btn-ok').addEventListener('click', function() {
    cerrar();
    setTimeout(onConfirm, 50);
  });
  // Click fuera cierra
  overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrar(); });
}

// Vaciar
var clearBtn = document.getElementById('clearCart');
if (clearBtn) {
  clearBtn.addEventListener('click', function() {
    if (Object.keys(getCart()).length === 0) {
      showNotif('El pedido ya está vacío', 'warning');
      return;
    }
    showConfirmModal(function() {
      saveCart({});
      renderCarrito();
      showNotif('Pedido vaciado', 'success');
    });
  });
}

// Enviar por WhatsApp
var waBtn = document.getElementById('sendWhatsapp');
if (waBtn) {
  waBtn.addEventListener('click', function() {
    var items = Object.values(getCart());
    if (items.length === 0) {
      showNotif('El pedido está vacío', 'error');
      return;
    }
    var msg  = '🛒 *Pedido BGM Diesel*\n\n*Repuestos solicitados:*\n';
    var total = 0;
    items.forEach(function(item) {
      msg  += '• ' + item.nombre + ' (' + item.codigo + ') — Cant: ' + item.cantidad + '\n';
      total += item.cantidad;
    });
    msg += '\n*Total:* ' + total + ' unidades\n\nPor favor confirmar disponibilidad y precio final.';
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    saveCart({});
    renderCarrito();
    showNotif('Pedido enviado por WhatsApp', 'success');
  });
}

renderCarrito();

})();
