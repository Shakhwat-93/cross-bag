jQuery(document).ready(function ($) {
    // Only run on checkout page
    if (!$('body').hasClass('woocommerce-checkout')) {
        return;
    }

    let phoneStored = false;
    let formSubmitted = false;
    let minFieldsCount = 3; // Minimum fields to collect before storing

    // Store data when order placed (to prevent duplicate storage)
    $(document.body).on('checkout_place_order', function() {
        formSubmitted = true;
        return true; // Allow the form to submit
    });

    // Also mark as submitted when the form is actually submitted
    $('form.woocommerce-checkout').on('submit', function() {
        formSubmitted = true;
        return true; // Allow the form to submit
    });

    // Function to collect form data
    function collectFormData() {
        return {
            phone: $('#billing_phone').val(),
            billing_first_name: $('#billing_first_name').val(),
            email: $('#billing_email').val(),
            address: $('#billing_address_1').val()
        };
    }

    // Function to check if we should store data
    function shouldStoreData(data) {
        // Don't store if form submitted or already stored
        if (formSubmitted || phoneStored) {
            return false;
        }

        // Must have valid phone
        if (!data.phone || data.phone.length < 10) {
            return false;
        }

        // Count filled fields to determine if enough customer data
        let filledFields = 0;
        Object.keys(data).forEach(function(key) {
            if (data[key] && data[key].trim() !== '') {
                filledFields++;
            }
        });

        return filledFields >= minFieldsCount;
    }

    // Monitor checkout form changes
    let debounceTimer;
    $('form.checkout').on('change input', 'input, select, textarea', function() {
        clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(function() {
            // Don't attempt to store data if the form has been submitted
            if (formSubmitted) {
                return;
            }
            
            const data = collectFormData();
            
            if (shouldStoreData(data)) {
                storeIncompleteOrder(data);
            }
        }, 2000); // 2 second debounce
    });

    // Handle payment method changes (some gateways trigger form submission)
    $(document.body).on('payment_method_selected', function() {
        // Nothing special needed, just watch for form submission
    });

    // Main function to store incomplete order via AJAX
    function storeIncompleteOrder(data) {
        // Additional check to prevent storing after submission
        if (formSubmitted) {
            return;
        }
        
        $.ajax({
            url: orderguard_incomplete.ajax_url,
            type: 'POST',
            data: {
                action: 'store_incomplete_order',
                nonce: orderguard_incomplete.nonce,
                admin_action: 'false', // Specify this is not an admin action
                phone: data.phone,
                billing_first_name: data.billing_first_name,
                email: data.email,
                address: data.address
            },
            success: function(response) {
                if (response.success) {
                    phoneStored = true;
                    console.log('OrderGuard: Incomplete order data stored');
                    
                    // Check status in response
                    if (response.data && response.data.status) {
                        switch(response.data.status) {
                            case 'cooldown':
                                console.log('OrderGuard: Order in cooldown period. ' + response.data.message);
                                phoneStored = true; // Still mark as stored to prevent repeated attempts
                                break;
                            case 'new':
                                console.log('OrderGuard: New incomplete order created');
                                phoneStored = true;
                                break;
                            case 'existing':
                                console.log('OrderGuard: Phone number already being tracked');
                                phoneStored = true;
                                break;
                            default:
                                console.log('OrderGuard: ' + response.data.message);
                                phoneStored = true;
                        }
                    }
                }
            },
            error: function() {
                console.log('OrderGuard: Error storing incomplete order data');
            }
        });
    }

    // When leaving page with data in form, try to capture
    $(window).on('beforeunload', function() {
        if (formSubmitted || phoneStored) {
            return;
        }

        const data = collectFormData();
        if (shouldStoreData(data)) {
            // Use navigator.sendBeacon for more reliable data sending when page is unloading
            if (navigator.sendBeacon) {
                const formData = new FormData();
                formData.append('action', 'store_incomplete_order');
                formData.append('nonce', orderguard_incomplete.nonce);
                formData.append('admin_action', 'false');
                
                Object.keys(data).forEach(function(key) {
                    formData.append(key, data[key]);
                });
                
                navigator.sendBeacon(orderguard_incomplete.ajax_url, formData);
            } else {
                // Fallback to sync ajax
                $.ajax({
                    url: orderguard_incomplete.ajax_url,
                    type: 'POST',
                    async: false,
                    data: {
                        action: 'store_incomplete_order',
                        nonce: orderguard_incomplete.nonce,
                        admin_action: 'false',
                        phone: data.phone,
                        billing_first_name: data.billing_first_name,
                        email: data.email,
                        address: data.address
                    },
                    success: function(response) {
                        if (response.success && response.data && response.data.status) {
                            console.log('OrderGuard on exit: ' + response.data.message);
                        }
                    }
                });
            }
        }
    });
}); 