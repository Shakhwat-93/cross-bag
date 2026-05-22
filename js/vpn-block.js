jQuery(document).ready(function($) {
    // Check VPN status when page loads
    checkVPNStatus();

    // Handle close button click
    $('.orderguard-vpn-close').on('click', function() {
        $('#orderguard-vpn-popup').fadeOut(300);
    });

    function checkVPNStatus() {
        console.log('Checking VPN status...');
        $.ajax({
            url: orderguardVpnBlock.ajaxurl,
            type: 'POST',
            data: {
                action: 'check_vpn_status',
                nonce: orderguardVpnBlock.nonce
            },
            success: function(response) {
                console.log('VPN check response:', response);
                if (response.success) {
                    if (response.data.proxy === 'yes') {
                        console.log('VPN detected, showing popup');
                        showVPNPopup();
                        blockForms();
                    } else {
                        console.log('No VPN detected');
                    }
                } else {
                    console.error('VPN check failed:', response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('VPN check AJAX error:', error);
                console.error('Status:', status);
                console.error('Response:', xhr.responseText);
            }
        });
    }

    function showVPNPopup() {
        console.log('Showing VPN popup');
        $('#orderguard-vpn-popup').fadeIn(300);
    }

    function blockForms() {
        // Add VPN detected class to body
        $('body').addClass('vpn-detected');

        // Prevent form submissions
        $('form').on('submit', function(e) {
            e.preventDefault();
            return false;
        });

        // Disable all buttons
        $('button, input[type="submit"], input[type="button"]').prop('disabled', true);

        // Remove click handlers from links
        $('a').off('click');

        // Prevent right-click
        $(document).on('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        // Prevent keyboard shortcuts
        $(document).on('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                return false;
            }
        });
    }
}); 