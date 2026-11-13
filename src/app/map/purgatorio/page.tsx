import type { Metadata } from 'next';
import JourneyMapPage from '@/components/JourneyMapPage';

export const metadata: Metadata = {
  title: 'Map of Purgatory | The Divine Comedy',
  description: "The mountain of Dante's Purgatorio from the shore up its seven terraces to the Earthly Paradise, on one map with Hell below it and Paradise above.",
};

export default function PurgatorioMapPage() {
  return <JourneyMapPage start="purgatorio" />;
}
