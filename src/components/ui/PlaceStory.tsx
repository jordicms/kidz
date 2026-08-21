import { useApp } from '../../state/store';
import { getPlace } from '../../data/ocean';
import StoryPager from './StoryPager';
import FactsGrid from './FactsGrid';

/** Hoja inferior con la historia de un lugar del océano. Mismo patrón que
 *  DeepSpaceStory, así que reutiliza sus estilos y componentes. */
export default function PlaceStory() {
  const placeId = useApp((s) => s.placeId);
  const closePlace = useApp((s) => s.closePlace);

  if (!placeId) return null;
  const place = getPlace(placeId);
  if (!place) return null;

  return (
    <div className="story-overlay" onClick={closePlace}>
      <div className="story-panel" onClick={(e) => e.stopPropagation()}>
        <div className="story-head">
          <span className="big-emoji">{place.emoji}</span>
          <div>
            <h2>
              {place.name}
              <span className="kind-badge">{place.depthM} m</span>
            </h2>
            <div className="tagline">{place.tagline}</div>
          </div>
          <button className="btn btn-round story-close" onClick={closePlace} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <StoryPager story={place.story} storyKey={place.id} />
        <FactsGrid facts={place.facts} />
      </div>
    </div>
  );
}
