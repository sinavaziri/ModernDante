import type { AudioTimingData } from '@/types/audio';

export function resolvePlan(
  plan: unknown[],
  timing: AudioTimingData,
  sounds: Record<string, { loop: boolean }>,
): { beds: { t: number; sound: string | null }[]; cues: { t: number; sound: string }[]; problems: string[] };
