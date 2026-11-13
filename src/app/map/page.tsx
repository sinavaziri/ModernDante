import type { Metadata } from 'next';
import JourneyMapPage from '@/components/JourneyMapPage';

export const metadata: Metadata = {
  title: 'Map of Hell | The Divine Comedy',
  description: "The nine circles of Dante's Inferno from the dark wood down to Lucifer, on one map with the way out, Purgatory and Paradise.",
};

export default function InfernoMapPage() {
  return <JourneyMapPage start="inferno" />;
}
