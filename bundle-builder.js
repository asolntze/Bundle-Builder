/**
 * Bundle Builder для Tilda
 * Модуль для создания конструктора товарных наборов
 */

(function() {
  'use strict';

  // ==================== КОНФИГУРАЦИЯ ====================
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
    // Правильные селекторы для Тильды
    productSelector: '.t-catalog__card.t-item, .t-product, .t700__product',
    titleSelector: '.t-catalog__card__title, .t-name, .t-product__title',
    priceSelector: '.t-catalog__card__price-value, .t-product__price, .t-price',
    categorySelector: '.t-catalog__card__descr, .t-product__category',
    insertAfterSelector: '.t-catalog, .t700, .t-products, .t-store-block'
  };

  // ==================== STATE ====================
  let state = {
    items: []
  };

  let products = [];

  // ==================== УТИЛИТЫ ====================
  function parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  function generateId() {
    return 'bb_' + Math.random().toString(36).substr(2, 9);
  }

  // ==================== TILDA PARSER ====================
  function parseProducts() {
    const items = [];
    const productElements = document.querySelectorAll(CONFIG.productSelector);

    productElements.forEach((el, index) => {
      // Пробуем разные data-атрибуты для ID
      const id = el.dataset.productUid || 
                 el.dataset.productGenUid || 
                 el.dataset.productId || 
                 el.getAttribute('data-product-id') || 
                 generateId();
      
      const titleEl = el.querySelector(CONFIG.titleSelector);
      const priceEl = el.querySelector(CONFIG.priceSelector);
      const categoryEl = el.querySelector(CONFIG.categorySelector);
      
      // Картинка может быть в background-image
      const bgImgEl = el.querySelector('.t-catalog__card__bgimg, .js-product-img');
      let image = '';
      
      if (bgImgEl) {
        const style = bgImgEl.getAttribute('style');
        if (style) {
          const match = style.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) {
            image = match[1];
          }
        }
      }
      
      // Если не нашли background, ищем обычный img
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

      items.push(product);
    });

    return items;
  }

  // ==================== STATE MANAGEMENT ====================
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
    updateProductButtons(); // Обновляем кнопки
    
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
      updateProductButtons(); // Обновляем кнопки
      
      if (item) {
        showNotification(`❌ ${item.name} удалён из набора`);
      }
    }
  }

  // ==================== УВЕДОМЛЕНИЯ ====================
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

  // ==================== PRICING ====================
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

  // ==================== UI ====================
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
        alert('Товары добавлены в корзину! (интеграция с Тильдой)');
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

  // ==================== ОБНОВЛЕНИЕ КНОПОК ====================
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

  // ==================== ДОБАВЛЕНИЕ КНОПОК В КАРТОЧКИ ====================
  function addButtonsToProducts() {
    products.forEach(product => {
      // Проверяем, нет ли уже кнопки
      if (product.element.querySelector('.bb-add-to-bundle')) {
        return;
      }

      // Создаём кнопку
      const button = document.createElement('button');
      button.className = 'bb-add-to-bundle';
      button.textContent = 'В набор';
      
      // Обработчик клика
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(product);
      });

      // Добавляем кнопку в карточку
      product.element.appendChild(button);
    });
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  function init() {
    console.log('🚀 Bundle Builder запускается...');

    loadState();
    products = parseProducts();
    console.log(` Найдено товаров: ${products.length}`);

    if (products.length > 0) {
      insertPanel();
      addButtonsToProducts();
      updateUI();
      console.log('✅ Bundle Builder готов!');
    } else {
      console.error('❌ Не найдено товаров на странице. Проверь селекторы.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
