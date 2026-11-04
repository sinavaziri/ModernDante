/**
 * Audio timing and synchronization types
 * Used for word-level audio highlighting and playback
 */

/**
 * Individual word timing information
 */
export interface WordTiming {
  /** The word text */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Audio segment with word-level timing
 */
export interface AudioSegment {
  /** Unique segment identifier */
  id: number;
  /** Speaker identifier (e.g., 'narrator', 'dante', 'virgil') */
  speaker: string;
  /** The text content of this segment */
  text: string;
  /** Segment start time in seconds relative to full audio */
  startTime: number;
  /** Segment end time in seconds relative to full audio */
  endTime: number;
  /** Word-level timing data for this segment */
  words: WordTiming[];
}

/**
 * Complete audio timing data for a canto, served from
 * /audio-timings/{cantica}/{cantoNumber}.json
 */
export interface AudioTimingData {
  /** Cantica name (inferno, purgatorio, paradiso) */
  cantica: string;
  /** Canto number within the cantica */
  cantoNumber: number;
  /** Canto title (e.g., "Canto I") */
  title: string;
  /** Total audio duration in seconds */
  totalDuration: number;
  /** Array of audio segments with timing data */
  segments: AudioSegment[];
}
