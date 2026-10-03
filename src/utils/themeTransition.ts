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

  if (!supportsTransitions) {
    toggleFn();
    return;
  }

  // Calculate maximum distance from button to the furthest corner of viewport
  const maxRadius = Math.hypot(
    Math.max(clientX, window.innerWidth - clientX),
    Math.max(clientY, window.innerHeight - clientY)
  );

  try {
    const transition = (document as any).startViewTransition(() => {
      toggleFn();
    });

    if (transition && transition.ready && typeof transition.ready.then === 'function') {
      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${clientX}px ${clientY}px)`,
            `circle(${maxRadius}px at ${clientX}px ${clientY}px)`
          ];

          document.documentElement.animate(
            {
              clipPath: nextDark ? clipPath : [...clipPath].reverse(),
            },
            {
              duration: 450,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              pseudoElement: nextDark
                ? '::view-transition-new(root)'
                : '::view-transition-old(root)',
            }
          );
        })
        .catch(() => {
          // Graceful fallback if animation is interrupted
        });
    }
  } catch (err) {
    // Fallback directly to toggle if startViewTransition throws
    console.warn('View transition error, falling back to instant theme change:', err);
    toggleFn();
  }
}
