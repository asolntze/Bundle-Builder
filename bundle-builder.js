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
    productSelector: '.t-product, .t700__product, .t-item',
    titleSelector: '.t-product__title, .t700__title, .t-title, .t-name',
    priceSelector: '.t-product__price, .t700__price, .t-price, .t-cost',
    categorySelector: '.t-product__category, .t-category',
    insertAfterSelector: '.t700, .t-products, .t-store-block'
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
