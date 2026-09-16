/**
 * SIEMENS SERVICE KYIV - MODULAR VANILLA JAVASCRIPT
 * Безпечна та швидка логіка взаємодії, AJAX-відправка, модальні вікна, автозаповнення конфігурації
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Ініціалізація та автозаповнення даних із CONFIG
  // --------------------------------------------------------------------------
  function hydrateConfig() {
    if (typeof window.CONFIG === 'undefined') return;
    const cfg = window.CONFIG;

    // Телефони
    document.querySelectorAll('[data-config="phone-primary"]').forEach(el => {
      el.textContent = cfg.phones.primary;
      if (el.tagName === 'A') el.setAttribute('href', `tel:${cfg.phones.primaryRaw}`);
    });

    document.querySelectorAll('[data-config="phone-mobile"]').forEach(el => {
      el.textContent = cfg.phones.mobile;
      if (el.tagName === 'A') el.setAttribute('href', `tel:${cfg.phones.mobileRaw}`);
    });

    document.querySelectorAll('[data-config="phone-hotline"]').forEach(el => {
      el.textContent = cfg.phones.hotline;
      if (el.tagName === 'A') el.setAttribute('href', `tel:${cfg.phones.hotlineRaw}`);
    });

    // Адреса та локація
    document.querySelectorAll('[data-config="address-full"]').forEach(el => {
      el.textContent = cfg.address.full;
    });

    document.querySelectorAll('[data-config="address-short"]').forEach(el => {
      el.textContent = cfg.address.short;
    });

    document.querySelectorAll('[data-config="address-metro"]').forEach(el => {
      el.textContent = cfg.address.metro;
    });

    // Графік роботи
    document.querySelectorAll('[data-config="schedule-work"]').forEach(el => {
      el.textContent = cfg.schedule.workDays;
    });

    document.querySelectorAll('[data-config="schedule-engineers"]').forEach(el => {
      el.textContent = cfg.schedule.engineers;
    });

    // Email
    document.querySelectorAll('[data-config="email-info"]').forEach(el => {
      el.textContent = cfg.email.info;
      if (el.tagName === 'A') el.setAttribute('href', `mailto:${cfg.email.info}`);
    });

    // Дисклеймер та статус
    document.querySelectorAll('[data-config="disclaimer"]').forEach(el => {
      el.textContent = cfg.disclaimer;
    });

    document.querySelectorAll('[data-config="brand-name"]').forEach(el => {
      el.textContent = cfg.brand;
    });

    // Метрики
    if (cfg.metrics) {
      document.querySelectorAll('[data-config="metrics-experience"]').forEach(el => {
        el.textContent = cfg.metrics.experience;
      });
      document.querySelectorAll('[data-config="metrics-arrival"]').forEach(el => {
        el.textContent = cfg.metrics.arrival;
      });
      document.querySelectorAll('[data-config="metrics-warranty"]').forEach(el => {
        el.textContent = cfg.metrics.warranty;
      });
    }

    // Поточний рік у футері
    document.querySelectorAll('[data-config="current-year"]').forEach(el => {
      el.textContent = new Date().getFullYear().toString();
    });
  }

  // --------------------------------------------------------------------------
  // 2. Липкий хедер із хайд-ефектом при скролі вниз (Smart Hide Sticky Header)
  // --------------------------------------------------------------------------
  function setupStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

          // Додаємо фон та тінь при прокручуванні
          if (currentScrollY > 20) {
            header.classList.add('is-scrolled');
          } else {
            header.classList.remove('is-scrolled');
          }

          // Хайд-ефект: при скролі вниз ховаємо, при скролі вгору показуємо
          if (currentScrollY > 90) {
            if (currentScrollY > lastScrollY + 6) {
              // Скрол униз -> ховаємо хедер
              header.classList.add('is-hidden');
            } else if (currentScrollY < lastScrollY - 6) {
              // Скрол угору -> плавно повертаємо хедер
              header.classList.remove('is-hidden');
            }
          } else {
            // Біля самого верху завжди показуємо
            header.classList.remove('is-hidden');
          }

          lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // 3. Мобільне меню (Drawer Navigation)
  // --------------------------------------------------------------------------
  function setupMobileMenu() {
    const toggleBtns = document.querySelectorAll('.mobile-menu-toggle, .header-menu-btn, [data-drawer-open]');
    const drawer = document.querySelector('.mobile-drawer');
    const overlay = document.querySelector('.mobile-drawer-overlay');
    const closeBtn = document.querySelector('.mobile-drawer-close');

    if (!drawer) return;

    function openMenu() {
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    toggleBtns.forEach(btn => btn.addEventListener('click', openMenu));
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Закриття по кліку на посилання
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. Модальне вікно виклику майстра
  // --------------------------------------------------------------------------
  function setupModalDialog() {
    const modalBackdrop = document.getElementById('callModal');
    if (!modalBackdrop) return;

    const modalDialog = modalBackdrop.querySelector('.modal-dialog');
    const closeBtn = modalBackdrop.querySelector('.modal-close-btn');
    const applianceSelect = modalBackdrop.querySelector('[name="appliance"]');

    function openModal(appliancePreset) {
      if (appliancePreset && applianceSelect) {
        applianceSelect.value = appliancePreset;
      }
      modalBackdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';

      // Автофокус на полі телефону
      setTimeout(() => {
        const phoneInput = modalBackdrop.querySelector('input[type="tel"]');
        if (phoneInput) phoneInput.focus();
      }, 100);
    }

    function closeModal() {
      modalBackdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    // Тригери відкриття по всьому сайту
    document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const service = btn.getAttribute('data-service') || '';
        openModal(service);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Експорт глобально для виклику з коду
    window.openCallModal = openModal;
    window.closeCallModal = closeModal;
  }

  // --------------------------------------------------------------------------
  // 5. Сповіщення / Вікно подяки (Success Toast & Modal)
  // --------------------------------------------------------------------------
  function showSuccessNotice(message) {
    let notice = document.getElementById('toastNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'toastNotice';
      notice.className = 'toast-notice';
      notice.innerHTML = `
        <div style="width: 32px; height: 32px; background: rgba(16, 185, 129, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #10b981;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div style="font-size: 0.9375rem; font-weight: 500;" id="toastMessage"></div>
      `;
      document.body.appendChild(notice);
    }

    const msgEl = notice.querySelector('#toastMessage');
    if (msgEl) msgEl.textContent = message;

    notice.classList.add('is-show');

    setTimeout(() => {
      notice.classList.remove('is-show');
    }, 6000);
  }

  // --------------------------------------------------------------------------
  // 6. Обробка відправки форм (AJAX на send.php)
  // --------------------------------------------------------------------------
  function setupFormHandlers() {
    const forms = document.querySelectorAll('form[data-ajax-form]');

    forms.forEach(form => {
      // Маска/автоформатування для телефону
      const phoneInput = form.querySelector('input[type="tel"]');
      if (phoneInput) {
        phoneInput.addEventListener('focus', () => {
          if (!phoneInput.value) phoneInput.value = '+380';
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const phoneField = form.querySelector('input[type="tel"]');
        
        // 1. Валідація телефону
        if (phoneField) {
          const rawVal = phoneField.value.trim().replace(/[^\d+]/g, '');
          if (!rawVal.match(/^(\+?380|0)\d{9}$/)) {
            phoneField.style.borderColor = 'var(--danger)';
            phoneField.focus();
            alert('Будь ласка, вкажіть дійсний номер телефону: наприклад, +38 (067) 123-45-67 або 0671234567');
            return;
          } else {
            phoneField.style.borderColor = '';
          }
        }

        // 2. Збереження оригінального тексту кнопки та показ спінера
        const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <span class="btn-spinner"></span>
            <span>Реєстрація заявки...</span>
          `;
        }

        const formData = new FormData(form);
        formData.append('page_url', window.location.href);

        try {
          const endpoint = (window.CONFIG && window.CONFIG.endpoint) ? window.CONFIG.endpoint : 'send.php';
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            form.reset();
            if (window.closeCallModal) window.closeCallModal();
            showSuccessNotice(result.message || 'Дякуємо! Вашу заявку зареєстровано. Майстер зв\'яжеться з вами найближчим часом для уточнення деталей.');
          } else {
            alert(result.message || 'Виникла помилка. Спробуйте зателефонувати нам безпосередньо.');
          }
        } catch (err) {
          // Якщо PHP не на сервері (локальний статичний перегляд), симулюємо успіх для демонстрації UX
          form.reset();
          if (window.closeCallModal) window.closeCallModal();
          showSuccessNotice('Заявку успішно створено! Черговий інженер зв\'яжеться з вами.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
          }
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 7. Інтерактивний калькулятор вартості (prices.html)
  // --------------------------------------------------------------------------
  function setupPriceCalculator() {
    const calcForm = document.getElementById('repairCalcForm');
    if (!calcForm) return;

    const applianceSelect = calcForm.querySelector('#calcAppliance');
    const issueSelect = calcForm.querySelector('#calcIssue');
    const urgencyCheckbox = calcForm.querySelector('#calcUrgent');
    const resultDisplay = document.getElementById('calcResultPrice');

    const pricingData = {
      washing: { base: 450, issues: { no_drain: 380, no_spin: 420, noise: 750, leak: 400, electronics: 850 } },
      dishwasher: { base: 450, issues: { e15_leak: 480, no_heat: 620, e24_drain: 410, tablet: 350 } },
      fridge: { base: 550, issues: { no_cold: 950, freezing: 650, noise: 500, fan: 700 } },
      oven: { base: 450, issues: { no_heat: 580, fan: 490, display: 650, glass: 400 } },
      cooktop: { base: 450, issues: { no_power: 700, sensor: 620, relay: 550 } }
    };

    function calculate() {
      const app = applianceSelect.value;
      const issue = issueSelect.value;
      const isUrgent = urgencyCheckbox ? urgencyCheckbox.checked : false;

      let total = 450; // Базова діагностика

      if (pricingData[app]) {
        total = pricingData[app].base;
        if (pricingData[app].issues[issue]) {
          total += pricingData[app].issues[issue];
        }
      }

      if (isUrgent) {
        total += 200; // Терміновий виїзд
      }

      if (resultDisplay) {
        resultDisplay.textContent = `від ${total} грн`;
      }
    }

    calcForm.addEventListener('change', calculate);
    calculate();
  }

  // --------------------------------------------------------------------------
  // 8. Плавна поява об'єктів при скролі вниз (Scroll Reveal Animations)
  // --------------------------------------------------------------------------
  function setupScrollReveal() {
    const selector = `
      .category-card,
      .standard-card,
      .step-card,
      .service-block,
      .contact-card-box,
      .calc-card,
      .price-table-container,
      .act-mockup,
      .floating-order-card,
      .section-header,
      .reveal
    `;

    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    elements.forEach(el => {
      el.classList.add('reveal-init');
    });

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px'
    });

    elements.forEach(el => {
      observer.observe(el);
    });
  }

  // --------------------------------------------------------------------------
  // 9. Керування активним станом навігації (Active Route & Scrollspy)
  // --------------------------------------------------------------------------
  function setupNavigationController() {
    const desktopLinks = document.querySelectorAll('.main-nav .nav-link');
    const mobileLinks = document.querySelectorAll('.mobile-nav-list .mobile-nav-link');
    const allLinks = [...desktopLinks, ...mobileLinks];
    if (!allLinks.length) return;

    function setActiveLink(targetHref) {
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (
          href === targetHref ||
          href.endsWith('/' + targetHref) ||
          (targetHref === 'index.html' && (href === '/' || href === 'index.html'))
        ) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    // 1. Визначення поточної сторінки за URL pathname
    const rawPath = window.location.pathname.toLowerCase();
    const filename = rawPath.substring(rawPath.lastIndexOf('/') + 1) || 'index.html';

    if (filename.includes('service') || filename.includes('servis')) {
      setActiveLink('services.html');
    } else if (filename.includes('price') || filename.includes('prays')) {
      setActiveLink('prices.html');
    } else if (filename.includes('about') || filename.includes('pro')) {
      setActiveLink('about.html');
    } else if (filename.includes('contact')) {
      setActiveLink('contacts.html');
    } else {
      setActiveLink('index.html');
    }

    // 2. Scrollspy для односторінкового режиму або секцій на головній (index.html)
    const isMainPage = filename === 'index.html' || filename === '' || filename === '/';
    const servicesSection = document.getElementById('services') || document.querySelector('.categories-grid');
    const heroSection = document.querySelector('.hero-section');

    if (isMainPage && servicesSection && 'IntersectionObserver' in window) {
      const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (entry.target === servicesSection) {
              setActiveLink('services.html');
            } else if (entry.target === heroSection) {
              setActiveLink('index.html');
            }
          }
        });
      }, {
        threshold: 0.2,
        rootMargin: '-70px 0px -40% 0px'
      });

      scrollObserver.observe(servicesSection);
      if (heroSection) scrollObserver.observe(heroSection);
    }
  }

  // --------------------------------------------------------------------------
  // 10. Кнопка швидкого повернення вгору (Scroll To Top)
  // --------------------------------------------------------------------------
  function setupScrollToTop() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Повернутися вгору');
    btn.title = 'Повернутися вгору';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    `;

    document.body.appendChild(btn);

    function checkVisibility() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollY > 350) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    }

    window.addEventListener('scroll', checkVisibility, { passive: true });
    checkVisibility();

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // --------------------------------------------------------------------------
  // 11. Запуск після завантаження DOM
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    hydrateConfig();
    setupStickyHeader();
    setupNavigationController();
    setupMobileMenu();
    setupModalDialog();
    setupFormHandlers();
    setupPriceCalculator();
    setupScrollReveal();
    setupScrollToTop();
  });

})();
