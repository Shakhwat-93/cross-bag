/**
 * checkout-supabase.js
 * Handles checkout form interactions, variant selection, IP retrieval, traffic source detection,
 * Supabase order processing, rate limiting, anti-spam validation, and GTM purchase tracking.
 */

(function ($) {
  'use strict';

  // Constants
  const PRODUCT_PRICE = 850;
  const PRODUCT_NAME = "Premium Canvas Cross Bag";
  const SUPABASE_URL = "__SUPABASE_URL__";
  // Existing anon key from stb-landing
  const SUPABASE_KEY = "__SUPABASE_ANON_KEY__";

  // Initialize Supabase Client
  let supabase = null;
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
      console.error("Supabase CDN script is not loaded.");
    }
  } catch (err) {
    console.error("Error initializing Supabase client:", err);
  }

  // Product Variants definition
  const productVariants = [
    {
      id: "black",
      name: "Cross Bag - Black",
      colorCode: "#111827",
      image: "images/cb-black.jpg",
      price: PRODUCT_PRICE,
      inStock: true
    },
    {
      id: "teal",
      name: "Cross Bag - Teal",
      colorCode: "#0d9488",
      image: "images/cb-teal.jpg",
      price: PRODUCT_PRICE,
      inStock: true
    },
    {
      id: "green",
      name: "Cross Bag - Olive Green",
      colorCode: "#3f6212",
      image: "images/cb-green.jpg",
      price: PRODUCT_PRICE,
      inStock: true
    },
    {
      id: "red",
      name: "Cross Bag - Red",
      colorCode: "#dc2626",
      image: "images/cb-red.jpg",
      price: PRODUCT_PRICE,
      inStock: true
    },
    {
      id: "maroon",
      name: "Cross Bag - Maroon",
      colorCode: "#7f1d1d",
      image: "images/cb-maroon.jpg",
      price: PRODUCT_PRICE,
      inStock: true
    }
  ];

  // State Management
  const state = {
    selectedVariants: {}, // Format: { id: quantity }
    shippingCost: 60,     // Default to Inside Dhaka
    shippingZoneValue: "Inside dhaka",
    customerIp: "",
    trafficSource: "Direct"
  };

  // Document Ready
  $(document).ready(function () {
    initTrafficSource();
    fetchCustomerIp();
    renderVariants();
    bindEvents();
    updateCalculations();
  });

  // Render Variant Cards dynamically
  function renderVariants() {
    const $grid = $('#cb-variant-grid');
    if (!$grid.length) return;

    $grid.empty();

    productVariants.forEach(function (v, idx) {
      // Pre-select first variant in stock (usually black) with qty 1
      const isPreselected = idx === 0 && v.inStock;
      if (isPreselected) {
        state.selectedVariants[v.id] = 1;
      }

      const qty = state.selectedVariants[v.id] || 1;
      const selectedClass = state.selectedVariants[v.id] ? 'selected' : '';
      const stockOutClass = v.inStock ? '' : 'stock-out';

      const cardHtml = `
        <div class="cb-variant-card ${selectedClass} ${stockOutClass}" data-id="${v.id}">
          <div class="cb-variant-checkbox-wrapper">
            <div class="cb-variant-checkbox"></div>
          </div>
          ${!v.inStock ? '<div class="cb-variant-stock-badge">Stock Out</div>' : ''}
          <div class="cb-variant-card-image">
            <img src="${v.image}" alt="${v.name}">
          </div>
          <div class="cb-variant-card-body">
            <h4 class="cb-variant-card-title">${v.name}</h4>
            <div class="cb-variant-card-price-row">
              <span class="cb-variant-card-price">৳${v.price}</span>
              ${v.colorCode ? `<span class="cb-variant-color-dot" style="background-color: ${v.colorCode}"></span>` : ''}
            </div>
            <div class="cb-variant-quantity-controls" onclick="event.stopPropagation();">
              <button type="button" class="cb-qty-btn cb-qty-minus" data-id="${v.id}">-</button>
              <input type="text" class="cb-qty-input" id="cb-qty-${v.id}" value="${qty}" readonly>
              <button type="button" class="cb-qty-btn cb-qty-plus" data-id="${v.id}">+</button>
            </div>
          </div>
        </div>
      `;
      $grid.append(cardHtml);
    });
  }

  // Bind Interactions
  function bindEvents() {
    // Card Selection Toggle
    $(document).on('click', '.cb-variant-card:not(.stock-out)', function () {
      const variantId = $(this).data('id');
      const $card = $(this);

      if ($card.hasClass('selected')) {
        $card.removeClass('selected');
        delete state.selectedVariants[variantId];
      } else {
        $card.addClass('selected');
        state.selectedVariants[variantId] = 1;
        $(`#cb-qty-${variantId}`).val(1);
      }
      updateCalculations();
    });

    // Quantity Plus Click
    $(document).on('click', '.cb-qty-plus', function (e) {
      e.stopPropagation();
      const variantId = $(this).data('id');
      if (!state.selectedVariants[variantId]) {
        state.selectedVariants[variantId] = 1;
      }
      state.selectedVariants[variantId]++;
      $(`#cb-qty-${variantId}`).val(state.selectedVariants[variantId]);
      updateCalculations();
    });

    // Quantity Minus Click
    $(document).on('click', '.cb-qty-minus', function (e) {
      e.stopPropagation();
      const variantId = $(this).data('id');
      if (state.selectedVariants[variantId] && state.selectedVariants[variantId] > 1) {
        state.selectedVariants[variantId]--;
        $(`#cb-qty-${variantId}`).val(state.selectedVariants[variantId]);
      } else if (state.selectedVariants[variantId] === 1) {
        // Deselect if decremented to 0
        delete state.selectedVariants[variantId];
        $(`.cb-variant-card[data-id="${variantId}"]`).removeClass('selected');
      }
      updateCalculations();
    });

    // Shipping Zone Selection
    $('.cb-shipping-option').on('click', function () {
      $('.cb-shipping-option').removeClass('active');
      $(this).addClass('active');

      state.shippingCost = parseInt($(this).data('cost'), 10);
      state.shippingZoneValue = $(this).data('value');

      updateCalculations();
    });

    // Input validations on keyup/change to clear errors
    $('#cb-customer-name').on('input', function () {
      if ($(this).val().trim() !== '') {
        $(this).removeClass('is-invalid');
        $('#cb-name-error').hide();
      }
    });

    $('#cb-customer-phone').on('input', function () {
      const phone = $(this).val().trim();
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      if (bdPhoneRegex.test(phone)) {
        $(this).removeClass('is-invalid');
        $('#cb-phone-error').hide();
      }
    });

    $('#cb-customer-address').on('input', function () {
      if ($(this).val().trim() !== '') {
        $(this).removeClass('is-invalid');
        $('#cb-address-error').hide();
      }
    });

    // Form Submission
    $('#cb-checkout-form').on('submit', function (e) {
      e.preventDefault();
      handleOrderSubmission();
    });

    // (Success page is now a separate page — no modal close needed)

    $('#cb-close-duplicate-btn').on('click', function () {
      $('#cb-duplicate-modal-overlay').removeClass('active');
    });

    $('#cb-close-blocked-btn').on('click', function () {
      $('#cb-blocked-modal-overlay').removeClass('active');
    });

    // Close modals on overlay click
    $('.cb-modal-overlay').on('click', function (e) {
      if ($(e.target).hasClass('cb-modal-overlay')) {
        $(this).removeClass('active');
      }
    });
  }

  // Update real-time total, subtotal, and summary list
  function updateCalculations() {
    let subtotal = 0;
    let totalItems = 0;
    const $summaryItems = $('#cb-summary-items');
    $summaryItems.empty();

    productVariants.forEach(function (v) {
      const qty = state.selectedVariants[v.id];
      if (qty && qty > 0) {
        subtotal += v.price * qty;
        totalItems += qty;

        const rowHtml = `
          <div class="cb-summary-item-row">
            <span class="cb-summary-item-name">${v.name} <span class="cb-summary-item-qty">x${qty}</span></span>
            <span class="cb-summary-item-price">৳${v.price * qty}</span>
          </div>
        `;
        $summaryItems.append(rowHtml);
      }
    });

    if (totalItems === 0) {
      $summaryItems.append('<div class="cb-summary-item-row"><span class="cb-summary-item-name" style="color:var(--error-color);">কোনো কালার সিলেক্ট করা হয়নি</span></div>');
    }

    const total = subtotal > 0 ? (subtotal + state.shippingCost) : 0;

    $('#cb-summary-subtotal').text(`৳${subtotal}`);
    $('#cb-summary-shipping').text(`৳${state.shippingCost}`);
    $('#cb-summary-total').text(`৳${total}`);
  }

  // Fetch Customer IP
  function fetchCustomerIp() {
    $.ajax({
      url: 'https://api.ipify.org?format=json',
      method: 'GET',
      timeout: 5000,
      success: function (data) {
        if (data && data.ip) {
          state.customerIp = data.ip;
          console.log("Customer IP (ipify):", state.customerIp);
        }
      },
      error: function () {
        // Fallback to ipinfo.io
        $.ajax({
          url: 'https://ipinfo.io/json',
          method: 'GET',
          timeout: 5000,
          success: function (data) {
            if (data && data.ip) {
              state.customerIp = data.ip;
              console.log("Customer IP (ipinfo fallback):", state.customerIp);
            }
          },
          error: function (err) {
            console.error("Failed to retrieve IP address:", err);
          }
        });
      }
    });
  }

  // Traffic Source Detection
  function initTrafficSource() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. UTM Source
    const utmSource = urlParams.get('utm_source');
    if (utmSource) {
      state.trafficSource = utmSource;
      console.log("Traffic Source (utm_source):", state.trafficSource);
      return;
    }

    // 2. Click IDs
    if (urlParams.has('fbclid')) {
      state.trafficSource = "Facebook";
    } else if (urlParams.has('gclid')) {
      state.trafficSource = "Google Ads";
    } else if (urlParams.has('ttclid')) {
      state.trafficSource = "TikTok";
    } else if (urlParams.has('msclkid')) {
      state.trafficSource = "Bing Ads";
    } else {
      // 3. Referrer domain matching
      const referrer = document.referrer ? document.referrer.toLowerCase() : "";
      if (referrer) {
        if (referrer.includes('facebook.com') || referrer.includes('fb.com')) {
          state.trafficSource = "Facebook";
        } else if (referrer.includes('instagram.com')) {
          state.trafficSource = "Instagram";
        } else if (referrer.includes('tiktok.com')) {
          state.trafficSource = "TikTok";
        } else if (referrer.includes('google.com') || referrer.includes('google.com.bd')) {
          state.trafficSource = "Google";
        } else if (referrer.includes('youtube.com') || referrer.includes('youtu.be')) {
          state.trafficSource = "YouTube";
        } else if (referrer.includes('whatsapp.com') || referrer.includes('wa.me')) {
          state.trafficSource = "WhatsApp";
        } else if (referrer.includes('linkedin.com')) {
          state.trafficSource = "LinkedIn";
        } else if (referrer.includes('x.com') || referrer.includes('twitter.com') || referrer.includes('t.co')) {
          state.trafficSource = "Twitter/X";
        } else if (referrer.includes('bing.com')) {
          state.trafficSource = "Bing";
        } else if (referrer.includes('pinterest.com')) {
          state.trafficSource = "Pinterest";
        } else {
          try {
            const urlObj = new URL(referrer);
            state.trafficSource = urlObj.hostname || "Direct";
          } catch (e) {
            state.trafficSource = "Referrer Match Error";
          }
        }
      } else {
        state.trafficSource = "Direct";
      }
    }
    console.log("Traffic Source:", state.trafficSource);
  }

  // Validate form fields
  function validateForm() {
    let isValid = true;

    // Name Validation
    const name = $('#cb-customer-name').val().trim();
    if (name === '') {
      $('#cb-customer-name').addClass('is-invalid');
      $('#cb-name-error').show();
      isValid = false;
    } else {
      $('#cb-customer-name').removeClass('is-invalid');
      $('#cb-name-error').hide();
    }

    // Phone Validation
    const phone = $('#cb-customer-phone').val().trim();
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(phone)) {
      $('#cb-customer-phone').addClass('is-invalid');
      $('#cb-phone-error').show();
      isValid = false;
    } else {
      $('#cb-customer-phone').removeClass('is-invalid');
      $('#cb-phone-error').hide();
    }

    // Address Validation
    const address = $('#cb-customer-address').val().trim();
    if (address === '') {
      $('#cb-customer-address').addClass('is-invalid');
      $('#cb-address-error').show();
      isValid = false;
    } else {
      $('#cb-customer-address').removeClass('is-invalid');
      $('#cb-address-error').hide();
    }

    // Selected Variants Validation
    const selectedKeys = Object.keys(state.selectedVariants);
    if (selectedKeys.length === 0) {
      alert("অর্ডার করতে অনুগ্রহ করে অন্তত একটি ব্যাগের কালার সিলেক্ট করুন।");
      isValid = false;
    }

    return isValid;
  }

  // Handle entire checkout submit flow
  async function handleOrderSubmission() {
    if (!validateForm()) {
      // Scroll to checkout form if invalid
      $('html, body').animate({
        scrollTop: $('#cb-checkout-form').offset().top - 100
      }, 500);
      return;
    }

    if (!supabase) {
      alert("সিস্টেম ত্রুটি! ডাটাবেস সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।");
      return;
    }

    const name = $('#cb-customer-name').val().trim();
    const phone = $('#cb-customer-phone').val().trim();
    const address = $('#cb-customer-address').val().trim();

    // Disable Submit Button and show loading
    const $submitBtn = $('#cb-submit-order');
    $submitBtn.prop('disabled', true).addClass('loading');

    try {
      // 1. IP Block List Check
      if (state.customerIp) {
        const { data: blockedIp, error: blockError } = await supabase
          .from('blocked_ip_addresses')
          .select('ip_address')
          .eq('ip_address', state.customerIp)
          .eq('is_active', true)
          .maybeSingle();

        if (blockError) {
          console.error("IP block checking failed:", blockError);
        }

        if (blockedIp) {
          // Blocked IP found
          $('#cb-blocked-modal-overlay').addClass('active');
          $submitBtn.prop('disabled', false).removeClass('loading');
          return;
        }
      }

      // 2. Duplicate order check / Rate limiting
      // Exception Phone: 01315183993 bypasses rate limit check
      if (phone !== '01315183993') {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

        // A. Phone check in DB
        const { data: phoneMatch, error: phoneMatchError } = await supabase
          .from('orders')
          .select('id')
          .eq('phone', phone)
          .gte('created_at', threeHoursAgo)
          .limit(1);

        if (phoneMatchError) console.error(phoneMatchError);

        if (phoneMatch && phoneMatch.length > 0) {
          $('#cb-duplicate-modal-overlay').addClass('active');
          $submitBtn.prop('disabled', false).removeClass('loading');
          return;
        }

        // B. IP check in DB
        if (state.customerIp) {
          const { data: ipMatch, error: ipMatchError } = await supabase
            .from('orders')
            .select('id')
            .eq('ip_address', state.customerIp)
            .gte('created_at', threeHoursAgo)
            .limit(1);

          if (ipMatchError) console.error(ipMatchError);

          if (ipMatch && ipMatch.length > 0) {
            $('#cb-duplicate-modal-overlay').addClass('active');
            $submitBtn.prop('disabled', false).removeClass('loading');
            return;
          }
        }

        // C. LocalStorage check
        const lastOrderTime = localStorage.getItem('last_order_time');
        if (lastOrderTime) {
          const timeDiff = Date.now() - parseInt(lastOrderTime, 10);
          if (timeDiff < 3 * 60 * 60 * 1000) { // 3 hours in ms
            $('#cb-duplicate-modal-overlay').addClass('active');
            $submitBtn.prop('disabled', false).removeClass('loading');
            return;
          }
        }
      }

      // Build Order Data
      const orderId = `STB-${Math.floor(100000 + Math.random() * 900000)}`;

      // Calculate totals
      let subtotal = 0;
      let totalItems = 0;
      const orderedItems = [];

      productVariants.forEach(function (v) {
        const qty = state.selectedVariants[v.id];
        if (qty && qty > 0) {
          subtotal += v.price * qty;
          totalItems += qty;
          orderedItems.push({
            name: v.name,
            quantity: qty,
            price: v.price
          });
        }
      });

      const total = subtotal + state.shippingCost;

      const orderData = {
        id: orderId,
        customer_name: name,
        phone: phone,
        address: address,
        product_name: PRODUCT_NAME,
        ordered_items: orderedItems,
        amount: total,
        items: totalItems,
        shipping_zone: state.shippingZoneValue,
        source: "cross-bag-landing",
        status: "New",
        ip_address: state.customerIp || null,
        traffic_source: state.trafficSource
      };

      // 3. Insert order into Supabase
      const { error: insertError } = await supabase
        .from('orders')
        .insert([orderData]);

      if (insertError) {
        throw insertError;
      }

      // Success logic:
      // A. Save localStorage timestamp (for duplicate order prevention)
      localStorage.setItem('last_order_time', Date.now().toString());

      // B. Save order details for success page
      localStorage.setItem('last_order_details', JSON.stringify({
        orderId: orderId,
        total: total,
        phone: phone,
        items: orderedItems,
        timestamp: Date.now()
      }));

      // C. Redirect to standalone success page
      window.location.href = 'success.html';

    } catch (err) {
      console.error("Order submission failed:", err);
      alert("অর্ডার সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে আপনার তথ্য পুনরায় যাচাই করুন অথবা আমাদের সাথে যোগাযোগ করুন।");
    } finally {
      // Re-enable submit button
      $submitBtn.prop('disabled', false).removeClass('loading');
    }
  }

})(jQuery);
