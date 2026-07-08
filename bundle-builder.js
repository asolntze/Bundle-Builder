/* ==================== КНОПКА "В НАБОР" ==================== */

.bb-add-to-bundle {
  display: block;
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.bb-add-to-bundle:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.bb-add-to-bundle:active {
  transform: translateY(0);
}

/* Если товар уже в наборе — меняем стиль кнопки */
.bb-add-to-bundle.bb-in-bundle {
  background: #2196F3;
}

.bb-add-to-bundle.bb-in-bundle:hover {
  background: #1976D2;
}

/* ==================== УВЕДОМЛЕНИЯ ==================== */

.bb-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #333;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 10000;
  animation: bbSlideInRight 0.3s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.bb-notification-hide {
  animation: bbSlideOutRight 0.3s ease forwards;
}

@keyframes bbSlideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes bbSlideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100px);
  }
}

/* Адаптивность для кнопки */
@media (max-width: 768px) {
  .bb-add-to-bundle {
    padding: 8px;
    font-size: 13px;
  }
}
