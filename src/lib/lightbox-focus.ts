/**
 * Ref callback for a lightbox: moves keyboard focus into it on opening, keeps Tab inside it, and returns focus to the
 * page on closing. Otherwise focus stays on the page behind, where Enter reopens the image it's on and Tab wanders.
 *
 * Focus goes to the lightbox itself, which needs tabIndex={-1}, rather than its Close button. The key that opened it
 * is still held down, and letting go of Space on a button can press that button.
 */
export function lightboxFocus(lightbox: HTMLElement | null) {
  if (!lightbox) return;

  const opener = document.activeElement;
  lightbox.focus();

  const keepTabInside = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    // Arrows hidden at phone widths can't take focus. Index is -1 while focus is on the lightbox itself.
    const stops = [...lightbox.querySelectorAll<HTMLElement>('a[href], button')].filter(el => el.getClientRects().length > 0);
    const index = stops.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (index <= 0 ? stops.length - 1 : index - 1) : (index + 1) % stops.length;
    stops[next]?.focus();
  };
  document.addEventListener('keydown', keepTabInside);

  return () => {
    document.removeEventListener('keydown', keepTabInside);
    if (opener instanceof HTMLElement) opener.focus();
  };
}
