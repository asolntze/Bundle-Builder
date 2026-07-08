/**
 * Bundle Builder для Tilda — ОТЛАДОЧНАЯ ВЕРСИЯ
 */

(function() {
  'use strict';

  const CONFIG = {
    minItems: 3,
    maxItems: 10,
    discountRules: [
      { threshold: 3, discount: 5 },
      { threshold: 5, discount: 10 },
      { threshold: 7, discount: 15 },
      { threshold: 10, discount: 20 }
    ],
    currency: '₽',
    storageKey: 'bundle-builder-state',
    productSelector: '.t-catalog__card.t-item, .t-product, .t700__product, .t-item',
    titleSelector: '.t-catalog__card__title, .t-name, .t-product__title',
    priceSelector: '.t-catalog__card__price-value, .t-product__price, .t-price',
    categorySelector: '.t-catalog__card__descr, .t-product__category',
    insertAfterSelector: '.t-catalog, .t700, .t-products, .t-store-block'
  };

  let state = { items: [] };
  let products = [];

  function parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  function generateId() {
    return 'bb_' + Math.random().toString(36).substr(2, 9);
  }

  // ==================== ОТЛАДКА ====================
  function debugInfo() {
    console.log('🔍 === ОТЛАДКА ===');
    console.log('📄 Всего элементов на странице:', document.querySelectorAll('*').length);
    console.log('🔎 Ищем по селектору:', CONFIG.productSelector);
    
    const allItems = document.querySelectorAll(CONFIG.productSelector);
    console.log('✅ Найдено элементов:', allItems.length);
    
    allItems.forEach((el, i) => {
      console.log(`  [${i}]`, {
        classList: Array.from(el.classList).join(' '),
        id: el.id,
        dataset: el.dataset
      });
    });
    
    console.log('🔎 Элементы body:', Array.from(document.body.classList).join(' '));
    console.log('=================');
  }

  function parseProducts() {
    const items = [];
    const productElements = document.querySelectorAll(CONFIG.productSelector);

    console.log(`📦 Начинаю парсинг ${productElements.length} элементов...`);

    productElements.forEach((el, index) => {
      console.log(`  Обработка элемента [${index}]:`, {
        classes: el.className.substring(0, 100)
      });

      const id = el.dataset.productUid || 
                 el.dataset.productGenUid || 
                 el.dataset.productId || 
                 generateId();
      
      const titleEl = el.querySelector(CONFIG.titleSelector);
      const priceEl = el.querySelector(CONFIG.priceSelector);
      const categoryEl = el.querySelector(CONFIG.categorySelector);
      
      let image = '';
      const bgImgEl = el.querySelector('.t-catalog__card__bgimg, .js-product-img');
      
      if (bgImgEl) {
        const style = bgImgEl.getAttribute('style');
        if (style) {
          const match = style.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) {
            image = match[1];
          }
        }
      }
      
      if (!image) {
        const imgEl = el.querySelector('img');
        if (imgEl) {
          image = imgEl.src;
        }
      }

      const product = {
        id: id,
        name: titleEl ? titleEl.textContent.trim() : `Товар ${index + 1}`,
        price: priceEl ? parsePrice(priceEl.textContent) : 0,
        category: categoryEl ? categoryEl.textContent.trim() : '',
        image: image,
        element: el
      };

      console.log(`    → ${product.name}, ${product.price}₽`);
      items.push(product);
    });

    return items;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.items = parsed.items || [];
      }
    } catch (e) {
      console.warn('Bundle Builder: не удалось загрузить состояние', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Bundle Builder: не удалось сохранить состояние', e);
    }
  }

  function addItem(product) {
    if (state.items.length >= CONFIG.maxItems) {
      alert('Достигнут лимит товаров в наборе');
      return false;
    }

    if (state.items.find(item => item.id === product.id)) {
      alert('Этот товар уже в наборе');
      return false;
    }

    state.items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image
    });

    saveState();
    updateUI();
    updateProductButtons();
    
    showNotification(`✅ ${product.name} добавлен в набор`);
    
    return true;
  }

  function removeItem(productId) {
    const item = state.items.find(i => i.id === productId);
    const index = state.items.findIndex(i => i.id === productId);
    
    if (index > -1) {
      state.items.splice(index, 1);
      saveState();
      updateUI();
      updateProductButtons();
      
      if (item) {
        showNotification(`❌ ${item.name} удалён из набора`);
      }
    }
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'bb-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('bb-notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  function calculatePricing() {
    const itemCount = state.items.length;
    const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);

    let discountPercent = 0;
    const sortedRules = [...CONFIG.discountRules].sort((a, b) => b.threshold - a.threshold);
    
    for (const rule of sortedRules) {
      if (itemCount >= rule.threshold) {
        discountPercent = rule.discount;
        break;
      }
    }

    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;

    let nextDiscount = null;
    const ascendingRules = [...CONFIG.discountRules].sort((a, b) => a.threshold - b.threshold);
    
    for (const rule of ascendingRules) {
      if (itemCount < rule.threshold) {
        nextDiscount = {
          threshold: rule.threshold,
          discount: rule.discount,
          itemsNeeded: rule.threshold - itemCount
        };
        break;
      }
    }

    return {
      subtotal,
      discount,
      total,
      discountPercent,
      nextDiscount
    };
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'bb-panel';
    panel.innerHTML = `
      <div class="bb-panel-header">
        <h3 class="bb-panel-title">📦 Твой набор</h3>
        <button class="bb-panel-close" id="bbPanelClose">✕</button>
      </div>
      
      <div class="bb-progress">
        <div class="bb-progress-bar">
          <div class="bb-progress-fill" id="bbProgressFill"></div>
        </div>
        <div class="bb-progress-text" id="bbProgressText">0 из ${CONFIG.maxItems}</div>
      </div>

      <div class="bb-items" id="bbItems">
        <div class="bb-empty">Начни собирать набор — нажимай "В набор" на товарах 👆</div>
      </div>

      <div class="bb-pricing">
        <div class="bb-price-row">
          <span>Сумма:</span>
          <span id="bbSubtotal">0 ${CONFIG.currency}</span>
        </div>
        <div class="bb-price-row bb-discount-row" id="bbDiscountRow" style="display: none;">
          <span>Скидка:</span>
          <span id="bbDiscount">0 ${CONFIG.currency}</span>
        </div>
        <div class="bb-price-row bb-total-row">
          <span>Итого:</span>
          <span id="bbTotal">0 ${CONFIG.currency}</span>
        </div>
      </div>

      <div class="bb-hint" id="bbHint"></div>

      <button class="bb-add-to-cart" id="bbAddToCart" disabled>
        Собери минимум ${CONFIG.minItems} товара
      </button>
    `;

    return panel;
  }

  function insertPanel() {
    const targetSelector = CONFIG.insertAfterSelector;
    let insertAfter = document.querySelector(targetSelector);

    if (!insertAfter) {
      insertAfter = document.body;
    }

    const panel = createPanel();
    
    if (insertAfter === document.body) {
      document.body.appendChild(panel);
    } else {
      insertAfter.after(panel);
    }

    const closeBtn = document.getElementById('bbPanelClose');
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    const addToCartBtn = document.getElementById('bbAddToCart');
    addToCartBtn.addEventListener('click', () => {
      if (state.items.length >= CONFIG.minItems) {
        alert('Товары добавлены в корзину!');
        console.log('Bundle items:', state.items);
      }
    });
  }

  function updateUI() {
    const pricing = calculatePricing();

    const progressFill = document.getElementById('bbProgressFill');
    const progressText = document.getElementById('bbProgressText');
    if (progressFill && progressText) {
      const percent = (state.items.length / CONFIG.maxItems) * 100;
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${state.items.length} из ${CONFIG.maxItems}`;
    }

    const itemsContainer = document.getElementById('bbItems');
    if (itemsContainer) {
      if (state.items.length === 0) {
        itemsContainer.innerHTML = '<div class="bb-empty">Начни собирать набор — нажимай "В набор" на товарах 👆</div>';
      } else {
        itemsContainer.innerHTML = state.items.map(item => `
          <div class="bb-item">
            <div class="bb-item-info">
              ${item.image ? `<img src="${item.image}" alt="${item.name}" class="bb-item-img">` : ''}
              <div class="bb-item-details">
                <div class="bb-item-name">${item.name}</div>
                <div class="bb-item-price">${item.price} ${CONFIG.currency}</div>
              </div>
            </div>
            <button class="bb-item-remove" data-id="${item.id}">✕</button>
          </div>
        `).join('');

        itemsContainer.querySelectorAll('.bb-item-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            removeItem(id);
          });
        });
      }
    }

    const subtotalEl = document.getElementById('bbSubtotal');
    const discountEl = document.getElementById('bbDiscount');
    const discountRowEl = document.getElementById('bbDiscountRow');
    const totalEl = document.getElementById('bbTotal');

    if (subtotalEl) subtotalEl.textContent = `${pricing.subtotal} ${CONFIG.currency}`;
    if (discountEl) discountEl.textContent = `-${pricing.discount} ${CONFIG.currency}`;
    if (totalEl) totalEl.textContent = `${pricing.total} ${CONFIG.currency}`;
    
    if (discountRowEl) {
      discountRowEl.style.display = pricing.discount > 0 ? 'flex' : 'none';
    }

    const hintEl = document.getElementById('bbHint');
    if (hintEl) {
      if (pricing.nextDiscount) {
        hintEl.style.display = 'block';
        hintEl.textContent = `🎁 Добавь ещё ${pricing.nextDiscount.itemsNeeded} товар(а) и получи скидку ${pricing.nextDiscount.discount}%!`;
        hintEl.className = 'bb-hint';
      } else if (state.items.length > 0) {
        hintEl.style.display = 'block';
        hintEl.textContent = '✅ Максимальная скидка применена!';
        hintEl.className = 'bb-hint bb-hint-success';
      } else {
        hintEl.style.display = 'none';
      }
    }

    const addToCartBtn = document.getElementById('bbAddToCart');
    if (addToCartBtn) {
      if (state.items.length >= CONFIG.minItems) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = `Добавить в корзину — ${pricing.total} ${CONFIG.currency}`;
      } else {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = `Собери минимум ${CONFIG.minItems} товара`;
      }
    }
  }

  function updateProductButtons() {
    products.forEach(product => {
      const button = product.element.querySelector('.bb-add-to-bundle');
      if (button) {
        const isInBundle = state.items.find(item => item.id === product.id);
        if (isInBundle) {
          button.classList.add('bb-in-bundle');
          button.textContent = '✓ В наборе';
        } else {
          button.classList.remove('bb-in-bundle');
          button.textContent = 'В набор';
        }
      }
    });
  }

  function addButtonsToProducts() {
    products.forEach(product => {
      if (product.element.querySelector('.bb-add-to-bundle')) {
        return;
      }

      const button = document.createElement('button');
      button.className = 'bb-add-to-bundle';
      button.textContent = 'В набор';
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(product);
      });

      product.element.appendChild(button);
    });
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ С ЗАДЕРЖКОЙ ====================
  function init() {
    console.log('🚀 Bundle Builder запускается...');
    
    // Показываем отладочную информацию
    debugInfo();

    loadState();
    products = parseProducts();
    console.log(` Найдено товаров: ${products.length}`);

    if (products.length > 0) {
      insertPanel();
      addButtonsToProducts();
      updateUI();
      console.log('✅ Bundle Builder готов!');
    } else {
      console.error('❌ Не найдено товаров на странице!');
      console.log('Попробуй вручную в консоли:');
      console.log('  document.querySelectorAll(".t-catalog__card.t-item").length');
      console.log('  document.querySelectorAll(".t-product").length');
    }
  }

  // Пробуем несколько раз запустить
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Запускаем с небольшой задержкой
    setTimeout(init, 500);
  }

  // Пробуем ещё раз через 2 секунды (на случай AJAX загрузки)
  setTimeout(() => {
    if (products.length === 0) {
      console.log(' Повторная попытка через 2 секунды...');
      init();
    }
  }, 2000);

})();
