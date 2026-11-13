import type { Metadata } from 'next';
import JourneyMapPage from '@/components/JourneyMapPage';

export const metadata: Metadata = {
  title: 'Map of Paradise | The Divine Comedy',
  description: "The ten heavens of Dante's Paradiso from the Moon to the Empyrean, on one map with Hell and Purgatory.",
};

export default function ParadisoMapPage() {
  return <JourneyMapPage start="paradiso" />;
}
