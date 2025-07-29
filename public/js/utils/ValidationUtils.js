/**
 * Input Validation Utilities
 * Handles validation for user inputs, forms, and data
 */

import CONFIG from '../config/Config.js';

export const ValidationUtils = {
    /**
     * Validate display name input
     * @param {string} name - Display name to validate
     * @returns {string[]} - Array of error messages
     */
    validateDisplayName(name) {
        const errors = [];
        const { MIN_LENGTH, MAX_LENGTH, PATTERN } = CONFIG.VALIDATION.DISPLAY_NAME;

        if (!name || name.trim().length === 0) {
            errors.push('Display name is required');
            return errors;
        }

        const trimmedName = name.trim();

        if (trimmedName.length < MIN_LENGTH) {
            errors.push(`Display name must be at least ${MIN_LENGTH} characters`);
        }

        if (trimmedName.length > MAX_LENGTH) {
            errors.push(`Display name must be less than ${MAX_LENGTH} characters`);
        }

        if (!PATTERN.test(trimmedName)) {
            errors.push('Display name can only contain letters, numbers, spaces, hyphens and underscores');
        }

        return errors;
    },

    /**
     * Validate secret key input
     * @param {string} key - Secret key to validate
     * @returns {string[]} - Array of error messages
     */
    validateSecretKey(key) {
        const errors = [];
        const { MIN_LENGTH, MAX_LENGTH } = CONFIG.VALIDATION.SECRET_KEY;

        if (!key || key.trim().length === 0) {
            errors.push('Secret key is required');
            return errors;
        }

        if (key.trim().length < MIN_LENGTH) {
            errors.push(`Secret key must be at least ${MIN_LENGTH} characters`);
        }

        if (key.trim().length > MAX_LENGTH) {
            errors.push(`Secret key must be less than ${MAX_LENGTH} characters`);
        }

        return errors;
    },

    /**
     * Validate message content
     * @param {string} message - Message to validate
     * @returns {string[]} - Array of error messages
     */
    validateMessage(message) {
        const errors = [];
        const { MAX_LENGTH } = CONFIG.VALIDATION.MESSAGE;

        if (!message || message.trim().length === 0) {
            errors.push('Message cannot be empty');
            return errors;
        }

        if (message.trim().length > MAX_LENGTH) {
            errors.push(`Message must be less than ${MAX_LENGTH} characters`);
        }

        return errors;
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - True if valid URL format
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Sanitize HTML input to prevent XSS
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized input
     */
    sanitizeHtml(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    /**
     * Check if input contains only alphanumeric characters
     * @param {string} input - Input to check
     * @returns {boolean} - True if alphanumeric only
     */
    isAlphanumeric(input) {
        if (!input || typeof input !== 'string') {
            return false;
        }

        return /^[a-zA-Z0-9]+$/.test(input);
    },

    /**
     * Validate phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format
     */
    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return false;
        }

        // Basic phone validation (10-15 digits with optional formatting)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        return phoneRegex.test(cleanPhone);
    }
};
