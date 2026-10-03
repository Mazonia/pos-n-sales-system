/**
 * Credential Validation & Security Helper
 * Enforces 6-digit PIN requirements and industry-standard password complexity rules.
 */

export interface PasswordRuleStatus {
  hasMinLength: boolean; // At least 8 characters
  hasUpper: boolean;     // At least 1 uppercase letter (A-Z)
  hasLower: boolean;     // At least 1 lowercase letter (a-z)
  hasNumber: boolean;    // At least 1 numeric digit (0-9)
  hasSpecial: boolean;   // At least 1 special character (@#$%^&* etc.)
  isValid: boolean;
  errors: string[];
}

export function validatePasswordRules(password: string): PasswordRuleStatus {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('Minimum 8 characters');
  if (!hasUpper) errors.push('Uppercase letter (A-Z)');
  if (!hasLower) errors.push('Lowercase letter (a-z)');
  if (!hasNumber) errors.push('At least one number (0-9)');
  if (!hasSpecial) errors.push('Special symbol (!@#$%^&* etc.)');

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial,
    errors,
  };
}

export function validateSixDigitPin(pin: string): { isValid: boolean; error?: string } {
  if (!pin || typeof pin !== 'string') {
    return { isValid: false, error: '6-digit PIN is required.' };
  }
  const cleanPin = pin.trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { isValid: false, error: 'PIN must be exactly 6 numeric digits (0-9).' };
  }
  return { isValid: true };
}

export function generateRandomSixDigitPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
