/**
 * Cryptographic Utilities
 * Handles encryption and decryption of messages using AES
 */

export const CryptoUtils = {
    /**
     * Encrypt text using AES encryption
     * @param {string} text - Plain text to encrypt
     * @param {string} key - Secret key for encryption
     * @returns {string|null} - Encrypted text or null if failed
     */
    encrypt(text, key) {
        try {
            if (!text || !key) {
                throw new Error('Text and key are required for encryption');
            }

            return CryptoJS.AES.encrypt(text, key).toString();
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    },

    /**
     * Decrypt ciphertext using AES decryption
     * @param {string} ciphertext - Encrypted text to decrypt
     * @param {string} key - Secret key for decryption
     * @returns {string|null} - Decrypted text or null if failed
     */
    decrypt(ciphertext, key) {
        try {
            if (!ciphertext || !key) {
                throw new Error('Ciphertext and key are required for decryption');
            }

            const bytes = CryptoJS.AES.decrypt(ciphertext, key);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);

            return decrypted || null;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    },

    /**
     * Generate a random encryption key
     * @param {number} length - Length of the key (default: 32)
     * @returns {string} - Random key
     */
    generateRandomKey(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    },

    /**
     * Validate if a string is likely encrypted
     * @param {string} text - Text to validate
     * @returns {boolean} - True if likely encrypted
     */
    isEncrypted(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        // Check for base64-like pattern (AES encrypted strings are base64 encoded)
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Pattern.test(text) && text.length > 20;
    },

    /**
     * Hash a string using SHA256
     * @param {string} text - Text to hash
     * @returns {string} - SHA256 hash
     */
    hash(text) {
        try {
            return CryptoJS.SHA256(text).toString();
        } catch (error) {
            console.error('Hashing error:', error);
            return null;
        }
    }
};
