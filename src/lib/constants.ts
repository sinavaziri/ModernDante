/**
 * Application-wide constants
 * Centralized configuration for layout, timing, and UI values
 */

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

/**
 * Layout dimensions and spacing
 */
export const LAYOUT = {
  /** Height of the sticky header in pixels */
  HEADER_HEIGHT: 80,

  /** Bottom padding to account for audio player in pixels */
  AUDIO_PLAYER_HEIGHT: 100,
} as const;

// ============================================================================
// AUDIO PLAYER CONSTANTS
// ============================================================================

/**
 * Audio player controls and behavior
 */
export const AUDIO = {
  /** Skip forward/backward duration in seconds */
  SKIP_DURATION: 15,

  /** Seek step for the arrow keys on the progress bar, in seconds */
  ARROW_SEEK_DURATION: 5,

  /** Character limit for text preview in player bar */
  TEXT_PREVIEW_LENGTH: 60,
} as const;
