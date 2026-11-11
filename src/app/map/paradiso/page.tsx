import type { Metadata } from 'next';
import MapPage from '@/components/MapPage';
import PaintedMap, { PAINTED_MAP_WIDTH_RATIO } from '@/components/PaintedMap';
import { LEVEL_WORD, getMapOutlines, getMapSpans, getRealmLevels } from '@/lib/realm-maps';

export const metadata: Metadata = {
  title: 'Map of Paradise | The Divine Comedy',
  description: "The ten heavens of Dante's Paradiso from the Moon up to the Empyrean, with the cantos that cross each one.",
};

export default function ParadisoMapPage() {
  const levels = getRealmLevels('paradiso');

  return (
    <MapPage
      realm="paradiso"
      title="Map of Paradise"
      intro={
        <>
          Dante&rsquo;s Paradise is ten heavens, one above the other, with the earth at the center. He rises with
          Beatrice from the Moon to the Empyrean, so the map reads from the bottom up.
        </>
      }
      levels={levels}
      spans={getMapSpans('paradiso')}
      widthRatio={PAINTED_MAP_WIDTH_RATIO}
    >
      <PaintedMap
        label="The levels of Paradise"
        word={LEVEL_WORD.paradiso}
        levels={levels}
        outlines={getMapOutlines('paradiso')}
        feather={14}
        painting="/images-map/paradiso-dore.webp"
        ground="hsl(222 40% 14%)"
      />
    </MapPage>
  );
}
