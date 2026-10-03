/**
 * Akwaaba POS & Retail OS - Circular Ripple Theme Transition
 *
 * Implements modern CSS View Transitions API (document.startViewTransition)
 * with a dynamic circular clip-path originating from the clicked button.
 * The darkness or light expands smoothly from the user's click coordinate across the entire viewport.
 */

export function executeThemeTransition(
  event: React.MouseEvent<HTMLElement> | MouseEvent | null,
  isCurrentlyDark: boolean,
  applyThemeChange: (nextDark: boolean) => void
): void {
  const nextDark = !isCurrentlyDark;

  // Check if browser supports modern View Transitions and user hasn't requested reduced motion
  const supportsTransitions =
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsTransitions || !event) {
    applyThemeChange(nextDark);
    return;
  }

  const x = event.clientX;
  const y = event.clientY;

  // Calculate maximum distance from button to the furthest corner of viewport
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Trigger View Transition
  const transition = (document as any).startViewTransition(() => {
    applyThemeChange(nextDark);
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${maxRadius}px at ${x}px ${y}px)`
    ];

    document.documentElement.animate(
      {
        clipPath: nextDark ? clipPath : [...clipPath].reverse(),
      },
      {
        duration: 480,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: nextDark
          ? '::view-transition-new(root)'
          : '::view-transition-old(root)',
      }
    );
  }).catch(() => {
    // Graceful fallback if animation is interrupted
    applyThemeChange(nextDark);
  });
}
