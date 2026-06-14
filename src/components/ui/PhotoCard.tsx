import { getPhoto } from '../../utils/photos';

/**
 * Muestra una foto real empaquetada (si existe) con su pie y crédito.
 * Si la imagen aún no está descargada, no renderiza nada.
 */
export default function PhotoCard({ photoKey, label }: { photoKey: string; label: string }) {
  const photo = getPhoto(photoKey);
  if (!photo) return null;
  return (
    <figure className="photo-card">
      <img src={photo.url} alt={label} loading="lazy" />
      <figcaption>
        <span className="photo-label">{label}</span>
        {photo.credit && <span className="photo-credit">{photo.credit}</span>}
      </figcaption>
    </figure>
  );
}
