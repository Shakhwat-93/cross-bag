/**
 * init.js — Cross Bag / Feeluccky standalone initializer
 * Boots: Swiper carousels, countdown, animated headlines, form UX
 */
(function () {
  'use strict';

  /* ─── Wait for DOM ─── */
  document.addEventListener('DOMContentLoaded', function () {

    /* ══════════════════════════════════════
       1. SWIPER CAROUSELS
       Elementor uses class="swiper" + class="swiper-wrapper"
    ══════════════════════════════════════ */
    function initCustomSwiper() {
      if (typeof Swiper === 'undefined') return false;

      // 1. Hero Swiper (Single slide full width auto slider with fade effect)
      document.querySelectorAll('.cb-hero-swiper').forEach(function (el) {
        if (el.customSwiper && el.swiper === el.customSwiper) {
          if (el.swiper.autoplay && !el.swiper.autoplay.running) {
            el.swiper.autoplay.start();
          }
          return;
        }
        if (el.swiper) {
          try {
            el.swiper.destroy(true, true);
            el.swiper = null;
          } catch (e) {
            console.warn('Could not destroy existing Swiper instance:', e);
          }
        }
        try {
          var swiperInstance = new Swiper(el, {
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            autoplay: {
              delay: 3500,
              disableOnInteraction: false,
            },
            speed: 1000,
            slidesPerView: 1,
            spaceBetween: 0,
            pagination: {
              el: el.querySelector('.swiper-pagination'),
              clickable: true,
            },
            navigation: {
              nextEl: el.querySelector('.swiper-button-next'),
              prevEl: el.querySelector('.swiper-button-prev'),
            },
          });
          el.customSwiper = swiperInstance;
          el.dataset.customSwiperLoaded = 'true';
        } catch (err) {
          console.error('Failed to initialize Hero Swiper:', err);
        }
      });

      // 2. Product Carousel Swiper (Show multiple slides, auto sliding, responsive heights)
      document.querySelectorAll('.cb-product-swiper').forEach(function (el) {
        if (el.customSwiper && el.swiper === el.customSwiper) {
          if (el.swiper.autoplay && !el.swiper.autoplay.running) {
            el.swiper.autoplay.start();
          }
          return;
        }
        if (el.swiper) {
          try {
            el.swiper.destroy(true, true);
            el.swiper = null;
          } catch (e) {
            console.warn('Could not destroy existing Swiper instance:', e);
          }
        }
        try {
          var swiperInstance = new Swiper(el, {
            loop: true,
            autoplay: {
              delay: 2500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            },
            speed: 600,
            slidesPerView: 4,
            spaceBetween: 15,
            breakpoints: {
              320: {
                slidesPerView: 2,
                spaceBetween: 10
              },
              480: {
                slidesPerView: 2,
                spaceBetween: 10
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 15
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 15
              }
            },
            pagination: {
              el: el.querySelector('.swiper-pagination'),
              clickable: true,
            },
            navigation: {
              nextEl: el.querySelector('.elementor-swiper-button-next'),
              prevEl: el.querySelector('.elementor-swiper-button-prev'),
            },
          });
          el.customSwiper = swiperInstance;
          el.dataset.customSwiperLoaded = 'true';
        } catch (err) {
          console.error('Failed to initialize Product Swiper:', err);
        }
      });
      return true;
    }

    // Try initializing on DOMContentLoaded
    initCustomSwiper();

    // Try again on window load and multiple timeouts to overwrite late Elementor initializations
    window.addEventListener('load', function () {
      initCustomSwiper();
      setTimeout(initCustomSwiper, 500);
      setTimeout(initCustomSwiper, 1500);
      setTimeout(initCustomSwiper, 3000);
    });

    /* ══════════════════════════════════════
       2. COUNTDOWN TIMER
       data-date = Unix timestamp (seconds)
    ══════════════════════════════════════ */
    document.querySelectorAll('.elementor-countdown-wrapper[data-date]').forEach(function (wrapper) {
      var targetTs = parseInt(wrapper.getAttribute('data-date'), 10) * 1000;

      function updateCountdown() {
        var now = Date.now();
        var diff = targetTs - now;

        if (diff <= 0) {
          // Handle expiry actions
          var actions = [];
          try { actions = JSON.parse(wrapper.getAttribute('data-expire-actions') || '[]'); } catch (e) {}
          actions.forEach(function (a) {
            if (a.type === 'hide') wrapper.style.display = 'none';
          });
          return;
        }

        var totalSecs = Math.floor(diff / 1000);
        var hours   = Math.floor(totalSecs / 3600);
        var minutes = Math.floor((totalSecs % 3600) / 60);
        var seconds = totalSecs % 60;

        var pad = function (n) { return String(n).padStart(2, '0'); };

        var h = wrapper.querySelector('.elementor-countdown-hours');
        var m = wrapper.querySelector('.elementor-countdown-minutes');
        var s = wrapper.querySelector('.elementor-countdown-seconds');

        if (h) h.textContent = pad(hours);
        if (m) m.textContent = pad(minutes);
        if (s) s.textContent = pad(seconds);
      }

      updateCountdown();
      setInterval(updateCountdown, 1000);
    });

    /* ══════════════════════════════════════
       3. ANIMATED HEADLINES
       - Rotating (clip animation)
       - Highlight (strikethrough / underline / curly)
    ══════════════════════════════════════ */

    // 3a. Rotating text (clip type)
    document.querySelectorAll('.elementor-headline-animation-type-clip').forEach(function (el) {
      var wrapper = el.closest('[data-settings]');
      if (!wrapper) return;
      var settings = {};
      try { settings = JSON.parse(wrapper.getAttribute('data-settings').replace(/\n/g, '')); } catch (e) {}

      var texts = [];
      try { texts = settings.rotating_text.split('|').map(function (t) { return t.trim(); }); } catch (e) {}
      if (!texts.length) return;

      var span = el.querySelector('.elementor-headline-dynamic-text');
      if (!span) return;

      var delay = settings.rotate_iteration_delay || 2500;
      var idx = 0;

      setInterval(function () {
        idx = (idx + 1) % texts.length;
        span.style.opacity = '0';
        span.style.transform = 'translateY(-10px)';
        setTimeout(function () {
          span.textContent = texts[idx];
          span.style.opacity = '1';
          span.style.transform = 'translateY(0)';
        }, 300);
      }, delay);

      // CSS for smooth transition
      span.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      span.style.display = 'inline-block';
    });

    // 3b. Highlight animation (already visible in HTML, just add CSS class trigger)
    document.querySelectorAll('.elementor-headline-dynamic-wrapper').forEach(function (el) {
      el.style.display = 'inline';
    });

    /* ══════════════════════════════════════
       4. SCROLL ANIMATIONS (Elementor invisible → visible)
    ══════════════════════════════════════ */
    var invisibles = document.querySelectorAll('.elementor-invisible');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.remove('elementor-invisible');
            entry.target.classList.add('animated', 'fadeInRight');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      invisibles.forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback: show immediately
      invisibles.forEach(function (el) {
        el.classList.remove('elementor-invisible');
      });
    }

    /* ══════════════════════════════════════
       5. FORM UX — smooth scroll and auto-selection of bag colors
     ══════════════════════════════════════ */
    // Select color card on click and scroll to checkout
    document.querySelectorAll('.cb-color-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        var color = card.getAttribute('data-color');
        var colorSelect = document.getElementById('billing_color');
        if (colorSelect && color) {
          if (color !== 'Collection') {
            colorSelect.value = color;
            var event = new Event('change', { bubbles: true });
            colorSelect.dispatchEvent(event);
          }
        }

        // Scroll to order form
        var target = document.getElementById('order');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(function () {
            var firstInput = target.querySelector('input[type="text"], input[type="tel"]');
            if (firstInput) firstInput.focus();
          }, 600);
        }
      });
    });

    // Prevent button double-action and trigger card click
    document.querySelectorAll('.cb-color-card .cb-order-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var card = btn.closest('.cb-color-card');
        if (card) {
          card.click();
        }
      });
    });

    // Handle scroll for standard CTA buttons
    document.querySelectorAll('a[href="#order"]').forEach(function (btn) {
      // Skip order buttons inside color cards since they are handled above
      if (btn.closest('.cb-color-card')) return;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById('order');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(function () {
            var firstInput = target.querySelector('input[type="text"], input[type="tel"]');
            if (firstInput) firstInput.focus();
          }, 600);
        }
      });
    });

    /* ══════════════════════════════════════
       6. FORM VALIDATION — basic client-side
    ══════════════════════════════════════ */
    var form = document.querySelector('form.woocommerce-checkout');
    if (form) {
      form.addEventListener('submit', function (e) {
        var valid = true;
        var requiredFields = form.querySelectorAll('input[aria-required="true"]');

        requiredFields.forEach(function (field) {
          var parent = field.closest('.form-row');
          if (!field.value.trim()) {
            valid = false;
            field.style.borderColor = '#e74c3c';
            field.style.boxShadow = '0 0 0 2px rgba(231,76,60,0.25)';
            if (parent) parent.classList.add('woocommerce-invalid');
          } else {
            field.style.borderColor = '';
            field.style.boxShadow = '';
            if (parent) parent.classList.remove('woocommerce-invalid');
          }
        });

        // Phone validation
        var phone = form.querySelector('#billing_phone');
        if (phone && phone.value.trim()) {
          var cleaned = phone.value.replace(/\D/g, '');
          if (cleaned.length < 10) {
            valid = false;
            phone.style.borderColor = '#e74c3c';
            phone.style.boxShadow = '0 0 0 2px rgba(231,76,60,0.25)';
          }
        }

        if (!valid) {
          e.preventDefault();
          var firstInvalid = form.querySelector('[style*="borderColor: rgb(231, 76, 60)"], [style*="border-color: rgb"]');
          if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      // Live validation on blur
      form.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('blur', function () {
          if (this.value.trim()) {
            this.style.borderColor = '#27ae60';
            this.style.boxShadow = '0 0 0 2px rgba(39,174,96,0.2)';
          }
        });
        input.addEventListener('focus', function () {
          this.style.borderColor = '';
          this.style.boxShadow = '';
        });
      });
    }

    console.log('✅ init.js loaded — Swiper, countdown, animations, and form UX initialized.');
  });

})();
