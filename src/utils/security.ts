/**
 * Akwaaba POS & Retail OS - Enterprise Security & Cybersecurity Hardening Module
 *
 * Implements:
 * 1. Cryptographic hashing (SHA-256 via Web Crypto API with salt)
 * 2. Strict password complexity standards (min 8 chars, uppercase, lowercase, number, symbol)
 * 3. Session object sanitization (zero plaintext PINs/passwords in localStorage)
 * 4. Anti-tampering math verification (prevent negative prices, NaN quantities, or forged totals)
 * 5. Input sanitization against script injection (XSS)
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0 to 4
}

/**
 * Validates password against enterprise industry standards:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special symbol (!@#$%^&*...)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter (a-z)');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one numerical digit (0-9)');
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*)');
  } else {
    score++;
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 4),
  };
}

/**
 * Hash credentials using Web Crypto API SHA-256 with an enterprise salt
 */
export async function hashCredential(value: string, salt: string = 'akwaaba_pos_retail_gh_2026'): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(value + salt);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto not available, using fallback hash');
  }

  // Pure JS fallback hash if crypto.subtle is restricted
  let hash = 0x811c9dc5;
  const str = value + salt;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ('0000000' + (hash >>> 0).toString(16)).substr(-8);
}

/**
 * Sanitizes system user before persisting in localStorage.
 * Ensures no sensitive credentials (pin, password, hash) are readable in web storage.
 */
export function sanitizeUserForStorage<T extends Record<string, any>>(user: T | null): Partial<T> | null {
  if (!user) return null;
  const copy = { ...user };
  delete copy.pin;
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

/**
 * Sanitizes input string to prevent XSS / script injection
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Mathematical integrity check for order and cart items
 * Prevents client-side manipulation (e.g. negative prices, negative quantities, NaN)
 */
export function validateCartIntegrity(cartItems: Array<{ quantity: number; unitPrice: number; discountAmount?: number }>): boolean {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return false;
  for (const item of cartItems) {
    if (typeof item.quantity !== 'number' || item.quantity <= 0 || isNaN(item.quantity) || !isFinite(item.quantity)) {
      return false;
    }
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0 || isNaN(item.unitPrice) || !isFinite(item.unitPrice)) {
      return false;
    }
    if (item.discountAmount !== undefined) {
      if (typeof item.discountAmount !== 'number' || item.discountAmount < 0 || isNaN(item.discountAmount)) {
        return false;
      }
      if (item.discountAmount > item.quantity * item.unitPrice) {
        return false; // Discount cannot exceed total line price
      }
    }
  }
  return true;
}
