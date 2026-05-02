'use client';

import { useState } from 'react';

interface Props {
  coverImage: string | null;
  representativeImages: string[];
  spotName: string;
}

export default function SpotImageGallery({ coverImage, representativeImages, spotName }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      {coverImage && (
        <div
          className="cursor-pointer overflow-hidden rounded-[24px] border border-white/55 bg-white/78 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          onClick={() => setLightboxUrl(coverImage)}
        >
          <img
            src={coverImage}
            alt={`${spotName} 대표 이미지`}
            className="w-full max-h-72 object-contain bg-[#fffafb]"
          />
        </div>
      )}

      {representativeImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {representativeImages.map((url, i) => (
            <button
              key={url}
              onClick={() => setLightboxUrl(url)}
              className="shrink-0 select-none rounded-[24px] focus:outline-none active:scale-[0.98]"
            >
              <img
                src={url}
                alt={`${spotName} 사진 ${i + 1}`}
                className="h-44 w-44 rounded-[24px] border border-white/55 object-cover shadow-[0_14px_36px_rgba(15,23,42,0.16)]"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="원본 이미지"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 flex h-11 w-11 select-none items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-transform active:scale-[0.96]"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
