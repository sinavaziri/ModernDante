import type { Metadata } from 'next';
import MapPage from '@/components/MapPage';
import PaintedMap, { PAINTED_MAP_WIDTH_RATIO } from '@/components/PaintedMap';
import { LEVEL_WORD, getMapOutlines, getMapSpans, getRealmLevels } from '@/lib/realm-maps';

export const metadata: Metadata = {
  title: 'Map of Purgatory | The Divine Comedy',
  description: "The mountain of Dante's Purgatorio from the shore up its seven terraces to the Earthly Paradise, with the cantos that cross each level.",
};

export default function PurgatorioMapPage() {
  const levels = getRealmLevels('purgatorio');

  return (
    <MapPage
      realm="purgatorio"
      title="Map of Purgatory"
      intro={
        <>
          Purgatory is a mountain on an island at the far side of the world. Souls climb it terrace by terrace,
          shedding one sin on each, so the map reads from the bottom up.
        </>
      }
      levels={levels}
      spans={getMapSpans('purgatorio')}
      widthRatio={PAINTED_MAP_WIDTH_RATIO}
    >
      <PaintedMap
        label="The levels of Purgatory"
        word={LEVEL_WORD.purgatorio}
        levels={levels}
        outlines={getMapOutlines('purgatorio')}
        painting="/images-map/purgatorio-dore.webp"
        ground="hsl(222 34% 13%)"
      />
    </MapPage>
  );
}
