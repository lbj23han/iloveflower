'use client';

import { useEffect, useRef, useState } from 'react';
import TossAdBanner from '@/components/common/TossAdBanner';

interface Props {
  className?: string;
  rootMargin?: string;
  variant?: 'expanded' | 'card';
}

export default function LazyTossAdBanner({
  className = '',
  rootMargin = '600px 0px',
  variant = 'card',
}: Props) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const target = targetRef.current;
    if (!target) return;

    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShouldRender(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={targetRef} className={className}>
      {shouldRender ? <TossAdBanner variant={variant} /> : <div className="h-px" />}
    </div>
  );
}
