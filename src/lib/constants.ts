/**
 * Application-wide constants
 * Centralized configuration for layout, timing, and UI values
 */

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

/**
 * How far down the window the site menu reaches right now, in pixels.
 * The menu stays at the top on most pages, but on canto pages it scrolls away with the page, and then this is 0.
 */
export function menuBottom(): number {
  const menu = document.querySelector('[data-site-menu]');
  return menu ? Math.max(0, menu.getBoundingClientRect().bottom) : 0;
}

// ============================================================================
// AUDIO PLAYER CONSTANTS
// ============================================================================

/**
 * Audio player controls and behavior
 */
export const AUDIO = {
  /** How far the back button rewinds, in seconds. About one tercet. */
  SKIP_BACK: 10,

  /** How far the forward button skips, in seconds */
  SKIP_FORWARD: 10,

  /** Seek step for the arrow keys on the progress bar, in seconds */
  ARROW_SEEK_DURATION: 5,

  /** Character limit for text preview in player bar */
  TEXT_PREVIEW_LENGTH: 60,

  /** Playback speeds, in the order the speed button cycles through them */
  RATES: [1, 1.25, 1.5, 0.75],

  /** Seconds between the end of a canto and the start of the next */
  NEXT_CANTO_COUNTDOWN: 8,

  /** A saved place this close to either end of a canto isn't kept, in seconds */
  RESUME_MARGIN: 10,
} as const;
