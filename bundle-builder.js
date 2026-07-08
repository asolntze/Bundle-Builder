/**
 * Bundle Builder для Tilda
 * Встраиваемый модуль для конструктора наборов
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
    productSelector: '.t-product, .t700__product, .t-item',
    titleSelector: '.t-product__title, .t700__title, .t-title, .t-name',
    priceSelector: '.t-product__price, .t700__price, .t-price, .t-cost',
    categorySelector: '.t-product__category, .t-category',
    insertAfterSelector: '.t700, .t-products, .t-store-block' // куда вставить панель
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
      const id = el.dataset.productId || el.getAttribute('data-product-id') || generateId();
      
      const titleEl = el.querySelector(CONFIG.titleSelector);
      const priceEl = el.querySelector(CONFIG.priceSelector);
      const categoryEl = el.querySelector(CONFIG.categorySelector);
      const imgEl = el.querySelector('img');

      const product = {
        id: id,
        name: titleEl ? titleEl.textContent.trim() : `Товар ${index + 1}`,
        price: priceEl ? parsePrice(priceEl.textContent) : 0,
        category: categoryEl ? categoryEl.textContent.trim() : '',
        image: imgEl ? imgEl.src : '',
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
      alert('Достигнут лимит товаров в коробке');
      return false;
    }

    // Проверяем, нет ли уже этого товара
    if (state.items.find(item => item.id === product.id)) {
      alert('Этот товар уже в коробке');
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
    return true;
  }

  function removeItem(productId) {
    const index = state.items.findIndex(item => item.id === productId);
    if (index > -1) {
      state.items.splice(index, 1);
      saveState();
      updateUI();
    }
  }

  // ==================== PRICING ====================
  function calculatePricing() {
    const itemCount = state.items.length;
    const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);

    // Находим применённую скидку
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

    // Находим следующую скидку
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
        <h3 class="bb-panel-title"> Собери свой набор</h3>
        <button class="bb-panel-close" id="bbPanelClose">✕</button>
      </div>
      
      <div class="bb-progress">
        <div class="bb-progress-bar">
          <div class="bb-progress-fill" id="bbProgressFill"></div>
        </div>
        <div class="bb-progress-text" id="bbProgressText">0 из ${CONFIG.maxItems}</div>
      </div>

      <div class="bb-items" id="bbItems">
        <div class="bb-empty">Начни собирать набор — кликай по товарам выше 👆</div>
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
    // Ищем куда вставить панель
    const targetSelector = CONFIG.insertAfterSelector;
    let insertAfter = document.querySelector(targetSelector);

    if (!insertAfter) {
      // Если не нашли, вставляем в конец body
      insertAfter = document.body;
    }

    const panel = createPanel();
    
    // Вставляем после найденного элемента или в конец
    if (insertAfter === document.body) {
      document.body.appendChild(panel);
    } else {
      insertAfter.after(panel);
    }

    // Кнопка закрытия
    const closeBtn = document.getElementById('bbPanelClose');
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Кнопка добавления в корзину
    const addToCartBtn = document.getElementById('bbAddToCart');
    addToCartBtn.addEventListener('click', () => {
      if (state.items.length >= CONFIG.minItems) {
        // Здесь можно добавить интеграцию с корзиной Тильды
        alert('Товары добавлены в корзину! (интеграция с Тильдой)');
        console.log('Bundle items:', state.items);
      }
    });
  }

  function updateUI() {
    const pricing = calculatePricing();

    // Прогресс-бар
    const progressFill = document.getElementById('bbProgressFill');
    const progressText = document.getElementById('bbProgressText');
    if (progressFill && progressText) {
      const percent = (state.items.length / CONFIG.maxItems) * 100;
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${state.items.length} из ${CONFIG.maxItems}`;
    }

    // Список товаров
    const itemsContainer = document.getElementById('bbItems');
    if (itemsContainer) {
      if (state.items.length === 0) {
        itemsContainer.innerHTML = '<div class="bb-empty">Начни собирать набор — кликай по товарам выше 👆</div>';
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

        // Обработчики удаления
        itemsContainer.querySelectorAll('.bb-item-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            removeItem(id);
          });
        });
      }
    }

    // Цены
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

    // Подсказка
    const hintEl = document.getElementById('bbHint');
    if (hintEl) {
      if (pricing.nextDiscount) {
        hintEl.style.display = 'block';
        hintEl.textContent = `🎁 Добавь ещё ${pricing.nextDiscount.itemsNeeded} товар(а) и получи скидку ${pricing.nextDiscount.discount}%!`;
      } else if (state.items.length > 0) {
        hintEl.style.display = 'block';
        hintEl.textContent = '✅ Максимальная скидка применена!';
        hintEl.className = 'bb-hint bb-hint-success';
      } else {
        hintEl.style.display = 'none';
      }
    }

    // Кнопка
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

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  function init() {
    console.log('🚀 Bundle Builder запускается...');

    // Загружаем состояние
    loadState();

    // Парсим товары
    products = parseProducts();
    console.log(`📦 Найдено товаров: ${products.length}`);

    // Создаём панель
    insertPanel();

    // Добавляем обработчики кликов на товары
    products.forEach(product => {
      product.element.addEventListener('click', function(e) {
        // Игнорируем клики по кнопкам "Купить" и ссылкам
        if (e.target.closest('button, a, .t-buy')) {
          return;
        }

        // Добавляем товар
        addItem(product);
      });

      // Добавляем визуальный индикатор
      product.element.style.cursor = 'pointer';
      product.element.classList.add('bb-product-clickable');
    });

    // Обновляем UI
    updateUI();

    console.log('✅ Bundle Builder готов!');
  }

  // Запускаем когда DOM готов
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
