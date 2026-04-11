'use client';

interface Props {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md';
  readOnly?: boolean;
}

function StarIcon({
  fillRatio,
  sizeClass,
}: {
  fillRatio: number;
  sizeClass: string;
}) {
  const starPath =
    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

  return (
    <svg viewBox="0 0 24 24" className={sizeClass} aria-hidden="true">
      <path d={starPath} fill="#e5e7eb" />
      {fillRatio > 0 && (
        <defs>
          <clipPath id={`star-fill-${fillRatio.toString().replace('.', '-')}-${sizeClass}`}>
            <rect x="0" y="0" width={24 * fillRatio} height="24" />
          </clipPath>
        </defs>
      )}
      {fillRatio > 0 && (
        <path
          d={starPath}
          fill="#facc15"
          clipPath={`url(#star-fill-${fillRatio.toString().replace('.', '-')}-${sizeClass})`}
        />
      )}
      <path d={starPath} fill="none" stroke="#d1d5db" strokeWidth="1" />
    </svg>
  );
}

export default function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readOnly = false,
}: Props) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1;
        const fillRatio = Math.max(0, Math.min(1, value - index));

        if (readOnly || !onChange) {
          return (
            <span key={starNumber} className="inline-flex">
              <StarIcon fillRatio={fillRatio} sizeClass={sizeClass} />
            </span>
          );
        }

        return (
          <div key={starNumber} className="relative inline-flex h-6 w-6">
            <button
              type="button"
              aria-label={`${starNumber - 0.5}점`}
              onClick={() => onChange(starNumber - 0.5)}
              className="absolute inset-y-0 left-0 w-1/2"
            />
            <button
              type="button"
              aria-label={`${starNumber}점`}
              onClick={() => onChange(starNumber)}
              className="absolute inset-y-0 right-0 w-1/2"
            />
            <span className="pointer-events-none inline-flex">
              <StarIcon fillRatio={fillRatio} sizeClass={sizeClass} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
