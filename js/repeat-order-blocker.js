jQuery(document).ready(function($) {
    // Initialize the global flag to track if phone is blocked
    window.orderguardPhoneBlocked = false;
    window.orderguardPhoneValidated = false; // Track if phone has been validated
    window.orderguardRepeatOrderBlocked = false; // Track if repeat order blocker has blocked submission
    
    // Get billing phone field
    const billingPhoneField = $('#billing_phone');
    
    // Skip if the field doesn't exist (not on checkout page)
    if (!billingPhoneField.length) {
        return;
    }
    
    // Get place order button
    const placeOrderButton = $('#place_order');
    
    // Function to disable/enable place order button
    function togglePlaceOrderButton(disabled, text) {
        if (placeOrderButton.length) {
            placeOrderButton.prop('disabled', disabled);
            if (text) {
                placeOrderButton.text(text);
            }
        }
    }
    
    // Initially disable place order button if phone validation is required
    if (orderguardRepeatBlocker.disablePlaceOrder) {
        togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
    }
    
    // Create a container for error messages if it doesn't exist (only if popup is disabled)
    let errorContainer = $('.repeat-order-error');
    if (!errorContainer.length && !(orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true)) {
        billingPhoneField.after('<div class="repeat-order-error" style="display: none; color: red; margin-top: 5px;"></div>');
        errorContainer = $('.repeat-order-error');
    }
    
    // Add a loader element
    let loaderEl = $('<span class="repeat-order-loader" style="display: none; margin-left: 10px;"><small>Checking...</small></span>');
    billingPhoneField.after(loaderEl);
    
    // Add popup to the body
    $('body').append(`
        <div class="orderguard-repeat-order-popup">
            <div class="orderguard-repeat-order-popup-content">
                <h2>Order Blocked</h2>
                <p class="repeat-order-message"></p>
                <div class="repeat-order-warning">
                    Please wait for the required time period before placing another order with this phone number.
                </div>
                <div class="repeat-order-actions">
                    <button class="orderguard-repeat-order-close">I Understand</button>
                    ${orderguardRepeatBlocker.supportNumber ? 
                        `<a href="tel:${orderguardRepeatBlocker.supportNumber}" class="orderguard-repeat-order-call">
                            <span class="dashicons dashicons-phone"></span> Call Support
                        </a>` : ''}
                </div>
            </div>
        </div>
    `);
    
    // Get popup elements
    const popup = $('.orderguard-repeat-order-popup');
    const popupMessage = $('.repeat-order-message');
    const closeButton = $('.orderguard-repeat-order-close');
    
    // Close popup when button is clicked
    closeButton.on('click', function() {
        popup.fadeOut(300);
    });
    
    // Global function to show popup (accessible by other scripts)
    window.showRepeatOrderPopup = function(message) {
        if (orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true) {
            popupMessage.text(message);
            popup.css('display', 'flex').hide().fadeIn(300);
        }
    };
    
    // Check valid phone number function
    function isValidPhoneFormat(phone) {
        phone = phone.replace(/[^\d+]/g, '');
        
        // Check Bangladesh format with country code (+88 or 88)
        if (phone.indexOf('+88') === 0) {
            return phone.length === 13;
        } else if (phone.indexOf('88') === 0) {
            return phone.length === 13;
        } else {
            // Check local Bangladesh format (11 digits starting with 0)
            return phone.length === 11 && phone.indexOf('0') === 0;
        }
    }
    
    // Debounce function to limit AJAX calls
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Track last checked phone to avoid unnecessary checks
    let lastCheckedPhone = '';
    let lastBlockedPhone = ''; // Track the last phone number that was blocked
    
    // Update the debouncedCheckPhone function to consider hour limit
    function checkPhoneNumber() {
        const phone = billingPhoneField.val().trim();
        const timeLimit = parseInt(orderguardRepeatBlocker.timeLimit) || 24;

        // Skip if phone is empty
        if (!phone) {
            if (errorContainer.length) {
                errorContainer.hide();
            }
            // Reset all flags when phone is empty
            window.orderguardPhoneBlocked = false;
            window.orderguardRepeatOrderBlocked = false;
            window.orderguardPhoneValidated = false;
            
            // Disable place order button if phone is empty
            if (orderguardRepeatBlocker.disablePlaceOrder) {
                togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
            }
            return;
        }

        // Skip if phone format is invalid
        if (!isValidPhoneFormat(phone)) {
            if (errorContainer.length) {
                errorContainer.hide(); // Clear any existing error messages
            }
            // Reset all flags when phone format is invalid
            window.orderguardPhoneBlocked = false;
            window.orderguardRepeatOrderBlocked = false;
            window.orderguardPhoneValidated = false;
            
            // Disable place order button for invalid format
            if (orderguardRepeatBlocker.disablePlaceOrder) {
                togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
            }
            return;
        }

        // Skip if same phone number was already checked
        if (phone === lastCheckedPhone) {
            return;
        }

        // Update last checked phone
        lastCheckedPhone = phone;

        // Show loader and disable button during validation
        loaderEl.show();
        if (orderguardRepeatBlocker.disablePlaceOrder) {
            togglePlaceOrderButton(true, orderguardRepeatBlocker.validatingText);
        }

        // Send AJAX request
        $.ajax({
            url: orderguardRepeatBlocker.ajaxurl,
            type: 'POST',
            data: {
                action: 'orderguard_check_phone',
                nonce: orderguardRepeatBlocker.nonce,
                phone: phone,
                time_limit: timeLimit
            },
            success: function(response) {
                loaderEl.hide();

                if (response.data && response.data.blocked) {
                    // Set global flag to prevent form submission
                    window.orderguardPhoneBlocked = true;
                    window.orderguardPhoneValidated = false;
                    window.orderguardRepeatOrderBlocked = true;
                    lastBlockedPhone = phone; // Track this blocked phone

                    // Show error message only if popup is disabled
                    if (!(orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true)) {
                        if (errorContainer.length) {
                            errorContainer.html(response.data.message).show();
                        }
                    } else {
                        // Hide inline error when popup is enabled
                        if (errorContainer.length) {
                            errorContainer.hide();
                        }
                    }

                    // Disable place order button
                    if (orderguardRepeatBlocker.disablePlaceOrder) {
                        togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
                    }

                    // Show popup if enabled
                    if (orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true) {
                        window.showRepeatOrderPopup(response.data.message);
                    }
                    
                    // Trigger custom event for other scripts
                    $(document).trigger('orderguard_repeat_order_blocked', [phone, response.data.message]);
                } else {
                    // Reset the global flags
                    window.orderguardPhoneBlocked = false;
                    window.orderguardPhoneValidated = true;
                    window.orderguardRepeatOrderBlocked = false;
                    lastBlockedPhone = ''; // Clear blocked phone tracking

                    // Remove error message if exists
                    if (errorContainer.length) {
                        errorContainer.hide();
                    }

                    // Enable place order button
                    if (orderguardRepeatBlocker.disablePlaceOrder) {
                        togglePlaceOrderButton(false, orderguardRepeatBlocker.placeOrderButtonText);
                    }
                    
                    // Trigger custom event for other scripts
                    $(document).trigger('orderguard_repeat_order_allowed', [phone]);
                }
            },
            error: function() {
                // Hide loader
                loaderEl.hide();

                // Hide error on AJAX failure
                if (errorContainer.length) {
                    errorContainer.slideUp();
                }

                // Reset the blocked flags
                window.orderguardPhoneBlocked = false;
                window.orderguardPhoneValidated = false;
                window.orderguardRepeatOrderBlocked = false;

                // Disable place order button on error
                if (orderguardRepeatBlocker.disablePlaceOrder) {
                    togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
                }
            }
        });
    }
    
    // Debounced version to check phone number
    const debouncedCheckPhone = debounce(checkPhoneNumber, 500);
    
    // Bind events
    billingPhoneField.on('input', function() {
        const currentPhone = billingPhoneField.val().trim();
        
        // Reset validation status when user types
        window.orderguardPhoneValidated = false;
        window.orderguardRepeatOrderBlocked = false;
        window.orderguardPhoneBlocked = false; // Reset the blocked flag when typing
        
        // Clear any existing error messages immediately when user starts typing
        // or when phone number changes from the previously blocked one
        if (currentPhone !== lastBlockedPhone) {
            if (errorContainer.length) {
                errorContainer.hide();
            }
            lastBlockedPhone = ''; // Clear the blocked phone tracking
        }
        
        // Disable place order button while typing
        if (orderguardRepeatBlocker.disablePlaceOrder) {
            togglePlaceOrderButton(true, orderguardRepeatBlocker.invalidText);
        }
        
        // Trigger debounced validation
        debouncedCheckPhone();
    });
    
    billingPhoneField.on('blur', function() {
        // Force immediate validation on blur
        checkPhoneNumber();
    });
    
    // Clear errors when field is cleared
    billingPhoneField.on('change', function() {
        const currentPhone = billingPhoneField.val().trim();
        
        // If field is empty or phone number changed from blocked one, clear errors
        if (!currentPhone || currentPhone !== lastBlockedPhone) {
            if (errorContainer.length) {
                errorContainer.hide();
            }
            window.orderguardPhoneBlocked = false;
            window.orderguardRepeatOrderBlocked = false;
            lastBlockedPhone = '';
        }
    });
    
    // Check on page load if field already has a value
    if (billingPhoneField.val().trim()) {
        // Slight delay to ensure page is fully loaded
        setTimeout(checkPhoneNumber, 1000);
    }
    
    // Clear errors when user focuses on the field (starts editing)
    billingPhoneField.on('focus', function() {
        const currentPhone = billingPhoneField.val().trim();
        
        // If the current phone is different from the blocked one, clear errors
        if (currentPhone !== lastBlockedPhone) {
            if (errorContainer.length) {
                errorContainer.hide();
            }
            window.orderguardPhoneBlocked = false;
            window.orderguardRepeatOrderBlocked = false;
            lastBlockedPhone = '';
        }
    });
    
    // Stronger form submission prevention
    function preventFormSubmission(reason) {
        console.log('OrderGuard Repeat Order Blocker: Preventing form submission - ' + reason);
        
        // Show error message only if popup is disabled
        if (!(orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true)) {
            if (errorContainer.length) {
                errorContainer.show();
            }
        } else {
            // Hide inline error when popup is enabled
            if (errorContainer.length) {
                errorContainer.hide();
            }
        }
        
        // Show popup
        window.showRepeatOrderPopup(reason);
        
        // Scroll to phone field
        $('html, body').animate({
            scrollTop: billingPhoneField.offset().top - 100
        }, 500);
        
        return false;
    }
    
    // Override form submission at multiple levels with high priority
    $('form.checkout').off('submit.orderguardRepeatBlocker').on('submit.orderguardRepeatBlocker', function(e) {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return preventFormSubmission('Phone number blocked by repeat order blocker');
        }
        return true;
    });
    
    // Override WooCommerce checkout_place_order event with high priority
    $(document.body).off('checkout_place_order.orderguardRepeatBlocker').on('checkout_place_order.orderguardRepeatBlocker', function() {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            return false;
        }
        return true;
    });
    
    // Override place order button clicks
    $(document).off('click.orderguardRepeatBlocker', '#place_order').on('click.orderguardRepeatBlocker', '#place_order', function(e) {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return preventFormSubmission('Phone number blocked by repeat order blocker');
        }
        return true;
    });
    
    // Override any programmatic form submissions
    let originalSubmit = $.fn.submit;
    $.fn.submit = function() {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            console.log('OrderGuard: Programmatic form submission blocked by repeat order blocker');
            return this;
        }
        return originalSubmit.apply(this, arguments);
    };
    
    // Override trigger method to prevent programmatic submissions
    let originalTrigger = $.fn.trigger;
    $.fn.trigger = function(event) {
        if ((event === 'submit' || event === 'checkout_place_order') && 
            (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true)) {
            console.log('OrderGuard: Programmatic event trigger blocked by repeat order blocker');
            return this;
        }
        return originalTrigger.apply(this, arguments);
    };
    
    // Listen for events from other OrderGuard features and override them
    $(document).on('orderguard_flexible_checkout_submit', function(e) {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return preventFormSubmission('Phone number blocked by repeat order blocker');
        }
    });
    
    $(document).on('orderguard_smart_filter_submit', function(e) {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return preventFormSubmission('Phone number blocked by repeat order blocker');
        }
    });
    
    $(document).on('orderguard_otp_submit', function(e) {
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return preventFormSubmission('Phone number blocked by repeat order blocker');
        }
    });
    
    // Validate on checkout form submission with final check
    $('form.checkout').on('checkout_place_order', function() {
        const phone = billingPhoneField.val().trim();
        
        // Skip validation if field is empty
        if (!phone) {
            return true;
        }
        
        // Check if phone validation is required and not completed
        if (orderguardRepeatBlocker.disablePlaceOrder && !window.orderguardPhoneValidated) {
            // Force validation check
            checkPhoneNumber();
            
            // Prevent submission if not validated
            setTimeout(function() {
                if (!window.orderguardPhoneValidated) {
                    // Scroll to the field
                    $('html, body').animate({
                        scrollTop: billingPhoneField.offset().top - 100
                    }, 500);
                    
                    // Show error message only if popup is disabled
                    if (!(orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true)) {
                        if (errorContainer.length) {
                            errorContainer.html('Please enter a valid phone number and wait for validation to complete.').show();
                        }
                    } else {
                        // Show popup for validation message
                        window.showRepeatOrderPopup('Please enter a valid phone number and wait for validation to complete.');
                        if (errorContainer.length) {
                            errorContainer.hide();
                        }
                    }
                    
                    return false;
                }
            }, 100);
            
            return false;
        }
        
        // Do an immediate check on submission
        if (isValidPhoneFormat(phone)) {
            // Only if phone format is valid
            checkPhoneNumber();
        }
        
        // Final check - if phone is blocked, prevent submission
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            // Show popup with the error message
            window.showRepeatOrderPopup(errorContainer.text() || 'Phone number blocked by repeat order blocker');
            
            // Scroll to the field
            $('html, body').animate({
                scrollTop: billingPhoneField.offset().top - 100
            }, 500);
            
            // Show error message only if popup is disabled
            if (!(orderguardRepeatBlocker.showPopup === '1' || orderguardRepeatBlocker.showPopup === true)) {
                if (errorContainer.length) {
                    errorContainer.show();
                }
            } else {
                // Hide inline error when popup is enabled
                if (errorContainer.length) {
                    errorContainer.hide();
                }
            }
            
            return false;
        }
        
        return true;
    });
    
    // Export functions for other scripts to use
    window.orderguardRepeatOrderBlocker = {
        checkPhone: checkPhoneNumber,
        isBlocked: function() {
            return window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true;
        },
        preventSubmission: preventFormSubmission,
        showPopup: window.showRepeatOrderPopup
    };
}); 