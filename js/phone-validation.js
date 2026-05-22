jQuery(document).ready(function($) {
    // Check if phone validation is enabled
    if (typeof orderguardPhoneValidation === 'undefined' || orderguardPhoneValidation.enabled !== '1') {
        console.log('OrderGuard Phone Validation: Disabled or not configured');
        return;
    }

    console.log('OrderGuard Phone Validation: Initializing...');

    const phoneField = $('#billing_phone');
    
    // Check if phone field exists
    if (phoneField.length === 0) {
        console.log('OrderGuard Phone Validation: Phone field not found');
        return;
    }

    let validationMessage = $('<div class="orderguard-live-validation"></div>');
    phoneField.after(validationMessage);

    function validatePhoneNumber(phone) {
        // Only accept exactly 11 digits starting with 01
        // No spaces, dashes, parentheses, or country codes allowed
        const isValid = /^01\d{9}$/.test(phone);
        console.log('OrderGuard Phone Validation: Validating', phone, 'Result:', isValid);
        return isValid;
    }

    function showValidationMessage() {
        console.log('OrderGuard Phone Validation: Showing message:', orderguardPhoneValidation.message);
        validationMessage.text(orderguardPhoneValidation.message)
            .slideDown(300);
        phoneField.addClass('orderguard-invalid');
    }

    function hideValidationMessage() {
        console.log('OrderGuard Phone Validation: Hiding validation message');
        validationMessage.slideUp(200);
        phoneField.removeClass('orderguard-invalid');
    }

    // Live validation
    phoneField.on('input', function() {
        const phone = $(this).val().trim();
        console.log('OrderGuard Phone Validation: Input event triggered with value:', phone);
        
        if (phone && !validatePhoneNumber(phone)) {
            console.log('OrderGuard Phone Validation: Showing validation message');
            showValidationMessage();
        } else {
            console.log('OrderGuard Phone Validation: Hiding validation message');
            hideValidationMessage();
        }
    });

    // Validate on blur
    phoneField.on('blur', function() {
        const phone = $(this).val().trim();
        if (phone && !validatePhoneNumber(phone)) {
            showValidationMessage();
            // Add shake animation
            phoneField.removeClass('shake').addClass('shake');
            setTimeout(() => phoneField.removeClass('shake'), 800);
        }
    });

    // Remove validation class on focus
    phoneField.on('focus', function() {
        $(this).removeClass('orderguard-invalid');
    });

    // Handle form submission
    $('form.checkout').on('checkout_place_order', function() {
        const phone = phoneField.val().trim();
        if (phone && !validatePhoneNumber(phone)) {
            showValidationMessage();
            // Scroll to phone field
            $('html, body').animate({
                scrollTop: phoneField.offset().top - 100
            }, 500);
            return false;
        }
        return true;
    });
}); 