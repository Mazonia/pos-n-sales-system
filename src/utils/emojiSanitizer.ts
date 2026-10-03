/**
 * Ultra-robust Emoji Sanitization Utility for Akwaaba Retail POS
 * Strips all Unicode emoji presentation sequences, pictographic symbols,
 * skin tone modifiers, and surrogate pairs from all user input fields.
 */

export const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF])/gu;

/**
 * Removes all emojis from a given string.
 */
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str.replace(EMOJI_REGEX, '');
}

/**
 * Global input listener that intercepts any typing, pasting, or dropping
 * of emojis into input and textarea elements, immediately removing them.
 */
export function initGlobalEmojiSanitizer(): void {
  if (typeof window === 'undefined') return;

  const sanitizeElement = (el: HTMLInputElement | HTMLTextAreaElement) => {
    if (!el || el.type === 'file' || el.type === 'checkbox' || el.type === 'radio') return;
    if (el.value && EMOJI_REGEX.test(el.value)) {
      const prevStart = el.selectionStart;
      const prevEnd = el.selectionEnd;
      const sanitized = stripEmojis(el.value);
      el.value = sanitized;

      // Notify React of the synthetic input value update
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);

      try {
        if (prevStart !== null && prevEnd !== null) {
          const newPos = Math.min(prevStart, sanitized.length);
          el.setSelectionRange(newPos, newPos);
        }
      } catch (_) {}
    }
  };

  // Intercept on input event
  window.addEventListener(
    'input',
    (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (EMOJI_REGEX.test(target.value)) {
          sanitizeElement(target);
        }
      }
    },
    true
  );

  // Intercept on paste event
  window.addEventListener(
    'paste',
    (e: ClipboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        setTimeout(() => sanitizeElement(target), 0);
      }
    },
    true
  );

  // Intercept on drop event
  window.addEventListener(
    'drop',
    (e: DragEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        setTimeout(() => sanitizeElement(target), 0);
      }
    },
    true
  );
}
