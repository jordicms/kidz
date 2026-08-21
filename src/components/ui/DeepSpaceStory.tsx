import { useApp } from '../../state/store';
import { getDeepSpaceObject } from '../../data/deepSpace';
import StoryPager from './StoryPager';
import FactsGrid from './FactsGrid';
import PhotoCard from './PhotoCard';
import { getPhoto } from '../../utils/photos';

/** Hoja inferior con la historia de un objeto del espacio profundo. */
export default function DeepSpaceStory() {
  const deepSpaceId = useApp((s) => s.deepSpaceId);
  const closeDeepSpace = useApp((s) => s.closeDeepSpace);

  if (!deepSpaceId) return null;
  const obj = getDeepSpaceObject(deepSpaceId);
  if (!obj) return null;

  return (
    <div className="story-overlay" onClick={closeDeepSpace}>
      <div className="story-panel" onClick={(e) => e.stopPropagation()}>
        <div className="story-head">
          <span className="big-emoji">{obj.emoji}</span>
          <div>
            <h2>
              {obj.name}
              <span className="kind-badge">{obj.kind}</span>
            </h2>
            <div className="tagline">{obj.tagline}</div>
          </div>
          <button className="btn btn-round story-close" onClick={closeDeepSpace} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <StoryPager story={obj.story} storyKey={obj.id} />
        <FactsGrid facts={obj.facts} />
        {getPhoto(obj.id) && (
          <>
            <div className="section-title">📷 ¿Cómo es en realidad?</div>
            <PhotoCard photoKey={obj.id} label="Foto real" />
          </>
        )}
      </div>
    </div>
  );
}
