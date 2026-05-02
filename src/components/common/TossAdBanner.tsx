'use client';

import { TossAds } from '@apps-in-toss/web-framework';
import { useEffect, useRef, useState } from 'react';

interface Props {
  className?: string;
  variant?: 'expanded' | 'card';
}

const TOSS_AD_GROUP_ID = 'ait.v2.live.cf4f0c5ac2314ef1';
const isTossBuild = process.env.NEXT_PUBLIC_TOSS_BUILD === 'true';

export default function TossAdBanner({
  className = '',
  variant = 'card',
}: Props) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!isTossBuild || !targetRef.current) return;

    try {
      if (!TossAds.initialize.isSupported() || !TossAds.attachBanner.isSupported()) return;
    } catch (error) {
      console.info('Toss Ads is not supported in this environment:', error);
      return;
    }

    let banner: ReturnType<typeof TossAds.attachBanner> | null = null;
    let disposed = false;

    const attachBanner = () => {
      if (disposed || !targetRef.current || banner) return;

      banner = TossAds.attachBanner(TOSS_AD_GROUP_ID, targetRef.current, {
        theme: 'auto',
        tone: 'grey',
        variant,
        callbacks: {
          onAdRendered: () => setIsRendered(true),
          onNoFill: () => setIsRendered(false),
          onAdFailedToRender: (payload) => {
            console.info('Toss banner failed:', payload.error.message);
            setIsRendered(false);
          },
        },
      });
    };

    TossAds.initialize({
      callbacks: {
        onInitialized: attachBanner,
        onInitializationFailed: (error) => {
          console.info('Toss Ads initialization failed:', error);
        },
      },
    });

    return () => {
      disposed = true;
      banner?.destroy();
    };
  }, [variant]);

  if (!isTossBuild) return null;

  return (
    <div
      ref={targetRef}
      className={[
        'w-full overflow-hidden transition-[min-height] duration-200',
        isRendered ? 'min-h-[410px]' : 'min-h-0',
        className,
      ].join(' ')}
    />
  );
}
