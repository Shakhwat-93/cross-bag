jQuery(document).ready(function($) {
    if (typeof orderguardSmartFilter === 'undefined' || orderguardSmartFilter.enabled !== '1') {
        return;
    }

    const phoneField = $('#billing_phone');
    let dpRatioChecked = false;
    let lastCheckedPhone = '';
    let isProcessing = false;
    let popupShown = false;

    // Add a custom validation message container (hidden by default)
    let validationMessage = $('<div class="orderguard-smart-filter-message" style="display:none;"></div>');
    phoneField.after(validationMessage);
    
    // Create a wrapper for the phone field to properly position the icon
    phoneField.wrap('<div class="phone-field-wrapper" style="position:relative;"></div>');
    
    // Add status indicator container next to the phone field
    let statusIndicator = $('<div class="dp-status-indicator"></div>');
    phoneField.after(statusIndicator);
    
    // Add popup to the page
    $('body').append(`
        <div class="orderguard-dp-popup">
            <div class="orderguard-dp-popup-content">
                <div class="orderguard-dp-popup-header">
                    <h3>Smart Order Filter Alert</h3>
                    <button class="orderguard-dp-popup-close" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="orderguard-dp-popup-body">
                    <div class="orderguard-dp-popup-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                    </div>
                    <div class="orderguard-dp-popup-message"></div>
                    
                    <div class="orderguard-dp-popup-actions">
                        <button class="orderguard-dp-popup-button primary" id="dp-popup-verify">Verify Phone</button>
                    </div>
                    <div class="orderguard-dp-popup-support">
                        Need help? <a href="tel:" id="dp-support-phone">Contact Support</a>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    // Get popup elements
    const popup = $('.orderguard-dp-popup');
    const popupMessage = $('.orderguard-dp-popup-message');
    const verifyButton = $('#dp-popup-verify');
    const supportPhone = $('#dp-support-phone');
    const closeButton = $('.orderguard-dp-popup-close');
    
    // Set support phone if available
    if (orderguardSmartFilter.support_phone) {
        supportPhone.attr('href', 'tel:' + orderguardSmartFilter.support_phone);
        supportPhone.text(orderguardSmartFilter.support_phone);
        $('.orderguard-dp-popup-support').show();
    } else {
        $('.orderguard-dp-popup-support').hide();
    }
    
    // Handle verify button click - This should not be used anymore
    verifyButton.on('click', function() {
        popup.fadeOut(300);
    });

    // Handle close button click
    closeButton.on('click', function() {
        popup.fadeOut(300);
        popupShown = false; // Reset popup shown flag
    });

    // Function to check delivery performance ratio
    function checkDPRatio(phone) {
        if (phone === lastCheckedPhone) {
            return;
        }
        
        // Reset status
        dpRatioChecked = false;
        lastCheckedPhone = phone;
        
        // Show loading indicator
        showLoadingIndicator();
        
        // Hide any previous messages
        validationMessage.hide();
        
        isProcessing = true;

        $.ajax({
            url: orderguardSmartFilter.ajaxurl,
            type: 'POST',
            data: {
                action: 'check_dp_ratio',
                nonce: orderguardSmartFilter.nonce,
                phone: phone
            },
            success: function(response) {
                if (response.success) {
                    dpRatioChecked = true;
                    
                    if (response.data.below_threshold) {
                        // Show status based on action
                        if (response.data.action === 'block') {
                            // Show error status only
                            showStatusIndicator('error');
                            
                            // Keep button disabled for blocked numbers
                            window.smartFilterPhoneValidated = false;
                            
                            // Show popup for block action
                            showDpPopup('error', response.data.block_message);
                        } else if (response.data.action === 'otp') {
                            // Show warning status only - no popup needed
                            showStatusIndicator('warning');
                            
                            // Store the DP check result for form submission
                            window.smartFilterLowDp = response.data.below_threshold;
                            window.smartFilterNeedsOtp = response.data.needs_verification;
                            
                            // For OTP action with low DP, enable button to allow OTP flow
                            if (response.data.needs_verification) {
                                // Enable button so user can click to trigger OTP
                                window.smartFilterPhoneValidated = true;
                            } else {
                                // Already verified, enable button
                                window.smartFilterPhoneValidated = true;
                            }
                        }
                    } else {
                        // Show success status and enable place order button
                        showStatusIndicator('success');
                        window.smartFilterPhoneValidated = true;
                        
                        // Clear low DP flags since this phone has good DP
                        window.smartFilterLowDp = false;
                        window.smartFilterNeedsOtp = false;
                    }
                    
                    // Update button state after validation
                    updatePlaceOrderButton();
                } else {
                    console.error('Failed to check DP ratio:', response.data.message);
                    showStatusIndicator('warning');
                    
                    // API failed - allow order to proceed (fail-open approach)
                    window.smartFilterPhoneValidated = true;
                    window.smartFilterLowDp = false;
                    window.smartFilterNeedsOtp = false;
                    updatePlaceOrderButton();
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error:', error);
                showStatusIndicator('warning');
                
                // API error - allow order to proceed (fail-open approach)
                window.smartFilterPhoneValidated = true;
                window.smartFilterLowDp = false;
                window.smartFilterNeedsOtp = false;
                updatePlaceOrderButton();
            },
            complete: function() {
                isProcessing = false;
            }
        });
    }
    
    // Function to show the DP popup
    function showDpPopup(type, message) {
        // Don't show popup again if already shown for this phone number
        if (popupShown) {
            return;
        }
        
        popupShown = true;
        
        // Set popup type
        popup.removeClass('error warning').addClass(type);
        
        // Set popup content based on type
        if (type === 'error') {
            // Use admin-configured message or fallback
            message = message || 'This phone number has a poor delivery performance history and cannot be used for ordering.';
            popupMessage.html(message);
            
            // Hide verify button since we're blocking the order
            verifyButton.hide();
            
            // Remove any WooCommerce error messages
            $('.woocommerce-error').remove();
        } else if (type === 'warning') {
            // Use admin-configured message or fallback
            message = message || 'This phone number requires verification before placing an order.';
            popupMessage.html(message);
            
            // Show verify button for OTP
            verifyButton.text('Verify with OTP').show();
            
            // Remove any WooCommerce error messages
            $('.woocommerce-error').remove();
        }
        
        // Show popup
        popup.css('display', 'flex');
    }
    
    // Function to show loading indicator
    function showLoadingIndicator() {
        statusIndicator.html(`
            <span class="dp-checking-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" class="dp-spinner">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path fill="#2563eb" d="M12 2a10 10 0 0 1 10 10 1 1 0 0 1-2 0 8 8 0 0 0-8-8 1 1 0 0 1 0-2z"/>
                </svg>
            </span>
        `);
        statusIndicator.show();
    }
    
    // Function to show status indicator
    function showStatusIndicator(status) {
        let icon = '';
        
        switch(status) {
            case 'success':
                icon = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path fill="#22c55e" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z"/>
                    </svg>
                `;
                break;
            case 'error':
                icon = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path fill="#ef4444" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-11.414L9.172 7.757 7.757 9.172 10.586 12l-2.829 2.828 1.415 1.415L12 13.414l2.828 2.829 1.415-1.415L13.414 12l2.829-2.828-1.415-1.415L12 10.586z"/>
                    </svg>
                `;
                break;
            case 'warning':
                icon = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path fill="#f59e0b" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                    </svg>
                `;
                break;
            default:
                icon = '';
                statusIndicator.empty().hide();
                return;
        }
        
        statusIndicator.html(`<span class="dp-status-icon ${status}">${icon}</span>`);
        statusIndicator.show();
    }

    // Check DP ratio when typing (with debounce)
    let typingTimer;
    phoneField.on('input', function() {
        const phone = $(this).val().trim();
        
        // Clear any existing timer
        clearTimeout(typingTimer);
        
        // Reset popup shown flag when phone number changes
        popupShown = false;
        
        // Add visual indicator that we're waiting to check
        phoneField.addClass('dp-check-needed');
        
        // Set a timer to check after typing stops
        if (phone && phone.length >= 10) {
            typingTimer = setTimeout(function() {
                phoneField.removeClass('dp-check-needed');
                checkDPRatio(phone);
            }, 700);
        } else {
            // Clear indicators if phone is too short
            statusIndicator.empty().hide();
            validationMessage.hide();
            
            // Reset flags for short phone numbers
            window.smartFilterLowDp = false;
            window.smartFilterNeedsOtp = false;
            window.smartFilterPhoneValidated = false;
        }
    });

    // Check DP ratio when phone number field loses focus
    phoneField.on('blur', function() {
        const phone = $(this).val().trim();
        
        // Clear typing timer
        clearTimeout(typingTimer);
        phoneField.removeClass('dp-check-needed');
        
        if (phone && phone.length >= 10 && !isProcessing) {
            checkDPRatio(phone);
        }
    });

    // Initialize global flags
    window.smartFilterOtpVerified = false;
    window.smartFilterPhoneValidated = false;
    window.smartFilterLowDp = false;
    window.smartFilterNeedsOtp = false;
    
    // Disable place order button by default when Smart Order Filter is enabled
    function updatePlaceOrderButton() {
        const placeOrderButton = $('#place_order');
        const phone = phoneField.val().trim();
        
        if (!phone || phone.length < 10) {
            // No phone number or too short - disable button
            placeOrderButton.prop('disabled', true).text('Enter Phone Number');
            window.smartFilterPhoneValidated = false;
        } else if (window.smartFilterPhoneValidated === true || window.smartFilterOtpVerified === true) {
            // Phone validated or OTP verified - enable button
            // Check if OTP verification is needed for this phone
            if (window.smartFilterLowDp === true && window.smartFilterNeedsOtp === true && !window.smartFilterOtpVerified) {
                placeOrderButton.prop('disabled', false).text('Place Order (OTP Required)');
            } else {
                placeOrderButton.prop('disabled', false).text('Place Order');
            }
        } else {
            // Phone entered but not validated yet - disable button
            placeOrderButton.prop('disabled', true).text('Validating Phone...');
        }
    }
    
    // Initial button state
    updatePlaceOrderButton();
    
    // Update button state when phone field changes
    phoneField.on('input', function() {
        // Reset flags when phone number changes
        window.smartFilterLowDp = false;
        window.smartFilterNeedsOtp = false;
        window.smartFilterOtpVerified = false;
        window.smartFilterPhoneValidated = false;
        
        updatePlaceOrderButton();
    });
    
    // Multiple interception points to ensure form doesn't submit without verification
    
    // Intercept form submission for Smart Order Filter OTP verification
    $('form.checkout').on('checkout_place_order', function(e) {
        const phone = phoneField.val().trim();
        
        // Check if phone is blocked by repeat order blocker (enhanced check)
        if (window.orderguardPhoneBlocked === true || window.orderguardRepeatOrderBlocked === true) {
            // Trigger event for repeat order blocker to handle
            $(document).trigger('orderguard_smart_filter_submit', [e]);
            return false;
        }
        
        // Check if we should bypass Smart Order Filter validation
        if (window.smartFilterBypassNext === true) {
            window.smartFilterBypassNext = false; // Reset flag
            return true;
        }
        
        // Check if Smart Order Filter OTP is already verified
        if (window.smartFilterOtpVerified === true) {
            // Allow form submission to proceed
            return true;
        }
        
        if (phone && !isProcessing) {
            let shouldBlockOrder = false;
            
            // Check DP ratio synchronously before submission
            $.ajax({
                url: orderguardSmartFilter.ajaxurl,
                type: 'POST',
                async: false,
                data: {
                    action: 'check_dp_ratio',
                    nonce: orderguardSmartFilter.nonce,
                    phone: phone
                },
                success: function(response) {
                    if (response.success) {
                        if (response.data.below_threshold && response.data.action === 'block') {
                            // Show error popup for block action
                            showDpPopup('error', response.data.block_message);
                            shouldBlockOrder = true;
                        } else if (response.data.below_threshold && response.data.action === 'otp' && response.data.needs_verification) {
                            // Block order and show OTP modal
                            shouldBlockOrder = true;
                            
                            // Show Smart Order Filter OTP modal
                            setTimeout(function() {
                                if (typeof window.showSmartFilterOtpModal === 'function') {
                                    window.showSmartFilterOtpModal(phone);
                                } else {
                                    console.error('Smart Order Filter OTP modal function not found');
                                }
                            }, 100);
                        }
                    }
                }
            });
            
            if (shouldBlockOrder) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }
        
        return true;
    });
    
    // Additional form submission prevention
    $('form.checkout').on('submit', function(e) {
        const phone = phoneField.val().trim();
        
        // Check if we should bypass Smart Order Filter validation
        if (window.smartFilterBypassNext === true) {
            window.smartFilterBypassNext = false; // Reset flag
            return true;
        }
        
        if (window.smartFilterOtpVerified === true) {
            return true;
        }
        
        if (phone) {
            // Check if we need Smart Order Filter verification
            let needsVerification = false;
            
            $.ajax({
                url: orderguardSmartFilter.ajaxurl,
                type: 'POST',
                async: false,
                data: {
                    action: 'check_dp_ratio',
                    nonce: orderguardSmartFilter.nonce,
                    phone: phone
                },
                success: function(response) {
                    if (response.success && response.data.below_threshold && 
                        response.data.action === 'otp' && response.data.needs_verification) {
                        needsVerification = true;
                    }
                }
            });
            
            if (needsVerification) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }
        
        return true;
    });
    
    // Also intercept place order button clicks
    $(document).on('click', '#place_order', function(e) {
        const phone = phoneField.val().trim();
        
        // Check if we should bypass Smart Order Filter validation
        if (window.smartFilterBypassNext === true) {
            return true; // Don't reset flag here, let form submission handle it
        }
        
        if (window.smartFilterOtpVerified === true) {
            return true;
        }
        
        if (phone) {
            // Check if we need Smart Order Filter verification
            let needsVerification = false;
            
            $.ajax({
                url: orderguardSmartFilter.ajaxurl,
                type: 'POST',
                async: false,
                data: {
                    action: 'check_dp_ratio',
                    nonce: orderguardSmartFilter.nonce,
                    phone: phone
                },
                success: function(response) {
                    if (response.success && response.data.below_threshold && 
                        response.data.action === 'otp' && response.data.needs_verification) {
                        needsVerification = true;
                    }
                }
            });
            
            if (needsVerification) {
                e.preventDefault();
                e.stopImmediatePropagation();
                
                // Show OTP modal
                setTimeout(function() {
                    if (typeof window.showSmartFilterOtpModal === 'function') {
                        window.showSmartFilterOtpModal(phone);
                    }
                }, 100);
                
                return false;
            }
        }
        
        return true;
    });

    // Add enhanced styles
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            /* Message styling - hidden by default */
            .orderguard-smart-filter-message {
                display: none;
            }
            
            /* Phone field wrapper */
            .phone-field-wrapper {
                display: block;
                width: 100%;
            }
            
            /* Status indicator styling */
            .dp-status-indicator {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 99;
                background: transparent;
            }
            .dp-status-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                animation: fadeIn 0.3s ease-out;
            }
            .dp-status-icon.success {
                color: #22c55e;
            }
            .dp-status-icon.error {
                color: #ef4444;
            }
            .dp-status-icon.warning {
                color: #f59e0b;
            }
            .dp-checking-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .dp-spinner {
                animation: spin 1s linear infinite;
            }
            
            /* Phone field styling */
            #billing_phone {
                padding-right: 35px;
                transition: all 0.3s ease;
            }
            #billing_phone.dp-check-needed {
                border-color: #f59e0b;
                box-shadow: 0 0 0 1px #f59e0b;
            }
            
            /* Popup header styling */
            .orderguard-dp-popup-header {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-right: 40px;
            }
            
            /* Close button styling */
            .orderguard-dp-popup-close {
                position: absolute;
                top: 0;
                right: 0;
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                color: #ffffff;
                transition: all 0.2s ease;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .orderguard-dp-popup-close:hover {
                background-color: #f3f4f6;
                color: #374151;
            }
            .orderguard-dp-popup-close:active {
                background-color: #e5e7eb;
            }
            
            /* Animations */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }
        `)
        .appendTo('head');
}); 