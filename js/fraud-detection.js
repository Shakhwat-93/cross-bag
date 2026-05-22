/**
 * OrderGuard Fraud Detection
 * 
 * This script handles the generation and storage of a unique user ID
 * for tracking purposes across different sessions and networks.
 */

(function($) {
    'use strict';

    /**
     * Generate a random string of specified length
     * 
     * @param {number} length The length of the string
     * @return {string} The random string
     */
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate a unique user ID based on browser fingerprint and random string
     * 
     * @return {string} The unique user ID
     */
    function generateUniqueId() {
        // Start with a timestamp in milliseconds
        const timestamp = new Date().getTime().toString();
        
        // Add a random component
        const randomPart = generateRandomString(16);
        
        // Generate browser fingerprint components
        const userAgent = navigator.userAgent;
        const language = navigator.language;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const timezone = new Date().getTimezoneOffset();
        
        // Combine components and create a hash-like fingerprint
        let fingerprint = userAgent + language + screenWidth + screenHeight + timezone;
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Combine all parts to create the final unique ID
        return 'og_' + timestamp + '_' + hash.toString(16) + '_' + randomPart;
    }

    /**
     * Set a cookie with the given name, value, and expiration days
     * 
     * @param {string} name The cookie name
     * @param {string} value The cookie value
     * @param {number} days The expiration in days
     */
    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Strict';
    }

    /**
     * Get a cookie by name
     * 
     * @param {string} name The cookie name
     * @return {string|null} The cookie value or null
     */
    function getCookie(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Initialize the user tracking
     */
    function init() {
        // Try to get the user ID from localStorage first
        let userId = localStorage.getItem('orderguard_user_id');
        
        // If not in localStorage, try to get from cookie
        if (!userId) {
            userId = getCookie('orderguard_user_id');
        }
        
        // If no user ID found, generate a new one
        if (!userId) {
            userId = generateUniqueId();
            
            // Store in both localStorage and cookie for redundancy
            localStorage.setItem('orderguard_user_id', userId);
            setCookie('orderguard_user_id', userId, 365); // 1 year expiration
        } else {
            // Ensure it's stored in both places
            localStorage.setItem('orderguard_user_id', userId);
            setCookie('orderguard_user_id', userId, 365);
        }

        // If we are on the checkout page, send user ID to server
        if ($('body').hasClass('woocommerce-checkout')) {
            $.ajax({
                url: orderguardFraudDetection.ajaxurl,
                type: 'POST',
                data: {
                    action: 'orderguard_track_user_visit',
                    user_id: userId,
                    nonce: orderguardFraudDetection.nonce
                },
                success: function(response) {
                    console.log('Fraud detection tracking initialized');
                }
            });
        }
    }

    // Initialize when document is ready
    $(document).ready(function() {
        init();
    });

})(jQuery); 