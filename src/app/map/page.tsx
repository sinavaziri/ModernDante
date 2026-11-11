import type { Metadata } from 'next';
import InfernoMap, { infernoMapWidthRatio } from '@/components/InfernoMap';
import MapPage from '@/components/MapPage';
import { getInfernoLevels } from '@/lib/inferno-map';
import { getMapOutlines, getMapSpans } from '@/lib/realm-maps';

export const metadata: Metadata = {
  title: 'Map of Hell | The Divine Comedy',
  description: "The nine circles of Dante's Inferno from the dark wood down to Lucifer, with the cantos that cross each one.",
};

export default function InfernoMapPage() {
  const levels = getInfernoLevels();

  return (
    <MapPage
      realm="inferno"
      title="Map of Hell"
      intro={
        <>
          Dante&rsquo;s Hell is a funnel under Jerusalem, narrowing ledge by ledge to the center of the earth. The
          deeper the circle, the worse the sin.
        </>
      }
      levels={levels}
      spans={getMapSpans('inferno')}
      widthRatio={infernoMapWidthRatio(levels)}
    >
      <InfernoMap levels={levels} painting="/images-map/inferno-dore-b.webp" outlines={getMapOutlines('inferno')} />
    </MapPage>
  );
}
