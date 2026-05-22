jQuery(document).ready(function($) {
    // Get popup elements
    const popup = $('#orderguard-blocked-popup');
    
    // Function to block forms and prevent submissions
    function blockForms() {
        // Add blocked user class to body
        $('body').addClass('user-blocked');

        // Prevent form submissions
        $('form').on('submit', function(e) {
            e.preventDefault();
            showBlockedPopup(); // Show popup again if they try to submit a form
            return false;
        });

        // Disable checkout button in mini-cart
        $('.widget_shopping_cart .checkout, .widget_shopping_cart .wc-forward').addClass('disabled');
        $('.widget_shopping_cart .checkout, .widget_shopping_cart .wc-forward').on('click', function(e) {
            e.preventDefault();
            showBlockedPopup();
            return false;
        });

        // Disable add to cart buttons
        $('form[action*="add-to-cart"]').on('submit', function(e) {
            e.preventDefault();
            showBlockedPopup();
            return false;
        });

        // Disable quantity inputs
        $('.quantity input').prop('disabled', true);
        
        // Disable all order-related buttons
        $('.woocommerce #respond input#submit, ' +
          '.woocommerce a.button, ' +
          '.woocommerce button.button, ' +
          '.woocommerce input.button, ' +
          '.woocommerce #respond input#submit.alt, ' +
          '.woocommerce a.button.alt, ' +
          '.woocommerce button.button.alt, ' +
          '.woocommerce input.button.alt').prop('disabled', true);
    }
    
    // Function to show blocked popup
    function showBlockedPopup() {
        popup.css('display', 'flex').hide().fadeIn(300);
    }
    
    // Check if user is blocked on page load
    if (document.cookie.indexOf('orderguard_user_blocked=yes') !== -1) {
        // Don't show popup on thank you pages or order confirmation pages
        const isThankYouPage = window.location.href.includes('order-received') || 
                              window.location.href.includes('view-order') ||
                              window.location.href.includes('order=') ||
                              window.location.href.includes('key=') ||
                              document.body.classList.contains('woocommerce-order-received') ||
                              document.body.classList.contains('woocommerce-view-order');
        
        if (!isThankYouPage) {
            showBlockedPopup();
            blockForms();
        }
    }
    
    // Handle call button click
    $('.orderguard-call-button').on('click', function(e) {
        // Let the native phone functionality handle the call
        // No need to prevent default or handle anything else
    });
}); 