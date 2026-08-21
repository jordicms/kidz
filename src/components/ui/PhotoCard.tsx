import { getPhoto } from '../../utils/photos';

/**
 * Muestra una foto real empaquetada (si existe) con su pie y crédito.
 * Si la imagen aún no está descargada, no renderiza nada, así que la ficha
 * funciona igual antes y después de ejecutar `npm run photos`.
 *
 * `compact` es para los sitios donde no cabe una foto grande (el pie de la
 * escena de constelaciones, por ejemplo): la pone pequeña y al lado del texto.
 */
export default function PhotoCard({
  photoKey,
  label,
  compact = false,
}: {
  photoKey: string;
  label: string;
  compact?: boolean;
}) {
  const photo = getPhoto(photoKey);
  if (!photo) return null;
  return (
    <figure className={compact ? 'photo-card photo-card-compact' : 'photo-card'}>
      <img src={photo.url} alt={label} loading="lazy" />
      <figcaption>
        <span className="photo-label">{label}</span>
        {photo.credit && <span className="photo-credit">{photo.credit}</span>}
      </figcaption>
    </figure>
  );
}
