/**
 * Akwaaba POS & Retail OS - Circular Ripple Theme Transition
 *
 * Implements modern CSS View Transitions API (document.startViewTransition)
 * with a dynamic circular clip-path originating from the clicked button.
 * The darkness or light expands smoothly from the user's click coordinate across the entire viewport.
 */

export function executeThemeTransition(
  arg1: React.MouseEvent<HTMLElement> | MouseEvent | (() => void) | null,
  arg2?: boolean | number,
  arg3?: ((nextDark: boolean) => void) | number
): void {
  let toggleFn: () => void;
  let clientX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  let clientY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  let isCurrentlyDark = false;

  // Determine calling pattern
  if (typeof arg1 === 'function') {
    // Pattern B: executeThemeTransition(toggleFn, clientX, clientY)
    toggleFn = arg1;
    if (typeof arg2 === 'number') clientX = arg2;
    if (typeof arg3 === 'number') clientY = arg3;
    isCurrentlyDark =
      typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.documentElement.classList.contains('theme-dark'));
  } else if (arg1 && typeof arg1 === 'object' && 'clientX' in arg1) {
    // Pattern A: executeThemeTransition(event, isCurrentlyDark, applyThemeChange)
    clientX = arg1.clientX;
    clientY = arg1.clientY;
    if (typeof arg2 === 'boolean') {
      isCurrentlyDark = arg2;
    } else {
      isCurrentlyDark =
        typeof document !== 'undefined' &&
        (document.documentElement.classList.contains('dark') ||
          document.documentElement.classList.contains('theme-dark'));
    }

    if (typeof arg3 === 'function') {
      const applyChange = arg3;
      const nextDark = !isCurrentlyDark;
      toggleFn = () => applyChange(nextDark);
    } else {
      toggleFn = () => {};
    }
  } else {
    // Fallback if no valid event or callback
    if (typeof arg3 === 'function') {
      const nextDark = !arg2;
      arg3(nextDark);
    }
    return;
  }

  const nextDark = !isCurrentlyDark;

  // Check if browser supports modern View Transitions and user hasn't requested reduced motion
  const supportsTransitions =
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as any).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Calculate maximum radius from click origin to furthest corner of screen
  const maxRadius = Math.hypot(
    Math.max(clientX, window.innerWidth - clientX),
    Math.max(clientY, window.innerHeight - clientY)
  );

  if (!supportsTransitions) {
    // Elegant fallback ink-ripple for browsers without View Transitions
    createInkRippleFallback(clientX, clientY, maxRadius, nextDark, toggleFn);
    return;
  }

  try {
    const transition = (document as any).startViewTransition(() => {
      toggleFn();
    });

    if (transition && transition.ready && typeof transition.ready.then === 'function') {
      transition.ready
        .then(() => {
          // Liquid ink spreading outward from the exact click coordinates to viewport corners
          const clipPath = [
            `circle(0px at ${clientX}px ${clientY}px)`,
            `circle(${maxRadius}px at ${clientX}px ${clientY}px)`
          ];

          document.documentElement.animate(
            {
              clipPath,
            },
            {
              duration: 750, // Slow, elegant ink spread
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
              fill: 'forwards',
            }
          );
        })
        .catch(() => {
          // Graceful fallback
        });
    }
  } catch (err) {
    console.warn('View transition error, using ink ripple fallback:', err);
    createInkRippleFallback(clientX, clientY, maxRadius, nextDark, toggleFn);
  }
}

/**
 * Visual ink-ripple fallback animation for browsers that don't support View Transitions API
 */
function createInkRippleFallback(
  x: number,
  y: number,
  maxRadius: number,
  nextDark: boolean,
  toggleFn: () => void
): void {
  if (typeof document === 'undefined') {
    toggleFn();
    return;
  }

  const ripple = document.createElement('div');
  ripple.className = 'theme-ink-ripple';
  ripple.style.position = 'fixed';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = '2px';
  ripple.style.height = '2px';
  ripple.style.borderRadius = '50%';
  ripple.style.transform = 'translate(-50%, -50%) scale(0)';
  ripple.style.pointerEvents = 'none';
  ripple.style.zIndex = '999999';
  ripple.style.backgroundColor = nextDark ? '#121316' : '#EBEEF2';
  ripple.style.transition = 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease';

  document.body.appendChild(ripple);

  // Force layout reflow then scale out
  requestAnimationFrame(() => {
    const scale = (maxRadius * 2) / 2;
    ripple.style.transform = `translate(-50%, -50%) scale(${scale})`;

    setTimeout(() => {
      toggleFn();
      ripple.style.opacity = '0';
      setTimeout(() => {
        ripple.remove();
      }, 250);
    }, 400);
  });
}
