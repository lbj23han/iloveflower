import Image from 'next/image';

export default function BrandLockup({
  title,
  subtitle,
  iconSize = 48,
  iconWidth,
  iconHeight,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
}: {
  title: string;
  subtitle?: string;
  iconSize?: number;
  iconWidth?: number;
  iconHeight?: number;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  const width = iconWidth ?? Math.round(iconSize * 0.72);
  const height = iconHeight ?? iconSize;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative shrink-0"
        style={{ width, height }}
      >
        <Image
          src="/icon.png"
          alt="꽃놀이맵 로고"
          width={Math.max(120, width * 3)}
          height={Math.max(160, height * 3)}
          className="h-full w-full object-contain [filter:drop-shadow(0_6px_16px_rgba(15,23,42,0.08))]"
          priority
        />
      </div>
      <div className="min-w-0">
        <div className={titleClassName || 'text-[17px] font-extrabold tracking-tight text-[#111827]'}>
          {title}
        </div>
        {subtitle && (
          <div className={subtitleClassName || 'text-[11px] text-[#6b7280]'}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
