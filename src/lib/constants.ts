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

  /** Combined offset for scroll calculations */
  get TOTAL_SCROLL_OFFSET() {
    return this.HEADER_HEIGHT + this.AUDIO_PLAYER_HEIGHT;
  }
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

  /** Audio loading timeout in milliseconds */
  LOAD_TIMEOUT: 30000,
} as const;

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

/**
 * Animation durations and timing
 */
export const ANIMATION = {
  /** Hero image carousel transition duration in milliseconds */
  CAROUSEL_TRANSITION_DURATION: 1500,

  /** Hero image carousel rotation interval in milliseconds */
  CAROUSEL_ROTATION_INTERVAL: 10000,

  /** Standard UI transition duration in milliseconds */
  TRANSITION_DURATION: 300,
} as const;

// ============================================================================
// IMAGE CONSTANTS
// ============================================================================

/**
 * Image configuration
 */
export const IMAGES = {
  /** Number ranges for each cantica */
  INFERNO_RANGE: { start: 1, end: 75 },
  PURGATORIO_RANGE: { start: 76, end: 117 },
  PARADISO_RANGE: { start: 118, end: 135 },

  /** Total number of images */
  TOTAL_COUNT: 135,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LayoutConstants = typeof LAYOUT;
export type AudioConstants = typeof AUDIO;
export type AnimationConstants = typeof ANIMATION;
export type ImageConstants = typeof IMAGES;
